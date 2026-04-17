import { Component, type ErrorInfo, type ReactNode } from "react";
import { addRuntimeErrorLog } from "@/lib/runtimeErrorLog";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    addRuntimeErrorLog({
      source: "react.error_boundary",
      title: error.message || "React render error",
      detail: info.componentStack?.split("\n").slice(0, 3).join(" ") ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Something went wrong. Please refresh the page.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
