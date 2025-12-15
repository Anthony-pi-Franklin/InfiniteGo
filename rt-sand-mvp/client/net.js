// Network communication for InfiniteGo
import { CONFIG } from './config.js';

export class NetworkManager {
  constructor(state, onStateUpdate) {
    this.state = state;
    this.onStateUpdate = onStateUpdate;
    this.ws = null;
    this.connecting = false;
  }

  connect() {
    if (this.connecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.connecting = true;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws`;

    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connecting = false;
      this.requestState();
      this.onStateUpdate('status', 'Connected to server');
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connecting = false;
      this.onStateUpdate('status', 'Disconnected. Reconnecting...');
      setTimeout(() => this.connect(), CONFIG.WS_RECONNECT_DELAY);
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
}
