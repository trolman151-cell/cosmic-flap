import {
  CANVAS_WIDTH, CANVAS_HEIGHT, BIRD_X, BIRD_RADIUS,
  PIPE_WIDTH, PIPE_GAP, GROUND_Y, GROUND_HEIGHT, STAR_COUNT,
} from './constants';
import type { Pipe, BirdSkin } from '../types';
import { BIRD_SKINS } from '../types';

// Pre-generate stable star positions
const STARS: { x: number; y: number; r: number; a: number }[] = [];
for (let i = 0; i < STAR_COUNT; i++) {
  STARS.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * GROUND_Y,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random() * 0.6 + 0.4,
  });
}

function drawBackground(ctx: CanvasRenderingContext2D, frame: number) {
  // Deep space gradient
  const bg = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  bg.addColorStop(0, '#060818');
  bg.addColorStop(1, '#0d1b4b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

  // Stars with gentle twinkle
  STARS.forEach((s) => {
    const twinkle = 0.5 + 0.5 * Math.sin(frame * 0.05 + s.x);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a * twinkle})`;
    ctx.fill();
  });
}

function drawGround(ctx: CanvasRenderingContext2D, scrollX: number) {
  // Ground base
  ctx.fillStyle = '#1a0a3d';
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);

  // Ground top glow line
  ctx.strokeStyle = '#7b2fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.stroke();

  // Scrolling grid lines on ground
  ctx.strokeStyle = 'rgba(123,47,255,0.3)';
  ctx.lineWidth = 1;
  const gridSpacing = 40;
  const offset = scrollX % gridSpacing;
  for (let x = -offset; x < CANVAS_WIDTH; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
}

function drawPipes(ctx: CanvasRenderingContext2D, pipes: Pipe[]) {
  pipes.forEach((pipe) => {
    const bottomTop = pipe.topHeight + PIPE_GAP;

    // Crystal pillar gradient
    const makeGrad = (_yStart: number, _yEnd: number) => {
      const g = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      g.addColorStop(0, '#ff6b00');
      g.addColorStop(0.4, '#ffaa00');
      g.addColorStop(1, '#cc3300');
      return g;
    };

    // Top pipe
    ctx.fillStyle = makeGrad(0, pipe.topHeight);
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

    // Top pipe cap
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(pipe.x - 4, pipe.topHeight - 16, PIPE_WIDTH + 8, 16);

    // Bottom pipe
    ctx.fillStyle = makeGrad(bottomTop, GROUND_Y);
    ctx.fillRect(pipe.x, bottomTop, PIPE_WIDTH, GROUND_Y - bottomTop);

    // Bottom pipe cap
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(pipe.x - 4, bottomTop, PIPE_WIDTH + 8, 16);

    // Glow edges
    ctx.strokeStyle = 'rgba(255,170,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.strokeRect(pipe.x, bottomTop, PIPE_WIDTH, GROUND_Y - bottomTop);
  });
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  y: number,
  velocity: number,
  skin: BirdSkin,
  frame: number,
  alive: boolean
) {
  const cx = BIRD_X;
  const cy = y;
  const tilt = Math.min(Math.max(velocity * 3.5, -30), 90);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((tilt * Math.PI) / 180);

  if (alive) {
    // Outer glow
    const glow = ctx.createRadialGradient(0, 0, BIRD_RADIUS * 0.5, 0, 0, BIRD_RADIUS * 2.5);
    glow.addColorStop(0, skin.glowColor + '88');
    glow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }

  // Core body
  const pulse = alive ? 1 + 0.07 * Math.sin(frame * 0.15) : 0.7;
  const body = ctx.createRadialGradient(-3, -3, 2, 0, 0, BIRD_RADIUS * pulse);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.3, skin.bodyColor);
  body.addColorStop(1, skin.glowColor);
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_RADIUS * pulse, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  // Eye
  if (alive) {
    ctx.beginPath();
    ctx.arc(5, -3, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -2, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
  }

  ctx.restore();
}

function drawScore(ctx: CanvasRenderingContext2D, score: number) {
  ctx.save();
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(String(score), CANVAS_WIDTH / 2 + 2, 72);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(score), CANVAS_WIDTH / 2, 70);
  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, text: string, sub: string) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,24,0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.font = 'bold 38px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = '18px "Courier New", monospace';
  ctx.fillStyle = '#aaaacc';
  ctx.fillText(sub, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  ctx.restore();
}

function drawCountdown(ctx: CanvasRenderingContext2D, n: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,24,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.font = 'bold 100px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcc00';
  ctx.fillText(n > 0 ? String(n) : 'GO!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  ctx.restore();
}

// Draw ghost birds for multiplayer
function drawGhostBird(
  ctx: CanvasRenderingContext2D,
  y: number,
  velocity: number,
  skinId: string,
  name: string,
  frame: number,
  alive: boolean
) {
  const skin = BIRD_SKINS.find((s) => s.id === skinId) ?? BIRD_SKINS[0];
  drawBird(ctx, y, velocity, skin, frame, alive);

  // Name tag
  ctx.save();
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = alive ? skin.bodyColor : '#555';
  ctx.fillText(name, BIRD_X, y - BIRD_RADIUS - 6);
  ctx.restore();
}

export {
  drawBackground,
  drawGround,
  drawPipes,
  drawBird,
  drawScore,
  drawOverlay,
  drawCountdown,
  drawGhostBird,
};
