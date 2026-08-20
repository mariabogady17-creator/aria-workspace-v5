import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-2xl max-w-lg w-full text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
            <p className="text-white/60 mb-6 text-sm">
              A.R.I.A ha encontrado un error inesperado en la interfaz. No te preocupes, puedes recargar la página para continuar.
            </p>
            <div className="bg-black/50 p-4 rounded-lg text-left overflow-auto text-xs text-rose-400/80 mb-6 font-mono max-h-40">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
