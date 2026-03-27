import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserGames, deleteGame } from '../services/gameService';
import type { SavedGame } from '../types';

interface GameHistoryProps {
  onSelectGame: (game: SavedGame) => void;
  onBack: () => void;
}

export const GameHistory: React.FC<GameHistoryProps> = ({ onSelectGame, onBack }) => {
  const { currentUser } = useAuth();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
  }, [currentUser]);

  const loadGames = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const userGames = await getUserGames(currentUser.uid);
      setGames(userGames);
    } catch (error: any) {
      console.error('Failed to load games:', error);
      
      // Check for specific error types
      if (error?.message?.includes('not found') || error?.message?.includes('Database')) {
        setError('Firestore database not set up. Go to Firebase Console → Firestore Database → Create database');
      } else if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        setError('Database index required. Check browser console for setup link.');
      } else if (error?.code === 'permission-denied') {
        setError('Permission denied. Make sure Firestore security rules are configured.');
      } else {
        setError('Failed to load games. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this game?')) return;
    
    try {
      await deleteGame(gameId);
      setGames(games.filter(g => g.id !== gameId));
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGameTitle = (game: SavedGame) => {
    if (game.gameMode === 'online') return 'Online Game';
    if (game.gameMode === 'vsBot') return `vs ${game.botDifficulty || 'Bot'}`;
    return 'Local Game';
  };

  const getResultText = (game: SavedGame) => {
    if (game.result === 'white') return '1-0';
    if (game.result === 'black') return '0-1';
    if (game.result === 'draw') return '½-½';
    return 'Ongoing';
  };

  const getResultColor = (game: SavedGame) => {
    if (game.result === 'white') return game.playerColor === 'white' ? '#10b981' : '#ef4444';
    if (game.result === 'black') return game.playerColor === 'black' ? '#10b981' : '#ef4444';
    return 'var(--text-muted)';
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '2rem',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.1rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-raised)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button 
            onClick={onBack}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Back
          </button>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--white)',
            letterSpacing: '-0.02em'
          }}>
            Game History
          </h2>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.5rem' }}>
              {error}
            </div>
            <button
              onClick={loadGames}
              style={{
                marginTop: '1rem',
                padding: '0.6rem 1.2rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.1rem 1.75rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-raised)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <button 
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
        <h2 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--white)',
          letterSpacing: '-0.02em'
        }}>
          Game History
        </h2>
      </div>

      {/* Games List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem'
      }}>
        {games.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>♟️</div>
            <div style={{ fontSize: '0.9rem' }}>No saved games yet</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Play some games to see them here
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {games.map(game => (
              <div
                key={game.id}
                onClick={() => onSelectGame(game)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--white)',
                      marginBottom: '0.25rem'
                    }}>
                      {getGameTitle(game)}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)'
                    }}>
                      {formatDate(game.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(game.id, e)}
                    style={{
                      padding: '0.25rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {game.moves.length} moves
                  </div>
                  <div style={{
                    marginLeft: 'auto',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: getResultColor(game)
                  }}>
                    {getResultText(game)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
