import type { Language } from '../engine/InputBindings';

export const UI_STRINGS: Record<Language, Record<string, string>> = {
  fr: {
    exploreCampus: 'Explorer le campus',
    resume: 'Reprendre',
    fullMap: 'Carte complète',
    settings: 'Paramètres',
    restart: 'Replacer à l\'entrée',
    quitToTitle: 'Écran titre',
    pausedTitle: 'Pause — Maplewood High School',
    interactPrefix: 'Appuyer sur E pour',
    loadingTitle: 'Préparation du campus Maplewood...',
    stamina: 'Endurance',
    missions: 'Missions du campus',
    controlsHint: 'ZQSD / WASD Déplacer · Shift Courir · Espace Sauter · E Interagir · M Carte · Échap Pause',
    close: 'Fermer',
    save: 'Enregistrer',
    resetKeys: 'Réinitialiser les touches',
  },
  en: {
    exploreCampus: 'Explore Campus',
    resume: 'Resume',
    fullMap: 'Full Campus Map',
    settings: 'Settings',
    restart: 'Return to Entrance',
    quitToTitle: 'Title Screen',
    pausedTitle: 'Paused — Maplewood High School',
    interactPrefix: 'Press E to',
    loadingTitle: 'Preparing Maplewood Campus...',
    stamina: 'Stamina',
    missions: 'Campus Quests',
    controlsHint: 'WASD / ZQSD Move · Shift Sprint · Space Jump · E Interact · M Map · Esc Pause',
    close: 'Close',
    save: 'Save',
    resetKeys: 'Reset Controls',
  },
};

export function t(lang: Language, key: string): string {
  return UI_STRINGS[lang]?.[key] ?? UI_STRINGS.fr[key] ?? key;
}
