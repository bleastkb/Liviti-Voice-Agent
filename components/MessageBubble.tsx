/**
 * MessageBubble 组件
 * 显示单条消息的气泡
 */

import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={`text-xs mt-1 ${
            isUser ? 'text-indigo-100' : 'text-gray-500'
          }`}
        >
          {message.timestamp.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {message.references && message.references.length > 0 && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
              isUser
                ? 'border-indigo-200 bg-indigo-400/20 text-indigo-50'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <p
              className={`font-semibold mb-1 uppercase tracking-wide text-[11px] ${
                isUser ? 'text-indigo-100' : 'text-gray-600'
              }`}
            >
              Appendix
            </p>
            <ol className="list-decimal space-y-1 pl-4">
              {message.references.map((ref, index) => (
                <li key={`${ref.url}-${index}`}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={`font-medium ${
                      isUser ? 'text-white underline' : 'text-indigo-600 hover:text-indigo-800'
                    }`}
                  >
                    {ref.title}
                  </a>
                  {ref.snippet && (
                    <p className={isUser ? 'text-indigo-50/90' : 'text-gray-600'}>
                      {ref.snippet}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
