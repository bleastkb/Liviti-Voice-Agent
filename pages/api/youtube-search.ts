/**
 * YouTube Search API
 * Searches for music videos based on query
 */

import type { NextApiRequest, NextApiResponse } from 'next';

type YouTubeSearchResponse = {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<YouTubeSearchResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body as { query?: string };

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required' });
  }

  // Use YouTube Data API v3
  // Note: You'll need to set YOUTUBE_API_KEY in your .env.local
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error('[api/youtube-search] YOUTUBE_API_KEY not set');
    // Fallback: return a placeholder video ID (you can use a default calming music video)
    return res.status(200).json({
      videoId: 'jfKfPfyJRdk', // Default: Lofi Hip Hop Radio
      title: 'Calming Music',
      thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg',
      channelTitle: 'Liviti',
    });
  }

  try {
    // Search for music videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(query + ' music')}&maxResults=1&key=${apiKey}`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      const text = await response.text();
      console.error('[api/youtube-search] YouTube API error:', response.status, text);
      
      // Fallback to default video
      return res.status(200).json({
        videoId: 'jfKfPfyJRdk',
        title: 'Calming Music',
        thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg',
        channelTitle: 'Liviti',
      });
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      // Fallback to default video
      return res.status(200).json({
        videoId: 'jfKfPfyJRdk',
        title: 'Calming Music',
        thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg',
        channelTitle: 'Liviti',
      });
    }

    const video = data.items[0];
    const videoId = video.id.videoId;
    const snippet = video.snippet;

    return res.status(200).json({
      videoId,
      title: snippet.title,
      thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      channelTitle: snippet.channelTitle,
    });
  } catch (error) {
    console.error('[api/youtube-search] Error:', error);
    
    // Fallback to default video
    return res.status(200).json({
      videoId: 'jfKfPfyJRdk',
      title: 'Calming Music',
      thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg',
      channelTitle: 'Liviti',
    });
  }
}

