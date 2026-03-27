const { Chess } = require('chess.js');

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse body if it's a string (Vercel sometimes sends it as string)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'create':
        const { timeControl, playerName } = body;
        const { minutes, increment } = parseTimeControl(timeControl);
        const initialTime = minutes * 60;
        
        const roomId = generateRoomId();
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        const room = {
          id: roomId,
          timeControl,
          players: { white: playerId, black: null },
          playerNames: { [playerId]: playerName },
          status: 'waiting',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: [],
          currentTurn: 'white',
          timeLeft: { white: initialTime, black: initialTime },
          increment,
          lastMoveTime: Date.now()
        };
        
        gameRooms.set(roomId, room);
        
        res.json({ success: true, room, playerId });
        break;

      case 'join':
        const { roomId: joinRoomId, playerName: joinerName } = body;
        const joinRoom = gameRooms.get(joinRoomId);
        
        if (!joinRoom) {
          res.status(404).json({ error: 'Room not found' });
          return;
        }
        
        if (joinRoom.status !== 'waiting') {
          res.status(400).json({ error: 'Room is not available' });
          return;
        }
        
        if (joinRoom.players.black) {
          res.status(400).json({ error: 'Room is full' });
          return;
        }
        
        const joinPlayerId = `player_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        joinRoom.players.black = joinPlayerId;
        joinRoom.playerNames[joinPlayerId] = joinerName;
        joinRoom.status = 'playing';
        joinRoom.lastMoveTime = Date.now();
        
        res.json({ success: true, room: joinRoom, playerId: joinPlayerId });
        break;

      case 'get':
        const { roomId: getRoomId } = req.query;
        const getRoom = gameRooms.get(getRoomId);
        
        if (!getRoom) {
          res.status(404).json({ error: 'Room not found' });
          return;
        }
        
        res.json({ success: true, room: getRoom });
        break;

      case 'move':
        const { roomId: moveRoomId, playerId: movePlayerId, from, to, promotion } = body;
        const moveRoom = gameRooms.get(moveRoomId);
        
        if (!moveRoom) {
          res.status(404).json({ error: 'Room not found' });
          return;
        }
        
        if (moveRoom.status !== 'playing') {
          res.status(400).json({ error: 'Game is not active' });
          return;
        }
        
        const isWhitePlayer = moveRoom.players.white === movePlayerId;
        const isBlackPlayer = moveRoom.players.black === movePlayerId;
        const isPlayerTurn = (moveRoom.currentTurn === 'white' && isWhitePlayer) || 
                            (moveRoom.currentTurn === 'black' && isBlackPlayer);
        
        if (!isPlayerTurn) {
          res.status(400).json({ error: 'Not your turn' });
          return;
        }
        
        const now = Date.now();
        const elapsed = Math.floor((now - moveRoom.lastMoveTime) / 1000);
        
        if (moveRoom.currentTurn === 'white') {
          moveRoom.timeLeft.white = Math.max(0, moveRoom.timeLeft.white - elapsed);
          if (moveRoom.increment > 0) moveRoom.timeLeft.white += moveRoom.increment;
        } else {
          moveRoom.timeLeft.black = Math.max(0, moveRoom.timeLeft.black - elapsed);
          if (moveRoom.increment > 0) moveRoom.timeLeft.black += moveRoom.increment;
        }
        
        const game = new Chess(moveRoom.fen);
        const move = game.move({ from, to, promotion: promotion || 'q' });
        
        if (!move) {
          res.status(400).json({ error: 'Invalid move' });
          return;
        }
        
        moveRoom.fen = game.fen();
        moveRoom.moves.push(move.san);
        moveRoom.currentTurn = game.turn() === 'w' ? 'white' : 'black';
        moveRoom.lastMoveTime = now;
        
        if (game.isGameOver()) {
          moveRoom.status = 'finished';
          let winner = null;
          let reason = '';
          
          if (game.isCheckmate()) {
            winner = game.turn() === 'w' ? 'black' : 'white';
            reason = 'Checkmate';
          } else if (game.isDraw()) {
            reason = game.isStalemate() ? 'Stalemate' : 
                     game.isThreefoldRepetition() ? 'Threefold repetition' :
                     game.isInsufficientMaterial() ? 'Insufficient material' : 'Draw';
          }
          
          moveRoom.winner = winner;
          moveRoom.reason = reason;
        }
        
        res.json({ success: true, room: moveRoom });
        break;

      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};
