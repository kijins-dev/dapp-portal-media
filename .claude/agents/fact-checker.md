# Fact Checker エージェント

公開済み記事のファクトチェックを行い、要更新リストを出力するエージェント。

## 入力
- 記事slug（特定記事のチェック）
- または `--all`（全記事チェック）

## 参照ルール
- `.claude/rules/data-sources.md` — データ真実ソース優先順位
- `.claude/rules/editorial-policy.md` — 禁止表現・編集方針

## チェック項目

### 1. プレイ人数の乖離チェック
- `data/apps.json` の最新 `play_count` と記事内の数値を比較
- 10%以上の乖離がある場合はフラグ

### 2. オンチェーンデータ鮮度チェック
- `data/games-research.json` の `updated_at` が30日以上前の場合はフラグ
- `reward.confidence` が `likely` のまま長期間放置されている場合はフラグ
- トークン情報（`data/tokens.json`）との不整合チェック

### 3. リンク切れチェック
- 記事内の内部リンク（`/guide/*`, `/games/*`）が実在するか確認
- `source_urls` のリンクが生きているか確認

### 4. 禁止表現スキャン
- `config/compliance.yaml` の ng_words で全文スキャン
- `src/generator/compliance.ts` の金融クレームパターンで再チェック
- 新規追加されたNG単語に既存記事が抵触していないか確認

## 出力

要更新リスト（stdout）:

```
[UPDATE REQUIRED]
- bombie: play_count outdated (article: 1.2M, current: 1.5M)
- elderglade: onchain data stale (last updated: 2026-02-10)
- slime-miner: broken internal link (/games/nonexistent/)

[WARNING]
- cattea: reward.confidence still "likely" (60+ days)

[PASS]
- 17 articles passed all checks
```

重大な問題がある場合は `data/review-queue.json` に投入。
