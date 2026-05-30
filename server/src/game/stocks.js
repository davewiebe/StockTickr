// The 6 classic Stock Ticker commodities with starting prices and rules
const STOCKS = [
  { symbol: 'GOLD',  name: 'Gold',        startPrice: 100, color: '#F59E0B' },
  { symbol: 'SILV',  name: 'Silver',      startPrice: 100, color: '#9CA3AF' },
  { symbol: 'OIL',   name: 'Oil',         startPrice: 100, color: '#1F2937' },
  { symbol: 'BOND',  name: 'Bonds',       startPrice: 100, color: '#3B82F6' },
  { symbol: 'INDU',  name: 'Industrial',  startPrice: 100, color: '#EF4444' },
  { symbol: 'GRAIN', name: 'Grain',       startPrice: 100, color: '#10B981' },
];

// Die faces: each face is [stock index, movement type, amount]
// Movement types: 'up', 'down', 'div' (dividend), 'split', 'bankrupt'
// Classic Stock Ticker uses two dice: one selects the stock, one selects the action
const STOCK_DIE = ['GOLD', 'SILV', 'OIL', 'BOND', 'INDU', 'GRAIN'];

const ACTION_DIE = [
  { type: 'up',      amount: 5  },
  { type: 'up',      amount: 10 },
  { type: 'up',      amount: 20 },
  { type: 'down',    amount: 5  },
  { type: 'down',    amount: 10 },
  { type: 'down',    amount: 20 },
  { type: 'div',     amount: 10 }, // 10% dividend
  { type: 'split',   amount: 2  }, // 2-for-1 split
  { type: 'bankrupt',amount: 0  },
];

function rollDice() {
  const stockSymbol = STOCK_DIE[Math.floor(Math.random() * STOCK_DIE.length)];
  const action = ACTION_DIE[Math.floor(Math.random() * ACTION_DIE.length)];
  return { stockSymbol, action };
}

function createInitialPrices() {
  const prices = {};
  for (const s of STOCKS) {
    prices[s.symbol] = s.startPrice;
  }
  return prices;
}

module.exports = { STOCKS, rollDice, createInitialPrices };
