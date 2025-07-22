import React, { useState, useEffect, useRef } from 'react';
import { TypingChallenge } from '../types/game.types';

interface TypingGameProps {
  challenge: TypingChallenge;
  onComplete: (result: TypingResult) => void;
  onTimeout: () => void;
  isActive: boolean;
}

export interface TypingResult {
  word: string;
  userInput: string;
  isCorrect: boolean;
  timeTaken: number;
  accuracy: number;
  selectedAnswer?: number;
}

const TypingGame: React.FC<TypingGameProps> = ({ 
  challenge, 
  onComplete, 
  onTimeout, 
  isActive 
}) => {
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimit);
  const [phase, setPhase] = useState<'typing' | 'meaning' | 'result'>('typing');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [typingResult, setTypingResult] = useState<Partial<TypingResult> | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // タイマー管理
  useEffect(() => {
    if (!isActive || phase === 'result') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, phase, onTimeout]);

  // 初期化時にフォーカスを設定
  useEffect(() => {
    if (isActive && phase === 'typing' && inputRef.current) {
      inputRef.current.focus();
      setStartTime(Date.now());
    }
  }, [isActive, phase]);

  // タイピング提出処理
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime) return;

    const timeTaken = (Date.now() - startTime) / 1000;
    const isCorrect = userInput.toLowerCase().trim() === challenge.word.toLowerCase().trim();
    const accuracy = calculateAccuracy(userInput, challenge.word);

    const result: Partial<TypingResult> = {
      word: challenge.word,
      userInput,
      isCorrect,
      timeTaken,
      accuracy
    };

    setTypingResult(result);
    setPhase('meaning');
    setTimeLeft(challenge.timeLimit); // 意味選択用にリセット
  };

  // 意味選択処理
  const handleMeaningSelect = (optionIndex: number) => {
    if (selectedOption !== null) return;

    setSelectedOption(optionIndex);
    setTimeout(() => {
      const isCorrectMeaning = optionIndex === challenge.correctAnswer;
      
      const finalResult: TypingResult = {
        ...typingResult!,
        selectedAnswer: optionIndex,
        // 意味も正解の場合はボーナス
        accuracy: typingResult!.accuracy! + (isCorrectMeaning ? 0.2 : 0)
      } as TypingResult;

      setPhase('result');
      onComplete(finalResult);
    }, 1500);
  };

  // 精度計算
  const calculateAccuracy = (input: string, target: string): number => {
    if (input.toLowerCase().trim() === target.toLowerCase().trim()) return 1.0;
    
    const inputChars = input.toLowerCase().split('');
    const targetChars = target.toLowerCase().split('');
    let matches = 0;

    const minLength = Math.min(inputChars.length, targetChars.length);
    for (let i = 0; i < minLength; i++) {
      if (inputChars[i] === targetChars[i]) {
        matches++;
      }
    }

    return minLength > 0 ? matches / Math.max(inputChars.length, targetChars.length) : 0;
  };

  // プログレスバーの色
  const getProgressColor = () => {
    const percentage = (timeLeft / challenge.timeLimit) * 100;
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDifficultyColor = () => {
    switch (challenge.difficulty) {
      case 'easy': return 'text-green-400 border-green-400';
      case 'medium': return 'text-yellow-400 border-yellow-400';
      case 'hard': return 'text-red-400 border-red-400';
      default: return 'text-blue-400 border-blue-400';
    }
  };

  return (
    <div className="typing-area">
      {/* ヘッダー情報 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800 font-pixel">
          {phase === 'typing' && '🎯 タイピングチャレンジ'}
          {phase === 'meaning' && '🧠 意味を選んでね'}
          {phase === 'result' && '🎉 結果発表'}
        </h3>
        
        <div className={`px-3 py-1 rounded-full border-2 font-pixel text-sm ${getDifficultyColor()}`}>
          {challenge.difficulty.toUpperCase()}
        </div>
      </div>

      {/* タイマー */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>残り時間</span>
          <span className="font-bold">{timeLeft}秒</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${(timeLeft / challenge.timeLimit) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* タイピングフェーズ */}
      {phase === 'typing' && (
        <>
          <div className="bg-blue-100 p-4 rounded-lg mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-900 font-pixel mb-2 tracking-wider">
                {challenge.word}
              </div>
              <div className="text-sm text-gray-600">
                意味: {challenge.meaning}
              </div>
            </div>
          </div>

          <form onSubmit={handleTypingSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="ここにタイピング..."
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg font-mono text-center focus:outline-none focus:border-blue-500 mb-4"
              disabled={!isActive || timeLeft === 0}
              autoComplete="off"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={!userInput.trim() || !isActive}
                className="retro-button font-pixel text-lg py-3 disabled:opacity-50"
              >
                入力完了！
              </button>
              <button
                type="button"
                onClick={onTimeout}
                className="bg-gray-500 hover:bg-gray-600 text-white font-pixel text-lg py-3 rounded-lg"
              >
                スキップ
              </button>
            </div>
          </form>

          {/* 入力状況表示 */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500 space-x-4">
              <span>入力文字数: {userInput.length}</span>
              <span>目標文字数: {challenge.word.length}</span>
            </div>
          </div>
        </>
      )}

      {/* 意味選択フェーズ */}
      {phase === 'meaning' && (
        <>
          <div className="bg-purple-100 p-4 rounded-lg mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-900 font-pixel mb-2">
                "{challenge.word}" の意味は？
              </div>
              <div className="text-sm text-gray-600">
                {typingResult?.isCorrect ? '✅ タイピング正解！' : '❌ タイピング不正解...'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {challenge.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleMeaningSelect(index)}
                disabled={selectedOption !== null}
                className={`p-3 rounded-lg border-2 font-pixel text-left transition-all
                  ${selectedOption === null 
                    ? 'border-gray-300 hover:border-purple-400 hover:bg-purple-50' 
                    : selectedOption === index
                      ? index === challenge.correctAnswer
                        ? 'border-green-400 bg-green-100 text-green-800'
                        : 'border-red-400 bg-red-100 text-red-800'
                      : index === challenge.correctAnswer
                        ? 'border-green-400 bg-green-100 text-green-800'
                        : 'border-gray-300 bg-gray-50 text-gray-500'
                  }
                  disabled:cursor-not-allowed
                `}
              >
                {String.fromCharCode(65 + index)}. {option}
                {selectedOption !== null && index === challenge.correctAnswer && ' ✓'}
                {selectedOption === index && index !== challenge.correctAnswer && ' ✗'}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 結果表示フェーズ */}
      {phase === 'result' && typingResult && (
        <div className="text-center">
          <div className="bg-gray-100 rounded-lg p-6">
            <h4 className="text-2xl font-bold font-pixel mb-4">
              {typingResult.isCorrect ? '🎉 素晴らしい！' : '💪 次回頑張ろう！'}
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded p-3">
                <div className="text-gray-600">タイピング</div>
                <div className={`font-bold ${typingResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {typingResult.isCorrect ? '正解' : '不正解'}
                </div>
              </div>
              
              <div className="bg-white rounded p-3">
                <div className="text-gray-600">所要時間</div>
                <div className="font-bold text-blue-600">
                  {typingResult.timeTaken?.toFixed(1)}秒
                </div>
              </div>
              
              <div className="bg-white rounded p-3">
                <div className="text-gray-600">精度</div>
                <div className="font-bold text-purple-600">
                  {Math.round((typingResult.accuracy || 0) * 100)}%
                </div>
              </div>
              
              <div className="bg-white rounded p-3">
                <div className="text-gray-600">意味選択</div>
                <div className={`font-bold ${
                  selectedOption === challenge.correctAnswer ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedOption === challenge.correctAnswer ? '正解' : '不正解'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingGame;