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

    // Network manager
    this.network = new NetworkManager(this.state, (event, data) => {
      this.handleNetworkEvent(event, data);
    });
    this.network.connect();

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

    // Color buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.selectedColor = Number(btn.dataset.color);
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

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
        this.updateStatus('Board cleared');
        this.updateSeq();
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
