# スクリーンショット観測ルール

## 正規定義ファイル
- Playwright設定: `config/scraper.yaml`
- 観測結果の保存先: `data/games-research.json` の各ゲーム `.screenshot` フィールド

## 撮影設定（scraper.yaml準拠）
- viewport: 1280x720
- user_agent: Chrome 131 標準UA
- wait_timeout: 5000ms
- フルページスクリーンショット

## 判定基準

| グレード | 画面内容 | 記事利用 | 説明 |
|---------|---------|---------|------|
| **A** | タイトル画面 | 可 | ゲーム名・ロゴが見えるメイン画面 |
| **B** | ローディング画面 | 可 | ゲームロゴ付きのロード画面。内容は読める |
| **C** | ログイン画面 | 不可 | LINEログインやウォレット接続を要求 |
| **D** | 空白・黒画面 | 不可 | 何も表示されない、または真っ黒 |
| **E** | タイムアウト | 不可 | wait_timeout内にコンテンツが読み込まれない |

### 記事用画像の使用条件
- **A または B** のみ記事のスクリーンショットとして使用可
- **C / D / E** の場合は `thumbnail_url`（apps.jsonのサムネイル画像）にフォールバック

## 観測ログの書式

`data/games-research.json` の各ゲームエントリ:

```json
"screenshot": {
  "tested": true,
  "result": "A",
  "result_type": "title_screen",
  "tested_at": "2026-03-10T05:00:00.000Z",
  "image_path": "site/public/screenshots/game-slug.png"
}
```

### result_type の対応表
| result | result_type |
|--------|------------|
| A | `title_screen` |
| B | `loading_screen` |
| C | `login_required` |
| D | `blank_or_black` |
| E | `timeout` |

## 保存先
- スクリーンショット画像: `site/public/screenshots/{slug}.png`
- 観測結果: `data/games-research.json`

## 実績
- 30ゲーム中21ゲーム（70%）でA/Bレベルのキャプチャに成功
- A（タイトル画面）: 9本、B（ローディング）: 10本、C（ログイン）: 2本、D（空白/黒）: 8本、E（タイムアウト）: 1本
