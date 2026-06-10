import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// VitePWA auto-injects SW registration via injectRegister:"auto" in vite.config.ts
// Keep minimal manual registration as fallback for when SW auto-inject fails
// Only runs if virtual:pwa-register module is available (production build)
try {
  // Dynamic import to avoid errors in dev mode
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: false,
      onNeedRefresh() {
        const shouldUpdate = window.confirm("Nova versão disponível! Atualizar agora?");
        if (shouldUpdate) registerSW({ immediate: true });
      },
      onRegisterError(error) {
        console.warn("SW registration failed (non-critical):", error);
      }
    });
  }).catch(() => {
    // virtual:pwa-register not available (dev mode) — ignore
  });
} catch { /* ignore */ }

// Wrap App in ErrorBoundary to prevent crashes from rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error, info: null };
  }
  componentDidCatch(error, info) {
    console.error('Render error:', error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      const errorMsg = (this.state.error as Error)?.message || String(this.state.error);
      const stack = (this.state.error as Error)?.stack || '';
      return React.createElement('div', { style: { padding: '2rem', textAlign: 'center', fontFamily: 'monospace' } },
        React.createElement('h1', { style: { color: 'red' } }, 'Erro ao carregar aplicacao'),
        React.createElement('pre', { style: { textAlign: 'left', background: '#fee', padding: '1rem', borderRadius: '4px', overflow: 'auto' } },
          'ERROR: ' + errorMsg + '\n\nSTACK:\n' + stack
        ),
        React.createElement('button', {
          onClick: () => window.location.reload(),
          style: { padding: '0.5rem 1rem', cursor: 'pointer', marginTop: '1rem' }
        }, 'Recarregar pagina')
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));