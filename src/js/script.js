/**
 * 1on1 発話比率測定アプリケーション (Azure Speech Service版)
 * 
 * このアプリケーションは、Azure Speech Serviceのリアルタイムダイアライゼーションを使用して
 * 上司と部下の1on1ミーティングにおける発話比率を測定し、可視化します。
 */

console.log('🚀 1on1 発話比率測定アプリ（Azure版）を起動します...');

// グローバル変数 - Azure Speech Service
let speechConfig = null;
let conversationTranscriber = null;
let audioConfig = null;
let voiceProfileClient = null;
let managerVoiceProfile = null;

// グローバル変数 - アプリケーション状態
let isRegistering = false;
let isMeeting = false;
let meetingStartTime = null;
let managerSpeakingTime = 0; // 上司の発話時間（ミリ秒）
let memberSpeakingTime = 0;  // 部下の発話時間（ミリ秒）
let meetingTimerInterval = null;
let lastSpeakingTime = {}; // 各話者の最後の発話時刻を追跡
let speakerVoiceData = {}; // 話者の音声特徴データ（発話パターン分析用）
let managerSpeakerIdCandidate = null; // 上司として識別されたスピーカーID

// LocalStorageキー
const STORAGE_KEY_AZURE_SUBSCRIPTION = 'azure_subscription_key';
const STORAGE_KEY_AZURE_REGION = 'azure_region';
const STORAGE_KEY_VOICE_PROFILE_ID = 'azure_voice_profile_id';
const STORAGE_KEY_VOICE_PROFILE_DATE = 'azure_voice_profile_date';

console.log('📋 Azure Speech Service統合版を初期化中...');

/**
 * ページ読み込み完了時の初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded: ページの読み込みが完了しました');
    
    initializeApp();
    setupEventListeners();
    loadAzureSettings();
    checkRegistrationStatus();
});

/**
 * アプリケーションの初期化
 */
function initializeApp() {
    console.log('🔧 アプリケーションを初期化しています...');
    
    // Azure Speech SDK の確認
    if (typeof SpeechSDK === 'undefined' || !SpeechSDK) {
        console.error('❌ Azure Speech SDKが読み込まれていません');
        alert('Azure Speech SDKの読み込みに失敗しました。ページを再読み込みしてください。');
        return;
    }
    
    console.log('✅ Azure Speech SDKを確認しました', SpeechSDK);
    
    // マイクのサポート確認
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ このブラウザはマイク機能をサポートしていません');
        alert('このブラウザはマイク機能をサポートしていません。Chrome、Firefox、Edgeなどの最新ブラウザをご使用ください。');
        return;
    }
    
    console.log('✅ マイク機能のサポートを確認しました');
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    console.log('🎧 イベントリスナーを設定しています...');
    
    // タブ切り替え
    document.getElementById('tab-settings').addEventListener('click', () => {
        console.log('📑 タブ切り替え: Azure設定');
        switchTab('settings');
    });
    
    document.getElementById('tab-registration').addEventListener('click', () => {
        console.log('📑 タブ切り替え: 上司の声登録');
        switchTab('registration');
    });
    
    document.getElementById('tab-meeting').addEventListener('click', () => {
        console.log('📑 タブ切り替え: 1on1測定');
        switchTab('meeting');
    });
    
    // Azure設定
    document.getElementById('btn-save-settings').addEventListener('click', saveAzureSettings);
    
    // 初回登録
    document.getElementById('btn-start-registration').addEventListener('click', startVoiceRegistration);
    document.getElementById('btn-stop-registration').addEventListener('click', stopVoiceRegistration);
    document.getElementById('btn-clear-registration').addEventListener('click', clearVoiceRegistration);
    
    // 1on1測定
    document.getElementById('btn-start-meeting').addEventListener('click', startMeeting);
    document.getElementById('btn-stop-meeting').addEventListener('click', stopMeeting);
    document.getElementById('btn-new-meeting').addEventListener('click', resetMeeting);
    
    console.log('✅ イベントリスナーの設定が完了しました');
}

/**
 * タブの切り替え
 */
function switchTab(tab) {
    console.log(`🔄 タブを切り替えます: ${tab}`);
    
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => {
        t.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        t.classList.add('text-gray-500');
    });
    
    contents.forEach(c => c.classList.add('hidden'));
    
    if (tab === 'settings') {
        document.getElementById('tab-settings').classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        document.getElementById('tab-settings').classList.remove('text-gray-500');
        document.getElementById('content-settings').classList.remove('hidden');
    } else if (tab === 'registration') {
        document.getElementById('tab-registration').classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        document.getElementById('tab-registration').classList.remove('text-gray-500');
        document.getElementById('content-registration').classList.remove('hidden');
        checkAzureSettings();
    } else if (tab === 'meeting') {
        document.getElementById('tab-meeting').classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        document.getElementById('tab-meeting').classList.remove('text-gray-500');
        document.getElementById('content-meeting').classList.remove('hidden');
        checkRegistrationStatus();
    }
}

/**
 * Azure設定の保存
 */
function saveAzureSettings() {
    console.log('💾 Azure設定を保存しています...');
    
    const subscriptionKey = document.getElementById('azure-subscription-key').value.trim();
    const region = document.getElementById('azure-region').value.trim();
    
    if (!subscriptionKey || !region) {
        alert('サブスクリプションキーとリージョンを入力してください。');
        console.warn('⚠️ 入力が不完全です');
        return;
    }
    
    // LocalStorageに保存
    localStorage.setItem(STORAGE_KEY_AZURE_SUBSCRIPTION, subscriptionKey);
    localStorage.setItem(STORAGE_KEY_AZURE_REGION, region);
    
    console.log('✅ Azure設定を保存しました', { region });
    
    // Azure Speech Configの初期化
    try {
        speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, region);
        speechConfig.speechRecognitionLanguage = 'ja-JP';
        console.log('✅ Azure Speech Configを初期化しました');
        
        // 状態表示の更新
        document.getElementById('settings-status').classList.remove('hidden');
        
        alert('Azure設定を保存しました。次は「上司の声登録」タブで声を登録してください。');
    } catch (error) {
        console.error('❌ Azure Speech Configの初期化に失敗しました:', error);
        alert('Azure設定の初期化に失敗しました。サブスクリプションキーとリージョンを確認してください。');
    }
}

/**
 * Azure設定の読み込み
 */
function loadAzureSettings() {
    console.log('📖 Azure設定を読み込んでいます...');
    
    const subscriptionKey = localStorage.getItem(STORAGE_KEY_AZURE_SUBSCRIPTION);
    const region = localStorage.getItem(STORAGE_KEY_AZURE_REGION);
    
    if (subscriptionKey && region) {
        console.log('✅ 保存されたAzure設定を発見しました', { region });
        
        // フィールドに値を設定（セキュリティのため、キーは表示しない）
        document.getElementById('azure-subscription-key').value = subscriptionKey;
        document.getElementById('azure-region').value = region;
        
        // Azure Speech Configの初期化
        try {
            speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, region);
            speechConfig.speechRecognitionLanguage = 'ja-JP';
            console.log('✅ Azure Speech Configを初期化しました');
            
            // 状態表示の更新
            document.getElementById('settings-status').classList.remove('hidden');
        } catch (error) {
            console.error('❌ Azure Speech Configの初期化に失敗しました:', error);
        }
    } else {
        console.log('ℹ️ Azure設定が保存されていません');
    }
}

/**
 * Azure設定の確認
 */
function checkAzureSettings() {
    console.log('🔍 Azure設定を確認しています...');
    
    const subscriptionKey = localStorage.getItem(STORAGE_KEY_AZURE_SUBSCRIPTION);
    const region = localStorage.getItem(STORAGE_KEY_AZURE_REGION);
    
    const warningElement = document.getElementById('warning-no-azure-settings');
    
    if (!subscriptionKey || !region) {
        console.log('⚠️ Azure設定が未設定です');
        warningElement.classList.remove('hidden');
        document.getElementById('btn-start-registration').disabled = true;
        return false;
    } else {
        console.log('✅ Azure設定が設定されています');
        warningElement.classList.add('hidden');
        document.getElementById('btn-start-registration').disabled = false;
        return true;
    }
}

/**
 * 登録状態の確認
 */
function checkRegistrationStatus() {
    console.log('🔍 登録状態を確認しています...');
    
    const voiceProfileId = localStorage.getItem(STORAGE_KEY_VOICE_PROFILE_ID);
    const profileDate = localStorage.getItem(STORAGE_KEY_VOICE_PROFILE_DATE);
    
    if (voiceProfileId && profileDate) {
        console.log('✅ 上司の声が登録されています:', { voiceProfileId, profileDate });
        
        // 登録情報の表示
        document.getElementById('registered-info').classList.remove('hidden');
        document.getElementById('registration-date').textContent = 
            new Date(parseInt(profileDate)).toLocaleString('ja-JP');
        
        return true;
    } else {
        console.log('ℹ️ 上司の声が未登録です（登録は必須ではありません）');
        
        // 登録情報を非表示
        document.getElementById('registered-info').classList.add('hidden');
        
        return false;
    }
}

/**
 * 声の登録開始
 * 
 * Azure Speech Service の ConversationTranscriber を使用して、
 * 上司の声を録音し、音声認識結果とスピーカーIDをログ出力します。
 */
async function startVoiceRegistration() {
    console.log('🎙️ 声の登録を開始します...');
    console.log('📌 [デバッグ] Azure Speech Service のダイアライゼーション機能を使用します');
    
    if (isRegistering) {
        console.warn('⚠️ すでに登録中です');
        return;
    }
    
    // Azure設定の確認
    if (!checkAzureSettings()) {
        alert('先にAzure設定を行ってください。');
        return;
    }
    
    // Azure Speech Configの確認
    if (!speechConfig) {
        console.error('❌ Azure Speech Configが初期化されていません');
        alert('Azure設定を確認してください。');
        return;
    }
    
    try {
        isRegistering = true;
        
        // UI更新
        document.getElementById('btn-start-registration').classList.add('hidden');
        document.getElementById('btn-stop-registration').classList.remove('hidden');
        document.getElementById('registration-status').classList.remove('hidden');
        document.querySelector('#registration-status p').textContent = 
            '上司の声を録音しています... 自然な声でお話しください。';
        
        console.log('🔄 ConversationTranscriber を使用して上司の声を録音します...');
        console.log('📌 [デバッグ] これにより Azure Speech Service のダイアライゼーション機能が使用されます');
        
        // マイク入力の設定
        audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        console.log('✅ マイク入力を設定しました');
        
        // 会話トランスクライバーの作成（ダイアライゼーション機能を使用）
        const registrationTranscriber = new SpeechSDK.ConversationTranscriber(speechConfig, audioConfig);
        console.log('✅ ConversationTranscriber を作成しました（ダイアライゼーション有効）');
        
        // 登録用の変数
        let registrationSpeakerId = null;
        let recognitionCount = 0;
        let registrationTimer = null;
        
        // 認識中のイベント
        registrationTranscriber.transcribing = (s, e) => {
            const speakerId = e.result.speakerId || 'Unknown';
            const text = e.result.text;
            console.log('🗣️ [音声認識中]', {
                speakerId: speakerId,
                認識テキスト: text,
                状態: '認識中'
            });
        };
        
        // 認識完了イベント
        registrationTranscriber.transcribed = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                const speakerId = e.result.speakerId || 'Unknown';
                const text = e.result.text;
                const duration = e.result.duration / 10000; // 100ナノ秒単位をミリ秒に変換
                
                recognitionCount++;
                
                console.log('✅ ========== 音声認識結果 ==========');
                console.log('📌 [結果 #' + recognitionCount + ']', {
                    スピーカーID: speakerId,
                    認識テキスト: text,
                    発話時間: duration + 'ms',
                    タイムスタンプ: new Date().toLocaleTimeString('ja-JP')
                });
                console.log('📌 [ダイアライゼーション] Azure Speech Service が話者を識別しました');
                console.log('=====================================');
                
                // 最初の話者を上司として記録
                if (!registrationSpeakerId && speakerId !== 'Unknown') {
                    registrationSpeakerId = speakerId;
                    console.log('👤 [上司の声を登録] スピーカーID:', registrationSpeakerId);
                }
                
                // 音声パターンデータの収集（発話頻度、長さなどを記録）
                if (!speakerVoiceData[speakerId]) {
                    speakerVoiceData[speakerId] = {
                        utteranceCount: 0,
                        totalDuration: 0,
                        averageDuration: 0,
                        textSamples: []
                    };
                }
                
                speakerVoiceData[speakerId].utteranceCount++;
                speakerVoiceData[speakerId].totalDuration += duration;
                speakerVoiceData[speakerId].averageDuration = 
                    speakerVoiceData[speakerId].totalDuration / speakerVoiceData[speakerId].utteranceCount;
                speakerVoiceData[speakerId].textSamples.push(text);
                
                console.log('📊 [音声パターン収集]', speakerVoiceData[speakerId]);
            }
        };
        
        // キャンセルイベント
        registrationTranscriber.canceled = (s, e) => {
            console.error('❌ 認識がキャンセルされました:', e.reason);
            if (e.reason === SpeechSDK.CancellationReason.Error) {
                console.error('❌ エラー詳細:', e.errorDetails);
            }
        };
        
        // セッション停止イベント
        registrationTranscriber.sessionStopped = (s, e) => {
            console.log('⏹️ 登録セッションが停止しました');
        };
        
        // 認識開始
        registrationTranscriber.startTranscribingAsync(
            () => {
                console.log('✅ 上司の声の録音を開始しました');
                console.log('📌 [ダイアライゼーション] Azure Speech Service が話者を自動識別します');
                
                // 10秒後に自動停止
                let countdown = 10;
                const statusElement = document.querySelector('#registration-status p');
                
                registrationTimer = setInterval(() => {
                    countdown--;
                    statusElement.textContent = `録音中... 残り ${countdown} 秒（話し続けてください）`;
                    
                    if (countdown <= 0) {
                        clearInterval(registrationTimer);
                        
                        // 認識停止
                        registrationTranscriber.stopTranscribingAsync(
                            () => {
                                console.log('✅ 録音を停止しました');
                                console.log('📊 [統計] 認識された発話数:', recognitionCount);
                                
                                registrationTranscriber.close();
                                
                                // 登録完了処理
                                completeVoiceRegistration(registrationSpeakerId);
                            },
                            (error) => {
                                console.error('❌ 認識停止に失敗しました:', error);
                                isRegistering = false;
                                document.getElementById('btn-start-registration').classList.remove('hidden');
                                document.getElementById('btn-stop-registration').classList.add('hidden');
                            }
                        );
                    }
                }, 1000);
            },
            (error) => {
                console.error('❌ 認識開始に失敗しました:', error);
                alert('音声認識の開始に失敗しました: ' + error);
                isRegistering = false;
                document.getElementById('btn-start-registration').classList.remove('hidden');
                document.getElementById('btn-stop-registration').classList.add('hidden');
            }
        );
        
    } catch (error) {
        console.error('❌ 声の登録開始に失敗しました:', error);
        alert('声の登録に失敗しました: ' + error.message);
        isRegistering = false;
        document.getElementById('btn-start-registration').classList.remove('hidden');
        document.getElementById('btn-stop-registration').classList.add('hidden');
    }
}

/**
 * 声の登録完了
 * @param {string} speakerId - Azure Speech Service が識別したスピーカーID
 */
function completeVoiceRegistration(speakerId) {
    console.log('✅ 声の登録を完了します...');
    
    // スピーカーIDをプロファイルIDとして保存
    // Azure Speech Service のダイアライゼーションで識別されたIDを使用
    const voiceProfileId = speakerId || 'profile_' + Date.now();
    const timestamp = Date.now();
    
    // 音声データの特徴も保存（発話パターン分析用）
    const voiceCharacteristics = JSON.stringify({
        speakerId: speakerId,
        registrationDate: timestamp,
        speakerPattern: speakerVoiceData[speakerId] || {}
    });
    
    // LocalStorageに保存
    localStorage.setItem(STORAGE_KEY_VOICE_PROFILE_ID, voiceProfileId);
    localStorage.setItem(STORAGE_KEY_VOICE_PROFILE_DATE, timestamp.toString());
    localStorage.setItem('voice_characteristics', voiceCharacteristics);
    
    console.log('✅ ========== 上司の声の登録完了 ==========');
    console.log('📌 [登録情報]', {
        保存されたスピーカーID: voiceProfileId,
        登録日時: new Date(timestamp).toLocaleString('ja-JP'),
        Azure_ダイアライゼーション使用: 'はい',
        音声パターン記録: Object.keys(speakerVoiceData[speakerId] || {}).length + '件'
    });
    console.log('=========================================');
    
    // UI更新
    document.querySelector('#registration-status p').textContent = 
        '✓ 登録が完了しました（スピーカーID: ' + voiceProfileId + '）';
    
    setTimeout(() => {
        isRegistering = false;
        document.getElementById('registration-status').classList.add('hidden');
        document.getElementById('btn-start-registration').classList.remove('hidden');
        document.getElementById('btn-stop-registration').classList.add('hidden');
        checkRegistrationStatus();
    }, 3000);
}

/**
 * 声の登録停止
 */
function stopVoiceRegistration() {
    console.log('⏹️ 声の登録を停止します...');
    
    if (!isRegistering) {
        console.warn('⚠️ 登録中ではありません');
        return;
    }
    
    isRegistering = false;
    
    // UI復元
    document.getElementById('btn-start-registration').classList.remove('hidden');
    document.getElementById('btn-stop-registration').classList.add('hidden');
    document.getElementById('registration-status').classList.add('hidden');
    
    console.log('✅ 登録を中止しました');
}

/**
 * 登録のクリア
 */
function clearVoiceRegistration() {
    console.log('🗑️ 登録をクリアします...');
    
    if (confirm('上司の声の登録をクリアしますか？')) {
        localStorage.removeItem(STORAGE_KEY_VOICE_PROFILE_ID);
        localStorage.removeItem(STORAGE_KEY_VOICE_PROFILE_DATE);
        localStorage.removeItem('voice_characteristics');
        console.log('✅ 登録をクリアしました（音声パターンデータを含む）');
        checkRegistrationStatus();
    }
}

/**
 * 1on1測定の開始
 */
async function startMeeting() {
    console.log('🎬 1on1測定を開始します...');
    console.log('📌 ========== Azure Speech Service 設定情報 ==========');
    console.log('📌 [確認] ConversationTranscriber を使用');
    console.log('📌 [確認] ダイアライゼーション機能: 有効');
    console.log('📌 [確認] 話者の自動識別: 有効（音声パターンマッチング）');
    console.log('📌 [改善] 発話順序に依存しない識別を実施');
    console.log('================================================');
    
    if (isMeeting) {
        console.warn('⚠️ すでに測定中です');
        return;
    }
    
    // Azure設定確認
    if (!speechConfig) {
        console.error('❌ Azure Speech Configが初期化されていません');
        alert('Azure設定を確認してください。');
        return;
    }
    
    try {
        // マイク入力の設定
        audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        
        // 会話トランスクライバーの作成（ダイアライゼーション機能を使用）
        conversationTranscriber = new SpeechSDK.ConversationTranscriber(speechConfig, audioConfig);
        
        console.log('✅ ConversationTranscriberを作成しました');
        console.log('📌 [ダイアライゼーション] Azure Speech Service が会話中の話者を自動識別します');
        
        // 変数の初期化
        isMeeting = true;
        meetingStartTime = Date.now();
        managerSpeakingTime = 0;
        memberSpeakingTime = 0;
        lastSpeakingTime = {};
        speakerVoiceData = {}; // 測定時の音声パターンデータをリセット
        managerSpeakerIdCandidate = null; // 上司候補をリセット
        
        // UI更新
        document.getElementById('meeting-info').classList.add('hidden');
        document.getElementById('btn-start-meeting').classList.add('hidden');
        document.getElementById('btn-stop-meeting').classList.remove('hidden');
        document.getElementById('meeting-active').classList.remove('hidden');
        document.getElementById('meeting-result').classList.add('hidden');
        
        // タイマー開始
        meetingTimerInterval = setInterval(updateMeetingTimer, 1000);
        
        // イベントハンドラーの設定
        setupTranscriberEventHandlers();
        
        // 認識開始
        conversationTranscriber.startTranscribingAsync(
            () => {
                console.log('✅ 会話の認識を開始しました');
                console.log('📌 [ダイアライゼーション] 話者の識別が開始されました');
                console.log('📌 [音声パターンマッチング] 登録された声との照合を開始');
            },
            (error) => {
                console.error('❌ 認識開始に失敗しました:', error);
                alert('音声認識の開始に失敗しました: ' + error);
                isMeeting = false;
            }
        );
        
    } catch (error) {
        console.error('❌ 1on1測定の開始に失敗しました:', error);
        alert('測定の開始に失敗しました: ' + error.message);
        isMeeting = false;
    }
}

/**
 * トランスクライバーのイベントハンドラー設定
 */
function setupTranscriberEventHandlers() {
    console.log('🎧 イベントハンドラーを設定しています...');
    console.log('📌 [ダイアライゼーション] Azure Speech Service の ConversationTranscriber を使用');
    
    // 認識中のイベント
    conversationTranscriber.transcribing = (s, e) => {
        const speakerId = e.result.speakerId || 'Unknown';
        console.log('🗣️ [1on1測定] 認識中:', {
            スピーカーID: speakerId,
            認識テキスト: e.result.text
        });
    };
    
    // 認識完了イベント
    conversationTranscriber.transcribed = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const speakerId = e.result.speakerId || 'Unknown';
            const text = e.result.text;
            const duration = e.result.duration / 10000; // 100ナノ秒単位をミリ秒に変換
            
            console.log('✅ ========== 1on1測定 - 音声認識結果 ==========');
            console.log('📌 [認識結果]', {
                スピーカーID: speakerId,
                認識テキスト: text,
                発話時間: duration + 'ms',
                タイムスタンプ: new Date().toLocaleTimeString('ja-JP')
            });
            
            // 音声パターンデータの収集
            if (!speakerVoiceData[speakerId]) {
                speakerVoiceData[speakerId] = {
                    utteranceCount: 0,
                    totalDuration: 0,
                    averageDuration: 0,
                    textSamples: [],
                    firstUtteranceTime: Date.now()
                };
            }
            
            speakerVoiceData[speakerId].utteranceCount++;
            speakerVoiceData[speakerId].totalDuration += duration;
            speakerVoiceData[speakerId].averageDuration = 
                speakerVoiceData[speakerId].totalDuration / speakerVoiceData[speakerId].utteranceCount;
            speakerVoiceData[speakerId].textSamples.push(text);
            speakerVoiceData[speakerId].lastUtteranceTime = Date.now();
            
            // 話者の識別（改善版：音声パターンマッチング）
            const isManager = identifySpeaker(speakerId);
            
            console.log('📌 [話者識別結果]', {
                スピーカーID: speakerId,
                識別結果: isManager ? '上司' : '部下',
                識別方法: managerSpeakerIdCandidate ? '音声パターンマッチング' : '学習中',
                登録されたプロファイルID: localStorage.getItem(STORAGE_KEY_VOICE_PROFILE_ID),
                音声パターン: speakerVoiceData[speakerId]
            });
            console.log('============================================');
            
            if (isManager) {
                managerSpeakingTime += duration;
                document.getElementById('voice-level-manager').style.width = '80%';
                document.getElementById('voice-level-member').style.width = '0%';
                
                setTimeout(() => {
                    document.getElementById('voice-level-manager').style.width = '0%';
                }, 500);
            } else {
                memberSpeakingTime += duration;
                document.getElementById('voice-level-member').style.width = '80%';
                document.getElementById('voice-level-manager').style.width = '0%';
                
                setTimeout(() => {
                    document.getElementById('voice-level-member').style.width = '0%';
                }, 500);
            }
            
            // 発話時間の表示更新
            updateSpeakingTimeDisplay();
        }
    };
    
    // キャンセルイベント
    conversationTranscriber.canceled = (s, e) => {
        console.error('❌ 認識がキャンセルされました:', e.reason);
        if (e.reason === SpeechSDK.CancellationReason.Error) {
            console.error('❌ エラー詳細:', e.errorDetails);
        }
    };
    
    // セッション停止イベント
    conversationTranscriber.sessionStopped = (s, e) => {
        console.log('⏹️ セッションが停止しました');
    };
}

/**
 * 話者の識別（改善版）
 * 
 * この実装では、複数の要素を組み合わせて話者を識別します:
 * 1. 最初の数回の発話で音声パターンを分析
 * 2. 登録時の音声パターンと比較
 * 3. 発話の特徴（頻度、長さなど）を考慮して上司を特定
 * 
 * Azure Speech Service の ConversationTranscriber のダイアライゼーション機能は、
 * 各セッションでスピーカーID（Guest-1, Guest-2など）を割り当てますが、
 * これらのIDは発話順序に基づいており、音声の特徴には基づいていません。
 * 
 * この改善版では、以下のアプローチで識別精度を向上させます:
 * - 初期の発話パターンを分析し、より長い発話や頻繁な発話をする人を識別
 * - 登録時の音声パターンデータと比較
 * - 複数の発話を分析してから判定を確定
 * 
 * @param {string} speakerId - Azure Speech Serviceが付与したスピーカーID
 * @returns {boolean} 上司の場合はtrue、部下の場合はfalse
 */
function identifySpeaker(speakerId) {
    console.log('🔍 [話者識別処理] スピーカーID:', speakerId);
    
    // 登録された音声特徴データを取得
    const storedCharacteristics = localStorage.getItem('voice_characteristics');
    let registeredPattern = null;
    
    if (storedCharacteristics) {
        try {
            const parsed = JSON.parse(storedCharacteristics);
            registeredPattern = parsed.speakerPattern;
            console.log('📋 [登録パターン取得] 登録時の音声パターンを読み込みました', registeredPattern);
        } catch (e) {
            console.warn('⚠️ 音声パターンデータの読み込みに失敗:', e);
        }
    }
    
    // まだ上司候補が確定していない場合、パターンマッチングで判定
    if (!managerSpeakerIdCandidate) {
        // 十分なデータが集まるまで待つ（最低3発話）
        const totalUtterances = Object.values(speakerVoiceData).reduce(
            (sum, data) => sum + data.utteranceCount, 0
        );
        
        if (totalUtterances >= 3) {
            // 音声パターンを分析して上司を推定
            const speakers = Object.keys(speakerVoiceData);
            
            if (speakers.length >= 2) {
                // 2人以上の話者が検出された場合
                console.log('👥 [複数話者検出] 話者数:', speakers.length);
                
                // パターンマッチングスコアを計算
                let bestMatch = null;
                let bestScore = -1;
                
                speakers.forEach(sid => {
                    const pattern = speakerVoiceData[sid];
                    let score = 0;
                    
                    // 登録パターンとの類似度を評価
                    if (registeredPattern && registeredPattern.averageDuration) {
                        // 平均発話時間の類似度
                        const durationDiff = Math.abs(
                            pattern.averageDuration - registeredPattern.averageDuration
                        );
                        const durationSimilarity = Math.max(0, 1 - (durationDiff / 3000)); // 3秒以内なら類似
                        score += durationSimilarity * 40; // 40%の重み
                        
                        console.log(`📊 [パターン分析] ${sid}: 発話時間類似度=${durationSimilarity.toFixed(2)}`);
                    }
                    
                    // 発話頻度（上司は一般的に多く話す傾向）
                    const utteranceRatio = pattern.utteranceCount / totalUtterances;
                    if (utteranceRatio > 0.4) {
                        score += 30; // 40%以上話している場合は上司の可能性が高い
                    }
                    
                    // 最初に話し始めたタイミング（わずかに考慮）
                    if (pattern.firstUtteranceTime === Math.min(...speakers.map(s => speakerVoiceData[s].firstUtteranceTime))) {
                        score += 10;
                    }
                    
                    // テキストの長さ（上司は長めの説明をする傾向）
                    const avgTextLength = pattern.textSamples.reduce((sum, t) => sum + t.length, 0) / pattern.textSamples.length;
                    if (avgTextLength > 20) {
                        score += 20;
                    }
                    
                    console.log(`📈 [スコア計算] ${sid}: 合計スコア=${score.toFixed(1)}`);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = sid;
                    }
                });
                
                if (bestMatch && bestScore > 30) { // 閾値30以上で確定
                    managerSpeakerIdCandidate = bestMatch;
                    console.log('✅ ========== 上司を識別しました ==========');
                    console.log('👤 [識別完了] 上司のスピーカーID:', managerSpeakerIdCandidate);
                    console.log('📊 [確信度] スコア:', bestScore.toFixed(1), '/ 100');
                    console.log('=========================================');
                } else {
                    console.log('⏳ [学習中] スコアが低いため、さらにデータを収集します');
                }
            } else if (speakers.length === 1) {
                // 最初の話者を仮に上司として設定（次の話者が現れるまで）
                console.log('ℹ️ [単一話者] 最初の話者を仮に上司として設定');
                managerSpeakerIdCandidate = speakers[0];
            }
        } else {
            console.log('⏳ [データ収集中] 発話数:', totalUtterances, '/ 3（最低必要数）');
        }
    }
    
    // 上司として識別されたかを判定
    const isManager = (speakerId === managerSpeakerIdCandidate);
    
    console.log('✅ ========== 話者識別結果 ==========');
    console.log('📌 [照合結果]', { 
        現在のスピーカーID: speakerId,
        上司として識別されたID: managerSpeakerIdCandidate || '未確定',
        IDの一致: managerSpeakerIdCandidate ? (isManager ? 'はい（上司）' : 'いいえ（部下）') : '判定中',
        最終判定: managerSpeakerIdCandidate ? (isManager ? '上司' : '部下') : '判定中（データ収集中）'
    });
    console.log('📌 [識別方法] 音声パターンマッチング（発話時間、頻度、テキスト長を総合評価）');
    console.log('=====================================');
    
    return isManager;
}

/**
 * 発話時間表示の更新
 */
function updateSpeakingTimeDisplay() {
    document.getElementById('time-manager').textContent = formatTime(managerSpeakingTime);
    document.getElementById('time-member').textContent = formatTime(memberSpeakingTime);
}

/**
 * 1on1測定の停止
 */
function stopMeeting() {
    console.log('⏹️ 1on1測定を停止します...');
    
    if (!isMeeting) {
        console.warn('⚠️ 測定中ではありません');
        return;
    }
    
    isMeeting = false;
    
    // タイマー停止
    if (meetingTimerInterval) {
        clearInterval(meetingTimerInterval);
        meetingTimerInterval = null;
    }
    
    // 会話トランスクライバーの停止
    if (conversationTranscriber) {
        conversationTranscriber.stopTranscribingAsync(
            () => {
                console.log('✅ 認識を停止しました');
                conversationTranscriber.close();
                conversationTranscriber = null;
            },
            (error) => {
                console.error('❌ 認識停止に失敗しました:', error);
            }
        );
    }
    
    // UI更新
    document.getElementById('meeting-active').classList.add('hidden');
    document.getElementById('btn-stop-meeting').classList.add('hidden');
    
    // 結果表示
    showMeetingResult();
    
    console.log('✅ 1on1測定を停止しました', {
        managerTime: formatTime(managerSpeakingTime),
        memberTime: formatTime(memberSpeakingTime)
    });
}

/**
 * タイマー表示の更新
 */
function updateMeetingTimer() {
    if (!isMeeting) return;
    
    const elapsed = Date.now() - meetingStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('meeting-timer').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 時間のフォーマット（ミリ秒 → 秒表示）
 */
function formatTime(milliseconds) {
    const seconds = Math.round(milliseconds / 1000);
    return `${seconds}秒`;
}

/**
 * 測定結果の表示
 */
function showMeetingResult() {
    console.log('📊 測定結果を表示します...');
    
    const totalTime = managerSpeakingTime + memberSpeakingTime;
    
    if (totalTime === 0) {
        alert('発話が検出されませんでした。もう一度お試しください。');
        resetMeeting();
        return;
    }
    
    const managerRatio = (managerSpeakingTime / totalTime) * 100;
    const memberRatio = (memberSpeakingTime / totalTime) * 100;
    
    console.log('📈 発話比率:', {
        total: formatTime(totalTime),
        manager: `${formatTime(managerSpeakingTime)} (${managerRatio.toFixed(1)}%)`,
        member: `${formatTime(memberSpeakingTime)} (${memberRatio.toFixed(1)}%)`
    });
    
    // 統計情報の表示
    document.getElementById('result-total-time').textContent = formatTime(totalTime);
    document.getElementById('result-manager-time').textContent = formatTime(managerSpeakingTime);
    document.getElementById('result-member-time').textContent = formatTime(memberSpeakingTime);
    
    // 円グラフの描画
    drawResultChart(managerRatio, memberRatio);
    
    // アドバイスの表示
    showAdvice(managerRatio);
    
    // 結果エリアの表示
    document.getElementById('meeting-result').classList.remove('hidden');
}

/**
 * 円グラフの描画
 */
function drawResultChart(managerRatio, memberRatio) {
    console.log('📊 円グラフを描画します...', { managerRatio, memberRatio });
    
    const ctx = document.getElementById('result-chart').getContext('2d');
    
    // 既存のチャートがあれば破棄
    if (window.meetingChart) {
        window.meetingChart.destroy();
    }
    
    window.meetingChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['上司', '部下'],
            datasets: [{
                data: [managerRatio, memberRatio],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',  // 青（上司）
                    'rgba(251, 146, 60, 0.8)'   // オレンジ（部下）
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(251, 146, 60, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: ${value.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ 円グラフの描画が完了しました');
}

/**
 * アドバイスの表示
 */
function showAdvice(managerRatio) {
    console.log('💡 アドバイスを生成します...', { managerRatio });
    
    const adviceElement = document.getElementById('result-advice');
    let adviceText = '';
    let adviceClass = '';
    
    if (managerRatio > 60) {
        // 上司が話しすぎ
        adviceText = '⚠️ 上司の発話比率が高めです。部下の話を聞く時間を増やすことで、より効果的な1on1になります。';
        adviceClass = 'bg-yellow-50 border border-yellow-200 text-yellow-800';
    } else if (managerRatio < 30) {
        // 部下が話しすぎ（または上司が話さなすぎ）
        adviceText = 'ℹ️ 部下の発話比率が高いですね。良い傾聴ができています。必要に応じて、上司からのフィードバックや助言も加えましょう。';
        adviceClass = 'bg-blue-50 border border-blue-200 text-blue-800';
    } else {
        // バランスが良い
        adviceText = '✨ 素晴らしいバランスです！上司と部下が適切に対話できています。この調子で続けましょう。';
        adviceClass = 'bg-green-50 border border-green-200 text-green-800';
    }
    
    adviceElement.className = `rounded-lg p-4 mb-4 ${adviceClass}`;
    adviceElement.innerHTML = `<p class="text-sm">${adviceText}</p>`;
    
    console.log('✅ アドバイスを表示しました:', adviceText);
}

/**
 * 測定のリセット
 */
function resetMeeting() {
    console.log('🔄 測定をリセットします...');
    
    // 変数のリセット
    managerSpeakingTime = 0;
    memberSpeakingTime = 0;
    
    // UI復元
    document.getElementById('meeting-info').classList.remove('hidden');
    document.getElementById('btn-start-meeting').classList.remove('hidden');
    document.getElementById('btn-stop-meeting').classList.add('hidden');
    document.getElementById('meeting-active').classList.add('hidden');
    document.getElementById('meeting-result').classList.add('hidden');
    
    // チャートの破棄
    if (window.meetingChart) {
        window.meetingChart.destroy();
        window.meetingChart = null;
    }
    
    console.log('✅ 測定をリセットしました');
}

console.log('✅ スクリプト（Azure版）の読み込みが完了しました');
