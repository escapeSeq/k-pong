const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kpong-players';

// Middleware
console.log("--------------------",process.env.FRONTEND_URL, process.env.BACKEND_URL);
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.BACKEND_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Update the connection options with more debugging and retry logic
const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // Longer timeout for server selection
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 5000, // More frequent heartbeats
  retryWrites: true,
  w: 'majority',
  authSource: 'admin', // Specify auth source explicitly
  directConnection: true, // Try direct connection 
};

console.log(`Attempting to connect to MongoDB at: ${process.env.MONGODB_URI}`);

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  }).catch(err => {
    console.error('MongoDB connection error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
  });

// Add additional connection event handlers
const db = mongoose.connection;
db.on('connecting', () => console.log('Connecting to MongoDB...'));
db.on('connected', () => console.log('MongoDB connected event fired'));
db.on('disconnecting', () => console.log('Disconnecting from MongoDB...'));
db.on('disconnected', () => console.log('MongoDB disconnected'));
db.on('error', err => console.error('MongoDB connection error event:', err));
db.on('reconnected', () => console.log('MongoDB reconnected'));

// Define Player schema
const playerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  rating: { 
    type: Number, 
    default: 1000 
  },
  gamesPlayed: { 
    type: Number, 
    default: 0 
  },
  wins: { 
    type: Number, 
    default: 0 
  },
  losses: { 
    type: Number, 
    default: 0 
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  }
});

// Create Player model
const Player = mongoose.model('Player', playerSchema);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'player-ranking-service' });
});

// Get all players
app.get('/players', async (req, res) => {
  try {
    const players = await Player.find({}).sort({ rating: -1 });
    res.status(200).json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get top players
app.get('/players/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const players = await Player.find({})
      .sort({ rating: -1 })
      .limit(limit);
    res.status(200).json(players);
  } catch (error) {
    console.error('Error fetching top players:', error);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

// Get player by name
app.get('/players/:name', async (req, res) => {
  try {
    const player = await Player.findOne({ name: req.params.name });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(200).json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Create or update player
app.post('/players', async (req, res) => {
  try {
    const { name, rating, gameResult } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Find player or create new one
    let player = await Player.findOne({ name });
    
    if (!player) {
      player = new Player({ 
        name,
        rating: rating || 1000
      });
    } else {
      // Update existing player
      if (rating !== undefined) {
        player.rating = rating;
      }
    }
    
    // Update stats if game result is provided
    if (gameResult) {
      player.gamesPlayed += 1;
      if (gameResult === 'win') {
        player.wins += 1;
      } else if (gameResult === 'loss') {
        player.losses += 1;
      }
    }
    
    player.lastActive = Date.now();
    await player.save();
    
    res.status(200).json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Update player rating after a game
app.patch('/players/:name/rating', async (req, res) => {
  try {
    const { name } = req.params;
    const { newRating, gameResult } = req.body;
    
    if (newRating === undefined) {
      return res.status(400).json({ error: 'New rating is required' });
    }
    
    const player = await Player.findOne({ name });
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    player.rating = newRating;
    player.lastActive = Date.now();
    
    // Update game stats if provided
    if (gameResult) {
      player.gamesPlayed += 1;
      if (gameResult === 'win') {
        player.wins += 1;
      } else if (gameResult === 'loss') {
        player.losses += 1;
      }
    }
    
    await player.save();
    res.status(200).json(player);
  } catch (error) {
    console.error('Error updating player rating:', error);
    res.status(500).json({ error: 'Failed to update player rating' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Player ranking service running on port ${PORT}`);
}); 