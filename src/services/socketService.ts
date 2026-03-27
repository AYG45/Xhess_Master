export interface GameRoom {
  id: string;
  timeControl: string;
  players: {
    white?: string;
    black?: string;
  };
  playerNames?: {
    [playerId: string]: string;
  };
  status: 'waiting' | 'playing' | 'finished';
  fen: string;
  moves: string[];
  currentTurn: 'white' | 'black';
  timeLeft?: {
    white: number;
    black: number;
  };
  winner?: 'white' | 'black' | null;
  reason?: string;
}

export interface Player {
  id: string;
  name: string;
  color?: 'white' | 'black';
}

class SocketService {
  private isConnected = false;
  private apiUrl: string;
  private currentPlayerId: string | null = null;
  private pollingInterval: number | null = null;
  private callbacks: {
    gameUpdate?: (room: GameRoom) => void;
    gameEnd?: (result: { winner?: 'white' | 'black'; reason: string }) => void;
  } = {};

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || '/api';
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    return Promise.resolve();
  }

  disconnect() {
    this.isConnected = false;
    this.stopPolling();
  }

  private startPolling(roomId: string) {
    this.stopPolling();
    
    this.pollingInterval = window.setInterval(async () => {
      try {
        const response = await fetch(`${this.apiUrl}/rooms?action=get&roomId=${roomId}`);
        const data = await response.json();
        
        if (data.success && data.room) {
          if (this.callbacks.gameUpdate) {
            this.callbacks.gameUpdate(data.room);
          }
          
          if (data.room.status === 'finished' && this.callbacks.gameEnd) {
            this.callbacks.gameEnd({
              winner: data.room.winner,
              reason: data.room.reason || 'Game ended'
            });
            this.stopPolling();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async createRoom(timeControl: string, playerName: string): Promise<GameRoom> {
    const response = await fetch(`${this.apiUrl}/rooms?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeControl, playerName })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create room');
    }

    this.currentPlayerId = data.playerId;
    this.startPolling(data.room.id);
    
    return data.room;
  }

  async joinRoom(roomId: string, playerName: string): Promise<GameRoom> {
    const response = await fetch(`${this.apiUrl}/rooms?action=join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerName })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to join room');
    }

    this.currentPlayerId = data.playerId;
    this.startPolling(roomId);
    
    return data.room;
  }

  async makeMove(roomId: string, from: string, to: string, promotion?: string) {
    const response = await fetch(`${this.apiUrl}/rooms?action=move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomId, 
        playerId: this.currentPlayerId,
        from, 
        to, 
        promotion 
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to make move');
    }

    if (this.callbacks.gameUpdate) {
      this.callbacks.gameUpdate(data.room);
    }

    return data.room;
  }

  findOpponent(_timeControl: string, _playerName: string) {
    throw new Error('Matchmaking not implemented yet');
  }

  onGameUpdate(callback: (room: GameRoom) => void) {
    this.callbacks.gameUpdate = callback;
  }

  onPlayerJoined(_callback: (player: Player) => void) {
  }

  onPlayerLeft(_callback: (playerId: string) => void) {
  }

  onMoveReceived(_callback: (move: { from: string; to: string; promotion?: string; fen: string }) => void) {
  }

  onGameEnd(callback: (result: { winner?: 'white' | 'black'; reason: string }) => void) {
    this.callbacks.gameEnd = callback;
  }

  removeAllListeners() {
    this.callbacks = {};
    this.stopPolling();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocketId(): string | undefined {
    return this.currentPlayerId || undefined;
  }

  getSocket(): null {
    return null;
  }
}

export const socketService = new SocketService();