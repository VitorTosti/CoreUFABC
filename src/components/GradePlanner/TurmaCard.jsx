import { campusLabel, formatHorarioResumo, formatTpi } from "../../utils/grade-planner.js";

/**
 * Individual turma card shown in the search results list.
 *
 * Props:
 *   turma      – turma object from the API
 *   isSelected – boolean
 *   hasConflict – boolean
 *   onToggle   – () => void
 */
export function TurmaCard({ turma, isSelected, hasConflict, onToggle }) {
  const disabled = hasConflict && !isSelected;

  let borderClass = "border-slate-200";
  let badgeClass = "";
  let badgeText = "";

  if (isSelected) {
    borderClass = "border-emerald-400 bg-emerald-50/60";
    badgeClass = "bg-emerald-500 text-white";
    badgeText = "Selecionada";
  } else if (hasConflict) {
    borderClass = "border-rose-300 bg-rose-50/40";
    badgeClass = "bg-rose-500 text-white";
    badgeText = "Conflito";
  }

  return (
    <article
      className={`rounded-2xl border ${borderClass} bg-white p-3 shadow-sm transition-all duration-150 ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md active:scale-[0.98]"
      }`}
      onClick={disabled ? undefined : onToggle}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.82rem] font-black text-slate-950 leading-snug">
            {turma.nome}
          </p>
          <p className="mt-0.5 text-[0.62rem] font-semibold text-slate-400 font-mono">
            {turma.codigo}
          </p>
        </div>
        {badgeText && (
          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wide ${badgeClass}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Pill label={`${turma.creditos}cr`} color="bg-emerald-100 text-emerald-700" />
        <Pill label={`TPI ${formatTpi(turma.tpi)}`} color="bg-slate-100 text-slate-600" />
        <Pill label={campusLabel(turma.campus)} color="bg-blue-100 text-blue-700" />
        <Pill label={`${turma.vagas ?? "?"} vagas`} color="bg-amber-100 text-amber-700" />
      </div>

      {/* Horario resumo */}
      <p className="mt-1.5 text-[0.62rem] font-medium text-slate-500 leading-snug">
        {formatHorarioResumo(turma.horarios)}
      </p>
    </article>
  );
}

function Pill({ label, color }) {
  return (
    <span className={`rounded-md px-1.5 py-px text-[0.58rem] font-bold ${color}`}>
      {label}
    </span>
  );
}
