import './Leaderboard.css';

export default function Leaderboard({ players, myId }) {
  const sorted = [...players].sort((a, b) => b.netWorth - a.netWorth);

  return (
    <div className="leaderboard card">
      <h3 className="section-label">Leaderboard</h3>
      <ul className="lb-list">
        {sorted.map((p, i) => (
          <li key={p.socketId} className={`lb-row${p.socketId === myId ? ' mine' : ''}`}>
            <span className="lb-rank">#{i + 1}</span>
            <span className="lb-name">{p.name}{p.socketId === myId ? ' (you)' : ''}</span>
            <div className="lb-right">
              <span className="lb-net">${p.netWorth.toLocaleString()}</span>
              <span className="lb-cash">Cash: ${p.cash.toLocaleString()}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
