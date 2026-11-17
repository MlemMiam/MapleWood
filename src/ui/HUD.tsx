import React from 'react';
import {
  BellRing,
  Clock,
  CloudRain,
  Map,
  Moon,
  Pause,
  Sparkles,
  Sun,
  Sunset,
  UserCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Minimap, type MinimapNpcMarker } from './Minimap';
import type { Language } from '../engine/InputBindings';
import type { TimePhase, WeatherType } from '../engine/Renderer';
import { t } from '../utils/i18n';

interface HUDProps {
  zoneName: string;
  buildingName: string;
  zoneToast: string | null;
  playerX: number;
  playerY?: number;
  playerZ: number;
  playerYaw: number;
  stamina: number;
  interactPrompt: string | null;
  npcs: MinimapNpcMarker[];
  muted: boolean;
  language: Language;
  weather?: WeatherType;
  timePhase?: TimePhase;
  gameTime?: { hour: number; minute: number };
  bellRinging?: boolean;
  onToggleMute: () => void;
  onOpenMap: () => void;
  onOpenPause: () => void;
  onPlayIntro?: () => void;
  onOpenCustomization?: () => void;
}

function getCompassLabel(yawRad: number): string {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SE', 'E', 'NE'];
  const deg = (((yawRad * 180) / Math.PI) % 360 + 360) % 360;
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

export const HUD: React.FC<HUDProps> = ({
  zoneName,
  buildingName,
  zoneToast,
  playerX,
  playerY = 0.05,
  playerZ,
  playerYaw,
  stamina,
  interactPrompt,
  npcs,
  muted,
  language,
  weather = 'sunny',
  timePhase = 'morning',
  gameTime,
  bellRinging = false,
  onToggleMute,
  onOpenMap,
  onOpenPause,
  onPlayIntro,
  onOpenCustomization,
}) => {
  const compass = getCompassLabel(playerYaw);

  const periodLabel =
    weather === 'rainy'
      ? language === 'en'
        ? 'Rain'
        : 'Pluie'
      : timePhase === 'night'
        ? language === 'en'
          ? 'Night'
          : 'Nuit'
        : timePhase === 'sunset'
          ? language === 'en'
            ? 'Sunset'
            : 'Crépuscule'
          : timePhase === 'afternoon'
            ? language === 'en'
              ? 'Afternoon'
              : 'Après-midi'
            : timePhase === 'midday'
              ? language === 'en'
                ? 'Midday'
                : 'Midi'
              : language === 'en'
                ? 'Morning'
                : 'Matin';

  const PeriodIcon =
    weather === 'rainy'
      ? CloudRain
      : timePhase === 'night'
        ? Moon
        : timePhase === 'sunset'
          ? Sunset
          : Sun;

  const periodIconColor =
    weather === 'rainy'
      ? 'text-sky-600'
      : timePhase === 'night'
        ? 'text-indigo-600'
        : timePhase === 'sunset'
          ? 'text-orange-600'
          : 'text-amber-500';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Row: Left Zone/Compass + Clock Card & Right Minimap/Utility Buttons */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-[236px] max-w-xs">
          <div
            className="px-4 py-3 rounded-2xl border border-rose-200/90 backdrop-blur-md shadow-sm"
            style={{ backgroundColor: 'rgba(255, 249, 251, 0.90)' }}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
              <span className="font-mono-tabular shrink-0">{compass}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#5c516b] truncate">{buildingName}</span>
            </div>

            <div
              className="font-display text-lg font-bold text-[#1e1b2e] leading-snug mt-0.5"
              data-testid="hud-zone-name"
            >
              {zoneName}
            </div>

            {gameTime && (
              <div
                className="mt-2.5 pt-2 border-t border-rose-200/75 flex items-center justify-between gap-4"
                data-testid="hud-clock"
              >
                <div className="flex items-center gap-2">
                  {bellRinging ? (
                    <BellRing size={16} className="text-rose-600 shrink-0" aria-hidden="true" />
                  ) : (
                    <Clock size={15} className="text-rose-600 shrink-0" aria-hidden="true" />
                  )}
                  <span className="font-mono-tabular text-xl font-bold tracking-tight text-[#1e1b2e] leading-none">
                    {String(gameTime.hour).padStart(2, '0')}:
                    {String(gameTime.minute).padStart(2, '0')}
                  </span>
                </div>

                <div
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#3b334a] whitespace-nowrap shrink-0"
                  data-testid="hud-weather-badge"
                >
                  <PeriodIcon size={14} className={`${periodIconColor} shrink-0`} aria-hidden="true" />
                  <span>{bellRinging ? (language === 'en' ? 'School bell' : 'Sonnerie') : periodLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Minimap + Compact Controls */}
        <div className="flex flex-col items-end gap-2">
          <Minimap
            playerX={playerX}
            playerY={playerY}
            playerZ={playerZ}
            playerYaw={playerYaw}
            npcs={npcs}
            onOpenMap={onOpenMap}
          />
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Activer le son' : 'Couper le son'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-rose-200/90 text-[#1e1b2e] hover:bg-white transition-colors cursor-pointer backdrop-blur-md shadow-sm"
              style={{ backgroundColor: 'rgba(255, 249, 251, 0.88)' }}
            >
              {muted ? <VolumeX size={15} className="text-rose-600" /> : <Volume2 size={15} className="text-rose-600" />}
            </button>
            {onOpenCustomization && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Ouvrir le Studio Coiffure & Dress-Up 3D"
                title="Ouvrir le Studio Coiffure & Dress-Up 3D"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenCustomization();
                }}
                className="h-9 px-3 flex items-center gap-1.5 rounded-full border border-rose-300/90 text-xs font-semibold text-rose-700 hover:bg-white transition-colors cursor-pointer whitespace-nowrap backdrop-blur-md shadow-sm"
                style={{ backgroundColor: 'rgba(255, 244, 247, 0.90)' }}
              >
                <UserCheck size={14} className="text-rose-600" />
                <span>Coiffure & Tenue 3D</span>
              </button>
            )}
            {onPlayIntro && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Ouvrir l'album des cinématiques"
                title="Ouvrir l'album des cinématiques"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPlayIntro();
                }}
                className="h-9 px-3 flex items-center gap-1.5 rounded-full border border-rose-200/90 text-xs font-semibold text-[#1e1b2e] hover:bg-white transition-colors cursor-pointer whitespace-nowrap backdrop-blur-md shadow-sm"
                style={{ backgroundColor: 'rgba(255, 249, 251, 0.88)' }}
              >
                <Sparkles size={14} className="text-rose-500" />
                <span>Cinématiques</span>
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Ouvrir la carte complète (M)"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenMap();
              }}
              className="h-9 px-3 flex items-center gap-1.5 rounded-full border border-rose-200/90 text-xs font-semibold text-[#1e1b2e] hover:bg-white transition-colors cursor-pointer whitespace-nowrap backdrop-blur-md shadow-sm"
              style={{ backgroundColor: 'rgba(255, 249, 251, 0.88)' }}
            >
              <Map size={14} className="text-rose-600" />
              <span>Carte [M]</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Menu Pause (Échap)"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenPause();
              }}
              className="h-9 px-3 flex items-center gap-1.5 rounded-full border border-rose-200/90 text-xs font-semibold text-[#1e1b2e] hover:bg-white transition-colors cursor-pointer whitespace-nowrap backdrop-blur-md shadow-sm"
              style={{ backgroundColor: 'rgba(255, 249, 251, 0.88)' }}
            >
              <Pause size={14} className="text-rose-600" />
              <span>Pause</span>
            </button>
          </div>
        </div>
      </div>

      {/* Center Interaction Prompt */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
        {interactPrompt && (
          <div
            className="mt-4 px-3.5 py-1.5 rounded-full border border-rose-300 text-xs font-semibold text-[#1e1b2e] whitespace-nowrap backdrop-blur-md shadow-md flex items-center gap-1.5"
            style={{ backgroundColor: 'rgba(255, 249, 251, 0.92)' }}
            data-testid="interact-prompt"
          >
            <span className="font-mono-tabular font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">
              E
            </span>
            <span>{interactPrompt}</span>
          </div>
        )}
      </div>

      {/* Zone Toast Banner */}
      {zoneToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border border-rose-300 text-sm font-semibold text-rose-700 whitespace-nowrap backdrop-blur-md shadow-md"
          style={{ backgroundColor: 'rgba(255, 249, 251, 0.94)' }}
        >
          {zoneToast}
        </div>
      )}

      {/* Bottom Row: Stamina Bar & Minimal Hint */}
      <div className="flex items-end justify-between gap-4">
        <div
          className="px-4 py-2.5 rounded-2xl border border-rose-200/90 w-52 backdrop-blur-md shadow-sm"
          style={{ backgroundColor: 'rgba(255, 249, 251, 0.88)' }}
        >
          <div className="flex items-center justify-between text-[11px] text-[#3b334a] mb-1.5">
            <span className="font-semibold text-rose-600">{t(language, 'stamina')}</span>
            <span className="font-mono-tabular font-semibold text-[#1e1b2e]">{Math.round(stamina)}%</span>
          </div>
          <div className="h-2 w-full bg-rose-100 rounded-full overflow-hidden">
            <div
              className="h-full origin-left transition-transform duration-100 rounded-full"
              style={{
                background:
                  stamina < 25
                    ? '#ef4444'
                    : 'linear-gradient(90deg, #e11d48 0%, #fb7185 100%)',
                transform: `scaleX(${Math.max(0, Math.min(1, stamina / 100))})`,
              }}
            />
          </div>
        </div>

        <div
          className="hidden md:block px-3.5 py-1.5 rounded-full border border-rose-200/80 text-[11px] text-[#3b334a] font-medium backdrop-blur-md shadow-sm"
          style={{ backgroundColor: 'rgba(255, 249, 251, 0.84)' }}
        >
          Clic gauche sur la vue pour verrouiller la souris · Molette zoom · ZQSD/WASD Déplacer
        </div>
      </div>
    </div>
  );
};
