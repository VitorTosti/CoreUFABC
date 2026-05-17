const EIXO_STYLE = {
  computacao:          { label: "Computação",   grad: "from-emerald-400 to-teal-500",   dot: "bg-emerald-500",  pct: "text-emerald-600" },
  matematica:          { label: "Matemática",   grad: "from-blue-400 to-indigo-500",    dot: "bg-blue-500",     pct: "text-blue-600" },
  humanidades:         { label: "Humanidades",  grad: "from-amber-400 to-orange-400",   dot: "bg-amber-500",    pct: "text-amber-600" },
  "ciencias-naturais": { label: "C. Naturais",  grad: "from-teal-400 to-cyan-500",      dot: "bg-teal-500",     pct: "text-teal-600" },
  livres:              { label: "Livres",        grad: "from-slate-300 to-slate-400",    dot: "bg-slate-400",    pct: "text-slate-500" },
};

export function ProgressoEixos({ axes }) {
  if (!axes || axes.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      {/* ── Cabeçalho ── */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-emerald-600">
          Progresso por eixos
        </p>
        <h2 className="mt-0.5 font-display text-xl font-black leading-tight text-slate-950">
          Mapa de força curricular
        </h2>
      </div>

      {/* ── Eixos ── */}
      <div className="flex flex-col gap-3 p-4">
        {axes.map((axis) => {
          const s = EIXO_STYLE[axis.codigo] ?? {
            label: axis.nome,
            grad: "from-slate-300 to-slate-400",
            dot: "bg-slate-400",
            pct: "text-slate-500",
          };
          const pct = Math.round(axis.percent * 100);

          return (
            <div key={axis.codigo}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span className="text-[0.78rem] font-bold text-slate-700">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.62rem] font-semibold text-slate-400">
                    {Math.round(axis.approvedCredits)}/{Math.round(axis.attemptedCredits)}cr
                  </span>
                  <span className={`w-8 text-right text-[0.68rem] font-black ${s.pct}`}>{pct}%</span>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${s.grad} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
