/* ---------------------------------------------
 * art-for-daggerheart — Foundry VTT v13
 * Token sync for Daggerheart adversaries.
 *
 * Token Modes:
 *  - Wildcards Only:      tokens/ (wildcard), random ON, rings reset, scale=1.0
 *  - Wildcards + Rings:   tokens/ (wildcard), random ON, rings preset, scale=0.8
 *  - Circle Only:         circle/ (fallback portrait), random OFF, rings reset, scale=1.0
 *  - Circle + Rings:      circle/ (fallback portrait), random OFF, rings preset, scale=0.8
 *
 * Portraits: from portraits/ (any extension), updated if different.
 * Accepted image extensions: .webp, .png, .jpg, .jpeg
 * --------------------------------------------- */

const MODULE_ID = "art-for-daggerheart";
const ADVERSARIES_PACK = "daggerheart.adversaries";
const IMAGE_EXTS = [".webp", ".png", ".jpg", ".jpeg"];

const TOKEN_MODE = {
  WILDCARDS: "wildcards",
  WILDCARDS_RINGS: "wildcardsRings",
  CIRCLE: "circle",
  CIRCLE_RINGS: "circleRings"
};

/* -------------------- Logging -------------------- */
function info(...args)  { console.info(`[${MODULE_ID}]`, ...args); }
function warn(...args)  { console.warn(`[${MODULE_ID}]`, ...args); }
function error(...args) { console.error(`[${MODULE_ID}]`, ...args); }
function debugEnabled() {
  try { return !!game.settings.get(MODULE_ID, "debugLogging"); }
  catch { return false; }
}
function debug(...args) {
  if (debugEnabled()) console.info(`[${MODULE_ID}][debug]`, ...args);
}

/* ---------------- Helpers: path & names ---------------- */
function isAcceptedImage(path) {
  const lower = String(path ?? "").toLowerCase();
  return IMAGE_EXTS.some(ext => lower.endsWith(ext));
}
function getExt(path) {
  const m = String(path ?? "").match(/\.([^.\/\\]+)$/);
  return m ? `.${m[1].toLowerCase()}` : "";
}
function getBaseName(path) {
  return String(path ?? "").split("/").pop() ?? "";
}
function safeDecode(str) {
  try { return decodeURIComponent(str); } catch { return str; }
}
function normalizeName(input) {
  let name = String(input ?? "");
  if (name.includes("/")) {
    name = getBaseName(name);
    name = safeDecode(name);
  }
  name = name.replace(/\.[^.]+$/, "");
  name = name.replace(/(?:[_\- ]\d+)$/, "");
  name = name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim().toLowerCase();
  return name;
}

/* ---------------- Helpers: directory browsing ---------------- */
async function browseImageDirMap(dirCandidates = []) {
  for (const dir of dirCandidates) {
    try {
      const result = await FilePicker.browse("data", dir);
      if (!result?.files?.length) continue;
      const map = new Map();
      for (const filePath of result.files) {
        if (!isAcceptedImage(filePath)) continue;
        map.set(normalizeName(filePath), filePath);
      }
      return map;
    } catch (_err) {}
  }
  return new Map();
}
async function browseTokensWildcardInfo(dirCandidates = []) {
  for (const dir of dirCandidates) {
    try {
      const result = await FilePicker.browse("data", dir);
      if (!result?.files?.length) continue;
      const extByKey = new Map();
      for (const filePath of result.files) {
        if (!isAcceptedImage(filePath)) continue;
        const key = normalizeName(filePath);
        if (!extByKey.has(key)) extByKey.set(key, getExt(filePath));
      }
      return { dir, extByKey };
    } catch (_err) {}
  }
  return { dir: null, extByKey: new Map() };
}

/* ---------------- Settings ---------------- */
function registerSettings() {
  game.settings.register(MODULE_ID, "tokenAutoRotate", {
    name: "Token Auto Rotate",
    hint: "If enabled, core token auto-rotation will be turned on for this world.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, "debugLogging", {
    name: "Debug Logging",
    hint: "If enabled, the module will print detailed per-actor diagnostics to the console.",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register(MODULE_ID, "tokenMode", {
    name: "Token Mode",
    hint: "Select token source and style.",
    scope: "world", config: true, type: String,
    choices: {
      [TOKEN_MODE.WILDCARDS]: "Wildcards Only",
      [TOKEN_MODE.WILDCARDS_RINGS]: "Wildcards + Rings",
      [TOKEN_MODE.CIRCLE]: "Circle Only",
      [TOKEN_MODE.CIRCLE_RINGS]: "Circle + Rings"
    },
    default: TOKEN_MODE.WILDCARDS_RINGS,
    onChange: () => {
      if (game.user.isGM) {
        ui.notifications?.info(`[${MODULE_ID}] Reloading to apply new token mode...`);
        window.location.reload();
      }
    }
  });
}

/* ---------------- Rings ---------------- */
function applyRingsReset(updates, scale) {
  updates["prototypeToken.ring.enabled"] = false;
  updates["prototypeToken.ring.colors.ring"] = null;
  updates["prototypeToken.ring.colors.background"] = null;
  updates["prototypeToken.ring.effects"] = 1;
  updates["prototypeToken.ring.subject.scale"] = scale;
  updates["prototypeToken.ring.subject.texture"] = null;
}
function applyRingsPreset(updates, scale) {
  updates["prototypeToken.ring.enabled"] = true;
  updates["prototypeToken.ring.colors.ring"] = "#8f0000";
  updates["prototypeToken.ring.colors.background"] = null;
  updates["prototypeToken.ring.effects"] = 1;
  updates["prototypeToken.ring.subject.scale"] = scale;
  updates["prototypeToken.ring.subject.texture"] = null;
}

/* ---------------- Core sync ---------------- */
async function updateAdversariesFromModule() {
  const tokenAutoRotate = game.settings.get(MODULE_ID, "tokenAutoRotate");
  const tokenMode = game.settings.get(MODULE_ID, "tokenMode");
  const debugOn = debugEnabled();

  const base = `modules/${MODULE_ID}/adversaries`;
  const portraitsDir = `${base}/portraits`;
  const tokensDir = `${base}/tokens`;
  const circleDir = `${base}/circle`;

  info(`Settings => tokenAutoRotate=${tokenAutoRotate}, tokenMode=${tokenMode}, debugLogging=${debugOn}`);
  info(`Directories => portraits="${portraitsDir}", tokens="${tokensDir}", circle="${circleDir}"`);

  try { await game.settings.set("core", "tokenAutoRotate", tokenAutoRotate); }
  catch (err) { warn("Could not set core.tokenAutoRotate:", err); }

  const pack = game.packs.get(ADVERSARIES_PACK);
  if (!pack) {
    ui.notifications?.error(`[${MODULE_ID}] Compendium "${ADVERSARIES_PACK}" not found.`);
    return error(`Compendium "${ADVERSARIES_PACK}" not found.`);
  }

  const wasLocked = pack.locked;
  if (wasLocked) {
    try { await pack.configure({ locked: false }); }
    catch (err) {
      ui.notifications?.error(`[${MODULE_ID}] Could not unlock compendium "${ADVERSARIES_PACK}".`);
      return error("Could not unlock compendium:", err);
    }
  }

  let docs = [];
  try { docs = await pack.getDocuments(); }
  catch (err) { error("Failed to load documents:", err); }

  const portraitsMap = await browseImageDirMap([portraitsDir]);
  const circleMap = await browseImageDirMap([circleDir]);
  const { dir: wildcardDir, extByKey } = await browseTokensWildcardInfo([tokensDir]);

  debug("portraitsMap.size =", portraitsMap.size);
  debug("circleMap.size =", circleMap.size);
  debug("wildcardDir =", wildcardDir);
  debug("extByKey.size =", extByKey.size);

  let updatedActors = 0, appliedPortraits = 0, appliedTokens = 0;

  for (const actor of docs) {
    const displayName = (actor.name ?? "").trim();
    const key = normalizeName(displayName);
    const updates = {};

    const portraitPath = portraitsMap.get(key);
    if (portraitPath && actor.img !== portraitPath) {
      updates["img"] = portraitPath;
      appliedPortraits++;
    }

    // Token image selection
    if ((tokenMode === TOKEN_MODE.WILDCARDS || tokenMode === TOKEN_MODE.WILDCARDS_RINGS) && wildcardDir) {
      const inferredExt = extByKey.get(key);
      if (inferredExt) {
        const encodedName = encodeURIComponent(displayName);
        const pattern = `${wildcardDir}/${encodedName}*${inferredExt}`;
        updates["prototypeToken.texture.src"] = pattern;
        updates["prototypeToken.randomImg"] = true;
        updates["prototypeToken.randomizeImages"] = true;
        appliedTokens++;
        debug(`Actor="${displayName}" | wildcard pattern = ${pattern}`);
      }
    } else {
      const circlePath = circleMap.get(key);
      const finalToken = circlePath ?? portraitPath;
      if (finalToken) {
        updates["prototypeToken.texture.src"] = finalToken;
        updates["prototypeToken.randomImg"] = false;
        updates["prototypeToken.randomizeImages"] = false;
        appliedTokens++;
        debug(`Actor="${displayName}" | circle token = ${finalToken}`);
      }
    }

    // Rings + scale rules
    if (tokenMode === TOKEN_MODE.WILDCARDS_RINGS) {
      applyRingsPreset(updates, 0.8);
    } else if (tokenMode === TOKEN_MODE.CIRCLE_RINGS) {
      applyRingsPreset(updates, 0.8);
    } else if (tokenMode === TOKEN_MODE.WILDCARDS) {
      applyRingsReset(updates, 1.0);
    } else if (tokenMode === TOKEN_MODE.CIRCLE) {
      applyRingsReset(updates, 1.0);
    }

    if (Object.keys(updates).length > 0) {
      try { await actor.update(updates); updatedActors++; }
      catch (err) { error(`Failed updating actor "${displayName}":`, err, updates); }
    } else {
      debug(`Actor="${displayName}" | no changes.`);
    }
  }

  if (wasLocked) {
    try { await pack.configure({ locked: true }); }
    catch (err) { warn("Could not re-lock compendium:", err); }
  }

  const msg = `Updated ${updatedActors} adversaries | portraits applied: ${appliedPortraits} | tokens applied: ${appliedTokens}`;
  info(msg);
  ui.notifications?.info(`[${MODULE_ID}] ${msg}`);
}

/* ---------------- Hooks ---------------- */
Hooks.once("init", function () {
  registerSettings();
  info("Module initialized.");
});
Hooks.once("ready", async function () {
  if (!game.user.isGM) {
    info("Ready (non-GM) — no synchronization performed.");
    return;
  }
  info("Ready — starting synchronization.");
  try { await updateAdversariesFromModule(); }
  catch (err) { error("Synchronization failed:", err); }
});
