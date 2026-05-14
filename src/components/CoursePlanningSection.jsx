import { useMemo, useState } from "react";

import { isApproved } from "../services/academic-metrics.js";
import { buildCurriculumProgress, COURSE_PLANS, normalizeCurriculumToken } from "../utils/curriculum-progress.js";
import { CourseSelector } from "./CourseSelector.jsx";
import { CurriculumProgress } from "./CurriculumProgress.jsx";

export function CoursePlanningSection({ courses }) {
  const [selectedPlanKey, setSelectedPlanKey] = useState("BCT");
  const plans = useMemo(() => Object.values(COURSE_PLANS), []);
  const approvedCodes = useMemo(
    () => new Set(courses.filter(isApproved).flatMap((course) => [course.codigo, normalizeCurriculumToken(course.nome)])),
    [courses],
  );
  const progress = useMemo(
    () => buildCurriculumProgress(COURSE_PLANS[selectedPlanKey], approvedCodes),
    [approvedCodes, selectedPlanKey],
  );

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/72 p-4 shadow-cobalt backdrop-blur-xl sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
            Planejamento de curso
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-white sm:text-3xl">
            Escolha sua trilha UFABC
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Compare o historico importado com a matriz escolhida e veja rapidamente o que ja esta concluido.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-200/80">Selecionado</p>
          <strong className="block font-display text-xl font-black text-white">{progress.plan.label}</strong>
        </div>
      </div>

      <div className="mt-5">
        <CourseSelector plans={plans} selectedKey={selectedPlanKey} onSelect={setSelectedPlanKey} />
      </div>

      <CurriculumProgress progress={progress} />
    </section>
  );
}
