// State management for InfiniteGo
import { CONFIG } from './config.js';

export class GameState {
  constructor() {
    this.stones = new Map();
    this.seq = 0n;
    this.scale = CONFIG.DEFAULT_SCALE;
    this.minimapScale = CONFIG.MINIMAP_DEFAULT_SCALE;
    this.pan = { x: 0, y: 0 };
    this.placementMode = 'intersection';
    this.selectedColor = 0; // ColorBlack
    
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
  }

  applyBoardState(state) {
    this.seq = BigInt(state.server_seq);
    this.clearStones();
    for (const cell of state.cells || []) {
      this.addStone(cell.x, cell.y, cell.color);
    }
  }

  resetView() {
    this.pan = { x: 0, y: 0 };
    this.scale = CONFIG.DEFAULT_SCALE;
    this.minimapScale = CONFIG.MINIMAP_DEFAULT_SCALE;
  }
}
