import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);

// CORS設定
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5177"
  ],
  credentials: true
}));

app.use(express.json());

// Socket.IO設定
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174", 
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
      "http://127.0.0.1:5176",
      "http://127.0.0.1:5177"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// ゲーム状態管理
class GameState {
  constructor() {
    this.rooms = new Map(); // roomId -> GameRoom
    this.playerRooms = new Map(); // playerId -> roomId
  }

  createRoom(hostName) {
    const roomId = uuidv4();
    const pin = this.generateRoomPin();
    const hostId = uuidv4();
    
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
    // PINでルームを検索
    const room = Array.from(this.rooms.values()).find(r => r.pin === pin);
    if (!room) {
      throw new Error('ルームが見つかりません');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('ルームが満員です');
    }

    if (room.gameState.phase !== 'waiting') {
      throw new Error('ゲームが既に開始されています');
    }

    // 同じ名前のプレイヤーが既にいるかチェック
    if (room.players.some(p => p.name === playerName)) {
      throw new Error('その名前は既に使用されています');
    }

    const playerId = uuidv4();
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

  leaveRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    // プレイヤーを削除
    room.players = room.players.filter(p => p.id !== playerId);
    this.playerRooms.delete(playerId);

    // ルームが空になったら削除
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // ホストが退室した場合、新しいホストを任命
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }

    return room;
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ルームが見つかりません');
    
    if (room.players.length < 2) {
      throw new Error('ゲームを開始するには最低2人のプレイヤーが必要です');
    }

    if (room.gameState.phase !== 'waiting') {
      throw new Error('ゲームは既に開始されています');
    }

    room.gameState.phase = 'playing';
    room.currentPlayerId = room.players[0].id;
    
    return room;
  }

  rollDice(roomId, playerId) {
    console.log(`🎲 Player ${playerId} rolling dice in room ${roomId}`);
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ルームが見つかりません');
    
    console.log(`Current game phase: ${room.gameState.phase}, Current player: ${room.currentPlayerId}`);
    
    if (room.currentPlayerId !== playerId) {
      throw new Error('あなたのターンではありません');
    }

    if (room.gameState.phase !== 'playing') {
      throw new Error('ゲーム中ではありません');
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;
    const player = room.players.find(p => p.id === playerId);
    
    if (player) {
      const oldPosition = player.position;
      const newPosition = Math.min(player.position + diceValue, 24); // ゴールは24番目
      player.position = newPosition;
      
      console.log(`🚶 Player ${player.name} moved from ${oldPosition} to ${newPosition}`);
      
      // 特別マスでタイピングチャレンジ発動
      const currentSquare = this.getSquareById(newPosition);
      console.log(`Current square: ${currentSquare ? currentSquare.name : 'Unknown'} (${currentSquare ? currentSquare.type : 'Unknown'})`);
      
      if (currentSquare && this.shouldTriggerTyping(currentSquare.type)) {
        console.log(`⌨️ Triggering typing challenge at ${currentSquare.name}`);
        room.gameState.phase = 'typing';
        room.gameState.currentWord = this.generateTypingChallenge(newPosition);
        return { diceValue, room, newPosition: player.position, typingChallenge: room.gameState.currentWord };
      }
      
      // 次のプレイヤーのターンに移行
      console.log(`⏭️ Moving to next turn`);
      this.nextTurn(room);
      
      // ゲーム終了チェック
      if (newPosition >= 24) {
        console.log(`🏁 Player ${player.name} reached the goal! Game finished.`);
        room.gameState.phase = 'finished';
      }
    }

    return { diceValue, room, newPosition: player.position };
  }

  shouldTriggerTyping(squareType) {
    return ['boss', 'special', 'item'].includes(squareType);
  }

  generateTypingChallenge(position) {
    // 位置に基づいて難易度を決定
    const difficulty = this.getDifficultyByPosition(position);
    return this.getRandomWordByDifficulty(difficulty);
  }

  getDifficultyByPosition(position) {
    if (position < 8) return 'easy';
    if (position < 16) return 'medium';
    return 'hard';
  }

  getRandomWordByDifficulty(difficulty) {
    const words = this.getWordsByDifficulty(difficulty);
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  getWordsByDifficulty(difficulty) {
    const wordDatabase = {
      easy: [
        { word: 'hello', meaning: 'こんにちは', difficulty: 'easy', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correctAnswer: 0, timeLimit: 15 },
        { word: 'book', meaning: '本', difficulty: 'easy', options: ['本', 'ペン', '机', '椅子'], correctAnswer: 0, timeLimit: 15 },
        { word: 'cat', meaning: '猫', difficulty: 'easy', options: ['猫', '犬', '鳥', '魚'], correctAnswer: 0, timeLimit: 15 },
        { word: 'water', meaning: '水', difficulty: 'easy', options: ['水', '火', '風', '土'], correctAnswer: 0, timeLimit: 15 }
      ],
      medium: [
        { word: 'beautiful', meaning: '美しい', difficulty: 'medium', options: ['美しい', '醜い', '大きい', '小さい'], correctAnswer: 0, timeLimit: 12 },
        { word: 'important', meaning: '重要な', difficulty: 'medium', options: ['重要な', '簡単な', '困難な', '面白い'], correctAnswer: 0, timeLimit: 12 },
        { word: 'adventure', meaning: '冒険', difficulty: 'medium', options: ['冒険', '休暇', '勉強', '仕事'], correctAnswer: 0, timeLimit: 12 },
        { word: 'journey', meaning: '旅', difficulty: 'medium', options: ['旅', '家', '学校', '仕事'], correctAnswer: 0, timeLimit: 12 }
      ],
      hard: [
        { word: 'magnificent', meaning: '壮大な', difficulty: 'hard', options: ['壮大な', '小さな', '普通の', '悲しい'], correctAnswer: 0, timeLimit: 10 },
        { word: 'extraordinary', meaning: '並外れた', difficulty: 'hard', options: ['並外れた', '普通の', '簡単な', '退屈な'], correctAnswer: 0, timeLimit: 10 },
        { word: 'philosophy', meaning: '哲学', difficulty: 'hard', options: ['哲学', '科学', '芸術', '運動'], correctAnswer: 0, timeLimit: 10 }
      ]
    };
    
    return wordDatabase[difficulty] || wordDatabase.medium;
  }

  submitTypingAnswer(roomId, playerId, answer, timeTaken) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ルームが見つかりません');
    
    if (room.gameState.phase !== 'typing') {
      throw new Error('タイピングフェーズではありません');
    }

    const currentWord = room.gameState.currentWord;
    if (!currentWord) throw new Error('タイピングチャレンジが見つかりません');

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('プレイヤーが見つかりません');

    // スコア計算
    const isCorrect = answer.toLowerCase().trim() === currentWord.word.toLowerCase().trim();
    const baseScore = isCorrect ? 100 : 25;
    const timeBonus = Math.max(0, currentWord.timeLimit - timeTaken) * 5;
    const difficultyBonus = currentWord.difficulty === 'hard' ? 50 : currentWord.difficulty === 'medium' ? 25 : 0;
    
    const totalScore = Math.floor(baseScore + timeBonus + difficultyBonus);
    player.score += totalScore;

    // ゲーム状態をリセット
    room.gameState.phase = 'playing';
    room.gameState.currentWord = null;
    
    // 次のターンに移行
    this.nextTurn(room);

    return { 
      room, 
      score: totalScore, 
      isCorrect, 
      timeTaken,
      player: player
    };
  }

  skipTypingChallenge(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ルームが見つかりません');
    
    if (room.gameState.phase !== 'typing') {
      throw new Error('タイピングフェーズではありません');
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) throw new Error('プレイヤーが見つかりません');

    // ゲーム状態をリセット
    room.gameState.phase = 'playing';
    room.gameState.currentWord = null;
    
    // 次のターンに移行
    this.nextTurn(room);

    return { 
      room, 
      message: 'タイピングチャレンジをスキップしました',
      player: player
    };
  }

  nextTurn(room) {
    const currentPlayerIndex = room.players.findIndex(p => p.id === room.currentPlayerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
    room.currentPlayerId = room.players[nextPlayerIndex].id;
    
    // ターン数増加
    if (nextPlayerIndex === 0) {
      room.gameState.currentTurn++;
    }
  }

  getSquareById(id) {
    const mapData = this.getKushimaMapData();
    return mapData.find(square => square.id === id);
  }

  generateRoomPin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  getPlayerColors() {
    return [
      '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
      '#f43f5e', '#14b8a6', '#8b5a2b', '#7c2d12', '#1e293b'
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
      { id: 6, type: 'normal', name: '石波の海岸', description: '美しい海岸樹林が広がる' },
      { id: 7, type: 'item', name: '道の駅くしま', description: '地元特産品とアイテム獲得！' },
      { id: 8, type: 'normal', name: 'よかバス停', description: 'コミュニティバスで移動' },
      { id: 9, type: 'special', name: '都井岬', description: '宮崎最南端の絶景地！' },
      { id: 10, type: 'boss', name: '御崎馬繁殖地', description: 'ボス戦！野生馬の守護者' },
      { id: 11, type: 'special', name: '都井岬灯台', description: '日本の灯台50選！歴史ボーナス' },
      { id: 12, type: 'normal', name: 'ソテツ自生地', description: '特別天然記念物の森' },
      { id: 13, type: 'item', name: '都井岬観光案内所', description: '観光情報とアイテム！' },
      { id: 14, type: 'boss', name: '旧吉松家住宅', description: 'ボス戦！重要文化財の試練' },
      { id: 15, type: 'normal', name: '西林院', description: '戦国大名の墓所を訪問' },
      { id: 16, type: 'special', name: '都井岬火まつり会場', description: '夏祭りの熱気！' },
      { id: 17, type: 'normal', name: '日向灘海岸', description: '太平洋の美しい景色' },
      { id: 18, type: 'item', name: '串間の物産館', description: '地元特産品でアイテム補給！' },
      { id: 19, type: 'normal', name: '農業体験施設', description: '串間の農業を体験しよう' },
      { id: 20, type: 'special', name: '志布志湾展望台', description: '湾を一望する絶景！' },
      { id: 21, type: 'normal', name: '森林セラピー基地', description: '癒しの森でリフレッシュ' },
      { id: 22, type: 'boss', name: '串間の守護神', description: '最終ボス！串間の魂と対決' },
      { id: 23, type: 'special', name: '串間完全制覇', description: '串間マスター認定！' },
      { id: 24, type: 'goal', name: 'ゴール！', description: '串間の旅完全制覇！' }
    ];
  }

  getRoomByPlayerId(playerId) {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : null;
  }
}

const gameState = new GameState();

// Socket.IO接続処理
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // ルーム作成
  socket.on('create_room', (data, callback) => {
    try {
      const { hostName } = data;
      if (!hostName || typeof hostName !== 'string' || hostName.trim().length === 0) {
        callback({ success: false, error: 'プレイヤー名が必要です' });
        return;
      }

      const { room, playerId } = gameState.createRoom(hostName.trim());
      
      // Socketをルームに参加
      socket.join(room.id);
      socket.playerId = playerId;
      socket.roomId = room.id;

      console.log(`Room created: ${room.id} (PIN: ${room.pin}) by ${hostName}`);
      callback({ success: true, room });
      
    } catch (error) {
      console.error('Error creating room:', error);
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
      
      // Socketをルームに参加
      socket.join(room.id);
      socket.playerId = playerId;
      socket.roomId = room.id;

      console.log(`Player ${playerName} joined room ${room.id}`);
      
      // ルーム内の全プレイヤーに通知
      io.to(room.id).emit('room_updated', room);
      
      const newPlayer = room.players.find(p => p.id === playerId);
      socket.to(room.id).emit('player_joined', newPlayer);
      
      callback({ success: true, room });
      
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: error.message });
    }
  });

  // ルーム退室
  socket.on('leave_room', (data) => {
    try {
      const playerId = socket.playerId;
      if (!playerId) return;

      const room = gameState.leaveRoom(playerId);
      
      if (room) {
        // ルーム内の残りプレイヤーに通知
        io.to(room.id).emit('room_updated', room);
        socket.to(room.id).emit('player_left', playerId);
      }
      
      socket.leave(socket.roomId);
      socket.playerId = null;
      socket.roomId = null;
      
      console.log(`Player ${playerId} left room`);
      
    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('game_error', error.message);
    }
  });

  // ゲーム開始
  socket.on('start_game', (data, callback) => {
    try {
      const { roomId } = data;
      const room = gameState.startGame(roomId);
      
      // ルーム内全プレイヤーに通知
      io.to(roomId).emit('room_updated', room);
      io.to(roomId).emit('game_state_changed', { 
        phase: 'playing', 
        currentPlayerId: room.currentPlayerId 
      });
      
      console.log(`Game started in room ${roomId}`);
      
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('game_error', error.message);
    }
  });

  // サイコロを振る
  socket.on('roll_dice', (data) => {
    try {
      const { roomId } = data;
      const playerId = socket.playerId;
      
      const result = gameState.rollDice(roomId, playerId);
      
      // ダイス結果を全プレイヤーに通知
      io.to(roomId).emit('dice_rolled', {
        value: result.diceValue,
        playerId: playerId,
        timestamp: new Date()
      });
      
      // プレイヤー移動を通知
      io.to(roomId).emit('player_moved', playerId, result.newPosition);
      
      // ルーム状態更新
      io.to(roomId).emit('room_updated', result.room);
      
      // タイピングチャレンジが発生した場合
      if (result.typingChallenge) {
        io.to(roomId).emit('typing_challenge', result.typingChallenge);
      }
      
      console.log(`Player ${playerId} rolled ${result.diceValue}, moved to position ${result.newPosition}`);
      
    } catch (error) {
      console.error('Error rolling dice:', error);
      socket.emit('game_error', error.message);
    }
  });

  // タイピング回答
  socket.on('submit_typing_answer', (data) => {
    try {
      const { roomId, answer, timeTaken } = data;
      const playerId = socket.playerId;
      
      const result = gameState.submitTypingAnswer(roomId, playerId, answer, timeTaken);
      
      // タイピング結果を全プレイヤーに通知
      io.to(roomId).emit('typing_result', {
        playerId: playerId,
        answer: answer,
        isCorrect: result.isCorrect,
        score: result.score,
        timeTaken: result.timeTaken,
        player: result.player
      });
      
      // ルーム状態更新
      io.to(roomId).emit('room_updated', result.room);
      
      console.log(`Player ${playerId} submitted typing answer: "${answer}" (${result.isCorrect ? 'correct' : 'incorrect'}), earned ${result.score} points`);
      
    } catch (error) {
      console.error('Error submitting typing answer:', error);
      socket.emit('game_error', error.message);
    }
  });

  // タイピングスキップ（タイムアウト時）
  socket.on('skip_typing_challenge', (data) => {
    try {
      const { roomId } = data;
      const playerId = socket.playerId;
      
      const result = gameState.skipTypingChallenge(roomId, playerId);
      
      // スキップ結果を全プレイヤーに通知
      io.to(roomId).emit('typing_skipped', {
        playerId: playerId,
        message: result.message,
        player: result.player
      });
      
      // ルーム状態更新
      io.to(roomId).emit('room_updated', result.room);
      
      console.log(`Player ${playerId} skipped typing challenge`);
      
    } catch (error) {
      console.error('Error skipping typing challenge:', error);
      socket.emit('game_error', error.message);
    }
  });

  // 意味回答（将来的に実装）
  socket.on('submit_meaning_answer', (data) => {
    try {
      const { roomId, selectedOption } = data;
      const playerId = socket.playerId;
      
      // 意味選択の処理は今後実装
      console.log(`Player ${playerId} selected meaning option: ${selectedOption}`);
      
    } catch (error) {
      console.error('Error submitting meaning answer:', error);
      socket.emit('game_error', error.message);
    }
  });

  // 切断処理
  socket.on('disconnect', () => {
    try {
      const playerId = socket.playerId;
      const roomId = socket.roomId;
      
      if (playerId) {
        const room = gameState.getRoomByPlayerId(playerId);
        if (room) {
          // プレイヤーをオフライン状態に
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.isOnline = false;
          }
          
          // ルーム更新を通知
          io.to(roomId).emit('room_updated', room);
        }
      }
      
      console.log(`Player disconnected: ${socket.id}`);
      
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// ヘルスチェック用エンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    rooms: gameState.rooms.size,
    players: gameState.playerRooms.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Kushima Sugoroku Game Server is running!' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Kushima Sugoroku Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});