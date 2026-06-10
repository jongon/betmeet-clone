"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered when the island throws. Defaults to nothing (hide the island). */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Generic per-island error boundary (NFR-Design Pattern 3). On error it renders
 * `fallback` (or nothing), so a failing client island never breaks the page
 * (BR-2.14, BR-2.26).
 */
export class IslandBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
