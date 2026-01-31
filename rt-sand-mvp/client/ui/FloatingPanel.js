// Base class for floating panels with common functionality
import { CONFIG } from '../config.js';
import { eventBus, Events } from '../core/EventBus.js';

/**
 * FloatingPanel - Base class for draggable, resizable floating panels
 * Handles: dragging, resizing, collision detection, sidebar embedding
 */
export class FloatingPanel {
  /**
   * @param {HTMLElement} element - The panel's root DOM element
   * @param {Object} options - Configuration options
   * @param {string} options.id - Panel identifier
   * @param {string} [options.placeholderId] - Sidebar placeholder element ID
   * @param {Object} [options.defaultPosition] - Default position {top, right, left, bottom}
   * @param {Object} [options.defaultSize] - Default size {width, height}
   * @param {Object} [options.minSize] - Minimum size {width, height}
   */
  constructor(element, options = {}) {
    this.element = element;
    this.id = options.id || element.id;
    this.placeholderId = options.placeholderId;
    this.defaultPosition = options.defaultPosition || { top: '16px', right: '16px' };
    this.defaultSize = options.defaultSize || { width: '220px', height: 'auto' };
    this.minSize = options.minSize || { width: 100, height: 100 };
    
    // State
    this.dragging = false;
    this.resizing = false;
    this.embedded = false;
    this.userResized = false;
    this.dragOffset = { x: 0, y: 0 };
    
    // Cache DOM elements
    this.header = this.element.querySelector('h3');
    this.resizeHandle = this.element.querySelector('.resize-handle');
    
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners for the panel
   */
  setupEventListeners() {
    this.setupDragging();
    this.setupResizing();
    this.setupDoubleClickEmbed();
  }

  /**
   * Setup dragging functionality
   */
  setupDragging() {
    const startDrag = (e) => {
      if (this.resizing || this.embedded) return;
      this.dragging = true;
      const rect = this.element.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      this.element.style.cursor = 'grabbing';
      eventBus.emit(Events.PANEL_DRAG_START, { panel: this.id });
    };

    // Drag from header
    if (this.header) {
      this.header.addEventListener('mousedown', startDrag);
    }
    
    // Drag from body (excluding resize handle)
    this.element.addEventListener('mousedown', (e) => {
      if (e.target === this.resizeHandle) return;
      if (this.shouldIgnoreDrag(e)) return;
      startDrag(e);
    });

    // Global mouse move/up
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  /**
   * Override in subclass to ignore certain drag targets
   */
  shouldIgnoreDrag(e) {
    return false;
  }

  /**
   * Handle mouse move during drag/resize
   */
  _handleMouseMove(e) {
    if (this.dragging) {
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      this.setPosition(x, y);
    }
    
    if (this.resizing) {
      const rect = this.element.getBoundingClientRect();
      const newWidth = Math.max(this.minSize.width, e.clientX - rect.left);
      const newHeight = Math.max(this.minSize.height, e.clientY - rect.top);
      
      // Enforce viewport boundaries
      const maxW = window.innerWidth - rect.left;
      const maxH = window.innerHeight - rect.top;
      
      const finalW = Math.min(newWidth, maxW);
      const finalH = Math.min(newHeight, maxH);
      
      this.setSize(finalW, finalH);
      
      // Call resize callback for subclasses
      this.onResize(finalW, finalH);
    }
  }

  /**
   * Handle mouse up
   */
  _handleMouseUp() {
    if (this.dragging) {
      this.dragging = false;
      this.element.style.cursor = 'move';
      this.resolveCollisions();
      eventBus.emit(Events.PANEL_DRAG_END, { panel: this.id });
    }
    if (this.resizing) {
      this.resizing = false;
      this.element.style.cursor = 'move';
      this.resolveCollisions();
      eventBus.emit(Events.PANEL_RESIZE_END, { panel: this.id });
    }
  }

  /**
   * Setup resizing functionality
   */
  setupResizing() {
    if (!this.resizeHandle) return;
    
    this.resizeHandle.addEventListener('mousedown', (e) => {
      if (this.embedded) return;
      e.preventDefault();
      e.stopPropagation();
      this.resizing = true;
      this.userResized = true;
      this.element.style.cursor = 'se-resize';
    });
  }

  /**
   * Setup double-click to toggle embed/separate
   */
  setupDoubleClickEmbed() {
    if (!this.header) return;
    
    this.header.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (this.embedded) {
        this.separateFromSidebar();
      } else {
        this.embedInSidebar();
      }
    });
  }

  /**
   * Set panel position (clamped to viewport)
   */
  setPosition(x, y) {
    const w = this.element.offsetWidth;
    const h = this.element.offsetHeight;
    const clampedX = Math.max(0, Math.min(window.innerWidth - w, x));
    const clampedY = Math.max(0, Math.min(window.innerHeight - h, y));
    
    this.element.style.left = `${clampedX}px`;
    this.element.style.top = `${clampedY}px`;
    this.element.style.right = 'auto';
    this.element.style.bottom = 'auto';
  }

  /**
   * Set panel size
   */
  setSize(width, height) {
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
    
    // Clamp position after resize
    const r = this.element.getBoundingClientRect();
    this.setPosition(r.left, r.top);
  }

  /**
   * Reset panel to default position
   */
  resetPosition() {
    if (this.embedded) return;
    
    Object.entries(this.defaultPosition).forEach(([key, value]) => {
      this.element.style[key] = value;
    });
    
    // Clear any explicit position that might conflict
    if (this.defaultPosition.right !== undefined) {
      this.element.style.left = 'auto';
    }
    if (this.defaultPosition.bottom !== undefined) {
      this.element.style.top = 'auto';
    }
  }

  /**
   * Callback when panel is resized (override in subclass)
   */
  onResize(width, height) {
    // Override in subclass
  }

  // ==================== Collision Detection ====================

  /**
   * Check rectangle collision with gap
   */
  checkRectCollision(x, y, width, height, rect, gap) {
    return !(
      x + width + gap <= rect.left || 
      x >= rect.right + gap || 
      y + height + gap <= rect.top || 
      y >= rect.bottom + gap
    );
  }

  /**
   * Get all obstacles (sidebar + other floating panels)
   */
  getObstacles() {
    const obstacles = [];
    const gap = 8;
    
    // Sidebar is a rigid body
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('hidden')) {
      obstacles.push({ 
        rect: sidebar.getBoundingClientRect(), 
        rigid: true, 
        id: 'sidebar' 
      });
    }
    
    // Other floating panels
    const panels = document.querySelectorAll('.floating-panel, [id$="-float"]');
    panels.forEach(el => {
      if (el.id === this.element.id) return;
      if (el.classList.contains('embedded')) return;
      
      obstacles.push({ 
        rect: el.getBoundingClientRect(), 
        rigid: false, 
        id: el.id 
      });
    });
    
    return obstacles;
  }

  /**
   * Check collision with any obstacle
   */
  checkAnyCollision(x, y, width, height, obstacles, gap = 8) {
    for (const obs of obstacles) {
      if (this.checkRectCollision(x, y, width, height, obs.rect, gap)) {
        return { collides: true, obstacle: obs };
      }
    }
    return { collides: false, obstacle: null };
  }

  /**
   * Get safe area boundaries considering sidebar
   */
  getSafeArea(width, height, gap = 8) {
    const sidebar = document.getElementById('sidebar');
    let minX = 0;
    
    if (sidebar && !sidebar.classList.contains('hidden')) {
      const sr = sidebar.getBoundingClientRect();
      if (sr.left < window.innerWidth / 2) {
        minX = sr.right + gap;
      }
    }
    
    return {
      minX,
      maxX: window.innerWidth - width,
      minY: 0,
      maxY: window.innerHeight - height
    };
  }

  /**
   * Resolve collisions with other panels
   */
  resolveCollisions() {
    if (this.embedded) return;
    
    const r1 = this.element.getBoundingClientRect();
    const gap = 8;
    const safe = this.getSafeArea(r1.width, r1.height, gap);
    const obstacles = this.getObstacles();
    
    const collision = this.checkAnyCollision(r1.left, r1.top, r1.width, r1.height, obstacles, gap);
    if (!collision.collides) return;

    // Generate candidate positions
    const candidates = [];
    for (const obs of obstacles) {
      const r2 = obs.rect;
      candidates.push(
        { x: r2.left - r1.width - gap, y: r1.top },
        { x: r2.right + gap, y: r1.top },
        { x: r1.left, y: r2.top - r1.height - gap },
        { x: r1.left, y: r2.bottom + gap }
      );
    }
    
    // Evaluate candidates
    const options = candidates.map(pos => {
      const clampedX = Math.max(safe.minX, Math.min(safe.maxX, pos.x));
      const clampedY = Math.max(safe.minY, Math.min(safe.maxY, pos.y));
      const dist = Math.abs(clampedX - r1.left) + Math.abs(clampedY - r1.top);
      const hitsBoundary = (clampedX !== pos.x) || (clampedY !== pos.y);
      const stillCollides = this.checkAnyCollision(clampedX, clampedY, r1.width, r1.height, obstacles, gap);
      
      return { x: clampedX, y: clampedY, dist, hitsBoundary, collides: stillCollides.collides };
    });
    
    // Sort: no collision > boundary > distance
    options.sort((a, b) => {
      if (a.collides !== b.collides) return a.collides ? 1 : -1;
      if (a.hitsBoundary !== b.hitsBoundary) return a.hitsBoundary ? 1 : -1;
      return a.dist - b.dist;
    });
    
    const best = options[0];
    
    // Animate to new position
    this.element.classList.add('animating');
    this.element.style.left = `${best.x}px`;
    this.element.style.top = `${best.y}px`;
    this.element.style.right = 'auto';
    this.element.style.bottom = 'auto';
    setTimeout(() => this.element.classList.remove('animating'), 300);
  }

  // ==================== Sidebar Embedding ====================

  /**
   * Embed panel into sidebar
   */
  embedInSidebar() {
    const placeholder = document.getElementById(this.placeholderId);
    if (!placeholder) return;
    
    this.element.classList.add('embedded');
    this.element.style.position = 'static';
    this.element.style.width = '100%';
    this.element.style.left = 'auto';
    this.element.style.top = 'auto';
    this.element.style.right = 'auto';
    this.element.style.bottom = 'auto';
    this.element.style.cursor = 'default';
    
    if (this.resizeHandle) {
      this.resizeHandle.style.display = 'none';
    }
    
    placeholder.classList.add('active');
    placeholder.appendChild(this.element);
    
    this.embedded = true;
    this.userResized = false;
    
    this.onEmbed();
    eventBus.emit(Events.PANEL_EMBEDDED, { panel: this.id });
  }

  /**
   * Separate panel from sidebar
   */
  separateFromSidebar() {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    
    this.element.classList.remove('embedded');
    this.element.style.position = 'absolute';
    this.element.style.width = this.defaultSize.width;
    this.element.style.height = this.defaultSize.height;
    this.element.style.cursor = 'move';
    
    Object.entries(this.defaultPosition).forEach(([key, value]) => {
      this.element.style[key] = value;
    });
    
    if (this.defaultPosition.right !== undefined) {
      this.element.style.left = 'auto';
    }
    
    appEl.appendChild(this.element);
    
    if (this.resizeHandle) {
      this.resizeHandle.style.display = 'block';
    }
    
    const placeholder = document.getElementById(this.placeholderId);
    if (placeholder) {
      placeholder.classList.remove('active');
    }
    
    this.embedded = false;
    this.userResized = false;
    
    this.onSeparate();
    this.resolveCollisions();
    eventBus.emit(Events.PANEL_SEPARATED, { panel: this.id });
  }

  /**
   * Callback when embedded (override in subclass)
   */
  onEmbed() {
    // Override in subclass
  }

  /**
   * Callback when separated (override in subclass)
   */
  onSeparate() {
    // Override in subclass
  }

  /**
   * Update header collapse indicator
   */
  updateHeaderIndicator(collapsed) {
    if (this.header) {
      const title = this.header.textContent.replace(/[▲▼]/g, '').trim();
      this.header.textContent = `${title} ${collapsed ? '▼' : '▲'}`;
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}
