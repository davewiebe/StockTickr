const { rollDice, createInitialPrices, STOCKS } = require('./stocks');

const STARTING_CASH = 5000;
const MAX_PLAYERS = 32;
const COUNTDOWN_SECONDS = 3;   // delay before the market opens for trading
const PRE_ROLL_SECONDS = 15;   // open-but-frozen window for initial buys before dice start
const MAX_PRICE = 200;

// Host-configurable game settings (with defaults + valid ranges).
const DEFAULT_DURATION_MIN = 5;
const DEFAULT_ROLL_INTERVAL_S = 5;
const MIN_DURATION_MIN = 1, MAX_DURATION_MIN = 60;
const MIN_ROLL_INTERVAL_S = 1, MAX_ROLL_INTERVAL_S = 60;

function clamp(n, min, max, fallback) {
  n = Math.round(Number(n));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
// Par value a stock resets to after going bankrupt (hitting $0).
const PAR_PRICE = 100;

// Bankrupt a stock: every holder loses their shares and the price resets to par.
function bankruptStock(room, symbol) {
  for (const player of room.players.values()) {
    player.portfolio[symbol] = 0;
  }
  return PAR_PRICE;
}

// A trade counts as "big" (worth a callout) at or above this dollar value.
const BIG_TRADE_VALUE = 2000;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Witty one-liner for the player most affected by the latest roll.
function buildRollCallout(room, before, event) {
  let best = null, worst = null;
  for (const p of room.players.values()) {
    const delta = p.netWorth - (before[p.socketId] ?? p.netWorth);
    if (delta > 0 && (!best || delta > best.delta)) best = { name: p.name, delta };
    if (delta < 0 && (!worst || delta < worst.delta)) worst = { name: p.name, delta };
  }
  const sym = event.stockSymbol;

  if (event.bankrupt && worst) {
    return pick([
      `💀 ${worst.name} got wiped out — ${sym} went bankrupt!`,
      `🪦 ${sym} flatlined and took $${Math.abs(worst.delta).toLocaleString()} of ${worst.name}'s fortune with it.`,
      `🔥 ${worst.name} held the bag as ${sym} imploded. Brutal.`,
    ]);
  }
  if (best) {
    const amt = Math.round(best.delta).toLocaleString();
    return pick([
      `🤑 ${best.name} just made $${amt} — ${sym} to the moon!`,
      `📈 ${best.name} is printing money: +$${amt} on ${sym}!`,
      `🥂 ${best.name} pockets $${amt}. The ${sym} gods are pleased.`,
      `🚀 Cha-ching! ${best.name} rides ${sym} for +$${amt}.`,
    ]);
  }
  if (worst) {
    const amt = Math.abs(Math.round(worst.delta)).toLocaleString();
    return pick([
      `📉 ${worst.name} dropped $${amt} as ${sym} cratered. Oof.`,
      `🩸 Ouch — ${worst.name} lost $${amt} on ${sym}.`,
      `🫠 ${worst.name} watched $${amt} evaporate. ${sym}, why?`,
      `🐻 ${sym} mauled ${worst.name} for $${amt}.`,
    ]);
  }
  return null; // nobody held the rolled stock
}

// Witty one-liner for a big buy/sell. Returns null if the trade is too small.
function buildTradeCallout(name, side, symbol, shares, value) {
  if (value < BIG_TRADE_VALUE) return null;
  if (side === 'buy') {
    return pick([
      `🛒 ${name} backed up the truck: ${shares} ${symbol}!`,
      `🐂 ${name} is feeling bullish — grabbed ${shares} ${symbol}.`,
      `🤞 ${name} bet big on ${symbol} (${shares} shares). Bold.`,
      `💸 ${name} went all-in: ${shares} ${symbol} for $${value.toLocaleString()}.`,
    ]);
  }
  return pick([
    `💰 ${name} cashed out ${shares} ${symbol} for $${value.toLocaleString()}.`,
    `🏃 ${name} bailed on ${shares} ${symbol}!`,
    `🐻 ${name} dumped ${shares} ${symbol}. Paper hands?`,
    `🤝 ${name} took profits: ${shares} ${symbol} sold.`,
  ]);
}

// rooms: Map<roomCode, RoomState>
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(hostSocketId, hostName) {
  const code = generateRoomCode();
  const host = createPlayer(hostSocketId, hostName, true);

  const room = {
    code,
    phase: 'lobby',       // 'lobby' | 'countdown' | 'playing' | 'ended'
    players: new Map([[hostSocketId, host]]),
    prices: createInitialPrices(),
    history: [],          // last N roll results
    settings: {
      durationMinutes: DEFAULT_DURATION_MIN,
      rollIntervalSeconds: DEFAULT_ROLL_INTERVAL_S,
    },
    endsAt: null,         // epoch ms when the game ends (set when dice start)
    tickTimer: null,
    countdownTimer: null,
    preRollTimer: null,
    endTimer: null,
  };

  rooms.set(code, room);
  return room;
}

function createPlayer(socketId, name, isHost = false) {
  return {
    socketId,
    name,
    isHost,
    cash: STARTING_CASH,
    portfolio: Object.fromEntries(STOCKS.map(s => [s.symbol, 0])),
    netWorth: STARTING_CASH,
  };
}

function getRoom(code) {
  return rooms.get(code) || null;
}

// Host-only: update game settings while still in the lobby. Values are clamped.
function updateSettings(code, socketId, incoming) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already started' };
  const requester = room.players.get(socketId);
  if (!requester?.isHost) return { error: 'Only the host can change settings' };

  if (incoming.durationMinutes !== undefined) {
    room.settings.durationMinutes = clamp(
      incoming.durationMinutes, MIN_DURATION_MIN, MAX_DURATION_MIN, DEFAULT_DURATION_MIN);
  }
  if (incoming.rollIntervalSeconds !== undefined) {
    room.settings.rollIntervalSeconds = clamp(
      incoming.rollIntervalSeconds, MIN_ROLL_INTERVAL_S, MAX_ROLL_INTERVAL_S, DEFAULT_ROLL_INTERVAL_S);
  }
  return { room };
}

function joinRoom(code, socketId, playerName) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already in progress' };
  if (room.players.has(socketId)) return { error: 'Already in room' };
  if (room.players.size >= MAX_PLAYERS) return { error: 'Room is full' };

  const player = createPlayer(socketId, playerName, false);
  room.players.set(socketId, player);
  return { room };
}

function leaveRoom(socketId) {
  for (const [code, room] of rooms) {
    if (!room.players.has(socketId)) continue;

    room.players.delete(socketId);

    if (room.players.size === 0) {
      stopTicker(room);
      if (room.countdownTimer) {
        clearInterval(room.countdownTimer);
        room.countdownTimer = null;
      }
      if (room.preRollTimer) {
        clearInterval(room.preRollTimer);
        room.preRollTimer = null;
      }
      if (room.endTimer) {
        clearTimeout(room.endTimer);
        room.endTimer = null;
      }
      rooms.delete(code);
      return { code, disbanded: true };
    }

    // Transfer host if needed
    if (room.players.size > 0) {
      const anyPlayer = room.players.values().next().value;
      if (!anyPlayer.isHost) {
        anyPlayer.isHost = true;
      }
    }

    return { code, disbanded: false, room };
  }
  return null;
}

function startGame(code, requestingSocketId) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };

  const requester = room.players.get(requestingSocketId);
  if (!requester?.isHost) return { error: 'Only the host can start the game' };
  if (room.players.size < 1) return { error: 'Need at least 1 player' };
  if (room.phase !== 'lobby') return { error: 'Game already started' };

  room.phase = 'countdown';
  return { room };
}

// Apply a dice roll to room state. Returns the roll event to broadcast.
function applyRoll(room) {
  // Snapshot net worth before the roll so we can call out who gained/lost most.
  const beforeNetWorth = {};
  for (const p of room.players.values()) beforeNetWorth[p.socketId] = p.netWorth;

  const { stockSymbol, action } = rollDice();
  const currentPrice = room.prices[stockSymbol];
  let newPrice = currentPrice;
  let dividendPerShare = 0;
  let event = { stockSymbol, action, prevPrice: currentPrice };

  switch (action.type) {
    case 'up':
      newPrice = Math.min(MAX_PRICE, currentPrice + action.amount);
      break;
    case 'down':
      newPrice = currentPrice - action.amount;
      if (newPrice <= 0) {
        // Stock hit $0 — holders lose their shares, price resets to par.
        newPrice = bankruptStock(room, stockSymbol);
        event.bankrupt = true;
      }
      break;
    case 'div':
      // Dividends only pay when the stock is at or above par ($100).
      if (currentPrice >= PAR_PRICE) {
        dividendPerShare = Math.floor((currentPrice * action.amount) / 100);
        for (const player of room.players.values()) {
          const shares = player.portfolio[stockSymbol];
          if (shares > 0) {
            player.cash += shares * dividendPerShare;
          }
        }
      }
      break;
  }

  room.prices[stockSymbol] = newPrice;
  event.newPrice = newPrice;
  event.dividendPerShare = dividendPerShare;

  // Recalculate net worth for all players
  for (const player of room.players.values()) {
    player.netWorth = player.cash + STOCKS.reduce((sum, s) => {
      return sum + player.portfolio[s.symbol] * room.prices[s.symbol];
    }, 0);
  }

  event.callout = buildRollCallout(room, beforeNetWorth, event);
  event.type = 'roll';
  event.ts = Date.now();

  room.history = [event, ...room.history].slice(0, 50);
  return event;
}

// Record a completed trade into the room timeline. Returns the entry to broadcast.
function recordTrade(room, player, side, symbol, shares, price) {
  const entry = {
    type: 'trade',
    ts: Date.now(),
    playerName: player.name,
    side,            // 'buy' | 'sell'
    symbol,
    shares,
    price,
    value: price * shares,
  };
  room.history = [entry, ...room.history].slice(0, 50);
  return entry;
}

function buyStock(code, socketId, symbol, shares) {
  const room = rooms.get(code);
  if (!room || room.phase !== 'playing') return { error: 'Game not in progress' };

  const player = room.players.get(socketId);
  if (!player) return { error: 'Player not found' };

  const price = room.prices[symbol];
  if (!price) return { error: 'Unknown stock' };

  const cost = price * shares;
  if (cost > player.cash) return { error: 'Insufficient funds' };

  player.cash -= cost;
  player.portfolio[symbol] = (player.portfolio[symbol] || 0) + shares;
  player.netWorth = player.cash + STOCKS.reduce((sum, s) => {
    return sum + player.portfolio[s.symbol] * room.prices[s.symbol];
  }, 0);

  return { player, prices: room.prices };
}

function sellStock(code, socketId, symbol, shares) {
  const room = rooms.get(code);
  if (!room || room.phase !== 'playing') return { error: 'Game not in progress' };

  const player = room.players.get(socketId);
  if (!player) return { error: 'Player not found' };

  const price = room.prices[symbol];
  if (!price) return { error: 'Unknown stock' };

  if ((player.portfolio[symbol] || 0) < shares) return { error: 'Not enough shares' };

  player.portfolio[symbol] -= shares;
  player.cash += price * shares;
  player.netWorth = player.cash + STOCKS.reduce((sum, s) => {
    return sum + player.portfolio[s.symbol] * room.prices[s.symbol];
  }, 0);

  return { player, prices: room.prices };
}

// Pre-market countdown -> open the market for trading -> pre-roll window -> dice start.
function startCountdown(room, io) {
  if (room.countdownTimer) return;
  let remaining = COUNTDOWN_SECONDS;
  io.to(room.code).emit('game:countdown', { remaining });

  room.countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      io.to(room.code).emit('game:countdown', { remaining });
      return;
    }
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
    if (room.phase !== 'countdown') return; // room may have been left/disbanded
    room.phase = 'playing';
    io.to(room.code).emit('game:open', { room: serializeRoom(room) });
    startPreRoll(room, io);
  }, 1000);
}

// Market is open and tradeable, but prices stay frozen so players can buy in.
// After PRE_ROLL_SECONDS the dice start rolling.
function startPreRoll(room, io) {
  if (room.preRollTimer) return;
  let remaining = PRE_ROLL_SECONDS;
  io.to(room.code).emit('game:preroll', { remaining });

  room.preRollTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      io.to(room.code).emit('game:preroll', { remaining });
      return;
    }
    clearInterval(room.preRollTimer);
    room.preRollTimer = null;
    if (room.phase !== 'playing') return; // room may have been left/disbanded
    // Dice are now live; arm the game-end timer based on the configured duration.
    room.endsAt = Date.now() + room.settings.durationMinutes * 60 * 1000;
    io.to(room.code).emit('game:rolling', { endsAt: room.endsAt });
    startTicker(room, io);
    room.endTimer = setTimeout(() => endGame(room, io), room.settings.durationMinutes * 60 * 1000);
  }, 1000);
}

function startTicker(room, io) {
  if (room.tickTimer) return;
  room.tickTimer = setInterval(() => {
    if (room.phase !== 'playing') {
      stopTicker(room);
      return;
    }
    const rollEvent = applyRoll(room);
    io.to(room.code).emit('game:tick', {
      rollEvent,
      prices: room.prices,
      players: serializePlayers(room),
    });
  }, room.settings.rollIntervalSeconds * 1000);
}

function stopTicker(room) {
  if (room.tickTimer) {
    clearInterval(room.tickTimer);
    room.tickTimer = null;
  }
}

// End the game: stop the dice, freeze trading, broadcast final standings + winner.
function endGame(room, io) {
  if (room.endTimer) { clearTimeout(room.endTimer); room.endTimer = null; }
  if (room.phase === 'ended') return;
  stopTicker(room);
  room.phase = 'ended';

  const standings = serializePlayers(room).sort((a, b) => b.netWorth - a.netWorth);
  const winner = standings[0] || null;
  io.to(room.code).emit('game:ended', { standings, winner });
}

function serializePlayers(room) {
  return Array.from(room.players.values()).map(p => ({
    socketId: p.socketId,
    name: p.name,
    isHost: p.isHost,
    cash: p.cash,
    portfolio: p.portfolio,
    netWorth: p.netWorth,
  }));
}

function serializeRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    prices: room.prices,
    history: room.history,
    settings: room.settings,
    endsAt: room.endsAt,
    players: serializePlayers(room),
  };
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  updateSettings,
  startGame,
  buyStock,
  sellStock,
  applyRoll,
  recordTrade,
  buildTradeCallout,
  startCountdown,
  startTicker,
  stopTicker,
  endGame,
  serializeRoom,
  serializePlayers,
};
