let DATA=null, site=null, imageHandler=null;
const API_BASE='https://usqsewecifxrxixprqxa.supabase.co/functions/v1/artemis-host-api';
const TOKEN_KEY='artemis_host_admin_session_v1';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
function mapAction(url,opt={}){
  if(url==='/api/admin/me')return{action:'me',admin:true};
  if(url==='/api/admin/login')return{action:'login',login:true};
  if(url==='/api/admin/data')return{action:'admin-data',admin:true};
  if(url==='/api/admin/site')return{action:'save-site',admin:true};
  if(url==='/api/admin/upload')return{action:'upload',admin:true};
  let m=url.match(/^\/api\/admin\/reservations\/([^/]+)$/);if(m)return{action:(opt.method||'GET').toUpperCase()==='DELETE'?'reservation-delete':'reservation-status',admin:true,id:decodeURIComponent(m[1])};
  m=url.match(/^\/api\/admin\/recruits\/([^/]+)$/);if(m)return{action:(opt.method||'GET').toUpperCase()==='DELETE'?'recruit-delete':'recruit-status',admin:true,id:decodeURIComponent(m[1])};
  return null;
}
async function api(url,opt={}){
  if(url==='/api/admin/logout'){localStorage.removeItem(TOKEN_KEY);return{ok:true}}
  const map=mapAction(url,opt);if(!map)throw new Error('API endpoint not found');
  const headers={'Content-Type':'application/json',...(opt.headers||{})};
  const token=localStorage.getItem(TOKEN_KEY);if(map.admin&&token)headers.Authorization=`Bearer ${token}`;
  let body=opt.body;
  if(map.id){let parsed={};try{parsed=body?JSON.parse(body):{}}catch{}parsed.id=map.id;body=JSON.stringify(parsed)}
  const r=await fetch(`${API_BASE}?action=${encodeURIComponent(map.action)}`,{...opt,headers,body});
  const j=await r.json().catch(()=>({}));
  if(map.login&&r.ok&&j.token)localStorage.setItem(TOKEN_KEY,j.token);
  if(map.admin&&r.status===401)localStorage.removeItem(TOKEN_KEY);
  if(!r.ok)throw new Error(j.error||'エラーが発生しました');return j;
}

async function authCheck(){const me=await api('/api/admin/me');if(me.authenticated)showAdmin();}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api('/api/admin/login',{method:'POST',body:JSON.stringify(Object.fromEntries(fd))});$('#loginMessage').textContent='';showAdmin()}catch(err){$('#loginMessage').textContent=err.message}});
$('#logoutButton').addEventListener('click',async()=>{await api('/api/admin/logout',{method:'POST',body:'{}'});location.reload()});

function normalizeSite(){
  if(!site||typeof site!=='object')site={};
  if(!Array.isArray(site.cast))site.cast=[];
  site.cast.forEach((c,i)=>{if(!c.id)c.id=uid(`cast${i+1}`);if(c.rank==null)c.rank=String(i+1).padStart(2,'0');if(c.shift==null)c.shift='21:00 - LAST';});
  const valid=new Set(site.cast.map(c=>String(c.id)));
  if(!Array.isArray(site.todayCast))site.todayCast=site.cast.map(c=>String(c.id));
  else site.todayCast=site.todayCast.map(String).filter(id=>valid.has(id));
  if(!Array.isArray(site.ranking))site.ranking=site.cast.slice(0,3).map(c=>String(c.id));
  else site.ranking=[0,1,2].map(i=>site.ranking[i]?String(site.ranking[i]):'').map(id=>valid.has(id)?id:'');
  if(!Array.isArray(site.system))site.system=[];
  if(!Array.isArray(site.news))site.news=[];
  if(!site.brand)site.brand={};if(!site.event)site.event={};if(!site.access)site.access={};if(!site.recruit)site.recruit={};if(!site.socials)site.socials={};
  if(!site.copy){try{site.copy=String(site.event.description||'').startsWith('__SITE_COPY__')?JSON.parse(String(site.event.description).slice(13)):{};}catch{site.copy={};}}
}

async function showAdmin(){try{DATA=await api('/api/admin/data');DATA.reservations=Array.isArray(DATA.reservations)?DATA.reservations:[];DATA.recruits=Array.isArray(DATA.recruits)?DATA.recruits:[];site=DATA.site||{};normalizeSite();$('#loginView').classList.add('hidden');$('#adminView').classList.remove('hidden');renderAll();}catch(err){toast(err.message)}}

const titles={dashboard:'ダッシュボード',content:'基本情報',cast:'在籍ホスト',castops:'ランキング・出勤',system:'料金',news:'ニュース',reservations:'予約',recruits:'求人応募'};
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===b.dataset.tab));$('#pageTitle').textContent=titles[b.dataset.tab];if(b.dataset.tab==='castops')renderCastOps();}));

function field(label,path,value,type='text',wide=false){if(path.startsWith('copy.')){const key=path.slice(5);if(Object.prototype.hasOwnProperty.call(site.copy||{},key))value=site.copy[key];else if(key==='heroKicker')value=''}return `<label class="field ${wide?'wide':''}"><span>${label}</span>${type==='textarea'?`<textarea data-path="${path}">${esc(value)}</textarea>`:`<input data-path="${path}" value="${esc(value)}" type="${type}">`}</label>`}
function bindPaths(){$$('[data-path]').forEach(el=>el.addEventListener('input',()=>{const parts=el.dataset.path.split('.');let obj=site;for(let i=0;i<parts.length-1;i++)obj=obj[parts[i]];obj[parts.at(-1)]=el.value;markDirty()}));}
function markDirty(){$('#saveState').textContent='未保存の変更あり';}

function renderBase(){
  const b=site.brand||{},c=site.copy||{};$('#brandFields').innerHTML=field('店名','brand.name',b.name)+field('サブタイトル','brand.subtitle',b.subtitle)+field('トップ上部の英字','copy.heroKicker',c.heroKicker||'SHINJUKU KABUKICHO · EST. 2026','text',true)+field('トップ大見出し・1行目','copy.heroLine1',c.heroLine1||'OWN')+field('トップ大見出し・2行目','copy.heroLine2',c.heroLine2||'THE NIGHT.')+field('キャッチコピー','brand.tagline',b.tagline,'text',true)+field('トップ紹介文','brand.intro',b.intro,'textarea',true)+`<div class="image-field"><img src="${esc(b.heroImage||'/assets/26327603_l.jpg')}"><div><p>メインビジュアル</p><button type="button" data-upload-hero>画像を変更</button></div></div>`+field('コンセプト英字','copy.experienceEyebrow',c.experienceEyebrow||'THE ARTEMIS EXPERIENCE','text',true)+field('コンセプト見出し・1行目','copy.experienceLine1',c.experienceLine1||'その一夜を、')+field('コンセプト見出し・2行目','copy.experienceLine2',c.experienceLine2||'記憶に残る物語へ。')+field('コンセプト説明','copy.experienceDescription',c.experienceDescription||'洗練された空間と、一流のホスピタリティ。\nThe Artemisは、日常を忘れる特別な時間をお届けします。','textarea',true)+field('ホスト欄・英字','copy.hostEyebrow',c.hostEyebrow||'MEET OUR HOSTS')+field('ホスト欄・見出し','copy.hostTitle',c.hostTitle||'HOSTS')+field('ランキング欄・英字','copy.rankingEyebrow',c.rankingEyebrow||'MONTHLY SALES')+field('ランキング欄・見出し','copy.rankingTitle',c.rankingTitle||'RANKING')+field('ランキング欄・説明','copy.rankingDescription',c.rankingDescription||'今月、最も輝いたホストをご紹介。','text',true)+field('本日出勤・英字','copy.todayEyebrow',c.todayEyebrow||"TODAY'S HOST")+field('本日出勤・見出し','copy.todayTitle',c.todayTitle||'TODAY')+field('本日出勤・説明','copy.todayDescription',c.todayDescription||'本日お迎えするホストをご紹介します。','text',true)+field('ニュース欄・英字','copy.newsEyebrow',c.newsEyebrow||'LATEST UPDATES')+field('ニュース欄・見出し','copy.newsTitle',c.newsTitle||'NEWS & EVENT')+field('料金欄・英字','copy.systemEyebrow',c.systemEyebrow||'PRICE GUIDE')+field('料金欄・見出し','copy.systemTitle',c.systemTitle||'SYSTEM')+field('料金欄・説明','copy.systemDescription',c.systemDescription||'初めてのお客様にも、安心してお楽しみいただける明朗な料金システムです。','textarea',true)+field('フッター著作権表記','copy.footerCopyright',c.footerCopyright||'The Artemis. ALL RIGHTS RESERVED.','text',true);
  const e=site.event||{},eventDescription=String(e.description||'').startsWith('__SITE_COPY__')?'':e.description;$('#eventFields').innerHTML=field('英字タイトル','event.title',e.title)+field('イベント名','event.heading',e.heading)+field('開催日','event.date',e.date)+field('説明','event.description',eventDescription,'textarea',true);
  const a=site.access||{};$('#accessFields').innerHTML=field('郵便番号','access.postal',a.postal)+field('電話番号','access.tel',a.tel)+field('住所','access.address',a.address,'text',true)+field('アクセス','access.route',a.route,'text',true)+field('営業時間','access.hours',a.hours,'text',true)+field('Google Map URL','access.mapUrl',a.mapUrl,'url',true);
  const r=site.recruit||{},s=site.socials||{};$('#recruitFields').innerHTML=field('求人見出し','recruit.heading',r.heading,'text',true)+field('求人リード','recruit.lead',r.lead,'text',true)+field('求人補足','recruit.note',r.note,'textarea',true)+field('Instagram URL','socials.instagram',s.instagram||'','url',true)+field('X URL','socials.x',s.x||'','url',true)+field('LINE URL','socials.line',s.line||'','url',true);
  bindPaths();$('[data-upload-hero]').addEventListener('click',()=>pickImage(url=>{site.brand.heroImage=url;renderBase();markDirty()}));
}

function renderCast(){
  const root=$('#castEditor');
  root.innerHTML=(site.cast||[]).map((c,i)=>`<article class="edit-card" data-cast-index="${i}"><div class="thumb">${c.image?`<img src="${esc(c.image)}">`:`HOST ${esc(c.rank)}`}</div><div class="fields"><input data-k="rank" value="${esc(c.rank)}" placeholder="表示番号"><input data-k="name" value="${esc(c.name)}" placeholder="名前"><input data-k="roman" value="${esc(c.roman)}" placeholder="英字名"><div class="card-actions"><button type="button" class="upload" data-photo>画像変更</button><button type="button" class="danger" data-delete>削除</button></div></div></article>`).join('');
  $$('[data-cast-index]').forEach(card=>{
    const i=+card.dataset.castIndex;
    card.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{site.cast[i][el.dataset.k]=el.value;if(el.dataset.k==='name')renderCastOps();markDirty()}));
    card.querySelector('[data-photo]').addEventListener('click',()=>pickImage(url=>{site.cast[i].image=url;renderCast();markDirty()}));
    card.querySelector('[data-delete]').addEventListener('click',()=>{if(!confirm('このキャストを削除しますか？'))return;const id=String(site.cast[i].id);site.cast.splice(i,1);site.todayCast=site.todayCast.filter(x=>String(x)!==id);site.ranking=site.ranking.map(x=>String(x)===id?'':x);renderCast();renderCastOps();updateStats();markDirty()});
  });
}

function renderCastOps(){
  const rankingRoot=$('#rankingEditor'),todayRoot=$('#todayEditor');if(!rankingRoot||!todayRoot)return;
  const options=(selected)=>`<option value="">未設定</option>`+site.cast.map(c=>`<option value="${esc(c.id)}" ${String(selected)===String(c.id)?'selected':''}>${esc(c.name||'名称未設定')}</option>`).join('');
  rankingRoot.innerHTML=[0,1,2].map(i=>`<div class="rank-select-card"><strong>TOP ${i+1}</strong><label>ホスト<select data-ranking-index="${i}">${options(site.ranking[i])}</select></label></div>`).join('');
  $$('[data-ranking-index]').forEach(sel=>sel.addEventListener('change',()=>{const i=+sel.dataset.rankingIndex;const value=sel.value;if(value&&site.ranking.some((id,j)=>j!==i&&String(id)===value)){toast('同じキャストはTOP3に重複設定できません');sel.value=site.ranking[i]||'';return;}site.ranking[i]=value;markDirty()}));
  const todaySet=new Set(site.todayCast.map(String));
  todayRoot.innerHTML=site.cast.length?site.cast.map(c=>`<div class="today-row"><input type="checkbox" data-today-id="${esc(c.id)}" ${todaySet.has(String(c.id))?'checked':''}><span><strong>${esc(c.name||'名称未設定')}</strong><small style="display:block;margin:7px 0 4px;color:#897d6c">勤務時間</small><input type="text" data-shift-id="${esc(c.id)}" value="${esc(c.shift||'')}" placeholder="例：21:00 - LAST" style="width:100%;height:auto;padding:8px 10px;background:#070605;border:1px solid rgba(205,167,95,.28);color:#fff;accent-color:auto"></span></div>`).join(''):'<p>在籍ホストを先に登録してください。</p>';
  $$('[data-today-id]').forEach(box=>box.addEventListener('change',()=>{const id=box.dataset.todayId;const set=new Set(site.todayCast.map(String));if(box.checked)set.add(id);else set.delete(id);site.todayCast=site.cast.map(c=>String(c.id)).filter(cid=>set.has(cid));updateStats();markDirty()}));
  $$('[data-shift-id]').forEach(input=>input.addEventListener('input',()=>{const cast=site.cast.find(c=>String(c.id)===String(input.dataset.shiftId));if(cast){cast.shift=input.value;markDirty()}}));
}

function renderPrices(){const root=$('#priceEditor');root.innerHTML=(site.system||[]).map((p,i)=>`<div class="edit-row" data-price-index="${i}"><input data-k="label" value="${esc(p.label)}"><input data-k="price" value="${esc(p.price)}"><button class="danger" data-delete>削除</button></div>`).join('');$$('[data-price-index]').forEach(row=>{const i=+row.dataset.priceIndex;row.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{site.system[i][el.dataset.k]=el.value;markDirty()}));row.querySelector('[data-delete]').addEventListener('click',()=>{site.system.splice(i,1);renderPrices();markDirty()})});}
function renderNews(){const root=$('#newsEditor');root.innerHTML=(site.news||[]).map((n,i)=>`<div class="edit-row news-row" data-news-index="${i}"><input data-k="date" value="${esc(n.date)}"><input data-k="category" value="${esc(n.category)}"><input data-k="text" value="${esc(n.text)}"><button class="danger" data-delete>削除</button></div>`).join('');$$('[data-news-index]').forEach(row=>{const i=+row.dataset.newsIndex;row.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{site.news[i][el.dataset.k]=el.value;markDirty()}));row.querySelector('[data-delete]').addEventListener('click',()=>{site.news.splice(i,1);renderNews();updateStats();markDirty()})});}

const statLabels={new:'未対応',confirmed:'予約確定',done:'完了',cancelled:'キャンセル',contacted:'連絡済み',rejected:'見送り'};
function renderRequests(){
  const r=$('#reservationList');r.innerHTML=DATA.reservations.length?DATA.reservations.map(x=>`<article class="request-card"><div><h3>${esc(x.name)} 様</h3><div class="request-meta"><span>${new Date(x.createdAt).toLocaleString('ja-JP')}</span><span>${esc(x.date)} ${esc(x.time)}</span><span>${esc(x.people)}名</span>${x.vip?'<span>VIP希望</span>':''}</div><p>TEL: ${esc(x.phone)} / MAIL: ${esc(x.email||'-')}</p><p>指名: ${esc(x.cast||'指定なし')}</p>${x.message?`<p>${esc(x.message)}</p>`:''}</div><div class="request-actions"><select data-res-status="${esc(x.id)}">${['new','confirmed','done','cancelled'].map(s=>`<option value="${s}" ${x.status===s?'selected':''}>${statLabels[s]}</option>`).join('')}</select><button class="danger" data-res-delete="${esc(x.id)}">削除</button></div></article>`).join(''):'<p>予約はまだありません。</p>';
  const j=$('#recruitList');j.innerHTML=DATA.recruits.length?DATA.recruits.map(x=>`<article class="request-card"><div><h3>${esc(x.name)} 様</h3><div class="request-meta"><span>${new Date(x.createdAt).toLocaleString('ja-JP')}</span><span>年齢: ${esc(x.age||'-')}</span></div><p>TEL: ${esc(x.phone)} / MAIL: ${esc(x.email||'-')}</p>${x.experience?`<p>経験: ${esc(x.experience)}</p>`:''}${x.message?`<p>${esc(x.message)}</p>`:''}</div><div class="request-actions"><select data-job-status="${esc(x.id)}">${['new','contacted','done','rejected'].map(s=>`<option value="${s}" ${x.status===s?'selected':''}>${statLabels[s]}</option>`).join('')}</select><button class="danger" data-job-delete="${esc(x.id)}">削除</button></div></article>`).join(''):'<p>求人応募はまだありません。</p>';
  $$('[data-res-status]').forEach(el=>el.addEventListener('change',async()=>{await api(`/api/admin/reservations/${el.dataset.resStatus}`,{method:'PATCH',body:JSON.stringify({status:el.value})});DATA.reservations.find(x=>x.id===el.dataset.resStatus).status=el.value;toast('予約ステータスを更新しました')}));
  $$('[data-job-status]').forEach(el=>el.addEventListener('change',async()=>{await api(`/api/admin/recruits/${el.dataset.jobStatus}`,{method:'PATCH',body:JSON.stringify({status:el.value})});DATA.recruits.find(x=>x.id===el.dataset.jobStatus).status=el.value;updateStats();toast('応募ステータスを更新しました')}));
  $$('[data-res-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('この予約を削除しますか？'))return;await api(`/api/admin/reservations/${b.dataset.resDelete}`,{method:'DELETE'});DATA.reservations=DATA.reservations.filter(x=>x.id!==b.dataset.resDelete);renderRequests();toast('削除しました')}));
  $$('[data-job-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('この応募を削除しますか？'))return;await api(`/api/admin/recruits/${b.dataset.jobDelete}`,{method:'DELETE'});DATA.recruits=DATA.recruits.filter(x=>x.id!==b.dataset.jobDelete);renderRequests();updateStats();toast('削除しました')}));
}

function updateStats(){if($('#statCast'))$('#statCast').textContent=site.cast?.length||0;if($('#statToday'))$('#statToday').textContent=site.todayCast?.length||0;if($('#statNews'))$('#statNews').textContent=site.news?.length||0;if($('#statRecruit'))$('#statRecruit').textContent=DATA.recruits.filter(x=>x.status==='new').length;}
function renderAll(){normalizeSite();renderBase();renderCast();renderCastOps();renderPrices();renderNews();renderRequests();updateStats();}

$('#addCast').addEventListener('click',()=>{const c={id:uid('host'),rank:String(site.cast.length+1).padStart(2,'0'),name:'新しいホスト',roman:'New Host',shift:'21:00 - LAST',image:''};site.cast.push(c);renderCast();renderCastOps();updateStats();markDirty()});
$('#addPrice').addEventListener('click',()=>{site.system.push({id:uid('price'),label:'新しい料金項目',price:'¥0'});renderPrices();markDirty()});
$('#addNews').addEventListener('click',()=>{const d=new Date().toISOString().slice(0,10).replaceAll('-','.');site.news.unshift({id:uid('news'),date:d,category:'NEWS',text:'新しいお知らせ'});renderNews();updateStats();markDirty()});
$('#saveAllButton').addEventListener('click',async()=>{try{normalizeSite();site.event.description='__SITE_COPY__'+JSON.stringify(site.copy||{});const out=await api('/api/admin/site',{method:'PUT',body:JSON.stringify({site})});site=out.site;DATA.site=site;normalizeSite();$('#saveState').textContent='保存済み';toast('公開サイトに保存しました')}catch(err){toast(err.message)}});
function pickImage(cb){imageHandler=cb;$('#imagePicker').click()}
$('#imagePicker').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>8*1024*1024)throw new Error('画像は8MB以下にしてください');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(f)});const j=await api('/api/admin/upload',{method:'POST',body:JSON.stringify({name:f.name,type:f.type,data})});imageHandler?.(j.url);toast('画像をアップロードしました')}catch(err){toast(err.message)}e.target.value='';imageHandler=null});
authCheck().catch(()=>{});
