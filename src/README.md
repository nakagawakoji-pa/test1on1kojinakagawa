# 1on1 発話比率測定アプリケーション

このディレクトリには、1on1ミーティングの発話比率を測定するWebアプリケーションのソースコードが含まれています。

## ファイル構成

```
src/
├── index.html          # メインHTMLファイル
├── css/
│   └── styles.css      # カスタムCSSスタイル
├── js/
│   └── script.js       # アプリケーションロジック
└── assets/
    └── images/         # 画像ファイル（今後追加予定）
```

## 使用方法

1. ブラウザで `index.html` を開く
2. マイクへのアクセス許可を与える
3. 「初回登録」タブで上司の声を登録
4. 「1on1測定」タブで測定を開始

詳細な使用方法は `/docs/user-guide.md` を参照してください。

## 技術仕様

- **HTML5**: セマンティックなマークアップ
- **Tailwind CSS**: CDNから読み込み（設定不要）
- **Chart.js**: CDNから読み込み（設定不要）
- **JavaScript ES6**: モダンなJavaScript機能を使用
- **Web Audio API**: マイク音声の解析

## 開発情報

### 外部依存関係（CDN）

- Tailwind CSS: `https://cdn.tailwindcss.com`
- Chart.js: `https://cdn.jsdelivr.net/npm/chart.js`

### ブラウザ要件

- Web Audio API対応
- MediaDevices API対応
- LocalStorage対応
- ES6対応

### デバッグ

ブラウザのコンソール（F12 → Consoleタブ）で詳細なログを確認できます。
すべての主要な処理でログが出力されるように実装されています。

## セキュリティ

- すべての処理はブラウザ内で完結
- 音声データは外部に送信されません
- LocalStorageに音響特徴量のみを保存
- 音声ファイル自体は保存されません

## ライセンス

MIT License
