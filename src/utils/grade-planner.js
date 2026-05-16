/**
 * Utility functions for the Grade Planner feature.
 *
 * Periodicidade values found in data:
 *   " - semanal"          → every week (A and B)
 *   " - quinzenal (I)"    → only Semana A
 *   " - quinzenal (II)"   → only Semana B
 */

/** Determines if a horario slot belongs to Semana A */
export function isInSemanaA(periodicidade) {
  const p = (periodicidade ?? "").toLowerCase();
  return p.includes("semanal") || p.includes("quinzenal (i)");
}

/** Determines if a horario slot belongs to Semana B */
export function isInSemanaB(periodicidade) {
  const p = (periodicidade ?? "").toLowerCase();
  return p.includes("semanal") || p.includes("quinzenal (ii)");
}

/**
 * Returns the periodicidade type for a horario.
 * @returns {"semanal"|"quinzenal-i"|"quinzenal-ii"|"unknown"}
 */
export function getPeriodicidade(periodicidade) {
  const p = (periodicidade ?? "").toLowerCase();
  if (p.includes("quinzenal (i)")) return "quinzenal-i";
  if (p.includes("quinzenal (ii)")) return "quinzenal-ii";
  if (p.includes("semanal")) return "semanal";
  return "unknown";
}

/**
 * Checks if two periodicidades can conflict (overlap in time).
 * semanal  vs semanal  → yes
 * semanal  vs quinz-i  → yes (semanal runs both weeks)
 * semanal  vs quinz-ii → yes
 * quinz-i  vs quinz-i  → yes
 * quinz-i  vs quinz-ii → NO (different weeks)
 * quinz-ii vs quinz-ii → yes
 */
function periodicidadesCanConflict(pA, pB) {
  if (pA === "quinzenal-i" && pB === "quinzenal-ii") return false;
  if (pA === "quinzenal-ii" && pB === "quinzenal-i") return false;
  return true;
}

/**
 * Checks if a single horario slot from turma A conflicts with any horario slot from turma B.
 */
function horarioConflicts(horA, horB) {
  if (horA.semana !== horB.semana) return false;
  if (!periodicidadesCanConflict(getPeriodicidade(horA.periodicidade_extenso), getPeriodicidade(horB.periodicidade_extenso))) {
    return false;
  }
  const horasA = new Set(horA.horas ?? []);
  return (horB.horas ?? []).some((h) => horasA.has(h));
}

/**
 * Returns true if two turmas have any time conflict.
 */
export function turmasConflict(turmaA, turmaB) {
  const horariosA = turmaA.horarios ?? [];
  const horariosB = turmaB.horarios ?? [];
  for (const hA of horariosA) {
    for (const hB of horariosB) {
      if (horarioConflicts(hA, hB)) return true;
    }
  }
  return false;
}

/**
 * Given a list of selected turmas and a candidate turma, returns true if it conflicts with any.
 */
export function hasConflictWithSelected(turma, selectedTurmas) {
  return selectedTurmas.some((sel) => turmasConflict(turma, sel));
}

/** Total credits of selected turmas */
export function totalCredits(selectedTurmas) {
  return selectedTurmas.reduce((sum, t) => sum + (t.creditos ?? 0), 0);
}

/**
 * Builds a schedule grid structure for rendering.
 *
 * Returns:
 * {
 *   semanaA: { [dia]: { [hora]: { turmaId, nome, cor, startSlot, spanSlots } | null } },
 *   semanaB: { ... }
 * }
 *
 * Each "horario" block is represented as the first slot with spanSlots > 1,
 * intermediate slots are null (to be skipped in render via CSS grid or similar).
 */
export function buildScheduleGridData(selectedTurmas, DIAS, HORAS) {
  // Initialize empty grid
  const makeEmptyGrid = () => {
    const grid = {};
    for (const dia of DIAS) {
      grid[dia] = {};
      for (const hora of HORAS) {
        grid[dia][hora] = null;
      }
    }
    return grid;
  };

  const semanaA = makeEmptyGrid();
  const semanaB = makeEmptyGrid();

  selectedTurmas.forEach((turma) => {
    const cor = turma._cor ?? "#059669";
    for (const horario of turma.horarios ?? []) {
      const horas = horario.horas ?? [];
      const semana = horario.semana;
      const inA = isInSemanaA(horario.periodicidade_extenso);
      const inB = isInSemanaB(horario.periodicidade_extenso);

      const grids = [];
      if (inA) grids.push(semanaA);
      if (inB) grids.push(semanaB);

      for (const grid of grids) {
        if (!grid[semana]) continue;
        horas.forEach((hora, idx) => {
          if (!HORAS.includes(hora)) return;
          if (idx === 0) {
            grid[semana][hora] = {
              turmaId: turma.id,
              nome: turma.nome,
              cor,
              spanSlots: horas.length,
            };
          } else {
            // Mark as continuation (will be skipped in render)
            grid[semana][hora] = { turmaId: turma.id, continuation: true, cor };
          }
        });
      }
    }
  });

  return { semanaA, semanaB };
}

/** Maps campus number to readable string */
export function campusLabel(campus) {
  if (campus === 74079) return "Santo André";
  if (campus === 74116) return "São Bernardo";
  return "Campus";
}

/** Formats TPI array as string like "4-0-4" */
export function formatTpi(tpi) {
  if (!Array.isArray(tpi) || tpi.length < 3) return "";
  return tpi.join("-");
}

/** Extracts a short schedule summary from horarios */
export function formatHorarioResumo(horarios) {
  if (!horarios || horarios.length === 0) return "Sem horário";
  const DIAS_ABREV = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return horarios
    .map((h) => {
      const dia = DIAS_ABREV[h.semana] ?? `D${h.semana}`;
      const inicio = h.horas?.[0] ?? "";
      const fim = h.horas?.[h.horas.length - 1] ?? "";
      const per = getPeriodicidade(h.periodicidade_extenso);
      const perLabel = per === "quinzenal-i" ? " (A)" : per === "quinzenal-ii" ? " (B)" : "";
      return `${dia} ${inicio}–${fim}${perLabel}`;
    })
    .join(", ");
}

export const TURMA_COLORS = [
  "#059669", // emerald-600
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#0891b2", // cyan-600
  "#c026d3", // fuchsia-600
  "#65a30d", // lime-600
  "#ea580c", // orange-600
  "#0f766e", // teal-700
];
