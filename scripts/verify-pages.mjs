import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {base,origin} from './site-config.mjs';
const root=new URL('../dist/',import.meta.url);
const read=file=>readFile(new URL(file,root),'utf8');
const html=await read('index.html'),app=await read('workspace.js');
const workspace=await read('workspace/index.html');
assert(!app.includes("fetch('/api/"),'Pages must never call local workspace APIs');
assert(app.includes('공개 체험판 · 아래 보고서와 승인 상태는 가상 예시입니다.'));
assert(!app.includes('SQLite에 실제 저장'));
assert(!app.includes('href="/workspace"'));
assert(!html.includes('__FLOWNOTE_ORIGIN__'));
assert(workspace.includes(origin+base+'assets/og-image.jpg'));
assert(workspace.includes(origin+base+'workspace/'));
assert((await read('app.js')).includes(`href="${base}workspace/"`));
assert.equal((html.match(/<h1\b/g)||[]).length,1);
assert(html.includes('rel="canonical" href="'+origin+base+'"'));
assert(html.includes('https://t.me/evanlee97'));
assert(html.includes(origin+base+'marketing/og-flownote.png'));
assert(html.includes('property="og:image:height" content="630"'));
for(const [file,width,height] of [['og-flownote.png',1200,630],['favicon-32.png',32,32],['apple-touch-icon.png',180,180]]){
 const png=await readFile(new URL('marketing/'+file,root));
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),width,file+' width');assert.equal(png.readUInt32BE(20),height,file+' height');
}
assert(html.includes('marketing/favicon.svg')&&html.includes('marketing/favicon.ico'));

assert(html.includes('19만 9천')&&html.includes('총 59만')&&html.includes('월 5만'));
assert(html.includes('유지관리는 서버 이용권'));
assert(html.includes('자동 전송·접수되지 않습니다.'));
assert(!/__BASE__|__SCHEMA__|__FAQ_HTML__|__CANONICAL__|__IMAGE_URL__/.test(html));
const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert(schema['@graph'].some(item=>item['@type']==='Service'));
assert(!JSON.stringify(schema).includes('aggregateRating'));
assert((await read('robots.txt')).includes('Sitemap: '+origin+base+'sitemap.xml'));
assert((await read('sitemap.xml')).includes('<loc>'+origin+base+'</loc>'));
const fixture=JSON.parse(await read('sample-workspace.json'));
assert.equal(fixture.state.user.role,'viewer');
assert.equal(fixture.state.projects.length,3);
assert.equal(fixture.state.reports.length,3);
assert.equal(fixture.state.reports.filter(r=>r.status==='APPROVED').length,1);
assert(!/password|salt|session|csrfHash|password_hash/i.test(JSON.stringify(fixture)));
const approved=fixture.state.reports.find(r=>r.status==='APPROVED');
assert((await read(`downloads/${approved.id}.html`)).includes('라움리빙'));
assert(!(await read(`downloads/${approved.id}.csv`)).includes('모노핏'));
const config=JSON.parse(await read('supabase-public.json'));
assert(config.publishableKey.startsWith('sb_publishable_'));
assert(!JSON.stringify(config).includes('sb_secret_'));
assert((await read('account.js')).length>10000);
for(const page of ['index.html','workspace/index.html','csv.html','account.html']){
 const content=await read(page);
 for(const [,url] of content.matchAll(/(?:href|src)="([^"?#]+)(?:[^"\s]*)"/g)){
  if(/^https?:|^data:/.test(url))continue;
  const file=url.startsWith(base)?url.slice(base.length):url.replace(/^\.\//,'');
  if(!file)continue;
  const entry=await stat(new URL(file,root));
  assert(entry.isFile()||(entry.isDirectory()&&(await stat(new URL(file.replace(/\/?$/,'/')+'index.html',root))).isFile()),`${page}: missing ${url}`);
 }
}
async function inspect(dir=''){
 for(const f of await readdir(new URL(dir,root),{withFileTypes:true})){
  const name=dir+f.name;if(f.isDirectory())await inspect(name+'/');
  else assert(!/(?:\.sqlite|\.env|server\.mjs|workspace-store|package\.json|\.map$)/.test(name),'Non-public artifact: '+name);
 }
}
await inspect();
console.log('Pages verification passed: project base paths, public-only assets, synthetic records, download isolation, no API/auth secrets.');
