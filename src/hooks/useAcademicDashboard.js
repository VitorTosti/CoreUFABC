import { useMemo } from "react";

import {
  calculateAffinityCoefficient,
  calculatePerformanceCoefficient,
  calculateProgressionCoefficient,
  getTpeCredits,
  isApproved,
} from "../services/academic-metrics.js";
import { buildAxesProgress, groupByQuadrimester } from "../utils/dashboard-data.js";

const COMPUTER_SCIENCE_AFFINITY_WEIGHTS = {
  BC1707: 2,
  BC0005: 1.35,
  BC0402: 1.25,
  BC0506: 0.75,
};

export function useAcademicDashboard(history) {
  return useMemo(() => {
    const courses = history.disciplinas;
    const bctFormation = history.formacoes.find((formation) => formation.codigo === "BCT") ?? history.formacoes[0];
    const approvedCredits = courses.filter(isApproved).reduce((total, course) => total + getTpeCredits(course), 0);
    const totalCredits = courses.reduce((total, course) => total + getTpeCredits(course), 0);

    return {
      student: history.aluno,
      totalCourses: courses.length,
      totalCredits,
      approvedCredits,
      metrics: {
        cr: calculatePerformanceCoefficient(courses),
        ca: calculateAffinityCoefficient(courses, COMPUTER_SCIENCE_AFFINITY_WEIGHTS),
        cp: calculateProgressionCoefficient(courses, bctFormation.creditos_necessarios),
      },
      axesProgress: buildAxesProgress(courses),
      quadrimesters: groupByQuadrimester(courses),
    };
  }, [history]);
}
