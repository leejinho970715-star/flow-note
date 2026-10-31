# ENOTE-LABS CMO·CPO·CTO 웹사이트 검토

- CMO: 효과를 수치로 약속하기보다 고객이 정리할 업무와 체험 후 상담 경로를 명확히 한다. 허위 고객 수·후기·절감 수치는 추가하지 않는다.
- CPO: Flownote는 보고·고객 프로젝트, ProjectFlow는 범용 프로젝트·작업, Follonote는 영업·후속 연락, Crewmemo는 팀 내부 협업으로 설명한다. 차이는 FAQ로 안내하고 체험/운영 범위를 구분한다.
- CTO: 회사 canonical·og:url·sitemap은 https://enote-labs.vercel.app/ 로 맞춘다. 기존 제품 앱의 인증 반환 URL과 canonical 호스트는 유지한다. 공개 앱 셸의 noindex가 읽히도록 robots의 중복 크롤링 차단을 제거하며 Auth/RLS는 변경하지 않는다.

## 반영 내용

- 브랜드를 포함한 title, description, og:title, og:description, og:image:alt, twitter:description 및 image:alt.
- 새 로고와 오렌지 화면이 담긴 1200×630 공유 이미지.
- 제품 차이 FAQ와 이메일 상담 CTA.
- Organization 이메일/문의 채널과 WebSite 구조화 데이터. 개인 Telegram은 sameAs 대신 문의 채널로 기록.
- 네 제품의 최신 오렌지 캡처 및 새 파일명 PDF 링크로 구버전 캐시 방지.
- 대표자·이메일·Telegram·저작권은 CEO가 제공한 내용만 표기.

## 기술 근거

- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://ogp.me/

## 확인

빌드 검증에서 canonical·og:url·sitemap의 실제 값을 대조하고 JSON-LD 파싱, 공유 이미지 크기, PDF 헤더, 새 클레이 에셋을 검사한다. 모바일에서는 가로 넘침과 탭/문구/푸터 표시를 확인한다. 검색 노출 순위나 리치 결과는 보장하지 않는다.
