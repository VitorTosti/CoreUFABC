const DEFAULT_AUDIT_STORAGE_KEY = "coreufabc.passiveDiagnostics";

const fallbackEvents = [];

export function createParsingContractMismatchLog({
  rawLine,
  detectedPattern = "likely_course_row",
  timestamp = new Date().toISOString(),
}) {
  return {
    timestamp,
    agent: "Agente-4",
    level: "warning",
    type: "PARSING_CONTRACT_MISMATCH",
    context: {
      rawLine,
      detectedPattern,
    },
    resolved: false,
  };
}

export function createPassiveAuditStore({
  storage = resolveBrowserStorage(),
  storageKey = DEFAULT_AUDIT_STORAGE_KEY,
} = {}) {
  function list() {
    if (!storage) return [...fallbackEvents];

    try {
      const rawEvents = storage.getItem(storageKey);
      const parsedEvents = rawEvents ? JSON.parse(rawEvents) : [];
      return Array.isArray(parsedEvents) ? parsedEvents : [];
    } catch {
      return [];
    }
  }

  function persist(events) {
    if (!storage) {
      fallbackEvents.splice(0, fallbackEvents.length, ...events);
      return;
    }

    storage.setItem(storageKey, JSON.stringify(events));
  }

  return {
    record(event) {
      const events = [...list(), event];
      persist(events);
      return event;
    },
    list,
    exportJson() {
      return JSON.stringify(list(), null, 2);
    },
    clear() {
      if (!storage) {
        fallbackEvents.length = 0;
        return;
      }

      storage.removeItem(storageKey);
    },
  };
}

export const passiveAuditStore = createPassiveAuditStore();

export function buildImportHealthStatus({ parsedCount, warningCount }) {
  const totalDetectedCount = parsedCount + warningCount;
  const precision = totalDetectedCount === 0 ? 100 : Math.floor((parsedCount / totalDetectedCount) * 100);
  const level = warningCount > 0 ? "warning" : "success";

  return {
    parsedCount,
    warningCount,
    totalDetectedCount,
    precision,
    level,
    message:
      warningCount > 0
        ? `Importacao concluida com ${precision}% de precisao. ${warningCount} ${pluralizeLine(warningCount)} nao ${pluralizeWas(warningCount)} reconhecida${warningCount === 1 ? "" : "s"}.`
        : "Importacao concluida com 100% de precisao.",
  };
}

function resolveBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

function pluralizeLine(count) {
  return count === 1 ? "linha" : "linhas";
}

function pluralizeWas(count) {
  return count === 1 ? "foi" : "foram";
}
