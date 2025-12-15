// Input handling for InfiniteGo
import { CONFIG } from './config.js';

export class InputManager {
  constructor(canvas, state, renderer, onAction) {
    this.canvas = canvas;
    this.state = state;
    this.renderer = renderer;
    this.onAction = onAction;
    
    this.dragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.edgeScrollVelocity = { x: 0, y: 0 };
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Click to place stone
    this.canvas.addEventListener('click', (e) => {
      if (!this.dragging) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x, y } = this.renderer.screenToWorld(sx, sy);
        this.onAction('place_stone', { x, y, color: this.state.selectedColor });
      }
    });
    
    // Global mouse up
    window.addEventListener('mouseup', () => {
      if (this.dragging) {
        this.dragging = false;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // Edge scrolling
    this.startEdgeScrolling();
  }

  handleMouseDown(e) {
    if (e.button === 0) {
      // Left click - start drag
      this.dragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  handleMouseMove(e) {
    if (this.dragging) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.state.pan.x += dx;
      this.state.pan.y += dy;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.state.saveViewState();
    }
  }

  handleMouseUp(e) {
    // Handled by window mouseup listener
  }

  handleWheel(e) {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldScale = this.state.scale;
    const factor = e.deltaY < 0 ? CONFIG.ZOOM_FACTOR : 1 / CONFIG.ZOOM_FACTOR;
    const newScale = Math.max(CONFIG.MIN_SCALE, Math.min(CONFIG.MAX_SCALE, oldScale * factor));

    if (newScale !== oldScale) {
      const ratio = newScale / oldScale;
      this.state.pan.x = mouseX - (mouseX - this.state.pan.x) * ratio;
      this.state.pan.y = mouseY - (mouseY - this.state.pan.y) * ratio;
      this.state.scale = newScale;
      this.state.saveViewState();
    }
  }

  startEdgeScrolling() {
    // Track mouse position
    let mouseX = null;
    let mouseY = null;
    
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    setInterval(() => {
      const rect = this.canvas.getBoundingClientRect();
      if (!document.hasFocus() || mouseX === null || mouseY === null) {
        this.edgeScrollVelocity = { x: 0, y: 0 };
        return;
      }

      const canvasLeft = rect.left;
      const canvasRight = rect.right;
      const canvasTop = rect.top;
      const canvasBottom = rect.bottom;

      const isInCanvas = mouseX >= canvasLeft && mouseX <= canvasRight &&
                        mouseY >= canvasTop && mouseY <= canvasBottom;

      if (!isInCanvas) {
        this.edgeScrollVelocity = { x: 0, y: 0 };
        return;
      }

      const threshold = CONFIG.EDGE_THRESHOLD;
      const maxSpeed = CONFIG.EDGE_MAX_SPEED;

      let vx = 0, vy = 0;

      // Left edge
      if (mouseX - canvasLeft < threshold) {
        vx = ((mouseX - canvasLeft) / threshold - 1) * maxSpeed;
      }
      // Right edge
      else if (canvasRight - mouseX < threshold) {
        vx = (1 - (canvasRight - mouseX) / threshold) * maxSpeed;
      }

      // Top edge
      if (mouseY - canvasTop < threshold) {
        vy = ((mouseY - canvasTop) / threshold - 1) * maxSpeed;
      }
      // Bottom edge
      else if (canvasBottom - mouseY < threshold) {
        vy = (1 - (canvasBottom - mouseY) / threshold) * maxSpeed;
      }

      this.edgeScrollVelocity = { x: vx, y: vy };
      
      if (vx !== 0 || vy !== 0) {
        this.state.pan.x += vx;
        this.state.pan.y += vy;
        this.state.saveViewState();
      }
    }, 16);
  }
}
