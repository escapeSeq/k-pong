import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import '../styles/Game.css';
import { STORAGE_KEY, BACKEND_URL, INITIAL_RATING } from '../constants';
import soundManager from '../utils/soundManager';

// Add this outside of any component, at the top of the file
let usernamePromptShownForSession = false;

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

  const [usernamePromptShown, setUsernamePromptShown] = useState(false);
  // Add state for genome music
  const [isGenomeMusicActive, setIsGenomeMusicActive] = useState(false);
  const [genomeInput, setGenomeInput] = useState('');

  // Add state to track if we've tried to start audio
  const [audioStarted, setAudioStarted] = useState(false);

  const drawGame = useCallback((ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    if (isWaiting) {
      ctx.font = '24px "Press Start 2P"';
      ctx.fillStyle = 'rgb(116,113,203)';
      ctx.textAlign = 'center';
      const dots = '.'.repeat(Math.floor(Date.now() / 500) % 4);
      ctx.fillText(`Waiting for opponent${dots}`, ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }
    
    const { width, height } = ctx.canvas;
    ctx.imageSmoothingEnabled = true;

    // Draw paddles (keeping the original color)
    ctx.fillStyle = 'rgb(116,113,203)';
    const paddleWidth = width * 0.02;
    const paddleHeight = height * 0.2;
    
    Object.values(gameData.paddles).forEach((paddle, index) => {
      const x = index === 0 ? paddleWidth : width - paddleWidth * 2;
      const y = (paddle.y + 1) * height / 2 - paddleHeight / 2;
      ctx.fillRect(x, y, paddleWidth, paddleHeight);
    });

    // Draw ball with new color
    ctx.fillStyle = 'rgb(253,208,64)';
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

  // Add touch movement handler
  const handleTouchMove = useCallback((e) => {
    if (!socketRef.current || isWaiting) return;
    
    // Prevent scrolling when playing the game
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    // Get container bounds
    const bounds = container.getBoundingClientRect();
    
    // Use the first touch point
    if (e.touches && e.touches.length > 0) {
      // Calculate relative Y position (-1 to 1)
      const touchY = e.touches[0].clientY;
      const relativeY = ((touchY - bounds.top) / bounds.height) * 2 - 1;
      
      // Clamp the value between -1 and 1
      const clampedY = Math.max(-1, Math.min(1, relativeY));
      
      // Emit paddle movement
      socketRef.current.emit('paddleMove', { position: clampedY });
    }
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
      
      soundManager.playWithErrorHandling(
        () => soundManager.playLoadSound(),
        'Connection sound failed to play'
      );

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
      
      // Start background music only if genome music is not active
      if (!isGenomeMusicActive) {
        soundManager.startBackgroundMusic();
      }
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
          soundManager.playWithErrorHandling(
            () => soundManager.playHitSound(),
            'Hit sound failed to play'
          );
        }
        
        // Check if score changed
        if (data?.score && prevGameDataRef.current?.score &&
            (data.score[0] !== prevGameDataRef.current.score[0] || 
             data.score[1] !== prevGameDataRef.current.score[1])) {
          soundManager.playWithErrorHandling(
            () => soundManager.playScoreSound(),
            'Score sound failed to play'
          );
        }
      } catch (error) {
        console.error('Error processing game update:', error);
      }
      
      setGameData(data);
      prevGameDataRef.current = data;
    });

    newSocket.on('gameOver', (result) => {
      soundManager.playWithErrorHandling(
        async () => {
          await soundManager.playGameOverSound();
          setTimeout(() => soundManager.stopAll(), 1000);
        },
        'Game over sound failed to play'
      );
      
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
  }, [cleanupSocket, isConnecting, navigate, isGenomeMusicActive]);

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

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add mouse and touch event listeners
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleMouseMove, handleTouchMove]);

  // Update the main useEffect
  useEffect(() => {
    isMounted.current = true;
    
    const initGame = async () => {
      if (!socketRef.current && !isConnecting) {
        // Just use the provided username from props - don't show a modal
        if (username) {
          console.log('Using provided username:', username);
          await setupSocket(username);
        } else {
          // If no username provided, we'll use a guest name
          const guestName = 'Guest_' + Math.floor(Math.random() * 1000);
          console.log('No username provided, using guest name:', guestName);
          await setupSocket(guestName);
        }
      }
    };

    initGame();

    return () => {
      isMounted.current = false;
      if (modalRef.current) {
        modalRef.current.remove();
        modalRef.current = null;
      }
      prevGameDataRef.current = null; // Clear the previous game data
      cleanupSocket();
    };
  }, [setupSocket, cleanupSocket, isConnecting, username]);

  // Add sound initialization with genome support
  useEffect(() => {
    // Only start default background music if genome music is not active
    if (!isGenomeMusicActive) {
      soundManager.playWithErrorHandling(
        () => soundManager.startBackgroundMusic(),
        'Background music failed to start'
      );
    }
    
    return () => {
      try {
        soundManager.stopAll();
      } catch (error) {
        console.warn('Failed to stop sounds:', error);
      }
    };
  }, [isGenomeMusicActive]);

  // Add this inside your existing useEffect for game setup
  useEffect(() => {
    // Add 'playing' class to body when game starts
    if (!isWaiting) {
      document.body.classList.add('playing');
    }
    
    return () => {
      // Remove 'playing' class when component unmounts
      document.body.classList.remove('playing');
    };
  }, [isWaiting]);

  // Function to handle genome music toggle
  const handleGenomeMusicToggle = () => {
    const genomeModal = document.createElement('dialog');
    genomeModal.innerHTML = `
      <form method="dialog">
        <h2>Enter Music Genome</h2>
        <p>Enter a string that will be used to generate music</p>
        <input type="text" id="genome-input" placeholder="Enter genome string" required minlength="4" value="${genomeInput || ''}">
        <div class="buttons">
          <button type="submit">Generate Music</button>
          <button type="button" id="cancel-btn">Cancel</button>
        </div>
      </form>
    `;
    
    document.body.appendChild(genomeModal);
    genomeModal.showModal();
    
    // Handle cancel button
    document.getElementById('cancel-btn').onclick = () => {
      genomeModal.close();
      genomeModal.remove();
    };
    
    genomeModal.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const genome = document.getElementById('genome-input').value;
      if (genome) {
        console.log('Starting genome music with:', genome);
        setGenomeInput(genome);
        setIsGenomeMusicActive(true);
        
        // Use a try-catch block to handle any errors
        try {
          soundManager.stopAll();
          
          // Add a small delay before starting new audio
          setTimeout(() => {
            try {
              soundManager.startGenomeAudio(genome);
              console.log('Genome music started successfully');
            } catch (error) {
              console.error('Error starting genome music:', error);
            }
          }, 100);
        } catch (error) {
          console.error('Error in genome music toggle:', error);
        }
      }
      genomeModal.remove();
    };
  };
  
  // Function to reset to default music
  const resetToDefaultMusic = () => {
    try {
      console.log('Resetting to default music');
      setIsGenomeMusicActive(false);
      soundManager.stopAll();
      
      // Add a small delay before starting new audio
      setTimeout(() => {
        try {
          soundManager.startBackgroundMusic();
          console.log('Default music started successfully');
        } catch (error) {
          console.error('Error starting default music:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Error in reset to default music:', error);
    }
  };

  // Add a click handler to start audio after user interaction
  const handleStartAudio = useCallback(() => {
    if (!audioStarted) {
      console.log('Starting audio from user interaction');
      soundManager.stopAll();
      soundManager.startSimpleGenomeAudio();
      setAudioStarted(true);
    }
  }, [audioStarted]);

  // Add effect to set up click listener
  useEffect(() => {
    if (!audioStarted) {
      document.addEventListener('click', handleStartAudio, { once: true });
      document.addEventListener('touchstart', handleStartAudio, { once: true });
      
      // Also try to start automatically
      const timer = setTimeout(() => {
        console.log('Attempting automatic audio start');
        handleStartAudio();
      }, 1000);
      
      return () => {
        document.removeEventListener('click', handleStartAudio);
        document.removeEventListener('touchstart', handleStartAudio);
        clearTimeout(timer);
      };
    }
  }, [audioStarted, handleStartAudio]);

  return (
    <div className="game-container" ref={containerRef} style={{ touchAction: 'none' }}>
      <div className="player-names">
        <span>{gameData.players[0]?.name || 'Player 1'}</span>
        <span>{gameData.players[1]?.name || 'Player 2'}</span>
      </div>
      <div className="score-board">
        <span>{gameData.score[0]}</span>
        <span>{gameData.score[1]}</span>
      </div>
      <canvas ref={canvasRef} />
      
      {/* Music controls with auto cursor */}
      <div className="music-controls-container" style={{ cursor: 'auto' }}>
        <div className="music-controls">
          {isGenomeMusicActive ? (
            <button onClick={resetToDefaultMusic} className="music-button">
              Reset to Default Music
            </button>
          ) : (
            <button onClick={handleGenomeMusicToggle} className="music-button">
              Use Genome Music
            </button>
          )}
        </div>
      </div>

      {/* Add a visible button to start audio if not started */}
      {!audioStarted && (
        <div className="audio-start-container" style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px',
          border: '2px solid rgb(116,113,203)',
          textAlign: 'center'
        }}>
          <button onClick={handleStartAudio} style={{
            fontFamily: 'Press Start 2P, monospace',
            fontSize: '1rem',
            padding: '15px 30px',
            background: 'rgb(116,113,203)',
            color: '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            Start Game Audio
          </button>
        </div>
      )}
    </div>
  );
};

export default Game; 