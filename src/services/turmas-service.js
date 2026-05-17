import turmasData from "../data/turmas-2026-q2.json";
import { COURSE_PLANS } from "../utils/curriculum-progress.js";
import { normalizeRawCourseCode } from "./sigaa-record-parser.js";

/**
 * Set of normalized discipline codes for each foundational cycle.
 * Computed once at module load — used by the "Curso" filter in the search modal.
 *
 * Cross-reference: turma.codigo is stripped of its catalog-year suffix
 * (e.g. "BCJ0204-23" → "BCJ0204") and matched against the same normalization
 * applied to the curriculum JSON entries.
 */
const PLAN_CODE_SETS = Object.fromEntries(
  Object.entries(COURSE_PLANS).map(([key, plan]) => {
    const { required = [], limited = [], free = [] } = plan.requirements;
    const codes = new Set(
      [...required, ...limited, ...free].map((c) => normalizeRawCourseCode(c.codigo)),
    );
    return [key, codes];
  }),
);

const normalize = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");

/**
 * Returns all turmas from the static JSON data.
 * When a backend is available, swap this import for a fetch call.
 */
export function getTurmas() {
  return turmasData;
}

/**
 * Returns a filtered list of turmas based on search text and optional filters.
 * @param {string} query - text to search in nome or codigo
 * @param {{ campus?: number|null, turno?: string|null, cursos?: string|null }} filters
 *   cursos – one of "BCT" | "BCH" | "LCN" | "LCH" | null (null = show all)
 */
export function searchTurmas(query = "", filters = {}) {
  const q = normalize(query.trim());
  const { campus = null, turno = null, cursos = null } = filters;

  return turmasData.filter((turma) => {
    if (q && !normalize(turma.nome).includes(q) && !normalize(turma.codigo).includes(q)) {
      return false;
    }
    if (campus != null && turma.campus !== campus) {
      return false;
    }
    if (turno) {
      const isNoturno = turma.nome.includes("Noturno");
      if (turno === "noturno" && !isNoturno) return false;
      if (turno === "diurno" && isNoturno) return false;
    }
    if (cursos != null) {
      const planCodes = PLAN_CODE_SETS[cursos];
      if (!planCodes || !planCodes.has(normalizeRawCourseCode(turma.codigo))) {
        return false;
      }
    }
    return true;
  });
}

/** Exported for use in UI components that need to render plan filter options. */
export { PLAN_CODE_SETS };
