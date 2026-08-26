import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("World render error:", error); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ fontSize: 18, color: "var(--rose)" }}>This world hit a real data edge case.</h2>
          <p style={{ fontSize: 13, color: "var(--ink-dim)", maxWidth: 480 }}>
            {this.state.error.message}. Not silently ignored — pick another world from the rail above.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
