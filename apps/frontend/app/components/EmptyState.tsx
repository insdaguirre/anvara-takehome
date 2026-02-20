import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { Inbox } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: 'default' | 'search' | 'filter';
  illustration?: ReactNode;
}

function ActionButton({ action, secondary = false }: { action: EmptyStateAction; secondary?: boolean }) {
  if (action.href) {
    return (
      <Link
        href={action.href}
        className={
          secondary
            ? 'mt-2 inline-flex text-sm text-[var(--color-primary)] underline-offset-4 hover:underline'
            : 'mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]'
        }
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={
        secondary
          ? 'mt-2 inline-flex text-sm text-[var(--color-primary)] underline-offset-4 hover:underline'
          : 'mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]'
      }
    >
      {action.label}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  secondaryAction,
  variant = 'default',
  illustration,
}: EmptyStateProps) {
  const variantClassName =
    variant === 'filter'
      ? 'bg-[var(--color-background)]'
      : variant === 'search'
        ? 'bg-[var(--color-background)]'
        : 'bg-[var(--color-background)]';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center ${variantClassName}`}
    >
      {illustration ?? <Icon className="mx-auto h-9 w-9 text-[var(--color-muted)]" aria-hidden={true} />}
      <p className="mt-3 text-lg font-medium text-[var(--color-foreground)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
      {action ? <ActionButton action={action} /> : null}
      {secondaryAction ? <ActionButton action={secondaryAction} secondary /> : null}
    </div>
  );
}
