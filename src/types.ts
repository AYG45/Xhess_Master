export type GameMode = 'analyze' | 'vsBot' | 'local' | 'online';
export type PlayerColor = 'white' | 'black';
export type BotDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'master';

export const BOT_LEVELS = {
  beginner: { name: 'Beginner (400 ELO)', depth: 1, randomness: 0.4 },
  intermediate: { name: 'Intermediate (1000 ELO)', depth: 5, randomness: 0.2 },
  advanced: { name: 'Advanced (1500 ELO)', depth: 10, randomness: 0.1 },
  master: { name: 'Master (2000+ ELO)', depth: 15, randomness: 0 }
};

export interface SavedGame {
  id: string;
  userId: string;
  gameMode: 'online' | 'vsBot' | 'local';
  playerColor?: PlayerColor;
  botDifficulty?: BotDifficulty;
  moves: string[]; // PGN format moves
  result: 'white' | 'black' | 'draw' | 'ongoing';
  createdAt: number;
  pgn: string;
  finalFen: string;
}
