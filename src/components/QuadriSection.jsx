import { useState } from "react";
import { CourseCard } from "./CourseCard.jsx";

export function QuadriSection({ quadrimester, sectionRef }) {
  const [open, setOpen] = useState(true);

  return (
    /* ref externo para scroll-to via QuadNavBar */
    <section
      ref={sectionRef}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
    >
      {/* ── Cabeçalho clicável ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
      >
        <div className="flex items-center gap-3">
          {/* Dot decorativo */}
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
          <div className="text-left">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-emerald-600">
              Quadrimestre
            </p>
            <h2 className="font-display text-xl font-black leading-tight text-slate-950">
              {quadrimester.label}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Aprovadas / Total */}
          <div className="text-right">
            <div className="flex items-baseline gap-0.5">
              <strong className="font-display text-xl font-black leading-none text-emerald-600">
                {quadrimester.approved}
              </strong>
              <span className="text-[0.65rem] font-bold text-slate-300">/</span>
              <span className="text-sm font-black text-slate-400">{quadrimester.total}</span>
            </div>
            <p className="text-[0.52rem] font-black uppercase tracking-wide text-slate-400">
              aprovadas
            </p>
          </div>

          {/* Chevron */}
          <svg
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* ── Lista de disciplinas ── */}
      {open && (
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {quadrimester.courses.map((course) => (
            <CourseCard
              key={`${course.codigo}-${course.ano_quadrimestre}-${course.conceito}`}
              course={course}
            />
          ))}
        </div>
      )}
    </section>
  );
}
