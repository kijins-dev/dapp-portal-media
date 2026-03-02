# Dapp Portal Media

LINE Dapp Portal（Mini Dapp）の攻略記事を自動生成・自動公開するメディアサイト。

## プロジェクト概要

### 何をやるか
- LINE Dapp Portal上の全Mini Dapp（現在77本、2025年末1,000本予定）の攻略記事を自動生成
- 新規ゲーム追加を自動検知し、即座に記事化
- SEO最適化された静的サイトとして自動デプロイ

### なぜやるか
- 77本中、個別攻略記事があるのはBombie/Cattea/キャプ翼の3本程度（2026年3月時点）
- 残り70本以上のゲームは日本語攻略記事がゼロ → ブルーオーシャン
- ゲーム数が1,000本に拡大予定 → 手動では不可能、自動化が必須

### 収益モデル（検討中）
- 各ゲームの紹介リンク（リファラル報酬）
- アフィリエイト広告
- 有料コンテンツ（攻略まとめ等）
- その他（検討中）

### 技術スタック（検討中）
- スクレイピング: Playwright（Node.js）
- 記事生成: Claude API
- サイト: Astro + Cloudflare Pages（候補）
- CI/CD: GitHub Actions

## フォルダ構成

```
dapp-portal-media/
├── README.md
├── docs/
│   └── requirements/        # 要求・要件定義
│       └── system/V1.0/
│           ├── BRD.md        # 要求定義書（Why/What）
│           ├── SRS.md        # 要件定義書（How）
│           ├── review-prompt.md
│           └── review-summary.md
├── src/                      # ソースコード（実装時）
│   ├── scraper/              # Dapp Portalスクレイパー
│   ├── generator/            # 記事生成エンジン
│   └── site/                 # Astroサイト
└── data/                     # スクレイピングデータ
```

## ステータス
- [x] 市場調査
- [ ] ビジネスモデル確定
- [ ] 要求定義（BRD）
- [ ] 要件定義（SRS）
- [ ] レビュー
- [ ] 実装
