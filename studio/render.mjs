const origin = "https://enote-labs.vercel.app";
const metaTitle = "ENOTE-LABS | ERP·PMS·CRM·그룹웨어와 맞춤 업무 시스템";
const metaDescription =
  "작은 팀의 보고·프로젝트·영업·협업 업무를 정리하세요. 업무 솔루션 체험부터 ERP·PMS·CRM·그룹웨어 맞춤 구축 상담까지 ENOTE-LABS.";
const shareTitle = "ENOTE-LABS | 우리 회사에 맞는 업무 시스템";
const shareDescription =
  "보고·프로젝트·영업·팀 협업을 위한 ENOTE-LABS의 업무 도구. 가상 샘플로 살펴보고, 필요한 업무부터 맞춤 구축을 상담하세요.";
export const products = [
  {
    id: "flownote",
    screen: "flownote-screen-orange-20261031.jpg",
    name: "Flownote",
    category: "ERP",
    ko: "플로노트",
    tag: "보고 · 프로젝트 운영",
    color: "#c65a22",
    bg: "#fff0e2",
    title: "아침마다 모으던 자료,<br>보고할 내용만 남기세요.",
    desc: "고객과 프로젝트의 진행 상황을 정리하고, 보고할 내용을 한곳에서 확인하세요. 작은 대행사의 반복 보고 업무부터 시작합니다.",
    items: [
      "고객·프로젝트 현황 정리",
      "자료를 바탕으로 보고 초안 준비",
      "사람이 확인한 뒤 최종 공유",
    ],
    note: "체험판 · 외부 광고 계정 자동 수집은 별도 연동 범위",
    url: "https://flow-note-psi.vercel.app/workspace/",
    icon: "report",
    tile: "아침마다 반복되는<br>자료 취합과 보고 준비.",
    chip: "반복 정리는 줄이고",
    sub: "확인해야 할 일은 더 선명하게.",
  },
  {
    id: "agencyflow",
    screen: "agencyflow-screen-orange-20261031.jpg",
    name: "ProjectFlow",
    category: "PMS",
    ko: "ProjectFlow",
    tag: "프로젝트 · 작업 · 피드백",
    color: "#c65a22",
    bg: "#fff0e2",
    title: "업종은 달라도,<br>프로젝트의 흐름은 명확하게.",
    desc: "컨설팅, 교육, 행사, 운영 개선과 제작 프로젝트까지. 담당자·일정·단계·작업 진행률을 관리하고, 필요한 프로젝트에서는 자료 검토와 고객 피드백을 이어가세요.",
    items: [
      "프로젝트 검색·단계별 보드·진척 확인",
      "버전별 수정 이력과 고객 승인",
      "전체 프로젝트 작업·담당자·마감일 확인",
    ],
    note: "초기 검증판 · 결제·전자서명·웹 자동 검수는 준비 중",
    url: "https://agencyflow-studio-dun.vercel.app/",
    icon: "feedback",
    tile: "어느 부분을 고칠지,<br>같은 화면을 보며 정확하게.",
    chip: "이 버튼의 색상을 바꿔주세요.",
    sub: "위치와 맥락이 남는 고객 피드백.",
  },
  {
    id: "follonote",
    screen: "follonote-screen-orange-20261031.jpg",
    name: "Follonote",
    category: "CRM",
    ko: "Follonote",
    tag: "영업 · 고객 관리",
    color: "#c65a22",
    bg: "#fff0e2",
    title: "좋은 상담이,<br>다음 연락으로 이어지게.",
    desc: "영업 담당자가 바뀌어도 고객의 맥락이 남도록. 상담 기록과 진행 단계, 다음 연락 날짜를 연결하는 간결한 영업 CRM입니다.",
    items: [
      "고객별 연락처와 상담 기록",
      "신규부터 수주까지 영업 파이프라인",
      "후속 연락 날짜와 완료 상태",
    ],
    note: "초기 검증판 · 기회 금액은 입력값이며 매출 예측이 아닙니다.",
    url: "https://flownote-studio.vercel.app/follonote/",
    icon: "crm",
    tile: "고객과 나눈 이야기,<br>다음 연락까지 놓치지 않게.",
    chip: "다음 행동이 있는 고객 관리",
    sub: "누구에게, 언제, 무엇을 연락할지.",
  },
  {
    id: "crewmemo",
    screen: "crewmemo-screen-orange-20261031.jpg",
    name: "Crewmemo",
    category: "Groupware",
    ko: "Crewmemo",
    tag: "그룹웨어 · 팀 협업",
    color: "#c65a22",
    bg: "#fff0e2",
    title: "흩어진 팀 소식,<br>함께 움직이는 하루로.",
    desc: "메신저 위로 밀려난 공지와 구두로 끝난 결정을 기록으로 남기세요. 공지, 팀 일정, 내부 결재와 담당 업무를 모았습니다.",
    items: [
      "팀 공지와 공유 일정",
      "지정 결재자의 승인·반려 기록",
      "담당자·마감일이 있는 팀 업무",
    ],
    note: "초기 검증판 · 급여·근태·회계·전자서명은 제공하지 않습니다.",
    url: "https://flownote-studio.vercel.app/crewmemo/",
    icon: "team",
    tile: "공지와 일정, 결재와 업무를<br>우리 팀의 한 공간에.",
    chip: "결정은 기록으로 남겨두세요.",
    sub: "작성자와 결재자가 구분되는 승인 흐름.",
  },
];
const btn = (label, url, cls = "dark") =>
  `<a class="btn ${cls}" href="${url}" ${url.endsWith(".pdf") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
const browser = (p) =>
  `<div class="browser mac-browser mock-motion"><div class="mac-toolbar"><div class="mac-controls" aria-hidden="true"><i></i><i></i><i></i></div><div class="mac-address"><span aria-hidden="true">⌑</span>${p.name} · 실제 제품 화면</div><span class="mac-menu" aria-hidden="true">⋯</span></div><img src="/assets/${p.screen}" alt="${p.ko} 실제 제품의 가상 샘플 화면 캡처" width="1280" height="720" loading="lazy"></div>`;
const heading = (tag, title, desc = "") =>
  `<div class="section-title reveal"><span class="eyebrow">${tag}</span><h2>${title.replaceAll("<em>", "<em data-typewriter>")}</h2>${desc ? `<p>${desc}</p>` : ""}</div>`;
const clay = (name) =>
  `<img class="clay-icon" src="/assets/clay/${name}.webp" alt="" width="64" height="64" decoding="async">`;
const productShowcase = `<section class="section wrap product-section" id="products">${heading("FIND YOUR WORKFLOW", "우리 팀에 맞는 제품,<br><em>탭으로 살펴보세요.</em>", "보고·프로젝트 관리부터 영업과 팀 협업까지.<br>실제 제품의 가상 샘플 화면으로 확인하세요.")}<div class="product-tabs" role="tablist" aria-label="제품 종류" aria-orientation="horizontal">${products.map((p, i) => `<button type="button" role="tab" id="tab-${p.id}" aria-controls="${p.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-product="${p.id}"><span class="tab-symbol" aria-hidden="true">${clay(p.icon)}</span><span><b>${p.name}</b><small><strong>${p.category}</strong><br>${p.tag}</small></span></button>`).join("")}</div><div class="product-panels">${products.map((p, i) => `<article class="feature-card product-panel" id="${p.id}" role="tabpanel" aria-labelledby="tab-${p.id}" tabindex="0" data-product-panel><div class="feature-copy"><span class="product-label">0${i + 1} / ${p.name.toUpperCase()} · ${p.category}</span><h2>${p.title}</h2><p>${p.desc}</p><ul>${p.items.map((s) => `<li>${s}</li>`).join("")}</ul><div class="actions">${btn(p.name + " 샘플 살펴보기 ↗", p.url)}${btn("제품소개서 보기 ↗", "/manuals/" + p.id + "-guide-orange-20261031.pdf", "white")}</div><small>${p.note}</small></div><div class="feature-visual">${browser(p)}<div class="visual-note"><span aria-hidden="true">${clay(p.icon)}</span><div><b>${p.chip}</b><p>${p.sub}</p></div></div><a class="screen-original" href="/assets/${p.screen}" target="_blank" rel="noopener noreferrer">실제 캡처 크게 보기 ↗</a></div></article>`).join("")}</div><p class="caption">실제 제품을 캡처한 가상 자료 화면입니다. 제품 화면의 고유 색상은 유지했습니다.<br>제품별 기능과 제공 범위는 소개서에서 확인하세요.</p><p class="sr-only" id="product-tab-status" aria-live="polite"></p></section>`;
const faq = [
  [
    "Flownote와 ProjectFlow는 어떻게 다른가요?",
    "고객·프로젝트 현황을 모아 반복 보고를 준비하려면 Flownote, 업종에 관계없이 작업 담당자·일정·단계·진행률을 관리하려면 ProjectFlow부터 살펴보세요. 영업 상담과 다음 연락은 Follonote, 팀 내부 공지·일정·결재는 Crewmemo에 맞습니다.",
  ],
  [
    "어떤 회사에 잘 맞나요?",
    "엑셀과 메신저로 고객·프로젝트·보고를 관리하는 작은 대행사, 디자인·제작 스튜디오, 컨설팅팀에 권합니다. 복잡한 회계·급여 전체 교체가 목적이라면 먼저 필요한 범위를 확인합니다.",
  ],
  [
    "네 제품의 데이터가 자동으로 연결되나요?",
    "현재 독립된 제품입니다. Follonote와 Crewmemo는 ProjectFlow의 공통 회사 계정·팀 권한을 활용하지만 제품 간 업무 자료를 자동으로 넘기지는 않습니다. 필요한 연동은 별도 범위로 설계합니다.",
  ],
  [
    "설치해서 쓰나요, 웹에서 쓰나요?",
    "기본은 웹 접속 방식입니다. 소스 인수, 회사 서버 설치, 별도 도메인이나 독립 운영 환경은 도입 범위에 따라 협의합니다. 체험 화면과 실제 회사 데이터 공간은 구분됩니다.",
  ],
  [
    "지금 바로 결제하고 사용할 수 있나요?",
    "자동 구독 결제와 일반 고객 인증 메일 발송은 준비 중입니다. 먼저 가상 샘플로 업무 적합성을 확인하고 상담을 통해 파일럿 범위와 계정 준비를 안내받으세요.",
  ],
  [
    "기존 엑셀이나 사용 중인 서비스를 연결할 수 있나요?",
    "가능 여부는 실제 양식과 해당 서비스의 API 제공 범위를 확인한 뒤 결정합니다. 개인정보를 가린 예시로 먼저 상담하세요. 자동 수집이나 데이터 이전은 기본 포함으로 약속하지 않습니다.",
  ],
];
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "ENOTE-LABS",
      url: origin + "/",
      publisher: { "@id": origin + "/#organization" },
    },
    {
      "@type": "Organization",
      "@id": origin + "/#organization",
      name: "ENOTE-LABS",
      alternateName: "이노트랩스",
      url: origin,
      logo: origin + "/assets/enote-labs-logo-20261031.png",
      email: "leejinho970715@gmail.com",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "도입 상담",
        email: "leejinho970715@gmail.com",
        url: "https://t.me/evanlee97",
      },
    },
    {
      "@type": "Service",
      name: "기업 맞춤 업무 시스템 구축",
      provider: { "@id": origin + "/#organization" },
      serviceType: "ERP·PMS·CRM 및 업무 자동화 시스템 개발",
      description:
        "업무 진단, 작은 범위 견적, 구축·교육·인수 확인, 유지관리 및 확장",
    },
    {
      "@type": "ItemList",
      name: "ENOTE-LABS 제품",
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: new URL(p.url, origin).href,
      })),
    },
  ],
};
export const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${metaTitle}</title><meta name="description" content="${metaDescription}"><link rel="canonical" href="${origin}/"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="ENOTE-LABS"><meta property="og:title" content="${shareTitle}"><meta property="og:description" content="${shareDescription}"><meta property="og:url" content="${origin}/"><meta property="og:image" content="${origin}/assets/og-enote-labs-20261031.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="ENOTE-LABS 로고와 오렌지 업무 대시보드 샘플"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${shareTitle}"><meta name="twitter:description" content="${shareDescription}"><meta name="twitter:image:alt" content="ENOTE-LABS 로고와 오렌지 업무 대시보드 샘플"><meta name="twitter:image" content="${origin}/assets/og-enote-labs-20261031.png"><meta name="theme-color" content="#f57832"><link rel="icon" href="/assets/enote-labs-icon-32-20261031.png" type="image/png"><link rel="apple-touch-icon" href="/assets/enote-labs-icon-180-20261031.png"><link rel="preload" href="/assets/PretendardVariable.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/style.css?v=enote-20261031-spacing"><script type="module" src="/main.js?v=enote-20261031-spacing"></script><script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script></head><body><a class="skip" href="#main">본문 바로가기</a><header class="header"><a class="brand" href="/" aria-label="ENOTE-LABS 홈"><img src="/assets/enote-labs-logo-20261031.png" alt="" width="32" height="32">ENOTE-LABS<span>이노트랩스</span></a><nav aria-label="주 메뉴"><a href="#products">제품</a><a href="#custom">맞춤 구축</a><a href="#pricing">도입 비용</a>${btn("업무 상담 ↗", "#contact", "small dark")}</nav></header><main id="main">
<section class="hero"><div class="wrap hero-inner"><div class="hero-copy reveal"><span class="eyebrow pill">LESS BUSYWORK. MORE FLOW.</span><h1>흩어진 일을 모아,<br><em data-typewriter>일이 흐르게.</em></h1><p>작은 팀의 보고·프로젝트·고객·협업 업무를<br class="desktop"> 필요한 제품과 맞춤 구축으로 정리합니다.</p><div class="actions">${btn("우리 팀에 맞는 제품 찾기 ↗", "#products", "orange")}${btn("맞춤 구축 상담", "#contact", "white")}</div><small>가상 샘플로 확인하고, 작은 파일럿 범위를 상담하세요.</small></div><div class="hero-stage"><div class="glow peach"></div><div class="glow yellow"></div><div class="floating-chip chip-left"><span class="chip-icon" aria-hidden="true">${clay("report")}</span><div><b>보고 준비는 가볍게</b><span>모으고, 확인하고, 공유하세요.</span></div></div><div class="laptop mock-motion"><div class="laptop-display"><div class="mac-toolbar"><div class="mac-controls" aria-hidden="true"><i></i><i></i><i></i></div><div class="mac-address">Flownote · 실제 제품 화면</div><span class="mac-menu" aria-hidden="true">⋯</span></div><img src="/assets/flownote-erp-orange-20261031.jpg" alt="Flownote 보고서와 프로젝트 현황을 확인하는 실제 샘플 대시보드" width="1280" height="720" fetchpriority="high"></div><div class="laptop-base"></div></div><div class="floating-chip chip-right"><span class="check" aria-hidden="true">${clay("check")}</span><div><b>다음 할 일이 명확하게</b><span>기록에서 실행까지, 한 화면에.</span></div></div></div></div></section><section class="capabilities" aria-label="ENOTE-LABS 업무 솔루션"><div class="wrap capability-grid reveal">${[
  ["report", "보고 자동화"],
  ["feedback", "고객 피드백"],
  ["crm", "영업 CRM"],
  ["team", "팀 그룹웨어"],
  ["custom", "맞춤 ERP · PMS"],
]
  .map(
    ([icon, label]) =>
      `<article class="capability-item">${clay(icon)}<h2>${label}</h2></article>`,
  )
  .join("")}</div></section>
${productShowcase}
<section class="section custom-section" id="custom"><div class="wrap custom-grid"><div class="reveal"><span class="eyebrow">BUILT AROUND YOUR BUSINESS</span><h2>프로그램에 회사를 맞추지 말고,<br><em>회사에 맞게 만드세요.</em></h2><p>대행사는 자료 취합과 보고를,<br>제작사는 수정 요청과 납품을,<br>컨설팅사는 계약부터 결과물 승인을.</p><p>실제로 쓰는 엑셀과 업무 과정을 보고,<br>가장 먼저 줄일 반복 업무 하나를 정합니다.</p>${btn("우리 업무로 상담하기 ↗", "#contact", "orange")}</div><ol class="steps reveal">${[
  ["업무 진단", "현재 엑셀·처리 과정·반복 작업을 확인합니다."],
  ["작은 범위 견적", "우선 해결할 업무 하나와 완료 기준을 합의합니다."],
  ["구축 · 교육 · 인수 확인", "실제 사용 흐름을 함께 확인하고 전달합니다."],
  ["유지관리와 추가 확장", "운영하면서 필요한 업무를 순서대로 넓힙니다."],
]
  .map(
    ([t, d], i) =>
      `<li><span>0${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></li>`,
  )
  .join("")}</ol></div></section>
<section class="section wrap" id="pricing">${heading("START SMALL, GROW WITH YOUR TEAM", "우리 팀에 맞는<br>시작 방법을 고르세요.", "아래 비용은 도입 검토용 제안입니다. 범위와 완료 기준을 확인한 뒤 견적을 확정합니다.")}<div class="pricing-grid">${[
  {
    tag: "FLOWNOTE PILOT",
    title: "작은 보고 업무부터",
    price: "19.9<span>만원부터</span>",
    desc: "한 가지 반복 보고 흐름을 확인하는 파일럿 구축.",
    items: [
      "자료 양식과 처리 흐름 확인",
      "제한된 보고 템플릿 구성",
      "검증 기준과 제공 범위 사전 합의",
    ],
  },
  {
    tag: "FLOWNOTE SETUP",
    title: "팀의 업무 방식에 맞게",
    price: "59<span>만원부터</span>",
    desc: "합의한 보고·운영 흐름의 기본 구축과 사용 안내.",
    items: [
      "기본 구축 총액 기준 · 별도 범위 견적",
      "선택 유지관리 월 5만원부터",
      "외부 API·AI 사용료 별도 확인",
    ],
  },
  {
    tag: "CUSTOM SYSTEM",
    title: "CRM · 그룹웨어 · ERP",
    price: "범위별 견적",
    desc: "Follonote·Crewmemo 도입이나 별도 업무 시스템 제작.",
    items: [
      "화면·권한·연동 범위에 따라 산정",
      "운영·유지관리 조건 별도 합의",
      "소스 인수·설치형은 별도 협의",
    ],
  },
]
  .map(
    (p, i) =>
      `<article class="price-card ${i === 1 ? "featured" : ""} reveal"><span class="eyebrow">${p.tag}</span><h3>${p.title}</h3><div class="price ${i === 2 ? "text-price" : ""}">${p.price}</div><p>${p.desc}</p><ul>${p.items.map((s) => `<li>${s}</li>`).join("")}</ul>${btn("도입 범위 상담", "#contact", i === 1 ? "orange" : "white")}</article>`,
  )
  .join(
    "",
  )}</div><p class="caption">금액은 부가세 별도이며 확정 견적이 아닙니다. 웹 사용권과 맞춤 구축·운영 범위를 구분해 계약합니다.</p><div class="subscription-note reveal"><b>ProjectFlow 구독은 준비 중입니다.</b><p>Lite 월 9,900원 · Pro 월 29,000원 · Agency 월 99,000원을 검토하고 있습니다. 현재는 결제되지 않으며 프로젝트·좌석·저장공간은 플랜별 한도가 있습니다.</p>${btn("플랜과 기능 확인 ↗", "https://agencyflow-studio-dun.vercel.app/", "white small")}</div></section>
<section class="section faq wrap" id="faq">${heading("QUESTIONS, ANSWERED", "자주 묻는 질문")}<div class="faq-list reveal">${faq.map(([t, d]) => `<details><summary>${t}</summary><p>${d}</p></details>`).join("")}</div></section>
<section class="contact-section wrap reveal" id="contact"><div><span class="eyebrow">LET'S MAKE WORK FLOW</span><h2>지금 가장 번거로운 일,<br>하나만 알려주세요.</h2><p>“매주 고객 보고서를 모으는 데 오래 걸려요.”<br>이 정도의 설명이면 시작하기 충분합니다.</p><a class="btn orange" href="https://t.me/evanlee97" target="_blank" rel="noopener noreferrer">텔레그램으로 문의 ↗</a><a class="btn white contact-email" href="mailto:leejinho970715@gmail.com?subject=ENOTE-LABS%20%EB%8F%84%EC%9E%85%20%EC%83%81%EB%8B%B4">이메일로 문의 ↗</a><small>이메일 또는 텔레그램으로 직접 상담합니다.</small></div><form id="inquiry"><label>관심 있는 제품 또는 업무<select name="product"><option>어떤 제품이 맞을지 상담</option><option>Flownote · 보고 자동화</option><option>ProjectFlow · 프로젝트 관리</option><option>Follonote · 영업 CRM</option><option>Crewmemo · 그룹웨어</option><option>ERP·PMS·CRM 맞춤 구축</option></select></label><label>현재 가장 불편한 일<textarea name="problem" rows="4" placeholder="지금 쓰는 도구와 반복되는 일을 적어주세요." required maxlength="2000"></textarea></label><button class="btn dark" type="submit">문의 내용 복사하기 ⧉</button><p id="form-status" role="status">내용은 서버로 전송되지 않습니다. 복사한 뒤 이메일 또는 텔레그램에 직접 보내주세요.</p></form></section>
<section class="bottom-cta"><div class="glow"></div><span class="eyebrow">YOUR TEAM, IN FLOW.</span><h2>일이 쌓이는 곳에서,<br><em>일이 흐르는 곳으로.</em></h2>${btn("우리 팀의 첫 제품 찾기 ↗", "#products", "orange")}<div class="bottom-objects" aria-hidden="true"><span>${clay("report")}</span><span>${clay("crm")}</span><span>${clay("check")}</span></div></section></main><footer class="footer wrap"><a class="brand" href="/"><img src="/assets/enote-labs-logo-20261031.webp" alt="" width="44" height="44">ENOTE-LABS<span>이노트랩스</span></a><p>팀의 업무를 이해하고, 쓰이는 시스템을 만듭니다.</p><div>${products.map((p) => `<a href="${p.url}">${p.name} ↗</a>`).join("")}<a href="https://t.me/evanlee97">문의 ↗</a></div><address class="footer-contact">대표자 : 이은규<br>문의 : <a href="mailto:leejinho970715@gmail.com">leejinho970715@gmail.com</a> / telegram : <a href="https://t.me/evanlee97" target="_blank" rel="noopener noreferrer">@evanlee97</a></address><small>2026.10 ENOTE-LABS ALL RIGHTS RESERVED</small></footer></body></html>`;
