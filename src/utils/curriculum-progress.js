import curriculums from "../data/curriculums.json" with { type: "json" };
import { isApproved } from "../services/academic-metrics.js";

const COURSE_REQUIREMENT_SECTIONS = [
  { key: "required", title: "Obrigatorias", shortTitle: "Obrig." },
  { key: "limited", title: "Opcionais / Limitadas", shortTitle: "Limit." },
  { key: "free", title: "Livres", shortTitle: "Livres" },
];

const COURSE_ACCENTS = {
  BCT: "emerald",
  BCH: "blue",
  LCN: "teal",
  LCH: "cyan",
};

export const COURSE_PLANS = Object.freeze(
  Object.fromEntries(
    Object.entries(curriculums).map(([key, curriculum]) => [
      key,
      {
        key,
        label: curriculum.label,
        name: curriculum.nome,
        accent: COURSE_ACCENTS[key] ?? "emerald",
        requiredCredits: curriculum.creditos_exigidos,
        source: curriculum.fonte,
        requirements: {
          required: curriculum.materias_obrigatorias,
          limited: curriculum.materias_limitadas,
          free: curriculum.materias_livres,
        },
      },
    ]),
  ),
);

export function buildCurriculumProgress(plan = COURSE_PLANS.BCT, approvedCodes = new Set()) {
  const selectedPlan = plan ?? COURSE_PLANS.BCT;
  const sections = COURSE_REQUIREMENT_SECTIONS.map((section) => {
    const items = (selectedPlan.requirements[section.key] ?? [])
      .map((item) => {
        const completed =
          approvedCodes.has(item.codigo) || approvedCodes.has(normalizeCurriculumToken(item.nome));
        const preReqs = item.pre_requisitos ?? [];
        const preReqsMet =
          preReqs.length === 0 ||
          preReqs.every(
            (req) =>
              approvedCodes.has(req) ||
              approvedCodes.has(normalizeCurriculumToken(req)),
          );
        return { ...item, completed, preReqsMet };
      })
      .sort((a, b) => (a.quadrimestre_ideal ?? 99) - (b.quadrimestre_ideal ?? 99));
    const completedItems = items.filter((item) => item.completed);

    return {
      ...section,
      items,
      total: items.length,
      completed: completedItems.length,
      totalCredits: items.reduce((sum, item) => sum + (item.creditos ?? 0), 0),
      completedCredits: completedItems.reduce((sum, item) => sum + (item.creditos ?? 0), 0),
    };
  });

  return {
    plan: selectedPlan,
    sections,
    total: sections.reduce((sum, section) => sum + section.total, 0),
    completed: sections.reduce((sum, section) => sum + section.completed, 0),
  };
}

export function createCompletedCourseTokens(courses, manualTokens = new Set()) {
  const completedTokens = new Set();

  for (const course of courses) {
    if (!isApproved(course)) continue;

    completedTokens.add(course.codigo);
    completedTokens.add(normalizeCurriculumToken(course.codigo));
    completedTokens.add(normalizeCurriculumToken(course.nome));
  }

  for (const token of manualTokens) {
    completedTokens.add(token);
    completedTokens.add(normalizeCurriculumToken(token));
  }

  return completedTokens;
}

export function normalizeCurriculumToken(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}
