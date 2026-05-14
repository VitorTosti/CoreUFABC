import { getTpeCredits, isApproved } from "../services/academic-metrics.js";

const conceptStyles = {
  A: "border-emerald-500 bg-emerald-500 text-white",
  B: "border-blue-400 bg-blue-100 text-blue-700",
  C: "border-amber-400 bg-amber-100 text-amber-700",
  D: "border-orange-400 bg-orange-100 text-orange-700",
  F: "border-rose-500 bg-rose-100 text-rose-700",
  O: "border-rose-500 bg-rose-100 text-rose-700",
  TR: "border-slate-300 bg-slate-100 text-slate-600",
};

export function CourseCard({ course }) {
  const approved = isApproved(course);
  const credits = getTpeCredits(course);
  const statusStyle = approved
    ? "border-emerald-200 bg-white"
    : "border-rose-200 bg-rose-50";

  return (
    <article className={`group rounded-3xl border ${statusStyle} p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-black uppercase tracking-[0.18em] text-slate-400">{course.codigo}</p>
          <h3 className="mt-1 text-base font-bold leading-snug text-slate-950">{course.nome}</h3>
        </div>
        <span className={`shrink-0 rounded-2xl border px-3 py-1 font-display text-lg font-black ${conceptStyles[course.conceito]}`}>
          {course.conceito}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">{credits} creditos</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Categoria {course.categoria_sigla}</span>
        <span className={approved ? "rounded-full bg-emerald-100 px-3 py-1 text-emerald-700" : "rounded-full bg-rose-100 px-3 py-1 text-rose-600"}>
          {approved ? "Aprovada" : course.situacao}
        </span>
      </div>
    </article>
  );
}
