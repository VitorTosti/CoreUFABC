/**
 * Parser for the Prograd "Turmas Ofertadas" PDF.
 *
 * The PDF is published each quadrimester at a predictable URL:
 *   https://prograd.ufabc.edu.br/pdf/matriculas_{YYYY}_{Q}_turmas_ofertadas.pdf
 *
 * It contains every course section offered that quad, with columns:
 *   CURSO | CÓDIGO DE TURMA | TURMA | TEORIA | PRÁTICA | CAMPUS | TURNO | TPEI | VAGAS | DOCENTE
 *
 * The turma code embeds the course code: e.g. "DA1BIS0005-15SA"
 *   → D=Diurno, A1=turma, BIS0005=course, -15=curriculum version, SA=campus
 *
 * TPEI column gives exact credits as "T-P-E-I" (Teoria-Prática-Estudo-Individual).
 * Total credits for UFABC purposes = T + P.
 */

import { normalizeRawCourseCode, inferEixosFromCode } from "./sigaa-record-parser.js";

// Column x-ranges from the turmas ofertadas PDF layout
const TCOL = {
  CURSO:     { min: 25,  max: 75 },
  TURMA_CODE:{ min: 75,  max: 120 },
  NAME:      { min: 118, max: 210 },
  SCHEDULE_T:{ min: 200, max: 285 },
  SCHEDULE_P:{ min: 280, max: 365 },
  CAMPUS:    { min: 355, max: 380 },
  TURNO:     { min: 380, max: 415 },
  TPEI:      { min: 410, max: 435 },
  VAGAS_TOT: { min: 430, max: 460 },
  VAGAS_ING: { min: 460, max: 500 },
  VAGAS_VET: { min: 495, max: 530 },
};

function inTCol(x, col) {
  return x >= col.min && x <= col.max;
}

/**
 * Parses positioned text items from the turmas ofertadas PDF.
 *
 * @param {{ items: Array<{x: number, y: number, str: string}> }} extracted
 * @returns {{ periodo: string, courses: Map<string, CourseOffering> }}
 *
 * CourseOffering = {
 *   codigo: string,
 *   nome: string,
 *   creditos: number,
 *   teoria: number,
 *   pratica: number,
 *   tpei: string,
 *   turmas: Array<{ turmaCode, campus, turno, schedule, vagas, docente }>
 * }
 */
export function parseTurmasOfertadasPdf(extracted) {
  const items = extracted?.items ?? [];
  if (items.length === 0) {
    return { periodo: null, courses: new Map() };
  }

  // Extract periodo from header (e.g. "TURMAS OFERTADAS - 2026.2")
  const headerItem = items.find((it) => /TURMAS OFERTADAS/i.test(it.str));
  const periodoMatch = headerItem?.str?.match(/(\d{4}\.\d)/);
  const periodo = periodoMatch?.[1] ?? null;

  // Group items into rows by y-coordinate (tolerance ±3px)
  const rows = groupByY(items, 3);

  // Extract courses from rows
  const courses = new Map();

  for (const row of rows) {
    // A turma row must have a turma code at the TURMA_CODE column
    const turmaCodeItem = row.find(
      (it) => inTCol(it.x, TCOL.TURMA_CODE) && /^[DN]A\d/.test(it.str),
    );
    if (!turmaCodeItem) continue;

    // Extract course code from turma code: DA1BIS0005-15SA → BIS0005
    const codeMatch = turmaCodeItem.str.match(
      /[DN]A\d([A-Z]{2,5}\d{3,5})-(\d{2})([A-Z]{2,3})$/,
    );
    if (!codeMatch) continue;

    const rawCourseCode = codeMatch[1];
    const courseCode = normalizeRawCourseCode(rawCourseCode);
    const campus = codeMatch[3]; // SA, SBC

    // TPEI (e.g. "3-0-4", "0-2-2", "4-1-0")
    const tpeiItem = row.find(
      (it) => inTCol(it.x, TCOL.TPEI) && /^\d+-\d+/.test(it.str),
    );
    const tpei = tpeiItem?.str ?? null;
    let teoria = 0;
    let pratica = 0;
    if (tpei) {
      const parts = tpei.split("-").map(Number);
      teoria = parts[0] ?? 0;
      pratica = parts[1] ?? 0;
    }
    const creditos = teoria + pratica;

    // Course name
    const nameItems = row
      .filter((it) => inTCol(it.x, TCOL.NAME))
      .sort((a, b) => a.x - b.x);
    let nome = nameItems.map((it) => it.str).join(" ");
    // Clean turma suffix from name (e.g. " A1-Matutino (SA)")
    nome = nome.replace(/\s+[A-Z]\d+-\w+\s*\([A-Z]+\)\s*$/, "").trim();
    // Also remove trailing turma identifiers like "A1-" at the end
    nome = nome.replace(/\s+[A-Z]\d+-?\s*$/, "").trim();

    // Turno
    const turnoItem = row.find(
      (it) => inTCol(it.x, TCOL.TURNO) && /^(Matutino|Noturno|Vespertino)/i.test(it.str),
    );
    const turno = turnoItem?.str ?? null;

    // Vagas totais
    const vagasItem = row.find(
      (it) => inTCol(it.x, TCOL.VAGAS_TOT) && /^\d+$/.test(it.str),
    );
    const vagas = vagasItem ? parseInt(vagasItem.str) : null;

    // Schedule
    const schedItems = row
      .filter((it) => inTCol(it.x, TCOL.SCHEDULE_T) || inTCol(it.x, TCOL.SCHEDULE_P))
      .sort((a, b) => a.x - b.x);
    const schedule = schedItems.map((it) => it.str).join(" ; ");

    // Upsert into courses map
    if (!courses.has(courseCode)) {
      courses.set(courseCode, {
        codigo: courseCode,
        nome: nome || courseCode,
        creditos,
        teoria,
        pratica,
        tpei: tpei ?? `${teoria}-${pratica}-0`,
        eixos: inferEixosFromCode(courseCode),
        turmas: [],
      });
    }

    const course = courses.get(courseCode);
    course.turmas.push({
      turmaCode: turmaCodeItem.str,
      campus,
      turno,
      schedule,
      vagas,
    });

    // Update name if current one is better (longer/cleaner)
    if (nome.length > course.nome.length && nome.length > courseCode.length) {
      course.nome = nome;
    }
  }

  return { periodo, courses };
}

/**
 * Builds the URL for the turmas ofertadas PDF for a given quadrimester.
 * @param {string} periodo — e.g. "2026.2"
 */
export function buildTurmasOfertadasUrl(periodo) {
  const [year, quad] = periodo.split(".");
  return `https://prograd.ufabc.edu.br/pdf/matriculas_${year}_${quad}_turmas_ofertadas.pdf`;
}

/**
 * Returns the current UFABC periodo based on today's date.
 * UFABC academic year: Q1 = Feb–May, Q2 = Jun–Sep, Q3 = Oct–Jan
 */
export function getCurrentPeriodo() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (month >= 2 && month <= 5) return `${year}.1`;
  if (month >= 6 && month <= 9) return `${year}.2`;
  // Oct–Jan → Q3 of the current year (Oct-Dec) or previous year (Jan)
  if (month === 1) return `${year - 1}.3`;
  return `${year}.3`;
}

/**
 * Given the student's pending courses and the offerings map, returns
 * courses that are both pending AND offered this quadrimester, sorted
 * by curriculum sequence (quadrimestre_ideal).
 */
export function filterAvailablePendingCourses(pendingCourses, offerings) {
  if (!offerings || offerings.size === 0) return [];

  return pendingCourses
    .filter((course) => {
      const code = normalizeRawCourseCode(course.codigo);
      return offerings.has(code);
    })
    .map((course) => {
      const code = normalizeRawCourseCode(course.codigo);
      const offering = offerings.get(code);
      return {
        ...course,
        // Override credits with real data from offerings PDF
        creditos: offering.creditos,
        creditos_tide: {
          teoria: offering.teoria,
          pratica: offering.pratica,
          estudo: 0,
          individual: 0,
        },
        turmas: offering.turmas,
        tpei: offering.tpei,
        offered: true,
      };
    });
}

function groupByY(items, tolerance) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  let cur = [];
  let curY = null;

  for (const it of sorted) {
    if (curY === null || Math.abs(it.y - curY) <= tolerance) {
      cur.push(it);
      if (curY === null) curY = it.y;
    } else {
      if (cur.length) rows.push(cur);
      cur = [it];
      curY = it.y;
    }
  }

  if (cur.length) rows.push(cur);
  return rows;
}
