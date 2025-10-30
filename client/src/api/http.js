// Centralized API base URL handling for browser (Vite)
// Usage: apiUrl('/api/status') -> resolves to absolute URL when VITE_DOMAIN_PREFIX is set

const DEFAULT_PORT = (import.meta.env.VITE_SERVER_PORT || "5000").toString();

function normalizeBase(prefixRaw) {
  const raw = (prefixRaw || "").trim();
  if (!raw) return ""; // empty -> use relative URLs

  // If a full URL was provided, use as-is
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, "");

  // If hostname[:port] was provided, default to http and default port when missing
  if (/^[\w.-]+(?::\d+)?$/.test(raw)) {
    const hasPort = /:\d+$/.test(raw);
    const hostPort = hasPort ? raw : `${raw}:${DEFAULT_PORT}`;
    return `http://${hostPort}`;
  }

  // Fallback: return raw (caller beware)
  return raw.replace(/\/$/, "");
}

export const API_BASE = normalizeBase(import.meta.env.VITE_DOMAIN_PREFIX);

export function apiUrl(path) {
  const p = String(path || "");
  if (!p) return API_BASE || "";
  if (/^https?:\/\//i.test(p)) return p; // already absolute
  if (!API_BASE) return p; // relative when base not set
  return `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;
}

export function sseUrl(path) {
  // EventSource prefers absolute URL when crossing origins
  return apiUrl(path);
}
