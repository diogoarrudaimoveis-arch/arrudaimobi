import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register service worker for automatic updates
registerSW({ immediate: true });

// Wrap App in ErrorBoundary to prevent crashes from rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: '2rem', textAlign: 'center' } },
        'Erro ao carregar aplicacao. ',
        React.createElement('button', {
          onClick: () => window.location.reload(),
          style: { padding: '0.5rem 1rem', cursor: 'pointer' }
        }, 'Recarregar pagina')
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));