import './PriceBoard.css';

const STOCK_META = {
  GOLD:  { name: 'Gold',       color: '#F59E0B', emoji: '🥇' },
  SILV:  { name: 'Silver',     color: '#9CA3AF', emoji: '🥈' },
  OIL:   { name: 'Oil',        color: '#64748B', emoji: '🛢️' },
  BOND:  { name: 'Bonds',      color: '#3B82F6', emoji: '📄' },
  INDU:  { name: 'Industrial', color: '#EF4444', emoji: '🏭' },
  GRAIN: { name: 'Grain',      color: '#10B981', emoji: '🌾' },
};

export default function PriceBoard({ prices }) {
  return (
    <div className="price-board card">
      <h3 className="section-label">Market Prices</h3>
      <div className="price-grid">
        {Object.entries(prices).map(([sym, price]) => {
          const meta = STOCK_META[sym] || { name: sym, color: '#6366f1', emoji: '📈' };
          return (
            <div key={sym} className="price-cell" style={{ '--stock-color': meta.color }}>
              <span className="price-emoji">{meta.emoji}</span>
              <span className="price-sym">{sym}</span>
              <span className="price-name">{meta.name}</span>
              <span className="price-val">${price}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
