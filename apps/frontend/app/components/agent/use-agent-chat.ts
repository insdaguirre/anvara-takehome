'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { agentChat, isApiError, type AgentToolCall, type AgentUserRole } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import type {
  AgentConversationMessage,
  AgentToolExecutionResult,
  AgentUiMessage,
} from './agent-types';
import { getToolStatusLabel } from './agent-tools';

const MAX_CONVERSATION_MESSAGES = 50;
const MAX_TOOL_ROUNDS = 3;

interface UseAgentChatOptions {
  enabled: boolean;
  userRole: AgentUserRole;
  executeTool: (toolCall: AgentToolCall) => Promise<AgentToolExecutionResult>;
}

interface UseAgentChatResult {
  messages: AgentUiMessage[];
  isLoading: boolean;
  isOffline: boolean;
  sendMessage: (text: string) => Promise<void>;
  resetConversation: (reason?: string) => void;
}

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function toRoleName(role: AgentUserRole): string {
  return role ?? 'unknown';
}

export function useAgentChat({
  enabled,
  userRole,
  executeTool,
}: UseAgentChatOptions): UseAgentChatResult {
  const [messages, setMessages] = useState<AgentUiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const conversationRef = useRef<AgentConversationMessage[]>([]);

  const appendMessage = useCallback((message: Omit<AgentUiMessage, 'id' | 'createdAt'>) => {
    const nextMessage: AgentUiMessage = {
      id: createMessageId(),
      createdAt: Date.now(),
      ...message,
    };

    setMessages((prev) => [...prev, nextMessage]);
  }, []);

  const resetConversation = useCallback((reason = 'manual') => {
    const priorCount = conversationRef.current.length;
    conversationRef.current = [];
    setMessages([]);

    trackEvent('agent_conversation_reset', {
      messageCount: priorCount,
      reason,
    });
  }, []);

  const pushConversationMessage = useCallback((message: AgentConversationMessage) => {
    conversationRef.current = [...conversationRef.current, message];
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!enabled || isLoading || trimmed.length === 0) {
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        appendMessage({
          role: 'assistant',
          content: "You're offline. I'll be back when you reconnect.",
          isError: true,
        });
        return;
      }

      if (conversationRef.current.length >= MAX_CONVERSATION_MESSAGES) {
        const priorCount = conversationRef.current.length;
        conversationRef.current = [];
        setMessages([
          {
            id: createMessageId(),
            role: 'assistant',
            content:
              'I reset our conversation after 50 messages to keep things responsive. Please continue from here.',
            createdAt: Date.now(),
          },
        ]);

        trackEvent('agent_conversation_reset', {
          messageCount: priorCount,
          reason: 'max_length',
        });
      }

      appendMessage({ role: 'user', content: trimmed });
      pushConversationMessage({ role: 'user', content: trimmed });

      trackEvent('agent_message_sent', {
        userRole: toRoleName(userRole),
        messageLength: trimmed.length,
        conversationLength: conversationRef.current.length,
      });

      setIsLoading(true);

      try {
        let currentResponse = await agentChat({
          messages: conversationRef.current,
          userRole,
        });

        let toolRound = 0;
        while (currentResponse.type === 'tool_call' && toolRound < MAX_TOOL_ROUNDS) {
          toolRound += 1;

          appendMessage({
            role: 'status',
            content: getToolStatusLabel(currentResponse.toolCall),
          });

          let toolResult: AgentToolExecutionResult;
          try {
            toolResult = await executeTool(currentResponse.toolCall);
          } catch {
            toolResult = {
              success: false,
              toolName: currentResponse.toolCall.name,
              errorType: 'execution_exception',
              message: 'Tool execution failed. Please try again manually.',
            };
          }

          trackEvent('agent_tool_call', {
            tool: currentResponse.toolCall.name,
            userRole: toRoleName(userRole),
            success: toolResult.success,
          });

          if (!toolResult.success) {
            trackEvent('agent_tool_error', {
              tool: currentResponse.toolCall.name,
              errorType: toolResult.errorType ?? 'execution_failed',
            });
          }

          appendMessage({
            role: 'status',
            content: toolResult.message,
            isError: !toolResult.success,
          });

          pushConversationMessage({
            role: 'tool_result',
            toolName: currentResponse.toolCall.name,
            content: toolResult.message,
          });

          currentResponse = await agentChat({
            messages: conversationRef.current,
            userRole,
          });
        }

        if (currentResponse.type === 'tool_call') {
          const fallback = 'I hit a tool-execution limit. Please try the request again.';
          appendMessage({ role: 'assistant', content: fallback, isError: true });
          pushConversationMessage({ role: 'assistant', content: fallback });
          return;
        }

        appendMessage({
          role: 'assistant',
          content: currentResponse.content,
          ragResults: currentResponse.ragResults,
        });
        pushConversationMessage({ role: 'assistant', content: currentResponse.content });
      } catch (error) {
        let message = 'Sorry, I am having trouble right now. Please try again.';

        if (isApiError(error)) {
          trackEvent('agent_llm_error', {
            errorType: error.type,
            statusCode: error.statusCode ?? 0,
          });

          if (error.type === 'auth') {
            message = 'Your session has expired. Please log in again.';
          } else if (error.type === 'rate_limit') {
            message = 'I am receiving too many requests right now. Please wait a moment.';
          } else if (error.type === 'network') {
            message = "You're offline. I'll be back when you reconnect.";
            setIsOffline(true);
          } else if (error.message) {
            message = error.message;
          }
        }

        appendMessage({ role: 'assistant', content: message, isError: true });
      } finally {
        setIsLoading(false);
      }
    },
    [appendMessage, enabled, executeTool, isLoading, pushConversationMessage, userRole]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onOnline = () => {
      setIsOffline(false);
    };

    const onOffline = () => {
      setIsOffline(true);
      appendMessage({
        role: 'assistant',
        content: "You're offline. I'll be back when you reconnect.",
        isError: true,
      });
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [appendMessage]);

  return {
    messages,
    isLoading,
    isOffline,
    sendMessage,
    resetConversation,
  };
}
