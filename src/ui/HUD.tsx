import React from 'react';
import { Map, Pause, Sparkles, UserCheck, Volume2, VolumeX } from 'lucide-react';
import { Minimap, type MinimapNpcMarker } from './Minimap';
import type { QuestState } from '../interaction/QuestLogic';
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
  questState: QuestState;
  muted: boolean;
  language: Language;
  weather?: WeatherType;
  timePhase?: TimePhase;
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
  questState,
  muted,
  language,
  weather = 'sunny',
  timePhase = 'morning',
  onToggleMute,
  onOpenMap,
  onOpenPause,
  onPlayIntro,
  onOpenCustomization,
}) => {
  const activeQuests = Object.values(questState.quests).filter((q) => q.status === 'active');
  const completedCount = Object.values(questState.quests).filter((q) => q.status === 'completed').length;
  const totalQuests = Object.keys(questState.quests).length;
  const compass = getCompassLabel(playerYaw);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Row: Left Zone/Compass + Right Minimap/Utility Buttons */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-xs">
          <div
            className="px-4 py-2.5 rounded-2xl border border-rose-200/90 backdrop-blur-md shadow-sm"
            style={{ backgroundColor: 'rgba(255, 249, 251, 0.88)' }}
          >
            <div className="flex items-center justify-between gap-2 text-xs text-rose-600 font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="font-mono-tabular">{compass}</span>
                <span aria-hidden="true">·</span>
                <span>{buildingName}</span>
              </div>
              <span
                className="px-2 py-0.5 rounded-full bg-rose-50/95 border border-rose-200/80 text-[10px] text-[#3b334a] font-medium"
                data-testid="hud-weather-badge"
              >
                {weather === 'rainy'
                  ? language === 'en'
                    ? '🌧️ Rain'
                    : '🌧️ Pluie'
                  : timePhase === 'night'
                    ? language === 'en'
                      ? '🌙 Night'
                      : '🌙 Nuit'
                    : timePhase === 'sunset'
                      ? language === 'en'
                        ? '🌅 Sunset'
                        : '🌅 Crépuscule'
                      : timePhase === 'afternoon'
                        ? language === 'en'
                          ? '☀️ Afternoon'
                          : '☀️ Après-midi'
                        : timePhase === 'midday'
                          ? language === 'en'
                            ? '☀️ Midday'
                            : '☀️ Midi'
                          : language === 'en'
                            ? '☀️ Morning'
                            : '☀️ Matin'}
              </span>
            </div>
            <div
              className="font-display text-xl font-bold text-[#1e1b2e] leading-tight mt-0.5"
              data-testid="hud-zone-name"
            >
              {zoneName}
            </div>
          </div>

          {/* Compact Quest Tracker */}
          <div
            className="px-4 py-2.5 rounded-2xl border border-rose-200/85 text-xs text-[#3b334a] backdrop-blur-md shadow-sm"
            style={{ backgroundColor: 'rgba(255, 249, 251, 0.85)' }}
          >
            <div className="flex items-center justify-between gap-3 text-[11px] text-rose-600 font-semibold mb-1">
              <span>{t(language, 'missions')}</span>
              <span className="font-mono-tabular bg-rose-100/80 px-1.5 py-0.5 rounded-full text-rose-700">
                {completedCount}/{totalQuests}
              </span>
            </div>
            {activeQuests.length > 0 ? (
              <div className="space-y-1">
                {activeQuests.slice(0, 2).map((q) => (
                  <div key={q.id} className="text-[#1e1b2e] font-medium leading-snug">
                    {q.title} ·{' '}
                    <span className="font-mono-tabular text-rose-600 font-semibold">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#5c516b] leading-snug">
                Parlez aux membres du lycée pour découvrir des missions.
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

      {/* Center Crosshair & Interaction Prompt */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
        <div
          className="w-2 h-2 rounded-full transition-colors"
          style={{
            backgroundColor: interactPrompt ? '#e11d48' : 'rgba(255,255,255,0.8)',
            boxShadow: '0 0 0 1.5px rgba(30, 27, 46, 0.55)',
          }}
        />
        {interactPrompt && (
          <div
            className="mt-4 px-3.5 py-1.5 rounded-full border border-rose-300 text-xs font-semibold text-[#1e1b2e] whitespace-nowrap backdrop-blur-md shadow-md flex items-center gap-1.5"
            style={{ backgroundColor: 'rgba(255, 249, 251, 0.92)' }}
            data-testid="interact-prompt"
          >
            <span className="font-mono-tabular font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">
              E
            </span>
            <span>
              {interactPrompt.startsWith('Appuie ')
                ? interactPrompt
                : `${t(language, 'interactPrefix')} ${interactPrompt}`}
            </span>
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
