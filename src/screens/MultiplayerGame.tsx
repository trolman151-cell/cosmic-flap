import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, FLAP_STRENGTH } from '../game/constants';
import {
  drawBackground, drawGround, drawPipes, drawBird,
  drawScore, drawGhostBird,
} from '../game/renderer';
import { BIRD_SKINS } from '../types';
import type { Screen, PodiumEntry, Player, Pipe } from '../types';
import './screens.css';

// How often the server sends state (ms) — used for extrapolation
const SERVER_TICK_MS = 1000 / 30;

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

  // Latest authoritative state from server — written by socket events, read by RAF
  const gameRef = useRef<{
    players: Record<string, Player>;
    pipes: Pipe[];
    myId: string;
    started: boolean;
    lastUpdate: number; // timestamp of last server state packet
  }>({
    players: {},
    pipes: [],
    myId: socket.id ?? '',  // initialise immediately — don't wait for room:joined
    started: false,
    lastUpdate: Date.now(),
  });

  // React state drives overlays/HUD re-renders
  // Seed myId from socket.id so host check works on remount (room:joined won't re-fire)
  const [myId,       setMyId]       = useState(socket.id ?? '');
  const [hostId,     setHostId]     = useState('');
  const [isStarted,  setIsStarted]  = useState(false);
  const [aliveCount, setAliveCount] = useState(0);
  const [countdown,  setCountdown]  = useState(0);
  const [roomCode,   setRoomCode]   = useState(roomId);
  const [waitMsg,    setWaitMsg]    = useState('Connecting...');

  const skin = BIRD_SKINS.find((s) => s.id === skinId) ?? BIRD_SKINS[0];

  // Flap: send to server AND apply locally immediately for zero perceived input lag
  const handleFlap = useCallback(() => {
    socket.emit('player:flap');
    const me = gameRef.current.players[gameRef.current.myId];
    if (me?.alive && gameRef.current.started) me.velocity = FLAP_STRENGTH;
  }, [socket]);

  // ── Socket events ──────────────────────────────────────
  useEffect(() => {
    // room:joined only fires on first join — not on remount after reset
    socket.on('room:joined', ({ roomId: rid, playerId }) => {
      gameRef.current.myId = playerId;
      setMyId(playerId);
      setRoomCode(rid);
      setWaitMsg(`Room: ${rid}  •  Waiting for players...`);
    });

    socket.on('room:state', (data) => {
      gameRef.current.players    = data.players;
      gameRef.current.pipes      = data.pipes;
      gameRef.current.started    = data.started;
      gameRef.current.lastUpdate = Date.now();

      // If myId isn't set yet (remount case), pull it from socket
      if (!gameRef.current.myId && socket.id) {
        gameRef.current.myId = socket.id;
        setMyId(socket.id);
      }

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
  }, [socket, roomCode, onGameOver]);

  // ── Canvas render loop ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    function loop() {
      frame++;
      const { players, pipes, myId: id, lastUpdate } = gameRef.current;

      // Fraction of a server tick elapsed since last update (for extrapolation)
      const dt = Math.min((Date.now() - lastUpdate) / SERVER_TICK_MS, 2);

      drawBackground(ctx, frame);
      drawPipes(ctx, pipes);

      const me = players[id];
      if (me?.alive) scrollRef.current += 3;
      drawGround(ctx, scrollRef.current);

      // Draw remote players (behind local)
      Object.entries(players).forEach(([pid, p]) => {
        if (pid === id) return;
        // Extrapolate position: y + velocity*dt (smooth out 30fps → 60fps)
        const eY = p.alive ? p.y + p.velocity * dt : p.y;
        drawGhostBird(ctx, eY, p.velocity, p.skinId, p.name || 'Pilot', frame, p.alive);
      });

      // Draw local player (extrapolate with gravity for accurate arc)
      if (me) {
        const eY = me.alive
          ? me.y + me.velocity * dt + 0.5 * GRAVITY * dt * dt
          : me.y;
        drawBird(ctx, eY, me.velocity, skin, frame, me.alive);
        drawScore(ctx, me.score);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [skin]);

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
      <div className="mp-hud">
        <button
          className="back-btn-inline"
          onClick={() => { cancelAnimationFrame(rafRef.current); socket.disconnect(); onNavigate('lobby'); }}
        >
          ✕
        </button>
        <span className="mp-room-tag">#{roomCode}</span>
        {isStarted && <span className="mp-players-tag">{aliveCount} alive</span>}
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

      {/* Overlay disappears the moment isStarted flips to true */}
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
