// Minimap component for InfiniteGo
import { CONFIG } from './config.js';

export class Minimap {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dragging = false;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.handleDrag(e);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.dragging) {
        this.handleDrag(e);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.dragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? CONFIG.ZOOM_FACTOR : 1 / CONFIG.ZOOM_FACTOR;
      const newScale = Math.max(
        CONFIG.MINIMAP_MIN_SCALE,
        Math.min(CONFIG.MINIMAP_MAX_SCALE, this.state.minimapScale * factor)
      );
      this.state.minimapScale = newScale;
    });
  }

  handleDrag(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const worldX = (mx - centerX) / this.state.minimapScale;
    const worldY = -(my - centerY) / this.state.minimapScale;

    const mainCanvas = document.getElementById('canvas');
    this.state.pan.x = mainCanvas.width / 2 - worldX * this.state.scale;
    this.state.pan.y = mainCanvas.height / 2 - worldY * this.state.scale;
    this.state.saveViewState();
  }

  draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = this.state.minimapScale;

    // Draw stones
    for (const stone of this.state.stones.values()) {
      const wx = Number(stone.x);
      const wy = Number(stone.y);
      const mx = centerX + wx * scale;
      const my = centerY - wy * scale;

      this.ctx.fillStyle = CONFIG.STONE_COLORS[stone.color] || CONFIG.STONE_COLORS[1];
      this.ctx.fillRect(mx - 1, my - 1, 2, 2);
    }

    // Draw viewport rectangle
    const mainCanvas = document.getElementById('canvas');
    const vpLeft = -this.state.pan.x / this.state.scale;
    const vpTop = -this.state.pan.y / this.state.scale;
    const vpRight = (mainCanvas.width - this.state.pan.x) / this.state.scale;
    const vpBottom = (mainCanvas.height - this.state.pan.y) / this.state.scale;

    const vpScreenLeft = centerX + vpLeft * scale;
    const vpScreenTop = centerY - vpBottom * scale;
    const vpScreenWidth = (vpRight - vpLeft) * scale;
    const vpScreenHeight = (vpBottom - vpTop) * scale;

    this.ctx.strokeStyle = '#0f0';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(vpScreenLeft, vpScreenTop, vpScreenWidth, vpScreenHeight);
  }

  start() {
    const animate = () => {
      this.draw();
      requestAnimationFrame(animate);
    };
    animate();
  }
}
