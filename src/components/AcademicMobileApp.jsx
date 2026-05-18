import { useEffect, useMemo, useRef, useState } from "react";

import { ACADEMIC_APP_PAGES } from "../utils/app-pages.js";
import { fetchAcademicRecordByRa } from "../services/academic-record-api.js";
import { fetchHistoricoByRa, upsertHistorico, fetchFromSigaaProxy, isSupabaseConfigured } from "../services/supabase.js";
import { buildCurriculumProgress, COURSE_PLANS, createCompletedCourseTokens, normalizeCurriculumToken } from "../utils/curriculum-progress.js";
import { formatDecimal, formatPercent } from "../utils/dashboard-data.js";
import {
  parseTurmasOfertadasPdf,
  buildTurmasOfertadasUrl,
  getCurrentPeriodo,
  filterAvailablePendingCourses,
} from "../services/turmas-ofertadas-parser.js";
import { normalizeRawCourseCode } from "../services/sigaa-record-parser.js";
import { CourseSelector } from "./CourseSelector.jsx";
import { CurriculumProgress } from "./CurriculumProgress.jsx";
import { DeveloperDiagnosticsPanel } from "./DeveloperDiagnosticsPanel.jsx";
import { GradeSimulator } from "./GradeSimulator.jsx";
import { GradePlannerPage } from "./GradePlanner/index.jsx";
import { ProgressoEixos } from "./ProgressoEixos.jsx";
import { QuadriSection } from "./QuadriSection.jsx";
import { SigaaImportModal } from "./SigaaImportModal.jsx";
import { SettingsSheet } from "./SettingsSheet.jsx";

export function AcademicMobileApp({
  dashboard,
  academicHistory,
  fallbackAcademicHistories = [],
  onAcademicHistoryLoaded,
  initialRa = null,
  autoLoadStatus = null,
}) {
  const [activePage, setActivePage] = useState("home");
  const [selectedPlanKey, setSelectedPlanKey] = useState("BCT");
  const [manualCompletedTokens, setManualCompletedTokens] = useState(() => new Set());
  const [raStatus, setRaStatus] = useState({ type: "idle", message: "" });
  const [isLoadingRa, setIsLoadingRa] = useState(false);
  // Abre modal automaticamente se RA não encontrado no Supabase
  const [showImportModal, setShowImportModal] = useState(autoLoadStatus === "not-found");
  const [showSettings, setShowSettings] = useState(false);
  const [pendingRa, setPendingRa] = useState(autoLoadStatus === "not-found" ? initialRa : null);
  // ── Turmas ofertadas (course offerings for the current quadrimester) ──
  const [offerings, setOfferings] = useState(null); // Map<code, CourseOffering> | null
  const [offeringsStatus, setOfferingsStatus] = useState("idle"); // idle | loading | loaded | error
  const [offeringsPeriodo, setOfferingsPeriodo] = useState(null);

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

  // ── Helper: parse a turmas ofertadas PDF from an ArrayBuffer ──
  async function parseOfferingsPdf(arrayBuffer, fallbackPeriodo) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const allItems = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (item.str?.trim()) {
          allItems.push({
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5]),
            str: item.str.trim(),
          });
        }
      }
    }

    const { periodo: detectedPeriodo, courses: coursesMap } = parseTurmasOfertadasPdf({ items: allItems });
    setOfferings(coursesMap);
    setOfferingsPeriodo(detectedPeriodo ?? fallbackPeriodo);
    setOfferingsStatus("loaded");
  }

  // ── Auto-fetch turmas ofertadas on mount ──
  useEffect(() => {
    if (offeringsStatus !== "idle") return;

    const periodo = getCurrentPeriodo();
    const url = buildTurmasOfertadasUrl(periodo);
    setOfferingsStatus("loading");

    fetch(url)
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then((buf) => parseOfferingsPdf(buf, periodo))
      .catch((err) => {
        console.warn("Auto-fetch turmas ofertadas falhou (CORS?):", err.message);
        setOfferingsStatus("needs-upload");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual upload of turmas ofertadas PDF ──
  async function handleOfferingsUpload(file) {
    setOfferingsStatus("loading");
    try {
      const buf = await file.arrayBuffer();
      await parseOfferingsPdf(buf, getCurrentPeriodo());
    } catch (err) {
      console.warn("Erro ao ler PDF de turmas:", err.message);
      setOfferingsStatus("error");
    }
  }

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
  const handleConnectRa = async (ra, senha) => {
    setIsLoadingRa(true);
    setRaStatus({ type: "idle", message: "" });
    const normalizedRa = ra.replace(/\D/g, "");

    try {
      // 1. Try Supabase cache first (instant — no password needed)
      if (isSupabaseConfigured()) {
        const supabaseData = await fetchHistoricoByRa(normalizedRa);
        if (supabaseData) {
          onAcademicHistoryLoaded?.(supabaseData);
          setManualCompletedTokens(new Set());
          setRaStatus({
            type: "success",
            message: "Historico academico carregado com sucesso.",
          });
          setIsLoadingRa(false);
          return;
        }
      }

      // 2. RA not cached — need password to fetch from SIGAA
      if (!senha) {
        setRaStatus({
          type: "needPassword",
          message: "RA nao encontrado no cache. Informe sua senha do SIGAA para importar.",
        });
        setPendingRa(normalizedRa);
        setIsLoadingRa(false);
        return;
      }

      // 3. Fetch from SIGAA via Edge Function proxy
      setRaStatus({ type: "loading", message: "Conectando ao SIGAA..." });
      const sigaaResult = await fetchFromSigaaProxy(normalizedRa, senha);

      if (sigaaResult.success && sigaaResult.record) {
        const record = sigaaResult.record;

        // Save to Supabase for future instant lookups
        if (isSupabaseConfigured()) {
          try {
            await upsertHistorico(
              normalizedRa,
              record.aluno?.nome || "Aluno",
              record.aluno?.curso_ingresso || null,
              record,
            );
          } catch (err) {
            console.warn("Falha ao salvar no Supabase (continuando localmente):", err.message);
          }
        }

        onAcademicHistoryLoaded?.(record);
        setManualCompletedTokens(new Set());
        setPendingRa(null);
        setRaStatus({
          type: "success",
          message: `Historico importado do SIGAA! ${record.disciplinas?.length ?? 0} disciplinas carregadas.`,
        });
      }
    } catch (error) {
      setRaStatus({ type: "error", message: error.message });
    } finally {
      setIsLoadingRa(false);
    }
  };

  const handleClearData = () => {
    const demo = fallbackAcademicHistories[0];
    if (demo) {
      onAcademicHistoryLoaded?.(demo);
      setManualCompletedTokens(new Set());
      setSelectedPlanKey("BCT");
    }
  };

  const handleSigaaImport = async (parsedResult) => {
    const { record } = parsedResult;
    const ra = pendingRa;

    // Save to Supabase for future lookups by anyone with this RA
    if (isSupabaseConfigured() && ra) {
      try {
        await upsertHistorico(
          ra,
          record.aluno.nome || "Aluno",
          record.aluno.curso_ingresso || null,
          record,
        );
      } catch (err) {
        console.warn("Falha ao salvar no Supabase (continuando localmente):", err.message);
      }
    }

    // Load into app state
    onAcademicHistoryLoaded?.(record);
    setManualCompletedTokens(new Set());
    setShowImportModal(false);
    setPendingRa(null);
    setRaStatus({
      type: "success",
      message: `Historico importado com sucesso! ${record.disciplinas.length} disciplinas carregadas.`,
    });
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
          onOpenSettings={() => setShowSettings(true)}
        />
        <DeveloperDiagnosticsPanel />

        {activePage === "home" && (
          <HomePage
            dashboard={dashboard}
            progress={progress}
            offerings={offerings}
            offeringsStatus={offeringsStatus}
            offeringsPeriodo={offeringsPeriodo}
            onOfferingsUpload={handleOfferingsUpload}
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

      {showImportModal && (
        <SigaaImportModal
          ra={pendingRa}
          onImport={handleSigaaImport}
          onClose={() => {
            setShowImportModal(false);
            setPendingRa(null);
          }}
        />
      )}

      {showSettings && (
        <SettingsSheet
          student={dashboard.student}
          selectedPlanKey={selectedPlanKey}
          onSelectPlan={setSelectedPlanKey}
          isLoadingRa={isLoadingRa}
          raStatus={raStatus}
          onConnectRa={handleConnectRa}
          onOpenImport={() => {
            setShowImportModal(true);
            setShowSettings(false);
          }}
          onClearData={handleClearData}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}

function AppTopBar({ student, onOpenSettings }) {
  const initials = student.nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const now = new Date();
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
    .replace(".", "").replace(",", "");

  return (
    <header className="mb-5">
      {/* ── Barra de marca ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Logo + data */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
            <svg viewBox="0 0 24 24" fill="none" className="h-[1.1rem] w-[1.1rem] text-white" aria-hidden="true">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 22V12M3 7l9 5 9-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="leading-none">
            <p className="text-[1rem] font-black tracking-tight text-slate-900">
              Core<span className="text-emerald-500">UFABC</span>
            </p>
            <p className="mt-0.5 text-[0.55rem] font-semibold capitalize text-slate-400">{dateLabel}</p>
          </div>
        </div>

        {/* Avatar + RA — abre Configurações */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Abrir configurações"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 shadow-sm transition hover:border-emerald-300 active:scale-95"
        >
          <span className="text-[0.65rem] font-bold text-slate-400">{student.ra}</span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.4)]">
            <span className="text-[0.65rem] font-black text-white">{initials}</span>
          </div>
        </button>
      </div>
    </header>
  );
}

function HomePage({ dashboard, progress, offerings, offeringsStatus, offeringsPeriodo, onOfferingsUpload, onOpenPlanning, onOpenPerformance, onOpenHistory }) {
  return (
    <section className="flex flex-col gap-4">
      <WelcomeHero
        student={dashboard.student}
        cr={dashboard.metrics.cr}
        cp={dashboard.metrics.cp}
        approvedCredits={dashboard.approvedCredits}
        requiredCredits={dashboard.requiredCredits}
        totalCourses={dashboard.totalCourses}
        quadrimesters={dashboard.quadrimesters}
      />

      <ActionChips
        progress={progress}
        onOpenPlanning={onOpenPlanning}
        onOpenPerformance={onOpenPerformance}
        onOpenHistory={onOpenHistory}
      />

      <CurrentQuadCard
        quadrimesters={dashboard.quadrimesters}
        onOpenHistory={onOpenHistory}
      />

      <NextCourseSuggestions
        progress={progress}
        offerings={offerings}
        offeringsStatus={offeringsStatus}
        offeringsPeriodo={offeringsPeriodo}
        onOfferingsUpload={onOfferingsUpload}
        onOpenPlanning={onOpenPlanning}
      />

      {/* ── CTA Montar Grade ── */}
      <button
        type="button"
        onClick={onOpenPlanning}
        className="group relative overflow-hidden flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-[0_8px_24px_rgba(16,185,129,0.28)] transition-all active:scale-[0.98] hover:shadow-[0_12px_32px_rgba(16,185,129,0.38)] hover:brightness-105"
      >
        {/* brilho diagonal */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        {/* watermark */}
        <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute -right-2 -bottom-2 h-16 w-16 text-white/10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M10 4v18"/>
        </svg>

        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M3 10h18M10 4v18"/>
          </svg>
        </div>
        <div className="relative flex-1 text-left">
          <p className="text-[0.92rem] font-black">Montar grade</p>
          <p className="text-[0.62rem] font-medium text-white/65">Monte seus horários para o próximo quad</p>
        </div>
        <svg viewBox="0 0 16 16" fill="none" className="relative h-4 w-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3l5 5-5 5"/>
        </svg>
      </button>
    </section>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Bom dia", emoji: "☀️" };
  if (h < 18) return { text: "Boa tarde", emoji: "🌤" };
  return { text: "Boa noite", emoji: "🌙" };
}

/* Retorna label e cor de status com base no CR */
function crStatus(cr) {
  if (typeof cr !== "number") return null;
  if (cr >= 3.5) return { label: "Excelente", dot: "bg-emerald-300", text: "text-emerald-200" };
  if (cr >= 3.0) return { label: "Bom",       dot: "bg-sky-300",     text: "text-sky-200" };
  if (cr >= 2.5) return { label: "Regular",   dot: "bg-amber-300",   text: "text-amber-200" };
  return           { label: "Atenção",         dot: "bg-rose-400",    text: "text-rose-300" };
}

function WelcomeHero({ student, cr, cp, approvedCredits, requiredCredits, totalCourses, quadrimesters }) {
  const firstName = student.nome.split(" ")[0];
  const lastName  = student.nome.split(" ").slice(-1)[0];
  const cpPct = Math.round(cp * 100);
  const greeting = getGreeting();
  const quadsCompleted = (quadrimesters ?? []).length;
  const creditsRemaining = Math.max(0, (requiredCredits ?? 0) - approvedCredits);
  const status = crStatus(cr);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(145deg,#052e16_0%,#064e3b_30%,#047857_65%,#059669_100%)] text-white shadow-[0_24px_64px_rgba(4,120,87,0.35)]">

      {/* ── Textura mesh ── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* ── Blobs decorativos ── */}
      <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full border-[20px] border-white/[0.04]" />
      <div className="absolute right-10 top-14 h-20 w-20 rounded-full border-[8px] border-white/[0.04]" />
      <div className="absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="absolute -bottom-4 right-0 h-24 w-24 rounded-full bg-emerald-300/10 blur-2xl" />

      {/* ════ Zona 1 — Identidade ════ */}
      <div className="relative px-5 pt-5 pb-4">

        {/* Topo: saudação + badge CR */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-white/50">
              <span>{greeting.emoji}</span>
              <span>{greeting.text},</span>
            </p>
            <h2 className="mt-0.5 font-display text-[2.1rem] font-black leading-[1] tracking-tight">
              {firstName}
            </h2>
            <p className="mt-1 text-[0.58rem] font-semibold text-white/35 tracking-wide">
              {lastName !== firstName ? lastName + " · " : ""}{student.curso_ingresso ?? "UFABC"}
            </p>
          </div>

          {/* CR badge */}
          {typeof cr === "number" && (
            <div className="shrink-0 flex flex-col items-center rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
              <span className="text-[0.44rem] font-black uppercase tracking-[0.2em] text-white/40">CR</span>
              <span className="mt-0.5 font-display text-xl font-black leading-none">{cr.toFixed(2)}</span>
              {status && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  <span className={`text-[0.42rem] font-black uppercase tracking-[0.1em] ${status.text}`}>{status.label}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status acadêmico pill */}
        {status && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-2.5 py-1">
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${status.dot}`} />
            <span className="text-[0.55rem] font-bold text-white/60">
              Desempenho {status.label} · {quadsCompleted} quad{quadsCompleted !== 1 ? "s" : ""} cursado{quadsCompleted !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ════ Zona 2 — Progressão ════ */}
      <div className="relative border-t border-white/[0.08] bg-black/[0.08] px-5 pt-3.5 pb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-white/40">Progressão curricular</p>
          <p className="text-[0.72rem] font-black">{cpPct}%</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-200 to-white/90 transition-all duration-1000"
            style={{ width: `${Math.max(cpPct, 2)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[0.52rem] font-medium text-white/25">
          {approvedCredits} de {requiredCredits ?? "—"} créditos necessários
        </p>
      </div>

      {/* ════ Zona 3 — Stats grid ════ */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.08] border-t border-white/[0.08]">
        {[
          { value: approvedCredits, label: "Créditos", sub: "aprovados" },
          { value: totalCourses,    label: "Disciplinas", sub: "no histórico" },
          { value: creditsRemaining, label: "Restantes", sub: "para formar" },
        ].map(({ value, label, sub }) => (
          <div key={label} className="flex flex-col items-center py-3.5 px-2">
            <p className="font-display text-[1.15rem] font-black leading-none">{value}</p>
            <p className="mt-0.5 text-[0.5rem] font-black uppercase tracking-[0.1em] text-white/50">{label}</p>
            <p className="text-[0.44rem] font-medium text-white/25">{sub}</p>
          </div>
        ))}
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
    <div className="flex gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClick}
          className={`relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${chip.grad} p-3.5 text-left text-white ${chip.shadow} transition-all duration-200 active:scale-[0.95] hover:brightness-105`}
        >
          {/* Ícone marca-d'água */}
          <div className="pointer-events-none absolute -bottom-2 -right-2 opacity-[0.18]">
            {chip.bgIcon}
          </div>
          {/* Brilho diagonal */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

          <div className="relative flex flex-col gap-0.5">
            <p className="text-[0.48rem] font-black uppercase tracking-[0.22em] text-white/50">{chip.eyebrow}</p>
            <p className="text-[0.88rem] font-black leading-tight">{chip.label}</p>
          </div>

          {/* Separador */}
          <div className="relative my-2.5 h-px bg-white/15" />

          <p className="relative text-[0.58rem] font-bold text-white/65 leading-snug">{chip.detail}</p>

          {/* Seta */}
          <svg viewBox="0 0 12 12" fill="none" className="absolute bottom-3 right-3 h-3 w-3 text-white/30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2l4 4-4 4"/>
          </svg>
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

function NextCourseSuggestions({ progress, offerings, offeringsStatus, offeringsPeriodo, onOfferingsUpload, onOpenPlanning }) {
  const offeringsFileRef = useRef(null);
  // If offerings are loaded, filter to only show courses actually offered this quad
  const suggestions = useMemo(() => {
    const requiredSection = progress.sections.find((s) => s.key === "required");
    const pendingRequired = (requiredSection?.items ?? []).filter(
      (item) => !item.completed && item.preReqsMet,
    );

    if (!offerings || offerings.size === 0) {
      // Fallback: show curriculum order (old behavior)
      return pendingRequired.slice(0, 5);
    }

    // Cross-reference with real offerings
    const offered = pendingRequired.filter((item) => {
      const code = normalizeRawCourseCode(item.codigo);
      return offerings.has(code);
    });

    // Enrich with real credits from the offerings PDF
    return offered.slice(0, 5).map((item) => {
      const code = normalizeRawCourseCode(item.codigo);
      const offering = offerings.get(code);
      if (!offering) return item;
      return {
        ...item,
        creditos: offering.creditos,
        turmasCount: offering.turmas.length,
        tpei: offering.tpei,
      };
    });
  }, [progress.sections, offerings]);

  if (suggestions.length === 0 && offeringsStatus !== "loading") return null;

  const isLive = offeringsStatus === "loaded" && offerings?.size > 0;
  const headerLabel = isLive
    ? `${progress.plan.label} · ${offeringsPeriodo ?? "Quad atual"}`
    : `${progress.plan.label} · Rota`;

  return (
    <section className="overflow-hidden rounded-[1.65rem] border border-emerald-200/80 bg-white/90 shadow-[0_18px_60px_rgba(16,185,129,0.10)]">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-[0_6px_16px_rgba(16,185,129,0.38)]">
            <svg viewBox="0 0 20 20" fill="none" className="h-[1.1rem] w-[1.1rem] text-white" aria-hidden="true">
              <path d="M10 3L17 8.5V17H13v-5H7v5H3V8.5L10 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-emerald-500">
              {headerLabel}
            </p>
            <h2 className="text-[1.05rem] font-black leading-tight text-slate-950">
              {isLive ? "Ofertadas agora" : "Próximas pela rota"}
            </h2>
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

      {/* Live badge */}
      {isLive && (
        <div className="flex items-center gap-1.5 px-4 pb-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[0.58rem] font-bold text-emerald-500">
            Dados reais da Prograd · {offerings.size} disciplinas ofertadas em {offeringsPeriodo}
          </span>
        </div>
      )}

      {offeringsStatus === "loading" && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span className="text-[0.6rem] font-bold text-slate-400">Carregando turmas ofertadas...</span>
        </div>
      )}

      {(offeringsStatus === "needs-upload" || offeringsStatus === "error") && (
        <div className="mx-4 mb-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-3">
          <p className="text-[0.65rem] font-bold text-emerald-800">
            Carregue o PDF de turmas ofertadas para ver apenas as matérias disponíveis neste quadrimestre.
          </p>
          <p className="mt-1 text-[0.58rem] font-medium text-emerald-600">
            Baixe em{" "}
            <a
              href={buildTurmasOfertadasUrl(getCurrentPeriodo())}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              prograd.ufabc.edu.br
            </a>{" "}
            e faça upload abaixo.
          </p>
          <input
            ref={offeringsFileRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onOfferingsUpload?.(file);
            }}
          />
          <button
            type="button"
            onClick={() => offeringsFileRef.current?.click()}
            className="mt-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-[0.65rem] font-black text-white shadow-sm transition hover:bg-emerald-400"
          >
            Upload PDF de turmas
          </button>
        </div>
      )}

      <div className="border-t border-slate-100">
        {suggestions.map((item, idx) => {
          const strip = Q_STRIP_COLORS[item.quadrimestre_ideal] ?? Q_STRIP_COLORS[5];

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
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="font-mono text-[0.6rem] font-semibold text-slate-400">{item.codigo}</span>
                  {item.creditos != null && (
                    <span className="text-[0.58rem] font-bold text-slate-400">
                      · {item.creditos}cr
                    </span>
                  )}
                  {item.turmasCount != null && (
                    <span className="text-[0.58rem] font-bold text-emerald-500">
                      · {item.turmasCount} turma{item.turmasCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Seta */}
              <svg viewBox="0 0 12 12" fill="none" className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Quadrimestre atual (home) ── */

const CONCEITO_BADGE = {
  A:  { bg: "bg-emerald-500", text: "text-white" },
  B:  { bg: "bg-blue-100",    text: "text-blue-700" },
  C:  { bg: "bg-amber-100",   text: "text-amber-700" },
  D:  { bg: "bg-orange-100",  text: "text-orange-700" },
  F:  { bg: "bg-rose-100",    text: "text-rose-700" },
  O:  { bg: "bg-rose-100",    text: "text-rose-700" },
};

const SITUACAO_LABEL = {
  APROVADO: "Aprovada",
  CONVALIDADO: "Aprovada",
  REPROVADO: "Reprovada",
  TRANCADO: "Trancada",
  CANCELADO: "Cancelada",
  MATRICULADO: "Em curso",
};

const SITUACAO_COLOR = {
  APROVADO: "text-emerald-600",
  CONVALIDADO: "text-emerald-600",
  REPROVADO: "text-rose-600",
  TRANCADO: "text-slate-400",
  CANCELADO: "text-slate-400",
  MATRICULADO: "text-blue-600",
};

function CurrentQuadCard({ quadrimesters, onOpenHistory }) {
  if (!quadrimesters || quadrimesters.length === 0) return null;

  /* Pegar o quadrimestre mais recente (já vem ordenado desc de groupByQuadrimester) */
  const quad = quadrimesters[0];
  const courses = quad.courses ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-emerald-600">
            Quadrimestre
          </p>
          <h2 className="text-[1rem] font-black leading-tight text-slate-950">
            {quad.label}
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <div className="flex items-baseline gap-0.5">
              <span className="font-display text-lg font-black leading-none text-emerald-600">
                {quad.approved}
              </span>
              <span className="text-[0.6rem] font-bold text-slate-300">/</span>
              <span className="text-sm font-black text-slate-400">{quad.total}</span>
            </div>
            <p className="text-[0.5rem] font-bold uppercase tracking-wide text-slate-400">
              aprovadas
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Lista de matérias ── */}
      <div className="divide-y divide-slate-100">
        {courses.map((course) => {
          const sitKey = (course.situacao ?? "").toUpperCase();
          const sitLabel = SITUACAO_LABEL[sitKey] ?? course.situacao ?? "—";
          const sitColor = SITUACAO_COLOR[sitKey] ?? "text-slate-400";
          const conceitoKey = course.conceito ?? "—";
          const badge = CONCEITO_BADGE[conceitoKey] ?? { bg: "bg-slate-100", text: "text-slate-500" };

          return (
            <div key={`${course.codigo}-${course.ano_quadrimestre}`} className="flex items-center gap-3 px-4 py-2.5">
              {/* Conceito badge */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.7rem] font-black ${badge.bg} ${badge.text}`}>
                {conceitoKey}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.78rem] font-bold text-slate-900">{course.nome}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="font-mono text-[0.58rem] font-semibold text-slate-400">{course.codigo}</span>
                  <span className={`text-[0.58rem] font-bold ${sitColor}`}>{sitLabel}</span>
                </div>
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
  const sectionRefs = useRef({});

  /* Mais recentes primeiro */
  const quads = useMemo(
    () => [...(dashboard.quadrimesters ?? [])].reverse(),
    [dashboard.quadrimesters],
  );

  function scrollToQuad(label) {
    const el = sectionRefs.current[label];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="flex flex-col gap-4">
      <PageHeading eyebrow="Historico" title="Sua linha academica" />

      {/* ── Nav pills de quadrimestres ── */}
      {quads.length > 1 && (
        <div className="sticky top-0 z-20 -mx-4 bg-[#f4fbf7]/90 px-4 pb-2 pt-1 backdrop-blur-sm">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {quads.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => scrollToQuad(q.label)}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.62rem] font-black text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ProgressoEixos axes={dashboard.axesProgress} />

      {quads.map((quadri) => (
        <QuadriSection
          key={quadri.label}
          quadrimester={quadri}
          sectionRef={(el) => {
            sectionRefs.current[quadri.label] = el;
          }}
        />
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
