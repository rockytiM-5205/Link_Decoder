// js/ui.js
// ─────────────────────────────────────────────────────────
// Shared UI helpers used across all three pages.
// Pure functions — no DOM side-effects at import time.
// ─────────────────────────────────────────────────────────

const UI = (() => {

  // ── SESSION STORAGE ──────────────────────────────────────

  /** Save the URL the user typed so decoding.html can read it */
  function storeURL(url) {
    sessionStorage.setItem("ld_url", url);
  }

  /** Retrieve the saved URL */
  function getURL() {
    return sessionStorage.getItem("ld_url") || "";
  }

  /** Save the full backend response for result.html */
  function storeScanResult(data) {
    sessionStorage.setItem("ld_result", JSON.stringify(data));
  }

  /** Read the backend response on result.html */
  function getScanResult() {
    try {
      return JSON.parse(sessionStorage.getItem("ld_result"));
    } catch {
      return null;
    }
  }

  // ── VALIDATION ───────────────────────────────────────────

  /** Returns true only for http:// and https:// URLs */
  function isValidURL(str) {
    try {
      const u = new URL(str);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // ── STATUS / SEVERITY MAPS ───────────────────────────────

  /**
   * Backend sends: "pass" | "warn" | "fail"
   * Returns { cls, label, color } for styling.
   */
  function statusMeta(status) {
    const map = {
      pass: { cls: "status-pass", label: "Pass", color: "#0FFFC1" },
      warn: { cls: "status-warn", label: "Warn", color: "#F5A623" },
      fail: { cls: "status-fail", label: "Fail", color: "#FF4C6A" },
    };
    return map[status] || { cls: "status-unknown", label: "Unknown", color: "#5A6478" };
  }

  /**
   * Backend sends: "none" | "low" | "medium" | "high"
   * Returns { cls, label } for the severity badge.
   */
  function severityMeta(severity) {
    const map = {
      none:   { cls: "sev-none",   label: "None"   },
      low:    { cls: "sev-low",    label: "Low"     },
      medium: { cls: "sev-medium", label: "Medium"  },
      high:   { cls: "sev-high",   label: "High"    },
    };
    return map[severity] || { cls: "sev-none", label: "None" };
  }

  // ── DISPLAY HELPERS ──────────────────────────────────────

  /** Converts null / undefined / empty string → "Not Found" */
  function formatValue(val) {
    if (val === null || val === undefined || val === "") return "Not Found";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  }

  /** Truncate a long URL for display only */
  function truncateURL(url, max = 60) {
    if (!url) return "Not Found";
    return url.length > max ? url.slice(0, max) + "…" : url;
  }

  // ── INPUT FEEDBACK ───────────────────────────────────────

  /** Flash the scanner box red briefly on validation error */
  function shakeInput(el) {
    el.style.transition  = "border-color 0.1s";
    el.style.borderColor = "#FF4C6A";
    setTimeout(() => { el.style.borderColor = ""; }, 1400);
  }

  return {
    storeURL, getURL,
    storeScanResult, getScanResult,
    isValidURL,
    statusMeta, severityMeta,
    formatValue, truncateURL,
    shakeInput,
  };
})();