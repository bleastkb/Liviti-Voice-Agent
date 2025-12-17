/**
 * MessageList 组件
 * 显示消息列表、音乐播放器和微行动卡片
 */

import { useMemo } from 'react';
import { Message, MicroAction, MusicPlayerInstance } from '@/types';
import MessageBubble from './MessageBubble';
import MicroActionCard from './MicroActionCard';
import MusicPlayer from './MusicPlayer';

interface MessageListProps {
  messages: Message[];
  microActions?: MicroAction[];
  onMicroActionClick?: (action: MicroAction) => void;
  musicPlayers?: MusicPlayerInstance[];
  onCloseMusicPlayer?: (playerId: string) => void;
}

export default function MessageList({
  messages,
  microActions,
  onMicroActionClick,
  musicPlayers = [],
  onCloseMusicPlayer,
}: MessageListProps) {
  const playersByMessage = useMemo(() => {
    return musicPlayers.reduce<Record<string, MusicPlayerInstance[]>>((acc, player) => {
      if (!acc[player.triggerMessageId]) {
        acc[player.triggerMessageId] = [];
      }
      acc[player.triggerMessageId].push(player);
      return acc;
    }, {});
  }, [musicPlayers]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Start your first conversation...</p>
        </div>
      ) : (
        <>
          {messages.map((message) => {
            const relatedPlayers = playersByMessage[message.id] || [];

            return (
              <div key={message.id} className="space-y-3">
                <MessageBubble message={message} />
                {relatedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <MusicPlayer
                      videoId={player.videoId}
                      title={player.title}
                      autoPlay
                      onClose={onCloseMusicPlayer ? () => onCloseMusicPlayer(player.id) : undefined}
                    />
                  </div>
                ))}
              </div>
            );
          })}
          
          {microActions && microActions.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                💡 Suggested Micro-Actions:
              </h3>
              <div className="grid gap-3">
                {microActions.map((action) => (
                  <MicroActionCard
                    key={action.id}
                    action={action}
                    onClick={onMicroActionClick}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
