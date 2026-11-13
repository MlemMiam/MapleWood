import React from 'react';
import { Map, Pause, Sparkles, Upload, Volume2, VolumeX } from 'lucide-react';
import { Minimap, type MinimapNpcMarker } from './Minimap';
import type { QuestState } from '../interaction/QuestLogic';
import type { Language } from '../engine/InputBindings';
import { t } from '../utils/i18n';

interface HUDProps {
  zoneName: string;
  buildingName: string;
  zoneToast: string | null;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  stamina: number;
  interactPrompt: string | null;
  npcs: MinimapNpcMarker[];
  questState: QuestState;
  muted: boolean;
  language: Language;
  vrmFileName?: string | null;
  onToggleMute: () => void;
  onOpenMap: () => void;
  onOpenPause: () => void;
  onImportVrm?: () => void;
  onPlayIntro?: () => void;
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
  playerZ,
  playerYaw,
  stamina,
  interactPrompt,
  npcs,
  questState,
  muted,
  language,
  vrmFileName,
  onToggleMute,
  onOpenMap,
  onOpenPause,
  onImportVrm,
  onPlayIntro,
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
            className="px-3.5 py-2.5 rounded-lg border border-[#D4AF37]/45"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
          >
            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium">
              <span className="font-mono-tabular font-semibold">{compass}</span>
              <span aria-hidden="true">·</span>
              <span>{buildingName}</span>
            </div>
            <div
              className="font-display text-xl font-bold text-white leading-tight mt-0.5"
              data-testid="hud-zone-name"
            >
              {zoneName}
            </div>
          </div>

          {/* Compact Quest Tracker */}
          <div
            className="px-3.5 py-2 rounded-lg border border-slate-700/80 text-xs text-slate-200"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.84)' }}
          >
            <div className="flex items-center justify-between gap-3 text-[11px] text-[#D4AF37] font-semibold mb-1">
              <span>{t(language, 'missions')}</span>
              <span className="font-mono-tabular">
                {completedCount}/{totalQuests}
              </span>
            </div>
            {activeQuests.length > 0 ? (
              <div className="space-y-1">
                {activeQuests.slice(0, 2).map((q) => (
                  <div key={q.id} className="text-slate-200 leading-snug">
                    {q.title} ·{' '}
                    <span className="font-mono-tabular text-[#D4AF37]">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-300 leading-snug">
                Parlez aux membres du lycée pour découvrir des missions.
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Minimap + Compact Controls */}
        <div className="flex flex-col items-end gap-2">
          <Minimap
            playerX={playerX}
            playerZ={playerZ}
            playerYaw={playerYaw}
            npcs={npcs}
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
              className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-600 text-slate-100 hover:border-[#D4AF37] transition-colors cursor-pointer"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {onPlayIntro && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Rejouer la cinématique d'ouverture anime de Florie"
                title="Rejouer la cinématique d'ouverture anime de Florie"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPlayIntro();
                }}
                className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-[#D4AF37]/65 text-xs font-medium text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
              >
                <Sparkles size={14} />
                <span>Cinématique</span>
              </button>
            )}
            {onImportVrm && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Charger le fichier VRM de Florie (.vrm)"
                title="Charger ou remplacer le fichier VRM de Florie (.vrm)"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onImportVrm();
                }}
                className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-[#D4AF37]/65 text-xs font-medium text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
              >
                <Upload size={14} />
                <span>{vrmFileName ? `VRM : ${vrmFileName}` : 'VRM : Florie'}</span>
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
              className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-slate-600 text-xs font-medium text-slate-100 hover:border-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
            >
              <Map size={15} />
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
              className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-slate-600 text-xs font-medium text-slate-100 hover:border-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.90)' }}
            >
              <Pause size={15} />
              <span>Pause</span>
            </button>
          </div>
        </div>
      </div>

      {/* Center Crosshair & Interaction Prompt */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: interactPrompt ? '#D4AF37' : 'rgba(255,255,255,0.65)',
            boxShadow: '0 0 0 1.5px rgba(15, 23, 42, 0.85)',
          }}
        />
        {interactPrompt && (
          <div
            className="mt-4 px-3.5 py-1.5 rounded-md border border-[#D4AF37] text-xs font-medium text-white whitespace-nowrap"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
            data-testid="interact-prompt"
          >
            <span className="font-mono-tabular font-bold text-[#D4AF37] mr-1.5">[E]</span>
            {t(language, 'interactPrefix')} {interactPrompt}
          </div>
        )}
      </div>

      {/* Zone Toast Banner */}
      {zoneToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md border border-[#D4AF37] text-sm font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: 'rgba(31, 56, 100, 0.94)' }}
        >
          {zoneToast}
        </div>
      )}

      {/* Bottom Row: Stamina Bar & Minimal Hint */}
      <div className="flex items-end justify-between gap-4">
        <div
          className="px-3 py-2 rounded-lg border border-slate-700/80 w-56"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)' }}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
            <span>
              <strong className="text-[#D4AF37] font-semibold">Florie (VRM)</strong> · {t(language, 'stamina')}
            </span>
            <span className="font-mono-tabular text-white">{Math.round(stamina)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-sm overflow-hidden">
            <div
              className="h-full origin-left transition-transform duration-100"
              style={{
                backgroundColor: stamina < 25 ? '#EF4444' : '#D4AF37',
                transform: `scaleX(${Math.max(0, Math.min(1, stamina / 100))})`,
              }}
            />
          </div>
        </div>

        <div
          className="hidden md:block px-3 py-1.5 rounded-md text-[11px] text-slate-300"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.78)' }}
        >
          Clic gauche sur la vue pour verrouiller la souris · Molette zoom · ZQSD/WASD Déplacer
        </div>
      </div>
    </div>
  );
};
