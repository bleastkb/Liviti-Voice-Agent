/**
 * Logs Viewer Page
 * View and analyze conversation logs for LLM/prompt improvement
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ConversationLog } from '@/lib/logger';

export default function LogsPage() {
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<Record<string, ConversationLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'by_session'>('by_session');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs?groupBy=session');
      const data = await res.json();
      setGroupedLogs(data.grouped || {});
      
      // Also load all logs for detailed view
      const allRes = await fetch('/api/logs');
      const allData = await allRes.json();
      setLogs(allData.logs || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const res = await fetch('/api/logs?format=json');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('Failed to export logs');
    }
  };

  const sessions = Object.keys(groupedLogs);
  const displayLogs = selectedSession
    ? groupedLogs[selectedSession] || []
    : viewMode === 'by_session'
    ? []
    : logs;

  return (
    <>
      <Head>
        <title>Conversation Logs - Voice AI Coach</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Conversation Logs</h1>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode(viewMode === 'all' ? 'by_session' : 'all')}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {viewMode === 'all' ? 'Group by Session' : 'Show All'}
                </button>
                <button
                  onClick={exportLogs}
                  className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Export JSON
                </button>
                <button
                  onClick={loadLogs}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>Total sessions: {sessions.length}</p>
              <p>Total interactions: {logs.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading logs...</div>
          ) : viewMode === 'by_session' ? (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                  No conversation logs yet. Start a session to generate logs.
                </div>
              ) : (
                sessions.map((sessionId) => {
                  const sessionLogs = groupedLogs[sessionId];
                  const isSelected = selectedSession === sessionId;
                  
                  return (
                    <div
                      key={sessionId}
                      className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedSession(isSelected ? null : sessionId)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{sessionId}</h3>
                          <p className="text-sm text-gray-600">
                            {sessionLogs.length} interaction(s) •{' '}
                            {sessionLogs[0]?.timestamp
                              ? new Date(sessionLogs[0].timestamp).toLocaleString()
                              : 'Unknown time'}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {isSelected ? '▼' : '▶'}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          {sessionLogs.map((log, idx) => (
                            <div
                              key={log.interactionId}
                              className="bg-gray-50 rounded-lg p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{log.type}</span>
                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              
                              {log.userMessage && (
                                <div className="bg-blue-50 rounded p-2">
                                  <p className="text-xs font-medium text-blue-900 mb-1">User:</p>
                                  <p className="text-sm text-blue-800">{log.userMessage}</p>
                                </div>
                              )}
                              
                              {log.aiResponse && (
                                <div className="bg-green-50 rounded p-2">
                                  <p className="text-xs font-medium text-green-900 mb-1">Liviti:</p>
                                  <p className="text-sm text-green-800">{log.aiResponse.message}</p>
                                  {log.aiResponse.microActions && log.aiResponse.microActions.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-green-900 mb-1">Micro-Actions:</p>
                                      <ul className="text-xs text-green-700 space-y-1">
                                        {log.aiResponse.microActions.map((ma) => (
                                          <li key={ma.id}>• {ma.title}: {ma.description}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <p className="text-xs text-green-700 mt-1">
                                    Safety: {log.aiResponse.safetyLevel}
                                  </p>
                                </div>
                              )}

                              <div className="text-xs text-gray-500 space-y-1">
                                <p>Model: {log.model}</p>
                                <p>Prompt Version: {log.systemPromptVersion || 'unknown'}</p>
                                {log.metadata?.responseTimeMs && (
                                  <p>Response Time: {log.metadata.responseTimeMs}ms</p>
                                )}
                                {log.metadata?.tokenUsage && (
                                  <p>
                                    Tokens: {log.metadata.tokenUsage.totalTokens} (
                                    {log.metadata.tokenUsage.promptTokens} prompt +{' '}
                                    {log.metadata.tokenUsage.completionTokens} completion)
                                  </p>
                                )}
                              </div>

                              {/* LLM Input/Output Details for Prompt Improvement */}
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedLogs);
                                    if (newExpanded.has(log.interactionId)) {
                                      newExpanded.delete(log.interactionId);
                                    } else {
                                      newExpanded.add(log.interactionId);
                                    }
                                    setExpandedLogs(newExpanded);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  {expandedLogs.has(log.interactionId)
                                    ? '▼ Hide LLM Input/Output'
                                    : '▶ Show LLM Input/Output (for prompt improvement)'}
                                </button>

                                {expandedLogs.has(log.interactionId) && (
                                  <div className="mt-2 space-y-3">
                                    {/* LLM Input */}
                                    {log.llmInput && (
                                      <div className="bg-blue-50 rounded p-3">
                                        <p className="text-xs font-semibold text-blue-900 mb-2">
                                          📥 LLM Input (sent to OpenAI):
                                        </p>
                                        <pre className="text-xs text-blue-800 overflow-x-auto whitespace-pre-wrap break-words">
                                          {JSON.stringify(log.llmInput, null, 2)}
                                        </pre>
                                      </div>
                                    )}

                                    {/* System Prompt */}
                                    {log.systemPrompt && (
                                      <div className="bg-purple-50 rounded p-3">
                                        <p className="text-xs font-semibold text-purple-900 mb-2">
                                          📋 System Prompt:
                                        </p>
                                        <pre className="text-xs text-purple-800 overflow-x-auto whitespace-pre-wrap break-words">
                                          {log.systemPrompt}
                                        </pre>
                                      </div>
                                    )}

                                    {/* LLM Raw Output */}
                                    {log.llmOutput && (
                                      <div className="bg-green-50 rounded p-3">
                                        <p className="text-xs font-semibold text-green-900 mb-2">
                                          📤 LLM Raw Output (from OpenAI):
                                        </p>
                                        {log.llmOutput.error && (
                                          <p className="text-xs text-red-600 mb-2">
                                            ⚠️ Parsing Error: {log.llmOutput.error}
                                          </p>
                                        )}
                                        <div className="space-y-2">
                                          <div>
                                            <p className="text-xs font-medium text-green-900 mb-1">
                                              Raw Content (before parsing):
                                            </p>
                                            <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded">
                                              {log.llmOutput.rawContent || 'N/A'}
                                            </pre>
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium text-green-900 mb-1">
                                              Parsed Content:
                                            </p>
                                            <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded">
                                              {JSON.stringify(log.llmOutput.parsedContent, null, 2)}
                                            </pre>
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium text-green-900 mb-1">
                                              Full API Response:
                                            </p>
                                            <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded max-h-96 overflow-y-auto">
                                              {JSON.stringify(log.llmOutput.rawResponse, null, 2)}
                                            </pre>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                  No conversation logs yet.
                </div>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogs.has(log.interactionId);
                  return (
                    <div key={log.interactionId} className="bg-white rounded-lg shadow-sm p-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{log.sessionId} • {log.type}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.userMessage && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>User:</strong> {log.userMessage}
                        </p>
                      )}
                      {log.aiResponse && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Liviti:</strong> {log.aiResponse.message}
                        </p>
                      )}

                      {/* LLM Input/Output Details */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedLogs);
                            if (newExpanded.has(log.interactionId)) {
                              newExpanded.delete(log.interactionId);
                            } else {
                              newExpanded.add(log.interactionId);
                            }
                            setExpandedLogs(newExpanded);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {isExpanded
                            ? '▼ Hide LLM Input/Output'
                            : '▶ Show LLM Input/Output (for prompt improvement)'}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-3">
                            {log.llmInput && (
                              <div className="bg-blue-50 rounded p-3">
                                <p className="text-xs font-semibold text-blue-900 mb-2">
                                  📥 LLM Input:
                                </p>
                                <pre className="text-xs text-blue-800 overflow-x-auto whitespace-pre-wrap break-words">
                                  {JSON.stringify(log.llmInput, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.systemPrompt && (
                              <div className="bg-purple-50 rounded p-3">
                                <p className="text-xs font-semibold text-purple-900 mb-2">
                                  📋 System Prompt:
                                </p>
                                <pre className="text-xs text-purple-800 overflow-x-auto whitespace-pre-wrap break-words">
                                  {log.systemPrompt}
                                </pre>
                              </div>
                            )}
                            {log.llmOutput && (
                              <div className="bg-green-50 rounded p-3">
                                <p className="text-xs font-semibold text-green-900 mb-2">
                                  📤 LLM Raw Output:
                                </p>
                                <div className="space-y-2">
                                  {log.llmOutput.rawContent && (
                                    <div>
                                      <p className="text-xs font-medium text-green-900 mb-1">
                                        Raw Content:
                                      </p>
                                      <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded">
                                        {log.llmOutput.rawContent}
                                      </pre>
                                    </div>
                                  )}
                                  {log.llmOutput.parsedContent && (
                                    <div>
                                      <p className="text-xs font-medium text-green-900 mb-1">
                                        Parsed Content:
                                      </p>
                                      <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded">
                                        {JSON.stringify(log.llmOutput.parsedContent, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.llmOutput.rawResponse && (
                                    <div>
                                      <p className="text-xs font-medium text-green-900 mb-1">
                                        Full API Response:
                                      </p>
                                      <pre className="text-xs text-green-800 overflow-x-auto whitespace-pre-wrap break-words bg-white p-2 rounded max-h-96 overflow-y-auto">
                                        {JSON.stringify(log.llmOutput.rawResponse, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

