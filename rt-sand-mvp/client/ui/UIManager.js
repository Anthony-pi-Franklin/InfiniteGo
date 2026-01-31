// UI Manager - Centralized UI component management
import { eventBus, Events } from '../core/EventBus.js';

/**
 * UIManager - Manages UI state and coordinates components
 */
export class UIManager {
  constructor() {
    this.panels = new Map();
    this.sidebar = null;
    this.sidebarResizeHandle = null;
    this.menuToggle = null;
    this.menuClose = null;
    
    this.isResizingSidebar = false;
    this.sidebarStartX = 0;
    this.sidebarStartWidth = 0;
  }

  /**
   * Initialize UI manager with sidebar controls
   */
  initialize() {
    this.sidebar = document.getElementById('sidebar');
    this.sidebarResizeHandle = document.querySelector('.sidebar-resize-handle');
    this.menuToggle = document.getElementById('menu-toggle');
    this.menuClose = document.getElementById('menu-close');
    
    this.setupSidebarControls();
    this.setupSidebarResize();
  }

  /**
   * Register a floating panel
   */
  registerPanel(id, panel) {
    this.panels.set(id, panel);
  }

  /**
   * Get a registered panel
   */
  getPanel(id) {
    return this.panels.get(id);
  }

  /**
   * Setup sidebar toggle controls
   */
  setupSidebarControls() {
    if (!this.sidebar || !this.menuToggle || !this.menuClose) return;
    
    // Initial state: sidebar shown
    this.menuToggle.classList.remove('visible');
    this.sidebar.classList.remove('hidden');

    this.menuToggle.addEventListener('click', () => {
      this.showSidebar();
    });

    this.menuClose.addEventListener('click', () => {
      this.hideSidebar();
    });
  }

  /**
   * Show sidebar
   */
  showSidebar() {
    this.sidebar.classList.remove('hidden');
    this.sidebar.style.transform = '';
    if (this.sidebarResizeHandle) {
      this.sidebarResizeHandle.style.transform = '';
    }
    this.menuToggle.classList.remove('visible');
    
    eventBus.emit(Events.UI_SIDEBAR_TOGGLE, { visible: true });
    
    // Trigger collision avoidance for panels
    setTimeout(() => this.triggerPanelCollisionCheck(), 50);
  }

  /**
   * Hide sidebar
   */
  hideSidebar() {
    const sidebarWidth = this.sidebar.offsetWidth;
    const hideOffset = sidebarWidth + 32;
    
    this.sidebar.style.transform = `translateX(-${hideOffset}px)`;
    if (this.sidebarResizeHandle) {
      this.sidebarResizeHandle.style.transform = `translateX(-${hideOffset}px)`;
    }
    this.sidebar.classList.add('hidden');
    this.menuToggle.classList.add('visible');
    
    eventBus.emit(Events.UI_SIDEBAR_TOGGLE, { visible: false });
  }

  /**
   * Setup sidebar resize functionality
   */
  setupSidebarResize() {
    if (!this.sidebarResizeHandle || !this.sidebar) return;

    this.sidebarResizeHandle.addEventListener('mousedown', (e) => {
      this.isResizingSidebar = true;
      this.sidebarStartX = e.clientX;
      this.sidebarStartWidth = this.sidebar.offsetWidth;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isResizingSidebar) return;
      
      const newWidth = this.sidebarStartWidth + (e.clientX - this.sidebarStartX);
      const clampedWidth = Math.max(200, Math.min(500, newWidth));
      this.sidebar.style.width = `${clampedWidth}px`;
      this.updateResizeHandlePosition();
    });

    window.addEventListener('mouseup', () => {
      if (this.isResizingSidebar) {
        this.isResizingSidebar = false;
        eventBus.emit(Events.UI_SIDEBAR_RESIZE, { 
          width: this.sidebar.offsetWidth 
        });
        setTimeout(() => this.triggerPanelCollisionCheck(), 50);
      }
    });

    // Initialize handle position
    this.updateResizeHandlePosition();
  }

  /**
   * Update resize handle position
   */
  updateResizeHandlePosition() {
    if (!this.sidebarResizeHandle || !this.sidebar) return;
    const sidebarWidth = this.sidebar.offsetWidth;
    this.sidebarResizeHandle.style.left = `calc(16px + ${sidebarWidth}px - 5px)`;
  }

  /**
   * Trigger collision check for all panels
   */
  triggerPanelCollisionCheck() {
    for (const panel of this.panels.values()) {
      if (panel.resolveCollisions) {
        panel.resolveCollisions();
      }
    }
  }

  /**
   * Reset all panel positions
   */
  resetAllPanels() {
    for (const panel of this.panels.values()) {
      if (panel.resetPosition) {
        panel.resetPosition();
      }
    }
    eventBus.emit(Events.VIEW_RESET);
  }

  /**
   * Update status display
   */
  updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
    }
    eventBus.emit(Events.UI_STATUS_UPDATE, { message });
  }

  /**
   * Update sequence display
   */
  updateSeq(seq) {
    const seqEl = document.getElementById('seq');
    if (seqEl) {
      seqEl.textContent = `Seq: ${seq}`;
    }
  }

  /**
   * Update room info display
   */
  updateRoomInfo(roomId) {
    const el = document.getElementById('current-room');
    if (el) {
      el.textContent = roomId;
    }
  }

  /**
   * Update player color display
   */
  updatePlayerColorDisplay(color, config) {
    const colorNames = config.COLOR_NAMES || {};
    const colorDisplay = document.getElementById('player-color-display');
    
    if (!colorDisplay) return;
    
    colorDisplay.textContent = colorNames[color] || `Color ${color}`;
    
    const bgColors = {
      0: '#000', 1: '#fff', 2: '#e74c3c', 3: '#3498db', 4: '#2ecc71',
      5: '#f39c12', 6: '#9b59b6', 7: '#e67e22', 8: '#1abc9c', 9: '#e91e63'
    };
    const textColors = {
      0: '#fff', 1: '#000', 2: '#fff', 3: '#fff', 4: '#fff',
      5: '#000', 6: '#fff', 7: '#fff', 8: '#000', 9: '#fff'
    };
    
    colorDisplay.style.backgroundColor = bgColors[color] || '#888';
    colorDisplay.style.color = textColors[color] || '#fff';
    colorDisplay.style.border = color === 1 ? '1px solid #666' : 'none';
  }

  /**
   * Cleanup
   */
  destroy() {
    for (const panel of this.panels.values()) {
      if (panel.destroy) {
        panel.destroy();
      }
    }
    this.panels.clear();
  }
}

// Export singleton instance
export const uiManager = new UIManager();
