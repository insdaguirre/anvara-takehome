'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/auth-client';
import {
  getAgentStatus,
  getMarketplaceRagStatus,
  getRoleForUser,
  type AgentToolCall,
  type AgentUserRole,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { executeAgentTool } from './agent-tools';
import { AgentErrorBoundary } from './agent-error-boundary';
import type {
  AdSlotPrefillPayload,
  AgentToolExecutionResult,
  AgentUiMessage,
  CampaignPrefillPayload,
  PendingAdSlotPrefill,
  PendingCampaignPrefill,
} from './agent-types';
import { useAgentChat } from './use-agent-chat';
import { AgentChatPanel } from './agent-chat-panel';
import { AgentFab } from './agent-fab';

interface AgentContextValue {
  enabled: boolean;
  isAuthenticated: boolean;
  isOpen: boolean;
  isLoading: boolean;
  isOffline: boolean;
  hasUnread: boolean;
  messages: AgentUiMessage[];
  userRole: AgentUserRole;
  sendMessage: (message: string) => Promise<void>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  resetConversation: (reason?: string) => void;
  pendingCampaignPrefill: PendingCampaignPrefill | null;
  pendingAdSlotPrefill: PendingAdSlotPrefill | null;
  consumeCampaignPrefill: (requestId: string) => void;
  consumeAdSlotPrefill: (requestId: string) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

function createPrefillId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `prefill_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider');
  }

  return context;
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user);

  const [enabled, setEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [userRole, setUserRole] = useState<AgentUserRole>(null);
  const [pendingCampaignPrefill, setPendingCampaignPrefill] =
    useState<PendingCampaignPrefill | null>(null);
  const [pendingAdSlotPrefill, setPendingAdSlotPrefill] = useState<PendingAdSlotPrefill | null>(null);

  const openedAtRef = useRef<number | null>(null);
  const ragStatusCacheRef = useRef<{ value: boolean; expiresAt: number } | null>(null);

  const queueCampaignPrefill = useCallback((values: CampaignPrefillPayload) => {
    setPendingCampaignPrefill({
      requestId: createPrefillId(),
      values,
    });
  }, []);

  const queueAdSlotPrefill = useCallback((values: AdSlotPrefillPayload) => {
    setPendingAdSlotPrefill({
      requestId: createPrefillId(),
      values,
    });
  }, []);

  const consumeCampaignPrefill = useCallback((requestId: string) => {
    setPendingCampaignPrefill((current) => {
      if (!current || current.requestId !== requestId) return current;
      return null;
    });
  }, []);

  const consumeAdSlotPrefill = useCallback((requestId: string) => {
    setPendingAdSlotPrefill((current) => {
      if (!current || current.requestId !== requestId) return current;
      return null;
    });
  }, []);

  const getRagEnabled = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (ragStatusCacheRef.current && ragStatusCacheRef.current.expiresAt > now) {
      return ragStatusCacheRef.current.value;
    }

    try {
      const status = await getMarketplaceRagStatus();
      ragStatusCacheRef.current = {
        value: status.enabled,
        expiresAt: now + 30_000,
      };
      return status.enabled;
    } catch {
      ragStatusCacheRef.current = {
        value: false,
        expiresAt: now + 10_000,
      };
      return false;
    }
  }, []);

  const executeTool = useCallback(
    async (toolCall: AgentToolCall): Promise<AgentToolExecutionResult> => {
      return executeAgentTool(toolCall, {
        pathname,
        userRole,
        isAuthenticated,
        navigate: (href: string) => {
          router.push(href);
        },
        queueCampaignPrefill,
        queueAdSlotPrefill,
        getRagEnabled,
      });
    },
    [getRagEnabled, isAuthenticated, pathname, queueAdSlotPrefill, queueCampaignPrefill, router, userRole]
  );

  const { messages, isLoading, isOffline, sendMessage, resetConversation } = useAgentChat({
    enabled,
    userRole,
    executeTool,
  });

  const open = useCallback(() => {
    if (!enabled) return;

    setIsOpen((current) => {
      if (!current) {
        trackEvent('agent_open', { userRole: userRole ?? 'guest' });
        openedAtRef.current = Date.now();
      }
      return true;
    });
  }, [enabled, userRole]);

  const close = useCallback(() => {
    setIsOpen((current) => {
      if (current) {
        const sessionDurationMs = openedAtRef.current ? Date.now() - openedAtRef.current : 0;
        trackEvent('agent_close', {
          messageCount: messages.length,
          sessionDurationMs,
        });
      }
      openedAtRef.current = null;
      return false;
    });
  }, [messages.length]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
      return;
    }

    open();
  }, [close, isOpen, open]);

  useEffect(() => {
    let cancelled = false;

    getAgentStatus()
      .then((status) => {
        if (cancelled) return;
        setEnabled(status.enabled);
        if (!status.enabled) {
          setIsOpen(false);
          setHasUnread(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(false);
        setIsOpen(false);
        setHasUnread(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      const timeout = window.setTimeout(() => {
        setUserRole(null);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;

    getRoleForUser(session.user.id)
      .then((roleResponse) => {
        if (cancelled) return;
        setUserRole(roleResponse.role);
      })
      .catch(() => {
        if (cancelled) return;
        setUserRole(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!enabled) return;

    if (isOpen) {
      const timeout = window.setTimeout(() => {
        setHasUnread(false);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    if (messages.length === 0) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.role === 'assistant') {
      const timeout = window.setTimeout(() => {
        setHasUnread(true);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }
  }, [enabled, isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, isOpen]);

  const contextValue = useMemo<AgentContextValue>(
    () => ({
      enabled,
      isAuthenticated,
      isOpen,
      isLoading,
      isOffline,
      hasUnread,
      messages,
      userRole,
      sendMessage,
      open,
      close,
      toggle,
      resetConversation,
      pendingCampaignPrefill,
      pendingAdSlotPrefill,
      consumeCampaignPrefill,
      consumeAdSlotPrefill,
    }),
    [
      close,
      consumeAdSlotPrefill,
      consumeCampaignPrefill,
      enabled,
      isAuthenticated,
      hasUnread,
      isLoading,
      isOffline,
      isOpen,
      messages,
      open,
      pendingAdSlotPrefill,
      pendingCampaignPrefill,
      resetConversation,
      sendMessage,
      toggle,
      userRole,
    ]
  );

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
      {enabled ? (
        <AgentErrorBoundary>
          <AgentFab />
          <AgentChatPanel />
        </AgentErrorBoundary>
      ) : null}
    </AgentContext.Provider>
  );
}
