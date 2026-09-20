const { EnkaNetwork } = require('enkanetwork');

const enka = new EnkaNetwork({
  language: 'EN',
  userAgent: 'Genshin-StatPaglu-Next/1.0'
});

const FIGHT = {
  HP: 2, ATK: 5, DEF: 8, EM: 28, CRIT: 20, CRIT_DMG: 22, ER: 23,
  PYRO: 40, ELECTRO: 41, HYDRO: 42, DENDRO: 43, ANEMO: 44, GEO: 45, CRYO: 46
};
const TOTAL = { HP: 2000, ATK: 2001, DEF: 2002 };

const LABELS = {
  FIGHT_PROP_HP:['HP',false], FIGHT_PROP_HP_PERCENT:['HP%',true],
  FIGHT_PROP_ATTACK:['ATK',false], FIGHT_PROP_ATTACK_PERCENT:['ATK%',true],
  FIGHT_PROP_DEFENSE:['DEF',false], FIGHT_PROP_DEFENSE_PERCENT:['DEF%',true],
  FIGHT_PROP_BASE_ATTACK:['Base ATK',false],
  FIGHT_PROP_ELEMENT_MASTERY:['Elemental Mastery',false],
  FIGHT_PROP_CHARGE_EFFICIENCY:['Energy Recharge',true],
  FIGHT_PROP_HEAL_ADD:['Healing Bonus',true],
  FIGHT_PROP_CRITICAL:['CRIT Rate',true],
  FIGHT_PROP_CRITICAL_HURT:['CRIT DMG',true],
  FIGHT_PROP_FIRE_ADD_HURT:['Pyro DMG Bonus',true],
  FIGHT_PROP_ELEC_ADD_HURT:['Electro DMG Bonus',true],
  FIGHT_PROP_WATER_ADD_HURT:['Hydro DMG Bonus',true],
  FIGHT_PROP_GRASS_ADD_HURT:['Dendro DMG Bonus',true],
  FIGHT_PROP_WIND_ADD_HURT:['Anemo DMG Bonus',true],
  FIGHT_PROP_ROCK_ADD_HURT:['Geo DMG Bonus',true],
  FIGHT_PROP_ICE_ADD_HURT:['Cryo DMG Bonus',true],
  FIGHT_PROP_PHYSICAL_ADD_HURT:['Physical DMG Bonus',true]
};
const NUMERIC = {'20':'FIGHT_PROP_CRITICAL','22':'FIGHT_PROP_CRITICAL_HURT','23':'FIGHT_PROP_CHARGE_EFFICIENCY','28':'FIGHT_PROP_ELEMENT_MASTERY','40':'FIGHT_PROP_FIRE_ADD_HURT','41':'FIGHT_PROP_ELEC_ADD_HURT','42':'FIGHT_PROP_WATER_ADD_HURT','43':'FIGHT_PROP_GRASS_ADD_HURT','44':'FIGHT_PROP_WIND_ADD_HURT','45':'FIGHT_PROP_ROCK_ADD_HURT','46':'FIGHT_PROP_ICE_ADD_HURT'};
const SLOTS={EQUIP_BRACER:'Flower of Life',EQUIP_NECKLACE:'Plume of Death',EQUIP_SHOES:'Sands of Eon',EQUIP_RING:'Goblet of Eonothem',EQUIP_DRESS:'Circlet of Logos'};

function str(v){
  if(v==null)return 'Unknown';
  if(typeof v==='string'||typeof v==='number')return String(v);
  if(typeof v==='function'){try{return str(v())}catch{return 'Unknown'}}
  if(typeof v.get==='function'){try{return v.get('en')||v.get('EN')||v.get('value')||'Unknown'}catch{}}
  for(const k of ['value','text','content','name','displayName','localizedName'])if(v[k]!=null&&v[k]!==v){const x=str(v[k]);if(x!=='Unknown')return x}
  return 'Unknown';
}
function num(v){const n=Number(v);return Number.isFinite(n)?n:NaN}
function rawFight(raw,id,fallback){const fp=raw?.fightPropMap||{};const a=num(fp[String(id)]??fp[id]);if(Number.isFinite(a))return a;const b=num(fp[String(fallback)]??fp[fallback]);return Number.isFinite(b)?b:0}
function prop(raw){
  let key=String(raw??''); if(/^\d+$/.test(key))key=NUMERIC[key]||key;
  const known=LABELS[key]; if(known)return {key,label:known[0],percent:known[1]};
  return {key,label:key.replace(/^FIGHT_PROP_/,'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),percent:/PERCENT|CRITICAL|CHARGE_EFFICIENCY|ADD_HURT|HEAL_ADD/.test(key)};
}
function propKey(x){if(x==null)return '';if(typeof x==='string'||typeof x==='number')return String(x);return x.mainPropId||x.appendPropID||x.appendPropId||x.prop_id||x.propId||x.propID||x.type||x.statName||x.fightProp||x.fightPropName||x.key||x.name||''}
function propValue(x){
  if(x==null)return NaN;if(typeof x==='number')return x;if(typeof x==='string')return num(x.replace(/,/g,'').replace('%',''));
  for(const k of ['propValue','value','statValue','val','rawValue','amount'])if(x[k]!=null){const y=typeof x[k]==='object'?propValue(x[k]):num(x[k]);if(Number.isFinite(y))return y}
  return NaN;
}
function equipmentStats(src){
  if(!src)return [];
  let a=Array.isArray(src)?src:src instanceof Map?[...src.values()]:Array.isArray(src.stats)?src.stats:Array.isArray(src.statProperties)?src.statProperties:Object.entries(src).map(([key,value])=>({key,value}));
  return a.map(x=>{const p=prop(propKey(x)),v=propValue(x);return p.key&&Number.isFinite(v)?{...p,value:v}:null}).filter(Boolean);
}
function nested(root,keys,depth=3,seen=new Set()){
  if(!root||typeof root!=='object'||depth<0||seen.has(root))return null;seen.add(root);
  for(const k of keys)if(root[k]!=null)return root[k];
  for(const v of Object.values(root))if(v&&typeof v==='object'){const x=nested(v,keys,depth-1,seen);if(x!=null)return x}
  return null;
}
function fmt(v,p){return p?`${(Number(v)*100).toFixed(1)}%`:Math.round(Number(v)||0).toLocaleString()}
function equipFmt(v,p){return p?`${Number(v).toFixed(1)}%`:Math.round(Number(v)||0).toLocaleString()}

function getFinalStats(raw){
  const hp=rawFight(raw,TOTAL.HP,FIGHT.HP), atk=rawFight(raw,TOTAL.ATK,FIGHT.ATK), def=rawFight(raw,TOTAL.DEF,FIGHT.DEF);
  let em=rawFight(raw,FIGHT.EM);
  if(Number(raw?.avatarId)===10000120)em+=Math.min(160,atk*.08);
  const out=[
    ['HP',hp,false],['ATK',atk,false],['DEF',def,false],['Elemental Mastery',em,false],
    ['CRIT Rate',rawFight(raw,FIGHT.CRIT),true],['CRIT DMG',rawFight(raw,FIGHT.CRIT_DMG),true],['Energy Recharge',rawFight(raw,FIGHT.ER),true]
  ].map(([label,rawValue,percent])=>({label,rawValue,percent,value:fmt(rawValue,percent)}));
  for(const [id,label] of [[FIGHT.PYRO,'Pyro DMG Bonus'],[FIGHT.ELECTRO,'Electro DMG Bonus'],[FIGHT.HYDRO,'Hydro DMG Bonus'],[FIGHT.DENDRO,'Dendro DMG Bonus'],[FIGHT.ANEMO,'Anemo DMG Bonus'],[FIGHT.GEO,'Geo DMG Bonus'],[FIGHT.CRYO,'Cryo DMG Bonus']]){
    const v=rawFight(raw,id);if(v>.0005)out.push({label,rawValue:v,percent:true,value:fmt(v,true)});
  }
  return out;
}
function artifact(raw,meta={}){
  const flat=raw?.flat||{}, r=raw?.reliquary||{};
  const main=flat.reliquaryMainstat||meta.mainstat||meta.mainStat||meta.reliquaryMainstat||nested(meta,['reliquaryMainstat','mainstat','mainStat']);
  const subs=Array.isArray(flat.reliquarySubstats)&&flat.reliquarySubstats.length?flat.reliquarySubstats:(meta.substats||meta.subStats||meta.reliquarySubstats||nested(meta,['reliquarySubstats','substats','subStats'])||[]);
  const ms=equipmentStats(main)[0]||{key:'',label:'Main Stat',value:0,percent:false};
  const ss=equipmentStats(subs).map(x=>({label:x.label,value:equipFmt(x.value,x.percent),rawValue:x.value,percent:x.percent,key:x.key}));
  const iconName=meta.iconName||meta.icon||meta.artifactData?.icon||flat.icon;
  return {
    name:str(meta.name||meta.artifactData?.name||flat.nameTextHashMap||'Artifact'),
    setName:str(meta.setName||meta.artifactData?.setName||flat.setNameTextHashMap||'Unknown Set'),
    slot:SLOTS[meta.slot||meta.artifactData?.equipType||flat.equipType]||(meta.slot||flat.equipType||'Artifact'),
    level:Number.isFinite(Number(r.level))?Math.max(0,Number(r.level)-1):Number(meta.level||0),
    icon:typeof iconName==='string'?`https://enka.network/ui/${iconName}.png`:(iconName?.url||null),
    mainStat:{label:ms.label,value:equipFmt(ms.value,ms.percent),rawValue:ms.value,percent:ms.percent,key:ms.key},
    substats:ss
  };
}
function weapon(raw,meta={}){
  const flat=raw?.flat||{}, w=raw?.weapon||{};
  const src=[flat.weaponStats,meta.weaponStats,meta.stats,meta.weaponData?.weaponStats,meta.weaponData?.stats,nested(meta,['weaponStats','stats'])];
  let stats=[];for(const s of src){stats=equipmentStats(s);if(stats.length)break}
  const base=stats.find(x=>x.key==='FIGHT_PROP_BASE_ATTACK'||x.label==='Base ATK');
  const iconName=flat.icon||meta.iconName||meta.icon||meta.weaponData?.icon;
  const ref=Object.values(w.affixMap||{})[0];
  return {name:str(meta.name||meta.weaponData?.name||flat.nameTextHashMap||'Unknown Weapon'),rarity:Number(flat.rankLevel||meta.rarity||meta.stars||5),level:Number(w.level||meta.level||1),refinement:Number.isFinite(Number(ref))?Number(ref)+1:Number(meta.refinement?.level||1),icon:typeof iconName==='string'?`https://enka.network/ui/${iconName}.png`:(iconName?.url||null),baseAttack:base?.value||0,stats:stats.filter(x=>x!==base)};
}
function image(meta={}){
  return [meta.characterData?.icons?.gacha?.url,meta.characterData?.gachaSplashImage?.url,meta.characterData?.splashImage?.url,meta.icons?.gacha?.url,meta.icons?.card?.url,meta.icon?.url,typeof meta.characterData?.icons?.gacha==='string'?meta.characterData.icons.gacha:null,typeof meta.icons?.gacha==='string'?meta.icons.gacha:null].filter(Boolean)[0]||null;
}
function talents(raw,meta={}) {
  const levels=raw?.skillLevelMap||{};
  const entries=Object.keys(levels).map(key=>({key,id:Number(key),level:Number(levels[key])})).filter(x=>Number.isFinite(x.level)&&x.level>0);

  // Enka documents skillLevelMap as { skill_id: level }. Resolve by actual
  // skill ID first; then use the active-skill suffixes 1/2/5; only then use
  // a positional fallback when the raw map has no classifiable IDs.
  const definitions=[
    ['Normal Attack',meta?.skills?.normalAttack??meta?.skills?.normalAttacks,1,0],
    ['Elemental Skill',meta?.skills?.elementalSkill,2,1],
    ['Elemental Burst',meta?.skills?.elementalBurst,5,2]
  ];

  return definitions.map(([name,skill,suffix,fallbackIndex])=>{
    const explicitIds=[];
    if(skill&&typeof skill==='object'){
      for(const key of ['id','skillId','skillID','rawId','apiId']){
        const n=Number(skill[key]); if(Number.isFinite(n)) explicitIds.push(n);
      }
    }

    let candidate=null;
    for(const id of explicitIds){candidate=entries.find(x=>x.id===id);if(candidate)break}
    candidate ||= entries.find(x=>Math.abs(x.id)%10===suffix);

    if(!candidate){
      const active=entries.filter(x=>[1,2,5].includes(Math.abs(x.id)%10))
        .sort((a,b)=>(Math.abs(a.id)%10)-(Math.abs(b.id)%10));
      candidate=active.find(x=>Math.abs(x.id)%10===suffix)||active[fallbackIndex]||null;
    }

    if(!candidate&&entries.length===3) candidate=entries[fallbackIndex];

    const wrapperLevel=skill&&typeof skill==='object'?Number(skill.level):NaN;
    const level=Number(candidate?.level??(Number.isFinite(wrapperLevel)?wrapperLevel:1));
    return {name,level:Number.isFinite(level)&&level>0?level:1};
  });
}) {
  const levels=raw?.skillLevelMap||{};
  const entries=Object.keys(levels).map(key=>({key,id:Number(key),level:Number(levels[key])})).filter(x=>Number.isFinite(x.level)&&x.level>0);
  // skillLevelMap is keyed by actual skill IDs; object order is not the
  // Normal/Skill/Burst order. Prefer wrapper ids, then the stable combat-skill
  // suffixes (1/2/5) used by Genshin's Normal/Skill/Burst skill IDs.
  const definitions=[
    ['Normal Attack',meta?.skills?.normalAttack??meta?.skills?.normalAttacks,1],
    ['Elemental Skill',meta?.skills?.elementalSkill,2],
    ['Elemental Burst',meta?.skills?.elementalBurst,5]
  ];
  return definitions.map(([name,skill,suffix])=>{
    const explicitId=typeof skill==='object'&&skill?.id!=null?Number(skill.id):NaN;
    const candidate=(Number.isFinite(explicitId)?entries.find(x=>x.id===explicitId):null)||entries.find(x=>Math.abs(x.id)%10===suffix);
    const level=Number(candidate?.level??(typeof skill==='object'?skill?.level:undefined)??1);
    return {name,level:Number.isFinite(level)&&level>0?level:1};
  });
}
function metaEquip(meta={}){
  const w=meta.weapon||(Array.isArray(meta.equipments)?meta.equipments.find(x=>x?.weapon)?.weapon:null);
  let a=meta.reliquaries||meta.artifacts||[];if(!Array.isArray(a)&&Array.isArray(meta.equipments))a=meta.equipments.filter(x=>x?.artifact).map(x=>x.artifact);
  return {weapon:w,artifacts:Array.isArray(a)?a:[]};
}
function serializeCharacter(raw,meta={}){
  const em=metaEquip(meta), eq=Array.isArray(raw?.equipList)?raw.equipList:[], ra=eq.filter(x=>x?.flat?.itemType==='ITEM_RELIQUARY'), rw=eq.find(x=>x?.flat?.itemType==='ITEM_WEAPON');
  const artifacts=ra.map((x,i)=>artifact(x,em.artifacts[i]||{})), weap=rw?weapon(rw,em.weapon):null, stats=getFinalStats(raw);
  const artifactTotals={};for(const a of artifacts){if(a.mainStat.key)artifactTotals[a.mainStat.key]=(artifactTotals[a.mainStat.key]||0)+a.mainStat.rawValue;for(const s of a.substats)artifactTotals[s.key]=(artifactTotals[s.key]||0)+s.rawValue}
  const baseHP=rawFight(raw,1),baseATK=rawFight(raw,4),baseDEF=rawFight(raw,7),final=Object.fromEntries(stats.map(s=>[s.label,s.rawValue])),weaponBase=Number(weap?.baseAttack||0);
  return {id:Number(raw?.avatarId||meta.id||0),name:str(meta.name||meta.characterData?.name||`Character ${raw?.avatarId||''}`),level:Number(raw?.propMap?.['4001']?.val??meta.level??1),image:image(meta),constellation:Array.isArray(raw?.talentIdList)?raw.talentIdList.length:0,weapon:weap,artifacts,talents:talents(raw,meta),stats,breakdown:{baseCharacter:{HP:baseHP,ATK:baseATK,DEF:baseDEF},bonus:{HP:Math.max(0,(final.HP||0)-baseHP),ATK:Math.max(0,(final.ATK||0)-baseATK-weaponBase),DEF:Math.max(0,(final.DEF||0)-baseDEF)},weapon:{baseAttack:weaponBase,stats:weap?.stats||[]},combinedBaseATK:baseATK+weaponBase,artifacts:artifactTotals,final}};
}
async function buildProfile(uid){
  const upstream=await fetch(`https://enka.network/api/uid/${uid}`,{headers:{'User-Agent':'Genshin-StatPaglu-Next/1.0','Accept':'application/json'}});
  const body=await upstream.text();let raw;try{raw=JSON.parse(body)}catch{throw new Error(`Enka returned invalid JSON (HTTP ${upstream.status})`)}
  if(!upstream.ok){const e=new Error(raw?.error||raw?.message||`Enka request failed (${upstream.status})`);e.status=upstream.status;throw e}
  let wrapped=null;try{wrapped=await enka.fetchUser(Number(uid))}catch{}
  const metaById=new Map((wrapped?.characters||[]).map(c=>[Number(c?.id||c?.avatarId||c?.characterData?.id),c]));
  const chars=(raw.avatarInfoList||[]).map(a=>serializeCharacter(a,metaById.get(Number(a.avatarId))||{}));
  const p=raw.playerInfo||{};
  return {uid,playerInfo:{nickname:p.nickname||wrapped?.player?.username||wrapped?.player?.nickname||'Traveler',level:Number(p.level||p.adventureRank||wrapped?.player?.levels?.rank||0),worldLevel:Number(p.worldLevel??wrapped?.player?.levels?.world??0),abyss:p.towerFloorIndex?`${p.towerFloorIndex}-${p.towerLevelIndex||''}`:null},characters:chars};
}
module.exports={buildProfile,getFinalStats,serializeCharacter,normalizeRawWeapon:weapon,normalizeRawArtifact:artifact};