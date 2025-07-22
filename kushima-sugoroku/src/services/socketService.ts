import { io, Socket } from 'socket.io-client';
import { GameRoom, Player, TypingChallenge } from '../types/game.types';

// Temporary type for DiceRoll
interface DiceRoll {
  value: number;
  playerId: string;
  timestamp: Date;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(serverUrl?: string): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(serverUrl || 'http://localhost:3001', {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Room management
  createRoom(hostName: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('create_room', { hostName }, (response: { success: boolean; room?: GameRoom; error?: string }) => {
        if (response.success && response.room) {
          resolve(response.room);
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  }

  joinRoom(pin: string, playerName: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('join_room', { pin, playerName }, (response: { success: boolean; room?: GameRoom; error?: string }) => {
        if (response.success && response.room) {
          resolve(response.room);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }

  leaveRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('leave_room', { roomId });
    }
  }

  // Game actions
  rollDice(roomId: string): void {
    if (this.socket) {
      this.socket.emit('roll_dice', { roomId });
    }
  }

  submitTypingAnswer(roomId: string, answer: string, timeTaken: number): void {
    if (this.socket) {
      this.socket.emit('submit_typing_answer', { roomId, answer, timeTaken });
    }
  }

  skipTypingChallenge(roomId: string): void {
    if (this.socket) {
      this.socket.emit('skip_typing_challenge', { roomId });
    }
  }

  submitMeaningAnswer(roomId: string, selectedOption: number): void {
    if (this.socket) {
      this.socket.emit('submit_meaning_answer', { roomId, selectedOption });
    }
  }

  useItem(roomId: string, itemId: string, targetPlayerId?: string): void {
    if (this.socket) {
      this.socket.emit('use_item', { roomId, itemId, targetPlayerId });
    }
  }

  startGame(roomId: string): void {
    if (this.socket) {
      this.socket.emit('start_game', { roomId });
    }
  }

  // Event listeners
  onRoomUpdate(callback: (room: GameRoom) => void): void {
    if (this.socket) {
      this.socket.on('room_updated', callback);
    }
  }

  onPlayerJoined(callback: (player: Player) => void): void {
    if (this.socket) {
      this.socket.on('player_joined', callback);
    }
  }

  onPlayerLeft(callback: (playerId: string) => void): void {
    if (this.socket) {
      this.socket.on('player_left', callback);
    }
  }

  onDiceRolled(callback: (diceRoll: DiceRoll) => void): void {
    if (this.socket) {
      this.socket.on('dice_rolled', callback);
    }
  }

  onPlayerMoved(callback: (playerId: string, newPosition: number) => void): void {
    if (this.socket) {
      this.socket.on('player_moved', callback);
    }
  }

  onTypingChallenge(callback: (challenge: TypingChallenge) => void): void {
    if (this.socket) {
      this.socket.on('typing_challenge', callback);
    }
  }

  onGameStateChanged(callback: (gameState: any) => void): void {
    if (this.socket) {
      this.socket.on('game_state_changed', callback);
    }
  }

  onError(callback: (error: string) => void): void {
    if (this.socket) {
      this.socket.on('game_error', callback);
    }
  }

  // Cleanup listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const socketService = new SocketService();
export default socketService;