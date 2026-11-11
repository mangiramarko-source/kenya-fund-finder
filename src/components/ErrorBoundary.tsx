import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isChunkLoadError, forceReloadWithCacheBust } from "@/lib/lazyWithRetry";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);

    // If this is a chunk load failure from a new deployment, auto-reload once to fetch fresh assets
    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const key = "kff_eb_chunk_retry";
      const lastRetry = sessionStorage.getItem(key);
      const now = Date.now();
      if (!lastRetry || now - Number(lastRetry) > 15_000) {
        sessionStorage.setItem(key, String(now));
        forceReloadWithCacheBust();
      }
    }
  }

  handleReload = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kff_eb_chunk_retry");
      sessionStorage.removeItem("kff_vite_preload_retry");
      if ("caches" in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {
          // Ignore cache deletion errors
        }
      }
    }
    forceReloadWithCacheBust();
  };

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error || new Error("Unknown error"), this.reset);
        }
        return this.props.fallback;
      }

      const isChunkError = isChunkLoadError(this.state.error);
      const errName = this.state.error?.name ?? "Error";
      const errMsg = this.state.error?.message ?? "Unknown error";

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md w-full">
            <div className={`flex items-center justify-center h-16 w-16 rounded-full mx-auto mb-4 ${isChunkError ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              {isChunkError ? <RefreshCw className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
            </div>
            <h1 className="text-xl font-bold mb-2">
              {isChunkError ? "New update available" : "Something went wrong"}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {isChunkError
                ? "A new version of Kenya Fund Finder is available. Please reload to update to the latest version."
                : "We encountered an unexpected error. Please try refreshing the page."}
            </p>
            {/* Diagnostic: shows actual error to help identify browser compat issues */}
            <div className="text-left bg-muted/50 border border-muted rounded-lg p-3 mb-4 text-xs font-mono break-all select-all">
              <span className={`font-bold ${isChunkError ? "text-primary" : "text-destructive"}`}>{errName}:</span>{" "}
              {errMsg}
            </div>
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" /> {isChunkError ? "Update & Refresh" : "Refresh Page"}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
