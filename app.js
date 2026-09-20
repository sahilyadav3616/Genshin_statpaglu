const API = location.protocol === 'file:' ? null : '/api/profile/';
const accents = ['#a88cff','#76d9ff','#e987ff','#f6b36a','#6bdcc5','#ffd76e'];
const priorityLabels = ['CRIT Rate','CRIT DMG','ATK','Elemental Mastery','Energy Recharge','HP','DEF'];
const regionByPrefix = {'1':'CN','2':'CN','3':'CN','5':'CN','6':'NA','7':'EU','8':'ASIA','9':'TW / HK / MO'};
let currentCharacters = [];

const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const num = value => Number(value || 0);
const numberText = value => num(value).toLocaleString(undefined,{maximumFractionDigits:1});
// Enka flat equipment stats are already percentage points: 13.2 -> 13.2%.
const percentText = value => `${num(value).toFixed(1)}%`;

function setStatus(text,live=true){
  const node=document.querySelector('#dataStatus');
  node.innerHTML=`<b></b> ${escapeHTML(text)}`;
  node.querySelector('b').style.background=live?'#6effaa':'#ffd66e';
  node.querySelector('b').style.boxShadow=live?'0 0 10px #6effaa':'0 0 10px #ffd66e';
}
function updateProfile(data){
  const p=data.playerInfo||{};
  document.querySelector('#nickname').textContent=p.nickname||'Unknown Traveler';
  document.querySelector('.profile-mark').textContent=(p.nickname||'?')[0].toUpperCase();
  document.querySelector('#ar').textContent=`AR ${p.level||'—'}`;
  document.querySelector('#wl').textContent=`WL ${p.worldLevel||'—'}`;
  document.querySelector('#abyss').textContent=p.abyss||'—';
  document.querySelector('#region').textContent=regionByPrefix[String(data.uid)[0]]||'UNKNOWN';
  document.querySelector('#uidText').textContent=data.uid;
  document.querySelector('#count').textContent=`${data.characters?.length||0} builds`;
  document.querySelector('#sourceLink').href=`https://enka.network/u/${data.uid}/`;
}
function topStats(stats){
  const picked = priorityLabels.map(label=>stats.find(s=>s.label===label)).filter(Boolean).slice(0,4);
  return picked.length ? picked : stats.slice(0,4);
}
function statHTML(stats){
  return topStats(stats).map(s=>`<div class="stat"><span>${escapeHTML(s.label.toUpperCase())}</span><b>${escapeHTML(s.value)}</b></div>`).join('');
}
function artifactCV(a){
  const subs = a.substats || [];
  let cr = 0, cd = 0;
  subs.forEach(sub => {
    const label = String(sub.label || '').toLowerCase();
    const value = Number(sub.rawValue ?? String(sub.value || '').replace('%','')) || 0;
    if (label.includes('crit rate')) cr += value;
    if (label.includes('crit dmg') || label.includes('crit damage')) cd += value;
  });
  return cr * 2 + cd;
}
function renderBreakdownStat(key,value){
  const percentageKeys = new Set(['FIGHT_PROP_HP_PERCENT','FIGHT_PROP_ATTACK_PERCENT','FIGHT_PROP_DEFENSE_PERCENT','FIGHT_PROP_CRITICAL','FIGHT_PROP_CRITICAL_HURT','FIGHT_PROP_CHARGE_EFFICIENCY','FIGHT_PROP_HEAL_ADD','FIGHT_PROP_FIRE_ADD_HURT','FIGHT_PROP_ELEC_ADD_HURT','FIGHT_PROP_WATER_ADD_HURT','FIGHT_PROP_GRASS_ADD_HURT','FIGHT_PROP_WIND_ADD_HURT','FIGHT_PROP_ROCK_ADD_HURT','FIGHT_PROP_ICE_ADD_HURT','FIGHT_PROP_PHYSICAL_ADD_HURT']);
  return percentageKeys.has(key) ? percentText(value) : numberText(value);
}
function openDetail(index){
  const c = currentCharacters[index]; if(!c) return;
  const modal = document.querySelector('#detailModal');
  modal.querySelector('.detail-title').textContent = c.name;
  modal.querySelector('.detail-sub').textContent = `Level ${c.level}  ·  C${c.constellation}  ·  ${c.weapon?`${c.weapon.rarity}★ ${c.weapon.name} R${c.weapon.refinement}`:'No weapon data'}`;
  modal.querySelector('.detail-stats').innerHTML = c.stats.length ? c.stats.map(s=>`<div class="detail-stat"><span>${escapeHTML(s.label)}</span><b>${escapeHTML(s.value)}</b></div>`).join('') : '<p class="detail-empty">No stat data available.</p>';
  const bd = c.breakdown || {};
  const weaponStats = (bd.weapon?.stats||[]).filter(x=>x.key !== 'FIGHT_PROP_BASE_ATTACK');
  modal.querySelector('.detail-weapon').innerHTML = bd.weapon ? `<div class="breakdown-grid"><div class="breakdown-box wide"><span>BASE ATK</span><b>${numberText(bd.weapon.baseAttack)}</b><small>Weapon base attack</small></div>${weaponStats.length ? weaponStats.map(x=>`<div class="breakdown-box"><span>${escapeHTML(x.label)}</span><b>${x.percent?percentText(x.value):numberText(x.value)}</b><small>Weapon secondary</small></div>`).join('') : '<div class="breakdown-box"><span>SECONDARY</span><b>—</b><small>No weapon secondary stat exposed</small></div>'}</div>` : '<p class="detail-empty">No weapon stat data available.</p>';
  const artifactRows = Object.entries(bd.artifacts||{}).map(([key,value])=>{const label=key.replace(/^FIGHT_PROP_/,'').replace(/_/g,' ');return `<div class="detail-stat"><span>${escapeHTML(label)}</span><b>${renderBreakdownStat(key,value)}</b></div>`;}).join('');
  const base=bd.baseCharacter||{}, bonus=bd.bonus||{};
  modal.querySelector('.artifact-summary').innerHTML=`<div class="breakdown-grid"><div class="breakdown-box"><span>CHARACTER BASE HP</span><b>${numberText(base.HP)}</b><small>Before equipment bonuses</small></div><div class="breakdown-box"><span>CHARACTER BASE ATK</span><b>${numberText(base.ATK)}</b><small>Character only, before weapon/artifacts</small></div><div class="breakdown-box"><span>WEAPON BASE ATK</span><b>${numberText(bd.weapon?.baseAttack)}</b><small>Weapon base attack</small></div><div class="breakdown-box"><span>CHARACTER BASE DEF</span><b>${numberText(base.DEF)}</b><small>Before equipment bonuses</small></div><div class="breakdown-box"><span>EQUIPMENT BONUS ATK</span><b>+${numberText(bonus.ATK)}</b><small>Final ATK − character + weapon base</small></div><div class="breakdown-box"><span>EQUIPMENT BONUS HP</span><b>+${numberText(bonus.HP)}</b><small>Final HP − character base</small></div><div class="breakdown-box"><span>EQUIPMENT BONUS DEF</span><b>+${numberText(bonus.DEF)}</b><small>Final DEF − character base</small></div><div class="breakdown-box wide"><span>ARTIFACT CONTRIBUTIONS</span><div class="artifact-contribution-grid">${artifactRows || '<span class="detail-empty">No artifact contribution data available.</span>'}</div></div></div>`;
  modal.querySelector('.detail-talents').innerHTML = c.talents.length ? c.talents.slice(0,3).map((t,i)=>`<div class="detail-stat"><span>${['Normal Attack','Elemental Skill','Elemental Burst'][i]}</span><b>Lv. ${t.level}</b></div>`).join('') : '<p class="detail-empty">No talent data available.</p>';
  modal.querySelector('.detail-artifacts').innerHTML = c.artifacts.length ? c.artifacts.map(a => `<div class="artifact-detail-card"><div class="artifact-head">${a.icon ? `<img class="artifact-img" src="${escapeHTML(a.icon)}" alt="" loading="lazy" />` : ''}<div><b>${escapeHTML(a.name)}</b><span>${escapeHTML(a.setName)} · ${escapeHTML(a.slot)} · +${a.level}</span></div></div><div class="artifact-main"><span>${escapeHTML(a.mainStat.label)}</span><b>${escapeHTML(a.mainStat.value)}</b></div><div class="artifact-cv"><span>CRIT VALUE</span><b>${artifactCV(a).toFixed(1)}</b></div><div class="artifact-subs">${a.substats?.length ? a.substats.map(sub=>`<div><span>${escapeHTML(sub.label)}</span><b>${escapeHTML(sub.value)}</b></div>`).join('') : '<span class="detail-empty">No substats supplied</span>'}</div></div>`).join('') : '<p class="detail-empty">No artifact data available.</p>';
  modal.classList.remove('hidden');
}
function closeDetail(){document.querySelector('#detailModal').classList.add('hidden')}
function render(data){currentCharacters=data.characters||[];document.querySelector('#filterInput').value='';renderRoster('')}
function renderRoster(filterText){
  const roster=document.querySelector('#roster'); roster.innerHTML='';
  const tpl=document.querySelector('#cardTemplate'); const needle=filterText.trim().toLowerCase();
  const filtered=currentCharacters.map((c,i)=>({c,i})).filter(({c})=>!needle||c.name.toLowerCase().includes(needle));
  if(!filtered.length){roster.innerHTML=`<div class="loading">NO CHARACTERS MATCH “${escapeHTML(filterText.toUpperCase())}”</div>`;return}
  filtered.forEach(({c,i},pos)=>{
    const el=tpl.content.firstElementChild.cloneNode(true), artifacts=c.artifacts||[], talents=c.talents||[];
    el.style.setProperty('--accent',accents[pos%accents.length]); el.dataset.index=i;
    el.querySelector('.build-index').textContent=`BUILD ${String(pos+1).padStart(2,'0')}`;
    el.querySelector('.initial').textContent=c.name[0]||'?'; el.querySelector('h3').textContent=c.name;
    el.querySelector('.level').textContent=`LV. ${c.level}`; el.querySelector('.key-stats').innerHTML=statHTML(c.stats||[]);
    el.querySelector('.weapon b').textContent=c.weapon?`${c.weapon.name} • ${c.weapon.rarity}★`:'No weapon data';
    el.querySelector('.weapon small').textContent=c.weapon?`Level ${c.weapon.level}  ·  R${c.weapon.refinement}`:'—';
    const setCounts={}; artifacts.forEach(a=>{if(a.setName&&a.setName!=='Unknown Set')setCounts[a.setName]=(setCounts[a.setName]||0)+1});
    el.querySelector('.artifact b').textContent=Object.entries(setCounts).map(([name,count])=>`${name} ×${count}`).join(' · ')||(artifacts.length?`${artifacts.length} artifacts`:'No artifacts');
    el.querySelector('.artifact small').textContent=artifacts.length?`Avg +${Math.round(artifacts.reduce((sum,a)=>sum+a.level,0)/artifacts.length)}`:'—';
    el.querySelector('.talents').textContent=`${talents.length ? talents.slice(0,3).map((t,i)=>`${['Normal Attack','Elemental Skill','Elemental Burst'][i]} ${t.level}`).join(' · ') : 'No talent data'}`;
    el.querySelector('.constellations').textContent=`C${c.constellation||0}`;
    const imgEl=el.querySelector('.char-image');
    if(c.image){imgEl.src=c.image;imgEl.style.display='block';el.querySelector('.portrait').style.display='none'}else{imgEl.style.display='none';el.querySelector('.portrait').style.display='grid'}
    if(c.weapon?.icon){el.querySelector('.weapon-img').src=c.weapon.icon;el.querySelector('.weapon-img').style.display='block';el.querySelector('.weapon-icon').style.display='none'}else{el.querySelector('.weapon-img').style.display='none';el.querySelector('.weapon-icon').style.display='inline'}
    const artRow=el.querySelector('.artifact-icons-row'); if(artRow)artRow.innerHTML=artifacts.map(a=>a.icon?`<img src="${escapeHTML(a.icon)}" class="mini-art-icon" alt="" />`:'').join('');
    el.addEventListener('click',()=>openDetail(i)); roster.appendChild(el);
  });
}
async function load(uid){
  const roster=document.querySelector('#roster');
  if(!API){if(uid==='863353806'&&window.profileCache){setStatus('SNAPSHOT MODE',false);updateProfile(window.profileCache);render(window.profileCache);return}setStatus('LOCAL PREVIEW',false);roster.innerHTML='<div class="loading">LIVE LOOKUPS NEED THE LOCAL SERVER<br><small style="font:10px Outfit;color:#777;letter-spacing:0">Run <b>npm install</b>, then <b>node server.js</b>, then open http://localhost:4173.</small></div>';return}
  roster.innerHTML='<div class="loading">CONTACTING ENKA ARCHIVE<span></span></div>';
  try{const res=await fetch(API+uid);const data=await res.json();if(!res.ok)throw new Error(data.error||'Profile is unavailable');if(!data.characters?.length)throw new Error('No public characters found');setStatus('ENKA LIVE DATA');updateProfile(data);render(data)}
  catch(err){setStatus('UPDATE UNAVAILABLE',false);roster.innerHTML=`<div class="loading">${escapeHTML(err.message.toUpperCase())}<br><small style="font:10px Outfit;color:#777;letter-spacing:0">Make sure the UID is valid and characters are set to public.</small></div>`}
}
document.querySelector('#uidForm').addEventListener('submit',e=>{e.preventDefault();const uid=document.querySelector('#uidInput').value.replace(/\D/g,'');if(uid.length<8)return;load(uid)});
document.querySelector('#reload').addEventListener('click',()=>{const uid=document.querySelector('#uidInput').value.replace(/\D/g,'');if(uid.length<8)return;load(uid)});
document.querySelector('#filterInput').addEventListener('input',e=>renderRoster(e.target.value));
document.querySelector('#detailModal').addEventListener('click',e=>{if(e.target.id==='detailModal'||e.target.closest('.detail-close'))closeDetail()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail()});
// Do not load a profile automatically; the UID field starts empty.
/* Teyvat Radio — public YouTube embeds, no account required. */
const OST_PLAYLISTS=['PLdni05PnuscvEM17RtWoy1jraPhumpdjV','PLEtIOnOw_h3G1OmRFImKCN4Q7giTtU9Pu','PL6vhLV1hjE9FYKq2enry6ACfXeyuatAi_','PL6vhLV1hjE9ErikEhF5JxU8eEu2oSMVWG','OLAK5uy_mh7Qj9RzVthPsrRo2w8ouE-xmQHXLGzqs','OLAK5uy_nH3djc02OBm-qDh2ITZcoWxNOkbT2mfmw','OLAK5uy_lf8ZuhoICESI_ZXxd8eWu5tkIegnQG6Jo'];
const OST_BLOCKED=/rex incognito|stellar moments|character (demo|teaser|theme)|collected miscellany|character ost/i;
let ostPlayer=null,ostReady=false;
function isBlockedOstTitle(title){return OST_BLOCKED.test(String(title||''))}
function setOstStatus(title,playing){const t=document.querySelector('#ostTitle'),s=document.querySelector('#ostStatus'),p=document.querySelector('#ostPlay');if(t)t.textContent=title||'GENSHIN OST';if(s)s.textContent=playing?'NOW PLAYING · HOYO-MIX':'PAUSED · HOYO-MIX';if(p)p.textContent=playing?'Ⅱ':'▶';}
function loadRandomOstPlaylist(){if(!ostPlayer||!ostReady)return;const list=OST_PLAYLISTS[Math.floor(Math.random()*OST_PLAYLISTS.length)];ostPlayer.loadPlaylist({listType:'playlist',list});ostPlayer.setShuffle(true);}
function initOstPlayer(){if(ostPlayer||!window.YT||!YT.Player)return;ostPlayer=new YT.Player('ostYoutube',{width:'1',height:'1',playerVars:{autoplay:0,controls:0,rel:0,playsinline:1},events:{onReady:()=>{ostReady=true;loadRandomOstPlaylist();setOstStatus('GENSHIN OST',false);},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){let title='GENSHIN OST';try{title=e.target.getVideoData().title||title}catch(_){}if(isBlockedOstTitle(title)){e.target.nextVideo();return}setOstStatus(title,true);}else if(e.data===YT.PlayerState.PAUSED)setOstStatus(document.querySelector('#ostTitle')?.textContent,false);else if(e.data===YT.PlayerState.ENDED)e.target.nextVideo();}}});}
window.onYouTubeIframeAPIReady=initOstPlayer;
const ytScript=document.createElement('script');ytScript.src='https://www.youtube.com/iframe_api';ytScript.async=true;document.head.appendChild(ytScript);
document.querySelector('#ostPlay')?.addEventListener('click',()=>{if(!ostPlayer||!ostReady)return;if(ostPlayer.getPlayerState()===YT.PlayerState.PLAYING)ostPlayer.pauseVideo();else ostPlayer.playVideo();});
document.querySelector('#ostPrev')?.addEventListener('click',()=>{if(ostPlayer&&ostReady)ostPlayer.previousVideo();});
document.querySelector('#ostNext')?.addEventListener('click',()=>{if(ostPlayer&&ostReady)ostPlayer.nextVideo();});


(function initAyakaSnow(){const f=document.querySelector('#frostField');if(!f)return;f.innerHTML='';[[10,18],[89,17],[7,48],[93,50],[15,82],[85,84],[49,9],[51,91],[25,35],[76,64],[32,73],[68,29],[18,60],[83,36]].forEach(([x,y],i)=>{const s=document.createElement('span');s.className='frost-snowflake';s.style.left=x+'%';s.style.top=y+'%';s.style.setProperty('--dur',(8+(i%4)*1.7)+'s');s.style.setProperty('--delay',(-i*.9)+'s');s.innerHTML='<span class="arm"></span><i></i>';f.appendChild(s)})})();
(function initTheme(){const b=document.querySelector('#themeToggle');if(!b)return;if(localStorage.getItem('statpaglu-theme')==='light')document.body.classList.add('light-mode');const sync=()=>{const light=document.body.classList.contains('light-mode');b.innerHTML=light?'☀ <span>LIGHT</span>':'☾ <span>DARK</span>';b.setAttribute('aria-pressed',String(light));b.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode')};sync();b.onclick=()=>{document.body.classList.toggle('light-mode');localStorage.setItem('statpaglu-theme',document.body.classList.contains('light-mode')?'light':'dark');sync()}})();
// StatPaglu reference profile: load the owner's public showcase by default.
window.addEventListener('load',()=>load('863353806'));
