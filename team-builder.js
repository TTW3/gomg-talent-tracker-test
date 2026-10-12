(()=>{
const KEY='gomg-team-builder-v1';let profiles=[],saved=[],currentId=null;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const profileLabel=p=>`${p.character||p.base_name||p.stem}${p.variant?' · '+p.variant:''}`;
function blankTeam(){return {id:'team-'+Date.now(),name:'',members:[0,1,2].map(()=>({character:'',trait:'',title:'',perk:''}))}}
let team=blankTeam();
function loadSaved(){try{saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(saved))saved=[]}catch{saved=[]}}
function persist(){localStorage.setItem(KEY,JSON.stringify(saved))}
function choicesFor(memberIndex,kind){const selected=team.members[memberIndex].character;const self=profiles.find(p=>p.stem===selected);return profiles.filter(p=>!self||p.base_name!==self.base_name).filter(p=>p[kind]&&p[kind].name).sort((a,b)=>profileLabel(a).localeCompare(profileLabel(b)))}
function effectText(p,kind){const x=p?.[kind];if(!x)return '';return `${x.name||''}${x.unlock?' · '+x.unlock:''}${(x.effect||[]).length?'\n'+x.effect.join('\n'):''}`}
function render(){const host=$('teamBuilderMembers');if(!host)return;
 host.innerHTML=team.members.map((m,i)=>{const chosen=profiles.find(p=>p.stem===m.character);const icon=chosen?.icon?`<img src="${esc(chosen.icon)}" alt="" onerror="this.hidden=true">`:'';
 const charOpts='<option value="">— Chọn nhân vật —</option>'+profiles.map(p=>`<option value="${esc(p.stem)}" ${m.character===p.stem?'selected':''}>${esc(profileLabel(p))}</option>`).join('');
 const slots=['trait','title','perk'].map(k=>{const options=choicesFor(i,k);const value=m[k];const picked=profiles.find(p=>p.stem===value&&p[k]?.name);return `<div class="team-slot"><label>${k==='trait'?'🧬 Trait':k==='title'?'🏷️ Title':'✨ Perk'}</label><select data-member="${i}" data-kind="${k}"><option value="">— Chọn nguồn ${k} —</option>${options.map(p=>`<option value="${esc(p.stem)}" ${value===p.stem?'selected':''}>${esc(profileLabel(p))} — ${esc(p[k].name)}</option>`).join('')}</select>${picked?`<div class="chosen-source">Nguồn: ${esc(profileLabel(picked))} · ${esc(picked[k].id||'')}</div><p class="chosen-effect">${esc(effectText(picked,k))}</p>`:'<p class="chosen-effect muted">Chưa chọn hiệu ứng</p>'}</div>`}).join('');
 return `<article class="team-member-card"><div class="team-member-head">${icon}<span class="member-number">${i+1}</span><div class="member-character"><b>Nhân vật ${i+1}</b><select data-member="${i}" data-kind="character">${charOpts}</select></div></div>${slots}</article>`}).join('');
 $('teamName').value=team.name||'';$('teamBuilderStatus').textContent=`${profiles.length} profiles · ${team.members.length} nhân vật`;
 renderSaved();}
function renderSaved(){const el=$('savedTeamsList');if(!el)return;el.innerHTML=saved.map(t=>`<div class="saved-team-item"><span class="saved-team-name">${esc(t.name||'Team chưa đặt tên')} · ${(t.members||[]).filter(m=>m.character).length}/3</span><button type="button" data-load-team="${esc(t.id)}">Mở</button><button type="button" data-delete-team="${esc(t.id)}">Xóa</button></div>`).join('')||'<p class="muted">Chưa có team nào được lưu.</p>'}
function saveTeam(){team.name=$('teamName').value.trim();if(!team.members.some(m=>m.character)){alert('Chọn ít nhất một nhân vật trước khi lưu nhé.');return}const ix=saved.findIndex(t=>t.id===team.id);const copy=JSON.parse(JSON.stringify(team));if(ix>=0)saved[ix]=copy;else saved.unshift(copy);persist();renderSaved();$('teamBuilderStatus').textContent='Đã lưu team trên trình duyệt này';}
function newTeam(){team=blankTeam();currentId=null;render()}
function downloadJSON(){const blob=new Blob([JSON.stringify(team,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(team.name||'gomg-team').replace(/[^a-z0-9_-]+/gi,'_')+'.json';a.click();URL.revokeObjectURL(a.href)}
window.renderTeamBuilder=render;
document.addEventListener('change',e=>{const sel=e.target.closest('#teamBuilderMembers select');if(!sel)return;const i=Number(sel.dataset.member),k=sel.dataset.kind;if(!team.members[i])return;team.members[i][k]=sel.value;if(k==='character'){team.members[i].trait='';team.members[i].title='';team.members[i].perk=''}render()});
document.addEventListener('click',e=>{if(e.target.closest('#saveTeamBtn'))saveTeam();if(e.target.closest('#newTeamBtn'))newTeam();if(e.target.closest('#exportTeamBtn'))downloadJSON();const load=e.target.closest('[data-load-team]');if(load){const found=saved.find(t=>t.id===load.dataset.loadTeam);if(found){team=JSON.parse(JSON.stringify(found));render()}}const del=e.target.closest('[data-delete-team]');if(del&&confirm('Xóa team đã lưu này?')){saved=saved.filter(t=>t.id!==del.dataset.deleteTeam);persist();renderSaved()}});
async function init(){loadSaved();try{const r=await fetch('character-extras.json',{cache:'no-store'});const d=await r.json();profiles=Array.isArray(d.data)?d.data:[]}catch{profiles=[]}$('teamBuilderStatus').textContent=profiles.length?`${profiles.length} profiles đã tải`:'Không tải được character-extras.json';render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();