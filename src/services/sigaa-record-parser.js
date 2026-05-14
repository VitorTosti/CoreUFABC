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
