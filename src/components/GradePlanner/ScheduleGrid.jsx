import { buildScheduleGridData } from "../../utils/grade-planner.js";

const DIAS = [1, 2, 3, 4, 5, 6];
const DIA_LABELS = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };

/** Slots de 30 min — 08:00 até 23:00 */
const ALL_HORAS = [];
for (let h = 8; h <= 22; h++) {
  ALL_HORAS.push(`${String(h).padStart(2, "0")}:00`);
  ALL_HORAS.push(`${String(h).padStart(2, "0")}:30`);
}
ALL_HORAS.push("23:00");

/** Altura de cada slot de 30 min em px */
const SLOT_H = 28;

/**
 * Retorna [startIdx, endIdx] do range ocupado (sem buffer extra).
 */
function getOccupiedRange(gridData) {
  let first = ALL_HORAS.length;
  let last = -1;

  for (const dia of DIAS) {
    for (let i = 0; i < ALL_HORAS.length; i++) {
      const cell = gridData[dia]?.[ALL_HORAS[i]];
      if (!cell || cell.continuation) continue;
      if (i < first) first = i;
      const end = i + (cell.spanSlots ?? 1) - 1;
      if (end > last) last = end;
    }
  }

  if (first > last) return null;

  /* Expandir para a hora cheia mais próxima (alinha os labels) */
  while (first > 0 && !ALL_HORAS[first].endsWith(":00")) first--;
  if (last + 1 < ALL_HORAS.length) last++;

  return { start: first, end: last };
}

/** Quais dias têm aulas */
function getActiveDays(gridData) {
  const days = [];
  for (const dia of DIAS) {
    for (const hora of ALL_HORAS) {
      const cell = gridData[dia]?.[hora];
      if (cell && !cell.continuation) { days.push(dia); break; }
    }
  }
  return days;
}

/** Limpa nome da turma */
function cleanNome(nome) {
  return (nome ?? "").replace(/\s+[A-Z]\d+[-\s].+$/, "").trim();
}

/** Abrevia nome */
function abbreviate(nome, maxLen) {
  if (nome.length <= maxLen) return nome;
  const words = nome.split(" ");
  let result = "";
  for (const w of words) {
    const next = result ? `${result} ${w}` : w;
    if (next.length > maxLen) break;
    result = next;
  }
  return result || words[0].slice(0, maxLen);
}

/* ════════════════════════════════════════════════════════════════════ */

export function ScheduleGrid({ selectedTurmas }) {
  const { semanaA, semanaB } = buildScheduleGridData(selectedTurmas, DIAS, ALL_HORAS);
  const rangeA = getOccupiedRange(semanaA);
  const rangeB = getOccupiedRange(semanaB);

  return (
    <div className="flex flex-col gap-3">
      <WeekGrid label="Semana A" gridData={semanaA} range={rangeA} dotColor="bg-emerald-400" />
      <WeekGrid label="Semana B" gridData={semanaB} range={rangeB} dotColor="bg-violet-400" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Grid semanal — cabe no container sem scroll
   ════════════════════════════════════════════════════════════════════ */

function WeekGrid({ label, gridData, range, dotColor }) {
  if (!range) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Header label={label} dotColor={dotColor} />
        <div className="flex items-center justify-center py-5">
          <p className="text-[0.68rem] font-semibold text-slate-400">Nenhuma aula nesta semana</p>
        </div>
      </div>
    );
  }

  const activeDays = getActiveDays(gridData);
  const cols = activeDays.length > 0 ? activeDays : [1, 2, 3, 4, 5];
  const numCols = cols.length;
  const visibleHoras = ALL_HORAS.slice(range.start, range.end + 1);
  const totalHeight = visibleHoras.length * SLOT_H;
  const gridCols = `2rem repeat(${numCols}, 1fr)`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Header label={label} dotColor={dotColor} count={`${activeDays.length} dias`} />

      {/* ── Cabeçalho dos dias ── */}
      <div
        className="grid border-b border-slate-200 bg-slate-50"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div />
        {cols.map((dia) => (
          <div key={dia} className="py-1.5 text-center">
            <span className="text-[0.6rem] font-black text-slate-500">{DIA_LABELS[dia]}</span>
          </div>
        ))}
      </div>

      {/* ── Grid body ── */}
      <div className="relative" style={{ height: totalHeight }}>
        {/* Horários + linhas */}
        {visibleHoras.map((hora, idx) => {
          const isHour = hora.endsWith(":00");
          return (
            <div key={hora} className="absolute left-0 right-0" style={{ top: idx * SLOT_H }}>
              {/* Linha horizontal */}
              <div className={`absolute left-8 right-0 ${isHour ? "border-t border-slate-200" : "border-t border-slate-50"}`} />
              {/* Label */}
              {isHour && (
                <span className="absolute left-0 mt-[-0.3rem] w-8 pr-1 text-right text-[0.5rem] font-bold tabular-nums text-slate-400">
                  {hora.slice(0, 2)}h
                </span>
              )}
            </div>
          );
        })}

        {/* Separadores verticais */}
        {cols.map((_, i) => (
          <div
            key={`sep-${i}`}
            className="absolute top-0 bottom-0 border-l border-slate-100"
            style={{ left: `calc(2rem + ${(i * 100) / numCols}%)` }}
          />
        ))}

        {/* Blocos de aula */}
        {cols.map((dia, colIdx) =>
          visibleHoras.map((hora, rowIdx) => {
            const cell = gridData[dia]?.[hora];
            if (!cell || cell.continuation) return null;

            const span = cell.spanSlots ?? 1;
            const hPx = span * SLOT_H;
            const nome = cleanNome(cell.nome);
            const canText = hPx >= 40;
            const canTime = hPx >= 70;
            const shortName = abbreviate(nome, numCols >= 5 ? 10 : numCols >= 3 ? 16 : 24);

            const colW = `calc((100% - 2rem) / ${numCols})`;
            const colLeft = `calc(2rem + ${colIdx} * ${colW})`;

            return (
              <div
                key={`${dia}-${hora}`}
                className="absolute overflow-hidden rounded"
                style={{
                  top: rowIdx * SLOT_H + 1,
                  height: hPx - 2,
                  left: `calc(2rem + ${(colIdx * 100) / numCols}% + 1px)`,
                  width: `calc(${100 / numCols}% - 2rem / ${numCols} - 2px)`,
                  backgroundColor: cell.cor + "18",
                  borderLeft: `2.5px solid ${cell.cor}`,
                }}
              >
                <div className="flex h-full flex-col justify-center overflow-hidden px-1 py-0.5">
                  {canText ? (
                    <>
                      <p
                        className="truncate text-[0.5rem] font-black leading-tight"
                        style={{ color: cell.cor }}
                      >
                        {shortName}
                      </p>
                      {canTime && (
                        <p className="mt-0.5 text-[0.42rem] font-semibold text-slate-400">{hora}</p>
                      )}
                    </>
                  ) : (
                    <div
                      className="mx-auto h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: cell.cor }}
                    />
                  )}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function Header({ label, dotColor, count }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
      {count && (
        <span className="text-[0.5rem] font-bold text-slate-400">{count}</span>
      )}
    </div>
  );
}
