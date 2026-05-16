import { buildScheduleGridData } from "../../utils/grade-planner.js";

const DIAS = [1, 2, 3, 4, 5, 6];
const DIA_LABELS = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

// All half-hour slots from 08:00 to 23:00
const HORAS = [];
for (let h = 8; h <= 22; h++) {
  HORAS.push(`${String(h).padStart(2, "0")}:00`);
  HORAS.push(`${String(h).padStart(2, "0")}:30`);
}
HORAS.push("23:00");

/**
 * Visual schedule grid showing Semana A and Semana B side by side (or stacked on mobile).
 *
 * Props:
 *   selectedTurmas – array of turma objects with _cor injected
 */
export function ScheduleGrid({ selectedTurmas }) {
  const { semanaA, semanaB } = buildScheduleGridData(selectedTurmas, DIAS, HORAS);

  return (
    <div className="flex flex-col gap-4">
      <GridWeek label="Semana A" gridData={semanaA} />
      <GridWeek label="Semana B" gridData={semanaB} />
    </div>
  );
}

function GridWeek({ label, gridData }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: "26rem" }}>
          {/* Day headers */}
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: "3rem repeat(6, 1fr)" }}>
            <div className="border-r border-slate-100 px-1 py-1.5" /> {/* empty corner */}
            {DIAS.map((dia) => (
              <div key={dia} className="border-r border-slate-100 py-1.5 text-center last:border-r-0">
                <span className="text-[0.6rem] font-black text-slate-400">{DIA_LABELS[dia]}</span>
              </div>
            ))}
          </div>

          {/* Time rows */}
          <GridBody gridData={gridData} />
        </div>
      </div>
    </div>
  );
}

function GridBody({ gridData }) {
  // Build a flat list of rows keyed by hora
  // Track which cells are continuations (to skip rendering)
  const skipMap = new Set(); // "dia-hora" keys that are continuation cells

  // Pre-compute skipMap
  for (const hora of HORAS) {
    for (const dia of DIAS) {
      const cell = gridData[dia]?.[hora];
      if (cell && !cell.continuation && cell.spanSlots > 1) {
        const startIdx = HORAS.indexOf(hora);
        for (let i = 1; i < cell.spanSlots; i++) {
          if (startIdx + i < HORAS.length) {
            skipMap.add(`${dia}-${HORAS[startIdx + i]}`);
          }
        }
      }
    }
  }

  return (
    <div>
      {HORAS.map((hora, horaIdx) => {
        // Show label only on the hour (not :30)
        const isOnHour = hora.endsWith(":00");
        const showLabel = isOnHour;

        return (
          <div
            key={hora}
            className="grid"
            style={{ gridTemplateColumns: "3rem repeat(6, 1fr)" }}
          >
            {/* Time label */}
            <div className={`border-r border-slate-100 flex items-start justify-end pr-1.5 pt-0.5 ${isOnHour ? "border-t border-slate-100" : ""}`}>
              {showLabel && (
                <span className="text-[0.52rem] font-semibold text-slate-300 leading-none">{hora}</span>
              )}
            </div>

            {/* Day cells */}
            {DIAS.map((dia) => {
              const key = `${dia}-${hora}`;
              const cell = gridData[dia]?.[hora];

              // This cell is a continuation of a block rendered above — skip it
              if (skipMap.has(key)) {
                return <div key={dia} className={`border-r border-slate-100 last:border-r-0 ${isOnHour ? "border-t border-slate-100" : ""}`} style={{ height: "1rem" }} />;
              }

              // Empty cell
              if (!cell || cell.continuation) {
                return (
                  <div
                    key={dia}
                    className={`border-r border-slate-100 last:border-r-0 ${isOnHour ? "border-t border-slate-100" : ""}`}
                    style={{ height: "1rem" }}
                  />
                );
              }

              // Block start cell
              const blockHeightRem = cell.spanSlots * 1; // 1rem per slot
              return (
                <div
                  key={dia}
                  className={`relative border-r border-slate-100 last:border-r-0 overflow-hidden ${isOnHour ? "border-t border-slate-100" : ""}`}
                  style={{ height: `${blockHeightRem}rem` }}
                >
                  <div
                    className="absolute inset-0.5 rounded flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: cell.cor + "22", borderLeft: `2.5px solid ${cell.cor}` }}
                    title={cell.nome}
                  >
                    {cell.spanSlots >= 4 && (
                      <p
                        className="px-0.5 text-[0.44rem] font-black leading-tight text-center"
                        style={{ color: cell.cor, wordBreak: "break-word" }}
                      >
                        {cell.nome.split(" ").slice(0, 3).join(" ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
