/**
 * Session 页面
 * 主要的会话界面，包含麦克风按钮、消息列表和安全横幅
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Message, SessionState, SafetyLevel, MicroAction, MusicRequest, MusicPlayerInstance } from '@/types';
import MicButton from '@/components/MicButton';
import MessageList from '@/components/MessageList';
import SafetyBanner from '@/components/SafetyBanner';
import { transcribeAudio, getAIResponse, checkSafetyLevel, playAssistantVoice, stopAssistantVoice } from '@/lib/api';
import { buildMicroActionMessage } from '@/lib/prompts';
import { generateSessionId } from '@/lib/logger';

export default function SessionPage() {
  const router = useRouter();
  const [sessionId] = useState(() => generateSessionId()); // Generate once per session
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [safetyLevel, setSafetyLevel] = useState<SafetyLevel>('safe');
  const [currentMicroActions, setCurrentMicroActions] = useState<MicroAction[]>([]);
  const [showSafetyBanner, setShowSafetyBanner] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  
  // Music player instances rendered inline with the conversation
  const [musicPlayers, setMusicPlayers] = useState<MusicPlayerInstance[]>([]);
  
  // 用于存储录音的引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 生成唯一ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 使用Chrome原生方法检查麦克风权限状态
  const checkMicrophonePermission = async (): Promise<PermissionState | null> => {
    if (typeof window === 'undefined' || !navigator || !navigator.permissions) {
      return null;
    }

    try {
      // Chrome原生权限查询API
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch (error) {
      // 某些浏览器可能不支持permissions API，返回null
      console.log('Permissions API not supported:', error);
      return null;
    }
  };

  // 使用Chrome原生方法请求麦克风权限
  const requestMicrophoneAccess = async (): Promise<MediaStream | null> => {
    // 检查浏览器支持
    if (typeof window === 'undefined') {
      return null;
    }

    // 检查HTTPS或localhost（Chrome要求）
    const isSecureContext = window.isSecureContext || 
                           window.location.protocol === 'https:' || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      setMicError('Microphone access requires a secure connection (HTTPS). Please access this site via HTTPS or localhost.');
      setMicReady(false);
      return null;
    }

    // 检查Chrome MediaDevices API支持
    if (!navigator || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setMicError('Your browser does not support microphone access. Please use Chrome or another modern browser.');
      setMicReady(false);
      return null;
    }

    try {
      // 先检查权限状态（Chrome原生方法）
      const permissionState = await checkMicrophonePermission();
      
      if (permissionState === 'denied') {
        setMicError('Microphone permission was denied. Please enable it in Chrome settings: Settings > Privacy and security > Site Settings > Microphone');
        setMicReady(false);
        return null;
      }

      // Chrome原生方法：请求麦克风访问
      // 使用Chrome推荐的音频约束配置
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // Chrome推荐采样率
          channelCount: 1    // 单声道
        }
      });

      // 验证stream是否有效
      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('No audio tracks available');
      }

      streamRef.current = stream;
      setMicReady(true);
      setMicError(null);
      console.log('Microphone access granted via Chrome native API');
      
      return stream;
    } catch (error: any) {
      console.error('Failed to access microphone:', error);
      setMicReady(false);
      
      // Chrome特定的错误处理
      let errorMessage = 'Unable to access microphone. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Microphone permission was denied. ';
        errorMessage += 'In Chrome: Click the lock icon (🔒) or microphone icon (🎤) in the address bar, then select "Allow". ';
        errorMessage += 'Or go to Chrome Settings > Privacy and security > Site Settings > Microphone to manage permissions.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Microphone is being used by another application. Please close other apps using the microphone.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Microphone does not support the requested constraints. Trying with default settings...';
        // 尝试使用默认设置
        try {
          const defaultStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = defaultStream;
          setMicReady(true);
          setMicError(null);
          return defaultStream;
        } catch (defaultError) {
          errorMessage = 'Failed to access microphone with default settings.';
        }
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}. Please check your browser permissions and try again.`;
      }
      
      setMicError(errorMessage);
      return null;
    }
  };

  // 页面加载时立即请求麦克风权限
  useEffect(() => {
    // 延迟一点请求，确保页面完全加载
    const timer = setTimeout(() => {
      requestMicrophoneAccess();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // 开始录音
  const handleStartRecording = async () => {
    // 停止正在播放的语音输出
    stopAssistantVoice();

    // 检查浏览器支持
    if (typeof window === 'undefined' || !navigator || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setMicError('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.');
      setSessionState('idle');
      return;
    }

    // 如果麦克风未准备好，使用Chrome原生方法重新请求权限
    if (!micReady || !streamRef.current) {
      const stream = await requestMicrophoneAccess();
      if (!stream) {
        setSessionState('idle');
        return;
      }
    }

    try {
      const stream = streamRef.current;
      if (!stream) {
        throw new Error('No microphone stream available');
      }

      // 浏览器是否支持 MediaRecorder
      if (typeof window === 'undefined' || typeof (window as any).MediaRecorder === 'undefined') {
        setMicError(
          'Your browser does not support audio recording via MediaRecorder. Please use the latest version of Chrome or Edge on desktop.'
        );
        setSessionState('idle');
        return;
      }

      const MediaRecorderConstructor: typeof MediaRecorder = (window as any).MediaRecorder;

      // 选择一个浏览器支持的音频编码格式，避免 MediaRecorder.start 抛 NotSupportedError
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      let selectedOptions: MediaRecorderOptions | undefined = undefined;
      if (typeof MediaRecorderConstructor.isTypeSupported === 'function') {
        for (const type of candidateTypes) {
          if (MediaRecorderConstructor.isTypeSupported(type)) {
            selectedOptions = { mimeType: type };
            break;
          }
        }
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = selectedOptions
          ? new MediaRecorderConstructor(stream, selectedOptions)
          : new MediaRecorderConstructor(stream);
      } catch (err: any) {
        console.error('Failed to construct MediaRecorder:', err);
        setMicError(
          'Your browser does not support the required audio format for recording. Please try using Chrome on desktop.'
        );
        setSessionState('idle');
        return;
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        // 注意：不在这里停止stream，因为我们需要保持它以便后续录音
      };

      try {
        mediaRecorder.start();
      } catch (err: any) {
        console.error('Failed to start MediaRecorder:', err);
        if (err?.name === 'NotSupportedError') {
          setMicError(
            'Recording is not supported with the current browser or audio configuration. Please try using the latest Chrome on desktop, and make sure this page is opened via HTTPS or localhost.'
          );
        } else {
          setMicError('Failed to start recording. Please check your microphone and browser permissions, then try again.');
        }
        setSessionState('idle');
        return;
      }
      setSessionState('recording');
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setSessionState('idle');
      setMicError('Failed to start recording. Please try again.');
    }
  };

  // 停止录音
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && sessionState === 'recording') {
      mediaRecorderRef.current.stop();
      setSessionState('processing');
    }
  };

  const processUserText = async (
    text: string,
    options?: { metadata?: Record<string, any>; interactionType?: 'user_message' | 'micro_action_click' }
  ) => {
    try {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setSessionState('responding');
      const conversationHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const [safety, aiResponse] = await Promise.all([
        checkSafetyLevel(trimmed),
        getAIResponse(trimmed, conversationHistory, {
          sessionId,
          interactionType: options?.interactionType || 'user_message',
          metadata: {
            ...options?.metadata,
            source: options?.metadata?.source || 'text_input',
          },
        }),
      ]);

      setSafetyLevel(safety);
      if (safety !== 'safe') {
        setShowSafetyBanner(true);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        references: aiResponse.references,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      playAssistantVoice(aiResponse.message).catch((err) => {
        console.error('Failed to play assistant voice:', err);
      });

      if (aiResponse.microActions) {
        setCurrentMicroActions(aiResponse.microActions);
      }

      if (aiResponse.musicRequest?.shouldPlay) {
        handleMusicRequest(aiResponse.musicRequest, assistantMessage.id);
      }

      setSessionState('idle');
    } catch (error) {
      console.error('Error processing user text:', error);
      setSessionState('idle');
      alert('Failed to process your message. Please try again.');
    }
  };

  // 处理音频：转录 -> AI响应
  const processAudio = async (audioBlob: Blob) => {
    try {
      const transcript = await transcribeAudio(audioBlob);
      await processUserText(transcript, { metadata: { source: 'voice_input' } });
    } catch (error) {
      console.error('Error processing audio:', error);
      setSessionState('idle');
      alert('Error processing audio. Please try again.');
    }
  };

  const handleSubmitTypedMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (sessionState !== 'idle') {
      return;
    }
    const messageToSend = typedMessage.trim();
    if (!messageToSend) {
      return;
    }
    setTypedMessage('');
    await processUserText(messageToSend, { metadata: { source: 'text_input' } });
  };

  // 处理 Micro-Action 点击：基于选中的 action 生成 LLM 回复
  const handleMicroActionClick = async (action: MicroAction) => {
    if (sessionState !== 'idle') {
      return; // 如果正在处理中，忽略点击
    }

    try {
      setSessionState('responding');

      // 构建基于 Micro-Action 的用户消息
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const microActionMessage = buildMicroActionMessage(action, conversationHistory);

      // 调用 LLM 生成回复（复用现有的 getAIResponse，但传入特殊的消息）
      const aiResponse = await getAIResponse(microActionMessage, conversationHistory, {
        sessionId,
        interactionType: 'micro_action_click',
        metadata: { clickedAction: action },
      });

      // 添加用户消息（表示用户点击了某个 action）
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: `[Clicked on micro-action: ${action.title}]`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // 添加 AI 回复
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        references: aiResponse.references,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // 播放语音回复
      playAssistantVoice(aiResponse.message).catch((err) => {
        console.error('Failed to play assistant voice:', err);
      });

      // 更新微行动（LLM 可能会生成新的微行动）
      if (aiResponse.microActions) {
        setCurrentMicroActions(aiResponse.microActions);
      }

      // 处理音乐请求
      if (aiResponse.musicRequest?.shouldPlay) {
        handleMusicRequest(aiResponse.musicRequest, assistantMessage.id);
      }

      // 检查安全级别
      if (aiResponse.safetyLevel !== 'safe') {
        setSafetyLevel(aiResponse.safetyLevel);
        setShowSafetyBanner(true);
      }

      setSessionState('idle');
    } catch (error) {
      console.error('Error handling micro-action click:', error);
      setSessionState('idle');
      alert('Failed to generate response. Please try again.');
    }
  };

  // 处理音乐请求：搜索 YouTube 并播放
  const handleMusicRequest = async (musicRequest: MusicRequest, triggerMessageId: string) => {
    if (!musicRequest.searchQuery && !musicRequest.youtubeVideoId) {
      return;
    }

    try {
      let resolvedVideoId = musicRequest.youtubeVideoId || null;

      if (!resolvedVideoId && musicRequest.searchQuery) {
        const res = await fetch('/api/youtube-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: musicRequest.searchQuery }),
        });

        if (!res.ok) {
          console.error('[Session] Failed to search YouTube:', res.status);
          return;
        }

        const data = await res.json();
        resolvedVideoId = data.videoId;
      }

      if (!resolvedVideoId) {
        console.error('[Session] No videoId available for music request');
        return;
      }

      setMusicPlayers((prev) => [
        ...prev,
        {
          id: `music-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          triggerMessageId,
          videoId: resolvedVideoId,
          title: musicRequest.musicType || 'Music',
        },
      ]);
    } catch (error) {
      console.error('[Session] Error searching YouTube:', error);
    }
  };

  const handleCloseMusicPlayer = (playerId: string) => {
    setMusicPlayers((prev) => prev.filter((player) => player.id !== playerId));
  };

  // 检查是否可以结束会话（至少有一条AI回复）
  const canEndSession = messages.some((m) => m.role === 'assistant');

  // 结束会话
  const handleEndSession = () => {
    if (canEndSession) {
      router.push({
        pathname: '/summary',
        query: {
          messages: JSON.stringify(messages),
          microActions: JSON.stringify(currentMicroActions),
        },
      });
    }
  };

  return (
    <>
      <Head>
        <title>Session - Voice AI Coach</title>
      </Head>

      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* 安全横幅 */}
        {showSafetyBanner && (
          <SafetyBanner
            safetyLevel={safetyLevel}
            onDismiss={() => setShowSafetyBanner(false)}
          />
        )}

        {/* 麦克风状态提示 */}
        {micError ? (
          <div className="bg-red-50 border-b-2 border-red-500 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2">⚠️ Microphone Access Required</h3>
                  <p className="text-sm text-red-700 mb-2">{micError}</p>
                  <div className="text-sm text-red-700">
                    <p className="font-medium mb-1">How to enable microphone access in Chrome:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Look for the lock icon (🔒) or microphone icon (🎤) in Chrome's address bar</li>
                      <li>Click on it and select "Allow" for microphone permissions</li>
                      <li>Or go to Chrome Settings → Privacy and security → Site Settings → Microphone</li>
                      <li>Find this site and set it to "Allow"</li>
                      <li>Refresh the page and try again</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setMicError(null);
                    // 使用Chrome原生方法重新请求权限
                    const stream = await requestMicrophoneAccess();
                    if (!stream) {
                      // 错误已经在requestMicrophoneAccess中设置
                      return;
                    }
                  }}
                  className="ml-4 px-3 py-1 text-sm text-red-700 hover:bg-red-100 rounded"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : micReady ? (
          <div className="bg-green-50 border-b-2 border-green-500 p-3">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-green-700 text-center">
                ✅ Microphone ready - You can start recording now
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border-b-2 border-blue-500 p-3">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-blue-700 text-center">
                🎤 Requesting microphone access...
              </p>
            </div>
          </div>
        )}

        {/* 顶部栏 */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Voice AI Coach</h1>
            {canEndSession && (
              <button
                onClick={handleEndSession}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                End Session
              </button>
            )}
          </div>
        </header>

        {/* 消息列表区域 */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            microActions={currentMicroActions}
            onMicroActionClick={handleMicroActionClick}
            musicPlayers={musicPlayers}
            onCloseMusicPlayer={handleCloseMusicPlayer}
          />
        </div>

        {/* 底部输入与麦克风区域 */}
        <div className="bg-white border-t border-gray-200 px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <form onSubmit={handleSubmitTypedMessage} className="flex gap-3">
              <input
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Prefer typing? Share what's on your mind..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoComplete="off"
                aria-label="Type your message"
                disabled={sessionState !== 'idle'}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                disabled={sessionState !== 'idle' || typedMessage.trim().length === 0}
              >
                Send
              </button>
            </form>
            <div className="flex justify-center">
              <MicButton
                state={sessionState}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
