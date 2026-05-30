import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import './TradeToasts.css';

// Short, friendly stock labels (e.g. INDU -> "Ind")
const SHORT = {
  GOLD: 'Gold', SILV: 'Silv', OIL: 'Oil', BOND: 'Bond', INDU: 'Ind', GRAIN: 'Grain',
};

const TOAST_MS = 3000;

export default function TradeToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    function onTrade({ entry }) {
      if (!entry) return;
      const id = ++idRef.current;
      const buy = entry.side === 'buy';
      const sign = buy ? '+' : '-';
      const label = SHORT[entry.symbol] || entry.symbol;
      const text = `${entry.playerName} ${sign}${entry.shares} ${label}`;
      setToasts(prev => [...prev, { id, text, buy }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, TOAST_MS);
    }

    socket.on('game:trade', onTrade);
    return () => socket.off('game:trade', onTrade);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="trade-toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`trade-toast ${t.buy ? 'buy' : 'sell'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
