export const CONCEPT_WEIGHTS = Object.freeze({
  A: 4,
  B: 3,
  C: 2,
  D: 1,
  F: 0,
  O: 0,
});

const APPROVED_CONCEPTS = new Set(["A", "B", "C", "D"]);

export function calculatePerformanceCoefficient(records) {
  const totals = records.reduce(
    (acc, record) => {
      const weight = CONCEPT_WEIGHTS[record.conceito];
      if (weight === undefined) return acc;

      const credits = getTpeCredits(record);
      return {
        weighted: acc.weighted + weight * credits,
        credits: acc.credits + credits,
      };
    },
    { weighted: 0, credits: 0 },
  );

  return safeDivide(totals.weighted, totals.credits);
}

export function calculateAffinityCoefficient(records, affinityWeights = {}) {
  const bestApprovedAttempts = new Map();

  for (const record of records) {
    if (!isApproved(record)) continue;

    const currentBest = bestApprovedAttempts.get(record.codigo);
    if (!currentBest || CONCEPT_WEIGHTS[record.conceito] > CONCEPT_WEIGHTS[currentBest.conceito]) {
      bestApprovedAttempts.set(record.codigo, record);
    }
  }

  const totals = [...bestApprovedAttempts.values()].reduce(
    (acc, record) => {
      const credits = getTpeCredits(record);
      const affinityWeight = affinityWeights[record.codigo] ?? 1;
      const denominatorWeight = credits * affinityWeight;

      return {
        weighted: acc.weighted + CONCEPT_WEIGHTS[record.conceito] * denominatorWeight,
        denominator: acc.denominator + denominatorWeight,
      };
    },
    { weighted: 0, denominator: 0 },
  );

  return safeDivide(totals.weighted, totals.denominator);
}

export function calculateProgressionCoefficient(records, requiredCredits) {
  if (!requiredCredits || requiredCredits <= 0) return 0;

  const approvedCredits = records.filter(isApproved).reduce((total, record) => total + getTpeCredits(record), 0);

  return Math.min(1, approvedCredits / requiredCredits);
}

export function projectPerformanceCoefficient(currentRecords, plannedRecords) {
  return calculatePerformanceCoefficient([...currentRecords, ...plannedRecords]);
}

export function createSimulatedCourseRecord(course, { concept, credits, quadrimester }) {
  return {
    codigo: course.codigo,
    nome: course.nome,
    creditos_tide: {
      teoria: credits,
      pratica: 0,
      estudo: 0,
      individual: 0,
    },
    categoria_sigla: course.categoria_sigla,
    conceito: concept,
    ano_quadrimestre: quadrimester,
    situacao: "SIMULADO",
    eixos: course.eixos ?? [],
  };
}

export function findEnrollmentScheduleConflicts(courses) {
  const scheduledCourses = courses.map((course, courseIndex) => ({
    course,
    courseIndex,
    meetings: getCourseMeetings(course),
  }));
  const conflicts = [];

  for (let i = 0; i < scheduledCourses.length; i += 1) {
    for (let j = i + 1; j < scheduledCourses.length; j += 1) {
      const first = scheduledCourses[i];
      const second = scheduledCourses[j];

      for (const firstMeeting of first.meetings) {
        for (const secondMeeting of second.meetings) {
          if (firstMeeting.day !== secondMeeting.day) continue;

          // Quinzenal(I) vs Quinzenal(II) → semanas opostas, nunca conflitam
          if (!periodicidadesConflict(firstMeeting.periodicidade, secondMeeting.periodicidade)) continue;

          const overlapStart = Math.max(firstMeeting.startMinutes, secondMeeting.startMinutes);
          const overlapEnd = Math.min(firstMeeting.endMinutes, secondMeeting.endMinutes);

          if (overlapStart >= overlapEnd) continue;

          conflicts.push({
            type: "SCHEDULE_OVERLAP",
            courses: [describeScheduledCourse(first.course), describeScheduledCourse(second.course)],
            day: firstMeeting.day,
            overlap: {
              start: formatMinutes(overlapStart),
              end: formatMinutes(overlapEnd),
            },
            meetings: [
              serializeMeeting(firstMeeting),
              serializeMeeting(secondMeeting),
            ],
          });
        }
      }
    }
  }

  return conflicts;
}

export function checkRequirementGap(userHistory, selectedCurriculum) {
  const requiredCourses = getRequiredCourses(selectedCurriculum);
  const approvedCourseCodes = new Set(userHistory.filter(isApproved).map((record) => normalizeCourseCode(record.codigo)));
  const completedRequiredCourses = [];
  const missingRequiredCourses = [];

  for (const course of requiredCourses) {
    if (approvedCourseCodes.has(normalizeCourseCode(course.codigo))) {
      completedRequiredCourses.push(course);
    } else {
      missingRequiredCourses.push(course);
    }
  }

  return {
    curriculum: {
      codigo: selectedCurriculum.codigo,
      nome: selectedCurriculum.nome,
    },
    requiredCount: requiredCourses.length,
    completedCount: completedRequiredCourses.length,
    missingCount: missingRequiredCourses.length,
    isComplete: missingRequiredCourses.length === 0,
    completedRequiredCourses,
    missingRequiredCourses,
  };
}

export function getTpeCredits(record) {
  // PDF parser uses flat `creditos` field; text parser uses `creditos_tide`
  if (record.creditos_tide) {
    const theory   = Number(record.creditos_tide.teoria   ?? 0);
    const practice = Number(record.creditos_tide.pratica  ?? 0);
    return theory + practice;
  }
  return Number(record.creditos ?? 0);
}

export function isApproved(record) {
  return APPROVED_CONCEPTS.has(record.conceito) || record.situacao === "APROVADO" || record.situacao === "CONVALIDADO";
}

function safeDivide(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function getRequiredCourses(curriculum) {
  return curriculum.requiredCourses ?? curriculum.obrigatorias ?? curriculum.materias_obrigatorias ?? [];
}

function normalizeCourseCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

// Índice numérico de semana usado pelo turmas-2026-q2.json (API do SIGAA)
const SEMANA_INDEX_TO_DAY = Object.freeze({
  1: "SEGUNDA",
  2: "TERCA",
  3: "QUARTA",
  4: "QUINTA",
  5: "SEXTA",
  6: "SABADO",
  7: "DOMINGO",
});

/**
 * Converte `periodicidade_extenso` da API (ou token canônico) em token canônico.
 * Aceita tanto a forma textual da API ("- quinzenal (II)") quanto
 * o token já normalizado ("QUINZENAL_II"), permitindo ambos os formatos nos testes.
 *
 * "- quinzenal (I)"  → "QUINZENAL_I"
 * "- quinzenal (II)" → "QUINZENAL_II"
 * "- semanal"        → "SEMANAL"   (default seguro)
 */
function parsePeriodicidade(extenso) {
  const raw = String(extenso ?? "").trim();
  // Token canônico passado diretamente (ex.: em testes com legado { periodicidade: "QUINZENAL_II" })
  if (raw === "QUINZENAL_I" || raw === "QUINZENAL_II" || raw === "SEMANAL") return raw;
  // Texto descritivo da API SIGAA (ex.: "- quinzenal (II)")
  const lower = raw.toLowerCase();
  if (/quinzenal\s*\(?ii\)?/.test(lower)) return "QUINZENAL_II";
  if (/quinzenal\s*\(?i\)?/.test(lower))  return "QUINZENAL_I";
  return "SEMANAL";
}

/**
 * Duas periodicidades entram em conflito se, e somente se, as aulas podem
 * ocorrer na mesma semana física.
 * Quinzenal(I) e Quinzenal(II) alternam semanas → NUNCA conflitam entre si.
 */
function periodicidadesConflict(a, b) {
  return !(
    (a === "QUINZENAL_I"  && b === "QUINZENAL_II") ||
    (a === "QUINZENAL_II" && b === "QUINZENAL_I")
  );
}

function getCourseMeetings(course) {
  const rawMeetings = course.horarios ?? course.schedule ?? [];

  return rawMeetings.map((meeting) => {
    let day, startMinutes, endMinutes, periodicidade;

    // Formato da API SIGAA / turmas-YYYY-qN.json:
    //   { semana: 4, horas: ["19:00","19:30","20:00","20:30","21:00"], periodicidade_extenso: "- quinzenal (II)" }
    if (typeof meeting.semana === "number" && Array.isArray(meeting.horas) && meeting.horas.length >= 2) {
      day           = SEMANA_INDEX_TO_DAY[meeting.semana] ?? String(meeting.semana);
      startMinutes  = parseTimeToMinutes(meeting.horas[0]);
      endMinutes    = parseTimeToMinutes(meeting.horas[meeting.horas.length - 1]);
      periodicidade = parsePeriodicidade(meeting.periodicidade_extenso);
    } else {
      // Formato legado / testes: { dia/day, inicio/start, fim/end }
      day           = normalizeDay(meeting.dia ?? meeting.day);
      startMinutes  = parseTimeToMinutes(meeting.inicio ?? meeting.start);
      endMinutes    = parseTimeToMinutes(meeting.fim    ?? meeting.end);
      periodicidade = parsePeriodicidade(meeting.periodicidade_extenso ?? meeting.periodicidade);
    }

    if (startMinutes >= endMinutes) {
      throw new RangeError(`Invalid meeting interval for ${course.codigo ?? course.nome ?? "course"}`);
    }

    return { day, startMinutes, endMinutes, periodicidade };
  });
}

function describeScheduledCourse(course) {
  return {
    codigo: course.codigo,
    nome: course.nome,
    ...(course.turma ? { turma: course.turma } : {}),
  };
}

function serializeMeeting(meeting) {
  return {
    day: meeting.day,
    start: formatMinutes(meeting.startMinutes),
    end: formatMinutes(meeting.endMinutes),
  };
}

function normalizeDay(day) {
  if (!day) {
    throw new RangeError("Meeting day is required");
  }

  const normalized = String(day)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const dayAliases = {
    SEGUNDA: "SEGUNDA",
    "SEGUNDA-FEIRA": "SEGUNDA",
    MONDAY: "SEGUNDA",
    TERCA: "TERCA",
    "TERCA-FEIRA": "TERCA",
    TUESDAY: "TERCA",
    QUARTA: "QUARTA",
    "QUARTA-FEIRA": "QUARTA",
    WEDNESDAY: "QUARTA",
    QUINTA: "QUINTA",
    "QUINTA-FEIRA": "QUINTA",
    THURSDAY: "QUINTA",
    SEXTA: "SEXTA",
    "SEXTA-FEIRA": "SEXTA",
    FRIDAY: "SEXTA",
    SABADO: "SABADO",
    SATURDAY: "SABADO",
    DOMINGO: "DOMINGO",
    SUNDAY: "DOMINGO",
  };

  return dayAliases[normalized] ?? normalized;
}

function parseTimeToMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time));

  if (!match) {
    throw new RangeError(`Invalid time: ${time}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    throw new RangeError(`Invalid time: ${time}`);
  }

  return (hours * 60) + minutes;
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
