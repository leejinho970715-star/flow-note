import { productInfo, type ProductKind } from "../lib/studio-domain";
export const studioOrigin = "https://flownote-studio.vercel.app";
export function productMetadata(kind: ProductKind, workspace = false) {
  const p = productInfo[kind],
    path = "/" + kind + (workspace ? "/workspace/" : "/");
  return {
    metadataBase: new URL(studioOrigin),
    title: {
      absolute: `${p.name} — ${p.ko} ${workspace ? "워크스페이스" : p.description}`,
    },
    description: p.description,
    alternates: { canonical: studioOrigin + path },
    robots: { index: !workspace, follow: true },
    icons: {
      icon: [
        { url: "/product-assets/" + kind + "-icon.svg", type: "image/svg+xml" },
        {
          url: "/product-assets/" + kind + "-32.png",
          sizes: "32x32",
          type: "image/png",
        },
      ],
      apple: "/product-assets/" + kind + "-180.png",
    },
    openGraph: {
      title: p.name + " — " + p.title,
      description: p.description,
      url: studioOrigin + path,
      siteName: p.name,
      images: [
        {
          url: "/product-assets/" + kind + "-og.png",
          width: 1200,
          height: 630,
          alt: p.description,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: p.name + " — " + p.title,
      images: ["/product-assets/" + kind + "-og.png"],
    },
  };
}
export default function StudioProductHome({ kind }: { kind: ProductKind }) {
  const p = productInfo[kind],
    crm = kind === "follonote",
    features = crm
      ? [
          ["고객 정보", "담당자·연락처·유입 경로와 상담 기록을 한곳에."],
          ["영업기회", "신규부터 수주까지 단계와 입력 금액을 확인하세요."],
          ["후속 연락", "고객별 다음 연락 날짜를 정하고 완료 여부를 남기세요."],
        ]
      : [
          ["팀 소식과 일정", "공지와 회의 일정을 팀이 함께 확인합니다."],
          [
            "내부 결재",
            "작성자와 지정 결재자를 구분해 승인·반려 이력을 남깁니다.",
          ],
          ["담당 업무", "담당자·마감일·우선순위를 정하고 상태를 공유합니다."],
        ];
  return (
    <div
      className="studio-public"
      style={{ "--accent": p.color } as React.CSSProperties}
    >
      <header className="public-header">
        <a className="af-brand" href={studioOrigin + "/" + kind + "/"}>
          <img src={"/product-assets/" + kind + "-icon.svg"} alt="" />
          {p.name}
        </a>
        <nav>
          <a href={studioOrigin + "/"}>ENOTE-LABS</a>
          <a
            className="button primary"
            href={studioOrigin + "/" + kind + "/workspace/"}
          >
            샘플로 체험
          </a>
        </nav>
      </header>
      <main className="public-main">
        <section className="public-hero">
          <div>
            <span className="eyebrow">{p.tag}</span>
            <h1>{p.title}</h1>
            <p>
              {p.description}.<br />
              흩어진 기록보다, 명확한 다음 행동을 만드세요.
            </p>
            <div className="actions">
              <a
                className="button primary"
                href={studioOrigin + "/" + kind + "/workspace/"}
              >
                가상 샘플 열기 ↗
              </a>
              <a
                className="button"
                href={studioOrigin + "/" + kind + "/workspace/?mode=cloud"}
              >
                회사 계정으로 시작
              </a>
            </div>
            <a
              className="button"
              href={"/manuals/" + kind + "-guide.pdf"}
              target="_blank"
              rel="noopener noreferrer"
            >
              제품소개서 보기 ↗
            </a>
            <small>
              초기 검증판입니다. 샘플은 이 브라우저에만 저장되며 회사 모드는
              검증된 계정과 내부 팀 권한이 필요합니다.
            </small>
          </div>
          <div className="hero-window">
            <div className="window-top">
              <span>{p.name} / WORKSPACE</span>
              <b>가상 자료 예시</b>
            </div>
            <img
              src={"/product-assets/" + kind + "-screen.jpg"}
              alt={p.ko + " 실제 브라우저 샘플 화면"}
            />
          </div>
        </section>
        <section className="public-section">
          <h2>
            {crm
              ? "고객의 첫 문의부터, 다음 미팅까지."
              : "팀이 함께 알고, 함께 결정하도록."}
          </h2>
          <div className="feature-grid">
            {features.map(([title, desc]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="public-section">
          <h2>팀의 실제 방식에 맞춰 시작하세요.</h2>
          <p>
            회사별 접근 제한과 저장, 공통 팀 계정 연결을 제공합니다. 14일 검증
            체험은 AgencyFlow와 같은 회사 공간의 체험 기간을 사용합니다. 체험
            종료 시 기존 자료는 조회할 수 있지만 쓰기는 제한됩니다.
          </p>
          <p>
            {crm
              ? "영업기회 금액은 사용자가 입력한 값이며 실제 매출·수금 또는 수주 예측을 의미하지 않습니다. 이메일 자동 발송·외부 CRM 연동·자동 청구는 제공하지 않습니다."
              : "전자서명·급여·근태·회계·실시간 사내 메신저를 모두 갖춘 종합 그룹웨어가 아닙니다. 현재는 공지·일정·내부 결재·업무 공유에 집중합니다."}
          </p>
          <p>
            일반 고객 메일 발송과 구독 결제는 준비 중입니다. 익명화한 자료로
            적합성을 확인하고, 도입 범위와 비용은 상담에서 정합니다.
          </p>
          <a
            className="button primary"
            href="https://t.me/evanlee97"
            target="_blank"
            rel="noreferrer"
          >
            도입 범위 상담하기 ↗
          </a>
        </section>
      </main>
      <footer className="public-footer">
        <b>{p.name} by ENOTE-LABS</b>
        <a href={studioOrigin + "/"}>네 가지 제품 살펴보기</a>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: p.name,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: studioOrigin + "/" + kind + "/",
            description: p.description + " · 초기 검증판 · 결제 준비 중",
          }).replaceAll("<", "\\u003c"),
        }}
      />
    </div>
  );
}
