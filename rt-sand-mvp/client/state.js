// State management for InfiniteGo
import { CONFIG } from './config.js';
import { eventBus, Events } from './core/EventBus.js';

/**
 * GameState - Central state management for the game
 * Manages stones, view state, and emits events on changes
 */
export class GameState {
  constructor() {
    this.stones = new Map();
    this.seq = 0n;
    this.scale = CONFIG.DEFAULT_SCALE;
    this.minimapScale = CONFIG.MINIMAP_DEFAULT_SCALE;
    this.pan = { x: 0, y: 0 };
    this.placementMode = 'intersection';
    this.dragMode = 'pan'; // 'pan' or 'draw'
    this.selectedColor = 0; // ColorBlack
    
    // Room expiration info
    this.roomInfo = null; // { createdAt, expireTime, isPublic }
    
    this.loadViewState();
  }

  loadViewState() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.pan.x = state.pan?.x || 0;
        this.pan.y = state.pan?.y || 0;
        this.scale = state.scale || CONFIG.DEFAULT_SCALE;
      }
    } catch (e) {
      console.warn('Failed to load saved view state:', e);
    }
  }

  saveViewState() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        pan: { x: this.pan.x, y: this.pan.y },
        scale: this.scale,
      }));
    } catch (e) {
      console.warn('Failed to save view state:', e);
    }
  }

  addStone(x, y, color) {
    this.stones.set(`${x},${y}`, {
      x: BigInt(x),
      y: BigInt(y),
      color: Number(color),
    });
  }

  removeStone(x, y) {
    this.stones.delete(`${x},${y}`);
  }

  clearStones() {
    this.stones.clear();
  }

  applyDelta(delta) {
    this.seq = BigInt(delta.server_seq);
    for (const cell of delta.removed || []) {
      this.removeStone(cell.x, cell.y);
    }
    for (const cell of delta.added || []) {
      this.addStone(cell.x, cell.y, cell.color);
    }
    eventBus.emit(Events.STATE_UPDATED, { type: 'delta', delta });
  }

  applyBoardState(state) {
    this.seq = BigInt(state.server_seq);
    this.clearStones();
    for (const cell of state.cells || []) {
      this.addStone(cell.x, cell.y, cell.color);
    }
    eventBus.emit(Events.STATE_UPDATED, { type: 'board', state });
  }

  /**
   * Set room info from server (only set once per room session)
   * @param {Object} roomInfo - { created_at, expire_time, is_public }
   */
  setRoomInfo(roomInfo) {
    if (roomInfo) {
      // Only set roomInfo if not already set, or if it's a different room
      // This prevents overwriting during restart operations
      if (!this.roomInfo || this.roomInfo.createdAt !== roomInfo.created_at) {
        this.roomInfo = {
          createdAt: roomInfo.created_at,
          expireTime: roomInfo.expire_time,
          isPublic: roomInfo.is_public,
        };
        eventBus.emit(Events.ROOM_INFO_UPDATED, this.roomInfo);
      }
    }
  }

  /**
   * Get remaining time until room expires in milliseconds
   * @returns {number|null} Remaining time in ms, or null if room never expires
   */
  getRemainingTime() {
    if (!this.roomInfo || this.roomInfo.isPublic || !this.roomInfo.expireTime) {
      return null; // Room never expires
    }
    const now = Date.now();
    const expiresAt = this.roomInfo.createdAt + this.roomInfo.expireTime;
    return Math.max(0, expiresAt - now);
  }

  resetView() {
    this.pan = { x: 0, y: 0 };
    this.scale = CONFIG.DEFAULT_SCALE;
    this.minimapScale = CONFIG.MINIMAP_DEFAULT_SCALE;
    eventBus.emit(Events.VIEW_RESET);
  }

  /**
   * Get stone count by color
   * @returns {Object} Color counts
   */
  getColorCounts() {
    const counts = {};
    for (const stone of this.stones.values()) {
      counts[stone.color] = (counts[stone.color] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get total stone count
   * @returns {number}
   */
  getTotalStones() {
    return this.stones.size;
  }

  /**
   * Check if a position has a stone
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean}
   */
  hasStone(x, y) {
    return this.stones.has(`${x},${y}`);
  }

  /**
   * Get stone at position
   * @param {number} x 
   * @param {number} y 
   * @returns {Object|null}
   */
  getStone(x, y) {
    return this.stones.get(`${x},${y}`) || null;
  }
}
