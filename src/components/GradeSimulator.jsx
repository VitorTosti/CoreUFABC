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

function getNextQuadrimesterLabel(courses) {
  const latest = [...courses].map((course) => course.ano_quadrimestre).sort().at(-1) ?? "2026.1";
  const [year, term] = latest.split(".").map(Number);

  if (term >= 3) return `${year + 1}.1`;
  return `${year}.${term + 1}`;
}

function getSimulationCandidates(courses) {
  const priority = courses.filter((course) => !isApproved(course));
  return priority.length > 0 ? priority : courses;
}

function getCrTone(delta) {
  if (delta > 0.005) return "text-emerald-600";
  if (delta < -0.005) return "text-rose-600";
  return "text-slate-600";
}

function getDeltaLabel(delta) {
  if (delta > 0.005) return `+${formatDecimal(delta)} no CR`;
  if (delta < -0.005) return `${formatDecimal(delta)} no CR`;
  return "CR estavel";
}

export function GradeSimulator({ courses }) {
  const candidates = useMemo(() => getSimulationCandidates(courses), [courses]);
  const [selectedCode, setSelectedCode] = useState(candidates[0]?.codigo ?? "");
  const selectedCourse = candidates.find((course) => course.codigo === selectedCode) ?? candidates[0];
  const [concept, setConcept] = useState("B");
  const [credits, setCredits] = useState(getTpeCredits(selectedCourse ?? {}));

  const projection = useMemo(() => {
    if (!selectedCourse) {
      return { currentCr: 0, projectedCr: 0, delta: 0, simulatedRecord: null };
    }

    const simulatedRecord = createSimulatedCourseRecord(selectedCourse, {
      concept,
      credits: Number(credits) || 0,
      quadrimester: getNextQuadrimesterLabel(courses),
    });
    const currentCr = calculatePerformanceCoefficient(courses);
    const projectedCr = projectPerformanceCoefficient(courses, [simulatedRecord]);

    return { currentCr, projectedCr, delta: projectedCr - currentCr, simulatedRecord };
  }, [concept, courses, credits, selectedCourse]);

  if (!selectedCourse) return null;

  const deltaTone = getCrTone(projection.delta);

  return (
    <section className="rounded-[1.75rem] border border-emerald-200/80 bg-white/90 p-4 shadow-[0_22px_80px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
            Simulador de notas
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-slate-950 sm:text-3xl">
            Quanto muda seu CR?
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[24rem]">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-400">Atual</p>
            <strong className="mt-1 block font-display text-2xl font-black text-slate-950">
              {formatDecimal(projection.currentCr)}
            </strong>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-600">Simulado</p>
            <strong className={`mt-1 block font-display text-2xl font-black ${deltaTone}`}>
              {formatDecimal(projection.projectedCr)}
            </strong>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-teal-600">Impacto</p>
            <strong className={`mt-1 block text-sm font-black leading-7 ${deltaTone}`}>
              {getDeltaLabel(projection.delta)}
            </strong>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.65fr]">
        <label className="flex min-w-0 flex-col gap-2 rounded-2xl border border-emerald-100 bg-white p-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Disciplina</span>
          <select
            className="min-h-12 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-400"
            value={selectedCourse.codigo}
            onChange={(event) => {
              const nextCourse = candidates.find((course) => course.codigo === event.target.value);
              setSelectedCode(event.target.value);
              setCredits(getTpeCredits(nextCourse ?? {}));
            }}
          >
            {candidates.map((course) => (
              <option key={`${course.codigo}-${course.ano_quadrimestre}`} value={course.codigo}>
                {course.codigo} - {course.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-emerald-100 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Conceito</p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {CONCEPTS.map((item) => {
              const active = item === concept;
              return (
                <button
                  key={item}
                  className={`min-h-12 rounded-xl border font-display text-lg font-black transition ${
                    active
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_12px_32px_rgba(16,185,129,0.22)]"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-400"
                  }`}
                  type="button"
                  onClick={() => setConcept(item)}
                  aria-pressed={active}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex min-w-0 flex-col gap-2 rounded-2xl border border-emerald-100 bg-white p-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Creditos</span>
          <input
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-lg font-black text-slate-950 outline-none transition focus:border-emerald-400"
            type="number"
            min="1"
            max="12"
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
        Tirando <span className="font-black text-emerald-700">{concept}</span> em{" "}
        <span className="text-slate-950">{selectedCourse.nome}</span>, o historico ganha uma tentativa simulada em{" "}
        <span className="font-bold text-teal-700">{projection.simulatedRecord.ano_quadrimestre}</span>.
      </div>
    </section>
  );
}
