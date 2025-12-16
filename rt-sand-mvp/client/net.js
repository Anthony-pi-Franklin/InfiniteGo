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
  }

  connect(roomId, playerColor) {
    if (this.connecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    // Store room and color info
    this.roomId = roomId || 'default';
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

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connecting = false;
      this.onStateUpdate('status', 'Disconnected. Reconnecting...');
      setTimeout(() => this.connect(this.roomId, this.playerColor), CONFIG.WS_RECONNECT_DELAY);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.connecting = false;
    };

    this.ws.onmessage = (event) => {
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
        break;

      case 'move_result':
        if (msg.move_result && !msg.move_result.accepted) {
          this.onStateUpdate('status', `Move failed: ${msg.move_result.reason || 'unknown'}`);
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
