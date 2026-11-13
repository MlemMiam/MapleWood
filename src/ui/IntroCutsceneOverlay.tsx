import React, { useEffect, useState } from 'react';
import { Film, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';

interface IntroCutsceneOverlayProps {
  introTime: number;
  duration: number;
  onFinish: () => void;
  onReplay: () => void;
  onReplayVoice: (phaseIndex: 0 | 1, text: string) => void;
}

export const FLORIE_INTRO_LINES: [string, string] = [
  "Coucou ! Bienvenue à Maplewood ! Je m'appelle Florie, je suis trop contente de te voir aujourd'hui !",
  "Allez viens, suis-moi à l'intérieur du bâtiment ! Je vais te faire visiter tout le campus !",
];

export const IntroCutsceneOverlay: React.FC<IntroCutsceneOverlayProps> = ({
  introTime,
  duration,
  onFinish,
  onReplay,
  onReplayVoice,
}) => {
  const isBeckonPhase = introTime >= 4.8;
  const activeLineIndex: 0 | 1 = isBeckonPhase ? 1 : 0;
  const fullText = FLORIE_INTRO_LINES[activeLineIndex];

  // Typewriter effect synced to phase time
  const phaseElapsed = isBeckonPhase ? introTime - 4.8 : introTime;
  const charCount = Math.min(fullText.length, Math.max(1, Math.floor(phaseElapsed * 36)));
  const displayedText = fullText.slice(0, charCount);

  const [aiVideoUrl, setAiVideoUrl] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);

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

  const handleGenerateAiVideo = async () => {
    if (generatingVideo) return;
    setGeneratingVideo(true);
    setVideoNotice(null);
    try {
      const res = await fetch('/api/intro/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.videoUrl) {
        setVideoNotice(
          'Mode Cinématique 3D Anime Temps Réel actif (Clé API payante optionnelle pour le rendu vidéo Omni).'
        );
      } else {
        setAiVideoUrl(data.videoUrl);
      }
    } catch {
      setVideoNotice('Mode Cinématique 3D Anime Temps Réel actif.');
    } finally {
      setGeneratingVideo(false);
    }
  };

  const progressPct = Math.min(100, Math.max(0, (introTime / duration) * 100));

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between select-none overflow-hidden"
      data-testid="intro-cutscene-overlay"
    >
      {/* Warm Anime Sunlight Bloom & Floating Sparkles */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 24%, rgba(253, 224, 71, 0.16) 0%, rgba(244, 114, 182, 0.08) 42%, rgba(15, 23, 42, 0.28) 100%)',
        }}
      />

      {/* Decorative Anime Sparkles & Floating Petals */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[16%] left-[18%] text-amber-200 font-bold text-2xl animate-pulse"
          style={{ textShadow: '0 0 12px rgba(251, 191, 36, 0.9)' }}
        >
          ✦
        </div>
        <div
          className="absolute top-[22%] right-[21%] text-amber-100 font-bold text-xl animate-bounce"
          style={{ textShadow: '0 0 12px rgba(251, 191, 36, 0.9)' }}
        >
          ✨
        </div>
        <div
          className="absolute top-[34%] left-[26%] text-pink-200 font-bold text-lg animate-pulse"
          style={{ textShadow: '0 0 10px rgba(244, 114, 182, 0.8)' }}
        >
          ♪
        </div>
        <div
          className="absolute top-[28%] right-[27%] text-amber-200 font-bold text-2xl animate-pulse"
          style={{ textShadow: '0 0 12px rgba(251, 191, 36, 0.9)' }}
        >
          ✦
        </div>
      </div>

      {/* Top Anime Widescreen Letterbox Bar */}
      <div
        className="relative z-10 w-full px-6 py-3.5 flex items-center justify-between border-b border-[#D4AF37]/50 pointer-events-auto"
        style={{ backgroundColor: 'rgba(11, 19, 34, 0.92)' }}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D4AF37] text-[#0F172A] text-xs font-extrabold tracking-wider uppercase">
            <Sparkles size={13} />
            Anime Opening
          </span>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">
              Entrée Principale · Maplewood High School
            </div>
            <div className="text-[11px] text-[#D4AF37]">
              ♪ Musique Anime : « Sunny Morning at Maplewood » · Voix : Florie
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              void handleGenerateAiVideo();
            }}
            disabled={generatingVideo}
            className="px-3 py-1.5 rounded-md border border-[#D4AF37]/60 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/15 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Film size={14} />
            <span>
              {generatingVideo ? 'Génération Vidéo IA...' : 'Vidéo Anime IA (16:9)'}
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onReplay();
            }}
            className="px-3 py-1.5 rounded-md border border-slate-600 text-xs font-medium text-slate-200 hover:border-[#D4AF37] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Rejouer</span>
          </button>

          <button
            type="button"
            data-testid="skip-intro-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onFinish();
            }}
            className="px-3.5 py-1.5 rounded-md font-display text-xs font-bold text-[#0F172A] bg-[#D4AF37] hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={13} />
            <span>Suivre Florie [Espace]</span>
          </button>
        </div>
      </div>

      {/* Optional 16:9 AI Video Modal if generated via gemini-omni-1.2-flash */}
      {aiVideoUrl && (
        <div className="relative z-20 mx-auto my-auto max-w-3xl w-full px-4 pointer-events-auto">
          <div className="rounded-xl overflow-hidden border-2 border-[#D4AF37] bg-[#0B1322] shadow-2xl">
            <div className="px-4 py-2 flex items-center justify-between border-b border-slate-700">
              <span className="text-xs font-bold text-[#D4AF37]">
                Cinématique Vidéo Anime IA (16:9) — Florie à Maplewood
              </span>
              <button
                type="button"
                onClick={() => setAiVideoUrl(null)}
                className="text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Fermer [X]
              </button>
            </div>
            <video
              src={aiVideoUrl}
              controls
              autoPlay
              loop
              className="w-full aspect-video bg-black"
            />
          </div>
        </div>
      )}

      {/* Bottom Anime Dialogue Box + 2D Anime Character Portrait of Florie */}
      <div className="relative z-10 w-full px-4 md:px-10 pb-5 pt-2 flex flex-col items-center pointer-events-auto">
        {videoNotice && (
          <div
            className="mb-2 px-3.5 py-1.5 rounded-md border border-[#D4AF37]/70 text-xs text-amber-100"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            {videoNotice}
          </div>
        )}

        <div
          className="w-full max-w-4xl rounded-2xl border-2 border-[#D4AF37] p-4 md:p-5 shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(31, 56, 100, 0.92) 100%)',
          }}
        >
          {/* 2D Anime Sheet Portrait of Florie (/assets/aistudio/Florie_fb6f2606.jpg) */}
          <div className="relative shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden border-2 border-[#F5E08B] bg-[#FDF8EE] shadow-lg">
            <img
              src="/assets/aistudio/Florie_fb6f2606.jpg"
              alt="Florie — Protagoniste"
              className="w-full h-full object-cover"
              style={{
                objectPosition: '43% 14%',
                transform: 'scale(1.65)',
              }}
            />
            <div
              className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-[10px] font-bold text-center text-[#2B1810]"
              style={{ backgroundColor: 'rgba(245, 224, 139, 0.94)' }}
            >
              {isBeckonPhase ? '« Suis-moi ! »' : '« Salut ! ^_^ »'}
            </div>
          </div>

          {/* Dialogue Content */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#F5E08B] text-[#2B1810] font-display text-sm font-extrabold tracking-wide">
                  FLORIE
                </span>
                <span className="text-xs font-semibold text-amber-200">
                  {isBeckonPhase
                    ? '👉 Fait signe de la suivre vers l’entrée de Maplewood'
                    : '✨ Grand sourire & salut enthousiaste de la main'}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onReplayVoice(activeLineIndex, fullText);
                }}
                className="px-2.5 py-1 rounded border border-[#D4AF37]/60 text-[11px] font-medium text-[#D4AF37] hover:bg-[#D4AF37]/15 flex items-center gap-1 cursor-pointer"
                title="Réécouter la voix de Florie"
              >
                <Volume2 size={13} />
                <span>Voix de Florie</span>
              </button>
            </div>

            <p
              className="text-base md:text-lg font-medium text-white leading-snug min-h-[3.2rem]"
              data-testid="intro-dialogue-text"
            >
              « {displayedText} »
            </p>

            {/* Cutscene Timeline Progress Bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D4AF37] transition-all duration-100"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono-tabular text-slate-300">
                {Math.min(duration, introTime).toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
