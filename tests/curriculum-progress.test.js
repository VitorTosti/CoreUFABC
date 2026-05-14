import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCurriculumProgress, COURSE_PLANS, createCompletedCourseTokens } from "../src/utils/curriculum-progress.js";

describe("curriculum progress", () => {
  it("groups the selected course plan by requirement type and completed status", () => {
    const firstRequired = COURSE_PLANS.BCT.requirements.required[0];
    const secondRequiredName = COURSE_PLANS.BCT.requirements.required[1].nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();
    const approvedCodes = new Set([firstRequired.codigo, secondRequiredName]);

    const progress = buildCurriculumProgress(COURSE_PLANS.BCT, approvedCodes);

    assert.deepEqual(
      progress.sections.map((section) => ({
        key: section.key,
        total: section.total,
        completed: section.completed,
        firstStatus: section.items[0]?.completed,
      })),
      [
        { key: "required", total: 24, completed: 2, firstStatus: true },
        { key: "limited", total: 0, completed: 0, firstStatus: undefined },
        { key: "free", total: 0, completed: 0, firstStatus: undefined },
      ],
    );
    assert.equal(progress.total, 24);
    assert.equal(progress.completed, 2);
  });

  it("falls back to BC&T when a selected plan is missing", () => {
    const progress = buildCurriculumProgress(undefined, new Set(["BIS0005-15"]));

    assert.equal(progress.plan.key, "BCT");
    assert.equal(progress.completed, 1);
  });

  it("merges approved history courses with manually completed planning items", () => {
    const completedTokens = createCompletedCourseTokens(
      [{ codigo: "BIS0005-15", nome: "Bases Computacionais da Ciencia", conceito: "A", situacao: "APROVADO" }],
      new Set(["BCM0504-15"]),
    );

    assert.equal(completedTokens.has("BIS0005-15"), true);
    assert.equal(completedTokens.has("BASES COMPUTACIONAIS DA CIENCIA"), true);
    assert.equal(completedTokens.has("BCM0504-15"), true);
  });
});
