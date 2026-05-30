import './Portfolio.css';

const STOCKS = ['GOLD', 'SILV', 'OIL', 'BOND', 'INDU', 'GRAIN'];

export default function Portfolio({ room, me }) {
  const hasHoldings = STOCKS.some(sym => me?.portfolio?.[sym]);

  return (
    <div className="card portfolio-card">
      <h3 className="section-label">My Portfolio</h3>
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
      {!hasHoldings && <p className="portfolio-empty">No holdings yet</p>}
    </div>
  );
}
