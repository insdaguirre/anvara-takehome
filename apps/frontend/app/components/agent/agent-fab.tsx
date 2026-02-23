'use client';

import Image from 'next/image';
import { useAgent } from './agent-provider';

export function AgentFab() {
  const { isOpen, toggle, hasUnread } = useAgent();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? 'Close Anvara Agent' : 'Open Anvara Agent'}
      aria-expanded={isOpen}
      className={`group fixed bottom-[calc(24px+env(safe-area-inset-bottom))] right-6 z-[60] flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-white/40 hover:bg-white/20 active:scale-95 active:bg-white/24 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] ${
        isOpen ? 'hidden sm:flex sm:rotate-90' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.58),rgba(255,255,255,0.12)_56%,rgba(255,255,255,0)_78%)] opacity-80 transition-opacity duration-200 group-hover:opacity-95"
      />
      {isOpen ? (
        <span aria-hidden className="relative z-[1] text-xl font-medium leading-none">
          ×
        </span>
      ) : (
        <Image
          src="/agent-icon-final.svg"
          alt=""
          aria-hidden
          width={32}
          height={32}
          className="relative z-[1] h-8 w-8 object-contain"
        />
      )}
      {hasUnread && !isOpen ? (
        <span className="absolute -right-1 -top-1 z-[2] h-3 w-3 animate-pulse rounded-full bg-red-500" />
      ) : null}
    </button>
  );
}
