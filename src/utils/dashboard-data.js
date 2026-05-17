import { getTpeCredits, isApproved } from "../services/academic-metrics.js";

const axisFallbackNames = {
  computacao: "Computacao",
  matematica: "Matematica",
  humanidades: "Humanidades",
  livres: "Livre Escolha",
};

export function groupByQuadrimester(courses) {
  const groups = courses.reduce((acc, course) => {
    const label = course.ano_quadrimestre;
    if (!acc.has(label)) acc.set(label, []);
    acc.get(label).push(course);
    return acc;
  }, new Map());

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([label, items]) => ({
      label,
      courses: items.sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? "")),
      approved: items.filter(isApproved).length,
      total: items.length,
    }));
}

export function buildAxesProgress(courses) {
  const axes = new Map();

  for (const course of courses) {
    const credits = getTpeCredits(course);
    for (const axis of course.eixos ?? []) {
      const current = axes.get(axis.codigo) ?? {
        codigo: axis.codigo,
        nome: axis.nome || axisFallbackNames[axis.codigo] || axis.codigo,
        approvedCredits: 0,
        attemptedCredits: 0,
      };
      const weightedCredits = credits * (axis.peso ?? 1);

      current.attemptedCredits += weightedCredits;
      if (isApproved(course)) current.approvedCredits += weightedCredits;

      axes.set(axis.codigo, current);
    }
  }

  return [...axes.values()]
    .map((axis) => ({
      ...axis,
      percent: axis.attemptedCredits === 0 ? 0 : axis.approvedCredits / axis.attemptedCredits,
    }))
    .sort((a, b) => b.approvedCredits - a.approvedCredits);
}

export function formatDecimal(value, digits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
