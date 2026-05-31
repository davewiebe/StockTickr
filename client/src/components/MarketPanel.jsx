import { useState } from 'react';
import { socket } from '../socket';
import './MarketPanel.css';

const STOCKS = [
  { sym: 'GOLD',  emoji: '🥇', color: '#F59E0B' },
  { sym: 'SILV',  emoji: '🥈', color: '#9CA3AF' },
  { sym: 'OIL',   emoji: '🛢️', color: '#64748B' },
  { sym: 'BOND',  emoji: '📄', color: '#3B82F6' },
  { sym: 'INDU',  emoji: '🏭', color: '#EF4444' },
  { sym: 'GRAIN', emoji: '🌾', color: '#10B981' },
];
const QUANTITIES = [5, 10, 20];

export default function MarketPanel({ room, me }) {
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(5);
  const [message, setMessage] = useState(null); // { text, ok }

  const price = selected ? (room.prices[selected] || 0) : 0;
  const held  = selected ? (me?.portfolio?.[selected] || 0) : 0;
  const cost  = price * qty;

  const cannotBuy  = !selected || cost > (me?.cash || 0);
  const cannotSell = !selected || held < qty;

  function select(sym) {
    setSelected(prev => (prev === sym ? null : sym));
    setMessage(null);
  }

  function trade(side) {
    if (!selected) return;
    setMessage(null);
    socket.emit(`trade:${side}`, { roomCode: room.code, symbol: selected, shares: qty }, (res) => {
      setMessage(res?.error ? { text: res.error } : null);
    });
  }

  return (
    <div className="market-panel card">
      <div className="mp-grid">
        {STOCKS.map(({ sym, emoji, color }) => {
          const owned = me?.portfolio?.[sym] || 0;
          const dots = Math.floor(owned / 5);
          return (
            <button
              key={sym}
              type="button"
              className={`mp-cell${selected === sym ? ' selected' : ''}`}
              style={{ '--stock-color': color }}
              onClick={() => select(sym)}
              aria-pressed={selected === sym}
            >
              <span className="mp-emoji">{emoji}</span>
              <span className="mp-sym">{sym}</span>
              <span className="mp-price">${room.prices[sym]}</span>
              <span className="mp-dots" title={`${owned} shares owned`} aria-label={`${owned} shares owned`}>
                {dots > 0
                  ? Array.from({ length: dots }, (_, i) => (
                      <span key={i} className="mp-dot" />
                    ))
                  : <span className="mp-dot-empty" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mp-qty-row" role="group" aria-label="Quantity">
        {QUANTITIES.map(q => (
          <button
            key={q}
            type="button"
            className={`mp-qty-btn${qty === q ? ' active' : ''}`}
            onClick={() => { setQty(q); setMessage(null); }}
          >
            {q} shares
          </button>
        ))}
      </div>

      {selected && (
        <p className="mp-meta">{selected} @ ${price} · {qty} shares = ${cost.toLocaleString()} · you hold {held}</p>
      )}

      <div className="mp-actions">
        <button
          type="button"
          className="mp-buy"
          disabled={cannotBuy}
          onClick={() => trade('buy')}
        >
          {cannotBuy && selected ? 'Not enough cash' : `Buy · $${selected ? cost.toLocaleString() : '—'}`}
        </button>
        <button
          type="button"
          className="mp-sell"
          disabled={cannotSell}
          onClick={() => trade('sell')}
        >
          {cannotSell && selected ? 'Not enough shares' : `Sell · $${selected ? cost.toLocaleString() : '—'}`}
        </button>
      </div>

      {!selected && <p className="mp-hint">Select a stock above to trade.</p>}
      {message && <p className={message.ok ? 'mp-ok' : 'error'}>{message.text}</p>}
      <p className="mp-cash">Cash: <strong>${me?.cash?.toLocaleString()}</strong></p>
    </div>
  );
}
