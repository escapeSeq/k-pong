import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './components/Welcome';
import Game from './components/Game';
import GameOver from './components/GameOver';
import './styles/App.css';
import { STORAGE_KEY } from './constants';

function App() {
  const [gameState, setGameState] = useState({
    player1: null,
    player2: null,
    gameMode: null,
  });

  const [username, setUsername] = useState(() => {
    // Initialize from localStorage using the same key
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  // Handle username updates
  const handleUsernameSet = (newUsername) => {
    setUsername(newUsername);
    localStorage.setItem(STORAGE_KEY, newUsername);
    setGameState(prev => ({
      ...prev,
      player1: {
        name: newUsername,
        rating: 800
      }
    }));
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              <Welcome 
                setGameState={setGameState} 
                savedUsername={username}
                onUsernameSet={handleUsernameSet}
              />
            } 
          />
          <Route 
            path="/game" 
            element={
              <Game 
                gameState={gameState} 
                onUsernameSet={handleUsernameSet}
                username={username}
              />
            } 
          />
          <Route 
            path="/game-over" 
            element={
              <GameOver 
                savedUsername={username}
                onPlayAgain={() => {
                  setGameState(prev => ({
                    ...prev,
                    player1: {
                      name: username,
                      rating: 800
                    }
                  }));
                }}
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 