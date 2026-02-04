/**
 * Session storage for Google-auth user (localStorage). Pattern from mytplus/lib/utils/userStorage.ts.
 */

const STORAGE_KEY = 'agriplast_user_session';
const EMAIL_KEY = 'agriplast_user_email';
const COOKIE_NAME = 'agriplast_user_id';
const COOKIE_MAX_AGE_DAYS = 30;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function storeUserSession(email: string, userId: string, name: string): void {
  const verification = simpleHash(`${email}:${userId}:${name}`);
  const sessionData = {
    email,
    userId,
    name,
    verification,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  localStorage.setItem(EMAIL_KEY, email);
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIE_NAME}=${userId}; path=/; max-age=${COOKIE_MAX_AGE_DAYS * 24 * 60 * 60}; SameSite=Lax`;
  }
}

export function getUserSession(): { email: string; userId: string; name: string } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const sessionData = JSON.parse(stored);
    const { email, userId, name, verification } = sessionData;
    const expectedVerification = simpleHash(`${email}:${userId}:${name}`);
    if (verification !== expectedVerification) {
      clearUserSession();
      return null;
    }
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (sessionData.timestamp && Date.now() - sessionData.timestamp > maxAge) {
      clearUserSession();
      return null;
    }
    return { email, userId, name };
  } catch {
    clearUserSession();
    return null;
  }
}

export function clearUserSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(EMAIL_KEY);
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}
