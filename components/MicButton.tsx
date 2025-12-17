/**
 * MicButton 组件
 * 大型麦克风按钮，用于开始/停止录音
 */

import { SessionState } from '@/types';

interface MicButtonProps {
  state: SessionState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export default function MicButton({
  state,
  onStartRecording,
  onStopRecording,
  disabled = false,
}: MicButtonProps) {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing' || state === 'responding';

  const handleClick = () => {
    if (disabled || isProcessing) return;
    
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={`
          w-24 h-24 rounded-full
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300'
              : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-300'
          }
          ${
            disabled || isProcessing
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer shadow-lg hover:shadow-xl'
          }
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-12 h-12 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {isRecording ? (
              <rect x="8" y="8" width="8" height="8" rx="1" />
            ) : (
              <>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </>
            )}
          </svg>
        )}
      </button>
      <p className="text-sm text-gray-600">
        {isRecording
          ? 'Recording...'
          : isProcessing
          ? 'Processing...'
          : 'Tap to start recording'}
      </p>
    </div>
  );
}

