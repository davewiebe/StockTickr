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
  const [endsAt, setEndsAt] = useState(null);       // epoch ms the game ends, or null
  const [result, setResult] = useState(null);       // { standings, winner } when game ends
  const [callout, setCallout] = useState(null);     // { text, id } latest witty callout
  const [priceHistory, setPriceHistory] = useState([]); // [{prices}] snapshot per roll, index = time

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
      // Seed the chart with the opening prices as time 0.
      setPriceHistory(room?.prices ? [{ ...room.prices }] : []);
    });

    socket.on('game:preroll', ({ remaining }) => {
      setPreRoll(remaining);
    });

    socket.on('game:rolling', ({ endsAt }) => {
      setPreRoll(null);
      setEndsAt(endsAt ?? null);
    });

    socket.on('room:settingsUpdated', ({ settings }) => {
      setRoom(prev => prev ? { ...prev, settings } : prev);
    });

    socket.on('game:ended', ({ standings, winner }) => {
      setResult({ standings, winner });
      setEndsAt(null);
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
      setRoom(prev => prev ? { ...prev, prices, players, history: [rollEvent, ...(prev.history || [])].slice(0, 50) } : prev);
      setMe(prev => {
        if (!prev) return prev;
        return players.find(p => p.socketId === socket.id) || prev;
      });
      if (rollEvent?.callout) setCallout({ text: rollEvent.callout, id: Date.now() });
      if (prices) setPriceHistory(prev => [...prev, { ...prices }]);
    });

    socket.on('game:trade', ({ entry }) => {
      setRoom(prev => prev ? { ...prev, history: [entry, ...(prev.history || [])].slice(0, 50) } : prev);
    });

    socket.on('game:callout', ({ text }) => {
      if (text) setCallout({ text, id: Date.now() });
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
    setEndsAt(null);
    setResult(null);
    setCallout(null);
    setPriceHistory([]);
    setScreen('lobby');
  }

  if (screen === 'lobby') return <LobbyScreen onJoined={handleJoined} />;
  if (screen === 'waiting') return <WaitingRoom room={room} me={me} onLeave={handleLeave} />;
  if (screen === 'game') return (
    <GameRoom
      room={room} me={me}
      countdown={countdown} preRoll={preRoll}
      endsAt={endsAt} result={result} callout={callout}
      priceHistory={priceHistory}
      onLeave={handleLeave}
    />
  );
}
