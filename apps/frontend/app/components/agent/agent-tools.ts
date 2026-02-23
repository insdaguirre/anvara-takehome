import {
  MARKETPLACE_FILTER_CATEGORIES,
  MARKETPLACE_FILTER_TYPES,
  parseMarketplaceQueryState,
  toMarketplaceQueryString,
  type MarketplaceFilterCategory,
  type MarketplaceFilterType,
} from '../../marketplace/query-state';
import type { AgentToolCall, AgentUserRole } from '../../../lib/api';
import type {
  AdSlotPrefillPayload,
  AgentToolExecutionResult,
  CampaignPrefillPayload,
} from './agent-types';

interface AgentToolExecutionContext {
  pathname: string;
  userRole: AgentUserRole;
  isAuthenticated: boolean;
  navigate: (href: string) => void;
  queueCampaignPrefill: (values: CampaignPrefillPayload) => void;
  queueAdSlotPrefill: (values: AdSlotPrefillPayload) => void;
  getRagEnabled: () => Promise<boolean>;
}

const PROTECTED_ROUTES = new Set(['/dashboard/sponsor', '/dashboard/publisher']);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveAllowedRoute(
  route: '/marketplace' | '/dashboard/sponsor' | '/dashboard/publisher' | '/login',
  context: AgentToolExecutionContext
): { href: string; blockedReason?: string } {
  const requestedRoute = route as string;

  if (!PROTECTED_ROUTES.has(requestedRoute)) {
    return { href: requestedRoute };
  }

  if (!context.isAuthenticated) {
    const redirect = encodeURIComponent(requestedRoute);
    return { href: `/login?redirect=${redirect}` };
  }

  if (requestedRoute === '/dashboard/sponsor' && context.userRole !== 'sponsor') {
    return {
      href: '/dashboard/publisher',
      blockedReason:
        'This dashboard is sponsor-only. Publisher accounts create and manage ad slot listings in the publisher dashboard.',
    };
  }

  if (requestedRoute === '/dashboard/publisher' && context.userRole !== 'publisher') {
    return {
      href: '/dashboard/sponsor',
      blockedReason:
        'This dashboard is publisher-only. Sponsor accounts create and manage campaigns in the sponsor dashboard.',
    };
  }

  return { href: requestedRoute };
}

function maybeToAllowedMarketplaceType(rawType: string | undefined): MarketplaceFilterType {
  if (!rawType) return 'ALL';
  if (MARKETPLACE_FILTER_TYPES.includes(rawType as MarketplaceFilterType)) {
    return rawType as MarketplaceFilterType;
  }
  return 'ALL';
}

function maybeToAllowedMarketplaceCategory(rawCategory: string | undefined): MarketplaceFilterCategory {
  if (!rawCategory) return 'ALL';
  if (MARKETPLACE_FILTER_CATEGORIES.includes(rawCategory as MarketplaceFilterCategory)) {
    return rawCategory as MarketplaceFilterCategory;
  }
  return 'ALL';
}

function buildMarketplaceHref(params: {
  mode: 'keyword' | 'rag';
  query: string;
  type?: string;
  category?: string;
  available?: boolean;
}): string {
  const queryState = parseMarketplaceQueryState({});

  queryState.page = 1;
  queryState.type = maybeToAllowedMarketplaceType(params.type);
  queryState.category = maybeToAllowedMarketplaceCategory(params.category);
  if (typeof params.available === 'boolean') {
    queryState.availableOnly = params.available;
  }

  if (params.mode === 'rag') {
    queryState.mode = 'rag';
    queryState.ragQuery = params.query;
    queryState.search = '';
  } else {
    queryState.mode = 'keyword';
    queryState.search = params.query;
    queryState.ragQuery = '';
  }

  const queryString = toMarketplaceQueryString(queryState);
  return queryString.length > 0 ? `/marketplace?${queryString}` : '/marketplace';
}

async function executeNavigateToTool(
  toolCall: Extract<AgentToolCall, { name: 'navigate_to' }>,
  context: AgentToolExecutionContext
): Promise<AgentToolExecutionResult> {
  const { href, blockedReason } = resolveAllowedRoute(toolCall.args.route, context);
  const queryParams = toolCall.args.queryParams
    ? new URLSearchParams(toolCall.args.queryParams).toString()
    : '';
  const finalHref = queryParams.length > 0 ? `${href}?${queryParams}` : href;

  context.navigate(finalHref);

  if (blockedReason) {
    return {
      success: false,
      toolName: 'navigate_to',
      errorType: 'forbidden_route',
      message: blockedReason,
    };
  }

  return {
    success: true,
    toolName: 'navigate_to',
    message:
      href === '/dashboard/sponsor'
        ? 'Navigated to /dashboard/sponsor. Sponsor accounts create and manage campaigns here.'
        : href === '/dashboard/publisher'
          ? 'Navigated to /dashboard/publisher. Publisher accounts create and manage ad slot listings here.'
          : `Navigated to ${href}.`,
  };
}

async function executeCampaignPrefillTool(
  toolCall: Extract<AgentToolCall, { name: 'prefill_campaign_form' }>,
  context: AgentToolExecutionContext
): Promise<AgentToolExecutionResult> {
  if (!context.isAuthenticated) {
    context.navigate('/login?redirect=%2Fdashboard%2Fsponsor');
    return {
      success: false,
      toolName: 'prefill_campaign_form',
      errorType: 'unauthenticated',
      message: 'Please log in to create campaigns.',
    };
  }

  if (context.userRole !== 'sponsor') {
    return {
      success: false,
      toolName: 'prefill_campaign_form',
      errorType: 'forbidden_role',
      message: 'Campaign creation is only available for sponsor accounts.',
    };
  }

  if (!context.pathname.startsWith('/dashboard/sponsor')) {
    context.navigate('/dashboard/sponsor');
    await wait(200);
  }

  context.queueCampaignPrefill(toolCall.args);

  return {
    success: true,
    toolName: 'prefill_campaign_form',
    message:
      "I opened the campaign form and filled what I could. Please review and click 'Create Campaign' when ready.",
  };
}

async function executeAdSlotPrefillTool(
  toolCall: Extract<AgentToolCall, { name: 'prefill_ad_slot_form' }>,
  context: AgentToolExecutionContext
): Promise<AgentToolExecutionResult> {
  if (!context.isAuthenticated) {
    context.navigate('/login?redirect=%2Fdashboard%2Fpublisher');
    return {
      success: false,
      toolName: 'prefill_ad_slot_form',
      errorType: 'unauthenticated',
      message: 'Please log in to create ad slots.',
    };
  }

  if (context.userRole !== 'publisher') {
    return {
      success: false,
      toolName: 'prefill_ad_slot_form',
      errorType: 'forbidden_role',
      message: 'Ad slot creation is only available for publisher accounts.',
    };
  }

  if (!context.pathname.startsWith('/dashboard/publisher')) {
    context.navigate('/dashboard/publisher');
    await wait(200);
  }

  context.queueAdSlotPrefill(toolCall.args);

  return {
    success: true,
    toolName: 'prefill_ad_slot_form',
    message:
      "I opened the ad slot form and filled what I could. Please review and click 'Create Ad Slot' when ready.",
  };
}

async function executeRunRagSearchTool(
  toolCall: Extract<AgentToolCall, { name: 'run_marketplace_rag_search' }>,
  context: AgentToolExecutionContext
): Promise<AgentToolExecutionResult> {
  const ragEnabled = await context.getRagEnabled();

  if (!ragEnabled) {
    const keywordHref = buildMarketplaceHref({
      mode: 'keyword',
      query: toolCall.args.query,
      type: toolCall.args.filters?.type,
      category: toolCall.args.filters?.category,
      available: toolCall.args.filters?.available,
    });

    context.navigate(keywordHref);

    return {
      success: true,
      toolName: 'run_marketplace_rag_search',
      message: 'AI search is unavailable right now, so I opened keyword search results in the marketplace.',
    };
  }

  const ragHref = buildMarketplaceHref({
    mode: 'rag',
    query: toolCall.args.query,
    type: toolCall.args.filters?.type,
    category: toolCall.args.filters?.category,
    available: toolCall.args.filters?.available,
  });

  context.navigate(ragHref);

  return {
    success: true,
    toolName: 'run_marketplace_rag_search',
    message: `Opened marketplace AI search for "${toolCall.args.query}".`,
  };
}

export function getToolStatusLabel(toolCall: AgentToolCall): string {
  if (toolCall.name === 'navigate_to') {
    return 'Navigating...';
  }

  if (toolCall.name === 'prefill_campaign_form' || toolCall.name === 'prefill_ad_slot_form') {
    return 'Opening form and filling details...';
  }

  return 'Searching the marketplace...';
}

export async function executeAgentTool(
  toolCall: AgentToolCall,
  context: AgentToolExecutionContext
): Promise<AgentToolExecutionResult> {
  if (toolCall.name === 'navigate_to') {
    return executeNavigateToTool(toolCall, context);
  }

  if (toolCall.name === 'prefill_campaign_form') {
    return executeCampaignPrefillTool(toolCall, context);
  }

  if (toolCall.name === 'prefill_ad_slot_form') {
    return executeAdSlotPrefillTool(toolCall, context);
  }

  return executeRunRagSearchTool(toolCall, context);
}
