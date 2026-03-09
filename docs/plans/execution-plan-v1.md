# Dapp Portal メディア 実行計画 V1.0

> 作成日: 2026-03-09
> レビュー: Claude Code (Opus 4.6) + Codex (GPT-5.3)
> ステータス: ドラフト

## 現状サマリー

| 項目 | 状態 |
|------|------|
| スクレイパー | 77アプリ取得済み（15秒） |
| 記事生成 | 1本のみ（Slime Miner）、残り76本未生成 |
| サイト | Astro 5.17、Cloudflare Pagesデプロイ済み |
| ドメイン | dapp-portal-guide.com（アクティブ、SSL有効） |
| パイプライン | scrape→generate→copy→build 実装済み |
| GA4/GSC | 未設定 |
| ASP | 未申請 |
| GitHub Actions | 未設定 |

---

## 全体タイムライン

```
2026-03 ──── Phase 0 開始 ────────────────────────
  Week 1: 計測基盤 + SEO基盤 + 法務ページ
  Week 2-3: 77本一括生成 + レビュー
  Week 4-6: 公開50本 + インデックス促進
2026-04 ──── Phase 0 完了判定 ─────────────────────
  ASP先行申請開始
2026-05 ──── Phase 1 開始 ────────────────────────
  記事拡張（200本）+ ASP提携確定
  半自動公開フロー確立
2026-08 ──── Phase 1 完了判定 ─────────────────────
2026-09 ──── Phase 2 開始 ────────────────────────
  全自動運用 + 収益最適化
2027-02 ──── Phase 2 完了判定 ─────────────────────
```

---

## Phase 0: 基盤構築・記事蓄積（〜2026-04-30）

### Week 1（3/10〜3/16）: 計測・SEO・法務基盤

#### GA4設定
- [ ] GA4プロパティ作成
- [ ] 測定IDをBaseHead.astroに埋め込み
- [ ] カスタムイベント設計:
  - `guide_transition_click` — 換金ガイド遷移（Key event化）
  - `affiliate_outbound_click` — 取引所外部クリック（Key event化）
  - `scroll_90` — 90%スクロール
- [ ] Enhanced Measurement有効化

#### Search Console設定
- [ ] ドメインプロパティで登録（Cloudflare DNS認証）
- [ ] サイトマップ提出（`/sitemap-index.xml`）
- [ ] URL検査ツールでトップページ確認

#### 技術SEO
- [ ] `robots.txt` 作成（`site/public/robots.txt`）
- [ ] canonical設定確認
- [ ] Article構造化データ（JSON-LD）をGameArticle.astroに追加
- [ ] パンくずリスト構造化データ追加
- [ ] OGP画像のデフォルト設定

#### 法務ページ（ASP申請必須）
- [ ] プライバシーポリシー（`/privacy/`） — ミチガエル株式会社、住所記載
- [ ] 免責事項（`/disclaimer/`）
- [ ] 運営者情報（`/about/`） — ミチガエル株式会社、住所記載
- [ ] お問い合わせ（`/contact/` — Googleフォーム埋め込み）
- [ ] www→wwwなし リダイレクト設定（Cloudflare）

### Week 2-3（3/17〜3/30）: 77本一括生成

#### 生成戦略
- 段階的に生成: まず20本→確認→残り57本
- 生成→自動QA→公開キューの3段階分離

#### 自動QAゲート（コンプライアンスチェック拡張）
- [ ] 構造チェック: 必須見出し（とは/始め方/遊び方/攻略/報酬/換金/まとめ）の存在確認
- [ ] 文字数チェック: 1,500〜5,000文字の範囲
- [ ] NGワードチェック: compliance.yaml辞書
- [ ] 事実整合: アプリ名・URL・カテゴリの一致確認
- [ ] 重複率チェック: 他記事との類似度（TF-IDF or 簡易ハッシュ）

#### レビューフロー
- 人手レビューなし。自動QAゲート通過で即公開
- QA不合格のみ `review-queue.json` に入り、手動確認

#### 記事の差別化（AI生成スパム回避）
- [ ] 各記事に一次情報を追加:
  - ゲームのスクリーンショット（Playwrightで自動取得検討）
  - 実際のプレイ数データ（スクレイピングデータ活用）
  - 更新日の明示
- [ ] テンプレバリアント5種のローテーションで量産感を低減
- [ ] ゲーム固有の「失敗パターン」「序盤最適解」セクション個別化
- [ ] 著者情報・生成プロセスの透明化（aboutページで説明）

### Week 4-6（3/31〜4/15）: 公開・インデックス促進

- [ ] QA通過記事を `draft: false` に変更して公開
- [ ] 目標: 50本以上公開
- [ ] GSCのURL検査で上位20URLを優先インデックスリクエスト
- [ ] 内部リンク最適化:
  - 全記事に関連ゲーム2〜4本のリンク
  - カテゴリハブページ→個別記事の導線
  - 換金ガイドへのCTA統一

### Phase 0 完了チェックリスト
- [ ] 公開記事数 ≥ 50本
- [ ] GA4計測稼働（全イベント取得確認）
- [ ] GSCインデックス率 ≥ 70%
- [ ] 法務4ページ公開済み
- [ ] 月間PV ≥ 500（目標1,000だが新規ドメインのため緩和）

---

## Phase 1: ASP申請・半自動公開（2026-05〜08）

### ASP申請（5月〜）
- [ ] ASP登録:
  - TCS Affiliate（LINE BITMAX） — 本命
  - AccessTrade（Coincheck）
  - A8.net（bitFlyer、その他）
- [ ] 申請条件の事前整備:
  - 公開50本以上 ✓
  - 法務ページ完備 ✓
  - 月間PV 1,000到達が理想
- [ ] 否認時: 4週間改善→再申請サイクル

### 記事拡張（77→200本）
- [ ] 1ゲーム複数記事化:
  - `{ゲーム名} 攻略` — メイン攻略記事（既存）
  - `{ゲーム名} 始め方` — 初心者向けガイド
  - `{ゲーム名} 稼ぎ方` — 報酬・換金特化
  - `{ゲーム名} エラー` — トラブルシューティング
- [ ] 比較記事・ランキング記事の追加
- [ ] 換金ガイドの拡充（取引所別手順）

### GitHub Actions 自動化
- [ ] `.github/workflows/scrape.yml`:
  - cron: `17 */6 * * *`（6時間ごと、UTC :17分）
  - 差分検知→新規アプリ検出時に通知
- [ ] `.github/workflows/generate.yml`:
  - cron: `47 0 * * *`（日次、UTC 0:47 = JST 9:47）
  - 新規アプリの記事自動生成→PR作成
- [ ] `.github/workflows/linkcheck.yml`:
  - cron: `0 3 * * 1`（週次月曜）
  - リンク切れチェック
- [ ] `concurrency` 設定で重複実行防止
- [ ] 失敗時はGitHub標準メール通知

### Phase 1 完了チェックリスト
- [ ] 公開記事数 ≥ 200本
- [ ] ASP提携 ≥ 1社確定
- [ ] アフィリエイトリンク実装率 100%
- [ ] 月間PV ≥ 8,000
- [ ] 換金ガイド遷移率 12〜15%
- [ ] 半自動公開フロー稼働（自動生成+人手承認）

---

## Phase 2: 全自動・拡大（2026-09〜2027-02）

### 全自動運用
- [ ] 差分検知→生成→QA→公開の完全自動化
- [ ] 人手介入は月次レビューのみ
- [ ] 記事の自動更新（プレイ数変動時に再生成）

### 記事拡張（200→500本+）
- [ ] ロングテールFAQ記事の自動生成
- [ ] カテゴリ別まとめ記事
- [ ] 新規ゲーム追加時の即日記事公開

### 収益最適化
- [ ] CTA ABテスト（配置・文言・デザイン）
- [ ] 検索順位別タイトル改善
- [ ] 内部リンク最適化（回遊率向上）
- [ ] ASP追加提携（複数取引所）

### Phase 2 完了チェックリスト
- [ ] 公開記事数 ≥ 500本
- [ ] 月間PV ≥ 30,000
- [ ] CTR ≥ 5%
- [ ] CVR ≥ 20%
- [ ] 月間収益 ≥ ¥315,000

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| GoogleのAI生成コンテンツペナルティ | インデックス除外 | 一次情報追加、E-E-A-T強化、薄い記事は非公開 |
| ASP審査不通過 | 収益化遅延 | 複数ASP並行申請、否認理由分析→改善→再申請 |
| unifi.meのDOM構造変更 | スクレイパー破損 | セレクターヘルスチェック実装済み、アラート通知 |
| 競合参入 | PV分散 | 先行者優位（77本一括公開）、更新頻度で差別化 |
| API利用コスト増 | 利益率低下 | Sonnet使用（1記事¥10）、不要な再生成を抑制 |

---

## コスト見積もり

| 項目 | Phase 0 | Phase 1 | Phase 2 |
|------|---------|---------|---------|
| ドメイン | ¥125/月 | ¥125/月 | ¥125/月 |
| Claude API（Sonnet 4.6） | ¥800（77本） | ¥1,500/月 | ¥3,000/月 |
| Cloudflare Pages | ¥0 | ¥0 | ¥0 |
| GitHub Actions | ¥0（無料枠内） | ¥0 | ¥0 |
| **合計** | **〜¥950/月** | **〜¥1,650/月** | **〜¥3,150/月** |

---

## 即時アクション（今日やること）

1. **GA4プロパティ作成** → 測定IDを取得
2. **Search Consoleにサイト登録** → DNS認証
3. **robots.txt作成** → `site/public/robots.txt`
4. **法務ページの雛形作成** → プライバシーポリシー等4ページ

---

## 参考ソース

- [Google AI生成コンテンツ指針](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- [Google スパムポリシー（Scaled content abuse）](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google Helpful Content / E-E-A-T](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Console開始ガイド](https://developers.google.com/search/docs/monitor-debug/search-console-start)
- [GA4 Key event設定](https://support.google.com/analytics/answer/9355848)
- [GitHub Actions schedule](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
