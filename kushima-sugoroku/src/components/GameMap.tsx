import React, { useState } from 'react';
import { MapSquare, Player } from '../types/game.types';

interface GameMapProps {
  mapData: MapSquare[];
  players: Player[];
  currentSquareId?: number;
}

const GameMap: React.FC<GameMapProps> = ({ mapData, players, currentSquareId }) => {
  const [selectedSquare, setSelectedSquare] = useState<MapSquare | null>(null);

  const getSquareColor = (square: MapSquare) => {
    switch (square.type) {
      case 'normal':
        return 'bg-green-400 border-green-600 text-green-900';
      case 'item':
        return 'bg-yellow-400 border-yellow-600 text-yellow-900';
      case 'boss':
        return 'bg-red-400 border-red-600 text-red-900';
      case 'special':
        return 'bg-purple-400 border-purple-600 text-purple-900';
      case 'goal':
        return 'bg-gold-400 border-gold-600 text-gold-900';
      default:
        return 'bg-gray-400 border-gray-600 text-gray-900';
    }
  };

  const getSquareIcon = (square: MapSquare) => {
    switch (square.type) {
      case 'normal':
        return '○';
      case 'item':
        return '💎';
      case 'boss':
        return '👹';
      case 'special':
        return '⭐';
      case 'goal':
        return '🏁';
      default:
        return '?';
    }
  };

  const getPlayersOnSquare = (squareId: number) => {
    return players.filter(player => player.position === squareId);
  };

  const handleSquareClick = (square: MapSquare) => {
    setSelectedSquare(square);
  };

  const handleCloseModal = () => {
    setSelectedSquare(null);
  };

  return (
    <div className="relative w-full h-full">
      {/* マップタイトル */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
        <h2 className="text-yellow-300 font-pixel text-lg font-bold text-center bg-blue-900 px-4 py-2 rounded-lg border-2 border-yellow-400">
          🗾 串間すごろく冒険マップ 🗾
        </h2>
      </div>

      {/* マップ領域 */}
      <div className="relative w-full h-full bg-gradient-to-br from-green-700 via-blue-600 to-green-800 rounded-xl border-4 border-green-800 overflow-hidden">
        
        {/* 背景装飾 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-10 text-6xl">🏔️</div>
          <div className="absolute top-20 left-10 text-4xl">🌊</div>
          <div className="absolute bottom-10 right-20 text-5xl">🌺</div>
          <div className="absolute bottom-20 left-20 text-4xl">🦎</div>
          <div className="absolute top-1/3 left-1/3 text-3xl">🐒</div>
          <div className="absolute top-2/3 right-1/3 text-4xl">🐎</div>
        </div>

        {/* パス（道）の描画 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {mapData.slice(0, -1).map((square, index) => {
            const nextSquare = mapData[index + 1];
            return (
              <line
                key={`path-${square.id}`}
                x1={square.x + 16}
                y1={square.y + 16}
                x2={nextSquare.x + 16}
                y2={nextSquare.y + 16}
                stroke="#fbbf24"
                strokeWidth="4"
                strokeDasharray="8,4"
                className="drop-shadow-lg"
              />
            );
          })}
        </svg>

        {/* マップマス表示 */}
        {mapData.map((square) => {
          const playersOnSquare = getPlayersOnSquare(square.id);
          const isHighlighted = currentSquareId === square.id;
          
          return (
            <div key={square.id} className="absolute" style={{ left: square.x, top: square.y, zIndex: 10 }}>
              {/* マスのベース */}
              <button
                onClick={() => handleSquareClick(square)}
                className={`relative w-8 h-8 border-2 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 hover:scale-110 hover:shadow-xl cursor-pointer
                  ${getSquareColor(square)}
                  ${isHighlighted ? 'ring-4 ring-yellow-300 animate-pulse scale-110' : ''}
                `}
                title={`${square.name}: ${square.description}`}
              >
                <span className="relative z-10">
                  {square.id}
                </span>
                
                {/* アイコン表示 */}
                <div className="absolute -top-2 -right-2 text-xs">
                  {getSquareIcon(square)}
                </div>
              </button>

              {/* マス名表示 */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <div className="bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs font-pixel text-center">
                  {square.name}
                </div>
              </div>

              {/* プレイヤートークン表示 */}
              {playersOnSquare.length > 0 && (
                <div className="absolute -top-4 -left-2 flex flex-wrap">
                  {playersOnSquare.map((player, playerIndex) => (
                    <div
                      key={player.id}
                      className="player-token w-4 h-4 m-0.5 flex items-center justify-center text-white text-xs font-bold relative z-20"
                      style={{ backgroundColor: player.color }}
                      title={player.name}
                    >
                      {player.name.charAt(0)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* 凡例 */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-lg p-2 text-white font-pixel text-xs">
          <div className="text-yellow-300 font-bold mb-1">凡例</div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span>通常マス</span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            <span>アイテム</span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-3 h-3 bg-red-400 rounded"></div>
            <span>ボス戦</span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <div className="w-3 h-3 bg-purple-400 rounded"></div>
            <span>スペシャル</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gold-400 rounded"></div>
            <span>ゴール</span>
          </div>
        </div>

        {/* 位置情報 */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-80 rounded-lg p-2 text-white font-pixel text-xs">
          <div className="text-yellow-300 font-bold mb-1">🗾 宮崎県串間市</div>
          <div className="text-blue-200">総マス数: {mapData.length}</div>
          <div className="text-green-200">参加者: {players.length}人</div>
        </div>
      </div>

      {/* マス詳細モーダル */}
      {selectedSquare && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="dragon-quest-window max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-yellow-300 font-pixel">
                {selectedSquare.name}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-white hover:text-red-400 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-800 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">{getSquareIcon(selectedSquare)}</span>
                  <span className="text-white font-pixel">
                    マス番号: {selectedSquare.id}
                  </span>
                </div>
                <p className="text-blue-200 text-sm">
                  {selectedSquare.description}
                </p>
              </div>

              {selectedSquare.effects && selectedSquare.effects.length > 0 && (
                <div className="bg-purple-800 rounded-lg p-3">
                  <h4 className="text-yellow-300 font-pixel font-bold mb-2">
                    特殊効果
                  </h4>
                  {selectedSquare.effects.map((effect, index) => (
                    <div key={index} className="text-purple-200 text-sm">
                      • {effect.description}
                    </div>
                  ))}
                </div>
              )}

              {getPlayersOnSquare(selectedSquare.id).length > 0 && (
                <div className="bg-green-800 rounded-lg p-3">
                  <h4 className="text-yellow-300 font-pixel font-bold mb-2">
                    現在このマスにいるプレイヤー
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getPlayersOnSquare(selectedSquare.id).map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center space-x-1 bg-blue-700 rounded px-2 py-1"
                      >
                        <div
                          className="player-token w-4 h-4"
                          style={{ backgroundColor: player.color }}
                        ></div>
                        <span className="text-white text-sm font-pixel">
                          {player.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={handleCloseModal}
                className="retro-button font-pixel"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameMap;