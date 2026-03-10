# 記事構造ルール

## 正規定義ファイル
- プロンプトテンプレート: `src/generator/prompts.ts`
- 本ルールは prompts.ts と対応し、記事の構造要件を定める

## 固定セクション構成

すべての攻略記事は以下の7セクション構成で書く（h2で区切る）:

1. **{ゲーム名}とは** — ゲーム概要、ジャンル、カテゴリ、プレイ人数
2. **始め方** — LINE Dapp Portalからのアクセス方法、初期設定、チュートリアル
3. **遊び方・基本操作** — ゲームルール、操作方法
4. **攻略のコツ** — 効率的な進め方、おすすめ戦略
5. **報酬・稼ぎ方** — リワードの種類、効率的な稼ぎ方
6. **KAIAの換金方法** — 換金ガイドへのリンク（詳細は書かない）
7. **まとめ** — ゲームの魅力を簡潔に

### h2から開始
h1タイトルは不要。frontmatterの`title`で処理される。

### 最低文字数
1,500文字以上。

## テンプレートバリアント

`prompts.ts` で定義された5種類。各バリアントでセクションの重点が変わる:

| バリアント | 重点 | 用途 |
|-----------|------|------|
| `standard` | 全セクション均等 | デフォルト |
| `beginner` | 始め方・遊び方 | 初心者向けゲーム |
| `reward_focus` | 報酬・稼ぎ方 | 報酬が充実したゲーム |
| `comparison` | 他ゲームとの違い | 類似ゲームが多いカテゴリ |
| `deep_dive` | 攻略のコツ | 上級者向けゲーム |

## LLMO最適化

### 段落の自己完結性
- 各段落は前後の文脈に依存せず、**単独で意味が通る**ように書く
- LLMが段落単位で引用できることを前提に構成する

### 1段落1主張
- 1つの段落には1つの主張・情報のみを含める
- 段落の冒頭文がその段落の要約になるように書く

### 引用可能な事実文
以下の形式で書くと、LLMが引用しやすい:
- 「{ゲーム名}は、LINE Dapp Portal上で{プレイ人数}人がプレイしている{カテゴリ}ゲームです。」
- 「{ゲーム名}では、{報酬トークン}を獲得できます。」

## 内部リンク

最低2本の内部リンクを含めること:

1. **換金ガイド**（必須）: `/guide/how-to-cash-out/`
2. **関連ゲーム**（1本以上）: 同カテゴリまたは同報酬タイプのゲーム記事

## frontmatter必須フィールド

```yaml
title: "..."
slug: "..."
game_name: "..."
category: "GAME|SOCIAL|..."
play_count: "..."
published_at: "YYYY-MM-DDTHH:mm:ss.sssZ"
updated_at: "YYYY-MM-DDTHH:mm:ss.sssZ"
tags: [...]
description: "..."
source_urls: [...]
template_variant: "standard|beginner|reward_focus|comparison|deep_dive"
compliance_check: { passed: bool, hits: [], reasons: [] }
generation_model: "claude-sonnet-4-6"
draft: true|false
```

## Markdown形式
- h2から開始（h1不要）
- 免責事項は記事本文に含めない（テンプレートで別途追加）
- 出力はMarkdown本文のみ（frontmatterは生成エンジンが付与）
