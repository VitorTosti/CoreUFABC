const COURSE_START_PATTERN = /(?:^|\s)(20\d{2})[./-]([1-3])\s+([A-Z]{2,5}\d{3,4}[A-Z]?)/i;
const COURSE_ROW_PATTERN = /^\s*(20\d{2})[./-]([1-3])\s+([A-Z]{2,5}\d{3,4}[A-Z]?)\s+(.+)$/i;
const CREDIT_BLOCK_PATTERN = /^(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/;

// Lines that should never be appended to a course row even when they appear
// between split PDF lines (page headers, footers, table column labels).
const PDF_SKIP_PATTERNS = [
  /^\d{1,3}$/, // standalone page numbers
  /^[-_=*]{3,}$/, // visual separators
  /^UNIVERSIDADE\s+FEDERAL\s+DO\s+ABC/i,
  /^P[AÁaá]GINA\s+\d/i, // "Página N"
  /^Emiss[AÃaã][Oo]\s*[:/]/i, // "Emissão:"
  /^HIST[OÓoó]RICO\s+(ESCOLAR|ACAD)/i, // section headers
  /^Ano\s*[./]\s*Per[ií]odo/i, // table column headers
  /^C[oó]digo\s+Componente/i,
  /^(Discente|Aluno|Estudante)\s*[:/]\s*\d/i,
];

const EIXO_BY_EXACT_CODE = {
  BIS0005: [{ codigo: "computacao", nome: "Computacao e Informacao", peso: 0.7 }, { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.3 }],
  BIS0003: [{ codigo: "matematica", nome: "Matematica", peso: 1 }],
  BIS0002: [{ codigo: "engenharia-tecnologia", nome: "Engenharia e Tecnologia", peso: 0.6 }, { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.4 }],
  BIR0004: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 0.6 }, { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.4 }],
  BIR0603: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 0.7 }, { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.3 }],
  NHZ5019: [{ codigo: "computacao", nome: "Computacao e Informacao", peso: 0.5 }, { codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 0.5 }],
  NHT5013: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 0.5 }, { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.5 }],
  ESHT007: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 0.5 }, { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.5 }],
  BHS0003: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 0.6 }, { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.4 }],
};

const EIXO_BY_PREFIX = {
  BCJ: [{ codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 1 }],
  BCK: [{ codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 1 }],
  BCL: [{ codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 1 }],
  BCM: [{ codigo: "computacao", nome: "Computacao e Informacao", peso: 1 }],
  BCN: [{ codigo: "matematica", nome: "Matematica", peso: 1 }],
  BCS: [{ codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 1 }],
  BHO: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  BHP: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  BHQ: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  BHS: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  BIJ: [{ codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 1 }],
  BIK: [{ codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 1 }],
  BIL: [{ codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 1 }],
  BIN: [{ codigo: "matematica", nome: "Matematica", peso: 1 }],
  BIQ: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  ESH: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  ESI: [{ codigo: "engenharia-tecnologia", nome: "Engenharia e Tecnologia", peso: 1 }],
  ESC: [{ codigo: "engenharia-tecnologia", nome: "Engenharia e Tecnologia", peso: 1 }],
  LHE: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  LIE: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  MCB: [{ codigo: "engenharia-tecnologia", nome: "Engenharia e Tecnologia", peso: 1 }],
  MCT: [{ codigo: "engenharia-tecnologia", nome: "Engenharia e Tecnologia", peso: 1 }],
  NHB: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  NHI: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  NHT: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
  NHZ: [{ codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 }],
};

import {
  buildImportHealthStatus,
  createParsingContractMismatchLog,
  passiveAuditStore,
} from "./passive-diagnostics.js";

export function parseSigaaAcademicRecordText(rawText, options = {}) {
  const diagnosticsStore = options.diagnosticsStore ?? passiveAuditStore;
  const text = normalizeWhitespace(rawText);
  const warnings = [];
  const courseRows = collectCourseRows(text);
  const disciplinas = [];

  for (const row of courseRows) {
    const parsedCourse = parseCourseRow(row);

    if (parsedCourse) {
      disciplinas.push(parsedCourse);
      continue;
    }

    const warning = buildUnparsedCourseWarning(row);
    warnings.push(warning);
    diagnosticsStore.record(createParsingContractMismatchLog({
      rawLine: warning.raw,
      detectedPattern: "likely_course_row",
      timestamp: options.timestamp,
    }));
  }

  return {
    record: {
      aluno: parseStudent(text),
      formacoes: [],
      disciplinas,
    },
    warnings,
    importHealth: buildImportHealthStatus({
      parsedCount: disciplinas.length,
      warningCount: warnings.length,
    }),
  };
}

/**
 * Strips the catalog-version suffix (-15, -22, etc.) from a course code so
 * SIGAA history codes can be compared against curriculum codes regardless of
 * which catalog year registered the entry. "BIS0005-15" -> "BIS0005".
 */
export function normalizeRawCourseCode(codigo) {
  return String(codigo ?? "")
    .trim()
    .toUpperCase()
    .replace(/-\d{2}$/, "");
}

/**
 * Returns a best-effort eixos array inferred from the course code alone —
 * useful when the full curriculum catalog is unavailable. Checks an
 * exact-code override table first (for prefixes like BIS/BIR that map to
 * different eixos depending on the specific course), then falls back to a
 * 3-letter prefix map. Returns [] when no match is found.
 */
export function inferEixosFromCode(codigo) {
  const normalized = normalizeRawCourseCode(codigo);
  if (EIXO_BY_EXACT_CODE[normalized]) return EIXO_BY_EXACT_CODE[normalized];
  const prefix = normalized.slice(0, 3);
  return EIXO_BY_PREFIX[prefix] ?? [];
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/ /g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

function isPdfArtifactLine(line) {
  return PDF_SKIP_PATTERNS.some((pattern) => pattern.test(line));
}

function collectCourseRows(text) {
  const rows = [];
  let currentRow = "";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim().replace(/\s+/g, " ");
    if (!line) continue;

    if (COURSE_START_PATTERN.test(line)) {
      if (currentRow) rows.push(currentRow);
      currentRow = line.slice(line.search(COURSE_START_PATTERN)).trim();
      continue;
    }

    if (currentRow && !isPdfArtifactLine(line)) {
      currentRow = `${currentRow} ${line}`;
    }
  }

  if (currentRow) rows.push(currentRow);

  return rows;
}

function parseCourseRow(row) {
  const rowMatch = COURSE_ROW_PATTERN.exec(row);
  if (!rowMatch) return null;

  const [, year, quadrimester, rawCode, body] = rowMatch;
  const creditMatch = CREDIT_BLOCK_PATTERN.exec(body);
  if (!creditMatch) return null;

  const [, rawName, theory, practice, study, individual, tail] = creditMatch;
  const situacao = normalizeSituation(tail);
  const conceito = normalizeConcept(tail, situacao);
  const categoriaSigla = normalizeCategory(tail);

  if (!situacao || !conceito || !categoriaSigla) return null;

  return {
    codigo: rawCode.toUpperCase(),
    nome: normalizeCourseName(rawName),
    creditos_tide: {
      teoria: Number(theory),
      pratica: Number(practice),
      estudo: Number(study),
      individual: Number(individual),
    },
    categoria_sigla: categoriaSigla,
    conceito,
    ano_quadrimestre: `${year}.${quadrimester}`,
    situacao,
    eixos: [],
  };
}

function parseStudent(text) {
  const ra =
    readFirstCapture(text, /\b(?:Discente|Aluno|RA|Matr[í]cula|Estudante)\s*[:/]?\s*(\d{8,14})\b/i) ??
    readFirstCapture(text, /\b(\d{11})\b/) ??
    "";
  const nameFromDiscente = readFirstCapture(text, /\bDiscente\s*[:/]?\s*\d{8,14}\s*[-–]\s*([^\n]+)/i);
  const nameFromField = readFirstCapture(text, /\b(?:Nome|Aluno|Estudante)\s*[:/]\s*([^\n]+)/i);
  const course = readFirstCapture(text, /\bCurso\s*[:/]\s*([^\n]+)/i);

  return {
    ra,
    nome: normalizePersonName(nameFromDiscente ?? nameFromField ?? ""),
    ...(course ? { curso_ingresso: course.trim() } : {}),
  };
}

function readFirstCapture(text, pattern) {
  const match = pattern.exec(text);
  return match?.[1]?.trim();
}

function normalizeCourseName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizePersonName(name) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+(Historico|Curso)\b.*$/i, "");
}

function normalizeCategory(tail) {
  const normalizedTail = normalizeTokenText(tail);
  const tokens = tokenizeTail(tail);

  if (/\b(OPCAO\s+LIMITADA|OPCAO|LIMITADA|LIMITADO)\b/.test(normalizedTail)) return "L";
  if (/\bLIVRE\b/.test(normalizedTail)) return "F";
  if (/\b(OBRIGATORIA|OBRIGATORIO|OBR)\b/.test(normalizedTail)) return "O";

  return ["O", "L", "F"].includes(tokens[0]) ? tokens[0] : null;
}

function normalizeConcept(tail, situacao) {
  const tokens = tokenizeTail(tail);
  const explicitConcept = tokens.findLast((token) => ["A", "B", "C", "D", "F", "O", "TR"].includes(token));

  if (explicitConcept) return explicitConcept;
  if (tokens.includes("MAT")) return "O";
  if (tokens.includes("--") || situacao === "TRANCADO") return "TR";
  if (situacao === "MATRICULADO") return "O";

  return null;
}

function normalizeSituation(tail) {
  const normalizedTail = normalizeTokenText(tail);

  if (/\b(MATRICULADO|MATRICULA|CURSANDO|EM\s+CURSO)\b/.test(normalizedTail)) return "MATRICULADO";
  if (/\b(TRANCADO|TRANCAMENTO|TRANCADA)\b/.test(normalizedTail)) return "TRANCADO";
  if (/\b(CONVALIDADO|CONVALIDADA|APROVEITAMENTO)\b/.test(normalizedTail)) return "CONVALIDADO";
  if (/\b(REPROVADO|REPROVADA)\b.*\b(FALTA|FREQUENCIA)\b/.test(normalizedTail)) return "REPROVADO_FALTA";
  if (/\b(FALTA|FREQUENCIA|RF)\b/.test(normalizedTail)) return "REPROVADO_FALTA";
  if (/\b(REPROVADO|REPROVADA)\b/.test(normalizedTail)) return "REPROVADO";
  if (/\b(APROVADO|APROVADA|CUMPRIU|CUMPRIDO)\b/.test(normalizedTail)) return "APROVADO";

  return null;
}

function tokenizeTail(tail) {
  return tail
    .split(/\s+/)
    .map((token) => normalizeTokenText(token))
    .filter(Boolean);
}

function normalizeTokenText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function buildUnparsedCourseWarning(row) {
  const match = COURSE_ROW_PATTERN.exec(row);

  if (!match) {
    return {
      code: "UNPARSED_COURSE_ROW",
      message: "Could not parse SIGAA course row",
      raw: row,
    };
  }

  return {
    code: "UNPARSED_COURSE_ROW",
    message: `Could not parse SIGAA course row for ${match[3].toUpperCase()} in ${match[1]}.${match[2]}`,
    raw: row,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Parser — position-aware parser for SIGAA "Emitir Histórico" PDF.
//
// Uses x/y coordinates of each text item to map values to columns precisely.
// This avoids the fragile regex approach that confused credits, CH, etc.
//
// SIGAA PDF column layout (x-coordinate ranges from real PDFs):
//   ~30-50   Ano/Período Letivo (e.g. "2025.2")
//   ~70-85   Categoria (OBR, LIV, OL, ATC)
//   ~90-120  Código da disciplina (e.g. "BCS0001-15", may span 2 items)
//   ~125-290 Nome do componente curricular
//   ~290-310 Créditos (e.g. "3", "4", "5")
//   ~315-335 CH - Carga Horária (e.g. "36", "48", "60")
//   ~335-350 CH EXT
//   ~350-385 Turma
//   ~385-420 Conceito (A, B, C, D, F, ---, --)
//   ~420-460 Situação (APR, REP, MATR, etc.)
//   ~460+    Docente(s)
// ─────────────────────────────────────────────────────────────────────────────

const PDF_STATUS_MAP = {
  APR:   "APROVADO",
  APRN:  "APROVADO",
  CANC:  "CANCELADO",
  DISP:  "DISPENSADO",
  MATR:  "MATRICULADO",
  REC:   "EM RECUPERACAO",
  REP:   "REPROVADO",
  REPF:  "REPROVADO_FALTA",
  REPMF: "REPROVADO_FALTA",
  REPN:  "REPROVADO",
  REPNF: "REPROVADO_FALTA",
  TRANC: "TRANCADO",
  TRANS: "CONVALIDADO",
  INCORP: "CONVALIDADO",
  CUMP:  "CONVALIDADO",
};

const VALID_SITUACOES = new Set(Object.keys(PDF_STATUS_MAP));

/** Column boundaries — generous ranges to handle slight PDF variations. */
const COL = {
  PERIOD:   { min: 25,  max: 65 },
  CATEGORY: { min: 65,  max: 92 },
  CODE:     { min: 92,  max: 128 },
  NAME:     { min: 125, max: 295 },
  CREDITS:  { min: 288, max: 315 },
  CH:       { min: 312, max: 340 },
  CH_EXT:   { min: 335, max: 355 },
  CONCEITO: { min: 383, max: 425 },
  SITUACAO: { min: 420, max: 465 },
};

function inCol(x, col) {
  return x >= col.min && x <= col.max;
}

/**
 * Parses positioned items from the SIGAA PDF.
 *
 * @param {object} extracted — `{ items: Array<{x, y, str}>, rawText: string }` from extractTextFromPdf
 * @returns Same shape as parseSigaaAcademicRecordText
 */
export function parseSigaaPdfText(extracted) {
  // Support both old (raw string) and new (structured) calling conventions
  const items = extracted?.items;
  const rawText = extracted?.rawText ?? (typeof extracted === "string" ? extracted : "");

  if (!items || items.length === 0) {
    // Fallback: try legacy flat-text parsing if no positioned items
    return parseSigaaPdfTextLegacy(rawText);
  }

  const warnings = [];

  // ── Student metadata (use rawText for simple regex extraction) ──
  const flatText = rawText.replace(/\r/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ");
  const nomeMatch  = flatText.match(/Nome:\s+([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][A-ZÁÀÃÂÉÊÍÓÔÕÚÇ\s]+?)(?=\s{2,}|Dados|Nac)/);
  const raMatch    = flatText.match(/Matr[íi]cula:\s+(\d{8,14})/);
  const cursoMatch = flatText.match(/Curso:\s+(.+?)(?=\s{2,}|Status)/);
  const crMatch    = flatText.match(/Coeficiente de Rendimento \(CR\)\s+([\d,.]+)/);

  const aluno = {
    nome:            nomeMatch  ? nomeMatch[1].trim()                       : null,
    ra:              raMatch    ? raMatch[1]                                 : null,
    curso_ingresso:  cursoMatch ? cursoMatch[1].trim()                      : null,
    cr:              crMatch    ? parseFloat(crMatch[1].replace(",", "."))  : null,
  };

  // ── Group items into rows by y-coordinate (tolerance ±6px) ──
  const rows = groupItemsIntoRows(items, 6);

  // ── Extract disciplines from rows ──
  const disciplinas = [];

  for (const row of rows) {
    // A discipline row MUST have a situação (APR, REP, MATR, etc.)
    const situacaoItem = row.find(
      (it) => inCol(it.x, COL.SITUACAO) && VALID_SITUACOES.has(it.str.toUpperCase()),
    );
    if (!situacaoItem) continue;

    const situacaoCode = situacaoItem.str.toUpperCase();
    const situacao = PDF_STATUS_MAP[situacaoCode] ?? "DESCONHECIDO";

    // Period (e.g. "2025.2")
    const periodItem = row.find((it) => inCol(it.x, COL.PERIOD) && /^\d{4}\.\d$/.test(it.str));
    const periodo = periodItem?.str ?? null;
    if (!periodo) continue;

    // Código — may be split across multiple items in the code column
    const codeItems = row
      .filter((it) => inCol(it.x, COL.CODE))
      .sort((a, b) => b.y - a.y || a.x - b.x); // top to bottom (higher y first in PDF coords)
    const rawCodeStr = codeItems.map((it) => it.str).join("").replace(/\s+/g, "");
    const codigo = normalizeRawCourseCode(rawCodeStr) || null;

    // Nome — items in the name column, joined
    const nameItems = row
      .filter((it) => inCol(it.x, COL.NAME))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const nome = nameItems.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
    if (!nome || nome.length < 3) continue;

    // Skip ENADE row (it's not a real discipline)
    if (/^ENADE/i.test(nome) || codigo === "ENADE") continue;
    // Skip DISPENSADO with code "ENADE"
    if (situacaoCode === "DISP" && row.some((it) => /ENADE/i.test(it.str))) continue;

    // Créditos — number in the credits column
    const creditItem = row.find((it) => inCol(it.x, COL.CREDITS) && /^\d{1,2}$/.test(it.str));
    const creditos = creditItem ? parseInt(creditItem.str) : null;

    // CH (Carga Horária)
    const chItem = row.find((it) => inCol(it.x, COL.CH) && /^\d{1,3}$/.test(it.str));
    const ch = chItem ? parseInt(chItem.str) : null;

    // Conceito (grade)
    const conceitoItem = row.find(
      (it) => inCol(it.x, COL.CONCEITO) && /^[A-F]$/.test(it.str),
    );
    const conceito = conceitoItem?.str ?? null;

    // Categoria
    const catItem = row.find((it) => inCol(it.x, COL.CATEGORY));
    const catRaw = catItem?.str?.toUpperCase() ?? "";
    const categoria_sigla =
      catRaw === "OBR" ? "O" :
      catRaw === "LIV" ? "F" :
      catRaw === "OL"  ? "L" :
      catRaw === "ATC" ? "ATC" :
      null;

    // ── Build creditos_tide from credits ──
    // UFABC T+P credit split: use CH to infer. If CH/12 == credits, it's
    // likely all theory. For lab courses (BCS, BIL, BCL with labs) split
    // differently. Best effort: derive T from credits, P=0 when unknown.
    // The important thing is T+P = creditos so getTpeCredits is correct.
    const totalCredits = creditos ?? (ch ? Math.round(ch / 12) : 0);

    disciplinas.push({
      codigo: codigo ?? nome.slice(0, 8).replace(/\s+/g, "").toUpperCase(),
      nome,
      ano_quadrimestre: periodo,
      situacao,
      conceito,
      creditos: totalCredits,
      creditos_tide: {
        teoria:     totalCredits,
        pratica:    0,
        estudo:     0,
        individual: 0,
      },
      carga_horaria: ch,
      categoria_sigla,
      eixos: codigo ? inferEixosFromCode(codigo) : [],
    });
  }

  // ── Also extract pending courses from "Componentes Curriculares Obrigatórios Pendentes" ──
  const pendentes = extractPendingCourses(items, rows);

  const importHealth = disciplinas.length > 0
    ? { level: "success",  message: `${disciplinas.length} disciplinas encontradas no PDF.` }
    : { level: "error",    message: "Nenhuma disciplina encontrada no PDF. Verifique se o arquivo é o histórico escolar completo." };

  return {
    record: {
      aluno,
      formacoes: [],
      disciplinas,
      pendentes,
    },
    warnings,
    importHealth,
  };
}

/**
 * Groups text items into logical rows by clustering items with similar y values.
 * In PDF coordinate system, y decreases down the page.
 */
/**
 * Groups text items into discipline rows using PERIOD items as anchors.
 *
 * The naive approach of clustering by y-tolerance fails because:
 * - Multi-line names/turma codes span 8-17px vertically within one row
 * - The gap between adjacent rows can be as small as 7px (turma items overlap)
 *
 * Instead, we use the period items ("2025.2", "2026.1" etc.) at x≈41 as
 * reliable row anchors — they have consistent y-positions, one per discipline.
 * Every other item is assigned to its nearest anchor within a generous radius.
 */
function groupItemsIntoRows(items) {
  // Step 1: Find row anchors — period items in the PERIOD column
  const anchors = items
    .filter((it) => inCol(it.x, COL.PERIOD) && /^\d{4}\.\d$/.test(it.str))
    .sort((a, b) => b.y - a.y); // top of page first

  if (anchors.length === 0) return [];

  // Step 2: Compute the half-gap between adjacent anchors.
  // Any item within this radius of an anchor belongs to that row.
  // For safety, cap at 15px (typical row height in SIGAA PDFs).
  const halfGaps = anchors.map((anchor, i) => {
    if (i + 1 < anchors.length) {
      return Math.floor(Math.abs(anchor.y - anchors[i + 1].y) / 2);
    }
    return 15; // last anchor — use default
  });

  // Step 3: Assign each item to its nearest anchor
  const rowMap = new Map(); // anchor index → items[]
  for (let i = 0; i < anchors.length; i++) {
    rowMap.set(i, []);
  }

  for (const item of items) {
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < anchors.length; i++) {
      const dist = Math.abs(item.y - anchors[i].y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    // Only include if within the half-gap radius (don't pull from distant rows)
    if (bestIdx >= 0 && bestDist <= Math.min(halfGaps[bestIdx] + 2, 18)) {
      rowMap.get(bestIdx).push(item);
    }
  }

  // Return rows in top-to-bottom order
  return anchors.map((_, i) => rowMap.get(i)).filter((row) => row.length > 0);
}

/**
 * Extract pending required courses from the "Componentes Curriculares Obrigatórios Pendentes" table.
 * These appear in a different layout: Código | Nome | CH | Categoria | Créditos
 * with x-positions: ~49-55 | ~107 | ~490 | ~408 | ~558
 */
function extractPendingCourses(items, _rows) {
  const pendentes = [];

  // Find the "Pendentes" header
  const headerItem = items.find((it) => /Pendentes:\s*\d+/i.test(it.str));
  if (!headerItem) return pendentes;

  // Get items below the header (lower y in PDF coords)
  const belowHeader = items.filter((it) => it.y < headerItem.y - 10);

  // Group by y
  const sorted = [...belowHeader].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  let currentRow = [];
  let currentY = null;

  for (const item of sorted) {
    if (currentY === null || Math.abs(item.y - currentY) <= 4) {
      currentRow.push(item);
      if (currentY === null) currentY = item.y;
    } else {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [item];
      currentY = item.y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  for (const row of rows) {
    // Pending table: code at ~49-55, name at ~107, CH at ~490, credits at ~558
    const codeItem = row.find((it) => it.x >= 40 && it.x <= 65 && /^[A-Z]{2,5}\d{3,5}/.test(it.str));
    if (!codeItem) continue;

    const nameItem = row.find((it) => it.x >= 100 && it.x <= 400 && it.str.length > 2);
    const chItem = row.find((it) => it.x >= 470 && it.x <= 510 && /\d+/.test(it.str));
    const credItem = row.find((it) => it.x >= 540 && it.x <= 570 && /^\d{1,2}$/.test(it.str));

    const rawCode = normalizeRawCourseCode(codeItem.str);
    const chNum = chItem ? parseInt(chItem.str) : null;
    const credNum = credItem ? parseInt(credItem.str) : null;

    if (/^ENADE$/i.test(rawCode)) continue;

    pendentes.push({
      codigo: rawCode,
      nome: nameItem?.str?.trim() ?? "",
      carga_horaria: chNum,
      creditos: credNum ?? (chNum ? Math.round(chNum / 12) : 0),
    });
  }

  return pendentes;
}

/**
 * Legacy flat-text PDF parser — fallback for when position data is unavailable.
 * @deprecated Use the position-aware parser instead.
 */
function parseSigaaPdfTextLegacy(rawText) {
  const text = rawText.replace(/\r/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ");
  const disciplinas = [];
  const warnings = [];

  const nomeMatch  = text.match(/Nome:\s+([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][A-ZÁÀÃÂÉÊÍÓÔÕÚÇ\s]+?)(?=\s{2,}|Dados|Nac)/);
  const raMatch    = text.match(/Matr[íi]cula:\s+(\d{8,14})/);
  const cursoMatch = text.match(/Curso:\s+(.+?)(?=\s{2,}|Status)/);

  const aluno = {
    nome:            nomeMatch  ? nomeMatch[1].trim()  : null,
    ra:              raMatch    ? raMatch[1]            : null,
    curso_ingresso:  cursoMatch ? cursoMatch[1].trim()  : null,
  };

  const importHealth = { level: "error", message: "Nenhuma disciplina encontrada no PDF (modo legado). Tente novamente." };
  return { record: { aluno, formacoes: [], disciplinas }, warnings, importHealth };
}
