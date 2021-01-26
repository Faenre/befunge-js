
const output = (text) => process.stdout.write(text);
const input = function() {
  const rlSync = require('readline-sync');
  return () => rlSync.question('');
}();
const isNumeric = (chr) => !!(chr.match(/[0-9]/));

const newPosition = (x, y) => ({ x, y });

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
  const X_SIZE = 80;
  const Y_SIZE = 25;

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
  const movements = {
    '^'(pos) { pos.y -= 1 },
    '>'(pos) { pos.x += 1 },
    'v'(pos) { pos.y += 1 },
    '<'(pos) { pos.x -= 1 },
  };
  return {
    position: newPosition(0, 0),
    direction: '>',
    grid,
    move() {
      movements[this.direction](this.position);
      this.wraparound();
    },
    stringMode: false,
    toggleStringMode() { this.stringMode = !this.stringMode },
    charAt() { return this.grid.getAtPos(this.position) },
    wraparound() {
      let pos = this.position;
      if (pos.x < 0) pos.x += this.grid.X_SIZE;
      else if (pos.x >= this.grid.X_SIZE) pos.x -= this.grid.X_SIZE;
      if (pos.y < 0) pos.y += this.grid.Y_SIZE;
      else if (pos.y >= this.grid.Y_SIZE) pos.y -= this.grid.Y_SIZE;
    },
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

let newState = function(program) {
  let grid = newGrid(program);
  let cursor = newCursor(grid);
  let stack = newStack();

  return {
    cursor,
    grid,
    stack,
    iterations: 0,
    isComplete: false,
    iterate() {
      if (this.isComplete) return;
      else this.iterations++;

      let char = cursor.charAt();
      if (cursor.stringMode && char !== '"') stack.pushChr(char);
      else {
        while (cursor.charAt() === ' ') cursor.move();
        char = cursor.charAt();

        if (isNumeric(char)) stack.push(+char);
        else if (char === '@') this.isComplete = true;
        else if (Object.keys(INSTRUCTIONS).includes(char)) {
          INSTRUCTIONS[char].call(this);
        }
      }
      cursor.move();
    },
    iterateUntilComplete() {
      let safetyCounter = 100000;
      while (!this.isComplete && safetyCounter--) {
        this.iterate();
      }
    }
  };
};

// let program = '<>:#,_@#:"Hello, world!"';
let program = [
  '<v"Hello, world!"',
  ' >:#,_@'
].join('\n');

let app = newState(program);

app.iterateUntilComplete();
console.log();
console.log(`Completed in ${app.iterations} iterations`);

let dnaCode = `\
 >78*vD
v$_#>vN
7>!@  A
3 :v??v
9,-""""
4+1ACGT
+,,""""
>^^<<<<`;
app = newState(dnaCode);
app.iterateUntilComplete();
