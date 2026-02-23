import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { LruTtlCache } from './cache.js';
import {
  EmbeddingProviderError,
  VALID_AD_SLOT_TYPES,
  generateEmbedding,
} from './embeddings.js';
import { generateRagResponse, type RagGenerationInputListing } from './llm.js';

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 20;
const DEFAULT_SIMILARITY_THRESHOLD = 0.3;
const GLOBAL_RAG_TIMEOUT_MS = 12_000;
const MAX_LISTING_DESCRIPTION_CHARS = 220;

const queryEmbeddingCache = new LruTtlCache<string, number[]>(200, 5 * 60_000);
const ragResponseCache = new LruTtlCache<string, RagSearchResponse>(100, 2 * 60_000);

type AdSlotTypeFilter = (typeof VALID_AD_SLOT_TYPES)[number];

interface RetrievedVectorRow {
  id: string;
  name: string;
  description: string | null;
  type: AdSlotTypeFilter;
  position: string | null;
  width: number | null;
  height: number | null;
  basePrice: string | number;
  cpmFloor: string | number | null;
  isAvailable: boolean;
  publisherId: string;
  publisherName: string;
  publisherWebsite: string | null;
  publisherCategory: string | null;
  publisherMonthlyViews: number | null;
  publisherSubscriberCount: number | null;
  publisherIsVerified: boolean;
  placementCount: number;
  similarity: number;
}

interface RagMarketplaceAdSlot {
  id: string;
  name: string;
  description: string | null;
  type: AdSlotTypeFilter;
  position: string | null;
  width: number | null;
  height: number | null;
  basePrice: number;
  cpmFloor: number | null;
  isAvailable: boolean;
  publisher: {
    id: string;
    name: string;
    website: string | null;
    category: string | null;
    monthlyViews: number | null;
    subscriberCount: number | null;
    isVerified: boolean;
  };
  _count: { placements: number };
}

interface RagRetrieveResult {
  queryEmbedding: number[];
  rows: RetrievedVectorRow[];
  retrievalCount: number;
}

export interface RagSearchFilters {
  type?: AdSlotTypeFilter;
  category?: string;
  available?: boolean;
}

export interface RagSearchResult {
  adSlot: RagMarketplaceAdSlot;
  rank: number;
  relevanceScore: number;
  explanation: string | null;
}

export interface RagSearchResponse {
  results: RagSearchResult[];
  query: string;
  retrievalCount: number;
  generationFailed: boolean;
  phase: 'retrieval' | 'ranked';
}

export class RagRequestTimeoutError extends Error {
  constructor(message = 'RAG request timed out') {
    super(message);
    this.name = 'RagRequestTimeoutError';
  }
}

function isAbortError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new RagRequestTimeoutError();
  }
}

function parseSimilarityThreshold(): number {
  const raw = process.env.RAG_SIMILARITY_THRESHOLD;
  if (!raw) return DEFAULT_SIMILARITY_THRESHOLD;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error('RAG_SIMILARITY_THRESHOLD must be a number between 0 and 1');
  }

  return parsed;
}

function parseTopK(rawTopK: number | undefined): number {
  const configuredDefault = process.env.RAG_TOP_K ? Number(process.env.RAG_TOP_K) : DEFAULT_TOP_K;
  const safeDefault =
    Number.isInteger(configuredDefault) && configuredDefault > 0
      ? Math.min(MAX_TOP_K, configuredDefault)
      : DEFAULT_TOP_K;

  if (!Number.isInteger(rawTopK)) return safeDefault;
  const parsedTopK = rawTopK as number;
  return Math.max(1, Math.min(MAX_TOP_K, parsedTopK));
}

function normalizeQueryForCache(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toShortDescription(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return null;
  if (trimmed.length <= MAX_LISTING_DESCRIPTION_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_LISTING_DESCRIPTION_CHARS - 1)}…`;
}

function createResponseCacheKey(params: {
  embedding: number[];
  filters: RagSearchFilters | undefined;
  topK: number;
  threshold: number;
  skipRanking: boolean;
}): string {
  const floatArray = new Float64Array(params.embedding);
  const embeddingBuffer = Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);

  return crypto
    .createHash('sha256')
    .update(embeddingBuffer)
    .update(
      JSON.stringify({
        filters: params.filters ?? {},
        topK: params.topK,
        threshold: params.threshold,
        skipRanking: params.skipRanking,
      })
    )
    .digest('hex');
}

function rowToAdSlot(row: RetrievedVectorRow): RagMarketplaceAdSlot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    position: row.position,
    width: row.width,
    height: row.height,
    basePrice: toNumber(row.basePrice) ?? 0,
    cpmFloor: toNumber(row.cpmFloor),
    isAvailable: row.isAvailable,
    publisher: {
      id: row.publisherId,
      name: row.publisherName,
      website: row.publisherWebsite,
      category: row.publisherCategory,
      monthlyViews: row.publisherMonthlyViews,
      subscriberCount: row.publisherSubscriberCount,
      isVerified: row.publisherIsVerified,
    },
    _count: {
      placements: Number.isFinite(row.placementCount) ? Number(row.placementCount) : 0,
    },
  };
}

function rowToGenerationListing(row: RetrievedVectorRow): RagGenerationInputListing {
  return {
    id: row.id,
    name: row.name,
    category: row.publisherCategory,
    price: toNumber(row.basePrice) ?? 0,
    isVerified: row.publisherIsVerified,
    description: toShortDescription(row.description),
  };
}

async function runVectorSearch(params: {
  queryEmbedding: number[];
  topK: number;
  filters?: RagSearchFilters;
  similarityThreshold: number;
}): Promise<RetrievedVectorRow[]> {
  const vector = toVectorLiteral(params.queryEmbedding);
  const values: unknown[] = [vector];

  let sql = `
    SELECT
      a.id,
      a.name,
      a.description,
      a.type,
      a.position,
      a.width,
      a.height,
      a."basePrice" AS "basePrice",
      a."cpmFloor" AS "cpmFloor",
      a."isAvailable" AS "isAvailable",
      p.id AS "publisherId",
      p.name AS "publisherName",
      p.website AS "publisherWebsite",
      p.category AS "publisherCategory",
      p."monthlyViews" AS "publisherMonthlyViews",
      p."subscriberCount" AS "publisherSubscriberCount",
      p."isVerified" AS "publisherIsVerified",
      COALESCE(pc.placement_count, 0) AS "placementCount",
      1 - (a.embedding <=> $1::vector) AS similarity
    FROM ad_slots a
    JOIN publishers p ON p.id = a."publisherId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS placement_count
      FROM placements pl
      WHERE pl."adSlotId" = a.id
    ) pc ON true
    WHERE a.embedding IS NOT NULL
  `;

  if (params.filters?.type) {
    values.push(params.filters.type);
    sql += ` AND a.type = $${values.length}`;
  }

  if (params.filters?.category) {
    values.push(params.filters.category);
    sql += ` AND p.category = $${values.length}`;
  }

  if (params.filters?.available !== undefined) {
    values.push(params.filters.available);
    sql += ` AND a."isAvailable" = $${values.length}`;
  }

  values.push(params.similarityThreshold);
  const thresholdIndex = values.length;

  values.push(params.topK);
  const limitIndex = values.length;

  sql += `
    AND (1 - (a.embedding <=> $1::vector)) >= $${thresholdIndex}
    ORDER BY a.embedding <=> $1::vector
    LIMIT $${limitIndex}
  `;

  const [, rows] = await prisma.$transaction([
    prisma.$executeRawUnsafe('SET LOCAL hnsw.ef_search = 40'),
    prisma.$queryRawUnsafe<RetrievedVectorRow[]>(sql, ...values),
  ]);

  return rows as RetrievedVectorRow[];
}

function buildVectorResponse(params: {
  query: string;
  rows: RetrievedVectorRow[];
  retrievalCount: number;
  generationFailed: boolean;
  phase: 'retrieval' | 'ranked';
}): RagSearchResponse {
  return {
    query: params.query,
    retrievalCount: params.retrievalCount,
    generationFailed: params.generationFailed,
    phase: params.phase,
    results: params.rows.map((row, index) => ({
      adSlot: rowToAdSlot(row),
      rank: index + 1,
      relevanceScore: clampScore(row.similarity),
      explanation: null,
    })),
  };
}

async function resolveQueryEmbedding(query: string, signal?: AbortSignal): Promise<number[]> {
  const normalizedQuery = normalizeQueryForCache(query);
  const cached = queryEmbeddingCache.get(normalizedQuery);
  if (cached) {
    return cached;
  }

  throwIfAborted(signal);
  const queryEmbedding = await generateEmbedding(query, { signal });
  queryEmbeddingCache.set(normalizedQuery, queryEmbedding);
  return queryEmbedding;
}

async function ragRetrieve(params: {
  query: string;
  topK: number;
  filters?: RagSearchFilters;
  similarityThreshold: number;
  queryEmbedding?: number[];
  signal?: AbortSignal;
}): Promise<RagRetrieveResult> {
  throwIfAborted(params.signal);

  const queryEmbedding = params.queryEmbedding ?? (await resolveQueryEmbedding(params.query, params.signal));
  const rows = await runVectorSearch({
    queryEmbedding,
    topK: params.topK,
    filters: params.filters,
    similarityThreshold: params.similarityThreshold,
  });

  throwIfAborted(params.signal);
  return {
    queryEmbedding,
    rows,
    retrievalCount: rows.length,
  };
}

async function ragRank(params: {
  query: string;
  rows: RetrievedVectorRow[];
  retrievalCount: number;
  signal?: AbortSignal;
}): Promise<RagSearchResponse> {
  if (params.rows.length === 0) {
    return {
      query: params.query,
      retrievalCount: params.retrievalCount,
      generationFailed: false,
      phase: 'ranked',
      results: [],
    };
  }

  try {
    throwIfAborted(params.signal);
    const generated = await generateRagResponse({
      userQuery: params.query,
      listings: params.rows.map(rowToGenerationListing),
      signal: params.signal,
    });

    const availableRowsById = new Map(params.rows.map((row) => [row.id, row]));
    const seen = new Set<string>();
    const validated = generated
      .filter((item) => {
        if (!availableRowsById.has(item.adSlotId)) return false;
        if (seen.has(item.adSlotId)) return false;
        seen.add(item.adSlotId);
        return true;
      })
      .sort((a, b) => a.rank - b.rank);

    return {
      query: params.query,
      retrievalCount: params.retrievalCount,
      generationFailed: false,
      phase: 'ranked',
      results: validated.map((item, index) => {
        const row = availableRowsById.get(item.adSlotId)!;
        return {
          adSlot: rowToAdSlot(row),
          rank: index + 1,
          relevanceScore: clampScore(item.relevanceScore),
          explanation: item.explanation,
        };
      }),
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw new RagRequestTimeoutError();
    }

    return buildVectorResponse({
      query: params.query,
      rows: params.rows,
      retrievalCount: params.retrievalCount,
      generationFailed: true,
      phase: 'ranked',
    });
  }
}

async function runRagSearchFlow(params: {
  query: string;
  topK?: number;
  filters?: RagSearchFilters;
  skipRanking?: boolean;
  signal?: AbortSignal;
}): Promise<RagSearchResponse> {
  const topK = parseTopK(params.topK);
  const similarityThreshold = parseSimilarityThreshold();
  const skipRanking = params.skipRanking === true;

  const queryEmbedding = await resolveQueryEmbedding(params.query, params.signal);
  throwIfAborted(params.signal);

  const responseCacheKey = createResponseCacheKey({
    embedding: queryEmbedding,
    filters: params.filters,
    topK,
    threshold: similarityThreshold,
    skipRanking,
  });
  const cachedResponse = ragResponseCache.get(responseCacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const retrieval = await ragRetrieve({
    query: params.query,
    topK,
    filters: params.filters,
    similarityThreshold,
    queryEmbedding,
    signal: params.signal,
  });

  const response = skipRanking
    ? buildVectorResponse({
        query: params.query,
        rows: retrieval.rows,
        retrievalCount: retrieval.retrievalCount,
        generationFailed: false,
        phase: 'retrieval',
      })
    : await ragRank({
        query: params.query,
        rows: retrieval.rows,
        retrievalCount: retrieval.retrievalCount,
        signal: params.signal,
      });

  throwIfAborted(params.signal);
  ragResponseCache.set(responseCacheKey, response);
  return response;
}

export async function ragSearch(params: {
  query: string;
  topK?: number;
  filters?: RagSearchFilters;
  skipRanking?: boolean;
}): Promise<RagSearchResponse> {
  const abortController = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      abortController.abort();
      reject(new RagRequestTimeoutError());
    }, GLOBAL_RAG_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      runRagSearchFlow({
        query: params.query,
        topK: params.topK,
        filters: params.filters,
        skipRanking: params.skipRanking,
        signal: abortController.signal,
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof RagRequestTimeoutError || isAbortError(error) || abortController.signal.aborted) {
      throw new RagRequestTimeoutError();
    }

    throw error;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export { EmbeddingProviderError };
