import turmasData from "../data/turmas-2026-q2.json";

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
 * @param {{ campus?: number|null, turno?: string|null }} filters
 */
const normalize = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");

export function searchTurmas(query = "", filters = {}) {
  const q = normalize(query.trim());
  const { campus = null, turno = null } = filters;

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
    return true;
  });
}
