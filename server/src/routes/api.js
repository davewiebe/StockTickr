const express = require('express');
const { getRoom, serializeRoom } = require('../game/roomManager');

const router = express.Router();

// Quick room info lookup (used by client to validate code before socket connect)
router.get('/rooms/:code', (req, res) => {
  const room = getRoom(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ code: room.code, phase: room.phase, playerCount: room.players.size });
});

module.exports = router;
