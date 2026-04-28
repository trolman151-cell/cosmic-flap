import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';
import {
  drawBackground, drawGround, drawPipes, drawBird,
  drawScore, drawOverlay, drawCountdown, drawGhostBird,
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
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const scrollRef    = useRef(0);
  const stateRef     = useRef<{
    players: Record<string, Player>;
    pipes: Pipe[];
    started: boolean;
    finished: boolean;
    countdown: number;
    myId: string;
    hostId: string;
  }>({ players: {}, pipes: [], started: false, finished: false, countdown: 3, myId: '', hostId: '' });

  const [waitMsg, setWaitMsg]   = useState('Connecting...');
  const [myId, setMyId]         = useState('');
  const [roomCode, setRoomCode] = useState(roomId);

  const skin = BIRD_SKINS.find((s) => s.id === skinId) ?? BIRD_SKINS[0];

  const handleFlap = useCallback(() => {
    socket.emit('player:flap');
  }, [socket]);

  useEffect(() => {
    socket.on('room:joined', ({ roomId: rid, playerId }) => {
      setMyId(playerId);
      setRoomCode(rid);
      stateRef.current.myId = playerId;
      setWaitMsg(`Room: ${rid}  •  Waiting for players...`);
    });

    socket.on('room:state', (data) => {
      stateRef.current.players   = data.players;
      stateRef.current.pipes     = data.pipes;
      stateRef.current.started   = data.started;
      stateRef.current.finished  = data.finished;
      stateRef.current.countdown = data.countdown;
      stateRef.current.hostId    = data.hostId ?? '';

      if (!data.started && !data.finished) {
        setWaitMsg(`Room: ${roomCode}  •  ${Object.keys(data.players).length} pilot(s) ready`);
      }

      if (data.finished && data.podium.length) {
        onGameOver(data.podium);
      }
    });

    socket.on('room:error', (msg) => setWaitMsg(`Error: ${msg}`));

    return () => {
      socket.off('room:joined');
      socket.off('room:state');
      socket.off('room:error');
    };
  }, [socket, roomCode, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function loop() {
      const s = stateRef.current;

      drawBackground(ctx, Date.now() / 16);
      drawPipes(ctx, s.pipes);
      drawGround(ctx, scrollRef.current);

      // Draw all players
      Object.entries(s.players).forEach(([id, p]) => {
        if (id === s.myId) {
          if (p.alive) scrollRef.current += 3;
          drawBird(ctx, p.y, p.velocity, skin, Date.now() / 16, p.alive);
        } else {
          drawGhostBird(ctx, p.y, p.velocity, p.skinId, p.name || 'Pilot', Date.now() / 16, p.alive);
        }
      });

      // Score of local player
      const me = s.players[s.myId];
      if (me) drawScore(ctx, me.score);

      if (!s.started && s.countdown > 0) {
        drawCountdown(ctx, s.countdown);
      }

      if (!s.started && s.countdown === 0 && Object.keys(s.players).length === 0) {
        drawOverlay(ctx, 'WAITING...', waitMsg);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [skin, waitMsg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); handleFlap(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleFlap]);

  const s = stateRef.current;

  return (
    <div className="screen game-screen">
      <div className="mp-hud">
        <button className="back-btn-inline" onClick={() => { cancelAnimationFrame(rafRef.current); socket.disconnect(); onNavigate('lobby'); }}>
          ✕
        </button>
        <span className="mp-room-tag">#{roomCode}</span>
        <span className="mp-players-tag">
          {Object.values(s.players).filter((p) => p.alive).length} alive
        </span>
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
      {!s.started && (
        <div className="mp-wait-overlay">
          <p>{waitMsg}</p>
          {myId === s.hostId ? (
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
