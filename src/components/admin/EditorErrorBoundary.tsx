import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Local error boundary for editor surfaces. Keeps a crash contained to the
 * editor pane and shows the underlying reason instead of blanking the page.
 */
class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("EditorErrorBoundary caught an error", error, info.componentStack);
  }

  handleRetry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <div className="flex items-start gap-2 text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-2">
            <p className="font-medium">
              {this.props.label ?? "The editor"} failed to load.
            </p>
            <p className="font-mono text-xs break-words text-destructive/90">
              {error.name}: {error.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Your other field values are still intact. Try again, or copy this message when reporting the issue.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive"
            >
              Retry editor
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default EditorErrorBoundary;
