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
  
  // Colors
  COLORS: {
    BLACK: 0,
    WHITE: 1,
  },
  
  COLOR_NAMES: {
    0: 'Black',
    1: 'White',
  },
  
  STONE_COLORS: {
    0: '#0f172a',
    1: '#f9fafb',
  },
  
  STONE_STROKE_COLORS: {
    0: '#4b5563',
    1: '#d1d5db',
  },
  
  // WebSocket
  WS_RECONNECT_DELAY: 2000,
  
  // Storage
  STORAGE_KEY: 'infinitego-view',
};
