import type { GenerateRequest } from "./types.js";

const TEMPLATE_VARIANTS = ["standard", "beginner", "reward_focus", "comparison", "deep_dive"] as const;

export function pickVariant(): string {
  return TEMPLATE_VARIANTS[Math.floor(Math.random() * TEMPLATE_VARIANTS.length)];
}

export function buildPrompt(req: GenerateRequest): string {
  const { app, templateVariant } = req;

  const variantInstructions: Record<string, string> = {
    standard: "バランスよく全セクションを均等に書いてください。",
    beginner:
      "初心者向けに丁寧に解説してください。始め方と遊び方に重点を置き、専門用語は必ず説明を添えてください。",
    reward_focus:
      "報酬と稼ぎ方に重点を置いてください。どのミッションがどれだけのリワードを得られるか具体的に書いてください。",
    comparison:
      "同カテゴリの他ゲームとの違いを意識して、このゲームならではの特徴を強調してください。",
    deep_dive:
      "攻略のコツセクションを特に充実させ、上級者向けの戦略やテクニックも含めてください。",
  };

  const instruction = variantInstructions[templateVariant] || variantInstructions.standard;

  return `あなたはLINE Dapp Portal（Mini Dapp）のゲーム攻略ライターです。
以下のゲーム情報をもとに、日本語の攻略記事をMarkdown形式で書いてください。

## ゲーム情報
- ゲーム名: ${app.name}
- カテゴリ: ${app.category}
- プレイ人数: ${app.play_count}人がプレイ中
- ゲームURL: ${app.detail_url}
${app.rewards.length > 0 ? `- リワード情報: ${app.rewards.join(", ")}` : ""}

## 記事の構成（この順番で書いてください）

### 1. ${app.name}とは
- ゲームの概要とジャンル
- カテゴリ: ${app.category}
- ${app.play_count}人がプレイ中であることに言及

### 2. 始め方
- LINE Dapp Portalからのアクセス方法
- 初期設定やチュートリアルの流れ

### 3. 遊び方・基本操作
- ゲームの基本ルール
- 操作方法

### 4. 攻略のコツ
- 効率的な進め方
- おすすめの戦略

### 5. 報酬・稼ぎ方
- 獲得できるリワードの種類
- 効率的な稼ぎ方のヒント

### 6. KAIAの換金方法
- 「KAIAの換金方法については、詳しくは[KAIA換金ガイド](/guide/how-to-cash-out/)をご覧ください。」と書く
- この記事内で換金の詳細は書かない

### 7. まとめ
- ゲームの魅力を簡潔にまとめる

## ライティングルール
- ${instruction}
- 最低1,500文字以上書くこと
- ゲーム名「${app.name}」をタイトルと本文中に自然に含めること
- 「必ず儲かる」「元本保証」「リスクなし」「確実に稼げる」等の断定的な金融表現は絶対に使わないこと
- 不確実な情報は「〜と表示されています」「〜が用意されています」のように事実ベースで書くこと。「〜とされています」「〜の可能性があります」等のヘッジ表現は使わないこと
- 各段落は前後の文脈に依存せず、単独で意味が通るように書くこと（LLMが段落単位で引用できるようにする）
- 専門用語（KAIA、NFT、ブロックチェーン等）は初出時に1文で定義すること
  - 例: 「**KAIAトークン** — LINE Dapp Portalで獲得できる暗号資産。国内取引所で日本円に換金可能。」
  - 例: 「**NFTアイテム** — ブロックチェーンに記録された固有のデジタルアイテム。マーケットプレイスで売買可能。」
- Markdown形式で出力（h1タイトルは不要、h2から始めてください）
- 記事の最後に免責事項は書かないでください（別途追加します）

出力はMarkdown本文のみ。frontmatterやメタ情報は含めないでください。`;
}
