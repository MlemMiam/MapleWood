import React from 'react';

interface OneMoreLineLogoProps {
  /** 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Light ink mode for dark backgrounds (white/ivory + crimson) vs dark ink mode (black + crimson) */
  variant?: 'light' | 'dark';
  /** Animates the red thread weaving around the logo (for the Loading Screen) */
  animatedThread?: boolean;
  /** Progress 0..1 when animatedThread is enabled */
  progress?: number;
  className?: string;
}

/**
 * Transparent-background vector recreation of the "One More Line" handwritten
 * anime otome logo, featuring dual-stroke calligraphy (ink + offset crimson red)
 * and the looping red thread of fate ("fil rouge") forming a heart between
 * "One More" and "Line".
 */
export const OneMoreLineLogo: React.FC<OneMoreLineLogoProps> = ({
  size = 'md',
  variant = 'light',
  animatedThread = false,
  progress = 1,
  className = '',
}) => {
  const width = size === 'lg' ? 370 : size === 'md' ? 310 : 220;
  const inkColor = variant === 'light' ? '#FFF8F3' : '#111116';
  const redColor = '#EF233C';
  const redGlow = 'rgba(239, 35, 60, 0.55)';

  // Outer weaving red-thread loop perimeter (~1120 SVG units)
  const orbitLen = 1120;
  const clampedProgress = Math.max(0.08, Math.min(1, progress));
  const orbitOffset = animatedThread ? orbitLen * (1 - clampedProgress) : 0;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width }}
    >
      <style>{`
        @keyframes omlThreadWeave {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -1120; }
        }
        @keyframes omlHeartPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px ${redGlow}); }
          50% { transform: scale(1.04); filter: drop-shadow(0 0 14px ${redGlow}); }
        }
      `}</style>

      <svg
        viewBox="0 0 460 270"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible"
        aria-label="One More Line"
      >
        <defs>
          <filter id="oml-red-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="oml-thread-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D6D" />
            <stop offset="50%" stopColor="#EF233C" />
            <stop offset="100%" stopColor="#D90429" />
          </linearGradient>
        </defs>

        {/* Animated outer red thread weaving around the logo during loading */}
        {animatedThread && (
          <g>
            {/* Subtle base guide */}
            <path
              d="M 42 136 C 24 44, 152 12, 265 24 C 388 36, 444 92, 422 158 C 402 222, 272 252, 165 242 C 62 232, 54 184, 42 136 Z"
              stroke="rgba(239, 35, 60, 0.22)"
              strokeWidth="2.5"
              strokeDasharray="6 8"
              fill="none"
            />
            {/* Dynamic progress + weaving red thread */}
            <path
              d="M 42 136 C 24 44, 152 12, 265 24 C 388 36, 444 92, 422 158 C 402 222, 272 252, 165 242 C 62 232, 54 184, 42 136 Z"
              stroke="url(#oml-thread-grad)"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeDasharray={`${orbitLen * 0.72} ${orbitLen * 0.28}`}
              strokeDashoffset={orbitOffset}
              filter="url(#oml-red-glow)"
              style={{
                animation: 'omlThreadWeave 4.2s linear infinite',
              }}
            />
            {/* Second finer intertwined red ribbon */}
            <path
              d="M 28 118 C 68 24, 240 6, 368 42 C 446 66, 448 164, 344 214 C 246 260, 88 256, 36 188 C 12 156, 16 134, 28 118 Z"
              stroke="#FF758F"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="190 930"
              style={{
                animation: 'omlThreadWeave 3.1s linear infinite reverse',
              }}
            />
          </g>
        )}

        {/* Signature Red Thread of Fate looping from "L" through the center heart up to "More" */}
        <g
          filter="url(#oml-red-glow)"
          style={{
            transformOrigin: '205px 145px',
            animation: 'omlHeartPulse 3.4s ease-in-out infinite',
          }}
        >
          <path
            d="M 52 198 C 82 162, 134 152, 168 142 C 194 134, 212 114, 198 98 C 184 82, 162 102, 164 122 C 166 136, 178 146, 196 144 C 216 141, 224 122, 214 104 C 204 88, 182 96, 176 116 C 170 134, 186 144, 228 136 C 284 125, 348 106, 412 88"
            stroke="url(#oml-thread-grad)"
            strokeWidth="5.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* "One More" - Crimson Red offset layer */}
        <text
          x="36"
          y="96"
          fill={redColor}
          fontFamily="'Caveat', 'Brush Script MT', cursive"
          fontSize="84"
          fontWeight="700"
          letterSpacing="1"
          transform="translate(4, 3) rotate(-2.5 220 80)"
          opacity="0.92"
        >
          One More
        </text>

        {/* "One More" - Main Ink layer */}
        <text
          x="36"
          y="96"
          fill={inkColor}
          stroke={variant === 'light' ? 'rgba(12, 10, 18, 0.7)' : 'none'}
          strokeWidth={variant === 'light' ? '1.5' : '0'}
          fontFamily="'Caveat', 'Brush Script MT', cursive"
          fontSize="84"
          fontWeight="700"
          letterSpacing="1"
          transform="rotate(-2.5 220 80)"
        >
          One More
        </text>

        {/* "Line" - Crimson Red offset layer */}
        <text
          x="34"
          y="236"
          fill={redColor}
          fontFamily="'Caveat', 'Brush Script MT', cursive"
          fontSize="94"
          fontWeight="700"
          letterSpacing="1.5"
          transform="translate(4, 3) rotate(-2.5 110 215)"
          opacity="0.92"
        >
          Line
        </text>

        {/* "Line" - Main Ink layer */}
        <text
          x="34"
          y="236"
          fill={inkColor}
          stroke={variant === 'light' ? 'rgba(12, 10, 18, 0.7)' : 'none'}
          strokeWidth={variant === 'light' ? '1.5' : '0'}
          fontFamily="'Caveat', 'Brush Script MT', cursive"
          fontSize="94"
          fontWeight="700"
          letterSpacing="1.5"
          transform="rotate(-2.5 110 215)"
        >
          Line
        </text>
      </svg>
    </div>
  );
};
