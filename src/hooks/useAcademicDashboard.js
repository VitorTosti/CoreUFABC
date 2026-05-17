import { useMemo } from "react";

import {
  calculateAffinityCoefficient,
  calculatePerformanceCoefficient,
  calculateProgressionCoefficient,
  getTpeCredits,
  isApproved,
} from "../services/academic-metrics.js";
import { COURSE_PLANS } from "../utils/curriculum-progress.js";
import { buildAxesProgress, groupByQuadrimester } from "../utils/dashboard-data.js";

const COMPUTER_SCIENCE_AFFINITY_WEIGHTS = {
  BC1707: 2,
  BC0005: 1.35,
  BC0402: 1.25,
  BC0506: 0.75,
};

/**
 * Returns the total required credits for the student's formation.
 * Tries `formacoes[].creditos_necessarios` first (from SIGAA text parser),
 * then falls back to the sum of creditos_exigidos from the BCT curriculum
 * (obrigatorias + limitadas + livres = 176 for BCT 2023).
 */
function getRequiredCredits(history) {
  const formacoes = history.formacoes ?? [];
  const bctFormation = formacoes.find((f) => f.codigo === "BCT") ?? formacoes[0];

  // From SIGAA text parser
  if (bctFormation?.creditos_necessarios > 0) {
    return bctFormation.creditos_necessarios;
  }

  // Fallback: use BCT curriculum from static data
  const bctPlan = COURSE_PLANS.BCT;
  if (bctPlan?.requiredCredits) {
    const rc = bctPlan.requiredCredits;
    return (rc.obrigatorias ?? 0) + (rc.limitadas ?? 0) + (rc.livres ?? 0);
  }

  // Last resort
  return 176;
}

export function useAcademicDashboard(history) {
  return useMemo(() => {
    const courses = Array.isArray(history.disciplinas) ? history.disciplinas : [];
    const approvedCredits = courses.filter(isApproved).reduce((total, course) => total + getTpeCredits(course), 0);
    const totalCredits = courses.reduce((total, course) => total + getTpeCredits(course), 0);
    const requiredCredits = getRequiredCredits(history);

    return {
      student: history.aluno ?? { nome: "Aluno", ra: "" },
      totalCourses: courses.length,
      totalCredits,
      approvedCredits,
      requiredCredits,
      metrics: {
        cr: calculatePerformanceCoefficient(courses),
        ca: calculateAffinityCoefficient(courses, COMPUTER_SCIENCE_AFFINITY_WEIGHTS),
        cp: calculateProgressionCoefficient(courses, requiredCredits),
      },
      axesProgress: buildAxesProgress(courses),
      quadrimesters: groupByQuadrimester(courses),
    };
  }, [history]);
}
