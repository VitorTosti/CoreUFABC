import { useState, useMemo, useCallback } from "react";
import { searchTurmas } from "../../services/turmas-service.js";
import { hasConflictWithSelected } from "../../utils/grade-planner.js";
import { TurmaCard } from "./TurmaCard.jsx";

const CAMPUS_OPTIONS = [
  { value: null,   label: "Todos" },
  { value: 74079,  label: "Santo André" },
  { value: 74116,  label: "São Bernardo" },
];

const TURNO_OPTIONS = [
  { value: null,       label: "Todos" },
  { value: "diurno",  label: "Diurno" },
  { value: "noturno", label: "Noturno" },
];

const PAGE_SIZE = 30;

/**
 * Full-screen modal for searching and selecting turmas.
 *
 * Props:
 *   selectedTurmas – current selection array
 *   onToggle       – (turma) => void – add or remove from selection
 *   onClose        – () => void
 */
export function TurmaSearchModal({ selectedTurmas, onToggle, onClose }) {
  const [query, setQuery] = useState("");
  const [campus, setCampus] = useState(null);
  const [turno, setTurno] = useState(null);
  const [page, setPage] = useState(1);

  const selectedIds = useMemo(() => new Set(selectedTurmas.map((t) => t.id)), [selectedTurmas]);

  const results = useMemo(() => {
    setPage(1); // reset page on filter change
    return searchTurmas(query, { campus, turno });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, campus, turno]);

  const paginated = useMemo(() => results.slice(0, page * PAGE_SIZE), [results, page]);

  const handleToggle = useCallback(
    (turma) => {
      onToggle(turma);
    },
    [onToggle]
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4fbf7]" style={{ maxWidth: "30rem", margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
          aria-label="Fechar modal"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-emerald-500">Planner</p>
          <h2 className="text-[0.95rem] font-black text-slate-950 leading-tight">Buscar turmas</h2>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[0.58rem] font-bold text-slate-400">{results.length} encontradas</p>
          <p className="text-[0.58rem] font-bold text-emerald-600">{selectedTurmas.length} selecionadas</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-white/80 px-4 py-3">
        {/* Search input */}
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            placeholder="Nome ou código da disciplina..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <FilterGroup
            label="Campus"
            options={CAMPUS_OPTIONS}
            value={campus}
            onChange={setCampus}
          />
          <FilterGroup
            label="Turno"
            options={TURNO_OPTIONS}
            value={turno}
            onChange={setTurno}
          />
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-[0.82rem] font-black text-slate-400">Nenhuma turma encontrada</p>
            <p className="text-[0.65rem] font-medium text-slate-300">Tente buscar por outro nome ou código</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginated.map((turma) => {
              const isSelected = selectedIds.has(turma.id);
              const hasConflict = !isSelected && hasConflictWithSelected(turma, selectedTurmas);
              return (
                <TurmaCard
                  key={turma.id}
                  turma={turma}
                  isSelected={isSelected}
                  hasConflict={hasConflict}
                  onToggle={() => handleToggle(turma)}
                />
              );
            })}

            {/* Load more */}
            {paginated.length < results.length && (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white py-3 text-[0.75rem] font-black text-emerald-600 transition hover:bg-emerald-50"
              >
                Carregar mais ({results.length - paginated.length} restantes)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-emerald-500 py-3 text-[0.82rem] font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          Confirmar seleção ({selectedTurmas.length})
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="flex gap-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 rounded-lg py-1 text-[0.6rem] font-black transition ${
                active
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
