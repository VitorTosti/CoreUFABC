import { formatHorarioResumo } from "../../utils/grade-planner.js";

/**
 * Shows the list of currently selected turmas with color indicators and remove buttons.
 *
 * Props:
 *   selectedTurmas – array of turma objects (with _cor property injected)
 *   totalCredits   – number
 *   onRemove       – (turmaId) => void
 */
export function SelectedTurmasList({ selectedTurmas, totalCredits, onRemove }) {
  const MAX_CREDITS = 24;
  const pct = Math.min((totalCredits / MAX_CREDITS) * 100, 100);
  const isOver = totalCredits > MAX_CREDITS;

  if (selectedTurmas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-white/60 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-400" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-[0.82rem] font-black text-slate-400">Nenhuma turma selecionada</p>
        <p className="max-w-[13rem] text-[0.65rem] font-medium text-slate-300 leading-snug">
          Use o botão "Buscar turmas" para montar sua grade do quadrimestre.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {/* Credits counter */}
      <div className="rounded-2xl border border-emerald-200/80 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-400">Créditos</p>
          <p className={`text-[0.78rem] font-black ${isOver ? "text-rose-600" : "text-emerald-600"}`}>
            {totalCredits} / {MAX_CREDITS}
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-rose-500" : "bg-gradient-to-r from-emerald-400 to-emerald-600"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {isOver && (
          <p className="mt-1.5 text-[0.6rem] font-bold text-rose-600">
            Limite de 24 créditos excedido!
          </p>
        )}
      </div>

      {/* Turmas list */}
      <div className="flex flex-col gap-2">
        {selectedTurmas.map((turma) => (
          <div
            key={turma.id}
            className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
          >
            {/* Color indicator */}
            <div
              className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: turma._cor }}
            />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.82rem] font-black text-slate-950 leading-snug">
                {turma.nome}
              </p>
              <p className="mt-0.5 text-[0.6rem] font-semibold text-slate-400 font-mono">
                {turma.codigo}
              </p>
              <p className="mt-0.5 text-[0.6rem] font-medium text-slate-400">
                {formatHorarioResumo(turma.horarios)}
              </p>
            </div>

            {/* Credits + remove */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-black text-emerald-700">
                {turma.creditos}cr
              </span>
              <button
                type="button"
                onClick={() => onRemove(turma.id)}
                className="rounded-lg bg-rose-50 p-1 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
                aria-label={`Remover ${turma.nome}`}
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
