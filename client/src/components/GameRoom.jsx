import { useState, useEffect } from 'react';
import { socket } from '../socket';
import Leaderboard from './Leaderboard';
import MarketPanel from './MarketPanel';
import Portfolio from './Portfolio';
import RollFeed from './RollFeed';
import LastRoll from './LastRoll';
import Callout from './Callout';
import GameOver from './GameOver';
import './GameRoom.css';

export default function GameRoom({ room, me, countdown, preRoll, endsAt, result, callout, onLeave }) {
  const [activeTab, setActiveTab] = useState('market'); // 'market' | 'history' | 'scores'

  const showCountdown = countdown !== null && countdown !== undefined;
  const showPreRoll = preRoll !== null && preRoll !== undefined;

  return (
    <div className="game-root">
      {showCountdown && (
        <div className="countdown-overlay">
          <span className="countdown-label">Market opens in</span>
          <span className="countdown-number" key={countdown}>{countdown}</span>
          <span className="countdown-hint">Get ready to trade…</span>
        </div>
      )}
      <header className="game-header">
        <div className="game-header-left">
          <span className="game-room-code">{room.code}</span>
          <span className="game-phase-badge">Live</span>
        </div>
        <div className="game-header-right">
          {endsAt && <GameTimer endsAt={endsAt} />}
          <span className="game-cash">${me?.cash?.toLocaleString()}</span>
          <button className="leave-btn-sm" onClick={onLeave}>Leave</button>
        </div>
      </header>

      {showPreRoll && (
        <div className="preroll-banner">
          🟢 Trading open — buy in now! Stocks start moving in <strong>{preRoll}s</strong>
        </div>
      )}

      <LastRoll roll={room.history?.[0]} />
      <Callout callout={callout} />

      <div className="game-tabs">
        {['market', 'history', 'scores'].map(t => (
          <button
            key={t}
            className={`game-tab${activeTab === t ? ' active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="game-content">
        {activeTab === 'market' && (
          <>
            <MarketPanel room={room} me={me} />
            <Portfolio room={room} me={me} />
          </>
        )}
        {activeTab === 'history' && (
          <RollFeed history={room.history || []} />
        )}
        {activeTab === 'scores' && (
          <Leaderboard players={room.players} myId={socket.id} />
        )}
      </div>

      {result && <GameOver result={result} myId={socket.id} onLeave={onLeave} />}
    </div>
  );
}

// Live mm:ss countdown to endsAt; turns red in the final 30 seconds.
function GameTimer({ endsAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = Math.max(0, endsAt - now);
  const total = Math.ceil(msLeft / 1000);
  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, '0');
  return (
    <span className={`game-timer${total <= 30 ? ' urgent' : ''}`}>
      {mm}:{ss}
    </span>
  );
}
