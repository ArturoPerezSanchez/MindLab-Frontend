/** Builds URLs against the current public API contract. */
export const API_V1_PREFIX = "/api/v1";
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export function apiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${API_V1_PREFIX}${normalizedPath}`;
}
