/**
 * EFREI délégué election — Google Apps Script backend (multi-classe).
 *
 * Deploy this as a Web App (Deploy > New deployment > Web app,
 * execute as "Me", access "Anyone"). See ../SETUP.md for the
 * full walkthrough.
 *
 * HOW CLASSES WORK
 * -----------------
 * Each class gets its own roster tab named "Voters - <Nom de la classe>",
 * e.g. "Voters - M1 DEV1", "Voters - MDT TD1", "Voters - MDT TD2". Each
 * tab is just a single column of e-mail addresses (one per row, header
 * row optional).
 *
 * When someone enters their e-mail on the site, this script scans every
 * "Voters - *" tab, finds which one contains that e-mail, and treats the
 * part after "Voters - " as their class. That class then scopes which
 * candidates they see and which vote/candidacy their submissions count
 * toward.
 *
 * TO ADD A NEW CLASS: duplicate an existing "Voters - X" tab, rename it
 * "Voters - <new class name>", replace the e-mail list. No code change,
 * no redeployment needed — the script reads the roster live every time.
 *
 * Sheets used (created automatically on first run if missing):
 *  - "Candidates": Timestamp | Email | Name | Class
 *  - "Votes":      Timestamp | VoterEmail | Candidate1 | Candidate2 | Class
 */

const VOTERS_TAB_PREFIX = "Voters - ";
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
  return getSheet_("Candidates", ["Timestamp", "Email", "Name", "Class"]);
}

function votesSheet_() {
  return getSheet_("Votes", ["Timestamp", "VoterEmail", "Candidate1", "Candidate2", "Class"]);
}

function normalize_(email) {
  return (email || "").toString().trim().toLowerCase();
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Scans every "Voters - <Class>" tab and returns the class name that
 * contains this e-mail, or null if it isn't on any roster.
 */
function getVoterClass_(email) {
  const target = normalize_(email);
  if (!target) return null;

  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (const sheet of sheets) {
    const name = sheet.getName();
    if (name.indexOf(VOTERS_TAB_PREFIX) !== 0) continue;

    const className = name.substring(VOTERS_TAB_PREFIX.length).trim();
    const values = sheet.getDataRange().getValues();
    for (let i = 0; i < values.length; i++) {
      const cell = normalize_(values[i][0]);
      if (cell && cell !== "email" && cell === target) {
        return className;
      }
    }
  }
  return null;
}

/**
 * Candidates for a given class. Rows written before the multi-class
 * migration have no Class value — those are treated as "M1 DEV1" so
 * existing data keeps working without manual backfill.
 */
function getCandidates_(cls) {
  const sheet = candidatesSheet_();
  const rows = sheet.getDataRange().getValues();
  const candidates = [];
  for (let i = 1; i < rows.length; i++) {
    const [, email, name, rowClass] = rows[i];
    const effectiveClass = (rowClass || "M1 DEV1").toString().trim();
    if (email && effectiveClass === cls) {
      candidates.push({ email: normalize_(email), name: name || email });
    }
  }
  return candidates;
}

function doGet(e) {
  const action = e.parameter.action;

  if (action === "identify") {
    const cls = getVoterClass_(e.parameter.email);
    if (!cls) {
      return jsonOut_({
        ok: false,
        error: "Cette adresse e-mail n'est inscrite sur la liste d'aucune classe.",
      });
    }
    return jsonOut_({ ok: true, class: cls });
  }

  if (action === "candidates") {
    const cls = (e.parameter.class || "").toString().trim();
    if (!cls) {
      return jsonOut_({ ok: false, error: "Classe manquante." });
    }
    return jsonOut_({ ok: true, candidates: getCandidates_(cls) });
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

  const cls = getVoterClass_(email);
  if (!cls) {
    return jsonOut_({
      ok: false,
      error: "Cette adresse e-mail n'est inscrite sur la liste d'aucune classe.",
    });
  }

  const sheet = candidatesSheet_();
  const existing = getCandidates_(cls);
  if (existing.some((c) => c.email === email)) {
    return jsonOut_({ ok: false, error: "Vous êtes déjà inscrit(e) comme candidat(e)." });
  }

  sheet.appendRow([new Date(), email, name, cls]);
  return jsonOut_({ ok: true, class: cls });
}

function handleVote_(body) {
  const email = normalize_(body.email);
  const candidates = Array.isArray(body.candidates)
    ? body.candidates.map(normalize_)
    : [];

  if (!email) {
    return jsonOut_({ ok: false, error: "E-mail requis." });
  }

  const cls = getVoterClass_(email);
  if (!cls) {
    return jsonOut_({
      ok: false,
      error: "Cette adresse e-mail n'est inscrite sur la liste d'aucune classe.",
    });
  }
  if (candidates.length !== MAX_VOTES) {
    return jsonOut_({ ok: false, error: `Vous devez sélectionner exactement ${MAX_VOTES} candidats.` });
  }
  if (new Set(candidates).size !== candidates.length) {
    return jsonOut_({ ok: false, error: "Un même candidat ne peut être sélectionné qu'une fois." });
  }

  const validEmails = getCandidates_(cls).map((c) => c.email);
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
  sheet.appendRow([new Date(), email, c1 || "", c2 || "", cls]);
  return jsonOut_({ ok: true, class: cls });
}
