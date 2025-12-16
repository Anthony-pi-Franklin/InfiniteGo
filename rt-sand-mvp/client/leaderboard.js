// Leaderboard component for InfiniteGo
import { CONFIG } from './config.js';

export class Leaderboard {
  constructor(element, state) {
    this.element = element;
    this.state = state;
    this.colorCounts = {};
    this.collapsed = false;
    this.dragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    const header = this.element.querySelector('h3');
    // Make entire leaderboard draggable
    this.element.addEventListener('mousedown', (e) => {
      // Start dragging
      this.dragging = true;
        const rect = this.element.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        this.element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (this.dragging) {
        this.element.style.left = `${e.clientX - this.dragOffset.x}px`;
        this.element.style.top = `${e.clientY - this.dragOffset.y}px`;
        this.element.style.right = 'auto';
        this.element.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.dragging) {
        this.dragging = false;
        this.element.style.cursor = 'move';
        this.resolveOverlap();
      }
    });

    // Toggle collapse on double-click
    if (header) {
      header.addEventListener('dblclick', () => {
        this.collapsed = !this.collapsed;
        this.update();
      });
    }
  }

  resolveOverlap() {
    const el = this.element;
    const other = document.getElementById('minimap-float');
    const sidebar = document.getElementById('sidebar');
    if (!el) return;
    const r1 = el.getBoundingClientRect();
    if (other) {
      const r2 = other.getBoundingClientRect();
      const overlap = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
      if (overlap) {
        el.style.top = `${r2.bottom + 16}px`;
        el.style.right = '16px';
        el.style.left = 'auto';
      }
    }
    if (sidebar) {
      const rs = sidebar.getBoundingClientRect();
      const overlapS = !(r1.right < rs.left || r1.left > rs.right || r1.bottom < rs.top || r1.top > rs.bottom);
      if (overlapS) {
        // move leaderboard to the right side avoiding sidebar
        el.style.right = '16px';
        el.style.left = 'auto';
        el.style.top = `${rs.bottom + 16}px`;
      }
    }
  }

  update() {
    this.calculateCounts();
    this.render();
  }

  calculateCounts() {
    this.colorCounts = {};
    for (const stone of this.state.stones.values()) {
      const color = stone.color;
      this.colorCounts[color] = (this.colorCounts[color] || 0) + 1;
    }
  }

  render() {
    const entries = Object.entries(this.colorCounts)
      .map(([color, count]) => ({ color: Number(color), count }))
      .sort((a, b) => b.count - a.count);

    const displayCount = this.collapsed ? 3 : 10;
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

    const content = this.element.querySelector('.leaderboard-content');
    if (content) {
      content.innerHTML = listHtml;
    }

    // Update collapse indicator
    const header = this.element.querySelector('h3');
    if (header) {
      header.textContent = `Leaderboard ${this.collapsed ? '▼' : '▲'}`;
    }
  }
}
