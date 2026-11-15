import React, { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

interface IntroCutsceneOverlayProps {
  introTime: number;
  duration: number;
  onFinish: () => void;
  onReplay: () => void;
  onReplayVoice: (phaseIndex: 0 | 1) => void;
  onVoiceBlip?: (char: string) => void;
}

export const FLORIE_INTRO_LINES: [string, string] = [
  "Bonjour ! Bienvenue à Maplewood ! Je m'appelle Florie, je suis trop contente que tu sois ici !",
  "Allez viens, suis-moi à l'intérieur du bâtiment ! Je vais te faire visiter tout le campus !",
];

export const IntroCutsceneOverlay: React.FC<IntroCutsceneOverlayProps> = ({
  introTime,
  duration,
  onFinish,
  onReplay,
  onVoiceBlip,
}) => {
  const isBeckonPhase = introTime >= 6.2;
  const activeLineIndex: 0 | 1 = isBeckonPhase ? 1 : 0;
  const fullText = FLORIE_INTRO_LINES[activeLineIndex];

  const phaseElapsed = isBeckonPhase ? introTime - 6.2 : introTime;
  const charCount = Math.min(fullText.length, Math.max(1, Math.floor(phaseElapsed * 25)));
  const displayedText = fullText.slice(0, charCount);
  const progressPct = Math.min(100, Math.max(0, (introTime / duration) * 100));

  const lastBlipRef = useRef<{ line: number; count: number; timeMs: number }>({
    line: -1,
    count: 0,
    timeMs: 0,
  });

  useEffect(() => {
    if (!onVoiceBlip) return;
    const prev = lastBlipRef.current;
    if (prev.line !== activeLineIndex) {
      prev.line = activeLineIndex;
      prev.count = 0;
    }
    if (charCount > prev.count) {
      const ch = fullText[charCount - 1] ?? '';
      prev.count = charCount;
      const nowMs = performance.now();
      if (/[a-zA-ZÀ-ÿ0-9]/.test(ch) && nowMs - prev.timeMs >= 58) {
        prev.timeMs = nowMs;
        onVoiceBlip(ch);
      }
    }
  }, [activeLineIndex, charCount, fullText, onVoiceBlip]);

  const fadeStart = Math.max(0, duration - 0.75);
  const fadeT = Math.min(1, Math.max(0, (introTime - fadeStart) / 0.7));
  const fadeToBlackOpacity = fadeT * fadeT * (3 - 2 * fadeT);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        onFinish();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between select-none overflow-hidden"
      data-testid="intro-cutscene-overlay"
    >
      {/* Top Anime Letterbox Bar */}
      <div className="relative z-10 w-full h-10 md:h-11 bg-black/90 px-4 md:px-6 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5 text-xs text-white/75">
          <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[10px] font-bold uppercase tracking-wider">
            Prologue
          </span>
          <span className="hidden sm:inline font-medium">
            Entrée Principale · Lycée Maplewood
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReplay();
            }}
            className="px-3 py-1 rounded-full border border-white/20 text-[11px] font-semibold text-white/75 hover:text-white hover:border-rose-400/80 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Rejouer</span>
          </button>

          <button
            type="button"
            data-testid="skip-intro-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onFinish();
            }}
            className="px-3 py-1 rounded-full border border-white/20 text-[11px] font-semibold uppercase tracking-wider text-white/80 hover:text-white hover:border-rose-400/80 transition-colors cursor-pointer"
          >
            Passer [Espace] ⏭
          </button>
        </div>
      </div>

      {/* Bottom Borderless Anime Dialogue Subtitle + Letterbox Bar */}
      <div className="relative z-10 w-full">
        <div
          className="w-full pb-5 pt-12 px-6 md:px-14"
          style={{
            background:
              'linear-gradient(to top, rgba(12, 10, 18, 0.84) 0%, rgba(12, 10, 18, 0.44) 55%, rgba(12, 10, 18, 0) 100%)',
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-baseline gap-2.5 mb-1">
              <span
                className="text-3xl md:text-4xl font-bold text-rose-300 tracking-wide inline-flex items-center gap-2"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow:
                    '0 2px 14px rgba(225, 29, 72, 0.55), 0 1px 4px rgba(0, 0, 0, 0.85)',
                }}
              >
                <span>Florie</span>
                <span className="text-rose-500 text-2xl md:text-3xl leading-none">♡</span>
              </span>
              <span className="text-xs font-medium text-rose-200/75 tracking-wide">
                {isBeckonPhase ? 'Te fait signe vers le hall' : 'Comité d’Accueil'}
              </span>
            </div>

            <div className="border-l-2 border-rose-500 pl-4 py-0.5">
              <p
                className="text-white text-base md:text-xl font-medium leading-relaxed min-h-[2.2rem]"
                style={{ textShadow: '0 1px 8px rgba(0, 0, 0, 0.9)' }}
                data-testid="intro-dialogue-text"
              >
                {displayedText}
              </p>
            </div>
          </div>
        </div>

        {/* Thin Rose Timeline Accent + Bottom Letterbox Bar */}
        <div className="w-full h-0.5 bg-white/10">
          <div
            className="h-full bg-rose-500 transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="w-full h-9 md:h-11 bg-black/90" />
      </div>

      {fadeToBlackOpacity > 0.005 && (
        <div
          className="fixed inset-0 z-40 bg-black pointer-events-none"
          style={{ opacity: fadeToBlackOpacity }}
        />
      )}
    </div>
  );
};
