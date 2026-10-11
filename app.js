const API = location.protocol === 'file:' ? null : '/api/profile/';
const accents = ['#a88cff','#76d9ff','#e987ff','#f6b36a','#6bdcc5','#ffd76e'];
const elementAccents = {
  anemo: '#7ce5bd', geo: '#f2c66d', electro: '#c5a2ff',
  dendro: '#a8df78', hydro: '#76cfff', pyro: '#ff987c', cryo: '#a5e7f2'
};
function characterElement(character) {
  const raw = character.element ?? character.elementType ?? character.vision?.element ?? character.vision ?? '';
  const value = typeof raw === 'object' ? (raw.name ?? raw.type ?? raw.element ?? '') : raw;
  const key = String(value).toLowerCase().trim();
  const aliases = {
    anemo: ['anemo','wind'], geo: ['geo','earth'], electro: ['electro','electric'],
    dendro: ['dendro','grass'], hydro: ['hydro','water'], pyro: ['pyro','fire'], cryo: ['cryo','ice']
  };
  return Object.keys(aliases).find(element => aliases[element].some(alias => key === alias || key.includes(alias))) || '';
}
const UPI_ID = 'sahilyadav3616.1@oksbi';
function initUpiSupport(){
  const copyButton=document.querySelector('[data-copy-upi]');
  const status=document.querySelector('#upiFallback');
  if(!copyButton) return;
  copyButton.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(UPI_ID);
      copyButton.textContent='COPIED ✓';
      if(status) status.textContent='UPI ID copied. Open your payment app and paste it.';
      setTimeout(()=>{copyButton.textContent='COPY UPI ID'; if(status) status.textContent='If the UPI app does not open, copy the UPI ID and pay from your preferred app.'},2200);
    }catch{
      if(status) status.textContent='Copy failed. Use this UPI ID manually: '+UPI_ID;
    }
  });
}

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
  const element = characterElement(c);
  modal.dataset.element = element || 'unknown';
  modal.dataset.characterIndex = String(index);
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
function closeDetail(){const modal=document.querySelector('#detailModal');modal.classList.add('hidden');modal.dataset.characterIndex='';}
function buildCardColor(element){return ({anemo:'#72d7b3',geo:'#e6b95e',electro:'#b49aff',dendro:'#a4d86c',hydro:'#65c8f2',pyro:'#ff8b72',cryo:'#a2e5f2'})[element]||'#a99aff';}
function createBuildCard(index){
 const c=currentCharacters[index];if(!c)return null;
 const element=characterElement(c),accent=buildCardColor(element),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=680;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const bg=ctx.createLinearGradient(0,0,1200,680);bg.addColorStop(0,'#080d18');bg.addColorStop(.55,'#151c2c');bg.addColorStop(1,'#101b22');ctx.fillStyle=bg;ctx.fillRect(0,0,1200,680);
 // Layered elemental glow, geometric emblem and fine frame.
 const glow=ctx.createRadialGradient(1010,120,10,1010,120,410);glow.addColorStop(0,accent+'55');glow.addColorStop(1,accent+'00');ctx.fillStyle=glow;ctx.fillRect(560,0,640,500);
 ctx.save();ctx.translate(1030,126);ctx.rotate(Math.PI/4);ctx.strokeStyle=accent;ctx.globalAlpha=.2;ctx.lineWidth=3;ctx.strokeRect(-155,-155,310,310);ctx.strokeRect(-120,-120,240,240);ctx.restore();ctx.globalAlpha=1;
 ctx.strokeStyle=accent;ctx.globalAlpha=.65;ctx.lineWidth=2;ctx.strokeRect(28,28,1144,624);ctx.globalAlpha=1;
 ctx.fillStyle=accent;ctx.fillRect(52,53,5,54);ctx.font='600 19px monospace';ctx.fillText('GENSHIN STATPAGLU',72,70);ctx.fillStyle='#8995ab';ctx.font='500 13px monospace';ctx.fillText('/ CHARACTER BUILD CARD',72,94);
 ctx.fillStyle='#f5f7ff';ctx.font='800 62px Arial, sans-serif';ctx.fillText(String(c.name||'Unknown Character').slice(0,22),64,174);
 ctx.fillStyle=accent;ctx.font='700 18px Arial, sans-serif';ctx.fillText((element?element.toUpperCase()+' ELEMENT':'CHARACTER BUILD'),68,211);
 ctx.fillStyle='#aeb8ca';ctx.font='500 19px Arial, sans-serif';ctx.fillText('LEVEL '+Number(c.level||1)+'    ·    CONSTELLATION C'+Number(c.constellation||0),68,243);
 ctx.fillStyle=accent;ctx.globalAlpha=.8;ctx.fillRect(64,265,1072,2);ctx.globalAlpha=1;
 const stats=(c.stats||[]).filter(s=>['HP','ATK','DEF','Elemental Mastery','CRIT Rate','CRIT DMG','Energy Recharge'].includes(s.label));
 stats.slice(0,7).forEach((s,i)=>{
   const col=i%2,row=Math.floor(i/2),x=66+col*540,y=286+row*68,w=510,h=56;
   ctx.fillStyle='rgba(255,255,255,.055)';ctx.fillRect(x,y,w,h);ctx.fillStyle=accent;ctx.globalAlpha=.85;ctx.fillRect(x,y,3,h);ctx.globalAlpha=1;
   ctx.fillStyle='#9da9bd';ctx.font='600 14px Arial, sans-serif';ctx.fillText(String(s.label||'STAT').toUpperCase(),x+16,y+21);
   ctx.fillStyle='#f5f7ff';ctx.font='700 24px Arial, sans-serif';ctx.fillText(String(s.value||'—').slice(0,22),x+16,y+46);
 });
 const weapon=c.weapon?String(c.weapon.name||'Unknown weapon')+'  ·  '+Number(c.weapon.rarity||0)+'★  ·  R'+Number(c.weapon.refinement||1):'Weapon data unavailable';
 ctx.fillStyle=accent;ctx.font='700 13px monospace';ctx.fillText('WEAPON',68,535);ctx.fillStyle='#e6ebf5';ctx.font='600 17px Arial, sans-serif';ctx.fillText(weapon.slice(0,62),155,535);
 const sets={};(c.artifacts||[]).forEach(a=>{if(a.setName&&a.setName!=='Unknown Set')sets[a.setName]=(sets[a.setName]||0)+1;});
 const setLine=Object.entries(sets).map(([name,count])=>name+' ×'+count).join('  ·  ')||'Artifact set data unavailable';
 ctx.fillStyle=accent;ctx.font='700 13px monospace';ctx.fillText('ARTIFACTS',68,568);ctx.fillStyle='#b8c2d3';ctx.font='500 15px Arial, sans-serif';ctx.fillText(setLine.slice(0,90),155,568);
 ctx.fillStyle='#77849a';ctx.font='500 12px monospace';ctx.fillText('PUBLIC SHOWCASE SNAPSHOT  ·  STATPAGLU',68,615);
 return {canvas,character:c,filename:'statpaglu-'+String(c.name||'build').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.png'};
}
function downloadBuildCard(index){
 const card=createBuildCard(index);if(!card)return;
 card.canvas.toBlob(blob=>{if(blob)downloadBlob(blob,card.filename);else{const link=document.createElement('a');link.download=card.filename;link.href=card.canvas.toDataURL('image/png');link.click();}},'image/png');
}
function shareBuildCard(index){
 const card=createBuildCard(index);if(!card)return;
 card.canvas.toBlob(async blob=>{
   if(!blob){downloadBuildCard(index);return;}
   const file=new File([blob],card.filename,{type:'image/png'});
   if(navigator.share&&navigator.canShare?.({files:[file]})){
     try{await navigator.share({files:[file],title:card.character.name+' build',text:'Build card created with Genshin StatPaglu.'});}
     catch(err){if(err?.name!=='AbortError')downloadBlob(blob,card.filename);}
   }else downloadBlob(blob,card.filename);
 },'image/png');
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
const compareMetricLabels = ['HP','ATK','DEF','Elemental Mastery','CRIT Rate','CRIT DMG','Energy Recharge'];
function populateCompareOptions(){
  const a=document.querySelector('#compareA'), b=document.querySelector('#compareB');
  if(!a||!b)return;
  const previousA=a.value, previousB=b.value;
  const options=currentCharacters.map((c,i)=>'<option value="'+i+'">'+escapeHTML(c.name)+' · Lv. '+Number(c.level||1)+'</option>').join('');
  a.innerHTML=options||'<option value="">No showcased characters</option>';
  b.innerHTML=options||'<option value="">No showcased characters</option>';
  if(currentCharacters.length>1){
    a.value=currentCharacters.some((c,i)=>String(i)===previousA)?previousA:'0';
    b.value=currentCharacters.some((c,i)=>String(i)===previousB)?previousB:'1';
  }else if(currentCharacters.length){a.value='0';b.value='0';}
  renderComparison();
}
function findStat(character,label){
  return (character?.stats||[]).find(stat=>String(stat.label||'').toLowerCase()===label.toLowerCase())||null;
}
function comparisonNumber(stat){
  if(!stat)return 0;
  const value=Number(stat.rawValue);
  if(Number.isFinite(value))return value;
  return Number(String(stat.value||'').replace(/,/g,'').replace('%',''))||0;
}
function comparisonDeltaText(a,b,percent){
  const delta=b-a;
  if(percent)return (delta===0?'':delta>0?'+':'−')+Math.abs(delta*100).toFixed(1)+' pp';
  return (delta===0?'':delta>0?'+':'−')+Math.abs(delta).toLocaleString(undefined,{maximumFractionDigits:1});
}
function renderComparison(){
  const output=document.querySelector('#compareResults'), aSelect=document.querySelector('#compareA'), bSelect=document.querySelector('#compareB');
  if(!output||!aSelect||!bSelect)return;
  const a=currentCharacters[Number(aSelect.value)], b=currentCharacters[Number(bSelect.value)];
  if(!a||!b){output.innerHTML='<p class="compare-empty">Load a public UID to start comparing builds.</p>';return;}
  if(a===b){output.innerHTML='<p class="compare-empty">Choose two different characters to compare their builds.</p>';return;}
  const rows=compareMetricLabels.map(label=>{
    const sa=findStat(a,label), sb=findStat(b,label);
    if(!sa&&!sb)return '';
    const av=comparisonNumber(sa), bv=comparisonNumber(sb), max=Math.max(av,bv,1);
    const wa=Math.max(0,Math.min(100,av/max*100)), wb=Math.max(0,Math.min(100,bv/max*100));
    const delta=av===0?(bv===0?'—':'New stat'):((bv-av)/Math.abs(av)*100);
    const trend=av===bv?'even':bv>av?'up':'down';
    const deltaLabel=typeof delta==='number'?(delta===0?'EVEN':(delta>0?'+':'−')+Math.abs(delta).toFixed(1)+'%'):delta;
    return '<div class="compare-row"><div class="compare-row-head"><span>'+escapeHTML(label)+'</span><span class="compare-delta '+trend+'">'+escapeHTML(deltaLabel)+'</span></div><div class="compare-values"><b>'+escapeHTML(sa?.value||'—')+'</b><b>'+escapeHTML(sb?.value||'—')+'</b></div><div class="compare-bars"><div class="compare-track"><span class="compare-bar bar-a" style="--bar-width:'+wa+'%"></span></div><div class="compare-track"><span class="compare-bar bar-b" style="--bar-width:'+wb+'%"></span></div></div></div>';
  }).filter(Boolean).join('');
  output.innerHTML='<div class="compare-legend"><span class="legend-a"><i></i>'+escapeHTML(a.name)+'</span><span class="legend-b"><i></i>'+escapeHTML(b.name)+'</span></div><div class="compare-grid">'+(rows||'<p class="compare-empty">These characters do not have comparable stats in the current data.</p>')+'</div>';
  requestAnimationFrame(()=>output.querySelectorAll('.compare-bar').forEach(bar=>bar.classList.add('is-visible')));
}
function render(data){currentCharacters=data.characters||[];document.querySelector('#filterInput').value='';populateCompareOptions();renderRoster('')}
function renderRoster(filterText){
  const roster=document.querySelector('#roster'); roster.innerHTML='';
  const tpl=document.querySelector('#cardTemplate'); const needle=filterText.trim().toLowerCase();
  const filtered=currentCharacters.map((c,i)=>({c,i})).filter(({c})=>!needle||c.name.toLowerCase().includes(needle));
  if(!filtered.length){roster.innerHTML=`<div class="loading">NO CHARACTERS MATCH “${escapeHTML(filterText.toUpperCase())}”</div>`;return}
  filtered.forEach(({c,i},pos)=>{
    const el=tpl.content.firstElementChild.cloneNode(true), artifacts=c.artifacts||[], talents=c.talents||[];
    const element=characterElement(c);
    el.style.setProperty('--accent',element ? elementAccents[element] : accents[pos%accents.length]);
    if(element){el.dataset.element=element;el.querySelector('.element').textContent=element.toUpperCase()+' • CHARACTER BUILD';}
    el.dataset.index=i;
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
    el.addEventListener('click',()=>openDetail(i));
    const downloadButton=el.querySelector('.card-download');
    downloadButton?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();downloadBuildCard(i);});
    roster.appendChild(el);
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
document.querySelector('#compareButton')?.addEventListener('click',renderComparison);
document.querySelector('#compareA')?.addEventListener('change',renderComparison);
document.querySelector('#compareB')?.addEventListener('change',renderComparison);
document.querySelector('#detailModal').addEventListener('click',e=>{if(e.target.id==='detailModal'||e.target.closest('.detail-close'))closeDetail()});
document.querySelector('#downloadBuildCard')?.addEventListener('click',()=>downloadBuildCard(Number(document.querySelector('#detailModal')?.dataset.characterIndex)));
document.querySelector('#shareBuildCard')?.addEventListener('click',()=>shareBuildCard(Number(document.querySelector('#detailModal')?.dataset.characterIndex)));
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
(function initAmbience(){
  const button=document.querySelector('#ambienceToggle');if(!button)return;
  const key='statpaglu-ambience';
  const sync=()=>{const enabled=!document.body.classList.contains('ambient-off');button.textContent=enabled?'✦ FX ON':'✧ FX OFF';button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'Turn animated background effects off':'Turn animated background effects on');};
  if(localStorage.getItem(key)==='off')document.body.classList.add('ambient-off');
  sync();
  button.addEventListener('click',()=>{document.body.classList.toggle('ambient-off');localStorage.setItem(key,document.body.classList.contains('ambient-off')?'off':'on');sync();});
})();
(function initTheme(){const b=document.querySelector('#themeToggle');if(!b)return;if(localStorage.getItem('statpaglu-theme')==='light')document.body.classList.add('light-mode');const sync=()=>{const light=document.body.classList.contains('light-mode');b.innerHTML=light?'☀ <span>LIGHT</span>':'☾ <span>DARK</span>';b.setAttribute('aria-pressed',String(light));b.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode')};sync();b.onclick=()=>{document.body.classList.toggle('light-mode');localStorage.setItem('statpaglu-theme',document.body.classList.contains('light-mode')?'light':'dark');sync()}})();
// Do not auto-load any UID on startup. The UID input must remain empty until the user submits one.
window.addEventListener('load',()=>{
  initUpiSupport();
  const uidInput=document.querySelector('#uidInput');
  if(uidInput){uidInput.value=''; uidInput.focus();}
});
