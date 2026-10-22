import fs from 'node:fs';
import path from 'node:path';
const pages=JSON.parse(fs.readFileSync('pages.json','utf8'));
const errors=[],titles=new Set(),descriptions=new Set();let references=0;
for(const p of pages){const html=fs.readFileSync(p.route,'utf8');const title=html.match(/<title>(.*?)<\/title>/)?.[1],description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
if(!title||titles.has(title))errors.push(p.route+': отсутствует или повторяется title');titles.add(title);
if(!description||descriptions.has(description))errors.push(p.route+': отсутствует или повторяется description');descriptions.add(description);
if((html.match(/<h1[ >]/g)||[]).length!==1)errors.push(p.route+': нужен один h1');
if(!html.includes('class="faq-list"'))errors.push(p.route+': нет FAQ');
for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){try{const data=JSON.parse(m[1]);if(data['@type']==='FAQPage'&&data.mainEntity.some(q=>!html.includes(q.name.replaceAll('&','&amp;'))))errors.push(p.route+': FAQ не соответствует странице');}catch{errors.push(p.route+': неверный JSON-LD');}}
for(const m of html.matchAll(/(?:href|src)="([^" ]+)"/g)){const url=m[1];if(/^(https?:|data:|tel:|mailto:)/.test(url))continue;references++;const [file,anchor]=url.split('#');const target=file?.startsWith('/')?path.resolve(file.slice(1)):path.resolve(path.dirname(p.route),file||path.basename(p.route));if(!fs.existsSync(target)){errors.push(p.route+': нет '+url);continue;}if(anchor&&target.endsWith('.html')&&!fs.readFileSync(target,'utf8').includes(`id="${anchor}"`))errors.push(p.route+': нет якоря '+url);}
if(/Разработка сметной документации|Обследование зданий и сооружений|Электроизмерительная лаборатория|Усиление фундаментов|Негосударственная экспертиза/.test(html))errors.push(p.route+': добавлена исключённая услуга');
}
console.log(JSON.stringify({pages:pages.length,references,uniqueTitles:titles.size,uniqueDescriptions:descriptions.size,errors},null,2));if(errors.length)process.exitCode=1;
