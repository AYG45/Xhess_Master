const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

const gameRooms = new Map();
const waitingPlayers = new Map();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function parseTimeControl(timeControl) {
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
  
  return { minutes, increment };
}

function createGameRoom(timeControl, creatorId, creatorName) {
  const roomId = generateRoomId();
  const { minutes, increment } = parseTimeControl(timeControl);
  const initialTime = minutes * 60;
  
  const room = {
    id: roomId,
    timeControl,
    players: { white: creatorId, black: null },
    playerNames: { [creatorId]: creatorName },
    status: 'waiting',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    currentTurn: 'white',
    timeLeft: { white: initialTime, black: initialTime },
    increment,
    game: new Chess()
  };
  
  gameRooms.set(roomId, room);
  return room;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_room', ({ timeControl, playerName }) => {
    try {
      const room = createGameRoom(timeControl, socket.id, playerName);
      socket.join(room.id);
      
      socket.emit('room_created', {
        room: {
          id: room.id,
          timeControl: room.timeControl,
          players: room.players,
          playerNames: room.playerNames,
          status: room.status,
          fen: room.fen,
          moves: room.moves,
          currentTurn: room.currentTurn,
          timeLeft: room.timeLeft
        },
        playerId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    try {
      const room = gameRooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Room is not available' });
        return;
      }
      
      if (room.players.black) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      
      room.players.black = socket.id;
      room.playerNames[socket.id] = playerName;
      room.status = 'playing';
      
      socket.join(roomId);
      
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
        room: {
          id: room.id,
          timeControl: room.timeControl,
          players: room.players,
          playerNames: room.playerNames,
          status: room.status,
          fen: room.fen,
          moves: room.moves,
          currentTurn: room.currentTurn,
          timeLeft: room.timeLeft
        },
        playerId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('find_opponent', ({ timeControl, playerName }) => {
    try {
      if (!waitingPlayers.has(timeControl)) {
        waitingPlayers.set(timeControl, []);
      }
      
      const waiting = waitingPlayers.get(timeControl);
      
      if (waiting.length > 0) {
        const opponent = waiting.shift();
        const room = gameRooms.get(opponent.roomId);
        
        if (room) {
          room.players.black = socket.id;
          room.playerNames[socket.id] = playerName;
          room.status = 'playing';
          
          socket.join(room.id);
          
          io.to(room.id).emit('game_update', {
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
          
          io.to(opponent.id).emit('game_found', {
            room: {
              id: room.id,
              timeControl: room.timeControl,
              players: room.players,
              playerNames: room.playerNames,
              status: room.status,
              fen: room.fen,
              moves: room.moves,
              currentTurn: room.currentTurn,
              timeLeft: room.timeLeft
            },
            playerId: opponent.id
          });
          
          socket.emit('game_found', {
            room: {
              id: room.id,
              timeControl: room.timeControl,
              players: room.players,
              playerNames: room.playerNames,
              status: room.status,
              fen: room.fen,
              moves: room.moves,
              currentTurn: room.currentTurn,
              timeLeft: room.timeLeft
            },
            playerId: socket.id
          });
        }
      } else {
        const tempRoom = createGameRoom(timeControl, socket.id, playerName);
        socket.join(tempRoom.id);
        waiting.push({ id: socket.id, name: playerName, roomId: tempRoom.id });
        
        socket.emit('waiting_for_opponent', {
          room: {
            id: tempRoom.id,
            timeControl: tempRoom.timeControl,
            players: tempRoom.players,
            playerNames: tempRoom.playerNames,
            status: tempRoom.status,
            fen: tempRoom.fen,
            moves: tempRoom.moves,
            currentTurn: tempRoom.currentTurn,
            timeLeft: tempRoom.timeLeft
          },
          playerId: socket.id
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to find opponent' });
    }
  });

  socket.on('make_move', ({ roomId, from, to, promotion }) => {
    try {
      const room = gameRooms.get(roomId);
      
      if (!room || room.status !== 'playing') {
        socket.emit('error', { message: 'Invalid game state' });
        return;
      }
      
      const playerColor = room.players.white === socket.id ? 'white' : 'black';
      if (room.currentTurn !== playerColor) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      
      if (room.increment > 0) {
        room.timeLeft[playerColor] += room.increment;
      }
      
      const move = room.game.move({ from, to, promotion: promotion || 'q' });
      
      if (!move) {
        socket.emit('error', { message: 'Invalid move' });
        return;
      }
      
      room.fen = room.game.fen();
      room.moves.push(move.san);
      room.currentTurn = room.game.turn() === 'w' ? 'white' : 'black';
      
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
      
      io.to(roomId).emit('move_made', { from, to, promotion, fen: room.fen });
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
      socket.emit('error', { message: 'Failed to make move' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    for (const [timeControl, waiting] of waitingPlayers.entries()) {
      const index = waiting.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const player = waiting[index];
        waiting.splice(index, 1);
        if (player.roomId) {
          gameRooms.delete(player.roomId);
        }
      }
    }
    
    for (const [roomId, room] of gameRooms.entries()) {
      if (room.players.white === socket.id || room.players.black === socket.id) {
        if (room.status === 'playing') {
          const winner = room.players.white === socket.id ? 'black' : 'white';
          io.to(roomId).emit('game_end', { winner, reason: 'Opponent disconnected' });
        }
        gameRooms.delete(roomId);
        break;
      }
    }
  });
});

setInterval(() => {
  for (const [roomId, room] of gameRooms.entries()) {
    if (room.status === 'playing') {
      room.timeLeft[room.currentTurn] = Math.max(0, room.timeLeft[room.currentTurn] - 1);
      
      if (room.timeLeft[room.currentTurn] <= 0) {
        room.status = 'finished';
        const winner = room.currentTurn === 'white' ? 'black' : 'white';
        io.to(roomId).emit('game_end', { winner, reason: 'Time out' });
        continue;
      }
      
      io.to(roomId).emit('time_update', { timeLeft: room.timeLeft });
    }
  }
}, 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
