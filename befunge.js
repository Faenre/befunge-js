const X_SIZE = 80;
const Y_SIZE = 25;

const output = (text) => process.stdout.write(text);
const input = function() {
  const rlSync = require('readline-sync');
  return () => rlSync.question('');
}();
const isNumeric = (chr) => !!(chr.match(/[0-9]/));

const newPosition = (x, y) => ({ x, y });
let wraparound = (pos) => {
  if (pos.x < 0) pos.x += X_SIZE;
  else if (pos.x >= X_SIZE) pos.x -= X_SIZE;
  if (pos.y < 0) pos.y += Y_SIZE;
  else if (pos.y >= Y_SIZE) pos.y -= Y_SIZE;
};
const MOVEMENTS = {
  '^'(pos) { pos.y -= 1 },
  '>'(pos) { pos.x += 1 },
  'v'(pos) { pos.y += 1 },
  '<'(pos) { pos.x -= 1 },
};

// requires explicit context binding
const INSTRUCTIONS = {
  // arithmetic
  '+'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b + a)) },
  '*'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b * a)) },
  '-'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b - a)) },
  '/'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b / a)) },
  '%'() { this.stack.push(this.stack.pop(2).reduce((b, a) => b % a)) },
  // cardinal directions
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
  // mode shifting
  '"'() { this.cursor.toggleStringMode() },
  // stack management
  ':'() {
    let [ a ] = this.stack.pop();
    this.stack.push(a, a);
  },
  '$'()  { this.stack.pop() },
  '\\'() { this.stack.push(...this.stack.pop(2)) },
  // input/output
  '.'() { output('' + this.stack.pop()[0]) },
  ','() { output(String.fromCharCode(this.stack.pop()[0])) },
  '#'() { this.cursor.move() },
  '&'() { this.stack.push(+input()) },
  '~'() { this.stack.pushChr(input()) },
  // non-stack storage
  'g'() { // stub
    let pos = newPosition(...this.stack.pop(2));
    this.stack.pushChr(this.grid.getAtPos(pos));
  },
  'p'() {
    let pos = newPosition(...this.stack.pop(2));
    let val = String.fromCharCode(this.stack.pop()[0]);
    this.grid.setAtPos(pos, val);
  },
};

let newGrid = function(program) {

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
};

let newCursor = function(grid) {
  return {
    position: newPosition(0, 0),
    direction: '>',
    grid,
    charAt() { return this.grid.getAtPos(this.position) },
    move() {
      MOVEMENTS[this.direction](this.position);
      this.wraparound();
    },
    wraparound() { wraparound(this.position) },
    stringMode: false,
    toggleStringMode() { this.stringMode = !this.stringMode },
  };
};

let newStack = function() {
  return {
    storage: [],
    push(...items) { items.forEach(item => this.storage.push(item)) },
    pushChr(char) { this.push(char.charCodeAt()) },
    pop(num = 1) { return this.storage.splice(this.storage.length - num, num) },
  };
};

let iterateState = function(context) {
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
};

let befungeApp = function(program) {
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
