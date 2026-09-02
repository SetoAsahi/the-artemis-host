const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT,'public');
const PORT = Number(process.env.PORT || 3000);
const EDGE_URL = process.env.SUPABASE_FUNCTION_URL || 'https://usqsewecifxrxixprqxa.supabase.co/functions/v1/artemis-host-api';
const ARTEMIS_ADMIN_SECRET = process.env.ARTEMIS_ADMIN_SECRET || '';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function headers(res,status,extra={}){res.writeHead(status,{'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Cache-Control':'no-store',...extra});}
function json(res,status,data){const b=Buffer.from(JSON.stringify(data));headers(res,status,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length});res.end(b)}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')).filter(x=>x.length===2));}
function secureEqual(a,b){const ah=crypto.createHash('sha256').update(String(a)).digest();const bh=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(ah,bh)}
function sessionKey(){return crypto.createHash('sha256').update(`the-artemis-session:${ADMIN_PASSWORD}`).digest();}
function createSessionToken(){const exp=Date.now()+12*60*60*1000;const nonce=crypto.randomBytes(16).toString('hex');const payload=`${exp}.${nonce}`;const sig=crypto.createHmac('sha256',sessionKey()).update(payload).digest('hex');return `${payload}.${sig}`;}
function verifySessionToken(token){if(!ADMIN_PASSWORD||!token)return false;const parts=String(token).split('.');if(parts.length!==3)return false;const [expRaw,nonce,sig]=parts;const exp=Number(expRaw);if(!Number.isFinite(exp)||exp<=Date.now()||!nonce||!/^[a-f0-9]{64}$/i.test(sig))return false;const payload=`${expRaw}.${nonce}`;const expected=crypto.createHmac('sha256',sessionKey()).update(payload).digest('hex');try{return crypto.timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(expected,'hex'));}catch{return false;}}
function isAdmin(req){return verifySessionToken(cookies(req)['artemis.sid']);}
function cookieHeader(req,token,maxAge){const secure=(req.headers['x-forwarded-proto']==='https'||process.env.NODE_ENV==='production')?'; Secure':'';return `artemis.sid=${token}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/${secure}`;}
async function bodyBuffer(req,max=12*1024*1024){return new Promise((resolve,reject)=>{let n=0,parts=[];req.on('data',c=>{n+=c.length;if(n>max){reject(Object.assign(new Error('too large'),{status:413}));req.destroy();return}parts.push(c)});req.on('end',()=>resolve(Buffer.concat(parts)));req.on('error',reject)});}
async function bodyJson(req,max){const b=await bodyBuffer(req,max);try{return b.length?JSON.parse(b.toString('utf8')):{}}catch{throw Object.assign(new Error('bad json'),{status:400})}}
function mime(file){return ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon'})[path.extname(file).toLowerCase()]||'application/octet-stream'}
async function sendFile(res,file){try{const st=await fsp.stat(file);if(!st.isFile())throw 0;headers(res,200,{'Content-Type':mime(file),'Content-Length':st.size,'Cache-Control':file.endsWith('.html')?'no-store':'public, max-age=3600'});fs.createReadStream(file).pipe(res)}catch{json(res,404,{error:'Not found'})}}
async function edge(action,method='GET',payload=null,admin=false){const h={'content-type':'application/json'};if(admin){if(!ARTEMIS_ADMIN_SECRET)throw new Error('ARTEMIS_ADMIN_SECRET is not configured');h['x-artemis-admin-secret']=ARTEMIS_ADMIN_SECRET;}const r=await fetch(`${EDGE_URL}?action=${encodeURIComponent(action)}`,{method,headers:h,body:payload==null?undefined:JSON.stringify(payload)});const text=await r.text();let data;try{data=text?JSON.parse(text):{}}catch{data={error:text||'Upstream error'}};if(!r.ok){const e=new Error(data.error||'Upstream error');e.status=r.status;throw e}return data}

async function api(req,res,url){
  if(req.method==='GET'&&url.pathname==='/api/site') return json(res,200,await edge('site'));
  if(req.method==='POST'&&url.pathname==='/api/reservations') return json(res,201,await edge('reservation','POST',await bodyJson(req)));
  if(req.method==='POST'&&url.pathname==='/api/recruit') return json(res,201,await edge('recruit','POST',await bodyJson(req)));
  if(req.method==='POST'&&url.pathname==='/api/admin/login'){
    const b=await bodyJson(req,64*1024); if(!ADMIN_PASSWORD)return json(res,503,{error:'管理者パスワードが未設定です'});
    if(!secureEqual(b.user||'',ADMIN_USER)||!secureEqual(b.password||'',ADMIN_PASSWORD))return json(res,401,{error:'ユーザー名またはパスワードが違います'});
    const token=createSessionToken();headers(res,200,{'Content-Type':'application/json; charset=utf-8','Set-Cookie':cookieHeader(req,token,43200)});return res.end(JSON.stringify({ok:true}));
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/logout'){headers(res,200,{'Content-Type':'application/json; charset=utf-8','Set-Cookie':cookieHeader(req,'',0)});return res.end(JSON.stringify({ok:true}));}
  if(req.method==='GET'&&url.pathname==='/api/admin/me') return json(res,200,{authenticated:isAdmin(req)});
  if(url.pathname.startsWith('/api/admin/')&&!isAdmin(req))return json(res,401,{error:'認証が必要です'});
  if(req.method==='GET'&&url.pathname==='/api/admin/data')return json(res,200,await edge('admin-data','GET',null,true));
  if(req.method==='PUT'&&url.pathname==='/api/admin/site')return json(res,200,await edge('save-site','PUT',await bodyJson(req),true));
  if(req.method==='POST'&&url.pathname==='/api/admin/upload')return json(res,201,await edge('upload','POST',await bodyJson(req,12*1024*1024),true));
  let m=url.pathname.match(/^\/api\/admin\/reservations\/([^/]+)$/);if(m&&req.method==='PATCH')return json(res,200,await edge('reservation-status','PATCH',{id:decodeURIComponent(m[1]),...(await bodyJson(req))},true));if(m&&req.method==='DELETE')return json(res,200,await edge('reservation-delete','DELETE',{id:decodeURIComponent(m[1])},true));
  m=url.pathname.match(/^\/api\/admin\/recruits\/([^/]+)$/);if(m&&req.method==='PATCH')return json(res,200,await edge('recruit-status','PATCH',{id:decodeURIComponent(m[1]),...(await bodyJson(req))},true));if(m&&req.method==='DELETE')return json(res,200,await edge('recruit-delete','DELETE',{id:decodeURIComponent(m[1])},true));
  return json(res,404,{error:'Not found'});
}

async function handler(req,res){try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);if(url.pathname==='/admin'||url.pathname==='/admin/')return sendFile(res,path.join(PUBLIC_DIR,'admin.html'));let rel=decodeURIComponent(url.pathname);if(rel==='/'||rel==='')rel='/index.html';const file=path.resolve(PUBLIC_DIR,'.'+rel);if(file!==PUBLIC_DIR&&!file.startsWith(PUBLIC_DIR+path.sep))return json(res,403,{error:'Forbidden'});return sendFile(res,file)}catch(e){console.error(e);if(!res.headersSent)json(res,e.status||500,{error:e.status===413?'データが大きすぎます':e.message||'サーバーエラー'})}}

http.createServer(handler).listen(PORT,'0.0.0.0',()=>console.log(`The Artemis: http://localhost:${PORT}`));
