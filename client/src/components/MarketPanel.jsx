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
  const [side, setSide] = useState('buy');   // 'buy' | 'sell'
  const [qty, setQty] = useState(5);
  const [message, setMessage] = useState(null); // { text, ok }

  const price = selected ? (room.prices[selected] || 0) : 0;
  const held  = selected ? (me?.portfolio?.[selected] || 0) : 0;
  const cost  = price * qty;

  const cannotBuy  = cost > (me?.cash || 0);
  const cannotSell = held < qty;
  const disabled = !selected || (side === 'buy' ? cannotBuy : cannotSell);

  function select(sym) {
    setSelected(prev => (prev === sym ? null : sym));
    setMessage(null);
  }

  function confirmTrade() {
    if (!selected) return;
    setMessage(null);
    socket.emit(`trade:${side}`, { roomCode: room.code, symbol: selected, shares: qty }, (res) => {
      if (res?.error) setMessage({ text: res.error, ok: false });
      else setMessage({ text: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${selected}`, ok: true });
    });
  }

  return (
    <div className="market-panel card">
      <div className="mp-grid">
        {STOCKS.map(({ sym, emoji, color }) => (
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
          </button>
        ))}
      </div>

      <div className="mp-trade">
        <button
          type="button"
          className={`mp-side ${side}`}
          disabled={!selected}
          onClick={() => { setSide(s => (s === 'buy' ? 'sell' : 'buy')); setMessage(null); }}
        >
          {side === 'buy' ? 'Buy' : 'Sell'}
        </button>

        <div className="mp-qty" role="group" aria-label="Quantity">
          {QUANTITIES.map(q => (
            <button
              key={q}
              type="button"
              className={`mp-qty-btn${qty === q ? ' active' : ''}`}
              onClick={() => { setQty(q); setMessage(null); }}
            >
              {q}
            </button>
          ))}
        </div>

        <button type="button" className="mp-confirm" onClick={confirmTrade} disabled={disabled}>
          {!selected
            ? 'Select a stock'
            : disabled
              ? (side === 'buy' ? 'Not enough cash' : 'Not enough shares')
              : `${side === 'buy' ? 'Buy' : 'Sell'} ${qty} ${selected} · $${cost.toLocaleString()}`}
        </button>
      </div>

      {selected && (
        <p className="mp-meta">{selected} @ ${price} · you hold {held}</p>
      )}
      {message && <p className={message.ok ? 'mp-ok' : 'error'}>{message.text}</p>}
    </div>
  );
}
