import { formatPercent } from "../utils/dashboard-data.js";

const axisColors = {
  computacao: "from-emerald-400 to-teal-400",
  matematica: "from-blue-400 to-indigo-400",
  humanidades: "from-amber-400 to-yellow-400",
  livres: "from-slate-300 to-slate-500",
};

export function ProgressoEixos({ axes }) {
  return (
    <aside className="rounded-[2rem] border border-emerald-200/80 bg-white/90 p-5 shadow-[0_22px_80px_rgba(16,185,129,0.10)] backdrop-blur-xl lg:sticky lg:top-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600">Progresso por eixos</p>
      <h2 className="mt-1 font-display text-3xl font-black text-slate-950">Mapa de forca curricular</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Barras calculadas a partir dos creditos T+P aprovados em relacao aos creditos tentados em cada eixo do historico mockado.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {axes.map((axis) => (
          <article key={axis.codigo} className="rounded-3xl border border-emerald-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">{axis.nome}</h3>
                <p className="text-xs text-slate-400">
                  {axis.approvedCredits}/{axis.attemptedCredits} creditos
                </p>
              </div>
              <strong className="font-display text-xl font-black text-emerald-600">{formatPercent(axis.percent)}</strong>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-emerald-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${axisColors[axis.codigo] ?? "from-emerald-300 to-teal-300"}`}
                style={{ width: `${Math.round(axis.percent * 100)}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
