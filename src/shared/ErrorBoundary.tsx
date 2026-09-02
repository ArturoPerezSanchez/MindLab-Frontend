import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, Undo2 } from "lucide-react";

type Props = {
  children: ReactNode;
  resetKey?: string;
};

type State = {
  error: Error | null;
};

/** Keeps one broken route from turning the whole application into a blank page. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("MindLab route failed", error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="error-boundary" role="alert" aria-labelledby="error-boundary-title">
        <p className="error-boundary-eyebrow">Unexpected error</p>
        <h1 id="error-boundary-title">This screen could not be displayed.</h1>
        <p>Your game data on the server is safe. Reload this screen or return to the menu.</p>
        <div className="error-boundary-actions">
          <button type="button" onClick={() => window.location.reload()}>
            <RotateCcw aria-hidden="true" size={17} /> Reload
          </button>
          <a href="#/">
            <Undo2 aria-hidden="true" size={17} /> Return to menu
          </a>
        </div>
      </main>
    );
  }
}
