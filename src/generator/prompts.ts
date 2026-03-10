import type { GenerateRequest } from "./types.js";

export type VariantId =
  | "game_strategy"
  | "game_earning"
  | "game_casual"
  | "content_explorer"
  | "social_community"
  | "tech_platform";

interface VariantDef {
  id: VariantId;
  sections: { title: string; bullets: string[] }[];
  instruction: string;
}

const VARIANTS: Record<VariantId, VariantDef> = {
  game_strategy: {
    id: "game_strategy",
    instruction:
      "中〜上級者も満足する戦略的な攻略記事を書いてください。ゲームシステムの深い理解に基づいた具体的なアドバイスを重視してください。",
    sections: [
      {
        title: "{name}とは",
        bullets: [
          "ゲームの概要・ジャンル・世界観",
          "{play_count}人がプレイ中であることに言及",
          "このゲームが人気の理由を1文で",
        ],
      },
      {
        title: "始め方・初期設定",
        bullets: [
          "LINE Dapp Portalからのアクセス手順",
          "チュートリアルで押さえるべきポイント",
        ],
      },
      {
        title: "ゲームシステム詳解",
        bullets: [
          "コアメカニクスの仕組み（戦闘、スコア計算、レベルシステム等）",
          "リソースの種類と用途",
          "ゲーム内経済の循環（何を消費して何を得るか）",
        ],
      },
      {
        title: "立ち回り・戦略ガイド",
        bullets: [
          "序盤・中盤・終盤のフェーズ別戦略",
          "効率的なリソース管理の考え方",
          "上位プレイヤーが実践しているテクニック",
        ],
      },
      {
        title: "ランキング・スコアアタック攻略",
        bullets: [
          "スコアやランキングの仕組み",
          "ハイスコアを狙うための具体的なコツ",
          "やりがちなミスとその回避法",
        ],
      },
      {
        title: "報酬・稼ぎ方",
        bullets: [
          "獲得できるリワードの種類",
          "効率的な報酬の集め方",
        ],
      },
      {
        title: "KAIAの換金方法",
        bullets: [
          "「KAIAの換金方法については、詳しくは[KAIA換金ガイド](/guide/how-to-cash-out/)をご覧ください。」と書く",
          "この記事内で換金の詳細は書かない",
        ],
      },
      {
        title: "まとめ",
        bullets: [
          "このゲームの魅力と、どんなプレイヤーに向いているかを簡潔に",
        ],
      },
    ],
  },

  game_earning: {
    id: "game_earning",
    instruction:
      "報酬システムに詳しい読者向けの記事を書いてください。トークン獲得の具体的な手順と効率化を重視してください。ただし金融的な断定は絶対に避けてください。",
    sections: [
      {
        title: "{name}とは",
        bullets: [
          "ゲームの概要とジャンル",
          "{play_count}人がプレイ中であることに言及",
          "報酬としてどのトークンが獲得できるか",
        ],
      },
      {
        title: "始め方",
        bullets: [
          "LINE Dapp Portalからのアクセス方法",
          "ウォレット接続が必要な場合はその手順",
        ],
      },
      {
        title: "遊び方の基本",
        bullets: [
          "ゲームの基本ルールと操作",
          "報酬獲得に関わる主要なゲームモード",
        ],
      },
      {
        title: "報酬の種類と獲得条件",
        bullets: [
          "獲得できるトークン・ポイントの一覧",
          "各報酬の獲得条件（どのアクションで何がもらえるか）",
          "報酬のレート・配布タイミング",
        ],
      },
      {
        title: "日次・週次の稼ぎ方ルーティン",
        bullets: [
          "毎日やるべきこと（デイリーミッション、ログインボーナス等）",
          "週間目標の立て方",
          "時間帯やタイミングによる効率の違い",
        ],
      },
      {
        title: "トークン管理のコツ",
        bullets: [
          "獲得したトークンの確認方法",
          "ゲーム内での再投資 vs 換金の判断ポイント",
          "よくある失敗パターンとその防ぎ方",
        ],
      },
      {
        title: "KAIAの換金方法",
        bullets: [
          "「KAIAの換金方法については、詳しくは[KAIA換金ガイド](/guide/how-to-cash-out/)をご覧ください。」と書く",
          "この記事内で換金の詳細は書かない",
        ],
      },
      {
        title: "まとめ",
        bullets: [
          "報酬面でのこのゲームの強み",
          "どんなプレイスタイルの人に向いているか",
        ],
      },
    ],
  },

  game_casual: {
    id: "game_casual",
    instruction:
      "ゲーム初心者やカジュアルプレイヤー向けに、親しみやすく丁寧に書いてください。専門用語は必ず説明を添え、ステップバイステップで解説してください。",
    sections: [
      {
        title: "{name}とは",
        bullets: [
          "ゲームの概要（どんなゲームか一言で）",
          "{play_count}人がプレイ中であることに言及",
          "必要なスキルレベル（初心者でも楽しめるか）",
        ],
      },
      {
        title: "始め方ガイド",
        bullets: [
          "LINE Dapp Portalを開くところから順を追って",
          "アカウント作成やウォレットの設定（必要な場合）",
          "チュートリアルの流れ",
        ],
      },
      {
        title: "最初の30分でやるべきこと",
        bullets: [
          "チュートリアル完了後の最初のステップ",
          "序盤で優先すべきアクション3つ",
          "後回しにしていいこと",
        ],
      },
      {
        title: "基本操作マスターガイド",
        bullets: [
          "画面の見方・UIの説明",
          "タップ・スワイプ等の操作方法",
          "メニュー画面の使い方",
        ],
      },
      {
        title: "初心者がハマりやすい落とし穴",
        bullets: [
          "やりがちな失敗パターンと対処法",
          "効率の悪い進め方の例",
          "知っておくと得する豆知識",
        ],
      },
      {
        title: "報酬・稼ぎ方",
        bullets: [
          "獲得できるリワードの種類",
          "初心者でも簡単に稼げる方法",
        ],
      },
      {
        title: "KAIAの換金方法",
        bullets: [
          "「KAIAの換金方法については、詳しくは[KAIA換金ガイド](/guide/how-to-cash-out/)をご覧ください。」と書く",
          "この記事内で換金の詳細は書かない",
        ],
      },
      {
        title: "まとめ",
        bullets: [
          "このゲームが初心者にもおすすめな理由",
          "まず何から始めればいいかの一言アドバイス",
        ],
      },
    ],
  },

  content_explorer: {
    id: "content_explorer",
    instruction:
      "ゲームではなくコンテンツサービスとして紹介してください。どんなコンテンツが楽しめるか、他のサービスと何が違うかを具体的に書いてください。",
    sections: [
      {
        title: "{name}とは",
        bullets: [
          "サービスの概要と提供コンテンツ",
          "{play_count}人が利用中であることに言及",
          "Web3要素がどう活かされているか",
        ],
      },
      {
        title: "始め方",
        bullets: [
          "LINE Dapp Portalからのアクセス方法",
          "初回登録の流れ",
        ],
      },
      {
        title: "コンテンツの種類と楽しみ方",
        bullets: [
          "提供されているコンテンツの一覧",
          "各コンテンツの特徴と楽しみ方",
          "おすすめのコンテンツと理由",
        ],
      },
      {
        title: "おすすめの使い方・活用シーン",
        bullets: [
          "通勤中、休憩時間など利用シーン別の活用法",
          "ヘビーユーザーの使い方の例",
          "隠れた便利機能",
        ],
      },
      {
        title: "他サービスとの違い",
        bullets: [
          "既存の類似サービスと比較した強み",
          "ブロックチェーンならではのメリット",
          "注意点・デメリット",
        ],
      },
      {
        title: "報酬・特典",
        bullets: [
          "利用で獲得できるリワード",
          "特典の受け取り方",
        ],
      },
      {
        title: "KAIAの換金方法",
        bullets: [
          "「KAIAの換金方法については、詳しくは[KAIA換金ガイド](/guide/how-to-cash-out/)をご覧ください。」と書く",
          "この記事内で換金の詳細は書かない",
        ],
      },
      {
        title: "まとめ",
        bullets: [
          "このサービスが向いている人・向いていない人",
        ],
      },
    ],
  },

  social_community: {
    id: "social_community",
    instruction:
      "ソーシャル要素・コミュニティ機能を中心に解説してください。一人で遊ぶ場合と、フレンドやギルドで遊ぶ場合の違いを明確にしてください。",
    sections: [
      {
        title: "{name}とは",
        bullets: [
          "サービスの概要とソーシャル要素",
          "{play_count}人が参加中であることに言及",
          "コミュニティの雰囲気や規模感",
        ],
      },
      {
        title: "始め方",
        bullets: [
          "LINE Dapp Portalからのアクセス方法",
          "プロフィール設定のコツ",
        ],
      },
      {
        title: "基本機能と使い方",
        bullets: [
          "メイン機能の一覧と概要",
          "基本的な操作フロー",
        ],
      },
      {
        title: "コミュニティ・フレンド活用術",
        bullets: [
          "フレンド追加・チーム結成の方法",
          "ギルド・クラン等のグループ機能",
          "協力プレイのメリットと立ち回り",
          "ソロプレイとの違い",
        ],
      },
      {
        title: "イベント参加ガイド",
        bullets: [
          "定期イベントの種類とスケジュール",
          "イベント報酬の効率的な集め方",
          "限定イベントの情報入手方法",
        ],
      },
      {
        title: "報酬・稼ぎ方",
        bullets: [
          "ソーシャル活動で得られる報酬",
          "ソロ報酬との比較",
        ],
      },
      {
        title: "KAIAの換金方法",
        bullets: [
          "「KAIAの換金方法については、詳しくは[KAIA換金ガイド](/guide/how-to-cash-out/)をご覧ください。」と書く",
          "この記事内で換金の詳細は書かない",
        ],
      },
      {
        title: "まとめ",
        bullets: [
          "このサービスが向いている人",
          "コミュニティ参加のすすめ",
        ],
      },
    ],
  },

  tech_platform: {
    id: "tech_platform",
    instruction:
      "技術プラットフォームとしての特徴を、非エンジニアにもわかるように解説してください。何ができるか、どう使うと便利かを具体例で示してください。",
    sections: [
      {
        title: "{name}とは",
        bullets: [
          "プラットフォームの概要と目的",
          "{play_count}人が利用中であることに言及",
          "どんな技術（AI、DeFi、DePIN等）を使っているか",
        ],
      },
      {
        title: "始め方",
        bullets: [
          "LINE Dapp Portalからのアクセス方法",
          "初期設定に必要なもの",
        ],
      },
      {
        title: "主要機能の使い方",
        bullets: [
          "メイン機能の操作手順",
          "画面の見方・基本フロー",
        ],
      },
      {
        title: "活用シーン・ユースケース",
        bullets: [
          "具体的な利用場面を3つ以上",
          "初心者向けの活用例",
          "上級者向けの活用例",
        ],
      },
      {
        title: "技術的な特徴と仕組み",
        bullets: [
          "使われている技術のわかりやすい説明",
          "従来のサービスとの技術的な違い",
          "セキュリティ・信頼性について",
        ],
      },
      {
        title: "報酬・稼ぎ方",
        bullets: [
          "利用で獲得できるリワード",
          "効率的な稼ぎ方",
        ],
      },
      {
        title: "KAIAの換金方法",
        bullets: [
          "「KAIAの換金方法については、詳しくは[KAIA換金ガイド](/guide/how-to-cash-out/)をご覧ください。」と書く",
          "この記事内で換金の詳細は書かない",
        ],
      },
      {
        title: "まとめ",
        bullets: [
          "このプラットフォームの将来性と現時点の評価",
        ],
      },
    ],
  },
};

/**
 * カテゴリ・報酬タイプ・プレイ人数から最適なバリアントを決定的に選択
 */
export function selectVariant(app: {
  category: string;
  play_count_raw: number;
  rewards: string[];
  hasFtToken?: boolean;
}): VariantId {
  // FT token games always get game_earning (highest priority — token earning is the key differentiator)
  if (app.hasFtToken) return "game_earning";

  const cat = app.category.toUpperCase();

  if (cat === "CONTENT") return "content_explorer";
  if (cat === "SOCIAL" || cat === "SOCIALFI") return "social_community";
  if (cat === "AI" || cat === "DEFI" || cat === "DEPIN") return "tech_platform";

  // GAME category: split by popularity
  if (app.play_count_raw >= 500_000) return "game_strategy";
  return "game_casual";
}

/** @deprecated Use selectVariant instead */
export function pickVariant(): VariantId {
  const ids = Object.keys(VARIANTS) as VariantId[];
  return ids[Math.floor(Math.random() * ids.length)];
}

export function getVariantDef(id: VariantId): VariantDef {
  return VARIANTS[id];
}

export function buildPrompt(req: GenerateRequest): string {
  const { app, templateVariant } = req;
  const variantId = (templateVariant in VARIANTS ? templateVariant : "game_casual") as VariantId;
  const variant = VARIANTS[variantId];

  const sectionsText = variant.sections
    .map((sec, i) => {
      const title = sec.title
        .replace("{name}", app.name)
        .replace("{play_count}", app.play_count);
      const bullets = sec.bullets
        .map((b) =>
          b.replace("{name}", app.name).replace("{play_count}", app.play_count)
        )
        .map((b) => `- ${b}`)
        .join("\n");
      return `### ${i + 1}. ${title}\n${bullets}`;
    })
    .join("\n\n");

  return `あなたはLINE Dapp Portal（Mini Dapp）のゲーム攻略ライターです。
以下のゲーム情報をもとに、日本語の攻略記事をMarkdown形式で書いてください。

## ゲーム情報
- ゲーム名: ${app.name}
- カテゴリ: ${app.category}
- プレイ人数: ${app.play_count}人がプレイ中
- ゲームURL: ${app.detail_url}
${app.rewards.length > 0 ? `- リワード情報: ${app.rewards.join(", ")}` : ""}

## 記事の構成（この順番で書いてください）

${sectionsText}

## ライティングルール
- ${variant.instruction}
- 最低1,500文字以上書くこと
- ゲーム名「${app.name}」をタイトルと本文中に自然に含めること
- 「必ず儲かる」「元本保証」「リスクなし」「確実に稼げる」等の断定的な金融表現は絶対に使わないこと
- 不確実な情報は「〜と表示されています」「〜が用意されています」のように事実ベースで書くこと。「〜とされています」「〜の可能性があります」「〜場合があります」等のヘッジ表現は使わないこと
- 各段落は前後の文脈に依存せず、単独で意味が通るように書くこと（LLMが段落単位で引用できるようにする）
- 専門用語（KAIA、NFT、ブロックチェーン等）は初出時に1文で定義すること
  - 例: 「**KAIAトークン** — LINE Dapp Portalで獲得できる暗号資産。国内取引所で日本円に換金可能。」
  - 例: 「**NFTアイテム** — ブロックチェーンに記録された固有のデジタルアイテム。マーケットプレイスで売買可能。」
- Markdown形式で出力（h1タイトルは不要、h2から始めてください）
- 記事の最後に免責事項は書かないでください（別途追加します）

出力はMarkdown本文のみ。frontmatterやメタ情報は含めないでください。`;
}
