import { AUTH_PREVIEW_PAGES } from "../utils/auth-preview-pages.js";

export function AuthPreviewScreens() {
  return (
    <section className="rounded-[1.6rem] border border-pink-200/80 bg-white/72 p-3 shadow-[0_24px_90px_rgba(244,63,94,0.18)] backdrop-blur-xl">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-pink-500">Acesso Core</p>
          <h2 className="font-display text-xl font-black text-slate-950">Fluxo academico</h2>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-[0.62rem] font-black text-white">3 telas</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {AUTH_PREVIEW_PAGES.map((page) => (
          <AuthPhoneMockup key={page.key} page={page} />
        ))}
      </div>
    </section>
  );
}

function AuthPhoneMockup({ page }) {
  return (
    <article className="min-w-0">
      <p className="mb-2 text-center text-[0.64rem] font-bold text-slate-400">{page.label}</p>
      <div className="aspect-[9/19] overflow-hidden rounded-[0.18rem] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.14)] ring-1 ring-slate-200">
        <div className="flex h-4 items-center justify-between border-b border-slate-100 px-1.5 text-[0.32rem] font-black text-slate-950">
          <span>9:41</span>
          <span>••• ▰</span>
        </div>
        <div className="px-2.5 pt-2">
          <h3 className="text-[0.82rem] font-black leading-tight text-slate-950">{page.title}</h3>
          <div className="mt-3 flex flex-col gap-1.5">
            {page.fields.map((field) => (
              <label key={field} className="flex h-5 items-center gap-1 rounded-[0.18rem] border border-slate-200 bg-slate-50 px-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className="truncate text-[0.38rem] font-semibold text-slate-500">{field}</span>
              </label>
            ))}
          </div>
          {page.key === "sign-in" && (
            <p className="mt-1 text-right text-[0.36rem] font-semibold text-pink-500">Esqueci a senha?</p>
          )}
          {page.key === "sign-up" && (
            <p className="mt-1 text-[0.34rem] leading-snug text-slate-400">
              Ao criar conta, voce aceita as regras academicas do CoreUFABC.
            </p>
          )}
          <button className="mt-3 h-6 w-full rounded-[0.12rem] bg-pink-500 text-[0.45rem] font-black text-white" type="button">
            {page.action}
          </button>
          <div className="mt-4 text-center">
            <p className="text-[0.34rem] font-semibold text-slate-400">ou continue com</p>
            <div className="mt-2 flex justify-center gap-1.5">
              {["G", "UF", "f"].map((item) => (
                <span key={item} className="grid h-4 w-4 place-items-center rounded-full border border-slate-200 text-[0.38rem] font-black text-pink-500">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[0.34rem] font-semibold text-slate-400">
              {page.footnote} <span className="font-black text-pink-500">{page.link}</span>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
