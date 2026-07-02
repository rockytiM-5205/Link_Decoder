// js/result.js
// ─────────────────────────────────────────────────────────
// Reads the scan result from sessionStorage and renders
// result.html. Every check card is built dynamically —
// nothing is hardcoded.
// ─────────────────────────────────────────────────────────

(function () {

  // ── RISK TIER ─────────────────────────────────────────────

  /**
   * riskTier(verdict, score)
   * Maps engine.py's verdict string → CSS tier class.
   * engine.py emits: "safe" | "suspicious" | "dangerous"
   * Falls back to score thresholds if verdict is missing.
   */
  function riskTier(verdict, score) {
    if (verdict === "HIGH_RISK")   return "risk-high";
    if (verdict === "MEDIUM_RISK") return "risk-medium";
    if (verdict === "SAFE")        return "risk-low";
    // Fallback: derive from score (score may be a string from API)
    const s = Number(score);
    if (s >= 60) return "risk-high";
    if (s >= 25) return "risk-medium";
    return "risk-low";
  }

  /**
   * riskLabel(verdict, score)
   * Returns the human-readable heading shown under the score ring.
   */
  function riskLabel(verdict, score) {
    if (verdict === "HIGH_RISK")   return "High Risk";
    if (verdict === "MEDIUM_RISK") return "Suspicious";
    if (verdict === "SAFE")        return "Likely Safe";
    const s = Number(score);
    if (s >= 60) return "High Risk";
    if (s >= 25) return "Suspicious";
    return "Likely Safe";
  }

  /**
   * verdictDisplay(verdict)
   * Capitalizes the verdict string for display in the pill.
   * "dangerous" → "Dangerous", etc.
   */
  function verdictDisplay(verdict) {
    const map = {
      "HIGH_RISK":   "High Risk",
      "MEDIUM_RISK": "Medium Risk",
      "SAFE":        "Safe",
    };
    return map[verdict] || verdict;
  }

  // ── RENDER HELPERS ────────────────────────────────────────

  /**
   * buildCheckCard(check, index)
   * Returns an HTML string for one check card.
   * Reads: check.name, check.status, check.severity, check.detail, check.data
   * Never displays raw null — falls back to "Not Found".
   */
  function buildCheckCard(check, index) {
    const statusM   = UI.statusMeta(check.status);
    const severityM = UI.severityMeta(check.severity);
    const name      = UI.formatValue(check.name);
    const detail    = UI.formatValue(check.detail);

    // Render check.data only if it's a non-empty object
    let dataHTML = "";
    if (check.data && typeof check.data === "object" && Object.keys(check.data).length > 0) {
      const rows = Object.entries(check.data)
        .map(([k, v]) => {
          // Arrays (e.g. redirect chain) → numbered list, not raw JSON
          let display;
          if (Array.isArray(v)) {
            display = v.length
              ? v.map((u, i) => `<span class="chain-hop">${i + 1}. ${UI.formatValue(u)}</span>`).join("")
              : "None";
          } else {
            display = UI.formatValue(v);
          }
          return `
          <div class="check-data-row">
            <span class="check-data-key">${k}</span>
            <span class="check-data-val">${display}</span>
          </div>`;
        })
        .join("");
      dataHTML = `<div class="check-data">${rows}</div>`;
    }

    return `
      <div class="check-card ${statusM.cls}" style="animation-delay:${index * 70}ms">
        <div class="check-card-top">
          <div class="check-name">${name}</div>
          <div class="check-badges">
            <span class="status-badge ${statusM.cls}">
              <span class="badge-dot"></span>${statusM.label}
            </span>
            <span class="severity-badge ${severityM.cls}">${severityM.label}</span>
          </div>
        </div>
        <div class="check-detail">${detail}</div>
        ${dataHTML}
      </div>
    `;
  }

  /**
   * buildErrorHTML(code, message)
   * Friendly error card with a hint based on error code.
   */
  function buildErrorHTML(code, message) {
    const hints = {
      offline: "Make sure the FastAPI server is running on " + CONFIG.BASE_URL,
      timeout: "The server took too long to respond. Try again in a moment.",
      invalid: "The URL may be malformed, or the backend rejected it (422).",
      server:  "The backend returned an unexpected error status.",
      unknown: "Something went wrong. Check the browser console for details.",
    };
    const hint = hints[code] || hints.unknown;

    return `
      <div class="error-card">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 9v4M12 17h.01"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
        </div>
        <div class="error-title">Scan Failed</div>
        <div class="error-msg">${message}</div>
        <div class="error-hint">${hint}</div>
      </div>
      <div class="scan-again-wrap">
        <a href="index.html" class="btn-primary">
          <svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 8a7 7 0 1 0 7-7 7 7 0 0 0-5 2.1L1 5"/>
            <path d="M1 2v3h3"/>
          </svg>
          Try Again
        </a>
      </div>
    `;
  }

  // ── MAIN RENDER ───────────────────────────────────────────

  /**
   * render(data)
   * Builds the entire result page from the backend response.
   * Injects into #main-content (already in result.html).
   */
  function render(data) {
    const score   = Number(data.risk_score ?? 0);  // API returns score as string
    const verdict = data.verdict ?? "";          // "safe" | "suspicious" | "dangerous"
    const tier    = riskTier(verdict, score);
    const label   = riskLabel(verdict, score);
    const inputURL  = UI.formatValue(data.input_url || UI.getURL());
    const finalURL  = UI.formatValue(data.final_url);
    const checks  = Array.isArray(data.checks) ? data.checks : [];

    // Set ambient glow color
    const ambientEl = document.getElementById("ambient");
    if (ambientEl) ambientEl.className = `ambient ${tier}`;

    // Score ring: circumference of r=45 circle = 2π×45 ≈ 283
    const CIRC  = 283;
    const offset = CIRC - (Math.min(score, 100) / 100) * CIRC;

    // Build check cards (dynamically — no hardcoding)
    const checksHTML = checks.length
      ? checks.map((c, i) => buildCheckCard(c, i)).join("")
      : `<p class="no-data">No checks returned by the backend.</p>`;

    // Inject full page HTML
    document.getElementById("main-content").innerHTML = `

      <!-- SCORE HERO -->
      <div class="score-hero ${tier}">
        <div class="score-ring-wrap">
          <svg viewBox="0 0 120 120">
            <circle class="score-ring-track" cx="60" cy="60" r="45"/>
            <circle class="score-ring-fill ${tier}" id="ring-fill"
              cx="60" cy="60" r="45"
              stroke-dasharray="${CIRC}"
              stroke-dashoffset="${CIRC}"
            />
          </svg>
          <div class="score-center">
            <div class="score-number ${tier}" id="score-num">0</div>
            <div class="score-label">RISK</div>
          </div>
        </div>

        <div class="score-meta">
          <div class="verdict-pill ${tier}">
            <span class="verdict-dot ${tier}"></span>
            ${verdictDisplay(verdict)}
          </div>
          <div class="verdict-text">${label}</div>
          <div class="verdict-url">${UI.truncateURL(inputURL, 65)}</div>
          <div class="meta-inline">
            <span class="meta-chip">
              Final URL: <strong>${UI.truncateURL(finalURL, 45)}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- AI EXPLANATION -->
      ${data.ai_explanation ? `
      <div class="ai-card">
        <div class="ai-icon">
          <svg viewBox="0 0 18 18" fill="none" stroke="var(--violet)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.2 4.2l1.4 1.4M12.4 12.4l1.4 1.4M13.8 4.2l-1.4 1.4M5.6 12.4l-1.4 1.4"/>
            <circle cx="9" cy="9" r="3"/>
          </svg>
        </div>
        <div class="ai-label">AI Explanation</div>
        <div class="ai-text">${UI.formatValue(data.ai_explanation)}</div>
      </div>
      ` : ""}

      <!-- CHECKS GRID -->
      <div class="section-head">
        <div class="section-head-title">Security Checks</div>
        <div class="section-count">${checks.length}</div>
      </div>
      <div class="checks-grid">
        ${checksHTML}
      </div>

      <!-- DIVIDER -->
      <div class="divider"></div>

      <!-- SCAN AGAIN -->
      <div class="scan-again-wrap">
        <a href="index.html" class="btn-primary">
          <svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 8a7 7 0 1 0 7-7 7 7 0 0 0-5 2.1L1 5"/>
            <path d="M1 2v3h3"/>
          </svg>
          Scan Another URL
        </a>
      </div>

    `;

    // Animate ring + score number after DOM paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ring = document.getElementById("ring-fill");
        if (ring) ring.style.strokeDashoffset = offset;
        countUp(document.getElementById("score-num"), score, 1200);
      });
    });
  }

  // ── COUNT-UP ANIMATION ────────────────────────────────────

  /** Animates a number from 0 to target over `duration` ms */
  function countUp(el, target, duration) {
    if (!el) return;
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.textContent = Math.round(eased * target);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ── STYLES (injected so result.html stays clean) ──────────

  /**
   * injectStyles()
   * Injects the check-card + result-page styles into <head>.
   * Keeps all visual logic co-located with the JS that generates the HTML.
   */
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `

      /* ── CHECK CARDS ─────────────────────────── */
      .checks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 14px;
        margin-bottom: 32px;
      }
      .check-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px 20px 18px;
        position: relative;
        overflow: hidden;
        animation: fade-up 0.4s ease both;
        transition: border-color 0.2s, transform 0.2s;
      }
      .check-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255,255,255,0.12);
      }
      @keyframes fade-up {
        from { opacity:0; transform:translateY(12px); }
        to   { opacity:1; transform:translateY(0); }
      }
      /* Left accent stripe per status */
      .check-card::before {
        content: '';
        position: absolute;
        top:0; left:0; bottom:0;
        width: 3px;
        border-radius: var(--radius) 0 0 var(--radius);
      }
      .check-card.status-pass::before { background: var(--mint); }
      .check-card.status-warn::before { background: var(--warning); }
      .check-card.status-fail::before { background: var(--danger); }
      .check-card.status-unknown::before { background: var(--unknown, #5A6478); }

      .check-card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }
      .check-name {
        font-family: var(--font-display);
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        line-height: 1.3;
      }
      .check-badges {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 5px;
        flex-shrink: 0;
      }

      /* Status badge */
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        padding: 3px 9px;
        border-radius: 100px;
        white-space: nowrap;
      }
      .badge-dot { width:5px; height:5px; border-radius:50%; }

      .status-badge.status-pass { background:rgba(15,255,193,0.10); color:var(--mint); }
      .status-badge.status-pass .badge-dot { background:var(--mint); }

      .status-badge.status-warn { background:rgba(245,166,35,0.10); color:var(--warning); }
      .status-badge.status-warn .badge-dot { background:var(--warning); }

      .status-badge.status-fail { background:rgba(255,76,106,0.10); color:var(--danger); }
      .status-badge.status-fail .badge-dot { background:var(--danger); }

      .status-badge.status-unknown { background:rgba(90,100,120,0.15); color:#5A6478; }
      .status-badge.status-unknown .badge-dot { background:#5A6478; }

      /* Severity badge */
      .severity-badge {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 1px;
        text-transform: uppercase;
        padding: 2px 7px;
        border-radius: 100px;
        border: 1px solid;
      }
      .sev-none   { color:#5A6478; border-color:rgba(90,100,120,0.3); }
      .sev-low    { color:#64B5F6; border-color:rgba(100,181,246,0.3); }
      .sev-medium { color:var(--warning); border-color:rgba(245,166,35,0.3); }
      .sev-high   { color:var(--danger);  border-color:rgba(255,76,106,0.3); }

      .check-detail {
        font-size: 13px;
        color: var(--text-muted, #5A6478);
        line-height: 1.55;
        margin-bottom: 10px;
      }

      /* Data sub-table */
      .check-data {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .check-data-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
      }
      .check-data-key { color: var(--text-muted, #5A6478); }
      .check-data-val { color: var(--text, #C8D0E0); word-break: break-all; }
      .chain-hop { display:block; color:var(--text,#C8D0E0); font-size:10px; margin-bottom:2px; }

      /* ── SCORE HERO ──────────────────────────── */
      .score-hero {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 32px;
        align-items: center;
        margin-bottom: 32px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg, 18px);
        padding: 32px 36px;
        position: relative;
        overflow: hidden;
      }
      .score-hero::before {
        content:'';
        position:absolute;
        top:0;left:0;right:0;
        height:3px;
        border-radius: var(--radius-lg, 18px) var(--radius-lg, 18px) 0 0;
      }
      .score-hero.risk-low::before    { background: linear-gradient(90deg, var(--mint), rgba(15,255,193,0.2)); }
      .score-hero.risk-medium::before { background: linear-gradient(90deg, var(--warning), rgba(245,166,35,0.2)); }
      .score-hero.risk-high::before   { background: linear-gradient(90deg, var(--danger), rgba(255,76,106,0.2)); }

      .score-ring-wrap { position:relative; width:120px; height:120px; flex-shrink:0; }
      .score-ring-wrap svg { width:120px; height:120px; transform:rotate(-90deg); }
      .score-ring-track { fill:none; stroke:var(--surface-2,#1A2035); stroke-width:8; }
      .score-ring-fill  { fill:none; stroke-width:8; stroke-linecap:round;
                          transition: stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1); }
      .score-ring-fill.risk-low    { stroke: var(--mint); }
      .score-ring-fill.risk-medium { stroke: var(--warning); }
      .score-ring-fill.risk-high   { stroke: var(--danger); }

      .score-center {
        position:absolute; inset:0;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
      }
      .score-number {
        font-family: var(--font-display);
        font-size:32px; font-weight:700;
        line-height:1; letter-spacing:-1px; color:#fff;
      }
      .score-number.risk-low    { color: var(--mint); }
      .score-number.risk-medium { color: var(--warning); }
      .score-number.risk-high   { color: var(--danger); }
      .score-label {
        font-family: var(--font-mono);
        font-size:9px; color:var(--muted,#5A6478);
        margin-top:2px; letter-spacing:1px;
      }

      .score-meta { min-width:0; }
      .verdict-pill {
        display:inline-flex; align-items:center; gap:7px;
        font-family:var(--font-mono); font-size:11px; font-weight:500;
        letter-spacing:1.5px; text-transform:uppercase;
        padding:5px 12px; border-radius:100px; margin-bottom:12px;
      }
      .verdict-pill.risk-low    { background:rgba(15,255,193,0.10); color:var(--mint);    border:1px solid rgba(15,255,193,0.25); }
      .verdict-pill.risk-medium { background:rgba(245,166,35,0.10); color:var(--warning); border:1px solid rgba(245,166,35,0.25); }
      .verdict-pill.risk-high   { background:rgba(255,76,106,0.10); color:var(--danger);  border:1px solid rgba(255,76,106,0.25); }

      .verdict-dot { width:6px; height:6px; border-radius:50%; }
      .verdict-dot.risk-low    { background:var(--mint);    animation:pulse 2s infinite; }
      .verdict-dot.risk-medium { background:var(--warning); animation:pulse 2s infinite; }
      .verdict-dot.risk-high   { background:var(--danger);  animation:pulse 1s infinite; }
      @keyframes pulse {
        0%,100%{ opacity:1; transform:scale(1); }
        50%{ opacity:0.4; transform:scale(0.7); }
      }

      .verdict-text {
        font-family:var(--font-display); font-size:26px; font-weight:700;
        color:#fff; letter-spacing:-0.5px; margin-bottom:8px;
      }
      .verdict-url {
        font-family:var(--font-mono); font-size:12px; color:var(--muted,#5A6478);
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:460px;
        margin-bottom:10px;
      }
      .meta-inline { display:flex; flex-wrap:wrap; gap:8px; }
      .meta-chip {
        font-family:var(--font-mono); font-size:11px; color:var(--muted,#5A6478);
      }
      .meta-chip strong { color:var(--mint); }

      /* ── AI EXPLANATION ──────────────────────── */
      .ai-card {
        background: linear-gradient(135deg, rgba(123,97,255,0.08), rgba(15,255,193,0.04));
        border: 1px solid rgba(123,97,255,0.2);
        border-radius: var(--radius-lg, 18px);
        padding: 28px 32px;
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
      }
      .ai-card::before {
        content: 'AI';
        position: absolute;
        right: 24px; top: 20px;
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--violet, #7B61FF);
        border: 1px solid rgba(123,97,255,0.3);
        padding: 2px 8px;
        border-radius: 100px;
        letter-spacing: 1px;
      }
      .ai-icon {
        width: 36px; height: 36px;
        border-radius: 8px;
        background: rgba(123,97,255,0.10);
        border: 1px solid rgba(123,97,255,0.2);
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 14px;
      }
      .ai-icon svg { width: 18px; height: 18px; }
      .ai-label {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--violet, #7B61FF);
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .ai-text {
        font-size: 14px;
        color: var(--text, #C8D0E0);
        line-height: 1.75;
      }

      /* ── AMBIENT ─────────────────────────────── */
      .ambient { position:fixed; inset:0; pointer-events:none; z-index:0; }
      .ambient.risk-low    { background: radial-gradient(ellipse 70% 40% at 50% 0%, rgba(15,255,193,0.07) 0%, transparent 70%); }
      .ambient.risk-medium { background: radial-gradient(ellipse 70% 40% at 50% 0%, rgba(245,166,35,0.07) 0%, transparent 70%); }
      .ambient.risk-high   { background: radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,76,106,0.09) 0%, transparent 70%); }

      /* ── SECTION HEADER ──────────────────────── */
      .section-head {
        display:flex; align-items:center; gap:10px; margin-bottom:14px;
      }
      .section-head-title {
        font-family:var(--font-display); font-size:14px;
        font-weight:600; color:#fff; letter-spacing:-0.2px;
      }
      .section-count {
        font-family:var(--font-mono); font-size:11px; color:var(--muted,#5A6478);
        background:var(--surface-2,#1A2035); padding:2px 8px; border-radius:100px;
      }

      /* ── ERROR STATE ─────────────────────────── */
      .error-card {
        background:rgba(255,76,106,0.08); border:1px solid rgba(255,76,106,0.25);
        border-radius:var(--radius-lg,18px); padding:40px; text-align:center;
        margin-bottom:24px;
      }
      .error-icon {
        width:52px; height:52px; background:rgba(255,76,106,0.15); border-radius:50%;
        display:flex; align-items:center; justify-content:center; margin:0 auto 16px;
      }
      .error-icon svg { width:24px; height:24px; }
      .error-title { font-family:var(--font-display); font-size:20px; font-weight:600; color:#fff; margin-bottom:8px; }
      .error-msg   { font-family:var(--font-mono); font-size:12px; color:var(--muted,#5A6478); margin-bottom:6px; }
      .error-hint  { font-size:13px; color:var(--text,#C8D0E0); }

      /* ── SHARED ──────────────────────────────── */
      .divider { height:1px; background:var(--border); margin:28px 0; }
      .no-data { color:var(--muted,#5A6478); font-size:13px; grid-column:1/-1; }
      .scan-again-wrap { text-align:center; }
      .btn-primary {
        display:inline-flex; align-items:center; gap:8px;
        background:linear-gradient(135deg, var(--violet,#7B61FF), #5B41D9);
        color:#fff; border:none; border-radius:12px; padding:14px 28px;
        font-family:var(--font-display); font-size:14px; font-weight:600;
        cursor:pointer; text-decoration:none;
        transition:opacity 0.15s, transform 0.15s, box-shadow 0.15s;
      }
      .btn-primary:hover {
        opacity:0.92; transform:translateY(-1px);
        box-shadow:0 8px 24px rgba(123,97,255,0.35);
      }
      .btn-primary svg { width:16px; height:16px; }

      /* ── RESPONSIVE ──────────────────────────── */
      @media (max-width:640px) {
        .score-hero { grid-template-columns:1fr; text-align:center; gap:20px; padding:24px 20px; }
        .score-ring-wrap { margin:0 auto; }
        .verdict-url { max-width:100%; }
        .checks-grid { grid-template-columns:1fr; }
        .check-badges { flex-direction:row; align-items:center; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── BOOT ──────────────────────────────────────────────────

  (function boot() {
    injectStyles();

    const stored = UI.getScanResult();

    // Nothing in session → send back to landing
    if (!stored) {
      window.location.href = "index.html";
      return;
    }

    // Error path
    if (!stored.ok) {
      document.getElementById("main-content").innerHTML =
        buildErrorHTML(stored.code, stored.message);
      return;
    }

    // Happy path
    render(stored.data);
  })();

})();