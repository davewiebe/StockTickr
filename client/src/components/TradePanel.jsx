import { useState } from 'react';
import { socket } from '../socket';
import './TradePanel.css';

const STOCKS = ['GOLD', 'SILV', 'OIL', 'BOND', 'INDU', 'GRAIN'];

export default function TradePanel({ room, me }) {
  const [selected, setSelected] = useState(STOCKS[0]);
  const [shares, setShares] = useState(1);
  const [message, setMessage] = useState(null); // { text, ok }

  const price = room.prices[selected] || 0;
  const held  = me?.portfolio?.[selected] || 0;
  const cost  = price * shares;

  function trade(type) {
    setMessage(null);
    socket.emit(`trade:${type}`, { roomCode: room.code, symbol: selected, shares }, (res) => {
      if (res.error) setMessage({ text: res.error, ok: false });
      else setMessage({ text: `${type === 'buy' ? 'Bought' : 'Sold'} ${shares} share(s) of ${selected}`, ok: true });
    });
  }

  return (
    <div className="trade-panel">
      <div className="card stock-picker">
        <h3 className="section-label">Select Stock</h3>
        <div className="stock-grid">
          {STOCKS.map(sym => (
            <button
              key={sym}
              className={`stock-btn${selected === sym ? ' active' : ''}`}
              onClick={() => setSelected(sym)}
            >
              <span className="stock-btn-sym">{sym}</span>
              <span className="stock-btn-price">${room.prices[sym]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card trade-form">
        <div className="trade-info-row">
          <span>Price</span><strong>${price}</strong>
        </div>
        <div className="trade-info-row">
          <span>You Hold</span><strong>{held} shares</strong>
        </div>

        <label className="field-label" style={{ marginTop: '1rem' }}>Shares</label>
        <div className="shares-row">
          <button className="qty-btn" onClick={() => setShares(s => Math.max(1, s - 1))}>−</button>
          <input
            type="number"
            min="1"
            value={shares}
            onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))}
            className="shares-input"
          />
          <button className="qty-btn" onClick={() => setShares(s => s + 1)}>+</button>
        </div>

        <div className="trade-info-row" style={{ marginTop: '0.5rem' }}>
          <span>Total Cost</span><strong>${cost.toLocaleString()}</strong>
        </div>

        <div className="trade-buttons">
          <button className="buy-btn" onClick={() => trade('buy')} disabled={cost > (me?.cash || 0)}>
            Buy
          </button>
          <button className="sell-btn" onClick={() => trade('sell')} disabled={held < shares}>
            Sell
          </button>
        </div>

        {message && (
          <p className={message.ok ? 'trade-ok' : 'error'} style={{ marginTop: '0.75rem' }}>
            {message.text}
          </p>
        )}
      </div>

      <div className="card portfolio-card">
        <h3 className="section-label">Your Portfolio</h3>
        {STOCKS.map(sym => {
          const qty = me?.portfolio?.[sym] || 0;
          if (!qty) return null;
          return (
            <div key={sym} className="portfolio-row">
              <span className="portfolio-sym">{sym}</span>
              <span className="portfolio-qty">{qty} shares</span>
              <span className="portfolio-val">${(qty * room.prices[sym]).toLocaleString()}</span>
            </div>
          );
        })}
        {STOCKS.every(sym => !(me?.portfolio?.[sym])) && (
          <p className="roll-empty">No holdings yet</p>
        )}
      </div>
    </div>
  );
}
