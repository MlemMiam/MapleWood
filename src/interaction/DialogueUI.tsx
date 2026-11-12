import React, { useEffect, useState } from 'react';
import type { NPCChoiceData, NPCData } from '../character/NPC';

export interface ActiveModalContent {
  kind: 'npc' | 'info' | 'basketball';
  title: string;
  subtitle?: string;
  body: string;
  npc?: NPCData;
  choices?: NPCChoiceData[];
}

interface DialogueUIProps {
  modal: ActiveModalContent;
  subtitlesEnabled: boolean;
  onSelectChoice: (choice: NPCChoiceData) => void;
  onClose: () => void;
  onBasketballComplete: (score: number) => void;
}

export const DialogueUI: React.FC<DialogueUIProps> = ({
  modal,
  subtitlesEnabled,
  onSelectChoice,
  onClose,
  onBasketballComplete,
}) => {
  // Basketball mini-game state
  const [shotsLeft, setShotsLeft] = useState(5);
  const [baskets, setBaskets] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [lastShotMsg, setLastShotMsg] = useState('Appuyez sur Tirer lorsque le curseur est dans la zone dorée !');

  useEffect(() => {
    if (modal.kind !== 'basketball' || shotsLeft <= 0) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) * 0.0042;
      setCursor((Math.sin(t) + 1) * 50);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [modal.kind, shotsLeft]);

  const handleShoot = () => {
    if (shotsLeft <= 0) return;
    const hit = cursor >= 38 && cursor <= 62;
    const nextBaskets = hit ? baskets + 1 : baskets;
    const nextShots = shotsLeft - 1;
    setBaskets(nextBaskets);
    setShotsLeft(nextShots);
    setLastShotMsg(
      hit ? 'Panier réussi ! Superbe tir !' : 'Manqué ! Le ballon rebondit sur l\'arceau.'
    );
    if (nextShots === 0) {
      onBasketballComplete(nextBaskets);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 md:p-6"
      style={{ backgroundColor: 'rgba(6, 11, 20, 0.58)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialogue-title"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-[#D4AF37] p-6 text-slate-100 shadow-2xl"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            {modal.subtitle && (
              <div className="text-xs font-medium text-[#D4AF37] mb-0.5">
                {modal.subtitle}
              </div>
            )}
            <h2 id="dialogue-title" className="font-display text-2xl font-bold text-white">
              {modal.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-600 text-slate-200 hover:border-[#D4AF37] cursor-pointer"
          >
            Fermer
          </button>
        </div>

        {modal.kind === 'basketball' ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                Paniers marqués :{' '}
                <strong className="font-mono-tabular text-[#D4AF37]">{baskets} / 5</strong>
              </span>
              <span className="font-mono-tabular text-slate-300">
                Tirs restants : {shotsLeft}
              </span>
            </div>

            <div className="relative h-7 rounded-md bg-slate-800 border border-slate-600 overflow-hidden">
              <div
                className="absolute top-0 bottom-0"
                style={{ left: '38%', width: '24%', backgroundColor: 'rgba(212, 175, 55, 0.35)' }}
              />
              <div
                className="absolute top-0 bottom-0 w-2 rounded-sm"
                style={{
                  left: `calc(${cursor}% - 4px)`,
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>

            <p className="text-sm text-slate-200">{lastShotMsg}</p>

            <div className="flex items-center gap-3 pt-1">
              {shotsLeft > 0 ? (
                <button
                  type="button"
                  onClick={handleShoot}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold text-[#0F172A] cursor-pointer"
                  style={{ backgroundColor: '#D4AF37' }}
                >
                  Tirer au panier
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-md text-sm font-semibold text-[#0F172A] cursor-pointer"
                  style={{ backgroundColor: '#D4AF37' }}
                >
                  Terminer ({baskets} paniers)
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {subtitlesEnabled && (
              <p className="text-sm md:text-base text-slate-200 leading-relaxed whitespace-pre-line mb-5">
                {modal.body}
              </p>
            )}

            {modal.choices && modal.choices.length > 0 ? (
              <div className="flex flex-col gap-2">
                {modal.choices.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectChoice(c)}
                    className="w-full text-left px-4 py-2.5 rounded-md border border-slate-700 hover:border-[#D4AF37] hover:bg-[#1F3864]/70 text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-md text-sm font-semibold text-[#0F172A] cursor-pointer"
                  style={{ backgroundColor: '#D4AF37' }}
                >
                  Continuer
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
