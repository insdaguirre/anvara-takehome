import OpenAI from 'openai';

const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const DEFAULT_LLM_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

let openAIClient: OpenAI | null = null;
let openAIClientKey: string | null = null;

export interface RagGenerationInputListing {
  id: string;
  name: string;
  category: string | null;
  price: number;
  isVerified: boolean;
  description: string | null;
}

export interface RagGenerationResult {
  adSlotId: string;
  rank: number;
  relevanceScore: number;
  explanation: string;
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

function getLlmModel(): string {
  return process.env.RAG_LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
}

function getLlmTimeoutMs(): number {
  const value = process.env.RAG_LLM_TIMEOUT_MS;
  if (!value) return DEFAULT_LLM_TIMEOUT_MS;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('RAG_LLM_TIMEOUT_MS must be a positive integer');
  }

  return parsed;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('LLM request timed out')), timeoutMs);

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

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseGenerationPayload(payload: unknown): RagGenerationResult[] {
  if (!payload || typeof payload !== 'object' || !('results' in payload)) {
    return [];
  }

  const rawResults = (payload as { results?: unknown }).results;
  if (!Array.isArray(rawResults)) return [];

  const parsed: RagGenerationResult[] = [];
  for (const item of rawResults) {
    if (!item || typeof item !== 'object') continue;

    const adSlotId =
      (item as { adSlotId?: unknown; id?: unknown }).adSlotId ??
      (item as { adSlotId?: unknown; id?: unknown }).id;
    const rank = (item as { rank?: unknown }).rank;
    const relevanceScore = (item as { relevanceScore?: unknown }).relevanceScore;
    const explanation = (item as { explanation?: unknown }).explanation;

    if (typeof adSlotId !== 'string' || adSlotId.trim().length === 0) continue;
    if (typeof rank !== 'number' || !Number.isFinite(rank)) continue;
    if (typeof relevanceScore !== 'number' || !Number.isFinite(relevanceScore)) continue;
    if (typeof explanation !== 'string' || explanation.trim().length === 0) continue;

    parsed.push({
      adSlotId: adSlotId.trim(),
      rank: Math.max(1, Math.round(rank)),
      relevanceScore: clampScore(relevanceScore),
      explanation: explanation.trim(),
    });
  }

  return parsed;
}

export async function generateRagResponse(params: {
  userQuery: string;
  listings: RagGenerationInputListing[];
  signal?: AbortSignal;
}): Promise<RagGenerationResult[]> {
  const client = getOpenAIClient();
  const model = getLlmModel();
  const timeoutMs = getLlmTimeoutMs();

  const systemPrompt = [
    'You are a marketplace search assistant for Anvara, a sponsorship marketplace.',
    "Given a user's search query and a list of retrieved ad slot listings,",
    'rank them by relevance and explain why each is a good match.',
    '',
    'Rules:',
    '- ONLY reference information present in the provided listings. Never invent data.',
    '- Return valid JSON matching the schema below.',
    '- If no listings are relevant, return an empty results array.',
    '- Keep explanations to 1-2 sentences.',
    '- Each result adSlotId must match a listing id exactly.',
  ].join('\n');

  const userPrompt = [
    `User query: "${params.userQuery}"`,
    '',
    'Retrieved listings:',
    JSON.stringify(params.listings),
    '',
    'Return JSON:',
    '{',
    '  "results": [',
    '    {',
    '      "adSlotId": "string",',
    '      "rank": number,',
    '      "relevanceScore": number,',
    '      "explanation": "string"',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const completion = await withTimeout(
        client.chat.completions.create({
          model,
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }, params.signal ? { signal: params.signal } : undefined),
        timeoutMs
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM returned empty content');
      }

      const parsed = JSON.parse(content) as unknown;
      return parseGenerationPayload(parsed);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('LLM generation failed');
}
