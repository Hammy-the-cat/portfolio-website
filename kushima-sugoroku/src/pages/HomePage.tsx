import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';

const HomePage: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [roomPin, setRoomPin] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('プレイヤー名を入力してください');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Socket接続
      socketService.connect();
      
      // ルーム作成
      const room = await socketService.createRoom(playerName.trim());
      
      // ゲームルームページに移動
      navigate(`/room/${room.id}`, { 
        state: { room, playerId: room.hostId, playerName }
      });
    } catch (err) {
      console.error('Room creation failed:', err);
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('プレイヤー名を入力してください');
      return;
    }
    
    if (!roomPin.trim()) {
      setError('ルームPINを入力してください');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Socket接続
      socketService.connect();
      
      // ルーム参加
      const room = await socketService.joinRoom(roomPin.trim(), playerName.trim());
      
      // 参加したプレイヤーIDを見つける
      const joinedPlayer = room.players.find(p => p.name === playerName.trim());
      
      // ゲームルームページに移動
      navigate(`/room/${room.id}`, { 
        state: { room, playerId: joinedPlayer?.id, playerName }
      });
    } catch (err) {
      console.error('Room join failed:', err);
      setError(err instanceof Error ? err.message : 'ルーム参加に失敗しました');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-green-800 flex items-center justify-center p-4">
      <div className="dragon-quest-window w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-300 mb-2 font-pixel">
            串間すごろく
          </h1>
          <h2 className="text-2xl text-yellow-200 mb-4 font-pixel">
            タイピング大冒険
          </h2>
          <p className="text-blue-200 text-sm">
            宮崎県串間市を舞台にした英単語学習ゲーム
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="playerName" className="block text-yellow-300 text-sm font-bold mb-2">
              プレイヤー名
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力してください"
              className="w-full px-3 py-2 border-2 border-white rounded-lg text-black font-pixel text-center focus:outline-none focus:border-yellow-400"
              maxLength={12}
              disabled={isConnecting}
            />
          </div>

          {error && (
            <div className="bg-red-600 border-2 border-red-800 rounded-lg p-3 text-center">
              <p className="text-white text-sm font-pixel">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleCreateRoom}
              disabled={isConnecting || !playerName.trim()}
              className="retro-button w-full text-lg font-pixel disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? '作成中...' : '新しいルームを作る'}
            </button>

            <div className="text-center text-yellow-200 font-pixel">
              または
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={roomPin}
                onChange={(e) => setRoomPin(e.target.value)}
                placeholder="ルームPIN (6桁)"
                className="w-full px-3 py-2 border-2 border-white rounded-lg text-black font-pixel text-center focus:outline-none focus:border-yellow-400"
                maxLength={6}
                disabled={isConnecting}
              />
              <button
                onClick={handleJoinRoom}
                disabled={isConnecting || !playerName.trim() || !roomPin.trim()}
                className="retro-button w-full text-lg font-pixel disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? '参加中...' : 'ルームに参加する'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-blue-200 text-xs">
          <p>最大40人まで参加可能</p>
          <p>英単語タイピング × すごろく × RPG</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;