import React, { useState, useEffect, useRef } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { socketService, type GameRoom, type Player } from '../services/socketService';
import { useAuth } from '../contexts/AuthContext';
import { chessSounds } from '../utils/sounds';
import { saveGame } from '../services/gameService';

interface OnlineGameProps {
  timeControl: string;
  gameMode: 'create' | 'join' | 'matchmaking';
  roomId?: string;
  onBackToMenu: () => void;
}

interface CapturedPieces {
  p: number;
  n: number;
  b: number;
  r: number;
  q: number;
}

const PIECE_VALUES: { [key: string]: number } = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

export const OnlineGame: React.FC<OnlineGameProps> = ({ 
  timeControl, 
  gameMode, 
  roomId: initialRoomId, 
  onBackToMenu 
}) => {
  const { currentUser } = useAuth();
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState(game.fen());
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [playerName] = useState(currentUser?.displayName || currentUser?.email || 'Anonymous');
  const [showNameInput, setShowNameInput] = useState(gameMode === 'join' && !initialRoomId); // Only show input for join mode without room code
  const [roomCode, setRoomCode] = useState(initialRoomId || '');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [gameResult, setGameResult] = useState<{ winner?: 'white' | 'black'; reason: string } | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<{ 
    white: CapturedPieces;
    black: CapturedPieces;
  }>({
    white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    black: { p: 0, n: 0, b: 0, r: 0, q: 0 }
  });
  const [timeLeft, setTimeLeft] = useState<{ white: number; black: number }>({ white: 0, black: 0 });
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [promotionMove, setPromotionMove] = useState<{ from: string; to: string } | null>(null);
  const [opponentName, setOpponentName] = useState<string>('');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  const gameRef = useRef(game);
  gameRef.current = game;
  const initializedRef = useRef(false);
  const tenSecondsPlayedRef = useRef(false);
  const moveCountRef = useRef(0);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const gameRoomRef = useRef(gameRoom);
  gameRoomRef.current = gameRoom;
  const playerColorRef = useRef(playerColor);
  playerColorRef.current = playerColor;

  // Calculate material advantage
  const calculateMaterialAdvantage = (forColor: 'white' | 'black'): number => {
    const myCaptured = capturedPieces[forColor];
    const opponentCaptured = forColor === 'white' ? capturedPieces.black : capturedPieces.white;
    
    const myMaterial = Object.entries(myCaptured).reduce((sum, [piece, count]) => 
      sum + (PIECE_VALUES[piece] || 0) * count, 0
    );
    
    const opponentMaterial = Object.entries(opponentCaptured).reduce((sum, [piece, count]) => 
      sum + (PIECE_VALUES[piece] || 0) * count, 0
    );
    
    return myMaterial - opponentMaterial;
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setCapturedPieces({
      white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      black: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    });
    setGameResult(null);
    setLastMove(null);
    
    const initializeConnection = async () => {
      try {
        await socketService.connect();
        setupSocketListeners();
        
        // Automatically start the game since we have the user's name
        setConnectionError(null);
        
        if (gameMode === 'create') {
          const room = await socketService.createRoom(timeControl, playerName);
          setGameRoom(room);
          setRoomCode(room.id);
          setGameStatus('waiting');
        } else if (gameMode === 'join' && roomCode) {
          const room = await socketService.joinRoom(roomCode, playerName);
          setGameRoom(room);
          setGameStatus('waiting');
        } else if (gameMode === 'matchmaking') {
          const room = await socketService.findOpponent(timeControl, playerName);
          setGameRoom(room);
          setGameStatus(room.status);
        }
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnectionError(error instanceof Error ? error.message : 'Failed to connect to server. Please try again.');
      }
    };

    initializeConnection();

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  // Listen for real-time timer updates from server
  useEffect(() => {
    socketService.onTimeUpdate((timeLeft) => {
      setTimeLeft(timeLeft);
    });
  }, []);

  // Play check/checkmate sounds when game state changes
  useEffect(() => {
    if (game.inCheck()) {
      if (game.isCheckmate()) {
        chessSounds.playCheckmate();
      } else {
        chessSounds.playCheck();
      }
    }
  }, [position]); // Listen to position changes

  // Play 10 seconds warning when clock hits exactly 10 seconds
  useEffect(() => {
    if (!playerColor || gameStatus !== 'playing') return;
    
    const myTime = playerColor === 'white' ? timeLeft.white : timeLeft.black;
    
    if (myTime === 10 && !tenSecondsPlayedRef.current) {
      chessSounds.playTenSeconds();
      tenSecondsPlayedRef.current = true;
    } else if (myTime > 10) {
      // Reset when time goes back above 10 (new game, increment, etc.)
      tenSecondsPlayedRef.current = false;
    }
  }, [timeLeft, playerColor, gameStatus]);

  const calculateCapturedPiecesFromFEN = (fen: string) => {
    const startingPieces = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const currentPieces = { white: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, black: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
    
    const position = fen.split(' ')[0];
    for (const char of position) {
      if (char === '/') continue;
      if (char >= '1' && char <= '8') continue;
      
      const piece = char.toLowerCase() as keyof typeof startingPieces;
      const color = char === char.toUpperCase() ? 'white' : 'black';
      if (currentPieces[color][piece] !== undefined) {
        currentPieces[color][piece]++;
      }
    }
    
    const captured = {
      white: { p: 0, n: 0, b: 0, r: 0, q: 0 } as CapturedPieces,
      black: { p: 0, n: 0, b: 0, r: 0, q: 0 } as CapturedPieces
    };
    
    (['p', 'n', 'b', 'r', 'q'] as const).forEach(piece => {
      captured.white[piece] = startingPieces[piece] - currentPieces.black[piece];
      captured.black[piece] = startingPieces[piece] - currentPieces.white[piece];
    });
    
    return captured;
  };

  const setupSocketListeners = () => {
    socketService.onGameUpdate((room: GameRoom) => {
      setGameRoom(room);
      setGameStatus(room.status);

      const newGame = new Chess(room.fen);
      setGame(newGame);
      setPosition(room.fen);

      // Detect opponent move and play sound
      const newMoveCount = room.moves?.length || 0;
      if (newMoveCount > moveCountRef.current && moveCountRef.current > 0) {
        const lastMoveSan = room.moves[newMoveCount - 1];
        if (lastMoveSan) {
          // Parse SAN to detect move type
          if (lastMoveSan.includes('O-O')) {
            chessSounds.playCastle();
          } else if (lastMoveSan.includes('=')) {
            chessSounds.playPromote();
          } else if (lastMoveSan.includes('x')) {
            chessSounds.playCapture();
          } else if (lastMoveSan.includes('#')) {
            chessSounds.playCheckmate();
          } else if (lastMoveSan.includes('+')) {
            chessSounds.playCheck();
          } else {
            chessSounds.playMove();
          }
        }
        // Reset click-to-move selection on opponent move
        setSelectedSquare(null);
        setLegalMoves([]);
      }
      moveCountRef.current = newMoveCount;

      // Calculate captured pieces from FEN
      const captured = calculateCapturedPiecesFromFEN(room.fen);
      setCapturedPieces(captured);

      if (room.timeLeft) {
        setTimeLeft(room.timeLeft);
      }

      const socketId = socketService.getSocketId();
      if (room.players.white === socketId) {
        setPlayerColor('white');
        setOpponentName(room.playerNames?.[room.players.black || ''] || 'Opponent');
      } else if (room.players.black === socketId) {
        setPlayerColor('black');
        setOpponentName(room.playerNames?.[room.players.white || ''] || 'Opponent');
      }
    });

    socketService.onPlayerJoined((_player: Player) => {
      // Player joined
    });

    socketService.onGameEnd((result) => {
      setGameResult(result);
      setGameStatus('finished');

      // Save game to Firebase using refs to get latest values
      const currentUser = currentUserRef.current;
      const gameRoom = gameRoomRef.current;
      const playerColor = playerColorRef.current;
      const currentGame = gameRef.current;

      if (currentUser && gameRoom && currentGame) {
        // Use the local game state to get all moves including the final one
        const pgn = currentGame.pgn();
        const finalFen = currentGame.fen();
        const gameResult = result.winner ? result.winner : 'draw';

        // Use chess.js history() with verbose: false to get SAN notation strings
        const moves = currentGame.history({ verbose: false });

        saveGame({
          userId: currentUser.uid,
          gameMode: 'online',
          playerColor: playerColor || undefined,
          moves,
          result: gameResult,
          createdAt: Date.now(),
          pgn,
          finalFen
        }).catch(error => {
          console.error('Failed to save online game:', error);
        });
      }
    });

    // Error handling done via try/catch in API calls
  };

  const handleJoinGameWithCode = async () => {
    if (!roomCode.trim()) {
      setConnectionError('Please enter a room code');
      return;
    }

    try {
      setConnectionError(null);
      const room = await socketService.joinRoom(roomCode, playerName);
      setGameRoom(room);
      setGameStatus('waiting');
      setShowNameInput(false);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to join game. Please try again.');
    }
  };

  const makeMove = (from: string, to: string, promotion?: string): boolean => {
    if (!gameRoom || gameStatus !== 'playing' || !playerColor) return false;

    try {
      const isMyTurn = (game.turn() === 'w' && playerColor === 'white') || 
                       (game.turn() === 'b' && playerColor === 'black');
      if (!isMyTurn) return false;

      const piece = game.get(from as any);
      const isPromotion = piece?.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPromotion && !promotion) {
        setPromotionMove({ from, to });
        setShowPromotionDialog(true);
        return false;
      }

      const move = game.move({ from, to, promotion: promotion || 'q' });
      if (!move) {
        chessSounds.playIllegalMove();
        return false;
      }

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

      if (move.captured) {
        const capturedPieceType = move.captured.toLowerCase() as keyof CapturedPieces;
        const capturerColor = move.color === 'w' ? 'white' : 'black';
        
        setCapturedPieces(prev => ({
          ...prev,
          [capturerColor]: {
            ...prev[capturerColor],
            [capturedPieceType]: prev[capturerColor][capturedPieceType] + 1
          }
        }));
      }

      socketService.makeMove(gameRoom.id, from, to, promotion || 'q');
      setPosition(game.fen());
      setLastMove({ from, to });
      
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };

  const handlePromotion = (piece: string) => {
    if (promotionMove) {
      setShowPromotionDialog(false);
      makeMove(promotionMove.from, promotionMove.to, piece);
      setPromotionMove(null);
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    return makeMove(sourceSquare, targetSquare);
  };

  const toSquare = (s: string): Square | null => {
    return /^[a-h][1-8]$/.test(s) ? (s as Square) : null;
  };

  const onSquareClick = ({ square }: { square: string }) => {
    if (gameStatus !== 'playing' || !playerColor) return;
    
    const isMyTurn = (game.turn() === 'w' && playerColor === 'white') ||
                     (game.turn() === 'b' && playerColor === 'black');
    if (!isMyTurn) return;
    
    const clicked = toSquare(square);
    if (!clicked) return;
    
    if (selectedSquare) {
      if (legalMoves.includes(clicked)) {
        makeMove(selectedSquare, clicked);
        setSelectedSquare(null);
        setLegalMoves([]);
      } else {
        const p = game.get(clicked);
        if (p && p.color === game.turn()) {
          // Select another of my pieces
          setSelectedSquare(clicked);
          setLegalMoves(game.moves({ square: clicked, verbose: true }).map(m => m.to));
        } else {
          // Illegal move attempted
          chessSounds.playIllegalMove();
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      const p = game.get(clicked);
      if (p && p.color === game.turn()) {
        setSelectedSquare(clicked);
        setLegalMoves(game.moves({ square: clicked, verbose: true }).map(m => m.to));
      }
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCapturedPieces = (color: 'white' | 'black') => {
    const pieces = capturedPieces[color];
    const whitePieceSymbols: { [key: string]: string } = {
      'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙'
    };
    const blackPieceSymbols: { [key: string]: string } = {
      'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    
    // When white captures, they capture BLACK pieces, so show black symbols
    // When black captures, they capture WHITE pieces, so show white symbols
    const symbols = color === 'white' ? blackPieceSymbols : whitePieceSymbols;
    // The captured pieces should be displayed in their natural colors:
    // Black pieces (captured by white) should be black
    // White pieces (captured by black) should be white
    const symbolColor = color === 'white' ? '#000' : '#fff';
    const pieceOrder: (keyof CapturedPieces)[] = ['q', 'r', 'b', 'n', 'p'];
    
    return (
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap', minHeight: '24px' }}>
        {pieceOrder.map(pieceType => {
          const count = pieces[pieceType];
          if (count === 0) return null;
          
          return (
            <div key={pieceType} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {Array.from({ length: count }).map((_, i) => (
                <span key={i} style={{ 
                  fontSize: '20px', 
                  lineHeight: 1,
                  color: symbolColor,
                  textShadow: symbolColor === '#fff' ? '1px 1px 2px rgba(0,0,0,0.8)' : '1px 1px 2px rgba(255,255,255,0.3)'
                }}>
                  {symbols[pieceType]}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
    }
  };

  const isMyTurn = !!playerColor && (
    (game.turn() === 'w' && playerColor === 'white') ||
    (game.turn() === 'b' && playerColor === 'black')
  );
  const isOppTurn = !!playerColor && !isMyTurn;

  const PlayerCard = ({
    variant,
    name,
    clockSeconds,
    capturedColor,
    active,
    advantage,
  }: {
    variant: 'you' | 'opponent';
    name: string;
    clockSeconds: number;
    capturedColor: 'white' | 'black';
    active: boolean;
    advantage: number;
  }) => {
    const dotColor =
      !playerColor
        ? '#fff'
        : variant === 'you'
          ? (playerColor === 'white' ? '#fff' : '#0b0b0b')
          : (playerColor === 'white' ? '#0b0b0b' : '#fff');

    return (
      <section className={`og-playerCard ${active ? 'is-active' : ''}`} aria-label={variant === 'you' ? 'You' : 'Opponent'}>
        <div className="og-playerTop">
          <span className="og-dot" style={{ background: dotColor }} aria-hidden="true" />
          <div className="og-nameRow">
            <div className="og-name" title={name}>{name}</div>
            {active && <span className="og-turnPill">Your move</span>}
          </div>
          <div className="og-clock" aria-label="Time remaining">
            {formatTime(clockSeconds)}
          </div>
        </div>

        <div className="og-capturedRow">
          <div className="og-capturedPieces">{renderCapturedPieces(capturedColor)}</div>
          {advantage > 0 && <span className="og-adv">+{advantage}</span>}
        </div>
      </section>
    );
  };

  if (connectionError) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          padding: '2.5rem 2rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'var(--bg-active)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            ⚡
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            Server Offline
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginBottom: '0.75rem',
            lineHeight: 1.6
          }}>
            Could not connect to the game server. Make sure it's running locally.
          </p>
          <code style={{
            display: 'block',
            padding: '0.6rem 1rem',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            fontFamily: 'monospace'
          }}>
            cd server &amp;&amp; npm run dev
          </code>
          <button
            onClick={onBackToMenu}
            className="primary"
            style={{ padding: '0.65rem 2rem', fontSize: '14px', cursor: 'pointer' }}
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (showNameInput) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          padding: '2rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>
            Join Game
          </h2>
          
          {connectionError && (
            <div style={{
              padding: '0.75rem',
              background: 'var(--bg)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontSize: '14px'
            }}>
              {connectionError}
            </div>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)'
            }}>
              Playing as: {playerName}
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)'
            }}>
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGameWithCode()}
              placeholder="Enter room code"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '15px'
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onBackToMenu}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
            <button
              onClick={handleJoinGameWithCode}
              style={{
                flex: 2,
                padding: '0.75rem',
                background: 'var(--white)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--black)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="og-root">
      <div className="og-shell">
        <header className="og-header">
          <div className="og-titleWrap">
            <h1 className="og-title">Online Chess</h1>
            <div className="og-subtitle">
              {gameRoom?.id ? <>Room <span className="og-mono">{gameRoom.id}</span></> : timeControl}
            </div>
          </div>
          <button onClick={onBackToMenu} className="og-leaveBtn">
            Leave game
          </button>
        </header>

        {/* Waiting for opponent */}
        {gameStatus === 'waiting' && (
          <div style={{
            maxWidth: '500px',
            margin: '0 auto',
            padding: '2rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 1rem',
                border: '2px solid var(--border-mid)',
                borderTopColor: 'var(--white)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {gameMode === 'matchmaking' ? 'Finding opponent...' : 'Waiting for opponent...'}
              </h2>
              {gameMode === 'create' && (
                <>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Share this code with your opponent:
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}>
                    <code style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      color: 'var(--white)',
                      letterSpacing: '0.08em',
                    }}>
                      {roomCode}
                    </code>
                    <button
                      onClick={copyRoomCode}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: 'var(--white)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--black)',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Game Result Popup Overlay */}
        {gameStatus === 'finished' && gameResult && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: '1rem'
          }}>
            <div className="game-result-popup" style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-mid)',
              padding: '3rem 2rem',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              animation: 'slideIn 0.3s ease-out',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div className="emoji" style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {gameResult.winner === playerColor ? '🎉' : gameResult.winner ? '😢' : '🤝'}
              </div>
              <h2 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '700', 
                marginBottom: '1rem',
                color: 'var(--white)',
              }}>
                {gameResult.winner === playerColor ? 'You Won!' : 
                 gameResult.winner ? 'You Lost' : 'Draw'}
              </h2>
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '1.1rem',
                marginBottom: '2rem'
              }}>
                {gameResult.reason}
              </p>
              <button
                onClick={onBackToMenu}
                className="primary"
                style={{
                  padding: '0.7rem 2.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}

        {gameStatus !== 'waiting' && (
          <main className="og-main">
            <div className="og-grid">
              <div className="og-players">
                <PlayerCard
                  variant="opponent"
                  name={opponentName || 'Opponent'}
                  clockSeconds={playerColor === 'white' ? timeLeft.black : timeLeft.white}
                  capturedColor={playerColor === 'white' ? 'black' : 'white'}
                  active={isOppTurn}
                  advantage={(() => {
                    if (!playerColor) return 0;
                    const opponentColor = playerColor === 'white' ? 'black' : 'white';
                    return calculateMaterialAdvantage(opponentColor);
                  })()}
                />
              </div>

              <div className="og-boardStage">
                <div className="og-boardWrap">
                  <Chessboard
                    options={{
                      position,
                      boardOrientation: playerColor || 'white',
                      squareStyles: {
                        // Check indicator - highlight king in red
                        ...(() => {
                          const checkStyles: Record<string, React.CSSProperties> = {};
                          if (game.inCheck()) {
                            const turn = game.turn();
                            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                            for (let rank = 0; rank < 8; rank++) {
                              for (let file = 0; file < 8; file++) {
                                const piece = game.board()[rank][file];
                                if (piece?.type === 'k' && piece?.color === turn) {
                                  const square = `${files[file]}${8 - rank}`;
                                  checkStyles[square] = { backgroundColor: 'rgba(255, 0, 0, 0.5)' };
                                }
                              }
                            }
                          }
                          return checkStyles;
                        })(),
                        ...(lastMove && {
                          [lastMove.from]: { backgroundColor: 'rgba(255,255,255,0.15)' },
                          [lastMove.to]: { backgroundColor: 'rgba(255,255,255,0.25)' },
                        }),
                        // Selected square highlight
                        ...(selectedSquare && { [selectedSquare]: { backgroundColor: 'rgba(255,255,255,0.2)' } }),
                        // Legal move indicators
                        ...legalMoves.reduce((acc, sq) => {
                          acc[sq] = { background: 'radial-gradient(circle,rgba(255,255,255,0.3) 20%,transparent 22%)' };
                          return acc;
                        }, {} as Record<string, React.CSSProperties>),
                      },
                      onPieceDrop: ({ sourceSquare, targetSquare }) =>
                        targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                      onSquareClick,
                    }}
                  />

                  {showPromotionDialog && (
                    <div className="og-promoBackdrop" role="dialog" aria-modal="true">
                      <div className="og-promoCard">
                        <div className="og-promoTitle">Promote to</div>
                        <div className="og-promoRow">
                          {(['q', 'r', 'b', 'n'] as const).map((piece) => {
                            const symbols = {
                              q: playerColor === 'white' ? '♕' : '♛',
                              r: playerColor === 'white' ? '♖' : '♜',
                              b: playerColor === 'white' ? '♗' : '♝',
                              n: playerColor === 'white' ? '♘' : '♞',
                            };
                            return (
                              <button
                                key={piece}
                                onClick={() => handlePromotion(piece)}
                                className="og-promoBtn"
                                type="button"
                              >
                                {symbols[piece]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="og-players og-playersBottom">
                <PlayerCard
                  variant="you"
                  name={playerName}
                  clockSeconds={playerColor === 'white' ? timeLeft.white : timeLeft.black}
                  capturedColor={playerColor || 'white'}
                  active={isMyTurn}
                  advantage={playerColor ? calculateMaterialAdvantage(playerColor) : 0}
                />
              </div>
            </div>
          </main>
        )}
      </div>
      
      <style>{`
        .og-root {
          height: 100%;
          background: var(--bg);
          overflow: auto;
          padding: 1rem;
          box-sizing: border-box;
        }
        .og-shell {
          max-width: 1100px;
          margin: 0 auto;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .og-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.25rem 0.25rem 0.75rem;
          flex-wrap: wrap;
        }
        .og-titleWrap { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .og-title {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          font-family: 'Space Grotesk', system-ui, sans-serif;
        }
        .og-subtitle { color: var(--text-muted); font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 72vw; }
        .og-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; letter-spacing: 0.04em; }
        .og-leaveBtn {
          min-height: 40px;
          padding: 0.55rem 0.9rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 650;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        .og-leaveBtn:hover { background: var(--bg-hover); border-color: var(--border-light); transform: translateY(-1px); }
        .og-leaveBtn:active { transform: translateY(0); }

        .og-main { flex: 1; display: flex; }
        .og-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: auto auto auto;
          gap: 0.8rem;
          align-items: start;
          align-content: start;
        }

        .og-players { display: flex; flex-direction: column; gap: 0.8rem; }
        .og-playersBottom { padding-bottom: 0.25rem; }

        .og-boardStage { display: grid; place-items: center; }
        .og-boardWrap {
          width: min(92vw, 520px);
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 18px 45px rgba(0,0,0,0.35);
          background: rgba(255,255,255,0.02);
        }

        .og-playerCard {
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.4rem 0.65rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          backdrop-filter: blur(10px);
        }
        .og-playerCard.is-active {
          border-color: rgba(255,255,255,0.22);
          box-shadow: 0 14px 40px rgba(0,0,0,0.32);
        }
        .og-playerTop { display: flex; align-items: center; gap: 0.55rem; }
        .og-dot { width: 9px; height: 9px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.18); flex: 0 0 auto; }
        .og-nameRow { display: flex; align-items: center; gap: 0.45rem; min-width: 0; }
        .og-name {
          font-weight: 750;
          font-size: 0.9rem;
          color: var(--text-primary);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .og-turnPill {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-primary);
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 0.12rem 0.4rem;
          border-radius: 999px;
          white-space: nowrap;
        }
        .og-clock {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: var(--white);
          flex-shrink: 0;
          margin-left: auto;
        }
        .og-capturedRow { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.15rem; min-height: 20px; }
        .og-capturedPieces { flex: 1; min-width: 0; overflow: hidden; }
        .og-adv {
          flex: 0 0 auto;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-primary);
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          padding: 0.12rem 0.4rem;
          border-radius: 8px;
        }

        .og-promoBackdrop {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(6px);
          z-index: 1000;
          padding: 1rem;
        }
        .og-promoCard {
          width: min(420px, 92vw);
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 1rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .og-promoTitle {
          text-align: center;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
        }
        .og-promoRow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
        .og-promoBtn {
          height: 56px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text-primary);
          font-size: 1.75rem;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s, border-color 0.15s;
        }
        .og-promoBtn:hover { background: var(--bg-hover); border-color: var(--border-light); transform: translateY(-1px); }
        .og-promoBtn:active { transform: translateY(0); }

        @media (min-width: 1024px) {
          .og-grid {
            grid-template-columns: 320px 1fr;
            grid-template-rows: auto auto;
            gap: 1.25rem;
            align-items: center;
          }
          .og-players { grid-column: 1; grid-row: 1; }
          .og-playersBottom { grid-column: 1; grid-row: 2; padding-bottom: 0; }
          .og-boardStage { grid-column: 2; grid-row: 1 / span 2; }
          .og-boardWrap { width: min(560px, calc(100vh - 190px)); }
        }

        @media (max-width: 480px) {
          .og-root { padding: 0.75rem; }
          .og-grid { gap: 0.35rem; }
          .og-boardWrap { width: min(96vw, 420px); border-radius: 10px; }
          .og-playerCard { padding: 0.3rem 0.55rem; }
          .og-clock { font-size: 0.9rem; }
          .og-name { font-size: 0.8rem; }
          .og-capturedPieces { font-size: 16px; }
        }
      `}</style>
    </div>
  );
};