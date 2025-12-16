// Leaderboard component for InfiniteGo
import { CONFIG } from './config.js';

export class Leaderboard {
  constructor(element, state) {
    this.element = element;
    this.state = state;
    this.colorCounts = {};
    this.collapsed = false;
    this.dragging = false;
    this.resizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.embedded = false; // Track if embedded in sidebar
    this.userResized = false; // Track if user manually resized
    
    this.setupEventListeners();
  }

  setPosition(el, x, y) {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const clampedX = Math.max(0, Math.min(window.innerWidth - w, x));
    const clampedY = Math.max(0, Math.min(window.innerHeight - h, y));
    el.style.left = `${clampedX}px`;
    el.style.top = `${clampedY}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  separateFromOther() {
    const el = this.element;
    const other = document.getElementById('minimap-float');
    if (!el || !other) return;
    const r1 = el.getBoundingClientRect();
    const r2 = other.getBoundingClientRect();
    const overlap = !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
    if (!overlap) return;

    const dx = Math.min(r1.right - r2.left, r2.right - r1.left);
    const dy = Math.min(r1.bottom - r2.top, r2.bottom - r1.top);
    let newX = r1.left;
    let newY = r1.top;
    const gap = 8;
    if (dx < dy) {
      newX += r1.left < r2.left ? -(dx + gap) : (dx + gap);
    } else {
      newY += r1.top < r2.top ? -(dy + gap) : (dy + gap);
    }
    this.setPosition(el, newX, newY);
  }

  setupEventListeners() {
    const header = this.element.querySelector('h3');
    const resizeHandle = this.element.querySelector('.resize-handle');
    
    const startDrag = (e) => {
      if (this.resizing || this.embedded) return;
      this.dragging = true;
      const rect = this.element.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      this.element.style.cursor = 'grabbing';
    };

    // Drag from header or body (excluding resize handle)
    if (header) header.addEventListener('mousedown', startDrag);
    this.element.addEventListener('mousedown', (e) => {
      if (e.target === resizeHandle) return;
      startDrag(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.dragging) {
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        this.setPosition(this.element, x, y);
        this.separateFromOther();
      }
      
      if (this.resizing) {
        const rect = this.element.getBoundingClientRect();
        const newWidth = Math.max(100, e.clientX - rect.left);
        const newHeight = Math.max(100, e.clientY - rect.top);
        
        // Enforce viewport boundaries for resize
        const maxW = window.innerWidth - rect.left;
        const maxH = window.innerHeight - rect.top;
        
        const finalW = Math.min(newWidth, maxW);
        const finalH = Math.min(newHeight, maxH);
        
        this.element.style.width = `${finalW}px`;
        this.element.style.height = `${finalH}px`;
        
        // Clamp position after resize
        const r = this.element.getBoundingClientRect();
        this.setPosition(this.element, r.left, r.top);
        this.separateFromOther();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.dragging) {
        this.dragging = false;
        this.element.style.cursor = 'move';
      }
      if (this.resizing) {
        this.resizing = false;
        this.element.style.cursor = 'move';
      }
    });

    // Resize handle
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        if (this.embedded) return;
        e.preventDefault();
        e.stopPropagation();
        this.resizing = true;
        this.userResized = true;
        this.element.style.cursor = 'se-resize';
      });
    }

    // Toggle embed/separate on double-click (header or container)
    const toggleEmbed = () => {
      if (this.embedded) {
        this.separateFromSidebar();
      } else {
        this.embedInSidebar();
      }
    };
    if (header) header.addEventListener('dblclick', toggleEmbed);
    this.element.addEventListener('dblclick', (e) => {
      const resizeHandle = this.element.querySelector('.resize-handle');
      if (e.target === resizeHandle) return;
      toggleEmbed();
    });
  }

  // Overlap with sidebar: still keep simple push right on drop
  resolveOverlap() {
    const el = this.element;
    const sidebar = document.getElementById('sidebar');
    if (!el || !sidebar) return;
    const r1 = el.getBoundingClientRect();
    const rs = sidebar.getBoundingClientRect();
    const overlapSidebar = !(r1.right <= rs.left || r1.left >= rs.right || r1.bottom <= rs.top || r1.top >= rs.bottom);
    if (overlapSidebar) {
      const newLeft = rs.right + 16;
      this.setPosition(el, newLeft, r1.top);
    }
  }

  embedInSidebar() {
    const windowEl = this.element;
    const sidebar = document.getElementById('sidebar');
    
    if (!windowEl || !sidebar) return;
    
    // Change display to embedded style
    windowEl.classList.add('embedded');
    windowEl.style.position = 'static';
    windowEl.style.width = '100%';
    windowEl.style.left = 'auto';
    windowEl.style.top = 'auto';
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
    
    // Disable dragging and resizing when embedded
    windowEl.style.cursor = 'default';
    
    // Hide resize handle when embedded
    const resizeHandle = windowEl.querySelector('.resize-handle');
    if (resizeHandle) resizeHandle.style.display = 'none';
    
    // Move to sidebar (append to sidebar)
    const placeholder = document.getElementById('leaderboard-placeholder');
    if (placeholder) {
      placeholder.classList.add('active');
      placeholder.appendChild(windowEl);
    }
    
    this.embedded = true;
    this.userResized = false;
  }

  separateFromSidebar() {
    const windowEl = this.element;
    const appEl = document.getElementById('app');
    
    if (!windowEl || !appEl) return;
    
    // Change back to floating style
    windowEl.classList.remove('embedded');
    windowEl.style.position = 'absolute';
    windowEl.style.width = '220px';
    windowEl.style.height = '300px';
    windowEl.style.top = '260px';
    windowEl.style.right = '16px';
    windowEl.style.left = 'auto';
    windowEl.style.bottom = 'auto';
    
    // Move back to main app
    appEl.appendChild(windowEl);
    
    // Show resize handle when separated
    const resizeHandle = windowEl.querySelector('.resize-handle');
    if (resizeHandle) resizeHandle.style.display = 'block';
    
    const placeholder = document.getElementById('leaderboard-placeholder');
    if (placeholder) {
      placeholder.classList.remove('active');
    }
    
    this.embedded = false;
    
    const header = windowEl.querySelector('h3');
    if (header) {
      header.textContent = 'Leaderboard ▲';
    }
    
    this.separateFromOther();
  }

  autoAdjustHeight() {
    if (this.userResized && !this.embedded) return;
    // When embedded or not user-resized, auto-size to content (max 10 items)
    this.element.style.height = 'auto';
  }

  update() {
    this.calculateCounts();
    this.render();
    this.autoAdjustHeight();
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
