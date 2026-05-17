/**
 * Serviço de integração com a API pública do ufabc-next para dados de matrícula.
 *
 * Durante períodos de matrícula, a API expõe contagens de vagas e requisições
 * (alunos matriculados) por turma. Fora desse período os dados podem estar
 * desatualizados ou indisponíveis.
 *
 * Endpoint público: GET https://api.v2.ufabcnext.com/entities/components
 */

const API_URL = "https://api.v2.ufabcnext.com/entities/components";

/** Cache em memória — evita re-fetch a cada re-render */
let _cache = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca os dados de matrícula da API do ufabc-next.
 *
 * Retorna um Map<number, EnrollmentInfo> indexado pelo `disciplina_id`,
 * que corresponde ao campo `id` das turmas locais.
 *
 * @typedef {{ vagas: number, requisicoes: number, ratio: number }} EnrollmentInfo
 * @param {{ fetcher?: typeof fetch, signal?: AbortSignal }} options
 * @returns {Promise<Map<number, EnrollmentInfo>>}
 */
export async function fetchEnrollmentData(options = {}) {
  const { fetcher = globalThis.fetch, signal } = options;

  // Retorna cache se ainda válido
  if (_cache.data && Date.now() - _cache.timestamp < CACHE_TTL) {
    return _cache.data;
  }

  try {
    const response = await fetcher(API_URL, {
      signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Enrollment API responded with ${response.status}`);
    }

    const components = await response.json();

    const enrollmentMap = new Map();

    for (const comp of components) {
      const id = comp.disciplina_id ?? comp.id;
      if (id == null) continue;

      enrollmentMap.set(id, {
        vagas: comp.vagas ?? 0,
        requisicoes: comp.requisicoes ?? 0,
        ratio: comp.vagas > 0 ? comp.requisicoes / comp.vagas : 0,
      });
    }

    _cache = { data: enrollmentMap, timestamp: Date.now() };
    return enrollmentMap;
  } catch (err) {
    // Em caso de falha (rede, fora do período, CORS), retorna mapa vazio
    // para não quebrar a UI — o chip simplesmente não aparece.
    if (err.name === "AbortError") throw err;
    console.warn("[enrollment-api] Dados de matrícula indisponíveis:", err.message);
    return new Map();
  }
}

/**
 * Retorna info de matrícula para uma turma específica.
 * @param {Map<number, EnrollmentInfo>} enrollmentMap
 * @param {number} turmaId
 * @returns {EnrollmentInfo | null}
 */
export function getEnrollmentForTurma(enrollmentMap, turmaId) {
  return enrollmentMap?.get(turmaId) ?? null;
}

/** Limpa o cache (útil para testes ou refresh manual). */
export function clearEnrollmentCache() {
  _cache = { data: null, timestamp: 0 };
}
