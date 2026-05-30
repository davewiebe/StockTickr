const { rollDice, createInitialPrices, STOCKS } = require('./stocks');

const STARTING_CASH = 5000;
const TICK_INTERVAL_MS = 5000;
const MAX_PRICE = 200;
// Par value a stock resets to after going bankrupt (hitting $0).
const PAR_PRICE = 100;

// Bankrupt a stock: every holder loses their shares and the price resets to par.
function bankruptStock(room, symbol) {
  for (const player of room.players.values()) {
    player.portfolio[symbol] = 0;
  }
  return PAR_PRICE;
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
    phase: 'lobby',       // 'lobby' | 'playing' | 'ended'
    players: new Map([[hostSocketId, host]]),
    prices: createInitialPrices(),
    history: [],          // last N roll results
    tickTimer: null,
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

function joinRoom(code, socketId, playerName) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already in progress' };
  if (room.players.has(socketId)) return { error: 'Already in room' };
  if (room.players.size >= 6) return { error: 'Room is full' };

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

  room.phase = 'playing';
  return { room };
}

// Apply a dice roll to room state. Returns the roll event to broadcast.
function applyRoll(room) {
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
      // Pay dividend: action.amount % of current price per share held
      dividendPerShare = Math.floor((currentPrice * action.amount) / 100);
      for (const player of room.players.values()) {
        const shares = player.portfolio[stockSymbol];
        if (shares > 0) {
          player.cash += shares * dividendPerShare;
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

  room.history = [event, ...room.history].slice(0, 20);
  return event;
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
  }, TICK_INTERVAL_MS);
}

function stopTicker(room) {
  if (room.tickTimer) {
    clearInterval(room.tickTimer);
    room.tickTimer = null;
  }
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
    players: serializePlayers(room),
  };
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startGame,
  buyStock,
  sellStock,
  applyRoll,
  startTicker,
  stopTicker,
  serializeRoom,
  serializePlayers,
};
