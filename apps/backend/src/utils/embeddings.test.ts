import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { buildAdSlotEmbeddingText, type AdSlotWithPublisher } from './embeddings.js';

describe('buildAdSlotEmbeddingText', () => {
  it('builds the expected embedding template with ad slot and publisher context', () => {
    const adSlot = {
      name: 'Mid-roll Host Read',
      type: 'PODCAST',
      position: 'mid-roll',
      basePrice: new Prisma.Decimal('1200.00'),
      isAvailable: true,
      description: 'A 30-second host-read ad.',
      publisher: {
        name: 'Tech Talks Weekly',
        category: 'Podcast',
        website: 'https://techtalks.example',
        bio: 'Weekly interviews with founders and engineers.',
        monthlyViews: 42000,
        subscriberCount: 18000,
        isVerified: true,
      },
    } as unknown as AdSlotWithPublisher;

    const text = buildAdSlotEmbeddingText(adSlot);

    expect(text).toContain('Ad Slot: Mid-roll Host Read');
    expect(text).toContain('Type: PODCAST');
    expect(text).toContain('Position: mid-roll');
    expect(text).toContain('Price: $1200/month');
    expect(text).toContain('Available: yes');
    expect(text).toContain('Description: A 30-second host-read ad.');
    expect(text).toContain('Publisher: Tech Talks Weekly');
    expect(text).toContain('Publisher Category: Podcast');
    expect(text).toContain('Publisher Website: https://techtalks.example');
    expect(text).toContain('Monthly Views: 42000');
    expect(text).toContain('Subscribers: 18000');
    expect(text).toContain('Verified: yes');
  });
});
