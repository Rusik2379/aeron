import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {articles as initialArticles} from './articles.mjs';
import {projects as initialProjects} from './portfolio.mjs';

export const root=path.dirname(fileURLToPath(import.meta.url));
export const dataDirectory=path.resolve(process.env.AERON_DATA_DIR||path.join(root,'data'));
export const contentFile=path.join(dataDirectory,'content.json');
export function initialStore(){return {version:1,articles:initialArticles.map(a=>({...a,id:'article-'+a.slug,status:'published'})),projects:initialProjects.map(p=>({...p,id:'project-'+p.slug,status:'published'})),settings:{}};}
export function readStore(){return fs.existsSync(contentFile)?JSON.parse(fs.readFileSync(contentFile,'utf8')):initialStore();}
export function writeStore(store,{backup=true}={}){
 fs.mkdirSync(dataDirectory,{recursive:true});
 if(backup&&fs.existsSync(contentFile)){const folder=path.join(dataDirectory,'backups');fs.mkdirSync(folder,{recursive:true});fs.copyFileSync(contentFile,path.join(folder,Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.json'));}
 const temp=contentFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(store,null,2)+'\n');fs.renameSync(temp,contentFile);
}
export function publicContent(){const store=readStore();return {articles:store.articles.filter(a=>a.status==='published'),projects:store.projects.filter(p=>p.status==='published')};}
export function savedSettings(){return readStore().settings||{};}
export function shortDescription(value,max=180){
 const text=String(value||'').replace(/\s+/g,' ').trim();
 if(text.length<=max)return text;
 const sentence=text.match(/^.*?[.!?](?=\s|$)/u)?.[0];
 if(sentence&&sentence.length<=max)return sentence;
 const words=text.slice(0,max+1).replace(/\s+\S*$/u,'').trimEnd();
 return (words||text.split(/\s/u)[0])+'…';
}
