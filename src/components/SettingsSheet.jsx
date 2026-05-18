import { useState } from "react";

const APP_VERSION = "0.1.0";

const CURSO_OPTIONS = [
  {
    key: "BCT",
    label: "BC&T",
    desc: "Bacharelado em Ciência e Tecnologia",
    bg: "bg-emerald-500",
    idle: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    active: "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)]",
  },
  {
    key: "BCH",
    label: "BC&H",
    desc: "Bacharelado em Ciências e Humanidades",
    idle: "border-blue-200 text-blue-700 hover:bg-blue-50",
    active: "bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.35)]",
  },
  {
    key: "LCN",
    label: "LCN",
    desc: "Licenciatura em Ciências da Natureza",
    idle: "border-teal-200 text-teal-700 hover:bg-teal-50",
    active: "bg-teal-500 text-white shadow-[0_4px_12px_rgba(20,184,166,0.35)]",
  },
  {
    key: "LCH",
    label: "LCH",
    desc: "Licenciatura em Ciências Humanas",
    idle: "border-cyan-200 text-cyan-700 hover:bg-cyan-50",
    active: "bg-cyan-500 text-white shadow-[0_4px_12px_rgba(6,182,212,0.35)]",
  },
];

/**
 * Bottom sheet de configurações do CoreUFABC.
 *
 * Props:
 *   student          – { ra, nome }
 *   selectedPlanKey  – "BCT" | "BCH" | "LCN" | "LCH"
 *   onSelectPlan     – (key) => void
 *   isLoadingRa      – boolean
 *   raStatus         – { type, message }
 *   onConnectRa      – (ra, senha?) => void
 *   onOpenImport     – () => void  (abre o SigaaImportModal)
 *   onClearData      – () => void  (reseta para demo)
 *   onClose          – () => void
 */
export function SettingsSheet({
  student,
  selectedPlanKey,
  onSelectPlan,
  isLoadingRa,
  raStatus,
  onConnectRa,
  onOpenImport,
  onClearData,
  onClose,
}) {
  const [raInput, setRaInput] = useState(student.ra);
  const [senhaInput, setSenhaInput] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [showTrocarRa, setShowTrocarRa] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

  const initials = student.nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const isDemo = !student.ra || student.ra === "00000000";
  const needsPassword = raStatus.type === "needPassword";

  const statusTone =
    raStatus.type === "error"
      ? "text-rose-600"
      : raStatus.type === "demo" || raStatus.type === "needPassword"
      ? "text-amber-600"
      : raStatus.type === "loading"
      ? "text-blue-600"
      : "text-emerald-600";

  const handleRaSubmit = (e) => {
    e.preventDefault();
    if (needsPassword) {
      onConnectRa(raInput, senhaInput);
      setSenhaInput("");
    } else {
      onConnectRa(raInput);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 z-50 flex max-h-[88vh] w-full max-w-[30rem] -translate-x-1/2 flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2">
          <h2 className="text-[1rem] font-black text-slate-950">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">

          {/* ── Seção: Perfil ── */}
          <SectionLabel>Perfil</SectionLabel>
          <div className="mb-4 flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {/* Avatar grande */}
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_4px_16px_rgba(16,185,129,0.35)]">
              <span className="text-[1.2rem] font-black text-white">{initials}</span>
              {isDemo && (
                <span className="absolute -right-1 -top-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-[0.45rem] font-black uppercase tracking-wide text-white shadow">
                  Demo
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.9rem] font-black text-slate-950">{student.nome}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-mono text-[0.62rem] font-bold text-emerald-700">
                  RA {student.ra}
                </span>
              </div>
              {isDemo && (
                <p className="mt-1 text-[0.58rem] font-medium text-amber-600">
                  Conecte seu RA real para ver seus dados
                </p>
              )}
            </div>
          </div>

          {/* ── Seção: Meu Curso ── */}
          <SectionLabel>Meu Curso</SectionLabel>
          <p className="mb-2.5 text-[0.62rem] font-medium leading-snug text-slate-500">
            Selecione seu ciclo básico. Isso destaca as disciplinas do seu currículo na Grade e no Planejamento.
          </p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {CURSO_OPTIONS.map((opt) => {
              const active = selectedPlanKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onSelectPlan(opt.key)}
                  className={`flex flex-col rounded-2xl border px-3.5 py-3 text-left transition ${
                    active ? opt.active + " border-transparent" : "border-slate-200 bg-white " + opt.idle
                  }`}
                >
                  <span className={`text-[0.82rem] font-black ${active ? "text-white" : ""}`}>
                    {opt.label}
                  </span>
                  <span className={`mt-0.5 text-[0.55rem] font-medium leading-snug ${active ? "text-white/80" : "text-slate-400"}`}>
                    {opt.desc}
                  </span>
                  {active && (
                    <span className="mt-1.5 text-[0.5rem] font-black uppercase tracking-widest text-white/70">
                      ✓ Selecionado
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Seção: Conta ── */}
          <SectionLabel>Conta</SectionLabel>
          <div className="mb-4 flex flex-col gap-2">

            {/* Trocar RA */}
            <button
              type="button"
              onClick={() => setShowTrocarRa((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-emerald-600" aria-hidden="true">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-[0.8rem] font-bold text-slate-700">Trocar RA</span>
              </div>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={`h-4 w-4 text-slate-400 transition-transform ${showTrocarRa ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showTrocarRa && (
              <form
                onSubmit={handleRaSubmit}
                className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3"
              >
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={raInput}
                    inputMode="numeric"
                    onChange={(e) => setRaInput(e.target.value)}
                    className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                    placeholder="Digite seu RA"
                  />
                  {!needsPassword && (
                    <button
                      type="submit"
                      disabled={isLoadingRa}
                      className="min-h-10 rounded-xl bg-emerald-500 px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-400 disabled:bg-slate-300 disabled:text-slate-400"
                    >
                      {isLoadingRa ? "…" : "Conectar"}
                    </button>
                  )}
                </div>

                {needsPassword && (
                  <>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                      <p className="text-[0.6rem] font-black text-amber-800">Aviso de privacidade</p>
                      <p className="mt-0.5 text-[0.58rem] leading-snug text-amber-700">
                        Sua senha será usada <strong>uma única vez</strong> para importar seu histórico do SIGAA e{" "}
                        <strong>não será armazenada</strong> em nenhum banco de dados.
                      </p>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="password"
                        value={senhaInput}
                        onChange={(e) => setSenhaInput(e.target.value)}
                        autoComplete="off"
                        className="min-h-10 rounded-xl border border-amber-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-400"
                        placeholder="Senha do SIGAA"
                      />
                      <button
                        type="submit"
                        disabled={isLoadingRa || !senhaInput || !aceitouTermos}
                        className="min-h-10 rounded-xl bg-emerald-500 px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-400 disabled:bg-slate-300 disabled:text-slate-400"
                      >
                        {isLoadingRa ? "…" : "Importar"}
                      </button>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 px-1">
                      <input
                        type="checkbox"
                        checked={aceitouTermos}
                        onChange={(e) => setAceitouTermos(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-500"
                      />
                      <span className="text-[0.58rem] leading-snug text-slate-500">
                        Li e entendo que minha senha será usada apenas para esta importação e não será salva.
                      </span>
                    </label>
                  </>
                )}

                {raStatus.message && raStatus.type !== "needPassword" && (
                  <p className={`text-[0.7rem] font-bold ${statusTone}`}>{raStatus.message}</p>
                )}
              </form>
            )}

            {/* Importar via SIGAA */}
            <button
              type="button"
              onClick={() => { onOpenImport?.(); onClose(); }}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-blue-600" aria-hidden="true">
                    <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[0.8rem] font-bold text-slate-700">Importar via SIGAA</p>
                  <p className="text-[0.58rem] font-medium text-slate-400">Atualiza seu histórico acadêmico</p>
                </div>
              </div>
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-slate-300" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* ── Seção: Sobre ── */}
          <SectionLabel>Sobre o App</SectionLabel>
          <div className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <InfoRow
              icon={
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
                  <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
              label="Versão"
              value={`CoreUFABC v${APP_VERSION}`}
            />
            <div className="h-px bg-slate-50" />
            <InfoRow
              icon={
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
                  <path d="M8 2C4.686 2 2 4.686 2 8c0 2.65 1.718 4.9 4.1 5.693.3.055.41-.13.41-.288 0-.142-.005-.52-.008-1.02-1.67.363-2.021-.805-2.021-.805-.273-.693-.666-0.878-.666-.878-.545-.372.04-.365.04-.365.601.042.918.617.918.617.535.916 1.403.651 1.745.498.054-.387.21-.652.38-.801-1.331-.152-2.731-.666-2.731-2.96 0-.654.233-1.188.617-1.607-.062-.151-.268-.76.058-1.584 0 0 .503-.161 1.648.615A5.75 5.75 0 018 5.3c.51.002 1.022.069 1.501.202 1.144-.776 1.647-.615 1.647-.615.327.824.121 1.433.06 1.584.384.419.616.953.616 1.607 0 2.3-1.402 2.807-2.737 2.955.215.185.407.55.407 1.109 0 .8-.007 1.444-.007 1.641 0 .16.108.346.412.287C12.283 12.897 14 10.648 14 8c0-3.314-2.686-6-6-6z" fill="currentColor"/>
                </svg>
              }
              label="Código fonte"
              value="github.com/VitorTosti/CoreUFABC"
              href="https://github.com/VitorTosti/CoreUFABC"
            />
            <div className="h-px bg-slate-50" />
            <InfoRow
              icon={
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
                  <path d="M8 14A6 6 0 108 2a6 6 0 000 12z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5.5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Dados de matrícula"
              value="ufabc-next · API pública"
            />
          </div>

          {/* ── Seção: Zona de perigo ── */}
          <SectionLabel danger>Zona de Perigo</SectionLabel>
          <div className="mb-2 flex flex-col gap-2">
            {!showDanger ? (
              <button
                type="button"
                onClick={() => setShowDanger(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-left transition hover:bg-rose-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100">
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-rose-600" aria-hidden="true">
                    <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M8 6v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[0.8rem] font-bold text-rose-700">Limpar dados locais</p>
                  <p className="text-[0.58rem] font-medium text-rose-400">Remove histórico e volta ao modo demo</p>
                </div>
              </button>
            ) : (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
                <p className="text-[0.75rem] font-black text-rose-800">Tem certeza?</p>
                <p className="mt-0.5 text-[0.62rem] font-medium leading-snug text-rose-600">
                  Seu histórico acadêmico local será apagado. Esta ação não pode ser desfeita.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDanger(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-[0.7rem] font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => { onClearData?.(); onClose(); }}
                    className="flex-1 rounded-xl bg-rose-500 py-2 text-[0.7rem] font-black text-white transition hover:bg-rose-600"
                  >
                    Sim, limpar
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

/* ── Sub-componentes internos ─────────────────────────────────────────────── */

function SectionLabel({ children, danger = false }) {
  return (
    <p className={`mb-2 mt-1 text-[0.55rem] font-black uppercase tracking-[0.2em] ${danger ? "text-rose-400" : "text-slate-400"}`}>
      {children}
    </p>
  );
}

function InfoRow({ icon, label, value, href }) {
  const content = (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50">
          {icon}
        </div>
        <p className="text-[0.8rem] font-semibold text-slate-600">{label}</p>
      </div>
      <p className={`text-[0.68rem] font-bold ${href ? "text-emerald-600" : "text-slate-400"}`}>
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block transition hover:bg-slate-50">
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}
