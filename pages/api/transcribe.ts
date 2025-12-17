import type { NextApiRequest, NextApiResponse } from 'next';

type RequestBody = {
  audioBase64: string;
  mimeType?: string;
};

type SuccessResponse = {
  transcript: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/transcribe] OPENAI_API_KEY not set');
    return res.status(500).json({ error: 'OpenAI API key not configured on server.' });
  }

  const { audioBase64, mimeType } = req.body as RequestBody;

  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Node 18+ 全局提供 Blob & FormData，可直接使用
    const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
    const formData = new FormData();

    // 文件名后缀对 Whisper 不敏感，这里统一用 webm
    formData.append('file', blob, 'audio.webm');

    const model = process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe';
    formData.append('model', model);
    formData.append('response_format', 'json');

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('[api/transcribe] OpenAI STT error:', openaiRes.status, text);
      return res.status(500).json({ error: 'Failed to transcribe audio with OpenAI.' });
    }

    const json = await openaiRes.json();
    const transcript: string | undefined = json?.text;

    if (!transcript) {
      console.error('[api/transcribe] Empty transcript from OpenAI:', json);
      return res.status(500).json({ error: 'Empty transcript returned by OpenAI.' });
    }

    return res.status(200).json({ transcript });
  } catch (error) {
    console.error('[api/transcribe] Unexpected error:', error);
    return res.status(500).json({ error: 'Unexpected error while calling OpenAI STT.' });
  }
}


