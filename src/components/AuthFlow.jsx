import { useState } from "react";
import { signInWithGoogle } from "../services/supabase-auth.js";

export function AuthFlow({ onAuthenticated }) {
  const [screen, setScreen] = useState("login");

  if (screen === "login")
    return (
      <LoginScreen
        onLogin={onAuthenticated}
        onGoSignup={() => setScreen("signup")}
        onGoForgot={() => setScreen("forgot")}
      />
    );
  if (screen === "signup")
    return <SignupScreen onSignup={onAuthenticated} onGoLogin={() => setScreen("login")} />;
  if (screen === "forgot")
    return <ForgotScreen onGoLogin={() => setScreen("login")} />;
}

/* ──────────────────────────────────────────── helpers ─── */

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-xs font-black text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
        CU
      </span>
      <span className="font-display text-lg font-black tracking-tight text-slate-950">
        Core<span className="text-emerald-500">UFABC</span>
      </span>
    </div>
  );
}

function Field({ id, label, type = "text", placeholder, autoComplete }) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/15"
      />
    </label>
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      type="submit"
      onClick={onClick}
      className="min-h-12 w-full rounded-2xl bg-emerald-500 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_36px_rgba(16,185,129,0.30)] transition hover:bg-emerald-400 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold text-slate-400">ou continue com</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function SocialButtons() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // signInWithGoogle redirects the page — nothing more to do here
    } catch (err) {
      setError("Não foi possível conectar ao Google. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Google logo SVG */}
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {loading ? "Redirecionando..." : "Entrar com email UFABC"}
      </button>

      {error && (
        <p className="text-center text-xs font-semibold text-rose-600">{error}</p>
      )}

      <p className="text-center text-[0.65rem] font-medium text-slate-400">
        Use seu email <span className="font-bold text-slate-500">@aluno.ufabc.edu.br</span>
      </p>
    </div>
  );
}

function AuthShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* blobs de fundo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="absolute bottom-24 left-0 h-40 w-40 rounded-full bg-emerald-100/40 blur-2xl" />
        {/* grid sutil */}
        <div className="absolute inset-0 opacity-[0.25] [background-image:linear-gradient(rgba(16,185,129,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,.10)_1px,transparent_1px)] [background-size:30px_30px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[30rem] flex-col px-6 pb-10 pt-10">
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── telas ─── */

function LoginScreen({ onLogin, onGoSignup, onGoForgot }) {
  return (
    <AuthShell>
      <Logo />

      <div className="mt-10">
        <h1 className="font-display text-3xl font-black text-slate-950">Bem-vindo!</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Acesse seu histórico acadêmico UFABC.
        </p>
      </div>

      {/* ── Login principal: email UFABC ── */}
      <div className="mt-8 flex flex-col gap-4">
        <SocialButtons />
      </div>

      {/* ── Divisor opcional ── */}
      <div className="mt-6 flex flex-col gap-4">
        <Divider />

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}
        >
          <Field id="login-ra" label="RA ou e-mail" type="text" placeholder="11202600000" autoComplete="username" />
          <Field id="login-senha" label="Senha" type="password" placeholder="••••••••" autoComplete="current-password" />

          <div className="text-right">
            <button
              type="button"
              onClick={onGoForgot}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-500"
            >
              Esqueci minha senha
            </button>
          </div>

          <PrimaryButton>Entrar</PrimaryButton>
        </form>
      </div>
    </AuthShell>
  );
}

function SignupScreen({ onSignup, onGoLogin }) {
  return (
    <AuthShell>
      <Logo />

      <div className="mt-10">
        <h1 className="font-display text-3xl font-black text-slate-950">Criar conta</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Conecte seu RA e acompanhe tudo em um lugar.
        </p>
      </div>

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSignup();
        }}
      >
        <Field id="signup-nome" label="Nome completo" type="text" placeholder="Maria da Silva" autoComplete="name" />
        <Field id="signup-ra" label="RA UFABC" type="text" placeholder="11202600000" autoComplete="username" />
        <Field id="signup-senha" label="Senha" type="password" placeholder="••••••••" autoComplete="new-password" />
        <Field id="signup-confirm" label="Confirmar senha" type="password" placeholder="••••••••" autoComplete="new-password" />

        <p className="text-xs leading-5 text-slate-400">
          Ao criar conta, você aceita os termos de uso e a política de privacidade do CoreUFABC.
        </p>

        <PrimaryButton>Criar conta</PrimaryButton>
      </form>

      <p className="mt-8 text-center text-sm font-semibold text-slate-500">
        Já tem acesso?{" "}
        <button
          type="button"
          onClick={onGoLogin}
          className="font-black text-emerald-600 hover:text-emerald-500"
        >
          Fazer login
        </button>
      </p>
    </AuthShell>
  );
}

function ForgotScreen({ onGoLogin }) {
  const [sent, setSent] = useState(false);

  return (
    <AuthShell>
      <button
        type="button"
        onClick={onGoLogin}
        className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-emerald-600"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar ao login
      </button>

      <div className="mt-8">
        <h1 className="font-display text-3xl font-black text-slate-950">Recuperar acesso</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Vamos enviar as instruções ao seu e-mail institucional.
        </p>
      </div>

      {sent ? (
        <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-bold text-emerald-700">
            Instruções enviadas! Verifique sua caixa de entrada.
          </p>
          <button
            type="button"
            onClick={onGoLogin}
            className="mt-4 text-sm font-black text-emerald-600 hover:text-emerald-500"
          >
            Voltar ao login →
          </button>
        </div>
      ) : (
        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <Field
            id="forgot-email"
            label="E-mail institucional"
            type="email"
            placeholder="ra@aluno.ufabc.edu.br"
            autoComplete="email"
          />
          <PrimaryButton>Enviar instruções</PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}
