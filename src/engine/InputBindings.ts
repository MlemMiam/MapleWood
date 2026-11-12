export type ActionName =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'sprint'
  | 'jump'
  | 'interact'
  | 'map'
  | 'pause';

export type KeyBindings = Record<ActionName, string[]>;

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type FontScale = 'normal' | 'large' | 'xlarge';
export type Language = 'fr' | 'en';

export interface GameSettings {
  masterVolume: number;
  mouseSensitivity: number;
  graphicsQuality: GraphicsQuality;
  dayCycleEnabled: boolean;
  subtitlesEnabled: boolean;
  reducedMotion: boolean;
  colorblindMode: ColorblindMode;
  fontScale: FontScale;
  language: Language;
  bindings: KeyBindings;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: ['KeyW', 'KeyZ', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'KeyQ', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyE'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
};

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.65,
  mouseSensitivity: 1.0,
  graphicsQuality: 'medium',
  dayCycleEnabled: false,
  subtitlesEnabled: true,
  reducedMotion: false,
  colorblindMode: 'none',
  fontScale: 'normal',
  language: 'fr',
  bindings: DEFAULT_KEY_BINDINGS,
};

const STORAGE_KEY = 'maplewood_highschool_settings_v1';

export function loadSettings(): GameSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_KEY_BINDINGS } };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_KEY_BINDINGS } };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      bindings: {
        ...DEFAULT_KEY_BINDINGS,
        ...(parsed.bindings || {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_KEY_BINDINGS } };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code === 'Space') return 'Espace';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'Escape') return 'Échap';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  return code;
}

export function isActionCode(
  code: string,
  action: ActionName,
  bindings: KeyBindings
): boolean {
  return bindings[action].includes(code);
}
