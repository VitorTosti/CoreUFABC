export const AUTH_PREVIEW_PAGES = Object.freeze([
  {
    key: "sign-in",
    label: "Sign In",
    title: "Welcome Back!",
    fields: ["RA ou e-mail UFABC", "Senha"],
    action: "Entrar",
    footnote: "Ainda nao tem conta?",
    link: "Criar",
  },
  {
    key: "sign-up",
    label: "Sign Up",
    title: "Create an account",
    fields: ["RA ou e-mail UFABC", "Senha", "Confirmar senha"],
    action: "Criar conta",
    footnote: "Ja tenho acesso?",
    link: "Entrar",
  },
  {
    key: "forgot-password",
    label: "Forgot password",
    title: "Forgot password?",
    fields: ["Seu e-mail institucional"],
    action: "Enviar",
    footnote: "Lembrou a senha?",
    link: "Login",
  },
]);
