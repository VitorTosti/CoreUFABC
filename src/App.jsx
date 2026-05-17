import { useEffect, useState } from "react";

import { AcademicMobileApp } from "./components/AcademicMobileApp.jsx";
import { AuthFlow } from "./components/AuthFlow.jsx";
import { RaLinkScreen } from "./components/RaLinkScreen.jsx";
import { useAcademicDashboard } from "./hooks/useAcademicDashboard.js";
import { fetchHistoricoByRa } from "./services/supabase.js";
import { getSession, onAuthStateChange, extractRaFromEmail } from "./services/supabase-auth.js";
import initialAcademicHistory from "./data/mock-academic-history.json";

export default function App() {
  const [session, setSession]                 = useState(undefined); // undefined = loading
  const [academicHistory, setAcademicHistory] = useState(initialAcademicHistory);
  const [autoLoadStatus, setAutoLoadStatus]   = useState(null);
  const [linkedRa, setLinkedRa]               = useState(null);
  const dashboard = useAcademicDashboard(academicHistory);

  // ── On mount: restore session + handle OAuth redirect ──
  useEffect(() => {
    getSession().then(setSession);
    const unsubscribe = onAuthStateChange(setSession);
    return unsubscribe;
  }, []);

  // ── When session arrives, auto-load by RA embedded in email ──
  useEffect(() => {
    if (!session?.user?.email) return;

    const ra = extractRaFromEmail(session.user.email);

    if (!ra) {
      // Email sem RA numérico → pede o RA manualmente
      setAutoLoadStatus("need-ra");
      return;
    }

    setLinkedRa(ra);
    setAutoLoadStatus("loading");
    fetchHistoricoByRa(ra)
      .then((dados) => {
        if (dados) {
          setAcademicHistory(dados);
          setAutoLoadStatus("ok");
        } else {
          setAutoLoadStatus("not-found");
        }
      })
      .catch(() => setAutoLoadStatus("not-found"));
  }, [session?.user?.email]);

  // ── Still checking session ──
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4fbf7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // ── Not logged in ──
  if (!session) {
    return <AuthFlow onAuthenticated={() => {}} />;
  }

  // ── Logged in but needs RA (email sem números) ──
  if (autoLoadStatus === "need-ra") {
    return (
      <RaLinkScreen
        email={session.user.email}
        onRaConfirmed={(ra, dados) => {
          setLinkedRa(ra);
          if (dados) {
            setAcademicHistory(dados);
            setAutoLoadStatus("ok");
          } else {
            // RA não encontrado no Supabase → abre o app e dispara importação
            setAutoLoadStatus("not-found");
          }
        }}
      />
    );
  }

  // ── Loading academic data ──
  if (autoLoadStatus === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4fbf7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm font-bold text-slate-500">Carregando seu histórico...</p>
      </div>
    );
  }

  // ── Logged in — show the app ──
  // Se autoLoadStatus === "not-found", passa o RA para o app abrir o modal de importação
  return (
    <AcademicMobileApp
      session={session}
      initialRa={linkedRa}
      autoLoadStatus={autoLoadStatus}
      dashboard={dashboard}
      academicHistory={academicHistory}
      fallbackAcademicHistories={[initialAcademicHistory]}
      onAcademicHistoryLoaded={setAcademicHistory}
    />
  );
}
