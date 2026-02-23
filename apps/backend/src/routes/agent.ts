import { Router, type Response, type IRouter } from 'express';
import OpenAI from 'openai';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { fromNodeHeaders } from 'better-auth/node';
import { type AuthRequest } from '../auth.js';
import { betterAuthInstance } from '../betterAuth.js';
import { prisma } from '../db.js';
import {
  EmbeddingProviderError,
  RagRequestTimeoutError,
  ragSearch,
} from '../utils/rag.js';
import { parsePositiveIntegerEnv } from '../utils/env.js';

const router: IRouter = Router();

const DEFAULT_AGENT_MODEL = 'gpt-4o-mini';
const DEFAULT_AGENT_TIMEOUT_MS = 10_000;
const DEFAULT_AGENT_RATE_LIMIT_PER_MINUTE = 20;
const MAX_CONVERSATION_MESSAGES = 50;
const MAX_USER_MESSAGE_LENGTH = 1000;
const MAX_ASSISTANT_MESSAGE_LENGTH = 2000;
const MAX_TOOL_RESULT_LENGTH = 2000;

const NAV_ROUTE_MARKETPLACE = '/marketplace';
const NAV_ROUTE_SPONSOR_DASHBOARD = '/dashboard/sponsor';
const NAV_ROUTE_PUBLISHER_DASHBOARD = '/dashboard/publisher';
const NAV_ROUTE_LOGIN = '/login';

const AD_SLOT_TYPES = ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'] as const;

type AgentRole = 'guest' | 'sponsor' | 'publisher';

type AgentRequestMessage =
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

interface AgentChatRequestBody {
  messages?: unknown;
  userRole?: unknown;
}

interface RoleMismatchResolution {
  message: string;
}

interface NavigateToolArgs {
  route: string;
  queryParams?: Record<string, string>;
}

interface PrefillCampaignToolArgs {
  name?: string;
  description?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

interface PrefillAdSlotToolArgs {
  name?: string;
  description?: string;
  type?: (typeof AD_SLOT_TYPES)[number];
  basePrice?: number;
  isAvailable?: boolean;
}

interface RunMarketplaceRagSearchToolArgs {
  query: string;
  filters?: {
    type?: (typeof AD_SLOT_TYPES)[number];
    category?: string;
    available?: boolean;
  };
  inlineResults?: boolean;
}

type SanitizedToolCall =
  | {
      name: 'navigate_to';
      args: NavigateToolArgs;
    }
  | {
      name: 'prefill_campaign_form';
      args: PrefillCampaignToolArgs;
    }
  | {
      name: 'prefill_ad_slot_form';
      args: PrefillAdSlotToolArgs;
    }
  | {
      name: 'run_marketplace_rag_search';
      args: RunMarketplaceRagSearchToolArgs;
    };

let openAIClient: OpenAI | null = null;
let openAIClientKey: string | null = null;

function isAgentEnabled(): boolean {
  return process.env.AGENT_ENABLED?.toLowerCase() === 'true';
}

function getAgentModel(): string {
  return process.env.AGENT_LLM_MODEL?.trim() || process.env.RAG_LLM_MODEL?.trim() || DEFAULT_AGENT_MODEL;
}

function getAgentTimeoutMs(): number {
  const timeoutValue = process.env.AGENT_LLM_TIMEOUT_MS ?? process.env.RAG_LLM_TIMEOUT_MS;
  if (!timeoutValue) return DEFAULT_AGENT_TIMEOUT_MS;

  const parsed = Number(timeoutValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('AGENT_LLM_TIMEOUT_MS must be a positive integer');
  }

  return parsed;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  if (!openAIClient || openAIClientKey !== apiKey) {
    openAIClient = new OpenAI({ apiKey });
    openAIClientKey = apiKey;
  }

  return openAIClient;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Agent LLM request timed out')), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function normalizeRole(role: 'SPONSOR' | 'PUBLISHER'): AgentRole {
  return role === 'SPONSOR' ? 'sponsor' : 'publisher';
}

function coerceAgentRole(value: unknown): AgentRole | null {
  if (value === null || value === 'guest') {
    return 'guest';
  }

  if (value === 'sponsor' || value === 'publisher') {
    return value;
  }

  return null;
}

async function optionalAuthMiddleware(
  req: AuthRequest,
  _res: Response,
  next: () => void
): Promise<void> {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      next();
      return;
    }

    const [sponsor, publisher] = await Promise.all([
      prisma.sponsor.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
      prisma.publisher.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
    ]);

    if (sponsor) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: 'SPONSOR',
        sponsorId: sponsor.id,
      };
      next();
      return;
    }

    if (publisher) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: 'PUBLISHER',
        publisherId: publisher.id,
      };
    }

    next();
  } catch {
    next();
  }
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const [year, month, day] = value.split('-').map((part) => Number(part));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

function parseFinitePositiveNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Number(value);
}

function parseString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed;
}

function getLatestUserMessage(messages: AgentRequestMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user') {
      return message.content;
    }
  }

  return null;
}

function hasCreationIntent(input: string): boolean {
  return /\b(create|make|new|launch|start|build|list|publish|add|setup|set up)\b/i.test(input);
}

function isPublisherInventoryIntent(input: string): boolean {
  return /\b(ad[\s-]?slot|listing|inventory)\b/i.test(input);
}

function isCampaignIntent(input: string): boolean {
  return /\bcampaigns?\b/i.test(input);
}

function resolveRoleMismatch(
  role: AgentRole,
  messages: AgentRequestMessage[]
): RoleMismatchResolution | null {
  if (role === 'guest') return null;

  const latestUserMessage = getLatestUserMessage(messages);
  if (!latestUserMessage) return null;

  if (role === 'sponsor') {
    if (hasCreationIntent(latestUserMessage) && isPublisherInventoryIntent(latestUserMessage)) {
      return {
        message:
          "You're signed in as a sponsor. Sponsor accounts create and manage campaigns and can browse/book marketplace inventory. Creating ad slot listings is only available to publisher accounts. I can help you create a campaign or search for ad slots.",
      };
    }

    return null;
  }

  if (hasCreationIntent(latestUserMessage) && isCampaignIntent(latestUserMessage)) {
    return {
      message:
        "You're signed in as a publisher. Publisher accounts create and manage ad slot listings (inventory). Campaign creation is only available to sponsor accounts. I can help you create a listing or search the marketplace.",
    };
  }

  return null;
}

function buildCampaignPrefillFromUserMessage(input: string): PrefillCampaignToolArgs {
  const parsed: PrefillCampaignToolArgs = {};

  const quotedNameMatch = input.match(/["“”']([^"“”']{3,120})["“”']/);
  if (quotedNameMatch) {
    parsed.name = quotedNameMatch[1].trim();
  }

  const audienceMatch = input.match(/\bfor\s+([^,.!?]{3,120})/i);
  if (audienceMatch) {
    const audience = audienceMatch[1].trim().replace(/\s+/g, ' ');

    if (!parsed.name) {
      parsed.name = `Campaign for ${audience}`.slice(0, 120).trim();
    }

    if (!parsed.description) {
      parsed.description = `Target audience: ${audience}`;
    }
  }

  const budgetMatch = input.match(
    /\b(?:budget|spend|total(?:\s+budget)?)\b[^0-9$]{0,20}\$?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (budgetMatch) {
    const numeric = Number(budgetMatch[1].replace(/,/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) {
      parsed.budget = numeric;
    }
  }

  const startDateMatch = input.match(
    /\bstart(?:ing)?(?:\s+date)?\s*(?:on|is)?\s*(\d{4}-\d{2}-\d{2})\b/i
  );
  if (startDateMatch && isValidDateInput(startDateMatch[1])) {
    parsed.startDate = startDateMatch[1];
  }

  const endDateMatch = input.match(/\bend(?:ing)?(?:\s+date)?\s*(?:on|is|by)?\s*(\d{4}-\d{2}-\d{2})\b/i);
  if (endDateMatch && isValidDateInput(endDateMatch[1])) {
    parsed.endDate = endDateMatch[1];
  }

  if (parsed.startDate && parsed.endDate) {
    const startMs = new Date(`${parsed.startDate}T00:00:00.000Z`).getTime();
    const endMs = new Date(`${parsed.endDate}T00:00:00.000Z`).getTime();
    if (endMs <= startMs) {
      delete parsed.endDate;
    }
  }

  return parsed;
}

function resolveCampaignPrefillFallback(
  role: AgentRole,
  messages: AgentRequestMessage[]
): PrefillCampaignToolArgs | null {
  if (role !== 'sponsor') return null;

  const latestMessage = messages[messages.length - 1];
  if (!latestMessage || latestMessage.role !== 'user') {
    return null;
  }

  const latestUserMessage = latestMessage.content;

  if (!hasCreationIntent(latestUserMessage) || !isCampaignIntent(latestUserMessage)) {
    return null;
  }

  return buildCampaignPrefillFromUserMessage(latestUserMessage);
}

function parseRoleAllowedRoutes(role: AgentRole): string[] {
  if (role === 'sponsor') {
    return [NAV_ROUTE_MARKETPLACE, NAV_ROUTE_SPONSOR_DASHBOARD, NAV_ROUTE_LOGIN];
  }

  if (role === 'publisher') {
    return [NAV_ROUTE_MARKETPLACE, NAV_ROUTE_PUBLISHER_DASHBOARD, NAV_ROUTE_LOGIN];
  }

  return [NAV_ROUTE_MARKETPLACE, NAV_ROUTE_LOGIN];
}

function sanitizeNavigateToArgs(rawArgs: unknown, role: AgentRole): NavigateToolArgs | null {
  if (!rawArgs || typeof rawArgs !== 'object') {
    return null;
  }

  const rawRoute = (rawArgs as { route?: unknown }).route;
  if (typeof rawRoute !== 'string') {
    return null;
  }

  const allowedRoutes = new Set(parseRoleAllowedRoutes(role));
  if (!allowedRoutes.has(rawRoute)) {
    return null;
  }

  const parsed: NavigateToolArgs = { route: rawRoute };

  const rawQueryParams = (rawArgs as { queryParams?: unknown }).queryParams;
  if (rawQueryParams && typeof rawQueryParams === 'object') {
    const queryParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawQueryParams)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        queryParams[key] = value;
      }
    }

    if (Object.keys(queryParams).length > 0) {
      parsed.queryParams = queryParams;
    }
  }

  return parsed;
}

function sanitizePrefillCampaignArgs(rawArgs: unknown): PrefillCampaignToolArgs | null {
  if (!rawArgs || typeof rawArgs !== 'object') {
    return {};
  }

  const parsed: PrefillCampaignToolArgs = {};

  const name = parseString((rawArgs as { name?: unknown }).name, 120);
  if (name) parsed.name = name;

  const description = parseString((rawArgs as { description?: unknown }).description, 1000);
  if (description) parsed.description = description;

  const budget = parseFinitePositiveNumber((rawArgs as { budget?: unknown }).budget);
  if (budget !== undefined) parsed.budget = budget;

  const startDate = parseString((rawArgs as { startDate?: unknown }).startDate, 10);
  if (startDate && isValidDateInput(startDate)) {
    parsed.startDate = startDate;
  }

  const endDate = parseString((rawArgs as { endDate?: unknown }).endDate, 10);
  if (endDate && isValidDateInput(endDate)) {
    parsed.endDate = endDate;
  }

  if (parsed.startDate && parsed.endDate) {
    const startMs = new Date(`${parsed.startDate}T00:00:00.000Z`).getTime();
    const endMs = new Date(`${parsed.endDate}T00:00:00.000Z`).getTime();
    if (endMs <= startMs) {
      delete parsed.endDate;
    }
  }

  return parsed;
}

function sanitizePrefillAdSlotArgs(rawArgs: unknown): PrefillAdSlotToolArgs | null {
  if (!rawArgs || typeof rawArgs !== 'object') {
    return {};
  }

  const parsed: PrefillAdSlotToolArgs = {};

  const name = parseString((rawArgs as { name?: unknown }).name, 120);
  if (name) parsed.name = name;

  const description = parseString((rawArgs as { description?: unknown }).description, 1000);
  if (description) parsed.description = description;

  const type = (rawArgs as { type?: unknown }).type;
  if (typeof type === 'string' && AD_SLOT_TYPES.includes(type as (typeof AD_SLOT_TYPES)[number])) {
    parsed.type = type as (typeof AD_SLOT_TYPES)[number];
  }

  const basePrice = parseFinitePositiveNumber((rawArgs as { basePrice?: unknown }).basePrice);
  if (basePrice !== undefined) parsed.basePrice = basePrice;

  const isAvailable = (rawArgs as { isAvailable?: unknown }).isAvailable;
  if (typeof isAvailable === 'boolean') {
    parsed.isAvailable = isAvailable;
  }

  return parsed;
}

function sanitizeRunMarketplaceRagSearchArgs(rawArgs: unknown): RunMarketplaceRagSearchToolArgs | null {
  if (!rawArgs || typeof rawArgs !== 'object') {
    return null;
  }

  const query = parseString((rawArgs as { query?: unknown }).query, 500);
  if (!query) {
    return null;
  }

  const parsed: RunMarketplaceRagSearchToolArgs = { query };

  const rawFilters = (rawArgs as { filters?: unknown }).filters;
  if (rawFilters && typeof rawFilters === 'object') {
    const filters: RunMarketplaceRagSearchToolArgs['filters'] = {};

    const type = (rawFilters as { type?: unknown }).type;
    if (typeof type === 'string' && AD_SLOT_TYPES.includes(type as (typeof AD_SLOT_TYPES)[number])) {
      filters.type = type as (typeof AD_SLOT_TYPES)[number];
    }

    const category = parseString((rawFilters as { category?: unknown }).category, 120);
    if (category) {
      filters.category = category;
    }

    const available = (rawFilters as { available?: unknown }).available;
    if (typeof available === 'boolean') {
      filters.available = available;
    }

    if (Object.keys(filters).length > 0) {
      parsed.filters = filters;
    }
  }

  const inlineResults = (rawArgs as { inlineResults?: unknown }).inlineResults;
  if (typeof inlineResults === 'boolean') {
    parsed.inlineResults = inlineResults;
  }

  return parsed;
}

function getAllowedToolNames(role: AgentRole): Set<string> {
  const names = new Set<string>(['navigate_to', 'run_marketplace_rag_search']);

  if (role === 'sponsor') {
    names.add('prefill_campaign_form');
  }

  if (role === 'publisher') {
    names.add('prefill_ad_slot_form');
  }

  return names;
}

function sanitizeToolCall(name: string, rawArgs: unknown, role: AgentRole): SanitizedToolCall | null {
  const allowedToolNames = getAllowedToolNames(role);
  if (!allowedToolNames.has(name)) {
    return null;
  }

  if (name === 'navigate_to') {
    const args = sanitizeNavigateToArgs(rawArgs, role);
    return args ? { name: 'navigate_to', args } : null;
  }

  if (name === 'prefill_campaign_form') {
    if (role !== 'sponsor') return null;
    const args = sanitizePrefillCampaignArgs(rawArgs);
    return args ? { name: 'prefill_campaign_form', args } : null;
  }

  if (name === 'prefill_ad_slot_form') {
    if (role !== 'publisher') return null;
    const args = sanitizePrefillAdSlotArgs(rawArgs);
    return args ? { name: 'prefill_ad_slot_form', args } : null;
  }

  if (name === 'run_marketplace_rag_search') {
    const args = sanitizeRunMarketplaceRagSearchArgs(rawArgs);
    return args ? { name: 'run_marketplace_rag_search', args } : null;
  }

  return null;
}

function parseRequestMessages(rawMessages: unknown): AgentRequestMessage[] | null {
  if (!Array.isArray(rawMessages)) {
    return null;
  }

  if (rawMessages.length === 0 || rawMessages.length > MAX_CONVERSATION_MESSAGES) {
    return null;
  }

  const parsed: AgentRequestMessage[] = [];

  for (const item of rawMessages) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const role = (item as { role?: unknown }).role;
    if (role === 'user') {
      const content = (item as { content?: unknown }).content;
      if (
        typeof content !== 'string' ||
        content.trim().length === 0 ||
        content.length > MAX_USER_MESSAGE_LENGTH
      ) {
        return null;
      }

      parsed.push({ role: 'user', content });
      continue;
    }

    if (role === 'assistant') {
      const content = (item as { content?: unknown }).content;
      if (
        typeof content !== 'string' ||
        content.trim().length === 0 ||
        content.length > MAX_ASSISTANT_MESSAGE_LENGTH
      ) {
        return null;
      }

      parsed.push({ role: 'assistant', content });
      continue;
    }

    if (role === 'tool_result') {
      const toolName = (item as { toolName?: unknown }).toolName;
      const content = (item as { content?: unknown }).content;
      if (
        typeof toolName !== 'string' ||
        toolName.trim().length === 0 ||
        typeof content !== 'string' ||
        content.trim().length === 0 ||
        content.length > MAX_TOOL_RESULT_LENGTH
      ) {
        return null;
      }

      parsed.push({ role: 'tool_result', toolName, content });
      continue;
    }

    return null;
  }

  return parsed;
}

function toOpenAIMessages(
  messages: AgentRequestMessage[],
  role: AgentRole
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const basePrompt = [
    'You are Anvara Agent, an assistant for the Anvara sponsorship marketplace.',
    'Anvara connects sponsors with publishers through ad-slot inventory.',
    'Use tools when the user asks to navigate, pre-fill forms, or run marketplace AI search.',
    'Never claim you submitted forms; users must review and submit manually.',
    'If a tool_result message is present, treat it as the outcome of the previously requested action and respond helpfully.',
    'Do not invent platform features that were not described.',
  ];

  const rolePrompt =
    role === 'guest'
      ? [
          'The current user is not signed in.',
          'You may only help with marketplace browsing/search and explain how Anvara works.',
          'If the user asks for dashboard or form actions, explain those require signing in.',
          'Always disclose these guest limitations and tell the user to sign in for the full experience.',
        ]
      : role === 'sponsor'
        ? [
            'The current user is signed in as a SPONSOR.',
            'Sponsors can create/manage campaigns and browse/book marketplace inventory.',
            'Sponsors cannot create ad slot listings; that is publisher-only.',
            'If asked for publisher-only tasks, explicitly say this account is sponsor-only and suggest campaign or marketplace actions.',
          ]
        : [
            'The current user is signed in as a PUBLISHER.',
            'Publishers can create/manage ad slot listings (inventory).',
            'Publishers cannot create campaigns; that is sponsor-only.',
            'If asked for sponsor-only tasks, explicitly say this account is publisher-only and suggest listing or marketplace actions.',
          ];

  const systemPrompt = [...basePrompt, ...rolePrompt].join('\n');

  const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ];

  for (const message of messages) {
    if (message.role === 'user') {
      openAIMessages.push({ role: 'user', content: message.content });
      continue;
    }

    if (message.role === 'assistant') {
      openAIMessages.push({ role: 'assistant', content: message.content });
      continue;
    }

    openAIMessages.push({
      role: 'user',
      content: `Tool result for ${message.toolName}: ${message.content}`,
    });
  }

  return openAIMessages;
}

function buildToolsForRole(role: AgentRole): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const navigationRoutes = parseRoleAllowedRoutes(role);

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'navigate_to',
        description: 'Navigate the user to a specific page in the Anvara application.',
        parameters: {
          type: 'object',
          properties: {
            route: {
              type: 'string',
              enum: navigationRoutes,
              description: 'The route to navigate to.',
            },
            queryParams: {
              type: 'object',
              description: 'Optional URL query parameters to append to the route.',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['route'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'run_marketplace_rag_search',
        description:
          'Search the Anvara marketplace using AI-powered semantic search for ad slots and inventory.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query between 1 and 500 characters.',
            },
            filters: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: AD_SLOT_TYPES,
                },
                category: { type: 'string' },
                available: { type: 'boolean' },
              },
            },
            inlineResults: {
              type: 'boolean',
              description:
                'Optional. Set true only when the user explicitly asks to keep marketplace search results inside this chat panel.',
            },
          },
          required: ['query'],
        },
      },
    },
  ];

  if (role === 'sponsor') {
    tools.push({
      type: 'function',
      function: {
        name: 'prefill_campaign_form',
        description:
          'Open the create campaign form on the sponsor dashboard and pre-fill provided campaign fields.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            budget: { type: 'number' },
            startDate: { type: 'string', description: 'YYYY-MM-DD format.' },
            endDate: { type: 'string', description: 'YYYY-MM-DD format.' },
          },
          required: [],
        },
      },
    });
  }

  if (role === 'publisher') {
    tools.push({
      type: 'function',
      function: {
        name: 'prefill_ad_slot_form',
        description:
          'Open the create ad slot form on the publisher dashboard and pre-fill provided ad slot fields.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: AD_SLOT_TYPES },
            basePrice: { type: 'number' },
            isAvailable: { type: 'boolean' },
          },
          required: [],
        },
      },
    });
  }

  return tools;
}

function parseToolArguments(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function withGuestDisclosure(content: string): string {
  const disclosure =
    'You are in guest mode, so I can only help with marketplace search/browsing and explain how Anvara works. Sign in for the full experience.';

  const normalized = content.toLowerCase();
  if (
    normalized.includes('guest mode') ||
    (normalized.includes('sign in') && normalized.includes('marketplace'))
  ) {
    return content;
  }

  return `${content}\n\n${disclosure}`;
}

function errorResponseForAgentFailure(error: unknown): { statusCode: number; message: string } {
  if (error instanceof EmbeddingProviderError) {
    return { statusCode: 503, message: 'AI search temporarily unavailable' };
  }

  if (error instanceof RagRequestTimeoutError) {
    return { statusCode: 503, message: 'RAG request timed out' };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('openai_api_key')) {
      return { statusCode: 503, message: 'Agent is temporarily unavailable.' };
    }

    if (message.includes('timed out')) {
      return { statusCode: 504, message: 'Agent response timed out. Please try again.' };
    }
  }

  return { statusCode: 500, message: 'Failed to process agent request.' };
}

const agentRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: parsePositiveIntegerEnv('AGENT_RATE_LIMIT_PER_MINUTE', DEFAULT_AGENT_RATE_LIMIT_PER_MINUTE),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many agent requests. Please wait a moment.' },
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id ?? ipKeyGenerator(req.ip ?? '127.0.0.1');
  },
});

router.get('/status', (_req, res: Response) => {
  res.json({ enabled: isAgentEnabled() });
});

router.post('/chat', optionalAuthMiddleware, agentRateLimiter, async (req: AuthRequest, res: Response) => {
  if (!isAgentEnabled()) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const startTime = Date.now();
  const body = (req.body ?? {}) as AgentChatRequestBody;
  const validatedMessages = parseRequestMessages(body.messages);

  if (!validatedMessages) {
    res.status(400).json({ error: 'messages must contain between 1 and 50 valid entries' });
    return;
  }

  const actualRole: AgentRole = req.user ? normalizeRole(req.user.role) : 'guest';
  if (body.userRole !== undefined) {
    const requestedRole = coerceAgentRole(body.userRole);
    if (!requestedRole) {
      res.status(403).json({ error: 'Role mismatch' });
      return;
    }

    const isGuestFallbackFromAuthenticatedClient =
      requestedRole === 'guest' && actualRole !== 'guest' && req.user !== undefined;
    if (!isGuestFallbackFromAuthenticatedClient && requestedRole !== actualRole) {
      res.status(403).json({ error: 'Role mismatch' });
      return;
    }
  }

  const roleMismatchResolution = resolveRoleMismatch(actualRole, validatedMessages);
  if (roleMismatchResolution) {
    res.json({
      type: 'text',
      content: roleMismatchResolution.message,
    });
    return;
  }

  try {
    const tools = buildToolsForRole(actualRole);

    const completion = await withTimeout(
      getOpenAIClient().chat.completions.create({
        model: getAgentModel(),
        temperature: 0.2,
        max_tokens: 500,
        tool_choice: 'auto',
        tools,
        messages: toOpenAIMessages(validatedMessages, actualRole),
      }),
      getAgentTimeoutMs()
    );

    const firstChoice = completion.choices[0]?.message;
    const firstToolCall = firstChoice?.tool_calls?.[0];

    const latencyMs = Date.now() - startTime;

    if (firstToolCall && firstToolCall.type === 'function') {
      const rawArguments = parseToolArguments(firstToolCall.function.arguments);
      const sanitizedToolCall = sanitizeToolCall(firstToolCall.function.name, rawArguments, actualRole);

      if (sanitizedToolCall) {
        if (
          sanitizedToolCall.name === 'run_marketplace_rag_search' &&
          sanitizedToolCall.args.inlineResults === true
        ) {
          const ragResults = await ragSearch({
            query: sanitizedToolCall.args.query,
            filters: sanitizedToolCall.args.filters,
          });

          console.info('agent_chat', {
            userId: req.user?.id ?? null,
            role: req.user?.role ?? 'GUEST',
            toolsCalled: [sanitizedToolCall.name],
            latencyMs,
            tokenUsage: {
              promptTokens: completion.usage?.prompt_tokens ?? null,
              completionTokens: completion.usage?.completion_tokens ?? null,
              totalTokens: completion.usage?.total_tokens ?? null,
            },
            messageCount: validatedMessages.length,
            ragRetrievalCount: ragResults.retrievalCount,
            ragGenerationFailed: ragResults.generationFailed,
            ragPhase: ragResults.phase,
          });

          res.json({
            type: 'text',
            content:
              ragResults.results.length > 0
                ? `I found ${ragResults.results.length} marketplace matches for "${sanitizedToolCall.args.query}".`
                : `I couldn't find matching marketplace inventory for "${sanitizedToolCall.args.query}".`,
            ragResults,
          });
          return;
        }

        console.info('agent_chat', {
          userId: req.user?.id ?? null,
          role: req.user?.role ?? 'GUEST',
          toolsCalled: [sanitizedToolCall.name],
          latencyMs,
          tokenUsage: {
            promptTokens: completion.usage?.prompt_tokens ?? null,
            completionTokens: completion.usage?.completion_tokens ?? null,
            totalTokens: completion.usage?.total_tokens ?? null,
          },
          messageCount: validatedMessages.length,
        });

        res.json({
          type: 'tool_call',
          toolCall: {
            id: firstToolCall.id,
            name: sanitizedToolCall.name,
            args: sanitizedToolCall.args,
          },
        });
        return;
      }
    }

    const campaignPrefillFallback = resolveCampaignPrefillFallback(actualRole, validatedMessages);
    if (!firstToolCall && campaignPrefillFallback) {
      console.info('agent_chat', {
        userId: req.user?.id ?? null,
        role: req.user?.role ?? 'GUEST',
        toolsCalled: ['prefill_campaign_form'],
        latencyMs,
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
          totalTokens: completion.usage?.total_tokens ?? null,
        },
        messageCount: validatedMessages.length,
        fallbackReason: 'campaign_creation_intent',
      });

      res.json({
        type: 'tool_call',
        toolCall: {
          id: 'fallback_prefill_campaign_form',
          name: 'prefill_campaign_form',
          args: campaignPrefillFallback,
        },
      });
      return;
    }

    const responseText =
      typeof firstChoice?.content === 'string' && firstChoice.content.trim().length > 0
        ? firstChoice.content
        : "I couldn't complete that action. Please try rephrasing your request.";
    const finalResponseText = actualRole === 'guest' ? withGuestDisclosure(responseText) : responseText;

    console.info('agent_chat', {
      userId: req.user?.id ?? null,
      role: req.user?.role ?? 'GUEST',
      toolsCalled: [],
      latencyMs,
      tokenUsage: {
        promptTokens: completion.usage?.prompt_tokens ?? null,
        completionTokens: completion.usage?.completion_tokens ?? null,
        totalTokens: completion.usage?.total_tokens ?? null,
      },
      messageCount: validatedMessages.length,
    });

    res.json({
      type: 'text',
      content: finalResponseText,
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('agent_chat_error', {
      userId: req.user?.id ?? null,
      role: req.user?.role ?? 'GUEST',
      latencyMs,
      messageCount: validatedMessages.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const failure = errorResponseForAgentFailure(error);
    res.status(failure.statusCode).json({ error: failure.message });
  }
});

export default router;
