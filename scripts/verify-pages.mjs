import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {base,origin} from './site-config.mjs';
const root=new URL('../dist/',import.meta.url);
const read=file=>readFile(new URL(file,root),'utf8');
const html=await read('index.html'),app=await read('workspace.js');
assert(!app.includes("fetch('/api/"),'Pages must never call local workspace APIs');
assert(app.includes('공개 체험판 · 아래 보고서와 승인 상태는 가상 예시입니다.'));
assert(!app.includes('SQLite에 실제 저장'));
assert(!app.includes('href="/workspace"'));
assert(!html.includes('__FLOWNOTE_ORIGIN__'));
assert(html.includes(origin+base+'assets/og-image.jpg'));
assert((await read('app.js')).includes(`href="${base}"`));
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
  assert((await stat(new URL(file,root))).isFile(),`${page}: missing ${url}`);
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
