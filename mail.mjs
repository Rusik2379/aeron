import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import {dataDirectory} from './content-store.mjs';

const mailFile=path.join(dataDirectory,'mail.json');
const fail=(status,message)=>Object.assign(new Error(message),{status});
const email=value=>/^[^\s@<>,;\r\n]+@[^\s@<>,;\r\n]+\.[^\s@<>,;\r\n]+$/.test(value);
export const consentVersion='2026-10-21';
export function readMailSettings(){
 const saved=fs.existsSync(mailFile)?JSON.parse(fs.readFileSync(mailFile,'utf8')):{};
 return {host:process.env.SMTP_HOST||saved.host||'smtp.mail.ru',port:Number(process.env.SMTP_PORT||saved.port)||465,secure:process.env.SMTP_SECURE!==undefined?process.env.SMTP_SECURE==='true':saved.secure!==undefined?saved.secure:true,user:process.env.SMTP_USER||saved.user||'info@aeron.ru',sender:process.env.SMTP_FROM||saved.sender||'info@aeron.ru',password:process.env.SMTP_PASSWORD||saved.password||''};
}
export function publicMailSettings(recipient){const {password,...settings}=readMailSettings();return {...settings,recipient,hasPassword:!!password,ready:!!(settings.host&&settings.user&&password),environmentConfigured:!!process.env.SMTP_HOST};}
export function saveMailSettings(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'Проверьте настройки почты.');
 const old=readMailSettings(),host=String(input.host||'').trim(),port=Number(input.port),user=String(input.user||'').trim(),sender=String(input.sender||'').trim();
 if(!/^[a-z0-9.-]+$/i.test(host)||host.length>253)throw fail(400,'Укажите имя SMTP-сервера без протокола и пути.');
 if(!Number.isInteger(port)||port<1||port>65535)throw fail(400,'Укажите корректный SMTP-порт.');
 if(!email(user)||!email(sender))throw fail(400,'Логин и адрес отправителя должны быть адресами почты.');
 const password=typeof input.password==='string'&&input.password?input.password:old.password;
 if(password.length>1000)throw fail(400,'Пароль слишком длинный.');
 const value={host,port,secure:Boolean(input.secure),user,sender,password};
 fs.mkdirSync(dataDirectory,{recursive:true});const temp=mailFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(temp,mailFile);
 return value;
}
function smtpTransport(){
 const settings=readMailSettings();
 if(!settings.host||!settings.user||!settings.password)throw fail(503,'Отправка временно недоступна. Свяжитесь с нами по телефону или почте.');
 return nodemailer.createTransport({host:settings.host,port:settings.port,secure:settings.secure,requireTLS:!settings.secure,tls:{minVersion:'TLSv1.2'},auth:{user:settings.user,pass:settings.password},connectionTimeout:10000,greetingTimeout:8000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
}
export async function verifyMailConnection(){const transport=smtpTransport();try{await transport.verify();}catch{throw fail(502,'Не удалось подключиться к почте. Проверьте SMTP-сервер, порт и пароль внешнего приложения.');}finally{transport.close();}}
export function validateInquiry(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'Проверьте поля заявки.');
 if(input.website)throw fail(400,'Не удалось отправить обращение. Обновите страницу и повторите попытку.');
 const clean=(key,max)=>{if(typeof input[key]!=='string'||input[key].length>max)throw fail(400,'Проверьте поля заявки.');return input[key].trim();};
 const name=clean('name',100),contact=clean('contact',200),task=clean('task',5000);
 if(name.length<2||task.length<10||(!email(contact)&&!(contact.replace(/\D/g,'').length>=7&&/^[+\d\s().-]+$/.test(contact))))throw fail(400,'Укажите имя, телефон или e-mail и описание задачи.');
 if(input.consent!=='yes'||input.consentVersion!==consentVersion)throw fail(400,'Подтвердите согласие на обработку данных. Если страница давно открыта, обновите её.');
 return {name,contact,task,consentVersion,receivedAt:new Date().toISOString(),source:String(input.source||'/').replace(/[\r\n]/g,'').slice(0,300)};
}
export async function sendInquiryMail(inquiry,{recipient,transport}={}){
 if(!email(recipient||''))throw fail(503,'Отправка временно недоступна. Свяжитесь с нами по телефону или почте.');
 const settings=readMailSettings(),sender=transport||smtpTransport();
 const message={from:{name:'АЭРОН — заявки с сайта',address:settings.sender},to:recipient,...(email(inquiry.contact)?{replyTo:{name:inquiry.name,address:inquiry.contact}}:{}),subject:'Новая заявка с сайта АЭРОН',text:`Новая заявка с сайта АЭРОН\n\nИмя: ${inquiry.name}\nКонтакт: ${inquiry.contact}\n\nОписание задачи:\n${inquiry.task}\n\nСтраница: ${inquiry.source}\nПолучено (UTC): ${inquiry.receivedAt}\nСогласие на обработку данных: предоставлено\nРедакция согласия: ${inquiry.consentVersion}`,disableFileAccess:true,disableUrlAccess:true};
 try{const result=await sender.sendMail(message);if(!result.accepted?.length)throw new Error('Recipient not accepted');return {messageId:result.messageId};}catch{throw fail(502,'Не удалось отправить заявку. Повторите попытку или свяжитесь с нами по телефону.');}finally{if(!transport)sender.close();}
}
