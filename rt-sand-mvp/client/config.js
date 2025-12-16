// Configuration constants for InfiniteGo
export const CONFIG = {
  // Canvas and rendering
  DEFAULT_SCALE: 24,
  MIN_SCALE: 6,
  MAX_SCALE: 80,
  ZOOM_FACTOR: 1.1,
  
  // Minimap
  MINIMAP_WIDTH: 200,
  MINIMAP_HEIGHT: 200,
  MINIMAP_DEFAULT_SCALE: 3,
  MINIMAP_MIN_SCALE: 1,
  MINIMAP_MAX_SCALE: 10,
  MINIMAP_PADDING: 5,
  
  // Edge scrolling
  EDGE_THRESHOLD: 100,
  EDGE_MAX_SPEED: 20,
  EDGE_SCROLL_INTERVAL: 16,
  
  // Leaderboard
  LEADERBOARD_COLLAPSED_LIMIT: 3,
  LEADERBOARD_EXPANDED_LIMIT: 10,
  
  // Stone rendering
  STONE_RADIUS_RATIO: 0.45,
  
// Colors (0-9, 10 total colors)
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
  
  // WebSocket
  WS_RECONNECT_DELAY: 2000,
  
  // Storage
  STORAGE_KEY: 'infinitego-view',
};
