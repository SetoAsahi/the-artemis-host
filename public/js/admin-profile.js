renderCast=function(){
  const root=$('#castEditor');
  root.innerHTML=(site.cast||[]).map((c,i)=>`<article class="edit-card" data-cast-index="${i}"><div class="thumb">${c.image?`<img src="${esc(c.image)}">`:'A'}</div><div class="fields"><input data-k="name" value="${esc(c.name)}" placeholder="名前"><input data-k="roman" value="${esc(c.roman)}" placeholder="英字名"><textarea data-k="bio" placeholder="紹介ページに表示する紹介文" style="grid-column:1/-1;min-height:100px;padding:11px 12px;background:#070605;border:1px solid rgba(205,167,95,.28);color:white;resize:vertical">${esc(c.bio||'')}</textarea><div class="card-actions"><button type="button" class="upload" data-photo>画像変更</button><button type="button" class="danger" data-delete>削除</button></div></div></article>`).join('');
  $$('[data-cast-index]').forEach(card=>{
    const i=+card.dataset.castIndex;
    card.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{site.cast[i][el.dataset.k]=el.value;if(el.dataset.k==='name')renderCastOps();markDirty()}));
    card.querySelector('[data-photo]').addEventListener('click',()=>pickImage(url=>{site.cast[i].image=url;renderCast();markDirty()}));
    card.querySelector('[data-delete]').addEventListener('click',()=>{if(!confirm('このキャストを削除しますか？'))return;const id=String(site.cast[i].id);site.cast.splice(i,1);site.todayCast=site.todayCast.filter(x=>String(x)!==id);site.ranking=site.ranking.map(x=>String(x)===id?'':x);renderCast();renderCastOps();updateStats();markDirty()});
  });
};