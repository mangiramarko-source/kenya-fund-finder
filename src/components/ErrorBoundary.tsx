import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
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
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const details = err
        ? `${err.name}: ${err.message}\n\n${err.stack ?? ""}`
        : "Unknown error";
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md w-full">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <Button onClick={this.handleReload} className="gap-2 mb-4">
              <RefreshCw className="h-4 w-4" /> Refresh Page
            </Button>
            <details className="text-left bg-muted/50 rounded-md p-3 text-xs">
              <summary className="cursor-pointer font-medium mb-2">
                Show error details
              </summary>
              <pre className="whitespace-pre-wrap break-words text-[11px] leading-snug">
                {details}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
