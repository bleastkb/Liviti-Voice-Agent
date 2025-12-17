import type { NextApiRequest, NextApiResponse } from 'next';
import { AIResponse, SafetyLevel, MicroAction, MessageRole, MusicRequest, Reference } from '@/types';
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION } from '@/lib/prompts';
import { logConversation, generateInteractionId } from '@/lib/logger';

type ConversationItem = {
  role: MessageRole;
  content: string;
};

type RequestBody = {
  userMessage: string;
  conversationHistory: ConversationItem[];
  sessionId?: string;
  interactionType?: 'user_message' | 'micro_action_click';
  metadata?: Record<string, any>;
};

type LLMRawResponse = {
  message: string;
  safetyLevel: SafetyLevel;
  microActions?: MicroAction[];
  musicRequest?: MusicRequest;
};

const MAX_REFERENCES = 3;

const stripHtml = (snippet: string) =>
  snippet
    .replace(/<\/?span[^>]*>/g, '')
    .replace(/<\/?div[^>]*>/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function fetchPsychologyReferences(query: string): Promise<Reference[]> {
  if (!query || !query.trim()) {
    return [];
  }

  const searchQuery = `${query} psychology`;
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    searchQuery
  )}&utf8=&format=json&srlimit=${MAX_REFERENCES}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LivitiVoiceCoach/1.0',
      },
    });

    if (!res.ok) {
      console.error('[api/ai-response] Failed to fetch references:', res.status);
      return [];
    }

    const data = await res.json();
    const searchResults: Array<{ title: string; snippet: string }> = data?.query?.search || [];

    return searchResults.slice(0, MAX_REFERENCES).map((result) => {
      const title = result.title.trim();
      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s/g, '_'))}`;
      return {
        title,
        url,
        snippet: stripHtml(result.snippet || 'Reference from Wikipedia search results.'),
      };
    });
  } catch (error) {
    console.error('[api/ai-response] Error fetching references:', error);
    return [];
  }
}

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

  const {
    userMessage,
    conversationHistory,
    sessionId = 'unknown',
    interactionType = 'user_message',
    metadata = {},
  } = req.body as RequestBody;

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
    const baseUserMessageContent = buildUserMessage(userMessage, conversationHistory);

    const references = await fetchPsychologyReferences(userMessage);
    const referenceContext = references.length
      ? references
          .map(
            (ref, index) =>
              `${index + 1}. ${ref.title}\n   Summary: ${ref.snippet}\n   Source: ${ref.url}`
          )
          .join('\n')
      : 'No live references were found for this query.';

    const userMessageContent = `${baseUserMessageContent}

Research context (psychology references):
${referenceContext}

Use the research context when it strengthens your response, but never invent sources.`;

    // Default to gpt-5-nano; override via OPENAI_MODEL if needed
    const model = process.env.OPENAI_MODEL || 'gpt-5-nano';

    const startTime = Date.now();

    // Prepare the complete request payload
    const requestPayload = {
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userMessageContent },
      ],
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
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

    // Parse the JSON content from LLM
    let parsed: LLMRawResponse;
    let parseError: string | undefined;
    try {
      parsed = JSON.parse(content) as LLMRawResponse;
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'Unknown parsing error';
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

    const responseTime = Date.now() - startTime;

    const aiResponse: AIResponse = {
      message: parsed.message || '抱歉，我现在没能正常生成回应，但我依然在这里陪着你。',
      safetyLevel: safety,
      microActions: parsed.microActions?.map((m, index) => ({
        id: m.id || `llm-${index + 1}`,
        title: m.title,
        description: m.description,
      })),
      musicRequest: parsed.musicRequest,
      references,
    };

    // Log the conversation (async, don't block response)
    // Include complete LLM input/output for prompt improvement
    logConversation({
      sessionId,
      timestamp: new Date().toISOString(),
      interactionId: generateInteractionId(),
      type: interactionType,
      userMessage,
      aiResponse: {
        message: aiResponse.message,
        safetyLevel: aiResponse.safetyLevel,
        microActions: aiResponse.microActions,
        references: aiResponse.references,
      },
      systemPrompt,
      systemPromptVersion: PROMPT_VERSION,
      model,
      conversationHistory,
      // Complete LLM input (exactly what was sent to OpenAI)
      llmInput: {
        messages: requestPayload.messages,
        model: requestPayload.model,
        responseFormat: requestPayload.response_format,
      },
      // Complete LLM output (raw response before parsing)
      llmOutput: {
        rawResponse: json, // Full OpenAI API response
        rawContent: content, // The content string before JSON parsing
        parsedContent: parsed, // Successfully parsed content
        error: parseError, // Parsing error if any
      },
      metadata: {
        ...metadata,
        responseTimeMs: responseTime,
        tokenUsage: json.usage
          ? {
              promptTokens: json.usage.prompt_tokens,
              completionTokens: json.usage.completion_tokens,
              totalTokens: json.usage.total_tokens,
            }
          : undefined,
      },
    }).catch((err) => {
      console.error('[api/ai-response] Failed to log conversation:', err);
    });

    return res.status(200).json(aiResponse);
  } catch (error) {
    console.error('[api/ai-response] Unexpected error:', error);
    return res
      .status(500)
      .json({ error: 'Unexpected error while calling OpenAI LLM.' });
  }
}
