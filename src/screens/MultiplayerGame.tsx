import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';
import {
  drawBackground, drawGround, drawPipes, drawBird,
  drawScore, drawGhostBird,
} from '../game/renderer';
import { BIRD_SKINS } from '../types';
import type { Screen, PodiumEntry, Player, Pipe } from '../types';
import './screens.css';

interface Props {
  socket: Socket;
  roomId: string;
  skinId: string;
  playerName: string;
  onGameOver: (podium: PodiumEntry[]) => void;
  onNavigate: (screen: Screen) => void;
}

export default function MultiplayerGame({
  socket, roomId, skinId, playerName: _playerName, onGameOver, onNavigate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const scrollRef = useRef(0);

  // Ref holds latest server state — read inside RAF loop (no re-render cost)
  const gameRef = useRef<{
    players: Record<string, Player>;
    pipes: Pipe[];
    myId: string;
  }>({ players: {}, pipes: [], myId: '' });

  // React state drives overlay / HUD re-renders
  const [myId,      setMyId]      = useState('');
  const [hostId,    setHostId]    = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [aliveCount, setAliveCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [roomCode,  setRoomCode]  = useState(roomId);
  const [waitMsg,   setWaitMsg]   = useState('Connecting...');

  const skin = BIRD_SKINS.find((s) => s.id === skinId) ?? BIRD_SKINS[0];

  const handleFlap = useCallback(() => {
    socket.emit('player:flap');
  }, [socket]);

  // ── Socket events ──────────────────────────────────────
  useEffect(() => {
    socket.on('room:joined', ({ roomId: rid, playerId }) => {
      setMyId(playerId);
      setRoomCode(rid);
      gameRef.current.myId = playerId;
      setWaitMsg(`Room: ${rid}  •  Waiting for players...`);
    });

    socket.on('room:state', (data) => {
      // Update the ref used by the canvas loop
      gameRef.current.players = data.players;
      gameRef.current.pipes   = data.pipes;

      // Update React state to trigger UI re-renders
      const alive = Object.values(data.players as Record<string, Player>)
        .filter((p) => p.alive).length;
      setAliveCount(alive);
      setIsStarted(data.started);
      setHostId(data.hostId ?? '');
      setCountdown(data.countdown ?? 0);

      if (!data.started && !data.finished) {
        const count = Object.keys(data.players).length;
        setWaitMsg(`Room: ${data.roomId ?? roomCode}  •  ${count} pilot(s) ready`);
      }

      if (data.finished && data.podium?.length) {
        onGameOver(data.podium);
      }
    });

    socket.on('room:error', (msg: string) => setWaitMsg(`Error: ${msg}`));

    return () => {
      socket.off('room:joined');
      socket.off('room:state');
      socket.off('room:error');
    };
  }, [socket, onGameOver]);

  // ── Canvas render loop (runs once, reads ref) ──────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    function loop() {
      frame++;
      const { players, pipes, myId: id } = gameRef.current;

      drawBackground(ctx, frame);
      drawPipes(ctx, pipes);

      const me = players[id];
      if (me?.alive) scrollRef.current += 3;
      drawGround(ctx, scrollRef.current);

      // Draw remote players first (behind local player)
      Object.entries(players).forEach(([pid, p]) => {
        if (pid !== id) {
          drawGhostBird(ctx, p.y, p.velocity, p.skinId, p.name || 'Pilot', frame, p.alive);
        }
      });

      // Draw local player on top
      if (me) {
        drawBird(ctx, me.y, me.velocity, skin, frame, me.alive);
        drawScore(ctx, me.score);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [skin]); // only re-create loop if skin changes

  // ── Keyboard ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleFlap(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleFlap]);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="screen game-screen">
      {/* HUD — uses React state so it updates live */}
      <div className="mp-hud">
        <button
          className="back-btn-inline"
          onClick={() => { cancelAnimationFrame(rafRef.current); socket.disconnect(); onNavigate('lobby'); }}
        >
          ✕
        </button>
        <span className="mp-room-tag">#{roomCode}</span>
        {isStarted && (
          <span className="mp-players-tag">{aliveCount} alive</span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
        onClick={handleFlap}
        onTouchStart={(e) => { e.preventDefault(); handleFlap(); }}
        style={{ touchAction: 'none' }}
      />

      {/* Waiting overlay — disappears as soon as server sends started:true */}
      {!isStarted && countdown === 0 && (
        <div className="mp-wait-overlay">
          <p>{waitMsg}</p>
          {myId === hostId ? (
            <button className="btn btn-primary" onClick={() => socket.emit('room:start')}>
              ▶ START GAME
            </button>
          ) : (
            <p className="mp-waiting-hint">Waiting for host to start...</p>
          )}
        </div>
      )}
    </div>
  );
}
