const registerRoomHandlers = require('./roomHandlers');

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] Connected: ${socket.id}`);
    registerRoomHandlers(io, socket);
    socket.on('disconnect', () => {
      console.log(`[socket] Disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocketHandlers };
