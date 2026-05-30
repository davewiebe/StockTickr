import { useState } from 'react';
import { socket } from '../socket';
import './LobbyScreen.css';

export default function LobbyScreen({ onJoined }) {
  const [tab, setTab] = useState('create');         // 'create' | 'join'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    socket.emit('room:create', { playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.error) return setError(res.error);
      onJoined(res.room);
    });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    if (code.trim().length !== 4) return setError('Enter a 4-character room code');
    setLoading(true);
    setError('');
    socket.emit('room:join', { roomCode: code.trim(), playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.error) return setError(res.error);
      onJoined(res.room);
    });
  }

  return (
    <div className="lobby-root">
      <header className="lobby-header">
        <h1 className="lobby-title">StockTickr</h1>
        <p className="lobby-sub">The classic stock market board game — live multiplayer</p>
      </header>

      <div className="lobby-card card">
        <div className="lobby-tabs">
          <button
            className={`tab-btn${tab === 'create' ? ' active' : ''}`}
            onClick={() => { setTab('create'); setError(''); }}
          >
            Create Room
          </button>
          <button
            className={`tab-btn${tab === 'join' ? ' active' : ''}`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Join Room
          </button>
        </div>

        <form onSubmit={tab === 'create' ? handleCreate : handleJoin} className="lobby-form">
          <label className="field-label">Your Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Warren B."
            maxLength={20}
            autoFocus
          />

          {tab === 'join' && (
            <>
              <label className="field-label" style={{ marginTop: '1rem' }}>Room Code</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD"
                maxLength={4}
                className="code-input"
              />
            </>
          )}

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading} style={{ marginTop: '1.5rem', width: '100%' }}>
            {loading ? 'Connecting…' : tab === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </form>
      </div>

      <footer className="lobby-footer">Up to 32 players · Rolls every 5 seconds</footer>
    </div>
  );
}
