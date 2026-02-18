import { Router, type Request, type Response, type IRouter } from 'express';
import { prisma } from '../db.js';
import { isValidEmail } from '../utils/helpers.js';

const router: IRouter = Router();

const BUDGET_OPTIONS = ['<$5k', '$5k-$10k', '$10k-$25k', '$25k+', 'Custom'] as const;
const TIMELINE_OPTIONS = ['ASAP', '1-2 weeks', '1 month', '2-3 months', 'Flexible'] as const;
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENTS_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

interface QuoteAttachment {
  name: string;
  type: string;
  size: number;
  base64Data: string;
}

function parseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseOptionalString(value: unknown): string | undefined {
  const parsed = parseString(value);
  return parsed.length > 0 ? parsed : undefined;
}

function parseAttachment(value: unknown): QuoteAttachment | null {
  if (!value || typeof value !== 'object') return null;

  const attachmentValue = value as Record<string, unknown>;
  const name = parseString(attachmentValue.name);
  const type = parseString(attachmentValue.type);
  const size = Number(attachmentValue.size);
  const base64Data = parseString(attachmentValue.base64Data);

  if (!name || !type || !Number.isFinite(size) || !base64Data) {
    return null;
  }

  return {
    name,
    type,
    size,
    base64Data,
  };
}

function validateAttachments(rawAttachments: unknown): { attachments: QuoteAttachment[]; error?: string } {
  if (rawAttachments === undefined || rawAttachments === null) {
    return { attachments: [] };
  }

  if (!Array.isArray(rawAttachments)) {
    return { attachments: [], error: 'Attachments must be an array of files.' };
  }

  if (rawAttachments.length > MAX_ATTACHMENT_COUNT) {
    return { attachments: [], error: `You can upload up to ${MAX_ATTACHMENT_COUNT} files.` };
  }

  const attachments: QuoteAttachment[] = [];

  for (const attachmentValue of rawAttachments) {
    const attachment = parseAttachment(attachmentValue);
    if (!attachment) {
      return { attachments: [], error: 'Each attachment must include name, type, size, and base64Data.' };
    }

    if (attachment.name.length > 255) {
      return { attachments: [], error: `Attachment ${attachment.name} has an invalid file name.` };
    }

    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) {
      return { attachments: [], error: `${attachment.name} has an unsupported file type.` };
    }

    if (attachment.size <= 0 || attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return {
        attachments: [],
        error: `${attachment.name} must be ${Math.floor(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024))}MB or smaller.`,
      };
    }

    const maxBase64Length = Math.ceil((MAX_ATTACHMENT_SIZE_BYTES * 4) / 3) + 4;
    if (attachment.base64Data.length > maxBase64Length) {
      return { attachments: [], error: `${attachment.name} is too large to process.` };
    }

    attachments.push(attachment);
  }

  const totalSize = attachments.reduce((sum, attachment) => sum + attachment.size, 0);
  if (totalSize > MAX_TOTAL_ATTACHMENTS_SIZE_BYTES) {
    return {
      attachments: [],
      error: `Total attachment size must be ${Math.floor(MAX_TOTAL_ATTACHMENTS_SIZE_BYTES / (1024 * 1024))}MB or less.`,
    };
  }

  return { attachments };
}

// POST /api/quotes/request - Submit quote request (dummy endpoint)
router.post('/request', async (req: Request, res: Response) => {
  try {
    const adSlotId = parseString(req.body?.adSlotId);
    const email = parseString(req.body?.email).toLowerCase();
    const companyName = parseString(req.body?.companyName);
    const phone = parseOptionalString(req.body?.phone);
    const budget = parseOptionalString(req.body?.budget);
    const goals = parseOptionalString(req.body?.goals);
    const timeline = parseOptionalString(req.body?.timeline);
    const message = parseString(req.body?.message);
    const attachmentValidation = validateAttachments(req.body?.attachments);

    const fieldErrors: Record<string, string> = {};

    if (!adSlotId) {
      fieldErrors.adSlotId = 'Ad slot is required';
    }

    if (!email) {
      fieldErrors.email = 'Email is required';
    } else if (email.length > 254) {
      fieldErrors.email = 'Email must be 254 characters or fewer';
    } else if (!isValidEmail(email)) {
      fieldErrors.email = 'Please enter a valid email address';
    }

    if (!companyName) {
      fieldErrors.companyName = 'Company name is required';
    } else if (companyName.length > 200) {
      fieldErrors.companyName = 'Company name must be 200 characters or fewer';
    }

    if (phone && phone.length > 50) {
      fieldErrors.phone = 'Phone must be 50 characters or fewer';
    }

    if (budget && !BUDGET_OPTIONS.includes(budget as (typeof BUDGET_OPTIONS)[number])) {
      fieldErrors.budget = 'Please select a valid budget range';
    }

    if (goals && goals.length > 500) {
      fieldErrors.goals = 'Goals must be 500 characters or fewer';
    }

    if (timeline && !TIMELINE_OPTIONS.includes(timeline as (typeof TIMELINE_OPTIONS)[number])) {
      fieldErrors.timeline = 'Please select a valid timeline';
    }

    if (!message) {
      fieldErrors.message = 'Message is required';
    } else if (message.length < 10) {
      fieldErrors.message = 'Message must be at least 10 characters';
    } else if (message.length > 2000) {
      fieldErrors.message = 'Message must be 2000 characters or fewer';
    }

    if (attachmentValidation.error) {
      fieldErrors.attachments = attachmentValidation.error;
    }

    if (Object.keys(fieldErrors).length > 0) {
      res.status(400).json({
        error: 'Please review the highlighted fields and try again.',
        fieldErrors,
      });
      return;
    }

    const adSlot = await prisma.adSlot.findUnique({
      where: { id: adSlotId },
      select: { id: true, name: true, isAvailable: true },
    });

    if (!adSlot) {
      res.status(404).json({ error: 'Ad slot not found' });
      return;
    }

    if (!adSlot.isAvailable) {
      res.status(400).json({ error: 'Ad slot is no longer available' });
      return;
    }

    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const quoteId = `quote_${Date.now()}_${randomSuffix}`;

    console.log('Quote request received:', {
      quoteId,
      adSlotId: adSlot.id,
      adSlotName: adSlot.name,
      email,
      companyName,
      phone: phone || null,
      budget: budget || null,
      goals: goals || null,
      timeline: timeline || null,
      message,
      attachments:
        attachmentValidation.attachments.length > 0
          ? attachmentValidation.attachments.map((attachment) => ({
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
            }))
          : [],
      submittedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      quoteId,
      message: 'Thanks for your quote request! We will review it and follow up shortly.',
    });
  } catch (error) {
    console.error('Error submitting quote request:', error);
    res.status(500).json({ error: 'Failed to submit quote request. Please try again.' });
  }
});

export default router;
