const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameHandlers = require('./gameHandlers');
const fetch = require('node-fetch');

const app = express();

// Basic error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Update your CORS middleware configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['*']
  },
  allowEIO3: true,
  transports: ['websocket'],
  path: '/socket.io/',
  connectTimeout: 45000,
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
  allowUpgrades: false,
  perMessageDeflate: false
});

const gameHandlers = new GameHandlers(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    frontend_url: process.env.FRONTEND_URL || 'not set'
  });
});

// Rankings endpoint
app.get('/rankings', (req, res) => {
  res.json(gameHandlers.getTopPlayers());
});

// Add proxying endpoints for player service
app.get('/api/rankings/top', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const playerServiceUrl = process.env.PLAYER_SERVICE_URL || 'http://player-service:5001';
    
    console.log(`Proxying request to player service: ${playerServiceUrl}/players/top?limit=${limit}`);
    
    const response = await fetch(`${playerServiceUrl}/players/top?limit=${limit}`);
    const data = await response.json();
    
    console.log('Rankings data received:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching rankings from player service:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Add other proxy endpoints as needed
app.get('/api/players/:name', async (req, res) => {
  try {
    const playerServiceUrl = process.env.PLAYER_SERVICE_URL || 'http://player-service:5001';
    const response = await fetch(`${playerServiceUrl}/players/${req.params.name}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching player from player service:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

try {
  io.engine.on("headers", (headers, req) => {
    console.log('Headers being sent:', headers);
    console.log('Request headers:', req.headers);
  });

  io.engine.on("initial_headers", (headers, req) => {
    console.log('Initial headers being sent:', headers);
    console.log('Initial request headers:', req.headers);
  });

  io.on('connection', (socket) => {
    const username = socket.handshake.query.username;
    console.log('New connection:', {
      socketId: socket.id,
      username,
      transport: socket.conn.transport.name,
      address: socket.handshake.address
    });

    // Instead of disconnecting duplicates, just clean up old connections
    const existingSockets = Array.from(io.sockets.sockets.values());
    for (const existingSocket of existingSockets) {
      if (existingSocket.id !== socket.id && 
          existingSocket.handshake.query.username === username) {
        console.log('Cleaning up old connection for:', username);
        // Remove from waiting players first
        gameHandlers.handleDisconnect(existingSocket);
        // Then disconnect
        existingSocket.disconnect(true);
      }
    }

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    gameHandlers.handleConnection(socket);
    
    socket.on('disconnect', (reason) => {
      console.log(`Client ${socket.id} disconnected:`, reason);
    });
  });

  io.engine.on("connection_error", (err) => {
    console.error('Connection error:', {
      type: err.type,
      description: err.description,
      context: err.context,
      require: err.require,
      message: err.message,
      stack: err.stack
    });
  });

  httpServer.on('error', (error) => {
    console.error('HTTP Server error:', error);
  });

  io.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });

  const PORT = process.env.PORT || 8080;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Server accepting connections from: ${process.env.FRONTEND_URL || "all origins (debug mode)"}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    
    const addresses = Object.values(require('os').networkInterfaces())
      .flat()
      .filter(({family, internal}) => family === 'IPv4' && !internal)
      .map(({address}) => address);
    
    console.log('Server bound to addresses:', addresses);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
} 