# SRS V2.0 — Dapp Portal攻略ガイド オリジナリティ自動化基盤

## 1. 機能要件

### 1.1 柱1: オンチェーン・インテリジェンス

#### 1.1.1 コントラクトアドレス管理
- ゲーム別のスマートコントラクトアドレスを `config/contracts.yaml` で管理
- KaiaScanでアドレスを手動特定 → 初回のみ人手、以降は自動

#### 1.1.2 オンチェーンデータ収集 (`src/onchain/collector.ts`)
- Kaia JSON-RPC（`https://public-en.node.kaia.io`）にクエリ
- 取得データ:
  - KIP-7 Token Transferイベント（`Transfer(address,address,uint256)`）
  - コントラクト呼び出し元アドレス（`from` フィールド集計）
  - ブロックタイムスタンプ（時系列集計用）
- 実行頻度: 週次（GitHub Actions cron: 毎週月曜 6:00 JST）
- レート制限対策: 1リクエスト/500ms、QuickNode無料枠をフォールバック

#### 1.1.3 指標算出 (`src/onchain/metrics.ts`)
| 指標 | 算出方法 | 出力 |
|------|---------|------|
| 週間KAIA配布量 | 過去7日間のTransferイベント合計（ゲームコントラクト→外部） | number (KAIA) |
| アクティブウォレット数 | 過去7日間のユニークfromアドレス数 | number |
| 報酬集中度 (Gini係数) | 上位10%ウォレットの報酬占有率 | 0-1 |
| 週間変動率 | 前週比の配布量変化率 | % |
| トークンフロー | Transfer先分類（取引所 / 再投資 / 保持） | object |

#### 1.1.4 データ出力
- `data/onchain/game-metrics.json` — 全ゲーム全指標の最新値
- `data/onchain/history/{slug}.json` — ゲーム別の週次時系列データ
- `data/onchain/ranking.json` — KAIA配布量ランキング

#### 1.1.5 ランキングページ生成
- Astroページ: `/ranking/` — 週間KAIA配布量ランキング
- 自動ソート、カテゴリフィルタ、前週比表示
- JSON-LDで `ItemList` スキーマ出力

### 1.2 柱2: 非操作クライアント観測

#### 1.2.1 自動スクリーンショット (`src/observer/screenshot.ts`)
- Playwright: 各ゲームURLにアクセス → 5秒待機 → フルページスクショ
- 出力: `site/public/screenshots/{slug}/{timestamp}.webp`
- WebP形式、最大幅1280px、品質80%
- 実行頻度: 週次（全ゲーム）

#### 1.2.2 UI変更検出 — Patch Diff Radar (`src/observer/diff-radar.ts`)
- 前回スクショとの画像差分（pixelmatch）
- 差分率が5%以上 → 「更新あり」としてフラグ
- 静的アセット（JS/CSS）のhash変化も検出
- 出力: `data/observer/weekly-diff.json`

#### 1.2.3 HAR通信ログ収集 (`src/observer/har-capture.ts`)
- Playwright: ゲーム起動時のHARファイルを記録
- APIエンドポイント一覧、レスポンスサイズ、エラー率を抽出
- 出力: `data/observer/har-summary/{slug}.json`

#### 1.2.4 プレイ人数トラッキング (`src/observer/player-tracker.ts`)
- 既存スクレイパーのplay_countを日次記録
- 出力: `data/observer/player-history.json`（ゲーム別時系列）
- Astro側でSVGグラフとして描画

### 1.3 柱3: 需要駆動型コンテンツ生成

#### 1.3.1 未充足クエリ抽出 (`src/demand/query-analyzer.ts`)
- GSC Search Analytics API（過去28日間）
- 抽出条件: インプレッション > 10 かつ CTR < 3% かつ 対応記事なし
- 出力: `data/demand/unfulfilled-queries.json`

#### 1.3.2 自動記事生成キュー
- 未充足クエリを分類:
  - 比較系（「A vs B」「おすすめ」） → 比較記事テンプレート
  - How-to系（「やり方」「始め方」） → ガイド記事テンプレート
  - FAQ系（「とは」「できる？」） → FAQ記事テンプレート
- Claude APIで記事生成 → `site/src/content/` に自動配置
- 品質ゲート: 文字数 < 1500字 or NGワード検出 → noindex

#### 1.3.3 自動リライト (`src/demand/rewriter.ts`)
- GSCで順位低下（前月比 -5以上）した記事を自動検出
- オンチェーンデータ + 最新プレイ人数で情報更新
- updated_atを更新

### 1.4 柱4: LLM引用最適化（LLMO）

#### 1.4.1 構造化FAQ
- 各記事の「よくある質問」セクションに `FAQPage` JSON-LDスキーマ追加
- 記事生成時にClaude APIで3-5個のQ&Aを自動生成

#### 1.4.2 公開データAPI
- `/data/game-metrics.json` — 全ゲーム指標（更新日時・計測手法・信頼度付き）
- `/data/ranking.json` — 週間ランキング
- `/data/weekly-diff.json` — 週間変更検出結果
- レスポンス形式:
```json
{
  "meta": {
    "generated_at": "2026-03-10T06:00:00+09:00",
    "methodology": "Kaia mainnet RPC eth_getLogs, block range: 123456-234567",
    "confidence": 0.95
  },
  "games": [...]
}
```

#### 1.4.3 robots.txt更新
```
User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: GoogleOther
Allow: /

User-agent: anthropic-ai
Allow: /
```

#### 1.4.4 llms.txt
- `/llms.txt` を新規作成（LLMクローラー向けサイト説明）
- サイト概要、データAPI一覧、引用ガイドラインを記載

## 2. 非機能要件

### 2.1 性能
- オンチェーンデータ収集: 76ゲーム × 週次 → 30分以内に完了
- スクリーンショット撮影: 76ゲーム × 週次 → 60分以内
- サイトビルド: 200ページ以下 → 5分以内

### 2.2 可用性
- GitHub Actions cronの失敗 → Slack/メール通知
- RPCノード障害 → QuickNodeフォールバック
- 3回連続失敗 → 自動停止 + アラート

### 2.3 コスト
| 項目 | 月額上限 |
|------|---------|
| Claude API（Haiku中心） | ¥2,500 |
| Kaia RPCノード | 無料 |
| GitHub Actions | 無料枠内（2,000分/月） |
| Cloudflare R2 | 無料枠内（10GB） |
| Cloudflare Pages | 無料 |
| **合計** | **¥2,500以内** |

### 2.4 セキュリティ
- RPCノードへのクエリは読み取りのみ（書き込み不可）
- APIキーは環境変数管理（`.env`）
- 公開JSONにはウォレットアドレスの個人情報は含めない

### 2.5 保守性
- 全スクリプトはTypeScript + 型安全
- データ収集とサイト生成は独立パイプライン
- 各コンポーネントは単体テスト可能な設計

## 3. データ設計

### 3.1 ディレクトリ構造
```
data/
├── apps.json                    # 既存: ゲーム一覧
├── onchain/
│   ├── game-metrics.json        # 全ゲーム最新指標
│   ├── ranking.json             # 週間ランキング
│   └── history/
│       └── {slug}.json          # ゲーム別時系列
├── observer/
│   ├── weekly-diff.json         # UI変更検出結果
│   ├── player-history.json      # プレイ人数時系列
│   └── har-summary/
│       └── {slug}.json          # HAR解析結果
└── demand/
    └── unfulfilled-queries.json # 未充足クエリ一覧
```

### 3.2 game-metrics.json スキーマ
```typescript
interface GameMetrics {
  slug: string;
  game_name: string;
  category: string;
  contract_address: string | null;
  metrics: {
    weekly_kaia_distributed: number;
    active_wallets_7d: number;
    reward_gini_coefficient: number;
    weekly_change_pct: number;
    token_flow: {
      to_exchange_pct: number;
      reinvested_pct: number;
      held_pct: number;
    };
  } | null;  // null = コントラクト未特定
  player_count: string;
  player_count_history: Array<{ date: string; count: string }>;
  screenshot_url: string | null;
  last_ui_change_detected: string | null;
  updated_at: string;
}
```

## 4. 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| オンチェーン | ethers.js + Kaia RPC | ブロックチェーンデータ取得 |
| 観測 | Playwright | スクショ・HAR・画面差分 |
| 画像処理 | pixelmatch + sharp | 差分検出・WebP変換 |
| 記事生成 | Claude API (Haiku/Sonnet) | コンテンツ生成・リライト |
| サイト | Astro 5.x | 静的サイト生成 |
| ホスティング | Cloudflare Pages + R2 | 配信・画像ストレージ |
| CI/CD | GitHub Actions | cron実行・自動デプロイ |
| 計測 | GSC API + GA4 | 需要分析・パフォーマンス計測 |

## 5. 実装フェーズ

### Phase A（Week 1-2）: オンチェーン基盤
1. KaiaScanで上位10ゲームのコントラクトアドレスを特定
2. `src/onchain/collector.ts` 実装
3. `src/onchain/metrics.ts` 実装
4. `data/onchain/` にJSON出力
5. `/ranking/` ページ実装

### Phase B（Week 2-3）: 観測基盤
1. `src/observer/screenshot.ts` 実装
2. `src/observer/diff-radar.ts` 実装
3. `src/observer/player-tracker.ts` 実装
4. 記事テンプレートにスクショ・グラフ埋め込み

### Phase C（Week 3-4）: 需要駆動 + LLMO
1. GSC API接続 + `src/demand/query-analyzer.ts`
2. 記事自動生成キュー
3. 構造化FAQ追加
4. 公開JSON API + llms.txt
5. robots.txt更新

### Phase D（Week 4-5）: 統合・自動化
1. GitHub Actions workflow作成（週次cron）
2. 品質ゲート実装
3. 残り56本の記事生成（オンチェーンデータ付き）
4. 全体E2Eテスト

## 6. 外部連携

| サービス | API | 認証 | 用途 |
|---------|-----|------|------|
| Kaia RPC | JSON-RPC 2.0 | 不要（公開ノード） | オンチェーンデータ |
| KaiaScan | REST API | APIキー（無料） | コントラクト情報 |
| QuickNode | JSON-RPC | APIキー（無料枠） | フォールバックRPC |
| GSC API | REST | OAuth2（サービスアカウント） | 検索クエリ分析 |
| Claude API | REST | APIキー | コンテンツ生成 |
| GitHub Actions | YAML | リポジトリトークン | cron実行 |
