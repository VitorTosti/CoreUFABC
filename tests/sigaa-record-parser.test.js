import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseSigaaAcademicRecordText,
  normalizeRawCourseCode,
  inferEixosFromCode,
} from "../src/services/sigaa-record-parser.js";

describe("SIGAA academic record parser", () => {
  it("parses copied PDF text rows into the canonical academic record", () => {
    const rawText = `
      UNIVERSIDADE FEDERAL DO ABC
      Historico Escolar
      Discente: 11202600000 - Maria de Souza
      Curso: Bacharelado em Ciencia e Tecnologia

      Ano/Periodo Codigo Componente Curricular T P E I Categoria Conceito Situacao
      2025.1 BC1707 Bases Computacionais da Ciencia 0 2 2 4 Obrigatoria A Aprovado
      2025.1 BC0005 Bases Matematicas 4 0 4 4 O B Aprovado
      2025.2 BC0402 Funcao de Uma Variavel 4 0 4 6 Obrigatoria F Reprovado
    `;

    const result = parseSigaaAcademicRecordText(rawText);

    assert.deepEqual(result.record.aluno, {
      ra: "11202600000",
      nome: "Maria de Souza",
      curso_ingresso: "Bacharelado em Ciencia e Tecnologia",
    });
    assert.deepEqual(result.record.disciplinas, [
      {
        codigo: "BC1707",
        nome: "Bases Computacionais da Ciencia",
        creditos_tide: { teoria: 0, pratica: 2, estudo: 2, individual: 4 },
        categoria_sigla: "O",
        conceito: "A",
        ano_quadrimestre: "2025.1",
        situacao: "APROVADO",
        eixos: [],
      },
      {
        codigo: "BC0005",
        nome: "Bases Matematicas",
        creditos_tide: { teoria: 4, pratica: 0, estudo: 4, individual: 4 },
        categoria_sigla: "O",
        conceito: "B",
        ano_quadrimestre: "2025.1",
        situacao: "APROVADO",
        eixos: [],
      },
      {
        codigo: "BC0402",
        nome: "Funcao de Uma Variavel",
        creditos_tide: { teoria: 4, pratica: 0, estudo: 4, individual: 6 },
        categoria_sigla: "O",
        conceito: "F",
        ano_quadrimestre: "2025.2",
        situacao: "REPROVADO",
        eixos: [],
      },
    ]);
    assert.deepEqual(result.warnings, []);
  });

  it("joins wrapped PDF rows and normalizes trancado and matriculado situations", () => {
    const rawText = `
      RA: 11202699999
      Nome: Joao UFABC

      2025/2 BC0506 Comunidade, Universidade
      e Sociedade 2 0 2 2 Limitada C Cumpriu
      2025.3 BC9999 Topicos Livres em Vida Universitaria 2 0 2 2 Livre -- Trancamento
      2026.1 MCTB001 Calculo Numerico 4 0 4 4 Opcao Limitada MAT Matriculado
    `;

    const { record } = parseSigaaAcademicRecordText(rawText);

    assert.deepEqual(record.disciplinas.map((course) => ({
      codigo: course.codigo,
      nome: course.nome,
      categoria_sigla: course.categoria_sigla,
      conceito: course.conceito,
      ano_quadrimestre: course.ano_quadrimestre,
      situacao: course.situacao,
    })), [
      {
        codigo: "BC0506",
        nome: "Comunidade, Universidade e Sociedade",
        categoria_sigla: "L",
        conceito: "C",
        ano_quadrimestre: "2025.2",
        situacao: "APROVADO",
      },
      {
        codigo: "BC9999",
        nome: "Topicos Livres em Vida Universitaria",
        categoria_sigla: "F",
        conceito: "TR",
        ano_quadrimestre: "2025.3",
        situacao: "TRANCADO",
      },
      {
        codigo: "MCTB001",
        nome: "Calculo Numerico",
        categoria_sigla: "L",
        conceito: "O",
        ano_quadrimestre: "2026.1",
        situacao: "MATRICULADO",
      },
    ]);
  });

  it("keeps invalid SIGAA fragments out of disciplinas and reports parser warnings", () => {
    const recordedEvents = [];
    const diagnosticsStore = {
      record: (event) => recordedEvents.push(event),
    };
    const rawText = `
      2025.1 BC1707 Bases Computacionais da Ciencia 0 2 2 4 O A Aprovado
      2025.2 BC9998 Linha sem campos suficientes
    `;

    const result = parseSigaaAcademicRecordText(rawText, {
      diagnosticsStore,
      timestamp: "2026-05-12T10:00:00.000Z",
    });

    assert.equal(result.record.disciplinas.length, 1);
    assert.deepEqual(result.warnings, [
      {
        code: "UNPARSED_COURSE_ROW",
        message: "Could not parse SIGAA course row for BC9998 in 2025.2",
        raw: "2025.2 BC9998 Linha sem campos suficientes",
      },
    ]);
    assert.deepEqual(recordedEvents, [
      {
        timestamp: "2026-05-12T10:00:00.000Z",
        agent: "Agente-4",
        level: "warning",
        type: "PARSING_CONTRACT_MISMATCH",
        context: {
          rawLine: "2025.2 BC9998 Linha sem campos suficientes",
          detectedPattern: "likely_course_row",
        },
        resolved: false,
      },
    ]);
    assert.deepEqual(result.importHealth, {
      parsedCount: 1,
      warningCount: 1,
      totalDetectedCount: 2,
      precision: 50,
      level: "warning",
      message: "Importacao concluida com 50% de precisao. 1 linha nao foi reconhecida.",
    });
  });

  it("skips PDF page headers and section labels injected between split course rows", () => {
    const rawText = `
      UNIVERSIDADE FEDERAL DO ABC
      Historico Escolar
      Discente: 11202600001 - Ana Lima
      Curso: Bacharelado em Ciencias e Humanidades

      Ano/Periodo Codigo Componente T P E I Categoria Conceito Situacao
      2025.1 BHO0101 Estado e Relacoes
      UNIVERSIDADE FEDERAL DO ABC
      Pagina 2
      de Poder 4 0 4 4 Obrigatoria A Aprovado
      2025.2 BIS0003 Bases Matematicas 4 0 4 4 O B Aprovado
    `;

    const { record, warnings } = parseSigaaAcademicRecordText(rawText);

    assert.equal(warnings.length, 0);
    assert.equal(record.disciplinas.length, 2);
    assert.equal(record.disciplinas[0].nome, "Estado e Relacoes de Poder");
    assert.equal(record.disciplinas[0].conceito, "A");
    assert.equal(record.disciplinas[1].codigo, "BIS0003");
  });

  it("normalizeRawCourseCode strips version suffix for cross-catalog comparison", () => {
    assert.equal(normalizeRawCourseCode("BIS0005-15"), "BIS0005");
    assert.equal(normalizeRawCourseCode("NHI5015-22"), "NHI5015");
    assert.equal(normalizeRawCourseCode("BIR0004-15"), "BIR0004");
    assert.equal(normalizeRawCourseCode("BC1707"), "BC1707");
    assert.equal(normalizeRawCourseCode("  bis0003-15  "), "BIS0003");
  });

  it("inferEixosFromCode maps course codes to the correct eixos", () => {
    assert.deepEqual(inferEixosFromCode("BCN0402-15"), [
      { codigo: "matematica", nome: "Matematica", peso: 1 },
    ]);
    assert.deepEqual(inferEixosFromCode("BCM0505-22"), [
      { codigo: "computacao", nome: "Computacao e Informacao", peso: 1 },
    ]);
    assert.deepEqual(inferEixosFromCode("BIS0005-15"), [
      { codigo: "computacao", nome: "Computacao e Informacao", peso: 0.7 },
      { codigo: "ciencias-naturais", nome: "Ciencias Naturais", peso: 0.3 },
    ]);
    assert.deepEqual(inferEixosFromCode("NHI5001-15"), [
      { codigo: "humanidades", nome: "Humanidades e Sociedade", peso: 1 },
    ]);
    assert.deepEqual(inferEixosFromCode("XXXXUNKNOWN"), []);
  });
});
