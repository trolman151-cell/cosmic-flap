import type { Screen } from '../types';
import './screens.css';

interface Props {
  onNavigate: (screen: Screen) => void;
  playerName: string;
  setPlayerName: (n: string) => void;
}

export default function MainMenu({ onNavigate, playerName, setPlayerName }: Props) {
  return (
    <div className="screen menu-screen">
      <div className="stars-bg" />

      <div className="menu-logo">
        <span className="logo-icon">◎</span>
        <h1 className="logo-title">COSMIC<br />FLAP</h1>
        <p className="logo-sub">Navigate the void</p>
      </div>

      <div className="menu-name-row">
        <label className="input-label">PILOT NAME</label>
        <input
          className="name-input"
          maxLength={14}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter name..."
          spellCheck={false}
        />
      </div>

      <div className="menu-buttons">
        <button className="btn btn-primary" onClick={() => onNavigate('game')}>
          ▶ SOLO FLIGHT
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('lobby')}>
          ⊕ MULTIPLAYER
        </button>
        <button className="btn btn-ghost" onClick={() => onNavigate('customize')}>
          ◈ CUSTOMIZE
        </button>
      </div>

      <p className="menu-footer">Tap / Space / Click to flap</p>
    </div>
  );
}
