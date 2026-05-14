import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchAcademicRecordByRa } from "../src/services/academic-record-api.js";

describe("academic record API connector", () => {
  it("fetches academic history from a configured API by RA", async () => {
    const expectedRecord = {
      aluno: { ra: "11202600000", nome: "Aluno API" },
      formacoes: [],
      disciplinas: [],
    };
    const calls = [];
    const fetcher = async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => expectedRecord,
      };
    };

    const result = await fetchAcademicRecordByRa("11202600000", {
      baseUrl: "https://core.example.test/records",
      fetcher,
    });

    assert.equal(calls[0], "https://core.example.test/records/11202600000");
    assert.deepEqual(result, expectedRecord);
  });

  it("uses local fallback records when no API URL is configured", async () => {
    const fallbackRecord = {
      aluno: { ra: "11202600000", nome: "Aluno Mock" },
      formacoes: [],
      disciplinas: [],
    };

    const result = await fetchAcademicRecordByRa("11202600000", {
      fallbackRecords: [fallbackRecord],
    });

    assert.deepEqual(result, fallbackRecord);
  });

  it("rejects invalid RA input before calling an API", async () => {
    await assert.rejects(
      () => fetchAcademicRecordByRa("abc", { fetcher: async () => ({ ok: true, json: async () => ({}) }) }),
      /RA deve conter entre 8 e 14 digitos/,
    );
  });
});
