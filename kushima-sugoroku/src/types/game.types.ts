export interface Player {
  id: string;
  name: string;
  position: number;
  score: number;
  color: string;
  items: ItemCard[];
  isOnline: boolean;
}

export interface GameRoom {
  id: string;
  pin: string;
  hostId: string;
  players: Player[];
  gameState: GameState;
  currentPlayerId: string;
  maxPlayers: number;
  createdAt: Date;
}

export interface GameState {
  phase: 'waiting' | 'playing' | 'typing' | 'results' | 'finished';
  currentTurn: number;
  totalTurns: number;
  mapData: MapSquare[];
  currentWord?: TypingChallenge;
}

export interface MapSquare {
  id: number;
  type: 'normal' | 'item' | 'boss' | 'special' | 'goal';
  name: string;
  description: string;
  x: number;
  y: number;
  effects?: SquareEffect[];
}

export interface SquareEffect {
  type: 'score_bonus' | 'move_back' | 'skip_turn' | 'get_item';
  value: number;
  description: string;
}

export interface TypingChallenge {
  word: string;
  meaning: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[];
  correctAnswer: number;
  timeLimit: number;
}

export interface ItemCard {
  id: string;
  name: string;
  description: string;
  type: 'defensive' | 'offensive' | 'boost';
  effect: string;
  usageCount: number;
}

export interface DiceRoll {
  value: number;
  playerId: string;
  timestamp: Date;
}

// Re-export all types to ensure they're available
export type {
  Player,
  GameRoom,
  GameState,
  MapSquare,
  SquareEffect,
  TypingChallenge,
  ItemCard,
  DiceRoll
};