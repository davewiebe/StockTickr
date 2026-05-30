import { useState } from 'react';
import { socket } from '../socket';
import './MarketTrade.css';

const QUANTITIES = [5, 10, 20];

export default function MarketTrade({ room, me, selected, onTraded }) {
  const [side, setSide] = useState('buy');   // 'buy' | 'sell'
  const [qty, setQty] = useState(5);
  const [message, setMessage] = useState(null); // { text, ok }

  if (!selected) {
    return (
      <div className="market-trade card">
        <h3 className="section-label">Trade</h3>
        <p className="mt-hint">Select a stock above to buy or sell.</p>
      </div>
    );
  }

  const price = room.prices[selected] || 0;
  const held  = me?.portfolio?.[selected] || 0;
  const cost  = price * qty;

  const cannotBuy  = cost > (me?.cash || 0);
  const cannotSell = held < qty;
  const disabled = side === 'buy' ? cannotBuy : cannotSell;

  function confirmTrade() {
    setMessage(null);
    socket.emit(`trade:${side}`, { roomCode: room.code, symbol: selected, shares: qty }, (res) => {
      if (res?.error) {
        setMessage({ text: res.error, ok: false });
      } else {
        setMessage({ text: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${selected}`, ok: true });
        onTraded?.();
      }
    });
  }

  return (
    <div className="market-trade card">
      <h3 className="section-label">Trade</h3>

      <div className="mt-summary">
        <span className="mt-sym">{selected}</span>
        <span className="mt-meta">${price} · you hold {held}</span>
      </div>

      <div className="mt-controls">
        <button
          type="button"
          className={`mt-side ${side}`}
          onClick={() => { setSide(s => (s === 'buy' ? 'sell' : 'buy')); setMessage(null); }}
        >
          {side === 'buy' ? 'Buy' : 'Sell'}
        </button>

        <div className="mt-qty" role="group" aria-label="Quantity">
          {QUANTITIES.map(q => (
            <button
              key={q}
              type="button"
              className={`mt-qty-btn${qty === q ? ' active' : ''}`}
              onClick={() => { setQty(q); setMessage(null); }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-total">
        <span>{side === 'buy' ? 'Total cost' : 'Total proceeds'}</span>
        <strong>${cost.toLocaleString()}</strong>
      </div>

      <button type="button" className="mt-confirm" onClick={confirmTrade} disabled={disabled}>
        {disabled
          ? (side === 'buy' ? 'Not enough cash' : 'Not enough shares')
          : `Confirm ${side === 'buy' ? 'Buy' : 'Sell'}`}
      </button>

      {message && (
        <p className={message.ok ? 'mt-ok' : 'error'}>{message.text}</p>
      )}
    </div>
  );
}
