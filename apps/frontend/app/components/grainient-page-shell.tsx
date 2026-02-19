import type { ReactNode } from 'react';
import { GrainientPageBackground } from './grainient-page-background';

interface GrainientPageShellProps {
  children: ReactNode;
}

export function GrainientPageShell({ children }: GrainientPageShellProps) {
  return (
    <div className="relative">
      <GrainientPageBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
