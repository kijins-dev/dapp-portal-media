# データソース管理ルール

## データ真実ソース優先順位

1. **`data/games-research.json`** — ゲーム調査DB（最重要・AI参照用SSOT）
2. **`data/tokens.json`** — オンチェーントークンレジストリ
3. **`data/apps.json`** — スクレイパー生データ（手動編集禁止）
4. 既存記事（`site/src/content/games/`）

矛盾が発生した場合は上位ソースを正とする。

## games-research.json

### セッション開始時
必ず`stats`セクションを読んで現状を把握すること。

### フィールド定義
| フィールド | 値 | 説明 |
|-----------|-----|------|
| `reward.type` | `FT` / `KAIA` / `NFT` / `Point` / `None` / `unknown` | 報酬タイプ |
| `reward.confidence` | `confirmed` / `likely` / `not_investigated` | 確認レベル |
| `onchain.has_kaia_token` | bool | Kaiaチェーン上にERC-20トークンがあるか |
| `onchain.tokens[]` | array | トークン詳細（symbol, contract, coingecko_id等） |
| `onchain.reward_wallets[]` | array | 報酬配布元アドレス |
| `onchain.investigation_status` | `complete` / `partial` / `not_started` | 調査ステータス |
| `screenshot.tested` | bool | スクショテスト済みか |
| `screenshot.result` | `A` / `B` / `C` / `D` / `E` / null | 判定結果（→ screenshot-observation.md） |
| `article.published` | bool | 記事公開済みか |

### 読み取りルール
- 調査・記事生成の前に対象ゲームのエントリを確認
- `reward.confidence: "confirmed"` → オンチェーンデータを記事に含められる
- `screenshot.result: "A"` or `"B"` → スクショ画像を記事に使える
- `article.published: true` → 記事生成済み

### 更新ルール
- 調査結果が出たら**即座に**該当エントリを更新（後回し禁止）
- `updated_at` をルート・ゲームエントリ両方で更新
- `stats` セクションは更新後に再計算して反映
- 新ゲームが apps.json に追加された場合 → games-research.json にもエントリ追加

### 矛盾時の対処
- apps.json と games-research.json で play_count が異なる → apps.json を正とし games-research.json を更新
- 記事に書かれた情報と games-research.json が矛盾 → games-research.json を正とし記事を review-queue に投入
- トークンが公開停止された → `reward.type` を更新し、該当記事を review-queue に投入

## tokens.json
- 新トークン発見時に追記
- `games-research.json` の `onchain.tokens` とデータを同期させること
- 各トークンに `rpc_verified: true/false` を記録

## data/onchain/（自動生成、手動編集禁止）
- `npm run onchain` で生成。`src/onchain/` のコードが書き出す
- `game-metrics.json` — 8ゲーム最新指標（週間配布量, ウォレット数, 集中度, 前週比, フロー）
- `ranking.json` — 配布量順ランキング（onchain 8ゲーム + offchain 12ゲーム）
- `history/{slug}.json` — 週次時系列（最大52週保持）
- `ranking.json` は `site/src/pages/ranking.astro` が静的ビルド時に読み込む
- ランキングを更新するフロー: `npm run onchain` → `npm run site:build`

## apps.json
- `npm run scrape` で更新。手動編集禁止
- `play_count_raw` でプレイ数ソート可能

## slug整合ルール
- apps.json の slug をマスターとする
- games-research.json、記事ファイル名、tokens.json の `apps_json_slug` すべて同一であること
- slug変更時は全ファイルを一括更新

## 新ゲーム追加手順
1. `npm run scrape` で apps.json 更新
2. games-research.json に新エントリ追加（テンプレート:）
   ```json
   "new-slug": {
     "name": "...",
     "category": "...",
     "play_count": "...",
     "reward": { "type": "unknown", "confidence": "not_investigated" },
     "onchain": { "has_kaia_token": false, "tokens": [], "reward_wallets": [], "investigation_status": "not_started" },
     "screenshot": { "tested": false, "result": null },
     "article": { "published": false }
   }
   ```
3. `stats.total_games` を再計算
