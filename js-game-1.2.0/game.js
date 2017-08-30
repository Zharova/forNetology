'use strict';
class Vector {

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }


  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error("Можно прибавлять к вектору только вектор типа Vector.");
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(multiplier) {
    this.x *= multiplier;
    this.y *= multiplier;
    return this;
  }
}

class Actor {

  constructor(position = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(position instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
      throw new Error("Ошибка в данных");
    }

    this.size = size;
    this.pos = position;
    this.speed = speed; 
  }

  get type() { return 'actor'; }

  get pos() {
    return this.position;
  }

  set pos(position) {
    this.position = position;
    this.left = position.x;
    this.top = position.y;
    this.right = position.x + this.size.x;
    this.bottom = position.y + this.size.y;  
  }
  
  act() {}

  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('Ошибка в данных');
    }
    return !(actor == this || this.right <= actor.left || actor.right <= this.left || this.bottom <= actor.top || this.top >= actor.bottom);
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.player = actors.find((item) => item.type == 'player');  
    this.height = grid.length; 
    // по условию grid - двумерный массив, а по тестам, вроде как, нет)
    if (!Array.isArray(grid[0])) {
      grid[0] = [];
    }
    this.width = Math.max(...grid.map((row) => row.length)); 
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('Ошибка в данных');
    }
    
    return this.actors.find((item) => actor.isIntersect(item));
  }

  obstacleAt(newPosition, size) {
    if (!(newPosition instanceof Vector) || !(size instanceof Vector)) {
      throw new Error("Ошибка в данных");
    }
    if ((newPosition.x + size.x) > this.width || newPosition.x < 0 || newPosition.y < 0) {
    // if ((|| (newPosition.x + size.x) < 0 || (newPosition.y + size.y) < 0  || (newPosition.x < 0) || (newPosition.x > this.width) || ) {
      return 'wall';
    } else if (newPosition.y + size.y > this.height) {
      return 'lava';
    } else {
      for (let i = Math.floor(newPosition.y); i < (newPosition.y + size.y); i++) {
        for (let j = Math.floor(newPosition.x); j < (newPosition.x + size.x); j++) {
          if (this.grid[i][j] == 'wall' || this.grid[i][j] == 'lava') {
            return this.grid[i][j]; 
          }
        }
      }
    }
  }

  removeActor(Actor) {
    this.actors.splice(this.actors.indexOf(Actor), 1);
  }

  noMoreActors(type) {
    if (this.actors.length > 0) {
      for (let i = 0; i < this.actors.length - 1; i++) {
        return this.actors[i].type != type;
      }
    } else {
      return true;
    }
  }

  playerTouched(someGrid, someActor) {
    if (this.status === null) {
      if (someGrid == 'lava' || someGrid == 'fireball') {
        this.status = 'lost';
      } else if (someGrid == 'coin' && someActor.type == 'coin') {
        this.removeActor(someActor);
        if (this.noMoreActors('coin')) {
          this.status = 'won';
        }
      } 
    }
  }
}

class LevelParser {
  constructor(actorsDictionary = {}) {
    this.dictionary = actorsDictionary;
  }

  actorFromSymbol(symb) {
    if (symb !== null && this.dictionary.hasOwnProperty(symb)) {
      return this.dictionary[symb];
    }
  }
  //длинновато как-то))))

  obstacleFromSymbol(symb) {
    if (symb === 'x') {
      return 'wall';
    } else if (symb == '!') {
      return 'lava';
    } 
  }

  createGrid(plan) {
    const grid = [];

    for (let i = 0; i < plan.length; i++) {
      grid[i] = plan[i].split('').map((symb) => this.obstacleFromSymbol(symb));
    }

    return grid;
  }

  createActors(plan) {
    const actors = [];
    // console.log('plan:', plan)
    for (let i = 0; i < plan.length; i++) {
      for (let j = 0; j < plan[i].length; j++) {
        const actorClass = this.actorFromSymbol(plan[i][j]);
        if (typeof actorClass === 'function') {
          const intValue = new actorClass(new Vector(j, i));
          if (intValue instanceof Actor) {
            actors.push(intValue);
          }
        }    
      } 
    }
    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(position, speed) {
    super(position);
    this.size = new Vector(1, 1);
    this.speed = speed;
  }

  getNextPosition(time = 1) {
    if (this.speed.x === 0 && this.speed.y === 0) { 
      return this.position;
    } else {
      return new Vector(this.position.x + this.speed.x * time, this.position.y + this.speed.y * time);
    }
  }

  handleObstacle() {
    this.speed = new Vector(- this.speed.x, - this.speed.y);
  }

  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    const obstacleAt = level.obstacleAt(nextPosition, this.size);
    
    if (obstacleAt == 'lava' || obstacleAt == 'wall') {
      this.handleObstacle();
    } else {
      this.position = nextPosition;
    }
  }

  get type() { return 'fireball'; }
}

class HorizontalFireball extends Fireball{
  constructor(position) {
      super(position);
      this.size = new Vector(1, 1);
      this.speed = new Vector(2, 0);
  }
}

class VerticalFireball extends Fireball{
  constructor(position) {
    super(position);
    this.size = new Vector(1, 1);
    this.speed = new Vector(0, 2);
  }
}

class FireRain extends Fireball{
  constructor(position) {
    super(position);
    this.size = new Vector(1, 1);
    this.speed = new Vector(0, 3);
  }

  handleObstacle() {
    this.position = new Vector(5, 5);
  }
}

class Coin extends Actor {
  constructor(position = new Vector(0, 0)) {
    super(new Vector(position.x + 0.2, position.y + 0.1));
    this.size = new Vector(0.6, 0.6);
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * (2 * Math.PI - 0) + 0;
  }

  get type() { return 'coin'; }

  updateSpring(time = 1) {
    let oldSpring = this.spring;
    this.spring = oldSpring + this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector (0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    let anotherPosition = this.position;  
    // this.position.x = anotherPosition.x + this.getSpringVector().x;  
    // this.position.y = anotherPosition.y + this.getSpringVector().y;                 
    return new Vector(this.position.x + this.getSpringVector().x, this.position.y + this.getSpringVector().y);
  }

  act(time) {
    this.position = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(position = new Vector(0, 0)) {
    super(new Vector(position.x, position.y - 0.5), new Vector(0.8, 1.5));
  }

  get type() { return 'player'; }
}

