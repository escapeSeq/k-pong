const { calculateElo } = require('./utils/eloCalculator');

class GameHandlers {
  constructor(io) {
    this.io = io;
    this.games = new Map();
    this.waitingPlayers = new Set();
    this.playerRankings = new Map();
  }

  handleConnection(socket) {
    const username = socket.handshake.query.username;
    console.log('New connection details:', {
      socketId: socket.id,
      username,
      transport: socket.conn.transport.name,
      query: socket.handshake.query, // Log full query
      rankings: Array.from(this.playerRankings.entries()) // Log current rankings
    });

    // Initialize player ranking if they're new
    if (username && !this.playerRankings.has(username)) {
      console.log('Initializing ranking for new player:', username);
      this.playerRankings.set(username, {
        name: username,
        rating: 800,
        lastUpdated: Date.now()
      });
      
      // Log rankings after update
      console.log('Updated rankings:', Array.from(this.playerRankings.entries()));
      
      // Emit updated rankings
      const topPlayers = this.getTopPlayers();
      console.log('Emitting rankings update:', topPlayers);
      this.io.emit('rankingsUpdate', topPlayers);
    }

    // Clean up any existing connections for this username
    for (const player of this.waitingPlayers) {
      if (player.name === username) {
        console.log('Cleaning up existing connection for:', username);
        this.waitingPlayers.delete(player);
        break;
      }
    }

    socket.on('findGame', (player) => {
      console.log('findGame event received:', {
        socketId: socket.id,
        playerName: player.name,
        waitingCount: this.waitingPlayers.size
      });

      if (!socket.connected) {
        console.log('Socket not connected, ignoring findGame');
        return;
      }

      this.handleFindGame(socket, player);
    });

    socket.on('createInvite', (player) => {
      console.log('Player creating invite:', player);
      this.handleCreateInvite(socket, player);
    });

    socket.on('joinInvite', (data) => {
      console.log('Player joining invite:', data);
      this.handleJoinInvite(socket, data);
    });

    socket.on('paddleMove', (data) => this.handlePaddleMove(socket, data));
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
      this.handleDisconnect(socket);
    });
  }

  handleFindGame(socket, player) {
    console.log('Processing findGame:', {
      socketId: socket.id,
      playerName: player.name,
      waitingCount: this.waitingPlayers.size
    });

    // First, check if this player is already in a game
    for (const [gameId, game] of this.games.entries()) {
      if (game.players.some(p => p.socketId === socket.id)) {
        console.log('Player already in game:', socket.id);
        return;
      }
    }

    // Initialize player ranking if they're new
    if (!this.playerRankings.has(player.name)) {
      this.playerRankings.set(player.name, {
        name: player.name,
        rating: 800, // Initial rating
        lastUpdated: Date.now()
      });
    }

    // Emit current rankings to all clients
    this.io.emit('rankingsUpdate', this.getTopPlayers());

    // Then, check for waiting players
    if (this.waitingPlayers.size > 0) {
      // Get the first waiting player that isn't this player
      const opponent = Array.from(this.waitingPlayers)
        .find(p => p.socketId !== socket.id);

      if (opponent) {
        console.log('Found opponent:', opponent);
        this.waitingPlayers.delete(opponent);
        
        const gameId = Math.random().toString(36).substring(7);
        console.log(`Creating game ${gameId}`);

        // Verify both sockets are still connected
        const opponentSocket = this.io.sockets.sockets.get(opponent.socketId);
        if (!socket.connected || !opponentSocket?.connected) {
          console.log('One of the players disconnected:', {
            player: socket.connected,
            opponent: opponentSocket?.connected
          });
          if (socket.connected) socket.emit('error', 'Opponent disconnected');
          return;
        }

        // Join both players to the game room
        socket.join(gameId);
        opponentSocket.join(gameId);
        
        // Create the game
        this.createGame(gameId, player, opponent);
      } else {
        // No valid opponent found, add to waiting
        console.log('No valid opponents, adding to queue:', player.name);
        this.waitingPlayers.add({ ...player, socketId: socket.id });
        socket.emit('waiting');
      }
    } else {
      console.log('No opponents waiting, adding to queue:', player.name);
      this.waitingPlayers.add({ ...player, socketId: socket.id });
      socket.emit('waiting');
    }
  }

  handleCreateInvite(socket, player) {
    const inviteCode = Math.random().toString(36).substring(7);
    const playerWithInvite = { ...player, socketId: socket.id, inviteCode };
    this.waitingPlayers.add(playerWithInvite);
    socket.emit('inviteCreated', inviteCode);
    socket.emit('waiting');
  }

  handleJoinInvite(socket, { inviteCode, player }) {
    const opponent = Array.from(this.waitingPlayers)
      .find(p => p.inviteCode === inviteCode);
    
    if (opponent) {
      this.waitingPlayers.delete(opponent);
      
      // Create gameId once
      const gameId = Math.random().toString(36).substring(7);
      console.log(`Creating invite game room: ${gameId}`);

      // Make both players join the same room
      socket.join(gameId);
      const opponentSocket = this.io.sockets.sockets.get(opponent.socketId);
      if (opponentSocket) {
        opponentSocket.join(gameId);
        this.createGame(gameId, player, opponent);
      } else {
        socket.emit('error', 'Opponent disconnected');
      }
    } else {
      socket.emit('error', 'Invalid invite code');
    }
  }

  createGame(gameId, player1, player2) {
    console.log(`Creating game ${gameId} for players:`, {
      player1: { ...player1, socketId: player1.socketId },
      player2: { ...player2, socketId: player2.socketId }
    });

    const gameState = {
      id: gameId,
      players: [
        { ...player1, index: 0, socketId: player1.socketId },
        { ...player2, index: 1, socketId: player2.socketId }
      ],
      score: [0, 0],
      ballPos: { x: 0, y: 0 },
      ballVelocity: { x: 2, y: 0 },
      paddles: {
        player1: { y: 0 },
        player2: { y: 0 }
      },
      startTime: Date.now()
    };

    // Add debug logging
    console.log('Game state created:', gameState);
    console.log('Player socket IDs:', {
      player1: player1.socketId,
      player2: player2.socketId
    });

    this.games.set(gameId, gameState);
    
    // Log room members before emitting
    const room = this.io.sockets.adapter.rooms.get(gameId);
    console.log(`Room ${gameId} members:`, Array.from(room || []));

    this.io.to(gameId).emit('gameStart', gameState);
    console.log(`Game ${gameId} started`);
    
    this.startGameLoop(gameId);
  }

  handlePaddleMove(socket, { position }) {
    // Find the game this socket is in
    for (const [gameId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const paddleKey = `player${playerIndex + 1}`;
        game.paddles[paddleKey].y = position;
        this.io.to(gameId).emit('gameUpdate', game);
        break;
      }
    }
  }

  handleDisconnect(socket) {
    console.log('Handling disconnect for socket:', socket.id);
    
    // Remove from waiting players
    for (const player of this.waitingPlayers) {
      if (player.socketId === socket.id) {
        console.log('Removing from waiting players:', player.name);
        this.waitingPlayers.delete(player);
        break;
      }
    }

    // End any active game
    for (const [gameId, game] of this.games.entries()) {
      const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        console.log('Ending game due to disconnect:', gameId);
        const winner = game.players[1 - playerIndex]; // Other player wins
        this.endGame(gameId, winner);
        break;
      }
    }
  }

  startGameLoop(gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    const updateInterval = setInterval(() => {
      if (!this.games.has(gameId)) {
        clearInterval(updateInterval);
        return;
      }

      this.updateGameState(gameId);
      this.io.to(gameId).emit('gameUpdate', this.games.get(gameId));
    }, 1000 / 60); // 60 FPS
  }

  updateGameState(gameId) {
    const game = this.games.get(gameId);
    if (!game) return;

    // Update ball position with slower speed
    game.ballPos.x += game.ballVelocity.x * 0.005; // Reduced from 0.01
    game.ballPos.y += game.ballVelocity.y * 0.005;

    // Check for wall collisions
    if (Math.abs(game.ballPos.y) > 0.95) { // Allow for ball size
      game.ballVelocity.y *= -1;
      game.ballPos.y = Math.sign(game.ballPos.y) * 0.95;
    }

    // Check for scoring
    if (Math.abs(game.ballPos.x) > 1) {
      // Score point
      if (game.ballPos.x > 1) {
        game.score[0]++;
      } else {
        game.score[1]++;
      }

      // Check for game end
      if (Math.max(...game.score) >= 11) {
        const winner = game.players[game.score[0] > game.score[1] ? 0 : 1];
        this.endGame(gameId, winner);
        return;
      }

      // Reset ball
      this.resetBall(game);
      return;
    }

    // Check paddle collisions
    const playerIds = Object.keys(game.paddles);
    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i];
      const paddle = game.paddles[playerId];
      const isLeftPaddle = i === 0;
      const paddleX = isLeftPaddle ? -0.95 : 0.95;

      // Check if ball is at paddle's x position
      if ((isLeftPaddle && game.ballPos.x < paddleX && game.ballVelocity.x < 0) ||
          (!isLeftPaddle && game.ballPos.x > paddleX && game.ballVelocity.x > 0)) {
        
        // Check if ball is within paddle's y range
        const paddleHitboxSize = 0.15; // Paddle height / 2
        if (Math.abs(game.ballPos.y - paddle.y) < paddleHitboxSize) {
          // Hit successful - reverse x direction
          game.ballVelocity.x *= -1.05;

          // Increment hits counter
          game.hits = (game.hits || 0) + 1;

          // Calculate new y velocity based on hit position
          const hitPosition = (game.ballPos.y - paddle.y) / paddleHitboxSize;
          game.ballVelocity.y = hitPosition * 2;

          // Limit angle to 30 degrees
          const maxYVelocity = Math.abs(game.ballVelocity.x) * Math.tan(Math.PI / 6);
          game.ballVelocity.y = Math.max(Math.min(game.ballVelocity.y, maxYVelocity), -maxYVelocity);

          // Move ball slightly away from paddle to prevent multiple collisions
          game.ballPos.x = paddleX + (isLeftPaddle ? 0.02 : -0.02);
        }
      }
    }
  }

  resetBall(game) {
    game.ballPos = { x: 0, y: 0 };
    const speed = 2; // Reduced from 5
    const angle = (Math.random() - 0.5) * Math.PI / 3; // Max 30 degrees
    game.ballVelocity = {
      x: speed * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1),
      y: speed * Math.sin(angle)
    };
  }

  endGame(gameId, winner) {
    const game = this.games.get(gameId);
    if (!game) return;

    const loser = game.players.find(p => p.socketId !== winner.socketId);
    const newWinnerRating = calculateElo(winner.rating, loser.rating, 'win');
    const newLoserRating = calculateElo(loser.rating, winner.rating, 'loss');

    // Update rankings
    this.updatePlayerRanking(winner, newWinnerRating);
    this.updatePlayerRanking(loser, newLoserRating);

    // Emit updated rankings to all clients
    this.io.emit('rankingsUpdate', this.getTopPlayers());

    // Send game over event with all relevant data
    this.io.to(gameId).emit('gameOver', {
      winner: winner.socketId,
      ratings: {
        [winner.socketId]: newWinnerRating,
        [loser.socketId]: newLoserRating
      },
      stats: {
        duration: Date.now() - game.startTime,
        maxSpeed: Math.max(Math.abs(game.ballVelocity.x), Math.abs(game.ballVelocity.y)),
        hits: game.hits || 0,
        score: game.score // Add the final score
      },
      // Include final score at top level for easier access
      finalScore: game.score
    });

    // Clean up game
    this.games.delete(gameId);
  }

  updatePlayerRanking(player, newRating) {
    this.playerRankings.set(player.name, {
      name: player.name,
      rating: newRating,
      lastUpdated: Date.now()
    });
  }

  getTopPlayers(limit = 10) {
    return Array.from(this.playerRankings.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
}

module.exports = GameHandlers; 