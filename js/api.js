// js/api.js
// ─────────────────────────────────────────────────────────
// All network calls live here. Nothing else should use fetch().
// ─────────────────────────────────────────────────────────

const API = (() => {

  /**
   * scanURL(url)
   * POST /scan  →  { input_url, final_url, verdict, risk_score, checks[] }
   *
   * Throws a typed error on:
   *   - network failure / backend offline
   *   - HTTP 422 (unprocessable entity)
   *   - any non-2xx response
   *   - request timeout
   */
  async function scanURL(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

    let response;

    try {
      response = await fetch(CONFIG.BASE_URL + CONFIG.ENDPOINTS.scan, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url }),
        signal:  controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new AppError("timeout", "The request timed out. Backend may be slow or unreachable.");
      }
      throw new AppError("offline", "Cannot reach the backend. Make sure the server is running on " + CONFIG.BASE_URL);
    }

    clearTimeout(timer);

    // FastAPI validation error
    if (response.status === 422) {
      throw new AppError("invalid", "The server rejected the URL (422). Check the format and try again.");
    }

    if (!response.ok) {
      throw new AppError("server", `Server returned an error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  return { scanURL };
})();


/**
 * AppError
 * Typed error class so UI can show specific friendly messages.
 * Codes: "offline" | "timeout" | "invalid" | "server" | "unknown"
 */
class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}