import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { UserProfile } from './components/UserProfile';
import { ChessGame } from './components/ChessGame';
import { Learn } from './components/Learn';
import { PuzzleMode } from './components/PuzzleMode';
import { OnlinePlay } from './components/OnlinePlay';
import { GameHistory } from './components/GameHistory';
import type { GameMode, SavedGame } from './types';
import './App.css';
import { useTaptic } from 'taptickit/react';

const NAV_ITEMS = [
  {
    id: 'play', label: 'Play',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    )
  },
  {
    id: 'puzzles', label: 'Puzzles',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
      </svg>
    )
  },
  {
    id: 'learn', label: 'Learn',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
      </svg>
    )
  },
  {
    id: 'history', label: 'History',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
      </svg>
    )
  },
  {
    id: 'analyze', label: 'Analyze',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
    )
  },
];

const PLAY_MODES = [
  { id: 'online', label: 'Play Online', desc: 'Challenge players worldwide', icon: '⚡', mode: null },
  { id: 'local',  label: 'Local Play',  desc: 'Pass & play on one device',   icon: '♟',  mode: 'local' as GameMode },
  { id: 'bot',    label: 'Play Bots',   desc: 'Train against the engine',    icon: '🤖', mode: 'vsBot' as GameMode },
  { id: 'puzzle', label: 'Puzzles',     desc: 'Sharpen your tactics',        icon: '🧩', mode: null },
];

function ChessApp() {
  const { trigger } = useTaptic();
  const [mode, setMode] = useState<GameMode>('local');
  const [currentPage, setCurrentPage] = useState('play');
  const [gameStarted, setGameStarted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnlinePlay, setShowOnlinePlay] = useState(false);
  const [selectedGame, setSelectedGame] = useState<SavedGame | null>(null);

  const renderContent = () => {
    switch (currentPage) {
      case 'play':
        if (showOnlinePlay) {
          return (
            <div className="animate-slide-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <OnlinePlay 
                onBackToMenu={() => setShowOnlinePlay(false)}
              />
            </div>
          );
        }
        if (!gameStarted) {
          return (
            <div className="page-scroll" style={{ display: 'flex', flex: 1 }}>
              <div className="play-home animate-fade-in" style={{ flex: 1 }}>
              <p className="play-home-eyebrow">Xhess Masters</p>
              <h1 className="play-home-heading">Your move.</h1>
              <p className="play-home-sub">Choose how you want to play today.</p>
              <div className="play-mode-grid">
                {PLAY_MODES.map((pm, i) => (
                  <button
                    key={pm.id}
                    className="play-mode-button animate-scale-in"
                    style={{ animationDelay: `${i * 0.06}s` }}
                    onClick={() => {
                      if (pm.id === 'online') {
                        setShowOnlinePlay(true);
                      } else if (pm.mode) { 
                        setMode(pm.mode); 
                        setGameStarted(true); 
                      } else if (pm.id === 'puzzle') {
                        setCurrentPage('puzzles');
                      }
                    }}
                  >
                    <span className="play-mode-button-icon">{pm.icon}</span>
                    {pm.label}
                    <span className="play-mode-button-desc">{pm.desc}</span>
                  </button>
                ))}
              </div>
              </div>
            </div>
          );
        }
        return (
          <div className="animate-slide-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ChessGame mode={mode} timeControl={undefined} key={mode} onBackToMenu={() => setGameStarted(false)} />
          </div>
        );

      case 'puzzles':
        return <div className="animate-slide-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}><PuzzleMode onBackToMenu={() => setCurrentPage('play')} /></div>;

      case 'learn':
        return <div className="animate-slide-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}><Learn /></div>;

      case 'history':
        return (
          <div className="animate-slide-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <GameHistory 
              onSelectGame={(game) => {
                setSelectedGame(game);
                setCurrentPage('analyze');
              }}
              onBack={() => setCurrentPage('play')}
            />
          </div>
        );

      case 'analyze':
        return <div className="animate-slide-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ChessGame 
            mode="analyze" 
            savedGame={selectedGame}
            key={selectedGame?.id || 'analyze'}
            onBackToMenu={() => {
              setSelectedGame(null);
              setCurrentPage(selectedGame ? 'history' : 'play');
            }}
          />
        </div>;

      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
            <div className="card animate-fade-in" style={{ textAlign: 'center', maxWidth: '480px', padding: '3rem 2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--white)' }}>
                {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Coming soon.</p>
              <button className="primary" onClick={() => setCurrentPage('play')}>Go to Play</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`left-panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo row */}
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon">
              <img src="/chess-pawn.svg" alt="Chess Pawn" style={{ width: '14px', height: '14px' }} />
            </span>
            {!sidebarCollapsed && <span className="panel-title-text">Xhess Masters</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <nav className="panel-nav">
          {!sidebarCollapsed && <span className="nav-section-label">Menu</span>}

          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-button ${currentPage === item.id ? 'active' : ''} ${sidebarCollapsed ? 'icon-only' : ''}`}
              onClick={() => {
                trigger('selection');
                setCurrentPage(item.id);
                if (item.id === 'play') {
                  setGameStarted(false);
                  setShowOnlinePlay(false);
                }
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}

          {/* User Profile at bottom of nav */}
          <div className="nav-user-profile">
            <UserProfile showUsername={true} />
          </div>

          {/* Mobile-only user profile button */}
          <div className="nav-user-profile-mobile">
            <UserProfile iconOnly={true} />
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/*" element={<ChessApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
