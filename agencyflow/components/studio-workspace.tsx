"use client";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
} from "react";
import { db } from "../lib/data";
import { money, readOnly, type Org } from "../lib/domain";
import {
  productInfo,
  studioEmpty,
  studioSample,
  studioDemoCommand,
  sampleMembers,
  dealStages,
  localDay,
  type ProductKind,
  type StudioData,
  type StudioRow,
} from "../lib/studio-domain";
type Member = { org_id?: string; user_id: string; name: string; role: string };
const tables = {
  follonote: ["contacts", "deals", "followups", "contact_notes"],
  crewmemo: ["notices", "calendar", "approvals", "team_tasks"],
} as const;
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "작업을 완료하지 못했습니다.";
const text = (r: StudioRow | undefined, k: string) => String(r?.[k] ?? "");
function Field({
  name,
  label,
  type = "text",
  value = "",
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={type === "number" ? 0 : undefined}
        maxLength={type === "text" ? 160 : undefined}
      />
    </label>
  );
}
export default function StudioWorkspace({ kind }: { kind: ProductKind }) {
  const info = productInfo[kind],
    crm = kind === "follonote",
    cache = "studio-" + kind + "-demo-v1";
  const [data, setData] = useState<StudioData>(structuredClone(studioEmpty)),
    [orgs, setOrgs] = useState<Org[]>([]),
    [members, setMembers] = useState<Member[]>(sampleMembers),
    [orgId, setOrgId] = useState(""),
    [actor, setActor] = useState("demo-kim"),
    [demo, setDemo] = useState(true),
    [ready, setReady] = useState(false),
    [session, setSession] = useState(false),
    [view, setView] = useState("dash"),
    [modal, setModal] = useState<{ action: string; row?: StudioRow } | null>(
      null,
    ),
    [contactId, setContactId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dark, setDark] = useState(false),
    [search, setSearch] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    org = orgs.find((o) => o.id === orgId) || orgs[0],
    role = demo ? members.find((m) => m.user_id === actor)?.role : org?.role,
    locked = !demo && readOnly(org),
    today = localDay();
  const rows = (key: keyof StudioData) =>
      data[key].filter((r) => demo || r.org_id === org?.id),
    contacts = rows("contacts").filter((r) => !r.archived),
    deals = rows("deals").filter((r) => !r.archived),
    followups = rows("followups"),
    notices = rows("notices").filter((r) => !r.archived),
    events = rows("calendar"),
    approvals = rows("approvals"),
    tasks = rows("team_tasks"),
    selectedContact = contacts.find((c) => c.id === contactId) || contacts[0],
    staff = members
      .filter((m) => demo || m.org_id === org?.id)
      .filter((m) => m.role !== "client");
  const nav = crm
    ? [
        ["dash", "영업 현황"],
        ["contacts", "고객 관리"],
        ["deals", "영업 파이프라인"],
        ["followups", "후속 연락"],
      ]
    : [
        ["dash", "오늘의 팀"],
        ["notices", "공지 게시판"],
        ["calendar", "팀 일정"],
        ["approvals", "내부 결재"],
        ["tasks", "팀 업무"],
      ];
  const refresh = useCallback(async () => {
    try {
      const [organizations, people, who] = await Promise.all([
        db.from("af_orgs").select("*"),
        db.from("af_members").select("*"),
        db.auth.getUser(),
      ]);
      if (organizations.error) throw organizations.error;
      if (people.error) throw people.error;
      const uid = who.data.user?.id || "";
      setActor(uid);
      setMembers(people.data || []);
      setOrgs(
        (organizations.data || []).map((o) => ({
          ...o,
          role:
            people.data?.find((m) => m.org_id === o.id && m.user_id === uid)
              ?.role || "client",
        })),
      );
      const loaded = await Promise.all(
        tables[kind].map(async (key) => {
          const { data, error } = await db
            .from("studio_" + key)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5000);
          if (error) throw error;
          if (data?.length === 5000)
            throw Error(
              "자료가 많아 범위를 좁힌 조회가 필요합니다. 운영자에게 문의하세요.",
            );
          return [key, data || []];
        }),
      );
      setData({
        ...structuredClone(studioEmpty),
        ...Object.fromEntries(loaded),
      });
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [kind]);
  useEffect(() => {
    const initialDemo =
      new URLSearchParams(location.search).get("mode") !== "cloud";
    setDemo(initialDemo);
    if (initialDemo) {
      try {
        setData(
          JSON.parse(localStorage.getItem(cache) || "null") || studioSample(),
        );
      } catch {
        setData(studioSample());
      }
    }
    setDark(localStorage.getItem("studio-theme") === "dark");
    db.auth.getUser().then((r) => setSession(!!r.data.user));
    const { data: listener } = db.auth.onAuthStateChange((_e, s) =>
      setSession(!!s),
    );
    setReady(true);
    return () => listener.subscription.unsubscribe();
  }, [cache]);
  useEffect(() => {
    if (!demo && session) refresh();
  }, [demo, session, refresh]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    if (ready) localStorage.setItem("studio-theme", dark ? "dark" : "light");
  }, [dark, ready]);
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("view");
    if (
      requested &&
      (kind === "follonote"
        ? ["dash", "contacts", "deals", "followups"]
        : ["dash", "notices", "calendar", "approvals", "tasks"]
      ).includes(requested)
    )
      setView(requested);
  }, [kind]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, demo]);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
  }, [modal]);
  async function run(action: string, p: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (locked) throw Error("체험이 종료되어 조회만 가능합니다.");
      if (demo) {
        const next = studioDemoCommand(data, action, p, actor);
        localStorage.setItem(cache, JSON.stringify(next));
        setData(next);
      } else {
        const { error } =
          action === "invite_member"
            ? await db.rpc("agencyflow_command", {
                p_action: "invite",
                p_payload: { ...p, org_id: org?.id, role: "member" },
              })
            : await db.rpc("studio_command", {
                p_action: action,
                p_payload: { ...p, org_id: org?.id },
              });
        if (error) throw error;
        await refresh();
      }
      setNotice(
        demo
          ? "이 브라우저의 가상 샘플에 저장했습니다."
          : "회사 데이터에 저장했습니다.",
      );
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  function switchMode() {
    const next = !demo;
    setDemo(next);
    setData(next ? studioSample() : structuredClone(studioEmpty));
    setOrgs([]);
    setMembers(next ? sampleMembers : []);
    setActor(next ? "demo-kim" : "");
    setView("dash");
    setError("");
    setNotice("");
    history.replaceState(
      null,
      "",
      "/" + kind + "/workspace/" + (next ? "" : "?mode=cloud"),
    );
    if (!next && session) refresh();
  }
  async function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      signup =
        ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement)
          ?.value === "signup",
      credentials = {
        email: String(f.get("email")).trim(),
        password: String(f.get("password")),
      };
    try {
      const result = signup
        ? await db.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo:
                "https://flownote-studio.vercel.app/" +
                kind +
                "/workspace/?mode=cloud",
            },
          })
        : await db.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      setNotice(
        signup
          ? "가입 확인 메일이 필요합니다. SMTP 준비 전에는 일반 고객 메일 발송이 제한됩니다."
          : "로그인했습니다.",
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function createCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await db.rpc("agencyflow_command", {
        p_action: "create_org",
        p_payload: { name: String(new FormData(e.currentTarget).get("name")) },
      });
      if (error) throw error;
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const p: Record<string, unknown> = Object.fromEntries(
      new FormData(e.currentTarget),
    );
    if (modal.row) p.id = modal.row.id;
    if ("amount" in p) p.amount = +String(p.amount);
    if (modal.action === "notice") p.pinned = p.pinned === "on";
    if (modal.action === "calendar") {
      if (new Date(String(p.ends_at)) <= new Date(String(p.starts_at))) {
        setError("종료 시각은 시작 이후여야 합니다.");
        return;
      }
      p.starts_at = new Date(String(p.starts_at)).toISOString();
      p.ends_at = new Date(String(p.ends_at)).toISOString();
    }
    if (await run(modal.action, p)) setModal(null);
  }
  const memberName = (id: string) =>
    staff.find((m) => m.user_id === id)?.name || "팀원";
  const value = (key: string) => (modal?.row ? text(modal.row, key) : "");
  const contactSelect = (
    <label>
      고객
      <select
        name="contact_id"
        defaultValue={value("contact_id") || selectedContact?.id}
        required
      >
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {text(c, "name")}
          </option>
        ))}
      </select>
    </label>
  );
  if (!ready)
    return <main className="loading-page">{info.ko}를 준비하고 있습니다…</main>;
  const internal = demo || role === "admin" || role === "member";
  return (
    <div
      className={"app-shell studio-workspace " + kind}
    >
      <aside className="app-rail">
        <a className="af-brand" href={"/" + kind + "/"}>
          <img src={"/product-assets/" + kind + "-icon.svg"} alt="" />
          <span className="brand-copy">{info.name}<small>{info.category}</small></span>
        </a>
        <div className="workspace-name">
          <span className="avatar">
            {demo ? "S" : org?.name.slice(0, 1) || "W"}
          </span>
          <div>
            <b>{demo ? "스튜디오 샘플" : org?.name || "회사 공간"}</b>
            <small>{demo ? "브라우저 체험" : "공유 회사 데이터"}</small>
          </div>
        </div>
        <nav aria-label="서비스 메뉴">
          {nav.map(([key, label], i) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              aria-current={view === key ? "page" : undefined}
              onClick={() => setView(key)}
            >
              <span>{["◫", "▤", "◉", "✓", "▧"][i]}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <a
            href={"/manuals/" + kind + "-guide.pdf"}
            target="_blank"
            rel="noopener noreferrer"
          >
            제품소개서 보기 ↗
          </a>
          <a href="https://flownote-studio.vercel.app/">← ENOTE-LABS</a>
          <button onClick={() => setDark(!dark)}>
            {dark ? "☀ 라이트 모드" : "◐ 다크 모드"}
          </button>
          <button onClick={switchMode}>
            {demo ? "회사 계정으로 전환" : "샘플 체험으로 전환"}
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <span>
            {info.ko} / <b>{nav.find(([key]) => key === view)?.[1]}</b>
          </span>
          <div>
            {demo ? (
              <label className="inline-label">
                담당자 체험
                <select
                  aria-label="샘플 담당자"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                >
                  {sampleMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : session ? (
              <>
                <span className="status-badge">
                  {role === "admin"
                    ? "관리자"
                    : role === "member"
                      ? "팀원"
                      : "고객 권한"}
                </span>
                <button onClick={refresh}>새로고침</button>
                <button
                  onClick={async () => {
                    await db.auth.signOut();
                    setData(structuredClone(studioEmpty));
                    setOrgs([]);
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <span className="status-badge">로그인 필요</span>
            )}
          </div>
        </header>
        <main className="app-content">
          <div className={"mode-banner " + (demo ? "" : "cloud-banner")}>
            <b>
              {demo ? "가상 자료 · 브라우저 체험" : "회사 공유 · 초기 검증판"}
            </b>
            <span>
              {demo
                ? "입력 내용은 이 브라우저에만 저장됩니다. 담당자 전환은 권한 흐름 시연이며 실제 다른 사용자와 공유되지 않습니다."
                : "회사 내부 팀원의 자료만 조회·저장합니다. 일반 고객 인증 메일·결제·외부 자동 연동은 준비 중입니다."}
            </span>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="success-message" role="status">
              {notice}
            </p>
          )}
          {locked && org && (
            <p className="error-message">
              체험이 종료되어 읽기 전용입니다. 기존 자료는 보관됩니다.
            </p>
          )}
          {!demo && !session ? (
            <div className="auth-layout">
              <div>
                <span className="eyebrow">{info.tag}</span>
                <h1>{info.title}</h1>
                <p>
                  공통 Studio 회사 계정을 사용합니다. 기존 AgencyFlow의 회사에
                  속해 있으면 같은 회사 공간을 선택할 수 있습니다.
                </p>
                <p className="muted">
                  일반 고객 메일 발송은 준비 중입니다. 회사 공간과 고객 권한은
                  제품 간 구분되며 내부 팀원만 이 서비스에 접근합니다.
                </p>
              </div>
              <form className="panel auth-form" onSubmit={authenticate}>
                <h2>로그인 · 회원가입</h2>
                <Field name="email" label="이메일" type="email" />
                <label>
                  비밀번호 (10자 이상)
                  <input
                    name="password"
                    type="password"
                    minLength={10}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <button
                  className="button primary"
                  value="login"
                  disabled={busy}
                >
                  로그인
                </button>
                <button className="button" value="signup" disabled={busy}>
                  가입 확인 메일 요청
                </button>
              </form>
            </div>
          ) : !demo && !org ? (
            <section className="panel welcome-panel">
              <h1>회사의 업무 공간을 만드세요.</h1>
              <p>
                기존 회사의 팀원이라면 관리자에게 가입한 계정의 연결을
                요청하세요. 새 회사는 공통 14일 검증 체험으로 시작합니다.
              </p>
              <form onSubmit={createCompany}>
                <Field name="name" label="회사명" />
                <button className="button primary" disabled={busy}>
                  새 회사 공간 만들기
                </button>
              </form>
            </section>
          ) : !internal ? (
            <section className="panel">
              <h1>내부 팀원 권한이 필요합니다.</h1>
              <p>
                프로젝트 고객 계정은 CRM·그룹웨어의 내부 자료에 접근할 수
                없습니다. 관리자에게 내부 팀원 권한을 확인하세요.
              </p>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">{info.tag}</span>
                  <h1>
                    {view === "dash"
                      ? info.title
                      : nav.find(([key]) => key === view)?.[1]}
                  </h1>
                  <p>
                    {crm
                      ? "고객과 대화의 맥락을 남기고, 다음 행동을 정하세요."
                      : "팀이 함께 알아야 할 소식과 결정, 해야 할 일을 확인하세요."}
                  </p>
                </div>
                {!demo && orgs.length > 1 && (
                  <label>
                    회사 선택
                    <select
                      value={org?.id}
                      onChange={(e) => setOrgId(e.target.value)}
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {view === "dash" && (
                <>
                  <div className="stats-grid">
                    {(crm
                      ? [
                          [
                            "진행 중 기회",
                            deals.filter(
                              (d) =>
                                !["수주", "종료"].includes(text(d, "stage")),
                            ).length + "건",
                            "현재 단계 기준",
                          ],
                          [
                            "입력 기회 금액",
                            money(
                              deals
                                .filter(
                                  (d) =>
                                    !["수주", "종료"].includes(
                                      text(d, "stage"),
                                    ),
                                )
                                .reduce((n, d) => n + Number(d.amount), 0),
                            ),
                            "매출·수금과 구분",
                          ],
                          [
                            "오늘 후속 연락",
                            followups.filter(
                              (f) => f.due_on === today && f.status === "예정",
                            ).length + "건",
                            "날짜 기준",
                          ],
                          [
                            "등록 고객",
                            contacts.length + "곳",
                            "활성 고객 기준",
                          ],
                        ]
                      : [
                          [
                            "오늘 팀 일정",
                            events.filter(
                              (e) =>
                                localDay(new Date(String(e.starts_at))) ===
                                today,
                            ).length + "개",
                            "등록 일정 기준",
                          ],
                          [
                            "내 결재 대기",
                            approvals.filter(
                              (a) =>
                                a.approver_id === actor && a.status === "대기",
                            ).length + "건",
                            "지정 결재자 기준",
                          ],
                          [
                            "내 미완료 업무",
                            tasks.filter(
                              (t) =>
                                t.assignee_id === actor && t.status !== "완료",
                            ).length + "건",
                            "담당 업무 기준",
                          ],
                          ["팀 공지", notices.length + "건", "보관 제외"],
                        ]
                    ).map(([title, count, desc]) => (
                      <article className="panel stat-card" key={title}>
                        <span>{title}</span>
                        <b>{count}</b>
                        <small>{desc}</small>
                      </article>
                    ))}
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="section-heading">
                        <h2>
                          {crm ? "다음 연락을 확인하세요" : "팀의 최신 소식"}
                        </h2>
                        <button
                          onClick={() => setView(crm ? "followups" : "notices")}
                        >
                          전체 보기 ↗
                        </button>
                      </div>
                      {(crm
                        ? followups
                            .filter((f) => f.status === "예정")
                            .sort((a, b) =>
                              text(a, "due_on").localeCompare(
                                text(b, "due_on"),
                              ),
                            )
                        : notices.sort(
                            (a, b) => Number(b.pinned) - Number(a.pinned),
                          )
                      )
                        .slice(0, 5)
                        .map((row) => (
                          <article className="studio-list-row" key={row.id}>
                            <span className="status-badge">
                              {crm
                                ? text(row, "due_on")
                                : row.pinned
                                  ? "고정 공지"
                                  : "새 소식"}
                            </span>
                            <h3>{text(row, "title")}</h3>
                            <p>
                              {crm
                                ? text(
                                    contacts.find(
                                      (c) => c.id === row.contact_id,
                                    ),
                                    "name",
                                  )
                                : text(row, "body")}
                            </p>
                            {crm && (
                              <button
                                disabled={locked || busy}
                                onClick={() =>
                                  run("followup_done", { id: row.id })
                                }
                              >
                                연락 완료
                              </button>
                            )}
                          </article>
                        ))}
                    </section>
                    <section className="panel">
                      <h2>{crm ? "단계별 영업기회" : "다가오는 일정"}</h2>
                      {crm
                        ? dealStages.map((stage) => (
                            <div className="studio-stage-total" key={stage}>
                              <span>{stage}</span>
                              <b>
                                {deals.filter((d) => d.stage === stage).length}
                                건
                              </b>
                            </div>
                          ))
                        : events
                            .slice()
                            .sort((a, b) =>
                              text(a, "starts_at").localeCompare(
                                text(b, "starts_at"),
                              ),
                            )
                            .map((e) => (
                              <div className="timeline-item" key={e.id}>
                                <strong>
                                  {new Date(String(e.starts_at)).toLocaleString(
                                    "ko-KR",
                                  )}
                                </strong>
                                <p>{text(e, "title")}</p>
                                <small>{text(e, "location")}</small>
                              </div>
                            ))}
                    </section>
                  </div>
                  {!crm && (
                    <section className="panel">
                      <div className="section-heading">
                        <h2>함께 일하는 사람들</h2>
                        {role === "admin" && (
                          <button
                            disabled={demo || locked}
                            onClick={() =>
                              setModal({ action: "invite_member" })
                            }
                          >
                            기존 가입 팀원 연결
                          </button>
                        )}
                      </div>
                      <div className="studio-members">
                        {staff.map((m) => (
                          <div key={m.user_id}>
                            <span className="avatar">{m.name.slice(0, 1)}</span>
                            <b>{m.name}</b>
                            <small>
                              {m.role === "admin" ? "관리자" : "팀원"}
                            </small>
                          </div>
                        ))}
                      </div>
                      <p className="muted">
                        가입·이메일 확인을 마친 계정을 연결합니다. 초대 메일은
                        자동 발송하지 않습니다.
                      </p>
                    </section>
                  )}
                </>
              )}
              {crm && view === "contacts" && (
                <>
                  <div className="section-heading">
                    <label className="studio-search">
                      고객 검색
                      <input
                        aria-label="고객 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="회사명 또는 담당자"
                      />
                    </label>
                    <button
                      className="button primary"
                      disabled={locked}
                      onClick={() => setModal({ action: "save_contact" })}
                    >
                      + 고객 등록
                    </button>
                  </div>
                  <div className="studio-contact-layout">
                    <section className="panel">
                      <h2>고객 {contacts.length}곳</h2>
                      {contacts
                        .filter((c) =>
                          (text(c, "name") + " " + text(c, "contact")).includes(
                            search,
                          ),
                        )
                        .map((c) => (
                          <button
                            className={
                              "project-row " +
                              (selectedContact?.id === c.id
                                ? "studio-selected"
                                : "")
                            }
                            key={c.id}
                            onClick={() => setContactId(c.id)}
                          >
                            <span className="avatar">
                              {text(c, "name").slice(0, 1)}
                            </span>
                            <span>
                              <b>{text(c, "name")}</b>
                              <small>
                                {text(c, "contact")} ·{" "}
                                {text(c, "owner_name") || "담당자 미정"}
                              </small>
                            </span>
                          </button>
                        ))}
                      {!contacts.length && (
                        <p className="empty-state">첫 고객을 등록하세요.</p>
                      )}
                    </section>
                    {selectedContact && (
                      <section className="panel">
                        <div className="section-heading">
                          <h2>{text(selectedContact, "name")}</h2>
                          <button
                            disabled={locked}
                            onClick={() =>
                              setModal({
                                action: "save_contact",
                                row: selectedContact,
                              })
                            }
                          >
                            정보 수정
                          </button>
                        </div>
                        <dl className="studio-contact-fields">
                          <dt>담당자</dt>
                          <dd>{text(selectedContact, "contact") || "—"}</dd>
                          <dt>이메일</dt>
                          <dd>{text(selectedContact, "email") || "—"}</dd>
                          <dt>연락처</dt>
                          <dd>{text(selectedContact, "phone") || "—"}</dd>
                          <dt>유입 경로</dt>
                          <dd>{text(selectedContact, "source")}</dd>
                        </dl>
                        <p>{text(selectedContact, "memo")}</p>
                        <div className="actions">
                          <button
                            disabled={locked}
                            onClick={() => setModal({ action: "followup" })}
                          >
                            다음 연락 등록
                          </button>
                          <button
                            disabled={locked || busy}
                            onClick={() =>
                              run("archive_contact", { id: selectedContact.id })
                            }
                          >
                            고객 보관
                          </button>
                        </div>
                        <h3 className="studio-subtitle">상담 기록</h3>
                        {rows("contact_notes")
                          .filter((n) => n.contact_id === selectedContact.id)
                          .map((n) => (
                            <div className="reply" key={n.id}>
                              <small>
                                {new Date(n.created_at).toLocaleString("ko-KR")}
                              </small>
                              <p>{text(n, "body")}</p>
                            </div>
                          ))}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const f = e.currentTarget;
                            if (
                              await run("contact_note", {
                                contact_id: selectedContact.id,
                                body: String(new FormData(f).get("body")),
                              })
                            )
                              f.reset();
                          }}
                        >
                          <label>
                            새 상담 기록
                            <textarea
                              name="body"
                              required
                              maxLength={5000}
                              rows={3}
                            />
                          </label>
                          <button disabled={busy || locked}>기록 저장</button>
                        </form>
                      </section>
                    )}
                  </div>
                </>
              )}
              {crm && view === "deals" && (
                <>
                  <div className="section-heading">
                    <h2>신규에서 수주까지</h2>
                    <button
                      className="button primary"
                      disabled={locked || !contacts.length}
                      onClick={() => setModal({ action: "save_deal" })}
                    >
                      + 영업기회
                    </button>
                  </div>
                  <p className="mobile-scroll-note">
                    보드를 좌우로 움직여 다음 단계를 확인하세요. 금액은
                    입력값이며 실제 매출 예측이 아닙니다.
                  </p>
                  <div className="kanban-board">
                    {dealStages.map((stage) => (
                      <section className="kanban-column" key={stage}>
                        <h3>
                          {stage}
                          <span>
                            {deals.filter((d) => d.stage === stage).length}
                          </span>
                        </h3>
                        {deals
                          .filter((d) => d.stage === stage)
                          .map((d) => (
                            <article className="kanban-card" key={d.id}>
                              <h3>{text(d, "title")}</h3>
                              <p>
                                {text(
                                  contacts.find((c) => c.id === d.contact_id),
                                  "name",
                                )}
                              </p>
                              <strong>{money(Number(d.amount))}</strong>
                              <small>
                                {text(d, "due_on")} · {text(d, "owner_name")}
                              </small>
                              <label>
                                진행 단계
                                <select
                                  aria-label={text(d, "title") + " 단계"}
                                  value={text(d, "stage")}
                                  disabled={locked || busy}
                                  onChange={(e) =>
                                    run("deal_stage", {
                                      id: d.id,
                                      stage: e.target.value,
                                    })
                                  }
                                >
                                  {dealStages.map((s) => (
                                    <option key={s}>{s}</option>
                                  ))}
                                </select>
                              </label>
                              <div className="actions">
                                <button
                                  disabled={locked}
                                  onClick={() =>
                                    setModal({ action: "save_deal", row: d })
                                  }
                                >
                                  수정
                                </button>
                                <button
                                  disabled={locked || busy}
                                  onClick={() =>
                                    run("archive_deal", { id: d.id })
                                  }
                                >
                                  보관
                                </button>
                              </div>
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                </>
              )}
              {crm && view === "followups" && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>후속 연락 일정</h2>
                    <button
                      className="button primary"
                      disabled={locked || !contacts.length}
                      onClick={() => setModal({ action: "followup" })}
                    >
                      + 연락 일정
                    </button>
                  </div>
                  {followups
                    .slice()
                    .sort((a, b) =>
                      text(a, "due_on").localeCompare(text(b, "due_on")),
                    )
                    .map((f) => (
                      <article className="studio-list-row" key={f.id}>
                        <span className="status-badge">
                          {text(f, "due_on")} · {text(f, "status")}
                        </span>
                        <h3>{text(f, "title")}</h3>
                        <p>
                          {text(
                            contacts.find((c) => c.id === f.contact_id),
                            "name",
                          )}
                        </p>
                        <button
                          disabled={locked || busy || f.status === "완료"}
                          onClick={() => run("followup_done", { id: f.id })}
                        >
                          {f.status === "완료" ? "완료됨" : "연락 완료"}
                        </button>
                      </article>
                    ))}
                  <p className="muted">
                    이 화면에서 날짜를 확인합니다. 이메일·문자 알림은 자동
                    발송하지 않습니다.
                  </p>
                </section>
              )}
              {!crm && view === "notices" && (
                <>
                  <div className="section-heading">
                    <h2>팀에 필요한 이야기</h2>
                    <button
                      className="button primary"
                      disabled={locked}
                      onClick={() => setModal({ action: "notice" })}
                    >
                      + 공지 작성
                    </button>
                  </div>
                  {notices.map((n) => (
                    <article className="panel studio-notice" key={n.id}>
                      <span className="status-badge">
                        {n.pinned ? "고정 공지" : "팀 공지"}
                      </span>
                      <h2>{text(n, "title")}</h2>
                      <p>{text(n, "body")}</p>
                      <small>
                        {memberName(n.created_by)} ·{" "}
                        {new Date(n.created_at).toLocaleDateString("ko-KR")}
                      </small>
                      {(n.created_by === actor || role === "admin") && (
                        <button
                          disabled={locked || busy}
                          onClick={() => run("archive_notice", { id: n.id })}
                        >
                          공지 보관
                        </button>
                      )}
                    </article>
                  ))}
                </>
              )}
              {!crm && view === "calendar" && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>함께 확인하는 팀 일정</h2>
                    <button
                      className="button primary"
                      disabled={locked}
                      onClick={() => setModal({ action: "calendar" })}
                    >
                      + 일정 등록
                    </button>
                  </div>
                  <div className="studio-calendar-grid">
                    {events
                      .slice()
                      .sort((a, b) =>
                        text(a, "starts_at").localeCompare(
                          text(b, "starts_at"),
                        ),
                      )
                      .map((e) => (
                        <article className="studio-event" key={e.id}>
                          <span>
                            {new Date(String(e.starts_at)).toLocaleDateString(
                              "ko-KR",
                              {
                                month: "long",
                                day: "numeric",
                                weekday: "short",
                              },
                            )}
                          </span>
                          <h3>{text(e, "title")}</h3>
                          <p>
                            {new Date(String(e.starts_at)).toLocaleTimeString(
                              "ko-KR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}{" "}
                            —{" "}
                            {new Date(String(e.ends_at)).toLocaleTimeString(
                              "ko-KR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                          <small>{text(e, "location") || "장소 미정"}</small>
                        </article>
                      ))}
                  </div>
                  {!events.length && (
                    <p className="empty-state">첫 팀 일정을 등록하세요.</p>
                  )}
                </section>
              )}
              {!crm && view === "approvals" && (
                <>
                  <div className="section-heading">
                    <h2>확인한 결정을 기록으로</h2>
                    <button
                      className="button primary"
                      disabled={
                        locked ||
                        staff.filter((m) => m.user_id !== actor).length === 0
                      }
                      onClick={() => setModal({ action: "approval" })}
                    >
                      + 결재 요청
                    </button>
                  </div>
                  <p className="muted">
                    지정된 다른 팀원만 승인·반려할 수 있습니다. 전자서명
                    계약이나 실제 비용 지급을 실행하지 않습니다.
                  </p>
                  {approvals.map((a) => (
                    <article className="panel studio-approval" key={a.id}>
                      <div className="section-heading">
                        <h2>{text(a, "title")}</h2>
                        <span className="status-badge">
                          {text(a, "status")}
                        </span>
                      </div>
                      <p>{text(a, "body")}</p>
                      <small>
                        작성 {memberName(a.created_by)} → 결재{" "}
                        {memberName(text(a, "approver_id"))}
                      </small>
                      {a.status === "대기" &&
                        a.approver_id === actor &&
                        a.created_by !== actor && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              const action = (e.nativeEvent as SubmitEvent)
                                .submitter as HTMLButtonElement;
                              run("decide_approval", {
                                id: a.id,
                                status: action.value,
                                decision_note: String(f.get("decision_note")),
                              });
                            }}
                          >
                            <label>
                              검토 의견
                              <textarea
                                name="decision_note"
                                maxLength={3000}
                                rows={2}
                              />
                            </label>
                            <div className="actions">
                              <button
                                className="button primary"
                                value="승인"
                                disabled={busy || locked}
                              >
                                승인
                              </button>
                              <button value="반려" disabled={busy || locked}>
                                반려
                              </button>
                            </div>
                          </form>
                        )}
                      {a.status === "대기" && a.created_by === actor && (
                        <button
                          disabled={busy || locked}
                          onClick={() => run("cancel_approval", { id: a.id })}
                        >
                          요청 취소
                        </button>
                      )}
                      {a.decision_note && (
                        <p className="reply">
                          검토 의견: {text(a, "decision_note")}
                        </p>
                      )}
                    </article>
                  ))}
                </>
              )}
              {!crm && view === "tasks" && (
                <>
                  <div className="section-heading">
                    <h2>담당자와 마감이 명확한 업무</h2>
                    <button
                      className="button primary"
                      disabled={locked}
                      onClick={() => setModal({ action: "team_task" })}
                    >
                      + 팀 업무
                    </button>
                  </div>
                  <div className="task-columns">
                    {["대기", "진행중", "완료"].map((status) => (
                      <section className="panel" key={status}>
                        <h3>{status}</h3>
                        {tasks
                          .filter((t) => t.status === status)
                          .map((t) => (
                            <article className="task-card" key={t.id}>
                              <span className="status-badge">
                                {text(t, "priority")}
                              </span>
                              <h3>{text(t, "title")}</h3>
                              <p>
                                {memberName(text(t, "assignee_id"))} ·{" "}
                                {text(t, "due_on")}
                              </p>
                              <select
                                aria-label={text(t, "title") + " 상태"}
                                value={text(t, "status")}
                                disabled={locked || busy}
                                onChange={(e) =>
                                  run("team_task_status", {
                                    id: t.id,
                                    status: e.target.value,
                                  })
                                }
                              >
                                {["대기", "진행중", "완료"].map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      {modal && (
        <dialog
          ref={dialog}
          className="editor-dialog"
          onCancel={() => setModal(null)}
        >
          <div className="section-heading">
            <h2>
              {
                {
                  save_contact: "고객 정보",
                  save_deal: "영업기회",
                  followup: "후속 연락",
                  notice: "팀 공지",
                  calendar: "팀 일정",
                  approval: "결재 요청",
                  team_task: "팀 업무",
                  invite_member: "가입 팀원 연결",
                }[modal.action]
              }
            </h2>
            <button aria-label="창 닫기" onClick={() => setModal(null)}>
              ×
            </button>
          </div>
          <form onSubmit={saveForm}>
            {modal.action === "save_contact" && (
              <>
                <Field name="name" label="고객 회사명" value={value("name")} />
                <Field
                  name="contact"
                  label="담당자"
                  value={value("contact")}
                  required={false}
                />
                <Field
                  name="email"
                  label="이메일"
                  type="email"
                  value={value("email")}
                  required={false}
                />
                <Field
                  name="phone"
                  label="연락처"
                  value={value("phone")}
                  required={false}
                />
                <Field
                  name="owner_name"
                  label="영업 담당자 표시 이름"
                  value={value("owner_name")}
                  required={false}
                />
                <Field
                  name="source"
                  label="유입 경로"
                  value={value("source") || "직접 등록"}
                />
                <label>
                  메모
                  <textarea
                    name="memo"
                    defaultValue={value("memo")}
                    maxLength={5000}
                  />
                </label>
              </>
            )}
            {modal.action === "save_deal" && (
              <>
                {contactSelect}
                <Field
                  name="title"
                  label="영업기회 이름"
                  value={value("title")}
                />
                <Field
                  name="amount"
                  label="기회 금액 (입력값, 원)"
                  type="number"
                  value={value("amount") || 0}
                />
                <Field
                  name="owner_name"
                  label="영업 담당자 표시 이름"
                  value={value("owner_name")}
                  required={false}
                />
                <Field
                  name="due_on"
                  label="목표일"
                  type="date"
                  value={value("due_on") || today}
                />
                <label>
                  단계
                  <select name="stage" defaultValue={value("stage") || "신규"}>
                    {dealStages.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {modal.action === "followup" && (
              <>
                {contactSelect}
                <Field name="title" label="연락할 내용" />
                <Field
                  name="due_on"
                  label="연락 예정일"
                  type="date"
                  value={today}
                />
              </>
            )}
            {["notice", "approval"].includes(modal.action) && (
              <>
                <Field name="title" label="제목" />
                <label>
                  내용
                  <textarea name="body" required maxLength={10000} rows={5} />
                </label>
                {modal.action === "notice" ? (
                  <label className="checkbox-label">
                    <input
                      name="pinned"
                      type="checkbox"
                      disabled={role !== "admin"}
                    />
                    상단 고정 (관리자)
                  </label>
                ) : (
                  <label>
                    결재자
                    <select name="approver_id" required>
                      {staff
                        .filter((m) => m.user_id !== actor)
                        .map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </>
            )}
            {modal.action === "calendar" && (
              <>
                <Field name="title" label="일정 제목" />
                <Field
                  name="starts_at"
                  label="시작 시각"
                  type="datetime-local"
                />
                <Field name="ends_at" label="종료 시각" type="datetime-local" />
                <Field
                  name="location"
                  label="장소 또는 회의 방식"
                  required={false}
                />
              </>
            )}
            {modal.action === "team_task" && (
              <>
                <Field name="title" label="업무 제목" />
                <label>
                  담당자
                  <select name="assignee_id">
                    {staff.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field name="due_on" label="마감일" type="date" value={today} />
                <label>
                  우선순위
                  <select name="priority">
                    {["보통", "높음", "긴급"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {modal.action === "invite_member" && (
              <>
                <Field
                  name="email"
                  label="가입·확인 완료 이메일"
                  type="email"
                />
                <Field name="name" label="표시 이름" />
                <p className="muted">
                  같은 회사 내부 팀원으로 연결합니다. 고객 권한 계정을 팀원으로
                  자동 승격하지 않습니다.
                </p>
              </>
            )}
            <button className="button primary" disabled={busy || locked}>
              저장
            </button>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
          </form>
        </dialog>
      )}
    </div>
  );
}
