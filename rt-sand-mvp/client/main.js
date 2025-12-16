// Main application entry point
import { CONFIG } from './config.js';
import { GameState } from './state.js';
import { NetworkManager } from './net.js';
import { Renderer } from './render.js';
import { InputManager } from './input.js';
import { Minimap } from './minimap.js';
import { Leaderboard } from './leaderboard.js';

class InfiniteGoApp {
  constructor() {
    this.state = new GameState();
    
    // Get room info from URL or session storage
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('room') || sessionStorage.getItem('roomId') || 'default';
    this.playerColor = Number(sessionStorage.getItem('playerColor') || '0');
    
    // If no room in URL, redirect to lobby
    if (!urlParams.get('room') && !sessionStorage.getItem('roomId')) {
      window.location.href = 'lobby.html';
      return;
    }
    
    // Set selected color in state
    this.state.selectedColor = this.playerColor;
    
    this.initializeUI();
    this.setupComponents();
    this.setupControls();
  }

  initializeUI() {
    // Set canvas sizes
    const mainCanvas = document.getElementById('canvas');
    const minimapCanvas = document.getElementById('minimap');
    
    const resize = () => {
      mainCanvas.width = window.innerWidth;
      mainCanvas.height = window.innerHeight;
      minimapCanvas.width = CONFIG.MINIMAP_WIDTH;
      minimapCanvas.height = CONFIG.MINIMAP_HEIGHT;
    };
    
    resize();
    window.addEventListener('resize', resize);
  }

  setupComponents() {
    // Main canvas renderer
    const mainCanvas = document.getElementById('canvas');
    this.renderer = new Renderer(mainCanvas, this.state);
    this.renderer.start();

    // Network manager - connect with room and color
    this.network = new NetworkManager(this.state, (event, data) => {
      this.handleNetworkEvent(event, data);
    });
    this.network.connect(this.roomId, this.playerColor);

    // Input manager
    this.input = new InputManager(mainCanvas, this.state, this.renderer, (action, data) => {
      this.handleInputAction(action, data);
    });

    // Minimap
    const minimapCanvas = document.getElementById('minimap');
    this.minimap = new Minimap(minimapCanvas, this.state);
    this.minimap.start();

    // Leaderboard
    const leaderboardEl = document.getElementById('leaderboard-float');
    this.leaderboard = new Leaderboard(leaderboardEl, this.state);
  }

  setupControls() {
    // Display room info
    document.getElementById('current-room').textContent = this.roomId;
    this.updatePlayerColorDisplay();
    
    // Leave room button
    document.getElementById('leave-room-btn').addEventListener('click', () => {
      if (confirm('Leave this room and return to lobby?')) {
        sessionStorage.removeItem('roomId');
        sessionStorage.removeItem('playerColor');
        window.location.href = 'lobby.html';
      }
    });
    
    // Menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const sidebar = document.getElementById('sidebar');
    
    // Menu toggle button is hidden by default (sidebar shown)
    menuToggle.classList.remove('visible');
    sidebar.classList.remove('hidden');
    
    menuToggle.addEventListener('click', () => {
      sidebar.classList.remove('hidden');
      menuToggle.classList.remove('visible');
    });
    
    menuClose.addEventListener('click', () => {
      sidebar.classList.add('hidden');
      menuToggle.classList.add('visible');
    });

    // Sidebar resize
    const sidebarResizeHandle = document.querySelector('.sidebar-resize-handle');
    let isResizingSidebar = false;
    let startX = 0;
    let startWidth = 0;

    if (sidebarResizeHandle) {
      sidebarResizeHandle.addEventListener('mousedown', (e) => {
        isResizingSidebar = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        e.preventDefault();
      });

      window.addEventListener('mousemove', (e) => {
        if (isResizingSidebar) {
          const newWidth = startWidth + (e.clientX - startX);
          const clampedWidth = Math.max(200, Math.min(500, newWidth));
          sidebar.style.width = `${clampedWidth}px`;
        }
      });

      window.addEventListener('mouseup', () => {
        isResizingSidebar = false;
      });
    }

    // Color buttons - removed (players locked to their chosen color)

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.placementMode = btn.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Restart button
    document.getElementById('restart-btn').addEventListener('click', () => {
      if (confirm('Clear entire board?')) {
        this.network.sendRestart();
      }
    });

    // Reset view button
    document.getElementById('reset-view-btn').addEventListener('click', () => {
      this.state.resetView();
      this.state.saveViewState();
    });
  }

  updatePlayerColorDisplay() {
    const colorNames = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Cyan', 'Pink'];
    const colorDisplay = document.getElementById('player-color-display');
    if (colorDisplay) {
      colorDisplay.textContent = colorNames[this.playerColor] || `Color ${this.playerColor}`;
      
      // Set background and text color for contrast
      const bgColors = ['#000', '#fff', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63'];
      const textColors = ['#fff', '#000', '#fff', '#fff', '#fff', '#000', '#fff', '#fff', '#000', '#fff'];
      
      colorDisplay.style.backgroundColor = bgColors[this.playerColor] || '#888';
      colorDisplay.style.color = textColors[this.playerColor] || '#fff';
      
      if (this.playerColor === 1) {
        colorDisplay.style.border = '1px solid #666';
      } else {
        colorDisplay.style.border = 'none';
      }
    }
  }

  handleNetworkEvent(event, data) {
    switch (event) {
      case 'status':
        this.updateStatus(data);
        break;
      
      case 'delta':
      case 'board_state':
        this.updateSeq();
        this.leaderboard.update();
        break;
      
      case 'restart':
        this.updateStatus('Cleared your stones');
        this.leaderboard.update();
        break;
    }
  }

  handleInputAction(action, data) {
    switch (action) {
      case 'place_stone':
        this.network.sendMove(data.x, data.y, data.color);
        break;
    }
  }

  updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  updateSeq() {
    const seqEl = document.getElementById('seq');
    if (seqEl) {
      seqEl.textContent = `Seq: ${this.state.seq}`;
    }
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InfiniteGoApp();
});
