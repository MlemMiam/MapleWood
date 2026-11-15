import React, { useEffect, useRef, useState } from 'react';
import type { CutsceneSubtitleState } from '../engine/PostCustomCutscene';

interface PostCustomCutsceneOverlayProps {
  subtitle: CutsceneSubtitleState | null;
  onSkip: () => void;
  onVoiceBlip?: (char: string, speaker: string) => void;
}

export const PostCustomCutsceneOverlay: React.FC<PostCustomCutsceneOverlayProps> = ({
  subtitle,
  onSkip,
  onVoiceBlip,
}) => {
  const [typedCount, setTypedCount] = useState(0);
  const lastBlipTimeRef = useRef(0);

  const fullText = subtitle?.text ?? '';
  const speaker = subtitle?.speaker ?? '';

  useEffect(() => {
    if (!fullText) {
      setTypedCount(0);
      return;
    }
    setTypedCount(1);
    let idx = 1;
    const firstCh = fullText[0] ?? '';
    if (onVoiceBlip && /[a-zA-ZÀ-ÿ0-9]/.test(firstCh)) {
      lastBlipTimeRef.current = performance.now();
      onVoiceBlip(firstCh, speaker);
    }

    const interval = window.setInterval(() => {
      idx += 1;
      setTypedCount(idx);
      const ch = fullText[idx - 1] ?? '';
      const nowMs = performance.now();
      if (onVoiceBlip && /[a-zA-ZÀ-ÿ0-9]/.test(ch) && nowMs - lastBlipTimeRef.current >= 58) {
        lastBlipTimeRef.current = nowMs;
        onVoiceBlip(ch, speaker);
      }
      if (idx >= fullText.length) {
        window.clearInterval(interval);
      }
    }, 36);
    return () => window.clearInterval(interval);
  }, [fullText, speaker, onVoiceBlip]);

  const displayedText = fullText.slice(0, typedCount);
  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none flex flex-col justify-between">
      {/* Top Anime Letterbox Bar + Skip Button */}
      <div className="w-full h-9 md:h-11 bg-black/90 flex items-center justify-end px-4 md:px-6 pointer-events-auto">
        <button
          type="button"
          onClick={onSkip}
          className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase text-white/75 hover:text-white border border-white/20 hover:border-rose-400/80 transition-colors cursor-pointer"
        >
          Passer ⏭
        </button>
      </div>

      {/* Bottom Cinematic Subtitle + Letterbox Bar */}
      <div className="w-full">
        {subtitle && (
          <div
            className="w-full pb-5 pt-10 px-6 md:px-14 animate-fadeIn"
            style={{
              background:
                'linear-gradient(to top, rgba(12, 10, 18, 0.85) 0%, rgba(12, 10, 18, 0.45) 55%, rgba(12, 10, 18, 0) 100%)',
            }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-3xl md:text-4xl font-bold text-rose-300 tracking-wide inline-flex items-center gap-2"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow:
                      '0 2px 14px rgba(225, 29, 72, 0.55), 0 1px 4px rgba(0, 0, 0, 0.85)',
                  }}
                >
                  <span>{subtitle.speaker}</span>
                  <span className="text-rose-500 text-2xl md:text-3xl leading-none">♡</span>
                </span>
              </div>
              <div className="border-l-2 border-rose-500 pl-4 py-0.5">
                <p
                  className="text-white text-base md:text-xl font-medium leading-relaxed"
                  style={{ textShadow: '0 1px 8px rgba(0, 0, 0, 0.9)' }}
                >
                  {displayedText}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="w-full h-9 md:h-11 bg-black/90" />
      </div>
    </div>
  );
};
