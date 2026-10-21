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
function loadCardImage(url){
 return new Promise(resolve=>{
  if(!url){resolve(null);return;}
  const image=new Image();image.crossOrigin='anonymous';
  image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=url;
 });
}
function roundedRect(ctx,x,y,w,h,r){
 const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
function drawCoverImage(ctx,img,x,y,w,h){
 if(!img)return;
 const scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;
 ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
async function createBuildCard(index){
 const c=currentCharacters[index];if(!c)return null;
 const element=characterElement(c),accent=buildCardColor(element),artifacts=(c.artifacts||[]).slice(0,5);
 // Load artwork with CORS enabled; if a host blocks canvas access, the card remains exportable without that image.
 const [portrait,weaponImage,...artifactImages]=await Promise.all([
  loadCardImage(c.image),loadCardImage(c.weapon?.icon),...artifacts.map(a=>loadCardImage(a.icon))
 ]);
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=760;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const bg=ctx.createLinearGradient(0,0,1600,760);bg.addColorStop(0,'#080d18');bg.addColorStop(.42,'#111b2a');bg.addColorStop(1,'#0a1720');ctx.fillStyle=bg;ctx.fillRect(0,0,1600,760);
 const glow=ctx.createRadialGradient(1360,95,20,1360,95,520);glow.addColorStop(0,accent+'70');glow.addColorStop(1,accent+'00');ctx.fillStyle=glow;ctx.fillRect(850,0,750,590);
 // Fine aurora ribbons and glass specular streaks add depth without obscuring stats.
 ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle=accent;ctx.lineWidth=2;
 for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(660+j*28,28);ctx.bezierCurveTo(780+j*35,160,690+j*42,310,835+j*30,430);ctx.stroke();}
 ctx.restore();
 ctx.save();ctx.globalAlpha=.13;const sheen=ctx.createLinearGradient(0,26,0,180);sheen.addColorStop(0,'#ffffff');sheen.addColorStop(1,'#ffffff00');ctx.fillStyle=sheen;roundedRect(ctx,26,26,1548,155,24);ctx.fill();ctx.restore();
 // Enka-inspired three-column showcase: portrait, combat stats, and artifact loadout.
 ctx.save();roundedRect(ctx,26,26,1548,708,24);ctx.clip();
 if(portrait){
  // Keep the character artwork bright; only feather the far-right seam into the stats panel.
  ctx.globalAlpha=1;drawCoverImage(ctx,portrait,26,26,540,708);
  const seam=ctx.createLinearGradient(440,0,590,0);seam.addColorStop(0,'#0b102000');seam.addColorStop(.58,'#0b102044');seam.addColorStop(1,'#0b1020aa');ctx.fillStyle=seam;ctx.fillRect(440,26,150,708);
  // A restrained lower vignette supports the name without darkening half the character.
  const bottom=ctx.createLinearGradient(0,470,0,734);bottom.addColorStop(0,'#0b102000');bottom.addColorStop(1,'#0b1020c9');ctx.fillStyle=bottom;ctx.fillRect(26,470,540,264);
  // Glass-like highlight along the portrait edge.
  ctx.strokeStyle='#ffffff30';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(27,48);ctx.lineTo(27,710);ctx.stroke();
 }
 else{ctx.fillStyle='rgba(255,255,255,.025)';ctx.fillRect(26,26,540,708);ctx.strokeStyle=accent;ctx.globalAlpha=.22;ctx.lineWidth=2;ctx.beginPath();ctx.arc(290,280,150,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(290,280,185,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 ctx.restore();
 ctx.strokeStyle=accent;ctx.globalAlpha=.75;ctx.lineWidth=2;roundedRect(ctx,26,26,1548,708,24);ctx.stroke();ctx.globalAlpha=1;
 // Brand / character identity over the artwork.
 ctx.fillStyle='#f2d28a';ctx.font='700 22px Arial,sans-serif';ctx.fillText('★★★★★',58,66);
 ctx.fillStyle=accent;ctx.font='600 17px monospace';ctx.textAlign='right';ctx.fillText('GENSHIN STATPAGLU',525,66);ctx.textAlign='left';
 ctx.fillStyle='#dce4f4';ctx.font='700 47px Arial,sans-serif';ctx.fillText(String(c.name||'Character').slice(0,20),58,610);
 ctx.fillStyle=accent;ctx.font='700 17px Arial,sans-serif';ctx.fillText((element?element.toUpperCase()+'  ·  ':'')+'CHARACTER BUILD',60,644);
 ctx.fillStyle='#d0d8e8';ctx.font='500 18px monospace';ctx.fillText('LV. '+Number(c.level||1)+'   ·   C'+Number(c.constellation||0),60,679);
 // Middle: key combat stats, laid out like an in-game profile.
 const middleX=600,middleW=510,statY=94,statH=82,gapY=13;
 ctx.fillStyle=accent;ctx.font='600 17px monospace';ctx.fillText('COMBAT ATTRIBUTES',middleX,66);
 const stats=(c.stats||[]),wanted=['HP','ATK','DEF','Elemental Mastery','CRIT Rate','CRIT DMG','Energy Recharge'];
 const chosen=wanted.map(label=>stats.find(s=>s.label===label)).filter(Boolean);
 chosen.forEach((s,i)=>{
  const col=i%2,row=Math.floor(i/2),x=middleX+col*260,y=statY+row*(statH+gapY),w=245;
  ctx.fillStyle='rgba(255,255,255,.075)';roundedRect(ctx,x,y,w,statH,11);ctx.fill();
  ctx.save();ctx.globalAlpha=.42;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;roundedRect(ctx,x+.5,y+.5,w-1,statH-1,11);ctx.stroke();ctx.restore();
  const statGlass=ctx.createLinearGradient(x,y,x+w,y+statH);statGlass.addColorStop(0,accent+'18');statGlass.addColorStop(1,'#ffffff02');ctx.fillStyle=statGlass;roundedRect(ctx,x,y,w,statH,11);ctx.fill();
  ctx.fillStyle=accent;ctx.fillRect(x,y,4,statH);
  ctx.fillStyle='#9da9bd';ctx.font='600 13px Arial,sans-serif';ctx.fillText(String(s.label||'STAT').toUpperCase(),x+15,y+26);
  ctx.fillStyle='#f5f7ff';ctx.font='700 26px Arial,sans-serif';ctx.fillText(String(s.value||'—').slice(0,18),x+15,y+59);
 });
 // Weapon module, with icon if allowed by the source's CORS policy.
 const wx=600,wy=466,ww=510;ctx.strokeStyle='rgba(255,255,255,.13)';ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+ww,wy);ctx.stroke();
 ctx.fillStyle=accent;ctx.font='700 14px monospace';ctx.fillText('EQUIPPED WEAPON',wx,wy+27);
 ctx.fillStyle='rgba(255,255,255,.07)';roundedRect(ctx,wx,wy+42,74,74,12);ctx.fill();
 if(weaponImage)drawCoverImage(ctx,weaponImage,wx+8,wy+50,58,58);
 else{ctx.fillStyle=accent;ctx.font='700 27px Arial';ctx.fillText('✦',wx+25,wy+88);}
 ctx.fillStyle='#f0f3fa';ctx.font='700 17px Arial,sans-serif';ctx.fillText(String(c.weapon?.name||'Weapon data unavailable').slice(0,32),wx+90,wy+70);
 ctx.fillStyle='#aeb8ca';ctx.font='500 15px monospace';ctx.fillText(c.weapon?String(c.weapon.rarity||'')+'★   ·   LV. '+Number(c.weapon.level||1)+'   ·   R'+Number(c.weapon.refinement||1):'—',wx+90,wy+99);
 // Right: five artifact tiles with main stat, level and set label.
 const rx=1140,rw=405;ctx.fillStyle=accent;ctx.font='600 17px monospace';ctx.fillText('ARTIFACT LOADOUT',rx,66);
 const artifactNames=['FLOWER','PLUME','SANDS','GOBLET','CIRCLET'];
 artifacts.forEach((a,i)=>{
  const y=88+i*119;ctx.fillStyle='rgba(255,255,255,.075)';roundedRect(ctx,rx,y,rw,105,12);ctx.fill();
  ctx.save();ctx.strokeStyle='#ffffff24';ctx.lineWidth=1;roundedRect(ctx,rx+.5,y+.5,rw-1,104,12);ctx.stroke();ctx.restore();
  const artGlass=ctx.createLinearGradient(rx,y,rx+rw,y+105);artGlass.addColorStop(0,accent+'15');artGlass.addColorStop(1,'#ffffff01');ctx.fillStyle=artGlass;roundedRect(ctx,rx,y,rw,105,12);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.075)';roundedRect(ctx,rx+8,y+8,88,88,9);ctx.fill();
  if(artifactImages[i])drawCoverImage(ctx,artifactImages[i],rx+14,y+14,76,76);
  else{ctx.fillStyle=accent;ctx.font='700 22px Arial';ctx.fillText('✧',rx+38,y+58);}
  ctx.fillStyle=accent;ctx.font='700 11px monospace';ctx.fillText((String(a.slot||artifactNames[i]).toUpperCase()+'  ·  +'+Number(a.level||0)).slice(0,24),rx+110,y+20);
  ctx.fillStyle='#f0f3fa';ctx.font='700 15px Arial,sans-serif';ctx.fillText(String(a.mainStat?.label||'Artifact').slice(0,22),rx+110,y+43);
  ctx.fillStyle='#dce4f4';ctx.font='700 18px Arial,sans-serif';ctx.fillText(String(a.mainStat?.value||'—').slice(0,16),rx+110,y+65);
  // All four substats are compactly arranged in two columns below the main stat.
  const substats=Array.isArray(a.substats)?a.substats.slice(0,4):[];
  ctx.font='500 11px Arial,sans-serif';
  substats.forEach((sub,j)=>{
    const col=j%2,row=Math.floor(j/2),sx=rx+110+col*140,sy=y+82+row*14;
    const label=String(sub.label||'').replace('Energy Recharge','ER').replace('Elemental Mastery','EM').replace('CRIT Rate','CR').replace('CRIT DMG','CD').replace('ATK','ATK').replace('DEF','DEF').replace('HP','HP');
    const text=label+' '+String(sub.value??'').slice(0,9);
    ctx.fillStyle='#c8d2e4';ctx.fillText(text.slice(0,20),sx,sy);
  });
 });
 ctx.fillStyle='#77849a';ctx.font='500 12px monospace';ctx.fillText('PUBLIC SHOWCASE SNAPSHOT  ·  STATPAGLU',600,713);
 ctx.textAlign='right';ctx.fillStyle=accent;ctx.fillText('BUILD CARD  /  '+String(c.name||'').toUpperCase(),1540,713);ctx.textAlign='left';
 const filename='statpaglu-'+String(c.name||'build').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.png';
 return {canvas,character:c,filename};
}
async function downloadBuildCard(index){
 const card=await createBuildCard(index);if(!card)return;
 try{card.canvas.toBlob(blob=>{if(blob)downloadBlob(blob,card.filename);else{const link=document.createElement('a');link.download=card.filename;link.href=card.canvas.toDataURL('image/png');link.click();}},'image/png');}
 catch{const link=document.createElement('a');link.download=card.filename;link.href=card.canvas.toDataURL('image/png');link.click();}
}
async function shareBuildCard(index){
 const card=await createBuildCard(index);if(!card)return;
 try{card.canvas.toBlob(async blob=>{
   if(!blob){downloadBuildCard(index);return;}
   const file=new File([blob],card.filename,{type:'image/png'});
   if(navigator.share&&navigator.canShare?.({files:[file]})){
     try{await navigator.share({files:[file],title:card.character.name+' build',text:'Build card created with Genshin StatPaglu.'});}
     catch(err){if(err?.name!=='AbortError')downloadBlob(blob,card.filename);}
   }else downloadBlob(blob,card.filename);
 },'image/png');}catch{downloadBuildCard(index);}
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

/* Keep scroll work passive and pause costly visual effects only while the user is moving. */
(function initScrollPerformance(){
  let idleTimer;
  const onScroll=()=>{
    document.body.classList.add('is-scrolling');
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>document.body.classList.remove('is-scrolling'),140);
  };
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('pagehide',()=>clearTimeout(idleTimer),{once:true});
})();
