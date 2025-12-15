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
    // Make leaderboard draggable
    const header = this.element.querySelector('h3');
    
    header.addEventListener('mousedown', (e) => {
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
      }
    });

    // Toggle collapse on double-click
    header.addEventListener('dblclick', () => {
      this.collapsed = !this.collapsed;
      this.update();
    });
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
