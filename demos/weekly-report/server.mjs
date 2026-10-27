import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {WorkspaceStore} from './workspace-store.mjs';
import {escapeHTML,reportHTML,exportReportCSV} from './core.js';
const root=fileURLToPath(new URL('.',import.meta.url));
const allowed=new Set(['index.html','app.js','core.js','style.css','help.js','fixtures/sample.csv','fixtures/workspace-sample.csv','fixtures/workspace-next-week.csv','workspace.html','workspace.js','workspace.css','assets/brandmark.png','assets/favicon-32.png','assets/favicon.ico','assets/apple-touch-icon.png','assets/og-image.jpg','assets/PretendardVariable.woff2','assets/Pretendard-LICENSE.txt']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
export function createReportServer(store){
const attempts=new Map();
const previewSecret=randomBytes(32);
const signPreview=(user,prepared,expires)=>createHmac('sha256',previewSecret).update(JSON.stringify([user.id,user.companyId,prepared.sourceHash,prepared.project,prepared.snapshot.start,prepared.snapshot.end,expires])).digest('hex');
function send(res,status,data){res.writeHead(status,{...security,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function json(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(new Error('JSON 요청이 필요합니다.'),{status:415});
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024)throw Object.assign(new Error('요청이 너무 큽니다. 2MB 이하 CSV를 사용하세요.'),{status:413});chunks.push(chunk);}
  try{const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!result||typeof result!=='object'||Array.isArray(result))throw new Error();return result;}catch{throw Object.assign(new Error('요청 형식이 올바르지 않습니다.'),{status:400});}
}
const sessionToken=req=>String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('flownote-session='))?.slice(17)||'';
function setSession(res,result){res.setHeader('Set-Cookie',`flownote-session=${result.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200`);}
function limit(req,key){
  const now=Date.now(),id=`${req.socket.remoteAddress}:${key}`;const entry=attempts.get(id)||{count:0,until:now+900000};
  if(entry.until<now){entry.count=0;entry.until=now+900000;}entry.count++;attempts.set(id,entry);
  if(attempts.size>10000)for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);
  if(entry.count>20)throw Object.assign(new Error('인증 시도가 많습니다. 15분 후 다시 시도하세요.'),{status:429});
}
return http.createServer(async(req,res)=>{
  const host=req.headers.host||'';
  if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)){send(res,403,{error:'로컬 주소로 접속하세요.'});return;}
  const url=new URL(req.url,`http://${host}`);
  if(url.pathname.startsWith('/api/workspace/')){
    try{
      const post=req.method==='POST';
      if(!['GET','POST'].includes(req.method))throw Object.assign(new Error('지원하지 않는 요청입니다.'),{status:405});
      if(post&&req.headers.origin!==`http://${host}`)throw Object.assign(new Error('허용되지 않은 요청 출처입니다.'),{status:403});
      if(post&&['/api/workspace/register','/api/workspace/login','/api/workspace/demo'].includes(url.pathname)){
        limit(req,'auth');const body=await json(req);let result;
        if(url.pathname.endsWith('/register'))result=store.register({company:body.company,name:body.name,email:body.email,password:body.password});
        else if(url.pathname.endsWith('/login'))result=store.login({email:body.email,password:body.password});
        else{
          const tag=randomBytes(9).toString('hex'),password=randomBytes(24).toString('base64url');
          result=store.register({company:'Flownote 샘플 에이전시',name:'체험 관리자',email:`demo-${tag}@example.invalid`,password,isDemo:true});
          const author=store.createUser(result.user,{name:'샘플 작성자',email:`editor-${tag}@example.invalid`,password:randomBytes(24).toString('base64url'),role:'editor'});
          const sample=await readFile(path.join(root,'fixtures/workspace-sample.csv'),'utf8');
          const clients=[['C01','라움리빙'],['C02','모노핏'],['C03','소담커피']];
          for(const[csvId,name]of clients){
            const customer=store.createClient(result.user,{name,csvId});
            const project=store.createProject(result.user,{name:`${name} · 10월 캠페인`,clientId:customer.id,campaigns:['브랜드 검색','리타겟팅'],start:'2026-10-01',end:'2026-12-31',ownerName:'샘플 작성자'});
            const report=store.createReport(author,{projectId:project.id,start:'2026-10-12',csv:sample,mappingConfirmed:true,exclusionsAccepted:true,note:'가상 데이터 시연용 보고서',filename:'sample.csv'});
            store.transition(author,{id:report.id,action:'submit',note:'원본과 대조했습니다. 검수해 주세요.'});
          }
        }
        setSession(res,result);send(res,200,{user:result.user,csrf:result.csrf});return;
      }
      const auth=store.authenticate(sessionToken(req));
      if(post)store.verifyCSRF(sessionToken(req),req.headers['x-csrf-token']);
      if(req.method==='GET'&&url.pathname==='/api/workspace/state'){send(res,200,{...store.state(auth.user),user:auth.user,csrf:auth.csrf});return;}
      if(post&&url.pathname==='/api/workspace/logout'){store.logout(sessionToken(req));res.setHeader('Set-Cookie','flownote-session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');send(res,200,{ok:true});return;}
      if(post&&url.pathname==='/api/workspace/actions'){
        const body=await json(req);const input=body.input||{};let result;
        switch(body.action){
          case 'create_client':result=store.createClient(auth.user,input);break;
          case 'create_project':result=store.createProject(auth.user,input);break;
          case 'create_user':result=store.createUser(auth.user,input);break;
          case 'preview':{result=store.preview(auth.user,input);const expires=Date.now()+15*60000;result.confirmation={expires,signature:signPreview(auth.user,result,expires)};break;}
          case 'create_report':{
            const latest=store.preview(auth.user,input);
            if(input.expectedHash!==latest.sourceHash)throw Object.assign(new Error('미리 본 파일과 다릅니다. 연결 내용을 다시 확인하세요.'),{status:409});
            const proof=input.confirmation;
            if(!proof||!Number.isSafeInteger(proof.expires)||proof.expires<Date.now()||proof.expires>Date.now()+15*60000||typeof proof.signature!=='string'||!/^[a-f0-9]{64}$/.test(proof.signature)||!timingSafeEqual(Buffer.from(proof.signature,'hex'),Buffer.from(signPreview(auth.user,latest,proof.expires),'hex')))throw Object.assign(new Error('미리 본 프로젝트·기간과 다르거나 확인 시간이 지났습니다. 자료 · 연결 검사를 다시 실행하세요.'),{status:409});
            result=store.createReport(auth.user,input);break;
          }
          case 'transition':result=store.transition(auth.user,input);break;
          default:throw Object.assign(new Error('지원하지 않는 작업입니다.'),{status:400});
        }
        send(res,200,{result});return;
      }
      const match=url.pathname.match(/^\/api\/workspace\/reports\/([^/]+)(\/download)?$/);
      if(req.method==='GET'&&match){
        const item=store.getReport(auth.user,decodeURIComponent(match[1]));
        if(!match[2]){send(res,200,{report:item});return;}
        if(!['APPROVED','DELIVERED'].includes(item.status))throw Object.assign(new Error('승인된 버전만 다운로드할 수 있습니다.'),{status:409});
        const isCSV=url.searchParams.get('format')==='csv',snapshot=item.snapshot;
        let content=isCSV?exportReportCSV(snapshot):reportHTML(snapshot,Boolean(store.state(auth.user).company.isDemo),(await readFile(path.join(root,'assets/PretendardVariable.woff2'))).toString('base64'));
        if(!isCSV){
          content=content.replace('업로드 데이터 · 담당자 검수 필요','승인된 저장본');
          const meta=`<p class="notice">승인본 v${item.version} · 프로젝트 ${escapeHTML(snapshot.projectName||'이전 저장본 · 프로젝트명 메타 미기록')}<br>승인 시각 ${escapeHTML(item.approvedAt||'')} · 원본 SHA-256 ${escapeHTML(item.sourceHash.slice(0,16))}<br>이 파일은 저장된 승인 버전입니다. 전달 표시는 수동 기록이며 고객 수신 확인이 아닙니다.</p>`;
          content=content.replace('<h1>',meta+'<h1>');
        }
        res.writeHead(200,{...security,'Content-Type':isCSV?'text/csv; charset=utf-8':'text/html; charset=utf-8','Content-Disposition':`attachment; filename="flownote-${item.id}-v${item.version}.${isCSV?'csv':'html'}"`});res.end(content);return;
      }
      throw Object.assign(new Error('요청을 찾을 수 없습니다.'),{status:404});
    }catch(error){send(res,error.status||400,{error:error.status===500?'저장 중 문제가 생겼습니다. 다시 시도하세요.':error.message});}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,security);res.end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';}catch{res.writeHead(400);res.end();return;}
  if(pathname==='workspace'||pathname==='workspace/')pathname='workspace.html';
  if(pathname==='favicon.ico')pathname='assets/favicon.ico';
  if(!allowed.has(pathname)){res.writeHead(404);res.end('Not found');return;}
  try{let content=await readFile(path.join(root,pathname));if(path.extname(pathname)==='.html')content=Buffer.from(content.toString('utf8').replaceAll('__FLOWNOTE_ORIGIN__',`http://${host}`));res.writeHead(200,{...security,'Content-Type':types[path.extname(pathname)]});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(500);res.end('Unable to read demo asset');}
});
}
const port=Number(process.env.REPORT_DEMO_PORT||3002);
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const database=process.env.FLOWNOTE_DB||fileURLToPath(new URL('../../data/flownote.sqlite',import.meta.url));
  await mkdir(path.dirname(database),{recursive:true});
  const store=new WorkspaceStore(database),server=createReportServer(store);
  server.listen(port,'127.0.0.1',()=>process.stdout.write(`Flownote demo: http://127.0.0.1:${port}/ | Workspace: /workspace\n`));
  const shutdown=()=>server.close(()=>{store.close();process.exit(0);});process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
