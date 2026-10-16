/* Character Build Planner - isolated module. Reads existing data/storage; writes only its own saved-plan key. */
(() => {
  'use strict';
  const PLAN_KEY = 'gomg-character-build-planner-v1';
  const TRACKER_KEY = 'gomg-talent-tracker-v3';
  const GEAR_KEY = 'gomg-gear-loadout-v1';
  const LEGACY_KEY = 'gomg-gear-loadout-legacy-v1';
  const STAR_KEY = 'gomg-gear-loadout-stars-v1';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let chars = [], talents = [], extras = [], gears = [], saved = [], currentPlanId = '', snapshotOverride = null;
  let initialized = false;

  function addStyles() {
    if ($('cbpStyles')) return;
    const style = document.createElement('style'); style.id = 'cbpStyles';
    style.textContent = `
      #characterBuildPlannerView{color:var(--text,#402a20)}
      #characterBuildPlannerView .cbp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}
      #characterBuildPlannerView .cbp-head h2{margin:0 0 4px;font-size:18px}
      #characterBuildPlannerView .cbp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      #characterBuildPlannerView .cbp-panel{border:1px solid var(--line,#e7c8b5);border-radius:11px;background:#fffaf5;padding:12px;min-width:0}
      #characterBuildPlannerView .cbp-panel h3{font-size:13px;margin:0 0 10px}
      #characterBuildPlannerView .cbp-field{display:flex;flex-direction:column;gap:5px;font-size:12px;margin-bottom:9px;min-width:0}
      #characterBuildPlannerView input,#characterBuildPlannerView select,#characterBuildPlannerView textarea{width:100%;box-sizing:border-box;min-width:0}
      #characterBuildPlannerView .cbp-charrow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
      #characterBuildPlannerView .cbp-charrow img{width:58px;height:58px;object-fit:cover;border-radius:9px;background:#f0dfd2;border:1px solid #e7c8b5}
      #characterBuildPlannerView .cbp-charrow b{font-size:14px}
      #characterBuildPlannerView .cbp-talent-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #characterBuildPlannerView .cbp-slot{border:1px solid #ead7c8;border-radius:8px;padding:8px;background:#fffdf9;min-width:0}
      #characterBuildPlannerView .cbp-slot label{display:block;font-size:11px;color:var(--muted,#806d60);margin-bottom:5px}
      #characterBuildPlannerView .cbp-gearlist{display:flex;flex-direction:column;gap:5px}
      #characterBuildPlannerView .cbp-gear{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid #ead7c8;border-radius:7px;background:#fffdf9;font-size:11px;min-width:0}
      #characterBuildPlannerView .cbp-gear img{width:30px;height:30px;object-fit:contain;background:#f3e4d8;border-radius:5px;flex:0 0 30px}
      #characterBuildPlannerView .cbp-gear span{min-width:0;overflow-wrap:anywhere}
      #characterBuildPlannerView .cbp-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      #characterBuildPlannerView .cbp-stat{display:flex;justify-content:space-between;gap:6px;border:1px solid #ead7c8;border-radius:7px;padding:7px 8px;background:#fffdf9;font-size:11px}
      #characterBuildPlannerView .cbp-choice{border:1px solid #ead7c8;border-radius:8px;padding:8px;margin-bottom:7px;background:#fffdf9}
      #characterBuildPlannerView .cbp-choice b{font-size:12px}
      #characterBuildPlannerView .cbp-choice small{display:block;color:var(--muted,#806d60);font-size:10px;line-height:1.4;margin-top:4px;overflow-wrap:anywhere}
      #characterBuildPlannerView .cbp-actions{display:flex;gap:7px;flex-wrap:wrap}
      #characterBuildPlannerView .cbp-saved{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border:1px solid #ead7c8;border-radius:8px;background:#fffdf9;margin-bottom:6px}
      #characterBuildPlannerView .cbp-saved span{min-width:0;overflow-wrap:anywhere;font-size:12px}
      #characterBuildPlannerView .cbp-empty{color:var(--muted,#806d60);font-size:11px;line-height:1.5}
      #characterBuildPlannerView .cbp-note{font-size:11px;color:var(--muted,#806d60);line-height:1.5;margin:7px 0 0}
      @media(max-width:760px){#characterBuildPlannerView .cbp-grid{grid-template-columns:minmax(0,1fr)}#characterBuildPlannerView .cbp-talent-grid{grid-template-columns:minmax(0,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function inject() {
    const switcher = document.querySelector('.view-switcher');
    if (!switcher || $('characterBuildPlannerBtn')) return false;
    const btn = document.createElement('button');
    btn.id = 'characterBuildPlannerBtn'; btn.type = 'button'; btn.textContent = '🧩 Character Build Planner';
    const gearBtn = $('gearLoadoutViewBtn');
    if (gearBtn && gearBtn.parentElement === switcher) gearBtn.insertAdjacentElement('afterend', btn);
    else switcher.appendChild(btn);
    const view = document.createElement('section');
    view.className = 'card'; view.id = 'characterBuildPlannerView'; view.hidden = true;
    view.innerHTML = `
      <div class="cbp-head"><div><h2>🧩 Character Build Planner</h2><span class="muted">Gom gear, Talent, Trait, Title và Perk vào một bản build. Dữ liệu build được lưu riêng.</span></div><span id="cbpStatus" class="status">Đang tải dữ liệu…</span></div>
      <div class="cbp-panel" style="margin-bottom:12px">
        <div class="cbp-actions"><label class="cbp-field" style="flex:1;min-width:220px;margin:0">Tên bản build<input id="cbpName" maxlength="90" placeholder="Ví dụ: Stellar Archer — Follow-up"></label><label class="cbp-field" style="flex:1;min-width:220px;margin:0">Nhân vật<select id="cbpCharacter"><option value="">Đang tải nhân vật…</option></select></label></div>
        <div class="cbp-actions" style="margin-top:10px"><button type="button" class="primary" id="cbpSave">Lưu bản build</button><button type="button" id="cbpNew">Build mới</button><button type="button" id="cbpRefreshGear">Làm mới gear từ Gear Loadout</button><button type="button" id="cbpExport">Xuất JSON</button><label style="display:inline-flex;align-items:center"><input id="cbpImportFile" type="file" accept="application/json,.json" style="max-width:220px"></label></div>
        <p class="cbp-note">Planner đọc gear đang lưu trong Gear Loadout và dữ liệu hiện có. Việc đổi gear vẫn thực hiện trong tab Gear Loadout; các thay đổi tại đây không ghi đè dữ liệu gear gốc.</p>
      </div>
      <div class="cbp-grid">
        <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
          <section class="cbp-panel"><h3>👤 Nhân vật & chỉ số gear</h3><div id="cbpCharacterInfo" class="cbp-empty">Chọn nhân vật để bắt đầu.</div><div id="cbpGearSummary" class="cbp-gearlist"></div><div id="cbpStats" class="cbp-stats" style="margin-top:8px"></div><div class="cbp-actions" style="margin-top:9px"><button id="cbpOpenGear" type="button">Mở Gear Loadout</button></div></section>
          <section class="cbp-panel"><h3>📚 Talent (4 ô)</h3><div class="cbp-talent-grid">${[0,1,2,3].map(i=>`<div class="cbp-slot"><label for="cbpTalent${i}">Talent ${i+1}</label><select id="cbpTalent${i}"><option value="">— Không chọn —</option></select></div>`).join('')}</div><p class="cbp-note">Có thể dùng Talent đang theo dõi làm gợi ý ban đầu; lựa chọn trong Planner được lưu riêng.</p></section>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
          <section class="cbp-panel"><h3>🧬 Trait / Title / Perk</h3><div id="cbpExtras"></div><p class="cbp-note">Danh sách lấy từ character-extras.json. Mỗi lựa chọn ghi rõ nhân vật nguồn và hiệu ứng.</p></section>
          <section class="cbp-panel"><h3>🔗 Bond & hiệu ứng gear</h3><div id="cbpBonds" class="cbp-empty">Chưa có gear được gắn cho nhân vật này.</div></section>
        </div>
      </div>
      <section class="cbp-panel" style="margin-top:12px"><div class="section-head"><h3>💾 Các bản build đã lưu</h3><span class="muted">Lưu trên trình duyệt hiện tại</span></div><div id="cbpSavedList"></div></section>
    `;
    switcher.insertAdjacentElement('afterend', view);
    btn.addEventListener('click', show);
    // Existing tabs remain in charge of their own views; this listener only hides the new planner.
    switcher.addEventListener('click', e => { if (!e.target.closest('#characterBuildPlannerBtn')) hide(); });
    return true;
  }

  function hide() { const v=$('characterBuildPlannerView'),b=$('characterBuildPlannerBtn'); if(v)v.hidden=true;if(b)b.classList.remove('primary'); }
  function show() {
    const ids=['trackerToolbar','syncPanel','talentDatabaseView','characterExtrasView','teamBuilderView','gearDatabaseView','gearLoadoutView','buildAdvisorView','characterBuildPlannerView'];
    ids.forEach(id=>{const el=$(id);if(el)el.hidden=true;});
    document.querySelectorAll('.tracker-view').forEach(el=>el.hidden=true);
    document.querySelectorAll('.view-switcher button').forEach(el=>el.classList.remove('primary'));
    $('characterBuildPlannerView').hidden=false; $('characterBuildPlannerBtn').classList.add('primary');
    renderSaved(); renderCharacterDetails();
  }
  function getStored(key, fallback) { try { const v=JSON.parse(localStorage.getItem(key)||'null'); return v==null?fallback:v; } catch { return fallback; } }
  function gearState() { return getStored(GEAR_KEY, {}); }
  function currentCharacter() { return chars.find(c=>String(c.id)===$('cbpCharacter')?.value); }
  function profileForCharacter(c) { return extras.find(x=>String(x.character_id||'')===String(c?.id||'')) || extras.find(x=>x.stem===c?.stem) || extras.find(x=>norm(x.character)===norm(c?.name_en)); }
  function effectText(value) { return Array.isArray(value)?value.join(' '):String(value||''); }
  function allExtraOptions(kind) {
    const seen=new Set(), out=[];
    extras.forEach(p=>{const item=p[kind];if(!item||!item.name)return;const id=String(item.id||item.name);if(seen.has(id))return;seen.add(id);out.push({id,name:item.name,effect:effectText(item.effect),source:p.character||p.base_name||p.stem,unlock:item.unlock||''});});
    return out.sort((a,b)=>a.name.localeCompare(b.name));
  }
  function extraSelect(kind, label) {
    const opts=allExtraOptions(kind);
    return `<label class="cbp-field"><span>${label}</span><select id="cbp${kind[0].toUpperCase()+kind.slice(1)}"><option value="">— Không chọn —</option>${opts.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${esc(x.source)}</option>`).join('')}</select><div id="cbp${kind[0].toUpperCase()+kind.slice(1)}Detail" class="cbp-note"></div></label>`;
  }
  function selectedExtra(kind) { const id=$('cbp'+kind[0].toUpperCase()+kind.slice(1))?.value; return allExtraOptions(kind).find(x=>x.id===id)||null; }
  function fillOptions() {
    $('cbpCharacter').innerHTML='<option value="">— Chọn nhân vật —</option>'+chars.slice().sort((a,b)=>(a.name_en||a.name||'').localeCompare(b.name_en||b.name||'')).map(c=>`<option value="${esc(c.id)}">${esc(c.name_en||c.name||c.id)}</option>`).join('');
    const talentOptions=talents.slice().sort((a,b)=>(a.name_en||a.name||'').localeCompare(b.name_en||b.name||''));
    for(let i=0;i<4;i++) $('cbpTalent'+i).innerHTML='<option value="">— Không chọn —</option>'+talentOptions.map(t=>`<option value="${esc(t.id)}">${esc(t.name_en||t.name||t.id)}</option>`).join('');
    $('cbpExtras').innerHTML=extraSelect('trait','Trait')+extraSelect('title','Title')+extraSelect('perk','Perk');
    ['trait','title','perk'].forEach(kind=>$('cbp'+kind[0].toUpperCase()+kind.slice(1)).addEventListener('change',()=>renderExtraDetail(kind)));
  }
  function renderExtraDetail(kind) { const x=selectedExtra(kind), el=$('cbp'+kind[0].toUpperCase()+kind.slice(1)+'Detail'); if(el)el.textContent=x?[x.source,x.unlock,x.effect].filter(Boolean).join(' · '):''; }
  function getTrackerTalents(c) {
    const db=getStored(TRACKER_KEY,{girls:[]});const girls=Array.isArray(db?.girls)?db.girls:[];
    const row=girls.find(g=>norm(g.name)===norm(c?.name_en)||norm(g.name)===norm(c?.base_id));
    if(!row)return [];
    const board=Array.isArray(row.boards)?row.boards[Math.max(0,Math.min(3,Number(row.activeBoard)||0))]:(row.talents||[]);
    return (board||[]).map(val=>{if(!val)return '';const t=talents.find(x=>x.id===val||norm(x.name_en)===norm(val));return t?.id||'';});
  }
  function gearById(id) { return gears.find(g=>String(g.id)===String(id)); }
  function selectedGear() { const c=currentCharacter();if(!c)return {};if(snapshotOverride&&String(snapshotOverride.characterId)===String(c.id))return snapshotOverride.gear||{};const state=gearState();return state[String(c.id)]||{}; }
  function selectedLegacy() { const c=currentCharacter();if(!c)return {};if(snapshotOverride&&String(snapshotOverride.characterId)===String(c.id))return snapshotOverride.legacy||{};const state=getStored(LEGACY_KEY,{});return state[String(c.id)]||{}; }
  function selectedStars() { const c=currentCharacter();if(!c)return {};if(snapshotOverride&&String(snapshotOverride.characterId)===String(c.id))return snapshotOverride.stars||{};const state=getStored(STAR_KEY,{});return state[String(c.id)]||{}; }
  function slotGearId(raw) { return typeof raw==='string'?raw:raw?.gearId||raw?.id||''; }
  function bondPoints(slot, gear, bond, index) { const legacy=selectedLegacy()[slot]===gear.id;const entry=selectedStars()[slot];const stars=entry&&entry.gearId===gear.id?Math.max(0,Math.min(3,Number(entry.stars)||0)):0;return Number(bond.count||1)+(legacy?1:0)+(stars>=index+1?1:0); }
  function renderCharacterDetails() {
    const c=currentCharacter();
    if(!c){$('cbpCharacterInfo').innerHTML='<p class="cbp-empty">Chọn nhân vật để xem gear và cấu hình build.</p>';$('cbpGearSummary').innerHTML='';$('cbpStats').innerHTML='';$('cbpBonds').innerHTML='<p class="cbp-empty">Chưa chọn nhân vật.</p>';return;}
    const img=c.icon?`<img src="${esc(c.icon)}" alt="" onerror="this.style.visibility='hidden'">`:'';
    $('cbpCharacterInfo').innerHTML=`<div class="cbp-charrow">${img}<div><b>${esc(c.name_en||c.name||c.id)}</b><div class="cbp-note">${esc([c.rarity,c.role,c.type,c.element,c.terrain].filter(Boolean).join(' · '))}</div></div></div>`;
    const state=selectedGear(), slots=['Head','Necklace','Body','Gloves','Shoes','Belt','Ring','Main','Off','Badge'];let totals={},bondMap={};const items=[];
    slots.forEach(slot=>{const raw=state[slot];const id=slotGearId(raw);const g=gearById(id);if(!g)return;items.push({slot,g});Object.entries(g.stats||{}).forEach(([k,v])=>{totals[k]=(totals[k]||0)+Number(v||0);});(g.bonds||[]).forEach((b,index)=>{const key=(b.source||'')+'|'+b.name;bondMap[key]??={name:b.name,source:b.source,count:0,items:[],desc:b.basicDesc||b.effect||'',tiers:b.tiers||[]};bondMap[key].count+=bondPoints(slot,g,b,index);bondMap[key].items.push(g.name);});});
    $('cbpGearSummary').innerHTML=items.length?items.map(({slot,g})=>`<div class="cbp-gear"><img src="${esc(g.icon||'')}" alt="" onerror="this.style.visibility='hidden'"><span><b>${esc(slot)}:</b> ${esc(g.name)} <small class="muted">· ${esc(g.step||'')}</small></span></div>`).join(''):'<p class="cbp-empty">Chưa có gear được lưu trong Gear Loadout cho nhân vật này. Mở Gear Loadout để gắn trang bị.</p>';
    $('cbpStats').innerHTML=Object.keys(totals).length?Object.entries(totals).filter(([,v])=>v).map(([k,v])=>`<div class="cbp-stat"><span>${esc(k)}</span><b>${v>0?'+':''}${v}</b></div>`).join(''):'<p class="cbp-empty">Chưa có chỉ số gear.</p>';
    $('cbpBonds').innerHTML=Object.keys(bondMap).length?Object.values(bondMap).map(b=>`<details class="cbp-choice"><summary><b>${esc(b.source)}: ${esc(b.name)}</b> <small>${b.count} điểm · ${b.items.length} gear</small></summary><small>${esc(b.desc)}</small><small>Gear: ${esc(b.items.join(', '))}</small>${b.tiers.map(t=>`<small>Mốc ${t.pieces}: ${esc(t.effect||'')}</small>`).join('')}</details>`).join(''):'<p class="cbp-empty">Chưa có Bond từ gear.</p>';
    const trackerTalents=getTrackerTalents(c);for(let i=0;i<4;i++){const el=$('cbpTalent'+i);if(!el.dataset.userChanged&&!el.value&&trackerTalents[i])el.value=trackerTalents[i];}
    const profile=profileForCharacter(c);['trait','title','perk'].forEach(kind=>{const el=$('cbp'+kind[0].toUpperCase()+kind.slice(1));if(profile?.[kind]&&!el.dataset.userChanged){el.value=String(profile[kind].id||profile[kind].name);if(!el.value || !Array.from(el.options).some(o=>o.value===el.value))el.value='';renderExtraDetail(kind);}});
    if(!$('cbpName').value)$('cbpName').value=(c.name_en||c.name||'Character')+' Build';
  }
  function makePlan() {
    const c=currentCharacter();if(!c)throw new Error('Hãy chọn nhân vật trước.');
    const id=currentPlanId||'cbp-'+Date.now();
    return {id,name:$('cbpName').value.trim()||(c.name_en||c.name||'Character')+' Build',characterId:c.id,characterName:c.name_en||c.name||c.id,talents:[0,1,2,3].map(i=>$('cbpTalent'+i).value||''),trait:$('cbpTrait').value||'',title:$('cbpTitle').value||'',perk:$('cbpPerk').value||'',gear:JSON.parse(JSON.stringify(selectedGear())),legacy:JSON.parse(JSON.stringify(selectedLegacy())),stars:JSON.parse(JSON.stringify(selectedStars())),savedAt:new Date().toISOString()};
  }
  function loadPlan(p) {
    currentPlanId=p.id;snapshotOverride={characterId:p.characterId,gear:p.gear||{},legacy:p.legacy||{},stars:p.stars||{}};$('cbpName').value=p.name||'';$('cbpCharacter').value=String(p.characterId||'');renderCharacterDetails();
    (p.talents||[]).forEach((v,i)=>{if($('cbpTalent'+i)){$('cbpTalent'+i).value=v||'';$('cbpTalent'+i).dataset.userChanged='1';}});
    ['trait','title','perk'].forEach(k=>{const el=$('cbp'+k[0].toUpperCase()+k.slice(1));el.value=p[k]||'';el.dataset.userChanged='1';renderExtraDetail(k);});
    // Show saved gear snapshot in the planner, even if Gear Loadout has since changed.
    if(p.gear){const slots=['Head','Necklace','Body','Gloves','Shoes','Belt','Ring','Main','Off','Badge'];const items=[];let totals={};slots.forEach(slot=>{const raw=p.gear[slot],id=slotGearId(raw),g=gearById(id);if(g){items.push({slot,g});Object.entries(g.stats||{}).forEach(([k,v])=>totals[k]=(totals[k]||0)+Number(v||0));}});$('cbpGearSummary').innerHTML=items.map(({slot,g})=>`<div class="cbp-gear"><img src="${esc(g.icon||'')}" alt="" onerror="this.style.visibility='hidden'"><span><b>${esc(slot)}:</b> ${esc(g.name)}</span></div>`).join('')||'<p class="cbp-empty">Bản build này chưa lưu gear.</p>';$('cbpStats').innerHTML=Object.entries(totals).filter(([,v])=>v).map(([k,v])=>`<div class="cbp-stat"><span>${esc(k)}</span><b>${v>0?'+':''}${v}</b></div>`).join('');}
    renderSaved();
  }
  function renderSaved() { const el=$('cbpSavedList');if(!el)return;el.innerHTML=saved.length?saved.slice().sort((a,b)=>(b.savedAt||'').localeCompare(a.savedAt||'')).map(p=>`<div class="cbp-saved"><span><b>${esc(p.name)}</b><br><small class="muted">${esc(p.characterName||'')} · ${(p.talents||[]).filter(Boolean).length}/4 Talent</small></span><div class="cbp-actions"><button type="button" data-cbp-load="${esc(p.id)}">Mở</button><button type="button" data-cbp-delete="${esc(p.id)}">Xóa</button></div></div>`).join(''):'<p class="cbp-empty">Chưa có bản build nào được lưu.</p>'; }
  function resetForm() { currentPlanId='';snapshotOverride=null;$('cbpName').value='';$('cbpCharacter').value='';[0,1,2,3].forEach(i=>{const e=$('cbpTalent'+i);e.value='';delete e.dataset.userChanged;});['trait','title','perk'].forEach(k=>{const e=$('cbp'+k[0].toUpperCase()+k.slice(1));e.value='';delete e.dataset.userChanged;renderExtraDetail(k);});renderCharacterDetails(); }
  async function initData() {
    try { const urls=['game-data.json','character-extras.json','gear-database.json'];const [c,e,g]=await Promise.all(urls.map(url=>fetch(url,{cache:'no-cache'})));if(!c.ok||!e.ok||!g.ok)throw new Error('Không tải được một trong các file dữ liệu JSON');const cd=await c.json(),ed=await e.json();chars=Array.isArray(cd)?cd:(cd.characters||cd.units||[]);talents=cd.talents||[];extras=ed.data||[];gears=await g.json();saved=getStored(PLAN_KEY,[]);if(!Array.isArray(saved))saved=[];fillOptions();$('cbpStatus').textContent=`${chars.length} nhân vật · ${talents.length} Talent · ${extras.length} Profile`;renderSaved();renderCharacterDetails();initialized=true;
    } catch(err) { $('cbpStatus').textContent='Lỗi tải dữ liệu';$('cbpCharacterInfo').innerHTML=`<p class="cbp-empty">${esc(err.message)}. Kiểm tra game-data.json, character-extras.json và gear-database.json.</p>`; }
  }
  function bind() {
    $('cbpCharacter').addEventListener('change',()=>{currentPlanId='';snapshotOverride=null;$('cbpName').value='';[0,1,2,3].forEach(i=>{const el=$('cbpTalent'+i);el.value='';delete el.dataset.userChanged;});['trait','title','perk'].forEach(k=>{const el=$('cbp'+k[0].toUpperCase()+k.slice(1));el.value='';delete el.dataset.userChanged;renderExtraDetail(k);});renderCharacterDetails();});
    [0,1,2,3].forEach(i=>$('cbpTalent'+i).addEventListener('change',e=>e.target.dataset.userChanged='1'));
    $('cbpSave').addEventListener('click',()=>{try{const p=makePlan(),idx=saved.findIndex(x=>x.id===p.id);if(idx>=0)saved[idx]=p;else saved.unshift(p);localStorage.setItem(PLAN_KEY,JSON.stringify(saved));currentPlanId=p.id;renderSaved();$('cbpStatus').textContent='Đã lưu bản build';}catch(e){$('cbpStatus').textContent=e.message;}});
    $('cbpNew').addEventListener('click',resetForm);
    $('cbpRefreshGear').addEventListener('click',()=>{snapshotOverride=null;renderCharacterDetails();$('cbpStatus').textContent='Đã đọc lại gear từ Gear Loadout';});
    $('cbpOpenGear').addEventListener('click',()=>{$('gearLoadoutViewBtn')?.click();});
    $('cbpSavedList').addEventListener('click',e=>{const load=e.target.closest('[data-cbp-load]'),del=e.target.closest('[data-cbp-delete]');if(load){const p=saved.find(x=>x.id===load.dataset.cbpLoad);if(p)loadPlan(p);}if(del&&confirm('Xóa bản build này?')){saved=saved.filter(x=>x.id!==del.dataset.cbpDelete);localStorage.setItem(PLAN_KEY,JSON.stringify(saved));renderSaved();}});
    $('cbpExport').addEventListener('click',()=>{const data=JSON.stringify(saved,null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='gomg-character-builds.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    $('cbpImportFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error('JSON phải là một danh sách build');const merged=[...saved];data.forEach(p=>{if(p&&p.id&&p.characterId){const i=merged.findIndex(x=>x.id===p.id);if(i>=0)merged[i]=p;else merged.push(p);}});saved=merged;localStorage.setItem(PLAN_KEY,JSON.stringify(saved));renderSaved();$('cbpStatus').textContent='Đã nhập build';}catch(err){$('cbpStatus').textContent='Không nhập được: '+err.message;}e.target.value='';});
  }
  function start() {
    if (!inject()) return;
    addStyles();
    bind();
    initData();
    // Existing tab handlers hide their own views; only ensure this module is hidden when another tab is selected.
    document.querySelector('.view-switcher')?.addEventListener('click',e=>{if(!e.target.closest('#characterBuildPlannerBtn'))hide();});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
