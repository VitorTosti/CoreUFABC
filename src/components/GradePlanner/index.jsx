import { useState, useCallback } from "react";
import { TURMA_COLORS, hasConflictWithSelected, totalCredits } from "../../utils/grade-planner.js";
import { ScheduleGrid } from "./ScheduleGrid.jsx";
import { SelectedTurmasList } from "./SelectedTurmasList.jsx";
import { TurmaSearchModal } from "./TurmaSearchModal.jsx";

/**
 * Main Grade Planner page component.
 * Manages selected turmas state and coordinates all sub-components.
 */
export function GradePlannerPage() {
  const [selectedTurmas, setSelectedTurmas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("grade"); // "grade" | "turmas"

  /** Assign a color to a turma when adding it */
  const colorForIndex = (idx) => TURMA_COLORS[idx % TURMA_COLORS.length];

  const handleToggleTurma = useCallback((turma) => {
    setSelectedTurmas((prev) => {
      const exists = prev.find((t) => t.id === turma.id);
      if (exists) {
        return prev.filter((t) => t.id !== turma.id);
      }
      // Check conflict before adding
      if (hasConflictWithSelected(turma, prev)) return prev;
      return [...prev, { ...turma, _cor: colorForIndex(prev.length) }];
    });
  }, []);

  const handleRemoveTurma = useCallback((turmaId) => {
    setSelectedTurmas((prev) => {
      const next = prev.filter((t) => t.id !== turmaId);
      // Re-assign colors to keep them stable after removal
      return next.map((t, idx) => ({ ...t, _cor: colorForIndex(idx) }));
    });
  }, []);

  const credits = totalCredits(selectedTurmas);

  return (
    <section className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-emerald-600">Matrícula</p>
          <h2 className="mt-1 font-display text-3xl font-black text-slate-950">Minha Grade</h2>
        </div>
        <div className="flex items-center gap-2">
          {credits > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-right">
              <p className="text-[0.5rem] font-black uppercase tracking-[0.16em] text-emerald-500">Créditos</p>
              <p className="text-[0.82rem] font-black text-emerald-700">{credits}/24</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-[0.68rem] font-black text-white shadow-[0_6px_18px_rgba(16,185,129,0.38)] transition hover:bg-emerald-400 active:scale-[0.97]"
            aria-label="Buscar turmas"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span>Buscar</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton active={activeTab === "grade"} onClick={() => setActiveTab("grade")} label="Grade horária" />
        <TabButton
          active={activeTab === "turmas"}
          onClick={() => setActiveTab("turmas")}
          label={`Minhas turmas${selectedTurmas.length > 0 ? ` (${selectedTurmas.length})` : ""}`}
        />
      </div>

      {/* Tab content */}
      {activeTab === "grade" && (
        <div>
          {selectedTurmas.length === 0 ? (
            <EmptyGridState onOpenSearch={() => setShowModal(true)} />
          ) : (
            <ScheduleGrid selectedTurmas={selectedTurmas} />
          )}
        </div>
      )}

      {activeTab === "turmas" && (
        <SelectedTurmasList
          selectedTurmas={selectedTurmas}
          totalCredits={credits}
          onRemove={handleRemoveTurma}
        />
      )}

      {/* Search Modal */}
      {showModal && (
        <TurmaSearchModal
          selectedTurmas={selectedTurmas}
          onToggle={handleToggleTurma}
          onClose={() => setShowModal(false)}
        />
      )}
    </section>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-[0.7rem] font-black transition-all duration-150 ${
        active
          ? "bg-emerald-500 text-white shadow-sm"
          : "text-slate-400 hover:text-emerald-600"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyGridState({ onOpenSearch }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-white/60 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-400" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
      </div>
      <div>
        <p className="text-[0.88rem] font-black text-slate-600">Grade vazia</p>
        <p className="mt-1 max-w-[14rem] text-[0.65rem] font-medium leading-snug text-slate-400">
          Adicione turmas para visualizar sua grade horária do quadrimestre.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenSearch}
        className="mt-1 rounded-xl bg-emerald-500 px-4 py-2 text-[0.72rem] font-black text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400"
      >
        Buscar turmas
      </button>
    </div>
  );
}
