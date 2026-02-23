'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAgent } from './agent-provider';

const TOOLTIP_DISMISS_KEY = 'anvara_agent_fab_tip_dismissed';
const TOOLTIP_AUTO_DISMISS_MS = 5000;

export function AgentFab() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { isOpen, toggle, hasUnread } = useAgent();
  const [isTooltipDismissed, setIsTooltipDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;

    try {
      return window.sessionStorage.getItem(TOOLTIP_DISMISS_KEY) === '1';
    } catch {
      return true;
    }
  });

  const dismissTooltip = useCallback(() => {
    setIsTooltipDismissed(true);

    try {
      window.sessionStorage.setItem(TOOLTIP_DISMISS_KEY, '1');
    } catch {
      // Ignore storage access errors and keep tooltip hidden for this render cycle.
    }
  }, []);

  const shouldShowTooltip = pathname === '/' && !isOpen && !isTooltipDismissed;

  useEffect(() => {
    if (!shouldShowTooltip) return;

    const timeout = window.setTimeout(() => {
      dismissTooltip();
    }, TOOLTIP_AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dismissTooltip, shouldShowTooltip]);

  return (
    <div className="fixed bottom-[calc(24px+env(safe-area-inset-bottom))] right-6 z-[60] flex flex-col items-end gap-2">
      <AnimatePresence>
        {shouldShowTooltip ? (
          <motion.div
            key="agent-fab-tip"
            role="note"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={
              shouldReduceMotion
                ? { opacity: 1, y: 0 }
                : { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0, y: 0, transition: { duration: 0 } }
                : { opacity: 0, y: 4, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }
            }
            className="relative max-w-[17rem] rounded-2xl border border-white/25 bg-slate-950/72 px-3 py-2 pr-8 text-xs leading-relaxed text-white/90 shadow-[0_14px_36px_rgba(2,6,23,0.35)] backdrop-blur-md"
          >
            <p>Ask AI to find the perfect sponsorship match.</p>
            <button
              type="button"
              onClick={dismissTooltip}
              aria-label="Dismiss AI Agent tip"
              className="absolute right-1.5 top-1.5 rounded-full p-1 text-[11px] leading-none text-white/75 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none"
            >
              x
            </button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-white/25 bg-slate-950/72"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? 'Close Anvara AI Agent' : 'Open Anvara AI Agent'}
        aria-expanded={isOpen}
        className={`group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/14 text-white shadow-[0_10px_24px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-white/40 hover:bg-white/20 active:scale-95 active:bg-white/24 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] motion-reduce:transition-none motion-reduce:hover:scale-100 ${
          isOpen
            ? 'hidden sm:flex sm:rotate-90'
            : 'md:w-auto md:gap-1.5 md:px-2 md:pr-3 md:hover:pr-4'
        }`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.58),rgba(255,255,255,0.12)_56%,rgba(255,255,255,0)_78%)] opacity-80 transition-opacity duration-200 group-hover:opacity-95 motion-reduce:transition-none"
        />
        {isOpen ? (
          <span aria-hidden className="relative z-[1] text-xl font-medium leading-none">
            ×
          </span>
        ) : (
          <>
            <Image
              src="/agent-icon-final.svg"
              alt=""
              aria-hidden
              width={32}
              height={32}
              className="relative z-[1] h-8 w-8 object-contain md:h-7 md:w-7"
            />
            <span
              aria-hidden="true"
              className="relative z-[1] hidden whitespace-nowrap text-[13px] font-semibold leading-none tracking-[0.005em] text-white/90 transition-all duration-200 md:inline md:opacity-90 md:group-hover:opacity-100 motion-reduce:transition-none"
            >
              Ask Anvara
            </span>
          </>
        )}
        {hasUnread && !isOpen ? (
          <span className="absolute -right-1 -top-1 z-[2] h-3 w-3 animate-pulse rounded-full bg-red-500" />
        ) : null}
      </button>
    </div>
  );
}
