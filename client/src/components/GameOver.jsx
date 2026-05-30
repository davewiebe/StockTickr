import { useMemo } from 'react';
import './GameOver.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

export default function GameOver({ result, myId, onLeave }) {
  const { standings = [], winner } = result || {};
  const iWon = winner && winner.socketId === myId;

  // Generate a fixed set of confetti pieces once.
  const confetti = useMemo(
    () => Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
    })),
    []
  );

  return (
    <div className="gameover-overlay">
      <div className="confetti-layer" aria-hidden="true">
        {confetti.map(c => (
          <span
            key={c.id}
            className="confetti-piece"
            style={{
              left: `${c.left}%`,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              transform: `rotate(${c.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <div className="gameover-card">
        <h2 className="gameover-title">Game Over</h2>
        {winner && (
          <div className="gameover-winner">
            <span className="gameover-trophy">🏆</span>
            <span className="gameover-winner-name">{winner.name}</span>
            <span className="gameover-winner-sub">
              {iWon ? 'You win!' : 'wins'} · ${winner.netWorth.toLocaleString()}
            </span>
          </div>
        )}

        <ol className="gameover-standings">
          {standings.map((p, i) => (
            <li key={p.socketId} className={`gameover-row${p.socketId === myId ? ' mine' : ''}`}>
              <span className="gameover-rank">#{i + 1}</span>
              <span className="gameover-name">{p.name}{p.socketId === myId ? ' (you)' : ''}</span>
              <span className="gameover-net">${p.netWorth.toLocaleString()}</span>
            </li>
          ))}
        </ol>

        <button className="gameover-btn" onClick={onLeave}>Back to Lobby</button>
      </div>
    </div>
  );
}
