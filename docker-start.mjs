import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const data=process.env.AERON_DATA_DIR||'/var/lib/aeron';
fs.mkdirSync(data,{recursive:true,mode:0o700});
const content=path.join(data,'content.json');
if(!fs.existsSync(content)){
 const seed=JSON.parse(fs.readFileSync('/app/data/content.json','utf8'));
 if(process.env.AERON_SITE_URL)seed.settings={...seed.settings,siteUrl:process.env.AERON_SITE_URL};
 fs.writeFileSync(content,JSON.stringify(seed,null,2)+'\n',{flag:'wx',mode:0o600});
}
const result=spawnSync(process.execPath,['build.mjs'],{stdio:'inherit',env:process.env});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
await import('./serve.mjs');
