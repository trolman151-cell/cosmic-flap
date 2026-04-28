import React from 'react';
import { BIRD_SKINS } from '../types';
import type { Screen } from '../types';
import './screens.css';

interface Props {
  selectedSkinId: string;
  onSelectSkin: (id: string) => void;
  onNavigate: (screen: Screen) => void;
}

export default function Customize({ selectedSkinId, onSelectSkin, onNavigate }: Props) {
  return (
    <div className="screen customize-screen">
      <div className="stars-bg" />

      <button className="back-btn" onClick={() => onNavigate('menu')}>← BACK</button>

      <h2 className="section-title">PILOT SKIN</h2>
      <p className="section-sub">Choose your cosmic identity</p>

      <div className="skin-grid">
        {BIRD_SKINS.map((skin) => {
          const active = skin.id === selectedSkinId;
          return (
            <button
              key={skin.id}
              className={`skin-card ${active ? 'active' : ''}`}
              onClick={() => onSelectSkin(skin.id)}
              style={{ '--skin-color': skin.bodyColor, '--glow-color': skin.glowColor } as React.CSSProperties}
            >
              <div className="skin-orb" />
              <span className="skin-label">{skin.label}</span>
              {active && <span className="skin-check">✓</span>}
            </button>
          );
        })}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 32 }} onClick={() => onNavigate('menu')}>
        CONFIRM SELECTION
      </button>
    </div>
  );
}
