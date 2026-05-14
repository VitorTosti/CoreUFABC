import assert from "node:assert/strict";
import { describe, it } from "node:test";

import curriculums from "../src/data/curriculums.json" with { type: "json" };

describe("introductory curriculums catalog", () => {
  it("maps the four UFABC introductory curriculums", () => {
    assert.deepEqual(Object.keys(curriculums), ["BCT", "BCH", "LCN", "LCH"]);
  });

  it("keeps required credit totals aligned with mandatory course credits", () => {
    for (const curriculum of Object.values(curriculums)) {
      const mandatoryCredits = curriculum.materias_obrigatorias.reduce(
        (total, course) => total + course.creditos,
        0,
      );

      assert.equal(mandatoryCredits, curriculum.creditos_exigidos.obrigatorias, curriculum.codigo);
    }
  });

  it("stores canonical category totals for each curriculum", () => {
    assert.deepEqual(curriculums.BCT.creditos_exigidos, { obrigatorias: 84, limitadas: 32, livres: 60 });
    assert.deepEqual(curriculums.BCH.creditos_exigidos, { obrigatorias: 72, limitadas: 64, livres: 40 });
    assert.deepEqual(curriculums.LCN.creditos_exigidos, { obrigatorias: 82, limitadas: 96, livres: 0 });
    assert.deepEqual(curriculums.LCH.creditos_exigidos, { obrigatorias: 83, limitadas: 96, livres: 29 });
  });

  it("includes source metadata for auditability", () => {
    for (const curriculum of Object.values(curriculums)) {
      assert.match(curriculum.fonte.url, /^https:\/\/(www\.)?ufabc\.edu\.br\//);
      assert.match(curriculum.fonte.ppc, /PPC/);
    }
  });

  it("keeps optional and free course suggestions separate from official requirements", () => {
    for (const curriculum of Object.values(curriculums)) {
      assert.ok(Array.isArray(curriculum.sugestoes.opcionais), curriculum.codigo);
      assert.ok(Array.isArray(curriculum.sugestoes.livres), curriculum.codigo);

      for (const suggestion of [...curriculum.sugestoes.opcionais, ...curriculum.sugestoes.livres]) {
        assert.match(suggestion.codigo, /^[A-Z]{3,5}\d{3,4}-\d{2}$/);
        assert.equal(typeof suggestion.nome, "string");
        assert.equal(typeof suggestion.motivo, "string");
        assert.equal(suggestion.fonte, "Catalogo de Disciplinas UFABC 2024-2025");
      }
    }
  });
});
