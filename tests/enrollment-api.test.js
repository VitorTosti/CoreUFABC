import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
  fetchEnrollmentData,
  getEnrollmentForTurma,
  clearEnrollmentCache,
} from "../src/services/enrollment-api.js";

/** Cria um fetcher falso que retorna a resposta configurada. */
function mockFetcher(body, { status = 200, ok = true } = {}) {
  return async () => ({
    ok,
    status,
    json: async () => body,
  });
}

describe("enrollment API", () => {
  beforeEach(() => clearEnrollmentCache());

  it("builds a Map indexed by disciplina_id from the API response", async () => {
    const fakeComponents = [
      { disciplina_id: 100541, vagas: 30, requisicoes: 12 },
      { disciplina_id: 100044, vagas: 60, requisicoes: 58 },
    ];

    const map = await fetchEnrollmentData({ fetcher: mockFetcher(fakeComponents) });

    assert.equal(map.size, 2);
    assert.deepEqual(map.get(100541), { vagas: 30, requisicoes: 12, ratio: 12 / 30 });
    assert.deepEqual(map.get(100044), { vagas: 60, requisicoes: 58, ratio: 58 / 60 });
  });

  it("falls back to id when disciplina_id is absent", async () => {
    const fakeComponents = [{ id: 99999, vagas: 10, requisicoes: 3 }];

    const map = await fetchEnrollmentData({ fetcher: mockFetcher(fakeComponents) });

    assert.equal(map.has(99999), true);
    assert.equal(map.get(99999).requisicoes, 3);
  });

  it("returns an empty Map on API error (graceful degradation)", async () => {
    const failingFetcher = async () => ({ ok: false, status: 503 });

    const map = await fetchEnrollmentData({ fetcher: failingFetcher });

    assert.equal(map.size, 0);
  });

  it("returns an empty Map on network failure", async () => {
    const networkError = async () => { throw new Error("Network unreachable"); };

    const map = await fetchEnrollmentData({ fetcher: networkError });

    assert.equal(map.size, 0);
  });

  it("re-throws AbortError so callers can handle cancellation", async () => {
    const abortError = async () => {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    };

    await assert.rejects(
      () => fetchEnrollmentData({ fetcher: abortError }),
      { name: "AbortError" },
    );
  });

  it("caches results and does not re-fetch within TTL", async () => {
    let callCount = 0;
    const countingFetcher = async () => {
      callCount++;
      return { ok: true, json: async () => [{ disciplina_id: 1, vagas: 5, requisicoes: 2 }] };
    };

    await fetchEnrollmentData({ fetcher: countingFetcher });
    await fetchEnrollmentData({ fetcher: countingFetcher });

    assert.equal(callCount, 1, "should use cached result on second call");
  });

  it("getEnrollmentForTurma returns null for unknown turma", () => {
    const map = new Map([[100, { vagas: 10, requisicoes: 5, ratio: 0.5 }]]);

    assert.equal(getEnrollmentForTurma(map, 999), null);
    assert.deepEqual(getEnrollmentForTurma(map, 100), { vagas: 10, requisicoes: 5, ratio: 0.5 });
  });

  it("getEnrollmentForTurma handles null/undefined map", () => {
    assert.equal(getEnrollmentForTurma(null, 1), null);
    assert.equal(getEnrollmentForTurma(undefined, 1), null);
  });

  it("computes ratio as 0 when vagas is 0", async () => {
    const fakeComponents = [{ disciplina_id: 42, vagas: 0, requisicoes: 5 }];

    const map = await fetchEnrollmentData({ fetcher: mockFetcher(fakeComponents) });

    assert.equal(map.get(42).ratio, 0);
  });
});
