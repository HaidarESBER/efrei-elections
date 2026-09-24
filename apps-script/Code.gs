/**
 * EFREI délégué election — Google Apps Script backend.
 *
 * Deploy this as a Web App (Deploy > New deployment > Web app,
 * execute as "Me", access "Anyone"). See ../SETUP.md for the
 * full walkthrough.
 *
 * Sheets used (created automatically on first run if missing):
 *  - "Candidates": Timestamp | Email | Name
 *  - "Votes":      Timestamp | VoterEmail | Candidate1 | Candidate2
 */

// ---------------------------------------------------------------
// CONFIG — the class's voter list lives ONLY here (never in the git repo
// or in the static site), since this script is the sole source of truth
// for both the eligibility check and the list handed to the browser via
// the "voters" action below.
// ---------------------------------------------------------------
const VOTERS = [
  "prenom.nom@efrei.net",
  "jean.dupont@efrei.net",
  "marie.martin@efrei.net",
];

const MAX_VOTES = 2;

// ---------------------------------------------------------------

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function candidatesSheet_() {
  return getSheet_("Candidates", ["Timestamp", "Email", "Name"]);
}

function votesSheet_() {
  return getSheet_("Votes", ["Timestamp", "VoterEmail", "Candidate1", "Candidate2"]);
}

function normalize_(email) {
  return (email || "").toString().trim().toLowerCase();
}

function isEligible_(email) {
  return VOTERS.map(normalize_).indexOf(normalize_(email)) !== -1;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getCandidates_() {
  const sheet = candidatesSheet_();
  const rows = sheet.getDataRange().getValues();
  const candidates = [];
  for (let i = 1; i < rows.length; i++) {
    const [, email, name] = rows[i];
    if (email) candidates.push({ email: normalize_(email), name: name || email });
  }
  return candidates;
}

function doGet(e) {
  const action = e.parameter.action;

  if (action === "candidates") {
    return jsonOut_({ ok: true, candidates: getCandidates_() });
  }
  if (action === "voters") {
    return jsonOut_({ ok: true, voters: VOTERS.map(normalize_) });
  }

  return jsonOut_({ ok: false, error: "Action inconnue." });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: "Requête invalide." });
  }

  const action = body.action;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (action === "candidate") {
      return handleCandidate_(body);
    }
    if (action === "vote") {
      return handleVote_(body);
    }
    return jsonOut_({ ok: false, error: "Action inconnue." });
  } finally {
    lock.releaseLock();
  }
}

function handleCandidate_(body) {
  const email = normalize_(body.email);
  const name = (body.name || "").toString().trim();

  if (!email || !name) {
    return jsonOut_({ ok: false, error: "Nom et e-mail requis." });
  }
  if (!isEligible_(email)) {
    return jsonOut_({
      ok: false,
      error: "Cette adresse e-mail n'est pas inscrite sur la liste de la classe.",
    });
  }

  const sheet = candidatesSheet_();
  const existing = getCandidates_();
  if (existing.some((c) => c.email === email)) {
    return jsonOut_({ ok: false, error: "Vous êtes déjà inscrit(e) comme candidat(e)." });
  }

  sheet.appendRow([new Date(), email, name]);
  return jsonOut_({ ok: true });
}

function handleVote_(body) {
  const email = normalize_(body.email);
  const candidates = Array.isArray(body.candidates)
    ? body.candidates.map(normalize_)
    : [];

  if (!email) {
    return jsonOut_({ ok: false, error: "E-mail requis." });
  }
  if (!isEligible_(email)) {
    return jsonOut_({
      ok: false,
      error: "Cette adresse e-mail n'est pas inscrite sur la liste de la classe.",
    });
  }
  if (candidates.length !== MAX_VOTES) {
    return jsonOut_({ ok: false, error: `Vous devez sélectionner exactement ${MAX_VOTES} candidats.` });
  }
  if (new Set(candidates).size !== candidates.length) {
    return jsonOut_({ ok: false, error: "Un même candidat ne peut être sélectionné qu'une fois." });
  }

  const validEmails = getCandidates_().map((c) => c.email);
  if (!candidates.every((c) => validEmails.indexOf(c) !== -1)) {
    return jsonOut_({ ok: false, error: "Candidat invalide." });
  }

  const sheet = votesSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (normalize_(rows[i][1]) === email) {
      return jsonOut_({ ok: false, error: "Vous avez déjà voté." });
    }
  }

  const [c1, c2] = candidates;
  sheet.appendRow([new Date(), email, c1 || "", c2 || ""]);
  return jsonOut_({ ok: true });
}
