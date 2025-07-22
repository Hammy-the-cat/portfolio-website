import { Server } from 'socket.io';
import { createServer } from 'http';

// ゲーム状態管理クラス（メモリ内）
class GameState {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map();
  }

  createRoom(hostName) {
    const roomId = this.generateId();
    const pin = this.generateRoomPin();
    const hostId = this.generateId();
    
    const room = {
      id: roomId,
      pin: pin,
      hostId: hostId,
      players: [{
        id: hostId,
        name: hostName,
        position: 0,
        score: 0,
        color: this.getPlayerColors()[0],
        items: [],
        isOnline: true
      }],
      gameState: {
        phase: 'waiting',
        currentTurn: 0,
        totalTurns: 50,
        mapData: this.getKushimaMapData(),
        currentWord: null
      },
      currentPlayerId: hostId,
      maxPlayers: 40,
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(hostId, roomId);
    
    return { room, playerId: hostId };
  }

  joinRoom(pin, playerName) {
    const room = Array.from(this.rooms.values()).find(r => r.pin === pin);
    if (!room) throw new Error('ルームが見つかりません');
    if (room.players.length >= room.maxPlayers) throw new Error('ルームが満員です');
    if (room.gameState.phase !== 'waiting') throw new Error('ゲームが既に開始されています');
    if (room.players.some(p => p.name === playerName)) throw new Error('その名前は既に使用されています');

    const playerId = this.generateId();
    const playerColors = this.getPlayerColors();
    const usedColors = room.players.map(p => p.color);
    const availableColors = playerColors.filter(c => !usedColors.includes(c));
    
    const newPlayer = {
      id: playerId,
      name: playerName,
      position: 0,
      score: 0,
      color: availableColors.length > 0 ? availableColors[0] : playerColors[room.players.length % playerColors.length],
      items: [],
      isOnline: true
    };

    room.players.push(newPlayer);
    this.playerRooms.set(playerId, room.id);
    
    return { room, playerId };
  }

  generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  generateRoomPin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  getPlayerColors() {
    return [
      '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'
    ];
  }

  getKushimaMapData() {
    return [
      { id: 0, type: 'normal', name: 'スタート', description: '串間の旅の始まり' },
      { id: 1, type: 'normal', name: 'JR串間駅', description: 'JR日南線の駅。旅の起点' },
      { id: 2, type: 'item', name: '串間市役所', description: '市の中心。情報収集できる！' },
      { id: 3, type: 'normal', name: '中心商店街', description: '地元の商店が立ち並ぶ' },
      { id: 4, type: 'boss', name: '串間神社', description: 'ボス戦！古き神社の試練' },
      { id: 5, type: 'special', name: '幸島', description: '野生動物研究で有名！知識ボーナス' },
      { id: 24, type: 'goal', name: 'ゴール！', description: '串間の旅完全制覇！' }
    ];
  }
}

// グローバル状態（Vercel環境では制限があるため、より軽量化）
const gameState = new GameState();

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO for Vercel...');
    
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.VERCEL_URL ? 
          [`https://${process.env.VERCEL_URL}`, 'http://localhost:3000', 'http://localhost:5173'] :
          ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // ルーム作成
      socket.on('create_room', (data, callback) => {
        try {
          const { hostName } = data;
          if (!hostName?.trim()) {
            callback({ success: false, error: 'プレイヤー名が必要です' });
            return;
          }

          const { room, playerId } = gameState.createRoom(hostName.trim());
          
          socket.join(room.id);
          socket.playerId = playerId;
          socket.roomId = room.id;

          callback({ success: true, room });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // ルーム参加
      socket.on('join_room', (data, callback) => {
        try {
          const { pin, playerName } = data;
          if (!pin || !playerName) {
            callback({ success: false, error: 'PINとプレイヤー名が必要です' });
            return;
          }

          const { room, playerId } = gameState.joinRoom(pin, playerName.trim());
          
          socket.join(room.id);
          socket.playerId = playerId;
          socket.roomId = room.id;

          io.to(room.id).emit('room_updated', room);
          const newPlayer = room.players.find(p => p.id === playerId);
          socket.to(room.id).emit('player_joined', newPlayer);
          
          callback({ success: true, room });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // ゲーム開始（簡易版）
      socket.on('start_game', (data) => {
        try {
          const { roomId } = data;
          const room = gameState.rooms.get(roomId);
          if (room && room.players.length >= 2) {
            room.gameState.phase = 'playing';
            room.currentPlayerId = room.players[0].id;
            io.to(roomId).emit('room_updated', room);
          }
        } catch (error) {
          socket.emit('game_error', error.message);
        }
      });

      // サイコロ（簡易版）
      socket.on('roll_dice', (data) => {
        try {
          const { roomId } = data;
          const playerId = socket.playerId;
          const room = gameState.rooms.get(roomId);
          
          if (room && room.currentPlayerId === playerId) {
            const diceValue = Math.floor(Math.random() * 6) + 1;
            const player = room.players.find(p => p.id === playerId);
            
            if (player) {
              player.position = Math.min(player.position + diceValue, 24);
              
              // 次のプレイヤーのターン
              const currentIndex = room.players.findIndex(p => p.id === playerId);
              const nextIndex = (currentIndex + 1) % room.players.length;
              room.currentPlayerId = room.players[nextIndex].id;
              
              io.to(roomId).emit('dice_rolled', { value: diceValue, playerId, timestamp: new Date() });
              io.to(roomId).emit('player_moved', playerId, player.position);
              io.to(roomId).emit('room_updated', room);
            }
          }
        } catch (error) {
          socket.emit('game_error', error.message);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
}