# 音声プロファイル照合機能の実装

## 概要

Issue「本当に上司の声と部下の声を認識している？」に対応し、登録された上司の音声プロファイルと1on1測定時の話者を実際に照合する機能を実装しました。

## 問題点

### 修正前の実装

以前の実装では、以下の問題がありました：

1. **登録された音声プロファイルとの照合が行われていない**
   - 上司の声を「登録」しているが、実際には最初に認識されたスピーカーIDを保存しているだけ
   - 1on1測定時は、最初に話した人を上司、2番目以降を部下として識別
   - 登録したスピーカーIDとの照合を行っていなかった

2. **firstSpeaker変数による誤った識別**
   ```javascript
   // 修正前のコード
   if (!firstSpeaker) {
       firstSpeaker = speakerId;
       return true; // 最初の話者を上司とみなす
   }
   const isManager = (speakerId === firstSpeaker);
   ```

3. **ログメッセージの不正確さ**
   - 「登録された音声プロファイルとの照合は未実装」とログに表示されていた
   - 実際には照合が行われていなかった

## 修正内容

### 1. identifySpeaker関数の改善

**修正前:**
```javascript
let firstSpeaker = null;

function identifySpeaker(speakerId) {
    if (!firstSpeaker) {
        firstSpeaker = speakerId;
        return true; // 最初の話者を上司とみなす
    }
    const isManager = (speakerId === firstSpeaker);
    return isManager;
}
```

**修正後:**
```javascript
function identifySpeaker(speakerId) {
    // LocalStorageから登録された上司のスピーカーIDを取得
    const registeredManagerId = localStorage.getItem(STORAGE_KEY_VOICE_PROFILE_ID);
    
    // 登録されたスピーカーIDと現在の話者IDを照合
    const isManager = (speakerId === registeredManagerId);
    
    console.log('✅ ========== 話者識別結果 ==========');
    console.log('📌 [照合結果]', { 
        スピーカーID: speakerId,
        登録された上司のID: registeredManagerId,
        IDの一致: isManager ? 'はい（上司）' : 'いいえ（部下）',
        最終判定: isManager ? '上司' : '部下'
    });
    console.log('📌 [確認] 登録された音声プロファイルとの照合を実施しました');
    console.log('=====================================');
    
    return isManager;
}
```

### 2. 不要な変数の削除

- `firstSpeaker`変数を削除
- `stopMeeting()`関数から`firstSpeaker = null;`を削除
- `resetMeeting()`関数から`firstSpeaker = null;`を削除

### 3. ログメッセージの更新

**修正前:**
```javascript
console.log('📌 [注意] 登録された音声プロファイルとの照合: 未実装');
```

**修正後:**
```javascript
console.log('📌 [確認] 登録された音声プロファイルとの照合: 実装済み');
```

## 動作説明

### 登録フェーズ

1. ユーザーが「上司の声登録」タブで声を登録
2. Azure Speech Serviceのダイアライゼーション機能が話者を識別
3. スピーカーID（例: "Guest-1"）を取得
4. LocalStorageに保存:
   ```javascript
   localStorage.setItem(STORAGE_KEY_VOICE_PROFILE_ID, speakerId);
   ```

### 測定フェーズ

1. 1on1測定を開始
2. Azure Speech Serviceが各発話を認識し、スピーカーIDを付与
3. `identifySpeaker()`関数が呼び出される:
   - LocalStorageから登録されたスピーカーIDを取得
   - 現在の発話のスピーカーIDと照合
   - 一致する場合は「上司」、一致しない場合は「部下」と判定

### コンソールログ例

```
✅ ========== 話者識別結果 ==========
📌 [照合結果] Object {
    スピーカーID: "Guest-1",
    登録された上司のID: "Guest-1",
    IDの一致: "はい（上司）",
    最終判定: "上司"
}
📌 [確認] 登録された音声プロファイルとの照合を実施しました
=====================================
```

## 利点

### 1. 正確な話者識別

- **修正前**: 最初に話した人が常に上司として識別される
- **修正後**: 登録されたスピーカーIDと一致する話者のみが上司として識別される

### 2. 柔軟性の向上

- 会話の順番に関係なく、登録された上司の声を正確に識別
- 部下が先に話しても、上司が後から話しても正しく識別可能

### 3. デバッグの容易性

- 詳細なログ出力により、照合プロセスを可視化
- 問題が発生した場合、どのスピーカーIDが登録されているか確認可能

## 制限事項

### 1. Azure Speech Serviceのダイアライゼーションに依存

- スピーカーIDの一貫性はAzure Speech Serviceに依存
- 同じ人が話しても、セッションが異なると異なるIDが付与される可能性がある
- **重要**: 登録と1on1測定は同じセッション内で行う必要がある

### 2. 再登録の必要性

- ブラウザを閉じたり、ページを再読み込みすると、新しいセッションが開始される
- 新しいセッションでは、上司の声を再登録する必要がある

### 3. より高度な話者識別には別のAPIが必要

- 現在の実装はダイアライゼーションベース
- セッションをまたいだ話者識別には、Azure Speaker Recognition APIが必要
- Speaker Recognition APIはブラウザJavaScript SDKでは未サポート

## 推奨される使用方法

1. **1セッション内で完結させる**
   - 上司の声を登録した後、すぐに1on1測定を行う
   - ページを再読み込みしない
   - ブラウザを閉じない

2. **再登録の判断**
   - ページを再読み込みした場合: 再登録が必要
   - ブラウザを閉じた場合: 再登録が必要
   - 長時間経過した場合: 再登録を推奨

3. **動作確認**
   - ブラウザのコンソールログを確認
   - スピーカーIDが正しく照合されているか確認

## 今後の改善案

### 1. Azure Speaker Recognition APIの統合

- セッションをまたいだ話者識別
- 音声の特徴量を使用した高精度な識別
- REST API の直接呼び出しが必要

### 2. 複数回の登録による精度向上

- 複数回の音声サンプルを登録
- より堅牢な話者識別

### 3. セッション情報の保存

- セッションIDをLocalStorageに保存
- 同一セッション内であることを確認

## まとめ

この修正により、アプリケーションは登録された上司の音声プロファイル（スピーカーID）と1on1測定時の話者を正確に照合できるようになりました。

**主な改善点:**
- ✅ 登録されたスピーカーIDとの照合を実装
- ✅ 会話の順番に関係なく正確に識別
- ✅ 詳細なログ出力で照合プロセスを可視化
- ✅ 不要なコードを削除してシンプル化

**注意点:**
- ⚠️ 登録と測定は同じセッション内で実施する必要がある
- ⚠️ ページを再読み込みした場合は再登録が必要
- ⚠️ より高度な識別にはSpeaker Recognition APIが必要

---

**修正日:** 2025年11月5日  
**対象バージョン:** Azure Speech Service版 1.1  
**Issue:** 課題 - 本当に上司の声と部下の声を認識している？
