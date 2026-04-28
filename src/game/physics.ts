import {
  GRAVITY, FLAP_STRENGTH, MAX_FALL_VEL,
  BIRD_X, BIRD_RADIUS, PIPE_WIDTH, PIPE_GAP,
  GROUND_Y, PIPE_SPEED, PIPE_INTERVAL, PIPE_SPAWN_X,
  PIPE_MIN_TOP, PIPE_MAX_TOP,
} from './constants';
import type { Pipe, GameState } from '../types';

export function makeInitialState(): GameState {
  return {
    bird: { y: 300, velocity: 0 },
    pipes: [],
    score: 0,
    alive: true,
    started: false,
    frame: 0,
  };
}

export function flap(state: GameState): GameState {
  if (!state.alive) return state;
  return {
    ...state,
    started: true,
    bird: { ...state.bird, velocity: FLAP_STRENGTH },
  };
}

function spawnPipe(_frame: number): Pipe {
  const topHeight = PIPE_MIN_TOP + Math.random() * (PIPE_MAX_TOP - PIPE_MIN_TOP);
  return {
    x: PIPE_SPAWN_X,
    topHeight,
    bottomY: topHeight + PIPE_GAP,
    scored: false,
  };
}

export function stepFrame(state: GameState): GameState {
  if (!state.alive || !state.started) {
    return { ...state, frame: state.frame + 1 };
  }

  const frame = state.frame + 1;

  // Bird physics
  let velocity = Math.min(state.bird.velocity + GRAVITY, MAX_FALL_VEL);
  let y = state.bird.y + velocity;

  // Pipes
  let pipes: Pipe[] = state.pipes
    .map((p) => ({ ...p, x: p.x - PIPE_SPEED }))
    .filter((p) => p.x + PIPE_WIDTH > -10);

  // Spawn new pipe
  if (frame % PIPE_INTERVAL === 0) {
    pipes = [...pipes, spawnPipe(frame)];
  }

  // Scoring
  let score = state.score;
  pipes = pipes.map((p) => {
    if (!p.scored && p.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
      score += 1;
      return { ...p, scored: true };
    }
    return p;
  });

  // Collision: ground / ceiling
  let alive = true;
  if (y + BIRD_RADIUS >= GROUND_Y || y - BIRD_RADIUS <= 0) {
    alive = false;
  }

  // Collision: pipes
  if (alive) {
    for (const p of pipes) {
      const birdLeft  = BIRD_X - BIRD_RADIUS + 4;
      const birdRight = BIRD_X + BIRD_RADIUS - 4;
      const birdTop   = y - BIRD_RADIUS + 4;
      const birdBot   = y + BIRD_RADIUS - 4;
      const inX = birdRight > p.x + 4 && birdLeft < p.x + PIPE_WIDTH - 4;
      const inTop = birdTop < p.topHeight;
      const inBot = birdBot > p.bottomY;
      if (inX && (inTop || inBot)) {
        alive = false;
        break;
      }
    }
  }

  if (!alive) velocity = 0;

  return {
    bird: { y, velocity },
    pipes,
    score,
    alive,
    started: true,
    frame,
  };
}
