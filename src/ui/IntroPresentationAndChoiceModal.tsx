import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Compass,
  Play,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';

export type StudentArchetypeId = 'athlete' | 'scholar' | 'leader';
export type StartingPointId = 'lobby' | 'corridor' | 'gym' | 'courtyard';

export interface PlayerChoiceSelection {
  firstName: string;
  archetype: StudentArchetypeId;
  archetypeLabel: string;
  startingPoint: StartingPointId;
  spawn: { x: number; y: number; z: number; yaw: number; zoneLabel: string };
}

interface IntroPresentationAndChoiceModalProps {
  mode: 'presentation2d' | 'playerChoice';
  onAdvanceToChoice: () => void;
  onConfirmChoice: (selection: PlayerChoiceSelection) => void;
}

const ARCHETYPES: Array<{
  id: StudentArchetypeId;
  title: string;
  badge: string;
  desc: string;
  perk: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'leader',
    title: 'Délégué·e Charismatique',
    badge: 'Conseil des Élèves',
    desc: 'Toujours prêt·e à aider ses camarades et à représenter les Aigles de Maplewood auprès du Proviseur.',
    perk: 'Bonus : Accueil privilégié dans le Hall & suivi prioritaire des missions du campus',
    icon: <Users size={20} className="text-[#D4AF37]" />,
  },
  {
    id: 'scholar',
    title: 'Prodige Académique',
    badge: 'Club Sciences & Lettres',
    desc: 'Passionné·e par les énigmes, les expériences du laboratoire de chimie et les archives de la bibliothèque.',
    perk: 'Bonus : Affinité avec l’Aile Scientifique, la Bibliothèque & la recherche d’objets',
    icon: <BookOpen size={20} className="text-sky-300" />,
  },
  {
    id: 'athlete',
    title: 'Athlète des Aigles',
    badge: 'Équipe Varsity',
    desc: 'Énergie débordante sur le terrain de sport et au gymnase pour relever tous les défis physiques.',
    perk: 'Bonus : Endurance maximale dès le départ & affinité avec le Coach Miller',
    icon: <Trophy size={20} className="text-amber-300" />,
  },
];

const STARTING_POINTS: Array<{
  id: StartingPointId;
  title: string;
  subtitle: string;
  desc: string;
  recommended?: boolean;
  spawn: { x: number; y: number; z: number; yaw: number; zoneLabel: string };
}> = [
  {
    id: 'lobby',
    title: 'Suivre Florie dans le Hall d’Entrée',
    subtitle: 'Bâtiment Principal · Intérieur',
    desc: 'Franchis les grandes portes avec Florie et rencontre Mme Vance à l’accueil pour lancer ta journée.',
    recommended: true,
    spawn: {
      x: 0,
      y: 0.05,
      z: -7.8,
      yaw: 0,
      zoneLabel: "Hall d'entrée (avec Florie)",
    },
  },
  {
    id: 'corridor',
    title: 'Couloir Principal & Casiers',
    subtitle: 'Aile des Salles de Cours',
    desc: 'Rejoins directement Léo près des casiers pour l’aider à retrouver son carnet de biologie égaré.',
    spawn: {
      x: -4,
      y: 0.05,
      z: -14,
      yaw: Math.PI / 2,
      zoneLabel: 'Couloir Principal',
    },
  },
  {
    id: 'gym',
    title: 'Gymnase des Aigles',
    subtitle: 'Terrain de Basket Indoor',
    desc: 'Rends-toi directement sur le parquet des Aigles pour relever le défi de lancers francs du Coach Miller.',
    spawn: {
      x: 0,
      y: 0.05,
      z: -36,
      yaw: 0,
      zoneLabel: 'Gymnase Principal',
    },
  },
  {
    id: 'courtyard',
    title: 'Cour Centrale & Fontaine',
    subtitle: 'Campus Extérieur',
    desc: 'Profite du soleil matinal dans la cour centrale avant d’entrer dans les bâtiments.',
    spawn: {
      x: 0,
      y: 0.05,
      z: 6,
      yaw: 0,
      zoneLabel: 'Cour Centrale',
    },
  },
];

export const IntroPresentationAndChoiceModal: React.FC<
  IntroPresentationAndChoiceModalProps
> = ({ mode, onAdvanceToChoice, onConfirmChoice }) => {
  const [elapsed2d, setElapsed2d] = useState(0);
  const [firstName, setFirstName] = useState('Alex');
  const [selectedArchetype, setSelectedArchetype] =
    useState<StudentArchetypeId>('leader');
  const [selectedStart, setSelectedStart] = useState<StartingPointId>('lobby');

  const PRESENTATION_DURATION = 5.4;

  // Timer for the 2D presentation mini-animation before auto-advancing to Player Choice
  useEffect(() => {
    if (mode !== 'presentation2d') return;
    setElapsed2d(0);
    const start = performance.now();
    const interval = window.setInterval(() => {
      const sec = (performance.now() - start) / 1000;
      if (sec >= PRESENTATION_DURATION) {
        window.clearInterval(interval);
        onAdvanceToChoice();
      } else {
        setElapsed2d(sec);
      }
    }, 40);
    return () => window.clearInterval(interval);
  }, [mode, onAdvanceToChoice]);

  const handleConfirm = () => {
    const arch =
      ARCHETYPES.find((a) => a.id === selectedArchetype) || ARCHETYPES[0];
    const dest =
      STARTING_POINTS.find((s) => s.id === selectedStart) || STARTING_POINTS[0];
    onConfirmChoice({
      firstName: firstName.trim() || 'Alex',
      archetype: arch.id,
      archetypeLabel: arch.title,
      startingPoint: dest.id,
      spawn: dest.spawn,
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' && e.code !== 'Enter') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (mode === 'presentation2d') {
          onAdvanceToChoice();
        } else {
          handleConfirm();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (mode === 'presentation2d') {
    const pct = Math.min(100, (elapsed2d / PRESENTATION_DURATION) * 100);
    const step1Visible = elapsed2d >= 0.25;
    const step2Visible = elapsed2d >= 1.35;
    const step3Visible = elapsed2d >= 2.45;

    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8 select-none overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(30, 58, 138, 0.96) 0%, rgba(11, 19, 34, 0.98) 100%)',
        }}
        data-testid="presentation-2d-modal"
      >
        {/* Animated 2D Anime Diagonal Speed-Lines Backdrop */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <g stroke="#D4AF37" strokeWidth="2">
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1={-100 + i * 55}
                y1={0}
                x2={200 + i * 55}
                y2={1000}
              />
            ))}
          </g>
        </svg>

        <div className="relative z-10 w-full max-w-5xl rounded-2xl border-2 border-[#D4AF37] bg-[#0B1322]/95 shadow-2xl overflow-hidden p-6 md:p-8">
          {/* Top Anime Sequence Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#D4AF37]/40">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37] text-[#0F172A] text-xs font-extrabold uppercase tracking-wider">
                <Sparkles size={13} />
                Présentation 2D Anime
              </span>
              <h2 className="font-display text-lg md:text-2xl font-extrabold text-white tracking-wide">
                Bienvenue chez les Aigles de Maplewood !
              </h2>
            </div>

            <button
              type="button"
              onClick={onAdvanceToChoice}
              className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-[#0F172A] font-display text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Passer au Choix du Joueur [Espace]</span>
              <Play size={13} />
            </button>
          </div>

          {/* Main 2D Anime Character Splash + 3 Sequential Campus Presentation Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Animated 2D Anime Character Card of Florie */}
            <div className="lg:col-span-5 flex flex-col items-center text-center bg-gradient-to-b from-[#1E3A8A]/60 to-[#0F172A]/90 rounded-2xl border-2 border-[#F5E08B] p-5 shadow-xl">
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden border-2 border-[#D4AF37] bg-[#FDF8EE] shadow-lg mb-4">
                <img
                  src="/assets/aistudio/Florie_fb6f2606.jpg"
                  alt="Florie — Guide de Maplewood"
                  className="w-full h-full object-cover transition-transform duration-700"
                  style={{
                    objectPosition: '43% 14%',
                    transform: `scale(${1.58 + Math.sin(elapsed2d * 2.5) * 0.04})`,
                  }}
                />
                <div className="absolute bottom-0 inset-x-0 bg-[#D4AF37] text-[#0F172A] text-[11px] font-extrabold py-1 uppercase tracking-wider">
                  Florie · Ambassadrice des Aigles
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-[#0F172A]/90 border border-[#D4AF37]/50 text-sm text-amber-100 leading-relaxed">
                « On y est ! Voici un aperçu rapide des trois grandes ailes du
                lycée avant que tu choisisses ton profil d’élève ! »
              </div>
            </div>

            {/* Right: 3 Staggered 2D Anime Presentation Cards */}
            <div className="lg:col-span-7 flex flex-col gap-3.5">
              <div
                className={`p-4 rounded-xl border transition-all duration-500 flex items-start gap-3.5 ${
                  step1Visible
                    ? 'opacity-100 translate-x-0 border-[#D4AF37] bg-[#162847]/90'
                    : 'opacity-0 translate-x-6 border-slate-700 bg-slate-900/40'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] shrink-0">
                  <Compass size={22} />
                </div>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#F5E08B]">
                    01 · Hall d’Entrée & Administration
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Accueil de Mme Vance & Bureau du Proviseur
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Le cœur officiel du lycée : récupère ta feuille de route et
                    consulte le tableau d’honneur des Aigles.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all duration-500 flex items-start gap-3.5 ${
                  step2Visible
                    ? 'opacity-100 translate-x-0 border-sky-400/80 bg-[#162847]/90'
                    : 'opacity-0 translate-x-6 border-slate-700 bg-slate-900/40'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-300 shrink-0">
                  <BookOpen size={22} />
                </div>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    02 · Salles de Cours, Labo Sciences & Bibliothèque
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    32 Zones Explorables & Quête du Carnet Perdu
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Aide Léo près des casiers, explore le laboratoire de chimie
                    et retrouve les ouvrages rares auprès de Mme Chen.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all duration-500 flex items-start gap-3.5 ${
                  step3Visible
                    ? 'opacity-100 translate-x-0 border-amber-400/80 bg-[#162847]/90'
                    : 'opacity-0 translate-x-6 border-slate-700 bg-slate-900/40'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                  <Trophy size={22} />
                </div>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    03 · Gymnase des Aigles, Cafétéria & Stade
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Défi Basket du Coach Miller & Vie Étudiante
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Marque des paniers au gymnase pour décrocher le titre de MVP
                    et débloquer les félicitations du Proviseur !
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Timeline Progress Bar */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
            <span className="text-xs font-semibold text-[#D4AF37]">
              Transition vers le Choix du Joueur…
            </span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F5E08B] transition-all duration-75"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-mono-tabular text-slate-300">
              {Math.max(0, PRESENTATION_DURATION - elapsed2d).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    );
  }

  // MODE 2: LE CHOIX DU JOUEUR (Interactive RPG / Visual Novel Selection Screen)
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-6 select-none overflow-y-auto"
      style={{
        background:
          'radial-gradient(circle at 50% 25%, rgba(23, 37, 84, 0.96) 0%, rgba(9, 13, 22, 0.98) 100%)',
      }}
      data-testid="player-choice-modal"
    >
      <div className="relative z-10 w-full max-w-5xl rounded-2xl border-2 border-[#D4AF37] bg-[#0B1322]/95 shadow-2xl p-5 md:p-7 my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#D4AF37]/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#F5E08B] bg-[#FDF8EE] shrink-0">
              <img
                src="/assets/aistudio/Florie_fb6f2606.jpg"
                alt="Florie"
                className="w-full h-full object-cover"
                style={{ objectPosition: '43% 14%', transform: 'scale(1.6)' }}
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#F5E08B] text-[#2B1810] text-[11px] font-extrabold uppercase tracking-wider">
                <UserCheck size={12} />
                Le Choix du Joueur
              </div>
              <h2 className="font-display text-lg md:text-2xl font-extrabold text-white mt-0.5">
                Personnalise ton profil d’élève & ta première destination
              </h2>
            </div>
          </div>

          <button
            type="button"
            data-testid="confirm-player-choice-btn"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#0F172A] font-display text-sm font-extrabold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Award size={16} />
            <span>Commencer l’aventure [Entrée]</span>
          </button>
        </div>

        {/* Step 0: First Name Input */}
        <div className="mb-5">
          <label
            htmlFor="player-first-name"
            className="block text-xs font-extrabold uppercase tracking-wider text-[#F5E08B] mb-2"
          >
            0. Ton prénom pour l’emploi du temps
          </label>
          <input
            id="player-first-name"
            type="text"
            maxLength={24}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Entre ton prénom..."
            className="w-full md:w-80 px-4 py-2.5 rounded-xl border-2 border-[#D4AF37]/70 bg-slate-900/80 text-white font-display text-base font-bold focus:outline-none focus:border-[#F5E08B]"
          />
        </div>

        {/* Step 1: Student Profile / Club Archetype */}
        <div className="mb-6">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#F5E08B] mb-2.5">
            1. Quel type d’élève incarnes-tu à Maplewood ?
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {ARCHETYPES.map((arch) => {
              const active = selectedArchetype === arch.id;
              return (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() => setSelectedArchetype(arch.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-[#D4AF37] bg-[#1E3A8A]/65 shadow-lg scale-[1.01]'
                      : 'border-slate-700/80 bg-slate-900/60 hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-[#F5E08B] uppercase tracking-wider">
                        {arch.badge}
                      </span>
                      {arch.icon}
                    </div>
                    <div className="font-display text-base font-extrabold text-white">
                      {arch.title}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {arch.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/60 text-[11px] font-semibold text-amber-200">
                    {arch.perk}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Starting Destination Choice */}
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#F5E08B] mb-2.5">
            2. Par où veux-tu commencer la visite avec Florie ?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STARTING_POINTS.map((dest) => {
              const active = selectedStart === dest.id;
              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => setSelectedStart(dest.id)}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-[#D4AF37] bg-[#1E3A8A]/65 shadow-lg'
                      : 'border-slate-700/80 bg-slate-900/60 hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                        {dest.subtitle}
                      </span>
                      {dest.recommended && (
                        <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#0F172A] text-[9px] font-extrabold uppercase">
                          Recommandé
                        </span>
                      )}
                    </div>
                    <div className="font-display text-sm font-bold text-white">
                      {dest.title}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                      {dest.desc}
                    </p>
                  </div>
                  <div className="mt-2.5 text-[11px] font-bold text-[#F5E08B]">
                    {active ? '✓ Sélectionné' : 'Cliquer pour choisir'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
