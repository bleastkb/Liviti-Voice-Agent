import type { NextApiRequest, NextApiResponse } from 'next';
import { AIResponse, SafetyLevel, MicroAction, MessageRole } from '@/types';
import { buildSystemPrompt, buildUserMessage } from '@/lib/prompts';

type ConversationItem = {
  role: MessageRole;
  content: string;
};

type RequestBody = {
  userMessage: string;
  conversationHistory: ConversationItem[];
};

type LLMRawResponse = {
  message: string;
  safetyLevel: SafetyLevel;
  microActions?: MicroAction[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/ai-response] OPENAI_API_KEY not set');
    return res.status(500).json({ error: 'OpenAI API key not configured on server.' });
  }

  const { userMessage, conversationHistory } = req.body as RequestBody;

  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: 'userMessage is required' });
  }

  try {
    // Build system prompt: core (cacheable) + dynamic context (if any)
    const systemPrompt = buildSystemPrompt({
      // Add dynamic context here if needed in the future:
      // userPreferences: '...',
      // sessionMetadata: '...',
    });

    // Build user message: current message + formatted conversation history
    const userMessageContent = buildUserMessage(userMessage, conversationHistory);

    // Default to gpt-5-nano; override via OPENAI_MODEL if needed
    const model = process.env.OPENAI_MODEL || 'gpt-5-nano';

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessageContent },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('[api/ai-response] OpenAI error:', openaiRes.status, text);
      return res
        .status(500)
        .json({ error: 'Failed to get response from OpenAI LLM.' });
    }

    const json = await openaiRes.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[api/ai-response] Empty content from OpenAI:', json);
      return res.status(500).json({ error: 'Empty response from OpenAI LLM.' });
    }

    let parsed: LLMRawResponse;
    try {
      parsed = JSON.parse(content) as LLMRawResponse;
    } catch (e) {
      console.error('[api/ai-response] Failed to parse JSON content from OpenAI:', content);
      return res
        .status(500)
        .json({ error: 'Invalid JSON format returned by OpenAI LLM.' });
    }

    // 兜底校验 safetyLevel
    const safety: SafetyLevel =
      parsed.safetyLevel === 'caution' || parsed.safetyLevel === 'crisis'
        ? parsed.safetyLevel
        : 'safe';

    const aiResponse: AIResponse = {
      message: parsed.message || '抱歉，我现在没能正常生成回应，但我依然在这里陪着你。',
      safetyLevel: safety,
      microActions: parsed.microActions?.map((m, index) => ({
        id: m.id || `llm-${index + 1}`,
        title: m.title,
        description: m.description,
      })),
    };

    return res.status(200).json(aiResponse);
  } catch (error) {
    console.error('[api/ai-response] Unexpected error:', error);
    return res
      .status(500)
      .json({ error: 'Unexpected error while calling OpenAI LLM.' });
  }
}


