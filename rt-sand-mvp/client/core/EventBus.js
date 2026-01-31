// Event bus for decoupled communication between components
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in event handler for "${event}":`, e);
        }
      }
    }
  }

  /**
   * Clear all listeners for an event or all events
   * @param {string} [event] - Event name (optional)
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Global event bus instance
export const eventBus = new EventBus();

// Event name constants for type safety
export const Events = {
  // Network events
  NETWORK_CONNECTED: 'network:connected',
  NETWORK_DISCONNECTED: 'network:disconnected',
  NETWORK_ERROR: 'network:error',
  NETWORK_MESSAGE: 'network:message',
  
  // Game state events
  STATE_UPDATED: 'state:updated',
  STATE_DELTA: 'state:delta',
  STATE_BOARD: 'state:board',
  STATE_RESTART: 'state:restart',
  
  // Room events
  ROOM_INFO_UPDATED: 'room:infoUpdated',
  ROOM_EXPIRED: 'room:expired',
  
  // Input events
  INPUT_PLACE_STONE: 'input:placeStone',
  INPUT_PAN: 'input:pan',
  INPUT_ZOOM: 'input:zoom',
  
  // View events
  VIEW_RESET: 'view:reset',
  VIEW_PAN_CHANGED: 'view:panChanged',
  VIEW_SCALE_CHANGED: 'view:scaleChanged',
  
  // UI events
  UI_STATUS_UPDATE: 'ui:statusUpdate',
  UI_SIDEBAR_TOGGLE: 'ui:sidebarToggle',
  UI_SIDEBAR_RESIZE: 'ui:sidebarResize',
  UI_PANEL_COLLISION: 'ui:panelCollision',
  
  // Panel events
  PANEL_DRAG_START: 'panel:dragStart',
  PANEL_DRAG_END: 'panel:dragEnd',
  PANEL_RESIZE_END: 'panel:resizeEnd',
  PANEL_EMBEDDED: 'panel:embedded',
  PANEL_SEPARATED: 'panel:separated',
};
