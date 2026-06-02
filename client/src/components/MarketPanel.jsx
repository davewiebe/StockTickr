import { useState, useRef, useEffect } from 'react';
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

  // Bump a stock's cell whenever its price changes, and float a +/-$ delta over
  // it. `bump[sym]` increments each change so re-keying restarts the animations;
  // `delta[sym]` holds the price change to display.
  const [bump, setBump] = useState({});
  const [delta, setDelta] = useState({});
  const prevPrices = useRef(room.prices);
  useEffect(() => {
    const prev = prevPrices.current || {};
    const changed = {};
    for (const { sym } of STOCKS) {
      if (room.prices[sym] !== prev[sym]) changed[sym] = room.prices[sym] - prev[sym];
    }
    if (Object.keys(changed).length) {
      setBump(b => {
        const next = { ...b };
        for (const sym of Object.keys(changed)) next[sym] = (next[sym] || 0) + 1;
        return next;
      });
      setDelta(d => ({ ...d, ...changed }));
    }
    prevPrices.current = room.prices;
  }, [room.prices]);

  // When a dividend actually pays out, flutter money icons up the cell.
  // Dividends don't move the price, so watch the latest roll in history instead.
  // `divActive[sym]` is set true only for the duration of the animation, then
  // cleared — otherwise a later price-change re-mount would replay stale coins.
  const [divActive, setDivActive] = useState({}); // sym -> dividend $/share while animating
  const lastRollTs = useRef(0);
  useEffect(() => {
    const latestRoll = (room.history || []).find(e => (e.type || 'roll') === 'roll');
    if (!latestRoll || !latestRoll.ts || latestRoll.ts === lastRollTs.current) return;
    lastRollTs.current = latestRoll.ts;
    if (latestRoll.action?.type === 'div' && latestRoll.dividendPerShare > 0) {
      const sym = latestRoll.stockSymbol;
      const amount = latestRoll.dividendPerShare;
      setDivActive(d => ({ ...d, [sym]: amount }));
      const t = setTimeout(() => setDivActive(d => ({ ...d, [sym]: 0 })), 1300);
      return () => clearTimeout(t);
    }
  }, [room.history]);

  const price = selected ? (room.prices[selected] || 0) : 0;
  const held  = selected ? (me?.portfolio?.[selected] || 0) : 0;
  const cost  = price * qty;

  // Selling caps at what you actually hold, so "20" sells the rest if you have fewer.
  const sellQty = Math.min(qty, held);
  const sellValue = price * sellQty;

  const cannotBuy  = !selected || cost > (me?.cash || 0);
  const cannotSell = !selected || held <= 0;

  function select(sym) {
    setSelected(prev => (prev === sym ? null : sym));
    setMessage(null);
  }

  function trade(side, shares) {
    if (!selected || shares <= 0) return;
    setMessage(null);
    socket.emit(`trade:${side}`, { roomCode: room.code, symbol: selected, shares }, (res) => {
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
              key={`${sym}-${bump[sym] || 0}`}
              type="button"
              className={`mp-cell${selected === sym ? ' selected' : ''}${bump[sym] ? ' mp-bump' : ''}`}
              style={{ '--stock-color': color }}
              onClick={() => select(sym)}
              aria-pressed={selected === sym}
            >
              {bump[sym] && delta[sym] ? (
                <span
                  className={`mp-delta${delta[sym] > 0 ? ' up' : ' down'}`}
                  aria-hidden="true"
                >
                  {delta[sym] > 0 ? '+' : '-'}${Math.abs(delta[sym])}
                </span>
              ) : null}
              {divActive[sym] ? (
                <>
                  <span className="mp-coin left" aria-hidden="true">💰</span>
                  <span className="mp-coin right" aria-hidden="true">💰</span>
                  <span className="mp-div-amount" aria-hidden="true">+${divActive[sym]}</span>
                </>
              ) : null}
              <span className="mp-emoji">{emoji}</span>
              <span className="mp-sym">{sym}</span>
              <span
                className={`mp-price${room.prices[sym] < 100 ? ' no-div' : ''}`}
                title={room.prices[sym] < 100 ? 'Below $100 — pays no dividends' : 'Pays dividends'}
              >
                ${room.prices[sym]}
              </span>
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

      <div className="mp-actions">
        <button
          type="button"
          className="mp-buy"
          disabled={cannotBuy}
          onClick={() => trade('buy', qty)}
        >
          {cannotBuy && selected ? 'Not enough cash' : `Buy · $${selected ? cost.toLocaleString() : '—'}`}
        </button>
        <button
          type="button"
          className="mp-sell"
          disabled={cannotSell}
          onClick={() => trade('sell', sellQty)}
        >
          {cannotSell && selected
            ? 'No shares'
            : sellQty < qty
              ? `Sell ${sellQty} · $${sellValue.toLocaleString()}`
              : `Sell · $${selected ? cost.toLocaleString() : '—'}`}
        </button>
      </div>

      {!selected && <p className="mp-hint">Select a stock above to trade.</p>}
      {message && <p className={message.ok ? 'mp-ok' : 'error'}>{message.text}</p>}
      <p className="mp-cash">Cash: <strong>${me?.cash?.toLocaleString()}</strong></p>
    </div>
  );
}
