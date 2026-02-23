'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgent } from './agent-provider';

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRoleBadgeLabel(role: string | null): string {
  if (role === 'sponsor') return 'Sponsor';
  if (role === 'publisher') return 'Publisher';
  return 'Guest';
}

function getStartupMessage(params: {
  userRole: 'sponsor' | 'publisher' | null;
  isAuthenticated: boolean;
}): string {
  if (!params.isAuthenticated) {
    return "Guest mode: I can help you browse/search the marketplace and explain how Anvara works. Sign in to create campaigns or manage listings.";
  }

  if (params.userRole === 'sponsor') {
    return 'Sponsor mode: I can help you create/manage campaigns and find inventory in the marketplace.';
  }

  if (params.userRole === 'publisher') {
    return 'Publisher mode: I can help you create/manage ad slot listings and search the marketplace.';
  }

  return 'I can help with marketplace search and account-specific actions.';
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)] [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-muted)]" />
    </div>
  );
}

export function AgentChatPanel() {
  const {
    isOpen,
    close,
    isLoading,
    isOffline,
    messages,
    sendMessage,
    userRole,
    isAuthenticated,
    resetConversation,
  } = useAgent();

  const [draft, setDraft] = useState('');
  const panelRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const latestAnnouncement = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.role === 'assistant' || message.role === 'status') {
        return message.content;
      }
    }

    return '';
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const container = messageListRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [isLoading, isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;
    const root = panelRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      const elements = Array.from(focusable).filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1
      );

      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    const nextValue = draft.trim();
    if (!nextValue || isLoading) return;

    setDraft('');
    await sendMessage(nextValue);
  }, [draft, isLoading, sendMessage]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-[calc(max(1rem,env(safe-area-inset-top))+72px+0.75rem)] z-[59] sm:inset-auto sm:bottom-[88px] sm:right-6 sm:h-[500px] sm:w-[400px]">
      <div className="absolute inset-0 bg-black/40 sm:hidden" onClick={close} aria-hidden="true" />

      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Anvara Agent"
        className="absolute inset-0 flex flex-col border border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl sm:inset-auto sm:bottom-0 sm:right-0 sm:h-[500px] sm:w-[400px] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Anvara Agent</h2>
            <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
              {getRoleBadgeLabel(userRole)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => resetConversation('manual_clear')}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close Anvara Agent"
              className="rounded-md p-1 text-lg text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            >
              ×
            </button>
          </div>
        </div>

        <div className="sr-only" aria-live="polite">
          {latestAnnouncement}
        </div>

        <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] p-3 text-sm text-[var(--color-muted)]">
              {getStartupMessage({ userRole, isAuthenticated })}
            </p>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            const isStatus = message.role === 'status';

            return (
              <article key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    isUser
                      ? 'bg-[var(--color-primary)] text-white'
                      : isStatus
                        ? message.isError
                          ? 'border border-red-200 bg-red-50 text-red-700'
                          : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]'
                        : message.isError
                          ? 'border border-red-200 bg-red-50 text-red-700'
                          : 'bg-[var(--color-surface)] text-[var(--color-foreground)]'
                  }`}
                >
                  <p>{message.content}</p>
                  {message.ragResults ? (
                    <section className="mt-3 space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-left">
                      <p className="text-[11px] text-[var(--color-muted)]">
                        {message.ragResults.phase === 'retrieval'
                          ? 'Retrieval-only results'
                          : 'LLM-ranked results'}
                        {' • '}
                        Retrieved {message.ragResults.retrievalCount}
                        {message.ragResults.generationFailed ? ' • Ranking fallback used' : ''}
                      </p>

                      {message.ragResults.results.length === 0 ? (
                        <p className="text-xs text-[var(--color-muted)]">No matching listings found.</p>
                      ) : (
                        <div className="space-y-2">
                          {message.ragResults.results.map((result) => (
                            <article
                              key={result.adSlot.id}
                              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-[var(--color-foreground)]">
                                  {result.rank}. {result.adSlot.name}
                                </p>
                                <span className="text-[10px] text-[var(--color-muted)]">
                                  {Math.round(result.relevanceScore * 100)}%
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                                {result.adSlot.publisher?.name ?? 'Unknown publisher'} • {result.adSlot.type} •{' '}
                                {formatUsd(result.adSlot.basePrice)}
                              </p>
                              {result.explanation ? (
                                <p className="mt-1 text-[11px] text-[var(--color-foreground)]">
                                  {result.explanation}
                                </p>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  ) : null}
                  <p className={`mt-1 text-[10px] ${isUser ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>
                    {formatTimestamp(message.createdAt)}
                  </p>
                </div>
              </article>
            );
          })}

          {isLoading ? (
            <div className="flex justify-start">
              <TypingIndicator />
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--color-border)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:py-3">
          {isOffline ? (
            <p className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
              You are offline. Messages will resume when your connection returns.
            </p>
          ) : null}

          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder="Ask Anvara Agent..."
              className="min-h-[48px] flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isLoading || draft.trim().length === 0}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
