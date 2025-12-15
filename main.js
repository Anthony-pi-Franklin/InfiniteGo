const boardCanvas = document.getElementById('board');
const boardCtx = boardCanvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const minimapScaleInput = document.getElementById('minimapScale');
const minimapScaleLabel = document.getElementById('minimapScaleLabel');
const boardWrapper = document.querySelector('.board-wrapper');

// Logical grid dimension (cells), independent from canvas pixel size
const BOARD_SIZE = 512;
const AUTO_PAN_EDGE_THRESHOLD = 40;
const AUTO_PAN_SPEED = 32;
const MINIMAP_GRID_SPACING = 32;
const MINIMAP_STONE_OFFSET = 1;
const MINIMAP_STONE_SIZE = 3;
const stones = new Map();

let cellSize = 28;
const MIN_CELL = 12;
const MAX_CELL = 60;
let viewport = { x: BOARD_SIZE / 2 - 15, y: BOARD_SIZE / 2 - 15 };
let currentColor = 'black';
let minimapScaleFactor = parseFloat(minimapScaleInput.value);

const mouse = { x: 0, y: 0, inside: false };
let lastFrame = performance.now();
let minimapDragging = false;

function resizeBoard() {
  boardCanvas.width = boardWrapper.clientWidth;
  boardCanvas.height = boardWrapper.clientHeight;
}

window.addEventListener('resize', resizeBoard);
resizeBoard();

function getViewWidth() {
  return boardCanvas.width / cellSize;
}

function getViewHeight() {
  return boardCanvas.height / cellSize;
}

function clampViewport() {
  const vw = getViewWidth();
  const vh = getViewHeight();
  viewport.x = Math.max(0, Math.min(BOARD_SIZE - vw, viewport.x));
  viewport.y = Math.max(0, Math.min(BOARD_SIZE - vh, viewport.y));
}

function placeStone(screenX, screenY) {
  const gridX = Math.floor(viewport.x + screenX / cellSize);
  const gridY = Math.floor(viewport.y + screenY / cellSize);
  const key = `${gridX},${gridY}`;
  if (stones.has(key)) return;
  stones.set(key, currentColor);
  currentColor = currentColor === 'black' ? 'white' : 'black';
}

function getMousePosition(event, target) {
  const rect = target.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

boardCanvas.addEventListener('mouseenter', () => (mouse.inside = true));
boardCanvas.addEventListener('mouseleave', () => (mouse.inside = false));
boardCanvas.addEventListener('mousemove', (e) => {
  const pos = getMousePosition(e, boardCanvas);
  mouse.x = pos.x;
  mouse.y = pos.y;
});

boardCanvas.addEventListener('click', (e) => {
  const pos = getMousePosition(e, boardCanvas);
  placeStone(pos.x, pos.y);
});

boardCanvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const pos = getMousePosition(e, boardCanvas);
    const worldBefore = {
      x: viewport.x + pos.x / cellSize,
      y: viewport.y + pos.y / cellSize,
    };

    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    cellSize = Math.max(MIN_CELL, Math.min(MAX_CELL, cellSize * delta));

    viewport.x = worldBefore.x - pos.x / cellSize;
    viewport.y = worldBefore.y - pos.y / cellSize;
    clampViewport();
  },
  { passive: false }
);

function drawGrid() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

  boardCtx.fillStyle = '#f2e3b5';
  boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  boardCtx.strokeStyle = '#444';
  boardCtx.lineWidth = 1;

  const startX = Math.floor(viewport.x);
  const startY = Math.floor(viewport.y);
  const offsetX = -(viewport.x - startX) * cellSize;
  const offsetY = -(viewport.y - startY) * cellSize;

  const vLines = Math.ceil(getViewWidth()) + 2;
  const hLines = Math.ceil(getViewHeight()) + 2;

  boardCtx.beginPath();
  for (let i = 0; i < vLines; i++) {
    const x = offsetX + i * cellSize;
    boardCtx.moveTo(x, 0);
    boardCtx.lineTo(x, boardCanvas.height);
  }
  for (let j = 0; j < hLines; j++) {
    const y = offsetY + j * cellSize;
    boardCtx.moveTo(0, y);
    boardCtx.lineTo(boardCanvas.width, y);
  }
  boardCtx.stroke();
}

function drawStones() {
  boardCtx.shadowColor = 'rgba(0,0,0,0.35)';
  boardCtx.shadowBlur = 6;

  for (const [key, color] of stones.entries()) {
    const [gx, gy] = key.split(',').map(Number);
    const px = (gx - viewport.x) * cellSize;
    const py = (gy - viewport.y) * cellSize;
    if (px < -cellSize || py < -cellSize || px > boardCanvas.width || py > boardCanvas.height) continue;
    const radius = cellSize * 0.45;
    boardCtx.beginPath();
    boardCtx.arc(px + cellSize / 2, py + cellSize / 2, radius, 0, Math.PI * 2);
    boardCtx.fillStyle = color === 'black' ? '#111' : '#f8f8f8';
    boardCtx.fill();
  }

  boardCtx.shadowBlur = 0;
}

function drawBoard() {
  drawGrid();
  drawStones();
}

function drawMinimap() {
  minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  const baseScale = Math.min(minimapCanvas.width, minimapCanvas.height) / BOARD_SIZE;
  const mmScale = baseScale * minimapScaleFactor;

  minimapCtx.fillStyle = '#0e1016';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  minimapCtx.strokeStyle = '#1f2635';
  minimapCtx.lineWidth = 1;
  minimapCtx.beginPath();
  for (let i = 0; ; i += MINIMAP_GRID_SPACING) {
    const x = i * mmScale;
    if (x > minimapCanvas.width) break;
    minimapCtx.moveTo(x, 0);
    minimapCtx.lineTo(x, minimapCanvas.height);
  }
  for (let i = 0; ; i += MINIMAP_GRID_SPACING) {
    const y = i * mmScale;
    if (y > minimapCanvas.height) break;
    minimapCtx.moveTo(0, y);
    minimapCtx.lineTo(minimapCanvas.width, y);
  }
  minimapCtx.stroke();

  for (const [key, color] of stones.entries()) {
    const [gx, gy] = key.split(',').map(Number);
    const px = gx * mmScale;
    const py = gy * mmScale;
    minimapCtx.fillStyle = color === 'black' ? '#0ae9d9' : '#6b7bff';
    minimapCtx.fillRect(px - MINIMAP_STONE_OFFSET, py - MINIMAP_STONE_OFFSET, MINIMAP_STONE_SIZE, MINIMAP_STONE_SIZE);
  }

  const viewRect = {
    x: viewport.x * mmScale,
    y: viewport.y * mmScale,
    w: getViewWidth() * mmScale,
    h: getViewHeight() * mmScale,
  };

  minimapCtx.strokeStyle = '#f6c344';
  minimapCtx.lineWidth = 2;
  minimapCtx.strokeRect(viewRect.x, viewRect.y, viewRect.w, viewRect.h);
  minimapCtx.fillStyle = 'rgba(246,195,68,0.1)';
  minimapCtx.fillRect(viewRect.x, viewRect.y, viewRect.w, viewRect.h);
}

minimapScaleInput.addEventListener('input', (e) => {
  minimapScaleFactor = parseFloat(e.target.value);
  minimapScaleLabel.textContent = `${Math.round(minimapScaleFactor * 100)}%`;
  drawMinimap();
});

function minimapToWorld(px, py) {
  const baseScale = Math.min(minimapCanvas.width, minimapCanvas.height) / BOARD_SIZE;
  const mmScale = baseScale * minimapScaleFactor;
  return { x: px / mmScale, y: py / mmScale };
}

function handleMinimapMove(event) {
  const pos = getMousePosition(event, minimapCanvas);
  const world = minimapToWorld(pos.x, pos.y);
  viewport.x = world.x - getViewWidth() / 2;
  viewport.y = world.y - getViewHeight() / 2;
  clampViewport();
}

minimapCanvas.addEventListener('mousedown', (e) => {
  minimapDragging = true;
  handleMinimapMove(e);
});

window.addEventListener('mouseup', () => (minimapDragging = false));
minimapCanvas.addEventListener('mousemove', (e) => {
  if (minimapDragging) handleMinimapMove(e);
});

function update(dt) {
  if (mouse.inside) {
    let dx = 0;
    let dy = 0;
    if (mouse.x < AUTO_PAN_EDGE_THRESHOLD) dx = -1;
    else if (mouse.x > boardCanvas.width - AUTO_PAN_EDGE_THRESHOLD) dx = 1;
    if (mouse.y < AUTO_PAN_EDGE_THRESHOLD) dy = -1;
    else if (mouse.y > boardCanvas.height - AUTO_PAN_EDGE_THRESHOLD) dy = 1;

    const move = AUTO_PAN_SPEED * dt;
    viewport.x += dx * move;
    viewport.y += dy * move;
    clampViewport();
  }
}

function loop(timestamp) {
  const dt = (timestamp - lastFrame) / 1000;
  lastFrame = timestamp;
  update(dt);
  drawBoard();
  drawMinimap();
  requestAnimationFrame(loop);
}

minimapScaleLabel.textContent = `${Math.round(minimapScaleFactor * 100)}%`;
clampViewport();
requestAnimationFrame(loop);
