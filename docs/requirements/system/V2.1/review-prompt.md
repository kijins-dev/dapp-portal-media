# V2.1 レビュープロンプト

以下のBRD（要求定義書）とSRS（要件定義書）をレビューしてください。
V2.0のレビューで指摘された致命的問題3件（C1-C3）と重要指摘9件（I1-I9）を反映した改訂版です。

---

## V2.0で指摘された致命的問題と対応

### C1: 計測モデルの前提崩壊（報酬タイプの多様性）
**対応**: reward_typeフィールドを追加（kip7/native/nft/offchain/unknown）、Phase A-0で事前調査、計測不可ゲームはmetrics: nullで処理

### C2: 公開RPCノードのSLA不在
**対応**: RPCエンドポイント多重化（公開→QuickNode→Alchemy）、ヘルスチェック、可用性ログ

### C3: 品質ゲート不足（Scaled Content Abuse）
**対応**: 5段階品質ゲート（文字数+重複率+オリジナルデータ率+ファクトチェック+NGワード）、1日5記事ペース制限、データソースセクション必須化

---

## BRD V2.1 概要

### 目的
AI全自動で他サイトに存在しない一次データを生成・公開し、SEO・LLMOで日本語圏1位を目指す。

### 戦略: 4つの柱
1. **オンチェーン・インテリジェンス**: 報酬タイプ別計測（KIP-7/ネイティブKAIA/NFT/オフチェーン）
2. **非操作クライアント観測**: スクショ・HAR・UI差分（センシティブ情報マスク付き）
3. **需要駆動型コンテンツ生成**: GSC未充足クエリ→自動記事生成（強化品質ゲート+ペース制限）
4. **LLM引用最適化**: 公開JSON API + 構造化FAQ + llms.txt

### 制約
- 全自動（月1回モニタリングのみ）
- 月額5,000円以内（API ¥2,500 + 予備費 ¥2,500）
- ゲーム自動操作は行わない

### 実装フェーズ
- Phase A-0 (Week 0-1): 報酬タイプ事前調査（ゲートチェック付き）
- Phase A (Week 1-2): オンチェーン基盤
- Phase B (Week 2-3): 観測基盤
- Phase C (Week 3-4): 需要駆動+LLMO
- Phase D (Week 4-5): 統合・自動化

---

## SRS V2.1 要点

### V2.0からの主要変更
1. `config/contracts.yaml` に `reward_type` フィールド追加
2. RPCエンドポイント多重化（優先度リスト + ヘルスチェック）
3. 5段階品質ゲート（文字数、重複率、オリジナルデータ率、ファクトチェック、NGワード）
4. アクティブウォレット定義: from + to の両方（V2.0はfromのみ）
5. 報酬集中度: 「Gini係数」→「上位10%占有率」に名称変更
6. トークンフロー: 初期は「取引所/その他」の2分類
7. HAR: センシティブ情報マスク + 生ファイル削除
8. 差分閾値: config/observer.yamlで設定可能
9. コスト: API ¥2,500 + 予備費 ¥2,500 = 総額¥5,000（BRDと整合）
10. GitHub Actions実行時間予算: 650分/月（無料枠2,000分）
11. Phase A-0（事前調査フェーズ）追加
12. 信頼度スコア（data_confidence: high/medium/low）追加
13. GSC未充足クエリの重複チェック追加
14. 1日最大5記事のペース制限追加

### データスキーマ（game-metrics.json）
```typescript
interface GameMetrics {
  slug: string;
  game_name: string;
  category: string;
  contract_address: string | null;
  reward_type: "kip7" | "native" | "nft" | "offchain" | "unknown";
  data_confidence: "high" | "medium" | "low";
  metrics: {
    weekly_token_distributed: number;
    active_wallets_7d: number;
    reward_concentration: number;
    weekly_change_pct: number;
    token_flow: {
      to_exchange_pct: number;
      other_pct: number;
    };
  } | null;
  player_count: string;
  player_count_history: Array<{ date: string; count: string }>;
  screenshot_url: string | null;
  last_ui_change_detected: string | null;
  updated_at: string;
}
```

### 非機能要件
- コスト: 月額¥5,000以内（API ¥2,500 + 予備費 ¥2,500）
- RPC: 3エンドポイント多重化 + ヘルスチェック
- GitHub Actions: 650分/月（余裕1,350分）
- 品質: 5段階ゲート + 1日5記事制限
- セキュリティ: HAR情報マスク、ウォレット個人情報非公開

---

## レビュー観点

### V2.0指摘の解消確認
1. **C1対応は十分か**: reward_typeの分類と事前調査フェーズで、計測モデルの前提崩壊は回避できるか？
2. **C2対応は十分か**: RPC多重化でSLA問題は実用上解決するか？
3. **C3対応は十分か**: 5段階品質ゲート + ペース制限でScaled Content Abuse回避は十分か？

### 新規の観点
4. **Phase A-0のゲートチェック**: 「計測可能ゲーム ≥ 5本」は適切な閾値か？
5. **信頼度スコアのUX**: data_confidence（high/medium/low）の表示方法はユーザーにとって有用か？
6. **TF-IDF重複チェック**: 品質ゲートの重複率80%閾値は適切か？実装コストは？
7. **トークンフロー2分類**: 初期は「取引所/その他」のみで十分か？
8. **コスト配分**: API ¥2,500 + 予備費 ¥2,500は妥当か？予備費の使途基準は？

### 追加で見てほしい点
9. **V2.0指摘の見落とし**: I1-I9の対応で漏れや不十分なものはないか？
10. **Phase A-0の実行可能性**: KaiaScanでの手動調査は1-2日で完了するか？調査方法は明確か？
11. **差別化の持続性**: reward_typeが判明しオンチェーンデータが取得できても、競合が同じ手法を模倣した場合の参入障壁は？

## 出力形式

### 致命的な問題（実装をブロックするもの）
- 問題の説明と修正案

### 重要な指摘（対応すべきもの）
- 指摘内容と推奨アクション

### 改善提案（あると良いもの）
- 提案内容

### V2.0指摘の解消状況
- C1: 解消 / 部分解消 / 未解消
- C2: 解消 / 部分解消 / 未解消
- C3: 解消 / 部分解消 / 未解消

### 総合評価
- **Go** / **Conditional Go** / **No Go**
- 理由
