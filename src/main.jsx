import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import "./styles/index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4fbf7] px-6">
          <div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-black text-rose-700">Ocorreu um erro inesperado</p>
            <p className="mt-1 text-xs font-mono text-rose-500 break-all">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
