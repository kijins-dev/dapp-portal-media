# 記事構造ルール

## 正規定義ファイル
- プロンプトテンプレート: `src/generator/prompts.ts`
- 本ルールは prompts.ts と対応し、記事の構造要件を定める

## バリアント別セクション構成

記事はバリアントごとに異なるセクション構成を持つ。`selectVariant()` がカテゴリ・報酬タイプ・プレイ人数から自動選択する。

### 選択ロジック（優先順位順）
1. FTトークン保有 → `game_earning`
2. CONTENT カテゴリ → `content_explorer`
3. SOCIAL/SocialFi → `social_community`
4. AI/DeFi/DePIN → `tech_platform`
5. GAME + 50万人以上 → `game_strategy`
6. GAME + その他 → `game_casual`

### game_strategy（高人気GAME）
1. {ゲーム名}とは
2. 始め方・初期設定
3. **ゲームシステム詳解**
4. **立ち回り・戦略ガイド**
5. **ランキング・スコアアタック攻略**
6. 報酬・稼ぎ方
7. KAIAの換金方法
8. まとめ

### game_earning（FTトークン保有）
1. {ゲーム名}とは
2. 始め方
3. 遊び方の基本
4. **報酬の種類と獲得条件**
5. **日次・週次の稼ぎ方ルーティン**
6. **トークン管理のコツ**
7. KAIAの換金方法
8. まとめ

### game_casual（その他GAME）
1. {ゲーム名}とは
2. 始め方ガイド
3. **最初の30分でやるべきこと**
4. **基本操作マスターガイド**
5. **初心者がハマりやすい落とし穴**
6. 報酬・稼ぎ方
7. KAIAの換金方法
8. まとめ

### content_explorer（CONTENT）
1. {ゲーム名}とは
2. 始め方
3. **コンテンツの種類と楽しみ方**
4. **おすすめの使い方・活用シーン**
5. **他サービスとの違い**
6. 報酬・特典
7. KAIAの換金方法
8. まとめ

### social_community（SOCIAL/SocialFi）
1. {ゲーム名}とは
2. 始め方
3. **基本機能と使い方**
4. **コミュニティ・フレンド活用術**
5. **イベント参加ガイド**
6. 報酬・稼ぎ方
7. KAIAの換金方法
8. まとめ

### tech_platform（AI/DeFi/DePIN）
1. {ゲーム名}とは
2. 始め方
3. **主要機能の使い方**
4. **活用シーン・ユースケース**
5. **技術的な特徴と仕組み**
6. 報酬・インセンティブ
7. KAIAの換金方法
8. まとめ

## 共通ルール

### h2から開始
h1タイトルは不要。frontmatterの`title`で処理される。

### 最低文字数
1,500文字以上。

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
published_at: "YYYY-MM-DD"
updated_at: "YYYY-MM-DD"
tags: [...]
description: "..."
source_urls: [...]
template_variant: "game_strategy|game_earning|game_casual|content_explorer|social_community|tech_platform"
generation_model: "claude-sonnet-4-6"
draft: true|false
```

## Markdown形式
- h2から開始（h1不要）
- 免責事項は記事本文に含めない（GameArticle.astroテンプレートで別途追加）
- PR表記もテンプレートで追加済み
- 出力はMarkdown本文のみ（frontmatterは生成エンジンが付与）
