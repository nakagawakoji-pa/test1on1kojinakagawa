# 1on1 発話比率測定アプリケーション（Azure Speech Service版）

このディレクトリには、Azure Speech Serviceのリアルタイムダイアライゼーション機能を使用した1on1ミーティングの発話比率測定Webアプリケーションのソースコードが含まれています。

## ファイル構成

```
src/
├── index.html          # メインHTMLファイル
├── css/
│   └── styles.css      # カスタムCSSスタイル
├── js/
│   ├── script.js       # アプリケーションロジック（Azure版）
│   ├── script-azure.js # Azure版のバックアップ
│   └── script-old.js   # 旧版（Web Audio API版）のバックアップ
└── assets/
    └── images/         # 画像ファイル（今後追加予定）
```

## 使用方法

### 準備

1. Azure Speech Serviceのサブスクリプションキーとリージョンを取得
   - [Azure Portal](https://portal.azure.com)でSpeech Serviceを作成
   - 詳細は `/docs/user-guide-azure.md` を参照

### 実行手順

1. ブラウザで `index.html` を開く
2. 「Azure設定」タブでサブスクリプションキーとリージョンを入力
3. 「上司の声登録」タブで上司の声を登録
4. 「1on1測定」タブで測定を開始

詳細な使用方法は `/docs/user-guide-azure.md` を参照してください。

## 技術仕様

- **HTML5**: セマンティックなマークアップ
- **Tailwind CSS**: CDNから読み込み（設定不要）
- **Chart.js**: CDNから読み込み（設定不要）
- **Azure Speech SDK**: CDNから読み込み（設定不要）
- **JavaScript ES6**: モダンなJavaScript機能を使用
- **Azure Speech Service**: リアルタイム音声認識とダイアライゼーション

## 開発情報

### 外部依存関係（CDN）

- **Tailwind CSS**: `https://cdn.tailwindcss.com`
- **Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js`
- **Azure Speech SDK**: `https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk@latest/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js`

### ブラウザ要件

- MediaDevices API対応（マイクアクセス）
- LocalStorage対応
- ES6対応
- WebSocket対応（Azure通信用）
- インターネット接続（Azure Speech Service利用のため）

### Azure要件

- Azure Speech Serviceのサブスクリプション
- サブスクリプションキー
- リージョン情報（例: japaneast）

### デバッグ

ブラウザのコンソール（F12 → Consoleタブ）で詳細なログを確認できます。
すべての主要な処理でログが出力されるように実装されています。

ログの例:
- 🚀 アプリケーション起動
- ✅ 成功メッセージ
- ❌ エラーメッセージ
- 🎤 Azure Speech Service関連
- 🗣️ 音声認識結果
- 🎯 話者識別結果

## セキュリティ

### データの取り扱い

- **音声データ**: Azure Speech Serviceで処理され、ブラウザには保存されない
- **認識結果**: ブラウザで一時的に処理（保存なし）
- **設定情報**: LocalStorageに保存（平文）

### 注意事項

⚠️ このアプリケーションは教育・デモ目的で作成されています。
- サブスクリプションキーはLocalStorageに平文保存されます
- 本番環境では適切なセキュリティ対策が必要です
- キーは他人と共有しないでください

## Azure Speech Serviceについて

このアプリケーションは、以下のAzure機能を使用しています：

### ConversationTranscriber（会話の文字起こし）

リアルタイムで会話を文字起こしし、複数の話者を識別する機能です。

**主な機能**:
- リアルタイム音声認識
- 話者ダイアライゼーション（話者識別）
- 日本語対応（ja-JP）

**利用料金**:
- 無料枠: 月5時間まで
- 詳細: [Azure Speech Serviceの価格](https://azure.microsoft.com/ja-jp/pricing/details/cognitive-services/speech-services/)

### 実装の詳細

現在の実装では、簡易的な話者識別ロジックを使用しています：
- 最初に話した人を「上司」として識別
- それ以降に検出された別の話者を「部下」として識別

将来的には、Azure Speaker Recognition APIと統合し、より高精度な話者識別を実現する予定です。

## トラブルシューティング

### よくある問題

1. **「Azure Speech SDKが読み込まれていません」エラー**
   - インターネット接続を確認
   - CDNへのアクセスがブロックされていないか確認

2. **「認識開始に失敗しました」エラー**
   - サブスクリプションキーが正しいか確認
   - リージョンが正しいか確認（例: japaneast）
   - Azure Speech Serviceが有効か確認

3. **マイクへのアクセス許可エラー**
   - ブラウザの設定でマイクの許可を確認
   - HTTPSまたはlocalhostで実行しているか確認

詳細は `/docs/user-guide-azure.md` のトラブルシューティングセクションを参照してください。

## 参考リンク

- [Azure Speech Service ドキュメント](https://docs.microsoft.com/ja-jp/azure/cognitive-services/speech-service/)
- [JavaScript SDK リファレンス](https://docs.microsoft.com/ja-jp/javascript/api/microsoft-cognitiveservices-speech-sdk/)
- [会話の文字起こし](https://docs.microsoft.com/ja-jp/azure/cognitive-services/speech-service/conversation-transcription)

## ライセンス

MIT License

---

**更新日**: 2025年10月29日  
**バージョン**: Azure Speech Service版 1.0
