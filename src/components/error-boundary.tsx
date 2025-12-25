import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.context || 'component'}:`, error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);

    // Log to error tracking service in production
    if (import.meta.env.PROD) {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Integrate with Sentry or similar service
    // For now, just log to console in production
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch(console.error);
  };

  private handleReset = () => {
    const newRetryCount = this.state.retryCount + 1;

    // If exceeded max retries, redirect to home
    if (newRetryCount >= this.maxRetries) {
      window.location.href = '/';
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container max-w-2xl py-16">
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We encountered an unexpected error. Our team has been notified.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="p-3 bg-muted rounded-md">
                  <summary className="cursor-pointer font-semibold mb-2 text-sm">
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-2 mt-2">
                    <div>
                      <p className="text-xs font-semibold mb-1">Error:</p>
                      <p className="text-xs font-mono text-destructive">
                        {this.state.error.toString()}
                      </p>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <p className="text-xs font-semibold mb-1">Stack:</p>
                        <pre className="text-[10px] font-mono overflow-auto max-h-32 text-muted-foreground">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="gap-2"
                  disabled={this.state.retryCount >= this.maxRetries}
                >
                  <RefreshCw className="h-4 w-4" />
                  {this.state.retryCount >= this.maxRetries
                    ? 'Max Retries Reached'
                    : `Try Again (${this.state.retryCount}/${this.maxRetries})`
                  }
                </Button>
                <Button onClick={() => (window.location.href = '/')} className="gap-2">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
