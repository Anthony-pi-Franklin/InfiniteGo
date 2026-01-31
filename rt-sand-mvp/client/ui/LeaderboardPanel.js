// Leaderboard component for InfiniteGo - Refactored
import { CONFIG } from '../config.js';
import { FloatingPanel } from './FloatingPanel.js';
import { eventBus, Events } from '../core/EventBus.js';

/**
 * LeaderboardPanel - Floating leaderboard showing stone counts by color
 */
export class LeaderboardPanel extends FloatingPanel {
  constructor(element, state) {
    // Calculate default position below minimap
    const minimapEl = document.getElementById('minimap-float');
    let defaultTop = '284px'; // 16 + 260 + 8
    
    if (minimapEl && !minimapEl.classList.contains('embedded')) {
      const rect = minimapEl.getBoundingClientRect();
      defaultTop = `${rect.bottom + 8}px`;
    }
    
    super(element, {
      id: 'leaderboard-float',
      placeholderId: 'leaderboard-placeholder',
      defaultPosition: { top: defaultTop, right: '16px' },
      defaultSize: { width: '220px', height: 'auto' },
      minSize: { width: 100, height: 100 },
    });
    
    this.state = state;
    this.colorCounts = {};
    this.collapsed = false;
    this.contentEl = element.querySelector('.leaderboard-content');
    
    this.setupEventSubscriptions();
  }

  /**
   * Subscribe to relevant events
   */
  setupEventSubscriptions() {
    eventBus.on(Events.STATE_UPDATED, () => this.update());
    eventBus.on(Events.STATE_DELTA, () => this.update());
    eventBus.on(Events.STATE_BOARD, () => this.update());
    eventBus.on(Events.STATE_RESTART, () => this.update());
    eventBus.on(Events.VIEW_RESET, () => this.resetPosition());
    eventBus.on(Events.UI_SIDEBAR_TOGGLE, () => this.resolveCollisions());
    eventBus.on(Events.UI_SIDEBAR_RESIZE, () => this.resolveCollisions());
  }

  /**
   * Reset position to below minimap
   */
  resetPosition() {
    if (this.embedded) return;
    
    const minimap = document.getElementById('minimap-float');
    let topOffset = 16 + 260 + 8;
    
    if (minimap && !minimap.classList.contains('embedded')) {
      const rect = minimap.getBoundingClientRect();
      topOffset = rect.bottom + 8;
    }
    
    this.element.style.left = 'auto';
    this.element.style.right = '16px';
    this.element.style.top = `${topOffset}px`;
    this.element.style.bottom = 'auto';
  }

  /**
   * Handle embed callback
   */
  onEmbed() {
    this.updateHeaderIndicator(false);
  }

  /**
   * Handle separate callback
   */
  onSeparate() {
    this.element.style.height = 'auto';
    this.updateHeaderIndicator(false);
  }

  /**
   * Auto adjust height based on content
   */
  autoAdjustHeight() {
    if (this.userResized && !this.embedded) return;
    this.element.style.height = 'auto';
  }

  /**
   * Update leaderboard
   */
  update() {
    this.calculateCounts();
    this.render();
    this.autoAdjustHeight();
  }

  /**
   * Calculate stone counts by color
   */
  calculateCounts() {
    this.colorCounts = {};
    for (const stone of this.state.stones.values()) {
      const color = stone.color;
      this.colorCounts[color] = (this.colorCounts[color] || 0) + 1;
    }
  }

  /**
   * Render leaderboard content
   */
  render() {
    const entries = Object.entries(this.colorCounts)
      .map(([color, count]) => ({ color: Number(color), count }))
      .sort((a, b) => b.count - a.count);

    const displayCount = this.collapsed 
      ? CONFIG.LEADERBOARD_COLLAPSED_LIMIT 
      : CONFIG.LEADERBOARD_EXPANDED_LIMIT;
    const topEntries = entries.slice(0, displayCount);

    const listHtml = topEntries.map((entry, index) => {
      const colorName = CONFIG.COLOR_NAMES[entry.color] || `Color ${entry.color}`;
      const colorStyle = CONFIG.STONE_COLORS[entry.color] || '#888';
      
      return `
        <div class="leaderboard-entry">
          <span class="rank">${index + 1}.</span>
          <span class="color-indicator" style="background-color: ${colorStyle}"></span>
          <span class="color-name">${colorName}</span>
          <span class="count">${entry.count}</span>
        </div>
      `;
    }).join('');

    if (this.contentEl) {
      this.contentEl.innerHTML = listHtml;
    }

    this.updateHeaderIndicator(this.collapsed);
  }

  /**
   * Toggle collapsed state
   */
  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.render();
  }

  /**
   * Get current counts
   */
  getCounts() {
    return { ...this.colorCounts };
  }

  /**
   * Get total stone count
   */
  getTotalCount() {
    return Object.values(this.colorCounts).reduce((sum, count) => sum + count, 0);
  }
}
