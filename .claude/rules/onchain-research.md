# オンチェーン調査ルール

## 調査手順

### Step 1: CoinGecko検索
- `klay-token` プラットフォームフィルタでKaiaトークンを検索
- ヒットしたら `coingecko_id`、コントラクトアドレス、symbol を記録
- ヒットしなければ Step 2 へ

### Step 2: RPC検証
- エンドポイント: `https://public-en.node.kaia.io`（認証不要、EVM互換）
- コントラクトアドレスに対して `eth_call` で `name()`, `symbol()`, `decimals()` を照合
- Transfer イベントログを取得して実際のトークン移動を確認

### Step 3: KaiaScan芋づる式
- KaiaScan API でゲームの報酬ウォレットを逆引き
- 報酬ウォレット → どのトークンを配布しているか特定
- 未知のトークンコントラクトを発見した場合は Step 2 に戻って検証

## `likely` → `confirmed` 昇格条件

以下の**すべて**を満たした場合のみ `confirmed` に昇格:

1. コントラクトコードが KaiaScan で verified（またはバイトコード読み取りで ERC-20 準拠を確認）
2. `decimals()` と `symbol()` の返り値が CoinGecko / 公式情報と一致
3. Transfer イベントログで実際のトークン移動が確認できる（最低1件）

1つでも欠けたら `likely` のまま据え置き。

## RPC運用ルール
- `eth_getLogs` は **10,000件**を超えるとエラー → 1日チャンク（86,400ブロック）で分割取得
- レート制限: 連続呼び出しは**500ms**間隔（`src/onchain/rpc-client.ts` 実装値）
- タイムアウト: 30秒（応答なしなら1回リトライ後にスキップ）
- Kaiaブロック生成間隔: 約1秒（`BLOCKS_PER_WEEK = 604,800`）
- SuperZ (GRND) は21,046件/週のTransferがあるがチャンク分割で安定取得可能

## 発見時の更新義務
トークンを発見・検証したら**即座に**以下の両方を更新:

1. **`data/tokens.json`**: 新エントリ追加
   ```json
   {
     "apps_json_slug": "game-slug",
     "symbol": "TOKEN",
     "name": "Token Name",
     "decimals": 18,
     "kaia_contract": "0x...",
     "other_chains": [],
     "coingecko_id": "token-id or null",
     "total_supply_snapshot": { "value": "...", "date": "YYYY-MM-DD" },
     "rpc_verified": true
   }
   ```

2. **`data/games-research.json`**: 該当ゲームのエントリ更新
   - `reward.type` → 判明したタイプ
   - `reward.confidence` → `likely` or `confirmed`
   - `onchain.has_kaia_token` → `true`
   - `onchain.tokens[]` → トークン情報追加
   - `onchain.investigation_status` → `partial` or `complete`
   - `stats.with_kaia_token` と `stats.reward_type_confirmed` を再計算

## Phase A 自動収集パイプライン（実装済み）
- コード: `src/onchain/`（types, rpc-client, collector, metrics, index）
- 実行: `npm run onchain`
- 入力: `config/contracts.yaml`（reward_type=kip7のみ）+ `data/tokens.json`（decimals取得）
- 出力: `data/onchain/game-metrics.json`, `ranking.json`, `history/{slug}.json`
- 対象: 8ゲーム10トークン（confirmed KIP-7のみ）
- 新トークン追加時: `config/contracts.yaml` と `data/tokens.json` にエントリ追加 → `npm run onchain` 再実行
