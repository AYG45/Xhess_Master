export interface ChessOpening {
  name: string;
  eco: string; // Encyclopedia of Chess Openings code
  moves: string[];
  description: string;
  category: 'e4' | 'd4' | 'nf3' | 'c4' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number; // 1-5 stars
  mainIdeas: string[];
  commonContinuations?: string[];
  famousGames?: { white: string; black: string; year: number; result: string }[];
}

export const CHESS_OPENINGS: ChessOpening[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // KING'S PAWN OPENINGS (1.e4)
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    name: "Italian Game",
    eco: "C50",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    description: "One of the oldest chess openings, focusing on rapid development and central control.",
    category: "e4",
    difficulty: "beginner",
    popularity: 5,
    mainIdeas: [
      "Develop pieces quickly toward the center",
      "Control the center with pawns and pieces", 
      "Castle early for king safety",
      "Attack the f7 square (Black's weakness)"
    ],
    commonContinuations: ["Be7", "f5", "Bc5", "d6"],
    famousGames: [
      { white: "Greco", black: "NN", year: 1619, result: "1-0" }
    ]
  },

  {
    name: "Ruy Lopez (Spanish Opening)",
    eco: "C60",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    description: "Named after Spanish priest Ruy López, this opening puts pressure on Black's center.",
    category: "e4",
    difficulty: "intermediate", 
    popularity: 5,
    mainIdeas: [
      "Attack the knight that defends e5",
      "Maintain central tension",
      "Prepare d3 and castle kingside",
      "Long-term positional pressure"
    ],
    commonContinuations: ["a6", "Nf6", "Be7", "f5"]
  },

  {
    name: "Sicilian Defense",
    eco: "B20",
    moves: ["e4", "c5"],
    description: "Black's most popular response to 1.e4, leading to sharp, tactical games.",
    category: "e4",
    difficulty: "intermediate",
    popularity: 5,
    mainIdeas: [
      "Fight for central control asymmetrically",
      "Create counterplay on the queenside",
      "Avoid symmetrical pawn structures",
      "Sharp tactical complications"
    ],
    commonContinuations: ["Nf3", "d6", "Nc3", "g6"]
  },

  {
    name: "French Defense", 
    eco: "C00",
    moves: ["e4", "e6"],
    description: "A solid defense that leads to closed, strategic positions.",
    category: "e4",
    difficulty: "intermediate",
    popularity: 4,
    mainIdeas: [
      "Support d5 pawn advance",
      "Create solid pawn chain",
      "Develop light-squared bishop actively",
      "Counterplay on the queenside"
    ]
  },

  {
    name: "Caro-Kann Defense",
    eco: "B10", 
    moves: ["e4", "c6"],
    description: "A reliable defense avoiding the cramped positions of the French Defense.",
    category: "e4",
    difficulty: "beginner",
    popularity: 4,
    mainIdeas: [
      "Support d5 without blocking the light-squared bishop",
      "Solid pawn structure",
      "Less cramped than French Defense",
      "Good piece activity"
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUEEN'S PAWN OPENINGS (1.d4)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Queen's Gambit",
    eco: "D06",
    moves: ["d4", "d5", "c4"],
    description: "White offers a pawn to gain central control and rapid development.",
    category: "d4",
    difficulty: "intermediate",
    popularity: 5,
    mainIdeas: [
      "Control the center with pawns",
      "Rapid piece development",
      "Pressure on Black's d5 pawn",
      "Superior pawn structure if accepted"
    ],
    commonContinuations: ["dxc4", "e6", "c6", "Nf6"]
  },

  {
    name: "King's Indian Defense",
    eco: "E60",
    moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"],
    description: "A hypermodern defense where Black allows White central control initially.",
    category: "d4", 
    difficulty: "advanced",
    popularity: 4,
    mainIdeas: [
      "Fianchetto the king's bishop",
      "Castle kingside quickly",
      "Counter-attack in the center later",
      "Sharp tactical complications"
    ]
  },

  {
    name: "Nimzo-Indian Defense",
    eco: "E20",
    moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"],
    description: "Black pins the knight and fights for central control.",
    category: "d4",
    difficulty: "advanced", 
    popularity: 4,
    mainIdeas: [
      "Pin the knight to disrupt White's setup",
      "Control the e4 square",
      "Create doubled pawns for White",
      "Solid but active piece play"
    ]
  },

  {
    name: "Queen's Indian Defense",
    eco: "E12",
    moves: ["d4", "Nf6", "c4", "e6", "Nf3", "b6"],
    description: "Black fianchettoes the queen's bishop to control central squares.",
    category: "d4",
    difficulty: "intermediate",
    popularity: 3,
    mainIdeas: [
      "Fianchetto the queen's bishop",
      "Control the e4 square",
      "Solid pawn structure",
      "Flexible piece development"
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGLISH OPENING (1.c4)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "English Opening",
    eco: "A10",
    moves: ["c4"],
    description: "A flexible opening that can transpose into many different systems.",
    category: "c4",
    difficulty: "intermediate",
    popularity: 4,
    mainIdeas: [
      "Control the d5 square",
      "Flexible development",
      "Possible transpositions",
      "Hypermodern approach"
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RÉTI OPENING (1.Nf3)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Réti Opening",
    eco: "A04",
    moves: ["Nf3"],
    description: "A hypermodern opening that develops pieces before committing pawns.",
    category: "nf3",
    difficulty: "intermediate", 
    popularity: 3,
    mainIdeas: [
      "Develop pieces first",
      "Keep pawn structure flexible",
      "Control center with pieces",
      "Possible transpositions"
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER OPENINGS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: "Bird's Opening",
    eco: "A02",
    moves: ["f4"],
    description: "An aggressive opening that immediately fights for the e5 square.",
    category: "other",
    difficulty: "intermediate",
    popularity: 2,
    mainIdeas: [
      "Control the e5 square",
      "Kingside attack potential",
      "Unbalanced positions",
      "Surprise value"
    ]
  },

  {
    name: "Alekhine's Defense",
    eco: "B02",
    moves: ["e4", "Nf6"],
    description: "Black immediately attacks the e4 pawn, provoking White to advance.",
    category: "e4",
    difficulty: "advanced",
    popularity: 2,
    mainIdeas: [
      "Provoke White's pawns forward",
      "Create targets in White's center",
      "Hypermodern piece play",
      "Sharp tactical play"
    ]
  },

  {
    name: "Scandinavian Defense",
    eco: "B01",
    moves: ["e4", "d5"],
    description: "Black immediately challenges White's central pawn.",
    category: "e4",
    difficulty: "beginner",
    popularity: 3,
    mainIdeas: [
      "Immediate central challenge",
      "Quick development",
      "Simple piece play",
      "Good for beginners"
    ]
  }
];

// Helper function to get opening moves by move number for the teacher
export const getOpeningMovesByMoveNumber = (moveNumber: number): Set<string> => {
  const moves = new Set<string>();
  
  // Only include moves that are part of actual opening theory up to move 12
  if (moveNumber <= 12) {
    CHESS_OPENINGS.forEach(opening => {
      // Only include the actual opening moves, not common continuations
      opening.moves.forEach((move, index) => {
        // Only include moves up to the current move number being evaluated
        if (index < moveNumber) {
          moves.add(move);
        }
      });
    });
    
    // Add some essential opening moves that might not be in our specific openings
    if (moveNumber <= 6) {
      // First 6 moves - very common opening moves
      const earlyMoves = [
        'e4', 'e5', 'd4', 'd5', 'Nf3', 'Nc6', 'Nf6', 'Nc3', 'Bb5', 'Bc4', 'Be2', 'Bg5',
        'c4', 'c5', 'g3', 'g6', 'Bg2', 'Bg7', 'O-O', 'h3', 'h6', 'a3', 'a6', 'd3', 'd6',
        'Re1', 'Be3', 'Bd2', 'Qe2', 'Qd2', 'Nbd2', 'Be7', 'Bd6', 'Bb4', 'Ba4', 'Bxc6'
      ];
      earlyMoves.forEach(move => moves.add(move));
    } else if (moveNumber <= 10) {
      // Moves 7-10 - more specific development
      const midOpeningMoves = [
        'Qc2', 'Qb3', 'Qa4', 'Qh5', 'Nd5', 'Ne4', 'Ng5', 'Nh4', 'Nf5', 'Ne5',
        'Rb1', 'Rd1', 'Rc1', 'Rf1', 'b3', 'b4', 'f3', 'f4', 'Bh4', 'Bf4'
      ];
      midOpeningMoves.forEach(move => moves.add(move));
    }
  }
  
  return moves;
};

// Helper function to find opening by moves
export const findOpeningByMoves = (moves: string[]): ChessOpening | null => {
  return CHESS_OPENINGS.find(opening => {
    if (moves.length < opening.moves.length) return false;
    return opening.moves.every((move, index) => moves[index] === move);
  }) || null;
};

// Helper function to get openings by category
export const getOpeningsByCategory = (category: ChessOpening['category']): ChessOpening[] => {
  return CHESS_OPENINGS.filter(opening => opening.category === category);
};

// Helper function to get openings by difficulty
export const getOpeningsByDifficulty = (difficulty: ChessOpening['difficulty']): ChessOpening[] => {
  return CHESS_OPENINGS.filter(opening => opening.difficulty === difficulty);
};

// Helper function to detect opening from game moves
export const detectOpeningFromMoves = (gameMoves: string[]): { opening: ChessOpening | null; moveInOpening: number } => {
  // Find the longest matching opening
  let bestMatch: ChessOpening | null = null;
  let bestMatchLength = 0;
  
  for (const opening of CHESS_OPENINGS) {
    let matchLength = 0;
    for (let i = 0; i < Math.min(opening.moves.length, gameMoves.length); i++) {
      if (opening.moves[i] === gameMoves[i]) {
        matchLength++;
      } else {
        break;
      }
    }
    
    if (matchLength > bestMatchLength && matchLength >= opening.moves.length) { // All opening moves must match
      bestMatch = opening;
      bestMatchLength = matchLength;
    }
  }
  
  return {
    opening: bestMatch,
    moveInOpening: bestMatchLength
  };
};

// Helper function to check if a move is theoretically sound in the opening
export const isMoveInOpeningTheory = (gameMoves: string[], moveNumber: number): boolean => {
  // Only check if we're in the opening phase (first 15 moves)
  if (moveNumber > 15) return false;
  
  // Check if the current move sequence follows a known opening
  const detection = detectOpeningFromMoves(gameMoves);
  
  // If all moves so far match a known opening line, it's a book move
  if (detection.opening && detection.moveInOpening === gameMoves.length) {
    return true;
  }
  
  // If we matched a known opening and the current move is a common continuation
  if (detection.opening && detection.moveInOpening >= detection.opening.moves.length && detection.moveInOpening === gameMoves.length - 1) {
    const currentMove = gameMoves[gameMoves.length - 1];
    return detection.opening.commonContinuations?.includes(currentMove) || false;
  }
  
  // For early moves (first 4 half-moves), allow well-known opening moves
  if (gameMoves.length <= 4) {
    const currentMove = gameMoves[gameMoves.length - 1];
    const knownOpeningMoves = new Set([
      // White's common first moves
      'e4', 'd4', 'Nf3', 'c4', 'g3', 'b3', 'f4',
      // Black's common responses to 1.e4
      'e5', 'c5', 'e6', 'd5', 'Nf6', 'g6', 'c6', 'd6',
      // Black's common responses to 1.d4
      'Nf6', 'd5', 'f5', 'e6',
      // Common second moves
      'Nc6', 'Nc3', 'Bc4', 'Bb5', 'Bb4', 'Be2', 'Bg5',
      'Bc5', 'Be7', 'Bd6', 'Bg7',
      'O-O', 'a6', 'a3', 'h3', 'h6', 'd3', 'd6',
    ]);
    return knownOpeningMoves.has(currentMove);
  }
  
  return false;
};