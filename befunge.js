'use strict';

const X_SIZE = 80;
const Y_SIZE = 25;

const output = (text) => process.stdout.write(text);
const input = function() {
  const rlSync = require('readline-sync');
  return () => rlSync.question('');
}();
const isNumeric = (chr) => !!(chr.match(/[0-9]/));

const INSTRUCTIONS = {
  // arithmetic
  '+'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b + a)) },
  '*'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b * a)) },
  '-'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b - a)) },
  '/'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b / a)) },
  '%'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b % a)) },
  // movement & cardinal directions
  '#'() { this.cursor.move() },
  '^'() { this.cursor.direction = '^' },
  '>'() { this.cursor.direction = '>' },
  'v'() { this.cursor.direction = 'v' },
  '<'() { this.cursor.direction = '<' },
  '?'() {
    let rand = parseInt(Math.random() * 4, 10);
    this.cursor.direction = ['^', '>', 'v', '<'][rand];
  },
  // boolean logic
  '!'() { this.stack.push(this.stack.pop()[0] ? 0 : 1) },
  '`'() { this.stack.push(this.stack.pop(2).reduce((b, a) => (a > b ? 1 : 0)))},
  '_'() { this.cursor.direction = (this.stack.pop()[0] ? '<' : '>') },
  '|'() { this.cursor.direction = (this.stack.pop()[0] ? '^' : 'v') },
  // toggle mode-shifting
  '"'() { this.cursor.toggleStringMode() },
  // stack management
  '$'()  { this.stack.pop() },
  ':'()  { this.stack.push(this.stack.peak()) },
  '\\'() { this.stack.push(...this.stack.pop(2)) },
  // input/output
  '.'() { output('' + this.stack.pop()[0]) },
  ','() { output(String.fromCharCode(this.stack.pop()[0])) },
  '&'() { this.stack.push(+input()) },
  '~'() { this.stack.pushChr(input()) },
  // non-stack storage
  'g'() {
    let pos = newPosition(...this.stack.pop(2));
    this.stack.pushChr(this.grid.getAtPos(pos));
  },
  'p'() {
    let pos = newPosition(...this.stack.pop(2));
    let val = String.fromCharCode(this.stack.pop()[0]);
    this.grid.setAtPos(pos, val);
  },
};

const befungeApp = function(program) {
  let grid = newGrid(program);
  let cursor = newCursor(grid);
  let stack = newStack();

  return {
    cursor,
    grid,
    stack,
    iterations: 0,
    isComplete: false,
    iterate() { iterateState(this) },
    iterateUntilComplete() {
      let safetyCounter = 100000;
      while (!this.isComplete && safetyCounter--) {
        this.iterate();
      }
    }
  };
};

function iterateState(context) {
  if (context.isComplete) return;
  else context.iterations++;

  let char = context.cursor.charAt();
  if (context.cursor.stringMode && char !== '"') context.stack.pushChr(char);
  else {
    while (context.cursor.charAt() === ' ') context.cursor.move();
    char = context.cursor.charAt();

    if (isNumeric(char)) context.stack.push(+char);
    else if (char === '@') context.isComplete = true;
    else if (Object.keys(INSTRUCTIONS).includes(char)) {
      INSTRUCTIONS[char].call(context);
    }
  }
  context.cursor.move();
}

function newGrid(program) {
  let grid = Array(X_SIZE).fill(1).map(() => Array(Y_SIZE).fill(' '));
  program.split('\n').slice(0, Y_SIZE).forEach((rowContent, yIdx) => {
    rowContent.split('').slice(0, X_SIZE).forEach((char, xIdx) => {
      grid[xIdx][yIdx] = char;
    });
  });

  return {
    X_SIZE,
    Y_SIZE,
    grid,
    getAtPos(pos) { return this.grid[pos.x][pos.y] || ' ' },
    setAtPos(pos, val) { this.grid[pos.x][pos.y] = val },
  };
}

function newCursor(grid) {
  return {
    position: newPosition(0, 0),
    direction: '>',
    grid,
    charAt() { return this.grid.getAtPos(this.position) },
    move() { this.position.move(this.direction) },
    stringMode: false,
    toggleStringMode() { this.stringMode = !this.stringMode },
  };
}

function newStack() {
  return {
    storage: [],
    push(...items) { items.forEach(item => this.storage.push(item)) },
    pushChr(char) { this.push(char.charCodeAt()) },
    pop(num = 1) { return this.storage.splice(this.storage.length - num, num) },
    peak() { return this.storage[this.storage.length - 1] },
  };
}

function newPosition (x, y) {
  return {
    x,
    y,
    move(dir) {
      if      (dir === '^') this.y -= 1;
      else if (dir === '>') this.x += 1;
      else if (dir === 'v') this.y += 1;
      else if (dir === '<') this.x -= 1;
      this.wraparound();
    },
    wraparound() {
      if (this.x < 0) this.x += X_SIZE;
      else if (this.x >= X_SIZE) this.x -= X_SIZE;
      if (this.y < 0) this.y += Y_SIZE;
      else if (this.y >= Y_SIZE) this.y -= Y_SIZE;
    },
  };
}

// -------------------- examples below -------------------- //

let program = `\
<v"Hello, world!"
 >:#,_@\
`;

let app = befungeApp(program);

app.iterateUntilComplete();
console.log();
console.log(`Completed in ${app.iterations} iterations`);
console.log();

let dnaCode = `\
 >78*vD
v$_#>vN
7>!@  A
3 :v??v
9,-""""
4+1ACGT
+,,""""
>^^<<<<\
`;
app = befungeApp(dnaCode);
app.iterateUntilComplete();
console.log(`Completed in ${app.iterations} iterations`);
