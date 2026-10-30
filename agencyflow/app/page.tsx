const origin =
  process.env.NEXT_PUBLIC_AGENCY_URL ||
  "https://agencyflow-studio-dun.vercel.app";
export default function Home() {
  return (
    <>
      <header className="public-header">
        <a className="af-brand" href="/">
          <img src="/favicon.svg" alt="" />
          Agency<span>Flow</span>
        </a>
        <nav>
          <a href="#workflow">어떻게 쓰나요?</a>
          <a href="#pricing">요금 안내</a>
          <a className="button primary" href="/workspace/">
            샘플로 체험
          </a>
        </nav>
      </header>
      <main className="public-main">
        <a
          className="button"
          href="/manuals/agencyflow-guide.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          제품소개서 보기 ↗
        </a>
        <section className="public-hero">
          <div>
            <span className="eyebrow">FOR CREATIVE TEAMS</span>
            <h1>
              수정 요청,
              <br />
              이제 <em>같은 화면에서.</em>
            </h1>
            <p>
              “어느 부분 말씀하시는 걸까요?”
              <br />
              시안 위에 바로 남기고, 처리하고, 승인받으세요.
            </p>
            <div className="actions">
              <a className="button primary" href="/workspace/">
                샘플 프로젝트 열기 ↗
              </a>
              <a className="button" href="/workspace/?mode=cloud">
                회사 계정으로 시작
              </a>
            </div>
            <small>
              샘플은 가상 자료입니다. 회사 계정은 초기 검증 단계이며 이메일
              설정이 필요합니다.
            </small>
          </div>
          <div className="hero-window">
            <div className="window-top">
              <span>루미에르 · 홈페이지 v1</span>
              <b>샘플 화면</b>
            </div>
            <img src="/sample-design.svg" alt="가상 브랜드의 웹 디자인 시안" />
            <div className="hero-comment">
              <b>01 · 고객의 피드백</b>
              <p>버튼 문구를 바꿔주세요.</p>
              <span>대기 → 작업중 → 완료</span>
            </div>
          </div>
        </section>
        <section id="workflow" className="public-section">
          <span className="eyebrow">LESS BACK-AND-FORTH</span>
          <h2>긴 설명 대신, 정확한 위치 하나.</h2>
          <div className="feature-grid">
            {[
              [
                "01",
                "시안을 올리세요",
                "PNG·JPG·WebP 이미지를 버전별로 보관합니다.",
              ],
              [
                "02",
                "위치를 눌러 이야기하세요",
                "고객의 수정 요청과 답글을 같은 핀에서 확인합니다.",
              ],
              [
                "03",
                "확인한 버전을 승인하세요",
                "미완료 요청을 확인한 뒤 고객이 최신 시안을 승인합니다.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span className="eyebrow">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="public-section split-section">
          <div>
            <span className="eyebrow">BUILT FOR AGENCIES</span>
            <h2>
              고객과 프로젝트,
              <br />
              견적까지 한 흐름으로.
            </h2>
          </div>
          <div>
            <p>
              작은 웹에이전시·브랜딩 스튜디오·프리랜서 팀을 위해 만들었습니다.
              프로젝트별 고객 접근 권한, 시안 피드백, 작업 목록과 버전별 견적을
              연결합니다.
            </p>
            <p>
              실제 사이트를 URL만으로 검수하거나 스크린샷을 자동 수집하는 기능은
              아직 제공하지 않습니다. 우선 시안·스크린샷 업로드 검수에
              집중합니다.
            </p>
          </div>
        </section>
        <section id="pricing" className="public-section">
          <span className="eyebrow">CLEAR LIMITS. NO SURPRISES.</span>
          <h2>팀의 규모에 맞게 시작하세요.</h2>
          <p>
            검증 중인 요금 제안입니다. 결제는 아직 연결되지 않았습니다. VAT
            별도.
          </p>
          <div className="feature-grid">
            {[
              ["Lite", "9,900", "활성 프로젝트 5개 · 내부 사용자 1명 · 1GB"],
              ["Pro", "29,000", "활성 프로젝트 20개 · 내부 사용자 3명 · 10GB"],
              [
                "Agency",
                "99,000",
                "활성 프로젝트 100개 · 내부 사용자 10명 · 50GB",
              ],
            ].map(([name, price, scope]) => (
              <article key={name}>
                <h3>{name}</h3>
                <strong className="plan-price">월 {price}원</strong>
                <p>{scope}</p>
                <p>고객 검토자는 내부 사용자 수에서 제외합니다.</p>
                <a href="/workspace/" className="button">
                  샘플로 적합성 확인
                </a>
              </article>
            ))}
          </div>
          <p className="muted">
            회사 생성 시 14일 검증 체험 · 최대 100개 프로젝트·내부 10명·시안
            1GB. 종료 후 읽기 전용으로 유지합니다. 전자서명·자동
            청구·화이트라벨·메일 알림은 출시 전 준비 항목입니다.
          </p>
        </section>
        <section className="public-section public-faq">
          <h2>도입 전에 확인하세요.</h2>
          <details>
            <summary>고객도 유료 계정이 필요한가요?</summary>
            <p>
              고객은 프로젝트에 초대된 Client 권한으로 참여하며 내부 유료 좌석
              수에 포함되지 않습니다. 현재는 가입·이메일 확인을 마친 고객을
              관리자가 프로젝트에 연결하는 방식입니다. 비회원 공유 링크는
              제공하지 않습니다.
            </p>
          </details>
          <details>
            <summary>웹사이트를 URL만 넣어 검수할 수 있나요?</summary>
            <p>
              현재는 이미지·스크린샷 업로드 방식입니다. 실제 사이트 자동 검수는
              설치 스크립트·확장 기능 또는 별도 수집 서버가 필요하며 제공하지
              않습니다.
            </p>
          </details>
          <details>
            <summary>온라인 승인은 전자서명인가요?</summary>
            <p>
              시안·견적의 버전별 확인 기록입니다. 계약 전자서명 서비스 연동이나
              법률 검토를 완료한 계약서 기능이 아닙니다.
            </p>
          </details>
          <details>
            <summary>지금 실제 고객 자료를 넣어도 되나요?</summary>
            <p>
              회사별 권한 분리와 비공개 시안 저장을 구현한 초기 검증판입니다.
              메일 발송·결제·운영 복구 검증과 약관·개인정보 처리방침 준비가 남아
              있습니다. 우선 익명화한 자료로 검증하세요.
            </p>
          </details>
        </section>
      </main>
      <footer className="public-footer">
        <a className="af-brand" href="/">
          AgencyFlow
        </a>
        <p>고객의 한마디가, 다음 작업으로.</p>
        <a href="https://t.me/evanlee97">도입 문의 ↗</a>
        <a href="https://flow-note-psi.vercel.app/workspace/">
          Flownote 보고 자동화 ↗
        </a>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "AgencyFlow",
                url: origin,
                inLanguage: "ko-KR",
              },
              {
                "@type": "SoftwareApplication",
                name: "AgencyFlow",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                url: origin,
                description:
                  "웹에이전시와 디자인 스튜디오의 이미지 시안 피드백·프로젝트 운영 협업. 초기 검증판이며 결제·자동 웹 검수는 준비 중.",
              },
            ],
          }).replaceAll("<", "\\u003c"),
        }}
      />
    </>
  );
}
