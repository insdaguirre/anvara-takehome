import request from 'supertest';
import type { Application } from 'express';
import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const openAiCreateMock = vi.fn();
const getSessionMock = vi.fn();
const ragSearchMock = vi.fn();

const prismaMock = {
  sponsor: {
    findUnique: vi.fn(),
  },
  publisher: {
    findUnique: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

vi.mock('../db.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../betterAuth.js', () => ({
  betterAuthInstance: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('openai', () => {
  class OpenAI {
    chat = {
      completions: {
        create: openAiCreateMock,
      },
    };
  }

  return {
    default: OpenAI,
  };
});

vi.mock('../utils/rag.js', () => ({
  ragSearch: ragSearchMock,
  EmbeddingProviderError: class EmbeddingProviderError extends Error {},
  RagRequestTimeoutError: class RagRequestTimeoutError extends Error {},
}));

let app: Application;
let activeUserId = 'user-sponsor-1';
let activeEmail = 'sponsor@example.com';

beforeAll(async () => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.AGENT_ENABLED = 'true';
  process.env.AGENT_RATE_LIMIT_PER_MINUTE = '5';

  ({ default: app } = await import('../app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();

  process.env.AGENT_ENABLED = 'true';

  activeUserId = `user-${randomUUID()}`;
  activeEmail = `${activeUserId}@example.com`;

  getSessionMock.mockImplementation(async () => ({
    user: {
      id: activeUserId,
      email: activeEmail,
    },
  }));

  prismaMock.sponsor.findUnique.mockResolvedValue({ id: 'sponsor-1' });
  prismaMock.publisher.findUnique.mockResolvedValue(null);

  openAiCreateMock.mockResolvedValue({
    choices: [
      {
        message: {
          content: 'Default agent response',
        },
      },
    ],
    usage: {
      prompt_tokens: 20,
      completion_tokens: 10,
      total_tokens: 30,
    },
  });

  ragSearchMock.mockResolvedValue({
    query: 'tech podcasts',
    retrievalCount: 1,
    generationFailed: false,
    phase: 'ranked',
    results: [
      {
        rank: 1,
        relevanceScore: 0.84,
        explanation: 'Strong format match.',
        adSlot: {
          id: 'slot-1',
          name: 'Tech Podcast Mid-roll',
          type: 'PODCAST',
          basePrice: 1200,
          isAvailable: true,
          publisher: {
            name: 'Tech Talks Weekly',
            category: 'Podcast',
            isVerified: true,
          },
        },
      },
    ],
  });
});

describe('Agent route', () => {
  it('allows unauthenticated guest chat with limitation disclosure', async () => {
    getSessionMock.mockResolvedValueOnce(null);

    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'Anvara is a sponsorship marketplace connecting sponsors and publishers.',
          },
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Hello' }],
      userRole: null,
    });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('text');
    expect(response.body.content).toContain('Anvara is a sponsorship marketplace');
    expect(response.body.content).toContain('guest mode');
    expect(response.body.content).toContain('Sign in for the full experience');
  });

  it('rejects role spoofing when not signed in', async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Open my sponsor dashboard' }],
      userRole: 'sponsor',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Role mismatch' });
  });

  it('returns 404 when AGENT_ENABLED is false', async () => {
    process.env.AGENT_ENABLED = 'false';

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Hello' }],
      userRole: 'sponsor',
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('returns a text response for a valid request', async () => {
    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'Anvara connects sponsors and publishers through ad inventory.',
          },
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'How does Anvara work?' }],
      userRole: 'sponsor',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      type: 'text',
      content: 'Anvara connects sponsors and publishers through ad inventory.',
    });
  });

  it('accepts guest fallback role hint for authenticated users', async () => {
    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'How does Anvara work?' }],
      userRole: null,
    });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('text');
  });

  it('returns a campaign prefill tool_call for sponsor role', async () => {
    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_campaign_1',
                type: 'function',
                function: {
                  name: 'prefill_campaign_form',
                  arguments: JSON.stringify({
                    name: 'Summer Sale',
                    budget: 5000,
                    startDate: '2026-03-01',
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 30,
        completion_tokens: 10,
        total_tokens: 40,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Create a Summer Sale campaign with budget 5000' }],
      userRole: 'sponsor',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      type: 'tool_call',
      toolCall: {
        id: 'call_campaign_1',
        name: 'prefill_campaign_form',
        args: {
          name: 'Summer Sale',
          budget: 5000,
          startDate: '2026-03-01',
        },
      },
    });
  });

  it('falls back to campaign prefill tool_call when llm returns plain text for campaign creation intent', async () => {
    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'I can help pre-fill your campaign form for that audience.',
          },
        },
      ],
      usage: {
        prompt_tokens: 24,
        completion_tokens: 9,
        total_tokens: 33,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'I want to start a new campaign for middle aged moms' }],
      userRole: 'sponsor',
    });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('tool_call');
    expect(response.body.toolCall.name).toBe('prefill_campaign_form');
    expect(response.body.toolCall.args).toEqual(
      expect.objectContaining({
        name: expect.stringContaining('middle aged moms'),
        description: expect.stringContaining('middle aged moms'),
      })
    );
    expect(ragSearchMock).not.toHaveBeenCalled();
  });

  it('does not repeat campaign prefill fallback after a tool_result turn', async () => {
    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'Great, your campaign form is open and pre-filled.',
          },
        },
      ],
      usage: {
        prompt_tokens: 30,
        completion_tokens: 10,
        total_tokens: 40,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [
        { role: 'user', content: 'I want to start a new campaign for middle aged moms' },
        {
          role: 'tool_result',
          toolName: 'prefill_campaign_form',
          content: "I opened the campaign form and filled what I could.",
        },
      ],
      userRole: 'sponsor',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      type: 'text',
      content: 'Great, your campaign form is open and pre-filled.',
    });
    expect(ragSearchMock).not.toHaveBeenCalled();
  });

  it('does not return sponsor-only tool calls for publisher role', async () => {
    prismaMock.sponsor.findUnique.mockResolvedValueOnce(null);
    prismaMock.publisher.findUnique.mockResolvedValueOnce({ id: 'publisher-1' });

    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_campaign_2',
                type: 'function',
                function: {
                  name: 'prefill_campaign_form',
                  arguments: JSON.stringify({ name: 'Not Allowed' }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 25,
        completion_tokens: 8,
        total_tokens: 33,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Create a campaign for me' }],
      userRole: 'publisher',
    });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('text');
    expect(response.body.content).toContain("You're signed in as a publisher");
    expect(response.body.content).toContain('Campaign creation is only available to sponsor accounts');
    expect(openAiCreateMock).not.toHaveBeenCalled();
  });

  it('responds with sponsor capability guidance for publisher-style listing requests', async () => {
    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Create a new ad slot listing for my soccer billboard' }],
      userRole: 'sponsor',
    });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('text');
    expect(response.body.content).toContain("You're signed in as a sponsor");
    expect(response.body.content).toContain('Creating ad slot listings is only available to publisher accounts');
    expect(openAiCreateMock).not.toHaveBeenCalled();
  });

  it('rate limits repeated calls for the same user', async () => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_value, index) =>
        request(app)
          .post('/api/agent/chat')
          .send({
            messages: [{ role: 'user', content: `Hello ${index}` }],
            userRole: 'sponsor',
          })
      )
    );

    expect(responses.slice(0, 5).every((response) => response.status === 200)).toBe(true);
    expect(responses[5]?.status).toBe(429);
    expect(responses[5]?.body).toEqual({ error: 'Too many agent requests. Please wait a moment.' });
  });

  it('returns marketplace rag tool_call by default for marketplace navigation', async () => {
    getSessionMock.mockResolvedValueOnce(null);

    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_guest_marketplace_1',
                type: 'function',
                function: {
                  name: 'run_marketplace_rag_search',
                  arguments: JSON.stringify({
                    query: 'tech podcasts',
                    filters: { type: 'PODCAST', available: true },
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 30,
        completion_tokens: 10,
        total_tokens: 40,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Find tech podcasts' }],
      userRole: null,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      type: 'tool_call',
      toolCall: {
        id: 'call_guest_marketplace_1',
        name: 'run_marketplace_rag_search',
        args: {
          query: 'tech podcasts',
          filters: { type: 'PODCAST', available: true },
        },
      },
    });
    expect(ragSearchMock).not.toHaveBeenCalled();
  });

  it('returns inline rag results only when inlineResults=true is requested', async () => {
    getSessionMock.mockResolvedValueOnce(null);

    openAiCreateMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_guest_marketplace_2',
                type: 'function',
                function: {
                  name: 'run_marketplace_rag_search',
                  arguments: JSON.stringify({
                    query: 'tech podcasts',
                    inlineResults: true,
                    filters: { type: 'PODCAST', available: true },
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 30,
        completion_tokens: 10,
        total_tokens: 40,
      },
    });

    const response = await request(app).post('/api/agent/chat').send({
      messages: [{ role: 'user', content: 'Find tech podcasts and keep results here' }],
      userRole: null,
    });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('text');
    expect(response.body.content).toContain('I found');
    expect(response.body.ragResults).toEqual(
      expect.objectContaining({
        query: 'tech podcasts',
        phase: 'ranked',
        retrievalCount: 1,
      })
    );
    expect(ragSearchMock).toHaveBeenCalledTimes(1);
    expect(ragSearchMock).toHaveBeenCalledWith({
      query: 'tech podcasts',
      filters: { type: 'PODCAST', available: true },
    });
  });
});
