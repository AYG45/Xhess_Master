import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useStockfish, type PositionAnalysis } from '../hooks/useStockfish';
import { EvaluationBar } from './EvaluationBar';
import { classifyMove } from '../utils/moveClassification';
import { isMoveInOpeningTheory } from '../data/openings';
import type { GameMode, PlayerColor, BotDifficulty, SavedGame } from '../types';
import { BOT_LEVELS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { saveGame } from '../services/gameService';
import { chessSounds } from '../utils/sounds';

interface ChessGameProps {
  mode: GameMode;
  onBackToMenu?: () => void;
  timeControl?: string;
  savedGame?: SavedGame | null;
}

interface GameMove {
  san: string;
  from: string;
  to: string;
  beforeFen: string;
  afterFen: string;
  beforeAnalysis?: PositionAnalysis | null;
  afterAnalysis?: PositionAnalysis | null;
}

const TOOLBAR_H = 44; // px — keep in sync with .cg-toolbar min-height

export const ChessGame = ({ mode, onBackToMenu, timeControl, savedGame }: ChessGameProps) => {
  const { currentUser } = useAuth();
  const [game, setGame]                         = useState(new Chess());
  const [position, setPosition]                 = useState(game.fen());
  const [playerColor, setPlayerColor]           = useState<PlayerColor>('white');
  const [boardOrientation, setBoardOrientation] = useState<PlayerColor>('white');
  const [botDifficulty, setBotDifficulty]       = useState<BotDifficulty>('beginner');
  const [gameStarted, setGameStarted]           = useState(false);
  const [selectedSquare, setSelectedSquare]     = useState<Square | null>(null);
  const [legalMoves, setLegalMoves]             = useState<Square[]>([]);
  const [lastMove, setLastMove]                 = useState<{ from: string; to: string } | null>(null);
  const [gameHistory, setGameHistory]           = useState<GameMove[]>([]);
  const [selectedMoveIdx, setSelectedMoveIdx]   = useState<number | null>(null);
  const [originalMoves, setOriginalMoves]       = useState<string[]>([]);
  const [isInVariation, setIsInVariation]       = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [promotionMove, setPromotionMove]       = useState<{ from: string; to: string } | null>(null);

  const gameRef = useRef(game);
  gameRef.current = game;

  const {
    isReady, isAnalyzing,
    bestMove, evaluation, mateIn,
    analyzePosition, analyzePositionAsync, getBestMove, resetAnalysis,
  } = useStockfish();

  // Play check/checkmate/game end sounds when game state changes
  useEffect(() => {
    if (game.inCheck()) {
      if (game.isCheckmate()) {
        chessSounds.playCheckmate();
        chessSounds.playGameEnd();
      } else {
        chessSounds.playCheck();
      }
    } else if (game.isGameOver()) {
      // Game ended by draw (stalemate, repetition, insufficient material, 50-move rule)
      chessSounds.playGameEnd();
    }
  }, [position]); // Listen to position changes

  const showTeacher = mode === 'analyze';

  // Analyze all moves in the game history
  const analyzeGameHistory = useCallback(async (history: GameMove[]) => {
    if (!analyzePositionAsync) return;
    
    console.log('Starting game analysis...');
    
    // Analyze positions in batches to avoid overwhelming the engine
    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      
      try {
        const [beforeA, afterA] = await Promise.all([
          analyzePositionAsync(move.beforeFen, 12),
          analyzePositionAsync(move.afterFen, 12)
        ]);
        
        setGameHistory(prev => {
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = {
              ...updated[i],
              beforeAnalysis: beforeA,
              afterAnalysis: afterA
            };
          }
          return updated;
        });
        
        // Small delay between analyses to not overwhelm the engine
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error analyzing move ${i}:`, error);
      }
    }
    
    console.log('Game analysis complete!');
  }, [analyzePositionAsync]);

  // Load saved game for analyze mode
  useEffect(() => {
    if (mode === 'analyze' && savedGame) {
      const newGame = new Chess();
      const moves = savedGame.moves;
      setOriginalMoves(moves);
      
      // Build the game history without playing the moves on the board
      const history: GameMove[] = [];
      const tempGame = new Chess();
      
      for (let i = 0; i < moves.length; i++) {
        const beforeFen = tempGame.fen();
        try {
          const move = tempGame.move(moves[i]);
          if (move) {
            const afterFen = tempGame.fen();
            history.push({
              san: move.san,
              from: move.from,
              to: move.to,
              beforeFen,
              afterFen
            });
          }
        } catch (e) {
          console.error('Error replaying move:', moves[i], e);
          break;
        }
      }
      
      // Start at the beginning position, not the end
      setGame(newGame);
      setPosition(newGame.fen());
      setGameHistory(history);
      setSelectedMoveIdx(null); // Start with no move selected (initial position)
      setLastMove(null);
      
      if (savedGame.playerColor) {
        setPlayerColor(savedGame.playerColor);
        setBoardOrientation(savedGame.playerColor);
      }
      if (savedGame.botDifficulty) {
        setBotDifficulty(savedGame.botDifficulty);
      }
      
      // Analyze all positions in the background
      if (isReady) {
        analyzeGameHistory(history);
      }
    }
  }, [mode, savedGame, isReady, analyzeGameHistory]);

  // Save game when it ends
  useEffect(() => {
    const handleGameEnd = async () => {
      if (!game.isGameOver() || !currentUser || mode === 'analyze' || savedGame) return;
      if (gameHistory.length === 0) return;
      
      const result = game.isCheckmate() 
        ? (game.turn() === 'w' ? 'black' : 'white')
        : game.isDraw() 
        ? 'draw' 
        : 'ongoing';
      
      const moves = gameHistory.map(m => m.san);
      const pgn = game.pgn();
      
      try {
        await saveGame({
          userId: currentUser.uid,
          gameMode: mode as 'online' | 'vsBot' | 'local',
          playerColor: mode === 'vsBot' ? playerColor : undefined,
          botDifficulty: mode === 'vsBot' ? botDifficulty : undefined,
          moves,
          result,
          createdAt: Date.now(),
          pgn,
          finalFen: game.fen()
        });
        console.log('Game saved successfully');
      } catch (error) {
        console.error('Failed to save game:', error);
      }
    };
    
    handleGameEnd();
  }, [game, currentUser, mode, savedGame, gameHistory, playerColor, botDifficulty]);

  useEffect(() => {
    if (mode === 'analyze' && isReady) analyzePosition(position, 12);
  }, [position, mode, isReady, analyzePosition]);

  useEffect(() => {
    if (mode === 'vsBot' && gameStarted && isReady && game.turn() !== playerColor[0] && !game.isGameOver())
      getBestMove(game.fen(), BOT_LEVELS[botDifficulty].depth);
  }, [mode, playerColor, position, isReady, botDifficulty, gameStarted, game, getBestMove]);

  const makeMoveRef = useRef<(from: string, to: string) => Promise<boolean>>(async () => false);

  useEffect(() => {
    if (mode !== 'vsBot' || !gameStarted || !bestMove || game.turn() === playerColor[0]) return;
    const botLevel = BOT_LEVELS[botDifficulty];
    if (Math.random() < botLevel.randomness) {
      const moves = game.moves({ verbose: true });
      if (moves.length) { const rm = moves[Math.floor(Math.random() * moves.length)]; setTimeout(() => makeMoveRef.current(rm.from, rm.to), 300); return; }
    }
    setTimeout(() => makeMoveRef.current(bestMove.slice(0, 2), bestMove.slice(2, 4)), 300);
  }, [bestMove, mode, gameStarted, game, playerColor, botDifficulty]);

  const makeMove = async (from: string, to: string, promotionPiece?: string): Promise<boolean> => {
    try {
      // Check if this is a pawn promotion move
      const piece = gameRef.current.get(from as Square);
      const isPromotion = piece?.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      // If promotion and no piece selected yet, show dialog
      if (isPromotion && !promotionPiece) {
        setPromotionMove({ from, to });
        setShowPromotionDialog(true);
        return false;
      }

      const beforeFen = gameRef.current.fen();
      const gc = new Chess();
      gameRef.current.history({ verbose: true }).forEach(m => gc.move({ from: m.from, to: m.to, promotion: m.promotion }));
      const moveObj = gc.move({ from, to, promotion: promotionPiece || 'q' });
      if (!moveObj) {
        chessSounds.playIllegalMove();
        return false;
      }
      const afterFen = gc.fen();
      const moveIdx = gameRef.current.history().length;
      const gameMove: GameMove = { san: moveObj.san, from, to, beforeFen, afterFen };
      
      // Play appropriate sound
      if (moveObj.san.includes('O-O')) {
        // Castling (O-O for kingside, O-O-O for queenside)
        chessSounds.playCastle();
      } else if (moveObj.promotion) {
        // Pawn promotion
        chessSounds.playPromote();
      } else if (moveObj.captured) {
        // Regular capture
        chessSounds.playCapture();
      } else {
        // Regular move
        chessSounds.playMove();
      }
      
      // Check if this is a variation when analyzing a saved game
      if (mode === 'analyze' && savedGame && originalMoves.length > 0) {
        const currentMoveNumber = moveIdx;
        if (currentMoveNumber < originalMoves.length) {
          const originalMove = originalMoves[currentMoveNumber];
          if (moveObj.san !== originalMove) {
            setIsInVariation(true);
          }
        } else {
          setIsInVariation(true);
        }
      }
      
      setGame(gc); setPosition(afterFen); setLastMove({ from, to });
      setSelectedMoveIdx(moveIdx); setGameHistory(prev => [...prev, gameMove]);
      if (mode === 'vsBot') getBestMove(afterFen, BOT_LEVELS[botDifficulty].depth);
      if (mode === 'analyze' && analyzePositionAsync) {
        const [beforeA, afterA] = await Promise.all([analyzePositionAsync(beforeFen, 12), analyzePositionAsync(afterFen, 12)]);
        setGameHistory(prev => {
          const updated = [...prev];
          const idx = prev.findIndex(m => m.beforeFen === beforeFen && m.afterFen === afterFen && !m.beforeAnalysis);
          if (idx >= 0) updated[idx] = { ...updated[idx], beforeAnalysis: beforeA, afterAnalysis: afterA };
          return updated;
        });
      }
      return true;
    } catch (err) { console.error('Move error:', err); return false; }
  };

  // Keep ref pointing at the latest makeMove implementation.
  makeMoveRef.current = makeMove;

  // Handle promotion piece selection
  const handlePromotion = (piece: string) => {
    if (promotionMove) {
      setShowPromotionDialog(false);
      makeMove(promotionMove.from, promotionMove.to, piece);
      setPromotionMove(null);
    }
  };

  const onDrop = (src: string, tgt: string) => {
    if (mode === 'vsBot' && (!gameStarted || game.turn() !== playerColor[0])) return false;
    makeMove(src, tgt); return true;
  };

  const toSquare = (s: string): Square | null => {
    // `react-chessboard` gives algebraic squares like "e4"; guard keeps runtime safe.
    return /^[a-h][1-8]$/.test(s) ? (s as Square) : null;
  };

  const onSquareClick = ({ square }: { square: string }) => {
    if (mode === 'vsBot' && (!gameStarted || game.turn() !== playerColor[0])) return;
    const clicked = toSquare(square);
    if (!clicked) return;
    if (selectedSquare) {
      if (legalMoves.includes(clicked)) {
        makeMove(selectedSquare, clicked);
        setSelectedSquare(null);
        setLegalMoves([]);
      }
      else {
        const p = game.get(clicked);
        if (p && p.color === game.turn()) {
          setSelectedSquare(clicked);
          setLegalMoves(game.moves({ square: clicked, verbose: true }).map(m => m.to));
        } else {
          // User tried to move to an illegal square (not their own piece)
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

  const resetGame = () => {
    const ng = new Chess();
    setGame(ng); setPosition(ng.fen()); setGameStarted(false);
    setSelectedSquare(null); setLegalMoves([]); setLastMove(null);
    setGameHistory([]); setSelectedMoveIdx(null); resetAnalysis();
    if (mode === 'analyze' && isReady) setTimeout(() => analyzePosition(ng.fen()), 100);
  };

  const undoMove = () => {
    const hist = game.history({ verbose: true });
    if (!hist.length) return;
    const undo = mode === 'vsBot' && hist.length >= 2 ? 2 : 1;
    const ng = new Chess();
    hist.slice(0, -undo).forEach(m => ng.move({ from: m.from, to: m.to, promotion: m.promotion }));
    setGame(ng); setPosition(ng.fen());
    setGameHistory(prev => prev.slice(0, -undo)); setSelectedMoveIdx(null);
  };

  const calculateMoveCPL = useCallback((move: GameMove, moveIndex: number): number => {
    if (!move.beforeAnalysis || !move.afterAnalysis) return 0;

    const playedUci = move.from + move.to;
    const bestMoveUci = move.beforeAnalysis.bestMove;
    const alternatives = move.beforeAnalysis.alternatives || [];

    // 1) If the played move IS the engine's best move → CPL = 0
    if (bestMoveUci && playedUci === bestMoveUci.slice(0, 4)) {
      return 0;
    }

    // 2) If the played move is one of the top alternatives from the SAME
    //    analysis, compute CPL from that analysis (no cross-analysis noise)
    if (alternatives.length > 0) {
      const bestEval = alternatives[0]?.evaluation ?? move.beforeAnalysis.evaluation;
      const matchedAlt = alternatives.find(
        alt => alt.move && playedUci === alt.move.slice(0, 4)
      );
      if (matchedAlt !== undefined) {
        return Math.round(Math.max(0, (bestEval - matchedAlt.evaluation) * 100));
      }
    }

    // 3) Fallback: compare independent before / after analyses
    const isWhiteMove = moveIndex % 2 === 0;
    let evalBefore = move.beforeAnalysis.evaluation;
    let evalAfter  = move.afterAnalysis.evaluation;
    if (move.beforeFen.split(' ')[1] === 'b') evalBefore = -evalBefore;
    if (move.afterFen.split(' ')[1]  === 'b') evalAfter  = -evalAfter;
    const evaluationChange = isWhiteMove
      ? evalBefore - evalAfter
      : evalAfter  - evalBefore;
    return Math.round(Math.max(0, evaluationChange * 100));
  }, []);

  const getMoveQualityBadges = useMemo(() => {
    if (mode !== 'analyze' || selectedMoveIdx === null) return [];
    const move = gameHistory[selectedMoveIdx];
    if (!move?.beforeAnalysis || !move?.afterAnalysis) return [];
    const centipawnLoss = calculateMoveCPL(move, selectedMoveIdx);
    const gameMoves = gameHistory.slice(0, selectedMoveIdx + 1).map(m => m.san);
    const isBookMove = isMoveInOpeningTheory(gameMoves, Math.floor(selectedMoveIdx / 2) + 1);
    const quality = classifyMove(centipawnLoss, isBookMove, false, false);
    if (['blunder', 'mistake', 'inaccuracy', 'brilliant', 'excellent', 'best', 'good', 'book'].includes(quality.type))
      return [{ square: move.to, symbol: quality.icon, color: quality.color }];
    return [];
  }, [mode, selectedMoveIdx, gameHistory, calculateMoveCPL]);

  const getMoveQuality = useCallback((move: GameMove, moveIndex: number) => {
    if (!move.beforeAnalysis || !move.afterAnalysis) return null;
    const centipawnLoss = calculateMoveCPL(move, moveIndex);
    const gameMoves = gameHistory.slice(0, moveIndex + 1).map(m => m.san);
    const isBookMove = isMoveInOpeningTheory(gameMoves, Math.floor(moveIndex / 2) + 1);
    return classifyMove(centipawnLoss, isBookMove, false, false);
  }, [gameHistory, calculateMoveCPL]);

  // ── Captured pieces ──────────────────────────────────────────
  const getCapturedPieces = () => {
    const hist = game.history({ verbose: true });
    const captured: { white: Record<string, number>; black: Record<string, number> } = { white: {}, black: {} };
    for (const m of hist) {
      if (m.captured) {
        const side = m.color === 'w' ? 'white' : 'black';
        const key = m.captured.toLowerCase();
        captured[side][key] = (captured[side][key] || 0) + 1;
      }
    }
    return captured;
  };

  const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const WHITE_PIECE_SYMBOLS: Record<string, string> = { q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
  const BLACK_PIECE_SYMBOLS: Record<string, string> = { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

  const renderCaptured = (capturedBy: 'white' | 'black') => {
    const captured = getCapturedPieces()[capturedBy];
    const total = Object.entries(captured).reduce((s, [k, v]) => s + (PIECE_VALUES[k] || 0) * v, 0);
    const oppTotal = Object.entries(getCapturedPieces()[capturedBy === 'white' ? 'black' : 'white'])
      .reduce((s, [k, v]) => s + (PIECE_VALUES[k] || 0) * v, 0);
    const advantage = total - oppTotal;
    
    // When white captures, they capture BLACK pieces, so show black symbols
    // When black captures, they capture WHITE pieces, so show white symbols
    const pieceSymbols = capturedBy === 'white' ? BLACK_PIECE_SYMBOLS : WHITE_PIECE_SYMBOLS;
    const pieces = PIECE_ORDER.flatMap(p => Array(captured[p] || 0).fill(pieceSymbols[p]));
    // Black pieces need outline to be visible on dark background
    const pieceColor = capturedBy === 'white' ? '#000' : '#fff';
    const needsOutline = capturedBy === 'white'; // black pieces need outline
    
    return { pieces, advantage, pieceColor, needsOutline };
  };

  // ── Player strip ─────────────────────────────────────────────
  const PlayerStrip = ({ side }: { side: 'top' | 'bottom' }) => {
    const isBottom = side === 'bottom';
    const playerSide: PlayerColor = isBottom ? boardOrientation : (boardOrientation === 'white' ? 'black' : 'white');
    const isWhite = playerSide === 'white';
    
    // Determine label based on mode and saved game
    let label: string;
    if (savedGame) {
      // For saved games, show username vs opponent
      if (savedGame.gameMode === 'vsBot') {
        // User played as savedGame.playerColor
        const isUserSide = isWhite === (savedGame.playerColor === 'white');
        label = isUserSide ? (currentUser?.displayName || 'You') : BOT_LEVELS[savedGame.botDifficulty!].name;
      } else if (savedGame.gameMode === 'online') {
        // For online games, show username for user's side
        label = isWhite ? (currentUser?.displayName || 'White') : 'Opponent';
      } else {
        // Local game
        label = isWhite ? 'White' : 'Black';
      }
    } else if (mode === 'vsBot') {
      label = isWhite === (playerColor === 'white') ? (currentUser?.displayName || 'You') : BOT_LEVELS[botDifficulty].name;
    } else {
      label = isWhite ? 'White' : 'Black';
    }
    
    const { pieces, advantage, pieceColor, needsOutline } = renderCaptured(isWhite ? 'white' : 'black');
    const isActive = game.turn() === (isWhite ? 'w' : 'b') && !game.isGameOver();

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.55rem',
        padding: '0 2px',
        height: '36px',
        width: '100%',
      }}>
        {/* Color swatch */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: isWhite ? '#f0f0f0' : '#1a1a1a',
          border: isWhite ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(255,255,255,0.12)',
          boxShadow: isActive ? '0 0 0 2px rgba(255,255,255,0.15)' : 'none',
          transition: 'box-shadow 0.2s',
        }} />

        {/* Name */}
        <span style={{
          fontSize: '0.8rem', fontWeight: 600,
          color: isActive ? 'var(--white)' : 'var(--gray-500)',
          letterSpacing: '-0.01em',
          transition: 'color 0.2s',
          flexShrink: 0,
          minWidth: 40,
        }}>
          {label}
        </span>

        {/* Captured pieces + advantage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {pieces.map((sym, i) => (
            <span key={i} style={{ 
              fontSize: '11px', 
              lineHeight: 1, 
              color: pieceColor,
              opacity: 1,
              fontWeight: 500,
              textShadow: needsOutline ? '0 0 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.5)' : 'none'
            }}>{sym}</span>
          ))}
          {advantage > 0 && (
            <span style={{ fontSize: '0.62rem', color: 'var(--gray-500)', marginLeft: '4px', fontWeight: 700 }}>+{advantage}</span>
          )}
        </div>

        {/* Turn indicator */}
        {isActive && (
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--white)', flexShrink: 0,
            boxShadow: '0 0 6px rgba(255,255,255,0.5)',
          }} />
        )}
      </div>
    );
  };
  const moveQualityBadges = getMoveQualityBadges;
  const flipBoard   = () => setBoardOrientation(p => p === 'white' ? 'black' : 'white');
  const isBlackToMove  = game.turn() === 'b';
  
  // Use stored analysis from selected move if available, otherwise use live analysis
  let displayEval = evaluation;
  let displayMateIn = mateIn;
  let displayBestMove = bestMove;
  
  if (mode === 'analyze' && selectedMoveIdx !== null && gameHistory[selectedMoveIdx]) {
    const selectedMove = gameHistory[selectedMoveIdx];
    if (selectedMove.afterAnalysis) {
      displayEval = selectedMove.afterAnalysis.evaluation;
      displayMateIn = selectedMove.afterAnalysis.mateIn;
      displayBestMove = selectedMove.afterAnalysis.bestMove || bestMove;
    }
  }
  
  const currentEval    = isBlackToMove ? -displayEval : displayEval;
  const currentMateIn  = displayMateIn !== null ? (isBlackToMove ? -displayMateIn : displayMateIn) : null;
  const gameOver = game.isGameOver();
  const isDraw = game.isDraw();
  const winner = game.isCheckmate() ? (game.turn() === 'w' ? 'black' : 'white') : null;

  // Bot setup screen
  if (mode === 'vsBot' && !gameStarted) {
    return (
      <div className="cg-root" data-mode={mode}>
        <style>{`
          .bot-setup-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 2rem;
            background: var(--bg);
          }
          .bot-setup-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-xl);
            padding: 2.5rem 2rem;
            max-width: 420px;
            width: 100%;
          }
          .bot-setup-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--white);
            margin-bottom: 0.5rem;
            text-align: center;
            letter-spacing: -0.02em;
          }
          .bot-setup-subtitle {
            color: var(--text-muted);
            font-size: 0.85rem;
            text-align: center;
            margin-bottom: 2.5rem;
          }
          .bot-setup-section {
            margin-bottom: 1.75rem;
          }
          .bot-setup-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 0.75rem;
            display: block;
            letter-spacing: 0.02em;
          }
          .bot-color-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }
          .bot-color-btn {
            padding: 1rem;
            background: var(--bg-raised);
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
          }
          .bot-color-btn:hover {
            border-color: var(--border-light);
            background: var(--bg-hover);
          }
          .bot-color-btn.selected {
            border-color: var(--white);
            background: var(--bg-hover);
            color: var(--white);
          }
          .bot-difficulty-select {
            width: 100%;
            padding: 0.85rem 1rem;
            background: var(--bg-raised);
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23666'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 1rem center;
            padding-right: 2.5rem;
          }
          .bot-difficulty-select:hover {
            border-color: var(--border-light);
          }
          .bot-start-btn {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
            border: none;
            border-radius: var(--radius-md);
            color: var(--white);
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition);
            letter-spacing: 0.02em;
            margin-top: 0.5rem;
          }
          .bot-start-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
          }
          .bot-back-btn {
            width: 100%;
            padding: 0.75rem;
            background: transparent;
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
            margin-top: 0.75rem;
          }
          .bot-back-btn:hover {
            border-color: var(--border-light);
            color: var(--text-primary);
          }
        `}</style>
        
        <div className="bot-setup-container">
          <div className="bot-setup-card">
            <h2 className="bot-setup-title">Play vs Bot</h2>
            <p className="bot-setup-subtitle">Configure your game settings</p>
            
            <div className="bot-setup-section">
              <label className="bot-setup-label">Choose Your Color</label>
              <div className="bot-color-options">
                <button 
                  className={`bot-color-btn ${playerColor === 'white' ? 'selected' : ''}`}
                  onClick={() => { setPlayerColor('white'); setBoardOrientation('white'); }}
                >
                  <span style={{ fontSize: '1.5rem' }}>♔</span>
                  White
                </button>
                <button 
                  className={`bot-color-btn ${playerColor === 'black' ? 'selected' : ''}`}
                  onClick={() => { setPlayerColor('black'); setBoardOrientation('black'); }}
                >
                  <span style={{ fontSize: '1.5rem' }}>♚</span>
                  Black
                </button>
              </div>
            </div>
            
            <div className="bot-setup-section">
              <label className="bot-setup-label">Bot Difficulty</label>
              <select 
                className="bot-difficulty-select"
                value={botDifficulty} 
                onChange={e => setBotDifficulty(e.target.value as BotDifficulty)}
              >
                {Object.entries(BOT_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              className="bot-start-btn"
              onClick={() => {
                setGameStarted(true);
                if (playerColor === 'black') {
                  getBestMove(game.fen(), BOT_LEVELS[botDifficulty].depth);
                }
              }}
            >
              Start Game
            </button>
            
            {onBackToMenu && (
              <button className="bot-back-btn" onClick={onBackToMenu}>
                Back to Menu
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-root" data-mode={mode}>
      <style>{`
        .cg-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .cg-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          height: ${TOOLBAR_H}px;
          min-height: ${TOOLBAR_H}px;
          background: var(--bg-raised);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .cg-body {
          flex: 1;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }
        /* Board area — takes all remaining space */
        .cg-board-area {
          flex: 1;
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1rem;
          gap: 10px;
          overflow: hidden;
        }
        /* The board wrapper is a square that fills available height */
        .cg-board-wrap {
          /* Fill the column — column height minus two strips (36px each) and gaps */
          flex: 1;
          min-height: 0;
          aspect-ratio: 1;
          position: relative;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          overflow: hidden;
        }
        /* Sidebar fills full height of body */
        .cg-sidebar {
          width: 280px;
          min-width: 240px;
          max-width: 320px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border);
          background: var(--bg-raised);
          overflow: hidden;
          height: 100%;
        }
        /* Board column — desktop: height-driven square */
        .cg-board-column {
          flex: 0 0 auto;
          height: 100%;
          width: min(calc(100% - 20px), calc(100vh - ${TOOLBAR_H}px - 1.5rem - 82px));
          max-width: 100%;
        }
        .cb {
          padding: 5px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 3px;
          color: var(--text-secondary);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: 600;
          font-family: inherit;
          white-space: nowrap;
        }
        .cb:hover { border-color: var(--border-light); color: var(--text-primary); background: var(--bg-hover); }
        .cb:disabled { opacity: 0.3; cursor: not-allowed; }
        .cb.on { background: var(--white); color: var(--black); border-color: var(--white); }
        @media (max-width: 480px) {
          .cb {
            padding: 4px 8px;
            font-size: 8px;
            letter-spacing: 0.08em;
          }
        }
        .cs {
          padding: 5px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 3px;
          color: var(--text-secondary);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          font-family: inherit;
          font-weight: 500;
          appearance: none;
          -webkit-appearance: none;
          padding-right: 1.4rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23555'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.4rem center;
        }
        .cs:hover { border-color: var(--border-light); color: var(--text-primary); }
        .cs option { background: var(--bg-card); color: var(--text-primary); }

        /* Analyze header layout */
        .cg-analysis-topRow {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .cg-analysis-bestMove {
          text-align: left;
        }
        @media (max-width: 768px) {
          .cg-root { height: 100vh; min-height: 100vh; overflow: hidden; display: flex; }
          
          .cg-toolbar { padding: 0 0.5rem; min-height: 44px; height: 44px; gap: 0.35rem; flex-shrink: 0; }
          
          /* Body: column, board area takes remaining space, sidebar fixed at bottom */
          .cg-body {
            flex: 1;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
          }
          
          /* Board area: fills remaining space, centers the board column */
          .cg-board-area {
            flex: 1;
            min-height: 0;
            padding: 0.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            overflow: hidden;
          }
          
          /* Board column: auto-sized, centered */
          .cg-board-column {
            width: min(100%, 520px) !important;
            height: auto !important;
            flex: 0 0 auto !important;
            align-items: center !important;
          }
          
          /* Board: properly centered with dynamic sizing */
          .cg-board-wrap {
            flex: none !important;
            width: min(95vw, calc(100vh - 280px)) !important;
            height: min(95vw, calc(100vh - 280px)) !important;
            max-width: min(95vw, 480px) !important;
            max-height: min(95vw, 480px) !important;
            margin: 0 auto !important;
          }
          
          /* Sidebar: compact fixed height at bottom */
          .cg-sidebar {
            width: 100% !important;
            height: 160px !important;
            min-height: 120px !important;
            max-height: 160px !important;
            border-left: none !important;
            border-top: 1px solid var(--border) !important;
            flex: none !important;
            flex-shrink: 0 !important;
            overflow-y: auto;
          }
          
          /* Hide desktop eval bar on mobile — sidebar handles it */
          .desktop-eval-bar { display: none !important; }

          /* Analyze panel: keep it compact and readable on phones */
          .cg-analysis-panel {
            width: min(100%, 520px) !important;
            height: min(42vh, 340px) !important;
            margin-left: 0 !important;
            margin-top: 0.35rem;
            align-self: center !important;
            overflow: hidden !important;
          }
          .cg-analysis-card {
            padding: 0.9rem 0.8rem !important;
            gap: 0.55rem !important;
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .cg-analysis-topRow {
            flex-direction: row !important;
            align-items: flex-end !important;
            justify-content: space-between !important;
            gap: 0.75rem !important;
          }
          .cg-analysis-bestMove {
            text-align: right;
            max-width: 40%;
          }
          .cg-analysis-score {
            font-size: 1.7rem !important;
          }
          .cg-analysis-scroll {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
            /* Bottom nav is fixed on mobile (~58px). Ensure list doesn't get covered. */
            padding-bottom: calc(68px + env(safe-area-inset-bottom));
          }
        }
        
        @media (max-width: 768px) and (orientation: landscape) {
          .cg-body { flex-direction: row !important; }
          .cg-board-area { flex-direction: row !important; padding: 0.4rem !important; justify-content: center !important; align-items: center !important; }
          .cg-board-column { width: auto !important; height: 100% !important; flex: 0 0 auto !important; }
          .cg-board-wrap {
            width: min(calc(100vh - 80px), calc(100vw - 220px)) !important;
            height: min(calc(100vh - 80px), calc(100vw - 220px)) !important;
            max-width: 360px !important;
            max-height: 360px !important;
          }
          .cg-sidebar { width: 200px !important; height: 100% !important; border-left: 1px solid var(--border) !important; border-top: none !important; }

          .cg-analysis-panel {
            width: 220px !important;
            height: 100% !important;
            max-height: none !important;
            margin-left: 10px !important;
            margin-top: 0 !important;
            align-self: stretch !important;
          }
          .cg-analysis-topRow {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.55rem !important;
          }
          .cg-analysis-bestMove {
            text-align: left;
            max-width: 100%;
          }
          .cg-analysis-score {
            font-size: 2rem !important;
          }
        }

        @media (max-width: 480px) {
          .cg-board-wrap {
            width: calc(100vw - 0.75rem) !important;
            height: calc(100vw - 0.75rem) !important;
            max-width: 380px !important;
            max-height: 380px !important;
          }
        }
        
        @media (min-width: 769px) {
          .desktop-eval-bar { display: flex !important; }
        }
        
        @keyframes mobile-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="cg-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onBackToMenu && (
            <button className="cb" onClick={onBackToMenu} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
              Back
            </button>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
            {mode === 'local' ? 'Local Play' : mode === 'vsBot' ? 'vs Engine' : mode === 'analyze' ? (savedGame ? 'Game Review' : 'Analysis') : mode === 'online' ? `Online · ${timeControl || 'Custom'}` : 'Game'}
            {mode === 'analyze' && savedGame && isInVariation && <span style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>• Variation</span>}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(mode === 'analyze' || mode === 'vsBot') && (
            <button className="cb" onClick={undoMove} disabled={gameHistory.length === 0}>Undo</button>
          )}
          <button className="cb" onClick={flipBoard}>Flip</button>
          <button className="cb" onClick={resetGame}>New Game</button>
        </div>
      </div>

      {/* Body */}
      <div className="cg-body">
        {/* Board area */}
        <div className="cg-board-area">
          {/* Desktop Eval bar - only shown on desktop */}
          {showTeacher && (
            <div className="desktop-eval-bar" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}>
              <div style={{ 
                height: 'calc(100% - 82px)', 
                display: 'flex',
                alignItems: 'center'
              }}>
                <EvaluationBar
                  evaluation={currentEval}
                  mateIn={currentMateIn}
                  height={-1}
                  width={18}
                  boardOrientation={boardOrientation}
                  gameOver={game.isGameOver()}
                  isDraw={game.isDraw()}
                  winner={game.isCheckmate() ? (game.turn() === 'w' ? 'black' : 'white') : null}
                  fillHeight
                />
              </div>
            </div>
          )}

          {/* Board + player strips column */}
          <div className="cg-board-column" style={{
            display: 'flex', flexDirection: 'column', gap: '5px',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <PlayerStrip side="top" />

            {/* Board */}
            <div className="cg-board-wrap">            <Chessboard
              options={{
                position,
                boardOrientation,
                onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                onSquareClick,
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
                    [lastMove.to]:   { backgroundColor: 'rgba(255,255,255,0.25)' },
                  }),
                  ...(selectedSquare && { [selectedSquare]: { backgroundColor: 'rgba(255,255,255,0.2)' } }),
                  ...legalMoves.reduce((acc, sq) => {
                    acc[sq] = { background: 'radial-gradient(circle,rgba(255,255,255,0.3) 20%,transparent 22%)' };
                    return acc;
                  }, {} as Record<string, React.CSSProperties>),
                },
              }}
            />

            {/* Promotion Dialog */}
            {showPromotionDialog && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 200,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)'
              }} role="dialog" aria-modal="true">
                <div style={{
                  background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
                  padding: '1.5rem', borderRadius: '8px', textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '14px', fontWeight: 600, color: '#fff',
                    marginBottom: '1rem', fontFamily: 'Space Grotesk, sans-serif'
                  }}>Promote to</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['q', 'r', 'b', 'n'].map((piece) => {
                      const isWhite = game.turn() === 'w';
                      const symbols: Record<string, string> = {
                        q: isWhite ? '♕' : '♛',
                        r: isWhite ? '♖' : '♜',
                        b: isWhite ? '♗' : '♝',
                        n: isWhite ? '♘' : '♞'
                      };
                      const names: Record<string, string> = {
                        q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight'
                      };
                      return (
                        <button
                          key={piece}
                          onClick={() => handlePromotion(piece)}
                          style={{
                            width: '64px', height: '64px',
                            fontSize: '36px',
                            background: '#2a2a2a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#3a3a3a';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#2a2a2a';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          }}
                          type="button"
                          title={names[piece]}
                        >
                          <span>{symbols[piece]}</span>
                          <span style={{ fontSize: '10px', color: '#888' }}>{names[piece]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Move quality badges */}
            {moveQualityBadges.map((badge, index) => {
              const file = badge.square.charCodeAt(0) - 97;
              const rank = parseInt(badge.square[1]) - 1;
              const displayFile = boardOrientation === 'white' ? file : 7 - file;
              const displayRank = boardOrientation === 'white' ? 7 - rank : rank;
              const left = displayFile * 12.5 + 9;
              const top  = displayRank * 12.5 + 1;
              const isBook = badge.symbol === '📖';
              return (
                <div key={`${badge.square}-${index}`} style={{
                  position: 'absolute', left: `${left}%`, top: `${top}%`,
                  width: isBook ? '16px' : '18px', height: isBook ? '16px' : '18px',
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  border: `1px solid ${badge.color}`,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isBook ? '8px' : '11px', fontWeight: 'bold',
                  color: badge.color,
                  zIndex: 10, pointerEvents: 'none',
                }}>{badge.symbol}</div>
              );
            })}

            {/* Game over overlay - don't show when reviewing a saved game */}
            {game.isGameOver() && !savedGame && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}>
                <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.15)', padding: '2rem 2.5rem', textAlign: 'center', borderRadius: '4px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#555', marginBottom: 10, textTransform: 'uppercase' }}>{game.isCheckmate() ? 'Checkmate' : 'Draw'}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '1.5rem', letterSpacing: '-0.03em', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {game.isCheckmate() ? (game.turn() === 'w' ? 'Black Wins' : 'White Wins') : 'Game Drawn'}
                  </div>
                  <button className="cb on" onClick={resetGame} style={{ fontSize: '11px' }}>Rematch</button>
                </div>
              </div>
            )}
          </div>

            {/* Bottom player strip */}
            <PlayerStrip side="bottom" />
          </div>

          {/* Analysis Card - positioned next to board */}
          {showTeacher && (
            <div className="cg-analysis-panel" style={{
              width: '280px',
              height: 'calc(100% - 82px)',
              display: 'flex',
              flexDirection: 'column',
              alignSelf: 'center',
              marginLeft: '12px'
            }}>
              <div className="cg-analysis-card" style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1rem',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                overflow: 'hidden'
              }}>
                {/* Evaluation + Best (top row) */}
                <div className="cg-analysis-topRow" style={{ flexShrink: 0 }}>
                  <div style={{ flexShrink: 0 }}>
                    <div className="cg-analysis-score" style={{
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      fontFamily: 'Space Grotesk, sans-serif',
                      letterSpacing: '-0.03em',
                      color: 'var(--white)',
                      lineHeight: 1
                    }}>
                      {gameOver 
                        ? (isDraw ? '½–½' : (winner === 'white' ? '1–0' : '0–1'))
                        : (currentMateIn !== null 
                          ? (currentMateIn > 0 ? `M${currentMateIn}` : `M${Math.abs(currentMateIn)}`)
                          : `${currentEval >= 0 ? '+' : ''}${currentEval.toFixed(1)}`
                        )
                      }
                    </div>
                    <div style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      marginTop: '0.5rem'
                    }}>
                      {gameOver
                        ? (isDraw ? 'Game drawn' : (winner === 'white' ? 'White wins' : 'Black wins'))
                        : (currentMateIn !== null 
                          ? `${currentMateIn > 0 ? 'White' : 'Black'} mates in ${Math.abs(currentMateIn)}`
                          : currentEval > 3 ? 'White is winning'
                          : currentEval > 1 ? 'White is better'
                          : currentEval > 0.5 ? 'White is slightly better'
                          : currentEval < -3 ? 'Black is winning'
                          : currentEval < -1 ? 'Black is better'
                          : currentEval < -0.5 ? 'Black is slightly better'
                          : 'Position is equal'
                        )
                      }
                    </div>
                  </div>

                  {/* Best Move */}
                  {displayBestMove && !gameOver && (
                    <div className="cg-analysis-bestMove" style={{ flexShrink: 0 }}>
                      <div style={{
                        fontSize: '0.65rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        marginBottom: '0.4rem'
                      }}>
                        Best
                      </div>
                      <div style={{
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        wordBreak: 'break-word'
                      }}>
                        {displayBestMove}
                      </div>
                    </div>
                  )}
                </div>

                {/* Last Move Analysis */}
                {(() => {
                  const lastMoveIndex = gameHistory.length - 1;
                  if (lastMoveIndex < 0) return null;
                  
                  const move = gameHistory[lastMoveIndex];
                  if (!move || !move.beforeAnalysis || !move.afterAnalysis) return null;
                  
                  const quality = getMoveQuality(move, lastMoveIndex);
                  const isWhiteMove = lastMoveIndex % 2 === 0;
                  const moveNumber = Math.floor(lastMoveIndex / 2) + 1;
                  const centipawnLoss = calculateMoveCPL(move, lastMoveIndex);
                  
                  // Normalized evals for display only
                  let evalBefore = move.beforeAnalysis.evaluation;
                  let evalAfter = move.afterAnalysis.evaluation;
                  if (move.beforeFen.split(' ')[1] === 'b') evalBefore = -evalBefore;
                  if (move.afterFen.split(' ')[1]  === 'b') evalAfter  = -evalAfter;
                  
                  return (
                    <div style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      flexShrink: 0
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: quality?.color || 'var(--text-primary)', fontSize: '1rem', minWidth: '18px', textAlign: 'center' }}>
                          {quality?.icon || ''}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            {moveNumber}.{isWhiteMove ? '' : '..'} {move.san}
                            {quality && <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit', fontWeight: 400, fontSize: '0.7rem', marginLeft: '0.5rem' }}>— {quality.text.toLowerCase()}</span>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                            {evalBefore >= 0 ? '+' : ''}{evalBefore.toFixed(2)} → {evalAfter >= 0 ? '+' : ''}{evalAfter.toFixed(2)}
                            {centipawnLoss > 0 && <span style={{ color: '#888' }}> ({centipawnLoss}cp)</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Move List */}
                <div className="cg-analysis-scroll" style={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0,
                  marginTop: '0.5rem'
                }}>
                  {gameHistory.length === 0 ? (
                    <div style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem'
                    }}>
                      Make moves to see analysis
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      {gameHistory.map((move, index) => {
                        const isWhiteMove = index % 2 === 0;
                        const moveNumber = Math.floor(index / 2) + 1;
                        const quality = getMoveQuality(move, index);
                        const isSelected = selectedMoveIdx === index;

                        return (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              background: isSelected ? 'var(--bg-hover)' : 'transparent',
                              border: `1px solid ${isSelected ? 'var(--border-light)' : 'transparent'}`,
                              transition: 'all 0.15s'
                            }}
                            onClick={() => {
                              setSelectedMoveIdx(index);
                              const targetMove = gameHistory[index];
                              if (targetMove) {
                                const tempGame = new Chess();
                                gameHistory.slice(0, index + 1).forEach(move => tempGame.move({ from: move.from, to: move.to, promotion: 'q' }));
                                setGame(tempGame);
                                const newFen = tempGame.fen();
                                setPosition(newFen);
                                setLastMove({ from: targetMove.from, to: targetMove.to });
                                
                                // Trigger analysis for the new position
                                if (mode === 'analyze' && isReady) {
                                  analyzePosition(newFen, 12);
                                }
                                
                                if (savedGame && originalMoves.length > 0) {
                                  const currentLine = gameHistory.slice(0, index + 1).map(m => m.san).join(' ');
                                  const originalLine = originalMoves.slice(0, index + 1).join(' ');
                                  setIsInVariation(currentLine !== originalLine);
                                }
                              }
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)'; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div style={{ minWidth: '24px', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'right', marginRight: '0.4rem' }}>
                              {isWhiteMove ? `${moveNumber}.` : ''}
                            </div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: isSelected ? 'var(--white)' : 'var(--text-secondary)', fontSize: '0.8rem', minWidth: '40px' }}>
                              {move.san}
                            </div>
                            {quality && (
                              <div style={{ marginLeft: 'auto', color: quality.color, fontSize: '0.7rem', fontWeight: 700 }}>
                                {quality.icon}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Analyzing indicator */}
                {isAnalyzing && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0,
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border)'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid var(--border)',
                      borderTop: '2px solid var(--text-secondary)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)'
                    }}>
                      Analyzing...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
