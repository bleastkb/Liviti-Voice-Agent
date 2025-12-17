/**
 * Summary/Check-out 页面
 * 会话结束后的摘要页面，包含情绪检查按钮
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Message, MicroAction, EmotionCheckResult } from '@/types';
import MessageBubble from '@/components/MessageBubble';
import MicroActionCard from '@/components/MicroActionCard';

export default function SummaryPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [microActions, setMicroActions] = useState<MicroAction[]>([]);
  const [emotionResult, setEmotionResult] = useState<EmotionCheckResult | null>(null);

  useEffect(() => {
    // 从URL参数中恢复数据
    if (router.query.messages) {
      try {
        const parsedMessages = JSON.parse(router.query.messages as string);
        // 将timestamp字符串转换回Date对象
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    }

    if (router.query.microActions) {
      try {
        setMicroActions(JSON.parse(router.query.microActions as string));
      } catch (error) {
        console.error('解析微行动失败:', error);
      }
    }
  }, [router.query]);

  const handleEmotionCheck = (result: EmotionCheckResult) => {
    setEmotionResult(result);
    // 可以在这里保存结果到后端或本地存储
    console.log('情绪检查结果:', result);
  };

  const handleNewSession = () => {
    router.push('/session');
  };

  const handleBackHome = () => {
    router.push('/');
  };

  // 生成会话摘要文本
  const generateSummary = () => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    
    if (userMessages.length === 0) {
      return 'In this session, you shared your feelings and thoughts.';
    }

    return `In this session, you shared ${userMessages.length} message${userMessages.length > 1 ? 's' : ''}, and the AI coach provided ${assistantMessages.length} response${assistantMessages.length > 1 ? 's' : ''}.`;
  };

  return (
    <>
      <Head>
        <title>Session Summary - Voice AI Coach</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 标题 */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Summary</h1>
            <p className="text-gray-600">{generateSummary()}</p>
          </div>

          {/* 消息回顾 */}
          {messages.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversation Review</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>
            </div>
          )}

          {/* 微行动建议 */}
          {microActions.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Suggested Micro-Actions</h2>
              <div className="grid gap-3">
                {microActions.map((action) => (
                  <MicroActionCard key={action.id} action={action} />
                ))}
              </div>
            </div>
          )}

          {/* 情绪检查 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              How are you feeling now?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleEmotionCheck('better')}
                disabled={emotionResult !== null}
                className={`
                  px-8 py-4 rounded-lg font-semibold text-lg transition-all
                  ${
                    emotionResult === 'better'
                      ? 'bg-green-500 text-white'
                      : emotionResult === null
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                😊 Better
              </button>
              <button
                onClick={() => handleEmotionCheck('same')}
                disabled={emotionResult !== null}
                className={`
                  px-8 py-4 rounded-lg font-semibold text-lg transition-all
                  ${
                    emotionResult === 'same'
                      ? 'bg-yellow-500 text-white'
                      : emotionResult === null
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                😐 Same
              </button>
              <button
                onClick={() => handleEmotionCheck('worse')}
                disabled={emotionResult !== null}
                className={`
                  px-8 py-4 rounded-lg font-semibold text-lg transition-all
                  ${
                    emotionResult === 'worse'
                      ? 'bg-red-500 text-white'
                      : emotionResult === null
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                😔 Worse
              </button>
            </div>
            {emotionResult && (
              <p className="text-center text-gray-600 mt-4">
                Thank you for your feedback! {emotionResult === 'better' && "I'm glad to hear you're feeling better."}
                {emotionResult === 'same' && 'Thank you for your honest feedback.'}
                {emotionResult === 'worse' && 'If you need more support, please consider reaching out to a professional.'}
              </p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleNewSession}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start New Session
            </button>
            <button
              onClick={handleBackHome}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

