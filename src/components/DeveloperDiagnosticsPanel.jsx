import { useMemo, useState } from "react";

import { passiveAuditStore } from "../services/passive-diagnostics.js";

const DEV_DIAGNOSTICS_FLAG = "coreufabc.devDiagnostics";

export function shouldShowDeveloperDiagnostics() {
  if (typeof window === "undefined") return false;

  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("diagnostics") === "1" || window.localStorage.getItem(DEV_DIAGNOSTICS_FLAG) === "true";
  } catch {
    return false;
  }
}

export function DeveloperDiagnosticsPanel({ auditStore = passiveAuditStore }) {
  const visible = useMemo(() => shouldShowDeveloperDiagnostics(), []);
  const [events, setEvents] = useState(() => auditStore.list());

  if (!visible) return null;

  function refresh() {
    setEvents(auditStore.list());
  }

  function downloadAuditLog() {
    const blob = new Blob([auditStore.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `coreufabc-diagnostics-${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearAuditLog() {
    auditStore.clear();
    refresh();
  }

  return (
    <aside className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-50 shadow-lg shadow-amber-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
            Modo desenvolvedor
          </p>
          <h2 className="mt-1 text-base font-bold text-white">Diagnostico passivo</h2>
          <p className="mt-1 text-amber-100/80">
            {events.length} evento{events.length === 1 ? "" : "s"} de importacao registrado{events.length === 1 ? "" : "s"} nesta sessao.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-amber-200/30 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-200/10"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={downloadAuditLog}
            className="rounded-md bg-amber-200 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-100"
          >
            Baixar JSON
          </button>
          <button
            type="button"
            onClick={clearAuditLog}
            className="rounded-md border border-red-300/30 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-400/10"
          >
            Limpar
          </button>
        </div>
      </div>
    </aside>
  );
}
