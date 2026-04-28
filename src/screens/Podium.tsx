import { BIRD_SKINS } from '../types';
import type { PodiumEntry, Screen } from '../types';
import './screens.css';

interface Props {
  podium: PodiumEntry[];
  myId: string;
  onNavigate: (screen: Screen) => void;
  onBackToRoom: () => void;
  mode: 'solo' | 'multi';
}

const RANK_LABELS = ['', '🥇', '🥈', '🥉'];
const RANK_COLORS = ['', '#ffd700', '#c0c0c0', '#cd7f32'];
const PODIUM_HEIGHTS = [90, 60, 42]; // px — reduced to prevent overflow

export default function Podium({ podium, myId, onNavigate, onBackToRoom, mode }: Props) {
  const top3 = podium.slice(0, 3);
  // Reorder: 2nd left, 1st center, 3rd right
  const display = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="screen podium-screen">
      <div className="stars-bg" />

      <h2 className="podium-title">MISSION COMPLETE</h2>

      <div className="podium-stage">
        {display.map((entry) => {
          if (!entry) return null;
          const skin = BIRD_SKINS.find((s) => s.id === entry.skinId) ?? BIRD_SKINS[0];
          const isMe = entry.id === myId;
          const h = PODIUM_HEIGHTS[entry.rank - 1] ?? 30;
          const blockColor = RANK_COLORS[entry.rank] ?? '#555';
          return (
            <div key={entry.id} className={`podium-col ${isMe ? 'is-me' : ''}`}>
              {/* Info above the block */}
              <div className="podium-name" style={{ color: isMe ? skin.bodyColor : '#ccc' }}>
                {entry.name || 'Pilot'}{isMe ? ' (you)' : ''}
              </div>
              <div
                className="podium-orb"
                style={{ background: skin.bodyColor, boxShadow: `0 0 16px ${skin.glowColor}` }}
              />
              <div className="podium-rank-label" style={{ color: blockColor }}>
                {RANK_LABELS[entry.rank] ?? `#${entry.rank}`}
              </div>
              <div className="podium-score">{entry.score} pts</div>
              {/* Block at the bottom */}
              <div className="podium-block" style={{ height: h, background: blockColor }} />
            </div>
          );
        })}
      </div>

      {/* Full leaderboard for 4+ players */}
      {podium.length > 3 && (
        <div className="podium-list">
          {podium.slice(3).map((entry) => {
            const isMe = entry.id === myId;
            return (
              <div key={entry.id} className={`podium-row ${isMe ? 'is-me' : ''}`}>
                <span className="pr-rank">#{entry.rank}</span>
                <span className="pr-name">{entry.name || 'Pilot'}{isMe ? ' (you)' : ''}</span>
                <span className="pr-score">{entry.score}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="podium-actions">
        {mode === 'multi' ? (
          <button className="btn btn-primary" onClick={onBackToRoom}>
            ↩ BACK TO LOBBY
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => onNavigate('game')}>
            ↩ PLAY AGAIN
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => onNavigate('menu')}>
          ⌂ MAIN MENU
        </button>
      </div>
    </div>
  );
}
