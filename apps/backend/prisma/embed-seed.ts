import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { buildAdSlotEmbeddingText, generateEmbeddings } from '../src/utils/embeddings.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 25;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    chunks.push(items.slice(start, start + chunkSize));
  }
  return chunks;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY is required to run embed-seed');
  }

  console.log('[embed-seed] Loading ad slots...');
  const adSlots = await prisma.adSlot.findMany({
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
    orderBy: { createdAt: 'asc' },
  });

  if (adSlots.length === 0) {
    console.log('[embed-seed] No ad slots found. Nothing to embed.');
    return;
  }

  const docs = adSlots.map((slot) => ({
    id: slot.id,
    embeddingText: buildAdSlotEmbeddingText(slot),
  }));

  console.log(`[embed-seed] Generating embeddings for ${docs.length} ad slots...`);
  const chunks = chunkArray(docs, BATCH_SIZE);
  let processed = 0;

  for (const chunk of chunks) {
    const embeddings = await generateEmbeddings(chunk.map((doc) => doc.embeddingText));

    await Promise.all(
      chunk.map((doc, index) => {
        const embedding = embeddings[index];
        return prisma.$executeRawUnsafe(
          'UPDATE ad_slots SET embedding_text = $1, embedding = $2::vector WHERE id = $3',
          doc.embeddingText,
          toVectorLiteral(embedding),
          doc.id
        );
      })
    );

    processed += chunk.length;
    console.log(`[embed-seed] Embedded ${processed}/${docs.length}`);
  }

  // Create HNSW index for fast similarity search (managed outside Prisma schema)
  console.log('[embed-seed] Creating HNSW index on ad_slots.embedding...');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS ad_slots_embedding_idx
    ON ad_slots USING hnsw (embedding vector_cosine_ops)
  `);

  console.log('[embed-seed] Completed.');
}

main()
  .catch((error) => {
    console.error('[embed-seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

