// Minimap component for InfiniteGo - Refactored
import { CONFIG } from '../config.js';
import { FloatingPanel } from './FloatingPanel.js';
import { eventBus, Events } from '../core/EventBus.js';

/**
 * MinimapPanel - Floating minimap showing overview of the game board
 */
export class MinimapPanel extends FloatingPanel {
  constructor(canvasElement, state) {
    const element = document.getElementById('minimap-float');
    
    super(element, {
      id: 'minimap-float',
      placeholderId: 'minimap-placeholder',
      defaultPosition: { top: '16px', right: '16px' },
      defaultSize: { width: '220px', height: '260px' },
      minSize: { width: 100, height: 100 },
    });
    
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.state = state;
    
    // Minimap-specific state
    this.minimapPan = { x: 0, y: 0 };
    this.canvasDragging = false;
    this.animationId = null;
    
    this.setupCanvasListeners();
    this.setupEventSubscriptions();
  }

  /**
   * Override to ignore drag on canvas
   */
  shouldIgnoreDrag(e) {
    return e.target === this.canvas;
  }

  /**
   * Setup canvas-specific event listeners
   */
  setupCanvasListeners() {
    this.canvas.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.canvasDragging = true;
      this.handleCanvasDrag(e);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.canvasDragging) {
        e.stopPropagation();
        this.handleCanvasDrag(e);
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      e.stopPropagation();
      this.canvasDragging = false;
      this.resolveCollisions();
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleZoom(e);
    });
  }

  /**
   * Subscribe to relevant events
   */
  setupEventSubscriptions() {
    eventBus.on(Events.VIEW_RESET, () => this.resetPosition());
    eventBus.on(Events.UI_SIDEBAR_TOGGLE, () => this.resolveCollisions());
    eventBus.on(Events.UI_SIDEBAR_RESIZE, () => this.resolveCollisions());
  }

  /**
   * Handle zoom on minimap
   */
  handleZoom(e) {
    const factor = e.deltaY < 0 ? CONFIG.ZOOM_FACTOR : 1 / CONFIG.ZOOM_FACTOR;
    const newScale = Math.max(
      CONFIG.MINIMAP_MIN_SCALE,
      Math.min(CONFIG.MINIMAP_MAX_SCALE, this.state.minimapScale * factor)
    );
    this.state.minimapScale = newScale;
  }

  /**
   * Handle canvas drag for navigation
   */
  handleCanvasDrag(e) {
    const rect = this.canvas.getBoundingClientRect();
    
    // Convert to canvas coordinates
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Convert to world coordinates
    const worldX = (mx - centerX - this.minimapPan.x) / this.state.minimapScale;
    const worldY = (my - centerY - this.minimapPan.y) / this.state.minimapScale;

    // Set main view pan
    this.state.pan.x = -worldX * this.state.scale;
    this.state.pan.y = -worldY * this.state.scale;
    this.state.saveViewState();
    
    this.updateMinimapPanInstant();
    eventBus.emit(Events.VIEW_PAN_CHANGED, this.state.pan);
  }

  /**
   * Instant minimap pan update during drag
   */
  updateMinimapPanInstant() {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = this.state.minimapScale;

    const viewport = this.calculateViewport();
    const vpWidth = (viewport.right - viewport.left) * scale;
    const vpHeight = (viewport.bottom - viewport.top) * scale;
    const vpCenterX = (viewport.left + viewport.right) / 2;
    const vpCenterY = (viewport.top + viewport.bottom) / 2;

    const vpMidX = centerX + vpCenterX * scale;
    const vpMidY = centerY + vpCenterY * scale;

    const margin = 4;
    const halfVpW = vpWidth / 2;
    const halfVpH = vpHeight / 2;

    let targetPanX = this.minimapPan.x;
    let targetPanY = this.minimapPan.y;

    if (vpMidX + targetPanX - halfVpW < margin) {
      targetPanX = margin + halfVpW - vpMidX;
    }
    if (vpMidX + targetPanX + halfVpW > width - margin) {
      targetPanX = width - margin - halfVpW - vpMidX;
    }
    if (vpMidY + targetPanY - halfVpH < margin) {
      targetPanY = margin + halfVpH - vpMidY;
    }
    if (vpMidY + targetPanY + halfVpH > height - margin) {
      targetPanY = height - margin - halfVpH - vpMidY;
    }

    this.minimapPan.x = targetPanX;
    this.minimapPan.y = targetPanY;
  }

  /**
   * Calculate viewport in world coordinates
   */
  calculateViewport() {
    const mainCanvas = document.getElementById('canvas');
    const mainW = mainCanvas.width;
    const mainH = mainCanvas.height;
    const mainScale = this.state.scale;
    const mainPan = this.state.pan;
    
    return {
      left: (-mainW / 2 - mainPan.x) / mainScale,
      right: (mainW / 2 - mainPan.x) / mainScale,
      top: (-mainH / 2 - mainPan.y) / mainScale,
      bottom: (mainH / 2 - mainPan.y) / mainScale,
    };
  }

  /**
   * Handle resize callback
   */
  onResize(width, height) {
    // Update canvas size (accounting for padding)
    this.canvas.width = Math.max(50, width - 24);
    this.canvas.height = Math.max(50, height - 50);
  }

  /**
   * Handle embed callback
   */
  onEmbed() {
    setTimeout(() => {
      this.canvas.width = this.element.offsetWidth - 24;
      this.canvas.height = 150;
    }, 0);
  }

  /**
   * Handle separate callback
   */
  onSeparate() {
    setTimeout(() => {
      this.canvas.width = 200;
      this.canvas.height = 240;
    }, 0);
    
    this.updateHeaderIndicator(false);
    
    // Reposition leaderboard below minimap
    this.repositionLeaderboard();
  }

  /**
   * Reposition leaderboard below minimap
   */
  repositionLeaderboard() {
    const leaderboard = document.getElementById('leaderboard-float');
    if (leaderboard && !leaderboard.classList.contains('embedded')) {
      setTimeout(() => {
        const minimapRect = this.element.getBoundingClientRect();
        leaderboard.style.top = `${minimapRect.bottom + 8}px`;
        leaderboard.style.right = '16px';
        leaderboard.style.left = 'auto';
      }, 10);
    }
  }

  /**
   * Draw the minimap
   */
  draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = this.state.minimapScale;

    const viewport = this.calculateViewport();
    const vpCenterX = (viewport.left + viewport.right) / 2;
    const vpCenterY = (viewport.top + viewport.bottom) / 2;
    const vpWidth = (viewport.right - viewport.left) * scale;
    const vpHeight = (viewport.bottom - viewport.top) * scale;

    // Calculate and smooth minimap pan
    const vpMidX = centerX + vpCenterX * scale;
    const vpMidY = centerY + vpCenterY * scale;

    const margin = 4;
    const halfVpW = vpWidth / 2;
    const halfVpH = vpHeight / 2;

    let targetPanX = this.minimapPan.x;
    let targetPanY = this.minimapPan.y;

    if (vpMidX + targetPanX - halfVpW < margin) {
      targetPanX = margin + halfVpW - vpMidX;
    }
    if (vpMidX + targetPanX + halfVpW > width - margin) {
      targetPanX = width - margin - halfVpW - vpMidX;
    }
    if (vpMidY + targetPanY - halfVpH < margin) {
      targetPanY = margin + halfVpH - vpMidY;
    }
    if (vpMidY + targetPanY + halfVpH > height - margin) {
      targetPanY = height - margin - halfVpH - vpMidY;
    }

    // Smooth interpolation
    const smoothFactor = 0.3;
    this.minimapPan.x += (targetPanX - this.minimapPan.x) * smoothFactor;
    this.minimapPan.y += (targetPanY - this.minimapPan.y) * smoothFactor;

    const offsetX = this.minimapPan.x;
    const offsetY = this.minimapPan.y;

    // Draw stones
    for (const stone of this.state.stones.values()) {
      const wx = Number(stone.x);
      const wy = Number(stone.y);
      const mx = centerX + wx * scale + offsetX;
      const my = centerY + wy * scale + offsetY;

      if (mx >= -2 && mx <= width + 2 && my >= -2 && my <= height + 2) {
        this.ctx.fillStyle = CONFIG.STONE_COLORS[stone.color] || '#888';
        this.ctx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    // Draw viewport rectangle
    const vpScreenLeft = centerX + viewport.left * scale + offsetX;
    const vpScreenRight = centerX + viewport.right * scale + offsetX;
    const vpScreenTop = centerY + viewport.top * scale + offsetY;
    const vpScreenBottom = centerY + viewport.bottom * scale + offsetY;

    this.ctx.strokeStyle = '#0f0';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      vpScreenLeft, 
      vpScreenTop, 
      vpScreenRight - vpScreenLeft, 
      vpScreenBottom - vpScreenTop
    );
  }

  /**
   * Start animation loop
   */
  start() {
    const animate = () => {
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Stop animation loop
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    super.destroy();
    this.stop();
  }
}
