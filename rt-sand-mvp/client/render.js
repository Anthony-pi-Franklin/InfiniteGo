// Rendering logic for InfiniteGo
import { CONFIG } from './config.js';

// Time thresholds for expiration warnings
const ONE_HOUR_MS = 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

export class Renderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.animationId = null;
  }

  start() {
    const animate = () => {
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.drawGrid();
    this.drawStones();
    this.drawExpirationWarning();
  }

  drawGrid() {
    const { width, height } = this.canvas;
    const { scale, pan } = this.state;
    const step = scale;

    this.ctx.strokeStyle = '#2d3748';
    this.ctx.lineWidth = 1;

    const originX = (width / 2 + pan.x) % step;
    const originY = (height / 2 + pan.y) % step;

    this.ctx.beginPath();
    for (let x = originX; x < width; x += step) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
    }
    for (let y = originY; y < height; y += step) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
    }
    this.ctx.stroke();
  }

  drawStones() {
    const { width, height } = this.canvas;
    const { scale, pan, stones, placementMode } = this.state;
    const radius = scale * CONFIG.STONE_RADIUS_RATIO;

    for (const stone of stones.values()) {
      const wx = Number(stone.x);
      const wy = Number(stone.y);
      
      let sx, sy;
      if (placementMode === 'intersection') {
        sx = wx * scale + width / 2 + pan.x;
        sy = wy * scale + height / 2 + pan.y;
      } else {
        sx = (wx + 0.5) * scale + width / 2 + pan.x;
        sy = (wy + 0.5) * scale + height / 2 + pan.y;
      }

      this.ctx.fillStyle = CONFIG.STONE_COLORS[stone.color] || CONFIG.STONE_COLORS[0];
      this.ctx.strokeStyle = CONFIG.STONE_STROKE_COLORS[stone.color] || CONFIG.STONE_STROKE_COLORS[0];
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  screenToWorld(screenX, screenY) {
    const { width, height } = this.canvas;
    const { scale, pan, placementMode } = this.state;
    let wx, wy;

    if (placementMode === 'intersection') {
      wx = Math.round((screenX - width / 2 - pan.x) / scale);
      wy = Math.round((screenY - height / 2 - pan.y) / scale);
    } else {
      wx = Math.floor((screenX - width / 2 - pan.x) / scale);
      wy = Math.floor((screenY - height / 2 - pan.y) / scale);
    }

    return { x: wx, y: wy };
  }

  worldToScreen(worldX, worldY) {
    const { width, height } = this.canvas;
    const { scale, pan, placementMode } = this.state;
    let sx, sy;

    if (placementMode === 'intersection') {
      sx = worldX * scale + width / 2 + pan.x;
      sy = worldY * scale + height / 2 + pan.y;
    } else {
      sx = (worldX + 0.5) * scale + width / 2 + pan.x;
      sy = (worldY + 0.5) * scale + height / 2 + pan.y;
    }

    return { x: sx, y: sy };
  }

  /**
   * Draw expiration warning effects
   * - Red edge glow when room is in last hour
   * - Giant countdown overlay when in last 10 minutes
   */
  drawExpirationWarning() {
    const remainingTime = this.state.getRemainingTime();
    
    // null means room never expires (public room)
    if (remainingTime === null) {
      return;
    }

    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Draw red edge glow when in last hour
    if (remainingTime <= ONE_HOUR_MS) {
      // Calculate intensity based on remaining time (stronger as time decreases)
      const intensity = 1 - (remainingTime / ONE_HOUR_MS);
      const edgeWidth = 20 + intensity * 20; // 20-40px edge glow (reduced from 60-100)
      const alpha = 0.08 + intensity * 0.22; // 0.08-0.3 alpha (reduced)

      // Create gradient for each edge
      // Top edge
      const topGradient = ctx.createLinearGradient(0, 0, 0, edgeWidth);
      topGradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      topGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, width, edgeWidth);

      // Bottom edge
      const bottomGradient = ctx.createLinearGradient(0, height, 0, height - edgeWidth);
      bottomGradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      bottomGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, height - edgeWidth, width, edgeWidth);

      // Left edge
      const leftGradient = ctx.createLinearGradient(0, 0, edgeWidth, 0);
      leftGradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      leftGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = leftGradient;
      ctx.fillRect(0, 0, edgeWidth, height);

      // Right edge
      const rightGradient = ctx.createLinearGradient(width, 0, width - edgeWidth, 0);
      rightGradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      rightGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = rightGradient;
      ctx.fillRect(width - edgeWidth, 0, edgeWidth, height);
    }

    // Draw giant countdown overlay when in last 10 minutes
    if (remainingTime <= TEN_MINUTES_MS) {
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // Calculate font size to fill most of the screen
      const fontSize = Math.min(width, height) * 0.35;
      
      // Draw giant countdown text as watermark
      ctx.save();
      ctx.fillStyle = 'rgba(139, 0, 0, 0.15)'; // Semi-transparent dark red
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeStr, width / 2, height / 2);
      
      // Draw smaller label below
      ctx.font = `${fontSize * 0.12}px sans-serif`;
      ctx.fillStyle = 'rgba(139, 0, 0, 0.25)';
      ctx.fillText('房间即将关闭', width / 2, height / 2 + fontSize * 0.45);
      ctx.restore();
    }
  }
}
