import { env } from '../config/env';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const getBaseOrigin = () => {
  const raw = String(env.apiBaseUrl || '').trim();
  if (!raw) {
    return '';
  }

  const normalizedBase = raw.endsWith('/') ? raw.slice(0, -1) : raw;

  try {
    return new URL(normalizedBase).origin;
  } catch {
    return '';
  }
};

const isLocalhostUrl = (url: string) => /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url);

export const resolveMediaUrl = (value?: string | null): string | undefined => {
  const raw = String(value || '').trim();
  if (!raw) {
    return undefined;
  }

  const baseOrigin = getBaseOrigin();

  if (ABSOLUTE_URL_REGEX.test(raw)) {
    if (!baseOrigin || !isLocalhostUrl(raw)) {
      return raw;
    }

    // Rewrite localhost image URLs to configured API host for physical devices.
    return raw.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, baseOrigin);
  }

  if (!baseOrigin) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return `${baseOrigin}${raw}`;
  }

  if (raw.startsWith('uploads/')) {
    return `${baseOrigin}/${raw}`;
  }

  return raw;
};
