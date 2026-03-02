# SRS: Dapp Portal Media（要件定義書）

## 1. 機能要件

### 1.1 スクレイパー（データ収集）

#### 1.1.1 Dapp Portal全アプリ一覧取得
- unifi.me/apps をPlaywright（Node.js）でスクレイピング
- UA偽装 + SPA待機（5秒以上）でBot検知を回避
- 取得するデータ: アプリ名、カテゴリ、プレイ数、サムネイルURL
- 人気順・新着順の両方を取得
- 実行: GitHub Actions cron（1日1回）

#### 1.1.2 新規ゲーム検知
- 前回取得データとの差分比較
- 新規追加アプリを検知したら記事生成パイプラインをトリガー
- 検知結果をJSON形式でdata/に保存

#### 1.1.3 個別ゲーム詳細取得
- 各ゲームの詳細ページ（存在する場合）から追加情報を取得
- リワードミッション情報（USDT/KAIA報酬額）を取得
- Web検索（Google）で各ゲームの情報を補完収集

### 1.2 記事生成エンジン

#### 1.2.1 記事生成フロー
```
スクレイピングデータ
  + Web検索で収集した情報
  + 記事テンプレート
  + プロンプト
    ↓
  Claude API
    ↓
  Markdownファイル出力
```

#### 1.2.2 記事テンプレート構成
各攻略記事は以下の構造で生成:

```markdown
# {ゲーム名}の遊び方・攻略ガイド【LINE Dapp Portal】

## {ゲーム名}とは
- ゲーム概要（カテゴリ、ジャンル）
- プレイ人数（○○万人がプレイ中）← スクレイピングデータ

## 始め方
- LINE Dapp Portalからのアクセス方法
- 初期設定・チュートリアル

## 遊び方・基本操作
- ゲームの基本ルール
- 操作方法

## 攻略のコツ
- 効率的な進め方
- おすすめ戦略

## 報酬・稼ぎ方
- 獲得できるリワード
- デイリーミッション
- 紹介リンク（リファラル埋め込み箇所）

## KAIAの換金方法
- LINE BITMAXでの換金手順
- 「まだ口座をお持ちでない方はこちら」← アフィリエイトリンク
- 他の取引所への送金方法

## まとめ
```

#### 1.2.3 記事の品質基準
- 最低1,500文字
- ゲーム固有の情報を必ず含める（プレイ数、リワード額等の独自データ）
- テンプレートにバリエーション（5パターン以上）を持たせ、均一化を避ける
- 「必ず儲かる」等のNGワードフィルタリング

#### 1.2.4 記事の種類
| 記事タイプ | トリガー | 頻度 |
|-----------|---------|------|
| 個別ゲーム攻略 | 新規ゲーム検知時 | 随時 |
| ランキング・まとめ | 週次 | 週1回 |
| 換金ガイド | 手動 or 月次更新 | 月1回 |
| 新着ゲームまとめ | 週次 | 週1回 |

### 1.3 サイト（Astro）

#### 1.3.1 ページ構成
| ページ | パス | 内容 |
|--------|------|------|
| トップ | / | 最新記事一覧、人気ゲームランキング |
| ゲーム攻略記事 | /games/{slug}/ | 個別ゲームの攻略記事 |
| カテゴリ一覧 | /category/{name}/ | GAME, SocialFi, DeFi等 |
| ランキング | /ranking/ | プレイ数ランキング |
| 換金ガイド | /guide/how-to-cash-out/ | KAIA換金方法（常設） |
| Dapp Portalとは | /guide/what-is-dapp-portal/ | 初心者向け解説（常設） |

#### 1.3.2 SEO対策
- 各ページにメタタイトル・メタディスクリプション自動生成
- 構造化データ（JSON-LD: Article, BreadcrumbList）
- sitemap.xml 自動生成
- robots.txt
- OGP画像自動生成（ゲーム名 + サムネイル）
- Google Indexing API で新規記事を即座に通知
- 内部リンク: 関連ゲーム、カテゴリ、換金ガイドへの相互リンク

#### 1.3.3 アフィリエイト・リファラル
- 換金ガイド記事にアフィリエイトリンク（取引所口座開設）を設置
- 各攻略記事の「報酬・稼ぎ方」セクションから換金ガイドへ内部リンク
- 各ゲームの紹介リンク（リファラル）を「始め方」セクションに埋め込み
- アフィリエイトリンクは設定ファイルで一元管理（差し替え容易に）

### 1.4 CI/CD パイプライン

#### 1.4.1 GitHub Actions ワークフロー
```
[毎日1回 cron]
  1. scrape: unifi.me/apps スクレイピング
  2. detect: 新規ゲーム検知（差分比較）
  3. research: 新規ゲームのWeb情報収集
  4. generate: Claude APIで記事生成 → MDファイル作成
  5. commit: 生成されたMDをリポジトリにコミット
  6. deploy: Cloudflare Pagesが自動ビルド&デプロイ
  7. index: Google Indexing APIで新記事を通知

[週1回 cron]
  - ランキング記事の更新（プレイ数変動を反映）
  - 新着まとめ記事の生成
```

#### 1.4.2 エラーハンドリング
- スクレイピング失敗時: リトライ3回 → 失敗ならSlack/メール通知
- 記事生成失敗時: スキップして次のゲームへ、失敗リストを記録
- デプロイ失敗時: 前回の成功ビルドが残るため影響なし

## 2. 非機能要件

### 2.1 性能
- スクレイピング: 全77本のデータ取得を5分以内
- 記事生成: 1記事あたり30秒以内（Claude API応答時間含む）
- サイト表示: Lighthouse Performance 90以上（静的サイトなので容易）

### 2.2 可用性
- サイト: Cloudflare Pages（SLA 99.9%）
- パイプライン: GitHub Actions（失敗時も既存サイトは影響なし）

### 2.3 セキュリティ
- APIキー（Claude, Google Indexing）はGitHub Secretsで管理
- アフィリエイトリンクは設定ファイルで管理（ソースコードにハードコードしない）

### 2.4 保守性
- 記事テンプレートは独立したファイルで管理（プロンプトの変更が容易）
- スクレイピング対象のCSSセレクタは設定ファイルで管理（サイト変更時に対応しやすく）
- ゲームごとのメタデータはJSONで管理

### 2.5 コスト
| 項目 | 月額見込み |
|------|-----------|
| Cloudflare Pages | 無料 |
| GitHub Actions | 無料枠内（2,000分/月） |
| Claude API | 〜3,000円（記事生成量による） |
| ドメイン | 〜1,500円/年 |
| **合計** | **〜3,000円/月** |

## 3. データ設計

### 3.1 スクレイピングデータ（JSON）
```json
{
  "scraped_at": "2026-03-03T00:00:00Z",
  "total_apps": 77,
  "apps": [
    {
      "name": "Slime Miner",
      "slug": "slime-miner",
      "category": "GAME",
      "play_count": "24.4M",
      "thumbnail_url": "https://...",
      "detail_url": "https://www.unifi.me/apps/slime-miner",
      "first_seen": "2025-01-22",
      "rewards": []
    }
  ]
}
```

### 3.2 記事メタデータ（Frontmatter）
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
---
```

### 3.3 設定ファイル
```yaml
# config/affiliates.yaml
affiliates:
  line_bitmax:
    url: "https://..."
    label: "LINE BITMAX"
  coincheck:
    url: "https://..."
    label: "Coincheck"

# config/scraper.yaml
scraper:
  target_url: "https://www.unifi.me/apps"
  user_agent: "Mozilla/5.0 ..."
  wait_timeout: 5000
```

## 4. 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| 言語 | TypeScript | プロジェクト共通言語 |
| スクレイピング | Playwright | SPA対応、UA偽装、実証済み |
| 記事生成 | Claude API（Anthropic SDK） | 高品質な日本語生成 |
| サイトフレームワーク | Astro | 静的サイト特化、SEO最適、高速 |
| ホスティング | Cloudflare Pages | 無料、高速、グローバルCDN |
| CI/CD | GitHub Actions | 無料枠で十分、cron対応 |
| インデックス通知 | Google Indexing API | 新記事の即時クロール |
| バージョン管理 | Git + GitHub | 記事もコードもGit管理 |

## 5. 画面仕様

静的サイトのため簡潔に定義。

### 5.1 トップページ
- ヒーローセクション: サイト名 + 「LINE Dapp Portal 全ゲーム攻略」
- 最新記事カード（6件）
- 人気ゲームランキング（10件）
- カテゴリナビゲーション

### 5.2 記事ページ
- パンくずリスト（トップ > カテゴリ > ゲーム名）
- 目次（自動生成）
- 記事本文（テンプレート通り）
- サイドバー: 関連ゲーム、換金ガイドへの導線
- 記事下: 口座開設CTA（アフィリエイト）

### 5.3 デザイン方針
- Astroの公式ブログテンプレートをベースにカスタマイズ
- ダーク/ライトモード対応
- モバイルファースト（Dapp Portal利用者はスマホユーザーが多い）

## 6. 外部連携

| サービス | 用途 | 認証方式 |
|---------|------|---------|
| unifi.me | スクレイピング | 不要（公開ページ） |
| Claude API | 記事生成 | APIキー |
| Google Indexing API | インデックス通知 | サービスアカウント |
| Cloudflare Pages | ホスティング | GitHub連携 |
| TCSアフィリエイト | アフィリエイトリンク取得 | 管理画面（手動） |
