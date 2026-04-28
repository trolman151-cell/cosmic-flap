import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';
import { makeInitialState, flap, stepFrame } from '../game/physics';
import {
  drawBackground, drawGround, drawPipes, drawBird, drawScore, drawOverlay,
} from '../game/renderer';
import { BIRD_SKINS } from '../types';
import type { GameState, PodiumEntry, Screen } from '../types';
import './screens.css';

interface Props {
  skinId: string;
  playerName: string;
  onGameOver: (entry: PodiumEntry) => void;
  onNavigate: (screen: Screen) => void;
}

export default function GameScreen({ skinId, playerName, onGameOver, onNavigate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<GameState>(makeInitialState());
  const rafRef    = useRef<number>(0);
  const scrollRef = useRef(0);
  const skin = BIRD_SKINS.find((s) => s.id === skinId) ?? BIRD_SKINS[0];

  const handleInput = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) {
      // Restart
      stateRef.current = makeInitialState();
      return;
    }
    stateRef.current = flap(s);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let gameOverFired = false;

    function loop() {
      const state = stateRef.current;
      stateRef.current = stepFrame(state);
      const s = stateRef.current;

      if (s.alive) scrollRef.current += 3;

      // Render
      drawBackground(ctx, s.frame);
      drawPipes(ctx, s.pipes);
      drawGround(ctx, scrollRef.current);
      drawBird(ctx, s.bird.y, s.bird.velocity, skin, s.frame, s.alive);
      drawScore(ctx, s.score);

      if (!s.started) {
        drawOverlay(ctx, 'TAP TO FLAP', 'avoid the crystals');
      }

      if (!s.alive) {
        drawOverlay(ctx, 'GAME OVER', `Score: ${s.score}  •  tap to retry`);
        if (!gameOverFired) {
          gameOverFired = true;
          onGameOver({
            id: 'solo',
            name: playerName || 'Pilot',
            skinId,
            score: s.score,
            rank: 1,
          });
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [skin, skinId, playerName, onGameOver]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInput();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInput]);

  return (
    <div className="screen game-screen">
      <button className="back-btn" onClick={() => { cancelAnimationFrame(rafRef.current); onNavigate('menu'); }}>
        ← MENU
      </button>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
        onClick={handleInput}
        onTouchStart={(e) => { e.preventDefault(); handleInput(); }}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
