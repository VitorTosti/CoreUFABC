/**
 * Thin Supabase REST client — no SDK dependency, just fetch.
 *
 * Uses the PostgREST API exposed by every Supabase project.
 * Docs: https://supabase.com/docs/guides/api
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function restUrl(table) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

/**
 * Fetch a student's academic record by RA.
 * @param {string} ra - normalized RA (digits only)
 * @returns {Promise<object|null>} the record's `dados` JSON, or null if not found
 */
export async function fetchHistoricoByRa(ra) {
  const url = `${restUrl("historicos")}?ra=eq.${encodeURIComponent(ra)}&select=*`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`Supabase error: ${res.status}`);
  }

  const rows = await res.json();
  if (rows.length === 0) return null;

  return rows[0].dados;
}

/**
 * Save (upsert) a student's academic record.
 * @param {string} ra
 * @param {string} nome
 * @param {string|null} cursoIngresso
 * @param {object} dados - the full academic record JSON
 */
export async function upsertHistorico(ra, nome, cursoIngresso, dados) {
  const body = {
    ra,
    nome,
    curso_ingresso: cursoIngresso,
    dados,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(restUrl("historicos"), {
    method: "POST",
    headers: headers({
      Prefer: "resolution=merge-duplicates",
    }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao salvar historico: ${text}`);
  }
}

/**
 * Fetch academic record directly from SIGAA via the Edge Function proxy.
 * Credentials are used once server-side and NEVER stored.
 *
 * @param {string} login - RA or SIGAA username
 * @param {string} senha - SIGAA password
 * @returns {Promise<object>} - { success, record, rawText } or throws
 */
export async function fetchFromSigaaProxy(login, senha) {
  const url = `${SUPABASE_URL}/functions/v1/sigaa-fetch`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ login, senha }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Erro ao conectar ao SIGAA (${res.status})`);
  }

  return data;
}

/** Check if Supabase is configured (env vars present). */
export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
