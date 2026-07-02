// js/config.js
// ─────────────────────────────────────────────────────────
// Single source of truth for backend configuration.
// Change BASE_URL here — nowhere else.
// ─────────────────────────────────────────────────────────

const CONFIG = {
  BASE_URL:   "https://linkdecoder-ai.onrender.com",
  ENDPOINTS: {
    scan: "/scan",
  },
  TIMEOUT_MS: 30000, // 30 seconds — WHOIS can be slow on some domains
};