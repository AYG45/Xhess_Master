const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game rooms storage
const gameRooms = new Map();
const waitingPlayers = new Map(); // timeControl -> [players]

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new game room
function createGameRoom(timeControl, creatorId, creatorName) {
  const roomId = generateRoomId();
  
  let minutes = 3;
  let increment = 0;
  
  if (timeControl.includes('min')) {
    minutes = parseInt(timeControl.replace('min', '')) || 3;
  } else if (timeControl.includes('+')) {
    const parts = timeControl.split('+');
    minutes = parseInt(parts[0]) || 3;
    increment = parseInt(parts[1]) || 0;
  } else {
    minutes = parseInt(timeControl) || 3;
  }
  
  const initialTime = minutes * 60;
  
  const room = {
    id: roomId,
    timeControl,
    players: {
      white: creatorId,
      black: null
    },
    playerNames: {
      [creatorId]: creatorName
    },
    status: 'waiting',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    currentTurn: 'white',
    timeLeft: {
      white: initialTime,
      black: initialTime
    },
    increment: increment,
    game: new Chess()
  };
  
  gameRooms.set(roomId, room);
  return room;
}

io.on('connection', (socket) => {
  // Create a new game room
  socket.on('create_room', ({ timeControl, playerName }) => {
    try {
      const room = createGameRoom(timeControl, socket.id, playerName);
      socket.join(room.id);
      
      socket.emit('room_created', {
        id: room.id,
        timeControl: room.timeControl,
        players: room.players,
        playerNames: room.playerNames,
        status: room.status,
        fen: room.fen,
        moves: room.moves,
        currentTurn: room.currentTurn,
        timeLeft: room.timeLeft
      });
    } catch (error) {
      socket.emit('error', 'Failed to create room');
    }
  });

  // Join an existing room
  socket.on('join_room', ({ roomId, playerName }) => {
    try {
      const room = gameRooms.get(roomId);
      
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      if (room.status !== 'waiting') {
        socket.emit('error', 'Room is not available');
        return;
      }
      
      if (room.players.black) {
        socket.emit('error', 'Room is full');
        return;
      }
      
      // Add player to room
      room.players.black = socket.id;
      room.playerNames[socket.id] = playerName;
      room.status = 'playing';
      
      socket.join(roomId);
      
      // Notify both players
      io.to(roomId).emit('game_update', {
        id: room.id,
        timeControl: room.timeControl,
        players: room.players,
        playerNames: room.playerNames,
        status: room.status,
        fen: room.fen,
        moves: room.moves,
        currentTurn: room.currentTurn,
        timeLeft: room.timeLeft
      });
      
      socket.emit('room_joined', {
        id: room.id,
        timeControl: room.timeControl,
        players: room.players,
        playerNames: room.playerNames,
        status: room.status,
        fen: room.fen,
        moves: room.moves,
        currentTurn: room.currentTurn,
        timeLeft: room.timeLeft
      });
    } catch (error) {
      socket.emit('error', 'Failed to join room');
    }
  });

  // Find opponent (matchmaking)
  socket.on('find_opponent', ({ timeControl, playerName }) => {
    try {
      // Check if there's a waiting player with the same time control
      if (!waitingPlayers.has(timeControl)) {
        waitingPlayers.set(timeControl, []);
      }
      
      const waiting = waitingPlayers.get(timeControl);
      
      if (waiting.length > 0) {
        // Match with waiting player
        const opponent = waiting.shift();
        const room = createGameRoom(timeControl, opponent.id, opponent.name);
        
        // Add current player as black
        room.players.black = socket.id;
        room.playerNames[socket.id] = playerName;
        room.status = 'playing';
        
        // Join both players to room
        socket.join(room.id);
        io.sockets.sockets.get(opponent.id)?.join(room.id);
        
        // Notify both players
        io.to(room.id).emit('game_found', {
          id: room.id,
          timeControl: room.timeControl,
          players: room.players,
          playerNames: room.playerNames,
          status: room.status,
          fen: room.fen,
          moves: room.moves,
          currentTurn: room.currentTurn,
          timeLeft: room.timeLeft
        });
      } else {
        waiting.push({ id: socket.id, name: playerName });
        socket.emit('waiting_for_opponent');
      }
    } catch (error) {
      socket.emit('error', 'Failed to find opponent');
    }
  });

  // Make a move
  socket.on('make_move', ({ roomId, from, to, promotion }) => {
    try {
      const room = gameRooms.get(roomId);
      
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      if (room.status !== 'playing') {
        socket.emit('error', 'Game is not active');
        return;
      }
      
      // Check if it's the player's turn
      const isWhitePlayer = room.players.white === socket.id;
      const isBlackPlayer = room.players.black === socket.id;
      const isPlayerTurn = (room.currentTurn === 'white' && isWhitePlayer) || 
                          (room.currentTurn === 'black' && isBlackPlayer);
      
      if (!isPlayerTurn) {
        socket.emit('error', 'Not your turn');
        return;
      }
      
      if (room.increment > 0) {
        if (room.currentTurn === 'white') {
          room.timeLeft.white += room.increment;
        } else {
          room.timeLeft.black += room.increment;
        }
      }
      
      // Make the move
      const move = room.game.move({ from, to, promotion: promotion || 'q' });
      
      if (!move) {
        socket.emit('error', 'Invalid move');
        return;
      }
      
      // Update room state
      room.fen = room.game.fen();
      room.moves.push(move.san);
      room.currentTurn = room.game.turn() === 'w' ? 'white' : 'black';
      
      // Check for game end
      if (room.game.isGameOver()) {
        room.status = 'finished';
        let winner = null;
        let reason = '';
        
        if (room.game.isCheckmate()) {
          winner = room.game.turn() === 'w' ? 'black' : 'white';
          reason = 'Checkmate';
        } else if (room.game.isDraw()) {
          reason = room.game.isStalemate() ? 'Stalemate' : 
                   room.game.isThreefoldRepetition() ? 'Threefold repetition' :
                   room.game.isInsufficientMaterial() ? 'Insufficient material' : 'Draw';
        }
        
        io.to(roomId).emit('game_end', { winner, reason });
      }
      
      // Broadcast move to opponent
      socket.to(roomId).emit('move_received', { from, to, promotion, fen: room.fen });
      
      // Update game state for all players
      io.to(roomId).emit('game_update', {
        id: room.id,
        timeControl: room.timeControl,
        players: room.players,
        playerNames: room.playerNames,
        status: room.status,
        fen: room.fen,
        moves: room.moves,
        currentTurn: room.currentTurn,
        timeLeft: room.timeLeft
      });
      
    } catch (error) {
      socket.emit('error', 'Failed to make move');
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (const [timeControl, waiting] of waitingPlayers.entries()) {
      const index = waiting.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        waiting.splice(index, 1);
      }
    }
    
    // Handle game room disconnection
    for (const [roomId, room] of gameRooms.entries()) {
      if (room.players.white === socket.id || room.players.black === socket.id) {
        if (room.status === 'playing') {
          socket.to(roomId).emit('player_left', socket.id);
          socket.to(roomId).emit('game_end', { 
            winner: room.players.white === socket.id ? 'black' : 'white', 
            reason: 'Opponent disconnected' 
          });
        }
        
        gameRooms.delete(roomId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

// Timer update system - update every second
setInterval(() => {
  for (const [roomId, room] of gameRooms.entries()) {
    if (room.status === 'playing') {
      if (room.currentTurn === 'white') {
        room.timeLeft.white = Math.max(0, room.timeLeft.white - 1);
        if (room.timeLeft.white <= 0) {
          room.status = 'finished';
          io.to(roomId).emit('game_end', { winner: 'black', reason: 'Time out' });
          continue;
        }
      } else {
        room.timeLeft.black = Math.max(0, room.timeLeft.black - 1);
        if (room.timeLeft.black <= 0) {
          room.status = 'finished';
          io.to(roomId).emit('game_end', { winner: 'white', reason: 'Time out' });
          continue;
        }
      }
      
      io.to(roomId).emit('time_update', {
        timeLeft: room.timeLeft,
        currentTurn: room.currentTurn
      });
    }
  }
}, 1000);

// Clean up empty waiting lists periodically
setInterval(() => {
  for (const [timeControl, waiting] of waitingPlayers.entries()) {
    if (waiting.length === 0) {
      waitingPlayers.delete(timeControl);
    }
  }
}, 60000); // Every minute