import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import Leaderboard from './Leaderboard';
import MarketPanel from './MarketPanel';
import Portfolio from './Portfolio';
import RollFeed from './RollFeed';
import LastRoll from './LastRoll';
import Callout from './Callout';
import TradeToasts from './TradeToasts';
import StockChart from './StockChart';
import GameOver from './GameOver';
import './GameRoom.css';

export default function GameRoom({ room, me, countdown, preRoll, endsAt, paused, result, callout, priceHistory, onLeave }) {
  const [activeTab, setActiveTab] = useState('market'); // 'market' | 'charts' | 'history' | 'scores'
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const showCountdown = countdown !== null && countdown !== undefined;
  const showPreRoll = preRoll !== null && preRoll !== undefined;
  // The host can pause once the dice are rolling (endsAt set) or while paused.
  const canControlPause = me?.isHost && (paused || (!!endsAt && !showCountdown && !showPreRoll));

  // Close the menu on any outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  function togglePause() {
    socket.emit(paused ? 'room:resume' : 'room:pause', { roomCode: room.code });
  }

  return (
    <div className="game-root">
      {showCountdown && (
        <div className="countdown-overlay">
          <span className="countdown-label">Market opens in</span>
          <span className="countdown-number" key={countdown}>{countdown}</span>
          <span className="countdown-hint">Get ready to trade…</span>
        </div>
      )}

      {paused && (
        <div className="paused-overlay">
          <span className="paused-icon">⏸</span>
          <span className="paused-title">Game Paused</span>
          <span className="paused-hint">
            {me?.isHost ? 'Tap Resume to continue.' : 'Waiting for the host to resume…'}
          </span>
          {me?.isHost && (
            <button className="paused-resume-btn" onClick={togglePause}>Resume</button>
          )}
        </div>
      )}
      <header className="game-header">
        <div className="game-header-left">
          <span className="game-room-code">{room.code}</span>
          <span className="game-phase-badge">Live</span>
        </div>
        <div className="game-header-right">
          {endsAt && <GameTimer endsAt={endsAt} />}
          <span className="game-cash" title="Cash (net worth incl. stocks)">
            ${me?.cash?.toLocaleString()} <span className="game-networth">(${me?.netWorth?.toLocaleString()})</span>
          </span>
          <div className="game-menu" ref={menuRef}>
            <button
              className="game-menu-btn"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="game-menu-dropdown" role="menu">
                {canControlPause && (
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); togglePause(); }}
                  >
                    {paused ? 'Resume' : 'Pause'}
                  </button>
                )}
                <button
                  role="menuitem"
                  className="game-menu-danger"
                  onClick={() => { setMenuOpen(false); setConfirmLeave(true); }}
                >
                  Leave
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showPreRoll && (
        <div className="preroll-banner">
          🟢 Trading open — buy in now! Stocks start moving in <strong>{preRoll}s</strong>
        </div>
      )}

      <LastRoll roll={room.history?.find(e => (e.type || 'roll') === 'roll')} />
      <Callout callout={callout} />

      <div className="game-tabs">
        {['market', 'charts', 'history', 'scores'].map(t => (
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
        {activeTab === 'charts' && (
          <StockChart priceHistory={priceHistory} />
        )}
        {activeTab === 'history' && (
          <RollFeed history={room.history || []} />
        )}
        {activeTab === 'scores' && (
          <Leaderboard players={room.players} myId={socket.id} />
        )}
      </div>

      {result && <GameOver result={result} myId={socket.id} onLeave={onLeave} />}
      <TradeToasts />

      {confirmLeave && (
        <div className="confirm-overlay">
          <div className="confirm-card card">
            <p className="confirm-msg">Leave the game?<br/><span>Your portfolio will be lost.</span></p>
            <div className="confirm-btns">
              <button className="confirm-stay" onClick={() => setConfirmLeave(false)}>Stay</button>
              <button className="confirm-leave" onClick={onLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}
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
