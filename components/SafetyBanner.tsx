/**
 * SafetyBanner 组件
 * 当检测到高风险内容时显示的安全横幅
 */

import { SafetyLevel } from '@/types';

interface SafetyBannerProps {
  safetyLevel: SafetyLevel;
  onDismiss?: () => void;
}

export default function SafetyBanner({ safetyLevel, onDismiss }: SafetyBannerProps) {
  if (safetyLevel === 'safe') {
    return null;
  }

  const isCrisis = safetyLevel === 'crisis';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 p-4 ${
        isCrisis ? 'bg-red-50 border-b-2 border-red-500' : 'bg-amber-50 border-b-2 border-amber-500'
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-semibold mb-2 ${isCrisis ? 'text-red-800' : 'text-amber-800'}`}>
              {isCrisis ? '⚠️ Immediate Attention Needed' : '💛 Please Note'}
            </h3>
            <p className={`text-sm ${isCrisis ? 'text-red-700' : 'text-amber-700'} mb-2`}>
              {isCrisis
                ? 'I noticed you mentioned some concerning content. Please remember, I am an AI assistant and cannot replace professional mental health support.'
                : 'If you are experiencing significant difficulty, please consider reaching out to someone you trust or seeking professional support.'}
            </p>
            <div className={`text-sm ${isCrisis ? 'text-red-700' : 'text-amber-700'}`}>
              <p className="font-medium mb-1">Suggestions:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Contact a trusted friend, family member, or colleague</li>
                <li>Call your local mental health hotline or emergency services</li>
                <li>Seek professional mental health support</li>
              </ul>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`ml-4 px-3 py-1 text-sm rounded ${
                isCrisis
                  ? 'text-red-700 hover:bg-red-100'
                  : 'text-amber-700 hover:bg-amber-100'
              }`}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

