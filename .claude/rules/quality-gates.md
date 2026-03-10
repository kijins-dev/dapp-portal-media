# 品質ゲートルール

## 正規定義ファイル
- 閾値定義: `qa/gates.yaml`
- コンプライアンス実装: `src/generator/compliance.ts`
- レビューキュー: `data/review-queue.json`
- デッドレター: `data/dead-letter.json`

## 5段階ゲート

記事は以下の5ゲートを順番に通過する。**1つでもfailしたら公開しない**。

### Gate 1: frontmatter検証
- 必須フィールドがすべて存在すること（→ article-structure.md参照）
- `slug` が apps.json のエントリと一致すること
- `published_at` / `updated_at` が有効な ISO 8601 形式であること

### Gate 2: 禁止語チェック
- `config/compliance.yaml` の `ng_words` に該当する表現がゼロであること
- `src/generator/compliance.ts` の金融クレームパターンにヒットしないこと
- **閾値**: `compliance_hits: 0`（1件でもヒットしたらfail）

### Gate 3: 出典・データ確認
- 記事内のプレイ人数が `data/apps.json` の最新値と一致すること
- オンチェーンデータを含む場合、`reward.confidence: "confirmed"` であること
- `source_urls` に最低1つのURLが含まれること

### Gate 4: 内部リンク
- 最低2本の内部リンクが含まれること
- 換金ガイド（`/guide/how-to-cash-out/`）へのリンクが必須
- 関連ゲーム記事へのリンクが1本以上
- **閾値**: `min_internal_links: 2`

### Gate 5: LLMO構造
- h2セクションが最低6つあること（→ article-structure.mdの7セクション構成）
- 本文が最低1,500文字以上であること
- **閾値**: `min_sections: 6`, `min_chars: 1500`

## fail時の処理

### review-queue.json投入
- Gate 2（禁止語）でfail → `reason: "ng_word_detected"` or `"financial_claim_pattern_detected"`
- Gate 3（データ）でfail → `reason: "data_mismatch"`
- Gate 4/5（構造）でfail → `reason: "structure_violation"`

エントリ形式:
```json
{
  "slug": "game-slug",
  "reason": "...",
  "hits": [],
  "reasons": [],
  "draft_path": "drafts/game-slug.md",
  "created_at": "ISO8601",
  "retry_count": 0
}
```

### dead-letter.json運用
- review-queue で `retry_count` が **3回**に達したら dead-letter に移動
- dead-letter に入ったゲームは手動対応が必要
- dead-letter エントリには `failed_reasons` の履歴を保持

```json
{
  "slug": "game-slug",
  "failed_reasons": ["attempt1: ...", "attempt2: ...", "attempt3: ..."],
  "moved_at": "ISO8601"
}
```

## 金融トピックの手動レビュー
`compliance.ts` の `FINANCIAL_TOPIC_MARKERS`（稼ぎ方、報酬、換金、口座開設、アフィリエイト）が含まれる記事は、Gate 2 を pass しても `requiresManualReview: true` としてマークされる。これは warning であり fail ではないが、review-queue には追加される。
