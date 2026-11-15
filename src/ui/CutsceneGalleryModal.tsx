import React, { useEffect } from 'react';
import { Film, Play, Sparkles } from 'lucide-react';

export type CutsceneGalleryId = 'intro' | 'postCustom';

export interface CutsceneGalleryEntry {
  id: CutsceneGalleryId;
  chapter: string;
  title: string;
  subtitle: string;
  duration: string;
  thumbnailUrl: string;
  tiltClass: string;
}

const CUTSCENE_ENTRIES: CutsceneGalleryEntry[] = [
  {
    id: 'intro',
    chapter: 'Souvenir #01',
    title: 'Rencontre avec Florie',
    subtitle: "Cinématique d'ouverture devant le lycée Maplewood.",
    duration: '12.6 s',
    thumbnailUrl: '/assets/aistudio/Florie_fb6f2606.jpg',
    tiltClass: '-rotate-1',
  },
  {
    id: 'postCustom',
    chapter: 'Souvenir #02',
    title: "L'Emploi du Temps & l'Oubli",
    subtitle: "Florie t'entraîne dans le hall jusqu'au bureau de Mme Parker.",
    duration: '25.2 s',
    thumbnailUrl: '/assets/ui/emploi_du_temps_prototype.jpg',
    tiltClass: 'rotate-1',
  },
];

interface CutsceneGalleryModalProps {
  onSelectCutscene: (id: CutsceneGalleryId) => void;
  onClose: () => void;
  onPlayHoverSfx?: () => void;
  onPlayClickSfx?: () => void;
}

export const CutsceneGalleryModal: React.FC<CutsceneGalleryModalProps> = ({
  onSelectCutscene,
  onClose,
  onPlayHoverSfx,
  onPlayClickSfx,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onPlayClickSfx?.();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onPlayClickSfx]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 select-none animate-fadeIn"
      style={{ backgroundColor: 'rgba(20, 15, 28, 0.72)', backdropFilter: 'blur(6px)' }}
      onClick={() => {
        onPlayClickSfx?.();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Album des cinématiques"
    >
      {/* Photo Album Sheet */}
      <div
        className="relative w-full max-w-4xl rounded-3xl border-2 border-rose-200/90 shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#fffaf7',
          backgroundImage:
            'radial-gradient(rgba(225, 29, 72, 0.06) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Album Spine Binding Dots on Left */}
        <div className="hidden sm:flex flex-col justify-evenly items-center absolute left-3 top-6 bottom-6 w-4 pointer-events-none opacity-45">
          {Array.from({ length: 8 }).map((_, idx) => (
            <span
              key={idx}
              className="w-2.5 h-2.5 rounded-full bg-rose-200 border border-rose-400/60 shadow-inner"
            />
          ))}
        </div>

        <div className="p-6 sm:pl-12 md:p-8 md:pl-14">
          {/* Album Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-rose-200/80">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300/80 text-rose-700 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                <Sparkles size={11} className="text-rose-600" />
                <span>Mode Dev · Toutes les cinématiques</span>
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#1e1b2e] flex items-center gap-2"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                <Film size={24} className="text-rose-600" />
                <span>Album des Cinématiques</span>
                <span className="text-rose-500">♡</span>
              </h2>
              <p className="text-xs md:text-sm text-[#574d68] mt-0.5">
                Clique sur une photo souvenir pour revoir la cinématique sans quitter ta position actuelle.
              </p>
            </div>

            <button
              type="button"
              onMouseEnter={() => onPlayHoverSfx?.()}
              onClick={() => {
                onPlayClickSfx?.();
                onClose();
              }}
              className="h-9 px-3.5 rounded-full border border-rose-200 bg-white text-xs font-semibold text-[#1e1b2e] hover:border-rose-400 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e11d48"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span>Fermer [Échap]</span>
            </button>
          </div>

          {/* Polaroid Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {CUTSCENE_ENTRIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => onPlayHoverSfx?.()}
                onClick={() => {
                  onPlayClickSfx?.();
                  onSelectCutscene(item.id);
                }}
                className={`group relative text-left bg-white p-3 pb-5 rounded-2xl border border-rose-200/80 shadow-md hover:shadow-xl hover:border-rose-400 transition-all duration-300 cursor-pointer ${item.tiltClass} hover:rotate-0 hover:-translate-y-1`}
              >
                {/* Decorative Washi Tape */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 rounded-sm bg-rose-300/65 border border-rose-400/30 shadow-xs -rotate-2 pointer-events-none"
                  aria-hidden="true"
                />

                {/* Photo Frame */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-rose-100">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={
                      item.id === 'intro' ? { objectPosition: '43% 18%' } : undefined
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b2e]/55 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Play Badge */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-rose-500 transition-all">
                      <Play size={20} className="ml-0.5 fill-white" />
                    </div>
                  </div>

                  {/* Chapter & Duration Pills */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-white/90 text-rose-700 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                      {item.chapter}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1e1b2e]/80 text-white font-mono-tabular text-[10px] font-semibold">
                      {item.duration}
                    </span>
                  </div>
                </div>

                {/* Handwritten Polaroid Caption */}
                <div className="pt-3 px-1">
                  <h3
                    className="text-2xl font-bold text-[#1e1b2e] group-hover:text-rose-600 transition-colors leading-tight"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#5c516b] mt-1 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
