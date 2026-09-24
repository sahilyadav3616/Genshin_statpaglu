'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

const STATPAGLU_QUOTES = [
  ['“The world remains constant over the centuries. But human life is like the dew at dawn or a bubble rising through water. Transitory.”','Raiden Shogun — The Mortal World'],
  ['“People say that the moon shines brightest on a moonless night.”','Yae Miko — The Moon'],
  ['“The wind rises with a gust, and the clouds gather in response.”','Zhongli — About the Wind'],
  ['“The rain stops, the wind dies down, and the sun comes out.”','Nahida — The Rain'],
  ['“Every journey has its final day. Don’t rush.”','Zhongli — The Journey'],
  ['“What does freedom really mean, if demanded of you by a god?”','Venti — About Freedom']
];

type Stat = { label: string; value: string; rawValue?: number; percent?: boolean; key?: string };
type Artifact = {
  name: string; setName: string; slot: string; level: number; icon?: string | null;
  mainStat: Stat; substats: Stat[];
};
type Weapon = {
  name: string; rarity: number; level: number; refinement: number; icon?: string | null;
  baseAttack: number; stats: Stat[];
};
type Character = {
  id: number; name: string; level: number; image?: string | null; constellation: number;
  weapon: Weapon | null; artifacts: Artifact[]; talents: { name: string; level: number }[];
  stats: Stat[];
  breakdown?: { baseCharacter?: Record<string, number>; bonus?: Record<string, number>; weapon?: Weapon; artifacts?: Record<string, number> };
};
type Profile = { uid: string; playerInfo: { nickname: string; level: number; worldLevel: number; abyss?: string | null; profilePictureUrl?: string | null }; characters: Character[] };

const accents = ['#b99cff','#68d8ff','#f49ac8','#ffd36b','#71e0bd','#9db7ff'];
const priorityLabels = ['CRIT Rate','CRIT DMG','ATK','Elemental Mastery','Energy Recharge','HP','DEF'];
const regionByPrefix: Record<string,string> = {'1':'CN','2':'CN','3':'CN','5':'CN','6':'NA','7':'EU','8':'ASIA','9':'TW / HK / MO'};
const num = (value: unknown) => Number(value || 0);
const numberText = (value: unknown) => num(value).toLocaleString(undefined,{maximumFractionDigits:1});
const percentText = (value: unknown) => `${num(value).toFixed(1)}%`;
function topStats(stats: Stat[]) {
  const picked = priorityLabels.map(label => stats.find(s => s.label === label)).filter(Boolean) as Stat[];
  return picked.slice(0,4).length ? picked.slice(0,4) : stats.slice(0,4);
}
function artifactCV(a: Artifact) {
  let cr = 0, cd = 0;
  (a.substats || []).forEach(sub => {
    const label = String(sub.label || '').toLowerCase();
    const value = Number(sub.rawValue ?? String(sub.value || '').replace('%','')) || 0;
    if (label.includes('crit rate')) cr += value;
    if (label.includes('crit dmg') || label.includes('crit damage')) cd += value;
  });
  return cr * 2 + cd;
}
function renderBreakdownStat(key: string, value: number) {
  const percentageKeys = new Set(['FIGHT_PROP_HP_PERCENT','FIGHT_PROP_ATTACK_PERCENT','FIGHT_PROP_DEFENSE_PERCENT','FIGHT_PROP_CRITICAL','FIGHT_PROP_CRITICAL_HURT','FIGHT_PROP_CHARGE_EFFICIENCY','FIGHT_PROP_HEAL_ADD','FIGHT_PROP_FIRE_ADD_HURT','FIGHT_PROP_ELEC_ADD_HURT','FIGHT_PROP_WATER_ADD_HURT','FIGHT_PROP_GRASS_ADD_HURT','FIGHT_PROP_WIND_ADD_HURT','FIGHT_PROP_ROCK_ADD_HURT','FIGHT_PROP_ICE_ADD_HURT','FIGHT_PROP_PHYSICAL_ADD_HURT']);
  return percentageKeys.has(key) ? percentText(value) : numberText(value);
}
function FrostAmbience() {
  useEffect(() => {
    const field = document.querySelector('#frostField'); if (!field) return;
    field.innerHTML = '';
    const spots = [[10,18],[89,17],[7,48],[93,50],[15,82],[85,84],[49,9],[51,91],[25,35],[76,64],[32,73],[68,29],[18,60],[83,36]];
    spots.forEach(([x,y],i) => {
      const node=document.createElement('span'); node.className='frost-snowflake'; node.style.left=x+'%'; node.style.top=y+'%';
      node.style.setProperty('--dur',(8+(i%4)*1.7)+'s'); node.style.setProperty('--delay',(-i*.9)+'s'); field.appendChild(node);
    });
    return () => { field.innerHTML=''; };
  }, []);
  return <div className="frost-field" id="frostField" aria-hidden="true" />;
}

export default function Home() {
  const [uid, setUid] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState('ENTER UID');
  const [live, setLive] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  async function loadProfile(value: string) {
    const clean = value.replace(/\D/g,'');
    if (clean.length < 8) return;
    setUid(clean); setStatus('CONTACTING ENKA'); setLive(true); setProfile(null);
    try {
      const res = await fetch(`/api/profile/${clean}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Profile unavailable');
      if (!data.characters?.length) throw new Error('No public characters found');
      setProfile(data); setStatus('ENKA LIVE DATA'); setLive(true);
    } catch (error) {
      setStatus((error as Error).message.toUpperCase()); setLive(false);
    }
  }
  useEffect(()=>{const b=document.querySelector('#themeToggle');if(!b)return;if(localStorage.getItem('statpaglu-theme')==='light')document.body.classList.add('light-mode');const sync=()=>{const light=document.body.classList.contains('light-mode');b.innerHTML=light?'☀ <span>LIGHT</span>':'☾ <span>DARK</span>';b.setAttribute('aria-pressed',String(light));b.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode')};sync();b.addEventListener('click',()=>{document.body.classList.toggle('light-mode');localStorage.setItem('statpaglu-theme',document.body.classList.contains('light-mode')?'light':'dark');sync()})},[]);
  const characters = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (profile?.characters || []).map((c,i)=>({c,i})).filter(({c})=>!needle || c.name.toLowerCase().includes(needle));
  }, [profile, filter]);
  const selectedCharacter = selected == null ? null : profile?.characters[selected] || null;
  function submit(e: FormEvent) { e.preventDefault(); loadProfile(uid); }
  return (
    <main className="page-shell">
      <div className="ambient ambient-a"/><div className="ambient ambient-b"/><FrostAmbience />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Genshin StatPaglu home"><span className="brand-mark">SP</span><span>GENSHIN <b>STATPAGLU</b></span></a>
        <div className="nav-actions"><div className="nav-status"><i className={live ? 'online' : 'offline'} /> {status}</div><button id="themeToggle" className="theme-toggle" type="button">☼ LIGHT</button></div>
        <a className="source-link" href={profile?.uid ? `https://enka.network/u/${profile.uid}/` : '#'} target="_blank" rel="noreferrer">ENKA PROFILE ↗</a>
      </header>
      <section className="hero" id="top">
        <div className="eyebrow">GENSHIN IMPACT • BUILD INSPECTOR</div>
        <RandomQuote/>
        <div className="hero-grid">
          <div>
            <h1>Your builds.<br/><em>Your stats.</em></h1>
            <p>Genshin StatPaglu turns your public showcase into a clean, readable character dashboard — equipment, artifacts, talents and combat stats in one place.</p>
            <form className="uid-form" onSubmit={submit}>
              <input placeholder="Enter UID" value={uid} onChange={e=>setUid(e.target.value.replace(/\D/g,''))} inputMode="numeric" maxLength={10} aria-label="Genshin UID" />
              <button type="submit">LOAD UID <span>→</span></button>
            </form>
            <p className="hint">Public showcase data is retrieved from Enka.Network.</p>
            <OstPlayer/>
          </div>
          <div className="hero-badge"><span>STATPAGLU</span><strong>BUILD<br/>CHECK</strong><small>01 / LIVE</small></div>
        </div>
      </section>
      <section className={`profile-panel ${profile ? '' : 'paimon-panel'}`}>
        {profile ? <>
          <div className="profile-identity"><div className="profile-mark profile-avatar"><img src={profile.playerInfo.profilePictureUrl || 'https://enka.network/ui/UI_AvatarIcon_PlayerBoy.png'} alt={profile.playerInfo.profilePictureUrl ? 'Traveler profile picture' : 'Aether'} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='https://enka.network/ui/UI_AvatarIcon_PlayerBoy.png';e.currentTarget.alt='Aether';}} /></div><div><span>TRAVELER PROFILE</span><h2>{profile.playerInfo.nickname || 'Unknown Traveler'}</h2></div></div>
          <div className="profile-stats"><div><span>ADVENTURE RANK</span><b>AR {profile.playerInfo.level || '—'}</b></div><div><span>WORLD LEVEL</span><b>WL {profile.playerInfo.worldLevel ?? '—'}</b></div><div><span>SPIRAL ABYSS</span><b>{profile.playerInfo.abyss || '—'}</b></div></div>
          <div className="profile-meta"><span>{regionByPrefix[String(profile.uid)[0]] || 'UNKNOWN'}</span><span>UID <b>{profile.uid}</b></span></div>
        </> : <>
          <div className="paimon-art profile-empty-art"><img src="https://enka.network/ui/UI_AvatarIcon_PlayerBoy.png" alt="Aether" /></div>
          <div className="paimon-copy"><span className="eyebrow">PAIMON'S ON DUTY</span><h2>No profile loaded yet!</h2><p>Enter a public UID above and Paimon will bring the Traveler's builds here.</p></div>
          <div className="paimon-badge">UID<br/>REQUIRED</div>
        </>}
      </section>
      <section className="collection">
        <div className="section-heading"><div><span className="eyebrow">PUBLIC SHOWCASE</span><h2>Character roster <small>{profile ? `${profile.characters.length} builds` : '— builds'}</small></h2></div><button className="ghost-button" onClick={()=>loadProfile(uid)}>↻ REFRESH</button></div>
        <input className="filter-input" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter showcased characters by name…" aria-label="Filter characters" />
        <p className="hint roster-note">Only characters returned by your public Enka showcase are shown.</p>
        <div className="roster">
          {!profile ? <div className="loading roster-empty">ENTER A PUBLIC UID ABOVE TO LOAD A PROFILE</div> : !characters.length ? <div className="loading">NO CHARACTERS MATCH “{filter.toUpperCase()}”</div> : characters.map(({c,i},pos)=><CharacterCard key={`${c.id}-${i}`} c={c} index={pos} onOpen={()=>setSelected(i)} />)}
        </div>
      </section>
      <SupportPanel />
      <footer>GENSHIN STATPAGLU <span>•</span> DATA POWERED BY ENKA.NETWORK <span>•</span> NOT AFFILIATED WITH HOYOVERSE</footer>
      {selectedCharacter && <DetailModal character={selectedCharacter} onClose={()=>setSelected(null)} />}
    </main>
  );
}
function CharacterCard({ c, index, onOpen }: { c: Character; index: number; onOpen: () => void }) {
  const setCounts: Record<string,number> = {};
  (c.artifacts || []).forEach(a => { if (a.setName && a.setName !== 'Unknown Set') setCounts[a.setName]=(setCounts[a.setName]||0)+1; });
  const setSummary = Object.entries(setCounts).map(([name,count])=>`${name} ×${count}`).join(' · ') || `${c.artifacts.length} artifacts`;
  return <article className="build-card" style={{'--accent': accents[index%accents.length]} as React.CSSProperties} onClick={onOpen}>
    <div className="card-glow"/>
    {c.image ? <img className="char-image" src={c.image} alt="" loading="lazy"/> : <div className="portrait"><span>{c.name[0] || '?'}</span></div>}
    <div className="card-top"><span className="rarity">{'★'.repeat(5)}</span><span>BUILD {String(index+1).padStart(2,'0')}</span></div>
    <div className="character-title"><div><p>SHOWCASED CHARACTER</p><h3>{c.name}</h3></div><span className="level">LV. {c.level}</span></div>
    <div className="key-stats">{topStats(c.stats).map(s=><div className="stat" key={s.label}><span>{s.label.toUpperCase()}</span><b>{s.value}</b></div>)}</div>
    <div className="divider"/>
    <div className="equipment">
      <div className="equipment-item"><div className="item-icon">{c.weapon?.icon ? <img src={c.weapon.icon} alt=""/> : '✦'}</div><div><p>WEAPON</p><b>{c.weapon ? `${c.weapon.name} • ${c.weapon.rarity}★` : 'No weapon data'}</b><small>{c.weapon ? `Level ${c.weapon.level} · R${c.weapon.refinement}` : '—'}</small></div></div>
      <div className="equipment-item"><div className="artifact-icons-row">{c.artifacts.slice(0,5).map((a,j)=>a.icon?<img key={j} src={a.icon} alt=""/>:null)}</div><div><p>ARTIFACTS</p><b>{setSummary}</b><small>{c.artifacts.length ? `Avg +${Math.round(c.artifacts.reduce((s,a)=>s+a.level,0)/c.artifacts.length)}` : '—'}</small></div></div>
    </div>
    <div className="card-bottom"><span>{c.talents.length ? c.talents.slice(0,3).map((t,i)=><span key={i}>{['Normal Attack','Elemental Skill','Elemental Burst'][i]} {t.level}{i<Math.min(c.talents.length,3)-1 ? ' · ' : ''}</span>) : 'No talent data'}</span><span>C{c.constellation || 0}</span></div>
    <div className="card-view-detail">OPEN BUILD →</div>
  </article>;
}
function RandomQuote() {\n  const [quote,setQuote]=useState(STATPAGLU_QUOTES[Math.floor(Math.random()*STATPAGLU_QUOTES.length)]);\n  useEffect(()=>{ setQuote(STATPAGLU_QUOTES[Math.floor(Math.random()*STATPAGLU_QUOTES.length)]); },[]);\n  return <div className="voice-line" aria-label="Genshin Impact voice line"><blockquote>{quote[0]}</blockquote><cite>{quote[1]}</cite></div>;\n}\n\nfunction OstPlayer() {
  const [ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[title,setTitle]=useState('GENSHIN OST');
  const playerRef=useRef<any>(null);
  const playlists=['PLdni05PnuscvEM17RtWoy1jraPhumpdjV','PLEtIOnOw_h3G1OmRFImKCN4Q7giTtU9Pu','PL6vhLV1hjE9FYKq2enry6ACfXeyuatAi_','PL6vhLV1hjE9ErikEhF5JxU8eEu2oSMVWG','OLAK5uy_mh7Qj9RzVthPsrRo2w8ouE-xmQHXLGzqs','OLAK5uy_nH3djc02OBm-qDh2ITZcoWxNOkbT2mfmw','OLAK5uy_lf8ZuhoICESI_ZXxd8eWu5tkIegnQG6Jo'];
  const blocked=/rex incognito|stellar moments|character (demo|teaser|theme)|collected miscellany|character ost/i;
  useEffect(()=>{let cancelled=false;const init=()=>{if(cancelled||playerRef.current||!(window as any).YT)return;playerRef.current=new (window as any).YT.Player('ostYoutube',{width:'1',height:'1',playerVars:{autoplay:0,controls:0,rel:0,playsinline:1},events:{onReady:()=>{if(cancelled)return;setReady(true);const list=playlists[Math.floor(Math.random()*playlists.length)];playerRef.current.loadPlaylist({listType:'playlist',list});playerRef.current.setShuffle(true)},onStateChange:(e:any)=>{const YT=(window as any).YT;if(e.data===YT.PlayerState.PLAYING){let nextTitle='GENSHIN OST';try{nextTitle=e.target.getVideoData().title||nextTitle}catch{}if(blocked.test(nextTitle)){e.target.nextVideo();return}setPlaying(true);setTitle(nextTitle)}else if(e.data===YT.PlayerState.PAUSED)setPlaying(false);else if(e.data===YT.PlayerState.ENDED)e.target.nextVideo()}}})};if((window as any).YT?.Player)init();else{const existing=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');if(!existing){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.async=true;document.head.appendChild(s)}const previous=(window as any).onYouTubeIframeAPIReady;(window as any).onYouTubeIframeAPIReady=()=>{previous?.();init()}}return()=>{cancelled=true;try{playerRef.current?.destroy()}catch{}playerRef.current=null}},[]);
  const toggle=()=>{if(!playerRef.current||!ready)return;const YT=(window as any).YT;if(playerRef.current.getPlayerState()===YT.PlayerState.PLAYING)playerRef.current.pauseVideo();else playerRef.current.playVideo()};
  return <section className="ost-player" aria-label="Genshin Impact OST player"><div className="ost-copy"><span className="eyebrow">TEYVAT RADIO</span><strong>{title}</strong><small>{playing?'NOW PLAYING · HOYO-MIX':'PRESS PLAY · HOYO-MIX'}</small></div><div className="ost-controls"><button type="button" aria-label="Previous track" onClick={()=>playerRef.current?.previousVideo()}>‹</button><button type="button" aria-label="Play or pause" onClick={toggle}>{playing?'Ⅱ':'▶'}</button><button type="button" aria-label="Next track" onClick={()=>playerRef.current?.nextVideo()}>›</button></div><div className="ost-video" aria-hidden="true"><div id="ostYoutube"/></div></section>;
}

type AdvisorProfile = {
  archetype: string; summary: string; sets: string[]; sands: string; goblet: string; circlet: string;
  substats: string[]; targets: Array<{ label: string; target: string }>; weapons: string[];
  teams: Array<{ name: string; members: string[]; why: string }>; talentPriority: string;
};

const BUILD_ADVISOR: Record<string, AdvisorProfile> = {
  Ayaka: {
    archetype: 'Cryo Burst DPS / Freeze',
    summary: 'Prioritize Burst uptime, CRIT consistency and ATK. Freeze teams can inflate effective CRIT Rate, so do not blindly chase 70%+ sheet CRIT.',
    sets: ['4pc Blizzard Strayer', '4pc Marechaussee Hunter with Furina + healer', '2pc Cryo / ATK / ER mix'],
    sands: 'ATK%', goblet: 'Cryo DMG Bonus > ATK%', circlet: 'CRIT Rate or CRIT DMG',
    substats: ['ER until rotation target', 'CRIT', 'ATK%', 'Flat ATK'],
    targets: [{label:'ER',target:'≈130–150% in common 2-Cryo teams'}, {label:'CRIT',target:'Balance around team/set bonuses'}, {label:'ATK',target:'Stack after ER / CRIT needs'}],
    weapons: ['Mistsplitter Reforged', 'Azurelight', 'Absolution', 'Uraku Misugiri', 'Finale of the Deep', 'Amenoma Kageuchi'],
    teams: [
      {name:'Freeze core',members:['Ayaka','Hydro','Cryo / Support','Anemo / Flex'],why:'Hydro enables Freeze; Cryo improves energy and buffs; Anemo grouping helps Ayaka Burst connect.'},
      {name:'Furina Freeze',members:['Ayaka','Furina','Escoffier','Shenhe / Rosaria'],why:'Furina supplies DMG Bonus while a healer enables her Fanfare and can make Marechaussee Hunter practical.'}
    ],
    talentPriority: 'Normal Attack ≥ Burst > Skill'
  },
  Neuvillette: {
    archetype: 'Hydro Charged Attack DPS',
    summary: 'HP scaling makes HP% unusually valuable. Meet Burst/rotation ER needs, then balance CRIT and HP; Hydro or HP Goblet can both be valid.',
    sets: ['4pc Marechaussee Hunter', '4pc Heart of Depth', '2pc HP / Hydro mix'],
    sands: 'HP%', goblet: 'Hydro DMG Bonus or HP%', circlet: 'CRIT Rate / CRIT DMG / HP%',
    substats: ['ER until rotation target', 'CRIT', 'HP%', 'Flat HP'],
    targets: [{label:'ER',target:'Common solo Hydro ≈115–135%; lower with Hydro/Fav support'}, {label:'CRIT',target:'Prioritize balanced CRIT'}, {label:'HP',target:'High HP after ER / CRIT needs'}],
    weapons: ['Tome of the Eternal Flow', 'Sacrificial Jade', 'Surf’s Up', 'Nocturne’s Curtain Call', 'Lost Prayer to the Sacred Winds', 'Ash-Graven Drinking Horn'],
    teams: [
      {name:'Hypercarry',members:['Neuvillette','Furina','Kazuha / Xilonen','Defensive / Offensive Flex'],why:'Buffs Neuvillette while preserving field time and Hydro uptime.'},
      {name:'Reaction shell',members:['Neuvillette','Xiangling','Xilonen','Kazuha / Sucrose'],why:'Multiple elements help his A1 while Pyro and RES shred add reaction and personal damage.'}
    ],
    talentPriority: 'Normal Attack ≫ Skill / Burst'
  }
};

function statNumber(c: Character, label: string) {
  const s=c.stats.find(x=>x.label.toLowerCase()===label.toLowerCase());
  return s ? num(s.rawValue ?? String(s.value).replace(/[^0-9.+-]/g,'')) : 0;
}
function findAdvisor(c: Character): AdvisorProfile {
  if(BUILD_ADVISOR[c.name]) return BUILD_ADVISOR[c.name];
  const cryo=c.stats.some(s=>s.label.includes('Cryo DMG'));
  const hydro=c.stats.some(s=>s.label.includes('Hydro DMG'));
  if(cryo) return BUILD_ADVISOR.Ayaka;
  if(hydro) return BUILD_ADVISOR.Neuvillette;
  return {
    archetype:'Flexible DPS / Support',
    summary:'Use the role-aware defaults as a starting point. Exact recommendations should be refined from the character kit, constellations and rotation.',
    sets:['Character-specific 4pc set','2pc + 2pc stat-efficient mix'],
    sands:'Match the character’s scaling',goblet:'Elemental DMG Bonus or scaling stat',circlet:'CRIT / healing / scaling stat as appropriate',
    substats:['ER until rotation target','CRIT','Relevant scaling stat','ATK% / HP% / DEF% as applicable'],
    targets:[{label:'ER',target:'Enough to Burst every planned rotation'},{label:'CRIT',target:'Balance CRIT Rate and CRIT DMG'},{label:'Main',target:'Prioritize the stat that scales the kit'}],
    weapons:c.weapon?[c.weapon.name,'Signature / strongest 5★ option','Best craftable / F2P option','Favonius or utility alternative']:['Signature / strongest 5★ option','Best craftable / F2P option','Favonius or utility alternative'],
    teams:[{name:'Role shell',members:[c.name,'Buffer','Off-field DPS / Enabler','Defensive / Utility'],why:'Build around field-time, energy economy and reaction/elemental requirements.'}],
    talentPriority:'Prioritize the talent that contributes most to the character’s main damage or utility.'
  };
}
function evaluateAdvisor(c: Character, a: AdvisorProfile) {
  const er=statNumber(c,'Energy Recharge'),cr=statNumber(c,'CRIT Rate'),cd=statNumber(c,'CRIT DMG');
  const findings:string[]=[];
  if(c.level<90) findings.push('Character is below Lv. 90; finishing levels may be a cleaner upgrade than tiny artifact gains.');
  if(c.weapon && c.weapon.level<90) findings.push('Weapon is below Lv. 90; finish weapon leveling before chasing tiny artifact upgrades.');
  if(c.talents?.[0] && c.talents[0].level<9) findings.push('Normal Attack is below Lv. 9; verify whether it drives the character’s main damage.');
  if(c.talents?.[1] && c.talents[1].level<9 && /Skill/.test(a.talentPriority)) findings.push('Elemental Skill is below Lv. 9 within the current talent plan.');
  if(c.talents?.[2] && c.talents[2].level<9 && /Burst/.test(a.talentPriority)) findings.push('Elemental Burst is below Lv. 9 within the current talent plan.');
  if(er) findings.push('Current ER is '+er.toFixed(1)+'%; compare it to the team rotation target rather than a universal number.');
  if(cr && cd) findings.push('Current CRIT is '+cr.toFixed(1)+' / '+cd.toFixed(1)+'; improve the weaker side of the ratio instead of tunnel-visioning one stat.');
  if(!findings.length) findings.push('No obvious low-hanging upgrade is visible from the available showcase data.');
  return findings;
}
function AdvisorSection({character:c}:{character:Character}) {
  const a=findAdvisor(c), findings=evaluateAdvisor(c,a);
  return <section className="advisor-section">
    <div className="advisor-kicker"><span className="eyebrow">BUILD & TEAM ADVISOR</span><span className="advisor-archetype">{a.archetype}</span></div>
    <p className="advisor-summary">{a.summary}</p>
    <div className="advisor-tabs-grid">
      <div className="advisor-card"><span className="advisor-label">TARGET STATS</span>{a.targets.map(x=><div className="advisor-row" key={x.label}><b>{x.label}</b><span>{x.target}</span></div>)}</div>
      <div className="advisor-card"><span className="advisor-label">ARTIFACTS</span><div className="advisor-mainstats"><b>Sands <span>{a.sands}</span></b><b>Goblet <span>{a.goblet}</span></b><b>Circlet <span>{a.circlet}</span></b></div><p className="advisor-subline">{a.substats.join(' → ')}</p><div className="advisor-chipline">{a.sets.map(x=><span key={x}>{x}</span>)}</div></div>
      <div className="advisor-card"><span className="advisor-label">WEAPONS</span><div className="advisor-chipline">{a.weapons.map((x,i)=><span key={x} className={i===0?'advisor-chip-emphasis':''}>{x}</span>)}</div></div>
      <div className="advisor-card"><span className="advisor-label">TALENT PLAN</span><p className="advisor-talent">{a.talentPriority}</p><span className="advisor-label advisor-label-gap">CURRENT BUILD CHECK</span><div className="advisor-findings">{findings.map((x,i)=><p key={i}>↳ {x}</p>)}</div></div>
    </div>
    <div className="advisor-card advisor-team-card"><span className="advisor-label">TEAM COMPS</span><div className="advisor-teams">{a.teams.map(team=><div className="advisor-team" key={team.name}><div className="advisor-team-members">{team.members.map(m=><span key={m}>{m}</span>)}</div><b>{team.name}</b><p>{team.why}</p></div>)}</div></div>
    <p className="advisor-source">Reference baseline: KQM character guides and rotation theory; exact recommendations vary with constellations, weapons, teammates and enemy content.</p>
  </section>;
}

function DetailModal({ character: c, onClose }: { character: Character; onClose: () => void }) {
  const bd = c.breakdown || {};
  const weapon = bd.weapon || c.weapon;
  const artifactRows = Object.entries(bd.artifacts || {}).map(([key,value])=>({key,value}));
  return <div className="modal" onMouseDown={e=>{if(e.currentTarget===e.target) onClose()}}>
    <div className="modal-content">
      <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>
      <p className="eyebrow">FULL BUILD BREAKDOWN</p>
      <h2 className="detail-title">{c.name}</h2>
      <AdvisorSection character={c}/>
      <p className="detail-sub">Level {c.level} · C{c.constellation} · {c.weapon ? `${c.weapon.rarity}★ ${c.weapon.name} R${c.weapon.refinement}` : 'No weapon data'}</p>
      <section className="detail-section"><p className="detail-heading">WEAPON</p><div className="breakdown-grid">
        <Breakdown label="BASE ATK" value={numberText(weapon?.baseAttack)} note="Weapon base attack" wide/>
        {(weapon?.stats || []).filter(x=>x.key!=='FIGHT_PROP_BASE_ATTACK').map((x,i)=><Breakdown key={i} label={x.label} value={x.percent?percentText(x.value):numberText(x.value)} note="Weapon secondary"/>)}
      </div></section>
      <section className="detail-section"><p className="detail-heading">FINAL STATS</p><div className="detail-grid">{c.stats.map(s=><div className="detail-stat" key={s.label}><span>{s.label}</span><b>{s.value}</b></div>)}</div></section>
      <section className="detail-section"><p className="detail-heading">BUILD CONTRIBUTION</p><div className="breakdown-grid">
        <Breakdown label="CHARACTER BASE HP" value={numberText(bd.baseCharacter?.HP)} note="Before equipment"/>
        <Breakdown label="CHARACTER BASE ATK" value={numberText(bd.baseCharacter?.ATK)} note="Character only"/>
        <Breakdown label="WEAPON BASE ATK" value={numberText(weapon?.baseAttack)} note="Weapon base attack"/>
        <Breakdown label="CHARACTER BASE DEF" value={numberText(bd.baseCharacter?.DEF)} note="Before equipment"/>
        <Breakdown label="EQUIPMENT BONUS ATK" value={`+${numberText(bd.bonus?.ATK)}`} note="Final minus base ATK"/>
        <Breakdown label="EQUIPMENT BONUS HP" value={`+${numberText(bd.bonus?.HP)}`} note="Final minus base HP"/>
        <Breakdown label="EQUIPMENT BONUS DEF" value={`+${numberText(bd.bonus?.DEF)}`} note="Final minus base DEF"/>
        <div className="breakdown-box wide"><span>ARTIFACT CONTRIBUTIONS</span><div className="artifact-contribution-grid">{artifactRows.length ? artifactRows.map(({key,value})=><div className="detail-stat" key={key}><span>{key.replace(/^FIGHT_PROP_/,'').replace(/_/g,' ')}</span><b>{renderBreakdownStat(key,value)}</b></div>) : <span className="detail-empty">No artifact contribution data available.</span>}</div></div>
      </div></section>
      <section className="detail-section"><p className="detail-heading">TALENTS</p><div className="detail-grid">{c.talents.slice(0,3).map((t,i)=><div className="detail-stat" key={i}><span>{['Normal Attack','Elemental Skill','Elemental Burst'][i]}</span><b>Lv. {t.level}</b></div>)}</div></section>
      <section className="detail-section"><p className="detail-heading">ARTIFACT BREAKDOWN</p><div className="detail-artifacts">{c.artifacts.map(a=><div className="artifact-detail-card" key={`${a.name}-${a.slot}`}>
        <div className="artifact-head">{a.icon&&<img className="artifact-img" src={a.icon} alt=""/>}<div><b>{a.name}</b><span>{a.setName} · {a.slot} · +{a.level}</span></div></div>
        <div className="artifact-main"><span>{a.mainStat.label}</span><b>{a.mainStat.value}</b></div>
        <div className="artifact-cv"><span>CRIT VALUE</span><b>{artifactCV(a).toFixed(1)}</b></div>
        <div className="artifact-subs">{a.substats.map((sub,i)=><div key={i}><span>{sub.label}</span><b>{sub.value}</b></div>)}</div>
      </div>)}</div></section>
    </div>
  </div>;
}
function SupportPanel() {
  const upiId = 'sahilyadav3616.1@oksbi';
  const copyUpi = async () => {
    try { await navigator.clipboard.writeText(upiId); alert('UPI ID copied. Open your payment app and paste it.'); }
    catch { alert('Copy failed. UPI ID: ' + upiId); }
  };
  return <section className="support-panel">
    <span className="eyebrow">SUPPORT THE PROJECT</span>
    <p>If StatPaglu helped you, you can support development.</p>
    <div className="upi-id">UPI: <b>{upiId}</b></div>
    <div className="upi-actions">
      <a className="upi-button" href="upi://pay?pa=sahilyadav3616.1%40oksbi&pn=Genshin%20StatPaglu&cu=INR">♡ OPEN UPI APP</a>
      <button className="upi-copy" type="button" onClick={copyUpi}>COPY UPI ID</button>
    </div>
    <small className="upi-fallback">If the UPI app does not open, copy the UPI ID and pay from your preferred app.</small>
  </section>;
}
function Breakdown({label,value,note,wide=false}:{label:string;value:string;note:string;wide?:boolean}) {
  return <div className={`breakdown-box${wide?' wide':''}`}><span>{label}</span><b>{value}</b><small>{note}</small></div>;
}