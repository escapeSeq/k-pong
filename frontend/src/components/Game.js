import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import '../styles/Game.css';
import { STORAGE_KEY, BACKEND_URL, INITIAL_RATING } from '../constants';
import soundManager from '../utils/soundManager';

const Game = ({ gameState, onUsernameSet, username }) => {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const modalRef = useRef(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [gameData, setGameData] = useState({
    score: [0, 0],
    ballPos: { x: 0, y: 0 },
    ballSpeed: 5,
    paddles: {
      player1: { y: 0 },
      player2: { y: 0 }
    },
    players: []
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const isMounted = useRef(false);

  const prevGameDataRef = useRef(null);

  // Add ref for tracking mouse movement
  const containerRef = useRef(null);

  const drawGame = useCallback((ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    if (isWaiting) {
      ctx.font = '24px "Press Start 2P"';
      ctx.fillStyle = '#0f0';
      ctx.textAlign = 'center';
      const dots = '.'.repeat(Math.floor(Date.now() / 500) % 4);
      ctx.fillText(`Waiting for opponent${dots}`, ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }
    
    const { width, height } = ctx.canvas;
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#0f0';

    // Draw paddles
    const paddleWidth = width * 0.02;
    const paddleHeight = height * 0.2;
    
    Object.values(gameData.paddles).forEach((paddle, index) => {
      const x = index === 0 ? paddleWidth : width - paddleWidth * 2;
      const y = (paddle.y + 1) * height / 2 - paddleHeight / 2;
      ctx.fillRect(x, y, paddleWidth, paddleHeight);
    });

    // Draw ball
    const ballSize = width * 0.02;
    const ballX = (gameData.ballPos.x + 1) * width / 2 - ballSize / 2;
    const ballY = (gameData.ballPos.y + 1) * height / 2 - ballSize / 2;
    ctx.beginPath();
    ctx.arc(ballX + ballSize/2, ballY + ballSize/2, ballSize/2, 0, Math.PI * 2);
    ctx.fill();
  }, [gameData, isWaiting]);

  // Handle keyboard input
  const handleKeyPress = useCallback((e) => {
    if (!socketRef.current || isWaiting) return;

    // Add more detailed debug logging
    console.log('Key pressed:', e.key);
    console.log('Current socket ID:', socketRef.current.id);
    console.log('Available paddles:', Object.keys(gameData.paddles));
    console.log('Players:', gameData.players);
    console.log('Game data:', gameData);

    const moveAmount = 0.05;
    let newPosition = null;

    // Find which player we are (0 or 1)
    const playerIndex = gameData.players.findIndex(p => p.socketId === socketRef.current.id);
    console.log('Player index:', playerIndex);
    console.log('Socket ID to match:', socketRef.current.id);
    
    if (playerIndex === -1) {
      console.error('Player not found in game data');
      return;
    }

    const paddleKey = `player${playerIndex + 1}`;
    const currentPosition = gameData.paddles[paddleKey].y;
    console.log('Current paddle position:', currentPosition);

    switch (e.key) {
      case 'w':
      case 'ArrowUp':
        newPosition = Math.max(currentPosition - moveAmount, -0.95);
        console.log('Moving up to:', newPosition);
        break;
      case 's':
      case 'ArrowDown':
        newPosition = Math.min(currentPosition + moveAmount, 0.95);
        console.log('Moving down to:', newPosition);
        break;
      default:
        return;
    }

    if (newPosition !== null) {
      console.log('Emitting paddle move:', { position: newPosition });
      socketRef.current.emit('paddleMove', { position: newPosition });
    }
  }, [gameData, isWaiting]);

  // Add mouse movement handler
  const handleMouseMove = useCallback((e) => {
    if (!socketRef.current || isWaiting) return;

    const container = containerRef.current;
    if (!container) return;

    // Get container bounds
    const bounds = container.getBoundingClientRect();
    
    // Calculate relative Y position (-1 to 1)
    const relativeY = ((e.clientY - bounds.top) / bounds.height) * 2 - 1;
    
    // Clamp the value between -1 and 1
    const clampedY = Math.max(-1, Math.min(1, relativeY));
    
    // Emit paddle movement with 'position' instead of 'y'
    socketRef.current.emit('paddleMove', { position: clampedY });
  }, [isWaiting]);

  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${BACKEND_URL || 'http://localhost:5000'}/health`);
      const data = await response.json();
      console.log('Backend health check:', data);
      return true;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  };

  const cleanupSocket = useCallback(() => {
    if (!isMounted.current) return;

    console.log('Cleaning up socket connection');
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnecting(false);
    setConnectionStatus('disconnected');
    setConnectionAttempts(0);
    setIsWaiting(false);
    setGameData(prevData => ({
      ...prevData,
      score: [0, 0],
      players: [],
      paddles: {
        player1: { y: 0 },
        player2: { y: 0 }
      }
    }));
  }, []);

  const setupSocket = useCallback(async (username) => {
    if (!isMounted.current) return;
    
    if (isConnecting) {
      console.log('Already connecting');
      return;
    }

    // Clean up any existing socket first
    cleanupSocket();

    console.log('Setting up socket for username:', username);

    const newSocket = io(BACKEND_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket'],
      path: '/socket.io/',
      reconnection: false,
      timeout: 45000,
      autoConnect: false,
      forceNew: true,
      query: { username }
    });

    // Store socket reference immediately
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      if (!isMounted.current) return;
      console.log('Socket connected with ID:', newSocket.id, 'Username:', username);
      
      // Play load sound when connection is established
      soundManager.playLoadSound();

      const playerData = {
        name: username,
        rating: INITIAL_RATING,
        position: { y: 0 },
        socketId: newSocket.id
      };

      console.log('Sending findGame with data:', playerData);
      newSocket.emit('findGame', playerData);
    });

    newSocket.on('connect_error', (error) => {
      if (!isMounted.current) return;
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setIsConnecting(false);
      if (socketRef.current === newSocket) {
        cleanupSocket();
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
      setIsConnecting(false);
    });

    newSocket.on('waiting', () => {
      console.log('Received waiting event');
      setIsWaiting(true);
    });

    newSocket.on('gameStart', (data) => {
      console.log('Received gameStart event:', data);
      setIsWaiting(false);
      setGameData(data);
      prevGameDataRef.current = data;
      soundManager.startBackgroundMusic();
    });

    newSocket.on('gameUpdate', (data) => {
      if (!prevGameDataRef.current) {
        prevGameDataRef.current = data;
        setGameData(data);
        return;
      }

      try {
        // Check if ball hit a paddle by comparing with previous position
        if (data?.ballVelocity?.x !== prevGameDataRef.current?.ballVelocity?.x) {
          soundManager.playHitSound();
        }
        
        // Check if score changed
        if (data?.score && prevGameDataRef.current?.score &&
            (data.score[0] !== prevGameDataRef.current.score[0] || 
             data.score[1] !== prevGameDataRef.current.score[1])) {
          soundManager.playScoreSound();
        }
      } catch (error) {
        console.error('Error processing game update:', error);
      }
      
      setGameData(data);
      prevGameDataRef.current = data;
    });

    newSocket.on('gameOver', (result) => {
      // Play game over sound before stopping background music
      soundManager.playGameOverSound();
      setTimeout(() => soundManager.stopAll(), 1000); // Stop other sounds after game over sound plays
      
      if (!isMounted.current) return;
      
      // Clear the previous game data
      prevGameDataRef.current = null;
      
      console.log('Game over:', result);
      
      const isWinner = result.winner === socketRef.current?.id;
      
      navigate('/game-over', { 
        state: {
          ...result,
          isWinner,
          message: isWinner ? 'You Won!' : 'You Lost!',
          rating: result.ratings?.[socketRef.current?.id],
          finalScore: result.finalScore || result.stats?.score
        }
      });
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      alert('Error: ' + error);
    });

    // Connect after setting up handlers
    try {
      await newSocket.connect();
    } catch (error) {
      if (!isMounted.current) return;
      console.error('Connection failed:', error);
      setConnectionStatus('error');
      setIsConnecting(false);
      if (socketRef.current === newSocket) {
        cleanupSocket();
      }
    }

    return () => {
      if (isMounted.current && socketRef.current === newSocket) {
        cleanupSocket();
      }
    };
  }, [cleanupSocket, isConnecting, navigate]);

  const showUsernameModal = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.remove();
      modalRef.current = null;
    }

    const modal = document.createElement('dialog');
    modalRef.current = modal;
    modal.className = 'username-modal';
    modal.innerHTML = `
      <form>
        <h2>Enter Username</h2>
        <input type="text" id="username" minlength="2" required placeholder="Username" />
        <div class="buttons">
          <button type="submit">Play</button>
        </div>
      </form>
    `;

    document.body.appendChild(modal);
    modal.showModal();

    const cleanup = () => {
      if (modalRef.current === modal) {
        modal.remove();
        modalRef.current = null;
      }
    };

    modal.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      if (username.length >= 2) {
        localStorage.setItem(STORAGE_KEY, username);
        cleanup();
        setupSocket(username);
      }
    };

    return cleanup;
  }, [setupSocket]);

  // Setup keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Setup game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;

    let animationId;
    const gameLoop = () => {
      drawGame(ctx);
      animationId = requestAnimationFrame(gameLoop);
    };
    gameLoop();

    return () => cancelAnimationFrame(animationId);
  }, [drawGame]);

  // Add mouse movement listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  // Update the main useEffect
  useEffect(() => {
    isMounted.current = true;
    let cleanup = null;
    
    const initGame = async () => {
      if (!socketRef.current && !isConnecting) {
        if (username) {
          console.log('Using provided username:', username);
          await setupSocket(username);
        } else {
          const savedUsername = localStorage.getItem(STORAGE_KEY);
          if (savedUsername) {
            console.log('Using saved username:', savedUsername);
            await setupSocket(savedUsername);
          } else {
            cleanup = showUsernameModal();
          }
        }
      }
    };

    initGame();

    return () => {
      isMounted.current = false;
      if (cleanup) cleanup();
      if (modalRef.current) {
        modalRef.current.remove();
        modalRef.current = null;
      }
      prevGameDataRef.current = null; // Clear the previous game data
      cleanupSocket();
    };
  }, [setupSocket, showUsernameModal, cleanupSocket, isConnecting, username]);

  // Add sound initialization
  useEffect(() => {
    soundManager.startBackgroundMusic();
    return () => soundManager.stopAll();
  }, []);

  return (
    <div className="game-container" ref={containerRef}>
      <div className="player-names">
        <span>{gameData.players[0]?.name || 'Player 1'}</span>
        <span>{gameData.players[1]?.name || 'Player 2'}</span>
      </div>
      <div className="score-board">
        <span>{gameData.score[0]}</span>
        <span>{gameData.score[1]}</span>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Game; 