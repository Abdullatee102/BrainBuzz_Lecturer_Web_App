import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary in Lecturer App:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {this.props.fallbackTitle || 'Something went wrong on this screen'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                An unexpected application rendering error occurred. You can retry loading this view or navigate back to the dashboard.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-slate-700 font-mono text-[11px] text-left overflow-x-auto border border-slate-200">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  this.handleReset();
                  window.location.href = '/dashboard';
                }}
              >
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

