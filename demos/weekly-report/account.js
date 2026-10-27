import {createClient} from '@supabase/supabase-js';
import {escapeHTML as e} from './core.js';
const root=document.querySelector('#account-root'),message=document.querySelector('#account-message');
let client,user=null,companyId='',busy=false,loginMode=true,generation=0;
const input=(name,label,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" required ${extra}></label>`;
const say=(text,error=false)=>{message.textContent=text;message.classList.toggle('cloud-error',error);};
function authView(){root.innerHTML=`<div class="account-grid"><section class="card"><h2>${loginMode?'로그인':'회원가입'}</h2><form id="auth">${loginMode?'':input('name','이름','text','maxlength="100" autocomplete="name"')}${input('email','이메일','email','autocomplete="username"')}${input('password','비밀번호 (10자 이상)','password',`minlength="10" maxlength="128" autocomplete="${loginMode?'current-password':'new-password'}"`)}<button class="button primary">${loginMode?'로그인':'가입 확인 메일 받기'}</button></form><button class="quiet" data-action="switch">${loginMode?'처음이라면 회원가입':'계정이 있다면 로그인'}</button></section><aside class="card"><h2>회사별로 따로 보관합니다.</h2><p class="hint">비밀번호는 Supabase Auth가 관리합니다. 회사에 속한 회원만 해당 회사 자료를 조회할 수 있습니다. 회원가입 후 이메일 확인이 필요합니다.</p><p class="hint">보고서는 회사·프로젝트·버전별로 축적하도록 DB가 구성되어 있습니다. 현재 클라우드 보고서 화면 연결은 준비 중입니다.</p></aside></div>`;}
async function result(query){const{data,error}=await query;if(error)throw error;return data;}
async function command(action,payload){return result(client.rpc('flownote_command',{p_action:action,p_payload:payload}));}
async function refresh(){
 const ticket=++generation;
 const response=await client.auth.getUser();if(response.error&&!response.error.message.includes('Auth session missing')){user=null;companyId='';authView();throw response.error;}
 user=response.data.user;
 if(!user){companyId='';authView();return;}
 const companies=await result(client.from('companies').select('id,name').order('created_at'));
 if(ticket!==generation)return;
 if(!companies.some(c=>c.id===companyId))companyId=companies[0]?.id||'';
 const company=companies.find(c=>c.id===companyId);
 const membership=companyId?await result(client.from('company_memberships').select('role').eq('company_id',companyId).eq('user_id',user.id).single()):null;
 const clients=companyId?await result(client.from('clients').select('id,name,csv_client_id').eq('company_id',companyId).order('created_at')):[];
 const projects=companyId?await result(client.from('projects').select('id,name,campaigns,starts_on,ends_on').eq('company_id',companyId).order('created_at')):[];
 if(ticket!==generation)return;
 const canWrite=membership&&['owner','editor'].includes(membership.role);
 root.innerHTML=`<div class="account-session"><span>${e(user.email)} · ${e(membership?.role||'소속 회사 없음')}</span><button class="button outline" data-action="logout">로그아웃</button></div><div class="account-grid"><section class="card"><h2>회사 공간</h2>${companies.length?`<label>현재 회사<select id="company">${companies.map(c=>`<option value="${c.id}" ${c.id===companyId?'selected':''}>${e(c.name)}</option>`).join('')}</select></label>`:''}<form id="company-create">${input('name','새 회사 이름','text','maxlength="120"')}<button class="button primary">회사 공간 만들기</button></form><p class="hint">가입한 회사의 소유자가 기존 회원 이메일로 팀원을 추가할 수 있습니다. 소유 회사는 계정당 최대 3곳입니다.</p></section><section class="card"><h2>${company?e(company.name):'기초자료 등록'}</h2><p class="hint">${company?'고객·프로젝트는 이 회사에만 저장됩니다.':'회사 공간을 만든 다음 고객과 프로젝트를 등록하세요.'}</p><ul class="account-list">${clients.map(c=>`<li>${e(c.name)}<small>CSV ID: ${e(c.csv_client_id)}</small></li>`).join('')||'<li>등록된 고객이 없습니다.</li>'}</ul></section></div>${canWrite?`<div class="account-grid"><section class="card"><h2>고객 등록</h2><form id="client-create">${input('name','고객사 이름','text','maxlength="200"')}${input('csv_client_id','CSV 고객 ID','text','pattern="[A-Za-z0-9_-]{1,40}" maxlength="40"')}<button class="button primary">고객 저장</button></form><p class="hint">파일럿 기본 한도는 회사당 고객 3곳입니다.</p></section><section class="card"><h2>프로젝트 등록</h2><form id="project-create"><label>고객<select name="client_id" required><option value="">고객 선택</option>${clients.map(c=>`<option value="${c.id}">${e(c.name)}</option>`).join('')}</select></label>${input('name','프로젝트 이름','text','maxlength="200"')}${input('campaigns','캠페인명 (여러 개는 | 로 구분)')}${input('starts_on','시작일','date')}${input('ends_on','종료일','date')}<button class="button primary">프로젝트 저장</button></form></section></div>`:''}${company?`<section class="card"><h2>등록된 프로젝트</h2><ul class="account-list">${projects.map(p=>`<li>${e(p.name)}<small>${e(p.campaigns.join(' · '))} / ${p.starts_on} ~ ${p.ends_on}</small></li>`).join('')||'<li>등록된 프로젝트가 없습니다.</li>'}</ul></section>`:''}${membership?.role==='owner'?`<section class="card"><h2>기존 가입 회원을 팀에 추가</h2><form id="member-add">${input('email','이메일 확인이 끝난 회원의 이메일','email')}<label>역할<select name="role"><option value="editor">작성자</option><option value="reviewer">검수자</option><option value="viewer">조회자</option></select></label><button class="button outline">팀원 추가</button></form><p class="hint">초대 메일은 발송하지 않습니다. 등록된 회원에게 현재 회사 자료 접근 권한을 부여합니다.</p></section>`:''}`;
}
async function run(fn){if(busy)return;busy=true;root.querySelectorAll('button').forEach(el=>el.disabled=true);say('');try{await fn();}catch(error){say(error.message||'처리하지 못했습니다.',true);}finally{busy=false;root.querySelectorAll('button').forEach(el=>el.disabled=false);}}
root.addEventListener('submit',event=>{event.preventDefault();const form=event.target,input=Object.fromEntries(new FormData(form));run(async()=>{
 if(form.id==='auth'){
  if(loginMode){await result(client.auth.signInWithPassword({email:input.email,password:input.password}));await refresh();say('로그인했습니다.');}
  else{const data=await result(client.auth.signUp({email:input.email,password:input.password,options:{data:{display_name:input.name},emailRedirectTo:new URL('./account.html',location.href).href}}));
   if(data.session){await refresh();say('가입했습니다.');}else{loginMode=true;authView();say('가입 요청을 접수했습니다. 메일함에서 확인 링크를 누른 뒤 로그인하세요. 기존 가입 여부에 따라 메일이 발송되지 않을 수 있습니다.');}}
 }else if(form.id==='company-create'){const r=await command('create_company',{name:input.name});companyId=r.company_id;await refresh();say('회사 공간을 Supabase에 저장했습니다.');}
 else if(form.id==='client-create'){await command('create_client',{...input,company_id:companyId});await refresh();say('고객을 Supabase에 저장했습니다.');}
 else if(form.id==='project-create'){await command('create_project',{...input,company_id:companyId,campaigns:input.campaigns.split('|').map(s=>s.trim()).filter(Boolean)});await refresh();say('프로젝트를 Supabase에 저장했습니다.');}
 else if(form.id==='member-add'){await command('add_member',{...input,company_id:companyId});await refresh();say('등록된 회원을 팀에 추가했습니다.');}
});});
root.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||busy)return;
 if(button.dataset.action==='switch'){loginMode=!loginMode;say('');authView();}
 if(button.dataset.action==='logout')run(async()=>{await result(client.auth.signOut());user=null;companyId='';generation++;authView();say('로그아웃했습니다.');});
});
root.addEventListener('change',event=>{if(event.target.id==='company'&&!busy){companyId=event.target.value;run(refresh);}});
if(location.hostname.endsWith('.github.io')){
 root.innerHTML='<section class="card"><h2>회사 계정은 Vercel 운영 주소에서 사용하세요.</h2><a class="button primary" href="https://flow-note-psi.vercel.app/account.html">회원가입 · 로그인 열기</a><p class="hint">GitHub Pages는 공개 체험판입니다. 인증 반환 주소가 설정된 Vercel에서 계속하세요.</p></section>';
}else try{
 const config=await fetch('./supabase-public.json').then(r=>{if(!r.ok)throw new Error('클라우드 공개 연결 설정을 불러오지 못했습니다.');return r.json();});
 if(!config.publishableKey.startsWith('sb_publishable_'))throw new Error('공개 클라이언트 키 설정을 확인하세요.');
 client=createClient(config.url,config.publishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true}});
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){user=null;companyId='';generation++;authView();}});
 await refresh();
}catch(error){say(error.message,true);root.innerHTML='<p>연결을 확인한 뒤 새로고침해 주세요.</p>';}
