import OpenAI from 'openai';
import { prisma } from '../db.js';
import { Prisma, type AdSlotType } from '../generated/prisma/client.js';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

let openAIClient: OpenAI | null = null;
let openAIClientKey: string | null = null;

export class EmbeddingProviderError extends Error {
  constructor(message = 'AI search temporarily unavailable') {
    super(message);
    this.name = 'EmbeddingProviderError';
  }
}

export type AdSlotWithPublisher = Prisma.AdSlotGetPayload<{
  include: {
    publisher: {
      select: {
        name: true;
        website: true;
        bio: true;
        category: true;
        monthlyViews: true;
        subscriberCount: true;
        isVerified: true;
      };
    };
  };
}>;

function getEmbeddingModel(): string {
  return process.env.RAG_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new EmbeddingProviderError();
  }

  if (!openAIClient || openAIClientKey !== apiKey) {
    openAIClient = new OpenAI({ apiKey });
    openAIClientKey = apiKey;
  }

  return openAIClient;
}

function toYesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

function toStringOrFallback(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function toNumericString(value: Prisma.Decimal | number | null | undefined, fallback = '0'): string {
  if (value === null || value === undefined) return fallback;
  return typeof value === 'number' ? String(value) : value.toString();
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export function buildAdSlotEmbeddingText(adSlot: AdSlotWithPublisher): string {
  return [
    `Ad Slot: ${toStringOrFallback(adSlot.name, 'Untitled ad slot')}`,
    `Type: ${adSlot.type}`,
    `Position: ${toStringOrFallback(adSlot.position, 'Unknown')}`,
    `Price: $${toNumericString(adSlot.basePrice)}/month`,
    `Available: ${toYesNo(adSlot.isAvailable)}`,
    `Description: ${toStringOrFallback(adSlot.description, 'No description provided')}`,
    '',
    `Publisher: ${toStringOrFallback(adSlot.publisher.name, 'Unknown publisher')}`,
    `Publisher Category: ${toStringOrFallback(adSlot.publisher.category, 'Unknown')}`,
    `Publisher Website: ${toStringOrFallback(adSlot.publisher.website, 'Not provided')}`,
    `Publisher Bio: ${toStringOrFallback(adSlot.publisher.bio, 'No bio provided')}`,
    `Monthly Views: ${adSlot.publisher.monthlyViews ?? 0}`,
    `Subscribers: ${adSlot.publisher.subscriberCount ?? 0}`,
    `Verified: ${toYesNo(Boolean(adSlot.publisher.isVerified))}`,
  ].join('\n');
}

export async function generateEmbeddings(
  texts: string[],
  options?: { signal?: AbortSignal }
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  const model = getEmbeddingModel();

  try {
    const response = await client.embeddings.create({
      model,
      input: texts,
    }, options?.signal ? { signal: options.signal } : undefined);

    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new EmbeddingProviderError();
  }
}

export async function generateEmbedding(
  text: string,
  options?: { signal?: AbortSignal }
): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text], options);
  if (!embedding) {
    throw new EmbeddingProviderError();
  }
  return embedding;
}

export async function upsertAdSlotEmbedding(adSlotId: string): Promise<void> {
  const adSlot = await prisma.adSlot.findUnique({
    where: { id: adSlotId },
    include: {
      publisher: {
        select: {
          name: true,
          website: true,
          bio: true,
          category: true,
          monthlyViews: true,
          subscriberCount: true,
          isVerified: true,
        },
      },
    },
  });

  if (!adSlot) return;

  const embeddingText = buildAdSlotEmbeddingText(adSlot);
  const embedding = await generateEmbedding(embeddingText);
  const vector = toVectorLiteral(embedding);

  await prisma.$executeRawUnsafe(
    'UPDATE ad_slots SET embedding_text = $1, embedding = $2::vector WHERE id = $3',
    embeddingText,
    vector,
    adSlotId
  );
}

export const VALID_AD_SLOT_TYPES = [
  'DISPLAY',
  'VIDEO',
  'NATIVE',
  'NEWSLETTER',
  'PODCAST',
] as const satisfies readonly AdSlotType[];
