import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,rmdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WorkspaceStore} from '../demos/weekly-report/workspace-store.mjs';
import {snapshotDatabase} from '../demos/weekly-report/workspace-backup.mjs';

test('live SQLite snapshot restores approved content and auth into a new file, never overwrites',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'flownote-backup-'));
  const source=join(dir,'source.sqlite'),snapshot=join(dir,'backup.sqlite'),restored=join(dir,'restored.sqlite');
  const store=new WorkspaceStore(source);
  try{
    const owner=store.register({company:'복원 테스트',name:'관리자',email:'backup-owner@example.invalid',password:'Synthetic-Password-Only'});
    const editor=store.createUser(owner.user,{name:'작성자',email:'backup-editor@example.invalid',password:'Synthetic-Password-Only',role:'editor'});
    const client=store.createClient(owner.user,{name:'라움리빙',csvId:'C01'});
    const project=store.createProject(owner.user,{clientId:client.id,name:'백업 검증',start:'2026-10-01',end:'2026-12-31',campaigns:['브랜드 검색','리타겟팅']});
    const csv=await readFile(new URL('../demos/weekly-report/fixtures/workspace-sample.csv',import.meta.url),'utf8');
    const r=store.createReport(editor,{projectId:project.id,start:'2026-10-12',csv,mappingConfirmed:true,exclusionsAccepted:true});
    store.transition(editor,{id:r.id,action:'submit'});store.transition(owner.user,{id:r.id,action:'approve'});
    await snapshotDatabase(source,snapshot);
    await assert.rejects(()=>snapshotDatabase(source,snapshot),/EEXIST/);
    await assert.rejects(()=>snapshotDatabase(source,source),/달라야/);
    await snapshotDatabase(snapshot,restored);
    const copy=new WorkspaceStore(restored);
    try{
      const session=copy.authenticate(owner.token);assert.equal(session.user.companyId,owner.user.companyId);
      const record=copy.getReport(session.user,r.id);assert.equal(record.status,'APPROVED');assert.equal(record.snapshot.current.spendCents,27000000);
      assert.equal(copy.state(session.user).audit.filter(a=>a.action==='APPROVE').length,1);
    }finally{copy.close();}
  }finally{
    store.close();
    for(const file of [source,snapshot,restored])for(const suffix of ['','-wal','-shm'])await rm(file+suffix,{force:true});
    await rmdir(dir);
  }
});
