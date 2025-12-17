/**
 * Music Player Component
 * Embeds YouTube player for music playback
 */

import { useEffect, useRef, useState } from 'react';

interface MusicPlayerProps {
  videoId: string;
  title?: string;
  autoPlay?: boolean;
  onClose?: () => void;
}

export default function MusicPlayer({
  videoId,
  title = 'Music',
  autoPlay = true,
  onClose,
}: MusicPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // YouTube iframe API will be loaded
    setIsReady(true);
  }, [videoId]);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg w-full max-w-xs sm:max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <div>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500">Playing via YouTube</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close music player"
          >
            ✕
          </button>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%' }}>
        <iframe
          ref={playerRef}
          className="absolute top-0 left-0 w-full h-full"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Music can help create a calming atmosphere. Adjust volume as needed.
      </div>
    </div>
  );
}
