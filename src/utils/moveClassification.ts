// Chess.com-style move classification using Centipawn Loss (CPL)
// Based on actual Chess.com implementation research

/**
 * Classify a move based on centipawn loss
 * @param centipawnLoss - How many centipawns were lost compared to best move
 * @param isBookMove - Whether this move is in opening theory
 * @param isSacrifice - Whether the move sacrifices material
 * @param isOnlyGoodMove - Whether this is the only good move in position
 * @param isForcedWin - Whether this move leads to forced mate/win
 * @returns Move classification object
 */
export function classifyMove(
  centipawnLoss: number,
  isBookMove: boolean = false,
  isSacrifice: boolean = false,
  isOnlyGoodMove: boolean = false
): {
  type: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';
  color: string;
  icon: string;
  text: string;
} {
  if (centipawnLoss >= 500) {
    return { type: 'blunder',    color: '#dc2626', icon: '⁇', text: 'Blunder' };
  }
  if (isBookMove) {
    return { type: 'book',       color: '#10b981', icon: '📖', text: 'Book' };
  }
  if (centipawnLoss >= 300) {
    return { type: 'blunder',    color: '#dc2626', icon: '⁇', text: 'Blunder' };
  }
  if (centipawnLoss >= 100) {
    return { type: 'mistake',    color: '#f59e0b', icon: '?', text: 'Mistake' };
  }
  if (isSacrifice && centipawnLoss <= 30) {
    return { type: 'brilliant',  color: '#06b6d4', icon: '‼', text: 'Brilliant' };
  }
  if (centipawnLoss <= 10 || isOnlyGoodMove) {
    return { type: 'best',       color: '#22c55e', icon: '✓', text: 'Best' };
  }
  if (centipawnLoss <= 20) {
    return { type: 'excellent',  color: '#3b82f6', icon: '!', text: 'Excellent' };
  }
  if (centipawnLoss <= 50) {
    return { type: 'good',       color: '#8b5cf6', icon: '○', text: 'Good' };
  }
  return { type: 'inaccuracy',   color: '#f97316', icon: '⁈', text: 'Inaccuracy' };
}

/**
 * Calculate centipawn loss for a move
 * @param bestMoveEval - Evaluation after the best move in the position  
 * @param playedMoveEval - Evaluation after the played move
 * @param isWhiteMove - Whether it's White's move
 * @returns Centipawn loss (always positive, higher = worse move)
 */
export function calculateCentipawnLoss(
  bestMoveEval: number,
  playedMoveEval: number,
  isWhiteMove: boolean
): number {
  // Convert evaluations to centipawns
  const bestMoveCp = bestMoveEval * 100;
  const playedMoveCp = playedMoveEval * 100;
  
  let cpLoss: number;
  
  if (isWhiteMove) {
    // For White: if played move eval is LOWER than best move eval, that's bad
    // Example: best = -0.5, played = -9.0 → cpLoss = (-50) - (-900) = 850cp loss
    cpLoss = bestMoveCp - playedMoveCp;
  } else {
    // For Black: if played move eval is HIGHER than best move eval, that's bad for Black
    // Example: best = +0.5, played = +9.0 → cpLoss = (+50) - (+900) = -850, but we want positive
    // So for Black: cpLoss = playedMoveCp - bestMoveCp
    cpLoss = playedMoveCp - bestMoveCp;
  }
  
  // Ensure non-negative (centipawn loss should always be positive)
  return Math.max(0, cpLoss);
}

/**
 * Detect if a move is a "Great" move (saves losing position)
 * @param evalBefore - Position evaluation before the move
 * @param evalAfter - Position evaluation after the move
 * @param isWhiteMove - Whether it's White's move
 * @returns True if this is a great move
 */
export function isGreatMove(
  evalBefore: number,
  evalAfter: number,
  isWhiteMove: boolean
): boolean {
  if (isWhiteMove) {
    // White was losing badly (-1.5 or worse) and found a move that saves position (-0.2 or better)
    return evalBefore <= -1.5 && evalAfter >= -0.2;
  } else {
    // Black was losing badly (+1.5 or worse) and found a move that saves position (+0.2 or better)
    return evalBefore >= 1.5 && evalAfter <= 0.2;
  }
}

/**
 * Get a human-readable explanation for the move classification
 */
export function getMoveExplanation(
  type: string,
  centipawnLoss: number
): string {
  switch (type) {
    case 'brilliant':
      return 'An exceptional sacrifice! This move leads to a tactical advantage despite giving up material.';
    case 'best':
      return 'The best move in this position according to the engine.';
    case 'excellent':
      return `An excellent move that loses only ${centipawnLoss} centipawns compared to the best move.`;
    case 'good':
      return `A solid move that loses ${centipawnLoss} centipawns compared to the best move.`;
    case 'great':
      return 'A great move that saves a difficult position!';
    case 'book':
      return 'This move follows established opening theory and is considered sound.';
    case 'inaccuracy':
      return `This move loses ${centipawnLoss} centipawns. Consider more accurate alternatives.`;
    case 'mistake':
      return `This move significantly worsens your position, losing ${centipawnLoss} centipawns.`;
    case 'blunder':
      return `A serious error that loses ${centipawnLoss} centipawns. This could cost you the game.`;
    default:
      return '';
  }
}

// Legacy function for backward compatibility - will be removed
export function evaluationToExpectedPoints(evaluation: number): number {
  return 1 / (1 + Math.pow(10, -evaluation / 4));
}
