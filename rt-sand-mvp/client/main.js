// Main application entry point - Refactored
import { CONFIG } from './config.js';
import { GameState } from './state.js';
import { NetworkManager } from './net.js';
import { Renderer } from './render.js';
import { InputManager } from './input.js';
import { eventBus, Events } from './core/EventBus.js';
import { MinimapPanel, LeaderboardPanel, uiManager } from './ui/index.js';

/**
 * InfiniteGoApp - Main application controller
 * Coordinates all components through event bus
 */
class InfiniteGoApp {
  constructor() {
    this.state = new GameState();
    
    // Get room info from URL or session storage
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('room') || sessionStorage.getItem('roomId') || 'default';
    this.playerColor = Number(sessionStorage.getItem('playerColor') || '0');
    
    // Redirect to lobby if no room specified
    if (!urlParams.get('room') && !sessionStorage.getItem('roomId')) {
      window.location.href = 'lobby.html';
      return;
    }
    
    // Set selected color in state
    this.state.selectedColor = this.playerColor;
    
    this.initialize();
  }

  /**
   * Initialize all components
   */
  initialize() {
    this.initializeCanvas();
    this.initializeUIManager();
    this.initializeComponents();
    this.setupControls();
    this.setupEventSubscriptions();
    
    // Initial collision check
    setTimeout(() => {
      uiManager.triggerPanelCollisionCheck();
    }, 100);
  }

  /**
   * Initialize canvas sizes
   */
  initializeCanvas() {
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

  /**
   * Initialize UI manager and panels
   */
  initializeUIManager() {
    uiManager.initialize();
    
    // Display room info
    uiManager.updateRoomInfo(this.roomId);
    uiManager.updatePlayerColorDisplay(this.playerColor, CONFIG);
  }

  /**
   * Initialize game components
   */
  initializeComponents() {
    // Main canvas renderer
    const mainCanvas = document.getElementById('canvas');
    this.renderer = new Renderer(mainCanvas, this.state);
    this.renderer.start();

    // Network manager
    this.network = new NetworkManager(this.state, (event, data) => {
      this.handleNetworkEvent(event, data);
    });
    this.network.connect(this.roomId, this.playerColor);

    // Input manager
    this.input = new InputManager(mainCanvas, this.state, this.renderer, (action, data) => {
      this.handleInputAction(action, data);
    });

    // Minimap panel
    const minimapCanvas = document.getElementById('minimap');
    this.minimap = new MinimapPanel(minimapCanvas, this.state);
    this.minimap.start();
    uiManager.registerPanel('minimap', this.minimap);

    // Leaderboard panel
    const leaderboardEl = document.getElementById('leaderboard-float');
    this.leaderboard = new LeaderboardPanel(leaderboardEl, this.state);
    uiManager.registerPanel('leaderboard', this.leaderboard);
  }

  /**
   * Setup UI controls
   */
  setupControls() {
    // Leave room button
    document.getElementById('leave-room-btn')?.addEventListener('click', () => {
      if (confirm('Leave this room and return to lobby?')) {
        sessionStorage.removeItem('roomId');
        sessionStorage.removeItem('playerColor');
        window.location.href = 'lobby.html';
      }
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.placementMode = btn.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Drag mode buttons
    document.querySelectorAll('.drag-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.dragMode = btn.dataset.dragmode;
        document.querySelectorAll('.drag-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Restart button
    document.getElementById('restart-btn')?.addEventListener('click', () => {
      if (confirm('Clear entire board?')) {
        this.network.sendRestart();
      }
    });

    // Reset view button
    document.getElementById('reset-view-btn')?.addEventListener('click', () => {
      this.state.resetView();
      this.state.saveViewState();
      uiManager.resetAllPanels();
    });
  }

  /**
   * Setup event subscriptions
   */
  setupEventSubscriptions() {
    // Subscribe to state changes for leaderboard updates
    eventBus.on(Events.STATE_UPDATED, () => {
      uiManager.updateSeq(this.state.seq);
    });
  }

  /**
   * Handle network events
   */
  handleNetworkEvent(event, data) {
    switch (event) {
      case 'status':
        uiManager.updateStatus(data);
        break;
      
      case 'delta':
        eventBus.emit(Events.STATE_DELTA, data);
        uiManager.updateSeq(this.state.seq);
        break;
      
      case 'board_state':
        eventBus.emit(Events.STATE_BOARD, data);
        uiManager.updateSeq(this.state.seq);
        break;
      
      case 'room_info':
        eventBus.emit(Events.ROOM_INFO_UPDATED, data);
        break;
      
      case 'room_expired':
        eventBus.emit(Events.ROOM_EXPIRED);
        alert('房间已过期关闭，将返回大厅');
        sessionStorage.removeItem('roomId');
        sessionStorage.removeItem('playerColor');
        window.location.href = 'lobby.html';
        break;
      
      case 'connection_failed':
        alert(data || '连接失败，请返回大厅重试');
        sessionStorage.removeItem('roomId');
        sessionStorage.removeItem('playerColor');
        window.location.href = 'lobby.html';
        break;
      
      case 'banned':
        // 显示封禁消息并禁止操作
        alert(data || '您已被临时封禁，请30分钟后再试');
        sessionStorage.removeItem('roomId');
        sessionStorage.removeItem('playerColor');
        window.location.href = 'lobby.html';
        break;
      
      case 'restart':
        eventBus.emit(Events.STATE_RESTART);
        uiManager.updateStatus('Cleared your stones');
        break;
    }
  }

  /**
   * Handle input actions
   */
  handleInputAction(action, data) {
    switch (action) {
      case 'place_stone':
        this.network.sendMove(data.x, data.y, data.color);
        eventBus.emit(Events.INPUT_PLACE_STONE, data);
        break;
    }
  }

  /**
   * Cleanup application
   */
  destroy() {
    this.renderer?.stop();
    this.minimap?.destroy();
    uiManager.destroy();
    eventBus.clear();
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InfiniteGoApp();
});
