import React, { useEffect } from 'react';
import type { Language } from '../engine/InputBindings';
import { t } from '../utils/i18n';

interface TitleOverlayProps {
  language: Language;
  onStart: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({ language, onStart }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-8 md:p-12">
      {/* Upper-Left Lockup over Calm Sky / Campus Horizon */}
      <div
        className="max-w-md rounded-xl border border-[#D4AF37]/70 p-6 md:p-8 pointer-events-auto"
        style={{ backgroundColor: 'rgba(11, 19, 34, 0.88)' }}
      >
        <div className="flex items-center gap-4 mb-5">
          {/* Bespoke Maplewood Eagles SVG Crest */}
          <svg
            width="56"
            height="64"
            viewBox="0 0 84 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M42 4L78 16V48C78 69.5 62.6 86.2 42 92C21.4 86.2 6 69.5 6 48V16L42 4Z"
              fill="#1F3864"
              stroke="#D4AF37"
              strokeWidth="4"
            />
            <path d="M22 40L42 26L62 40L54 58H30L22 40Z" fill="#D4AF37" />
            <path d="M42 32L50 44H34L42 32Z" fill="#1F3864" />
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
          <div>
            <div className="text-xs font-medium text-[#D4AF37] tracking-wide">
              Les Aigles de Maplewood · Est. 1994
            </div>
            <h1 className="font-display text-4xl font-extrabold text-white leading-none tracking-tight mt-1">
              Maplewood High School
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed mb-6">
          Explorez librement le campus en 3D : bâtiment principal, laboratoires de sciences, gymnase, cafétéria, bibliothèque, administration et terrain de sport.
        </p>

        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStart();
          }}
          className="w-full py-3 px-6 rounded-lg font-display text-xl font-bold tracking-wide text-[#0F172A] transition-transform active:scale-[0.99] cursor-pointer"
          style={{ backgroundColor: '#D4AF37' }}
        >
          {t(language, 'exploreCampus')}
        </button>
      </div>

      {/* Bottom Safe Margin Flat Control Hint Line */}
      <div className="flex justify-center">
        <div
          className="px-4 py-2 rounded-md text-xs text-slate-200 text-center"
          style={{ backgroundColor: 'rgba(11, 19, 34, 0.82)' }}
        >
          {t(language, 'controlsHint')}
        </div>
      </div>
    </div>
  );
};
