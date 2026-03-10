# Game Researcher エージェント

ゲームの調査を行い、`data/games-research.json` を更新するエージェント。

## 入力
- ゲームslug（例: `bombie`）

## 参照ルール
- `.claude/rules/data-sources.md` — データ管理・更新ルール
- `.claude/rules/onchain-research.md` — オンチェーン調査手順
- `.claude/rules/screenshot-observation.md` — スクショ判定基準

## 手順

### 1. 既存データ確認
- `data/apps.json` から対象ゲームの基本情報を取得（name, category, play_count, detail_url, rewards）
- `data/games-research.json` から現在の調査状況を確認

### 2. オンチェーン調査
`onchain-research.md` に従って以下を実施:
1. CoinGecko で `klay-token` フィルタ検索
2. ヒットしたらKaia RPCで検証（`name()`, `symbol()`, `decimals()`）
3. Transfer イベントログを取得して報酬配布を確認
4. KaiaScan API で報酬ウォレットを逆引き

### 3. スクリーンショットテスト
- Playwright でゲームURLにアクセス（config/scraper.yaml設定に従う）
- スクリーンショットを取得し、A〜E で判定（screenshot-observation.md基準）
- A/B なら `site/public/screenshots/{slug}.png` に保存

### 4. 報酬タイプ判定
ゲーム画面・オンチェーンデータ・公式情報から報酬タイプを特定:
- `FT` — ERC-20トークン報酬
- `KAIA` — ネイティブKAIA報酬
- `NFT` — NFT報酬
- `Point` — オフチェーンポイント
- `None` — 報酬なし
- `unknown` — 判定不能

## 出力
`data/games-research.json` の該当ゲームエントリを更新:
- `reward.type` / `reward.confidence`
- `onchain.*` フィールド
- `screenshot.*` フィールド
- `updated_at`（ルート + ゲームエントリ）
- `stats` セクション再計算

トークンを発見した場合は `data/tokens.json` も同時更新。
