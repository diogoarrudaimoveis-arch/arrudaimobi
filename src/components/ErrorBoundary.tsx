import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? `/${this.props.section}` : ""}]`, error);
    if (info.componentStack) {
      console.error("Component stack:", info.componentStack.substring(0, 500));
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "2rem",
          background: "#1a1a1a",
          color: "#ff6b6b",
          minHeight: "100vh",
          fontFamily: "monospace"
        }}>
          <h2 style={{ color: "#ff4444", marginBottom: "1rem" }}>
            💥 Erro em {this.props.section || "componente"}
          </h2>
          <pre style={{ fontSize: "0.75rem", color: "#ff8888", whiteSpace: "pre-wrap" }}>
            {this.state.error?.message || "Erro desconhecido"}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}