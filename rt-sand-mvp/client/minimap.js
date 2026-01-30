// Minimap component for InfiniteGo
import { CONFIG } from './config.js';

export class Minimap {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dragging = false;
    this.windowDragging = false;
    this.windowResizing = false;
    this.windowDragOffset = { x: 0, y: 0 };
    this.collapsed = false;
    this.embedded = false; // Track if embedded in sidebar
    this.minimapPan = { x: 0, y: 0 }; // Internal pan offset for minimap view
    
    this.setupEventListeners();
    this.resetPosition(); // Set initial position
  }

  resetPosition() {
    const el = document.getElementById('minimap-float');
    if (!el || el.classList.contains('embedded')) return;
    
    // Reset to top-right corner
    el.style.left = 'auto';
    el.style.right = '16px';
    el.style.top = '16px';
    el.style.bottom = 'auto';
  }

  setPosition(windowEl, x, y) {
    const w = windowEl.offsetWidth;
    const h = windowEl.offsetHeight;
    const clampedX = Math.max(0, Math.min(window.innerWidth - w, x));
    const clampedY = Math.max(0, Math.min(window.innerHeight - h, y));
    windowEl.style.left = `${clampedX}px`;
    windowEl.style.top = `${clampedY}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
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
    const el = document.getElementById('minimap-float');
    if (!el || el.classList.contains('embedded')) return;
    
    const r1 = el.getBoundingClientRect();
    const gap = 8;
    const safe = this.getSafeArea(r1.width, r1.height, gap);
    const obstacles = this.getObstacles('minimap-float');
    
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
          .filter(o => o.id !== 'minimap-float');
        
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
    // Make floating window draggable
    const windowEl = document.getElementById('minimap-float');
    const header = windowEl.querySelector('h3');
    const resizeHandle = windowEl.querySelector('.resize-handle');
    
    const startDrag = (e) => {
      if (this.windowResizing || this.embedded) return;
      this.windowDragging = true;
      const rect = windowEl.getBoundingClientRect();
      this.windowDragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      windowEl.style.cursor = 'grabbing';
    };

    // Drag from header or body (excluding resize handle)
    header.addEventListener('mousedown', startDrag);
    windowEl.addEventListener('mousedown', (e) => {
      if (e.target === resizeHandle) return;
      startDrag(e);
    });

    window.addEventListener('mousemove', (e) => {
      const windowEl = document.getElementById('minimap-float');
      if (!windowEl) return;
      
      if (this.windowDragging) {
        const x = e.clientX - this.windowDragOffset.x;
        const y = e.clientY - this.windowDragOffset.y;
        this.setPosition(windowEl, x, y);
        // No collision check during drag
      }
      
      if (this.windowResizing) {
        const rect = windowEl.getBoundingClientRect();
        const newWidth = Math.max(100, e.clientX - rect.left);
        const newHeight = Math.max(100, e.clientY - rect.top);
        
        // Enforce viewport boundaries for resize
        const maxW = window.innerWidth - rect.left;
        const maxH = window.innerHeight - rect.top;
        
        const finalW = Math.min(newWidth, maxW);
        const finalH = Math.min(newHeight, maxH);
        
        windowEl.style.width = `${finalW}px`;
        windowEl.style.height = `${finalH}px`;
        
        // Update canvas size (accounting for 24px padding = 12px * 2)
        this.canvas.width = Math.max(50, finalW - 24);
        this.canvas.height = Math.max(50, finalH - 50);
        
        // Clamp position after resize to stay on screen
        const r = windowEl.getBoundingClientRect();
        this.setPosition(windowEl, r.left, r.top);
        // No collision check during resize
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.windowDragging) {
        this.windowDragging = false;
        windowEl.style.cursor = 'move';
        this.separateFromOther(); // Check collision on release
      }
      if (this.windowResizing) {
        this.windowResizing = false;
        windowEl.style.cursor = 'move';
        this.separateFromOther(); // Check collision on release
      }
    });

    // Resize handle
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.windowResizing = true;
        windowEl.style.cursor = 'se-resize';
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
    header.addEventListener('dblclick', toggleEmbed);

    // Canvas interactions for navigation
    this.canvas.addEventListener('mousedown', (e) => {
      e.stopPropagation(); // Prevent window dragging when interacting with canvas
      this.dragging = true;
      this.handleDrag(e);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.dragging) {
        e.stopPropagation();
        this.handleDrag(e);
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      e.stopPropagation();
      this.dragging = false;
      this.separateFromOther();
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? CONFIG.ZOOM_FACTOR : 1 / CONFIG.ZOOM_FACTOR;
      const newScale = Math.max(
        CONFIG.MINIMAP_MIN_SCALE,
        Math.min(CONFIG.MINIMAP_MAX_SCALE, this.state.minimapScale * factor)
      );
      this.state.minimapScale = newScale;
    });
  }

  resolveOverlap() {
    const el = document.getElementById('minimap-float');
    const other = document.getElementById('leaderboard-float');
    if (!el || !other) return;
    
    const r1 = el.getBoundingClientRect();
    const r2 = other.getBoundingClientRect();
    
    const overlap = !(r1.right + 5 < r2.left || r1.left > r2.right + 5 ||
                     r1.bottom + 5 < r2.top || r1.top > r2.bottom + 5);

    if (overlap) {
      // Push leaderboard below minimap with gap, clamped to viewport
      let newTop = r1.bottom + 16;
      let newLeft = r1.left;
      const maxTop = window.innerHeight - r2.height;
      const maxLeft = window.innerWidth - r2.width;
      newTop = Math.min(Math.max(0, newTop), Math.max(0, maxTop));
      newLeft = Math.min(Math.max(0, newLeft), Math.max(0, maxLeft));
      other.style.top = `${newTop}px`;
      other.style.left = `${newLeft}px`;
      other.style.right = 'auto';
    }
  }

  embedInSidebar() {
    const windowEl = document.getElementById('minimap-float');
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
    const placeholder = document.getElementById('minimap-placeholder');
    if (placeholder) {
      placeholder.classList.add('active');
      placeholder.appendChild(windowEl);
    }
    
    this.embedded = true;
    
    // Update canvas size for embedded mode
    setTimeout(() => {
      this.canvas.width = windowEl.offsetWidth - 24;
      this.canvas.height = 150;
    }, 0);
  }

  separateFromSidebar() {
    const windowEl = document.getElementById('minimap-float');
    const appEl = document.getElementById('app');
    
    if (!windowEl || !appEl) return;
    
    // Change back to floating style
    windowEl.classList.remove('embedded');
    windowEl.style.position = 'absolute';
    windowEl.style.width = '220px';
    windowEl.style.height = '260px';
    windowEl.style.top = '16px';
    windowEl.style.right = '16px';
    windowEl.style.left = 'auto';
    windowEl.style.bottom = 'auto';
    
    // Move back to main app
    appEl.appendChild(windowEl);
    
    // Show resize handle when separated
    const resizeHandle = windowEl.querySelector('.resize-handle');
    if (resizeHandle) resizeHandle.style.display = 'block';
    
    const placeholder = document.getElementById('minimap-placeholder');
    if (placeholder) {
      placeholder.classList.remove('active');
    }
    
    this.embedded = false;
    
    // Update canvas size
    setTimeout(() => {
      this.canvas.width = 200;
      this.canvas.height = 240;
    }, 0);
    
    // Update header
    const header = windowEl.querySelector('h3');
    if (header) {
      header.textContent = 'Minimap ▲';
    }
    
    // If leaderboard is floating, reposition it below minimap
    const leaderboard = document.getElementById('leaderboard-float');
    if (leaderboard && !leaderboard.classList.contains('embedded')) {
      setTimeout(() => {
        const minimapRect = windowEl.getBoundingClientRect();
        leaderboard.style.top = `${minimapRect.bottom + 8}px`;
        leaderboard.style.right = '16px';
        leaderboard.style.left = 'auto';
      }, 10);
    }
  }

  handleDrag(e) {
    const rect = this.canvas.getBoundingClientRect();
    
    // Convert mouse position to canvas internal coordinates
    // (rect is CSS display size, canvas.width/height is internal buffer size)
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Account for minimap's internal pan offset
    // Convert mouse position to world coordinates, where the viewport center should be
    const worldX = (mx - centerX - this.minimapPan.x) / this.state.minimapScale;
    const worldY = (my - centerY - this.minimapPan.y) / this.state.minimapScale;

    // Set main view pan so the viewport center is at this world position
    this.state.pan.x = -worldX * this.state.scale;
    this.state.pan.y = -worldY * this.state.scale;
    this.state.saveViewState();
    
    // Force immediate minimap pan update to follow mouse during drag
    // This ensures the viewport box center stays under the cursor
    this.updateMinimapPanInstant();
  }

  updateMinimapPanInstant() {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = this.state.minimapScale;

    // Calculate viewport in world coordinates
    const mainCanvas = document.getElementById('canvas');
    const mainW = mainCanvas.width;
    const mainH = mainCanvas.height;
    const mainScale = this.state.scale;
    const mainPan = this.state.pan;
    
    const vpLeft = (-mainW / 2 - mainPan.x) / mainScale;
    const vpRight = (mainW / 2 - mainPan.x) / mainScale;
    const vpTop = (-mainH / 2 - mainPan.y) / mainScale;
    const vpBottom = (mainH / 2 - mainPan.y) / mainScale;

    const vpCenterX = (vpLeft + vpRight) / 2;
    const vpCenterY = (vpTop + vpBottom) / 2;
    const vpWidth = (vpRight - vpLeft) * scale;
    const vpHeight = (vpBottom - vpTop) * scale;

    const vpMidX = centerX + vpCenterX * scale;
    const vpMidY = centerY + vpCenterY * scale;

    const margin = 4;
    const halfVpW = vpWidth / 2;
    const halfVpH = vpHeight / 2;

    let targetPanX = this.minimapPan.x;
    let targetPanY = this.minimapPan.y;

    if (vpMidX + targetPanX - halfVpW < margin) {
      targetPanX = margin + halfVpW - vpMidX;
    }
    if (vpMidX + targetPanX + halfVpW > width - margin) {
      targetPanX = width - margin - halfVpW - vpMidX;
    }
    if (vpMidY + targetPanY - halfVpH < margin) {
      targetPanY = margin + halfVpH - vpMidY;
    }
    if (vpMidY + targetPanY + halfVpH > height - margin) {
      targetPanY = height - margin - halfVpH - vpMidY;
    }

    // Instant update during drag (no smoothing)
    this.minimapPan.x = targetPanX;
    this.minimapPan.y = targetPanY;
  }

  draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = this.state.minimapScale;

    // Calculate viewport in world coordinates
    const mainCanvas = document.getElementById('canvas');
    const mainW = mainCanvas.width;
    const mainH = mainCanvas.height;
    const mainScale = this.state.scale;
    const mainPan = this.state.pan;
    
    const vpLeft = (-mainW / 2 - mainPan.x) / mainScale;
    const vpRight = (mainW / 2 - mainPan.x) / mainScale;
    const vpTop = (-mainH / 2 - mainPan.y) / mainScale;
    const vpBottom = (mainH / 2 - mainPan.y) / mainScale;

    // Calculate viewport center in world coordinates
    const vpCenterX = (vpLeft + vpRight) / 2;
    const vpCenterY = (vpTop + vpBottom) / 2;
    const vpWidth = (vpRight - vpLeft) * scale;
    const vpHeight = (vpBottom - vpTop) * scale;

    // Calculate required minimap pan to keep viewport within bounds
    // Viewport center in minimap coordinates (without pan)
    const vpMidX = centerX + vpCenterX * scale;
    const vpMidY = centerY + vpCenterY * scale;

    // Define margin from edge
    const margin = 4;
    const halfVpW = vpWidth / 2;
    const halfVpH = vpHeight / 2;

    // Target: keep viewport rectangle within [margin, width-margin] x [margin, height-margin]
    // Calculate the required pan offset
    let targetPanX = this.minimapPan.x;
    let targetPanY = this.minimapPan.y;

    // Check left boundary
    if (vpMidX + targetPanX - halfVpW < margin) {
      targetPanX = margin + halfVpW - vpMidX;
    }
    // Check right boundary
    if (vpMidX + targetPanX + halfVpW > width - margin) {
      targetPanX = width - margin - halfVpW - vpMidX;
    }
    // Check top boundary
    if (vpMidY + targetPanY - halfVpH < margin) {
      targetPanY = margin + halfVpH - vpMidY;
    }
    // Check bottom boundary
    if (vpMidY + targetPanY + halfVpH > height - margin) {
      targetPanY = height - margin - halfVpH - vpMidY;
    }

    // Smoothly interpolate pan (optional: instant snap)
    const smoothFactor = 0.3;
    this.minimapPan.x += (targetPanX - this.minimapPan.x) * smoothFactor;
    this.minimapPan.y += (targetPanY - this.minimapPan.y) * smoothFactor;

    // Apply pan offset
    const offsetX = this.minimapPan.x;
    const offsetY = this.minimapPan.y;

    // Draw stones with offset
    for (const stone of this.state.stones.values()) {
      const wx = Number(stone.x);
      const wy = Number(stone.y);
      const mx = centerX + wx * scale + offsetX;
      const my = centerY + wy * scale + offsetY;

      // Only draw if within canvas bounds
      if (mx >= -2 && mx <= width + 2 && my >= -2 && my <= height + 2) {
        this.ctx.fillStyle = CONFIG.STONE_COLORS[stone.color] || '#888';
        this.ctx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    // Draw viewport rectangle with offset
    const vpScreenLeft = centerX + vpLeft * scale + offsetX;
    const vpScreenRight = centerX + vpRight * scale + offsetX;
    const vpScreenTop = centerY + vpTop * scale + offsetY;
    const vpScreenBottom = centerY + vpBottom * scale + offsetY;

    this.ctx.strokeStyle = '#0f0';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      vpScreenLeft, 
      vpScreenTop, 
      vpScreenRight - vpScreenLeft, 
      vpScreenBottom - vpScreenTop
    );
  }

  start() {
    const animate = () => {
      this.draw();
      requestAnimationFrame(animate);
    };
    animate();
  }
}
