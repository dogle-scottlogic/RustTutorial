import { memory } from "wasm-game-of-life/wasm_game_of_life_bg.wasm";
import { Universe, Cell } from "wasm-game-of-life";

const CELL_SIZE = 5; // px
let GRID_WIDTH = 64;
let GRID_HEIGHT = 64;
let GRID_COLOR = "#000000";
const DEAD_COLOR = "#4B4E53";
const ALIVE_COLOR = "#000000";
let animationId = null;
let showGrid = false;
let showFps = false;
let random = false;

// Construct the universe, and get its width and height.
let universe = Universe.new(GRID_WIDTH, GRID_HEIGHT, random);
let width = universe.width();
let height = universe.height();

// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = document.getElementById("game-of-life-canvas");
const playPauseButton = document.getElementById("play-pause");
const toggleGridButton = document.getElementById("toggle-grid");
const toggleStatsButton = document.getElementById("toggle-fps");
const fps_element = document.getElementById("fps");
const heightInput = document.getElementById("height-input");
const widthInput = document.getElementById("width-input");
const newRandom = document.getElementById("random");
heightInput.placeholder = height;
widthInput.placeholder = width;

canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

let ctx = canvas.getContext("2d");

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const redrawUniverse = debounce(() => {
  universe = Universe.new(GRID_WIDTH, GRID_HEIGHT, random);
  width = universe.width();
  height = universe.height();
  canvas.height = (CELL_SIZE + 1) * height + 1;
  canvas.width = (CELL_SIZE + 1) * width + 1;
  drawCells();
});

const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines.
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
};

const getIndex = (row, column) => {
  return row * width + column;
};

canvas.addEventListener("click", (event) => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

  universe.toggle_cell(row, col);

  if (showGrid) {
    drawGrid();
  }
  drawCells();
});

const drawCells = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

  ctx.beginPath();

  // Alive cells.
  const grd = ctx.createLinearGradient(0, 0, width * 8, 0);
  grd.addColorStop(0, "red");
  grd.addColorStop(1, "black")
  ctx.fillStyle = grd;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (cells[idx] !== Cell.Alive) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  // Dead cells.
  ctx.fillStyle = DEAD_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (cells[idx] !== Cell.Dead) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke();
};

const play = () => {
  playPauseButton.textContent = "⏸";
  renderLoop();
};

const pause = () => {
  playPauseButton.textContent = "▶";
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener("click", () => {
  if (animationId === null) {
    play();
  } else {
    pause();
  }
});

toggleGridButton.addEventListener("click", () => {
  showGrid = !showGrid;
  if (showGrid) {
    drawGrid();
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCells();
  }
});

toggleStatsButton.addEventListener("click", () => {
  showFps = !showFps;
  if (showFps) {
    fps_element.style.display = "block";
    fps.render();
  } else {
    fps_element.style.display = "none";
  }
});

heightInput.addEventListener("change", (event) => {
  GRID_HEIGHT = Number(event.target.value);
  redrawUniverse();
});

widthInput.addEventListener("change", (event) => {
  GRID_WIDTH = Number(event.target.value);
  redrawUniverse();
});

newRandom.addEventListener("click", () => {
  random = true;
  universe = Universe.new(GRID_WIDTH, GRID_HEIGHT, random);
  drawCells();
});

const renderLoop = () => {
  fps.render();
  // for (let i = 0; i < 9; i++) {
    universe.tick();
  // }
  animationId = requestAnimationFrame(renderLoop);
  drawCells();
};

const fps = new (class {
  constructor(fps) {
    this.fps = fps
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    // Convert the delta time since the last frame render into a measure
    // of frames per second.
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = (1 / delta) * 1000;

    // Save only the latest 100 timings.
    this.frames.push(fps);
    if (this.frames.length > 100) {
      this.frames.shift();
    }

    // Find the max, min, and mean of our 100 latest timings.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;

    // Render the statistics.
    this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
  }
})(fps_element);

drawCells();
pause();
