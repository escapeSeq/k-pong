import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import '../styles/Welcome.css';
import { BACKEND_URL } from '../constants';
import soundManager from '../utils/soundManager';

const Welcome = ({ setGameState, savedUsername, onUsernameSet }) => {
  const [rankings, setRankings] = useState([]);
  const [showTitle, setShowTitle] = useState(false);
  const titleRef = useRef();
  const navigate = useNavigate();

  // Fetch rankings on component mount
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        console.log('Fetching rankings...');
        const response = await fetch(`${BACKEND_URL}/rankings`);
        const data = await response.json();
        console.log('Received rankings:', data);
        setRankings(data);
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
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

  // Add effect for title animation and sound
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(true);
      
      soundManager.playWithErrorHandling(
        () => soundManager.playIntroSound(),
        'Intro sound failed to play'
      );
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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
          <button type="submit">Random Opponent</button>
          <button type="button" id="inviteBtn">Send Invite</button>
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

    modal.querySelector('#inviteBtn').onclick = () => {
      const username = document.getElementById('username').value;
      if (username.length >= 2) {
        onUsernameSet(username); // Use the passed handler
        setGameState(prev => ({
          ...prev,
          player1: {
            name: username,
            rating: 800
          },
          gameMode: 'invite'
        }));
        navigate('/game');
        modal.remove();
      }
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
            {rankings.map((player, index) => (
              <div key={player.name} className="ranking-item">
                <span className="rank">{index + 1}</span>
                <span className="name">{player.name}</span>
                <span className="rating">{player.rating}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 