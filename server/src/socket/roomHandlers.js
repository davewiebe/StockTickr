const {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  buyStock,
  sellStock,
  startTicker,
  serializeRoom,
  serializePlayers,
} = require('../game/roomManager');

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

  // Host starts the game
  socket.on('room:start', ({ roomCode }, callback) => {
    const result = startGame(roomCode, socket.id);
    if (result.error) return callback({ error: result.error });

    startTicker(result.room, io);

    io.to(roomCode).emit('game:started', { room: serializeRoom(result.room) });
    callback({ ok: true });
    console.log(`[room:start] Game started in room ${roomCode}`);
  });

  // Buy shares
  socket.on('trade:buy', ({ roomCode, symbol, shares }, callback) => {
    const result = buyStock(roomCode, socket.id, symbol, Number(shares));
    if (result.error) return callback({ error: result.error });

    // Send updated player state back to buyer only
    callback({ ok: true, player: result.player, prices: result.prices });

    // Broadcast updated leaderboard to room
    const { serializePlayers, getRoom } = require('../game/roomManager');
    const room = getRoom(roomCode);
    if (room) {
      io.to(roomCode).emit('room:playersUpdated', { players: serializePlayers(room) });
    }
  });

  // Sell shares
  socket.on('trade:sell', ({ roomCode, symbol, shares }, callback) => {
    const result = sellStock(roomCode, socket.id, symbol, Number(shares));
    if (result.error) return callback({ error: result.error });

    callback({ ok: true, player: result.player, prices: result.prices });

    const { serializePlayers, getRoom } = require('../game/roomManager');
    const room = getRoom(roomCode);
    if (room) {
      io.to(roomCode).emit('room:playersUpdated', { players: serializePlayers(room) });
    }
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
