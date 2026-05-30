import { useState, useEffect } from 'react';
import { socket, connectSocket, disconnectSocket } from './socket';
import LobbyScreen from './components/LobbyScreen';
import WaitingRoom from './components/WaitingRoom';
import GameRoom from './components/GameRoom';

export default function App() {
  const [screen, setScreen] = useState('lobby');   // 'lobby' | 'waiting' | 'game'
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [countdown, setCountdown] = useState(null); // seconds until market opens, or null
  const [preRoll, setPreRoll] = useState(null);     // seconds until dice start, or null

  useEffect(() => {
    connectSocket();

    socket.on('game:started', ({ room }) => {
      setRoom(room);
      setScreen('game');
    });

    socket.on('game:countdown', ({ remaining }) => {
      setCountdown(remaining);
    });

    socket.on('game:open', ({ room }) => {
      setRoom(prev => ({ ...(prev || {}), ...room }));
      setCountdown(null);
    });

    socket.on('game:preroll', ({ remaining }) => {
      setPreRoll(remaining);
    });

    socket.on('game:rolling', () => {
      setPreRoll(null);
    });

    socket.on('room:playerJoined', ({ players }) => {
      setRoom(prev => prev ? { ...prev, players } : prev);
    });

    socket.on('room:playerLeft', ({ players }) => {
      setRoom(prev => prev ? { ...prev, players } : prev);
    });

    socket.on('room:playersUpdated', ({ players }) => {
      setRoom(prev => prev ? { ...prev, players } : prev);
      setMe(prev => {
        if (!prev) return prev;
        return players.find(p => p.socketId === socket.id) || prev;
      });
    });

    socket.on('game:tick', ({ rollEvent, prices, players }) => {
      setRoom(prev => prev ? { ...prev, prices, players, history: [rollEvent, ...(prev.history || [])].slice(0, 20) } : prev);
      setMe(prev => {
        if (!prev) return prev;
        return players.find(p => p.socketId === socket.id) || prev;
      });
    });

    return () => disconnectSocket();
  }, []);

  function handleJoined(room) {
    const myPlayer = room.players.find(p => p.socketId === socket.id);
    setRoom(room);
    setMe(myPlayer);
    setScreen('waiting');
  }

  function handleLeave() {
    socket.emit('room:leave');
    setRoom(null);
    setMe(null);
    setCountdown(null);
    setPreRoll(null);
    setScreen('lobby');
  }

  if (screen === 'lobby') return <LobbyScreen onJoined={handleJoined} />;
  if (screen === 'waiting') return <WaitingRoom room={room} me={me} onLeave={handleLeave} />;
  if (screen === 'game') return <GameRoom room={room} me={me} countdown={countdown} preRoll={preRoll} onLeave={handleLeave} />;
}
