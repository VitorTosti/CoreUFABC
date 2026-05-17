import { getTpeCredits, isApproved } from "../services/academic-metrics.js";

/* ── Conceito → estilo visual ── */
const CONCEPT_STYLE = {
  A:  { bg: "bg-emerald-500", text: "text-white",     border: "border-emerald-500" },
  B:  { bg: "bg-blue-100",    text: "text-blue-700",  border: "border-blue-300" },
  C:  { bg: "bg-amber-100",   text: "text-amber-700", border: "border-amber-300" },
  D:  { bg: "bg-orange-100",  text: "text-orange-700",border: "border-orange-300" },
  F:  { bg: "bg-rose-100",    text: "text-rose-700",  border: "border-rose-300" },
  O:  { bg: "bg-rose-100",    text: "text-rose-700",  border: "border-rose-300" },
  TR: { bg: "bg-slate-100",   text: "text-slate-500", border: "border-slate-200" },
};

/* ── Categoria sigla → nome + cor ── */
const CATEGORIA_META = {
  O:   { label: "Obrigatória", bg: "bg-rose-100",    text: "text-rose-700" },
  L:   { label: "Limitada",    bg: "bg-violet-100",  text: "text-violet-700" },
  LE:  { label: "Livre",       bg: "bg-sky-100",     text: "text-sky-700" },
  EL:  { label: "Livre",       bg: "bg-sky-100",     text: "text-sky-700" },
  LI:  { label: "Livre",       bg: "bg-sky-100",     text: "text-sky-700" },
  LA:  { label: "Optativa",    bg: "bg-amber-100",   text: "text-amber-700" },
  EX:  { label: "Extensão",    bg: "bg-teal-100",    text: "text-teal-700" },
};

/* ── Situação → label amigável ── */
const SITUACAO_META = {
  APROVADO:     { label: "Aprovada",   bg: "bg-emerald-100", text: "text-emerald-700" },
  CONVALIDADO:  { label: "Convalidada",bg: "bg-emerald-100", text: "text-emerald-700" },
  REPROVADO:    { label: "Reprovada",  bg: "bg-rose-100",    text: "text-rose-700" },
  TRANCADO:     { label: "Trancada",   bg: "bg-slate-100",   text: "text-slate-500" },
  CANCELADO:    { label: "Cancelada",  bg: "bg-slate-100",   text: "text-slate-500" },
  MATRICULADO:  { label: "Em curso",   bg: "bg-blue-100",    text: "text-blue-700" },
};

export function CourseCard({ course }) {
  const approved = isApproved(course);
  const credits = getTpeCredits(course);

  const conceptKey = course.conceito ?? "TR";
  const cs = CONCEPT_STYLE[conceptKey] ?? CONCEPT_STYLE.TR;

  const categoria = CATEGORIA_META[course.categoria_sigla?.toUpperCase()] ?? {
    label: course.categoria_sigla ?? "—",
    bg: "bg-slate-100",
    text: "text-slate-500",
  };

  const situacaoKey = course.situacao?.toUpperCase() ?? "";
  const situacao = SITUACAO_META[situacaoKey] ?? {
    label: course.situacao ?? "—",
    bg: "bg-slate-100",
    text: "text-slate-500",
  };

  return (
    <article
      className={`rounded-2xl border p-3.5 transition-colors duration-150 ${
        approved
          ? "border-emerald-100 bg-white hover:border-emerald-200"
          : situacaoKey === "TRANCADO" || situacaoKey === "CANCELADO"
          ? "border-slate-100 bg-slate-50/60"
          : "border-rose-100 bg-rose-50/40"
      }`}
    >
      {/* ── Cabeçalho: código + conceito ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.6rem] font-bold uppercase text-slate-400">
            {course.codigo}
          </p>
          <h3 className="mt-0.5 text-[0.85rem] font-black leading-snug text-slate-950">
            {course.nome}
          </h3>
        </div>

        {/* Badge de conceito */}
        <span
          className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border font-display text-base font-black ${cs.bg} ${cs.text} ${cs.border}`}
        >
          {course.conceito}
        </span>
      </div>

      {/* ── Metadados ── */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {/* Créditos */}
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[0.62rem] font-black text-slate-600">
          {credits}cr
        </span>

        {/* Categoria */}
        <span className={`rounded-lg px-2 py-0.5 text-[0.62rem] font-bold ${categoria.bg} ${categoria.text}`}>
          {categoria.label}
        </span>

        {/* Situação */}
        <span className={`rounded-lg px-2 py-0.5 text-[0.62rem] font-bold ${situacao.bg} ${situacao.text}`}>
          {situacao.label}
        </span>
      </div>
    </article>
  );
}
