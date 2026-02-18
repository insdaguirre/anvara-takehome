'use server';

const API_URL = globalThis.process?.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export interface NewsletterSignupValues {
  email: string;
}

export interface NewsletterSignupState {
  success?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: NewsletterSignupValues;
  resetKey?: number;
}

function getStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.length > 0) {
      return payload.error;
    }
  } catch {
    // Ignore and fall back to generic message.
  }

  return fallbackMessage;
}

export async function subscribeToNewsletter(
  prevState: NewsletterSignupState,
  formData: FormData
): Promise<NewsletterSignupState> {
  const email = getStringField(formData, 'email').trim();

  if (!email) {
    return {
      error: 'Email is required',
      fieldErrors: { email: 'Email is required' },
      values: { email },
      resetKey: prevState.resetKey ?? 0,
    };
  }

  try {
    const response = await fetch(`${API_URL}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorMessage = await parseApiError(response, 'Failed to subscribe to newsletter');
      return {
        fieldErrors: { email: errorMessage },
        values: { email },
        resetKey: prevState.resetKey ?? 0,
      };
    }

    return {
      success: true,
      message: 'Thanks for subscribing to our newsletter!',
      resetKey: (prevState.resetKey ?? 0) + 1,
    };
  } catch {
    return {
      error: 'Failed to subscribe to newsletter',
      fieldErrors: { email: 'Failed to subscribe to newsletter' },
      values: { email },
      resetKey: prevState.resetKey ?? 0,
    };
  }
}
