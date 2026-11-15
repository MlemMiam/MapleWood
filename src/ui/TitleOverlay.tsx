import React, { useEffect, useState } from 'react';
import {
  Compass,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { GameSettings } from '../engine/InputBindings';
import { OneMoreLineLogo } from './OneMoreLineLogo';
import { SettingsMenu } from './SettingsMenu';

interface TitleOverlayProps {
  settings: GameSettings;
  muted: boolean;
  onStartStory: () => void;
  onQuickExplore: () => void;
  onUpdateSettings: (next: GameSettings) => void;
  onToggleMute: () => void;
  onPlayHoverSfx: () => void;
  onPlayClickSfx: () => void;
  onPlayConfirmSfx: () => void;
}

const SAKURA_PETALS = [
  { left: '16%', delay: '0s', dur: '11s', size: 11 },
  { left: '34%', delay: '2.5s', dur: '13s', size: 10 },
  { left: '52%', delay: '1.2s', dur: '10.5s', size: 12 },
  { left: '70%', delay: '4s', dur: '12s', size: 10 },
  { left: '84%', delay: '0.8s', dur: '14s', size: 11 },
  { left: '93%', delay: '3.2s', dur: '11.5s', size: 9 },
];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  settings,
  muted,
  onStartStory,
  onQuickExplore,
  onUpdateSettings,
  onToggleMute,
  onPlayHoverSfx,
  onPlayClickSfx,
  onPlayConfirmSfx,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showSettings) {
        if (e.code === 'Escape') {
          e.preventDefault();
          onPlayClickSfx();
          setShowSettings(false);
        }
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onPlayConfirmSfx();
        onStartStory();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettings, onStartStory, onPlayClickSfx, onPlayConfirmSfx]);

  const isEn = settings.language === 'en';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden select-none">
      <style>{`
        @keyframes omlSakuraFall {
          0% {
            transform: translateY(-10vh) translateX(0px) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 0.72;
          }
          85% {
            opacity: 0.58;
          }
          100% {
            transform: translateY(108vh) translateX(65px) rotate(320deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Feather-soft central radial veil so floating typography stays legible without any heavy box */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 56% 52% at 50% 50%, rgba(16, 10, 22, 0.46) 0%, rgba(16, 10, 22, 0.20) 58%, rgba(16, 10, 22, 0) 100%)',
        }}
      />

      {/* Lightweight CSS Sakura Petals */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {SAKURA_PETALS.map((p, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '-6vh',
              left: p.left,
              width: p.size,
              height: p.size * 0.72,
              borderRadius: '80% 10% 80% 10%',
              background:
                idx % 2 === 0
                  ? 'linear-gradient(135deg, #fecdd3, #fb7185)'
                  : 'linear-gradient(135deg, #ffe4e6, #fda4af)',
              animation: `omlSakuraFall ${p.dur} linear ${p.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-12">
        {/* Top-Right Quick Controls (Camera toggle, Language, Audio) */}
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onMouseEnter={onPlayHoverSfx}
              onClick={() => {
                onPlayClickSfx();
                onUpdateSettings({
                  ...settings,
                  titleTravelingEnabled: !settings.titleTravelingEnabled,
                });
              }}
              aria-label={
                settings.titleTravelingEnabled
                  ? 'Fixer la caméra sur la façade'
                  : 'Activer le mouvement de caméra'
              }
              title={
                settings.titleTravelingEnabled
                  ? 'Caméra animée (cliquer pour fixer sur la façade)'
                  : 'Caméra fixe sur la façade (cliquer pour animer)'
              }
              className={`p-2 rounded-full border transition-colors cursor-pointer shadow-sm backdrop-blur-md ${
                settings.titleTravelingEnabled
                  ? 'border-rose-200/80 bg-white/80 hover:bg-white text-rose-600'
                  : 'border-white/40 bg-slate-900/45 hover:bg-slate-900/65 text-white/85'
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                {!settings.titleTravelingEnabled && <line x1="2" y1="2" x2="22" y2="22" />}
              </svg>
            </button>

            <button
              type="button"
              onMouseEnter={onPlayHoverSfx}
              onClick={() => {
                onPlayClickSfx();
                onUpdateSettings({
                  ...settings,
                  language: settings.language === 'fr' ? 'en' : 'fr',
                });
              }}
              className="px-3.5 py-1.5 rounded-full border border-rose-200/80 bg-white/80 hover:bg-white text-xs font-bold text-[#1e1b2e] transition-colors cursor-pointer shadow-sm backdrop-blur-md"
            >
              {settings.language.toUpperCase()}
            </button>

            <button
              type="button"
              onMouseEnter={onPlayHoverSfx}
              onClick={() => {
                onPlayClickSfx();
                onToggleMute();
              }}
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
              className="p-2 rounded-full border border-rose-200/80 bg-white/80 hover:bg-white text-[#1e1b2e] transition-colors cursor-pointer shadow-sm backdrop-blur-md"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Centered Airy Floating Anime Otome Menu (No opaque square!) */}
        <div className="max-w-md w-full mx-auto my-auto pointer-events-auto flex flex-col items-center text-center px-2">
          {/* Transparent Handwritten "One More Line" Logo */}
          <div style={{ filter: 'drop-shadow(0 4px 14px rgba(15, 10, 20, 0.45))' }}>
            <OneMoreLineLogo size="lg" variant="light" className="mb-1 mx-auto" />
          </div>

          {/* Narrative Tagline */}
          <p
            className="text-sm md:text-[15px] text-white/95 leading-relaxed mb-5 font-medium max-w-sm"
            style={{ textShadow: '0 2px 10px rgba(10, 8, 16, 0.65)' }}
          >
            {isEn
              ? 'Every red thread leads to a new encounter… Step inside the school and write your own story.'
              : 'Chaque fil rouge mène à une nouvelle rencontre… Entre dans le lycée et écris ta propre histoire.'}
          </p>

          {/* Delicate centered red-thread line */}
          <div className="flex items-center gap-2.5 mb-5 w-full max-w-[290px]">
            <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-rose-200/80 to-rose-400 rounded-full" />
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="rgba(251, 113, 133, 0.35)"
              stroke="#fda4af"
              strokeWidth="2"
            >
              <path d="M12 21s-7-4.5-9.2-9.2C1.2 8.2 3.4 4.5 7 4.5c2.1 0 3.9 1.2 5 3 1.1-1.8 2.9-3 5-3 3.6 0 5.8 3.7 4.2 7.3C19 16.5 12 21 12 21z" />
            </svg>
            <div className="h-[1.5px] flex-1 bg-gradient-to-r from-rose-400 via-rose-200/80 to-transparent rounded-full" />
          </div>

          {/* Lightweight Frosted-Glass Pill Buttons */}
          <div className="flex flex-col gap-2.5 w-full max-w-[320px]">
            <button
              type="button"
              data-start="true"
              onMouseEnter={onPlayHoverSfx}
              onClick={(e) => {
                e.currentTarget.blur();
                onPlayConfirmSfx();
                onStartStory();
              }}
              className="group w-full py-3 px-5 rounded-full font-display text-lg font-bold tracking-wide text-white bg-rose-600/95 hover:bg-rose-600 shadow-lg transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-between backdrop-blur-md border border-rose-300/40"
            >
              <span className="flex items-center gap-2.5">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="#ffe4e6"
                  stroke="#fff"
                  strokeWidth="1.8"
                  className="group-hover:scale-110 transition-transform"
                >
                  <path d="M12 21s-7-4.5-9.2-9.2C1.2 8.2 3.4 4.5 7 4.5c2.1 0 3.9 1.2 5 3 1.1-1.8 2.9-3 5-3 3.6 0 5.8 3.7 4.2 7.3C19 16.5 12 21 12 21z" />
                </svg>
                {isEn ? 'New Game' : 'Nouvelle Partie'}
              </span>
              <span className="text-[11px] font-sans font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                {isEn ? 'Start' : 'Entrer'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onMouseEnter={onPlayHoverSfx}
                onClick={() => {
                  onPlayConfirmSfx();
                  onQuickExplore();
                }}
                className="py-2.5 px-4 rounded-full border border-white/60 bg-white/75 hover:bg-white/95 text-xs font-semibold text-[#1e1b2e] transition-all cursor-pointer flex items-center justify-center gap-1.5 backdrop-blur-md shadow-sm"
              >
                <Compass size={15} className="text-rose-600" />
                <span>{isEn ? 'Free Roam' : 'Accès Libre'}</span>
              </button>

              <button
                type="button"
                onMouseEnter={onPlayHoverSfx}
                onClick={() => {
                  onPlayClickSfx();
                  setShowSettings(true);
                }}
                className="py-2.5 px-4 rounded-full border border-white/60 bg-white/75 hover:bg-white/95 text-xs font-semibold text-[#1e1b2e] transition-all cursor-pointer flex items-center justify-center gap-1.5 backdrop-blur-md shadow-sm"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>{isEn ? 'Settings' : 'Paramètres'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div />
      </div>

      {/* Title Screen Settings Modal */}
      {showSettings && (
        <div className="pointer-events-auto">
          <SettingsMenu
            titleMode
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onResume={() => {
              onPlayClickSfx();
              setShowSettings(false);
            }}
            onOpenMap={() => setShowSettings(false)}
            onRespawn={() => setShowSettings(false)}
            onQuitToTitle={() => setShowSettings(false)}
          />
        </div>
      )}
    </div>
  );
};
