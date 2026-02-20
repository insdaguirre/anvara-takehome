import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, MinusCircle, X } from 'lucide-react';

interface InlineNoticeProps {
  tone: 'info' | 'warning' | 'success' | 'neutral' | 'error';
  children: ReactNode;
  onDismiss?: () => void;
}

const toneStyles: Record<InlineNoticeProps['tone'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200',
};

const toneIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  neutral: MinusCircle,
  error: AlertCircle,
} as const;

export function InlineNotice({ tone, children, onDismiss }: InlineNoticeProps) {
  const Icon = toneIcons[tone];
  const isAlertTone = tone === 'warning' || tone === 'error';

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${toneStyles[tone]}`}
      role={isAlertTone ? 'alert' : 'status'}
      aria-live={isAlertTone ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex-1">{children}</div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-0.5 opacity-80 transition-opacity hover:opacity-100"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
