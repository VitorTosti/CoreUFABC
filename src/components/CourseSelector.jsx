const ACCENT = {
  emerald: {
    active:
      "border-emerald-500 bg-emerald-500 text-white shadow-[0_16px_46px_rgba(16,185,129,0.32)]",
    inactive:
      "border-emerald-200 bg-white/82 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.08)] hover:border-emerald-400 hover:bg-emerald-50",
    eyebrow: "text-emerald-500",
    eyebrowActive: "text-white/70",
    badge: "bg-emerald-50 text-emerald-600",
    badgeActive: "bg-white/20 text-white",
    dot: "bg-emerald-400",
  },
  blue: {
    active:
      "border-blue-500 bg-blue-500 text-white shadow-[0_16px_46px_rgba(59,130,246,0.32)]",
    inactive:
      "border-blue-200 bg-white/82 text-slate-950 shadow-[0_10px_30px_rgba(59,130,246,0.08)] hover:border-blue-400 hover:bg-blue-50",
    eyebrow: "text-blue-500",
    eyebrowActive: "text-white/70",
    badge: "bg-blue-50 text-blue-600",
    badgeActive: "bg-white/20 text-white",
    dot: "bg-blue-400",
  },
  teal: {
    active:
      "border-teal-500 bg-teal-500 text-white shadow-[0_16px_46px_rgba(20,184,166,0.32)]",
    inactive:
      "border-teal-200 bg-white/82 text-slate-950 shadow-[0_10px_30px_rgba(20,184,166,0.08)] hover:border-teal-400 hover:bg-teal-50",
    eyebrow: "text-teal-500",
    eyebrowActive: "text-white/70",
    badge: "bg-teal-50 text-teal-600",
    badgeActive: "bg-white/20 text-white",
    dot: "bg-teal-400",
  },
  cyan: {
    active:
      "border-cyan-500 bg-cyan-500 text-white shadow-[0_16px_46px_rgba(6,182,212,0.32)]",
    inactive:
      "border-cyan-200 bg-white/82 text-slate-950 shadow-[0_10px_30px_rgba(6,182,212,0.08)] hover:border-cyan-400 hover:bg-cyan-50",
    eyebrow: "text-cyan-500",
    eyebrowActive: "text-white/70",
    badge: "bg-cyan-50 text-cyan-600",
    badgeActive: "bg-white/20 text-white",
    dot: "bg-cyan-400",
  },
};

function totalCredits(plan) {
  const c = plan.requiredCredits ?? {};
  return (c.obrigatorias ?? 0) + (c.limitadas ?? 0) + (c.livres ?? 0);
}

export function CourseSelector({ plans, selectedKey, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Selecionar curso">
      {plans.map((plan) => {
        const active = plan.key === selectedKey;
        const a = ACCENT[plan.accent] ?? ACCENT.emerald;
        const total = totalCredits(plan);

        return (
          <button
            key={plan.key}
            type="button"
            onClick={() => onSelect(plan.key)}
            aria-pressed={active}
            className={`group relative min-h-[4.5rem] rounded-2xl border px-3 py-3 text-left transition-all duration-200 active:scale-[0.97] ${
              active ? a.active : a.inactive
            }`}
          >
            {active && (
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white/60" />
            )}

            <span
              className={`block text-[0.6rem] font-black uppercase tracking-[0.2em] ${
                active ? a.eyebrowActive : a.eyebrow
              }`}
            >
              {plan.key}
            </span>

            <span className="mt-0.5 block font-display text-xl font-black leading-none">
              {plan.label}
            </span>

            <span
              className={`mt-2 inline-flex items-center rounded-lg px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.1em] transition ${
                active ? a.badgeActive : a.badge
              }`}
            >
              {total} cr
            </span>
          </button>
        );
      })}
    </div>
  );
}
