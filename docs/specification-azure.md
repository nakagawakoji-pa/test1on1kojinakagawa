# 1on1 発話比率測定アプリ - 仕様書（Azure Speech Service版）

## 概要

このアプリケーションは、**Azure Speech Service**のリアルタイムダイアライゼーション機能を使用して、上司と部下の1on1ミーティングにおける発話比率を測定し、可視化するWebアプリケーションです。上司が話しすぎることを防ぎ、より効果的な1on1を実現することを目的としています。

## 更新履歴

- **2024年10月29日**: Azure Speech Service統合版として更新

## 機能仕様

### 0. Azure設定機能（新機能）

#### 目的
Azure Speech Serviceを使用するために必要な認証情報を設定します。

#### 操作フロー
1. アプリケーションを起動し、「Azure設定」タブを開く
2. Azure ポータルで作成したSpeech Serviceの**サブスクリプションキー**を入力
3. Speech Serviceの**リージョン**（例: japaneast）を入力
4. 「設定を保存」ボタンをクリック
5. 設定が保存されたことを確認

#### 技術仕様
- **データ保存**: LocalStorage（ブラウザローカル）
- **セキュリティ**: 教育・デモ目的のため平文保存（本番環境では適切な暗号化が必要）
- **必須フィールド**:
  - サブスクリプションキー: Azure ポータルから取得
  - リージョン: 例）japaneast, eastus, westus2, westeurope

#### 保存データ形式
```
LocalStorageキー:
- azure_subscription_key: サブスクリプションキー
- azure_region: リージョン名
```

### 1. 上司の声登録機能

#### 目的
上司の声を事前に登録することで、1on1中に上司と部下の発話を自動的に識別できるようにします。

#### 操作フロー
1. Azure設定が完了していることを確認
2. 「上司の声登録」タブを開く
3. 「声の登録を開始」ボタンをクリック
4. マイクへのアクセス許可を求められたら「許可」をクリック
5. 約10秒間、自然な声で話す
6. 自動的に登録が完了し、登録日時が表示される

#### 技術仕様
- **使用API**: Azure Speech Service SDK
- **録音時間**: 約10秒間（自動停止）
- **データ保存**: 音声プロファイルID（LocalStorage）
- **音声処理**: Azure側で処理（ブラウザでは音声ファイルを保存しない）

#### 保存データ形式
```
LocalStorageキー:
- azure_voice_profile_id: 音声プロファイルID
- azure_voice_profile_date: 登録日時（タイムスタンプ）
```

**注意**: 現在の実装は簡易版です。実際のAzure Speaker Recognition APIを使用する場合は、REST APIを通じて音声プロファイルを作成する必要があります。

### 2. 1on1測定機能

#### 目的
1on1ミーティング中の発話比率をリアルタイムで測定し、終了後に結果を表示します。

#### 操作フロー
1. Azure設定と上司の声登録が完了していることを確認
2. 「1on1測定」タブを開く
3. 「1on1開始」ボタンをクリック
4. マイクへのアクセス許可を求められたら「許可」をクリック
5. 1on1を実施（リアルタイムで発話時間が表示される）
6. 「1on1終了」ボタンをクリック
7. 結果が円グラフとともに表示される

#### 技術仕様
- **使用API**: Azure Speech Service - ConversationTranscriber
- **話者識別**: リアルタイムダイアライゼーション機能を使用
- **発話認識**: Azure側でリアルタイムに音声を認識
- **時間計測**: ミリ秒単位で発話時間を累積
- **リアルタイム表示**: 発話検出時に音声レベルバーを表示

#### 話者識別ロジック
現在の実装では、簡易的な方法として以下のロジックを使用しています：
1. 最初に話した人を「上司」として識別
2. それ以降に検出された別の話者を「部下」として識別
3. Azure ConversationTranscriberが提供する`speakerId`を使用

**将来的な改善**: Azure Speaker Recognition APIと統合し、事前登録された音声プロファイルと照合することで、より高精度な話者識別が可能になります。

#### 測定データ
- 総会話時間
- 上司の発話時間（ミリ秒単位）
- 部下の発話時間（ミリ秒単位）
- 発話比率（パーセンテージ）

### 3. 結果表示機能

#### 表示内容
1. **統計情報**
   - 総会話時間
   - 上司の発話時間
   - 部下の発話時間

2. **円グラフ**
   - Chart.jsを使用した視覚的な比率表示
   - 上司: 青色
   - 部下: オレンジ色

3. **アドバイス**
   - 上司の発話比率が60%超: 「上司が話しすぎ」の警告
   - 上司の発話比率が30%未満: 「良い傾聴」の評価
   - 30-60%: 「バランスが良い」の評価

## 技術スタック

### フロントエンド
- **HTML5**: セマンティックなマークアップ
- **CSS3**: スタイリング
- **Tailwind CSS 3.x**: ユーティリティファーストCSS（CDN）
- **JavaScript ES6**: アプリケーションロジック
- **Chart.js**: 円グラフの描画（CDN）

### Azure統合
- **Azure Cognitive Services Speech SDK**: 音声認識とダイアライゼーション（CDN）
- **バージョン**: Latest（CDN経由で自動更新）
- **CDN URL**: `https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk@latest/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js`

### Web API
- **MediaDevices API**: マイクへのアクセス
- **LocalStorage API**: 設定の永続化

## Azure Speech Service統合の詳細

### 使用している機能

#### 1. ConversationTranscriber
リアルタイムで会話を文字起こしし、複数の話者を識別する機能です。

```javascript
const conversationTranscriber = new SpeechSDK.ConversationTranscriber(speechConfig, audioConfig);
```

#### 2. イベントハンドラー
- `transcribing`: 認識中の中間結果
- `transcribed`: 認識完了時の最終結果
- `canceled`: エラーまたはキャンセル時
- `sessionStopped`: セッション停止時

#### 3. 話者識別
`e.result.speakerId`で話者IDを取得し、発話を識別します。

### 認証フロー

```
1. ユーザーがサブスクリプションキーとリージョンを入力
   ↓
2. LocalStorageに保存
   ↓
3. SpeechConfig.fromSubscription()で認証
   ↓
4. ConversationTranscriberを作成
   ↓
5. リアルタイム認識開始
```

## データフロー

```
[マイク入力]
    ↓
[Azure Speech Service]
  - リアルタイム音声認識
  - 話者ダイアライゼーション
    ↓
[ConversationTranscriber Events]
  - transcribed event
  - speakerId取得
    ↓
[話者識別ロジック]
  - 上司 or 部下
    ↓
[発話時間累積]
    ↓
[リアルタイム表示]
    ↓
[結果の可視化]
  - 円グラフ
  - 統計情報
  - アドバイス
```

## セキュリティとプライバシー

### 実装されたセキュリティ対策

✅ **データの取り扱い**
- 音声データはAzure Speech Serviceで処理され、ブラウザには保存されない
- 認識結果（テキスト）と話者IDのみをブラウザで処理
- 文字起こしされたテキストは表示のみで保存しない

✅ **認証情報の管理**
- サブスクリプションキーはLocalStorageに保存（教育・デモ目的）
- UI上で注意事項を明示的に表示
- 本番環境では適切な暗号化が必要

⚠️ **注意事項**
- このアプリケーションは教育・デモ目的で作成されています
- サブスクリプションキーは平文でLocalStorageに保存されます
- 本番環境では以下の対策が必要です：
  - サーバーサイドでの認証
  - トークンベースの認証
  - HTTPS通信の必須化
  - キーの定期的なローテーション

### Azureのデータ処理

Azure Speech Serviceは、Microsoftのプライバシーポリシーに従ってデータを処理します：
- 音声データの処理は一時的なもの
- データはMicrosoftのデータセンターで処理される
- データ保持ポリシーについては、Azureの利用規約を参照

参考: [Azure Cognitive Servicesのコンプライアンスとプライバシー](https://docs.microsoft.com/ja-jp/legal/cognitive-services/speech-service/data-privacy-security)

## ブラウザ互換性

### 対応ブラウザ
- ✅ Google Chrome 90+
- ✅ Mozilla Firefox 88+
- ✅ Microsoft Edge 90+
- ⚠️ Safari 14+（一部機能に制限がある可能性）

### 必須機能
- Azure Speech SDK（JavaScript）
- MediaDevices.getUserMedia()
- LocalStorage
- ES6 JavaScript
- Canvas（Chart.js用）
- WebSocket（Azure通信用）

## 制限事項

### 現在の実装の制限

1. **話者識別の簡易実装**
   - 現在は「最初に話した人を上司とみなす」という簡易ロジック
   - Azure Speaker Recognition APIとの完全統合が必要
   - 音声プロファイルの作成にREST APIの利用が必要

2. **ネットワーク依存**
   - Azure Speech Serviceへの通信が必要
   - インターネット接続が必須
   - 通信遅延により認識精度が影響を受ける可能性

3. **認証情報の保存**
   - LocalStorageに平文保存（教育目的）
   - 本番環境には不適切

4. **コスト**
   - Azure Speech Serviceの利用料金が発生
   - 無料枠を超えると課金される
   - 詳細: [Azure Speech Serviceの価格](https://azure.microsoft.com/ja-jp/pricing/details/cognitive-services/speech-services/)

## Azure Speech Serviceの設定手順

### 前提条件
1. Azureアカウント（無料アカウントでも可）
2. Azure ポータルへのアクセス

### セットアップ手順

1. **Azure ポータルにログイン**
   - https://portal.azure.com にアクセス

2. **Speech Serviceの作成**
   - 「リソースの作成」をクリック
   - 「Speech」を検索して選択
   - 「作成」をクリック

3. **必要情報の入力**
   - サブスクリプション: 使用するサブスクリプションを選択
   - リソースグループ: 新規作成または既存を選択
   - リージョン: 例）Japan East
   - 名前: 任意の名前
   - 価格レベル: Free F0 または Standard S0

4. **作成完了後**
   - リソースに移動
   - 「キーとエンドポイント」を選択
   - キー1またはキー2をコピー
   - リージョンを確認（例: japaneast）

5. **アプリケーションで設定**
   - 本アプリの「Azure設定」タブを開く
   - コピーしたキーを「サブスクリプションキー」に貼り付け
   - リージョンを入力（例: japaneast）
   - 「設定を保存」をクリック

## 今後の改善案

### 短期的改善（3ヶ月以内）
- [ ] Azure Speaker Recognition APIとの完全統合
- [ ] 音声プロファイルの適切な作成・管理
- [ ] エラーハンドリングの強化
- [ ] 認識精度の向上

### 中期的改善（6ヶ月以内）
- [ ] サーバーサイド認証の実装
- [ ] トークンベースの認証に移行
- [ ] 文字起こし結果の保存・エクスポート機能
- [ ] 複数の1on1セッションの履歴管理

### 長期的改善（1年以内）
- [ ] 3人以上のミーティング対応
- [ ] 感情分析の追加
- [ ] キーワード抽出
- [ ] AIによる会話品質の分析
- [ ] Teams等との統合

## 参考リンク

### Azure関連
- [Azure Speech Service ドキュメント](https://docs.microsoft.com/ja-jp/azure/cognitive-services/speech-service/)
- [JavaScript SDK リファレンス](https://docs.microsoft.com/ja-jp/javascript/api/microsoft-cognitiveservices-speech-sdk/)
- [会話の文字起こし](https://docs.microsoft.com/ja-jp/azure/cognitive-services/speech-service/conversation-transcription)
- [話者認識](https://docs.microsoft.com/ja-jp/azure/cognitive-services/speech-service/speaker-recognition-overview)

### サンプルコード
- [Azure Speech SDK サンプル](https://github.com/Azure-Samples/cognitive-services-speech-sdk)

## ライセンス

MIT License

## 作成日

- 初版: 2024年10月29日
- Azure版: 2024年10月29日
