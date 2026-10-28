# Flownote 서비스 랜딩 제작 기록

2026-10-28. 오렌지 계열의 서비스 소개 페이지에서 Flownote 도입과 맞춤 ERP·PMS·CRM 구축을 함께 안내합니다. CMO는 고객 메시지와 가격 범위, CPO는 정보 구조와 두 가지 도입 경로, CTO는 정적 배포·SEO·실제 제공 범위를 검토했습니다.

## 경로와 문의

- `/`: 서비스 소개 및 상품·가격·업종별 활용·도입 과정·FAQ·상담 초안
- `/workspace/`: 기존 가상 자료 대시보드
- `/csv.html`: 브라우저 CSV 검사·집계 체험
- `/account.html`: Supabase 회사 계정 개발 검증 화면

문의 채널은 사용자가 제공한 https://t.me/evanlee97 입니다. 폼은 현재 브라우저 메모리에서 초안을 만들고 복사하거나 TXT로 내려받습니다. 서버 저장·자동 전송·접수 처리는 없습니다. 입력 내용이나 상품이 변경되면 이전 초안을 무효화합니다.

2주 파일럿 199,000원, 표준 설정 총 590,000원(파일럿 포함), 선택 유지관리 월 50,000원은 VAT 별도의 제안 기준입니다. 실제 범위와 완료 조건은 견적 합의가 필요합니다. 유지관리는 클라우드 SaaS 사용권이나 무제한 개발이 아닙니다. 맞춤 개발은 진단 후 별도 견적입니다. 결제 기능은 없습니다.

## 실제 제공 상태

공개 대시보드는 가상 자료 조회용이며 CSV 검사는 브라우저에서 실제 처리합니다. 로컬 SQLite 운영판은 보고서 작성·타인 승인·버전 보관을 지원합니다. Supabase 계정·회사·고객·프로젝트 저장과 클라우드 보고서 UI 연결은 구분해서 안내합니다. 일반 고객 가입 확인 메일은 SMTP 준비가 필요하며, 광고 API·메일 자동 발송·결제·회계는 연결하지 않았습니다.

## 디자인 및 이미지 출처

Pretendard, 최소 14px, 채움·테두리·영역으로 구분한 버튼, 반응형 레이아웃을 적용했습니다. 사용자 요청에 따라 연결선·리본·튜브로 오브젝트를 연결하는 이미지는 사용하지 않습니다.

내장 imagegen의 이미지 편집 모드로 최종 에셋을 생성했습니다. 선택 원본:
`C:/Users/tlscj/.codex/generated_images/01a15d20-33cf-70a2-903e-ebe8249b9353/exec-5359b6a0-e828-4446-8a5f-157e87275684.png`

편집 프롬프트(요구사항 기록):
> Edit the warm orange clay illustration. Completely remove ALL curved ribbons, connectors, tubes, lines, strings, wires and linking bands. Use independent objects: an orange folder in the center, a spreadsheet tile at upper left, a chat bubble at upper right and an approval tile at lower right, separated by ivory negative space. Preserve simplified matte clay materials, soft studio light and shadows, warm orange and ivory palette, 4:3 composition. No text, logos or people. No connections between objects.

프로젝트 원본은 `assets/clay-workflow-no-lines-master.png`, 배포용은 `assets/clay-workflow-1200.jpg`와 `assets/clay-workflow-640.jpg`입니다. JPG는 원본을 단순 축소·인코딩한 파일입니다. 초기 연결 리본 버전은 배포하지 않습니다. 브랜드 마크는 코드로 작성한 `mark.svg`입니다.

## SEO / GEO

주요 설명·가격·FAQ는 정적 HTML에 있습니다. 한 개의 H1, 설명·OG 메타, Organization/WebSite/WebPage/SoftwareApplication/Service JSON-LD, robots.txt, sitemap.xml을 생성합니다. 정식 canonical은 https://flow-note-psi.vercel.app/ 이며 Pages는 미러입니다. 체험·계정·가상 보고서는 noindex입니다. 허위 리뷰나 성과는 넣지 않았습니다. 검색 노출·AI 답변 인용·색인 반영은 검증하거나 보장하지 않습니다.

참고: https://developers.google.com/search/docs/essentials · https://developers.google.com/search/docs/appearance/ai-features

## 검증

- `npm test`: 기존 업무 처리 테스트 25개 통과
- `npm run build:vercel`, `npm run build`, `npm run verify:pages`: 통과
- 정적 파일 링크, 메타·구조화 데이터, 배포 경로, 가상 자료 격리 확인
- 데스크톱 1265px·모바일 390px에서 가로 넘침 없음, 표시 글자 14px 미만 없음
- 상품 선택 → 문의 초안 → 복사·TXT 다운로드 확인
- 문의 수정 후 이전 초안 숨김·초기화 확인
- 모바일 검증 후 뷰포트 원복, 기존 `/workspace/` 동작 확인

실제 고객 상담 전송, 구매·결제, 일반 고객 메일 인증 왕복, 검색엔진 색인·AI 검색 인용은 검증하지 않았습니다.

## 2026-10-28 모바일 정밀 점검 및 공유 에셋

320/360/390/430/600/768/1024/1280px에서 랜딩·워크스페이스·CSV·계정 총 32개 조합을 브라우저로 확인했습니다. 페이지 가로 넘침과 스크롤 영역 밖으로 나가는 요소는 발견되지 않았습니다(수정 후). 대시보드 내부 메뉴 4개, 승인 보고서 상세, 가이드 창, 펼친 FAQ, 긴 문의 초안, CSV 검수 탭도 추가로 확인했습니다. 실제 iOS Safari/Android 기기의 별도 검증은 수행하지 않았습니다.

수정: CSV 출력 패널의 grid 자식 최소 너비 때문에 발생한 320px 가로 넘침 제거, 768px에서 지나치게 좁은 출력 영역을 만드는 사이드바 재배치, 작은 화면의 도입 절차·온보딩·지표를 한 열로 전환, 헤더 도움말 버튼 최소 너비, 긴 문자열의 비상 줄바꿈, 금액의 불필요한 줄바꿈 방지. 데이터 표는 자체 영역에서만 가로 스크롤하며 검수 설명 열은 340px를 확보했습니다. 표 스크롤 안내도 추가했습니다. 본문 전체를 overflow:hidden으로 가리지 않습니다.

공유 카드 `assets/og-flownote.png`는 코드로 구성한 `social-preview.html`을 브라우저로 렌더링한 1200×630 PNG입니다. 기존 연결선 없는 클레이 일러스트를 재사용했습니다. 신규 AI 이미지 생성은 없습니다. `favicon.svg`는 기존 문서 로고를 바탕으로 만든 정사각형 벡터이며 PNG 32×32, ICO, Apple touch icon 180×180을 함께 제공합니다. OG 메타·Twitter 카드·favicon 링크와 빌드 복사에 연결했고 PNG 실제 시그니처·픽셀 치수도 배포 검증에 추가했습니다.

Vercel/Pages 빌드·정적 배포 검사와 4개 CSS 문법 검사를 통과했습니다. 모바일 화면 테스트 결과는 게시하지 않는 `test-results/mobile-layout-audit.json`에 기록합니다. 메신저 사업자의 기존 링크 미리보기 캐시는 즉시 갱신을 보장하지 않습니다.
