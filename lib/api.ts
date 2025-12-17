/**
 * API 函数库
 * 这里把前端调用统一转发到 Next.js API 路由，由服务端再去调用 OpenAI
 */

import { AIResponse, SafetyLevel, MicroAction } from '@/types';

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log('[API] transcribeAudio called with real audio blob');

  try {
    // 浏览器中将 Blob 转成 base64，发送给后端
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const audioBase64 = btoa(binary);

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64,
        mimeType: audioBlob.type || 'audio/webm',
      }),
    });

    if (!res.ok) {
      console.error('[API] transcribeAudio /api/transcribe error status:', res.status);
      throw new Error(`STT API responded with status ${res.status}`);
    }

    const data = (await res.json()) as { transcript: string };
    return data.transcript;
  } catch (error) {
    console.error('[API] transcribeAudio failed:', error);
    // 出错兜底：返回一个温和的提示文本，避免整个流程中断
    return '（语音转文字暂时出错了，如果方便的话，可以先用文字简单打几句描述一下你的感受。）';
  }
}

// 全局 Audio 对象引用，用于停止正在播放的语音
let currentAudio: HTMLAudioElement | null = null;

/**
 * 停止当前正在播放的助手语音
 */
export function stopAssistantVoice(): void {
  if (typeof window === 'undefined') return;
  
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      // 清理 URL 对象
      if (currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudio.src);
      }
      currentAudio = null;
      console.log('[API] Stopped assistant voice playback');
    } catch (error) {
      console.error('[API] Failed to stop assistant voice:', error);
    }
  }
}

/**
 * 为助手回复生成语音并在前端播放
 * 调用 /api/tts 获取音频流，然后用 Audio 在浏览器中播放
 */
export async function playAssistantVoice(text: string): Promise<void> {
  // 只在浏览器环境中执行
  if (typeof window === 'undefined') return;
  if (!text || !text.trim()) return;

  // 停止之前正在播放的语音
  stopAssistantVoice();

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error('[API] playAssistantVoice /api/tts error status:', res.status);
      return;
    }

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    currentAudio = audio;
    audio.playbackRate = 1.3; // speed up speech playback for quicker replies
    if ('preservesPitch' in audio) {
      // keep voice from sounding too distorted when speeding up
      (audio as any).preservesPitch = true;
    } else if ('mozPreservesPitch' in audio) {
      (audio as any).mozPreservesPitch = true;
    }
    
    // 播放完成后清理
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) {
        currentAudio = null;
      }
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) {
        currentAudio = null;
      }
    });

    audio.play().catch((err) => {
      console.error('[API] Failed to play assistant voice:', err);
      URL.revokeObjectURL(url);
      if (currentAudio === audio) {
        currentAudio = null;
      }
    });
  } catch (error) {
    console.error('[API] playAssistantVoice failed:', error);
  }
}

/**
 * 调用真实的 OpenAI LLM 生成 AI 响应
 * 通过调用 /api/ai-response，由服务端安全地使用 OPENAI_API_KEY
 */
export async function getAIResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    sessionId?: string;
    interactionType?: 'user_message' | 'micro_action_click';
    metadata?: Record<string, any>;
  }
): Promise<AIResponse> {
  try {
    const res = await fetch('/api/ai-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        conversationHistory,
        sessionId: options?.sessionId,
        interactionType: options?.interactionType || 'user_message',
        metadata: options?.metadata,
      }),
    });

    if (!res.ok) {
      console.error('[API] getAIResponse /api/ai-response error status:', res.status);
      throw new Error(`API responded with status ${res.status}`);
    }

    const data = (await res.json()) as AIResponse;
    return data;
  } catch (error) {
    console.error('[API] getAIResponse failed:', error);

    // 兜底：当 OpenAI 或后端出错时，返回一个安全的默认回复
    const fallback: AIResponse = {
      message:
        "抱歉，我这边暂时遇到了一点技术问题，没能正常生成回应。但你刚刚分享的内容对我来说依然很重要。可以稍微深呼吸一下，如果你方便的话，可以再描述一下此刻最困扰你的一个点吗？",
      microActions: [
        {
          id: 'fallback-1',
          title: '做 3 次深呼吸',
          description: '缓慢吸气 4 秒，停顿 1 秒，然后呼气 6 秒，重复 3 次。',
        },
      ],
      safetyLevel: 'safe',
      references: [],
    };

    return fallback;
  }
}

/**
 * 安全级别检测
 * 目前仍使用简单关键词规则；你可以后续接一个 /api/safety 到 OpenAI
 */
function detectSafetyLevel(message: string): SafetyLevel {
  const lowerMessage = message.toLowerCase();

  const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hurt myself', 'harm', 'kill'];
  const cautionKeywords = ['hopeless', 'helpless', 'no hope', "can't continue", 'give up'];

  if (crisisKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return 'crisis';
  }

  if (cautionKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return 'caution';
  }

  return 'safe';
}

/**
 * 检查文本是否包含高风险内容
 * 目前仍为本地规则检测，保持行为不变
 */
export async function checkSafetyLevel(text: string): Promise<SafetyLevel> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(detectSafetyLevel(text));
    }, 300);
  });
}
