import React, { useEffect } from 'react';
import { ELEVATOR_FLOORS, type ElevatorSide } from '../world/buildings/ElevatorSystem';

interface ElevatorModalProps {
  side: ElevatorSide;
  currentFloor: number;
  onSelectFloor: (floorIndex: number) => void;
  onClose: () => void;
}

interface FloorConfig {
  code: string;
  title: string;
  subtitle: string;
  dept: string;
}

const FLOOR_CONFIGS: Record<number, FloorConfig> = {
  3: {
    code: '3',
    title: 'Étage 3',
    subtitle: 'Direction générale, Salle des professeurs & Clubs',
    dept: 'Administration',
  },
  2: {
    code: '2',
    title: 'Étage 2',
    subtitle: 'Grande Bibliothèque, Laboratoires de sciences & Salle de conférence',
    dept: 'Recherche & Documentation',
  },
  1: {
    code: '1',
    title: 'Étage 1',
    subtitle: 'Salles de cours, Atelier Arts plastiques, Musique & Informatique',
    dept: 'Enseignement',
  },
  0: {
    code: 'RDC',
    title: 'Rez-de-chaussée',
    subtitle: "Grand Hall d'accueil, Cafétéria du campus & Cour d'honneur",
    dept: 'Accueil & Vie scolaire',
  },
};

export const ElevatorModal: React.FC<ElevatorModalProps> = ({
  side,
  currentFloor,
  onSelectFloor,
  onClose,
}) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sideLabel = side === 'east' ? 'Aile Est' : 'Aile Ouest';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl border border-rose-300 text-[#1e1b2e] shadow-2xl p-5 md:p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        style={{ backgroundColor: 'rgba(255, 249, 251, 0.96)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-rose-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                {sideLabel}
              </span>
              <span className="text-xs font-semibold text-[#574d68]">
                Ascenseur panoramique
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-[#1e1b2e] tracking-tight">
              Choisir votre destination
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold rounded-full border border-rose-200 text-[#3b334a] hover:border-rose-400 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Fermer (Échap)"
          >
            Fermer
          </button>
        </div>

        {/* Current status pill */}
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between text-xs">
          <span className="font-medium text-[#574d68]">Position actuelle de la cabine :</span>
          <span className="font-semibold text-rose-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{ELEVATOR_FLOORS[currentFloor]?.name || 'Rez-de-chaussée (RDC)'}</span>
          </span>
        </div>

        {/* Floor Selection List */}
        <div className="space-y-2.5">
          {[3, 2, 1, 0].map((floorIdx) => {
            const isCurrent = floorIdx === currentFloor;
            const cfg = FLOOR_CONFIGS[floorIdx];

            return (
              <button
                key={floorIdx}
                type="button"
                onClick={() => onSelectFloor(floorIdx)}
                className={`w-full group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 text-left cursor-pointer ${
                  isCurrent
                    ? 'bg-rose-100/70 border-rose-400/80 shadow-sm'
                    : 'bg-white border-rose-200/90 hover:border-rose-400 hover:bg-rose-50/50 hover:translate-x-0.5 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Floor Code Badge */}
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm border transition-colors shrink-0 ${
                      isCurrent
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-rose-50 text-rose-800 border-rose-200 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600'
                    }`}
                  >
                    {cfg.code}
                  </div>

                  {/* Text details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1e1b2e] group-hover:text-rose-700 transition-colors">
                        {cfg.title}
                      </span>
                      <span className="text-[10px] font-semibold text-[#574d68] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {cfg.dept}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-200/70 border border-rose-300 px-2 py-0.5 rounded-full">
                          Étage actuel
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#574d68] mt-0.5 truncate">
                      {cfg.subtitle}
                    </p>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="text-rose-600 text-base font-bold opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all pl-2 shrink-0">
                  →
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-[#574d68]">
          <span>Appuyez sur un étage pour démarrer l&apos;ascenseur</span>
          <span className="font-medium text-rose-600">Échap pour fermer</span>
        </div>
      </div>
    </div>
  );
};
