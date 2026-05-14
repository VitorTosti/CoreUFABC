import { CourseCard } from "./CourseCard.jsx";

export function QuadriSection({ quadrimester }) {
  return (
    <section className="rounded-[1.75rem] border border-emerald-200/80 bg-white/90 p-4 shadow-[0_18px_60px_rgba(16,185,129,0.09)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Quadrimestre</p>
          <h2 className="font-display text-2xl font-black text-slate-950">{quadrimester.label}</h2>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
          <p className="font-display text-xl font-black text-emerald-600">
            {quadrimester.approved}/{quadrimester.total}
          </p>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">aprovadas</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {quadrimester.courses.map((course) => (
          <CourseCard key={`${course.codigo}-${course.ano_quadrimestre}-${course.conceito}`} course={course} />
        ))}
      </div>
    </section>
  );
}
