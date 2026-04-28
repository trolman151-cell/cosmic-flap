import { useState } from 'react';
import type { Screen } from '../types';
import './screens.css';

interface Props {
  onNavigate: (screen: Screen) => void;
  onJoin: (roomId: string, create: boolean) => void;
  playerName: string;
}

function randomRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function Lobby({ onNavigate, onJoin, playerName }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError]       = useState('');

  function handleCreate() {
    const id = randomRoomId();
    onJoin(id, true);
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { setError('Enter a valid room code'); return; }
    onJoin(code, false);
  }

  return (
    <div className="screen lobby-screen">
      <div className="stars-bg" />
      <button className="back-btn" onClick={() => onNavigate('menu')}>← BACK</button>

      <h2 className="section-title">MULTIPLAYER</h2>
      <p className="section-sub">Last pilot alive wins</p>

      <div className="lobby-card">
        <h3>Create a Room</h3>
        <p className="lobby-hint">Share the code with friends — up to 8 pilots</p>
        <button className="btn btn-primary" onClick={handleCreate}>
          ⊕ CREATE ROOM
        </button>
      </div>

      <div className="lobby-divider">— OR JOIN —</div>

      <div className="lobby-card">
        <h3>Join a Room</h3>
        <input
          className="name-input"
          placeholder="ENTER CODE..."
          maxLength={8}
          value={joinCode}
          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
          spellCheck={false}
        />
        {error && <p className="lobby-error">{error}</p>}
        <button className="btn btn-secondary" onClick={handleJoin}>
          → JOIN ROOM
        </button>
      </div>

      <p className="lobby-name-tag">Playing as: <strong>{playerName || 'Pilot'}</strong></p>
    </div>
  );
}
