// js/decoder.js
// ─────────────────────────────────────────────────────────
// Handles index.html form submission + the actual API call
// that runs on decoding.html.
//
// Flow:
//   index.html  → user clicks Decode
//                 validate → storeURL → navigate to decoding.html
//   decoding.html → runDecode() fires in parallel with animation
//                   → stores result → redirect to result.html
// ─────────────────────────────────────────────────────────

const Decoder = (() => {

  // ── INDEX.HTML ────────────────────────────────────────────

  /**
   * initLanding()
   * Wire up the URL input + Decode button on index.html.
   * Called by the inline <script> at the bottom of index.html.
   */
  function initLanding() {
    const input      = document.getElementById("url-input");
    const btn        = document.getElementById("decode-btn");
    const scannerBox = document.getElementById("scanner-box");

    if (!input || !btn) return;

    // Scanning beam activates on focus
    input.addEventListener("focus", () => scannerBox.classList.add("scanning"));
    input.addEventListener("blur",  () => scannerBox.classList.remove("scanning"));

    btn.addEventListener("click", () => _submit(input, scannerBox));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") _submit(input, scannerBox);
    });
  }

  /** Validate input, save URL, navigate to decoding page */
  function _submit(input, scannerBox) {
    const raw = input.value.trim();

    // Auto-prepend https:// if the user forgot the scheme
    const url = (raw.startsWith("http://") || raw.startsWith("https://"))
      ? raw
      : "https://" + raw;

    if (!UI.isValidURL(url)) {
      UI.shakeInput(scannerBox);
      input.focus();
      return;
    }

    UI.storeURL(url);
    window.location.href = "decoding.html";
  }

  // ── DECODING.HTML ─────────────────────────────────────────

  /**
   * runDecode()
   * Called from decoding.html boot script.
   * Fires the API request, stores result/error, then resolves
   * so Promise.all() in decoding.html knows it's done.
   *
   * Does NOT redirect — decoding.html handles that after
   * both this promise AND the animation promise resolve.
   */
  async function runDecode() {
    const url = UI.getURL();
    if (!url) {
      window.location.href = "index.html";
      return;
    }

    try {
      const data = await API.scanURL(url);
      UI.storeScanResult({ ok: true, data });
    } catch (err) {
      // Store typed error so result.js can show a friendly message
      UI.storeScanResult({
        ok:      false,
        code:    err.code    || "unknown",
        message: err.message || "An unexpected error occurred.",
      });
    }
  }

  return { initLanding, runDecode };
})();