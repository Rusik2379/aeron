import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

// Isolated data and injected delivery: these checks never send external email.
process.env.AERON_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'aeron-mail-test-'));
for(const key of ['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_FROM','SMTP_PASSWORD'])delete process.env[key];
const {createSiteServer}=await import('./cms-server.mjs');
const {validateInquiry,sendInquiryMail,readMailSettings,consentVersion}=await import('./mail.mjs');
let checks=0,delivered=[],deliveryError=false,cookie='',csrf='';
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const server=createSiteServer({rebuildSite:async()=>{},deliverInquiry:async(inquiry,options)=>{if(deliveryError)throw Object.assign(new Error('Проверочная ошибка доставки'),{status:502});delivered.push({inquiry,options});}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const valid={name:'Проверка формы',contact:'client@example.com',task:'Нужен производственный цех площадью 1000 м².',consent:'yes',consentVersion,source:'/services/cehi/',website:''};
async function request(route,{body,method=body!==undefined?'POST':'GET',headers={}}={}){
 const response=await fetch(origin+route,{method,headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 return {status:response.status,response,data:response.headers.get('content-type')?.includes('json')?await response.json():await response.text()};
}
try{
 check((await request('/api/inquiries')).status===405,'Only POST accepted');
 check((await request('/api/inquiries',{body:valid,headers:{Origin:'https://elsewhere.example'}})).status===403,'Cross-origin inquiries rejected');
 for(const body of [null,[],{...valid,consent:''},{...valid,consentVersion:'old'},{...valid,contact:'invalid'},{...valid,task:'short'},{...valid,website:'spam'}])check((await request('/api/inquiries',{body})).status===400,'Invalid inquiry rejected');
 check((await request('/api/inquiries',{body:{...valid,task:'x'.repeat(31000)}})).status===413,'Oversized body rejected');
 const sent=await request('/api/inquiries',{body:{...valid,recipient:'attacker@example.com'}});
 check(sent.status===200&&sent.data.ok===true&&delivered.length===1,'Success follows completed delivery');
 check(delivered[0].options.recipient==='info@aeron.ru'&&!('recipient' in delivered[0].inquiry),'Recipient fixed on server');
 check(delivered[0].inquiry.receivedAt&&delivered[0].inquiry.consentVersion===consentVersion,'Consent and server timestamp recorded');
 deliveryError=true;const failed=await request('/api/inquiries',{body:valid});
 check(failed.status===502&&!failed.data.ok,'Delivery failure never reports success');deliveryError=false;
 await request('/api/inquiries',{body:valid});await request('/api/inquiries',{body:valid});await request('/api/inquiries',{body:valid});
 check((await request('/api/inquiries',{body:valid})).status===429,'Rate limit enforced');

 check((await request('/api/admin/mail')).status===401,'Anonymous SMTP settings denied');
 const setup=await request('/api/admin/setup',{body:{password:crypto.randomBytes(24).toString('hex')}});
 cookie=setup.response.headers.get('set-cookie').split(';')[0];csrf=setup.data.csrf;
 const initial=(await request('/api/admin/mail')).data;
 check(initial.host==='smtp.mail.ru'&&initial.port===465&&initial.secure&&initial.user==='info@aeron.ru'&&!initial.hasPassword,'VK WorkSpace defaults without secret');
 check((await request('/api/admin/mail/verify',{body:{}})).status===503,'No connection claimed without password');
 check((await request('/api/admin/mail',{body:initial,headers:{'X-CSRF-Token':''}})).status===403,'SMTP changes protected by CSRF');
 check((await request('/api/admin/mail',{body:{...initial,host:'https://bad/path'}})).status===400,'Invalid SMTP host rejected');
 const secret=crypto.randomBytes(24).toString('hex');
 check((await request('/api/admin/mail',{body:{...initial,password:secret}})).status===200,'Private SMTP settings saved');
 const settings=await request('/api/admin/mail');
 check(settings.data.hasPassword&&!('password' in settings.data)&&!JSON.stringify(settings.data).includes(secret),'Password never returned');
 await request('/api/admin/mail',{body:{...initial,password:''}});
 check(readMailSettings().password===secret,'Empty password field preserves secret');
 check(!JSON.stringify((await request('/api/admin/content')).data).includes(secret),'Secret absent from content API');
 for(const route of ['/data/mail.json','/mail.mjs','/package-lock.json'])check((await request(route)).status===404,'Private file blocked: '+route);

 const inquiry=validateInquiry(valid);let message;
 await sendInquiryMail(inquiry,{recipient:'info@aeron.ru',transport:{sendMail:async input=>{message=input;return {accepted:['info@aeron.ru'],messageId:'test-message'};}}});
 check(message.to==='info@aeron.ru'&&message.from.address==='info@aeron.ru'&&message.replyTo.address===valid.contact,'Mail envelope uses configured mailbox');
 check(message.text.includes(valid.task)&&message.text.includes(consentVersion)&&message.text.includes(valid.source),'Mail includes request, source and consent');
 await sendInquiryMail(validateInquiry({...valid,contact:'+7 (929) 310-97-98'}),{recipient:'info@aeron.ru',transport:{sendMail:async input=>{message=input;return {accepted:['info@aeron.ru']};}}});
 check(!message.replyTo,'Phone contact is not an email header');
 await assert.rejects(sendInquiryMail(inquiry,{recipient:'info@aeron.ru',transport:{sendMail:async()=>({accepted:[]})}}),error=>error.status===502);checks++;
 await assert.rejects(sendInquiryMail(inquiry,{recipient:'a@example.com,b@example.com',transport:{sendMail:async()=>{throw Error('must not send');}}}),error=>error.status===503);checks++;
 console.log(JSON.stringify({mailChecks:checks,externalEmailsSent:0,errors:[]},null,2));
}finally{await new Promise(resolve=>server.close(resolve));}
