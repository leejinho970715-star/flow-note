// Requires the CEO-approved, temporary verified test identity in an ignored fixture file.
// This does not create Auth users, send mail, charge cards, or touch real customer data.
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const file=new URL('../test-results/agency-http-fixture.json',import.meta.url);
const fixture=JSON.parse(await readFile(file,'utf8'));
assert(/^agencyflow-http-[a-f0-9]+@example.invalid$/.test(fixture.email));
assert(/^[a-f0-9-]{36}$/.test(fixture.id));
const config=JSON.parse(await readFile(new URL('../supabase/public-config.json',import.meta.url),'utf8'));
const db=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
const persist=()=>writeFile(file,JSON.stringify(fixture));
async function rpc(action,payload={}){const {data,error}=await db.rpc('agencyflow_command',{p_action:action,p_payload:{org_id:fixture.org_id,project_id:fixture.project_id,...payload}});if(error)throw Error(action+': '+error.message);return data;}
try{
 const {data:login,error}=await db.auth.signInWithPassword({email:fixture.email,password:fixture.password});if(error)throw error;assert.equal(login.user.id,fixture.id);
 console.log('PASS: actual Auth password login using the approved temporary fixture (not email confirmation).');
 if(process.argv.includes('--cleanup-files')){
  if(fixture.path){const {data,error}=await db.storage.from('agencyflow-designs').remove([fixture.path]);if(error)throw error;assert(data?.some(x=>x.name===fixture.path||x.name===fixture.path.split('/').at(-1)),'Storage API did not remove the fixture file');console.log('PASS: fixture binary removed through Storage API.');}
 }else{
  if(!fixture.org_id){fixture.org_id=(await rpc('create_org',{name:'AgencyFlow HTTP 검증 · 삭제 예정'})).id;await persist();}
  if(!fixture.client_id){fixture.client_id=(await rpc('save_client',{name:'HTTP 가상 고객'})).id;await persist();}
  if(!fixture.project_id){fixture.project_id=(await rpc('save_project',{name:'HTTP 시안 검증',client_id:fixture.client_id,starts_on:'2026-10-28',due_on:'2026-11-30'})).id;await persist();}
  const bytes=await readFile(new URL('../agencyflow/public/favicon-32.png',import.meta.url));
  fixture.path=(await rpc('reserve_upload',{bytes:bytes.length,mime:'image/png'})).path;await persist();
  const uploaded=await db.storage.from('agencyflow-designs').upload(fixture.path,bytes,{contentType:'image/png',upsert:false});if(uploaded.error)throw Error('HTTP storage upload: '+uploaded.error.message);
  fixture.version_id=(await rpc('version',{title:'HTTP 검증용 시안',path:fixture.path})).id;await persist();
  const pin=await rpc('feedback',{version_id:fixture.version_id,x:.25,y:.5,body:'실제 HTTP 검증용 위치 피드백'});
  await rpc('reply',{feedback_id:pin.id,body:'HTTP 답글 검증'});
  await rpc('feedback_status',{id:pin.id,status:'완료'});
  const quote=await rpc('quote',{lines:[{name:'HTTP 계산 검증',quantity:3,unitPrice:10001}],total:1});assert.equal(quote.total,33003);assert.equal(quote.subtotal,30003);
  const approval=await db.rpc('agencyflow_command',{p_action:'approve_version',p_payload:{org_id:fixture.org_id,project_id:fixture.project_id,version_id:fixture.version_id}});assert(approval.error,'Internal team self approval must fail');
  const signed=await db.storage.from('agencyflow-designs').createSignedUrl(fixture.path,300);if(signed.error)throw signed.error;const response=await fetch(signed.data.signedUrl);assert.equal(response.status,200);const downloaded=Buffer.from(await response.arrayBuffer());assert(downloaded.equals(bytes),'Private signed download bytes mismatch');
  const listing=await db.from('af_feedbacks').select('id,body').eq('id',pin.id);assert.equal(listing.data?.length,1);
  console.log('PASS: Auth → organization/client/project RPC → actual private PNG upload → version/pin/thread/status → server quote recomputation → self-approval denial → signed binary download.');
  await writeFile(new URL('../test-results/agency-http-result.json',import.meta.url),JSON.stringify({passed:true,emailDeliveryTested:false,billingTested:false,fixtureCleanupPending:true,checks:['auth_login','company_and_project_write','private_storage_http_upload','version_pin_thread','feedback_status','server_quote_recompute','self_approval_denied','signed_binary_download']},null,2));
 }
}finally{const {error}=await db.auth.signOut();if(error)console.error('Fixture session logout requires follow-up:',error.message);else console.log('PASS: fixture session signed out.');}
