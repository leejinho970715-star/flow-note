# Flownote

고객별 자료 확인부터 보고서 승인과 보관까지 한곳에서 정리하는 소형 마케팅대행사용 템플릿입니다. 예시 고객과 수치는 모두 가상입니다.

## 공개 체험판

https://leejinho970715-star.github.io/flow-note/

- 대시보드: 고객·프로젝트, 가상 보고서 상태, 승인본 다운로드, 팀 역할 예시, 변경 기록, 사용 매뉴얼과 검색형 도움말을 둘러봅니다.
- CSV 직접 체험: 브라우저에서 CSV를 검사·집계하고 고객별 HTML/CSV를 다운로드합니다. 입력 파일은 서버에 업로드하지 않습니다.
- 공개 대시보드는 조회 전용입니다. 계정 생성·서버 저장·승인을 실행하지 않습니다. 가상 자료는 빌드할 때 메모리 DB에서만 생성하며 운영 DB나 비밀번호는 게시하지 않습니다.

## Supabase 회사 계정과 Vercel

Vercel: https://flow-note-psi.vercel.app/ · 회사 계정: https://flow-note-psi.vercel.app/account.html

공개 체험판과 실제 계정 자료를 분리했습니다. 회사 계정 화면은 Supabase 이메일 가입·로그인, 회사 공간 생성, 고객·프로젝트 저장, 기존 가입 회원의 팀 소속 추가를 지원합니다. 클라우드 보고서 작성·승인 화면은 아직 연결하지 않았으며 로컬 SQLite 자료도 자동 이관하지 않습니다. 보고서 누적·승인 DB와 RPC는 구축했고 실제 DB 검증은 `supabase/tests/tenant_workflow.sql`에 있습니다.

DB 구조·가입 설정·조회/저장 쿼리는 [Supabase 운영 문서](supabase/README.md)를 참고하세요. `supabase/public-config.json`에는 브라우저용 publishable 키만 있습니다. 비밀키와 service_role 키는 브라우저에 넣지 않습니다.

일반 고객의 가입 확인 메일 발송은 SMTP 서비스·발신 도메인 준비가 필요합니다. 현재 custom SMTP 미연결 상태로, 기본 메일은 Supabase 조직 구성원 주소에만 발송됩니다. 실제 메일 수신·확인·로그인 왕복은 미검증이며 가입 화면은 개발 검증 단계입니다.

`vercel.json`은 출력 폴더를 `dist`로 지정하고 Vercel 빌드는 루트(`/`), Pages 빌드는 `/flow-note/` 경로를 사용합니다. Vercel 빌드 검증: `npm run build:vercel`.

## 로컬 운영판 실행

Node.js 24.x. 로컬 서버 자체는 Node 내장 기능을 사용하며, 공개 사이트 빌드에는 `npm ci`가 필요합니다.

```sh
npm start
```

http://127.0.0.1:3002/workspace 에 접속합니다. 먼저 가상 자료 체험을 선택하거나 지속 사용할 회사 계정을 만드세요. 고객·프로젝트 매핑, CSV 검사, 초안 저장, 타인 검수·승인, 버전별 승인본 보관·다운로드를 지원합니다. 작성자는 자기 보고서를 승인할 수 없습니다.

데이터는 `data/flownote.sqlite`에 저장됩니다. 체험 계정은 로그아웃 후 복구할 수 없습니다. 운영판은 loopback 전용이며 공개 SaaS 배포용 인증·복구·보안 검증을 마친 제품이 아닙니다. 광고 API·메일 발송·예약 실행·결제·회계는 미연결입니다. 도움말은 매뉴얼 검색이며 LLM 호출이나 회사 데이터 조회를 하지 않습니다.

```sh
npm test
npm run build
npm run verify:pages
npm run test:http
npm run flownote:backup
npm run flownote:restore -- "백업 파일의 절대 경로"
```

HTTP 검사는 먼저 로컬 서버를 실행해야 하며 합성 자료로 진행합니다. 복원은 새 DB만 만들고 운영 DB를 덮어쓰지 않습니다. `FLOWNOTE_DB`로 검증한 복원본을 선택할 수 있습니다. 모든 회사 자료가 있는 DB는 운영자만 취급하세요.

## 배포와 디자인

main에 푸시하면 GitHub Actions가 Node 24 테스트 → 공개 체험판 빌드 → 공개 파일 검증 → Pages 배포를 수행합니다. 배포 아티팩트는 `dist/`만 사용합니다. 실제 DB·서버 코드·환경변수는 포함하지 않습니다. GitHub Pages는 SQLite와 서버 API를 실행할 수 없습니다.

Pretendard를 로컬 제공하며 최소 글자 크기는 14px입니다. 녹색 채움은 주요 실행, 흰 배경 테두리는 보조 실행, 연한 배경 영역은 탐색·도움말에 사용합니다. 사이드바의 구분선과 선택 메뉴의 왼쪽 선을 제거했습니다. 폰트 라이선스: `demos/weekly-report/assets/Pretendard-LICENSE.txt`.

개발 상세·입력 계약은 [운영 매뉴얼](demos/weekly-report/README.md)을 참고하세요. 실제 고객의 구매 의사나 시간 절감·수익은 검증하지 않았습니다.
