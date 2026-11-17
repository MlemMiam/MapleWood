import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { NPCChoiceData, NPCData } from '../character/NPC';

export interface ActiveModalContent {
  kind: 'npc' | 'info' | 'basketball';
  title: string;
  subtitle?: string;
  body: string;
  imageUrl?: string;
  npc?: NPCData;
  choices?: NPCChoiceData[];
  scheduleImageUrl?: string;
}

interface DialogueUIProps {
  modal: ActiveModalContent;
  subtitlesEnabled: boolean;
  onSelectChoice: (choice: NPCChoiceData) => void;
  onClose: () => void;
  onDismissSchedule?: () => void;
  onBasketballComplete: (score: number) => void;
  onPlayChoiceSfx?: () => void;
  onPlayHoverSfx?: () => void;
  onVoiceBlip?: (char: string, speaker: string) => void;
}

export const DialogueUI: React.FC<DialogueUIProps> = ({
  modal,
  subtitlesEnabled,
  onSelectChoice,
  onClose,
  onDismissSchedule,
  onBasketballComplete,
  onPlayChoiceSfx,
  onPlayHoverSfx,
  onVoiceBlip,
}) => {
  const [shotsLeft, setShotsLeft] = useState(5);
  const [baskets, setBaskets] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const choiceIndexRef = useRef(0);
  const wheelAccumRef = useRef(0);
  const usedWheelRef = useRef(false);
  const [lastShotMsg, setLastShotMsg] = useState(
    'Appuyez sur Tirer lorsque le curseur est dans la zone rose !'
  );
  const [scheduleRevealed, setScheduleRevealed] = useState(false);
  const [typingState, setTypingState] = useState<{
    modal: ActiveModalContent | null;
    count: number;
  }>({ modal: null, count: 0 });

  const isNpc = modal.kind === 'npc';
  const fullBody = modal.body ?? '';
  const needsTypewriter = isNpc && subtitlesEnabled && fullBody.length > 0;
  const typedCount = needsTypewriter
    ? typingState.modal === modal
      ? typingState.count
      : 0
    : fullBody.length;
  const isTyping = needsTypewriter && typedCount < fullBody.length;
  const visibleBody = isNpc ? fullBody.slice(0, typedCount) : fullBody;
  const hasChoices = Boolean(modal.choices && modal.choices.length > 0);

  useEffect(() => {
    if (!needsTypewriter) {
      setTypingState({ modal, count: fullBody.length });
      return;
    }
    setTypingState({ modal, count: 0 });
    let idx = 0;
    let lastBlipMs = 0;
    const speaker = modal.title ?? '';
    const interval = window.setInterval(() => {
      idx += 1;
      setTypingState({ modal, count: idx });
      const ch = fullBody[idx - 1] ?? '';
      const nowMs = performance.now();
      if (onVoiceBlip && /[a-zA-ZÀ-ÿ0-9]/.test(ch) && nowMs - lastBlipMs >= 58) {
        lastBlipMs = nowMs;
        onVoiceBlip(ch, speaker);
      }
      if (idx >= fullBody.length) {
        window.clearInterval(interval);
      }
    }, 24);
    return () => window.clearInterval(interval);
  }, [modal, needsTypewriter, fullBody, onVoiceBlip]);

  useEffect(() => {
    if (!modal.scheduleImageUrl) {
      setScheduleRevealed(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setScheduleRevealed(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [modal.scheduleImageUrl]);

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
      hit ? 'Panier réussi ! Superbe tir !' : "Manqué ! Le ballon rebondit sur l'arceau."
    );
    if (nextShots === 0) {
      onBasketballComplete(nextBaskets);
    }
  };

  useEffect(() => {
    choiceIndexRef.current = 0;
    wheelAccumRef.current = 0;
    usedWheelRef.current = false;
    setChoiceIndex(0);
  }, [modal]);

  // Prevent Enter key from advancing or activating focused dialogue controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Mouse wheel selection for NPC dialogue choices (enabled once full sentence is displayed)
  useEffect(() => {
    if (!isNpc || !hasChoices || isTyping) return;
    const choices = modal.choices!;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      if (choices.length <= 1) return;

      let step = 0;
      if (Math.abs(e.deltaY) >= 24) {
        step = e.deltaY > 0 ? 1 : -1;
        wheelAccumRef.current = 0;
      } else {
        wheelAccumRef.current += e.deltaY;
        if (Math.abs(wheelAccumRef.current) >= 24) {
          step = wheelAccumRef.current > 0 ? 1 : -1;
          wheelAccumRef.current = 0;
        }
      }
      if (step === 0) return;

      usedWheelRef.current = true;
      const cur = choiceIndexRef.current;
      const next = Math.max(0, Math.min(cur + step, choices.length - 1));
      if (next !== cur) {
        choiceIndexRef.current = next;
        setChoiceIndex(next);
        onPlayHoverSfx?.();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [isNpc, hasChoices, isTyping, modal, onPlayHoverSfx]);

  const handleChoiceMouseEnter = useCallback(
    (idx: number) => {
      if (isTyping) return;
      usedWheelRef.current = false;
      if (choiceIndexRef.current !== idx) {
        choiceIndexRef.current = idx;
        setChoiceIndex(idx);
        onPlayHoverSfx?.();
      }
    },
    [isTyping, onPlayHoverSfx]
  );

  const handleNpcSurfaceClick = (e: React.MouseEvent) => {
    if (e.button !== 0 || isTyping) return;
    if (hasChoices) {
      const chosen = modal.choices![choiceIndexRef.current] ?? modal.choices![0];
      if (chosen) {
        onPlayChoiceSfx?.();
        onSelectChoice(chosen);
      }
      return;
    }
    onPlayChoiceSfx?.();
    onClose();
  };

  if (isNpc) {
    return (
      <div
        className={`fixed inset-0 z-40 flex flex-col justify-end pointer-events-auto select-none animate-fadeIn ${
          isTyping ? 'cursor-default' : 'cursor-pointer'
        }`}
        style={{
          background:
            'linear-gradient(to top, rgba(16, 13, 24, 0.80) 0%, rgba(16, 13, 24, 0.42) 34%, rgba(16, 13, 24, 0) 68%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogue-title"
        onClick={handleNpcSurfaceClick}
      >
        {/* Prototype Schedule Image Overlay */}
        {modal.scheduleImageUrl && scheduleRevealed && (
          <div
            className="mx-auto mb-5 w-[92%] max-w-2xl rounded-2xl border border-rose-300/70 p-3 shadow-2xl backdrop-blur-md transition-all duration-500 animate-fadeIn"
            style={{ backgroundColor: 'rgba(22, 18, 34, 0.88)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Document
                </span>
                <span className="text-xs md:text-sm font-semibold text-white">
                  Emploi du temps — Prototype
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onDismissSchedule && (
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={isTyping}
                    onClick={() => {
                      if (!isTyping) onDismissSchedule();
                    }}
                    className="px-3 py-1 text-[11px] font-medium rounded-full border border-white/25 text-white/90 hover:border-rose-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
                  >
                    Retour au dialogue
                  </button>
                )}
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={isTyping}
                  onClick={() => {
                    if (!isTyping) onClose();
                  }}
                  className="px-3 py-1 text-[11px] font-medium rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
                >
                  Fermer
                </button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/15 bg-white shadow-inner">
              <img
                src={modal.scheduleImageUrl}
                alt="Emploi du temps prototype — Lycée Maplewood"
                className="w-full h-auto max-h-[46vh] object-contain"
              />
            </div>
          </div>
        )}

        {/* Borderless Cinematic Dialogue HUD (Mockup Prototype) */}
        <div className="w-full max-w-6xl mx-auto px-6 md:px-12 pb-6 md:pb-9 flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-8">
          {/* Left: Handwritten Speaker Name + Vertical Rose Bar + Typewriter Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-1.5">
              <h2
                id="dialogue-title"
                className="text-3xl md:text-4xl font-bold text-rose-300 tracking-wide inline-flex items-center gap-2"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow:
                    '0 2px 14px rgba(225, 29, 72, 0.55), 0 1px 4px rgba(0, 0, 0, 0.85)',
                }}
              >
                <span>{modal.title}</span>
                <span className="text-rose-500 text-2xl md:text-3xl leading-none">♡</span>
              </h2>
              {modal.subtitle && (
                <span className="text-xs font-medium text-rose-200/80 tracking-wide">
                  {modal.subtitle}
                </span>
              )}
            </div>

            {subtitlesEnabled && fullBody && (
              <>
                {modal.imageUrl && (
                  <img
                    src={modal.imageUrl}
                    alt={modal.title}
                    className="max-w-full max-h-[50vh] rounded-xl border border-rose-300/60 shadow-lg mb-3"
                  />
                )}
                <div className="border-l-2 border-rose-500 pl-4 py-0.5">
                  <p
                    className="text-white text-base md:text-lg font-medium leading-relaxed whitespace-pre-line"
                    style={{ textShadow: '0 1px 8px rgba(0, 0, 0, 0.9)' }}
                  >
                    {visibleBody}
                  </p>
                </div>
              </>
            )}

            {/* Animated Continue Indicator (left click only, hidden while typing or during choices) */}
            {!isTyping && !hasChoices && (
              <div className="mt-2.5 pl-4 flex items-center gap-2 text-rose-400">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-bounce"
                >
                  <path d="m7 6 5 5 5-5" />
                  <path d="m7 13 5 5 5-5" />
                </svg>
                <span className="text-[11px] uppercase tracking-widest text-white/60">
                  Clic gauche pour continuer
                </span>
              </div>
            )}
          </div>

          {/* Right: Translucent Pill Choices with UI Rose Glow */}
          {hasChoices && (
            <div
              className={`w-full md:w-[340px] shrink-0 flex flex-col gap-2 transition-all duration-200 ${
                isTyping ? 'opacity-0 translate-y-1 pointer-events-none' : 'opacity-100 translate-y-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {modal.choices!.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  tabIndex={-1}
                  disabled={isTyping}
                  aria-selected={idx === choiceIndex}
                  onMouseEnter={() => handleChoiceMouseEnter(idx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.button !== 0 || isTyping) return;
                    const chosen = usedWheelRef.current
                      ? modal.choices![choiceIndexRef.current] ?? c
                      : c;
                    onPlayChoiceSfx?.();
                    onSelectChoice(chosen);
                  }}
                  className={`group w-full text-left px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    idx === choiceIndex
                      ? 'text-white bg-[#221a34]/80 border-2 border-rose-400 shadow-[0_0_18px_rgba(225,29,72,0.45)]'
                      : 'text-white/90 bg-[#161322]/60 backdrop-blur-md border border-white/20 hover:border-rose-400/95 hover:bg-[#221a34]/75 hover:text-white hover:shadow-[0_0_18px_rgba(225,29,72,0.45)]'
                  }`}
                >
                  <span className="truncate">{c.label}</span>
                  <span className="text-rose-400/80 group-hover:text-rose-300 group-hover:translate-x-0.5 transition-all text-base leading-none shrink-0">
                    ›
                  </span>
                </button>
              ))}
              {!isTyping && (
                <div className="flex items-center justify-end gap-2 px-1 pt-0.5 text-[10px] uppercase tracking-widest text-white/55">
                  <span>Molette : choisir</span>
                  <span>·</span>
                  <span>Clic gauche : confirmer</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col ${
        isNpc ? 'justify-end items-center pb-3 md:pb-5 px-3' : 'items-center justify-center p-4 md:p-6'
      }`}
      style={{
        background: isNpc
          ? 'linear-gradient(to top, rgba(30, 27, 46, 0.28) 0%, rgba(30, 27, 46, 0.05) 38%, rgba(30, 27, 46, 0) 100%)'
          : 'rgba(30, 27, 46, 0.42)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialogue-title"
    >
      {/* Prototype Schedule Image Overlay Transition */}
      {modal.scheduleImageUrl && scheduleRevealed && (
        <div
          className="mb-3 w-full max-w-2xl rounded-2xl border border-rose-300 p-3 shadow-2xl backdrop-blur-md transition-all duration-500 animate-fadeIn"
          style={{ backgroundColor: 'rgba(255, 249, 251, 0.96)' }}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Document
              </span>
              <span className="text-xs md:text-sm font-bold text-[#1e1b2e]">
                Emploi du temps — Prototype
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onDismissSchedule && (
                <button
                  type="button"
                  onClick={onDismissSchedule}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Retour au dialogue
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-rose-200 bg-white shadow-inner">
            <img
              src={modal.scheduleImageUrl}
              alt="Emploi du temps prototype — Lycée Maplewood"
              className="w-full h-auto max-h-[48vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Compact Frosted Sakura/Cream Dialogue & Info Card */}
      <div
        className={`w-full ${
          isNpc ? 'max-w-lg rounded-2xl p-3.5 md:p-4' : 'max-w-xl rounded-2xl p-5 md:p-6'
        } border border-rose-300 text-[#1e1b2e] shadow-2xl backdrop-blur-md`}
        style={{ backgroundColor: 'rgba(255, 249, 251, 0.93)' }}
      >
        <div className={`flex items-center justify-between gap-3 ${isNpc ? 'mb-2' : 'mb-3'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            {modal.subtitle && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                {modal.subtitle}
              </span>
            )}
            <h2
              id="dialogue-title"
              className={`font-display font-bold text-[#1e1b2e] ${
                isNpc ? 'text-base md:text-lg' : 'text-xl md:text-2xl'
              }`}
            >
              {modal.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-full border border-rose-200 text-[#3b334a] hover:border-rose-400 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
          >
            Fermer
          </button>
        </div>

        {modal.kind === 'basketball' ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                Paniers marqués :{' '}
                <strong className="font-mono-tabular text-rose-600">{baskets} / 5</strong>
              </span>
              <span className="font-mono-tabular text-[#574d68]">
                Tirs restants : {shotsLeft}
              </span>
            </div>

            <div className="relative h-7 rounded-full bg-rose-100 border border-rose-200 overflow-hidden">
              <div
                className="absolute top-0 bottom-0"
                style={{ left: '38%', width: '24%', backgroundColor: 'rgba(225, 29, 72, 0.25)' }}
              />
              <div
                className="absolute top-0 bottom-0 w-2.5 rounded-full bg-rose-600"
                style={{ left: `calc(${cursor}% - 5px)` }}
              />
            </div>

            <p className="text-sm text-[#3b334a]">{lastShotMsg}</p>

            <div className="flex items-center gap-3 pt-1">
              {shotsLeft > 0 ? (
                <button
                  type="button"
                  onClick={handleShoot}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Tirer au panier
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Terminer ({baskets} paniers)
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {subtitlesEnabled && modal.body && (
              <p
                className={`${
                  isNpc
                    ? 'text-xs md:text-sm leading-snug px-3 py-2 mb-2.5'
                    : 'text-sm md:text-base leading-relaxed px-4 py-3 mb-4'
                } text-[#2a2338] whitespace-pre-line bg-white/75 rounded-xl border border-rose-100`}
              >
                {modal.body}
              </p>
            )}

            {modal.choices && modal.choices.length > 0 ? (
              <div className={`flex flex-col ${isNpc ? 'gap-1.5' : 'gap-2'}`}>
                {modal.choices.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectChoice(c)}
                    className={`w-full text-left ${
                      isNpc ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
                    } rounded-xl border border-rose-200 bg-white/85 hover:border-rose-500 hover:bg-rose-50 font-semibold text-[#1e1b2e] transition-colors cursor-pointer flex items-center gap-2`}
                  >
                    <span
                      className={`font-mono-tabular font-bold bg-rose-600 text-white rounded-full flex items-center justify-center shrink-0 ${
                        isNpc ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-[11px]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
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
