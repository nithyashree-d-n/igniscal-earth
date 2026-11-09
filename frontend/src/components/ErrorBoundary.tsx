import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900/90 border border-red-500/30 rounded-xl p-6 text-center shadow-2xl my-4 mx-auto max-w-2xl">
          <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            {this.props.fallbackTitle || 'Display Interruption Recovered'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            An unexpected error occurred while rendering this component. The rest of the platform remains safe and functional.
          </p>
          {this.state.error && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-left font-mono text-[11px] text-red-300 max-h-32 overflow-auto mb-4">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Component View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
