import { useState } from 'react';
import './RollFeed.css';

const ACTION_LABELS = {
  up:   (a) => `▲ +$${a.amount}`,
  down: (a) => `▼ -$${a.amount}`,
  div:  (a) => `💰 ${a.amount}% Dividend`,
};

function RollItem({ r }) {
  const label = r.bankrupt
    ? '💀 Bankrupt — shares wiped, reset to $100'
    : r.split
      ? '🎉 Split — shares doubled, reset to $100'
      : ACTION_LABELS[r.action.type]?.(r.action) || r.action.type;
  const isPositive = r.split || (!r.bankrupt && ['up', 'div'].includes(r.action.type));
  const isNegative = r.bankrupt || r.action.type === 'down';
  return (
    <li className={`roll-item ${isPositive ? 'pos' : isNegative ? 'neg' : ''}`}>
      <span className="roll-tag roll">ROLL</span>
      <span className="roll-stock">{r.stockSymbol}</span>
      <span className="roll-action">{label}</span>
      <span className="roll-price">${r.newPrice}</span>
    </li>
  );
}

function TradeItem({ t }) {
  const isBuy = t.side === 'buy';
  return (
    <li className={`roll-item ${isBuy ? 'pos' : 'neg'}`}>
      <span className={`roll-tag ${isBuy ? 'buy' : 'sell'}`}>{isBuy ? 'BUY' : 'SELL'}</span>
      <span className="roll-stock">{t.symbol}</span>
      <span className="roll-action">
        {t.playerName} {isBuy ? 'bought' : 'sold'} {t.shares} @ ${t.price}
      </span>
      <span className="roll-price">${t.value.toLocaleString()}</span>
    </li>
  );
}

export default function RollFeed({ history }) {
  const [showRolls, setShowRolls] = useState(true);
  const [showTrades, setShowTrades] = useState(true);

  // Older entries may not carry an explicit type; treat them as rolls.
  const typed = (history || []).map(e => ({ ...e, type: e.type || 'roll' }));
  const filtered = typed.filter(e =>
    (e.type === 'roll' && showRolls) || (e.type === 'trade' && showTrades)
  );

  return (
    <div className="roll-feed card">
      <div className="roll-feed-head">
        <h3 className="section-label">History</h3>
        <div className="roll-filters">
          <button
            type="button"
            className={`filter-btn${showRolls ? ' active' : ''}`}
            aria-pressed={showRolls}
            onClick={() => setShowRolls(v => !v)}
          >
            Rolls
          </button>
          <button
            type="button"
            className={`filter-btn${showTrades ? ' active' : ''}`}
            aria-pressed={showTrades}
            onClick={() => setShowTrades(v => !v)}
          >
            Trades
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="roll-empty">
          {typed.length === 0 ? 'Nothing yet…' : 'Nothing matches the current filters.'}
        </p>
      ) : (
        <ul className="roll-list">
          {filtered.map((e, i) => (
            e.type === 'trade'
              ? <TradeItem key={e.ts ? `${e.ts}-${i}` : i} t={e} />
              : <RollItem key={e.ts ? `${e.ts}-${i}` : i} r={e} />
          ))}
        </ul>
      )}
    </div>
  );
}
