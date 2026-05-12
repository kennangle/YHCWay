export function getAppBaseUrl(): string {
  // Prefer explicit APP_BASE_URL when set
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;

  // Legacy Replit fallback
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }

  // Final fallback
  return "http://localhost:5000";
}
