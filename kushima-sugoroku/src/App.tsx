import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GameRoom from './pages/GameRoom';
import GamePlay from './pages/GamePlay';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
          <Route path="/play/:roomId" element={<GamePlay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
