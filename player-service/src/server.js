const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5001;

// In-memory storage
const players = new Map();

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.BACKEND_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'player-ranking-service' });
});

// Get all players
app.get('/players', (req, res) => {
  try {
    const playersList = Array.from(players.values())
      .sort((a, b) => b.rating - a.rating);
    res.status(200).json(playersList);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get top players
app.get('/players/top', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const playersList = Array.from(players.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
    res.status(200).json(playersList);
  } catch (error) {
    console.error('Error fetching top players:', error);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

// Get player by name
app.get('/players/:name', (req, res) => {
  try {
    const player = players.get(req.params.name);
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
app.post('/players', (req, res) => {
  try {
    const { name, rating, gameResult } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    let player = players.get(name);
    
    if (!player) {
      player = {
        name,
        rating: rating || 1000,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        lastActive: new Date()
      };
    } else {
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
    
    player.lastActive = new Date();
    players.set(name, player);
    
    res.status(200).json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Update player rating after a game
app.patch('/players/:name/rating', (req, res) => {
  try {
    const { name } = req.params;
    const { newRating, gameResult } = req.body;
    
    if (newRating === undefined) {
      return res.status(400).json({ error: 'New rating is required' });
    }
    
    const player = players.get(name);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    player.rating = newRating;
    player.lastActive = new Date();
    
    // Update game stats if provided
    if (gameResult) {
      player.gamesPlayed += 1;
      if (gameResult === 'win') {
        player.wins += 1;
      } else if (gameResult === 'loss') {
        player.losses += 1;
      }
    }
    
    players.set(name, player);
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