import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateAffinityCoefficient,
  checkRequirementGap,
  findEnrollmentScheduleConflicts,
  calculatePerformanceCoefficient,
  calculateProgressionCoefficient,
  createSimulatedCourseRecord,
  projectPerformanceCoefficient,
} from "../src/services/academic-metrics.js";

describe("academic metrics", () => {
  it("calculates CR weighted by total TPE credits", () => {
    const records = [
      { codigo: "BC1707", creditos_tide: { teoria: 3, pratica: 1 }, conceito: "A", situacao: "APROVADO" },
      { codigo: "BC0005", creditos_tide: { teoria: 2, pratica: 2 }, conceito: "C", situacao: "APROVADO" },
      { codigo: "BC0402", creditos_tide: { teoria: 3, pratica: 0 }, conceito: "F", situacao: "REPROVADO" },
    ];

    const result = calculatePerformanceCoefficient(records);

    assert.equal(result, ((4 * 4) + (2 * 4) + (0 * 3)) / 11);
  });

  it("ignores transfer and withdrawal concepts in CR", () => {
    const records = [
      { codigo: "BC1707", creditos_tide: { teoria: 3, pratica: 1 }, conceito: "A", situacao: "APROVADO" },
      { codigo: "BC9999", creditos_tide: { teoria: 2, pratica: 0 }, conceito: "TR", situacao: "TRANCADO" },
    ];

    assert.equal(calculatePerformanceCoefficient(records), 4);
  });

  it("calculates CA using best approved attempt per course and affinity weight", () => {
    const records = [
      { codigo: "BC0001", creditos_tide: { teoria: 3, pratica: 1 }, conceito: "C", situacao: "APROVADO" },
      { codigo: "BC0001", creditos_tide: { teoria: 3, pratica: 1 }, conceito: "A", situacao: "APROVADO" },
      { codigo: "BC0002", creditos_tide: { teoria: 2, pratica: 2 }, conceito: "B", situacao: "APROVADO" },
      { codigo: "BC0003", creditos_tide: { teoria: 3, pratica: 0 }, conceito: "F", situacao: "REPROVADO" },
    ];
    const affinityWeights = { BC0001: 2, BC0002: 1, BC0003: 5 };

    const result = calculateAffinityCoefficient(records, affinityWeights);

    assert.equal(result, ((4 * 4 * 2) + (3 * 4 * 1)) / ((4 * 2) + (4 * 1)));
  });

  it("calculates CP as approved credits over required credits", () => {
    const records = [
      { codigo: "BC1707", creditos_tide: { teoria: 3, pratica: 1 }, conceito: "A", situacao: "APROVADO" },
      { codigo: "BC0005", creditos_tide: { teoria: 2, pratica: 2 }, conceito: "D", situacao: "APROVADO" },
      { codigo: "BC0402", creditos_tide: { teoria: 3, pratica: 0 }, conceito: "F", situacao: "REPROVADO" },
    ];

    const result = calculateProgressionCoefficient(records, 20);

    assert.equal(result, 0.4);
  });

  it("projects CR by adding next quadrimester attempts", () => {
    const records = [
      { codigo: "BC1707", creditos_tide: { teoria: 3, pratica: 1 }, conceito: "B", situacao: "APROVADO" },
      { codigo: "BC0005", creditos_tide: { teoria: 2, pratica: 2 }, conceito: "C", situacao: "APROVADO" },
    ];
    const planned = [
      { codigo: "BC0402", creditos_tide: { teoria: 3, pratica: 1 }, conceito: "A", situacao: "SIMULADO" },
    ];

    const result = projectPerformanceCoefficient(records, planned);

    assert.equal(result, ((3 * 4) + (2 * 4) + (4 * 4)) / 12);
  });

  it("creates a simulated record from a course and projected concept", () => {
    const course = {
      codigo: "BC0402",
      nome: "Funcao de Uma Variavel",
      creditos_tide: { teoria: 4, pratica: 0, estudo: 4, individual: 6 },
      categoria_sigla: "O",
      conceito: "F",
      ano_quadrimestre: "2025.2",
      situacao: "REPROVADO",
      eixos: [{ codigo: "matematica", nome: "Matematica", peso: 1 }],
    };

    const result = createSimulatedCourseRecord(course, {
      concept: "B",
      credits: 5,
      quadrimester: "2026.1",
    });

    assert.deepEqual(result, {
      codigo: "BC0402",
      nome: "Funcao de Uma Variavel",
      creditos_tide: { teoria: 5, pratica: 0, estudo: 0, individual: 0 },
      categoria_sigla: "O",
      conceito: "B",
      ano_quadrimestre: "2026.1",
      situacao: "SIMULADO",
      eixos: [{ codigo: "matematica", nome: "Matematica", peso: 1 }],
    });
  });

  it("detects enrollment schedule conflicts between selected classes", () => {
    const selectedClasses = [
      {
        codigo: "BC0005",
        nome: "Bases Matematicas",
        turma: "A1",
        horarios: [{ dia: "segunda", inicio: "08:00", fim: "10:00" }],
      },
      {
        codigo: "BC0402",
        nome: "Funcao de Uma Variavel",
        turma: "B1",
        horarios: [{ dia: "segunda", inicio: "09:30", fim: "11:00" }],
      },
      {
        codigo: "BC1707",
        nome: "Bases Computacionais da Ciencia",
        turma: "C1",
        horarios: [{ dia: "terca", inicio: "08:00", fim: "10:00" }],
      },
    ];

    const conflicts = findEnrollmentScheduleConflicts(selectedClasses);

    assert.deepEqual(conflicts, [
      {
        type: "SCHEDULE_OVERLAP",
        courses: [
          { codigo: "BC0005", nome: "Bases Matematicas", turma: "A1" },
          { codigo: "BC0402", nome: "Funcao de Uma Variavel", turma: "B1" },
        ],
        day: "SEGUNDA",
        overlap: { start: "09:30", end: "10:00" },
        meetings: [
          { day: "SEGUNDA", start: "08:00", end: "10:00" },
          { day: "SEGUNDA", start: "09:30", end: "11:00" },
        ],
      },
    ]);
  });

  it("does not flag adjacent enrollment times as conflicts", () => {
    const selectedClasses = [
      {
        codigo: "BC0005",
        nome: "Bases Matematicas",
        schedule: [{ day: "WEDNESDAY", start: "10:00", end: "12:00" }],
      },
      {
        codigo: "BC0402",
        nome: "Funcao de Uma Variavel",
        schedule: [{ day: "WEDNESDAY", start: "12:00", end: "14:00" }],
      },
    ];

    assert.deepEqual(findEnrollmentScheduleConflicts(selectedClasses), []);
  });

  it("returns required course gap from the selected curriculum", () => {
    const userHistory = [
      { codigo: "BC0005", nome: "Bases Matematicas", conceito: "A", situacao: "APROVADO" },
      { codigo: "BC0402", nome: "Funcao de Uma Variavel", conceito: "F", situacao: "REPROVADO" },
      { codigo: "BC0506", nome: "Comunidade, Universidade e Sociedade", conceito: "TR", situacao: "TRANCADO" },
      { codigo: "BC1707", nome: "Bases Computacionais da Ciencia", conceito: "O", situacao: "CONVALIDADO" },
    ];
    const selectedCurriculum = {
      codigo: "BCT",
      nome: "Bacharelado em Ciencia e Tecnologia",
      requiredCourses: [
        { codigo: "BC0005", nome: "Bases Matematicas", creditos_tide: { teoria: 4, pratica: 0 } },
        { codigo: "BC0402", nome: "Funcao de Uma Variavel", creditos_tide: { teoria: 4, pratica: 0 } },
        { codigo: "BC0506", nome: "Comunidade, Universidade e Sociedade", creditos_tide: { teoria: 2, pratica: 0 } },
        { codigo: "BC1707", nome: "Bases Computacionais da Ciencia", creditos_tide: { teoria: 0, pratica: 2 } },
      ],
    };

    const gap = checkRequirementGap(userHistory, selectedCurriculum);

    assert.deepEqual(gap, {
      curriculum: { codigo: "BCT", nome: "Bacharelado em Ciencia e Tecnologia" },
      requiredCount: 4,
      completedCount: 2,
      missingCount: 2,
      isComplete: false,
      completedRequiredCourses: [
        { codigo: "BC0005", nome: "Bases Matematicas", creditos_tide: { teoria: 4, pratica: 0 } },
        { codigo: "BC1707", nome: "Bases Computacionais da Ciencia", creditos_tide: { teoria: 0, pratica: 2 } },
      ],
      missingRequiredCourses: [
        { codigo: "BC0402", nome: "Funcao de Uma Variavel", creditos_tide: { teoria: 4, pratica: 0 } },
        { codigo: "BC0506", nome: "Comunidade, Universidade e Sociedade", creditos_tide: { teoria: 2, pratica: 0 } },
      ],
    });
  });

  it("accepts Portuguese required-course keys from curriculum data", () => {
    const userHistory = [
      { codigo: "BC0005", nome: "Bases Matematicas", conceito: "D", situacao: "APROVADO" },
      { codigo: "BC1707", nome: "Bases Computacionais da Ciencia", conceito: "B", situacao: "APROVADO" },
    ];
    const selectedCurriculum = {
      codigo: "BCT",
      obrigatorias: [
        { codigo: "BC0005", nome: "Bases Matematicas" },
        { codigo: "BC1707", nome: "Bases Computacionais da Ciencia" },
      ],
    };

    const gap = checkRequirementGap(userHistory, selectedCurriculum);

    assert.equal(gap.isComplete, true);
    assert.equal(gap.missingCount, 0);
    assert.deepEqual(gap.missingRequiredCourses, []);
  });

  it("accepts mandatory course catalogs from Agent 4 curriculum files", () => {
    const userHistory = [
      { codigo: "BC0005", nome: "Bases Matematicas", conceito: "B", situacao: "APROVADO" },
    ];
    const selectedCurriculum = {
      codigo: "BCT",
      materias_obrigatorias: [
        { codigo: "BC0005", nome: "Bases Matematicas", creditos: 4 },
        { codigo: "BC0402", nome: "Funcao de Uma Variavel", creditos: 4 },
      ],
    };

    const gap = checkRequirementGap(userHistory, selectedCurriculum);

    assert.deepEqual(gap.missingRequiredCourses, [
      { codigo: "BC0402", nome: "Funcao de Uma Variavel", creditos: 4 },
    ]);
  });

  // ── checkRequirementGap precision edge cases ──────────────────────────

  it("gap: empty history yields all required courses as missing", () => {
    const gap = checkRequirementGap([], {
      codigo: "BCT",
      nome: "Bacharelado em Ciencia e Tecnologia",
      requiredCourses: [
        { codigo: "BC0005", nome: "Bases Matematicas" },
        { codigo: "BC0402", nome: "Funcao de Uma Variavel" },
      ],
    });

    assert.equal(gap.isComplete, false);
    assert.equal(gap.requiredCount, 2);
    assert.equal(gap.completedCount, 0);
    assert.equal(gap.missingCount, 2);
  });

  it("gap: curriculum with no required courses is immediately complete", () => {
    const gap = checkRequirementGap(
      [{ codigo: "BC0005", conceito: "A", situacao: "APROVADO" }],
      { codigo: "BCT", nome: "Bacharelado em Ciencia e Tecnologia" },
    );

    assert.equal(gap.isComplete, true);
    assert.equal(gap.requiredCount, 0);
    assert.equal(gap.completedCount, 0);
    assert.equal(gap.missingCount, 0);
  });

  it("gap: code matching is case-insensitive and trims whitespace", () => {
    // History may come from external sources with inconsistent casing/spacing
    const userHistory = [
      { codigo: "bc0005", conceito: "A", situacao: "APROVADO" },
      { codigo: " BC0402 ", conceito: "B", situacao: "APROVADO" },
    ];
    const gap = checkRequirementGap(userHistory, {
      codigo: "BCT",
      requiredCourses: [
        { codigo: "BC0005", nome: "Bases Matematicas" },
        { codigo: "BC0402", nome: "Funcao de Uma Variavel" },
      ],
    });

    assert.equal(gap.isComplete, true);
    assert.equal(gap.missingCount, 0);
  });

  it("gap: MATRICULADO with concept O is not counted as approved", () => {
    // A student currently enrolled has not yet earned credit
    const userHistory = [
      { codigo: "BC0005", conceito: "O", situacao: "MATRICULADO" },
    ];
    const gap = checkRequirementGap(userHistory, {
      codigo: "BCT",
      requiredCourses: [{ codigo: "BC0005", nome: "Bases Matematicas" }],
    });

    assert.equal(gap.isComplete, false);
    assert.equal(gap.missingCount, 1);
  });

  it("gap: a course failed then re-approved counts as completed", () => {
    const userHistory = [
      { codigo: "BC0402", conceito: "F", situacao: "REPROVADO" },
      { codigo: "BC0402", conceito: "C", situacao: "APROVADO" },
    ];
    const gap = checkRequirementGap(userHistory, {
      codigo: "BCT",
      requiredCourses: [{ codigo: "BC0402", nome: "Funcao de Uma Variavel" }],
    });

    assert.equal(gap.isComplete, true);
    assert.equal(gap.completedCount, 1);
  });

  it("gap: REPROVADO_FALTA is not counted as approved", () => {
    const userHistory = [
      { codigo: "BC0005", conceito: "F", situacao: "REPROVADO_FALTA" },
    ];
    const gap = checkRequirementGap(userHistory, {
      codigo: "BCT",
      requiredCourses: [{ codigo: "BC0005", nome: "Bases Matematicas" }],
    });

    assert.equal(gap.isComplete, false);
    assert.equal(gap.missingCount, 1);
  });

  it("gap: isComplete is true only when every required course is approved", () => {
    const userHistory = [
      { codigo: "BC0005", conceito: "D", situacao: "APROVADO" },
      { codigo: "BC0402", conceito: "A", situacao: "APROVADO" },
      { codigo: "BC1707", conceito: "O", situacao: "CONVALIDADO" },
    ];
    const gap = checkRequirementGap(userHistory, {
      codigo: "BCT",
      requiredCourses: [
        { codigo: "BC0005" },
        { codigo: "BC0402" },
        { codigo: "BC1707" },
      ],
    });

    assert.equal(gap.isComplete, true);
    assert.equal(gap.completedCount, 3);
    assert.equal(gap.missingCount, 0);
  });
});
