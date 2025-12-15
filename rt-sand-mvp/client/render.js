// Rendering logic for InfiniteGo
import { CONFIG } from './config.js';

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
  }

  drawGrid() {
    const { width, height } = this.canvas;
    const { scale, pan } = this.state;
    const step = scale;

    this.ctx.strokeStyle = '#333';
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
}
