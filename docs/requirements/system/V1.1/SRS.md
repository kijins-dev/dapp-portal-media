# SRS: Dapp Portal Media V1.1（要件定義書）

> V1.0からの変更: Google Indexing API削除、段階リリース対応、KPI漏斗精緻化、コンプライアンスゲート追加、データ監査性強化、コスト見積もり精緻化。

## 1. 機能要件

### 1.1 スクレイパー（データ収集）

#### 1.1.1 前提条件（実装前に確認必須）
- unifi.meのrobots.txtを確認し、スクレイピング可否を判断
- 利用規約を精査し、データ利用の範囲を確認
- スクレイピング不可の場合の代替フロー:
  1. 公式APIの有無を確認
  2. 公開ページから目視で確認可能な情報のみ利用
  3. 手動でのデータ収集に切り替え

#### 1.1.2 Dapp Portal全アプリ一覧取得
- Playwright（Node.js）でunifi.me/appsをスクレイピング
- UA偽装 + SPA待機（5秒以上）
- 取得データ: アプリ名、カテゴリ、プレイ数、サムネイルURL
- 人気順・新着順の両方を取得
- 実行: GitHub Actions cron（1日1回）

#### 1.1.3 新規ゲーム検知
- 前回取得データとの差分比較（content_hashで変更検知）
- 新規追加アプリを検知したら記事生成パイプラインをトリガー
- 検知結果をJSON形式でdata/に保存

#### 1.1.4 個別ゲーム詳細取得
- 各ゲームの詳細ページ（存在する場合）から追加情報を取得
- リワードミッション情報（USDT/KAIA報酬額）を取得
- Web検索で各ゲームの情報を補完収集

### 1.2 記事生成エンジン

#### 1.2.1 記事生成フロー
```
スクレイピングデータ（監査メタデータ付き）
  + Web検索で収集した情報（ソースURL付き）
  + 記事テンプレート（5パターン以上からランダム選択）
  + プロンプト
    ↓
  Claude API（Haiku: 一般記事 / Sonnet: 換金ガイド等重要記事）
    ↓
  コンプライアンスチェック（NGワードフィルタ）
    ↓
  Markdownファイル出力（下書き or 公開）
```

#### 1.2.2 記事テンプレート構成
各攻略記事は以下の構造で生成:

```markdown
# {ゲーム名}の遊び方・攻略ガイド【LINE Dapp Portal】

## {ゲーム名}とは
- ゲーム概要（カテゴリ、ジャンル）
- プレイ人数（○○万人がプレイ中）← スクレイピングデータ
- 最終更新: {updated_at}

## 始め方
- LINE Dapp Portalからのアクセス方法
- 初期設定・チュートリアル
- 紹介リンク（リファラル埋め込み箇所）

## 遊び方・基本操作
- ゲームの基本ルール
- 操作方法

## 攻略のコツ
- 効率的な進め方
- おすすめ戦略

## 報酬・稼ぎ方
- 獲得できるリワード（具体的な額）
- デイリーミッション

## KAIAの換金方法
- 「詳しくはKAIA換金ガイドをご覧ください」← 内部リンク
- ※換金・口座開設の詳細は専用ガイドに集約（各記事では簡潔に）

## 免責事項
- 本記事の情報は{updated_at}時点のものです
- 暗号資産の取引にはリスクが伴います。投資は自己責任でお願いします

## まとめ
```

#### 1.2.3 記事の品質基準
- 最低1,500文字
- ゲーム固有の情報を必ず含める（プレイ数、リワード額等の独自データ）
- テンプレートに5パターン以上のバリエーション
- 情報ソースのURLを記事メタデータに記録（監査用）

#### 1.2.4 コンプライアンスチェック（V1.1追加）
- NGワード辞書によるフィルタリング
  - 「必ず儲かる」「元本保証」「リスクなし」「確実に稼げる」等
- 金融商品の断定的表現の検出
- チェック通過: 自動公開可（Phase 1以降）
- チェック不通過: 手動レビューキューに入れる
- 換金ガイド・口座開設関連記事: 常に手動レビュー必須

#### 1.2.5 記事の種類と公開フロー
| 記事タイプ | トリガー | 公開フロー |
|-----------|---------|-----------|
| 個別ゲーム攻略 | 新規ゲーム検知時 | Phase 0: 手動 / Phase 1+: コンプラ通過で自動 |
| ランキング・まとめ | 週次 | Phase 0-1: 手動 / Phase 2: 自動 |
| 換金ガイド | 手動 or 月次更新 | **常に手動レビュー** |
| 新着ゲームまとめ | 週次 | Phase 0-1: 手動 / Phase 2: 自動 |

### 1.3 サイト（Astro）

#### 1.3.1 ページ構成
| ページ | パス | 内容 |
|--------|------|------|
| トップ | / | 最新記事一覧、人気ゲームランキング |
| ゲーム攻略記事 | /games/{slug}/ | 個別ゲームの攻略記事 |
| カテゴリ一覧 | /category/{name}/ | GAME, SocialFi, DeFi等 |
| ランキング | /ranking/ | プレイ数ランキング |
| 換金ガイド | /guide/how-to-cash-out/ | KAIA換金方法（常設・手動管理） |
| Dapp Portalとは | /guide/what-is-dapp-portal/ | 初心者向け解説（常設） |

#### 1.3.2 SEO対策
- 各ページにメタタイトル・メタディスクリプション自動生成
- 構造化データ（JSON-LD: Article, BreadcrumbList）
- sitemap.xml 自動生成（ビルド時）
- robots.txt
- OGP画像自動生成（ゲーム名 + サムネイル）
- Search Console にsitemap登録（初回手動、以降自動更新）
- 内部リンク: 関連ゲーム、カテゴリ、換金ガイドへの相互リンク

#### 1.3.3 アフィリエイト・リファラル
- 換金ガイド記事にアフィリエイトリンク（取引所口座開設）を設置
- 各攻略記事から換金ガイドへの内部リンク（記事下CTA + サイドバー常設）
- 各ゲームの紹介リンク（リファラル）を「始め方」セクションに埋め込み
- アフィリエイトリンクは設定ファイルで一元管理（差し替え容易に）
- GA4イベントでリンククリックを計測

#### 1.3.4 UX導線（V1.1追加）
- 全記事のサイドバーに「KAIAを日本円に換金する方法」への常設バナー
- 記事下にCTA（口座開設への導線）
- モバイル時はフローティングCTAボタン検討（Phase 1以降）

### 1.4 CI/CD パイプライン

#### 1.4.1 Phase 0（手動公開）
```
[毎日1回 cron]
  1. scrape: unifi.me/apps スクレイピング
  2. detect: 新規ゲーム検知（差分比較）
  3. research: 新規ゲームのWeb情報収集
  4. generate: Claude APIで記事生成 → MDファイル（draftsディレクトリ）
  5. notify: 新規下書きの通知（メール or Slack）

[手動]
  6. review: 運営者が下書きを確認・修正
  7. publish: drafts → content に移動 → git push → 自動ビルド&デプロイ
```

#### 1.4.2 Phase 1以降（半自動〜自動公開）
```
[毎日1回 cron]
  1-4: Phase 0と同じ
  5. compliance: NGワードフィルタ通過チェック
  6a. 通過 → content に自動配置 → git push → 自動デプロイ
  6b. 不通過 → drafts に配置 → 手動レビュー通知

[週1回 cron]
  - ランキング記事の更新
  - 新着まとめ記事の生成
```

#### 1.4.3 エラーハンドリング・監視
- スクレイピング失敗時: リトライ3回 → 失敗ならSlack通知 → 失敗ゲームをスキップして他を継続
- 記事生成失敗時: スキップして次のゲームへ、失敗リストをJSON記録
- デプロイ失敗時: 前回の成功ビルドが残るため影響なし
- **デッドレター管理**: 3回連続失敗したゲームはデッドレターリストに移動、週次で手動確認
- **監視ダッシュボード**: パイプライン実行状況をGitHub Actions UIで確認可能

## 2. 非機能要件

### 2.1 性能
- スクレイピング: 全アプリのデータ取得を5分以内
- 記事生成: 1記事あたり30秒以内（Claude API応答時間含む）
- サイト表示: Lighthouse Performance 90以上（静的サイトのため容易）

### 2.2 可用性
- サイト: Cloudflare Pages無料プラン（SLA保証なし。静的サイトの特性上、高可用性が期待できる）
- パイプライン: GitHub Actions（失敗時も既存サイトは影響なし）

### 2.3 セキュリティ
- APIキー（Claude）はGitHub Secretsで管理
- アフィリエイトリンクは設定ファイルで管理（ソースコードにハードコードしない）
- 個人情報は収集しない（静的サイト、フォームなし）

### 2.4 保守性
- 記事テンプレートは独立したファイルで管理（プロンプトの変更が容易）
- スクレイピング対象のCSSセレクタは設定ファイルで管理
- ゲームごとのメタデータはJSONで管理
- 月5時間程度の保守作業を見込む（スクレイパー修正、品質チェック、ASP管理）

### 2.5 コスト（V1.1精緻化）

#### Claude API コスト試算
| モデル | 用途 | 入力トークン | 出力トークン | 1記事コスト |
|--------|------|------------|------------|-----------|
| Haiku 4.5 | 一般攻略記事 | ~2,000 | ~2,000 | ~¥1 |
| Sonnet 4.6 | 換金ガイド等 | ~3,000 | ~3,000 | ~¥10 |

#### 月間コスト見込み
| 項目 | Phase 0 | Phase 1 | Phase 2 |
|------|---------|---------|---------|
| Claude API（Haiku主体） | 500円 | 1,000円 | 2,000円 |
| Cloudflare Pages | 無料 | 無料 | 無料 |
| GitHub Actions | 無料（publicリポ） | 無料 | 無料 |
| ドメイン | 125円/月（年1,500円） | 同左 | 同左 |
| **合計** | **~625円** | **~1,125円** | **~2,125円** |

※GitHub ActionsはPublicリポジトリ前提で無料。Privateの場合は月2,000分の制限あり。

## 3. データ設計

### 3.1 スクレイピングデータ（JSON）V1.1強化
```json
{
  "scraped_at": "2026-03-03T00:00:00Z",
  "scraper_version": "1.0.0",
  "source_url": "https://www.unifi.me/apps",
  "total_apps": 77,
  "content_hash": "sha256:abc123...",
  "apps": [
    {
      "name": "Slime Miner",
      "slug": "slime-miner",
      "category": "GAME",
      "play_count": "24.4M",
      "play_count_raw": 24400000,
      "thumbnail_url": "https://...",
      "detail_url": "https://www.unifi.me/apps/slime-miner",
      "first_seen": "2025-01-22",
      "last_seen": "2026-03-03",
      "rewards": [],
      "source_urls": ["https://www.unifi.me/apps"],
      "fetched_at": "2026-03-03T00:00:00Z"
    }
  ]
}
```

### 3.2 記事メタデータ（Frontmatter）V1.1強化
```yaml
---
title: "Slime Minerの遊び方・攻略ガイド【LINE Dapp Portal】"
slug: slime-miner
game_name: Slime Miner
category: GAME
play_count: "24.4M"
published_at: 2026-03-03
updated_at: 2026-03-03
referral_link: "https://..."
tags: ["GAME", "放置系", "LINE Dapp Portal"]
description: "LINE Dapp PortalのSlime Minerの遊び方、攻略のコツ、報酬の稼ぎ方を解説。"
source_urls:
  - "https://www.unifi.me/apps/slime-miner"
  - "https://example.com/slime-miner-review"
template_variant: "variant_a"
compliance_check: "passed"
generation_model: "claude-haiku-4-5"
---
```

### 3.3 設定ファイル
```yaml
# config/affiliates.yaml
affiliates:
  line_bitmax:
    url: "https://..."
    label: "LINE BITMAX"
    asp: "tcs"
  coincheck:
    url: "https://..."
    label: "Coincheck"
    asp: "accesstrade"

# config/scraper.yaml
scraper:
  target_url: "https://www.unifi.me/apps"
  user_agent: "Mozilla/5.0 ..."
  wait_timeout: 5000
  selectors:
    app_list: ".app-list-selector"
    app_name: ".app-name"
    app_category: ".app-category"
    play_count: ".play-count"

# config/compliance.yaml
ng_words:
  - "必ず儲かる"
  - "元本保証"
  - "リスクなし"
  - "確実に稼げる"
  - "損しない"
  - "絶対に利益"

disclaimer_template: |
  ※本記事の情報は執筆時点のものです。
  ※暗号資産の取引にはリスクが伴います。投資は自己責任でお願いします。
  ※本記事にはアフィリエイトリンクが含まれます。
```

## 4. 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| 言語 | TypeScript | プロジェクト共通言語 |
| スクレイピング | Playwright | SPA対応、UA偽装、実証済み |
| 記事生成 | Claude API（Haiku主体、重要記事はSonnet） | 高品質日本語 + コスト最適化 |
| サイトフレームワーク | Astro | 静的サイト特化、SEO最適、高速 |
| ホスティング | Cloudflare Pages | 無料、高速、グローバルCDN |
| CI/CD | GitHub Actions | 無料枠（Public repo）、cron対応 |
| 計測 | Google Search Console + GA4 | SEO + ユーザー行動計測 |
| バージョン管理 | Git + GitHub | 記事もコードもGit管理 |

## 5. 画面仕様

### 5.1 トップページ
- ヒーローセクション: サイト名 + 「LINE Dapp Portal 全ゲーム攻略」
- 最新記事カード（6件）
- 人気ゲームランキング（10件）
- カテゴリナビゲーション

### 5.2 記事ページ
- パンくずリスト（トップ > カテゴリ > ゲーム名）
- 目次（自動生成）
- 記事本文（テンプレート通り）
- サイドバー: 関連ゲーム、換金ガイドへの常設バナー
- 記事下: 口座開設CTA（アフィリエイト）
- 免責事項（フッター）

### 5.3 デザイン方針
- Astroの公式ブログテンプレートをベースにカスタマイズ
- ダーク/ライトモード対応
- モバイルファースト（Dapp Portal利用者はスマホユーザーが多い）

## 6. 外部連携

| サービス | 用途 | 認証方式 |
|---------|------|---------|
| unifi.me | スクレイピング | 不要（公開ページ） |
| Claude API | 記事生成 | APIキー（GitHub Secrets） |
| Google Search Console | SEO計測 | Googleアカウント（手動設定） |
| GA4 | ユーザー行動計測 | Googleアカウント（手動設定） |
| Cloudflare Pages | ホスティング | GitHub連携 |
| TCSアフィリエイト | アフィリエイトリンク取得 | 管理画面（手動・Phase 1以降） |
