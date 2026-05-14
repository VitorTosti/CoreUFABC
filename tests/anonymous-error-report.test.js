import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  sanitizeParserLine,
  buildAnonymousErrorReport,
  prepareAnonymousReports,
} from "../src/services/anonymous-error-report.js";
import { createPassiveAuditStore } from "../src/services/passive-diagnostics.js";

describe("anonymous error report (LGPD)", () => {
  // ── sanitizeParserLine ──────────────────────────────────────────────────

  it("keeps structural tokens: year.quad, course code, credits, and status keywords", () => {
    const line = "2025.2 BC0402 Funcao de Uma Variavel 4 0 4 6 APROVADO A O";
    const result = sanitizeParserLine(line);
    assert.equal(result, "2025.2 BC0402 4 0 4 6 APROVADO A O");
  });

  it("removes course name tokens that may contain personal or contextual text", () => {
    const line = "2024.3 MC102A Introducao a Programacao 3 1 4 6 REPROVADO F O";
    const result = sanitizeParserLine(line);
    assert.equal(result, "2024.3 MC102A 3 1 4 6 REPROVADO F O");
  });

  it("drops RA-length digit sequences (8–14 digits) that are not credit counts", () => {
    const line = "2025.1 BC1707 11201900123 Bases Computacionais 2 2 4 6 APROVADO B O";
    const result = sanitizeParserLine(line);
    // RA (11 digits) and course name tokens are stripped; structural tokens remain
    assert.equal(result, "2025.1 BC1707 2 2 4 6 APROVADO B O");
  });

  it("keeps accented SIGAA keywords after normalization", () => {
    const line = "2025.3 BC0506 Comunidade 2 0 4 6 MATRICULADO O O";
    const result = sanitizeParserLine(line);
    assert.equal(result, "2025.3 BC0506 2 0 4 6 MATRICULADO O O");
  });

  it("returns empty string for empty or whitespace-only input", () => {
    assert.equal(sanitizeParserLine(""), "");
    assert.equal(sanitizeParserLine("   "), "");
    assert.equal(sanitizeParserLine(null), "");
    assert.equal(sanitizeParserLine(undefined), "");
  });

  it("strips a line that is all free text with no structural tokens", () => {
    const result = sanitizeParserLine("Nome Completo do Aluno Historico Academico");
    assert.equal(result, "");
  });

  it("preserves the trancado marker TR as a known keyword", () => {
    const line = "2023.2 BC0005 Bases Matematicas 4 0 4 6 TRANCADO TR L";
    assert.equal(sanitizeParserLine(line), "2023.2 BC0005 4 0 4 6 TRANCADO TR L");
  });

  // ── buildAnonymousErrorReport ───────────────────────────────────────────

  it("does not include the original rawLine in the report payload", () => {
    const event = {
      timestamp: "2026-05-13T10:00:00.000Z",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      context: {
        rawLine: "2025.2 BC9999 Dados Pessoais Aluno RA 11223344556 4 0 APROVADO A O",
        detectedPattern: "likely_course_row",
      },
      resolved: false,
    };

    const report = buildAnonymousErrorReport(event);

    assert.ok(!("rawLine" in report), "rawLine must not be present in the report");
    assert.ok(!JSON.stringify(report).includes("11223344556"), "RA must not appear in serialized report");
    assert.ok(!JSON.stringify(report).includes("Pessoais"), "free-text tokens must not appear in report");
  });

  it("includes only the anonymized line and structural metadata", () => {
    const event = {
      timestamp: "2026-05-13T11:00:00.000Z",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      context: {
        rawLine: "2025.2 BC0402 Funcao de Uma Variavel 4 0 4 6 APROVADO A O",
        detectedPattern: "likely_course_row",
      },
      resolved: false,
    };

    const report = buildAnonymousErrorReport(event, { appVersion: "0.1.0" });

    assert.deepEqual(report, {
      reportVersion: "1",
      timestamp: "2026-05-13T11:00:00.000Z",
      appVersion: "0.1.0",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      detectedPattern: "likely_course_row",
      anonymizedLine: "2025.2 BC0402 4 0 4 6 APROVADO A O",
      lineStructure: ["ANO_QUAD", "CODIGO", "CREDITO", "CREDITO", "CREDITO", "CREDITO", "KEYWORD", "KEYWORD", "KEYWORD"],
      redactedTokenCount: 4,
    });
  });

  it("reports zero redactedTokenCount when the raw line contains only structural tokens", () => {
    const event = {
      timestamp: "2026-05-13T12:00:00.000Z",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      context: {
        rawLine: "2025.1 BC1707 2 2 4 6 APROVADO B O",
        detectedPattern: "likely_course_row",
      },
      resolved: false,
    };

    const report = buildAnonymousErrorReport(event);
    assert.equal(report.redactedTokenCount, 0);
  });

  it("falls back to unknown appVersion and detectedPattern when omitted", () => {
    const event = {
      timestamp: "2026-05-13T13:00:00.000Z",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      context: {},
      resolved: false,
    };

    const report = buildAnonymousErrorReport(event);
    assert.equal(report.appVersion, "unknown");
    assert.equal(report.detectedPattern, "unknown");
    assert.equal(report.anonymizedLine, "");
    assert.equal(report.redactedTokenCount, 0);
  });

  // ── prepareAnonymousReports ─────────────────────────────────────────────

  it("returns only reports for unresolved events", () => {
    const memoryStorage = new Map();
    const storage = {
      getItem: (key) => memoryStorage.get(key) ?? null,
      setItem: (key, value) => memoryStorage.set(key, value),
      removeItem: (key) => memoryStorage.delete(key),
    };

    // Import createPassiveAuditStore dynamically to build a real store
    // createPassiveAuditStore imported at top of file
    const store = createPassiveAuditStore({ storage });

    store.record({
      timestamp: "2026-05-13T14:00:00.000Z",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      context: { rawLine: "2025.2 BC0001 Nome Aluno 4 0 APROVADO A O", detectedPattern: "likely_course_row" },
      resolved: false,
    });
    store.record({
      timestamp: "2026-05-13T14:01:00.000Z",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      context: { rawLine: "2025.3 BC0002 3 0 APROVADO B O", detectedPattern: "likely_course_row" },
      resolved: true,
    });

    const reports = prepareAnonymousReports(store);

    assert.equal(reports.length, 1, "only the unresolved event should produce a report");
    assert.equal(reports[0].timestamp, "2026-05-13T14:00:00.000Z");
    assert.ok(!JSON.stringify(reports[0]).includes("Nome"), "name tokens must not appear in output");
  });

  it("returns an empty array when all events are resolved", () => {
    const memoryStorage = new Map();
    const storage = {
      getItem: (key) => memoryStorage.get(key) ?? null,
      setItem: (key, value) => memoryStorage.set(key, value),
      removeItem: (key) => memoryStorage.delete(key),
    };

    // createPassiveAuditStore imported at top of file
    const store = createPassiveAuditStore({ storage });

    store.record({
      timestamp: "2026-05-13T15:00:00.000Z",
      agent: "Agente-4",
      type: "PARSING_CONTRACT_MISMATCH",
      context: { rawLine: "2025.1 BC9999 2 0 APROVADO A O", detectedPattern: "likely_course_row" },
      resolved: true,
    });

    assert.deepEqual(prepareAnonymousReports(store), []);
  });
});
