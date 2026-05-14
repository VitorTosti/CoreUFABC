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
  if (requiredCredits <= 0) {
    throw new RangeError("requiredCredits must be greater than zero");
  }

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
  const theory = Number(record.creditos_tide?.teoria ?? 0);
  const practice = Number(record.creditos_tide?.pratica ?? 0);

  return theory + practice;
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

function getCourseMeetings(course) {
  const rawMeetings = course.horarios ?? course.schedule ?? [];

  return rawMeetings.map((meeting) => {
    const day = normalizeDay(meeting.dia ?? meeting.day);
    const start = meeting.inicio ?? meeting.start;
    const end = meeting.fim ?? meeting.end;
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);

    if (startMinutes >= endMinutes) {
      throw new RangeError(`Invalid meeting interval for ${course.codigo ?? course.nome ?? "course"}`);
    }

    return {
      day,
      startMinutes,
      endMinutes,
    };
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
