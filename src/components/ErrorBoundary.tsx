import { Component, type ErrorInfo, type ReactNode } from "react";
import { addRuntimeErrorLog } from "@/lib/runtimeErrorLog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  routeLabel?: string;
  homeHref?: string;
  onChunkErrorReload?: () => void;
  isStaff?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Failed to load module script",
  "Cannot find module",
  "Loading chunk",
  "error loading dynamically imported module",
];

function isChunkLoadError(error: Error | undefined) {
  if (!error) return false;
  const message = error.message ?? "";
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    addRuntimeErrorLog({
      source: "react.error_boundary",
      title: error.message || "React render error",
      detail: info.componentStack?.split("\n").slice(0, 3).join(" ") ?? undefined,
    });

    if (isChunkLoadError(error)) {
      this.props.onChunkErrorReload?.();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <RouteErrorFallback routeLabel={this.props.routeLabel} homeHref={this.props.homeHref} error={this.state.error} isStaff={this.props.isStaff} onRetry={() => this.setState({ hasError: false, error: undefined })} />;
    }
    return this.props.children;
  }
}

function RouteErrorFallback({
  routeLabel,
  homeHref,
  error,
  isStaff,
  onRetry,
}: {
  routeLabel?: string;
  homeHref?: string;
  error?: Error;
  isStaff?: boolean;
  onRetry: () => void;
}) {
  if (isStaff) {
    return (
      <div className="flex min-h-[50vh] flex-col items-start justify-center gap-4 p-6">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-sm font-semibold">This page crashed</h2>
        </div>
        {routeLabel ? <p className="text-xs text-muted-foreground">Route: {routeLabel}</p> : null}
        <div className="w-full max-w-2xl rounded border bg-muted/30 p-3 font-mono text-xs">
          <p className="font-medium text-destructive">{error?.message ?? "Unknown error"}</p>
          {error?.stack ? <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-muted-foreground">{error.stack}</pre> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
          {homeHref ? (
            <Button size="sm" variant="outline" asChild>
              <a href={homeHref}><Home className="mr-1.5 h-3.5 w-3.5" /> Back to dashboard</a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Go back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        Something went wrong. Reloading the page…
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => window.location.reload()}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reload now
      </Button>
    </div>
  );
}
