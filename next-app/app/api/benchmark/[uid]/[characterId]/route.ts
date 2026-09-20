import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const percentKeys = new Set([
  'FIGHT_PROP_HP_PERCENT','FIGHT_PROP_ATTACK_PERCENT','FIGHT_PROP_DEFENSE_PERCENT',
  'FIGHT_PROP_CRITICAL','FIGHT_PROP_CRITICAL_HURT','FIGHT_PROP_CHARGE_EFFICIENCY',
  'FIGHT_PROP_HEAL_ADD','FIGHT_PROP_FIRE_ADD_HURT','FIGHT_PROP_ELEC_ADD_HURT',
  'FIGHT_PROP_WATER_ADD_HURT','FIGHT_PROP_GRASS_ADD_HURT','FIGHT_PROP_WIND_ADD_HURT',
  'FIGHT_PROP_ROCK_ADD_HURT','FIGHT_PROP_ICE_ADD_HURT','FIGHT_PROP_PHYSICAL_ADD_HURT'
]);
const propLabels: Record<string,string> = {
  FIGHT_PROP_HP:'HP',FIGHT_PROP_ATTACK:'ATK',FIGHT_PROP_DEFENSE:'DEF',
  FIGHT_PROP_ELEMENT_MASTERY:'Elemental Mastery',FIGHT_PROP_CHARGE_EFFICIENCY:'Energy Recharge',
  FIGHT_PROP_CRITICAL:'CRIT Rate',FIGHT_PROP_CRITICAL_HURT:'CRIT DMG',
  FIGHT_PROP_FIRE_ADD_HURT:'Pyro DMG Bonus',FIGHT_PROP_ELEC_ADD_HURT:'Electro DMG Bonus',
  FIGHT_PROP_WATER_ADD_HURT:'Hydro DMG Bonus',FIGHT_PROP_GRASS_ADD_HURT:'Dendro DMG Bonus',
  FIGHT_PROP_WIND_ADD_HURT:'Anemo DMG Bonus',FIGHT_PROP_ROCK_ADD_HURT:'Geo DMG Bonus',
  FIGHT_PROP_ICE_ADD_HURT:'Cryo DMG Bonus',FIGHT_PROP_PHYSICAL_ADD_HURT:'Physical DMG Bonus',
  FIGHT_PROP_HP_PERCENT:'HP%',FIGHT_PROP_ATTACK_PERCENT:'ATK%',FIGHT_PROP_DEFENSE_PERCENT:'DEF%'
};

async function getJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent':'Genshin-StatPaglu/benchmark', Accept:'application/json' }, cache:'no-store' });
  const body = await res.text();
  let data: any;
  try { data = JSON.parse(body); } catch { throw new Error(`Benchmark service returned invalid JSON (HTTP ${res.status})`); }
  if (!res.ok) throw new Error(data?.message || data?.error || `Benchmark service failed (${res.status})`);
  return data;
}

export async function GET(_request: Request, { params }: { params: Promise<{ uid: string; characterId: string }> }) {
  const { uid: rawUid, characterId: rawCharacterId } = await params;
  const uid = String(rawUid || '').replace(/\D/g,'');
  const characterId = Number(rawCharacterId);
  if (!/^\d{8,10}$/.test(uid) || !Number.isFinite(characterId)) return NextResponse.json({ error:'Invalid benchmark request.' }, { status:400 });

  try {
    const calcData = await getJson(`https://akasha.cv/api/getCalculationsForUser/${uid}`);
    const calculations = Array.isArray(calcData) ? calcData : (Array.isArray(calcData?.data) ? calcData.data : []);
    const char = calculations.find((x:any) => Number(x?.characterId ?? x?.avatarId ?? x?.id) === characterId || Number(x?.character?.id) === characterId);
    const builds = Array.isArray(char?.calculations) ? char.calculations : (Array.isArray(char?.builds) ? char.builds : []);
    const calc = builds.find((x:any) => x?.id != null || x?.calculationId != null) || char?.calculation;
    const calculationId = calc?.id ?? calc?.calculationId;
    if (calculationId == null) return NextResponse.json({ error:'No public world leaderboard is available for this character yet.' }, { status:404 });

    const boardData = await getJson(`https://akasha.cv/api/leaderboards?calculationId=${encodeURIComponent(calculationId)}&size=1&page=1&sort=calculation.result&order=-1`);
    const rows = Array.isArray(boardData) ? boardData : (Array.isArray(boardData?.data) ? boardData.data : []);
    const top = rows[0];
    if (!top) return NextResponse.json({ error:'No public world benchmark is available for this character yet.' }, { status:404 });

    const stats = Object.entries(top.stats || {}).map(([key, raw]: [string,any]) => {
      const value = Number(raw?.value ?? raw?.val ?? raw);
      if (!Number.isFinite(value)) return null;
      const label = propLabels[key] || key.replace(/^FIGHT_PROP_/,'').replace(/_/g,' ');
      return { label, value, display: percentKeys.has(key) ? `${(value*100).toFixed(1)}%` : Math.round(value).toLocaleString() };
    }).filter(Boolean);

    return NextResponse.json({
      rank:Number(top.rank ?? top.index ?? 1),
      nickname:top.owner?.nickname || 'Anonymous',
      uid:String(top.uid || ''),
      damage:Number(top.calculation?.result ?? top.result ?? 0),
      buildName:top.build_name || top.type || char?.name || 'Leaderboard Build',
      characterId:Number(top.characterId ?? characterId),
      constellation:Number(top.constellation ?? 0),
      critValue:Number(top.critValue ?? 0),
      weapon:top.weapon ? {
        name:top.weapon.name || 'Unknown Weapon',
        level:Number(top.weapon.level ?? 90),
        refinement:Number(top.weapon.refinement ?? 1),
        icon:top.weapon.icon ? (String(top.weapon.icon).startsWith('http') ? top.weapon.icon : `https://enka.network/ui/${top.weapon.icon}.png`) : null
      } : null,
      stats
    });
  } catch (error:any) {
    return NextResponse.json({ error:error?.message || 'World benchmark unavailable.' }, { status:502 });
  }
}
