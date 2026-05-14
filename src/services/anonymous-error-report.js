// Structural patterns mirrored from the SIGAA parser contract.
const COURSE_ROW_PATTERN = /^\s*(20\d{2}[./-][1-3])\s+([A-Z]{2,5}\d{3,4}[A-Z]?)\s+(.*)/i;
// \s* (zero-or-more) before the first credit allows rows with no course name.
const CREDIT_BLOCK_PATTERN = /^(.*?)\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(.+)$/;

// Keywords that appear only in the TAIL section (after the 4 credit numbers).
// Single-letter tokens (A, B, L, O…) are only checked here, so they cannot
// collide with the same letters appearing as Portuguese articles in the course name.
const KNOWN_SIGAA_TAIL_KEYWORDS = new Set([
  "APROVADO", "APROVADA", "REPROVADO", "REPROVADA",
  "TRANCADO", "TRANCADA", "MATRICULADO", "MATRICULA",
  "CURSANDO", "CONVALIDADO", "CONVALIDADA", "APROVEITAMENTO",
  "CUMPRIU", "CUMPRIDO", "RF",
  "A", "B", "C", "D", "F", "O", "TR", "--",
  "L", "OBRIGATORIA", "OBRIGATORIO", "OBR",
  "OPCAO", "LIMITADA", "LIMITADO", "LIVRE",
  "MAT", "EM", "CURSO", "FALTA", "FREQUENCIA",
]);

function normalizeToken(token) {
  return String(token)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

/**
 * Strips any token that is not part of the structural SIGAA vocabulary by
 * parsing the line section-by-section:
 *   1. year.quad  → kept verbatim
 *   2. course code → kept, uppercased
 *   3. course name → DISCARDED entirely (may contain personal/contextual text)
 *   4. 4 credit numbers → kept verbatim
 *   5. tail (status, concept, category) → kept only for known keywords
 *
 * This approach avoids false positives from Portuguese articles/prepositions
 * (e.g. "a", "o") that happen to coincide with SIGAA single-letter codes.
 */
export function sanitizeParserLine(rawLine) {
  const normalizedLine = String(rawLine ?? "").trim();
  if (!normalizedLine) return "";

  const rowMatch = COURSE_ROW_PATTERN.exec(normalizedLine);
  if (!rowMatch) return "";

  const [, yearQuad, courseCode, body] = rowMatch;
  const creditMatch = CREDIT_BLOCK_PATTERN.exec(body);

  if (!creditMatch) {
    // No credit block found — return only the two safe structural tokens.
    return `${yearQuad} ${courseCode.toUpperCase()}`;
  }

  const [, , teoria, pratica, estudo, individual, tail] = creditMatch;
  const safeTailTokens = tail
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => KNOWN_SIGAA_TAIL_KEYWORDS.has(normalizeToken(t)));

  return [yearQuad, courseCode.toUpperCase(), teoria, pratica, estudo, individual, ...safeTailTokens].join(" ");
}

function describeTokenTypes(sanitizedLine) {
  const YEAR_QUAD_PATTERN = /^20\d{2}[./-][1-3]$/;
  const COURSE_CODE_PATTERN = /^[A-Z]{2,5}\d{3,4}[A-Z]?$/i;
  const CREDIT_NUMBER_PATTERN = /^\d{1,3}$/;

  return sanitizedLine.split(/\s+/).filter(Boolean).map((token) => {
    const normalized = normalizeToken(token);
    if (YEAR_QUAD_PATTERN.test(normalized)) return "ANO_QUAD";
    if (COURSE_CODE_PATTERN.test(normalized)) return "CODIGO";
    if (CREDIT_NUMBER_PATTERN.test(token)) return "CREDITO";
    return "KEYWORD";
  });
}

/**
 * Builds a report payload safe for external submission.
 * The original rawLine is NEVER included — only the anonymized version.
 *
 * @param {object} event - A PARSING_CONTRACT_MISMATCH audit event.
 * @param {object} [options]
 * @param {string} [options.appVersion]
 * @returns {object} Report payload with no PII.
 */
export function buildAnonymousErrorReport(event, { appVersion = "unknown" } = {}) {
  const rawLine = event.context?.rawLine ?? "";
  const anonymizedLine = sanitizeParserLine(rawLine);

  const originalTokenCount = rawLine.split(/\s+/).filter(Boolean).length;
  const anonymizedTokenCount = anonymizedLine.split(/\s+/).filter(Boolean).length;

  return {
    reportVersion: "1",
    timestamp: event.timestamp,
    appVersion,
    agent: event.agent,
    type: event.type,
    detectedPattern: event.context?.detectedPattern ?? "unknown",
    anonymizedLine,
    lineStructure: describeTokenTypes(anonymizedLine),
    redactedTokenCount: originalTokenCount - anonymizedTokenCount,
  };
}

/**
 * Converts all unresolved audit events in the store into anonymous report
 * payloads ready for submission.
 */
export function prepareAnonymousReports(auditStore, options = {}) {
  return auditStore
    .list()
    .filter((e) => !e.resolved)
    .map((e) => buildAnonymousErrorReport(e, options));
}
