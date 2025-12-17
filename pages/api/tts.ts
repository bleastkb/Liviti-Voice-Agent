import type { NextApiRequest, NextApiResponse } from 'next';

type RequestBody = {
  text: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/tts] OPENAI_API_KEY not set');
    return res.status(500).json({ error: 'OpenAI API key not configured on server.' });
  }

  const { text } = req.body as RequestBody;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
    const voice = process.env.OPENAI_TTS_VOICE || 'alloy';

    const openaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        format: 'mp3',
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('[api/tts] OpenAI TTS error:', openaiRes.status, text);
      return res.status(500).json({ error: 'Failed to synthesize speech with OpenAI.' });
    }

    const audioArrayBuffer = await openaiRes.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length.toString());
    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error('[api/tts] Unexpected error:', error);
    return res.status(500).json({ error: 'Unexpected error while calling OpenAI TTS.' });
  }
}


