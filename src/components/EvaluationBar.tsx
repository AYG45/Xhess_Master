import React from 'react';

interface EvaluationBarProps {
  evaluation: number;
  mateIn: number | null;
  height?: number;
  width?: number;
  boardOrientation?: 'white' | 'black';
  gameOver?: boolean;
  isDraw?: boolean;
  winner?: 'white' | 'black' | null;
  fillHeight?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  evaluation,
  mateIn,
  height = 400,
  width = 24,
  boardOrientation = 'white',
  gameOver = false,
  isDraw = false,
  winner = null,
  fillHeight = false,
}) => {
  // Convert evaluation to percentage (0-100)
  // Mate positions are treated as extreme evaluations
  const getEvaluationPercentage = () => {
    if (gameOver) {
      if (isDraw) return 50; // Draw = equal
      if (winner === 'white') return 100; // White wins = 100%
      if (winner === 'black') return 0; // Black wins = 0%
    }
    
    if (mateIn !== null) {
      // Complete domination for mate - 100% or 0%
      return mateIn > 0 ? 100 : 0; // White mate = 100%, Black mate = 0%
    }
    
    // Clamp evaluation between -5 and +5, then convert to 0-100%
    const clampedEval = Math.max(-5, Math.min(5, evaluation));
    return 50 + (clampedEval * 8); // Each point = 8% change from center
  };

  const whitePercentage = getEvaluationPercentage();
  const blackPercentage = 100 - whitePercentage;
  
  // When board is flipped (black orientation), flip the bar too
  const isFlipped = boardOrientation === 'black';
  const topColor = isFlipped ? '#fff' : '#000';
  const bottomColor = isFlipped ? '#000' : '#fff';
  const topPercentage = isFlipped ? whitePercentage : blackPercentage;
  const bottomPercentage = isFlipped ? blackPercentage : whitePercentage;

  // Get display text
  const getDisplayText = () => {
    if (gameOver) {
      if (isDraw) return '1/2-1/2';
      if (winner === 'white') return '1-0';
      if (winner === 'black') return '0-1';
    }
    
    if (mateIn !== null) {
      return mateIn > 0 ? `M${mateIn}` : `M${Math.abs(mateIn)}`;
    }
    
    return Math.abs(evaluation).toFixed(1);
  };

  return (
    <div style={{
      width: `${width}px`,
      height: fillHeight ? '100%' : `${height}px`,
      background: '#1a1a1a',
      border: '1px solid var(--border)',
      borderRadius: '3px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Top section */}
      <div style={{
        height: `${topPercentage}%`,
        background: topColor,
        transition: 'height 0.3s ease'
      }} />
      
      {/* Bottom section */}
      <div style={{
        height: `${bottomPercentage}%`,
        background: bottomColor,
        transition: 'height 0.3s ease'
      }} />
      
      {/* Evaluation number */}
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: bottomColor === '#fff' ? '#000' : '#fff',
        fontSize: '7px',
        fontWeight: 700,
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        zIndex: 2,
        letterSpacing: '0.01em'
      }}>
        {getDisplayText()}
      </div>
    </div>
  );
};