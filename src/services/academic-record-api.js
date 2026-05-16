export async function fetchAcademicRecordByRa(ra, options = {}) {
  const normalizedRa = normalizeRa(ra);
  const {
    baseUrl = "",
    fallbackRecords = [],
    fetcher = globalThis.fetch,
  } = options;

  if (!baseUrl) {
    const fallbackRecord =
      fallbackRecords.find((record) => normalizeRa(record.aluno?.ra) === normalizedRa) ??
      fallbackRecords[0];

    if (fallbackRecord) {
      return {
        ...fallbackRecord,
        aluno: { ...fallbackRecord.aluno, ra: normalizedRa },
        _demoMode: true,
      };
    }

    throw new Error("Nenhum historico de demonstracao disponivel.");
  }

  if (typeof fetcher !== "function") {
    throw new Error("Cliente HTTP indisponivel para buscar historico academico");
  }

  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(normalizedRa)}`);
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o historico academico pelo RA informado");
  }

  return response.json();
}

function normalizeRa(ra) {
  const normalizedRa = String(ra ?? "").replace(/\D/g, "");

  if (!/^\d{8,14}$/.test(normalizedRa)) {
    throw new RangeError("RA deve conter entre 8 e 14 digitos");
  }

  return normalizedRa;
}
