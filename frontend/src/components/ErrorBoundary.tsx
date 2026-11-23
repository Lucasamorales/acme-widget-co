import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * Shows a message instead of a blank page if rendering throws.
 *
 * React only supports error boundaries as class components; there is no
 * hook for this. Boundaries catch errors thrown while rendering, not in
 * event handlers or async code, so failed requests are handled separately
 * by `useRequest`. React 19 already logs caught errors to the console, so
 * there is no `componentDidCatch`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <p role="alert" className="error">
          Something went wrong. Please refresh the page.
        </p>
      );
    }
    return this.props.children;
  }
}
