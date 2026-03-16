# Dapp Portal Media

LINE Dapp Portal（Mini Dapp）全ゲーム攻略記事を自動生成・自動公開するメディアサイト。

## データファイル
- `data/games-research.json` — ゲーム調査DB（SSOT）。セッション開始時に`stats`を読むこと
- `data/tokens.json` — オンチェーントークンレジストリ
- `data/apps.json` — スクレイパー生データ（手動編集禁止）
- `data/onchain/game-metrics.json` — 全ゲーム最新オンチェーン指標
- `data/onchain/ranking.json` — トークン配布量ランキング
- `data/onchain/history/{slug}.json` — 週次時系列データ
- `data/audit-result.json` — パフォーマンス監査結果（リライト優先度付き）
- `data/perf-history.json` — 週次パフォーマンス履歴（最大52週）

## コマンド
```bash
npm run scrape                     # apps.json更新
npm run generate:single -- {slug}  # 1記事生成
npm run pipeline                   # scrape → generate（新規のみ）
npm run pipeline:all               # 全アプリ再生成
npm run onchain                    # オンチェーンデータ収集 → 指標算出 → ranking.json生成
npm run audit                      # GA4+GSCデータ収集 → リライトスコア算出
npm run site:dev                   # Astroプレビュー
npm run site:build                 # Astroビルド
```

## ルール・エージェント
詳細は `.claude/rules/` と `.claude/agents/` を参照。

| ルール | 内容 |
|--------|------|
| `rules/data-sources.md` | データ優先順位・更新ルール・slug整合 |
| `rules/onchain-research.md` | CoinGecko→RPC→KaiaScan調査手順 |
| `rules/editorial-policy.md` | 禁止表現・ヘッジ表現・投資助言回避 |
| `rules/article-structure.md` | 7セクション構成・LLMO最適化・内部リンク |
| `rules/quality-gates.md` | 5段階ゲート・review-queue・dead-letter |
| `rules/screenshot-observation.md` | Playwrightスクショ判定基準A〜E |

| エージェント | 役割 |
|------------|------|
| `agents/game-researcher.md` | ゲーム調査 → games-research.json更新 |
| `agents/article-writer.md` | 記事生成 → 品質ゲート → 記事配置 |
| `agents/fact-checker.md` | 既存記事のファクトチェック |
