import type {
  AgentRagAdSlot,
  AgentToolCall,
  AgentUserRole,
  MarketplaceRagSearchResponse,
} from '@/lib/api';

export type { AgentToolCall, AgentUserRole };

export interface AgentUiMessage {
  id: string;
  role: 'user' | 'assistant' | 'status';
  content: string;
  createdAt: number;
  isError?: boolean;
  ragResults?: MarketplaceRagSearchResponse<AgentRagAdSlot>;
}

export type AgentConversationMessage =
  | {
      role: 'user';
      content: string;
    }
  | {
      role: 'assistant';
      content: string;
    }
  | {
      role: 'tool_result';
      toolName: string;
      content: string;
    };

export interface CampaignPrefillPayload {
  name?: string;
  description?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

export interface AdSlotPrefillPayload {
  name?: string;
  description?: string;
  type?: 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST';
  basePrice?: number;
  isAvailable?: boolean;
}

export interface PendingCampaignPrefill {
  requestId: string;
  values: CampaignPrefillPayload;
}

export interface PendingAdSlotPrefill {
  requestId: string;
  values: AdSlotPrefillPayload;
}

export interface AgentToolExecutionResult {
  success: boolean;
  message: string;
  toolName: AgentToolCall['name'];
  errorType?: string;
}
