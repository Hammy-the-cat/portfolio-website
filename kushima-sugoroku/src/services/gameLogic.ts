import { MapSquare, Player, ItemCard, GameRoom, SquareEffect } from '../types/game.types';
import { v4 as uuidv4 } from 'uuid';

class GameLogicService {
  // 宮崎県串間市の実際の地理をモチーフにしたマップデータ
  private kushimaMap: MapSquare[] = [
    { id: 0, type: 'normal', name: 'スタート', description: '串間の旅の始まり', x: 50, y: 450 },
    { id: 1, type: 'normal', name: 'JR串間駅', description: 'JR日南線の駅。旅の起点', x: 100, y: 450 },
    { id: 2, type: 'item', name: '串間市役所', description: '市の中心。情報収集できる！', x: 150, y: 450 },
    { id: 3, type: 'normal', name: '中心商店街', description: '地元の商店が立ち並ぶ', x: 200, y: 450 },
    { id: 4, type: 'boss', name: '串間神社', description: 'ボス戦！古き神社の試練', x: 250, y: 400 },
    { id: 5, type: 'special', name: '幸島', description: '野生動物研究で有名！知識ボーナス', x: 300, y: 380,
       effects: [{ type: 'score_bonus', value: 75, description: '研究ボーナス！' }] },
    { id: 6, type: 'normal', name: '石波の海岸', description: '美しい海岸樹林が広がる', x: 350, y: 340 },
    { id: 7, type: 'item', name: '道の駅くしま', description: '地元特産品とアイテム獲得！', x: 400, y: 300 },
    { id: 8, type: 'normal', name: 'よかバス停', description: 'コミュニティバスで移動', x: 430, y: 260 },
    { id: 9, type: 'special', name: '都井岬', description: '宮崎最南端の絶景地！', x: 450, y: 220,
       effects: [{ type: 'score_bonus', value: 120, description: '絶景ボーナス！' }] },
    { id: 10, type: 'boss', name: '御崎馬繁殖地', description: 'ボス戦！野生馬の守護者', x: 420, y: 180 },
    { id: 11, type: 'special', name: '都井岬灯台', description: '日本の灯台50選！歴史ボーナス', x: 380, y: 140,
       effects: [{ type: 'score_bonus', value: 100, description: '歴史の光！' }] },
    { id: 12, type: 'normal', name: 'ソテツ自生地', description: '特別天然記念物の森', x: 340, y: 120 },
    { id: 13, type: 'item', name: '都井岬観光案内所', description: '観光情報とアイテム！', x: 300, y: 100 },
    { id: 14, type: 'boss', name: '旧吉松家住宅', description: 'ボス戦！重要文化財の試練', x: 260, y: 120 },
    { id: 15, type: 'normal', name: '西林院', description: '戦国大名の墓所を訪問', x: 220, y: 140 },
    { id: 16, type: 'special', name: '都井岬火まつり会場', description: '夏祭りの熱気！', x: 180, y: 160,
       effects: [{ type: 'score_bonus', value: 80, description: '祭りの熱気！' }] },
    { id: 17, type: 'normal', name: '日向灘海岸', description: '太平洋の美しい景色', x: 140, y: 180 },
    { id: 18, type: 'item', name: '串間の物産館', description: '地元特産品でアイテム補給！', x: 100, y: 200 },
    { id: 19, type: 'normal', name: '農業体験施設', description: '串間の農業を体験しよう', x: 80, y: 240 },
    { id: 20, type: 'special', name: '志布志湾展望台', description: '湾を一望する絶景！', x: 60, y: 280,
       effects: [{ type: 'score_bonus', value: 90, description: '湾景ボーナス！' }] },
    { id: 21, type: 'normal', name: '森林セラピー基地', description: '癒しの森でリフレッシュ', x: 80, y: 320 },
    { id: 22, type: 'boss', name: '串間の守護神', description: '最終ボス！串間の魂と対決', x: 120, y: 340 },
    { id: 23, type: 'special', name: '串間完全制覇', description: '串間マスター認定！', x: 160, y: 360,
       effects: [{ type: 'score_bonus', value: 200, description: '串間マスター！' }] },
    { id: 24, type: 'goal', name: 'ゴール！', description: '串間の旅完全制覇！', x: 200, y: 380 }
  ];

  private itemCards: ItemCard[] = [
    {
      id: '1',
      name: '幸島のお守り',
      description: '次のタイピングでスコア2倍！',
      type: 'boost',
      effect: 'score_double',
      usageCount: 1
    },
    {
      id: '2', 
      name: '串間の風',
      description: '他のプレイヤーを1マス戻す',
      type: 'offensive',
      effect: 'move_back_1',
      usageCount: 1
    },
    {
      id: '3',
      name: '温泉の癒し',
      description: '攻撃アイテムを無効化する',
      type: 'defensive',
      effect: 'block_attack',
      usageCount: 1
    },
    {
      id: '4',
      name: 'サーフボード',
      description: '次のターンもう一度サイコロを振れる',
      type: 'boost',
      effect: 'extra_turn',
      usageCount: 1
    },
    {
      id: '5',
      name: '都井岬の呪い',
      description: '他のプレイヤーを1回休みにする',
      type: 'offensive', 
      effect: 'skip_turn',
      usageCount: 1
    },
    {
      id: '6',
      name: '串間グルメ',
      description: 'HPを回復（タイピングミス時のペナルティ軽減）',
      type: 'boost',
      effect: 'hp_recovery',
      usageCount: 2
    }
  ];

  getMapData(): MapSquare[] {
    return this.kushimaMap;
  }

  getSquareById(id: number): MapSquare | undefined {
    return this.kushimaMap.find(square => square.id === id);
  }

  getSquareEffects(squareId: number): SquareEffect[] {
    const square = this.getSquareById(squareId);
    return square?.effects || [];
  }

  generateRandomItem(): ItemCard {
    const randomIndex = Math.floor(Math.random() * this.itemCards.length);
    const baseItem = this.itemCards[randomIndex];
    
    return {
      ...baseItem,
      id: uuidv4() // 一意のIDを生成
    };
  }

  calculateNewPosition(currentPosition: number, diceValue: number): number {
    const newPosition = currentPosition + diceValue;
    const maxPosition = this.kushimaMap.length - 1;
    
    // ゴールを超えた場合はゴールに止める
    return Math.min(newPosition, maxPosition);
  }

  calculateScore(
    baseScore: number, 
    typingTime: number, 
    accuracy: number, 
    squareBonus: number = 0,
    hasScoreDoubler: boolean = false
  ): number {
    // タイピング速度ボーナス（速いほど高得点）
    const speedBonus = Math.max(0, 100 - typingTime * 2);
    
    // 正確性ボーナス
    const accuracyBonus = accuracy * 50;
    
    // 基本計算
    let totalScore = baseScore + speedBonus + accuracyBonus + squareBonus;
    
    // アイテム効果適用
    if (hasScoreDoubler) {
      totalScore *= 2;
    }
    
    return Math.floor(totalScore);
  }

  applySquareEffects(player: Player, squareId: number): { player: Player; message: string } {
    const effects = this.getSquareEffects(squareId);
    let message = '';
    let updatedPlayer = { ...player };

    for (const effect of effects) {
      switch (effect.type) {
        case 'score_bonus':
          updatedPlayer.score += effect.value;
          message += `${effect.description} `;
          break;
        case 'move_back':
          updatedPlayer.position = Math.max(0, updatedPlayer.position - effect.value);
          message += `${effect.value}マス戻る！ `;
          break;
        case 'get_item':
          const newItem = this.generateRandomItem();
          updatedPlayer.items.push(newItem);
          message += `アイテム「${newItem.name}」を獲得！ `;
          break;
        case 'skip_turn':
          message += '1回休み！ ';
          // This would need to be handled by the game state management
          break;
      }
    }

    return { player: updatedPlayer, message: message.trim() };
  }

  useItem(player: Player, itemId: string, targetPlayer?: Player): { 
    updatedPlayer: Player; 
    updatedTarget?: Player; 
    message: string;
    success: boolean;
  } {
    const itemIndex = player.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return { updatedPlayer: player, message: 'アイテムが見つかりません', success: false };
    }

    const item = player.items[itemIndex];
    let updatedPlayer = { ...player };
    let updatedTarget = targetPlayer ? { ...targetPlayer } : undefined;
    let message = '';

    switch (item.effect) {
      case 'move_back_1':
        if (updatedTarget) {
          updatedTarget.position = Math.max(0, updatedTarget.position - 1);
          message = `${updatedTarget.name}を1マス戻しました！`;
        } else {
          return { updatedPlayer: player, message: 'ターゲットが必要です', success: false };
        }
        break;
      
      case 'skip_turn':
        if (updatedTarget) {
          message = `${updatedTarget.name}を1回休みにしました！`;
          // Skip turn logic would be handled by game state
        } else {
          return { updatedPlayer: player, message: 'ターゲットが必要です', success: false };
        }
        break;
      
      case 'score_double':
        message = '次のタイピングでスコア2倍効果が発動します！';
        // This effect would be applied during typing challenge
        break;
        
      case 'extra_turn':
        message = '次のターンでもう一度サイコロを振れます！';
        break;
        
      case 'hp_recovery':
        message = 'HPが回復しました！次のミスのペナルティが軽減されます！';
        break;
        
      case 'block_attack':
        message = '次の攻撃を無効化する準備ができました！';
        break;
    }

    // アイテム使用回数を減らす
    item.usageCount -= 1;
    if (item.usageCount <= 0) {
      updatedPlayer.items.splice(itemIndex, 1);
    } else {
      updatedPlayer.items[itemIndex] = item;
    }

    return { 
      updatedPlayer, 
      updatedTarget, 
      message: `${item.name}を使用！ ${message}`, 
      success: true 
    };
  }

  checkWinCondition(players: Player[]): Player | null {
    const goalPosition = this.kushimaMap.length - 1;
    return players.find(player => player.position >= goalPosition) || null;
  }

  generateRoomPin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  getPlayerColors(): string[] {
    return [
      '#ef4444', // red
      '#3b82f6', // blue  
      '#22c55e', // green
      '#f59e0b', // yellow
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
      '#6366f1', // indigo
    ];
  }

  getDifficultyByPosition(position: number): 'easy' | 'medium' | 'hard' {
    const totalSquares = this.kushimaMap.length;
    const progress = position / totalSquares;
    
    if (progress < 0.3) return 'easy';
    if (progress < 0.7) return 'medium';
    return 'hard';
  }

  getSquareDisplayName(position: number): string {
    const square = this.getSquareById(position);
    return square ? square.name : `マス${position}`;
  }

  isSpecialSquare(position: number): boolean {
    const square = this.getSquareById(position);
    return square ? ['item', 'boss', 'special'].includes(square.type) : false;
  }
}

export const gameLogic = new GameLogicService();
export default gameLogic;