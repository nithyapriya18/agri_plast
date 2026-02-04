/**
 * Base URL for API requests. Empty string = same-origin (Next.js API routes).
 * Set NEXT_PUBLIC_API_URL to point to an external backend if needed.
 */
export function getApiBase(): string {
  return typeof process.env.NEXT_PUBLIC_API_URL === 'string'
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : '';
}
