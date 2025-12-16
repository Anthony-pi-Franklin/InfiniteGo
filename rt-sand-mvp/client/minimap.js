// Minimap component for InfiniteGo
import { CONFIG } from './config.js';

export class Minimap {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dragging = false;
    this.windowDragging = false;
    this.windowResizing = false;
    this.windowDragOffset = { x: 0, y: 0 };
    this.collapsed = false;
    
    this.setupEventListeners();
  }

  setPosition(windowEl, x, y) {
    const w = windowEl.offsetWidth;
    const h = windowEl.offsetHeight;
    const clampedX = Math.max(0, Math.min(window.innerWidth - w, x));
    const clampedY = Math.max(0, Math.min(window.innerHeight - h, y));
    windowEl.style.left = `${clampedX}px`;
    windowEl.style.top = `${clampedY}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
  }

  separateFromOther() {
    const el = document.getElementById('minimap-float');
    const other = document.getElementById('leaderboard-float');
    if (!el || !other) return;
    const r1 = el.getBoundingClientRect();
    const r2 = other.getBoundingClientRect();
    const overlap = !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
    if (!overlap) return;

    const dx = Math.min(r1.right - r2.left, r2.right - r1.left);
    const dy = Math.min(r1.bottom - r2.top, r2.bottom - r1.top);
    let newX = r1.left;
    let newY = r1.top;
    const gap = 8;
    if (dx < dy) {
      newX += r1.left < r2.left ? -(dx + gap) : (dx + gap);
    } else {
      newY += r1.top < r2.top ? -(dy + gap) : (dy + gap);
    }
    this.setPosition(el, newX, newY);
  }

  setupEventListeners() {
    // Make floating window draggable
    const windowEl = document.getElementById('minimap-float');
    const header = windowEl.querySelector('h3');
    const resizeHandle = windowEl.querySelector('.resize-handle');
    
    const startDrag = (e) => {
      if (this.windowResizing) return;
      this.windowDragging = true;
      const rect = windowEl.getBoundingClientRect();
      this.windowDragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      windowEl.style.cursor = 'grabbing';
    };

    // Drag from header or body (excluding resize handle)
    header.addEventListener('mousedown', startDrag);
    windowEl.addEventListener('mousedown', (e) => {
      if (e.target === resizeHandle) return;
      startDrag(e);
    });

    window.addEventListener('mousemove', (e) => {
      const windowEl = document.getElementById('minimap-float');
      if (!windowEl) return;
      
      if (this.windowDragging) {
        const x = e.clientX - this.windowDragOffset.x;
        const y = e.clientY - this.windowDragOffset.y;
        this.setPosition(windowEl, x, y);
        this.separateFromOther();
      }
      
      if (this.windowResizing) {
        const rect = windowEl.getBoundingClientRect();
        const newWidth = Math.max(100, e.clientX - rect.left);
        const newHeight = Math.max(100, e.clientY - rect.top);
        
        // Enforce viewport boundaries for resize
        const maxW = window.innerWidth - rect.left;
        const maxH = window.innerHeight - rect.top;
        
        const finalW = Math.min(newWidth, maxW);
        const finalH = Math.min(newHeight, maxH);
        
        windowEl.style.width = `${finalW}px`;
        windowEl.style.height = `${finalH}px`;
        
        // Update canvas size (accounting for 24px padding = 12px * 2)
        this.canvas.width = Math.max(50, finalW - 24);
        this.canvas.height = Math.max(50, finalH - 50);
        
        // Clamp position after resize to stay on screen
        const r = windowEl.getBoundingClientRect();
        this.setPosition(windowEl, r.left, r.top);
        this.separateFromOther();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.windowDragging) {
        this.windowDragging = false;
        windowEl.style.cursor = 'move';
      }
      if (this.windowResizing) {
        this.windowResizing = false;
        windowEl.style.cursor = 'move';
      }
    });

    // Resize handle
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.windowResizing = true;
        windowEl.style.cursor = 'se-resize';
      });
    }

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
      this.separateFromOther();
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
    
    const overlap = !(r1.right + 5 < r2.left || r1.left > r2.right + 5 ||
                     r1.bottom + 5 < r2.top || r1.top > r2.bottom + 5);

    if (overlap) {
      // Push leaderboard below minimap with gap, clamped to viewport
      let newTop = r1.bottom + 16;
      let newLeft = r1.left;
      const maxTop = window.innerHeight - r2.height;
      const maxLeft = window.innerWidth - r2.width;
      newTop = Math.min(Math.max(0, newTop), Math.max(0, maxTop));
      newLeft = Math.min(Math.max(0, newLeft), Math.max(0, maxLeft));
      other.style.top = `${newTop}px`;
      other.style.left = `${newLeft}px`;
      other.style.right = 'auto';
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
