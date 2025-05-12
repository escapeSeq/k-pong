import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { STORAGE_KEY } from '../constants';
import '../styles/GameOver.css';

const GameOver = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state;

  if (!result) {
    navigate('/');
    return null;
  }

  const handlePlayAgain = () => {
    // Don't clear the username, just navigate back
    navigate('/');
  };

  return (
    <div className="game-over">
      <h1>{result.message}</h1>
      <div className="stats">
        <p>Final Score: {result.finalScore[0]} - {result.finalScore[1]}</p>
        <p>New Rating: {result.rating}</p>
        <p>Game Duration: {Math.round((result.stats.duration || 0) / 1000)}s</p>
        <p>Total Hits: {result.stats.hits || 0}</p>
      </div>
      <button onClick={handlePlayAgain}>Play Again</button>
    </div>
  );
};

export default GameOver; 