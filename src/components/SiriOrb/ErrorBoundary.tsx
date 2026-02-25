/**
 * src/components/SiriOrb/ErrorBoundary.tsx
 */
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(
      `[ErrorBoundary:${this.props.name ?? "unknown"}]`,
      error.message,
      info.componentStack.slice(0, 300),
    );
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

/** Silently swallows errors — for non-critical UI islands */
export const SilentBoundary = ({
  name,
  children,
}: {
  name?: string;
  children: ReactNode;
}) => (
  <ErrorBoundary name={name} fallback={null}>
    {children}
  </ErrorBoundary>
);
