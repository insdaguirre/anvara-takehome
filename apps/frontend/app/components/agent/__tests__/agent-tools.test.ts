import { describe, expect, it, vi } from 'vitest';
import { executeAgentTool } from '../agent-tools';
import type { AgentToolCall } from '../../../../lib/api';

function createContext(overrides?: Partial<Parameters<typeof executeAgentTool>[1]>) {
  const navigations: string[] = [];
  const queuedCampaigns: unknown[] = [];
  const queuedAdSlots: unknown[] = [];

  const context: Parameters<typeof executeAgentTool>[1] = {
    pathname: '/marketplace',
    userRole: 'sponsor',
    isAuthenticated: true,
    navigate: (href: string) => {
      navigations.push(href);
    },
    queueCampaignPrefill: (values) => {
      queuedCampaigns.push(values);
    },
    queueAdSlotPrefill: (values) => {
      queuedAdSlots.push(values);
    },
    getRagEnabled: vi.fn(async () => true),
    ...overrides,
  };

  return {
    context,
    navigations,
    queuedCampaigns,
    queuedAdSlots,
  };
}

describe('executeAgentTool', () => {
  it('navigates to marketplace route when navigate_to is valid', async () => {
    const { context, navigations } = createContext();

    const toolCall: AgentToolCall = {
      id: 'call-1',
      name: 'navigate_to',
      args: {
        route: '/marketplace',
      },
    };

    const result = await executeAgentTool(toolCall, context);

    expect(result.success).toBe(true);
    expect(navigations).toEqual(['/marketplace']);
  });

  it('blocks unauthorized dashboard navigation by role', async () => {
    const { context, navigations } = createContext({
      userRole: 'sponsor',
      pathname: '/dashboard/sponsor',
    });

    const toolCall: AgentToolCall = {
      id: 'call-2',
      name: 'navigate_to',
      args: {
        route: '/dashboard/publisher',
      },
    };

    const result = await executeAgentTool(toolCall, context);

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('forbidden_route');
    expect(navigations).toEqual(['/dashboard/sponsor']);
  });

  it('queues sponsor campaign prefill without submitting', async () => {
    const { context, queuedCampaigns } = createContext({
      pathname: '/dashboard/sponsor',
      userRole: 'sponsor',
    });

    const toolCall: AgentToolCall = {
      id: 'call-3',
      name: 'prefill_campaign_form',
      args: {
        name: 'Q1 Push',
        budget: 10000,
      },
    };

    const result = await executeAgentTool(toolCall, context);

    expect(result.success).toBe(true);
    expect(queuedCampaigns).toEqual([{ name: 'Q1 Push', budget: 10000 }]);
  });

  it('navigates to sponsor dashboard and queues campaign prefill when invoked off-dashboard', async () => {
    const { context, navigations, queuedCampaigns } = createContext({
      pathname: '/marketplace',
      userRole: 'sponsor',
    });

    const toolCall: AgentToolCall = {
      id: 'call-3b',
      name: 'prefill_campaign_form',
      args: {
        name: 'Moms 45+ Awareness',
        description: 'Reach middle aged moms interested in wellness.',
        budget: 3500,
      },
    };

    const result = await executeAgentTool(toolCall, context);

    expect(result.success).toBe(true);
    expect(navigations).toEqual(['/dashboard/sponsor']);
    expect(queuedCampaigns).toEqual([
      {
        name: 'Moms 45+ Awareness',
        description: 'Reach middle aged moms interested in wellness.',
        budget: 3500,
      },
    ]);
  });

  it('navigates to marketplace rag mode with query and filters for rag tool execution', async () => {
    const { context, navigations } = createContext();

    const toolCall: AgentToolCall = {
      id: 'call-4',
      name: 'run_marketplace_rag_search',
      args: {
        query: 'tech podcasts',
        filters: {
          type: 'PODCAST',
          available: true,
        },
      },
    };

    const result = await executeAgentTool(toolCall, context);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Opened marketplace AI search');
    expect(navigations).toHaveLength(1);
    expect(navigations[0]).toContain('/marketplace?');
    expect(navigations[0]).toContain('mode=rag');
    expect(navigations[0]).toContain('ragQuery=tech+podcasts');
    expect(navigations[0]).toContain('type=PODCAST');
  });

  it('falls back to keyword marketplace query when rag is disabled', async () => {
    const { context, navigations } = createContext({
      getRagEnabled: vi.fn(async () => false),
    });

    const toolCall: AgentToolCall = {
      id: 'call-5',
      name: 'run_marketplace_rag_search',
      args: {
        query: 'tech podcasts',
        filters: {
          type: 'PODCAST',
          available: true,
        },
      },
    };

    const result = await executeAgentTool(toolCall, context);

    expect(result.success).toBe(true);
    expect(navigations).toHaveLength(1);
    expect(navigations[0]).toContain('/marketplace?');
    expect(navigations[0]).toContain('search=tech+podcasts');
    expect(navigations[0]).not.toContain('ragQuery=');
  });
});
