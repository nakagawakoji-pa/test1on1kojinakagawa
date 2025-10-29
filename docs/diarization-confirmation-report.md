# Azure Speech Service ダイアライゼーション機能の確認レポート

## 目的

Issue「マイク不具合」の調査として、以下を確認しました：

1. 上司の声を登録する機能が Azure Speech Service のダイアライゼーション機能を使用しているか
2. 音声認識結果とスピーカーIDのログ出力

## 調査結果

### ✅ ダイアライゼーション機能の使用確認

**結果: 使用している**

上司の声登録機能および1on1測定機能は、Azure Speech Service の `ConversationTranscriber` を使用しており、ダイアライゼーション（話者識別）機能が有効化されています。

#### 使用している Azure Speech Service の機能

| 機能 | 使用状況 | 説明 |
|------|---------|------|
| ConversationTranscriber | ✅ 使用中 | リアルタイム会話文字起こし |
| Speaker Diarization | ✅ 有効 | 話者の自動識別 |
| Speaker ID 取得 | ✅ 実装済 | 各発話のスピーカーID取得 |
| 音声認識 | ✅ 実装済 | 日本語音声のテキスト化 |

#### コード内での確認箇所

**1. 声の登録時 (`startVoiceRegistration` 関数)**

```javascript
// ConversationTranscriber を作成（ダイアライゼーション有効）
const registrationTranscriber = new SpeechSDK.ConversationTranscriber(speechConfig, audioConfig);

// 認識完了イベントでスピーカーIDを取得
registrationTranscriber.transcribed = (s, e) => {
    const speakerId = e.result.speakerId;  // ← ダイアライゼーションで識別されたID
    const text = e.result.text;            // ← 認識されたテキスト
    const duration = e.result.duration;    // ← 発話時間
    
    // ログ出力（追加実装）
    console.log('スピーカーID:', speakerId);
    console.log('認識テキスト:', text);
};
```

**2. 1on1測定時 (`startMeeting` 関数)**

```javascript
// ConversationTranscriber を作成（ダイアライゼーション有効）
conversationTranscriber = new SpeechSDK.ConversationTranscriber(speechConfig, audioConfig);

// イベントハンドラーでスピーカーIDを使用
conversationTranscriber.transcribed = (s, e) => {
    const speakerId = e.result.speakerId;  // ← ダイアライゼーションで識別されたID
    
    // 話者を識別
    const isManager = identifySpeaker(speakerId);
};
```

### 📝 実施した改善

#### 1. ログ出力の追加

**声の登録時のログ:**

```javascript
console.log('✅ ========== 音声認識結果 ==========');
console.log('📌 [結果 #' + recognitionCount + ']', {
    スピーカーID: speakerId,
    認識テキスト: text,
    発話時間: duration + 'ms',
    タイムスタンプ: new Date().toLocaleTimeString('ja-JP')
});
console.log('📌 [ダイアライゼーション] Azure Speech Service が話者を識別しました');
console.log('=====================================');
```

**1on1測定時のログ:**

```javascript
console.log('✅ ========== 1on1測定 - 音声認識結果 ==========');
console.log('📌 [認識結果]', {
    スピーカーID: speakerId,
    認識テキスト: text,
    発話時間: duration + 'ms',
    タイムスタンプ: new Date().toLocaleTimeString('ja-JP')
});
console.log('📌 [話者識別結果]', {
    スピーカーID: speakerId,
    識別結果: isManager ? '上司' : '部下',
    登録されたプロファイルID: localStorage.getItem(STORAGE_KEY_VOICE_PROFILE_ID)
});
console.log('============================================');
```

#### 2. 実装の改善

**以前の実装:**
- 声の登録時は単なるシミュレーション（10秒カウントダウン）
- 実際の音声認識は行われていなかった
- ダイアライゼーション機能は使用されていなかった

**改善後の実装:**
- 声の登録時も `ConversationTranscriber` を使用
- 10秒間実際に音声を録音・認識
- スピーカーIDを取得して保存
- ダイアライゼーション機能を正しく使用

#### 3. デバッグ情報の追加

以下の情報をコンソールログに出力するようにしました：

| 情報 | タイミング | 内容 |
|------|-----------|------|
| ダイアライゼーション使用確認 | 登録開始時 | Azure Speech Service のダイアライゼーション機能を使用していることを明示 |
| 音声認識中の状態 | 認識中 | リアルタイムの認識状態とスピーカーID |
| 認識結果の詳細 | 認識完了時 | スピーカーID、テキスト、発話時間、タイムスタンプ |
| 話者識別結果 | 1on1測定時 | スピーカーIDと識別結果（上司/部下） |
| 制限事項の明示 | 各処理時 | 現在の実装の制限事項を明示 |

## 現在の実装の特徴と制限

### ✅ 実装されている機能

1. **Azure Speech Service の ConversationTranscriber 使用**
   - リアルタイム音声認識
   - 自動話者識別（ダイアライゼーション）
   - スピーカーIDの取得

2. **ログ出力**
   - 音声認識結果の詳細表示
   - スピーカーIDの表示
   - 話者識別結果の表示

3. **簡易的な話者識別**
   - 最初に話した人を上司として識別
   - スピーカーIDに基づく識別

### ⚠️ 制限事項

1. **音声プロファイルとの照合は未実装**
   - 登録された声の特徴量との比較は行っていない
   - スピーカーIDの順番で判定している

2. **Azure Speaker Recognition API は未使用**
   - より高度な話者識別には別のAPI（Speaker Recognition API）が必要
   - ブラウザJavaScript SDKでは音声プロファイル作成が未サポート
   - REST API の直接呼び出しが必要

3. **話者識別の精度**
   - 現在の実装では「最初に話した人＝上司」として識別
   - 音声の特徴（声質、話し方）での識別は行っていない

## ダイアライゼーション vs Speaker Recognition

### ConversationTranscriber (ダイアライゼーション) - 現在使用中 ✅

**特徴:**
- リアルタイムで話者を識別
- 事前登録不要
- 会話中の異なる話者を自動識別
- スピーカーIDを付与（Guest-1, Guest-2 など）

**使用場面:**
- 複数人の会話の文字起こし
- 誰がいつ話したかの記録
- **現在のアプリケーションで使用中**

**制限:**
- 話者が誰なのか（名前）は識別できない
- 「話者A」「話者B」のように識別するのみ

### Speaker Recognition API - 未使用 ❌

**特徴:**
- 事前に音声プロファイルを登録
- 声の特徴量で個人を識別
- 「この声は〇〇さん」と特定できる

**使用場面:**
- 音声による本人認証
- 特定の人の声を識別
- より高度な話者識別

**制限:**
- ブラウザJavaScript SDKでは未サポート
- REST API の直接呼び出しが必要
- 実装が複雑

## 使用方法（デバッグ）

### 1. ブラウザのコンソールを開く

- Chrome: F12 → Console タブ
- Edge: F12 → コンソール タブ

### 2. 上司の声を登録

1. 「上司の声登録」タブを開く
2. 「声の登録を開始」をクリック
3. マイクに向かって話す（10秒間）

### 3. コンソールログを確認

以下のようなログが表示されることを確認：

```
🎙️ 声の登録を開始します...
📌 [デバッグ] Azure Speech Service のダイアライゼーション機能を使用します
✅ ConversationTranscriber を作成しました（ダイアライゼーション有効）
✅ 上司の声の録音を開始しました
📌 [ダイアライゼーション] Azure Speech Service が話者を自動識別します

🗣️ [音声認識中] { speakerId: "Guest-1", 認識テキスト: "こんにちは", ... }

✅ ========== 音声認識結果 ==========
📌 [結果 #1] {
    スピーカーID: "Guest-1",
    認識テキスト: "こんにちは、これはテストです。",
    発話時間: "2500ms",
    ...
}
📌 [ダイアライゼーション] Azure Speech Service が話者を識別しました
```

## 結論

### ✅ 確認結果

1. **Azure Speech Service のダイアライゼーション機能を使用している**
   - ConversationTranscriber を使用
   - 話者の自動識別が動作
   - スピーカーIDが取得できる

2. **ログ出力を追加した**
   - 音声認識結果を詳細に出力
   - スピーカーIDを表示
   - デバッグが容易になった

3. **実装の制限事項を明確化した**
   - 音声プロファイルとの照合は未実装
   - 簡易的な話者識別方式
   - より高度な識別には別のAPIが必要

### 📋 推奨される使用方法

現在の実装で正しく動作させるには：

1. **1on1開始時は上司から話し始める**
   - 最初に話した人が「上司」として識別される

2. **2人だけで会話する**
   - 3人以上になると識別が複雑になる

3. **静かな環境で使用する**
   - ノイズが少ないとダイアライゼーションの精度が上がる

4. **ブラウザのコンソールログを確認する**
   - 動作状況をリアルタイムで確認できる

---

**調査日:** 2025年10月29日  
**対象バージョン:** Azure Speech Service版 1.0  
**調査者:** GitHub Copilot Agent  
**Issue:** マイク不具合
