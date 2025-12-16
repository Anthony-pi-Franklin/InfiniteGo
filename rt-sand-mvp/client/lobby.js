// Lobby application for InfiniteGo room selection
class LobbyApp {
  constructor() {
    this.selectedColor = 0; // Default to black
    this.init();
  }

  init() {
    this.setupColorPicker();
    this.setupCreateRoom();
    this.setupQuickJoin();
    this.setupRoomList();
    this.loadRooms();
  }

  setupColorPicker() {
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        colorOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedColor = Number(btn.dataset.color);
      });
    });
  }

  setupCreateRoom() {
    const createBtn = document.getElementById('create-btn');
    const roomIdInput = document.getElementById('room-id');

    createBtn.addEventListener('click', () => {
      let roomId = roomIdInput.value.trim();
      
      // Generate random room ID if not provided
      if (!roomId) {
        roomId = this.generateRoomId();
      }

      // Validate room ID
      if (!this.isValidRoomId(roomId)) {
        alert('房间名称只能包含字母、数字、下划线和连字符，长度为 1-50 个字符');
        return;
      }

      this.joinRoom(roomId);
    });

    // Allow Enter key to create room
    roomIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createBtn.click();
      }
    });
  }

  setupQuickJoin() {
    const quickJoinBtn = document.getElementById('quick-join-btn');
    const joinRoomIdInput = document.getElementById('join-room-id');

    quickJoinBtn.addEventListener('click', () => {
      const roomId = joinRoomIdInput.value.trim();
      
      if (!roomId) {
        alert('请输入房间名称');
        return;
      }

      if (!this.isValidRoomId(roomId)) {
        alert('房间名称只能包含字母、数字、下划线和连字符');
        return;
      }

      this.joinRoom(roomId);
    });

    // Allow Enter key to join room
    joinRoomIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        quickJoinBtn.click();
      }
    });
  }

  setupRoomList() {
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.addEventListener('click', () => {
      this.loadRooms();
    });

    // Auto-refresh every 5 seconds
    setInterval(() => {
      this.loadRooms();
    }, 5000);
  }

  async loadRooms() {
    const roomListEl = document.getElementById('room-list');
    const roomCountEl = document.getElementById('room-count');

    try {
      const response = await fetch('/api/rooms');
      if (!response.ok) {
        throw new Error('Failed to load rooms');
      }

      const rooms = await response.json();
      
      // Update room count
      roomCountEl.textContent = rooms.length;

      // Clear and populate room list
      roomListEl.innerHTML = '';

      if (rooms.length === 0) {
        roomListEl.innerHTML = '<p class="no-rooms">暂无活跃房间，创建一个新房间开始游戏！</p>';
        return;
      }

      rooms.forEach(room => {
        const roomCard = this.createRoomCard(room);
        roomListEl.appendChild(roomCard);
      });
    } catch (error) {
      console.error('Load rooms error:', error);
      roomListEl.innerHTML = '<p class="error-text">无法加载房间列表，请检查服务器连接</p>';
    }
  }

  createRoomCard(room) {
    const card = document.createElement('div');
    card.className = 'room-card';
    
    card.innerHTML = `
      <div class="room-info">
        <h3 class="room-name">${this.escapeHtml(room.id)}</h3>
        <p class="room-players">
          <span class="player-icon">👥</span>
          ${room.player_count} ${room.player_count === 1 ? '位玩家' : '位玩家'}
        </p>
      </div>
      <button class="btn btn-join" data-room-id="${this.escapeHtml(room.id)}">
        加入房间
      </button>
    `;

    const joinBtn = card.querySelector('.btn-join');
    joinBtn.addEventListener('click', () => {
      this.joinRoom(room.id);
    });

    return card;
  }

  joinRoom(roomId) {
    // Save room ID and color to session storage
    sessionStorage.setItem('roomId', roomId);
    sessionStorage.setItem('playerColor', this.selectedColor);

    // Navigate to game page
    window.location.href = `index.html?room=${encodeURIComponent(roomId)}`;
  }

  generateRoomId() {
    // Generate a random room ID with format: room-XXXXX
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'room-';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  isValidRoomId(roomId) {
    // Only allow alphanumeric, underscore, and hyphen, 1-50 chars
    return /^[a-zA-Z0-9_-]{1,50}$/.test(roomId);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Start the lobby application
document.addEventListener('DOMContentLoaded', () => {
  window.lobbyApp = new LobbyApp();
});
