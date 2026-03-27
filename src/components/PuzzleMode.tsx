import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { fetchGitHubPuzzles, getRandomGitHubPuzzle, getGitHubPuzzleCount } from '../data/simplePuzzles';
import type { ChessPuzzle } from '../data/simplePuzzles';

interface PuzzleModeProps {
  onBackToMenu: () => void;
}

export const PuzzleMode: React.FC<PuzzleModeProps> = ({ onBackToMenu }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'expert' | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<ChessPuzzle | null>(null);
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('');
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const [puzzles, setPuzzles] = useState<ChessPuzzle[]>([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentPuzzle) {
      const newGame = new Chess(currentPuzzle.fen);
      setGame(newGame);
      setPosition(currentPuzzle.fen);
      setSolutionIndex(0);
      setIsPlayerTurn(true);
      setIsCompleted(false);
      setShowHint(false);
      setMessage(`${currentPuzzle.title}: ${currentPuzzle.description}`);
      setMessageType('info');
    }
  }, [currentPuzzle]);

  const selectDifficulty = async (difficulty: 'beginner' | 'intermediate' | 'expert') => {
    setSelectedDifficulty(difficulty);
    setIsLoading(true);
    
    try {
      const fetchedPuzzles = await fetchGitHubPuzzles(difficulty, 50);
      setPuzzles(fetchedPuzzles);
      setCurrentPuzzleIndex(0);
      
      if (fetchedPuzzles.length > 0) {
        setCurrentPuzzle(fetchedPuzzles[0]);
      }
    } catch (error) {
      console.error('Failed to load puzzles:', error);
      setMessage('Failed to load puzzles. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const makeMove = (from: string, to: string, promotion?: string): boolean => {
    if (!currentPuzzle || isCompleted || !isPlayerTurn) return false;

    try {
      const move = game.move({ from, to, promotion: promotion || 'q' });
      if (!move) return false;

      const expectedMove = currentPuzzle.solution[solutionIndex];
      const playerMove = from + to + (promotion || '');
      
      // Compare UCI format (e.g., 'e1e8' or 'e7e8q')
      if (playerMove === expectedMove || move.san === expectedMove) {
        // Correct move
        setPosition(game.fen());
        setSolutionIndex(prev => prev + 1);
        setIsPlayerTurn(false);
        
        if (solutionIndex + 1 >= currentPuzzle.solution.length) {
          setIsCompleted(true);
          setMessage(`🎉 Puzzle solved! ${currentPuzzle.explanation}`);
          setMessageType('success');
        } else {
          setMessage(`✓ Correct! Wait for opponent's response...`);
          setMessageType('success');
          
          const nextIndex = solutionIndex + 1;
          setTimeout(() => {
            makeOpponentMove(nextIndex);
          }, 1500);
        }
        return true;
      } else {
        game.undo();
        setMessage(`❌ That's not the right move. Try again!`);
        setMessageType('error');
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const makeOpponentMove = (moveIndex?: number) => {
    const currentIndex = moveIndex ?? solutionIndex;
    
    if (!currentPuzzle || isCompleted || currentIndex >= currentPuzzle.solution.length) return;

    const opponentMoveStr = currentPuzzle.solution[currentIndex];
    
    try {
      const newGame = new Chess(game.fen());
      let move;
      
      // Try UCI format first (e.g., 'e1e8')
      if (opponentMoveStr.length >= 4) {
        const from = opponentMoveStr.substring(0, 2);
        const to = opponentMoveStr.substring(2, 4);
        const promotion = opponentMoveStr.length > 4 ? opponentMoveStr[4] : undefined;
        move = newGame.move({ from, to, promotion });
      }
      
      // If UCI failed, try SAN format
      if (!move) {
        move = newGame.move(opponentMoveStr);
      }
      
      if (move) {
        setGame(newGame);
        setPosition(newGame.fen());
        setSolutionIndex(currentIndex + 1);
        
        if (currentIndex + 1 >= currentPuzzle.solution.length) {
          setIsCompleted(true);
          setMessage(`🎉 Puzzle solved! ${currentPuzzle.explanation}`);
          setMessageType('success');
        } else {
          setIsPlayerTurn(true);
          setMessage(`Opponent played ${move.san}. Your turn!`);
          setMessageType('info');
        }
      } else {
        setMessage(`❌ Error: Invalid opponent move ${opponentMoveStr}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error making opponent move: ${error}`);
      setMessageType('error');
    }
  };
  const onDrop = (sourceSquare: string, targetSquare: string) => {
    return makeMove(sourceSquare, targetSquare);
  };

  const resetPuzzle = () => {
    if (currentPuzzle) {
      const newGame = new Chess(currentPuzzle.fen);
      setGame(newGame);
      setPosition(currentPuzzle.fen);
      setSolutionIndex(0);
      setIsPlayerTurn(true);
      setIsCompleted(false);
      setShowHint(false);
      setMessage(`${currentPuzzle.title}: ${currentPuzzle.description}`);
      setMessageType('info');
    }
  };

  const nextPuzzle = () => {
    if (puzzles.length === 0) return;
    
    const nextIndex = currentPuzzleIndex + 1;
    if (nextIndex < puzzles.length) {
      setCurrentPuzzleIndex(nextIndex);
      setCurrentPuzzle(puzzles[nextIndex]);
    } else {
      setMessage('🎊 You\'ve reached the end! Loading more puzzles...');
      setMessageType('info');
      // Load more puzzles
      if (selectedDifficulty) {
        loadMorePuzzles();
      }
    }
  };

  const previousPuzzle = () => {
    if (puzzles.length === 0) return;
    
    const prevIndex = currentPuzzleIndex - 1;
    if (prevIndex >= 0) {
      setCurrentPuzzleIndex(prevIndex);
      setCurrentPuzzle(puzzles[prevIndex]);
    }
  };

  const loadMorePuzzles = async () => {
    if (!selectedDifficulty || isLoading) return;
    
    setIsLoading(true);
    try {
      const morePuzzles = await fetchGitHubPuzzles(selectedDifficulty, 20);
      setPuzzles(prev => [...prev, ...morePuzzles]);
    } catch (error) {
      console.error('Failed to load more puzzles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomPuzzle = async () => {
    if (!selectedDifficulty) return;
    
    setIsLoading(true);
    try {
      const randomPuzzle = await getRandomGitHubPuzzle(selectedDifficulty);
      if (randomPuzzle) {
        setCurrentPuzzle(randomPuzzle);
        // Add to puzzles array if not already there
        if (!puzzles.find(p => p.id === randomPuzzle.id)) {
          setPuzzles(prev => [...prev, randomPuzzle]);
          setCurrentPuzzleIndex(puzzles.length);
        }
      }
    } catch (error) {
      console.error('Failed to load random puzzle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHint = () => {
    if (currentPuzzle?.hint && selectedDifficulty !== 'expert') {
      setShowHint(!showHint);
    }
  };

  const showSolution = () => {
    if (!currentPuzzle) return;
    setMessage(`💡 Solution: ${currentPuzzle.solution.join(', ')}. ${currentPuzzle.explanation}`);
    setMessageType('info');
  };
  const DIFFICULTIES = [
    {
      id: 'beginner' as const,
      label: 'Beginner',
      tag: '600 – 1200',
      features: ['Mate in 1', 'Simple captures', 'Basic tactics', 'Hints available'],
    },
    {
      id: 'intermediate' as const,
      label: 'Intermediate',
      tag: '1200 – 1800',
      features: ['Mate in 2', 'Complex tactics', 'Small sacrifices', 'Hints available'],
    },
    {
      id: 'expert' as const,
      label: 'Expert',
      tag: '1800 – 2500',
      features: ['Mate in 3–4', 'Complex sacrifices', 'Advanced tactics', 'No hints'],
    },
  ];

  if (!selectedDifficulty) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
        background: 'var(--bg)',
        color: 'var(--text-primary)',
        padding: '2rem 1rem',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.1rem', fontWeight: 500 }}>
          Tactics
        </p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.05em', color: 'var(--white)', marginBottom: '0.6rem', textAlign: 'center', lineHeight: 1 }}>
          Chess Puzzles
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '3rem', textAlign: 'center' }}>
          Select a difficulty to begin.
        </p>

        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border-mid)', borderTopColor: 'var(--white)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading puzzles…
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '720px',
          }}>
            {DIFFICULTIES.map((d, i) => (
              <div
                key={d.id}
                onClick={() => selectDifficulty(d.id)}
                style={{
                  background: 'var(--bg-card)',
                  padding: '1.75rem 1.5rem',
                  cursor: 'pointer',
                  transition: 'background var(--transition)',
                  animationDelay: `${i * 0.06}s`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                <p style={{ fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>
                  {d.tag} rating
                </p>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--white)', marginBottom: '1rem' }}>
                  {d.label}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem' }}>
                  {d.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gray-600)', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {getGitHubPuzzleCount(d.id)} puzzles
                </p>
              </div>
            ))}
          </div>
        )}

        <button className="secondary" onClick={onBackToMenu} style={{ marginTop: '2.5rem' }}>
          ← Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="puzzle-content" style={{
      display: 'flex',
      height: '100%',
      background: 'var(--bg)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <div className="puzzle-sidebar" style={{
        width: '280px',
        background: 'var(--bg-raised)',
        padding: '1.25rem',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onBackToMenu} style={{ color: 'var(--text-muted)', padding: '0.25rem', fontSize: '1rem' }}>←</button>
          <div>
            <p style={{ fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              {selectedDifficulty}
            </p>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--white)', margin: 0 }}>
              Puzzles
            </h2>
          </div>
        </div>

        {/* Message */}
        <div style={{
          background: 'var(--bg-card)',
          border: `1px solid ${messageType === 'success' ? 'var(--border-mid)' : messageType === 'error' ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem',
          fontSize: '0.78rem',
          lineHeight: 1.5,
          color: messageType === 'success' ? 'var(--text-primary)' : messageType === 'error' ? 'var(--gray-400)' : 'var(--text-secondary)',
        }}>
          {message}
        </div>

        {/* Hint */}
        {currentPuzzle?.hint && selectedDifficulty !== 'expert' && (
          <div>
            <button
              onClick={toggleHint}
              className="secondary"
              style={{ width: '100%', fontSize: '0.78rem', padding: '0.55rem 0.9rem' }}
            >
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
            {showHint && (
              <div style={{
                marginTop: '0.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}>
                {currentPuzzle.hint}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="secondary" onClick={resetPuzzle} style={{ fontSize: '0.78rem', padding: '0.55rem 0.9rem' }}>
            Reset Puzzle
          </button>
          <button className="secondary" onClick={getRandomPuzzle} disabled={isLoading} style={{ fontSize: '0.78rem', padding: '0.55rem 0.9rem' }}>
            {isLoading ? 'Loading…' : 'Random Puzzle'}
          </button>
          <button className="secondary" onClick={showSolution} style={{ fontSize: '0.78rem', padding: '0.55rem 0.9rem' }}>
            Show Solution
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="secondary" onClick={previousPuzzle} disabled={currentPuzzleIndex <= 0} style={{ flex: 1, fontSize: '0.78rem', padding: '0.55rem 0.5rem' }}>
              ← Prev
            </button>
            <button
              className={isCompleted ? 'primary' : 'secondary'}
              onClick={nextPuzzle}
              disabled={isLoading}
              style={{ flex: 1, fontSize: '0.78rem', padding: '0.55rem 0.5rem' }}
            >
              {isLoading ? '…' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Puzzle info */}
        {currentPuzzle && (
          <div style={{
            marginTop: 'auto',
            padding: '0.9rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Puzzle</span>
              <span style={{ color: 'var(--text-secondary)' }}>{currentPuzzleIndex + 1} / {puzzles.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Rating</span>
              <span style={{ color: 'var(--text-secondary)' }}>{currentPuzzle.rating}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Progress</span>
              <span style={{ color: 'var(--text-secondary)' }}>{solutionIndex}/{currentPuzzle.solution.length} moves</span>
            </div>
            <div style={{ marginTop: '0.25rem', color: isCompleted ? 'var(--gray-300)' : isPlayerTurn ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 600 }}>
              {isCompleted ? 'Solved' : isPlayerTurn ? 'Your turn' : "Opponent's turn"}
            </div>
          </div>
        )}
      </div>

      {/* Board */}
      <div className="puzzle-board-area" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        {currentPuzzle && (
          <div className="puzzle-board-inner" style={{
            width: 'min(calc(100vh - 120px), calc(100vw - 300px), 520px)',
            height: 'min(calc(100vh - 120px), calc(100vw - 300px), 520px)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            aspectRatio: '1',
            maxWidth: '520px',
            maxHeight: '520px',
          }}>
            <Chessboard
              options={{
                position,
                boardOrientation: currentPuzzle?.playerToMove || 'white',
                onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? onDrop(sourceSquare, targetSquare) : false
              }}
            />
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .puzzle-board-inner {
            width: min(calc(100vw - 1rem), calc(100vh - 320px)) !important;
            height: min(calc(100vw - 1rem), calc(100vh - 320px)) !important;
            max-width: 420px !important;
            max-height: 420px !important;
          }
        }
        @media (max-width: 480px) {
          .puzzle-board-inner {
            width: min(calc(100vw - 1rem), calc(100vh - 300px)) !important;
            height: min(calc(100vw - 1rem), calc(100vh - 300px)) !important;
            max-width: 360px !important;
            max-height: 360px !important;
          }
        }
      `}</style>
    </div>
  );
};