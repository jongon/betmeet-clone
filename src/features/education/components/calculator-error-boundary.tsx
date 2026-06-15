"use client";

import { Component, type ReactNode } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";
import type { Dictionary } from "@/i18n/types";
import { ScoringTable } from "./scoring-table";

interface Props {
  children: ReactNode;
  calculator: Dictionary["calculator"];
}

interface State {
  hasError: boolean;
}

/**
 * Per-island error boundary (NFR-Design Pattern 3). If the interactive
 * calculator throws, it degrades to the static scoring table so the user still
 * learns the rules and the page never breaks (BR-2.14).
 */
class CalculatorErrorBoundaryInner extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-2" data-testid="calculator-fallback">
          <p className="text-sm font-medium">{this.props.calculator.fallbackTitle}</p>
          <p className="text-sm text-muted-foreground">{this.props.calculator.fallbackNote}</p>
          <ScoringTable />
        </div>
      );
    }
    return this.props.children;
  }
}

export function CalculatorErrorBoundary({ children }: { children: ReactNode }) {
  const { calculator } = useDictionary();
  return (
    <CalculatorErrorBoundaryInner calculator={calculator}>{children}</CalculatorErrorBoundaryInner>
  );
}
