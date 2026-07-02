// js/config.js
// ─────────────────────────────────────────────────────────
// Single source of truth for backend configuration.
// Change BASE_URL here — nowhere else.
// ─────────────────────────────────────────────────────────

const CONFIG = {
  BASE_URL:   "http://127.0.0.1:8000",
  ENDPOINTS: {
    scan: "/scan",
  },
  TIMEOUT_MS: 30000, // 30 seconds — WHOIS can be slow on some domains
};