import { useState } from "react";
import { fetchHistoricoByRa } from "../services/supabase.js";

/**
 * Shown when the user's UFABC email doesn't contain a numeric RA
 * (e.g. v.tosti@aluno.ufabc.edu.br). Asks for the RA manually,
 * then looks up Supabase.
 */
export function RaLinkScreen({ email, onRaConfirmed }) {
  const [ra, setRa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalized = ra.replace(/\D/g, "");

    if (!/^\d{8,14}$/.test(normalized)) {
      setError("RA inválido. Digite apenas os números (8 a 14 dígitos).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dados = await fetchHistoricoByRa(normalized);
      // Passa o RA e os dados (podem ser null se não encontrado — app trata)
      onRaConfirmed(normalized, dados);
    } catch {
      // Mesmo com erro no Supabase, continua com o RA para importar
      onRaConfirmed(normalized, null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Fundo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.25] [background-image:linear-gradient(rgba(16,185,129,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,.10)_1px,transparent_1px)] [background-size:30px_30px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[30rem] flex-col justify-center px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-xs font-black text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)]">CU</span>
          <span className="font-display text-lg font-black tracking-tight text-slate-950">
            Core<span className="text-emerald-500">UFABC</span>
          </span>
        </div>

        {/* Email detectado */}
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-emerald-600">Logado como</p>
          <p className="mt-0.5 text-sm font-bold text-slate-800">{email}</p>
        </div>

        <h1 className="font-display text-2xl font-black text-slate-950">Qual é o seu RA?</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Seu email não contém o RA automaticamente. Informe para carregar seu histórico.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5" htmlFor="ra-input">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">RA UFABC</span>
            <input
              id="ra-input"
              type="text"
              inputMode="numeric"
              value={ra}
              onChange={(e) => setRa(e.target.value)}
              placeholder="Ex: 11202600000"
              autoComplete="off"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/15"
            />
          </label>

          {error && (
            <p className="text-xs font-bold text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || ra.trim().length < 8}
            className="min-h-12 w-full rounded-2xl bg-emerald-500 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_36px_rgba(16,185,129,0.30)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {loading ? "Buscando..." : "Continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
