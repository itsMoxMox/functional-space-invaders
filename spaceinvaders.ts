import { interval, fromEvent, merge} from 'rxjs'
import { map, filter, scan, mergeMap, takeUntil} from 'rxjs/operators'

// basic vector class to handle positions.
class Vector {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (a: Vector) => new Vector(this.x + a.x, this.y + a.y)
  sub = (a: Vector) => this.add(a.scale(-1))
  scale = (s: number) => new Vector(this.x * s, this.y * s)
  len = () => Math.sqrt(this.x * this.x + this.y * this.y)
}

// Pseudorandom number generator using method and constants used by GCC.
class RNG {
  m = 0x80000000
  a = 1103515245
  c = 42069
  constructor(readonly state){}

  int()  { return (this.a * this.state + this.c) % this.m; }
  float(){ return this.int() / (this.m - 1); }
  next() { return new RNG(this.int()); }
}

// Entity type for bullets, aliens, ship, shields
type Entity = Readonly<{
  id: string,
  pos: Vector
  dir: Vector,
  speed: number,
  width: number,
  height: number,
  enemy: boolean
}>

// gamestate type to hold all the information required to infer
type State = Readonly<{
  ship: Entity
  bullets: ReadonlyArray<Entity>,
  aliens: ReadonlyArray<Entity>,
  shields: ReadonlyArray<Entity>,
  exit: ReadonlyArray<Entity>,
  points: number,
  lose: boolean,
  win: boolean,
  count: number,
  time: number,
  lastShot: number,
  rng: RNG,
  level: number, 
  lives: number,
  numAliens: number
}>

type Event = 'keyup' | 'keydown' 
type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'

function spaceinvaders() {
  // creates a new alien entity
  const createAlien = (pos: Vector, id: string, w:number, h:number, s:number) : Entity => {
    return <Entity>{
      id: id,
      pos: pos,
      dir: new Vector(0, 0),
      speed: s,
      width: w,
      height: h,
      enemy: true
    }
  }

  // creates a new bullet entity
  const createBullet = (pos: Vector, id: string, dir: Vector, speed: number, enemy: boolean, size: Vector = new Vector(1,1)): Entity => {
    return <Entity>{
      id: id,
      pos: pos,
      dir: dir,
      speed: speed,
      width: size.x,
      height: size.y,
      enemy: enemy
    }
  }

  // Creates a new Shield entity
  const createShield = (pos: Vector, id: string, size = new Vector(30, 30)) : Entity => {
    return <Entity>{
      id: id,
      pos: pos,
      speed: 0,
      dir: new Vector(0, 0),
      width: size.x,
      height: size.y,
      enemy: false
    }
  }

  // creates the initial gamestate with variable level
  const createLevel = (level: number) : State => {return({ship: createShip(), bullets: [], aliens: [
    createAlien(new Vector(75, 100), "alien0", 30, 30, 3), createAlien(new Vector(125, 100), "alien1", 30, 30, 3),
    createAlien(new Vector(175, 100), "alien2", 30, 30, 3), createAlien(new Vector(225, 100), "alien3", 30, 30, 3),
    createAlien(new Vector(275, 100), "alien4", 30, 30, 3), createAlien(new Vector(325, 100), "alien5", 30, 30, 3),
    createAlien(new Vector(375, 100), "alien6", 30, 30, 3), createAlien(new Vector(425, 100), "alien7", 30, 30, 3),
    createAlien(new Vector(95, 150), "alien8", 30, 30, 3), createAlien(new Vector(145, 150), "alien9", 30, 30, 3),
    createAlien(new Vector(195, 150), "alien10", 30, 30, 3), createAlien(new Vector(245, 150), "alien11", 30, 30, 3),
    createAlien(new Vector(295, 150), "alien12", 30, 30, 3), createAlien(new Vector(345, 150), "alien13", 30, 30, 3),
    createAlien(new Vector(395, 150), "alien14", 30, 30, 3), createAlien(new Vector(445, 150), "alien15", 30, 30, 3),
    createAlien(new Vector(75, 200), "alien16", 30, 30, 3), createAlien(new Vector(125, 200), "alien17", 30, 30, 3),
    createAlien(new Vector(175, 200), "alien18", 30, 30, 3), createAlien(new Vector(225, 200), "alien19", 30, 30, 3),
    createAlien(new Vector(275, 200), "alien20", 30, 30, 3), createAlien(new Vector(325, 200), "alien21", 30, 30, 3),
    createAlien(new Vector(375, 200), "alien22", 30, 30, 3), createAlien(new Vector(425, 200), "alien23", 30, 30, 3),
    createAlien(new Vector(95, 250), "alien24", 30, 30, 3), createAlien(new Vector(145, 250), "alien25", 30, 30, 3),
    createAlien(new Vector(195, 250), "alien26", 30, 30, 3), createAlien(new Vector(245, 250), "alien27", 30, 30, 3),
    createAlien(new Vector(295, 250), "alien28", 30, 30, 3), createAlien(new Vector(345, 250), "alien29", 30, 30, 3),
    createAlien(new Vector(395, 250), "alien30", 30, 30, 3), createAlien(new Vector(445, 250), "alien31", 30, 30, 3),
  ], shields: [
    createShield(new Vector(100, 400), "shield0", new Vector(10,10)), createShield(new Vector(110, 400), "shield1", new Vector(10,10)),
    createShield(new Vector(120, 400), "shield2", new Vector(10,10)), createShield(new Vector(130, 400), "shield3", new Vector(10,10)),
    createShield(new Vector(140, 400), "shield4", new Vector(10,10)), createShield(new Vector(150, 400), "shield5", new Vector(10,10)),
    createShield(new Vector(160, 400), "shield6", new Vector(10,10)), createShield(new Vector(170, 400), "shield7", new Vector(10,10)),
    createShield(new Vector(100, 410), "shield8", new Vector(10,10)), createShield(new Vector(110, 410), "shield9", new Vector(10,10)),
    createShield(new Vector(120, 410), "shield10", new Vector(10,10)), createShield(new Vector(130, 410), "shield11", new Vector(10,10)),
    createShield(new Vector(140, 410), "shield12", new Vector(10,10)), createShield(new Vector(150, 410), "shield13", new Vector(10,10)),
    createShield(new Vector(160, 410), "shield14", new Vector(10,10)), createShield(new Vector(170, 410), "shield15", new Vector(10,10)),

    createShield(new Vector(250, 400), "shield16", new Vector(10,10)), createShield(new Vector(260, 400), "shield17", new Vector(10,10)),
    createShield(new Vector(270, 400), "shield18", new Vector(10,10)), createShield(new Vector(280, 400), "shield19", new Vector(10,10)),
    createShield(new Vector(290, 400), "shield20", new Vector(10,10)), createShield(new Vector(300, 400), "shield21", new Vector(10,10)),
    createShield(new Vector(310, 400), "shield22", new Vector(10,10)), createShield(new Vector(320, 400), "shield23", new Vector(10,10)),
    createShield(new Vector(250, 410), "shield24", new Vector(10,10)), createShield(new Vector(260, 410), "shield25", new Vector(10,10)),
    createShield(new Vector(270, 410), "shield26", new Vector(10,10)), createShield(new Vector(280, 410), "shield27", new Vector(10,10)),
    createShield(new Vector(290, 410), "shield28", new Vector(10,10)), createShield(new Vector(300, 410), "shield29", new Vector(10,10)),
    createShield(new Vector(310, 410), "shield30", new Vector(10,10)), createShield(new Vector(320, 410), "shield31", new Vector(10,10)),

    createShield(new Vector(400, 400), "shield32", new Vector(10,10)), createShield(new Vector(410, 400), "shield33", new Vector(10,10)),
    createShield(new Vector(420, 400), "shield34", new Vector(10,10)), createShield(new Vector(430, 400), "shield35", new Vector(10,10)),
    createShield(new Vector(440, 400), "shield36", new Vector(10,10)), createShield(new Vector(450, 400), "shield37", new Vector(10,10)),
    createShield(new Vector(460, 400), "shield38", new Vector(10,10)), createShield(new Vector(470, 400), "shield39", new Vector(10,10)),
    createShield(new Vector(400, 410), "shield40", new Vector(10,10)), createShield(new Vector(410, 410), "shield41", new Vector(10,10)),
    createShield(new Vector(420, 410), "shield42", new Vector(10,10)), createShield(new Vector(430, 410), "shield43", new Vector(10,10)),
    createShield(new Vector(440, 410), "shield44", new Vector(10,10)), createShield(new Vector(450, 410), "shield45", new Vector(10,10)),
    createShield(new Vector(460, 410), "shield46", new Vector(10,10)), createShield(new Vector(470, 410), "shield47", new Vector(10,10)),
  ], exit: [], points: 0, lose: false, win: false, count: 0, time: 0, lastShot: 0, rng: new RNG(1), level: level, lives: 3, numAliens: 0})};

  const level0: State = createLevel(1)

  // game state mutators
  class Tick { constructor(public readonly elapsed:number) {}}
  class Move { constructor(public readonly h: number, public readonly v: number) {}}
  class Shoot{ constructor(public readonly special: boolean) {}}
  class LoadLevel { constructor() {}}

  // Function to create the ship entity
  function createShip() : Entity {
    return <Entity>{
      id: 'ship',
      pos: new Vector(279, 500),
      dir: new Vector(0, 0),
      speed: 4,
      width: 39,
      height:24
    }
  }

  // gametick observable
  const gameTick = interval(10).pipe(map(elapsed => new Tick(elapsed)));

  // Obserable for key inputs by the user
  const keyObservable = <T>(e:Event, k:Key, result:() => T)=>
      fromEvent<KeyboardEvent>(document, e)
        .pipe(
          filter(({code})=>code === k),
          filter(({repeat})=> !repeat),
          map((ke: KeyboardEvent) => ke.key === k),
          mergeMap(() => interval(10).pipe(
            // smooth movement can be done with this interval().pipe
            takeUntil(fromEvent<KeyboardEvent>(document, 'keyup').pipe(
              filter(({code}) => code === k)
            ))
          )),
          map(result));

  // Observables for specific key inputs and their corresponding state mutator initialisation
  const startLeft = keyObservable('keydown','ArrowLeft',() => new Move(-1, 0));
  const startRight = keyObservable('keydown','ArrowRight',() => new Move(1, 0));
  const shoot = keyObservable('keydown','ArrowUp', () => new Shoot(false));
  const reload = keyObservable('keydown', 'ArrowDown', () => new LoadLevel());
  
  // general function to move an entity
  function move(e:Entity, dir: Vector): Entity {
    // check if the object will be OOB before moving (only left right, since we want bullets to go juuust offscreen)
    const rawx = e.pos.x + dir.x * e.speed;
    const rawy = e.pos.y + dir.y * e.speed;
    const newx = (rawx > 600 - e.width - 3) ? 600 - e.width - 3 : (rawx < 3) ? 3 : rawx;
    return <Entity>{ ...e,
      pos: new Vector(newx, rawy)
    }
  }

  // remove everything in the canvas
  function wipe() : void{
    const canvas = document.getElementById("canvas");
    canvas.innerHTML = "";
  }

  // places the spaceship object in the canvas
  const spawnShip = (pos: Vector) : void => {
    const canvas = document.getElementById("canvas");
    const ship = document.createElementNS(canvas.namespaceURI, 'g');
    Object.entries({
      'id': 'ship', 'transform' : `translate(${pos.x},${pos.y})`
    }).forEach(([key, val]) => ship.setAttribute(key, String(val)))

    // the spaceship will have a special shape!
    const polygon = document.createElementNS(canvas.namespaceURI, 'polygon');
    Object.entries({
      'points': "0,12 3,12 3,9 15,9 15,3 18,3 18,0 21,0 21,3 24,3 24,9 36,9 36,12 39,12 39,24 0,24",
      'style': "fill:rgb(69, 190, 69)"
    }).forEach(([key, val]) => polygon.setAttribute(key, String(val)))
    
    ship.append(polygon);
    canvas.append(ship);
  }

  // places a physical rect (alien or shield or bullet) on screen
  function spawnRect (pos: Vector, id: string, w:number, h:number, col: string = 'white'): void {
    // get the canvas
    const canvas = document.getElementById("canvas");
    const rect = document.createElementNS(canvas.namespaceURI,'rect');
    
    // set the attributes
    Object.entries({
      'x': pos.x, 'y': pos.y, 'id': id, 'width': w, 'height': h, 'fill': col}).forEach(
        ([key, val]) => rect.setAttribute(key, String(val))
      )
    canvas.appendChild(rect);
  }


  // function for handling collisions in a given game state
  const collisionHandler = (s:State) => {
    // This function checks for the bounds of entity a if they are within bounds of object b.
    const collided = (a: Entity, b: Entity, checkTeams: boolean = true) : boolean => 
    checkTeams ? (a.enemy !== b.enemy) && ((a.pos.y < b.pos.y - b.height && a.pos.y + a.height > b.pos.y &&
      a.pos.x < b.pos.x - b.width && a.pos.x + a.width > b.pos.x) ||
      (b.pos.y < a.pos.y - a.height && b.pos.y + b.height > a.pos.y &&
        b.pos.x < a.pos.x - a.width && b.pos.x + b.width > a.pos.x))
        :
        (a.pos.y < b.pos.y - b.height && a.pos.y + a.height > b.pos.y &&
        a.pos.x < b.pos.x - b.width && a.pos.x + a.width > b.pos.x) ||
        (b.pos.y < a.pos.y - a.height && b.pos.y + b.height > a.pos.y &&
          b.pos.x < a.pos.x - a.width && b.pos.x + b.width > a.pos.x)
    
    // collision check for ship dying (bool), and functions that find if an entity has collided with certain entity types
    const shipCollision : boolean = s.bullets.filter(b => collided(s.ship, b)).length > 0
    const alienCollision = (a: Entity) : boolean => s.aliens.filter((b: Entity) => collided(b, a)).length > 0
    const bulletCollision = (a: Entity) : boolean => s.bullets.filter((b: Entity) => collided(b, a)).length > 0
    const shieldCollision = (a: Entity) : boolean => s.shields.filter((b: Entity) => collided(b, a, false)).length > 0

    // checks if lowest alien near the shields and this will cause the player to lose
    const aliensInvaded : boolean = s.aliens.length == 0 ? false : s.aliens.reduce((lowest, curr) => lowest.pos.y > curr.pos.y ? lowest : curr).pos.y > 350

    // return the state MINUS things that have collided, e.g. bullets and the things they hit.
    return <State>{...s,
      // remove aliens that have been shot
      aliens: s.aliens.filter((a: Entity) => !bulletCollision(a)),
      // remove all bullets that have collided
      bullets: s.bullets
      .filter((b: Entity) => !alienCollision(b))
      .filter((b: Entity) => !shieldCollision(b))
      .filter(b => !collided(b, s.ship)),
      // remove shield(chunk)s that have collided
      shields: s.shields.filter((a: Entity) => !bulletCollision(a)),
      // queue up collided entities to be removed from the game
      exit: s.exit.concat(
        s.aliens.filter((a: Entity) => bulletCollision(a))
      ).concat(
        s.bullets.filter((b: Entity) => alienCollision(b))
      ).concat(
        s.shields.filter((a:Entity) => bulletCollision(a))
      ).concat(
        s.bullets.filter((b: Entity) => shieldCollision(b))
      ).concat(
        s.bullets.filter((b: Entity) => collided(s.ship, b))
      )
      ,
      // take damage when.... taking damage
      lives: s.lives - (shipCollision ? 1 : 0),
      // lose if you die or Space successfully Invades
      lose: s.lives == 0 || aliensInvaded,
      numAliens: (32 - s.aliens.length),
      points: s.level * s.numAliens ,
      win: s.aliens.length == 0
    }
  }

  // Allows aliens to speed up (or slow down). In the original game, they sped up as the player killed more of them
  const alienSpeedup = (e: Entity, speed: number, dir: Vector) : Entity => {
    return <Entity>{...e,
      speed: speed,
      dir: dir
    }
  } 

  // game tick actions occur here
  const tick = (s: State, elapsed: number) : State => {

    // find where to place bullets on the aliens (front of each column and within a +-40 pixel range along x with the ship)
    const alienBullets = (all: [Entity], curr: Entity, s: State) : Entity[] => (
      (s.aliens.filter((a) => (a.pos.x == curr.pos.x) && (a.pos.y > curr.pos.y)).length > 0) ? all
          : ((curr.pos.x < s.ship.pos.x + 20) && (curr.pos.x > s.ship.pos.x - 10) && (s.rng.next().int() % 39 == 0)) ? 
          all.concat([
            createBullet(
            curr.pos, 
            String(curr.id + "bullet" + String(s.time)), 
            new Vector(0, 1), 
            2 + s.level, 
            true
            )]): all
      )

    // count any entity (e.g. bullets) offscreen (vertically) as oob, we don't want to risk destroying the player this way
    const oob = (e: Entity) => (e.pos.y < 0 - e.height || e.pos.y > 600);
    const oobBullets: Entity[] = s.bullets.filter(oob);
    const ibBullets: Entity[] = s.bullets
      .filter((x) => !oob(x)) 
      .concat(s.aliens.reduce((all: [Entity], curr: Entity) => alienBullets(all, curr, s), []))

    // return the collision-handled gamestate including entity movement
    return collisionHandler({...s,
      aliens: s.aliens
      .map((a:Entity) => alienSpeedup(a, (s.time % (60 - s.numAliens - s.level) == 0) ? 10 + (4 * s.level) + s.numAliens / 8 : 0, 
        new Vector(Math.round(Math.sin((s.time / 180 * (s.numAliens / 4)))), (s.time % (200 - s.numAliens * 4) == 0) ?  1 : 0 )))
      .map((a: Entity) => move(a, a.dir)),
      bullets: ibBullets
      .map((b: Entity) => move(b, b.dir)),
      exit: oobBullets,
      time: elapsed,
      rng: new RNG(s.time),
    });
  }

  // Loads the correct level when playing, note that Level 2 is an essentially repeating level.
  const loadLevel = (s: State) : State => s.lose ? level0 : s.win ? createLevel(s.level + 1) : s
  
  // decides what action to take given a state mutator
  const reduceState = (s:State, e:Move | Shoot | Tick | LoadLevel) =>
    e instanceof LoadLevel ? 
      loadLevel(s) : 
    // moves the ship given the move state mutator's direction vector
    e instanceof Move ? s.lose || s.win ? s : {...s,
      ship: move(s.ship, new Vector(e.h, e.v))
    } :
    // Creates a new Bullet entity and places it at the nose of the ship
    e instanceof Shoot? s.lose || s.win ? s :{...s,
      count: s.time > s.lastShot + 10 ? s.count + 1 : s.count,
      bullets: s.bullets.concat(s.time > s.lastShot + 10 ? s.time > s.lastShot + 30 ? 
        [createBullet(
          new Vector(s.ship.pos.x + 18, s.ship.pos.y - 18),
         `bullet${s.count}`,
         new Vector(0, -1), 
         25, 
         false)]
        : [
        createBullet(
          new Vector(s.ship.pos.x + 18, s.ship.pos.y - 18),
         `bullet${s.count}`,
         new Vector(0, -1), 
         5, 
         false)] : []),
      lastShot: s.time > s.lastShot + 10 ? s.time : s.lastShot
    } :
    // last but not least, run the game loop if no specific inputs have to be handled
    s.lose || s.win ? s : tick(s, e.elapsed)
  
  // subscription for game state to state reduction
  const subscription = merge(reload, startLeft, startRight, shoot, gameTick)
  .pipe(scan(reduceState, level0)).subscribe(updateView);
  
  // function to update the view for the user
  function updateView(s:State) {
    // clean the canvas before drawing to it
    wipe()
    // check if the ship is there, if not, place it there
    const canvas = document.getElementById("canvas")!;
    const shipsvg = document.getElementById("ship")!;
    shipsvg ? shipsvg.setAttribute("transform", `translate(${s.ship.pos.x},${s.ship.pos.y})`) : spawnShip(s.ship.pos);

    // Updates bullet obj positions or spawns them in 
    s.bullets.forEach((b) => {
      document.getElementById(b.id) ? 
      ["x", "y"].forEach(c => document.getElementById(b.id).setAttribute(c, String(c == "x" ? b.pos.x : b.pos.y))) :
      spawnRect(b.pos, b.id, 3, b.speed > 20 ? 20 : 18, b.enemy ? "white" : b.speed > 20 ? "red" : "lime") 
    });

    // Updates alien obj positions or spawns them in
    s.aliens.forEach((a)=> {
      document.getElementById(a.id) ?
      ["x", "y"].forEach(c => document.getElementById(a.id).setAttribute(c, String(c == "x" ? a.pos.x : a.pos.y))):
      spawnRect(a.pos, a.id, a.width, a.height);
    })

    // for each shield entity, place them on screen
    s.shields.forEach((a)=> {
      document.getElementById(a.id) ?
      ["x", "y"].forEach(c => document.getElementById(a.id).setAttribute(c, String(c == "x" ? a.pos.x : a.pos.y))):
      spawnRect(a.pos, a.id, a.width, a.height, "lime");
    })

    // Cleanup of 'inactive' objects, like dead enemies
    s.exit.forEach(e => {
      if (document.getElementById(e.id)){
        document.getElementById(e.id).parentElement.removeChild(document.getElementById(e.id));
    }
  })

  // places the score text on screen
  if (document.getElementById("score")){
    const score = document.getElementById("score");
    score.textContent = `Score: `;
  }
  else{
    const score = document.createElementNS(canvas.namespaceURI, "text");
    score.setAttribute("x", String(100)); 
    score.setAttribute("y", String(50));
    score.setAttribute('fill', 'white');
    score.setAttribute('id', "score");
    score.textContent = `Score: ${s.points}`;
    canvas.appendChild(score);
  }

  // places the level text on screen
  if (document.getElementById("level")){
    const level = document.getElementById("level");
    level.textContent = `Level: `;
  }
  else{
    const level = document.createElementNS(canvas.namespaceURI, "text");
    level.setAttribute("x", String(250)); 
    level.setAttribute("y", String(50));
    level.setAttribute('fill', 'white');
    level.setAttribute('id', "level");
    level.textContent = `Level: ${s.level}`;
    canvas.appendChild(level);
  }

  // places the lives text on screen
  if (document.getElementById("lives")){
    const lives = document.getElementById("lives");
    lives.textContent = 'Lives: ';
  }
  else{
    const lives = document.createElementNS(canvas.namespaceURI, "text");
    lives.setAttribute("x", String(400)); 
    lives.setAttribute("y", String(50));
    lives.setAttribute('fill', 'white');
    lives.setAttribute('id', "level");
    lives.textContent = `Lives: ${s.lives}`;
    canvas.appendChild(lives);
  }
  
  // if the game is over, unsubscribe from the game loop and display Game Over text.
  if (s.lose || s.win){
    wipe()
    //subscription.unsubscribe();
    const v = document.createElementNS(canvas.namespaceURI, "text");
    v.setAttribute("x", String(100)); 
    v.setAttribute("y", String(90));
    v.setAttribute('fill', 'white');
    v.setAttribute('id', 'gameText')
    v.textContent = s.win ? `You beat level ${s.level} ! Press 'Down' to go to the next level` : `Game Over, Score: ${s.points}. Press 'Down' to restart`;
    canvas.appendChild(v);
  }  
  else{
      if(document.getElementById("gameText")){
        document.getElementById("gameText").innerHTML = ""
      }
    }
  }
}

// Let's hope it runs
if (typeof window != 'undefined')
  window.onload = ()=>{
    spaceinvaders();
  }