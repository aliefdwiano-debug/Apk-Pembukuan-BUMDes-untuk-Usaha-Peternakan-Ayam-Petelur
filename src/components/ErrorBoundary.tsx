import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ComponentBase = React.Component as any;

export class ErrorBoundary extends ComponentBase {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-gray-900 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Terjadi Kesalahan Tampilan</h2>
              <p className="text-xs text-gray-500">
                Aplikasi mengalami kendala pemrosesan data. Silakan klik tombol di bawah untuk memuat ulang.
              </p>
            </div>
            {(this as any).state.error && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-left overflow-x-auto max-h-32">
                <code className="text-[11px] text-rose-700 font-mono break-all">
                  {(this as any).state.error.message || 'Unknown error'}
                </code>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
