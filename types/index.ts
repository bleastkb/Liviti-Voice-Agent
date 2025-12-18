/**
 * TypeScript类型定义
 */

// 消息类型
export type MessageRole = 'user' | 'assistant';

// 消息接口
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
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

// AI响应接口（包含微行动和安全级别）
export interface AIResponse {
  message: string;
  microActions?: MicroAction[];
  safetyLevel: SafetyLevel;
}

// 会话摘要
export interface SessionSummary {
  sessionId: string;
  messages: Message[];
  microActions: MicroAction[];
  emotionCheckResult?: EmotionCheckResult;
  createdAt: Date;
}

