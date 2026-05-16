import { useMemo, useState } from "react";

import { ACADEMIC_APP_PAGES } from "../utils/app-pages.js";
import { fetchAcademicRecordByRa } from "../services/academic-record-api.js";
import { buildCurriculumProgress, COURSE_PLANS, createCompletedCourseTokens, normalizeCurriculumToken } from "../utils/curriculum-progress.js";
import { formatDecimal, formatPercent } from "../utils/dashboard-data.js";
import { CourseSelector } from "./CourseSelector.jsx";
import { CurriculumProgress } from "./CurriculumProgress.jsx";
import { DeveloperDiagnosticsPanel } from "./DeveloperDiagnosticsPanel.jsx";
import { GradeSimulator } from "./GradeSimulator.jsx";
import { GradePlannerPage } from "./GradePlanner/index.jsx";
import { ProgressoEixos } from "./ProgressoEixos.jsx";
import { QuadriSection } from "./QuadriSection.jsx";

export function AcademicMobileApp({
  dashboard,
  academicHistory,
  fallbackAcademicHistories = [],
  onAcademicHistoryLoaded,
}) {
  const [activePage, setActivePage] = useState("home");
  const [selectedPlanKey, setSelectedPlanKey] = useState("BCT");
  const [manualCompletedTokens, setManualCompletedTokens] = useState(() => new Set());
  const [raStatus, setRaStatus] = useState({ type: "idle", message: "" });
  const [isLoadingRa, setIsLoadingRa] = useState(false);
  const courses = academicHistory.disciplinas;
  const approvedCodes = useMemo(
    () => createCompletedCourseTokens(courses, manualCompletedTokens),
    [courses, manualCompletedTokens],
  );
  const progress = useMemo(
    () => buildCurriculumProgress(COURSE_PLANS[selectedPlanKey], approvedCodes),
    [approvedCodes, selectedPlanKey],
  );
  const plans = useMemo(() => Object.values(COURSE_PLANS), []);
  const handleToggleRequirement = (item) => {
    setManualCompletedTokens((currentTokens) => {
      const nextTokens = new Set(currentTokens);
      const tokens = [item.codigo, normalizeCurriculumToken(item.codigo), normalizeCurriculumToken(item.nome)];
      const isManuallyCompleted = tokens.some((token) => nextTokens.has(token));

      for (const token of tokens) {
        if (isManuallyCompleted) {
          nextTokens.delete(token);
        } else {
          nextTokens.add(token);
        }
      }

      return nextTokens;
    });
  };
  const handleConnectRa = async (ra) => {
    setIsLoadingRa(true);
    setRaStatus({ type: "idle", message: "" });

    try {
      const loadedHistory = await fetchAcademicRecordByRa(ra, {
        baseUrl: import.meta.env.VITE_ACADEMIC_RECORD_API_URL,
        fallbackRecords: fallbackAcademicHistories,
      });

      onAcademicHistoryLoaded?.(loadedHistory);
      setManualCompletedTokens(new Set());
      setRaStatus({
        type: loadedHistory._demoMode ? "demo" : "success",
        message: loadedHistory._demoMode
          ? "Modo demonstracao: exibindo historico simulado. Conecte a API para dados reais."
          : "Historico academico carregado com sucesso.",
      });
    } catch (error) {
      setRaStatus({ type: "error", message: error.message });
    } finally {
      setIsLoadingRa(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4fbf7] text-slate-950">
      <div className="fixed inset-0 bg-[linear-gradient(135deg,#f0fdf4_0%,#f4fbf7_40%,#ecfdf5_100%)]" />
      <div className="fixed inset-0 opacity-[0.30] [background-image:linear-gradient(rgba(16,185,129,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,.09)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="fixed left-1/2 top-[-9rem] h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="fixed bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-teal-200/50 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[30rem] flex-col px-4 pb-24 pt-4">
        <AppTopBar
          student={dashboard.student}
          isLoadingRa={isLoadingRa}
          raStatus={raStatus}
          onConnectRa={handleConnectRa}
        />
        <DeveloperDiagnosticsPanel />

        {activePage === "home" && (
          <HomePage
            dashboard={dashboard}
            progress={progress}
            onOpenPlanning={() => setActivePage("planning")}
            onOpenPerformance={() => setActivePage("performance")}
            onOpenHistory={() => setActivePage("history")}
          />
        )}
        {activePage === "planning" && (
          <PlanningPage
            plans={plans}
            progress={progress}
            selectedPlanKey={selectedPlanKey}
            onSelectPlan={setSelectedPlanKey}
            onToggleRequirement={handleToggleRequirement}
          />
        )}
        {activePage === "performance" && (
          <PerformancePage dashboard={dashboard} courses={courses} />
        )}
        {activePage === "history" && <HistoryPage dashboard={dashboard} />}
        {activePage === "grade" && <GradePlannerPage />}
      </div>

      <BottomNavigation activePage={activePage} onChange={setActivePage} />
    </main>
  );
}

function AppTopBar({ student, isLoadingRa, raStatus, onConnectRa }) {
  const [raInput, setRaInput] = useState(student.ra);
  const [showRaForm, setShowRaForm] = useState(false);
  const initials = student.nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const statusTone =
    raStatus.type === "error" ? "text-rose-600" :
    raStatus.type === "demo"  ? "text-amber-600" :
    "text-emerald-600";

  return (
    <header className="mb-5">
      {/* ── Barra de marca ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-emerald-500 shadow-[0_8px_22px_rgba(16,185,129,0.42)]">
            <span className="font-display text-base font-black text-white">C</span>
          </div>
          <div className="leading-tight">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.26em] text-emerald-500">v2.0 · Beta</p>
            <p className="text-[0.95rem] font-black text-slate-950">
              Core<span className="text-emerald-500">UFABC</span>
            </p>
          </div>
        </div>

        {/* Avatar + RA trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRaForm((v) => !v)}
            className="rounded-xl border border-emerald-200 bg-white/90 px-2.5 py-1.5 text-right shadow-[0_4px_14px_rgba(16,185,129,0.10)] transition hover:border-emerald-400"
          >
            <p className="text-[0.55rem] font-bold uppercase tracking-[0.16em] text-emerald-500">RA</p>
            <p className="text-[0.72rem] font-black text-slate-950">{student.ra.slice(-6)}</p>
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_8px_22px_rgba(16,185,129,0.35)]">
            <span className="text-sm font-black text-white">{initials}</span>
          </div>
        </div>
      </div>

      {/* ── Formulário de RA (expansível) ── */}
      {showRaForm && (
        <form
          className="mt-3 grid grid-cols-[1fr_auto] gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onConnectRa(raInput);
          }}
        >
          <label className="sr-only" htmlFor="ra-connect">RA para conectar</label>
          <input
            id="ra-connect"
            value={raInput}
            inputMode="numeric"
            onChange={(event) => setRaInput(event.target.value)}
            className="min-h-11 rounded-2xl border border-emerald-200 bg-white/90 px-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
            placeholder="Digite seu RA"
          />
          <button
            type="submit"
            disabled={isLoadingRa}
            className="min-h-11 rounded-2xl bg-emerald-500 px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {isLoadingRa ? "..." : "Conectar"}
          </button>
        </form>
      )}
      {raStatus.message && (
        <p className={`mt-2 text-xs font-bold ${statusTone}`}>{raStatus.message}</p>
      )}
    </header>
  );
}

function HomePage({ dashboard, progress, onOpenPlanning, onOpenPerformance, onOpenHistory }) {
  return (
    <section className="flex flex-col gap-4">
      <WelcomeHero
        student={dashboard.student}
        cr={dashboard.metrics.cr}
        cp={dashboard.metrics.cp}
        approvedCredits={dashboard.approvedCredits}
      />

      <ActionChips
        progress={progress}
        onOpenPlanning={onOpenPlanning}
        onOpenPerformance={onOpenPerformance}
        onOpenHistory={onOpenHistory}
      />

      <NextCourseSuggestions progress={progress} onOpenPlanning={onOpenPlanning} />

      <AxesCompact axes={dashboard.axesProgress} />
    </section>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Bom dia", emoji: "☀️" };
  if (h < 18) return { text: "Boa tarde", emoji: "🌤" };
  return { text: "Boa noite", emoji: "🌙" };
}

function WelcomeHero({ student, cp, approvedCredits, cr }) {
  const firstName = student.nome.split(" ")[0];
  const cpPct = Math.round(cp * 100);
  const greeting = getGreeting();

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#064e3b_0%,#047857_30%,#059669_62%,#0d9488_100%)] p-5 pb-6 text-white shadow-[0_36px_90px_rgba(4,120,87,0.42)]">

      {/* ── Textura de pontos ── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:18px_18px]" />

      {/* ── Brilho superior ── */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-32 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-2xl" />

      {/* ── Watermark UFABC ── */}
      <span className="pointer-events-none absolute -bottom-4 -right-2 select-none font-black leading-none tracking-tighter text-white/[0.06]" style={{ fontSize: "8.5rem" }}>
        UFABC
      </span>

      {/* ── Círculos decorativos ── */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border-[26px] border-white/10" />
      <div className="absolute right-8 top-16 h-12 w-12 rounded-full border-[9px] border-white/[0.08]" />
      <div className="absolute right-20 top-28 h-5 w-5 rounded-full bg-emerald-300/20" />
      <div className="absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-teal-300/20 blur-3xl" />

      {/* ── Badge saudação + instituição ── */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          <span className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-white/90">
            Universidade Federal do ABC
          </span>
        </div>
      </div>

      {/* ── Saudação principal ── */}
      <div className="mt-5">
        <p className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-emerald-200/90">
          <span>{greeting.emoji}</span>
          <span>{greeting.text},</span>
        </p>
        <h2 className="mt-0.5 font-display text-[3rem] font-black leading-[1] tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
          {firstName}!
        </h2>
        <p className="mt-2.5 max-w-[15rem] text-[0.78rem] font-medium leading-snug text-white/65">
          Continue de onde parou — sua{" "}
          <span className="font-black text-white">jornada UFABC</span>{" "}
          está evoluindo.
        </p>
      </div>

      {/* ── Stats flutuantes ── */}
      <div className="mt-5 flex items-center gap-2">
        <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/15 px-3.5 py-2 backdrop-blur-sm">
          <p className="text-[0.52rem] font-black uppercase tracking-[0.18em] text-white/60">CR</p>
          <p className="font-display text-xl font-black leading-tight text-white">
            {typeof cr === "number" ? cr.toFixed(2) : "—"}
          </p>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/15 px-3.5 py-2 backdrop-blur-sm">
          <p className="text-[0.52rem] font-black uppercase tracking-[0.18em] text-white/60">Créditos</p>
          <p className="font-display text-xl font-black leading-tight text-white">{approvedCredits}</p>
        </div>
        <div className="flex flex-1 flex-col rounded-2xl border border-white/20 bg-white/15 px-3.5 py-2 backdrop-blur-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[0.52rem] font-black uppercase tracking-[0.18em] text-white/60">Progressão</p>
            <p className="text-[0.65rem] font-black text-emerald-200">{cpPct}%</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/90 to-emerald-200 transition-all duration-700"
              style={{ width: `${Math.max(cpPct, 3)}%` }}
            />
          </div>
          <p className="mt-1 text-[0.52rem] font-semibold text-white/40">
            {student.curso_ingresso ?? "UFABC"}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Chips de navegação rápida ── */
function ActionChips({ progress, onOpenPlanning, onOpenPerformance, onOpenHistory }) {
  const chips = [
    {
      key: "plano",
      eyebrow: progress.plan.label,
      label: "Plano",
      detail: `${progress.completed} de ${progress.total}`,
      grad: "from-violet-500 to-purple-600",
      shadow: "shadow-[0_14px_36px_rgba(124,58,237,0.38)]",
      bgIcon: (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden="true">
          <rect x="2" y="2"  width="15" height="15" rx="3" stroke="white" strokeWidth="2.5"/>
          <rect x="23" y="2" width="15" height="15" rx="3" stroke="white" strokeWidth="2.5"/>
          <rect x="2" y="23" width="15" height="15" rx="3" stroke="white" strokeWidth="2.5"/>
          <rect x="23" y="23" width="15" height="15" rx="3" stroke="white" strokeWidth="2.5"/>
        </svg>
      ),
      onClick: onOpenPlanning,
    },
    {
      key: "desempenho",
      eyebrow: "Coeficientes",
      label: "Desempenho",
      detail: "CR · CA · CP",
      grad: "from-emerald-500 to-teal-500",
      shadow: "shadow-[0_14px_36px_rgba(16,185,129,0.38)]",
      bgIcon: (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden="true">
          <rect x="4"  y="24" width="8"  height="14" rx="2" stroke="white" strokeWidth="2.5"/>
          <rect x="16" y="14" width="8"  height="24" rx="2" stroke="white" strokeWidth="2.5"/>
          <rect x="28" y="4"  width="8"  height="34" rx="2" stroke="white" strokeWidth="2.5"/>
        </svg>
      ),
      onClick: onOpenPerformance,
    },
    {
      key: "historico",
      eyebrow: "Acadêmico",
      label: "Histórico",
      detail: "Linha do tempo",
      grad: "from-sky-500 to-blue-600",
      shadow: "shadow-[0_14px_36px_rgba(14,165,233,0.38)]",
      bgIcon: (
        <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden="true">
          <circle cx="20" cy="20" r="17" stroke="white" strokeWidth="2.5"/>
          <path d="M20 10v11l7 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      onClick: onOpenHistory,
    },
  ];

  return (
    <div className="flex gap-2.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClick}
          className={`relative flex flex-1 flex-col justify-between overflow-hidden rounded-[1.35rem] bg-gradient-to-br ${chip.grad} p-3.5 text-left text-white ${chip.shadow} transition-all duration-200 active:scale-[0.95] hover:brightness-110`}
        >
          {/* Ícone marca-d'água */}
          <div className="pointer-events-none absolute -bottom-1 -right-1 opacity-20">
            {chip.bgIcon}
          </div>
          {/* Brilho superior */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/20 to-transparent" />

          <div className="relative">
            <p className="text-[0.52rem] font-black uppercase tracking-[0.2em] text-white/60">{chip.eyebrow}</p>
            <p className="mt-0.5 text-[0.85rem] font-black leading-tight">{chip.label}</p>
          </div>
          <p className="relative mt-4 text-[0.6rem] font-semibold text-white/70">{chip.detail}</p>
        </button>
      ))}
    </div>
  );
}

/* ── Próximas pela rota ── */
const Q_COLORS_HOME = [
  "",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-100 text-slate-600",
];

const EIXO_SHORT_HOME = {
  computacao:          { label: "Comp.",  color: "bg-emerald-100 text-emerald-700" },
  matematica:          { label: "Mat.",   color: "bg-blue-100 text-blue-700" },
  humanidades:         { label: "Hum.",   color: "bg-amber-100 text-amber-700" },
  "ciencias-naturais": { label: "C.Nat.", color: "bg-teal-100 text-teal-700" },
};

const Q_STRIP_COLORS = [
  "",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-slate-300",
];

function NextCourseSuggestions({ progress, onOpenPlanning }) {
  const requiredSection = progress.sections.find((s) => s.key === "required");
  const suggestions = (requiredSection?.items ?? [])
    .filter((item) => !item.completed && item.preReqsMet)
    .slice(0, 3);

  if (suggestions.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[1.65rem] border border-emerald-200/80 bg-white/90 shadow-[0_18px_60px_rgba(16,185,129,0.10)]">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-[0_6px_16px_rgba(16,185,129,0.38)]">
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5 h-[1.1rem] w-[1.1rem] text-white" aria-hidden="true">
              <path d="M10 3L17 8.5V17H13v-5H7v5H3V8.5L10 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-emerald-500">
              {progress.plan.label} · Rota
            </p>
            <h2 className="text-[1.05rem] font-black leading-tight text-slate-950">Próximas pela rota</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPlanning}
          className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[0.65rem] font-black text-emerald-700 transition hover:bg-emerald-100"
        >
          Ver todas →
        </button>
      </div>

      <div className="border-t border-slate-100">
        {suggestions.map((item, idx) => {
          const qColor = Q_COLORS_HOME[item.quadrimestre_ideal] ?? Q_COLORS_HOME[5];
          const strip = Q_STRIP_COLORS[item.quadrimestre_ideal] ?? Q_STRIP_COLORS[5];
          const eixo = EIXO_SHORT_HOME[item.eixos?.[0]?.codigo];

          return (
            <div
              key={item.codigo}
              className={`flex items-center gap-3 px-4 py-3 ${idx < suggestions.length - 1 ? "border-b border-slate-100" : ""}`}
            >
              {/* Tira colorida de quadrimestre */}
              <div className={`h-10 w-1 shrink-0 rounded-full ${strip}`} />

              {/* Nome + metadados */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.88rem] font-bold text-slate-950">{item.nome}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.62rem] font-semibold text-slate-400">{item.codigo}</span>
                  {item.quadrimestre_ideal != null && (
                    <span className={`rounded-md px-1.5 py-px text-[0.55rem] font-black ${qColor}`}>
                      Q{item.quadrimestre_ideal}
                    </span>
                  )}
                  {eixo && (
                    <span className={`rounded-md px-1.5 py-px text-[0.55rem] font-bold ${eixo.color}`}>
                      {eixo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Créditos + seta */}
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                  {item.creditos}cr
                </span>
                <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-slate-300" aria-hidden="true">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Eixos compactos ── */
const EIXO_STYLE = {
  computacao:          { label: "Computação",   bar: "bg-gradient-to-r from-emerald-400 to-emerald-600", dot: "bg-emerald-500", pctColor: "text-emerald-600" },
  matematica:          { label: "Matemática",   bar: "bg-gradient-to-r from-blue-400 to-blue-600",       dot: "bg-blue-500",    pctColor: "text-blue-600" },
  humanidades:         { label: "Humanidades",  bar: "bg-gradient-to-r from-amber-400 to-amber-600",     dot: "bg-amber-500",   pctColor: "text-amber-600" },
  "ciencias-naturais": { label: "C. Naturais",  bar: "bg-gradient-to-r from-teal-400 to-teal-600",       dot: "bg-teal-500",    pctColor: "text-teal-600" },
  livres:              { label: "Livres",        bar: "bg-gradient-to-r from-slate-300 to-slate-400",     dot: "bg-slate-400",   pctColor: "text-slate-500" },
};

function AxesCompact({ axes }) {
  if (!axes || axes.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[1.65rem] border border-emerald-200/80 bg-white/90 shadow-[0_18px_60px_rgba(16,185,129,0.10)]">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-[0_6px_16px_rgba(16,185,129,0.38)]">
          <svg viewBox="0 0 20 20" fill="none" className="h-[1.1rem] w-[1.1rem] text-white" aria-hidden="true">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-emerald-500">Curricular</p>
          <h2 className="text-[1.05rem] font-black leading-tight text-slate-950">Mapa de força</h2>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-slate-100 px-4 py-3.5">
        {axes.map((axis) => {
          const style = EIXO_STYLE[axis.codigo] ?? { label: axis.nome, bar: "bg-slate-400", dot: "bg-slate-400", pctColor: "text-slate-500" };
          const pct = Math.round(axis.percent * 100);

          return (
            <div key={axis.codigo}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <span className="text-[0.78rem] font-bold text-slate-700">{style.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.62rem] font-semibold text-slate-400">
                    {Math.round(axis.approvedCredits)}cr
                  </span>
                  <span className={`w-8 text-right text-[0.68rem] font-black ${style.pctColor}`}>{pct}%</span>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${style.bar} transition-all duration-500`}
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

function PlanningPage({ plans, progress, selectedPlanKey, onSelectPlan, onToggleRequirement }) {
  return (
    <section className="flex flex-col gap-4">
      <PageHeading eyebrow="Planejamento" title="Monte sua rota curricular" />
      <CourseSelector plans={plans} selectedKey={selectedPlanKey} onSelect={onSelectPlan} />
      <CurriculumProgress progress={progress} onToggleRequirement={onToggleRequirement} />
    </section>
  );
}

function PerformancePage({ dashboard, courses }) {
  const { cr, ca, cp } = dashboard.metrics;

  return (
    <section className="flex flex-col gap-4">
      <PageHeading eyebrow="Desempenho" title="Seus coeficientes" />

      {/* ── Cards de coeficientes ── */}
      <div className="grid grid-cols-3 gap-2">
        <CoefCard
          label="CR"
          value={formatDecimal(cr)}
          subtitle="Rendimento"
          description="Média ponderada geral de todas as disciplinas cursadas."
          accent="emerald"
        />
        <CoefCard
          label="CA"
          value={formatDecimal(ca)}
          subtitle="Afinidade"
          description="Desempenho relativo ao coeficiente médio dos colegas."
          accent="blue"
        />
        <CoefCard
          label="CP"
          value={formatPercent(cp)}
          subtitle="Progressão"
          description="Percentual de créditos obrigatórios já concluídos."
          accent="violet"
        />
      </div>

      {/* ── Explicação compacta ── */}
      <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-400">Como interpretar</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {[
            { label: "CR", color: "bg-emerald-500", text: "Varia de 0 a 10. Acima de 6 indica bom desempenho geral." },
            { label: "CA", color: "bg-blue-500",    text: "Compara seu CR com a média da turma no mesmo período." },
            { label: "CP", color: "bg-violet-500",  text: "100% significa que você cumpriu todos os créditos necessários." },
          ].map((item) => (
            <li key={item.label} className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.color}`} />
              <p className="text-[0.65rem] font-medium leading-snug text-slate-500">
                <span className="font-black text-slate-700">{item.label}</span>{" — "}{item.text}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Simulador de notas ── */}
      <div className="mt-1">
        <div className="mb-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-emerald-600">Simulador</p>
          <h3 className="mt-0.5 font-display text-xl font-black text-slate-950">Projete seu próximo CR</h3>
        </div>
        <GradeSimulator courses={courses} />
      </div>
    </section>
  );
}

const COEF_ACCENT = {
  emerald: {
    eyebrow:  "text-emerald-500",
    value:    "text-emerald-600",
    border:   "border-emerald-200/80",
    shadow:   "shadow-[0_14px_50px_rgba(16,185,129,0.12)]",
    dot:      "bg-emerald-500",
  },
  blue: {
    eyebrow:  "text-blue-500",
    value:    "text-blue-600",
    border:   "border-blue-200/80",
    shadow:   "shadow-[0_14px_50px_rgba(59,130,246,0.12)]",
    dot:      "bg-blue-500",
  },
  violet: {
    eyebrow:  "text-violet-500",
    value:    "text-violet-600",
    border:   "border-violet-200/80",
    shadow:   "shadow-[0_14px_50px_rgba(139,92,246,0.12)]",
    dot:      "bg-violet-500",
  },
};

function CoefCard({ label, value, subtitle, description, accent }) {
  const [expanded, setExpanded] = useState(false);
  const a = COEF_ACCENT[accent] ?? COEF_ACCENT.emerald;

  return (
    <article
      className={`rounded-[1.35rem] border ${a.border} bg-white/90 p-3 ${a.shadow} cursor-pointer select-none transition-all duration-200`}
      onClick={() => setExpanded((v) => !v)}
    >
      <p className={`text-[0.62rem] font-black uppercase tracking-[0.18em] ${a.eyebrow}`}>{label}</p>
      <strong className={`mt-1.5 block font-display text-2xl font-black ${a.value}`}>{value}</strong>
      <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-slate-400">{subtitle}</p>
      {expanded && (
        <p className="mt-2 text-[0.6rem] font-medium leading-snug text-slate-500 border-t border-slate-100 pt-2">
          {description}
        </p>
      )}
    </article>
  );
}

function HistoryPage({ dashboard }) {
  return (
    <section className="flex flex-col gap-4">
      <PageHeading eyebrow="Historico" title="Sua linha academica" />
      <ProgressoEixos axes={dashboard.axesProgress} />
      {dashboard.quadrimesters.map((quadri) => (
        <QuadriSection key={quadri.label} quadrimester={quadri} />
      ))}
    </section>
  );
}

function PageHeading({ eyebrow, title }) {
  return (
    <div className="py-2">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-emerald-600">{eyebrow}</p>
      <h2 className="mt-1 font-display text-3xl font-black text-slate-950">{title}</h2>
    </div>
  );
}

const NAV_ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H15v-5h-6v5H4a1 1 0 0 1-1-1V10.5Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  planning: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="3"  y="13" width="4" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="8"  width="4" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17" y="3"  width="4" height="18" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="12,7 12,12 15.5,14.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  grade: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
};

const NAV_LABELS = {
  home:        "Início",
  planning:    "Plano",
  performance: "Notas",
  history:     "Histórico",
  grade:       "Grade",
};

function BottomNavigation({ activePage, onChange }) {
  const [animatingKey, setAnimatingKey] = useState(null);

  const handleClick = (key) => {
    if (key !== activePage) {
      setAnimatingKey(key);
    }
    onChange(key);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[30rem] px-4 pb-4">
      <div className="grid grid-cols-5 gap-1 rounded-[1.5rem] border border-emerald-200 bg-white/95 p-2 shadow-[0_-18px_70px_rgba(16,185,129,0.14)] backdrop-blur-xl">
        {ACADEMIC_APP_PAGES.map((page) => {
          const active = page.key === activePage;
          const isAnimating = animatingKey === page.key;
          return (
            <button
              key={page.key}
              type="button"
              onClick={() => handleClick(page.key)}
              className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 transition-all duration-200 ${
                active
                  ? "bg-emerald-500 text-white shadow-[0_6px_20px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={isAnimating ? "animate-nav-pop" : ""}
                onAnimationEnd={() => setAnimatingKey(null)}
              >
                {NAV_ICONS[page.key]}
              </span>
              <span
                className={`text-[0.56rem] font-black tracking-wide transition-all duration-200 ${
                  active ? "opacity-100" : "opacity-60"
                }`}
              >
                {NAV_LABELS[page.key]}
              </span>
              {active && (
                <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-300/50 animate-nav-fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
