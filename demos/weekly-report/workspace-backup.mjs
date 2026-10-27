import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Operational backup: never expose an all-company database through a tenant's HTTP API.
// Destination is always a new file. Restoring never replaces a running database.
export async function snapshotDatabase(source,destination){
  source=resolve(source);destination=resolve(destination);
  if(source===destination)throw new Error('원본과 대상은 달라야 합니다.');
  const db=new DatabaseSync(source,{readOnly:true});let created=false;
  try{
    if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw new Error('원본 데이터베이스 무결성 검사에 실패했습니다.');
    if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'").get())throw new Error('Flownote 데이터베이스가 아닙니다.');
    await mkdir(dirname(destination),{recursive:true});await writeFile(destination,'',{flag:'wx',mode:0o600});created=true;
    await backup(db,destination);
    const restored=new DatabaseSync(destination,{readOnly:true});
    try{if(restored.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw new Error('백업 파일 검증에 실패했습니다.');}finally{restored.close();}
    return destination;
  }catch(error){if(created)await unlink(destination).catch(()=>{});throw error;}finally{db.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const mode=process.argv[2]||'backup';
  if(!['backup','restore'].includes(mode))throw new Error('backup 또는 restore 명령을 사용하세요.');
  const base=fileURLToPath(new URL('../../data/',import.meta.url)),stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const source=mode==='restore'?process.argv[3]:(process.env.FLOWNOTE_DB||resolve(base,'flownote.sqlite'));
  if(!source)throw new Error('복원할 백업 파일 경로가 필요합니다.');
  const destination=mode==='restore'?resolve(base,`flownote-restored-${stamp}.sqlite`):resolve(base,'flownote-backups',`flownote-${stamp}.sqlite`);
  process.stdout.write(`${mode==='restore'?'새 DB로 복원':'백업'} 완료: ${await snapshotDatabase(source,destination)}\n운영 DB를 교체하지 않았습니다. 복원본 확인 후 FLOWNOTE_DB로 선택할 수 있습니다.\n`);
}
