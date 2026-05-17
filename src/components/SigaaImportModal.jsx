import { useRef, useState } from "react";
import { parseSigaaAcademicRecordText, parseSigaaPdfText } from "../services/sigaa-record-parser.js";

/**
 * Extracts positioned text items from a PDF so the parser can use column
 * positions instead of fragile regex on flattened text.
 *
 * Returns { items: Array<{x, y, str}>, rawText: string }.
 * - `items`   — every non-empty text item with its (x, y) position.
 * - `rawText` — naive space-joined fallback (kept for the text parser).
 */
async function extractTextFromPdf(file) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allItems = [];
  let rawText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();
    const pageItems = [];

    // Offset y by page height so items from different pages don't overlap.
    // PDF y-coords are bottom-up within a page; by adding (numPages - i) * pageHeight
    // we ensure page 1 items have higher y than page 2, preserving top-to-bottom order.
    const yOffset = (pdf.numPages - i) * viewport.height;

    for (const item of content.items) {
      const str = item.str?.trim();
      if (!str) continue;
      pageItems.push({
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5] + yOffset),
        str,
      });
    }

    allItems.push(...pageItems);
    rawText += pageItems.map((it) => it.str).join(" ") + "\n";
  }

  return { items: allItems, rawText };
}

/**
 * Full-screen modal that lets a student import their SIGAA academic record.
 * Supports both PDF upload and text paste.
 *
 * Props:
 *   ra       - the RA being imported for (shown in the header)
 *   onImport - (parsedResult) => void
 *   onClose  - () => void
 */
export function SigaaImportModal({ ra, onImport, onClose }) {
  const [mode, setMode] = useState("pdf"); // "pdf" | "text"
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFileName, setPdfFileName] = useState(null);
  const fileInputRef = useRef(null);

  const processText = (rawText) => {
    setError(null);
    setPreview(null);

    if (rawText.trim().length < 30) {
      setError("Texto muito curto. Verifique se o arquivo contém o histórico completo.");
      return;
    }

    try {
      const result = parseSigaaAcademicRecordText(rawText);
      if (result.record.disciplinas.length === 0) {
        setError("Nenhuma disciplina encontrada. Verifique se é o histórico escolar completo.");
        return;
      }
      setPreview(result);
    } catch (err) {
      setError("Erro ao processar: " + err.message);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Selecione um arquivo PDF.");
      return;
    }

    setPdfLoading(true);
    setError(null);
    setPdfFileName(file.name);

    try {
      const extracted = await extractTextFromPdf(file);
      // Use position-aware PDF parser with structured items
      const result = parseSigaaPdfText(extracted);
      if (result.record.disciplinas.length === 0) {
        setError("Nenhuma disciplina encontrada. Verifique se é o histórico escolar completo.");
      } else {
        setPreview(result);
      }
    } catch (err) {
      setError("Não foi possível ler o PDF. Tente a opção de colar texto.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleParse = () => processText(text);

  const handleConfirm = () => {
    if (preview) onImport(preview);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4fbf7]" style={{ maxWidth: "30rem", margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
          aria-label="Fechar"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-emerald-500">Importar</p>
          <h2 className="text-[0.95rem] font-black text-slate-950 leading-tight">Historico SIGAA</h2>
        </div>
        {ra && (
          <span className="ml-auto rounded-lg bg-emerald-100 px-2 py-1 text-[0.6rem] font-black text-emerald-700">
            RA {ra}
          </span>
        )}
      </div>

      {/* Instructions */}
      <div className="border-b border-slate-100 bg-white/80 px-4 py-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
          <p className="text-[0.7rem] font-bold text-emerald-800">
            <strong className="font-black">Como importar:</strong>
          </p>
          <ol className="mt-1.5 list-inside list-decimal text-[0.65rem] font-medium text-emerald-700 leading-relaxed space-y-0.5">
            <li>
              Abra o{" "}
              <a
                href="https://sig.ufabc.edu.br/sigaa/portais/discente/discente.jsf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                SIGAA
              </a>
              {" "}→ Ensino → <strong>Emitir Histórico</strong>
            </li>
            <li>Clique em <strong>Emitir PDF</strong> e salve o arquivo</li>
            <li>Faça o upload do PDF abaixo</li>
          </ol>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-slate-100 bg-white/80">
        <button
          type="button"
          onClick={() => { setMode("pdf"); setError(null); setPreview(null); }}
          className={`flex-1 py-2.5 text-[0.7rem] font-black uppercase tracking-[0.12em] transition ${
            mode === "pdf"
              ? "border-b-2 border-emerald-500 text-emerald-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => { setMode("text"); setError(null); setPreview(null); }}
          className={`flex-1 py-2.5 text-[0.7rem] font-black uppercase tracking-[0.12em] transition ${
            mode === "text"
              ? "border-b-2 border-emerald-500 text-emerald-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Colar Texto
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {preview ? (
          <ImportPreview result={preview} onConfirm={handleConfirm} onRetry={() => { setPreview(null); setPdfFileName(null); }} />
        ) : mode === "pdf" ? (
          /* ── PDF upload ── */
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={handlePdfUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pdfLoading}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-10 text-center transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60"
            >
              {pdfLoading ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                  <p className="text-sm font-bold text-emerald-600">Lendo PDF...</p>
                </>
              ) : pdfFileName ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-emerald-500" aria-hidden="true">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm font-bold text-emerald-700">{pdfFileName}</p>
                  <p className="text-xs font-medium text-emerald-500">Clique para trocar o arquivo</p>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-emerald-400" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M12 18v-6M9 15l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <p className="text-sm font-black text-slate-700">Selecione o PDF do histórico</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">historico_XXXXXXXXXX.pdf</p>
                  </div>
                </>
              )}
            </button>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[0.65rem] font-bold text-rose-600">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Text paste ── */
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o texto copiado do SIGAA (Ctrl+A → Ctrl+C na página do histórico)..."
              className="h-48 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />

            {error && (
              <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-[0.65rem] font-bold text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleParse}
              disabled={text.trim().length < 30}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              Processar texto
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ImportPreview({ result, onConfirm, onRetry }) {
  const { record, warnings, importHealth } = result;
  const { disciplinas } = record;
  const approved = disciplinas.filter((d) => d.situacao === "APROVADO");
  const failed = disciplinas.filter((d) => d.situacao === "REPROVADO");
  const other = disciplinas.filter((d) => d.situacao !== "APROVADO" && d.situacao !== "REPROVADO");

  const healthColor =
    importHealth.level === "success" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    importHealth.level === "warning" ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <div className="flex flex-col gap-3">
      <div className={`rounded-xl border p-3 ${healthColor}`}>
        <p className="text-[0.65rem] font-bold">{importHealth.message}</p>
      </div>

      {record.aluno.nome && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-400">Aluno detectado</p>
          <p className="mt-0.5 text-sm font-black text-slate-950">{record.aluno.nome}</p>
          {record.aluno.curso_ingresso && (
            <p className="text-xs font-semibold text-slate-500">{record.aluno.curso_ingresso}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Aprovadas" value={approved.length} color="text-emerald-600" />
        <StatCard label="Reprovadas" value={failed.length} color="text-rose-600" />
        <StatCard label="Outras" value={other.length} color="text-slate-500" />
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[0.6rem] font-black text-amber-700">
            {warnings.length} linha(s) nao reconhecida(s)
          </p>
          <ul className="mt-1 space-y-0.5">
            {warnings.slice(0, 3).map((w, i) => (
              <li key={i} className="text-[0.58rem] font-medium text-amber-600 truncate">{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
        >
          Tentar novamente
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-emerald-500 py-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-2 text-center">
      <p className="text-[0.55rem] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-black ${color}`}>{value}</p>
    </div>
  );
}
