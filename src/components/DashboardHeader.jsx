import { formatDecimal, formatPercent } from "../utils/dashboard-data.js";

const metricCards = [
  { key: "cr", label: "CR", title: "Rendimento", tone: "from-blue-500/28 to-cyan-400/10" },
  { key: "ca", label: "CA", title: "Afinidade CC", tone: "from-emerald-500/28 to-lime-400/10" },
  { key: "cp", label: "CP", title: "Progressao BC&T", tone: "from-teal-500/28 to-blue-400/10", percent: true },
];

export function DashboardHeader({ student, metrics, approvedCredits, totalCredits }) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/72 p-5 shadow-cobalt backdrop-blur-xl sm:p-7 lg:p-8">
      <div className="absolute right-[-3rem] top-[-4rem] h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="absolute bottom-[-5rem] left-[-4rem] h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
            UFA! cockpit academico
          </div>
          <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
            {student.nome}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Uma leitura rapida do seu historico UFABC: quadrimestres, conceitos, progresso e sinais de desempenho para a proxima decisao de matricula.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">RA {student.ra}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{student.curso_ingresso}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {approvedCredits}/{totalCredits} creditos T+P aprovados
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[30rem]">
          {metricCards.map((card) => (
            <article
              key={card.key}
              className={`rounded-3xl border border-white/10 bg-gradient-to-br ${card.tone} p-3 shadow-glow sm:p-4`}
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-slate-300">{card.label}</p>
              <strong className="mt-2 block font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
                {card.percent ? formatPercent(metrics[card.key]) : formatDecimal(metrics[card.key])}
              </strong>
              <span className="mt-1 block text-[0.7rem] font-medium text-slate-400 sm:text-xs">{card.title}</span>
            </article>
          ))}
        </div>
      </div>
    </header>
  );
}
