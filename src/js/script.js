/**
 * 1on1 発話比率測定アプリケーション
 * 
 * このアプリケーションは、上司と部下の1on1ミーティングにおける
 * 発話比率を測定し、可視化します。
 */

console.log('🚀 1on1 発話比率測定アプリを起動します...');

// グローバル変数
let audioContext = null;
let analyser = null;
let microphone = null;
let microphoneStream = null; // マイクストリームの参照を保持
let javascriptNode = null;
let animationId = null;

// 音声登録用
let isRegistering = false;
let registrationData = [];
let registrationStartTime = null;
const REGISTRATION_DURATION = 10000; // 10秒

// 1on1測定用
let isMeeting = false;
let meetingStartTime = null;
let managerSpeakingTime = 0; // 上司の発話時間（ミリ秒）
let memberSpeakingTime = 0;  // 部下の発話時間（ミリ秒）
let lastUpdateTime = null;
let meetingTimerInterval = null;

// 音響特徴量の閾値
const VOICE_THRESHOLD = 30; // 発話判定の音量閾値
const SPEAKER_FREQUENCY_DIFF_THRESHOLD = 30; // 話者識別の周波数差分閾値

// LocalStorageキー
const STORAGE_KEY_VOICE_PROFILE = 'voice_profile_manager';

console.log('📋 設定値:', {
    VOICE_THRESHOLD,
    SPEAKER_FREQUENCY_DIFF_THRESHOLD,
    REGISTRATION_DURATION
});

/**
 * ページ読み込み完了時の初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded: ページの読み込みが完了しました');
    
    initializeApp();
    setupEventListeners();
    checkRegistrationStatus();
});

/**
 * アプリケーションの初期化
 */
function initializeApp() {
    console.log('🔧 アプリケーションを初期化しています...');
    
    // Web Audio APIのサポート確認
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ このブラウザはマイク機能をサポートしていません');
        alert('このブラウザはマイク機能をサポートしていません。Chrome、Firefox、Edgeなどの最新ブラウザをご使用ください。');
        return;
    }
    
    console.log('✅ Web Audio APIのサポートを確認しました');
    
    // AudioContextの作成
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('✅ AudioContextを作成しました', audioContext);
    } catch (error) {
        console.error('❌ AudioContextの作成に失敗しました:', error);
    }
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    console.log('🎧 イベントリスナーを設定しています...');
    
    // タブ切り替え
    document.getElementById('tab-registration').addEventListener('click', () => {
        console.log('📑 タブ切り替え: 初回登録');
        switchTab('registration');
    });
    
    document.getElementById('tab-meeting').addEventListener('click', () => {
        console.log('📑 タブ切り替え: 1on1測定');
        switchTab('meeting');
    });
    
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
    
    if (tab === 'registration') {
        document.getElementById('tab-registration').classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        document.getElementById('tab-registration').classList.remove('text-gray-500');
        document.getElementById('content-registration').classList.remove('hidden');
    } else if (tab === 'meeting') {
        document.getElementById('tab-meeting').classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
        document.getElementById('tab-meeting').classList.remove('text-gray-500');
        document.getElementById('content-meeting').classList.remove('hidden');
        checkRegistrationStatus();
    }
}

/**
 * 登録状態の確認
 */
function checkRegistrationStatus() {
    console.log('🔍 登録状態を確認しています...');
    
    const voiceProfile = localStorage.getItem(STORAGE_KEY_VOICE_PROFILE);
    
    if (voiceProfile) {
        const profile = JSON.parse(voiceProfile);
        console.log('✅ 上司の声が登録されています:', profile);
        
        // 登録情報の表示
        document.getElementById('registered-info').classList.remove('hidden');
        document.getElementById('registration-date').textContent = 
            new Date(profile.timestamp).toLocaleString('ja-JP');
        
        // 1on1測定タブの警告を非表示
        document.getElementById('warning-not-registered').classList.add('hidden');
        document.getElementById('btn-start-meeting').disabled = false;
        
        return true;
    } else {
        console.log('ℹ️ 上司の声が未登録です');
        
        // 登録情報を非表示
        document.getElementById('registered-info').classList.add('hidden');
        
        // 1on1測定タブで警告を表示
        document.getElementById('warning-not-registered').classList.remove('hidden');
        document.getElementById('btn-start-meeting').disabled = true;
        
        return false;
    }
}

/**
 * マイクの初期化とストリーム開始
 */
async function initializeMicrophone() {
    console.log('🎤 マイクを初期化しています...');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        console.log('✅ マイクのアクセスが許可されました', stream);
        
        // ストリームの参照を保持
        microphoneStream = stream;
        microphone = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
        
        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);
        
        console.log('✅ オーディオノードの接続が完了しました', {
            analyser,
            javascriptNode
        });
        
        return stream;
    } catch (error) {
        console.error('❌ マイクの初期化に失敗しました:', error);
        alert('マイクへのアクセスが拒否されました。ブラウザの設定でマイクの使用を許可してください。');
        throw error;
    }
}

/**
 * マイクストリームの停止
 */
function stopMicrophone() {
    console.log('🛑 マイクストリームを停止しています...');
    
    if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => {
            track.stop();
            console.log('✅ トラックを停止しました:', track);
        });
        microphoneStream = null;
    }
    
    if (javascriptNode) {
        javascriptNode.disconnect();
        javascriptNode = null;
    }
    
    if (analyser) {
        analyser.disconnect();
        analyser = null;
    }
    
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    console.log('✅ マイクストリームの停止が完了しました');
}

/**
 * 音量の取得
 */
function getVolume() {
    if (!analyser) return 0;
    
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    
    const rms = Math.sqrt(sum / bufferLength);
    const volume = rms * 100;
    
    return volume;
}

/**
 * 周波数特性の取得（簡易版）
 */
function getFrequencyCharacteristics() {
    if (!analyser) return 0;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // 低周波数帯域の平均値を計算（簡易的な特徴量）
    let lowFreqSum = 0;
    const lowFreqRange = Math.floor(bufferLength * 0.3);
    
    for (let i = 0; i < lowFreqRange; i++) {
        lowFreqSum += dataArray[i];
    }
    
    const lowFreqAvg = lowFreqSum / lowFreqRange;
    
    return lowFreqAvg;
}

/**
 * 声の登録開始
 */
async function startVoiceRegistration() {
    console.log('🎙️ 声の登録を開始します...');
    
    if (isRegistering) {
        console.warn('⚠️ すでに登録中です');
        return;
    }
    
    try {
        const stream = await initializeMicrophone();
        
        isRegistering = true;
        registrationData = [];
        registrationStartTime = Date.now();
        
        // UI更新
        document.getElementById('btn-start-registration').classList.add('hidden');
        document.getElementById('btn-stop-registration').classList.remove('hidden');
        document.getElementById('registration-status').classList.remove('hidden');
        
        // 音声データの収集
        javascriptNode.onaudioprocess = () => {
            if (!isRegistering) return;
            
            const volume = getVolume();
            const frequency = getFrequencyCharacteristics();
            
            // 音声レベルの表示更新
            document.getElementById('voice-level-register').style.width = `${Math.min(volume * 2, 100)}%`;
            
            // データの保存
            if (volume > VOICE_THRESHOLD) {
                registrationData.push({
                    volume,
                    frequency,
                    timestamp: Date.now()
                });
                
                console.log('📊 音声データを記録:', { volume: volume.toFixed(2), frequency: frequency.toFixed(2) });
            }
            
            // 経過時間の表示
            const elapsed = Date.now() - registrationStartTime;
            const remaining = Math.max(0, Math.ceil((REGISTRATION_DURATION - elapsed) / 1000));
            document.querySelector('#registration-status p').textContent = 
                `録音中... 残り ${remaining} 秒`;
            
            // 自動停止
            if (elapsed >= REGISTRATION_DURATION) {
                stopVoiceRegistration();
            }
        };
        
        console.log('✅ 声の登録を開始しました（10秒間）');
        
    } catch (error) {
        console.error('❌ 声の登録開始に失敗しました:', error);
        isRegistering = false;
        document.getElementById('btn-start-registration').classList.remove('hidden');
        document.getElementById('btn-stop-registration').classList.add('hidden');
    }
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
    
    // マイクストリームの停止
    stopMicrophone();
    
    // データの保存
    if (registrationData.length > 0) {
        const voiceProfile = {
            data: registrationData,
            timestamp: Date.now(),
            sampleCount: registrationData.length
        };
        
        localStorage.setItem(STORAGE_KEY_VOICE_PROFILE, JSON.stringify(voiceProfile));
        
        console.log('✅ 上司の声を登録しました:', {
            sampleCount: registrationData.length,
            timestamp: new Date(voiceProfile.timestamp).toLocaleString('ja-JP')
        });
        
        // UI更新
        document.querySelector('#registration-status p').textContent = 
            `✓ 登録が完了しました（${registrationData.length}サンプル）`;
        
        setTimeout(() => {
            document.getElementById('registration-status').classList.add('hidden');
            checkRegistrationStatus();
        }, 2000);
        
    } else {
        console.warn('⚠️ 音声データが記録されませんでした');
        document.querySelector('#registration-status p').textContent = 
            '音声が検出されませんでした。もう一度お試しください。';
    }
    
    // UI復元
    document.getElementById('btn-start-registration').classList.remove('hidden');
    document.getElementById('btn-stop-registration').classList.add('hidden');
    document.getElementById('voice-level-register').style.width = '0%';
}

/**
 * 登録のクリア
 */
function clearVoiceRegistration() {
    console.log('🗑️ 登録をクリアします...');
    
    if (confirm('上司の声の登録をクリアしますか？')) {
        localStorage.removeItem(STORAGE_KEY_VOICE_PROFILE);
        console.log('✅ 登録をクリアしました');
        checkRegistrationStatus();
    }
}

/**
 * 話者の識別（上司 or 部下）
 */
function identifySpeaker(volume, frequency) {
    // 登録データの取得
    const voiceProfileJson = localStorage.getItem(STORAGE_KEY_VOICE_PROFILE);
    if (!voiceProfileJson) {
        console.warn('⚠️ 声のプロファイルが未登録です');
        return 'member'; // デフォルトは部下
    }
    
    const voiceProfile = JSON.parse(voiceProfileJson);
    
    // 登録データとの比較（簡易版：周波数特性の類似度）
    const avgFrequency = voiceProfile.data.reduce((sum, d) => sum + d.frequency, 0) / voiceProfile.data.length;
    const frequencyDiff = Math.abs(frequency - avgFrequency);
    
    // 閾値による判定（簡易版）
    // より精度を上げるには機械学習などを使用
    const isManager = frequencyDiff < SPEAKER_FREQUENCY_DIFF_THRESHOLD;
    
    console.log('🎯 話者識別:', { 
        volume: volume.toFixed(2), 
        frequency: frequency.toFixed(2), 
        avgFrequency: avgFrequency.toFixed(2),
        frequencyDiff: frequencyDiff.toFixed(2),
        speaker: isManager ? '上司' : '部下' 
    });
    
    return isManager ? 'manager' : 'member';
}

/**
 * 1on1測定の開始
 */
async function startMeeting() {
    console.log('🎬 1on1測定を開始します...');
    
    if (isMeeting) {
        console.warn('⚠️ すでに測定中です');
        return;
    }
    
    // 登録確認
    if (!checkRegistrationStatus()) {
        console.error('❌ 上司の声が未登録です');
        alert('先に上司の声を登録してください。');
        return;
    }
    
    try {
        const stream = await initializeMicrophone();
        
        isMeeting = true;
        meetingStartTime = Date.now();
        lastUpdateTime = Date.now();
        managerSpeakingTime = 0;
        memberSpeakingTime = 0;
        
        // UI更新
        document.getElementById('meeting-info').classList.add('hidden');
        document.getElementById('btn-start-meeting').classList.add('hidden');
        document.getElementById('btn-stop-meeting').classList.remove('hidden');
        document.getElementById('meeting-active').classList.remove('hidden');
        document.getElementById('meeting-result').classList.add('hidden');
        
        // タイマー開始
        meetingTimerInterval = setInterval(updateMeetingTimer, 1000);
        
        // 音声データの処理
        javascriptNode.onaudioprocess = () => {
            if (!isMeeting) return;
            
            const now = Date.now();
            const deltaTime = now - lastUpdateTime;
            
            const volume = getVolume();
            const frequency = getFrequencyCharacteristics();
            
            // 発話判定
            if (volume > VOICE_THRESHOLD) {
                const speaker = identifySpeaker(volume, frequency);
                
                if (speaker === 'manager') {
                    managerSpeakingTime += deltaTime;
                    document.getElementById('voice-level-manager').style.width = `${Math.min(volume * 2, 100)}%`;
                    document.getElementById('voice-level-member').style.width = '0%';
                } else {
                    memberSpeakingTime += deltaTime;
                    document.getElementById('voice-level-member').style.width = `${Math.min(volume * 2, 100)}%`;
                    document.getElementById('voice-level-manager').style.width = '0%';
                }
                
                console.log('🗣️ 発話検出:', { speaker, volume: volume.toFixed(2), deltaTime });
            } else {
                // 無音時はバーをリセット
                document.getElementById('voice-level-manager').style.width = '0%';
                document.getElementById('voice-level-member').style.width = '0%';
            }
            
            // 発話時間の表示更新
            document.getElementById('time-manager').textContent = formatTime(managerSpeakingTime);
            document.getElementById('time-member').textContent = formatTime(memberSpeakingTime);
            
            lastUpdateTime = now;
        };
        
        console.log('✅ 1on1測定を開始しました');
        
    } catch (error) {
        console.error('❌ 1on1測定の開始に失敗しました:', error);
        isMeeting = false;
    }
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
    
    // マイクストリームの停止
    stopMicrophone();
    
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

console.log('✅ スクリプトの読み込みが完了しました');
