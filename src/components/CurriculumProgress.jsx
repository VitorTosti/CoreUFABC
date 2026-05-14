import { useState } from "react";

const SECTION_STYLE = {
  required: {
    label: "Obrigatórias",
    shortLabel: "Obrig.",
    description: "Você precisa ser aprovado em todas para concluir o curso. Compõem o núcleo central da formação.",
    border: "border-rose-200",
    headerBg: "bg-rose-50",
    eyebrow: "text-rose-500",
    bar: "from-rose-500 to-pink-400",
    barBg: "bg-rose-100",
    badgeBg: "bg-rose-100 text-rose-700",
    checkActive: "border-rose-500 bg-rose-500 text-white",
    checkIdle: "border-slate-200 bg-slate-50 text-slate-400 hover:border-rose-300 hover:bg-rose-50",
    emptyBorder: "border-rose-200",
  },
  limited: {
    label: "Optativas Limitadas",
    shortLabel: "Limit.",
    description: "Escolha livremente dentro do conjunto fixado pelo PPC até completar os créditos exigidos.",
    border: "border-violet-200",
    headerBg: "bg-violet-50",
    eyebrow: "text-violet-500",
    bar: "from-violet-500 to-purple-400",
    barBg: "bg-violet-100",
    badgeBg: "bg-violet-100 text-violet-700",
    checkActive: "border-violet-500 bg-violet-500 text-white",
    checkIdle: "border-slate-200 bg-slate-50 text-slate-400 hover:border-violet-300 hover:bg-violet-50",
    emptyBorder: "border-violet-200",
  },
  free: {
    label: "Disciplinas Livres",
    shortLabel: "Livres",
    description: "Qualquer disciplina da UFABC ou reconhecida pela Prograd. Composição totalmente aberta.",
    border: "border-sky-200",
    headerBg: "bg-sky-50",
    eyebrow: "text-sky-500",
    bar: "from-sky-500 to-cyan-400",
    barBg: "bg-sky-100",
    badgeBg: "bg-sky-100 text-sky-700",
    checkActive: "border-sky-500 bg-sky-500 text-white",
    checkIdle: "border-slate-200 bg-slate-50 text-slate-400 hover:border-sky-300 hover:bg-sky-50",
    emptyBorder: "border-sky-200",
  },
};

const ACCENT_HEADER = {
  emerald: { bar: "from-emerald-500 to-teal-400", bg: "bg-emerald-100", value: "text-emerald-600" },
  blue:    { bar: "from-blue-500 to-indigo-400",  bg: "bg-blue-100",    value: "text-blue-600" },
  teal:    { bar: "from-teal-500 to-cyan-400",    bg: "bg-teal-100",    value: "text-teal-600" },
  cyan:    { bar: "from-cyan-500 to-sky-400",     bg: "bg-cyan-100",    value: "text-cyan-600" },
};

const Q_BADGE_COLORS = [
  "", // index 0 unused
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-100 text-slate-600",
];

export function CurriculumProgress({ progress, onToggleRequirement }) {
  const itemPercent = progress.total === 0 ? 0 : progress.completed / progress.total;
  const accentKey = progress.plan.accent ?? "emerald";
  const accent = ACCENT_HEADER[accentKey] ?? ACCENT_HEADER.emerald;

  const totalRequired =
    (progress.plan.requiredCredits?.obrigatorias ?? 0) +
    (progress.plan.requiredCredits?.limitadas ?? 0) +
    (progress.plan.requiredCredits?.livres ?? 0);

  const totalEarned = progress.sections.reduce((sum, s) => sum + s.completedCredits, 0);
  const creditPercent = totalRequired === 0 ? 0 : Math.min(totalEarned / totalRequired, 1);

  return (
    <div className="mt-4 flex flex-col gap-3">
      {/* ── Cartão de resumo geral ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_50px_rgba(0,0,0,0.07)]">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
              Progresso da matriz
            </p>
            <h3 className="mt-0.5 truncate font-display text-2xl font-black text-slate-950">
              {progress.plan.label}
            </h3>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
              {progress.plan.name}
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-right">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-slate-400">
              Disciplinas
            </p>
            <strong className={`block font-display text-lg font-black ${accent.value}`}>
              {progress.completed}
              <span className="text-sm font-bold text-slate-400">/{progress.total}</span>
            </strong>
          </div>
        </div>

        {/* Barra de itens */}
        <div className="px-4">
          <div className={`h-2.5 overflow-hidden rounded-full ${accent.bg} ring-1 ring-white/60`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${accent.bar} transition-all duration-500`}
              style={{ width: `${Math.round(itemPercent * 100)}%` }}
            />
          </div>
        </div>

        {/* Créditos earned */}
        <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-2">
          <p className="text-xs font-semibold text-slate-500">
            <span className={`font-black ${accent.value}`}>{totalEarned}</span>
            {" "}cr concluídos de{" "}
            <span className="font-bold text-slate-700">{totalRequired}</span> exigidos
          </p>
          <span className="text-xs font-black text-slate-400">
            {Math.round(creditPercent * 100)}%
          </span>
        </div>

        {/* Legenda de quadrimestres */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2">
          <svg className="h-3 w-3 shrink-0 text-slate-400" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6 4v2.5L7.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <p className="text-[0.6rem] font-semibold text-slate-400">
            <span className="font-black text-slate-500">Q1–Q5</span>
            {" "}= quadrimestre ideal no fluxo curricular do PPC
          </p>
        </div>
      </div>

      {/* ── Seções ── */}
      {progress.sections.map((section) => (
        <RequirementSection
          key={section.key}
          section={section}
          requiredCredits={
            progress.plan.requiredCredits?.[
              section.key === "required" ? "obrigatorias" :
              section.key === "limited"  ? "limitadas" : "livres"
            ] ?? 0
          }
          onToggleRequirement={onToggleRequirement}
        />
      ))}
    </div>
  );
}

function RequirementSection({ section, requiredCredits, onToggleRequirement }) {
  const [open, setOpen] = useState(true);
  const style = SECTION_STYLE[section.key] ?? SECTION_STYLE.required;

  const useCredits = section.key !== "required";
  const numerator   = useCredits ? section.completedCredits : section.completed;
  const denominator = useCredits ? requiredCredits          : section.total;
  const percent = denominator === 0 ? 0 : Math.min(numerator / denominator, 1);

  return (
    <section className={`overflow-hidden rounded-2xl border ${style.border} bg-white shadow-[0_10px_40px_rgba(0,0,0,0.05)]`}>
      {/* Cabeçalho clicável */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-start justify-between gap-3 px-4 py-3 ${style.headerBg} transition`}
      >
        <div className="flex flex-col items-start gap-0.5">
          <p className={`text-[0.6rem] font-black uppercase tracking-[0.18em] ${style.eyebrow}`}>
            {style.shortLabel}
          </p>
          <h4 className="text-left text-sm font-black text-slate-950">{style.label}</h4>
          <p className="text-left text-[0.65rem] font-medium leading-tight text-slate-500">
            {style.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <span className={`rounded-lg px-2 py-1 text-xs font-black ${style.badgeBg}`}>
            {useCredits
              ? `${section.completedCredits} / ${requiredCredits} cr`
              : `${section.completed} / ${section.total}`}
          </span>
          <ChevronIcon open={open} />
        </div>
      </button>

      {/* Barra de progresso */}
      <div className={`h-1.5 ${style.barBg}`}>
        <div
          className={`h-full bg-gradient-to-r ${style.bar} transition-all duration-500`}
          style={{ width: `${Math.round(percent * 100)}%` }}
        />
      </div>

      {/* Lista de disciplinas */}
      {open && (
        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto p-3">
          {section.items.length === 0 ? (
            <EmptyState border={style.emptyBorder} label={style.label} sectionKey={section.key} />
          ) : (
            section.items.map((item) => (
              <RequirementItem
                key={item.codigo}
                item={item}
                style={style}
                onToggleRequirement={onToggleRequirement}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

const EIXO_COLORS = {
  computacao:       "bg-emerald-100 text-emerald-700",
  matematica:       "bg-blue-100 text-blue-700",
  humanidades:      "bg-amber-100 text-amber-700",
  "ciencias-naturais": "bg-teal-100 text-teal-700",
};

const EIXO_SHORT = {
  computacao:          "Comp.",
  matematica:          "Mat.",
  humanidades:         "Hum.",
  "ciencias-naturais": "C.Nat.",
};

function RequirementItem({ item, style, onToggleRequirement }) {
  const qColor = Q_BADGE_COLORS[item.quadrimestre_ideal] ?? Q_BADGE_COLORS[6];
  const blocked = !item.completed && !item.preReqsMet;
  const eixo = item.eixos?.[0];

  return (
    <article
      className={`rounded-xl border bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all ${
        blocked ? "border-amber-200 bg-amber-50/40" : "border-slate-100"
      }`}
    >
      <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-2">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggleRequirement?.(item)}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-[0.6rem] font-black transition-all duration-150 ${
            item.completed ? style.checkActive : style.checkIdle
          }`}
          aria-label={item.completed ? "Concluída" : "Marcar como concluída"}
        >
          {item.completed ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>

        {/* Nome + metadados */}
        <div className="min-w-0">
          <p className={`truncate text-sm font-bold ${item.completed ? "text-slate-400 line-through" : "text-slate-950"}`}>
            {item.nome}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="text-[0.62rem] font-semibold text-slate-400">{item.codigo}</span>

            {item.quadrimestre_ideal != null && (
              <span className={`rounded-md px-1.5 py-px text-[0.55rem] font-black tracking-wide ${qColor}`}>
                Q{item.quadrimestre_ideal}
              </span>
            )}

            {eixo && (
              <span className={`rounded-md px-1.5 py-px text-[0.55rem] font-bold ${EIXO_COLORS[eixo.codigo] ?? "bg-slate-100 text-slate-600"}`}>
                {EIXO_SHORT[eixo.codigo] ?? eixo.nome}
              </span>
            )}
          </div>
        </div>

        {/* Créditos */}
        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
          {item.creditos}cr
        </span>
      </div>

      {/* Aviso de pré-requisito bloqueado */}
      {blocked && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-100 px-2 py-1.5">
          <svg className="mt-px h-3 w-3 shrink-0 text-amber-600" viewBox="0 0 12 12" fill="none">
            <path d="M5 4.5a1 1 0 1 1 2 0v2a1 1 0 1 1-2 0v-2Zm1 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" fill="currentColor"/>
            <circle cx="6" cy="6" r="5" stroke="#D97706" strokeWidth="1.2"/>
          </svg>
          <p className="text-[0.6rem] font-semibold leading-snug text-amber-700">
            Pré-requisito{item.pre_requisitos?.length > 1 ? "s" : ""}:{" "}
            <span className="font-black">{item.pre_requisitos?.join(", ")}</span>
          </p>
        </div>
      )}
    </article>
  );
}

function EmptyState({ border, label, sectionKey }) {
  const hints = {
    limited: "O pool de optativas limitadas é definido por grupos no PPC vigente. Consulte a Prograd para a lista completa.",
    free: "Você pode compor com qualquer disciplina da UFABC ou de outra instituição reconhecida pela Prograd.",
  };

  return (
    <div className={`rounded-xl border border-dashed ${border} px-3 py-4`}>
      <p className="text-center text-sm font-semibold text-slate-400">
        Nenhuma disciplina de {label.toLowerCase()} cadastrada na matriz.
      </p>
      {hints[sectionKey] && (
        <p className="mt-1.5 text-center text-[0.65rem] font-medium leading-snug text-slate-400">
          {hints[sectionKey]}
        </p>
      )}
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
