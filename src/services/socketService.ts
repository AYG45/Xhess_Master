import { io, Socket } from 'socket.io-client';

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
  private socket: Socket | null = null;
  private isConnected = false;
  private currentPlayerId: string | null = null;
  private callbacks: {
    gameUpdate?: (room: GameRoom) => void;
    gameEnd?: (result: { winner?: 'white' | 'black'; reason: string }) => void;
    playerJoined?: (player: Player) => void;
    playerLeft?: (playerId: string) => void;
    moveReceived?: (move: { from: string; to: string; promotion?: string; fen: string }) => void;
    timeUpdate?: (timeLeft: { white: number; black: number }) => void;
  } = {};

  constructor() {
    // Socket.IO will be initialized on connect
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    // Clean up stale disconnected socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    return new Promise((resolve, reject) => {
      this.socket!.on('connect', () => {
        this.isConnected = true;
        this.currentPlayerId = this.socket!.id ?? null;
        this.setupListeners();
        resolve();
      });

      this.socket!.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('game_update', (room: GameRoom) => {
      if (this.callbacks.gameUpdate) {
        this.callbacks.gameUpdate(room);
      }
    });

    this.socket.on('game_end', (result: { winner?: 'white' | 'black'; reason: string }) => {
      if (this.callbacks.gameEnd) {
        this.callbacks.gameEnd(result);
      }
    });

    this.socket.on('move_made', (move: { from: string; to: string; promotion?: string; fen: string }) => {
      if (this.callbacks.moveReceived) {
        this.callbacks.moveReceived(move);
      }
    });

    this.socket.on('time_update', ({ timeLeft }: { timeLeft: { white: number; black: number } }) => {
      if (this.callbacks.timeUpdate) {
        this.callbacks.timeUpdate(timeLeft);
      }
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
    });

    this.socket.on('player_joined', (player: Player) => {
      if (this.callbacks.playerJoined) {
        this.callbacks.playerJoined(player);
      }
    });

    this.socket.on('player_left', (playerId: string) => {
      if (this.callbacks.playerLeft) {
        this.callbacks.playerLeft(playerId);
      }
    });
  }

  async createRoom(timeControl: string, playerName: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const onCreated = ({ room, playerId }: { room: GameRoom; playerId: string }) => {
        this.socket?.off('error', onError);
        this.currentPlayerId = playerId;
        resolve(room);
      };

      const onError = (error: { message: string }) => {
        this.socket?.off('room_created', onCreated);
        reject(new Error(error.message));
      };

      this.socket.emit('create_room', { timeControl, playerName });
      this.socket.once('room_created', onCreated);
      this.socket.once('error', onError);
    });
  }

  async joinRoom(roomId: string, playerName: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const onJoined = ({ room, playerId }: { room: GameRoom; playerId: string }) => {
        this.socket?.off('error', onError);
        this.currentPlayerId = playerId;
        resolve(room);
      };

      const onError = (error: { message: string }) => {
        this.socket?.off('room_joined', onJoined);
        reject(new Error(error.message));
      };

      this.socket.emit('join_room', { roomId, playerName });
      this.socket.once('room_joined', onJoined);
      this.socket.once('error', onError);
    });
  }

  async makeMove(roomId: string, from: string, to: string, promotion?: string) {
    if (!this.socket) {
      throw new Error('Not connected');
    }

    this.socket.emit('make_move', { roomId, from, to, promotion });
  }

  async findOpponent(timeControl: string, playerName: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const cleanup = () => {
        this.socket?.off('game_found', onFound);
        this.socket?.off('waiting_for_opponent', onWaiting);
        this.socket?.off('error', onError);
      };

      const onFound = ({ room, playerId }: { room: GameRoom; playerId: string }) => {
        cleanup();
        this.currentPlayerId = playerId;
        resolve(room);
      };

      const onWaiting = ({ room, playerId }: { room: GameRoom; playerId: string }) => {
        cleanup();
        this.currentPlayerId = playerId;
        resolve(room);
      };

      const onError = (error: { message: string }) => {
        cleanup();
        reject(new Error(error.message));
      };

      this.socket.emit('find_opponent', { timeControl, playerName });
      this.socket.once('game_found', onFound);
      this.socket.once('waiting_for_opponent', onWaiting);
      this.socket.once('error', onError);
    });
  }

  onGameUpdate(callback: (room: GameRoom) => void) {
    this.callbacks.gameUpdate = callback;
  }

  onPlayerJoined(callback: (player: Player) => void) {
    this.callbacks.playerJoined = callback;
  }

  onPlayerLeft(callback: (playerId: string) => void) {
    this.callbacks.playerLeft = callback;
  }

  onMoveReceived(callback: (move: { from: string; to: string; promotion?: string; fen: string }) => void) {
    this.callbacks.moveReceived = callback;
  }

  onTimeUpdate(callback: (timeLeft: { white: number; black: number }) => void) {
    this.callbacks.timeUpdate = callback;
  }

  onGameEnd(callback: (result: { winner?: 'white' | 'black'; reason: string }) => void) {
    this.callbacks.gameEnd = callback;
  }

  removeAllListeners() {
    this.callbacks = {};
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocketId(): string | undefined {
    return this.currentPlayerId || undefined;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();