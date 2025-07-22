import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import gameLogic from '../services/gameLogic';
import GameMap from '../components/GameMap';
import TypingGame, { TypingResult } from '../components/TypingGame';
import { GameRoom, Player, TypingChallenge } from '../types/game.types';

// Temporary type for DiceRoll
interface DiceRoll {
  value: number;
  playerId: string;
  timestamp: Date;
}

const GamePlay: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<GameRoom | null>(location.state?.room || null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [mapData] = useState(gameLogic.getMapData());
  const [currentChallenge, setCurrentChallenge] = useState<TypingChallenge | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'rolling' | 'moving' | 'typing' | 'results'>('waiting');
  const [error, setError] = useState('');
  const [typingActive, setTypingActive] = useState(false);

  useEffect(() => {
    if (!roomId || !room) {
      navigate('/');
      return;
    }

    const playerId = location.state?.playerId;
    if (!playerId) {
      navigate('/');
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      setCurrentPlayer(player);
      setIsMyTurn(room.currentPlayerId === playerId);
    }

    // Socket event listeners
    const handleRoomUpdate = (updatedRoom: GameRoom) => {
      setRoom(updatedRoom);
      
      // 現在のプレイヤー情報を更新
      const updatedPlayer = updatedRoom.players.find(p => p.id === playerId);
      if (updatedPlayer) {
        setCurrentPlayer(updatedPlayer);
      }
      
      setIsMyTurn(updatedRoom.currentPlayerId === playerId);
      
      // ゲーム終了チェック
      if (updatedRoom.gameState.phase === 'finished') {
        // リザルト画面に移動
        setGamePhase('results');
      }
    };

    const handleDiceRolled = (diceRoll: DiceRoll) => {
      setDiceValue(diceRoll.value);
      setIsRollingDice(false);
      
      if (diceRoll.playerId === playerId) {
        setGamePhase('moving');
        // 少し遅らせて移動処理
        setTimeout(() => {
          setGamePhase('waiting');
        }, 2000);
      }
    };

    const handleTypingChallenge = (challenge: TypingChallenge) => {
      setCurrentChallenge(challenge);
      setGamePhase('typing');
      setTypingActive(true);
    };

    const handleTypingResult = (result: any) => {
      console.log('Typing result:', result);
      // タイピング結果の表示処理
      setTypingActive(false);
      setTimeout(() => {
        setCurrentChallenge(null);
        setGamePhase('waiting');
      }, 3000);
    };

    const handleGameStateChanged = (newState: any) => {
      console.log('Game state changed:', newState);
    };

    const handleError = (error: string) => {
      setError(error);
      setIsRollingDice(false);
    };

    // Socket接続確認
    if (!socketService.isSocketConnected()) {
      socketService.connect();
    }

    // Event listeners登録
    socketService.onRoomUpdate(handleRoomUpdate);
    socketService.onDiceRolled(handleDiceRolled);
    socketService.onTypingChallenge(handleTypingChallenge);
    socketService.onGameStateChanged(handleGameStateChanged);
    socketService.onError(handleError);
    
    // タイピング結果リスナー追加
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('typing_result', handleTypingResult);
    }

    return () => {
      socketService.removeAllListeners();
    };
  }, [roomId, navigate, room, location.state]);

  const handleRollDice = () => {
    if (!room || !isMyTurn || isRollingDice) return;
    
    setIsRollingDice(true);
    setDiceValue(null);
    setGamePhase('rolling');
    socketService.rollDice(room.id);
  };

  const handleTypingComplete = (result: TypingResult) => {
    if (!room) return;
    
    socketService.submitTypingAnswer(room.id, result.userInput, result.timeTaken);
  };

  const handleTypingTimeout = () => {
    setError('タイムアップ！');
    setTypingActive(false);
    
    // サーバーにタイムアウトを通知してゲームを継続
    if (room) {
      socketService.skipTypingChallenge(room.id);
    }
    
    setTimeout(() => {
      setCurrentChallenge(null);
      setGamePhase('waiting');
    }, 2000);
  };


  if (!room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-green-800 flex items-center justify-center p-4">
        <div className="dragon-quest-window">
          <p className="text-white font-pixel">ゲームデータを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-green-800 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* ゲーム情報ヘッダー */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {/* 現在のプレイヤー情報 */}
          <div className="dragon-quest-window">
            <h3 className="text-yellow-300 font-pixel text-sm mb-2">あなたの情報</h3>
            <div className="flex items-center space-x-2 mb-2">
              <div 
                className="player-token"
                style={{ backgroundColor: currentPlayer.color }}
              ></div>
              <span className="text-white font-pixel text-sm font-bold">
                {currentPlayer.name}
              </span>
            </div>
            <div className="text-xs text-blue-200 space-y-1">
              <div>位置: {gameLogic.getSquareDisplayName(currentPlayer.position)}</div>
              <div>スコア: {currentPlayer.score}</div>
              <div>アイテム: {currentPlayer.items.length}個</div>
            </div>
          </div>

          {/* 現在のターン情報 */}
          <div className="dragon-quest-window">
            <h3 className="text-yellow-300 font-pixel text-sm mb-2">ターン情報</h3>
            <div className="text-white font-pixel text-xs">
              {isMyTurn ? (
                <div className="text-green-300 font-bold">あなたのターン！</div>
              ) : (
                <div>
                  {room.players.find(p => p.id === room.currentPlayerId)?.name}のターン
                </div>
              )}
              <div className="mt-1">
                ターン: {room.gameState.currentTurn} / {room.gameState.totalTurns}
              </div>
            </div>
          </div>

          {/* サイコロエリア */}
          <div className="dragon-quest-window">
            <h3 className="text-yellow-300 font-pixel text-sm mb-2">サイコロ</h3>
            <div className="text-center">
              {diceValue && (
                <div className="text-3xl font-bold text-white mb-2">🎲 {diceValue}</div>
              )}
              {isMyTurn && gamePhase === 'waiting' && (
                <button
                  onClick={handleRollDice}
                  disabled={isRollingDice}
                  className="retro-button text-xs px-3 py-1 disabled:opacity-50"
                >
                  {isRollingDice ? 'ころがし中...' : 'サイコロを振る'}
                </button>
              )}
            </div>
          </div>

          {/* ゲーム状態 */}
          <div className="dragon-quest-window">
            <h3 className="text-yellow-300 font-pixel text-sm mb-2">ゲーム状態</h3>
            <div className="text-white font-pixel text-xs">
              {gamePhase === 'waiting' && 'ターン待機中'}
              {gamePhase === 'rolling' && 'サイコロ回転中...'}
              {gamePhase === 'moving' && 'プレイヤー移動中...'}
              {gamePhase === 'typing' && 'タイピング中'}
              {gamePhase === 'results' && '結果発表'}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-600 border-2 border-red-800 rounded-lg p-3 mb-4">
            <p className="text-white text-sm font-pixel">{error}</p>
          </div>
        )}

        {/* メインゲームエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ゲームマップ */}
          <div className="lg:col-span-2">
            <div className="h-96 lg:h-[500px]">
              <GameMap 
                mapData={mapData}
                players={room.players}
                currentSquareId={isMyTurn ? currentPlayer.position : undefined}
              />
            </div>
          </div>

          {/* サイドパネル */}
          <div className="space-y-4">
            {/* タイピングエリア */}
            {currentChallenge && gamePhase === 'typing' && (
              <TypingGame
                challenge={currentChallenge}
                onComplete={handleTypingComplete}
                onTimeout={handleTypingTimeout}
                isActive={typingActive}
              />
            )}

            {/* プレイヤーリスト */}
            <div className="dragon-quest-window">
              <h3 className="text-yellow-300 font-pixel text-sm mb-3">プレイヤーリスト</h3>
              <div className="space-y-2">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      room.currentPlayerId === player.id ? 'bg-yellow-600' : 'bg-blue-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="player-token w-4 h-4"
                        style={{ backgroundColor: player.color }}
                      ></div>
                      <span className="text-white font-pixel text-xs">
                        {player.name}
                      </span>
                    </div>
                    <div className="text-white font-pixel text-xs">
                      {player.score}pt
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* アイテムリスト */}
            {currentPlayer.items.length > 0 && (
              <div className="dragon-quest-window">
                <h3 className="text-yellow-300 font-pixel text-sm mb-3">
                  所持アイテム ({currentPlayer.items.length})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {currentPlayer.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-blue-800 p-2 rounded text-xs"
                    >
                      <div className="text-yellow-300 font-pixel font-bold">
                        {item.name}
                      </div>
                      <div className="text-blue-200">
                        {item.description}
                      </div>
                      <div className="text-blue-300 text-xs">
                        残り使用回数: {item.usageCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePlay;