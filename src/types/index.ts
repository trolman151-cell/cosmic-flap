export type Screen = 'menu' | 'customize' | 'game' | 'lobby' | 'multiplayer' | 'podium';

export interface BirdSkin {
  id: string;
  label: string;
  bodyColor: string;
  glowColor: string;
  trailColor: string;
}

export const BIRD_SKINS: BirdSkin[] = [
  { id: 'cyan',   label: 'Nebula',   bodyColor: '#00f5ff', glowColor: '#00a8ff', trailColor: '#00f5ff44' },
  { id: 'pink',   label: 'Nova',     bodyColor: '#ff3cac', glowColor: '#ff0080', trailColor: '#ff3cac44' },
  { id: 'green',  label: 'Pulsar',   bodyColor: '#39ff14', glowColor: '#00cc00', trailColor: '#39ff1444' },
  { id: 'orange', label: 'Comet',    bodyColor: '#ff9500', glowColor: '#ff6000', trailColor: '#ff950044' },
  { id: 'white',  label: 'Quasar',   bodyColor: '#ffffff', glowColor: '#c0c0ff', trailColor: '#ffffff44' },
  { id: 'purple', label: 'Void',     bodyColor: '#bf5fff', glowColor: '#9000ff', trailColor: '#bf5fff44' },
];

export interface Player {
  id: string;
  name: string;
  skinId: string;
  y: number;
  velocity: number;
  alive: boolean;
  score: number;
  rank?: number;
}

export interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  scored: boolean;
}

export interface GameState {
  bird: { y: number; velocity: number };
  pipes: Pipe[];
  score: number;
  alive: boolean;
  started: boolean;
  frame: number;
}

export interface PodiumEntry {
  id: string;
  name: string;
  skinId: string;
  score: number;
  rank: number;
}

export interface MultiplayerState {
  roomId: string;
  players: Record<string, Player>;
  pipes: Pipe[];
  started: boolean;
  finished: boolean;
  podium: PodiumEntry[];
  countdown: number;
}
