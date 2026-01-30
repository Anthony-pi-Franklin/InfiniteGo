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
    this.resetPosition(); // Set initial position
  }

  resetPosition() {
    const el = this.element;
    if (!el || el.classList.contains('embedded')) return;
    
    // Position below minimap, aligned to right
    const minimap = document.getElementById('minimap-float');
    let topOffset = 16 + 260 + 8; // Default: minimap top(16) + height(260) + gap(8)
    
    if (minimap && !minimap.classList.contains('embedded')) {
      const rect = minimap.getBoundingClientRect();
      topOffset = rect.bottom + 8;
    }
    
    el.style.left = 'auto';
    el.style.right = '16px';
    el.style.top = `${topOffset}px`;
    el.style.bottom = 'auto';
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

  // Check if a position overlaps with a rect (with gap)
  checkRectCollision(x, y, width, height, rect, gap) {
    return !(x + width + gap <= rect.left || x >= rect.right + gap || 
             y + height + gap <= rect.top || y >= rect.bottom + gap);
  }

  // Get all obstacle rects (sidebar + other floating panels)
  getObstacles(excludeId) {
    const obstacles = [];
    const gap = 8;
    
    // Sidebar is a rigid body (highest priority)
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('hidden')) {
      obstacles.push({ rect: sidebar.getBoundingClientRect(), rigid: true, id: 'sidebar' });
    }
    
    // Other floating panels
    const panels = ['minimap-float', 'leaderboard-float'];
    for (const id of panels) {
      if (id === excludeId) continue;
      const el = document.getElementById(id);
      if (el && !el.classList.contains('embedded')) {
        obstacles.push({ rect: el.getBoundingClientRect(), rigid: false, id });
      }
    }
    
    return obstacles;
  }

  // Check if position collides with any obstacle
  checkAnyCollision(x, y, width, height, obstacles, gap) {
    for (const obs of obstacles) {
      if (this.checkRectCollision(x, y, width, height, obs.rect, gap)) {
        return { collides: true, obstacle: obs };
      }
    }
    return { collides: false, obstacle: null };
  }

  // Get safe boundaries considering sidebar
  getSafeArea(width, height, gap) {
    const sidebar = document.getElementById('sidebar');
    let minX = 0;
    
    if (sidebar && !sidebar.classList.contains('hidden')) {
      const sr = sidebar.getBoundingClientRect();
      if (sr.left < window.innerWidth / 2) {
        minX = sr.right + gap;
      }
    }
    
    return {
      minX,
      maxX: window.innerWidth - width,
      minY: 0,
      maxY: window.innerHeight - height
    };
  }

  separateFromOther() {
    const el = this.element;
    if (!el || el.classList.contains('embedded')) return;
    
    const r1 = el.getBoundingClientRect();
    const gap = 8;
    const safe = this.getSafeArea(r1.width, r1.height, gap);
    const obstacles = this.getObstacles('leaderboard-float');
    
    // Check if we have any collision
    const collision = this.checkAnyCollision(r1.left, r1.top, r1.width, r1.height, obstacles, gap);
    if (!collision.collides) return;

    // Generate candidate positions based on all obstacles
    const candidates = [];
    
    for (const obs of obstacles) {
      const r2 = obs.rect;
      // 4 directions to escape from this obstacle
      candidates.push(
        { x: r2.left - r1.width - gap, y: r1.top },   // Left of obstacle
        { x: r2.right + gap, y: r1.top },              // Right of obstacle
        { x: r1.left, y: r2.top - r1.height - gap },   // Above obstacle
        { x: r1.left, y: r2.bottom + gap }             // Below obstacle
      );
    }
    
    // Evaluate each candidate
    const options = candidates.map(pos => {
      const clampedX = Math.max(safe.minX, Math.min(safe.maxX, pos.x));
      const clampedY = Math.max(safe.minY, Math.min(safe.maxY, pos.y));
      const dist = Math.abs(clampedX - r1.left) + Math.abs(clampedY - r1.top);
      const hitsBoundary = (clampedX !== pos.x) || (clampedY !== pos.y);
      
      // Check if this position still collides with ANY obstacle
      const stillCollides = this.checkAnyCollision(clampedX, clampedY, r1.width, r1.height, obstacles, gap);
      
      return { x: clampedX, y: clampedY, dist, hitsBoundary, collides: stillCollides.collides };
    });
    
    // Prefer positions that don't collide, then by boundary hit, then by distance
    options.sort((a, b) => {
      if (a.collides !== b.collides) return a.collides ? 1 : -1;
      if (a.hitsBoundary !== b.hitsBoundary) return a.hitsBoundary ? 1 : -1;
      return a.dist - b.dist;
    });
    
    const best = options[0];
    
    // If best position still collides and it's with a non-rigid obstacle, try pushing it
    if (best.collides) {
      const stillCollision = this.checkAnyCollision(best.x, best.y, r1.width, r1.height, obstacles, gap);
      if (stillCollision.obstacle && !stillCollision.obstacle.rigid) {
        // Push the non-rigid obstacle
        const other = document.getElementById(stillCollision.obstacle.id);
        const r2 = stillCollision.obstacle.rect;
        const otherSafe = this.getSafeArea(r2.width, r2.height, gap);
        
        // Get obstacles excluding both self and the one we're pushing
        const otherObstacles = this.getObstacles(stillCollision.obstacle.id)
          .filter(o => o.id !== 'leaderboard-float');
        
        const otherCandidates = [
          { x: r1.right + gap, y: r2.top },
          { x: r1.left - r2.width - gap, y: r2.top },
          { x: r2.left, y: r1.bottom + gap },
          { x: r2.left, y: r1.top - r2.height - gap }
        ];
        
        const otherOptions = otherCandidates.map(pos => {
          const clampedX = Math.max(otherSafe.minX, Math.min(otherSafe.maxX, pos.x));
          const clampedY = Math.max(otherSafe.minY, Math.min(otherSafe.maxY, pos.y));
          const dist = Math.abs(clampedX - r2.left) + Math.abs(clampedY - r2.top);
          const collides = this.checkAnyCollision(clampedX, clampedY, r2.width, r2.height, otherObstacles, gap);
          return { x: clampedX, y: clampedY, dist, collides: collides.collides };
        });
        
        otherOptions.sort((a, b) => {
          if (a.collides !== b.collides) return a.collides ? 1 : -1;
          return a.dist - b.dist;
        });
        
        const otherBest = otherOptions[0];
        other.classList.add('animating');
        other.style.left = `${otherBest.x}px`;
        other.style.top = `${otherBest.y}px`;
        other.style.right = 'auto';
        other.style.bottom = 'auto';
        setTimeout(() => other.classList.remove('animating'), 300);
      }
    }
    
    // Move self to best position
    el.classList.add('animating');
    el.style.left = `${best.x}px`;
    el.style.top = `${best.y}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    setTimeout(() => el.classList.remove('animating'), 300);
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
        // No collision check during drag
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
        // No collision check during resize
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.dragging) {
        this.dragging = false;
        this.element.style.cursor = 'move';
        this.separateFromOther(); // Check collision on release
      }
      if (this.resizing) {
        this.resizing = false;
        this.element.style.cursor = 'move';
        this.separateFromOther(); // Check collision on release
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

    // Toggle embed/separate on double-click (header only - the drag area)
    const toggleEmbed = (e) => {
      e.stopPropagation();
      if (this.embedded) {
        this.separateFromSidebar();
      } else {
        this.embedInSidebar();
      }
    };
    if (header) header.addEventListener('dblclick', toggleEmbed);
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
    
    // Calculate position below minimap
    const minimap = document.getElementById('minimap-float');
    let topOffset = 16 + 260 + 8; // Default position
    
    if (minimap && !minimap.classList.contains('embedded')) {
      const rect = minimap.getBoundingClientRect();
      topOffset = rect.bottom + 8;
    }
    
    // Change back to floating style
    windowEl.classList.remove('embedded');
    windowEl.style.position = 'absolute';
    windowEl.style.width = '220px';
    windowEl.style.height = 'auto'; // Auto-size based on content
    windowEl.style.top = `${topOffset}px`;
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
    this.userResized = false; // Reset so it auto-sizes
    
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
