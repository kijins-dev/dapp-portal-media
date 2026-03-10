# SRS V2.1 — Dapp Portal攻略ガイド オリジナリティ自動化基盤

> V2.0からの変更: レビュー指摘C1-C3, I1-I9を反映

## 1. 機能要件

### 1.1 柱1: オンチェーン・インテリジェンス

#### 1.1.1 コントラクトアドレス管理
- ゲーム別のスマートコントラクトアドレスを `config/contracts.yaml` で管理
- KaiaScanでアドレスを手動特定 → 初回のみ人手、以降は自動
- **V2.1追加**: `reward_type` フィールドで報酬タイプを分類

```yaml
# config/contracts.yaml の例
games:
  - slug: "catchthecoin"
    contract_address: "0x1234..."
    reward_type: "kip7"          # kip7 | native | nft | offchain | unknown
    token_address: "0xabcd..."   # KIP-7の場合のみ
    notes: "KIP-7 KAIA配布"
  - slug: "slime-miner"
    contract_address: null
    reward_type: "offchain"
    token_address: null
    notes: "ゲーム内ポイント制、オンチェーン報酬なし"
```

#### 1.1.2 報酬タイプ事前調査（V2.1追加: Phase A-0）
- Phase A開始前に上位20ゲームをKaiaScanで手動調査
- 各ゲームの報酬配布方法を特定し `config/contracts.yaml` に記録
- 調査結果に基づき、計測対象ゲーム数と指標カバレッジを確定
- **受入条件**: 20ゲーム中、オンチェーン計測可能なゲームが5本以上であること（5本未満の場合、柱1の戦略を再検討）

#### 1.1.3 オンチェーンデータ収集 (`src/onchain/collector.ts`)
- Kaia JSON-RPCにクエリ
- **V2.1変更**: RPCエンドポイントの優先度リスト

```typescript
// RPC優先度リスト
const RPC_ENDPOINTS = [
  { url: "https://public-en.node.kaia.io", name: "public", priority: 1 },
  { url: process.env.QUICKNODE_RPC_URL, name: "quicknode", priority: 2 },
  // 必要に応じてAlchemy等を追加
];

// ヘルスチェック: eth_blockNumber のレスポンスが1秒以上 → 次のエンドポイントへ
```

- 取得データ（reward_typeに応じて分岐）:
  - `kip7`: KIP-7 Token Transferイベント（`Transfer(address,address,uint256)`）
  - `native`: 内部トランザクション（`klay_getBlockReceipts` でvalue > 0のもの）
  - `nft`: KIP-17 Transferイベント（NFT移転数をカウント）
  - `offchain` / `unknown`: 収集スキップ（`metrics: null`）
- コントラクト呼び出し元/先アドレス集計
- ブロックタイムスタンプ（時系列集計用）
- 実行頻度: 週次（GitHub Actions cron: 毎週月曜 6:00 JST）
- レート制限対策: 1リクエスト/500ms、エンドポイント自動切替

#### 1.1.4 指標算出 (`src/onchain/metrics.ts`)
| 指標 | 算出方法 | 対象reward_type | 出力 |
|------|---------|----------------|------|
| 週間トークン配布量 | 過去7日間のTransferイベント合計（コントラクト→外部） | kip7, native | number (KAIA) |
| アクティブウォレット数 | 過去7日間のユニークアドレス数（from + to）（V2.1変更） | kip7, native, nft | number |
| 報酬集中度 | 上位10%ウォレットの報酬占有率（V2.1変更: Gini係数→占有率） | kip7, native | 0-1 |
| 週間変動率 | 前週比の配布量変化率 | kip7, native | % |
| トークンフロー | Transfer先分類（取引所 / その他）（V2.1変更: 初期は2分類） | kip7, native | object |

#### 1.1.5 データ出力
- `data/onchain/game-metrics.json` — 全ゲーム全指標の最新値（信頼度スコア付き）
- `data/onchain/history/{slug}.json` — ゲーム別の週次時系列データ
- `data/onchain/ranking.json` — トークン配布量ランキング（オンチェーン計測済みゲームのみ）

#### 1.1.6 ランキングページ生成
- Astroページ: `/ranking/` — 週間トークン配布量ランキング
- 自動ソート、カテゴリフィルタ、前週比表示
- **V2.1追加**: 「オンチェーン計測済み」バッジ表示、計測不可ゲームは別セクション
- JSON-LDで `ItemList` スキーマ出力

### 1.2 柱2: 非操作クライアント観測

#### 1.2.1 自動スクリーンショット (`src/observer/screenshot.ts`)
- Playwright: 各ゲームURLにアクセス → 5秒待機 → フルページスクショ
- 出力: `site/public/screenshots/{slug}/{timestamp}.webp`
- WebP形式、最大幅1280px、品質80%
- 実行頻度: 週次（全ゲーム）

#### 1.2.2 UI変更検出 — Patch Diff Radar (`src/observer/diff-radar.ts`)
- 前回スクショとの画像差分（pixelmatch）
- **V2.1変更**: 差分閾値を設定可能（デフォルト5%、`config/observer.yaml`で調整）
- 静的アセット（JS/CSS）のhash変化も検出
- 出力: `data/observer/weekly-diff.json`

#### 1.2.3 HAR通信ログ収集 (`src/observer/har-capture.ts`)
- Playwright: ゲーム起動時のHARファイルを記録
- APIエンドポイント一覧、レスポンスサイズ、エラー率を抽出
- **V2.1追加**: センシティブ情報マスク処理
  - Cookie、Authorization headerを `[MASKED]` に置換
  - Set-Cookie headerも同様
  - 生HARファイルは解析後に削除（`har-summary/` のみ保持）
- 出力: `data/observer/har-summary/{slug}.json`

#### 1.2.4 プレイ人数トラッキング (`src/observer/player-tracker.ts`)
- 既存スクレイパーのplay_countを日次記録
- 出力: `data/observer/player-history.json`（ゲーム別時系列）
- Astro側でSVGグラフとして描画

### 1.3 柱3: 需要駆動型コンテンツ生成

#### 1.3.1 未充足クエリ抽出 (`src/demand/query-analyzer.ts`)
- GSC Search Analytics API（過去28日間）
- 抽出条件: インプレッション > 10 かつ CTR < 3% かつ 対応記事なし
- **V2.1追加**: 既存記事のslug・タイトルとの重複チェック（部分一致で除外）
- 出力: `data/demand/unfulfilled-queries.json`

#### 1.3.2 自動記事生成キュー
- 未充足クエリを分類:
  - 比較系（「A vs B」「おすすめ」） → 比較記事テンプレート
  - How-to系（「やり方」「始め方」） → ガイド記事テンプレート
  - FAQ系（「とは」「できる？」） → FAQ記事テンプレート
- Claude APIで記事生成 → `site/src/content/` に自動配置
- **V2.1変更**: ペース制限 — 1日最大5記事の生成制限
- **V2.1変更**: 強化品質ゲート（全条件ANDで通過時のみ公開）:

| ゲート | 条件 | 不合格時の処理 |
|--------|------|---------------|
| 文字数 | ≥ 1,500字 | noindex |
| 重複率 | 既存記事との類似度 < 80%（TF-IDFベース） | noindex |
| オリジナルデータ | オンチェーンデータ or スクショ or プレイ人数の参照 ≥ 1 | noindex |
| ファクトチェック | 記事内数値と `data/*.json` の値が一致 | 生成やり直し（最大2回） |
| NGワード | 禁止表現なし | noindex |

- **V2.1追加**: 各記事に「データソース」セクションを必須化

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
  "games": [
    {
      "slug": "catchthecoin",
      "reward_type": "kip7",
      "data_confidence": "high",
      "metrics": { "..." : "..." }
    },
    {
      "slug": "slime-miner",
      "reward_type": "offchain",
      "data_confidence": "low",
      "metrics": null
    }
  ]
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
- オンチェーンデータ収集: 計測対象ゲーム × 週次 → 30分以内に完了
- スクリーンショット撮影: 76ゲーム × 週次 → 60分以内
- サイトビルド: 200ページ以下 → 5分以内

### 2.2 可用性
- GitHub Actions cronの失敗 → Slack/メール通知
- **V2.1変更**: RPCエンドポイント多重化
  - 優先度1: 公開RPCノード（SLAなし）
  - 優先度2: QuickNode無料枠
  - 優先度3: Alchemy無料枠（将来追加枠）
  - ヘルスチェック: `eth_blockNumber` のレスポンスが1秒以上 → 次のエンドポイントへ
- 3回連続失敗 → 自動停止 + アラート
- **V2.1追加**: RPC可用性ログを月次で記録し、問題頻発時の有料枠移行判断に使用

### 2.3 コスト
| 項目 | 月額上限 | 備考 |
|------|---------|------|
| Claude API（Haiku中心） | ¥2,500 | 記事生成・リライト・FAQ |
| Kaia RPCノード | 無料 | 公開ノード（SLAなし） |
| QuickNode | 無料枠 | フォールバックRPC |
| GitHub Actions | 無料枠内 | 推定500-1,000分/月（V2.1: 日次タスク含む） |
| Cloudflare R2 | 無料枠内（10GB） | スクショ保存 |
| Cloudflare Pages | 無料 | サイトホスティング |
| **API合計** | **¥2,500** | |
| **予備費** | **¥2,500** | RPC有料化・API超過時 |
| **総合計** | **¥5,000以内** | BRDと整合（V2.1修正） |

### 2.4 セキュリティ
- RPCノードへのクエリは読み取りのみ（書き込み不可）
- APIキーは環境変数管理（`.env`）
- 公開JSONにはウォレットアドレスの個人情報は含めない
- **V2.1追加**: HARファイルのセンシティブ情報マスク（Cookie, Authorization header）

### 2.5 保守性
- 全スクリプトはTypeScript + 型安全
- データ収集とサイト生成は独立パイプライン
- 各コンポーネントは単体テスト可能な設計

### 2.6 GitHub Actions実行時間予算（V2.1追加）
| タスク | 頻度 | 推定時間/回 | 月間合計 |
|--------|------|-----------|---------|
| オンチェーン収集 | 週次 | 30分 | 120分 |
| スクリーンショット | 週次 | 60分 | 240分 |
| 記事生成・リライト | 週次 | 30分 | 120分 |
| サイトビルド・デプロイ | 週次 | 5分 | 20分 |
| プレイ人数トラッキング | 日次 | 5分 | 150分 |
| **合計** | | | **650分/月** |
| **無料枠** | | | **2,000分/月** |
| **余裕** | | | **1,350分（デバッグ・リトライ用）** |

## 3. データ設計

### 3.1 ディレクトリ構造
```
config/
├── contracts.yaml              # ゲーム別コントラクト + reward_type（V2.1追加）
├── observer.yaml               # 差分閾値等の設定（V2.1追加）
data/
├── apps.json                    # 既存: ゲーム一覧
├── onchain/
│   ├── game-metrics.json        # 全ゲーム最新指標（信頼度付き）
│   ├── ranking.json             # 週間ランキング（計測済みのみ）
│   └── history/
│       └── {slug}.json          # ゲーム別時系列
├── observer/
│   ├── weekly-diff.json         # UI変更検出結果
│   ├── player-history.json      # プレイ人数時系列
│   └── har-summary/
│       └── {slug}.json          # HAR解析結果（マスク済み）
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
  reward_type: "kip7" | "native" | "nft" | "offchain" | "unknown";  // V2.1追加
  data_confidence: "high" | "medium" | "low";  // V2.1追加
  metrics: {
    weekly_token_distributed: number;  // V2.1変更: kaia→token（汎用化）
    active_wallets_7d: number;         // V2.1変更: from+to
    reward_concentration: number;       // V2.1変更: gini→concentration
    weekly_change_pct: number;
    token_flow: {
      to_exchange_pct: number;
      other_pct: number;               // V2.1変更: 初期2分類
    };
  } | null;  // null = オフチェーン or コントラクト未特定
  player_count: string;
  player_count_history: Array<{ date: string; count: string }>;
  screenshot_url: string | null;
  last_ui_change_detected: string | null;
  updated_at: string;
}
```

### 3.3 信頼度スコアの定義（V2.1追加）
| data_confidence | 条件 | 表示 |
|----------------|------|------|
| high | reward_type = kip7 or native、コントラクト特定済み | オンチェーン計測済み |
| medium | reward_type = nft、またはコントラクト未確定だが候補あり | 部分計測 |
| low | reward_type = offchain or unknown | プレイ人数のみ |

## 4. 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| オンチェーン | ethers.js + Kaia RPC（多重化） | ブロックチェーンデータ取得 |
| 観測 | Playwright | スクショ・HAR・画面差分 |
| 画像処理 | pixelmatch + sharp | 差分検出・WebP変換 |
| 記事生成 | Claude API (Haiku/Sonnet) | コンテンツ生成・リライト |
| 品質検証 | TF-IDF（natural or 自前実装） | 重複率チェック（V2.1追加） |
| サイト | Astro 5.x | 静的サイト生成 |
| ホスティング | Cloudflare Pages + R2 | 配信・画像ストレージ |
| CI/CD | GitHub Actions | cron実行・自動デプロイ |
| 計測 | GSC API + GA4 | 需要分析・パフォーマンス計測 |

## 5. 実装フェーズ

### Phase A-0（Week 0-1）: 報酬タイプ事前調査 ← V2.1追加
1. KaiaScanで上位20ゲームの報酬配布方法を調査
2. `config/contracts.yaml` に調査結果を記録
3. オンチェーン計測可能ゲーム数を確定
4. **ゲートチェック**: 計測可能ゲーム ≥ 5本 → Phase A へ進行、< 5本 → 柱1の戦略再検討

### Phase A（Week 1-2）: オンチェーン基盤
1. RPCエンドポイント多重化 + ヘルスチェック実装
2. `src/onchain/collector.ts` 実装（reward_type分岐あり）
3. `src/onchain/metrics.ts` 実装
4. `data/onchain/` にJSON出力
5. `/ranking/` ページ実装（信頼度バッジ付き）

### Phase B（Week 2-3）: 観測基盤
1. `src/observer/screenshot.ts` 実装
2. `src/observer/diff-radar.ts` 実装（閾値設定可能）
3. `src/observer/har-capture.ts` 実装（センシティブ情報マスク）
4. `src/observer/player-tracker.ts` 実装
5. 記事テンプレートにスクショ・グラフ埋め込み

### Phase C（Week 3-4）: 需要駆動 + LLMO
1. GSC API接続 + `src/demand/query-analyzer.ts`（重複チェック付き）
2. 記事自動生成キュー（ペース制限 + 強化品質ゲート）
3. 構造化FAQ追加
4. 公開JSON API + llms.txt
5. robots.txt更新

### Phase D（Week 4-5）: 統合・自動化
1. GitHub Actions workflow作成（週次cron + 日次cron）
2. GitHub Actions実行時間モニタリング
3. 残りゲームの記事生成（オンチェーンデータ付き、品質ゲート通過のもの）
4. 全体E2Eテスト

## 6. 外部連携

| サービス | API | 認証 | 用途 |
|---------|-----|------|------|
| Kaia RPC（公開） | JSON-RPC 2.0 | 不要 | オンチェーンデータ（プライマリ） |
| QuickNode | JSON-RPC | APIキー（無料枠） | フォールバックRPC |
| KaiaScan | REST API | APIキー（無料） | コントラクト情報 |
| GSC API | REST | OAuth2（サービスアカウント） | 検索クエリ分析 |
| Claude API | REST | APIキー | コンテンツ生成 |
| GitHub Actions | YAML | リポジトリトークン | cron実行 |
