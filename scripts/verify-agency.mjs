import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const output=new URL('../agencyflow/out/',import.meta.url);
const origin=process.env.NEXT_PUBLIC_AGENCY_URL||'https://agencyflow-studio-dun.vercel.app';
const home=await readFile(new URL('index.html',output),'utf8');
const workspace=await readFile(new URL('workspace/index.html',output),'utf8');
assert.equal((home.match(/<h1\b/g)||[]).length,1);
assert(home.includes(origin+'/'));
assert(home.includes('og-agencyflow.png')&&home.includes('favicon.svg'));
assert(home.includes('SoftwareApplication')&&!home.includes('aggregateRating'));
assert(home.includes('결제는 아직 연결되지 않았습니다.'));
assert(workspace.includes('noindex'));
for(const [file,w,h] of [['og-agencyflow.png',1200,630],['favicon-32.png',32,32],['apple-touch-icon.png',180,180]]){
 const data=await readFile(new URL(file,output));assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),w);assert.equal(data.readUInt32BE(20),h);
}
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){if(item.isDirectory())await walk(new URL(item.name+'/',dir));else assert(!/\.sql$|\.env|\.sqlite|package\.json$|social-preview\.html|icon-preview\.html/.test(item.name),'Non-public file: '+item.name);}}
await walk(output);
console.log('AgencyFlow verification passed: independent SEO/OG/icons, private workspace noindex, truthful billing, public files only.');
