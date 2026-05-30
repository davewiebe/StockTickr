import { useState } from 'react';
import { socket } from '../socket';
import './WaitingRoom.css';

export default function WaitingRoom({ room, me, onLeave }) {
  const [error, setError] = useState('');
  const isHost = me?.isHost;

  function handleStart() {
    setError('');
    socket.emit('room:start', { roomCode: room.code }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  function copyCode() {
    navigator.clipboard?.writeText(room.code).catch(() => {});
  }

  return (
    <div className="waiting-root">
      <div className="waiting-top">
        <h2 className="waiting-title">Waiting Room</h2>
        <div className="room-code-block" onClick={copyCode} title="Tap to copy">
          <span className="room-code-label">Room Code</span>
          <span className="room-code">{room.code}</span>
          <span className="room-code-hint">tap to copy</span>
        </div>
      </div>

      <div className="card player-list">
        <h3 className="section-label">Players ({room.players.length}/6)</h3>
        <ul>
          {room.players.map(p => (
            <li key={p.socketId} className="player-row">
              <span className="player-name">{p.name}</span>
              {p.isHost && <span className="badge host">Host</span>}
              {p.socketId === socket.id && <span className="badge you">You</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="waiting-actions">
        {isHost ? (
          <>
            <p className="waiting-hint">Share the code above. Start when everyone is ready.</p>
            <button onClick={handleStart} disabled={room.players.length < 1}>
              Start Game
            </button>
          </>
        ) : (
          <p className="waiting-hint">Waiting for the host to start the game…</p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="leave-btn" onClick={onLeave}>Leave Room</button>
      </div>
    </div>
  );
}
