import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FatalErrorScreen } from './FatalErrorScreen';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erreur React non gérée', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <FatalErrorScreen
          title="Une erreur inattendue est survenue"
          message="L'interface a rencontré une erreur. Vos réglages sont conservés, vous pouvez recharger le jeu pour reprendre."
          details={this.state.error.message}
        />
      );
    }
    return this.props.children;
  }
}
