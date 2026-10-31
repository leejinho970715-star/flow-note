import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {WorkspaceStore} from '../demos/weekly-report/workspace-store.mjs';
import {reportHTML,exportReportCSV} from '../demos/weekly-report/core.js';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// Build only synthetic records in an ephemeral DB; never open the operator's database.
const source=new URL('../demos/weekly-report/',import.meta.url),output=new URL('../dist/',import.meta.url);
import {base,origin} from './site-config.mjs';
const read=name=>readFile(new URL(name,source),'utf8');
await Promise.all(['','assets/','fixtures/','downloads/','workspace/'].map(name=>mkdir(new URL(name,output),{recursive:true})));
for(const file of ['core.js','help.js','style.css','workspace.css','assets/brandmark.png','assets/flownote-logo.svg','assets/favicon-32.png','assets/favicon.ico','assets/apple-touch-icon.png','assets/og-image.jpg','assets/PretendardVariable.woff2','assets/Pretendard-LICENSE.txt','fixtures/sample.csv'])await copyFile(new URL(file,source),new URL(file,output));
await copyFile(new URL('account.css',source),new URL('account.css',output));
await writeFile(new URL('account.html',output),(await read('account.html')).replace('<a class="button outline" href="./">체험판으로 돌아가기</a>','<a class="button outline" href="https://flownote-studio.vercel.app/">서비스 소개로 돌아가기</a>').replace('</head>','<meta name="robots" content="noindex,follow"></head>'));
const publicConfig=JSON.parse(await readFile(new URL('../supabase/public-config.json',import.meta.url),'utf8'));
if(!publicConfig.publishableKey?.startsWith('sb_publishable_'))throw new Error('Only a publishable Supabase key may be included in the site.');
await writeFile(new URL('supabase-public.json',output),JSON.stringify(publicConfig));
await build({entryPoints:[fileURLToPath(new URL('account.js',source))],outfile:fileURLToPath(new URL('account.js',output)),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
const store=new WorkspaceStore(':memory:');
let sampleState,details={};
try{
  const owner=store.register({company:'Flownote 샘플 에이전시',name:'샘플 관리자',email:'owner@example.invalid',password:randomBytes(24).toString('hex'),isDemo:true});
  const author=store.createUser(owner.user,{name:'샘플 작성자',email:'editor@example.invalid',password:randomBytes(24).toString('hex'),role:'editor'});
  const csv=await read('fixtures/workspace-sample.csv');
  const font=(await readFile(new URL('assets/PretendardVariable.woff2',source))).toString('base64');
  for(const [i,[csvId,name]] of [['C01','라움리빙'],['C02','모노핏'],['C03','소담커피']].entries()){
    const client=store.createClient(owner.user,{name,csvId});
    const project=store.createProject(owner.user,{clientId:client.id,name:name+' · 10월 캠페인',campaigns:['브랜드 검색','리타겟팅'],start:'2026-10-01',end:'2026-12-31',ownerName:'샘플 작성자'});
    let r=store.createReport(author,{projectId:project.id,start:'2026-10-12',csv,mappingConfirmed:true,exclusionsAccepted:true,filename:'workspace-sample.csv',note:'공개 체험용 가상 보고서. 실제 고객 성과가 아닙니다.'});
    r=store.transition(author,{id:r.id,action:'submit',note:'가상 검수 요청 예시'});
    if(i===0){
      r=store.transition(owner.user,{id:r.id,action:'approve',note:'빌드 시 만든 가상 승인 예시. 실제 고객 승인이 아닙니다.'});
      await writeFile(new URL(`downloads/${r.id}.html`,output),reportHTML(r.snapshot,true,font).replace('</head>','<meta name="robots" content="noindex,follow"></head>'));
      await writeFile(new URL(`downloads/${r.id}.csv`,output),exportReportCSV(r.snapshot));
    }
    details[r.id]=r;
  }
  sampleState={...store.state(owner.user),user:{id:'public-viewer',name:'체험 방문자',role:'viewer'},csrf:''};
}finally{store.close();}
await writeFile(new URL('sample-workspace.json',output),JSON.stringify({state:sampleState,reports:details}));
await writeFile(new URL('pages-api.js',output),`let sample;
export async function api(path,body){
 if(body)throw new Error('공개 체험판은 조회 전용입니다. 계정·저장·승인은 로컬 운영판에서 사용하세요.');
 sample ||= await fetch('${base}sample-workspace.json').then(r=>{if(!r.ok)throw new Error('가상 자료를 불러오지 못했습니다.');return r.json()});
 if(path==='state')return structuredClone(sample.state);
 if(path.startsWith('reports/')&&sample.reports[path.slice(8)])return {report:structuredClone(sample.reports[path.slice(8)])};
 throw new Error('공개 체험 자료에 없는 요청입니다.');
}`);
let app=await read('workspace.js');
app=app.replace(/async function api\(path,body\)\{[\s\S]*?\n\}/,"// Data is a public synthetic snapshot, with no authentication or mutations.");
app="import {api} from './pages-api.js';\n"+app;
app=app.replace("const roleText={owner:","const roleText={viewer:'공개 체험',owner:");
app=app.replace("['compose','새 보고서','03']","['csv','CSV 직접 체험','03']");
app=app.replace("if(el.dataset.nav){view=",`if(el.dataset.nav==='csv'){location.href='${base}csv.html';return;}\n  if(el.dataset.nav){view=`);
app=app.replace('<button class="quiet" data-action="logout">로그아웃</button>','');
app=app.replace('<button class="help-search-trigger"',`<a class="button outline" href="${base==='/'?'/account.html':'https://flow-note-psi.vercel.app/account.html'}">가입 · 로그인</a><button class="help-search-trigger"`);
app=app.replace('SQLite에 실제 저장','공개 체험판 · 가상 자료');
app=app.replace('로컬 운영판 · 외부 서비스 미연동<br>실제 고객 납품 검증 전','조회 전용 · 계정/서버 저장 없음<br>CSV 체험은 브라우저에서 처리');
app=app.replace('보고서 상태와 승인·저장 기능은 실제로 동작합니다. 고객 실적이 아닙니다. 체험 계정은 로그아웃하면 다시 접근할 수 없습니다.','공개 체험판 · 아래 보고서와 승인 상태는 가상 예시입니다. 계정·저장·승인은 로컬 운영판에서만 동작합니다. CSV 직접 체험에서 자료를 넣어 집계할 수 있습니다.');
app=app.replace('서버에서 역할을 확인합니다. 작성자는 자신이 만든 보고서를 승인할 수 없습니다.','아래는 가상 팀 구성 예시입니다. 실제 계정과 역할 검사는 로컬 운영판에서 동작합니다.');
app=app.replace('저장된 최신 상태를 불러왔습니다.','공개 가상 예시를 다시 불러왔습니다.');
app=app.replace("name:'자료 확인 · 초안 작성',desc:'CSV를 넣고 원본과 대조하세요.',view:'compose'","name:'CSV 직접 체험',desc:'브라우저에서 CSV를 검사·집계하세요.',view:'csv'");
app=app.replace('체크 표시는 저장된 자료의 준비 상태입니다. 다운로드·고객 수신을 자동 확인한 표시는 아닙니다.','아래는 가상 작업 흐름 예시입니다. 공개 체험판은 조회 전용이며 CSV 직접 체험은 브라우저 안에서 동작합니다.');
app=app.replace("if(el.dataset.helpView){if(state)",`if(el.dataset.helpView==='compose'){location.href='${base}csv.html';return;}\n  if(el.dataset.helpView){if(state)`);
app=app.replaceAll('/api/workspace/reports/${r.id}/download?format=html',base+'downloads/${r.id}.html').replaceAll('/api/workspace/reports/${r.id}/download?format=csv',base+'downloads/${r.id}.csv');
app=app.replace('<div class="rail-bottom">',`<div class="rail-bottom"><a href="https://flownote-studio.vercel.app/">← 서비스 소개</a><a href="https://agencyflow-studio-dun.vercel.app/">ProjectFlow 프로젝트 관리 ↗</a>`);
app=app.replaceAll("from '/","from '"+base).replaceAll('src="/','src="'+base).replaceAll('href="/workspace"',`href="${base}workspace/"`).replaceAll('href="/"',`href="${base}csv.html"`);
await writeFile(new URL('workspace.js',output),app);
const html=(await read('workspace.html')).replaceAll('__FLOWNOTE_ORIGIN__/workspace',origin+base+'workspace/').replaceAll('__FLOWNOTE_ORIGIN__',origin+base.slice(0,-1)).replaceAll('href="/','href="'+base).replaceAll('src="/','src="'+base).replace('</head>','<meta name="robots" content="noindex,follow"></head>');
await writeFile(new URL('workspace/index.html',output),html);
await writeFile(new URL('csv.html',output),(await read('index.html')).replaceAll('__FLOWNOTE_ORIGIN__/workspace',origin+base+'csv.html').replaceAll('__FLOWNOTE_ORIGIN__',origin+base.slice(0,-1)).replaceAll('href="/','href="'+base).replace('</head>','<meta name="robots" content="noindex,follow"></head>'));
await writeFile(new URL('app.js',output),(await read('app.js')).replaceAll('href="/workspace"',`href="${base}workspace/"`));
await writeFile(new URL('.nojekyll',output),'');
await import('./build-landing.mjs');
process.stdout.write(`Public site built: dist/ at ${origin}${base} (no customer data, database files or secret keys)\n`);
