import React from 'react';

interface LoadingScreenProps {
  progress: number;
  tip: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, tip }) => {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#0b1322', color: '#f8fafc' }}
      role="status"
      aria-live="polite"
    >
      {/* Bespoke Maplewood Eagles Crest SVG */}
      <svg
        width="84"
        height="96"
        viewBox="0 0 84 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-6"
        aria-hidden="true"
      >
        <path
          d="M42 4L78 16V48C78 69.5 62.6 86.2 42 92C21.4 86.2 6 69.5 6 48V16L42 4Z"
          fill="#1F3864"
          stroke="#D4AF37"
          strokeWidth="4"
        />
        <path
          d="M22 40L42 26L62 40L54 58H30L22 40Z"
          fill="#D4AF37"
        />
        <path
          d="M42 32L50 44H34L42 32Z"
          fill="#1F3864"
        />
        <text
          x="42"
          y="75"
          textAnchor="middle"
          fill="#D4AF37"
          fontSize="11"
          fontWeight="800"
          fontFamily="sans-serif"
          letterSpacing="1.5"
        >
          MHS
        </text>
      </svg>

      <h1 className="font-display text-3xl font-bold tracking-wide text-white mb-2">
        Maplewood High School
      </h1>
      <p className="text-sm text-slate-300 mb-8">
        Préparation du campus en 3D · <span className="font-mono-tabular text-[#D4AF37]">{pct}%</span>
      </p>

      <div className="w-full max-w-md h-2.5 rounded-sm overflow-hidden bg-slate-800 border border-slate-700 mb-5">
        <div
          className="h-full transition-transform duration-150 origin-left"
          style={{
            backgroundColor: '#D4AF37',
            transform: `scaleX(${pct / 100})`,
          }}
        />
      </div>

      <p className="text-xs text-slate-400 text-center max-w-md leading-relaxed">
        Conseil : {tip}
      </p>
    </div>
  );
};
