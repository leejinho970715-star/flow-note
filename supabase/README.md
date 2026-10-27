# Flownote Supabase 운영 DB

2026-10-27 / 프로젝트 pygkgmigzlcykcajvchp, PostgreSQL17. 기존 데이터 없는 상태를 확인한 뒤 마이그레이션을 적용했다. 다른 프로젝트에 재적용할 때는 기존 테이블·Auth 트리거·노출 스키마를 먼저 확인한다.

## 데이터 흐름

`auth.users → profiles → company_memberships → companies → clients → projects → data_imports/import_rows → reports/report_versions → report_events/audit_events`

- auth.users: Supabase Auth가 이메일·비밀번호 해시·확인·세션을 관리. 별도 비밀번호 테이블 없음.
- profiles: 표시 이름만 저장. 사용자가 편집하는 이름·Auth user_metadata를 회사 권한 판단에 쓰지 않음.
- companies/memberships: 회사와 소유자/작성자/검수자/조회자. 비활성 소속은 조회 불가. 기본 고객 한도3곳은 서비스 설정이고 회원이 임의 변경할 수 없음.
- clients/projects: 회사별 고객 ID·캠페인·기간 매핑. 다른 회사 고객을 프로젝트에 연결할 수 없도록 복합 외래키 사용. 같은 고객·캠페인의 겹치는 프로젝트는 저장 RPC에서 차단.
- imports/rows: 파일명·선언한 원본 해시·제외 사유·DB 계산 행 해시·정규화 지표. 원본 CSV 파일 자체는 보관하지 않음. 정규화 행은 고객 자료가 포함되는 영속 데이터다.
- reports: 프로젝트와 보고 기간을 식별. 기간은1~366일을 지원하지만 현재 기존 보고 UI는7일 단위다.
- report_versions: 같은 보고서의 버전·DB 재집계 스냅샷·승인 상태. 수정은 새 버전. 승인 시점의 고객명·프로젝트 설정·캠페인 합계를 스냅샷에 고정.
- report_events/audit: 누가 언제 검수·승인·수동 전달 기록을 했는지 축적. 비밀번호·토큰·원본 CSV는 로그에 넣지 않음. 수동 전달 기록은 실제 메일 발송/고객 수신 확인이 아님.

## 접근과 무결성

공개 테이블11개 전부 RLS 활성화. anon에는 회사 테이블/명령 권한 없음. authenticated는 현재 DB 소속으로 자신의 회사 자료만 읽을 수 있다. 업무 테이블의 직접 INSERT/UPDATE/DELETE는 금지하고 `flownote_command` RPC만 사용한다. profiles의 본인 display_name만 직접 수정 가능하다.

공개 RPC는 SECURITY INVOKER이며 실제 원자적 명령은 비노출 app_private 스키마의 제한된 SECURITY DEFINER 함수가 처리한다. auth.uid(), 확인된 이메일, 현재 회사·역할을 검사하고 회사 행 잠금으로 버전과 고객 한도 경쟁을 직렬화한다. 사용자 metadata의 role/회사명을 신뢰하지 않는다.

작성자는 자기 보고서를 승인할 수 없다. 최신 IN_REVIEW 버전만 타인 검수자가 승인한다. 새 버전은 DRAFT, 이전 스냅샷·작성자·원본 연결 정보는 변경 금지 트리거로 보호한다. 임의의 snapshot JSON을 저장하는 API는 없으며 DB가 저장 행에서 합계와 비율을 계산한다. CTR은0~1 비율, 비용은원×100 정수 단위다. 0분모는null이다.

정규화 행과 신고된 제외 내역만으로 플랫폼 원본의 완전성·진위를 증명할 수는 없다. declared_source_sha256는 클라이언트 주장이고, canonical_rows_sha256는 DB 계산값이다. 파일·광고 플랫폼 검증이 필요한 경우 서버 측 CSV 처리/플랫폼 연결을 추가해야 한다.

## 가입·로그인과 화면 연결

공개 사이트의 `/account.html`은 공식 supabase-js SDK로 가입·로그인하고 회사·고객·프로젝트를 실제 DB에 저장한다. 가입 확인 후 첫 회사 공간은 사용자가 버튼으로 생성한다. 다른 회원을 팀에 추가하려면 그 회원도 먼저 가입·이메일 확인을 완료해야 한다. 초대 메일을 자동 발송하는 기능은 없다.

기존 체험 대시보드/SQLite 운영판은 이 회사 자료를 읽거나 쓰지 않는다. 클라우드 보고서의 DB/RPC는 준비됐으나 기존 보고서 작성·미리보기·검수 UI와의 연결은 후속 작업이다. 기존 로컬 데이터 자동 이전도 수행하지 않았다.

Supabase 대시보드 → Authentication → URL Configuration:

- Site URL: `https://flow-note-psi.vercel.app`
- Redirect URL: `https://flow-note-psi.vercel.app/account.html`
- Pages에서도 가입 확인을 지원할 경우 `https://leejinho970715-star.github.io/flow-note/account.html`을 별도로 추가.
- 실제 운영 도메인만 추가한다. 임의의 preview 도메인 전체 와일드카드는 사용하지 않는다.

위 Vercel Site URL과 Redirect URL은 CEO 확인 후 실제 대시보드에 저장한 상태다. Pages의 가입 버튼은 이 Vercel 계정 화면을 연다. 실제 사용자의 메일 수신→이메일 확인→로그인 전체 왕복은 아직 검증하지 않았다.

현재 SMTP Settings의 custom SMTP가 꺼진 것을 직접 확인했다. CEO도 메일 발송 서비스·발신 도메인이 아직 준비되지 않았다고 답했다. Supabase 기본 발송은 프로젝트 조직 구성원 주소로 제한되므로, 일반 고객의 공개 가입은 메일 서비스 연결 전까지 운영 준비가 끝난 상태가 아니다. 가입 화면에도 이를 표시했다. 별도 유료 메일 서비스·도메인 생성이나 이메일 확인 해제는 수행하지 않았다. 준비 후 SMTP 호스트/포트/발신 주소/사용자/비밀을 Supabase 대시보드에서 설정하고, 실제 고객 외부 주소로 확인 링크→Vercel 복귀→로그인까지 검증해야 한다. 비밀키는 채팅·저장소에 넣지 않는다.

공식 근거: https://supabase.com/docs/guides/auth/auth-smtp

이메일 로그인 제공자와 신규 가입 허용을 확인하고 이메일 확인을 유지한다. 현재 DB는 확인되지 않은 계정/익명 로그인으로 회사 생성·업무 쓰기를 허용하지 않는다. 커스텀 SMTP·메일 전달률·스팸함·실사용 계정의 확인 링크 왕복은 별도 검증 사항이다. Auth 정책을 약화해 테스트를 통과시키지 않는다.

```js
import { createClient } from '@supabase/supabase-js';
// URL and sb_publishable_* key: public-config.json. Never service_role/secret.
const db = createClient(config.url, config.publishableKey);
await db.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:'https://flow-note-psi.vercel.app/account.html'}});
await db.auth.signInWithPassword({email,password});
const {data:{user}} = await db.auth.getUser();
const {data:company,error} = await db.rpc('flownote_command',{
  p_action:'create_company',p_payload:{name:'우리 회사'}
});
if(error)throw error;
```

등록할 회사에 속하지 않은 로그인 회원은 해당 회사 행을 보지 못한다. 회원가입과 회사 소속 추가는 별개다. 결제·사용권·플랜 결제 상태 동기화는 아직 구현하지 않았다.

## 쓰기 RPC 계약

```js
await db.rpc('flownote_command', {p_action:'create_client', p_payload:{company_id,name:'고객A',csv_client_id:'C01'}});
await db.rpc('flownote_command', {p_action:'create_project',p_payload:{company_id,client_id,name:'10월 운영',campaigns:['검색'],starts_on:'2026-10-01',ends_on:'2026-12-31'}});
// Only an owner; email must belong to an existing verified Auth account.
await db.rpc('flownote_command', {p_action:'add_member',p_payload:{company_id,email:'member@example.com',role:'reviewer'}});
await db.rpc('flownote_command', {p_action:'disable_member',p_payload:{company_id,email:'member@example.com'}});
```

`save_report` 입력: company_id, project_id, period_start, period_end, filename, 선택 source_sha256, source_row_count, excluded_row_count, excluded_reasons 배열, rows 배열, 선택 note. rows 각 행은 source_line/date/campaign/currency/impressions/clicks/spend_cents/leads를 포함한다. 비음수 정수·KRW·프로젝트 매핑·기간을 DB가 검사한다. 최대15000행/JSON3MB이며 원본 CSV2MB 제한은 기존 CSV 처리기 계약이다. 현재 기간 및 동일 길이 직전 기간 범위만 저장 가능하다. 중복(동일 보고서·정규화 행 해시)은 거부하고 실패 시 전체 트랜잭션을 되돌린다.

```js
await db.rpc('flownote_command',{p_action:'save_report',p_payload:{
 company_id,project_id,period_start:'2026-10-19',period_end:'2026-10-25',filename:'example.csv',
 source_row_count:1,excluded_row_count:0,excluded_reasons:[],rows:[{
  source_line:2,date:'2026-10-19',campaign:'검색',currency:'KRW',
  impressions:100,clicks:10,spend_cents:10000,leads:2
 }]
}});
await db.rpc('flownote_command',{p_action:'transition_report',p_payload:{
 company_id,version_id,transition:'submit',note:'검수 요청'
}});
// Different owner/reviewer account: transition = approve or request_changes.
// Approved version: mark_delivered + actual manual delivery note. No sending occurs.
```

## 누적 데이터 조회

일반 앱 쿼리는 회원 JWT로 실행하여 RLS를 적용한다. SQL Editor의 postgres 관리자는 RLS를 우회하므로 SQL Editor 조회 결과로 일반 회원 권한을 판단하면 안 된다.

```sql
-- Bind :company_id and pagination values in the application; do not concatenate input.
select id,name,csv_client_id,created_at
from public.clients where company_id=:company_id order by created_at desc,id limit 50;

-- Latest state per report, not all historical versions.
select id,project_id,version,status,snapshot,created_at
from public.latest_report_versions
where company_id=:company_id order by created_at desc,id limit 50;

-- Version history for a report.
select id,version,status,created_by,created_at,approved_by,approved_at
from public.report_versions
where company_id=:company_id and report_id=:report_id order by version desc;

-- Company operations, not ad revenue.
select status,count(*) as reports
from public.latest_report_versions where company_id=:company_id group by status;

select action,actor_id,entity_id,details,created_at
from public.audit_events where company_id=:company_id
order by created_at desc,id desc limit 100;
```

import_rows 전체나 모든 버전을 합산하면 수정 전후 광고 지표가 중복 집계된다. 집계 목적에 맞게 같은 보고서의 대상 버전과 기간을 선택해야 한다. 광고비는 대행사 매출·이익이 아니다.

## 검증·운영

`supabase/tests/tenant_workflow.sql`은 실제 프로젝트에서 트랜잭션으로 실행하고 모든 픽스처를 ROLLBACK한다. Auth users는 SQL 테스트용 확인 상태 행이며 실제 가입 확인 메일·세션 발급 E2E 테스트를 대체하지 않는다. 검증 항목: 익명 거부, 회사 격리, 역할 직접 변경 거부, 다른 회사 고객 연결 거부, DB 합계/가중 비율, 자기 승인 거부, 타인 승인, 중복 실패 원자성, 승인 스냅샷 고정, 새 버전 DRAFT, 소속 비활성화 즉시 접근 거부.

보안 Advisor에서 지적0건을 확인했다. 외래키 인덱스도 적용했다. 신규 DB의 unused-index 안내는 실사용이 없어서 나오는 정보이며 삭제 근거로 쓰지 않았다. 실제 고객 유입 후 쿼리 계획과 느린 쿼리·용량·백업/복구를 계속 확인해야 한다. 이 작업에서 유료 PITR·새 서버·스토리지 버킷은 생성하지 않았다.

보관기간·계정 탈퇴/회사 해지 시 익명화·삭제 절차와 고객 동의 범위는 실제 상용 도입 전에 확정한다. 회사 데이터는 현재 자동 삭제하지 않는다. 회사 소유자 변경/탈퇴 기능은 아직 제공하지 않는다. 기존 SQLite 백업과 Supabase 관리형 백업은 다른 체계다.
