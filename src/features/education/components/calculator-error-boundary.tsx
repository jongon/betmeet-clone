"use client";

import { Component, type ReactNode } from "react";
import { es } from "@/i18n/dictionaries/es";
import { ScoringTable } from "./scoring-table";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Per-island error boundary (NFR-Design Pattern 3). If the interactive
 * calculator throws, it degrades to the static scoring table so the user still
 * learns the rules and the page never breaks (BR-2.14).
 */
export class CalculatorErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-2" data-testid="calculator-fallback">
          <p className="text-sm font-medium">{es.calculator.fallbackTitle}</p>
          <p className="text-sm text-muted-foreground">{es.calculator.fallbackNote}</p>
          <ScoringTable />
        </div>
      );
    }
    return this.props.children;
  }
}
