import './RollFeed.css';

const ACTION_LABELS = {
  up:   (a) => `▲ +$${a.amount}`,
  down: (a) => `▼ -$${a.amount}`,
  div:  (a) => `💰 ${a.amount}% Dividend`,
};

export default function RollFeed({ history }) {
  if (!history.length) {
    return (
      <div className="roll-feed card">
        <h3 className="section-label">Roll History</h3>
        <p className="roll-empty">Waiting for first roll…</p>
      </div>
    );
  }

  return (
    <div className="roll-feed card">
      <h3 className="section-label">Roll History</h3>
      <ul className="roll-list">
        {history.map((r, i) => {
          // A stock that hit $0 carries r.bankrupt even on a plain 'down' roll.
          const label = r.bankrupt
            ? '💀 Bankrupt — shares wiped, reset to $100'
            : ACTION_LABELS[r.action.type]?.(r.action) || r.action.type;
          const isPositive = !r.bankrupt && ['up', 'div'].includes(r.action.type);
          const isNegative = r.bankrupt || r.action.type === 'down';
          return (
            <li key={i} className={`roll-item ${isPositive ? 'pos' : isNegative ? 'neg' : ''}`}>
              <span className="roll-stock">{r.stockSymbol}</span>
              <span className="roll-action">{label}</span>
              <span className="roll-price">${r.newPrice}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
