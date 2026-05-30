import './LastRoll.css';

const META = {
  GOLD:  { emoji: '🥇', color: '#F59E0B' },
  SILV:  { emoji: '🥈', color: '#9CA3AF' },
  OIL:   { emoji: '🛢️', color: '#64748B' },
  BOND:  { emoji: '📄', color: '#3B82F6' },
  INDU:  { emoji: '🏭', color: '#EF4444' },
  GRAIN: { emoji: '🌾', color: '#10B981' },
};

function actionLabel(r) {
  if (r.bankrupt) return '💀 Bankrupt — reset to $100';
  if (r.action.type === 'up')   return `▲ +$${r.action.amount}`;
  if (r.action.type === 'down') return `▼ -$${r.action.amount}`;
  if (r.action.type === 'div')  return `💰 ${r.action.amount}% Dividend`;
  return r.action.type;
}

export default function LastRoll({ roll }) {
  if (!roll) {
    return <div className="last-roll empty">Waiting for first roll…</div>;
  }

  const meta = META[roll.stockSymbol] || { emoji: '📈', color: '#6366f1' };
  const pos = !roll.bankrupt && (roll.action.type === 'up' || roll.action.type === 'div');
  const neg = roll.bankrupt || roll.action.type === 'down';

  return (
    <div className={`last-roll${pos ? ' pos' : neg ? ' neg' : ''}`}>
      <span className="lr-label">Latest</span>
      <span className="lr-emoji">{meta.emoji}</span>
      <span className="lr-sym" style={{ color: meta.color }}>{roll.stockSymbol}</span>
      <span className="lr-action">{actionLabel(roll)}</span>
      <span className="lr-price">${roll.newPrice}</span>
    </div>
  );
}
