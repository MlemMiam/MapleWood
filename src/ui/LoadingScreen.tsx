import React from 'react';
import { OneMoreLineLogo } from './OneMoreLineLogo';

interface LoadingScreenProps {
  progress: number;
  tip: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, tip }) => {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 42%, rgba(225, 29, 72, 0.16) 0%, rgba(16, 12, 24, 0.96) 52%, #09080f 100%)',
        color: '#fff8f3',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Subtle anime bokeh / red-thread ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 22% 24%, rgba(251, 113, 133, 0.18), transparent 34%), radial-gradient(circle at 78% 74%, rgba(239, 35, 60, 0.2), transparent 38%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Custom "One More Line" Logo with animated red thread weaving around it */}
        <OneMoreLineLogo
          size="lg"
          variant="light"
          animatedThread
          progress={pct / 100}
          className="mb-4"
        />

        <p className="text-sm text-rose-100/80 mb-7">
          Chargement du lycée en 3D…{' '}
          <span className="font-mono-tabular font-bold text-rose-400">{pct}%</span>
        </p>

        {/* Red-thread progress bar */}
        <div className="w-72 sm:w-96 h-2 rounded-full overflow-hidden bg-white/10 border border-rose-500/30 mb-6 shadow-[0_0_20px_rgba(239,35,60,0.22)]">
          <div
            className="h-full transition-transform duration-150 origin-left rounded-full"
            style={{
              background: 'linear-gradient(90deg, #e11d48 0%, #fb7185 65%, #fda4af 100%)',
              transform: `scaleX(${pct / 100})`,
            }}
          />
        </div>

        <p className="text-xs text-slate-300/80 text-center max-w-md leading-relaxed px-4">
          <span className="text-rose-400 font-semibold">Astuce :</span> {tip}
        </p>
      </div>
    </div>
  );
};
