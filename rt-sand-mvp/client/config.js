// Configuration constants for InfiniteGo
// Centralized configuration for easy maintenance and extensibility

/**
 * @typedef {Object} ColorConfig
 * @property {string} fill - Fill color for stones
 * @property {string} stroke - Stroke color for stones
 * @property {string} name - Display name
 */

/**
 * Main configuration object
 */
export const CONFIG = {
  // ==================== Canvas and Rendering ====================
  DEFAULT_SCALE: 24,
  MIN_SCALE: 6,
  MAX_SCALE: 80,
  ZOOM_FACTOR: 1.1,
  STONE_RADIUS_RATIO: 0.45,
  
  // ==================== Minimap ====================
  MINIMAP_WIDTH: 200,
  MINIMAP_HEIGHT: 200,
  MINIMAP_DEFAULT_SCALE: 3,
  MINIMAP_MIN_SCALE: 0.2,
  MINIMAP_MAX_SCALE: 10,
  MINIMAP_PADDING: 5,
  MINIMAP_MIN_WINDOW_SIZE: 100,
  
  // ==================== Scrolling ====================
  EDGE_THRESHOLD: 100,
  EDGE_MAX_SPEED: 20,
  EDGE_SCROLL_INTERVAL: 16,
  KEYBOARD_SCROLL_SPEED: 20,
  
  // ==================== Leaderboard ====================
  LEADERBOARD_COLLAPSED_LIMIT: 3,
  LEADERBOARD_EXPANDED_LIMIT: 10,
  
  // ==================== UI Panels ====================
  PANEL_GAP: 8,
  PANEL_MIN_WIDTH: 100,
  PANEL_MIN_HEIGHT: 100,
  SIDEBAR_MIN_WIDTH: 200,
  SIDEBAR_MAX_WIDTH: 500,
  
  // ==================== Network ====================
  WS_RECONNECT_DELAY: 2000,
  
  // ==================== Storage ====================
  STORAGE_KEY: 'infinitego-view',
  
  // ==================== Color Definitions ====================
  COLORS: {
    BLACK: 0,
    WHITE: 1,
    RED: 2,
    BLUE: 3,
    GREEN: 4,
    YELLOW: 5,
    PURPLE: 6,
    ORANGE: 7,
    CYAN: 8,
    PINK: 9,
  },

  COLOR_NAMES: {
    0: 'Black',
    1: 'White',
    2: 'Red',
    3: 'Blue',
    4: 'Green',
    5: 'Yellow',
    6: 'Purple',
    7: 'Orange',
    8: 'Cyan',
    9: 'Pink',
  },

  STONE_COLORS: {
    0: '#1f2937',
    1: '#f3f4f6',
    2: '#ef4444',
    3: '#3b82f6',
    4: '#10b981',
    5: '#eab308',
    6: '#8b5cf6',
    7: '#f97316',
    8: '#06b6d4',
    9: '#ec4899',
  },

  STONE_STROKE_COLORS: {
    0: '#6b7280',
    1: '#d1d5db',
    2: '#991b1b',
    3: '#1e40af',
    4: '#065f46',
    5: '#854d0e',
    6: '#5b21b6',
    7: '#7c2d12',
    8: '#164e63',
    9: '#831843',
  },
  
  // ==================== UI Display Colors ====================
  UI_BG_COLORS: {
    0: '#000', 1: '#fff', 2: '#e74c3c', 3: '#3498db', 4: '#2ecc71',
    5: '#f39c12', 6: '#9b59b6', 7: '#e67e22', 8: '#1abc9c', 9: '#e91e63'
  },
  
  UI_TEXT_COLORS: {
    0: '#fff', 1: '#000', 2: '#fff', 3: '#fff', 4: '#fff',
    5: '#000', 6: '#fff', 7: '#fff', 8: '#000', 9: '#fff'
  },
};

/**
 * Get color configuration by color ID
 * @param {number} colorId - Color ID (0-9)
 * @returns {ColorConfig} Color configuration
 */
export function getColorConfig(colorId) {
  return {
    fill: CONFIG.STONE_COLORS[colorId] || '#888',
    stroke: CONFIG.STONE_STROKE_COLORS[colorId] || '#666',
    name: CONFIG.COLOR_NAMES[colorId] || `Color ${colorId}`,
    uiBg: CONFIG.UI_BG_COLORS[colorId] || '#888',
    uiText: CONFIG.UI_TEXT_COLORS[colorId] || '#fff',
  };
}

/**
 * Get all available colors
 * @returns {Array<{id: number, name: string}>}
 */
export function getAvailableColors() {
  return Object.entries(CONFIG.COLORS).map(([name, id]) => ({
    id,
    name: CONFIG.COLOR_NAMES[id],
    ...getColorConfig(id),
  }));
}
