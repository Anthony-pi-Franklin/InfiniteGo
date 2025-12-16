// Minimap component for InfiniteGo
import { CONFIG } from './config.js';

export class Minimap {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dragging = false;
    this.windowDragging = false;
    this.windowDragOffset = { x: 0, y: 0 };
    this.collapsed = false;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Make floating window draggable
    const windowEl = document.getElementById('minimap-float');
    const header = windowEl.querySelector('h3');
    
    header.addEventListener('mousedown', (e) => {
      this.windowDragging = true;
      const rect = windowEl.getBoundingClientRect();
      this.windowDragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      windowEl.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (this.windowDragging) {
        windowEl.style.left = `${e.clientX - this.windowDragOffset.x}px`;
        windowEl.style.top = `${e.clientY - this.windowDragOffset.y}px`;
        windowEl.style.right = 'auto';
        windowEl.style.bottom = 'auto';
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.windowDragging) {
        this.windowDragging = false;
        windowEl.style.cursor = 'move';
      }
    });

    // Toggle collapse on double-click
    header.addEventListener('dblclick', () => {
      this.collapsed = !this.collapsed;
      const canvas = windowEl.querySelector('canvas');
      canvas.style.display = this.collapsed ? 'none' : 'block';
      header.textContent = `Minimap ${this.collapsed ? '▼' : '▲'}`;
    });

    // Canvas interactions for navigation
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
      this.resolveOverlap();
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

  resolveOverlap() {
    const el = document.getElementById('minimap-float');
    const other = document.getElementById('leaderboard-float');
    if (!el || !other) return;
    const r1 = el.getBoundingClientRect();
    const r2 = other.getBoundingClientRect();
    const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
    if (overlap) {
      // push leaderboard below minimap
      other.style.top = `${r1.bottom + 16}px`;
      other.style.right = '16px';
      other.style.left = 'auto';
    }
  }

  handleDrag(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const worldX = (mx - centerX) / this.state.minimapScale;
    const worldY = (my - centerY) / this.state.minimapScale;

    this.state.pan.x = -worldX * this.state.scale;
    this.state.pan.y = -worldY * this.state.scale;
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

      this.ctx.fillStyle = CONFIG.STONE_COLORS[stone.color] || '#888';
      this.ctx.fillRect(mx - 1, my - 1, 2, 2);
    }

    // Draw viewport rectangle
    const mainCanvas = document.getElementById('canvas');
    const mainW = mainCanvas.width;
    const mainH = mainCanvas.height;
    const mainScale = this.state.scale;
    const mainPan = this.state.pan;
    
    // Main canvas viewport in world coordinates (centered at 0,0)
    const vpLeft = (-mainW / 2 - mainPan.x) / mainScale;
    const vpRight = (mainW / 2 - mainPan.x) / mainScale;
    const vpTop = (-mainH / 2 - mainPan.y) / mainScale;
    const vpBottom = (mainH / 2 - mainPan.y) / mainScale;

    // Convert to minimap screen coordinates
    const vpScreenLeft = centerX + vpLeft * scale;
    const vpScreenRight = centerX + vpRight * scale;
    const vpScreenTop = centerY + vpTop * scale;
    const vpScreenBottom = centerY + vpBottom * scale;

    // Clamp to minimap bounds
    const clampedLeft = Math.max(0, Math.min(width, vpScreenLeft));
    const clampedRight = Math.max(0, Math.min(width, vpScreenRight));
    const clampedTop = Math.max(0, Math.min(height, vpScreenTop));
    const clampedBottom = Math.max(0, Math.min(height, vpScreenBottom));

    this.ctx.strokeStyle = '#0f0';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(clampedLeft, clampedTop, clampedRight - clampedLeft, clampedBottom - clampedTop);
  }

  start() {
    const animate = () => {
      this.draw();
      requestAnimationFrame(animate);
    };
    animate();
  }
}
