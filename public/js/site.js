let SITE = null;
const API_BASE = 'https://usqsewecifxrxixprqxa.supabase.co/functions/v1/artemis-host-api';
const q = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const apiUrl = action => `${API_BASE}?action=${encodeURIComponent(action)}`;

async function loadSite(){
  const res = await fetch(apiUrl('site'), { cache: 'no-store' });
  if(!res.ok) throw new Error('site load failed');
  SITE = await res.json();
  render();
}

function castId(c,i){return String(c?.id || `cast-${i}`)}
function castProfileUrl(c,i){return `/cast.html?id=${encodeURIComponent(castId(c,i))}`}
function castCard(c,i,{today=false,showNumber=true}={}){
  const placeholder=showNumber?(c.rank||String(i+1).padStart(2,'0')):'A';
  return `<article class="cast-card reveal">
    <div class="cast-photo"><a class="cast-photo-link" href="${castProfileUrl(c,i)}" aria-label="${esc(c.name)}のプロフィールを見る">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:`<span class="cast-placeholder">${esc(placeholder)}</span>`}</a></div>
    <div class="cast-meta">${showNumber?`<span class="rank">HOST ${esc(c.rank||String(i+1).padStart(2,'0'))}</span>`:''}<h3>${esc(c.name)}</h3><p>${esc(c.roman||'')}</p>${today?`<small>${esc(c.shift||'')}</small><span class="today-badge">TODAY</span>`:''}</div>
  </article>`;
}
function rankingCard(c,place,castIndex){
  if(!c)return `<article class="ranking-card ${place===1?'first':''}"><div class="ranking-empty"><div><strong>${place}</strong>未設定</div></div></article>`;
  return `<article class="ranking-card ${place===1?'first':''} reveal">
    <div class="ranking-photo"><a class="ranking-photo-link" href="${castProfileUrl(c,castIndex)}" aria-label="${esc(c.name)}のプロフィールを見る">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:'<span class="cast-placeholder">A</span>'}</a><span class="ranking-number">${place}</span><span class="ranking-label">TOP ${place}</span></div>
    <div class="ranking-meta"><h3>${esc(c.name)}</h3><p>${esc(c.roman||'')}</p></div>
  </article>`;
}

function render(){
  const b=SITE.brand||{};
  ['brandName','heroName','footerName'].forEach(id=>{const el=q('#'+id);if(el)el.textContent=b.name||'The Artemis'});
  if(q('#brandSubtitle'))q('#brandSubtitle').textContent=b.subtitle||'LUXURY HOST CLUB';
  if(q('#heroSubtitle'))q('#heroSubtitle').textContent=b.subtitle||'';
  if(q('#heroTagline'))q('#heroTagline').textContent=b.tagline||'';
  if(q('#heroIntro'))q('#heroIntro').textContent=b.intro||'';
  if(q('#heroImage'))q('#heroImage').src=b.heroImage||'/assets/hero-lounge.svg';
  document.title=`${b.name||'The Artemis'} | Luxury Host Club`;

  const cast=Array.isArray(SITE.cast)?SITE.cast:[];
  const byId=new Map(cast.map((c,i)=>[castId(c,i),c]));

  const rankingIds=Array.isArray(SITE.ranking)
    ? [0,1,2].map(i=>SITE.ranking[i]?String(SITE.ranking[i]):'')
    : cast.slice(0,3).map((c,i)=>castId(c,i));
  const ranking=[0,1,2].map(i=>rankingIds[i]?byId.get(rankingIds[i])||null:null);
  if(q('#rankingGrid'))q('#rankingGrid').innerHTML=ranking.map((c,i)=>rankingCard(c,i+1,c?cast.indexOf(c):i)).join('');

  let todayIds=Array.isArray(SITE.todayCast)?SITE.todayCast.map(String):null;
  if(todayIds===null)todayIds=cast.map((c,i)=>castId(c,i));
  const todayCast=todayIds.map(id=>byId.get(id)).filter(Boolean);
  if(q('#todayCastGrid'))q('#todayCastGrid').innerHTML=todayCast.length?todayCast.map(c=>castCard(c,cast.indexOf(c),{today:true,showNumber:false})).join(''):'<p class="empty-cast">本日の出勤ホストはまだ設定されていません。</p>';
  if(q('#allCastGrid'))q('#allCastGrid').innerHTML=cast.length?cast.map((c,i)=>castCard(c,i,{showNumber:false})).join(''):'<p class="empty-cast">在籍ホストはまだ登録されていません。</p>';

  if(q('#castSelect'))q('#castSelect').innerHTML='<option value="">指定なし</option>'+cast.map(c=>`<option>${esc(c.name)}</option>`).join('');

  const e=SITE.event||{};
  if(q('#eventTitle'))q('#eventTitle').textContent=e.title||'';
  if(q('#eventHeading'))q('#eventHeading').textContent=e.heading||'';
  if(q('#eventDescription'))q('#eventDescription').textContent=e.description||'';
  if(q('#eventDate'))q('#eventDate').textContent=e.date||'';

  if(q('#newsList'))q('#newsList').innerHTML=(SITE.news||[]).map(n=>`<article><time>${esc(n.date)}</time><span>${esc(n.category)}</span><p>${esc(n.text)}</p></article>`).join('');
  if(q('#priceList'))q('#priceList').innerHTML=(SITE.system||[]).map(p=>`<div><dt>${esc(p.label)}</dt><dd>${esc(p.price)}</dd></div>`).join('');

  const a=SITE.access||{};
  if(q('#accessInfo'))q('#accessInfo').innerHTML=[a.postal,a.address,a.route,`TEL. ${a.tel||''}`,a.hours].filter(Boolean).map(x=>`<p>${esc(x)}</p>`).join('');
  if(q('#reservationTel'))q('#reservationTel').textContent=a.tel?`TEL. ${a.tel}`:'';
  if(q('#mapLink'))q('#mapLink').href=a.mapUrl||'https://maps.google.com';

  const r=SITE.recruit||{};
  if(q('#recruitHeading'))q('#recruitHeading').textContent=r.heading||'';
  if(q('#recruitLead'))q('#recruitLead').textContent=r.lead||'';
  if(q('#recruitNote'))q('#recruitNote').textContent=r.note||'';

  const socials=SITE.socials||{};
  if(q('#socialLinks'))q('#socialLinks').innerHTML=[['Instagram',socials.instagram],['X',socials.x],['LINE',socials.line]].filter(x=>x[1]).map(([n,u])=>`<a href="${esc(u)}" target="_blank" rel="noreferrer">${n}</a>`).join('');
  observe();
}

function setReservationDateMin(){
  const input=q('#reservationForm input[name="date"]');
  if(!input)return;
  const now=new Date();
  const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  input.min=local;
}

function observe(){
  if(!('IntersectionObserver' in window)){document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));return;}
  const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target)}}),{threshold:.1});
  document.querySelectorAll('.reveal:not(.visible)').forEach(el=>o.observe(el));
}

document.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){const modal=q(`#${open.dataset.open}Modal`);if(modal?.showModal)modal.showModal()}if(e.target.matches('[data-close]'))e.target.closest('dialog')?.close();});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));

async function submitForm(form, action, success){
  const msg=form.querySelector('.form-message');if(msg){msg.classList.remove('error');msg.textContent='送信中…'}
  const data=Object.fromEntries(new FormData(form).entries());data.vip=form.elements.vip?.checked||false;
  try{const res=await fetch(apiUrl(action),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const out=await res.json();if(!res.ok)throw new Error(out.error||'送信できませんでした');if(msg)msg.textContent=success;form.reset();setTimeout(()=>form.closest('dialog')?.close(),1400);}catch(err){if(msg){msg.classList.add('error');msg.textContent=err.message}}
}
q('#reservationForm')?.addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'reservation','ご予約を受け付けました。お店からの連絡をお待ちください。')});
q('#recruitForm')?.addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'recruit','ご応募を受け付けました。ありがとうございます。')});
if(q('#year'))q('#year').textContent=new Date().getFullYear();
setReservationDateMin();
loadSite().catch(()=>{if(q('#heroIntro'))q('#heroIntro').textContent='サイト情報を読み込めませんでした。';observe();});
