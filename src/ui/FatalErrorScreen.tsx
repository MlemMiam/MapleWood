type FatalErrorScreenProps = {
  title?: string;
  message: string;
  details?: string;
};

export function FatalErrorScreen({
  title = 'Le jeu a rencontré un problème',
  message,
  details,
}: FatalErrorScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0912]/95 p-6 text-white"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-xl rounded-2xl border border-rose-400/40 bg-[#171322]/95 p-8 text-center shadow-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">
          Maplewood High School
        </p>
        <h1 className="mb-3 text-2xl font-bold">{title}</h1>
        <p className="mb-5 text-sm leading-relaxed text-white/75">{message}</p>
        {details && (
          <pre className="mb-6 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-rose-200">
            {details}
          </pre>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
        >
          Recharger le jeu
        </button>
      </div>
    </div>
  );
}
