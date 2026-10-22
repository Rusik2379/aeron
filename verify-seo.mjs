// Проверка сборки для реального домена в изолированной временной папке.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'aeron-seo-'));
for(const file of ['build.mjs','content.mjs','articles.mjs','portfolio.mjs','portfolio-assets.mjs','client-projects.mjs','partners.mjs','development.mjs','business.mjs','about.mjs','geography.mjs','legal.mjs','content-store.mjs'])fs.copyFileSync(file,path.join(temp,file));
fs.writeFileSync(path.join(temp,'site.config.mjs'),fs.readFileSync('site.config.mjs','utf8').replace("siteUrl:''","siteUrl:'https://aeron.example'"));
const run=spawnSync(process.execPath,['build.mjs'],{cwd:temp,encoding:'utf8'});if(run.status)throw Error(run.stderr);
const xml=fs.readFileSync(path.join(temp,'sitemap.xml'),'utf8'),home=fs.readFileSync(path.join(temp,'index.html'),'utf8'),service=fs.readFileSync(path.join(temp,'services/promyshlennoe-stroitelstvo/index.html'),'utf8'),article=fs.readFileSync(path.join(temp,'articles/etapy-stroitelstva-kottedzha/index.html'),'utf8');
const project=fs.readFileSync(path.join(temp,'projects/elevator-paklino/index.html'),'utf8');
const parse=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const manifest=JSON.parse(fs.readFileSync(path.join(temp,'pages.json'),'utf8'));
const checks={projectSchema:parse(project).some(x=>x['@type']==='CreativeWork'),projectImage:project.includes('content="https://aeron.example/assets/images/projects/paklino-cover.webp"'),sitemapUrls:(xml.match(/<loc>/g)||[]).length===manifest.filter(p=>!p.noindex).length,legacyExcluded:!xml.includes('/services/kottedzhi/')&&!xml.includes('/services/kotelnye/')&&!xml.includes('/services/malye-kommercheskie-obekty/'),absoluteUrls:!xml.includes('<loc>/'),canonical:home.includes('href="https://aeron.example/"'),serviceSchema:parse(service).some(x=>x['@type']==='Service'),articleSchema:parse(article).some(x=>x['@type']==='Article'),breadcrumb:parse(service).some(x=>x['@type']==='BreadcrumbList'&&x.itemListElement.length===3),placeholderEmailOmitted:!JSON.stringify(parse(home).find(x=>x['@type']==='Organization')).includes('info@example.com'),bothPhoneContacts:JSON.stringify(parse(home).find(x=>x['@type']==='Organization')).includes('+73852570019')&&JSON.stringify(parse(home).find(x=>x['@type']==='Organization')).includes('+79293109798'),robots:fs.readFileSync(path.join(temp,'robots.txt'),'utf8').includes('Sitemap: https://aeron.example/sitemap.xml')};
console.log(JSON.stringify(checks,null,2));if(Object.values(checks).some(v=>!v))process.exitCode=1;
