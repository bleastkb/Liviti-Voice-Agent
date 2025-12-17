/**
 * API endpoint to view conversation logs
 * GET /api/logs - Get all logs
 * GET /api/logs?sessionId=xxx - Get logs for a specific session
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  readConversationLogs,
  getSessionLogs,
  getLogsBySession,
  exportLogsAsJSON,
} from '@/lib/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { sessionId, format, groupBy } = req.query;

  try {
    if (sessionId && typeof sessionId === 'string') {
      // Get logs for specific session
      const logs = getSessionLogs(sessionId);
      return res.status(200).json({ sessionId, logs, count: logs.length });
    }

    if (groupBy === 'session') {
      // Group logs by session
      const grouped = getLogsBySession();
      return res.status(200).json({ grouped, sessionCount: Object.keys(grouped).length });
    }

    if (format === 'json') {
      // Export as formatted JSON
      const json = exportLogsAsJSON();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="conversations.json"');
      return res.status(200).send(json);
    }

    // Get all logs
    const logs = readConversationLogs();
    return res.status(200).json({ logs, count: logs.length });
  } catch (error) {
    console.error('[api/logs] Error:', error);
    return res.status(500).json({ error: 'Failed to read logs' });
  }
}

