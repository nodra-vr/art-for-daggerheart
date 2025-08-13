/* ---------------------------------------------
 * art-for-daggerheart — Enhanced with JSON mapping
 * Foundry v13 compatible - Token modes fully working
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

/* ---------------- Debug Logging Functions ---------------- */
function debugLog(...args) {
  if (game.settings.get(MODULE_ID, "debugLogging")) {
    console.log(`[${MODULE_ID}] DEBUG:`, ...args);
  }
}

function debugInfo(...args) {
  if (game.settings.get(MODULE_ID, "debugLogging")) {
    console.info(`[${MODULE_ID}] DEBUG:`, ...args);
  }
}

function debugWarn(...args) {
  if (game.settings.get(MODULE_ID, "debugLogging")) {
    console.warn(`[${MODULE_ID}] DEBUG:`, ...args);
  }
}

function debugError(...args) {
  if (game.settings.get(MODULE_ID, "debugLogging")) {
    console.error(`[${MODULE_ID}] DEBUG:`, ...args);
  }
}

function debugNotify(message, type = "info") {
  if (game.settings.get(MODULE_ID, "debugLogging")) {
    ui.notifications?.[type](`[${MODULE_ID}] ${message}`);
  }
}

// Enhanced Item class that applies token configuration
class EnhancedItem extends CONFIG.Item.documentClass {
  _initializeSource(source, options = {}) {
    source = super._initializeSource(source, options);

    const pack = game.packs.get(options.pack);
    if (source._id && pack && pack.metadata.id === ADVERSARIES_PACK) {
      // Get our custom art mapping
      const artMapping = game.modules.get(MODULE_ID)?.artMapping;
      if (!artMapping) return source;

      const art = artMapping[ADVERSARIES_PACK]?.[source._id];
      if (!art?.art) return source;

      // Apply portrait
      if (art.item) source.img = art.item;
      
      // Apply token configurations for actors
      if (source.type === "npc" && art.tokenConfig) {
        const config = art.tokenConfig;
        
        if (!source.prototypeToken) source.prototypeToken = {};
        
        // Apply token image
        if (art.token) {
          if (!source.prototypeToken.texture) source.prototypeToken.texture = {};
          source.prototypeToken.texture.src = art.token;
        }
        
        // Apply wildcard settings
        source.prototypeToken.randomImg = config.randomImg;
        source.prototypeToken.randomizeImages = config.randomizeImages;
        
        // Apply ring configuration
        if (config.ring) {
          if (!source.prototypeToken.ring) source.prototypeToken.ring = {};
          
          source.prototypeToken.ring.enabled = config.ring.enabled;
          source.prototypeToken.ring.effects = config.ring.effects;
          
          if (!source.prototypeToken.ring.colors) source.prototypeToken.ring.colors = {};
          source.prototypeToken.ring.colors.ring = config.ring.colors.ring;
          source.prototypeToken.ring.colors.background = config.ring.colors.background;
          
          if (!source.prototypeToken.ring.subject) source.prototypeToken.ring.subject = {};
          source.prototypeToken.ring.subject.scale = config.ring.subject.scale;
          source.prototypeToken.ring.subject.texture = config.ring.subject.texture;
        }
      }
    }

    return source;
  }
}

/* ---------------- Art Processing Functions ---------------- */

async function findImageWithExtension(basePath) {
  const pathParts = basePath.split('/');
  const expectedName = pathParts.pop();
  const expectedDir = pathParts.join('/');
  
  try {
    const result = await FilePicker.browse("data", expectedDir);
    if (!result?.files?.length) return null;
    
    for (const filePath of result.files) {
      if (!isAcceptedImage(filePath)) continue;
      
      const fileName = filePath.split("/").pop().replace(/\.[^.]+$/, "");
      const decodedFileName = decodeURIComponent(fileName);
      
      // Try both encoded and decoded matching
      if (fileName === expectedName || decodedFileName === expectedName) {
        return filePath;
      }
    }
  } catch (_err) {}
  return null;
}

async function findImageByName(displayName, directory) {
  try {
    const result = await FilePicker.browse("data", directory);
    if (!result?.files?.length) return null;
    
    for (const filePath of result.files) {
      if (!isAcceptedImage(filePath)) continue;
      
      const fileName = filePath.split("/").pop().replace(/\.[^.]+$/, "");
      const decodedFileName = decodeURIComponent(fileName);
      
      // Try both encoded and decoded matching
      if (fileName === displayName || decodedFileName === displayName) {
        return filePath;
      }
    }
  } catch (_err) {}
  return null;
}

async function getTokenPath(artBasePath, tokenMode) {
  if (isWildcardMode(tokenMode)) {
    return await getWildcardPatternFromArt(artBasePath);
  } else {
    return await getCircleTokenFromArt(artBasePath);
  }
}

async function getWildcardPatternFromArt(artBasePath) {
  const tokensPath = artBasePath.replace('/portraits/', '/tokens/');
  const pathParts = tokensPath.split('/');
  const expectedName = pathParts.pop();
  const tokensDir = pathParts.join('/');
  
  try {
    const result = await FilePicker.browse("data", tokensDir);
    if (!result?.files?.length) return null;
    
    // Find the extension used by the actual token files
    let foundExtension = null;
    
    for (const filePath of result.files) {
      if (!isAcceptedImage(filePath)) continue;
      
      const fileName = filePath.split("/").pop().replace(/\.[^.]+$/, "");
      const decodedFileName = decodeURIComponent(fileName);
      
      // Check if file starts with expected name (for variants like "Name 1", "Name 2")
      if (fileName.startsWith(expectedName) || decodedFileName.startsWith(expectedName)) {
        foundExtension = getExt(filePath);
        break;
      }
      
      // Also try with encoded name
      const encodedExpectedName = encodeURIComponent(expectedName);
      if (fileName.startsWith(encodedExpectedName)) {
        foundExtension = getExt(filePath);
        break;
      }
    }
    
    if (foundExtension) {
      // Use encoded name for the pattern (like the old code)
      const encodedName = encodeURIComponent(expectedName);
      return `${tokensDir}/${encodedName}*${foundExtension}`;
    }
  } catch (_err) {}
  return null;
}

async function getCircleTokenFromArt(artBasePath) {
  const circlePath = artBasePath.replace('/portraits/', '/circle/');
  
  // First try to find in circle folder
  let circleTokenPath = await findImageWithExtension(circlePath);
  if (circleTokenPath) return circleTokenPath;
  
  // Fallback to portrait
  return await findImageWithExtension(artBasePath);
}

function isWildcardMode(tokenMode) {
  return tokenMode === TOKEN_MODE.WILDCARDS || tokenMode === TOKEN_MODE.WILDCARDS_RINGS;
}

function getRingConfig(tokenMode) {
  const hasRings = tokenMode === TOKEN_MODE.WILDCARDS_RINGS || tokenMode === TOKEN_MODE.CIRCLE_RINGS;
  const scale = hasRings ? 0.8 : 1.0;
  const ringColor = game.settings.get(MODULE_ID, "ringColor");
  
  return {
    enabled: hasRings,
    colors: {
      ring: hasRings ? ringColor : null,
      background: null
    },
    effects: 1,
    subject: {
      scale: scale,
      texture: null
    }
  };
}

function isAcceptedImage(path) {
  const lower = String(path ?? "").toLowerCase();
  return IMAGE_EXTS.some(ext => lower.endsWith(ext));
}

function getExt(path) {
  const m = String(path ?? "").match(/\.([^.\/\\]+)$/);
  return m ? `.${m[1].toLowerCase()}` : "";
}

/* ---------------- Settings ---------------- */
function registerSettings() {
  game.settings.register(MODULE_ID, "tokenAutoRotate", {
    name: "Token Auto Rotate",
    hint: "If enabled, core token auto-rotation will be turned on for this world.",
    scope: "world", 
    config: true, 
    type: Boolean, 
    default: true
  });
  
  game.settings.register(MODULE_ID, "debugLogging", {
    name: "Debug Logging", 
    hint: "If enabled, the module will print detailed per-actor diagnostics to the console and show debug notifications.",
    scope: "world", 
    config: true, 
    type: Boolean, 
    default: false
  });
  
  game.settings.register(MODULE_ID, "ringColor", {
    name: "Token Ring Color",
    hint: "Choose the color for token rings when ring modes are enabled.",
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({}),
    default: "#8f0000",
    requiresReload: true,
    onChange: (value) => {
      debugNotify(`Ring color updated to ${value}.`);
    }
  });

  game.settings.register(MODULE_ID, "tokenMode", {
    name: "Token Mode",
    hint: "Select token source and style.",
    scope: "world", 
    config: true, 
    type: String,
    choices: {
      [TOKEN_MODE.WILDCARDS]: "Wildcards Only",
      [TOKEN_MODE.WILDCARDS_RINGS]: "Wildcards + Rings", 
      [TOKEN_MODE.CIRCLE]: "Circle Only",
      [TOKEN_MODE.CIRCLE_RINGS]: "Circle + Rings"
    },
    default: TOKEN_MODE.WILDCARDS_RINGS,
    requiresReload: true,
    onChange: (value) => {
      debugNotify(`Token mode changed to ${value}.`);
    }
  });
}

/* ---------------- Helper Functions ---------------- */

/**
 * Generate JSON mapping by scanning the adversaries compendium and checking for existing art files
 * Call this in console: game.modules.get("art-for-daggerheart").generateMapping()
 */
async function generateMappingJson() {
  const pack = game.packs.get(ADVERSARIES_PACK);
  if (!pack) {
    debugError(`Compendium "${ADVERSARIES_PACK}" not found.`);
    return;
  }

  debugInfo("Generating mapping JSON...");
  
  const docs = await pack.getDocuments();
  const mapping = { [ADVERSARIES_PACK]: {} };
  const base = `modules/${MODULE_ID}/adversaries`;
  
  let foundCount = 0;
  let totalCount = docs.length;

  for (const actor of docs) {
    const name = actor.name.trim();
    const artBasePath = `${base}/portraits/${name}`;
    
    // Check if portrait actually exists
    const portraitExists = await checkImageExists(artBasePath);
    
    if (portraitExists) {
      mapping[ADVERSARIES_PACK][actor.id] = {
        "__DOCUMENT_NAME__": name,
        "art": artBasePath
      };
      foundCount++;
    } else {
      debugWarn(`No portrait found for: ${name}`);
    }
  }

  debugInfo(`Found art for ${foundCount}/${totalCount} adversaries`);
  debugLog("Generated mapping:", mapping);
  
  // Always show this final result regardless of debug setting
  console.log("Copy this JSON to your mappings/adversaries-mapping.json file:");
  console.log(JSON.stringify(mapping, null, 2));
  
  return mapping;
}

/**
 * Check if an image file exists (any supported extension)
 */
async function checkImageExists(basePath) {
  const pathParts = basePath.split('/');
  const expectedName = pathParts.pop();
  const directory = pathParts.join('/');
  
  try {
    const result = await FilePicker.browse("data", directory);
    if (!result?.files?.length) return false;
    
    for (const filePath of result.files) {
      if (!isAcceptedImage(filePath)) continue;
      
      const fileName = filePath.split("/").pop().replace(/\.[^.]+$/, "");
      const decodedFileName = decodeURIComponent(fileName);
      
      // Try both encoded and decoded matching
      if (fileName === expectedName || decodedFileName === expectedName) {
        return true;
      }
    }
  } catch (_err) {}
  return false;
}

/**
 * Process art mapping and apply token configurations
 */
async function processArtMapping(mapping) {
  const tokenMode = game.settings.get(MODULE_ID, "tokenMode");
  const processedMapping = { [ADVERSARIES_PACK]: {} };
  
  for (const [actorId, data] of Object.entries(mapping[ADVERSARIES_PACK] || {})) {
    if (!data.art) continue;
    
    const processed = { ...data };
    
    // Find actual portrait file
    const portraitPath = await findImageWithExtension(data.art);
    if (portraitPath) {
      processed.item = portraitPath;
      processed.actor = portraitPath;
    }
    
    // Find token path based on mode
    const tokenPath = await getTokenPath(data.art, tokenMode);
    if (tokenPath) {
      processed.token = tokenPath;
      processed.tokenConfig = {
        randomImg: isWildcardMode(tokenMode),
        randomizeImages: isWildcardMode(tokenMode),
        ring: getRingConfig(tokenMode)
      };
    }
    
    processedMapping[ADVERSARIES_PACK][actorId] = processed;
  }
  
  return processedMapping;
}

/**
 * Load and process art mapping from JSON file
 */
async function loadArtMapping() {
  try {
    const mappingPath = "modules/art-for-daggerheart/mappings/adversaries-mapping.json";
    debugInfo(`Loading art mapping from: ${mappingPath}`);
    
    const rawMapping = await foundry.utils.fetchJsonWithTimeout(mappingPath);
    debugInfo("Raw mapping loaded:", !!rawMapping);
    
    if (rawMapping && rawMapping[ADVERSARIES_PACK]) {
      const entryCount = Object.keys(rawMapping[ADVERSARIES_PACK]).length;
      debugInfo(`Found ${entryCount} art mappings`);
      
      // Process the mapping to add token configurations
      const processedMapping = await processArtMapping(rawMapping);
      debugInfo("Processed mapping:", !!processedMapping);
      
      // Store the processed mapping for use by EnhancedItem
      if (!game.modules.get(MODULE_ID)) {
        debugError("Module not found in game.modules!");
        return null;
      }
      
      game.modules.get(MODULE_ID).artMapping = processedMapping;
      debugInfo("Art mapping stored successfully");
      
      return processedMapping;
    } else {
      debugWarn("No adversaries found in mapping file");
      game.modules.get(MODULE_ID).artMapping = { [ADVERSARIES_PACK]: {} };
    }
  } catch (err) {
    debugError("Could not load art mapping:", err);
    // Create empty mapping so the module doesn't break
    game.modules.get(MODULE_ID).artMapping = { [ADVERSARIES_PACK]: {} };
  }
  return null;
}

/**
 * Regenerate art mapping with current token mode and apply to compendium
 * Call this after changing token modes: regenerateAndApplyTokenMode()
 */
async function regenerateAndApplyTokenMode() {
  try {
    const mappingPath = "modules/art-for-daggerheart/mappings/adversaries-mapping.json";
    const rawMapping = await foundry.utils.fetchJsonWithTimeout(mappingPath);
    
    if (rawMapping && rawMapping[ADVERSARIES_PACK]) {
      debugInfo("Regenerating art mapping with current token mode...");
      
      // Reprocess with current token mode
      const processedMapping = await processArtMapping(rawMapping);
      
      // Store the new mapping
      game.modules.get(MODULE_ID).artMapping = processedMapping;
      
      debugInfo("Art mapping regenerated successfully");
      
      // Apply to compendium documents
      await updateCompendiumWithNewMode();
      
      debugNotify("Token mode applied to all adversaries!");
    }
  } catch (err) {
    debugError("Regeneration failed:", err);
    debugNotify("Failed to apply token mode. Check console for details.", "error");
  }
}

/**
 * Update existing compendium documents with new token mode
 */
async function updateCompendiumWithNewMode() {
  const pack = game.packs.get(ADVERSARIES_PACK);
  
  // Unlock the compendium
  const wasLocked = pack.locked;
  if (wasLocked) {
    await pack.configure({ locked: false });
    debugInfo("Unlocked compendium");
  }
  
  try {
    const docs = await pack.getDocuments();
    const artMapping = game.modules.get(MODULE_ID)?.artMapping;
    
    debugInfo("Updating compendium with new token mode...");
    
    let updated = 0;
    for (const actor of docs) {
      const art = artMapping?.[ADVERSARIES_PACK]?.[actor.id];
      if (art?.tokenConfig) {
        const updates = {
          "prototypeToken.texture.src": art.token,
          "prototypeToken.randomImg": art.tokenConfig.randomImg,
          "prototypeToken.randomizeImages": art.tokenConfig.randomizeImages,
          "prototypeToken.ring.enabled": art.tokenConfig.ring.enabled,
          "prototypeToken.ring.colors.ring": art.tokenConfig.ring.colors.ring,
          "prototypeToken.ring.colors.background": art.tokenConfig.ring.colors.background,
          "prototypeToken.ring.effects": art.tokenConfig.ring.effects,
          "prototypeToken.ring.subject.scale": art.tokenConfig.ring.subject.scale,
          "prototypeToken.ring.subject.texture": art.tokenConfig.ring.subject.texture
        };
        
        await actor.update(updates);
        updated++;
      }
    }
    
    debugInfo(`Updated ${updated} actors with new token mode`);
  } finally {
    // Re-lock the compendium
    if (wasLocked) {
      await pack.configure({ locked: true });
      debugInfo("Re-locked compendium");
    }
  }
}

/* ---------------- Hooks ---------------- */
Hooks.once("init", function () {
  registerSettings();
  
  // Override Item class to apply our custom art
  CONFIG.Item.documentClass = EnhancedItem;
  
  // Expose helper functions for easy access
  game.modules.get(MODULE_ID).generateMapping = generateMappingJson;
  
  // Always show initialization - this is important for troubleshooting
  console.info(`[${MODULE_ID}] Module initialized with enhanced JSON mapping.`);
});

Hooks.once("ready", async function () {
  const tokenAutoRotate = game.settings.get(MODULE_ID, "tokenAutoRotate");
  
  try { 
    await game.settings.set("core", "tokenAutoRotate", tokenAutoRotate); 
  } catch (err) { 
    debugWarn("Could not set core.tokenAutoRotate:", err);
  }
  
  // Load our custom art mapping
  await loadArtMapping();
  
  // Apply token configurations to existing compendium documents
  await updateCompendiumWithNewMode();
  
  // Always show ready state - important for troubleshooting
  console.info(`[${MODULE_ID}] Ready - art system active.`);
  debugInfo("Commands available:");
  debugInfo(`  - Generate mapping: game.modules.get("${MODULE_ID}").generateMapping()`);
});