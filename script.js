// ---------------------------------------------------------------
// Shared helpers for the EFREI délégué election site.
// ---------------------------------------------------------------

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isEfreiEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Asks the backend which class (if any) an e-mail belongs to. The full
 * roster is never sent to the browser — only the answer for this one
 * address — and it works across every class without the site needing to
 * know class names in advance.
 * Returns the class name (string) on success; throws on ineligible email.
 */
async function identifyClass(email) {
  const res = await callBackend("identify", { email }, "GET");
  return res.class;
}

/**
 * Calls the Apps Script backend.
 * method "GET"  -> read-only action, params appended to the query string.
 * method "POST" -> write action; sent as text/plain to avoid a CORS preflight
 *                  (Google Apps Script web apps don't support OPTIONS).
 */
async function callBackend(action, payload, method) {
  method = method || "POST";
  const url = CONFIG.APPS_SCRIPT_URL;
  if (!url || url.indexOf("PASTE_YOUR") === 0) {
    throw new Error(
      "Le site n'est pas encore connecté à Google Sheets. Voir SETUP.md."
    );
  }

  let response;
  if (method === "GET") {
    const params = new URLSearchParams({ action, ...payload });
    response = await fetch(`${url}?${params.toString()}`, { method: "GET" });
  } else {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
  }

  if (!response.ok) {
    throw new Error("Erreur réseau, merci de réessayer.");
  }
  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.error || "Une erreur est survenue.");
  }
  return json;
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `msg ${type}`;
  el.hidden = false;
}

function hideMsg(el) {
  el.hidden = true;
}

function setLoading(button, loading, label) {
  button.disabled = loading;
  button.innerHTML = loading
    ? `<span class="spinner"></span>${label || "Chargement..."}`
    : button.dataset.label;
}
