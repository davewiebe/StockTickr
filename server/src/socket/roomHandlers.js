const {
  createRoom,
  joinRoom,
  leaveRoom,
  updateSettings,
  startGame,
  buyStock,
  sellStock,
  recordTrade,
  buildTradeCallout,
  getRoom,
  startCountdown,
  pauseGame,
  resumeGame,
  serializeRoom,
  serializePlayers,
} = require('../game/roomManager');

// Broadcast a witty callout for a big trade, if it qualifies.
function emitTradeCallout(io, roomCode, player, side, symbol, shares, prices) {
  const value = (prices[symbol] || 0) * shares;
  const text = buildTradeCallout(player.name, side, symbol, shares, value);
  if (text) io.to(roomCode).emit('game:callout', { text });
}

module.exports = function registerRoomHandlers(io, socket) {
  // Create a new room and join it as host
  socket.on('room:create', ({ playerName }, callback) => {
    if (!playerName?.trim()) return callback({ error: 'Name required' });

    const room = createRoom(socket.id, playerName.trim());
    socket.join(room.code);
    callback({ room: serializeRoom(room) });
    console.log(`[room:create] ${playerName} created room ${room.code}`);
  });

  // Join an existing room by code
  socket.on('room:join', ({ roomCode, playerName }, callback) => {
    if (!playerName?.trim()) return callback({ error: 'Name required' });
    if (!roomCode?.trim()) return callback({ error: 'Room code required' });

    const code = roomCode.trim().toUpperCase();
    const result = joinRoom(code, socket.id, playerName.trim());
    if (result.error) return callback({ error: result.error });

    socket.join(code);

    // Notify others in the room
    socket.to(code).emit('room:playerJoined', {
      players: serializePlayers(result.room),
    });

    callback({ room: serializeRoom(result.room) });
    console.log(`[room:join] ${playerName} joined room ${code}`);
  });

  // Host updates game settings in the lobby
  socket.on('room:updateSettings', ({ roomCode, settings }, callback) => {
    const result = updateSettings(roomCode, socket.id, settings || {});
    if (result.error) return callback?.({ error: result.error });

    // Broadcast the clamped settings to everyone in the room
    io.to(roomCode).emit('room:settingsUpdated', { settings: result.room.settings });
    callback?.({ ok: true, settings: result.room.settings });
  });

  // Host starts the game
  socket.on('room:start', ({ roomCode }, callback) => {
    const result = startGame(roomCode, socket.id);
    if (result.error) return callback({ error: result.error });

    // Move everyone to the game screen, then run the synced pre-market countdown.
    io.to(roomCode).emit('game:started', { room: serializeRoom(result.room) });
    startCountdown(result.room, io);
    callback({ ok: true });
    console.log(`[room:start] Countdown started in room ${roomCode}`);
  });

  // Host pauses the game
  socket.on('room:pause', ({ roomCode }, callback) => {
    const result = pauseGame(roomCode, socket.id, io);
    if (result.error) return callback?.({ error: result.error });
    callback?.({ ok: true });
  });

  // Host resumes the game
  socket.on('room:resume', ({ roomCode }, callback) => {
    const result = resumeGame(roomCode, socket.id, io);
    if (result.error) return callback?.({ error: result.error });
    callback?.({ ok: true });
  });

  // Buy shares
  socket.on('trade:buy', ({ roomCode, symbol, shares }, callback) => {
    const result = buyStock(roomCode, socket.id, symbol, Number(shares));
    if (result.error) return callback({ error: result.error });

    // Send updated player state back to buyer only
    callback({ ok: true, player: result.player, prices: result.prices });

    // Broadcast updated leaderboard to room
    const room = getRoom(roomCode);
    if (room) {
      io.to(roomCode).emit('room:playersUpdated', { players: serializePlayers(room) });
      const entry = recordTrade(room, result.player, 'buy', symbol, Number(shares), result.prices[symbol]);
      io.to(roomCode).emit('game:trade', { entry });
    }
    emitTradeCallout(io, roomCode, result.player, 'buy', symbol, Number(shares), result.prices);
  });

  // Sell shares
  socket.on('trade:sell', ({ roomCode, symbol, shares }, callback) => {
    const result = sellStock(roomCode, socket.id, symbol, Number(shares));
    if (result.error) return callback({ error: result.error });

    callback({ ok: true, player: result.player, prices: result.prices });

    const room = getRoom(roomCode);
    if (room) {
      io.to(roomCode).emit('room:playersUpdated', { players: serializePlayers(room) });
      const entry = recordTrade(room, result.player, 'sell', symbol, Number(shares), result.prices[symbol]);
      io.to(roomCode).emit('game:trade', { entry });
    }
    emitTradeCallout(io, roomCode, result.player, 'sell', symbol, Number(shares), result.prices);
  });

  // Handle disconnect / explicit leave
  socket.on('disconnect', () => handleLeave(socket, io));
  socket.on('room:leave', () => handleLeave(socket, io));
};

function handleLeave(socket, io) {
  const result = leaveRoom(socket.id);
  if (!result) return;

  if (result.disbanded) {
    console.log(`[room:leave] Room ${result.code} disbanded`);
    return;
  }

  socket.to(result.code).emit('room:playerLeft', {
    players: serializePlayers(result.room),
  });

  console.log(`[room:leave] Player left room ${result.code}`);
}
