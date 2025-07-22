# 🎮 串間すごろくタイピング大冒険

宮崎県串間市を舞台にした、**完全無料**のオンラインマルチプレイヤーすごろくタイピングゲーム！

## 🗾 ゲーム概要

- **舞台**: 宮崎県串間市の実在観光地（都井岬、幸島、串間神社など25マス）
- **プレイ人数**: 最大40人同時プレイ可能
- **ゲーム性**: すごろく × タイピング × RPG要素
- **対象**: 中学生〜高校生の英語学習

## 🚀 クイックスタート

### ローカル開発
```bash
# 1. 依存関係インストール
npm install
cd server && npm install && cd ..

# 2. 開発サーバー起動
npm run dev        # フロントエンド (http://localhost:5173)
cd server && npm run dev  # バックエンド (http://localhost:3001)
```

### Vercel デプロイ（完全無料）
```bash
# 1. GitHubにプッシュ
git add .
git commit -m "Initial commit"
git push origin main

# 2. Vercel CLI でデプロイ
npm i -g vercel
vercel --prod
```

## ✨ 主な機能

### 🎯 完全実装済み
- ✅ **リアルタイムマルチプレイヤー** - Socket.IOによる同期ゲーム
- ✅ **串間市観光マップ** - 実在地名を使った25マスのすごろく
- ✅ **PINコード参加** - 6桁コードで簡単ルーム参加
- ✅ **英単語タイピング** - 30語の英単語データベース（easy/medium/hard）
- ✅ **ドラクエ風UI** - レトロRPGスタイルのデザイン
- ✅ **レスポンシブ対応** - PC・スマホ両対応

### 🎲 ゲーム進行
1. プレイヤー名入力 → ルーム作成/参加
2. 順番にサイコロを振って串間市を冒険
3. 特別マス（ボス/アイテム/スペシャル）でタイピングチャレンジ発生
4. 正解でスコア獲得、最終的に最高得点を目指す

## 🏗️ 技術構成

### フロントエンド
- **React 19** + TypeScript
- **Tailwind CSS** - レトロゲーム風デザイン
- **Socket.IO Client** - リアルタイム通信
- **React Router** - ページ遷移管理

### バックエンド
- **Node.js** + Express  
- **Socket.IO** - WebSocket通信
- **Vercel Functions** - サーバーレス実行

### データ管理
- **静的JSON** - 英単語データ（`public/data/words.json`）
- **メモリ内状態管理** - ルーム・プレイヤー情報

## 📁 プロジェクト構成

```
kushima-sugoroku/
├── src/                    # Reactアプリ
│   ├── components/         # GameMap, TypingGame等
│   ├── pages/              # HomePage, GameRoom, GamePlay
│   ├── services/           # Socket.IO, ゲームロジック
│   └── types/              # TypeScript型定義
├── public/data/            # 静的英単語データ
├── api/                    # Vercel Functions
├── server/                 # ローカル開発用サーバー
└── README.md              # このファイル
```

## 💰 完全無料運用

このプロジェクトは **100% 無料** でデプロイ・運用可能です：

- **Vercel** - フロントエンド・バックエンド無料ホスティング
- **静的データ** - Google Sheets API不要
- **メモリ内状態** - データベース不要
- **オープンソース** - ライセンス料なし

## 🎓 学習効果

### プログラミング教育
- WebSocket によるリアルタイム通信
- React Hooks による状態管理
- レスポンシブデザイン手法

### 英語学習
- 段階的難易度（Easy → Medium → Hard）
- タイピング + 意味理解の2段構え
- スコア化による学習動機向上

### 地理学習  
- 宮崎県串間市の観光地・文化学習
- 実在地名による郷土愛醸成

---

**🌟 完全無料で楽しめる串間市バーチャル観光 + 英語学習ゲーム！**
