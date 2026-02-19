const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SetCookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const encodedName = encodeURIComponent(name);
  const cookieParts = document.cookie ? document.cookie.split('; ') : [];

  for (const cookiePart of cookieParts) {
    const separatorIndex = cookiePart.indexOf('=');
    if (separatorIndex === -1) continue;

    const cookieName = cookiePart.slice(0, separatorIndex);
    if (cookieName !== encodedName) continue;

    return decodeURIComponent(cookiePart.slice(separatorIndex + 1));
  }

  return null;
}

export function setCookie(name: string, value: string, options: SetCookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const path = options.path ?? '/';
  const sameSite = options.sameSite ?? 'Lax';

  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${path}`,
    `SameSite=${sameSite}`,
    `max-age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ].join('; ');
}

export function deleteCookie(name: string, path = '/'): void {
  if (typeof document === 'undefined') return;

  document.cookie = [
    `${encodeURIComponent(name)}=`,
    `path=${path}`,
    'SameSite=Lax',
    'max-age=0',
  ].join('; ');
}
