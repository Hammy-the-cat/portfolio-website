import { TypingChallenge } from '../types/game.types';

interface WordsData {
  easy: TypingChallenge[];
  medium: TypingChallenge[];
  hard: TypingChallenge[];
}

class WordsService {
  private cache: Map<string, TypingChallenge[]> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private wordsData: WordsData | null = null;

  constructor() {
    // 初期化時にデータをロード
    this.loadWordsData();
  }

  private async loadWordsData(): Promise<void> {
    try {
      const response = await fetch('/data/words.json');
      if (!response.ok) {
        throw new Error('Failed to load words data');
      }
      this.wordsData = await response.json();
      console.log('Words data loaded successfully');
    } catch (error) {
      console.error('Error loading words data:', error);
      this.wordsData = this.getFallbackData();
    }
  }

  private getFallbackData(): WordsData {
    return {
      easy: this.getFallbackWords('easy'),
      medium: this.getFallbackWords('medium'),
      hard: this.getFallbackWords('hard')
    };
  }

  async getWordsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<TypingChallenge[]> {
    const cacheKey = `words_${difficulty}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      console.log(`Returning cached data for ${difficulty}`);
      return cached;
    }

    try {
      // データがまだロードされていない場合は待つ
      if (!this.wordsData) {
        await this.loadWordsData();
      }

      const words = this.wordsData?.[difficulty] || this.getFallbackWords(difficulty);
      
      // Cache the results
      this.cache.set(cacheKey, words);
      
      // Clear cache after timeout
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, this.cacheTimeout);

      console.log(`Loaded ${words.length} ${difficulty} words from static data`);
      return words;
    } catch (error) {
      console.error(`Error loading ${difficulty} words:`, error);
      return this.getFallbackWords(difficulty);
    }
  }

  async getRandomWord(difficulty: 'easy' | 'medium' | 'hard'): Promise<TypingChallenge> {
    const words = await this.getWordsByDifficulty(difficulty);
    
    if (words.length === 0) {
      return this.getFallbackWords(difficulty)[0];
    }

    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  async getAllWords(): Promise<TypingChallenge[]> {
    try {
      const [easy, medium, hard] = await Promise.all([
        this.getWordsByDifficulty('easy'),
        this.getWordsByDifficulty('medium'),
        this.getWordsByDifficulty('hard')
      ]);

      return [...easy, ...medium, ...hard];
    } catch (error) {
      console.error('Error loading all words:', error);
      return [
        ...this.getFallbackWords('easy'),
        ...this.getFallbackWords('medium'),
        ...this.getFallbackWords('hard')
      ];
    }
  }

  private getFallbackWords(difficulty: 'easy' | 'medium' | 'hard'): TypingChallenge[] {
    const fallbackData: Record<string, TypingChallenge[]> = {
      easy: [
        {
          word: 'hello',
          meaning: 'こんにちは',
          difficulty: 'easy',
          options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'],
          correctAnswer: 0,
          timeLimit: 15
        },
        {
          word: 'book',
          meaning: '本',
          difficulty: 'easy',
          options: ['本', 'ペン', '机', '椅子'],
          correctAnswer: 0,
          timeLimit: 15
        }
      ],
      medium: [
        {
          word: 'beautiful',
          meaning: '美しい',
          difficulty: 'medium',
          options: ['美しい', '醜い', '大きい', '小さい'],
          correctAnswer: 0,
          timeLimit: 12
        },
        {
          word: 'important',
          meaning: '重要な',
          difficulty: 'medium',
          options: ['重要な', '簡単な', '困難な', '面白い'],
          correctAnswer: 0,
          timeLimit: 12
        }
      ],
      hard: [
        {
          word: 'magnificent',
          meaning: '壮大な',
          difficulty: 'hard',
          options: ['壮大な', '小さな', '普通の', '悲しい'],
          correctAnswer: 0,
          timeLimit: 10
        },
        {
          word: 'encyclopedia',
          meaning: '百科事典',
          difficulty: 'hard',
          options: ['百科事典', '小説', '雑誌', '新聞'],
          correctAnswer: 0,
          timeLimit: 10
        }
      ]
    };

    return fallbackData[difficulty] || fallbackData.medium;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const wordsService = new WordsService();
export default wordsService;