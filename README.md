# Dapp Portal Media

LINE Dapp Portal（Mini Dapp）の攻略記事を自動生成・自動公開するメディアサイト。

- サイト: https://dapp-portal-guide.com
- ホスティング: Cloudflare Pages
- 技術: Astro 5.17 + MDX + TypeScript + Claude API

## フォルダ構成

```
dapp-portal-media/
├── .claude/
│   ├── rules/               # Claude Code ルール（6ファイル）
│   └── agents/              # Claude Code エージェント（3ファイル）
├── config/
│   ├── compliance.yaml      # NG単語・免責事項テンプレート
│   ├── scraper.yaml         # Playwright設定
│   └── affiliates.yaml      # アフィリエイト設定（Phase 1以降）
├── data/
│   ├── games-research.json  # ゲーム調査DB（SSOT）
│   ├── tokens.json          # オンチェーントークンレジストリ
│   ├── apps.json            # スクレイパー生データ（76ゲーム）
│   ├── review-queue.json    # コンプライアンスレビュー待ち
│   └── dead-letter.json     # 生成失敗（3回fail）
├── docs/
│   ├── requirements/system/ # 要件定義（V1.0〜V2.1）
│   └── plans/               # 計画・PoCレポート
├── qa/
│   └── gates.yaml           # 品質ゲート閾値定義
├── site/                    # Astroサイト本体
│   ├── src/content/games/   # 攻略記事（20本公開）
│   ├── src/content/guides/  # ガイド記事（2本）
│   ├── src/layouts/         # レイアウト
│   ├── src/components/      # コンポーネント
│   ├── src/pages/           # ルーティング
│   └── public/
│       ├── screenshots/     # Playwrightスクショ
│       └── llms.txt         # LLM向けサイト情報
├── src/
│   ├── scraper/             # Playwrightスクレイパー
│   ├── generator/           # Claude API記事生成エンジン
│   │   ├── prompts.ts       # 5テンプレートバリアント
│   │   └── compliance.ts    # コンプライアンスチェック
│   └── pipeline/            # 統合パイプライン
├── drafts/                  # 生成記事ドラフト
├── CLAUDE.md                # プロジェクト設定
└── package.json
```

## コマンド

```bash
npm run scrape                     # unifi.me/appsスクレイピング → apps.json更新
npm run generate:single -- {slug}  # 1記事生成
npm run pipeline                   # 新規のみ: scrape → generate
npm run pipeline:all               # 全アプリ再生成
npm run site:dev                   # Astroプレビュー
npm run site:build                 # Astroビルド
npm run typecheck                  # TypeScript型チェック
```

## ステータス
- [x] 市場調査
- [x] 要件定義（V2.1 — Codexレビュー済み）
- [x] スクレイパー実装
- [x] 記事生成エンジン実装
- [x] サイト構築・デプロイ（20記事公開）
- [x] オンチェーン実証（6トークン発見）
- [ ] Phase A-0: 報酬タイプ事前調査（上位20ゲーム）
- [ ] Phase A: オンチェーン基盤
- [ ] Phase B: 観測基盤
- [ ] Phase C: 需要駆動 + LLMO
- [ ] Phase D: 統合・自動化
