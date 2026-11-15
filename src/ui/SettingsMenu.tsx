import React, { useState } from 'react';
import {
  type ActionName,
  type ColorblindMode,
  DEFAULT_KEY_BINDINGS,
  type FontScale,
  type GameSettings,
  type GraphicsQuality,
  type Language,
  formatKeyCode,
} from '../engine/InputBindings';
import { t } from '../utils/i18n';

interface SettingsMenuProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResume: () => void;
  onOpenMap: () => void;
  onRespawn: () => void;
  onQuitToTitle: () => void;
  titleMode?: boolean;
}

const ACTION_LABELS: Record<ActionName, string> = {
  forward: 'Avancer',
  backward: 'Reculer',
  left: 'Gauche',
  right: 'Droite',
  sprint: 'Courir',
  jump: 'Sauter',
  interact: 'Interagir',
  map: 'Carte complète',
  pause: 'Menu Pause',
};

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  settings,
  onUpdateSettings,
  onResume,
  onOpenMap,
  onRespawn,
  onQuitToTitle,
  titleMode = false,
}) => {
  const [tab, setTab] = useState<'main' | 'settings' | 'controls'>(
    titleMode ? 'settings' : 'main'
  );
  const [listeningAction, setListeningAction] = useState<ActionName | null>(null);

  const handleCaptureKey = (action: ActionName, e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = {
      ...settings,
      bindings: {
        ...settings.bindings,
        [action]: [e.code],
      },
    };
    onUpdateSettings(updated);
    setListeningAction(null);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(20, 16, 28, 0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Menu Pause et Paramètres"
    >
      <div
        className="w-full max-w-lg rounded-2xl border-2 border-rose-200 p-6 text-[#1e1b2e] shadow-xl"
        style={{
          backgroundColor: '#fffaf7',
          backgroundImage:
            'repeating-linear-gradient(transparent, transparent 27px, rgba(244, 63, 94, 0.06) 28px)',
        }}
      >
        <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-rose-200">
          <h2 className="font-display text-2xl font-bold text-[#1e1b2e]">
            {tab === 'main'
              ? t(settings.language, 'pausedTitle')
              : tab === 'settings'
                ? 'Paramètres & Accessibilité'
                : 'Configuration des touches'}
          </h2>
          {tab !== 'main' && (
            <div className="flex items-center gap-2">
              {titleMode && (
                <button
                  type="button"
                  onClick={() => setTab(tab === 'settings' ? 'controls' : 'settings')}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer transition-colors"
                >
                  {tab === 'settings' ? 'Touches & Clavier' : 'Paramètres'}
                </button>
              )}
              <button
                type="button"
                onClick={() => (titleMode ? onResume() : setTab('main'))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-rose-400 hover:text-rose-700 cursor-pointer transition-colors"
              >
                {titleMode ? 'Fermer' : 'Retour'}
              </button>
            </div>
          )}
        </div>

        {tab === 'main' && (
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
            >
              {t(settings.language, 'resume')}
            </button>
            <button
              type="button"
              onClick={onOpenMap}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-white hover:border-rose-400 text-sm font-semibold text-[#1e1b2e] transition-colors cursor-pointer"
            >
              {t(settings.language, 'fullMap')}
            </button>
            <button
              type="button"
              onClick={() => setTab('settings')}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-white hover:border-rose-400 text-sm font-semibold text-[#1e1b2e] transition-colors cursor-pointer"
            >
              {t(settings.language, 'settings')}
            </button>
            <button
              type="button"
              onClick={() => setTab('controls')}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-white hover:border-rose-400 text-sm font-semibold text-[#1e1b2e] transition-colors cursor-pointer"
            >
              Touches & Clavier
            </button>
            <button
              type="button"
              onClick={onRespawn}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-white hover:border-rose-400 text-sm font-semibold text-[#1e1b2e] transition-colors cursor-pointer"
            >
              {t(settings.language, 'restart')}
            </button>
            <button
              type="button"
              onClick={onQuitToTitle}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-sm font-semibold text-rose-700 transition-colors cursor-pointer"
            >
              {t(settings.language, 'quitToTitle')}
            </button>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4 text-sm max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Volume principal</span>
                <span className="font-mono-tabular text-rose-600">{Math.round(settings.masterVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, masterVolume: Number(e.target.value) })
                }
                className="w-full accent-rose-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Sensibilité souris</span>
                <span className="font-mono-tabular text-rose-600">{settings.mouseSensitivity.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={settings.mouseSensitivity}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, mouseSensitivity: Number(e.target.value) })
                }
                className="w-full accent-rose-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qualité graphique</label>
                <select
                  value={settings.graphicsQuality}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      graphicsQuality: e.target.value as GraphicsQuality,
                    })
                  }
                  className="w-full rounded-lg bg-white border border-rose-200 px-2.5 py-2 text-xs font-medium text-[#1e1b2e] focus:outline-none focus:border-rose-400"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mode daltonien</label>
                <select
                  value={settings.colorblindMode}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      colorblindMode: e.target.value as ColorblindMode,
                    })
                  }
                  className="w-full rounded-lg bg-white border border-rose-200 px-2.5 py-2 text-xs font-medium text-[#1e1b2e] focus:outline-none focus:border-rose-400"
                >
                  <option value="none">Désactivé</option>
                  <option value="protanopia">Protanopie</option>
                  <option value="deuteranopia">Deutéranopie</option>
                  <option value="tritanopia">Tritanopie</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Taille de police</label>
                <select
                  value={settings.fontScale}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      fontScale: e.target.value as FontScale,
                    })
                  }
                  className="w-full rounded-lg bg-white border border-rose-200 px-2.5 py-2 text-xs font-medium text-[#1e1b2e] focus:outline-none focus:border-rose-400"
                >
                  <option value="normal">Normale</option>
                  <option value="large">Grande</option>
                  <option value="xlarge">Très grande</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Langue / Language</label>
                <select
                  value={settings.language}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      language: e.target.value as Language,
                    })
                  }
                  className="w-full rounded-lg bg-white border border-rose-200 px-2.5 py-2 text-xs font-medium text-[#1e1b2e] focus:outline-none focus:border-rose-400"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-rose-100">
              <label className="flex items-center justify-between text-xs font-medium text-slate-800 cursor-pointer">
                <span>Sous-titres des dialogues</span>
                <input
                  type="checkbox"
                  checked={settings.subtitlesEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, subtitlesEnabled: e.target.checked })
                  }
                  className="accent-rose-600 w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between text-xs font-medium text-slate-800 cursor-pointer">
                <span>Réduire les mouvements de caméra</span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, reducedMotion: e.target.checked })
                  }
                  className="accent-rose-600 w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between text-xs font-medium text-slate-800 cursor-pointer">
                <span>Cycle jour / nuit progressif</span>
                <input
                  type="checkbox"
                  checked={settings.dayCycleEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, dayCycleEnabled: e.target.checked })
                  }
                  className="accent-rose-600 w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between text-xs font-medium text-slate-800 cursor-pointer">
                <span>Traveling caméra sur l'accueil</span>
                <input
                  type="checkbox"
                  checked={settings.titleTravelingEnabled}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      titleTravelingEnabled: e.target.checked,
                    })
                  }
                  className="accent-rose-600 w-4 h-4"
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'controls' && (
          <div className="space-y-2.5 text-xs">
            {(Object.keys(ACTION_LABELS) as ActionName[]).map((action) => (
              <div
                key={action}
                className="flex items-center justify-between py-1.5 border-b border-rose-100"
              >
                <span className="font-medium text-slate-800">{ACTION_LABELS[action]}</span>
                <button
                  type="button"
                  onClick={() => setListeningAction(action)}
                  onKeyDown={(e) => {
                    if (listeningAction === action) handleCaptureKey(action, e);
                  }}
                  className="px-3 py-1 rounded-lg border border-rose-200 bg-white hover:border-rose-400 font-mono-tabular text-[#1e1b2e] cursor-pointer"
                >
                  {listeningAction === action
                    ? 'Appuyez sur une touche...'
                    : settings.bindings[action].map(formatKeyCode).join(' / ')}
                </button>
              </div>
            ))}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, bindings: DEFAULT_KEY_BINDINGS })
                }
                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-700 hover:border-rose-400 cursor-pointer font-semibold"
              >
                {t(settings.language, 'resetKeys')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
