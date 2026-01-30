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
    this.keysPressed = new Set();
    this.lastDrawnPosition = null; // Track last position for continuous drawing
    
    this.setupEventListeners();
    this.startKeyboardScrolling();
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Click to place stone (only in pan mode, draw mode handles it in mousedown/move)
    this.canvas.addEventListener('click', (e) => {
      if (!this.dragging && this.state.dragMode === 'pan') {
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
        this.lastDrawnPosition = null;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // Edge scrolling
    this.startEdgeScrolling();
    
    // Keyboard events for arrow key scrolling
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleMouseDown(e) {
    if (e.button === 0) {
      this.dragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      
      if (this.state.dragMode === 'draw') {
        // Draw mode - place stone immediately and track position
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x, y } = this.renderer.screenToWorld(sx, sy);
        this.onAction('place_stone', { x, y, color: this.state.selectedColor });
        this.lastDrawnPosition = { x, y };
        this.canvas.style.cursor = 'crosshair';
      } else {
        // Pan mode - prepare to drag map
        this.canvas.style.cursor = 'grabbing';
      }
    }
  }

  handleMouseMove(e) {
    if (this.dragging) {
      if (this.state.dragMode === 'draw') {
        // Draw mode - place stones continuously as mouse moves
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { x, y } = this.renderer.screenToWorld(sx, sy);
        
        // Only place if position changed (avoid duplicate placements)
        if (!this.lastDrawnPosition || this.lastDrawnPosition.x !== x || this.lastDrawnPosition.y !== y) {
          this.onAction('place_stone', { x, y, color: this.state.selectedColor });
          this.lastDrawnPosition = { x, y };
        }
      } else {
        // Pan mode - drag the map
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.state.pan.x += dx;
        this.state.pan.y += dy;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.state.saveViewState();
      }
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

  handleKeyDown(e) {
    // Arrow keys for viewport movement
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      this.keysPressed.add(e.key);
    }
  }

  handleKeyUp(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.keysPressed.delete(e.key);
    }
  }

  startKeyboardScrolling() {
    setInterval(() => {
      if (!document.hasFocus() || this.keysPressed.size === 0) {
        return;
      }

      const speed = CONFIG.KEYBOARD_SCROLL_SPEED;
      let dx = 0, dy = 0;

      if (this.keysPressed.has('ArrowLeft')) dx += speed;
      if (this.keysPressed.has('ArrowRight')) dx -= speed;
      if (this.keysPressed.has('ArrowUp')) dy += speed;
      if (this.keysPressed.has('ArrowDown')) dy -= speed;

      if (dx !== 0 || dy !== 0) {
        this.state.pan.x += dx;
        this.state.pan.y += dy;
        this.state.saveViewState();
      }
    }, 16);
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

      // Left edge - pan right (positive vx)
      if (mouseX - canvasLeft < threshold) {
        vx = (1 - (mouseX - canvasLeft) / threshold) * maxSpeed;
      }
      // Right edge - pan left (negative vx)
      else if (canvasRight - mouseX < threshold) {
        vx = -(1 - (canvasRight - mouseX) / threshold) * maxSpeed;
      }

      if (mouseY - canvasTop < threshold) {
        vy = -((mouseY - canvasTop) / threshold - 1) * maxSpeed;
      }
      // Bottom edge - pan up (negative vy)
      else if (canvasBottom - mouseY < threshold) {
        vy = -(1 - (canvasBottom - mouseY) / threshold) * maxSpeed;
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
