import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { fetchGitHubPuzzles, getGitHubPuzzleCount } from '../data/simplePuzzles';
import type { ChessPuzzle } from '../data/simplePuzzles';
import { chessSounds } from '../utils/sounds';

interface PuzzleModeProps {
  onBackToMenu: () => void;
}

export const PuzzleMode: React.FC<PuzzleModeProps> = ({ onBackToMenu }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert' | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<ChessPuzzle | null>(null);
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('');
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [puzzles, setPuzzles] = useState<ChessPuzzle[]>([]);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hintClickCount, setHintClickCount] = useState(0);
  const [showWrongMoveReset, setShowWrongMoveReset] = useState(false);

  useEffect(() => {
    if (currentPuzzle) {
      const newGame = new Chess(currentPuzzle.fen);
      setGame(newGame);
      setPosition(currentPuzzle.fen);
      setSolutionIndex(0);
      setIsPlayerTurn(true);
      setIsCompleted(false);
      setHintClickCount(0);
      setShowWrongMoveReset(false);
      setMessage(`${currentPuzzle.title}: ${currentPuzzle.description}`);
      setMessageType('info');
    }
  }, [currentPuzzle]);

  const selectDifficulty = async (difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert') => {
    setSelectedDifficulty(difficulty);
    setIsLoading(true);
    
    try {
      const fetchedPuzzles = await fetchGitHubPuzzles(difficulty, 500);
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
      if (!move) {
        chessSounds.playIllegalMove();
        return false;
      }

      const expectedMove = currentPuzzle.solution[solutionIndex];
      const playerMove = from + to + (promotion || '');
      
      if (playerMove === expectedMove || move.san === expectedMove) {
        // Play appropriate sound
        if (move.san.includes('O-O')) {
          chessSounds.playCastle();
        } else if (move.promotion) {
          chessSounds.playPromote();
        } else if (move.captured) {
          chessSounds.playCapture();
        } else {
          chessSounds.playMove();
        }

        setPosition(game.fen());
        setSolutionIndex(prev => prev + 1);
        setIsPlayerTurn(false);
        
        if (solutionIndex + 1 >= currentPuzzle.solution.length) {
          chessSounds.playCheckmate();
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
        chessSounds.playIllegalMove();
        setMessage(`❌ That's not the right move. Try again!`);
        setMessageType('error');
        setShowWrongMoveReset(true);
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
      
      if (opponentMoveStr.length >= 4) {
        const from = opponentMoveStr.substring(0, 2);
        const to = opponentMoveStr.substring(2, 4);
        const promotion = opponentMoveStr.length > 4 ? opponentMoveStr[4] : undefined;
        move = newGame.move({ from, to, promotion });
      }
      
      if (!move) {
        move = newGame.move(opponentMoveStr);
      }
      
      if (move) {
        // Play appropriate sound
        if (move.san.includes('O-O')) {
          chessSounds.playCastle();
        } else if (move.promotion) {
          chessSounds.playPromote();
        } else if (move.captured) {
          chessSounds.playCapture();
        } else {
          chessSounds.playMove();
        }

        setGame(newGame);
        setPosition(newGame.fen());
        setSolutionIndex(currentIndex + 1);
        
        if (currentIndex + 1 >= currentPuzzle.solution.length) {
          chessSounds.playCheckmate();
          setIsCompleted(true);
          setMessage(`🎉 Puzzle solved! ${currentPuzzle.explanation}`);
          setMessageType('success');
        } else {
          setIsPlayerTurn(true);
          setMessage(`Opponent played ${move.san}. Your turn!`);
          setMessageType('info');
        }
      } else {
        chessSounds.playIllegalMove();
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
      setHintClickCount(0);
      setShowWrongMoveReset(false);
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
      const morePuzzles = await fetchGitHubPuzzles(selectedDifficulty, 100);
      setPuzzles(prev => [...prev, ...morePuzzles]);
    } catch (error) {
      console.error('Failed to load more puzzles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHint = () => {
    if (!currentPuzzle) return;
    
    if (hintClickCount === 0) {
      if (currentPuzzle.hint && selectedDifficulty !== 'expert') {
        setMessage(`💡 Hint: ${currentPuzzle.hint}`);
        setMessageType('info');
      } else {
        setMessage(`💡 Next move: ${currentPuzzle.solution[solutionIndex]}`);
        setMessageType('info');
      }
      setHintClickCount(1);
    } else if (hintClickCount === 1) {
      setMessage(`💡 Solution: ${currentPuzzle.solution.join(' → ')}. ${currentPuzzle.explanation || ''}`);
      setMessageType('info');
      setHintClickCount(2);
    }
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
      id: 'advanced' as const,
      label: 'Advanced',
      tag: '1600 – 2000',
      features: ['Mate in 3', 'Sacrifices', 'Complex patterns', 'Hints available'],
    },
    {
      id: 'expert' as const,
      label: 'Expert',
      tag: '2000 – 2500',
      features: ['Mate in 4+', 'Master level', 'Famous patterns', 'No hints'],
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
            overflow: 'auto',
            width: '100%',
            maxWidth: '960px',
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg)',
      color: 'var(--text-primary)',
    }}>
      {/* Minimal Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button onClick={onBackToMenu} className="secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          ← Back
        </button>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={toggleHint} className="secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {hintClickCount === 0 ? '💡 Hint' : hintClickCount === 1 ? '💡 Solution' : '✓ Shown'}
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={previousPuzzle} disabled={currentPuzzleIndex <= 0} className="secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
              ←
            </button>
            <button onClick={nextPuzzle} className={isCompleted ? 'primary' : 'secondary'} style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
              →
            </button>
          </div>
        </div>
      </div>

      {/* Board Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
        {/* Message */}
        {message && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem 1.25rem',
            background: messageType === 'success' ? 'rgba(34, 197, 94, 0.1)' : messageType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
            border: `1px solid ${messageType === 'success' ? 'rgba(34, 197, 94, 0.3)' : messageType === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            maxWidth: '600px',
            textAlign: 'center',
          }}>
            {message}
          </div>
        )}

        {/* Board */}
        {currentPuzzle && (
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 'min(85vw, calc(100vh - 250px), 500px)',
              height: 'min(85vw, calc(100vh - 250px), 500px)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}>
              <Chessboard
                options={{
                  position,
                  boardOrientation: currentPuzzle?.playerToMove || 'white',
                  onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? onDrop(sourceSquare, targetSquare) : false
                }}
              />
            </div>

            {/* Reset Button Overlay (only on wrong move) */}
            {showWrongMoveReset && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}>
                <button 
                  onClick={resetPuzzle}
                  className="primary"
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  🔄 Reset Puzzle
                </button>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <button 
                className="secondary" 
                onClick={() => {
                  setSelectedDifficulty(null);
                  setCurrentPuzzle(null);
                  setGame(new Chess());
                  setPosition('');
                  setMessage('');
                  setMessageType('info');
                  setSolutionIndex(0);
                  setIsPlayerTurn(true);
                  setIsCompleted(false);
                }}
              >
                ← Change Difficulty
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {currentPuzzle?.category} • {currentPuzzle?.rating}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Puzzle Info */}
        {currentPuzzle && (
          <div style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '1.5rem',
          }}>
            <span>#{currentPuzzleIndex + 1} / {puzzles.length}</span>
            <span>Rating: {currentPuzzle.rating}</span>
            <span>{solutionIndex}/{currentPuzzle.solution.length} moves</span>
          </div>
        )}
      </div>
    </div>
  );
};
