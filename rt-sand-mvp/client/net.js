// Network communication for InfiniteGo
import { CONFIG } from './config.js';

export class NetworkManager {
  constructor(state, onStateUpdate) {
    this.state = state;
    this.onStateUpdate = onStateUpdate;
    this.ws = null;
    this.connecting = false;
    this.roomId = null;
    this.playerColor = null;
    this.roomExpired = false; // Flag to prevent reconnection after room expires
  }

  connect(roomId, playerColor) {
    if (this.roomExpired) {
      return; // Don't reconnect after room expired
    }
    if (this.connecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    // Store room and color info
    this.roomId = roomId || 'public';
    this.playerColor = playerColor !== undefined ? playerColor : 0;

    this.connecting = true;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Add room parameter to WebSocket URL
    const wsUrl = `${protocol}//${location.host}/ws?room=${encodeURIComponent(this.roomId)}`;

    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected to room:', this.roomId);
      this.connecting = false;
      
      // Send color selection first
      this.sendColorSelection(this.playerColor);
      
      // Then request initial state
      this.requestState();
      this.onStateUpdate('status', `Connected to room: ${this.roomId}`);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected, code:', event.code);
      this.connecting = false;
      
      // HTTP 429 Too Many Requests causes close with code 1006
      // Check if this is a rate limit error by trying to detect the pattern
      if (event.code === 1006 && !this.hasConnectedBefore) {
        // First connection attempt failed - might be rate limited
        this.onStateUpdate('connection_failed', '连接失败，可能是创建房间过于频繁，请稍后再试');
        return;
      }
      
      if (this.roomExpired) {
        // Room expired, don't reconnect
        return;
      }
      this.onStateUpdate('status', 'Disconnected. Reconnecting...');
      setTimeout(() => this.connect(this.roomId, this.playerColor), CONFIG.WS_RECONNECT_DELAY);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.connecting = false;
    };

    this.ws.onmessage = (event) => {
      this.hasConnectedBefore = true; // Mark that we've successfully received a message
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'color_selected':
        if (msg.move_result && msg.move_result.accepted) {
          console.log('Color selected successfully');
          this.onStateUpdate('status', `Color selected`);
        }
        break;

      case 'delta_update':
        if (msg.delta_update) {
          this.state.applyDelta(msg.delta_update);
          this.onStateUpdate('delta', msg.delta_update);
        }
        break;

      case 'board_state':
        if (msg.board_state) {
          this.state.applyBoardState(msg.board_state);
          this.onStateUpdate('board_state', msg.board_state);
        }
        // Update room info if present
        if (msg.room_info) {
          this.state.setRoomInfo(msg.room_info);
          this.onStateUpdate('room_info', msg.room_info);
        }
        break;

      case 'room_expired':
        this.roomExpired = true; // Prevent reconnection
        this.onStateUpdate('room_expired');
        break;

      case 'move_result':
        if (msg.move_result && !msg.move_result.accepted) {
          const reason = msg.move_result.reason || 'unknown';
          // 处理反作弊相关的错误
          if (reason === 'move_too_fast') {
            this.onStateUpdate('status', '落子过快，请稍候');
          } else if (reason === 'rate_limited') {
            this.onStateUpdate('status', '操作过于频繁，请稍候');
          } else if (reason === 'banned_cheating') {
            this.onStateUpdate('banned', '检测到异常行为，您已被临时封禁');
          } else {
            this.onStateUpdate('status', `Move failed: ${reason}`);
          }
        } else if (msg.move_result && msg.move_result.accepted) {
          this.onStateUpdate('status', 'Move accepted');
        }
        break;

      case 'restart':
        this.state.clearStones();
        this.state.seq = 0n;
        this.onStateUpdate('restart');
        break;

      default:
        console.warn('Unknown message type:', msg.type);
    }
  }

  sendColorSelection(color) {
    this.send({
      type: 'select_color',
      color: Number(color),
    });
  }

  requestState() {
    this.send({ type: 'get_state' });
  }

  sendMove(x, y, color) {
    this.send({
      x: String(x),
      y: String(y),
      color: Number(color),
    });
  }

  sendRestart() {
    this.send({ type: 'restart' });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  getRoomId() {
    return this.roomId;
  }

  getPlayerColor() {
    return this.playerColor;
  }
}
