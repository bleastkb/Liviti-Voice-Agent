/**
 * Conversation Logger
 * Tracks all interactions between user and system for LLM/prompt improvement
 */

import { Message, MicroAction, SafetyLevel, Reference } from '@/types';

// Only import Node.js modules in server-side context
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;

if (typeof window === 'undefined') {
  // Server-side only
  fs = require('fs');
  path = require('path');
}

export interface ConversationLog {
  sessionId: string;
  timestamp: string;
  interactionId: string;
  type: 'user_message' | 'ai_response' | 'micro_action_click';
  
  // User input
  userMessage?: string;
  userMessageRaw?: string; // Original transcript if from voice
  
  // AI response
  aiResponse?: {
    message: string;
    safetyLevel: SafetyLevel;
    microActions?: MicroAction[];
    references?: Reference[];
  };
  
  // System context
  systemPrompt?: string;
  systemPromptVersion?: string; // Track prompt changes
  model: string;
  
  // Conversation context
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  
  // Raw LLM input/output for prompt improvement
  llmInput?: {
    // Complete messages array sent to OpenAI API
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    // Request parameters
    model: string;
    responseFormat?: { type: string };
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  
  llmOutput?: {
    // Raw response from OpenAI API (before parsing)
    rawResponse: any; // Full JSON response from OpenAI
    rawContent?: string; // The content string before JSON parsing
    parsedContent?: any; // Parsed JSON content
    error?: string; // If parsing failed
  };
  
  // Metadata
  metadata?: {
    responseTimeMs?: number;
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    [key: string]: any;
  };
}

function getLogsDir(): string {
  if (!path) return '';
  return path.join(process.cwd(), 'logs');
}

function getConversationsFile(): string {
  if (!path) return '';
  return path.join(getLogsDir(), 'conversations.jsonl');
}

// Ensure logs directory exists
function ensureLogsDir() {
  if (typeof window !== 'undefined' || !fs || !path) return;
  
  const logsDir = getLogsDir();
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * Log a conversation interaction
 */
export async function logConversation(log: ConversationLog): Promise<void> {
  if (typeof window !== 'undefined' || !fs || !path) {
    // Client-side: do nothing (logging happens server-side)
    return;
  }

  try {
    ensureLogsDir();
    
    // Append to JSONL file (one JSON object per line)
    const logLine = JSON.stringify(log) + '\n';
    const conversationsFile = getConversationsFile();
    fs.appendFileSync(conversationsFile, logLine, 'utf8');
    
    console.log(`[Logger] Logged interaction: ${log.interactionId} (${log.type})`);
  } catch (error) {
    console.error('[Logger] Failed to log conversation:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Read all conversation logs
 */
export function readConversationLogs(): ConversationLog[] {
  if (typeof window !== 'undefined' || !fs || !path) {
    return [];
  }

  try {
    ensureLogsDir();
    
    const conversationsFile = getConversationsFile();
    if (!fs.existsSync(conversationsFile)) {
      return [];
    }
    
    const content = fs.readFileSync(conversationsFile, 'utf8');
    const lines = content.trim().split('\n').filter((line) => line.trim());
    
    return lines.map((line) => JSON.parse(line) as ConversationLog);
  } catch (error) {
    console.error('[Logger] Failed to read conversation logs:', error);
    return [];
  }
}

/**
 * Get logs for a specific session
 */
export function getSessionLogs(sessionId: string): ConversationLog[] {
  const allLogs = readConversationLogs();
  return allLogs.filter((log) => log.sessionId === sessionId);
}

/**
 * Get logs grouped by session
 */
export function getLogsBySession(): Record<string, ConversationLog[]> {
  const allLogs = readConversationLogs();
  const grouped: Record<string, ConversationLog[]> = {};
  
  for (const log of allLogs) {
    if (!grouped[log.sessionId]) {
      grouped[log.sessionId] = [];
    }
    grouped[log.sessionId].push(log);
  }
  
  return grouped;
}

/**
 * Export logs as JSON (for analysis)
 */
export function exportLogsAsJSON(): string {
  const logs = readConversationLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Generate a unique interaction ID
 */
export function generateInteractionId(): string {
  return `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
