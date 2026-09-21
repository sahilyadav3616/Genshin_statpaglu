// Genshin StatPaglu v9.2.0
// Character combat stats come from the RAW Enka API response.
// The enkanetwork wrapper is used only for friendly metadata/assets when available.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { EnkaNetwork } = require('enkanetwork');

const root = __dirname;
const files = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/styles.css', 'styles.css'],
  ['/app.js', 'app.js'],
  ['/profile-cache.js', 'profile-cache.js'],
  ['/ayaka-snowflake.png', 'ayaka-snowflake.png'],
  ['/ayaka-snowflake.svg', 'ayaka-snowflake.svg'],
  ['/robots.txt', 'robots.txt'],
  ['/sitemap.xml', 'sitemap.xml'],
  ['/google925b67fbca680cb7.html', 'google925b67fbca680cb7.html']
]);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const enka = new EnkaNetwork({
  language: 'EN',
  userAgent: 'Genshin-StatPaglu/9.2.0 (local build viewer)'
});

const cache = new Map();
const TTL_MS = 60 * 1000;

const FIGHT_PROPS = {
  HP: 2,
  ATK: 5,
  DEF: 8,
  EM: 28,
  CRIT_RATE: 20,
  CRIT_DMG: 22,
  ER: 23,
  PYRO: 40,
  ELECTRO: 41,
  HYDRO: 42,
  DENDRO: 43,
  ANEMO: 44,
  GEO: 45,
  CRYO: 46
};

// Enka also exposes these extended final totals. Prefer them for the three
// flat combat stats when present; the normal FightProp IDs above are fallbacks.
const EXTENDED_TOTALS = { HP: 2000, ATK: 2001, DEF: 2002 };

const FIGHT_PROP_LABELS = {
  FIGHT_PROP_HP: ['HP', false],
  FIGHT_PROP_HP_PERCENT: ['HP%', true],
  FIGHT_PROP_ATTACK: ['ATK', false],
  FIGHT_PROP_ATTACK_PERCENT: ['ATK%', true],
  FIGHT_PROP_DEFENSE: ['DEF', false],
  FIGHT_PROP_DEFENSE_PERCENT: ['DEF%', true],
  FIGHT_PROP_BASE_ATTACK: ['Base ATK', false],
  FIGHT_PROP_ELEMENT_MASTERY: ['Elemental Mastery', false],
  FIGHT_PROP_CHARGE_EFFICIENCY: ['Energy Recharge', true],
  FIGHT_PROP_HEAL_ADD: ['Healing Bonus', true],
  FIGHT_PROP_CRITICAL: ['CRIT Rate', true],
  FIGHT_PROP_CRITICAL_HURT: ['CRIT DMG', true],
  FIGHT_PROP_FIRE_ADD_HURT: ['Pyro DMG Bonus', true],
  FIGHT_PROP_ELEC_ADD_HURT: ['Electro DMG Bonus', true],
  FIGHT_PROP_WATER_ADD_HURT: ['Hydro DMG Bonus', true],
  FIGHT_PROP_GRASS_ADD_HURT: ['Dendro DMG Bonus', true],
  FIGHT_PROP_WIND_ADD_HURT: ['Anemo DMG Bonus', true],
  FIGHT_PROP_ROCK_ADD_HURT: ['Geo DMG Bonus', true],
  FIGHT_PROP_ICE_ADD_HURT: ['Cryo DMG Bonus', true],
  FIGHT_PROP_PHYSICAL_ADD_HURT: ['Physical DMG Bonus', true]
};

const NUMERIC_PROP_NAMES = {
  '20': 'FIGHT_PROP_CRITICAL',
  '22': 'FIGHT_PROP_CRITICAL_HURT',
  '23': 'FIGHT_PROP_CHARGE_EFFICIENCY',
  '28': 'FIGHT_PROP_ELEMENT_MASTERY',
  '40': 'FIGHT_PROP_FIRE_ADD_HURT',
  '41': 'FIGHT_PROP_ELEC_ADD_HURT',
  '42': 'FIGHT_PROP_WATER_ADD_HURT',
  '43': 'FIGHT_PROP_GRASS_ADD_HURT',
  '44': 'FIGHT_PROP_WIND_ADD_HURT',
  '45': 'FIGHT_PROP_ROCK_ADD_HURT',
  '46': 'FIGHT_PROP_ICE_ADD_HURT'
};

const SLOT_NAMES = {
  EQUIP_BRACER: 'Flower of Life',
  EQUIP_NECKLACE: 'Plume of Death',
  EQUIP_SHOES: 'Sands of Eon',
  EQUIP_RING: 'Goblet of Eonothem',
  EQUIP_DRESS: 'Circlet of Logos'
};

function unwrap(value) {
  if (value == null) return value;
  if (typeof value === 'function') {
    try { return unwrap(value()); } catch (_) { return undefined; }
  }
  if (typeof value === 'object') {
    for (const key of ['value', 'val', 'rawValue', 'propValue', 'amount']) {
      if (Object.prototype.hasOwnProperty.call(value, key) && value[key] !== value) {
        const nested = value[key];
        if (nested !== undefined && nested !== null && (typeof nested !== 'object' || Array.isArray(nested))) return nested;
      }
    }
  }
  return value;
}

function getStr(value) {
  if (value == null) return 'Unknown';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'function') {
    try { return getStr(value()); } catch (_) { return 'Unknown'; }
  }
  if (typeof value.get === 'function') {
    try { return value.get('en') || value.get('EN') || value.get('value') || 'Unknown'; } catch (_) {}
  }
  for (const key of ['value', 'text', 'content', 'name', 'displayName', 'localizedName']) {
    if (value[key] != null && value[key] !== value) {
      const result = getStr(value[key]);
      if (result !== 'Unknown') return result;
    }
  }
  return 'Unknown';
}

function firstFinite(...values) {
  for (const value of values) {
    const n = Number(unwrap(value));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeProp(rawType) {
  if (rawType == null) return { key: '', label: 'Stat', percent: false };
  let key = String(rawType);
  if (/^\d+$/.test(key)) key = NUMERIC_PROP_NAMES[key] || key;
  const known = FIGHT_PROP_LABELS[key];
  if (known) return { key, label: known[0], percent: known[1] };
  const label = key.replace(/^FIGHT_PROP_/, '').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
  const percent = /PERCENT|CRITICAL|CHARGE_EFFICIENCY|ADD_HURT|HEAL_ADD/.test(key);
  return { key, label, percent };
}

function statTypeOf(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  return obj.type || obj.statName || obj.fightProp || obj.fightPropName || obj.prop_id || obj.propId || obj.propID || obj.mainPropId || obj.appendPropID || obj.appendPropId || obj.key || obj.name || '';
}

function statValueOf(obj) {
  if (obj == null) return NaN;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'string') {
    const n = Number(obj.replace(/,/g, '').replace('%', ''));
    return Number.isFinite(n) ? n : NaN;
  }
  for (const key of ['value', 'propValue', 'rawValue', 'val', 'amount']) {
    if (obj[key] != null) {
      const n = Number(unwrap(obj[key]));
      if (Number.isFinite(n)) return n;
    }
  }
  return NaN;
}

function readStatEntries(source) {
  if (!source) return [];
  let arr;
  if (Array.isArray(source)) arr = source;
  else if (source instanceof Map) arr = [...source.entries()].map(([key, value]) => ({ key, value }));
  else if (typeof source === 'object') {
    if (Array.isArray(source.stats)) arr = source.stats;
    else if (Array.isArray(source.statProperties)) arr = source.statProperties;
    else arr = Object.entries(source).map(([key, value]) => ({ key, value }));
  } else arr = [];

  return arr.map(item => {
    if (!item) return null;
    const rawType = statTypeOf(item);
    const prop = normalizeProp(rawType);
    let value = statValueOf(item);
    if (!Number.isFinite(value) && item.value != null) value = Number(unwrap(item.value));
    if (!prop.key || !Number.isFinite(value)) return null;
    return { ...prop, value };
  }).filter(Boolean);
}

function fmtNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : '0';
}

function fmtPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.0%';
  return `${(n * 100).toFixed(1)}%`;
}

function fmtEquipmentPercent(value) {
  // Enka flat equipment stats are already expressed in percentage points
  // (e.g. 13.2 means 13.2%), unlike fightPropMap combat percentages
  // (e.g. 0.132 means 13.2%).
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : '0.0%';
}

function formatStat(value, percent) {
  return percent ? fmtPercent(value) : fmtNumber(value);
}

function formatEquipmentStat(value, percent) {
  return percent ? fmtEquipmentPercent(value) : fmtNumber(value);
}

function getRawFightProp(raw, id, fallbackId = null) {
  const fp = raw?.fightPropMap || {};
  const a = fp[String(id)] ?? fp[id];
  if (a != null && Number.isFinite(Number(a))) return Number(a);
  if (fallbackId != null) {
    const b = fp[String(fallbackId)] ?? fp[fallbackId];
    if (b != null && Number.isFinite(Number(b))) return Number(b);
  }
  return 0;
}

function getFinalStats(raw) {
  // IMPORTANT: these are RAW Enka avatarInfoList fightPropMap values.
  // 2/5/8/28 = HP/ATK/DEF/EM; 20/22/23 = CRIT/CRIT DMG/ER.
  // 2000/2001/2002 are extended final HP/ATK/DEF totals; use them first.
  const hp = getRawFightProp(raw, EXTENDED_TOTALS.HP, FIGHT_PROPS.HP);
  const atk = getRawFightProp(raw, EXTENDED_TOTALS.ATK, FIGHT_PROPS.ATK);
  const def = getRawFightProp(raw, EXTENDED_TOTALS.DEF, FIGHT_PROPS.DEF);
  let em = getRawFightProp(raw, FIGHT_PROPS.EM);
  // Enka's showcase fightPropMap contains the stored EM snapshot. Enka's
  // web calculator also applies Flins's A4 passive (8% ATK, capped at 160)
  // when presenting the current build. Keep the raw value as the baseline and
  // add only the documented self-buff; this avoids pretending the whole game
  // calculator can be reproduced here.
  const avatarId = Number(raw?.avatarId || 0);
  if (avatarId === 10000120) {
    const atkForPassive = getRawFightProp(raw, EXTENDED_TOTALS.ATK, FIGHT_PROPS.ATK);
    em += Math.min(160, atkForPassive * 0.08);
  }
  const crit = getRawFightProp(raw, FIGHT_PROPS.CRIT_RATE);
  const critDmg = getRawFightProp(raw, FIGHT_PROPS.CRIT_DMG);
  const er = getRawFightProp(raw, FIGHT_PROPS.ER);

  const result = [
    { label: 'HP', rawValue: hp, percent: false },
    { label: 'ATK', rawValue: atk, percent: false },
    { label: 'DEF', rawValue: def, percent: false },
    { label: 'Elemental Mastery', rawValue: em, percent: false },
    { label: 'CRIT Rate', rawValue: crit, percent: true },
    { label: 'CRIT DMG', rawValue: critDmg, percent: true },
    { label: 'Energy Recharge', rawValue: er, percent: true }
  ].map(x => ({ ...x, value: formatStat(x.rawValue, x.percent) }));

  const elements = [
    [FIGHT_PROPS.PYRO, 'Pyro DMG Bonus'],
    [FIGHT_PROPS.ELECTRO, 'Electro DMG Bonus'],
    [FIGHT_PROPS.HYDRO, 'Hydro DMG Bonus'],
    [FIGHT_PROPS.DENDRO, 'Dendro DMG Bonus'],
    [FIGHT_PROPS.ANEMO, 'Anemo DMG Bonus'],
    [FIGHT_PROPS.GEO, 'Geo DMG Bonus'],
    [FIGHT_PROPS.CRYO, 'Cryo DMG Bonus']
  ];
  for (const [id, label] of elements) {
    const value = getRawFightProp(raw, id);
    if (value > 0.0005) result.push({ label, rawValue: value, percent: true, value: fmtPercent(value) });
  }
  return result;
}

function rawPropValue(obj) {
  if (obj == null) return NaN;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'string') {
    const n = Number(obj.replace(/,/g, '').replace('%', ''));
    return Number.isFinite(n) ? n : NaN;
  }
  // Enka raw equipment uses propValue. Some wrappers normalize the same
  // field to value/statValue, so accept all of them.
  for (const key of ['propValue', 'value', 'statValue', 'val', 'rawValue', 'amount']) {
    if (obj[key] != null) {
      const v = obj[key];
      if (typeof v === 'object' && v !== obj) {
        const nested = rawPropValue(v);
        if (Number.isFinite(nested)) return nested;
      } else {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return NaN;
}

function propKeyOf(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  return obj.mainPropId || obj.appendPropID || obj.appendPropId || obj.prop_id || obj.propId || obj.propID || obj.type || obj.statName || obj.fightProp || obj.fightPropName || obj.key || obj.name || '';
}

function normalizeEquipmentStat(entry) {
  const rawType = propKeyOf(entry);
  const prop = normalizeProp(rawType);
  const value = rawPropValue(entry);
  if (!prop.key || !Number.isFinite(value)) return null;
  return { ...prop, value };
}

function normalizeEquipmentStats(source) {
  if (!source) return [];
  let arr = [];
  if (Array.isArray(source)) arr = source;
  else if (source instanceof Map) arr = [...source.values()];
  else if (typeof source === 'object') {
    if (Array.isArray(source.stats)) arr = source.stats;
    else if (Array.isArray(source.statProperties)) arr = source.statProperties;
    else arr = Object.entries(source).map(([key, value]) => ({ key, value }));
  }
  return arr.map(normalizeEquipmentStat).filter(Boolean);
}

function firstEquipmentStats(candidates) {
  for (const candidate of candidates) {
    const stats = normalizeEquipmentStats(candidate);
    if (stats.length) return stats;
  }
  return [];
}

function findNestedByKeys(root, keys, maxDepth = 3) {
  const wanted = new Set(keys);
  const seen = new Set();
  function walk(node, depth) {
    if (!node || depth > maxDepth || typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);
    for (const key of wanted) {
      if (node[key] != null) return node[key];
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        const found = walk(value, depth + 1);
        if (found != null) return found;
      }
    }
    return null;
  }
  return walk(root, 0);
}

function artifactMainAndSubs(rawArt, metaArt) {
  const rawFlat = rawArt?.flat || {};
  const rawMain = rawFlat.reliquaryMainstat;
  const rawSubs = rawFlat.reliquarySubstats;
  const metaFlat = metaArt?.artifactData || metaArt?.flat || metaArt || {};

  const main = rawMain ||
    metaArt?.mainstat || metaArt?.mainStat || metaArt?.mainstats || metaArt?.mainStats ||
    metaFlat.reliquaryMainstat || metaFlat.mainstat || metaFlat.mainStat || metaFlat.mainstats || metaFlat.mainStats ||
    findNestedByKeys(metaArt, ['reliquaryMainstat', 'mainstat', 'mainStat', 'mainstats', 'mainStats']);

  const subs = (Array.isArray(rawSubs) && rawSubs.length ? rawSubs : null) ||
    metaArt?.substats || metaArt?.subStats || metaFlat.reliquarySubstats || metaFlat.substats || metaFlat.subStats ||
    findNestedByKeys(metaArt, ['reliquarySubstats', 'substats', 'subStats']);

  return { main, subs: Array.isArray(subs) ? subs : [] };
}

function normalizeRawArtifact(rawArt, metadata) {
  const flat = rawArt?.flat || {};
  const reliquary = rawArt?.reliquary || {};
  const meta = metadata || {};
  const { main, subs } = artifactMainAndSubs(rawArt, meta);
  const mainStat = normalizeEquipmentStat(main) || { key: '', label: 'Main Stat', percent: false, value: 0 };
  const substats = subs.map(normalizeEquipmentStat).filter(Boolean).map(sub => ({
    label: sub.label,
    value: formatEquipmentStat(sub.value, sub.percent),
    rawValue: sub.value,
    percent: sub.percent,
    key: sub.key
  }));

  const name = getStr(meta?.name || meta?.artifactData?.name || flat.nameTextHashMap || 'Artifact');
  const setName = getStr(meta?.setName || meta?.artifactData?.setName || flat.setNameTextHashMap || 'Unknown Set');
  const slotRaw = meta?.slot || meta?.artifactData?.equipType || flat.equipType || 'Artifact';
  const iconName = meta?.iconName || meta?.artifactData?.icon || flat.icon || null;
  const icon = typeof iconName === 'string' ? `https://enka.network/ui/${iconName}.png` : (iconName?.url || null);

  return {
    name: name === 'Unknown' ? 'Artifact' : name,
    slot: SLOT_NAMES[slotRaw] || slotRaw,
    setName: setName === 'Unknown' ? 'Unknown Set' : setName,
    icon,
    level: Number.isFinite(Number(reliquary.level)) ? Math.max(0, Number(reliquary.level) - 1) : Number(meta?.level || 0),
    mainStat: {
      label: mainStat.label,
      value: formatEquipmentStat(mainStat.value, mainStat.percent),
      rawValue: mainStat.value,
      percent: mainStat.percent,
      key: mainStat.key
    },
    substats
  };
}

function weaponStatCandidates(rawWeapon, metaWeapon) {
  const rawFlat = rawWeapon?.flat || {};
  const meta = metaWeapon || {};
  const metaData = meta?.weaponData || meta?.data || {};
  return [
    rawFlat.weaponStats,
    meta.weaponStats,
    meta.stats,
    metaData.weaponStats,
    metaData.stats,
    findNestedByKeys(meta, ['weaponStats', 'stats']),
    findNestedByKeys(metaData, ['weaponStats', 'stats'])
  ];
}

function normalizeRawWeapon(rawWeapon, metadata) {
  const flat = rawWeapon?.flat || {};
  const weapon = rawWeapon?.weapon || {};
  const meta = metadata || {};
  const stats = firstEquipmentStats(weaponStatCandidates(rawWeapon, meta));
  const base = stats.find(x => x.key === 'FIGHT_PROP_BASE_ATTACK' || x.label === 'Base ATK');
  const refinementRaw = Object.values(weapon.affixMap || {})[0];
  const refinement = refinementRaw != null ? Number(refinementRaw) + 1 : Number(meta?.refinement?.level ?? meta?.improvement ?? 1);
  const iconName = flat.icon || meta?.iconName || meta?.icon || meta?.weaponData?.icon || null;
  const icon = typeof iconName === 'string' ? `https://enka.network/ui/${iconName}.png` : (iconName?.url || null);
  return {
    name: getStr(meta?.name || meta?.weaponData?.name || flat.nameTextHashMap || 'Unknown Weapon'),
    rarity: Number(flat.rankLevel || meta?.rarity || meta?.stars || 5),
    level: Number(weapon.level || meta?.level || 1),
    refinement: Number.isFinite(refinement) && refinement > 0 ? refinement : 1,
    icon,
    baseAttack: base?.value || 0,
    stats: stats.filter(x => x !== base)
  };
}

function characterImageFromMetadata(c) {
  const candidates = [
    c?.characterData?.icons?.gacha?.url,
    c?.characterData?.gachaSplashImage?.url,
    c?.characterData?.splashImage?.url,
    c?.icons?.gacha?.url,
    c?.icons?.card?.url,
    c?.icon?.url,
    typeof c?.characterData?.icons?.gacha === 'string' ? c.characterData.icons.gacha : null,
    typeof c?.icons?.gacha === 'string' ? c.icons.gacha : null
  ].filter(Boolean);
  return candidates[0] || null;
}

function talentRows(raw, meta) {
  const levels = raw?.skillLevelMap || {};
  const entries = Object.keys(levels).map(key => ({
    key,
    id: Number(key),
    level: Number(levels[key])
  })).filter(x => Number.isFinite(x.level) && x.level > 0);

  // Enka's skillLevelMap is { skill_id: level }. There are two useful ID
  // namespaces in Genshin data: the character-data skill IDs and the
  // showcase/raw skillLevelMap IDs. For Ayaka specifically:
  //   Normal = 10024 / raw 10261
  //   Skill  = 10018 / raw 10262
  //   Burst  = 10019 / raw 10265
  // Do not guess from object order when one of these IDs is available.
  const avatarId = Number(raw?.avatarId || meta?.id || meta?.avatarId || 0);
  const knownAliases = {
    10000002: {
      normal: [10024, 10261],
      skill: [10018, 10262],
      burst: [10019, 10265]
    }
  };

  const skillMeta = meta?.skills || meta?.characterData?.skills || {};
  const definitions = [
    ['Normal Attack', skillMeta?.normalAttack ?? skillMeta?.normalAttacks, 'normal', 1, 0],
    ['Elemental Skill', skillMeta?.elementalSkill, 'skill', 2, 1],
    ['Elemental Burst', skillMeta?.elementalBurst, 'burst', 5, 2]
  ];

  return definitions.map(([name, skill, aliasKey, suffix, fallbackIndex]) => {
    const ids = [...(knownAliases[avatarId]?.[aliasKey] || [])];

    if (skill && typeof skill === 'object') {
      for (const key of ['id', 'skillId', 'skillID', 'rawId', 'apiId']) {
        const n = Number(skill[key]);
        if (Number.isFinite(n) && !ids.includes(n)) ids.push(n);
      }
    }

    let candidate = null;

    // 1) Exact known/raw/wrapper skill IDs.
    for (const id of ids) {
      candidate = entries.find(x => x.id === id);
      if (candidate) break;
    }

    // 2) Genshin's active-skill ID suffixes: 1=Normal, 2=Skill, 5=Burst.
    if (!candidate) {
      candidate = entries.find(x => Math.abs(x.id) % 10 === suffix);
    }

    // 3) Last-resort classification/position fallback.
    if (!candidate) {
      const active = entries
        .filter(x => [1, 2, 5].includes(Math.abs(x.id) % 10))
        .sort((a, b) => (Math.abs(a.id) % 10) - (Math.abs(b.id) % 10));
      candidate = active.find(x => Math.abs(x.id) % 10 === suffix) || active[fallbackIndex] || null;
    }

    if (!candidate && entries.length === 3) candidate = entries[fallbackIndex];

    const wrapperLevel = skill && typeof skill === 'object' ? Number(skill.level) : NaN;
    const level = Number(candidate?.level ?? (Number.isFinite(wrapperLevel) ? wrapperLevel : 1));
    return { name, level: Number.isFinite(level) && level > 0 ? level : 1 };
  });
}
function constellationCount(raw) {
  return Array.isArray(raw?.talentIdList) ? raw.talentIdList.length : 0;
}

function getWrapperEquipment(meta) {
  const weapon = meta?.weapon || (Array.isArray(meta?.equipments) ? meta.equipments.find(e => e?.weapon)?.weapon : null);
  let artifacts = meta?.reliquaries || meta?.artifacts || [];
  if (!Array.isArray(artifacts) && Array.isArray(meta?.equipments)) artifacts = meta.equipments.filter(e => e?.artifact).map(e => e.artifact);
  return { weapon, artifacts: Array.isArray(artifacts) ? artifacts : [] };
}

function makeBreakdown(raw, stats, weapon, artifacts) {
  const artifactTotals = {};
  const add = (key, value) => {
    if (key && Number.isFinite(value)) artifactTotals[key] = (artifactTotals[key] || 0) + value;
  };
  for (const a of artifacts) {
    if (a.mainStat?.key) add(a.mainStat.key, a.mainStat.rawValue);
    for (const sub of a.substats || []) add(sub.key, sub.rawValue);
  }
  const baseHP = getRawFightProp(raw, 1);
  const baseATK = getRawFightProp(raw, 4);
  const baseDEF = getRawFightProp(raw, 7);
  const final = Object.fromEntries(stats.map(s => [s.label, s.rawValue]));
  const weaponBaseATK = Number(weapon?.baseAttack || 0);
  const combinedBaseATK = baseATK + weaponBaseATK;
  return {
    baseCharacter: { HP: baseHP, ATK: baseATK, DEF: baseDEF },
    bonus: {
      HP: Math.max(0, (final.HP || 0) - baseHP),
      ATK: Math.max(0, (final.ATK || 0) - combinedBaseATK),
      DEF: Math.max(0, (final.DEF || 0) - baseDEF)
    },
    weapon: { baseAttack: weaponBaseATK, stats: weapon?.stats || [] },
    combinedBaseATK,
    artifacts: artifactTotals,
    final
  };
}

function serializeCharacter(raw, meta) {
  const equipMeta = getWrapperEquipment(meta);
  const rawEquip = Array.isArray(raw?.equipList) ? raw.equipList : [];
  const rawArtifacts = rawEquip.filter(e => e?.flat?.itemType === 'ITEM_RELIQUARY');
  const rawWeapon = rawEquip.find(e => e?.flat?.itemType === 'ITEM_WEAPON');

  const metaArtifacts = equipMeta.artifacts || [];
  const artifacts = rawArtifacts.map((a, i) => normalizeRawArtifact(a, metaArtifacts[i]));
  const weapon = rawWeapon ? normalizeRawWeapon(rawWeapon, equipMeta.weapon) : null;
  const stats = getFinalStats(raw);
  const id = Number(raw?.avatarId || meta?.id || meta?.avatarId || 0);

  return {
    id,
    name: getStr(meta?.name || meta?.characterData?.name || `Character ${id}`),
    level: Number(raw?.propMap?.['4001']?.val ?? raw?.propMap?.[4001]?.val ?? meta?.level ?? 1),
    image: characterImageFromMetadata(meta),
    constellation: constellationCount(raw),
    weapon,
    artifacts,
    talents: talentRows(raw, meta),
    stats,
    breakdown: makeBreakdown(raw, stats, weapon, artifacts)
  };
}

async function fetchRaw(uid) {
  const upstream = await fetch(`https://enka.network/api/uid/${uid}`, {
    headers: { 'User-Agent': 'Genshin-StatPaglu/9.2.0 (local build viewer)', 'Accept': 'application/json' }
  });
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { throw new Error(`Enka returned invalid JSON (HTTP ${upstream.status})`); }
  if (!upstream.ok) {
    const error = new Error(data?.error || data?.message || `Enka request failed (${upstream.status})`);
    error.status = upstream.status;
    throw error;
  }
  return data;
}

async function buildProfile(uid) {
  // Raw API is authoritative for character stats; wrapper metadata is used only to enrich names/assets/equipment when needed.
  const raw = await fetchRaw(uid);
  let wrapped = null;
  try { wrapped = await enka.fetchUser(Number(uid)); } catch (_) { /* metadata fallback only */ }

  const wrappedChars = wrapped?.characters || [];
  const metaById = new Map(wrappedChars.map(c => [Number(c?.id || c?.avatarId || c?.characterData?.id), c]));
  const avatars = Array.isArray(raw.avatarInfoList) ? raw.avatarInfoList : [];

  const characters = avatars.map(a => serializeCharacter(a, metaById.get(Number(a.avatarId)) || {}));
  const p = raw.playerInfo || {};
  return {
    uid,
    playerInfo: {
      nickname: p.nickname || wrapped?.player?.username || wrapped?.player?.nickname || 'Traveler',
      level: Number(p.level || p.adventureRank || wrapped?.player?.levels?.rank || 0),
      worldLevel: Number(p.worldLevel ?? wrapped?.player?.levels?.world ?? 0),
      abyss: p.towerFloorIndex ? `${p.towerFloorIndex}-${p.towerLevelIndex || ''}` : (wrapped?.player?.abyssFloor ? `${wrapped.player.abyssFloor}-${wrapped.player.abyssChamber || ''}` : null)
    },
    characters
  };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/api\/profile\/(\d{8,10})$/);

  if (match) {
    const uid = match[1];
    const previous = cache.get(uid);
    if (previous && Date.now() - previous.at < TTL_MS) return send(res, 200, JSON.stringify(previous.data));
    try {
      const data = await buildProfile(uid);
      cache.set(uid, { data, at: Date.now() });
      return send(res, 200, JSON.stringify(data));
    } catch (err) {
      return send(res, err.status || 502, JSON.stringify({ error: err.message || 'Could not reach Enka.network' }));
    }
  }

  const file = files.get(url.pathname);
  if (!file) return send(res, 404, 'Not found', 'text/plain');
  const ext = path.extname(file);
  fs.readFile(path.join(root, file), (err, data) => {
    if (err) return send(res, 500, 'Could not read app file', 'text/plain');
    send(res, 200, data, types[ext]);
  });
}).listen(Number(process.env.PORT || 4173), () => console.log(`Genshin StatPaglu v9.2.0 is running on port ${process.env.PORT || 4173}`));

// Export parser helpers for the local smoke-test without starting another server.
module.exports = { getFinalStats, serializeCharacter, normalizeRawWeapon, normalizeRawArtifact };