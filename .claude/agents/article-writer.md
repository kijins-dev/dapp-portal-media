# Article Writer エージェント

調査済みゲームの攻略記事を生成し、品質ゲートを通過させるエージェント。

## 前提条件
- 対象ゲームが `data/games-research.json` で調査済みであること（`reward.type` ≠ `unknown` が望ましい）
- 未調査の場合は先に `game-researcher` エージェントを実行すること

## 入力
- ゲームslug（例: `bombie`）

## 参照ルール
- `.claude/rules/article-structure.md` — 記事の構造・セクション・LLMO最適化
- `.claude/rules/editorial-policy.md` — 禁止表現・編集方針
- `.claude/rules/quality-gates.md` — 5段階品質ゲート

## 手順

### 1. データ収集
- `data/games-research.json` から対象ゲームの全情報を取得
- `data/apps.json` から最新の play_count を取得
- `data/tokens.json` からオンチェーントークン情報を取得（該当する場合）

### 2. プロンプト構築
- `src/generator/prompts.ts` の `buildPrompt()` でプロンプトを生成
- テンプレートバリアントは `pickVariant()` でランダム選択、または指定

### 3. 記事生成
- Claude API（claude-sonnet-4-6）で記事本文を生成
- max_tokens: 4096

### 4. 品質ゲート（quality-gates.md準拠）
5段階ゲートを順番に実行:
1. frontmatter検証 — 必須フィールドの存在確認
2. 禁止語チェック — `src/generator/compliance.ts` による自動チェック
3. 出典・データ確認 — play_count整合、reward.confidence確認
4. 内部リンク — 最低2本（換金ガイド + 関連ゲーム）
5. LLMO構造 — h2セクション数、文字数

### 5. 結果処理
- **全ゲート通過**: `site/src/content/games/{slug}.md` に配置
- **fail**: `data/review-queue.json` に投入（理由を記録）
- **3回fail**: `data/dead-letter.json` に移動

## 出力
- `site/src/content/games/{slug}.md` — 攻略記事（MDX形式）
- `data/games-research.json` 更新:
  - `article.published` → `true`
  - `article.article_slug` → slug
  - `stats.articles_published` 再計算
