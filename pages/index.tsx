/**
 * Home/Welcome 页面
 * 应用的入口页面，包含简短说明和"开始会话"按钮
 */

import { useRouter } from 'next/router';
import Head from 'next/head';

export default function HomePage() {
  const router = useRouter();

  const handleStartSession = () => {
    router.push('/session');
  };

  return (
    <>
      <Head>
        <title>Voice AI Coach - Your Emotional Support Companion</title>
        <meta name="description" content="A safe voice AI coach to help you release work stress in the evening" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* 标题和描述 */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Voice AI Coach
            </h1>
            <p className="text-xl text-gray-600">
              Your Emotional Support Companion
            </p>
          </div>

          {/* 说明文字 */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4 text-left">
            <p className="text-gray-700 leading-relaxed">
              After a long day at work, sometimes we just need a safe space to vent.
              Voice AI Coach is here to listen to your voice and help you process work stress, especially boss-related stress.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm">
              <li>Express your feelings safely through voice</li>
              <li>Receive emotional validation and understanding</li>
              <li>Get gentle reflective questions</li>
              <li>Receive practical micro-action suggestions</li>
            </ul>
          </div>

          {/* 开始按钮 */}
          <button
            onClick={handleStartSession}
            className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-300"
          >
            Start Session
          </button>

          {/* 免责声明 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ Important Notice</p>
            <p>
              This is not a professional therapy service and is not intended for emergencies.
              If you are experiencing a mental health crisis, please contact your local mental health hotline or emergency services immediately.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

