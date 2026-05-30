import { useState } from 'react';
import { socket } from '../socket';
import './WaitingRoom.css';

const DURATION_MIN = 1, DURATION_MAX = 60;
const ROLL_MIN = 1, ROLL_MAX = 60;

export default function WaitingRoom({ room, me, onLeave }) {
  const [error, setError] = useState('');
  const isHost = me?.isHost;

  const settings = room.settings || { durationMinutes: 5, rollIntervalSeconds: 5 };

  function changeSetting(key, value, min, max) {
    const v = Math.min(max, Math.max(min, value));
    socket.emit('room:updateSettings', { roomCode: room.code, settings: { [key]: v } });
  }

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

      <div className="card settings-card">
        <h3 className="section-label">Game Options</h3>
        <Stepper
          label="Time limit"
          value={settings.durationMinutes}
          unit="min"
          min={DURATION_MIN}
          max={DURATION_MAX}
          disabled={!isHost}
          onChange={(v) => changeSetting('durationMinutes', v, DURATION_MIN, DURATION_MAX)}
        />
        <Stepper
          label="Roll every"
          value={settings.rollIntervalSeconds}
          unit="sec"
          min={ROLL_MIN}
          max={ROLL_MAX}
          disabled={!isHost}
          onChange={(v) => changeSetting('rollIntervalSeconds', v, ROLL_MIN, ROLL_MAX)}
        />
        {!isHost && <p className="settings-note">Only the host can change these.</p>}
      </div>

      <div className="card player-list">
        <h3 className="section-label">Players ({room.players.length}/32)</h3>
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

function Stepper({ label, value, unit, min, max, disabled, onChange }) {
  return (
    <div className="stepper-row">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          type="button"
          className="stepper-btn"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label}`}
        >−</button>
        <span className="stepper-value">{value}<small>{unit}</small></span>
        <button
          type="button"
          className="stepper-btn"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  );
}
