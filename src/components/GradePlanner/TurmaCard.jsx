import { campusLabel, formatHorarioResumo, formatTpi } from "../../utils/grade-planner.js";
import { PLAN_CODE_SETS } from "../../services/turmas-service.js";
import { normalizeRawCourseCode } from "../../services/sigaa-record-parser.js";

/* ─── Mapeamento visual por curso ─────────────────────────────────────── */
const CURSO_STYLE = {
  BCT: { label: "BC&T", bg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  BCH: { label: "BC&H", bg: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  LCN: { label: "LC&N", bg: "bg-teal-100 text-teal-700",       dot: "bg-teal-500" },
  LCH: { label: "LC&H", bg: "bg-cyan-100 text-cyan-700",       dot: "bg-cyan-500" },
};

const CURSO_KEYS = ["BCT", "BCH", "LCN", "LCH"];

/**
 * Retorna quais cursos (BCT/BCH/LCN/LCH) incluem esta disciplina
 * na sua grade curricular.
 */
function getCursosForTurma(codigoRaw) {
  const normalized = normalizeRawCourseCode(codigoRaw);
  return CURSO_KEYS.filter((key) => PLAN_CODE_SETS[key]?.has(normalized));
}

/**
 * Separa o nome da disciplina do código de turma e turno.
 *
 * Entrada:  "FUNÇÕES DE UMA VARIÁVEL A1-Diurno (Santo André)"
 * Saída:    { disciplina: "FUNÇÕES DE UMA VARIÁVEL", turma: "A1", turno: "Diurno" }
 */
function parseTurmaNome(nome) {
  // Padrão: "NOME DA DISCIPLINA TURMA-Turno (Campus)"
  // TURMA é um código como A1, A2, B1, etc.
  const match = /^(.+?)\s+([A-Z]\d+)(?:-(Diurno|Noturno))?\s*(?:\(.*\))?\s*$/.exec(nome?.trim() ?? "");
  if (match) {
    return {
      disciplina: match[1].trim(),
      turma: match[2],           // "A1"
      turno: match[3] ?? null,   // "Diurno" | "Noturno" | null
    };
  }
  return { disciplina: nome ?? "", turma: null, turno: null };
}

/**
 * Card de turma exibido na lista de resultados de busca.
 *
 * Props:
 *   turma       – objeto de turma do JSON
 *   isSelected  – boolean
 *   hasConflict – boolean
 *   onToggle    – () => void
 *   enrollment  – { vagas, requisicoes, ratio } | null (dados de matrícula em tempo real)
 */
export function TurmaCard({ turma, isSelected, hasConflict, onToggle, enrollment }) {
  const disabled = hasConflict && !isSelected;
  const { disciplina, turma: turmaCode, turno } = parseTurmaNome(turma.nome);
  const cursos = getCursosForTurma(turma.codigo);

  /* ── Estado visual do card ── */
  let cardBorder = "border-slate-200";
  let statusBadge = null;

  if (isSelected) {
    cardBorder = "border-emerald-400 bg-emerald-50/50 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]";
    statusBadge = { label: "✓ Selecionada", style: "bg-emerald-500 text-white" };
  } else if (hasConflict) {
    cardBorder = "border-rose-300 bg-rose-50/40";
    statusBadge = { label: "Conflito de horário", style: "bg-rose-500 text-white" };
  }

  return (
    <article
      className={`rounded-2xl border ${cardBorder} bg-white p-3.5 shadow-sm transition-all duration-150 ${
        disabled
          ? "cursor-not-allowed opacity-55"
          : "cursor-pointer hover:shadow-md hover:-translate-y-px active:scale-[0.98]"
      }`}
      onClick={disabled ? undefined : onToggle}
    >
      {/* ── Linha superior: nome limpo + badge de estado ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[0.82rem] font-black leading-snug text-slate-950">
            {disciplina}
          </h3>
          <p className="mt-0.5 font-mono text-[0.6rem] font-semibold text-slate-400">
            {turma.codigo}
          </p>
        </div>

        {statusBadge && (
          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-wide ${statusBadge.style}`}>
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* ── Linha de turma, turno e cursos ── */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {/* Código de turma: A1, A2 … */}
        {turmaCode && (
          <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[0.6rem] font-black text-violet-700">
            {turmaCode}
          </span>
        )}

        {/* Turno: Diurno / Noturno */}
        {turno && (
          <span className={`rounded-lg px-2 py-0.5 text-[0.6rem] font-bold ${
            turno === "Noturno"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-sky-100 text-sky-700"
          }`}>
            {turno}
          </span>
        )}

        {/* Cursos que incluem esta disciplina */}
        {cursos.map((key) => {
          const s = CURSO_STYLE[key];
          return (
            <span key={key} className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[0.6rem] font-black ${s.bg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          );
        })}

        {/* Se não pertence a nenhum curso mapeado */}
        {cursos.length === 0 && (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[0.6rem] font-semibold text-slate-500">
            Livre
          </span>
        )}
      </div>

      {/* ── Divisor ── */}
      <div className="my-2.5 h-px bg-slate-100" />

      {/* ── Metadados: créditos, TPI, campus, vagas ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill label={`${turma.creditos}cr`}       color="bg-emerald-100 text-emerald-700" />
        <Pill label={`TPI ${formatTpi(turma.tpi)}`} color="bg-slate-100 text-slate-600" />
        <Pill label={campusLabel(turma.campus)}   color="bg-blue-100 text-blue-700" />
        {turma.vagas != null && !enrollment && (
          <Pill label={`${turma.vagas} vagas`} color="bg-amber-100 text-amber-700" />
        )}
        {enrollment && (
          <EnrollmentPill requisicoes={enrollment.requisicoes} vagas={enrollment.vagas} />
        )}
      </div>

      {/* ── Horário ── */}
      <p className="mt-1.5 text-[0.62rem] font-medium leading-snug text-slate-500">
        {formatHorarioResumo(turma.horarios)}
      </p>
    </article>
  );
}

function Pill({ label, color }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[0.58rem] font-bold ${color}`}>
      {label}
    </span>
  );
}

/**
 * Pill com dados de matrícula em tempo real.
 * Muda de cor conforme a lotação: verde (<50%), amarelo (50-85%), vermelho (>85%).
 */
function EnrollmentPill({ requisicoes, vagas }) {
  const ratio = vagas > 0 ? requisicoes / vagas : 0;
  let colorClass;
  let icon;

  if (ratio >= 0.85) {
    colorClass = "bg-rose-100 text-rose-700";
    icon = "🔴";
  } else if (ratio >= 0.5) {
    colorClass = "bg-amber-100 text-amber-700";
    icon = "🟡";
  } else {
    colorClass = "bg-emerald-100 text-emerald-700";
    icon = "🟢";
  }

  return (
    <span className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.58rem] font-bold ${colorClass}`}>
      <span className="text-[0.5rem]">{icon}</span>
      {requisicoes}/{vagas}
    </span>
  );
}
