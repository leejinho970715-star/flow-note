# AgencyFlow

웹에이전시·디자인 스튜디오의 이미지 시안 피드백 중심 초기 MVP입니다. 전체 사업 진단·가격 가설·30일 검증 계획: [제품 검토](../docs/agencyflow-product-review.md).

## 실행·배포

저장소 루트에서 `npm ci`, `npm run dev:agency`(3005), `npm run build:agency`를 실행합니다. Next.js16.4.3/React19.3.1/TypeScript7/Tailwind4, 정적 export + Supabase Auth/RPC/비공개 Storage 구조입니다. Vercel 프로젝트 환경변수 `FLOWNOTE_TARGET=agency`로 기존 `npm run build:vercel`이 AgencyFlow만 빌드합니다. 회사 소개 프로젝트는 `FLOWNOTE_TARGET=company`이며 기존 Flownote는 해당 변수가 없습니다.

`NEXT_PUBLIC_AGENCY_URL`은 실제 정식 AgencyFlow origin을 지정합니다. 공개 Supabase URL/키는 기존 `supabase/public-config.json`을 사용하며 비밀키는 포함하지 않습니다. Auth 이메일 반환 허용 URL에 정식 AgencyFlow `/workspace/?mode=cloud`를 등록하고 custom SMTP를 준비해야 공개 가입 왕복을 검증할 수 있습니다. 기존 Flownote Auth 반환 주소는 유지합니다.

## 제공 기능

- 샘플: 가상 고객/프로젝트, 실제 브라우저 저장·이미지 IndexedDB 업로드, 위치 핀/답글/상태/고객 역할 시연/승인, 견적 생성·저장·승인. 다른 브라우저나 실제 고객과 공유되지 않습니다.
- 회사 모드: 로그인/가입 요청, 별도 회사 공간, 고객 등록·수정·보관, 프로젝트 단계/일정/보관, 시안 비공개 업로드·버전/핀/댓글·상태·고객 승인, 팀원/프로젝트별 고객 연결, 견적 서버 재계산·버전·공개·승인, 작업 생성/상태, 14일 검증 체험 및 서버 읽기 전용.
- 견적 PDF: 별도 PDF 파일 서버 생성이 아니라 브라우저 인쇄 → PDF 저장입니다. 단가·난이도 예시는 검증된 시장 견적이 아닙니다.
- 고객 초대는 가입·이메일 확인된 기존 계정을 연결합니다. 초대 메일/비회원 공유 링크는 제공하지 않습니다. 내부 팀은 고객을 대신해 승인할 수 없습니다.

## 완료로 표시하지 않는 항목

토스 신청·키가 없어 실결제/정기 갱신/취소/실패/웹훅/유료 활성화는 비활성입니다. `af_subscriptions`, `af_payments`는 클라이언트 쓰기가 금지된 확장용 DB이며 결제 연동이 완료됐다는 의미가 아닙니다. 프런트엔드에서 결제 성공을 임의 선언해 플랜을 바꾸는 API는 없습니다.

계약 전자서명/계약서 PDF, 웹 URL 자동 캡처·DOM 핀, 유지보수 정기 청구, 자동 알림, 화이트라벨, 운영자 MRR/해지율 대시보드, 운영 약관·개인정보 고지·백업 복구 및 실제 고객 계정의 메일 인증 왕복은 출시 전 남은 항목입니다. 고객 승인 기록은 전자서명 계약이 아닙니다. 실제 사용자에게 판매 가능한 운영판으로 검증 완료했다고 표시하지 않습니다.

## 권한과 데이터

별도 `af_*`16개 테이블, RLS, 회사+프로젝트 복합 외래키, 최소5분 만료 이미지 서명 URL, 업로드5MB/파일, 체험1GB. 가입 이메일 확인 계정만 업무 명령을 실행합니다. RPC는 공개 SECURITY INVOKER → 비노출 af_private의 검증된 SECURITY DEFINER로 이어집니다. 상태·회사·권한·체험·한도·고객 프로젝트를 DB가 확인하며 조직 잠금으로 동시 변경을 직렬화합니다. 내부 팀원과 고객의 역할을 Auth user_metadata에서 읽지 않습니다. 저장된 승인본 파일은 덮어쓰기·사용자 삭제를 허용하지 않습니다. 직접 테이블 업무 쓰기·역할/요금 변경·결제 기록 조작은 허용하지 않습니다.

DB 검증: `supabase/tests/agencyflow_workflow.sql`은 실제 Postgres에서 익명/타회사/고객 권한, 핀·답글·견적 계산·승인·잠금·체험 만료·파일 메타데이터 RLS를 시험하고 모두 롤백합니다. 이는 Auth 메일 발송·실제 파일 HTTP 전송·결제를 검증한 것과 구분합니다.

## 브랜드·SEO/GEO

AgencyFlow 전용 바이올렛 말풍선 favicon(SVG/32px PNG/180px Apple), `public/og-agencyflow.png`1200×630. 공유 카드 소스는 `branding/social-preview.html`, 시안은 자체 작성 `public/sample-design.svg`(가상 브랜드)입니다. 기존 회사 랜딩은 오렌지 문서 아이콘과 별도 `marketing/assets/og-studio.png`를 사용합니다. 신규 AI 이미지 호출 없이 코드 기반 자산과 기존 클레이 이미지를 재구성했습니다.

서버 빌드 시 출력되는 설명·FAQ·가격 범위·독립 canonical·OG/Twitter·SoftwareApplication/WebSite JSON-LD·robots·sitemap을 제공합니다. 워크스페이스는 noindex이며 검색/AI 인용을 보장하지 않습니다. SEO를 위해 고객 자료·메일·견적을 공개하지 않습니다.

브라우저 검증: 7개 메뉴×7개 너비(320/360/390/430/768/1024/1280px) 49개 조합에서 페이지 넘침·좁은 문단·14px 미만 글자 없음. 핀 등록→답글→처리 완료→고객 승인→재방문 유지, 승인된 v1 유지→실제 새 이미지 v2 업로드, 옵션 견적 계산→새 버전→고객 공개·승인, 고객 등록 모달 저장을 샘플 모드에서 확인했습니다. 실제 고객 간 HTTP 파일 전송·메일 인증·결제는 이 샘플 검증에 포함하지 않습니다.

2026-10-28 CEO 승인 후 Supabase Redirect URLs에 `https://agencyflow-studio-dun.vercel.app/workspace/?mode=cloud`를 실제 저장했습니다. 기존 Flownote Site URL과 `/account.html` 반환 주소는 유지합니다. 일반 고객 메일 인증 왕복은 SMTP 준비 전까지 미검증입니다.

공개 배포 최종 검사에서 높이720px 창의 사이드바 하단 버튼 접근 문제를 발견해 데스크톱 사이드바 자체 스크롤을 추가했습니다. 너비뿐 아니라 낮은 높이의 메뉴 조작도 확인합니다.
