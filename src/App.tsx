import { useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import MainMenu from './screens/MainMenu';
import Customize from './screens/Customize';
import GameScreen from './screens/GameScreen';
import Lobby from './screens/Lobby';
import MultiplayerGame from './screens/MultiplayerGame';
import Podium from './screens/Podium';
import type { Screen, PodiumEntry } from './types';

// In production the server serves this page, so connect to same origin.
// In dev the Vite server and socket server run on different ports.
const SERVER_URL = import.meta.env.PROD ? undefined : 'http://localhost:3001';

export default function App() {
  const [screen, setScreen]         = useState<Screen>('menu');
  const [playerName, setPlayerName] = useState('');
  const [skinId, setSkinId]         = useState('cyan');
  const [podiumData, setPodiumData] = useState<PodiumEntry[]>([]);
  const [podiumMode, setPodiumMode] = useState<'solo' | 'multi'>('solo');
  const [myId, setMyId]             = useState('solo');
  const [roomId, setRoomId]         = useState('');
  const socketRef                   = useRef<Socket | null>(null);

  const navigate = useCallback((s: Screen) => setScreen(s), []);

  const handleSoloOver = useCallback((_entry: PodiumEntry) => {
    // Game overlay handles retry; no auto-nav
  }, []);

  const handleMultiOver = useCallback((podium: PodiumEntry[]) => {
    setPodiumData(podium);
    setPodiumMode('multi');
    const myEntry = podium.find((p) => p.id === socketRef.current?.id);
    setMyId(myEntry?.id ?? podium[0]?.id ?? '');
    setScreen('podium');
  }, []);

  const handleBackToRoom = useCallback(() => {
    // Reset the room on the server and go back to the multiplayer waiting screen
    socketRef.current?.emit('room:reset');
    setScreen('multiplayer');
  }, []);

  const handleJoin = useCallback((rid: string, _create: boolean) => {
    if (socketRef.current) { socketRef.current.disconnect(); }
    const sock = SERVER_URL
      ? io(SERVER_URL, { transports: ['websocket'] })
      : io({ transports: ['websocket'] });
    socketRef.current = sock;

    sock.on('connect', () => {
      sock.emit('room:join', {
        roomId: rid,
        name: playerName || 'Pilot',
        skinId,
      });
      setRoomId(rid);
      setMyId(sock.id ?? '');
      setScreen('multiplayer');
    });
  }, [playerName, skinId]);

  return (
    <>
      {screen === 'menu' && (
        <MainMenu
          onNavigate={navigate}
          playerName={playerName}
          setPlayerName={setPlayerName}
        />
      )}
      {screen === 'customize' && (
        <Customize
          selectedSkinId={skinId}
          onSelectSkin={setSkinId}
          onNavigate={navigate}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          skinId={skinId}
          playerName={playerName}
          onGameOver={handleSoloOver}
          onNavigate={navigate}
        />
      )}
      {screen === 'lobby' && (
        <Lobby
          onNavigate={navigate}
          onJoin={handleJoin}
          playerName={playerName}
        />
      )}
      {screen === 'multiplayer' && socketRef.current && (
        <MultiplayerGame
          socket={socketRef.current}
          roomId={roomId}
          skinId={skinId}
          playerName={playerName}
          onGameOver={handleMultiOver}
          onNavigate={navigate}
        />
      )}
      {screen === 'podium' && (
        <Podium
          podium={podiumData}
          myId={myId}
          onNavigate={navigate}
          onBackToRoom={handleBackToRoom}
          mode={podiumMode}
        />
      )}
    </>
  );
}
