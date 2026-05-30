require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { initSocketHandlers } = require('./src/socket');
const apiRouter = require('./src/routes/api');

const app = express();
const server = http.createServer(app);

// In production the client is served from this same origin, so CORS can be
// fully open (same-origin requests don't need it). In dev, allow the CRA port.
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const isProd = process.env.NODE_ENV === 'production';

const io = new Server(server, {
  cors: {
    origin: isProd ? true : CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: isProd ? true : CLIENT_URL }));
app.use(express.json());
app.use('/api', apiRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

initSocketHandlers(io);

// Serve the built React client and let client-side routing handle the rest.
// Socket.io intercepts /socket.io/* before this, so the SPA fallback is safe.
const clientBuild = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuild));
app.get('*', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`StockTickr server running on port ${PORT}`);
});
