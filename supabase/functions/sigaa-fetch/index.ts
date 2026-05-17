/**
 * Supabase Edge Function — SIGAA academic record proxy.
 *
 * Flow:
 *   1. GET SIGAA login page → obtain JSESSIONID
 *   2. POST credentials → authenticate
 *   3. GET academic record page → extract text
 *   4. Return structured data (credentials are NEVER stored/logged)
 *
 * LGPD: credentials exist only in function memory for ~3s, then are GC'd.
 */

const SIGAA_BASE = "https://sig.ufabc.edu.br/sigaa";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let login = "";
  let senha = "";

  try {
    const body = await req.json();
    login = String(body.login ?? "").trim();
    senha = String(body.senha ?? "");

    if (!login || !senha) {
      return jsonResponse({ error: "Login e senha sao obrigatorios." }, 400);
    }

    // ── Step 1: GET login page to obtain JSESSIONID ──
    const loginPageRes = await fetch(`${SIGAA_BASE}/verTelaLogin.do`, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
    });

    const jsessionid = extractJSessionId(loginPageRes.headers);
    if (!jsessionid) {
      return jsonResponse({ error: "Nao foi possivel conectar ao SIGAA. Tente novamente." }, 502);
    }

    // ── Step 2: POST credentials to authenticate ──
    const formData = new URLSearchParams({
      "user.login": login,
      "user.senha": senha,
      width: "1920",
      height: "1080",
      urlRedirect: "",
      subsistemaRedirect: "",
      acao: "",
      acessibilidade: "",
    });

    const authRes = await fetch(
      `${SIGAA_BASE}/logar.do;jsessionid=${jsessionid}?dispatch=logOn`,
      {
        method: "POST",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `JSESSIONID=${jsessionid}`,
          Referer: `${SIGAA_BASE}/verTelaLogin.do`,
        },
        body: formData.toString(),
      },
    );

    // Update session cookie if server rotated it
    const newSession = extractJSessionId(authRes.headers) ?? jsessionid;
    const authBody = await authRes.text();

    // Check for login failure indicators
    if (
      authBody.includes("Usuário e/ou senha inválidos") ||
      authBody.includes("usuario e/ou senha invalidos") ||
      authBody.includes("Login e/ou senha inv") ||
      authBody.includes("verTelaLogin")
    ) {
      return jsonResponse({ error: "Login ou senha incorretos." }, 401);
    }

    // ── Step 3: Navigate to student portal ──
    const portalRes = await fetchWithSession(
      `${SIGAA_BASE}/portais/discente/discente.jsf`,
      newSession,
    );
    const portalSession = extractJSessionId(portalRes.headers) ?? newSession;

    // ── Step 4: Try to fetch the academic record page ──
    // Try common SIGAA paths for the academic record
    const historicoUrls = [
      `${SIGAA_BASE}/portais/discente/historico.jsf`,
      `${SIGAA_BASE}/ensino/aluno/consultas/historico_escolar.jsf`,
    ];

    let historicoText = "";
    for (const url of historicoUrls) {
      try {
        const res = await fetchWithSession(url, portalSession);
        const text = await res.text();
        // Check if this looks like an academic record page
        if (
          text.includes("Histórico") ||
          text.includes("APROVADO") ||
          text.includes("REPROVADO") ||
          text.includes("Componente Curricular")
        ) {
          historicoText = text;
          break;
        }
      } catch {
        // Try next URL
      }
    }

    // If direct URLs didn't work, try extracting from the portal page
    if (!historicoText) {
      const portalText = await portalRes.text();

      // Look for the historico link in the portal
      const historicoLinkMatch = portalText.match(
        /href="([^"]*(?:historico|hist)[^"]*)"/i,
      );

      if (historicoLinkMatch) {
        const historicoUrl = historicoLinkMatch[1].startsWith("http")
          ? historicoLinkMatch[1]
          : `${SIGAA_BASE}${historicoLinkMatch[1].startsWith("/") ? "" : "/"}${historicoLinkMatch[1]}`;

        const histRes = await fetchWithSession(historicoUrl, portalSession);
        historicoText = await histRes.text();
      }
    }

    if (!historicoText) {
      return jsonResponse(
        {
          error: "Login bem-sucedido, mas nao foi possivel localizar o historico escolar. O SIGAA pode estar em manutencao.",
          loginOk: true,
        },
        404,
      );
    }

    // ── Step 5: Extract plain text from HTML for the parser ──
    const plainText = htmlToPlainText(historicoText);

    // ── Step 6: Extract structured data from HTML directly ──
    const disciplinas = extractDisciplinasFromHtml(historicoText);
    const aluno = extractAlunoFromHtml(historicoText, login);

    return jsonResponse({
      success: true,
      record: {
        aluno,
        disciplinas,
        _source: "sigaa-proxy",
        _fetchedAt: new Date().toISOString(),
      },
      rawText: plainText,
    });
  } catch (err) {
    console.error("SIGAA fetch error:", (err as Error).message);
    return jsonResponse(
      { error: "Erro interno ao conectar ao SIGAA. Tente novamente." },
      500,
    );
  } finally {
    // Explicitly clear credentials from memory
    login = "";
    senha = "";
  }
});

// ── Helpers ──

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function extractJSessionId(headers: Headers): string | null {
  const cookies = headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    const match = cookie.match(/JSESSIONID=([^;]+)/);
    if (match) return match[1];
  }
  // Fallback: try get() which joins multiple Set-Cookie
  const raw = headers.get("set-cookie") ?? "";
  const match = raw.match(/JSESSIONID=([^;]+)/);
  return match ? match[1] : null;
}

async function fetchWithSession(url: string, sessionId: string) {
  return fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
      Cookie: `JSESSIONID=${sessionId}`,
    },
  });
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<\/th>/gi, "\t")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractDisciplinasFromHtml(html: string): Array<Record<string, unknown>> {
  const disciplinas: Array<Record<string, unknown>> = [];
  // Match table rows with discipline data: code, name, grade, status, etc.
  // SIGAA typically uses <td> elements in academic record tables
  const rowRegex =
    /<tr[^>]*class="[^"]*(?:linha_par|linha_impar|linhaPar|linhaImpar)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const cells = extractCells(match[1]);
    if (cells.length >= 4) {
      // Typical SIGAA columns: Codigo, Disciplina, Nota, Situacao, ...
      const situacao = cells.find(
        (c) =>
          c.includes("APROVADO") ||
          c.includes("REPROVADO") ||
          c.includes("TRANCADO") ||
          c.includes("MATRICULADO"),
      );
      const codigo = cells[0]?.trim();
      const nome = cells[1]?.trim();

      if (codigo && nome && situacao) {
        const notaStr = cells.find((c) => /^\d+([.,]\d+)?$/.test(c.trim()));
        disciplinas.push({
          codigo,
          nome,
          situacao: situacao.trim(),
          nota: notaStr ? parseFloat(notaStr.replace(",", ".")) : null,
        });
      }
    }
  }

  return disciplinas;
}

function extractCells(rowHtml: string): string[] {
  const cells: string[] = [];
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  while ((match = cellRegex.exec(rowHtml)) !== null) {
    cells.push(match[1].replace(/<[^>]+>/g, "").trim());
  }
  return cells;
}

function extractAlunoFromHtml(
  html: string,
  ra: string,
): Record<string, string | null> {
  // Try to find student name in common SIGAA patterns
  const nomeMatch =
    html.match(/Aluno[:\s]*<[^>]*>([^<]+)/) ??
    html.match(/Nome[:\s]*<[^>]*>([^<]+)/) ??
    html.match(/class="nome[^"]*"[^>]*>([^<]+)/);

  const cursoMatch =
    html.match(/Curso[:\s]*<[^>]*>([^<]+)/) ??
    html.match(/curso[^"]*"[^>]*>([^<]+)/i);

  return {
    nome: nomeMatch ? nomeMatch[1].trim() : null,
    ra: ra.replace(/\D/g, ""),
    curso_ingresso: cursoMatch ? cursoMatch[1].trim() : null,
  };
}
