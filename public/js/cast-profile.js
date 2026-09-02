const API='https://usqsewecifxrxixprqxa.supabase.co/functions/v1/artemis-host-api?action=site';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const castId=(c,i)=>String(c?.id||`cast-${i}`);
async function loadProfile(){
  const id=new URLSearchParams(location.search).get('id');
  const res=await fetch(API,{cache:'no-store'});
  if(!res.ok)throw new Error('load failed');
  const site=await res.json();
  const cast=Array.isArray(site.cast)?site.cast:[];
  const index=cast.findIndex((c,i)=>castId(c,i)===String(id||''));
  if(index<0)throw new Error('not found');
  const c=cast[index];
  const brand=site.brand?.name||'The Artemis';
  $('#profileBrand').textContent=brand;
  document.title=`${c.name||'HOST'} | ${brand}`;
  $('#profileName').textContent=c.name||'';
  $('#profileRoman').textContent=c.roman||'';
  $('#profileBio').textContent=c.bio?.trim()||`${brand}に在籍するホストです。`;
  $('#profileImageWrap').innerHTML=c.image?`<img src="${esc(c.image)}" alt="${esc(c.name||'HOST')}">`:'<div class="profile-placeholder">A</div>';
  const todaySet=new Set((Array.isArray(site.todayCast)?site.todayCast:[]).map(String));
  if(todaySet.has(castId(c,index))){$('#profileToday').hidden=false;$('#profileTodayBadge').hidden=false;$('#profileShift').textContent=c.shift||'出勤時間未設定';}
  $('#profileContent').hidden=false;
}
$('#year').textContent=new Date().getFullYear();
loadProfile().catch(()=>{$('#profileError').hidden=false;});
