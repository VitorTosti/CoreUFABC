import { useMemo, useState } from "react";

import {
  calculatePerformanceCoefficient,
  createSimulatedCourseRecord,
  getTpeCredits,
  isApproved,
  projectPerformanceCoefficient,
} from "../services/academic-metrics.js";
import { formatDecimal } from "../utils/dashboard-data.js";

const CONCEPTS = ["A", "B", "C", "D", "F"];

const CONCEPT_META = {
  A: { label: "A", desc: "Excelente", color: "from-emerald-500 to-emerald-600", shadow: "shadow-[0_8px_20px_rgba(16,185,129,0.40)]" },
  B: { label: "B", desc: "Bom",       color: "from-teal-500 to-teal-600",       shadow: "shadow-[0_8px_20px_rgba(20,184,166,0.40)]" },
  C: { label: "C", desc: "Regular",   color: "from-sky-500 to-sky-600",          shadow: "shadow-[0_8px_20px_rgba(14,165,233,0.40)]" },
  D: { label: "D", desc: "Mínimo",    color: "from-amber-500 to-amber-600",      shadow: "shadow-[0_8px_20px_rgba(245,158,11,0.40)]" },
  F: { label: "F", desc: "Reprov.",   color: "from-rose-500 to-rose-600",        shadow: "shadow-[0_8px_20px_rgba(244,63,94,0.40)]" },
};

/** Retorna o label do quadrimestre seguinte ao último no histórico */
function getNextQuadrimesterLabel(courses) {
  const latest = [...courses].map((c) => c.ano_quadrimestre).filter(Boolean).sort().at(-1) ?? "2026.1";
  const [year, term] = latest.split(".").map(Number);
  if (term >= 3) return `${year + 1}.1`;
  return `${year}.${term + 1}`;
}

/** Situações que não valem para simular (curso cancelado, trancado, etc.) */
const SKIP_SITUACOES = new Set(["TRANCADO", "CANCELADO", "SIMULADO", "TR"]);

/**
 * Candidatos para simulação — prioridade:
 * 1. Disciplinas do quadrimestre mais recente COM status real (exclui TRANCADO)
 * 2. Disciplinas não aprovadas de qualquer período
 * 3. Todas as disciplinas (fallback)
 */
function getSimulationCandidates(courses) {
  // Remove disciplinas sem situação útil
  const active = courses.filter(
    (c) => !SKIP_SITUACOES.has(c.situacao) && c.conceito !== "TR",
  );

  if (active.length === 0) return courses;

  // Quadrimestres com disciplinas ativas, do mais recente ao mais antigo
  const quads = [
    ...new Set(active.map((c) => c.ano_quadrimestre).filter(Boolean)),
  ].sort().reverse();

  // Usa o quadrimestre mais recente que tem disciplinas ativas
  for (const quad of quads) {
    const inQuad = active.filter((c) => c.ano_quadrimestre === quad);
    if (inQuad.length > 0) return inQuad;
  }

  // Fallback: não aprovadas → tudo
  const nonApproved = active.filter((c) => !isApproved(c));
  return nonApproved.length > 0 ? nonApproved : active;
}

/** Retorna o quadrimestre mais recente entre os candidatos */
function getCandidatesQuad(candidates) {
  return [...candidates]
    .map((c) => c.ano_quadrimestre)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function getDeltaTone(delta) {
  if (delta > 0.005) return "text-emerald-600";
  if (delta < -0.005) return "text-rose-600";
  return "text-slate-600";
}

function getDeltaLabel(delta) {
  if (delta > 0.005) return `+${formatDecimal(delta)}`;
  if (delta < -0.005) return formatDecimal(delta);
  return "±0,00";
}

function getDeltaDescription(delta) {
  if (delta > 0.01) return "Seu CR vai subir 🎉";
  if (delta > 0.005) return "Leve melhora no CR";
  if (delta < -0.01) return "Seu CR vai cair ⚠️";
  if (delta < -0.005) return "Leve queda no CR";
  return "CR praticamente estável";
}

export function GradeSimulator({ courses }) {
  const candidates = useMemo(() => getSimulationCandidates(courses), [courses]);
  const [selectedCode, setSelectedCode] = useState(candidates[0]?.codigo ?? "");
  const selectedCourse = useMemo(
    () => candidates.find((c) => c.codigo === selectedCode) ?? candidates[0],
    [candidates, selectedCode],
  );
  const [concept, setConcept] = useState("B");
  const [credits, setCredits] = useState(() => getTpeCredits(selectedCourse ?? {}));

  /** Quadrimestre exibido: se o curso já tem um, usa; senão "próximo" */
  const simulatedQuad = useMemo(() => getNextQuadrimesterLabel(courses), [courses]);

  const projection = useMemo(() => {
    if (!selectedCourse) return { currentCr: 0, projectedCr: 0, delta: 0 };

    const simulatedRecord = createSimulatedCourseRecord(selectedCourse, {
      concept,
      credits: Number(credits) || 0,
      quadrimester: simulatedQuad,
    });

    const currentCr = calculatePerformanceCoefficient(courses);
    const projectedCr = projectPerformanceCoefficient(courses, [simulatedRecord]);

    return { currentCr, projectedCr, delta: projectedCr - currentCr, simulatedRecord };
  }, [concept, courses, credits, selectedCourse, simulatedQuad]);

  if (!selectedCourse) return null;

  const deltaTone = getDeltaTone(projection.delta);
  const activeMeta = CONCEPT_META[concept] ?? CONCEPT_META.B;

  /* ── Quadrimestre que originou os candidatos ── */
  const quadLabel = getCandidatesQuad(candidates) ?? simulatedQuad;
  const isDemo = courses.length < 10; // histórico pequeno = provavelmente demo

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-[0_20px_70px_rgba(0,0,0,0.09)]">

      {/* ── Cabeçalho com gradiente ── */}
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#047857_0%,#059669_55%,#0d9488_100%)] px-5 py-4">
        {/* Textura de pontos */}
        <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:14px_14px]" />
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border-[16px] border-white/10" />

        <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-emerald-200/80">
          Simulador de CR
        </p>
        <h2 className="mt-0.5 font-display text-xl font-black leading-tight text-white">
          Como essa nota impacta seu CR?
        </h2>
        <p className="mt-1 text-[0.68rem] font-medium text-white/60">
          Baseado nas disciplinas de{" "}
          <span className="font-black text-white">{quadLabel}</span>
        </p>
      </div>

      {/* ── Cards de resultado ── */}
      <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-3">
        <div className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-400">Atual</p>
          <strong className="mt-1.5 font-display text-[1.6rem] font-black leading-none text-slate-950">
            {formatDecimal(projection.currentCr)}
          </strong>
        </div>

        <div className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-emerald-600">Simulado</p>
          <strong className={`mt-1.5 font-display text-[1.6rem] font-black leading-none ${deltaTone}`}>
            {formatDecimal(projection.projectedCr)}
          </strong>
        </div>

        <div className="flex flex-col items-start rounded-2xl border border-slate-100 bg-white p-3">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-400">Impacto</p>
          <strong className={`mt-1.5 font-display text-[1.6rem] font-black leading-none ${deltaTone}`}>
            {getDeltaLabel(projection.delta)}
          </strong>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">

        {/* ── Seletor de disciplina ── */}
        <div>
          <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-400">
            Disciplina — {quadLabel}
          </p>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200"
              value={selectedCourse.codigo}
              onChange={(e) => {
                const next = candidates.find((c) => c.codigo === e.target.value);
                setSelectedCode(e.target.value);
                if (next) setCredits(getTpeCredits(next));
              }}
            >
              {candidates.map((course) => (
                <option key={`${course.codigo}-${course.ano_quadrimestre}`} value={course.codigo}>
                  {course.codigo} — {course.nome}
                </option>
              ))}
            </select>
            {/* Chevron customizado */}
            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Info da disciplina selecionada */}
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[0.62rem] font-black text-slate-600">
              {credits}cr
            </span>
            {selectedCourse.categoria_sigla && (
              <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-700">
                {selectedCourse.categoria_sigla}
              </span>
            )}
            {selectedCourse.ano_quadrimestre && (
              <span className="text-[0.62rem] font-semibold text-slate-400">
                {selectedCourse.ano_quadrimestre}
              </span>
            )}
          </div>
        </div>

        {/* ── Conceito ── */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-400">Conceito</p>
            <span className="text-[0.65rem] font-semibold text-slate-500">
              {activeMeta.desc}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {CONCEPTS.map((item) => {
              const active = item === concept;
              const meta = CONCEPT_META[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setConcept(item)}
                  aria-pressed={active}
                  className={`relative flex h-14 flex-col items-center justify-center rounded-2xl border font-display text-lg font-black transition-all duration-150 ${
                    active
                      ? `bg-gradient-to-br ${meta.color} border-transparent text-white ${meta.shadow}`
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {item}
                  {active && (
                    <span className="absolute bottom-1.5 text-[0.42rem] font-bold uppercase tracking-wide text-white/70">
                      {meta.desc}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Créditos (editável apenas se não vier da disciplina) ── */}
        <div>
          <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-400">Créditos</p>
          <div className="flex items-center gap-2">
            {[2, 3, 4, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCredits(n)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-black transition ${
                  Number(credits) === n
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)]"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                }`}
              >
                {n}cr
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="16"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="w-16 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm font-black text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              aria-label="Créditos personalizados"
            />
          </div>
        </div>

        {/* ── Resultado narrativo ── */}
        <div className={`rounded-2xl border px-4 py-3 ${
          projection.delta > 0.005
            ? "border-emerald-200 bg-emerald-50"
            : projection.delta < -0.005
            ? "border-rose-200 bg-rose-50"
            : "border-slate-200 bg-slate-50"
        }`}>
          <p className={`text-[0.72rem] font-black ${deltaTone}`}>
            {getDeltaDescription(projection.delta)}
          </p>
          <p className="mt-0.5 text-[0.68rem] font-medium leading-snug text-slate-600">
            Tirando{" "}
            <span className="font-black text-slate-950">{concept}</span>
            {" "}em{" "}
            <span className="font-semibold text-slate-800">{selectedCourse.nome}</span>
            {" "}({credits}cr), seu CR passa de{" "}
            <span className="font-black text-slate-950">{formatDecimal(projection.currentCr)}</span>
            {" "}para{" "}
            <span className={`font-black ${deltaTone}`}>{formatDecimal(projection.projectedCr)}</span>.
          </p>
        </div>

        {/* ── Aviso de dados demo ── */}
        {isDemo && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="10.5" r="0.7" fill="currentColor"/>
            </svg>
            <p className="text-[0.65rem] font-medium leading-snug text-amber-700">
              <span className="font-black">Histórico de demonstração.</span>{" "}
              Você está vendo apenas {candidates.length} disciplina{candidates.length !== 1 ? "s" : ""} de {quadLabel}. Conecte seu RA real para simular com todo o seu histórico acadêmico.
            </p>
          </div>
        )}

      </div>
    </section>
  );
}
