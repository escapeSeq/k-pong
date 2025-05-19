import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import '../styles/Welcome.css';
import { BACKEND_URL } from '../constants';
import soundManager from '../utils/soundManager';

const Welcome = ({ setGameState, savedUsername, onUsernameSet }) => {
  const [rankings, setRankings] = useState([]);
  const [showTitle, setShowTitle] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const titleRef = useRef();
  const navigate = useNavigate();

  // Fetch rankings on component mount
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        console.log('Fetching rankings...');
        
        // Use the backend as a proxy
        const response = await fetch(`${BACKEND_URL}/api/rankings/top?limit=10`, {
          method: 'GET',
          credentials: 'include', // Include cookies for CORS requests
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received rankings:', data);
        setRankings(data);
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
        // Use empty array instead of showing an error to the user
        setRankings([]);
      }
    };

    fetchRankings();

    // Set up socket listener for ranking updates
    const socket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('Rankings socket connected');
    });

    socket.on('rankingsUpdate', (newRankings) => {
      console.log('Received rankings update:', newRankings);
      setRankings(newRankings);
    });

    return () => socket.disconnect();
  }, []);

  // Add handler to start audio after user interaction
  const handleStartAudio = useCallback(() => {
    if (!audioStarted) {
      console.log('Starting audio from user interaction');
      setShowTitle(true);
      soundManager.playWithErrorHandling(
        () => soundManager.playIntroSound(),
        'Intro sound failed to play'
      );
      setAudioStarted(true);
    }
  }, [audioStarted]);

  // Add effect for title animation and sound
  useEffect(() => {
    // Show title animation without sound initially
    const timer = setTimeout(() => {
      setShowTitle(true);
    }, 100);

    // Setup click listener to start audio
    if (!audioStarted) {
      document.addEventListener('click', handleStartAudio, { once: true });
      document.addEventListener('touchstart', handleStartAudio, { once: true });
    }
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleStartAudio);
      document.removeEventListener('touchstart', handleStartAudio);
    };
  }, [audioStarted, handleStartAudio]);

  const handleStartGame = () => {
    // if we have a saved username, use it directly
    if (savedUsername) {
      setGameState(prev => ({
        ...prev,
        player1: {
          name: savedUsername,
          rating: 800
        }
      }));
      navigate('/game');
      return;
    }

    // Otherwise show the username modal
    const modal = document.createElement('dialog');
    modal.innerHTML = `
      <form method="dialog">
        <h2>Enter Your Username</h2>
        <input type="text" id="username" required minlength="2" maxlength="15">
        <div class="buttons">
          <button type="submit">Start Game</button>
        </div>
      </form>
    `;
    
    document.body.appendChild(modal);
    modal.showModal();

    modal.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      onUsernameSet(username); // Use the passed handler
      setGameState(prev => ({
        ...prev,
        player1: {
          name: username,
          rating: 800
        }
      }));
      navigate('/game');
      modal.remove();
    };
  };

  return (
    <div className="welcome">
      <div className={`title-container ${showTitle ? 'show' : ''}`}>
        <h1 className="game-title">K-PONG</h1>
        <div className="title-glow"></div>
      </div>
      
      <div className="menu">
        <button onClick={handleStartGame}>
          {savedUsername ? `Play as ${savedUsername}` : 'Start Game'}
        </button>
        <div className="instructions">
          <h2>How to Play</h2>
          <p>Move your paddle to hit the ball past your opponent!</p>
          <p>Use UP/DOWN arrow keys to move your paddle</p>
          <p>First to 5 points wins!</p>
        </div>
        
        <div className="rankings">
          <h2>Top Players</h2>
          <div className="rankings-list">
            {rankings.length > 0 ? (
              rankings.map((player, index) => (
                <div key={player.name} className="ranking-item">
                  <span className="rank">{index + 1}</span>
                  <span className="name">{player.name}</span>
                  <span className="rating">{player.rating}</span>
                  <span className="stats">{player.wins || 0}W/{player.losses || 0}L</span>
                </div>
              ))
            ) : (
              <div className="no-rankings">No players ranked yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 