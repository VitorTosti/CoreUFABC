import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildImportHealthStatus,
  createParsingContractMismatchLog,
  createPassiveAuditStore,
} from "../src/services/passive-diagnostics.js";

describe("passive diagnostics", () => {
  it("creates a structured parser mismatch log", () => {
    const event = createParsingContractMismatchLog({
      rawLine: "2025.2 BC9998 Linha sem campos suficientes",
      detectedPattern: "likely_course_row",
      timestamp: "2026-05-12T10:00:00.000Z",
    });

    assert.deepEqual(event, {
      timestamp: "2026-05-12T10:00:00.000Z",
      agent: "Agente-4",
      level: "warning",
      type: "PARSING_CONTRACT_MISMATCH",
      context: {
        rawLine: "2025.2 BC9998 Linha sem campos suficientes",
        detectedPattern: "likely_course_row",
      },
      resolved: false,
    });
  });

  it("persists audit events in a local storage compatible store", () => {
    const memoryStorage = new Map();
    const storage = {
      getItem: (key) => memoryStorage.get(key) ?? null,
      setItem: (key, value) => memoryStorage.set(key, value),
      removeItem: (key) => memoryStorage.delete(key),
    };
    const store = createPassiveAuditStore({ storage });

    store.record({ type: "ONE" });
    store.record({ type: "TWO" });

    assert.deepEqual(store.list(), [{ type: "ONE" }, { type: "TWO" }]);
    assert.equal(store.exportJson(), JSON.stringify([{ type: "ONE" }, { type: "TWO" }], null, 2));
  });

  it("summarizes import health for the UI feedback bridge", () => {
    assert.deepEqual(buildImportHealthStatus({ parsedCount: 30, warningCount: 5 }), {
      parsedCount: 30,
      warningCount: 5,
      totalDetectedCount: 35,
      precision: 85,
      level: "warning",
      message: "Importacao concluida com 85% de precisao. 5 linhas nao foram reconhecidas.",
    });
  });
});
