/**
 * TypeScript类型定义
 */

// 消息类型
export type MessageRole = 'user' | 'assistant';

// 消息接口
export interface Reference {
  title: string;
  url: string;
  snippet: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  references?: Reference[];
}

// 微行动接口
export interface MicroAction {
  id: string;
  title: string;
  description: string;
}

// 会话状态
export type SessionState = 'idle' | 'recording' | 'processing' | 'responding';

// 情绪检查结果
export type EmotionCheckResult = 'better' | 'same' | 'worse';

// 安全级别
export type SafetyLevel = 'safe' | 'caution' | 'crisis';

// 音乐请求接口
export interface MusicRequest {
  shouldPlay: boolean; // LLM 判断用户是否想要听音乐
  searchQuery?: string; // 音乐搜索关键词（由 LLM 生成）
  musicType?: string; // 音乐类型/风格（如 "calm", "energetic", "meditation"）
  youtubeVideoId?: string; // YouTube 视频 ID（如果已搜索到）
}

// 对话中渲染的音乐播放器实例
export interface MusicPlayerInstance {
  id: string;
  triggerMessageId: string;
  videoId: string;
  title: string;
}

// AI响应接口（包含微行动和安全级别）
export interface AIResponse {
  message: string;
  microActions?: MicroAction[];
  safetyLevel: SafetyLevel;
  musicRequest?: MusicRequest; // 音乐播放请求（如果用户想要听音乐）
  references?: Reference[];
}

// 会话摘要
export interface SessionSummary {
  sessionId: string;
  messages: Message[];
  microActions: MicroAction[];
  emotionCheckResult?: EmotionCheckResult;
  createdAt: Date;
}
