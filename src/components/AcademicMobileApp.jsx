import { useMemo, useState } from "react";

import { ACADEMIC_APP_PAGES } from "../utils/app-pages.js";
import { fetchAcademicRecordByRa } from "../services/academic-record-api.js";
import { buildCurriculumProgress, COURSE_PLANS, createCompletedCourseTokens, normalizeCurriculumToken } from "../utils/curriculum-progress.js";
import { formatDecimal, formatPercent } from "../utils/dashboard-data.js";
import { CourseSelector } from "./CourseSelector.jsx";
import { CurriculumProgress } from "./CurriculumProgress.jsx";
import { DeveloperDiagnosticsPanel } from "./DeveloperDiagnosticsPanel.jsx";
import { GradeSimulator } from "./GradeSimulator.jsx";
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
      setRaStatus({ type: "success", message: "Historico academico carregado pelo RA." });
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
            onOpenSimulator={() => setActivePage("simulator")}
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
        {activePage === "simulator" && <SimulatorPage courses={courses} />}
        {activePage === "history" && <HistoryPage dashboard={dashboard} />}
      </div>

      <BottomNavigation activePage={activePage} onChange={setActivePage} />
    </main>
  );
}

function AppTopBar({ student, isLoadingRa, raStatus, onConnectRa }) {
  const [raInput, setRaInput] = useState(student.ra);
  const statusTone = raStatus.type === "error" ? "text-rose-600" : "text-emerald-600";

  return (
    <header className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-emerald-600">CoreUFABC</p>
          <h1 className="mt-1 max-w-[14rem] truncate font-display text-2xl font-black text-slate-950">{student.nome}</h1>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white/90 px-3 py-2 text-right shadow-[0_12px_40px_rgba(16,185,129,0.12)]">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-emerald-500">RA</p>
          <p className="text-xs font-black text-slate-950">{student.ra.slice(-5)}</p>
        </div>
      </div>

      <form
        className="mt-3 grid grid-cols-[1fr_auto] gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onConnectRa(raInput);
        }}
      >
        <label className="sr-only" htmlFor="ra-connect">
          RA para conectar
        </label>
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
      {raStatus.message && (
        <p className={`mt-2 text-xs font-bold ${statusTone}`}>{raStatus.message}</p>
      )}
    </header>
  );
}

function HomePage({ dashboard, progress, onOpenPlanning, onOpenSimulator }) {
  return (
    <section className="flex flex-col gap-4">
      <HeroCard metrics={dashboard.metrics} approvedCredits={dashboard.approvedCredits} totalCredits={dashboard.totalCredits} />

      <div className="grid grid-cols-3 gap-2">
        <MetricTile label="CR" value={formatDecimal(dashboard.metrics.cr)} />
        <MetricTile label="CA" value={formatDecimal(dashboard.metrics.ca)} />
        <MetricTile label="CP" value={formatPercent(dashboard.metrics.cp)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ActionCard
          eyebrow="Plano"
          title={progress.plan.label}
          detail={`${progress.completed}/${progress.total} itens`}
          onClick={onOpenPlanning}
        />
        <ActionCard
          eyebrow="Simular"
          title="Nota futura"
          detail="Projetar CR"
          onClick={onOpenSimulator}
        />
      </div>

      <section className="rounded-[1.65rem] border border-emerald-200/80 bg-white/80 p-4 shadow-[0_18px_70px_rgba(16,185,129,0.10)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-emerald-600">Proxima decisao</p>
            <h2 className="mt-1 font-display text-xl font-black text-slate-950">Escolha a matriz e simule o impacto</h2>
          </div>
          <span className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white">2 toques</span>
        </div>
      </section>
    </section>
  );
}

function HeroCard({ metrics, approvedCredits, totalCredits }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#059669_0%,#0d9488_100%)] p-5 text-white shadow-[0_28px_90px_rgba(5,150,105,0.36)]">
      <div className="absolute right-[-2.5rem] top-[-2rem] h-32 w-32 rounded-full border-[24px] border-white/14" />
      <div className="absolute bottom-[-4rem] left-[-3rem] h-36 w-36 rounded-full bg-white/12 blur-2xl" />
      <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/75">Resumo academico</p>
      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold text-white/75">Coeficiente atual</p>
          <strong className="font-display text-6xl font-black leading-none">{formatDecimal(metrics.cr)}</strong>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-right text-slate-950">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-emerald-600">Creditos</p>
          <p className="font-black">{approvedCredits}/{totalCredits}</p>
        </div>
      </div>
    </section>
  );
}

function MetricTile({ label, value }) {
  return (
    <article className="rounded-[1.35rem] border border-emerald-200/80 bg-white/85 p-3 shadow-[0_14px_50px_rgba(16,185,129,0.09)]">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-emerald-500">{label}</p>
      <strong className="mt-2 block font-display text-2xl font-black text-slate-950">{value}</strong>
    </article>
  );
}

function ActionCard({ eyebrow, title, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-32 rounded-[1.65rem] border border-emerald-200/80 bg-white/90 p-4 text-left shadow-[0_18px_60px_rgba(16,185,129,0.11)] transition active:scale-[0.98]"
    >
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-emerald-600">{eyebrow}</p>
      <strong className="mt-5 block font-display text-2xl font-black text-slate-950">{title}</strong>
      <span className="mt-1 block text-sm font-semibold text-slate-500">{detail}</span>
    </button>
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

function SimulatorPage({ courses }) {
  return (
    <section className="flex flex-col gap-4">
      <PageHeading eyebrow="Simulador" title="Teste o proximo conceito" />
      <GradeSimulator courses={courses} />
    </section>
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

function BottomNavigation({ activePage, onChange }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[30rem] px-4 pb-4">
      <div className="grid grid-cols-4 gap-1 rounded-[1.5rem] border border-emerald-200 bg-white/95 p-2 shadow-[0_-18px_70px_rgba(16,185,129,0.14)] backdrop-blur-xl">
        {ACADEMIC_APP_PAGES.map((page) => {
          const active = page.key === activePage;
          return (
            <button
              key={page.key}
              type="button"
              onClick={() => onChange(page.key)}
              className={`min-h-12 rounded-2xl px-2 text-xs font-black transition ${
                active ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {page.shortLabel}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
