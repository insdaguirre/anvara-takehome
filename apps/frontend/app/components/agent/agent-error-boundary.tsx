'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AgentErrorBoundaryProps {
  children: ReactNode;
}

interface AgentErrorBoundaryState {
  hasError: boolean;
}

export class AgentErrorBoundary extends Component<AgentErrorBoundaryProps, AgentErrorBoundaryState> {
  state: AgentErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AgentErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('agent_component_error', {
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
