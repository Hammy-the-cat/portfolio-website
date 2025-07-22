import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import { GameRoom as GameRoomType, Player } from '../types/game.types';

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<GameRoomType | null>(location.state?.room || null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // プレイヤー情報を設定
    const playerId = location.state?.playerId;
    const playerName = location.state?.playerName;
    
    if (room && playerId) {
      const player = room.players.find(p => p.id === playerId);
      setCurrentPlayer(player || null);
      setIsHost(room.hostId === playerId);
      setIsConnected(true);
    }

    // Socket event listeners
    const handleRoomUpdate = (updatedRoom: GameRoomType) => {
      setRoom(updatedRoom);
      
      // ゲームが開始されたらゲームプレイページに移動
      if (updatedRoom.gameState.phase === 'playing') {
        navigate(`/play/${roomId}`, { 
          state: { 
            room: updatedRoom, 
            playerId: currentPlayer?.id,
            playerName: currentPlayer?.name 
          } 
        });
      }
    };

    const handlePlayerJoined = (newPlayer: Player) => {
      console.log('Player joined:', newPlayer.name);
    };

    const handlePlayerLeft = (playerId: string) => {
      console.log('Player left:', playerId);
    };

    const handleError = (error: string) => {
      setError(error);
    };

    // Socket接続確認
    if (!socketService.isSocketConnected()) {
      socketService.connect();
    }

    // Event listeners登録
    socketService.onRoomUpdate(handleRoomUpdate);
    socketService.onPlayerJoined(handlePlayerJoined);
    socketService.onPlayerLeft(handlePlayerLeft);
    socketService.onError(handleError);

    return () => {
      socketService.removeAllListeners();
    };
  }, [roomId, navigate, room, currentPlayer]);

  const handleStartGame = () => {
    if (room && isHost) {
      socketService.startGame(room.id);
    }
  };

  const handleLeaveRoom = () => {
    if (room) {
      socketService.leaveRoom(room.id);
    }
    navigate('/');
  };

  const copyRoomPin = async () => {
    if (room) {
      try {
        await navigator.clipboard.writeText(room.pin);
        // 簡単な通知表示
        const originalText = document.getElementById('pin-text')?.textContent;
        const element = document.getElementById('pin-text');
        if (element) {
          element.textContent = 'コピーしました！';
          setTimeout(() => {
            element.textContent = originalText || room.pin;
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy PIN:', err);
      }
    }
  };

  if (!room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-green-800 flex items-center justify-center p-4">
        <div className="dragon-quest-window">
          <p className="text-white font-pixel">ルーム情報を読み込んでいます...</p>
          <button 
            onClick={() => navigate('/')}
            className="retro-button mt-4"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  const canStartGame = isHost && room.players.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-green-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー情報 */}
        <div className="dragon-quest-window mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-yellow-300 font-pixel">
                ゲームルーム
              </h1>
              <p className="text-blue-200">串間すごろくタイピング大冒険</p>
            </div>
            <button
              onClick={handleLeaveRoom}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-pixel text-sm"
            >
              退室
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-800 rounded-lg p-4">
              <h3 className="text-yellow-300 font-pixel mb-2">ルームPIN</h3>
              <div className="flex items-center space-x-2">
                <span 
                  id="pin-text"
                  className="text-2xl font-bold text-white font-pixel bg-black px-3 py-1 rounded"
                >
                  {room.pin}
                </span>
                <button
                  onClick={copyRoomPin}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm"
                >
                  コピー
                </button>
              </div>
            </div>

            <div className="bg-green-800 rounded-lg p-4">
              <h3 className="text-yellow-300 font-pixel mb-2">参加者数</h3>
              <span className="text-2xl font-bold text-white font-pixel">
                {room.players.length} / {room.maxPlayers}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-600 border-2 border-red-800 rounded-lg p-3 mb-4">
              <p className="text-white text-sm font-pixel">{error}</p>
            </div>
          )}
        </div>

        {/* プレイヤーリスト */}
        <div className="dragon-quest-window mb-6">
          <h2 className="text-2xl font-bold text-yellow-300 font-pixel mb-4">
            参加者一覧
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {room.players.map((player, index) => (
              <div
                key={player.id}
                className="bg-blue-800 rounded-lg p-3 border-2 border-blue-600"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="player-token"
                    style={{ backgroundColor: player.color }}
                  ></div>
                  <span className="text-white font-pixel text-sm font-bold">
                    {player.name}
                  </span>
                </div>
                
                <div className="text-xs text-blue-200 space-y-1">
                  {room.hostId === player.id && (
                    <div className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded font-pixel">
                      ホスト
                    </div>
                  )}
                  {player.id === currentPlayer.id && (
                    <div className="bg-green-600 text-green-100 px-2 py-1 rounded font-pixel">
                      あなた
                    </div>
                  )}
                  <div className="text-blue-300">
                    {player.isOnline ? '🟢 オンライン' : '🔴 オフライン'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ゲーム開始ボタン */}
        {isHost && (
          <div className="dragon-quest-window text-center">
            <h3 className="text-xl font-bold text-yellow-300 font-pixel mb-4">
              ゲーム開始
            </h3>
            
            {!canStartGame && (
              <p className="text-blue-200 mb-4 font-pixel text-sm">
                ゲームを開始するには最低2人のプレイヤーが必要です
              </p>
            )}
            
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="retro-button text-xl font-pixel px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canStartGame ? 'ゲーム開始！' : '待機中...'}
            </button>
          </div>
        )}

        {!isHost && (
          <div className="dragon-quest-window text-center">
            <p className="text-blue-200 font-pixel">
              ホストがゲームを開始するまでお待ちください...
            </p>
            <div className="mt-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;