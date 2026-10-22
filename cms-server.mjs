import {partners} from './partners.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {root,dataDirectory,contentFile,readStore,writeStore} from './content-store.mjs';
import {services} from './content.mjs';
import defaultSettings from './site.config.mjs';
import {mapLocations,projectMapLocation} from './geography.mjs';
import {publicMailSettings,saveMailSettings,verifyMailConnection,validateInquiry,sendInquiryMail} from './mail.mjs';

const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
const error=(status,message)=>Object.assign(new Error(message),{status});
const text=(value,max=5000)=>String(value??'').trim().slice(0,max);
const pairs=(value,max=40)=>Array.isArray(value)?value.slice(0,max).filter(Array.isArray).map(([a,b])=>[text(a,300),text(b,30000)]).filter(([a,b])=>a&&b):[];
const lines=value=>Array.isArray(value)?value.map(v=>text(v,1500)).filter(Boolean).slice(0,80):[];
const cookieName='aeron_admin';
function transliterate(value){const ru='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',en=['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','c','ch','sh','sch','','y','','e','yu','ya'];return [...value.toLowerCase()].map(c=>ru.includes(c)?en[ru.indexOf(c)]:c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);}
function imagePath(value,publicRoot){const file=text(value,300);if(!file)return '';if(!/^assets\/(images|uploads)\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g)$/i.test(file)||file.includes('..')||!fs.existsSync(path.join(publicRoot,file)))throw error(400,'Изображение не найдено. Загрузите файл заново.');return file;}
function validateRecord(kind,input,old,publicRoot){
 const result={id:old?.id||crypto.randomUUID(),slug:old?.slug||transliterate(input.slug||input.title),title:text(input.title,250),status:input.status==='published'?'published':'draft',updatedAt:new Date().toISOString()};
 if(!result.title)throw error(400,'Укажите заголовок.');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug))throw error(400,'Адрес страницы: латинские буквы, цифры и дефисы.');
 if(old?.publishedAt)result.publishedAt=old.publishedAt;else if(result.status==='published')result.publishedAt=new Date().toISOString().slice(0,10);
 const service=text(input.service,100);if(!services.some(s=>s.slug===service)&&!(kind==='articles'&&service==='kottedzhi'))throw error(400,'Выберите связанное направление.');result.service=service;
 if(kind==='articles'){
  Object.assign(result,{excerpt:text(input.excerpt,3000),tag:text(input.tag,80)||'Строительство',category:['design','build','engineering','private','management'].includes(input.category)?input.category:'build',minutes:Math.max(1,Math.min(60,Number(input.minutes)||5)),sections:pairs(input.sections),faq:pairs(input.faq,12),image:imagePath(input.image,publicRoot),imageAlt:text(input.imageAlt,300)});
  if(result.status==='published'&&!result.sections.length)throw error(400,'Добавьте хотя бы один текстовый блок статьи.');
 }else{
  Object.assign(result,{region:text(input.region,200),type:text(input.type,160),fact:text(input.fact,160),role:text(input.role,600),text:text(input.text,15000),story:lines(input.story),works:lines(input.works),facts:pairs(input.facts,25),category:['industry','commercial','agro','reconstruction'].includes(input.category)?input.category:'industry',cover:imagePath(input.cover,publicRoot),source:old?.source||false});
  result.client=text(input.client??old?.client??'',80);if(result.client&&!partners.some(p=>p.id===result.client))throw error(400,'Выберите компанию из списка.');result.clients=Array.isArray(input.clients??old?.clients)?(input.clients??old.clients).filter(id=>partners.some(p=>p.id===id)):[];
  result.mapLocation=text(input.mapLocation??old?.mapLocation??projectMapLocation(old||input),80);if(result.mapLocation&&!mapLocations.some(p=>p.id===result.mapLocation))throw error(400,'Выберите город или регион на карте.');
  result.gallery=(Array.isArray(input.gallery)?input.gallery:[]).slice(0,100).map(p=>({src:imagePath(p.src,publicRoot),preview:imagePath(p.preview||p.src,publicRoot),width:Math.max(1,Number(p.width)||1600),height:Math.max(1,Number(p.height)||1000),alt:text(p.alt,300)||result.title})).filter(p=>p.src);
  if(!result.cover&&result.gallery.length)result.cover=result.gallery[0].src;
  if(result.cover&&!result.gallery.length)result.gallery=[{src:result.cover,preview:result.cover,width:1600,height:1000,alt:result.title}];
  if(result.status==='published'&&(!result.region||!result.type||!result.role||!result.text))throw error(400,'Для публикации объекта заполните регион, тип, выполненные работы и описание.');
 }return result;
}
function validateSettings(input){
 const fields=['phone','phoneSales','email','address','hours','legalName','inn','kpp','ogrn','legalAddress','bankName','settlementAccount','correspondentAccount','bik','siteUrl'];
 const result=Object.fromEntries(fields.map(key=>[key,text(input[key],key.includes('Address')||key==='address'?700:200)]));
 for(const [key,lengths] of [['inn',[10,12]],['kpp',[9]],['ogrn',[13,15]],['bik',[9]],['settlementAccount',[20]],['correspondentAccount',[20]]])if(result[key]&&(!/^\d+$/.test(result[key])||!lengths.includes(result[key].length)))throw error(400,'Проверьте количество цифр в поле «'+key+'».');
 if(result.siteUrl&&!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(result.siteUrl))throw error(400,'Домен указывается как https://example.ru без пути и завершающего слеша.');
 result.geographyCounts={};
 for(const location of mapLocations){const value=input.geographyCounts?.[location.id];if(value===null||value===undefined||(typeof value==='string'&&!value.trim())){result.geographyCounts[location.id]=null;continue;}const count=Number(value);if(!['number','string'].includes(typeof value)||!Number.isInteger(count)||count<0||count>100000)throw error(400,'Количество объектов должно быть целым числом от 0 до 100 000.');result.geographyCounts[location.id]=count;}
 result.demoContacts=Boolean(input.demoContacts);return result;
}
function rebuild(){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['build.mjs'],{cwd:root,windowsHide:true,env:process.env});let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);child.on('error',reject);child.on('close',code=>code?reject(new Error('Сборка сайта: '+output.slice(-1500))):resolve());});}
async function readBody(req,max=2_000_000){let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>max)throw error(413,'Файл или запрос слишком большой.');parts.push(part);}return Buffer.concat(parts);}
async function jsonBody(req,max=2_000_000){if(!String(req.headers['content-type']).startsWith('application/json'))throw error(415,'Ожидаются данные JSON.');try{return JSON.parse((await readBody(req,max)).toString('utf8'));}catch(e){if(e.status)throw e;throw error(400,'Не удалось прочитать данные.');}}
function sniffImage(buffer){if(buffer.length>32&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';if(buffer.length>12&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpg';if(buffer.length>20&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';throw error(400,'Поддерживаются только изображения PNG, JPEG и WebP.');}

export function createSiteServer({publicRoot=root,rebuildSite=rebuild,deliverInquiry=sendInquiryMail}={}){
 const sessions=new Map(),attempts=new Map(),inquiryAttempts=new Map();let queue=Promise.resolve();const authFile=path.join(dataDirectory,'auth.json');
 if(!fs.existsSync(contentFile))writeStore(readStore(),{backup:false});
 const serialized=job=>{const next=queue.then(job);queue=next.catch(()=>{});return next;};
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(value));};
 const session=req=>{const id=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);const item=sessions.get(id);if(item&&item.expires>Date.now())return {id,...item};if(id)sessions.delete(id);return null;};
 const newSession=(req,res)=>{const id=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');sessions.set(id,{csrf,expires:Date.now()+8*60*60*1000});res.setHeader('Set-Cookie',`${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.AERON_SECURE_COOKIES==='1'?'; Secure':''}`);return csrf;};
 const sameOrigin=req=>{let origin;try{origin=new URL(req.headers.origin);}catch{throw error(403,'Обновите страницу админки и повторите действие.');}if(origin.host!==req.headers.host)throw error(403,'Запрос с другого сайта отклонён.');};
 async function changeStore(mutator){return serialized(async()=>{const previous=readStore(),next=structuredClone(previous);const result=mutator(next);writeStore(next);try{await rebuildSite();}catch(e){writeStore(previous,{backup:false});try{await rebuildSite();}catch{}console.error(e);throw error(500,'Изменения не опубликованы: сборка не завершилась. Предыдущие данные восстановлены.');}return result;});}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');let pathname;
  try{
   const hostname=new URL('http://'+req.headers.host).hostname;
   const trusted=new Set(['127.0.0.1','localhost','[::1]',...(process.env.AERON_ALLOWED_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean)]);
   const siteUrl=readStore().settings?.siteUrl;if(siteUrl)trusted.add(new URL(siteUrl).hostname);
   if(!trusted.has(hostname)){res.writeHead(403).end('Недопустимый адрес сервера.');return;}
   pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  }catch{res.writeHead(400).end();return;}
  try{
   if(pathname==='/api/inquiries'){
    if(req.method!=='POST'){res.writeHead(405,{'Allow':'POST'}).end();return;}
    sameOrigin(req);
    const now=Date.now(),key=req.socket.remoteAddress;
    for(const [ip,value] of inquiryAttempts)if(value.until<=now)inquiryAttempts.delete(ip);
    const attempt=inquiryAttempts.get(key);
    if(attempt&&attempt.count>=5)throw error(429,'Слишком много обращений. Повторите попытку через 15 минут.');
    const inquiry=validateInquiry(await jsonBody(req,30000));
    inquiryAttempts.set(key,{count:(attempt?.count||0)+1,until:attempt?.until||now+15*60*1000});
    const recipient=readStore().settings?.email||defaultSettings.email;
    await deliverInquiry(inquiry,{recipient});
    send(res,200,{ok:true,message:'Заявка отправлена. Спасибо за обращение.'});return;
   }
   if(pathname.startsWith('/api/admin/')){
    res.setHeader('Cache-Control','no-store');const current=session(req),method=req.method;
    if(method==='GET'&&pathname==='/api/admin/session'){send(res,200,{authenticated:!!current,setupRequired:!fs.existsSync(authFile),csrf:current?.csrf});return;}
    if(method!=='GET'){sameOrigin(req);if(!['/api/admin/login','/api/admin/setup'].includes(pathname)&&(!current||req.headers['x-csrf-token']!==current.csrf))throw error(403,'Сессия завершена. Войдите в админку заново.');}
    if(method==='POST'&&pathname==='/api/admin/setup'){
     if(fs.existsSync(authFile))throw error(409,'Пароль уже задан. Войдите в админку.');if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))throw error(403,'Первый пароль задаётся локально на сервере.');
     const {password}=await jsonBody(req);if(typeof password!=='string'||password.length<12||password.length>200)throw error(400,'Пароль должен содержать от 12 до 200 символов.');
     const salt=crypto.randomBytes(24).toString('hex'),hash=crypto.scryptSync(password,salt,64).toString('hex');fs.mkdirSync(dataDirectory,{recursive:true});fs.writeFileSync(authFile,JSON.stringify({salt,hash}),{flag:'wx',mode:0o600});send(res,200,{csrf:newSession(req,res)});return;
    }
    if(method==='POST'&&pathname==='/api/admin/login'){
     const key=req.socket.remoteAddress,attempt=attempts.get(key);if(attempt?.until>Date.now()&&attempt.count>=8)throw error(429,'Слишком много попыток. Повторите через 15 минут.');const {password}=await jsonBody(req);const auth=fs.existsSync(authFile)?JSON.parse(fs.readFileSync(authFile,'utf8')):null;
     const valid=typeof password==='string'&&password.length<=200&&auth&&crypto.timingSafeEqual(crypto.scryptSync(password,auth.salt,64),Buffer.from(auth.hash,'hex'));
     if(!valid){attempts.set(key,{count:attempt?.until>Date.now()?attempt.count+1:1,until:Date.now()+15*60*1000});throw error(401,'Неверный пароль.');}attempts.delete(key);send(res,200,{csrf:newSession(req,res)});return;
    }
    if(!current)throw error(401,'Войдите в админку.');
    if(method==='POST'&&pathname==='/api/admin/logout'){sessions.delete(current.id);res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);send(res,200,{ok:true});return;}
    if(method==='GET'&&pathname==='/api/admin/content'){const store=readStore();send(res,200,{...store,projects:store.projects.map(p=>({...p,mapLocation:projectMapLocation(p)})),services:services.map(({slug,title})=>({slug,title})),partners:partners.map(({id,name})=>({id,name})),mapLocations:mapLocations.map(({id,name})=>({id,name})),defaults:defaultSettings});return;}
    if(method==='GET'&&pathname==='/api/admin/mail'){send(res,200,publicMailSettings(readStore().settings?.email||defaultSettings.email));return;}
    if(method==='POST'&&pathname==='/api/admin/mail'){saveMailSettings(await jsonBody(req,10000));send(res,200,{ok:true});return;}
    if(method==='POST'&&pathname==='/api/admin/mail/verify'){await verifyMailConnection();send(res,200,{ok:true,message:'Подключение к почте проверено.'});return;}
    if(method==='POST'&&pathname==='/api/admin/upload'){const bytes=await readBody(req,12*1024*1024),extension=sniffImage(bytes),name=crypto.randomUUID()+'.'+extension,folder=path.join(publicRoot,'assets','uploads');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,name),bytes,{flag:'wx'});send(res,201,{src:'assets/uploads/'+name,preview:'assets/uploads/'+name,width:1600,height:1000,alt:''});return;}
    if(method==='POST'&&pathname==='/api/admin/settings'){const input=await jsonBody(req),settings=validateSettings(input);await changeStore(store=>{store.settings=settings;});send(res,200,{ok:true});return;}
    const match=pathname.match(/^\/api\/admin\/(articles|projects)$/);
    if(method==='POST'&&match){const kind=match[1],input=await jsonBody(req);let saved;await changeStore(store=>{const index=store[kind].findIndex(x=>x.id===input.id),old=index>=0?store[kind][index]:null;if(old&&input.updatedAt!==old.updatedAt)throw error(409,'Материал уже изменён в другом окне. Откройте его заново.');saved=validateRecord(kind,input,old,publicRoot);if(store[kind].some(x=>x.slug===saved.slug&&x.id!==saved.id))throw error(409,'Такой адрес страницы уже занят.');if(index>=0)store[kind][index]=saved;else store[kind].unshift(saved);});send(res,200,{record:saved,url:'/'+kind+'/'+saved.slug+'/index.html'});return;}
    throw error(404,'Неизвестное действие.');
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
   const allowed=/^\/(?:$|index\.html$|404\.html$|(?:styles|business|portfolio|revisions)\.css$|script\.js$|robots\.txt$|sitemap\.xml$|(?:assets|about|articles|business|contacts|development|news|privacy|consent|cookies|projects|services|sitemap|technologies|admin)(?:\/|$))/;
   if(!allowed.test(pathname)||pathname.includes('..')){res.writeHead(404).end('Страница не найдена');return;}
   let file=path.resolve(publicRoot,'.'+pathname);if(!file.startsWith(publicRoot+path.sep)&&file!==publicRoot)throw error(403,'Доступ запрещён.');if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
   if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}).end(fs.existsSync(path.join(publicRoot,'404.html'))?fs.readFileSync(path.join(publicRoot,'404.html')):'Страница не найдена');return;}
   if(!types[path.extname(file)]){res.writeHead(404).end();return;}
   if(pathname.startsWith('/admin')){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");}else if(path.extname(file)==='.html')res.setHeader('Cache-Control','no-cache');
   res.writeHead(200,{'Content-Type':types[path.extname(file)]});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Не удалось выполнить действие. Повторите попытку.'});else res.end();if(!e.status)console.error(e);}
 });return server;
}
