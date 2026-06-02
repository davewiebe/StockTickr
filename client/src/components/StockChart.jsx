import { useState } from 'react';
import './StockChart.css';

const STOCKS = [
  { sym: 'GOLD',  color: '#F59E0B' },
  { sym: 'SILV',  color: '#9CA3AF' },
  { sym: 'OIL',   color: '#64748B' },
  { sym: 'BOND',  color: '#3B82F6' },
  { sym: 'INDU',  color: '#EF4444' },
  { sym: 'GRAIN', color: '#10B981' },
];

// viewBox coordinate space; CSS scales the SVG to fit.
const W = 320, H = 200;
const PAD = { top: 10, right: 10, bottom: 20, left: 32 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export default function StockChart({ priceHistory }) {
  // Which stocks are visible (toggle by tapping the legend).
  const [hidden, setHidden] = useState(() => new Set());

  if (!priceHistory || priceHistory.length < 2) {
    return (
      <div className="chart-card card">
        <h3 className="section-label">Price Chart</h3>
        <p className="chart-empty">The chart will draw as prices roll in…</p>
      </div>
    );
  }

  const n = priceHistory.length;
  // Fixed Y axis: $0 at the bottom to $200 at the top, matching the price range.
  const maxVal = 200;

  const x = (i) => PAD.left + (n === 1 ? 0 : (i / (n - 1)) * PLOT_W);
  const y = (v) => PAD.top + PLOT_H - (v / maxVal) * PLOT_H;

  const lineFor = (sym) =>
    priceHistory.map((snap, i) => `${x(i).toFixed(1)},${y(snap[sym] || 0).toFixed(1)}`).join(' ');

  // Horizontal gridlines every $20 from 0 to 200.
  const gridVals = [];
  for (let v = 0; v <= maxVal; v += 20) gridVals.push(v);

  function toggle(sym) {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(sym) ? next.delete(sym) : next.add(sym);
      return next;
    });
  }

  return (
    <div className="chart-card card">
      <h3 className="section-label">Price Chart</h3>

      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Stock price chart">
        {/* gridlines + y labels */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={y(v)} y2={y(v)}
              className={`chart-grid${v === 100 ? ' par' : ''}`}
            />
            <text x={PAD.left - 4} y={y(v) + 3} className="chart-axis-label" textAnchor="end">{v}</text>
          </g>
        ))}

        {/* x axis labels: start and now */}
        <text x={PAD.left} y={H - 6} className="chart-axis-label" textAnchor="start">start</text>
        <text x={W - PAD.right} y={H - 6} className="chart-axis-label" textAnchor="end">now</text>

        {/* one polyline per visible stock */}
        {STOCKS.filter(s => !hidden.has(s.sym)).map(s => (
          <polyline
            key={s.sym}
            points={lineFor(s.sym)}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div className="chart-legend">
        {STOCKS.map(s => {
          const last = priceHistory[n - 1][s.sym];
          const off = hidden.has(s.sym);
          return (
            <button
              key={s.sym}
              type="button"
              className={`chart-legend-item${off ? ' off' : ''}`}
              onClick={() => toggle(s.sym)}
            >
              <span className="chart-swatch" style={{ background: s.color }} />
              {s.sym} <span className="chart-legend-val">${last}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
