"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  db,
  cloudState,
  command,
  demoCommand,
  loadDemo,
  saveDemo,
  sample,
  upload,
  imageURL,
} from "../../lib/data";
import {
  emptyState,
  money,
  plans,
  quoteTotal,
  estimateQuote,
  readOnly,
  stages,
  type State,
  type QuoteLine,
  type Client,
  type Project,
  type Feedback,
} from "../../lib/domain";
import { stageLabels, projectSummary } from "../../lib/pms";

type View =
  | "overview"
  | "project"
  | "projects"
  | "clients"
  | "review"
  | "quotes"
  | "tasks"
  | "settings";
type Modal = {
  kind: "client" | "project" | "task" | "invite";
  data?: Client | Project;
};
const labels: Record<View, string> = {
  overview: "전체 흐름",
  projects: "프로젝트",
  project: "프로젝트 개요",
  clients: "고객 · 요청 부서",
  review: "자료 검토 · 피드백",
  quotes: "견적서",
  tasks: "작업 목록",
  settings: "팀 · 요금",
};
const safeMessage = (e: unknown) =>
  e instanceof Error ? e.message : "작업을 완료하지 못했습니다.";
export default function Workspace() {
  const [state, setState] = useState<State>(emptyState),
    [demo, setDemo] = useState(true),
    [ready, setReady] = useState(false),
    [session, setSession] = useState(false),
    [view, setView] = useState<View>("overview"),
    [orgId, setOrgId] = useState(""),
    [projectId, setProjectId] = useState(""),
    [projectSearch, setProjectSearch] = useState(""),
    [taskScope, setTaskScope] = useState("project"),
    [versionId, setVersionId] = useState(""),
    [image, setImage] = useState(""),
    [demoRole, setDemoRole] = useState("admin"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<Modal | null>(null),
    [dark, setDark] = useState(false),
    [filter, setFilter] = useState("전체"),
    [pin, setPin] = useState<{ x: number; y: number } | null>(null),
    [selectedPin, setSelectedPin] = useState(""),
    [zoom, setZoom] = useState(1),
    [quoteLines, setQuoteLines] = useState<QuoteLine[]>([
      { name: "메인 페이지 디자인", quantity: 1, unitPrice: 800000 },
      { name: "상세 페이지 디자인", quantity: 5, unitPrice: 250000 },
    ]),
    [quoteId, setQuoteId] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const org = state.orgs.find((o) => o.id === orgId) || state.orgs[0];
  const role = demo ? demoRole : org?.role;
  const clientView = role === "client";
  const locked = readOnly(org);
  const projects = state.projects.filter(
    (p) => p.org_id === org?.id && !p.archived,
  );
  const project = projects.find((p) => p.id === projectId) || projects[0];
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const filteredProjects = projects.filter((p) =>
    (p.name + " " + p.owner_name)
      .toLowerCase()
      .includes(projectSearch.toLowerCase().trim()),
  );
  const projectTasks = state.tasks.filter((t) =>
    projects.some((p) => p.id === t.project_id && p.org_id === t.org_id),
  );
  const summary = project ? projectSummary(project, projectTasks, today) : null;
  const clients = state.clients.filter(
    (c) => c.org_id === org?.id && !c.archived,
  );
  const versions = state.versions
    .filter((v) => v.project_id === project?.id)
    .sort((a, b) => b.number - a.number);
  const version = versions.find((v) => v.id === versionId) || versions[0];
  const feedbacks = state.feedbacks.filter((f) => f.version_id === version?.id);
  const activeFeedback = feedbacks.find((f) => f.id === selectedPin);
  const quotes = state.quotes
    .filter(
      (q) =>
        q.project_id === project?.id && (!clientView || q.status !== "draft"),
    )
    .sort((a, b) => b.number - a.number);
  const quote = quotes.find((q) => q.id === quoteId) || quotes[0];
  const refresh = useCallback(async () => {
    try {
      setState(await cloudState());
      setError("");
    } catch (e) {
      setError(safeMessage(e));
    }
  }, []);
  useEffect(() => {
    const isDemo = new URLSearchParams(location.search).get("mode") !== "cloud";
    setDemo(isDemo);
    const initialView = new URLSearchParams(location.search).get("view");
    if (initialView && initialView in labels) setView(initialView as View);
    setProjectId(new URLSearchParams(location.search).get("project") || "");
    setDark(localStorage.getItem("agencyflow-theme") === "dark");
    if (isDemo) setState(loadDemo());
    db.auth.getUser().then(({ data }) => setSession(!!data.user));
    const { data } = db.auth.onAuthStateChange((_event, s) => setSession(!!s));
    setReady(true);
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    if (ready)
      localStorage.setItem("agencyflow-theme", dark ? "dark" : "light");
  }, [dark, ready]);
  useEffect(() => {
    if (!demo && session) refresh();
  }, [demo, session, refresh]);
  useEffect(() => {
    let canceled = false;
    setImage("");
    setPin(null);
    setSelectedPin("");
    setZoom(1);
    if (version)
      imageURL(version.path)
        .then((url) => {
          if (!canceled) setImage(url);
        })
        .catch((e) => {
          if (!canceled) setError(safeMessage(e));
        });
    return () => {
      canceled = true;
    };
  }, [version?.id, version?.path]);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
  }, [modal]);
  useEffect(() => {
    // Opening another workspace section should start at its heading.
    window.scrollTo(0, 0);
  }, [view, demo]);
  async function run(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (locked)
        throw Error(
          "체험이 종료되어 읽기 전용입니다. 데이터는 그대로 보관됩니다.",
        );
      const p = { org_id: org?.id, project_id: project?.id, ...payload };
      if (demo) {
        const next = demoCommand(state, action, p, demoRole);
        saveDemo(next);
        setState(next);
      } else {
        await command(action, p);
        await refresh();
      }
      setNotice(
        demo
          ? "이 브라우저의 샘플에 반영했습니다."
          : "회사 데이터에 저장했습니다.",
      );
      return true;
    } catch (e) {
      setError(safeMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  function pickProject(id: string, nextView: View = "project") {
    setProjectId(id);
    setVersionId("");
    setView(nextView);
    setQuoteId("");
  }
  function changeMode(isDemo: boolean) {
    setDemo(isDemo);
    setState(isDemo ? loadDemo() : emptyState);
    setOrgId("");
    setProjectId("");
    setVersionId("");
    setError("");
    setNotice("");
    setDemoRole("admin");
    setView("overview");
    history.replaceState(
      null,
      "",
      isDemo ? "/workspace/" : "/workspace/?mode=cloud",
    );
    if (!isDemo && session) refresh();
  }
  async function auth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(e.currentTarget),
      signup =
        ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement)
          ?.value === "signup";
    try {
      const payload = {
        email: String(values.get("email")).trim(),
        password: String(values.get("password")),
      };
      const result = signup
        ? await db.auth.signUp({
            ...payload,
            options: {
              emailRedirectTo: location.origin + "/workspace/?mode=cloud",
            },
          })
        : await db.auth.signInWithPassword(payload);
      if (result.error) throw result.error;
      setNotice(
        signup
          ? "가입 요청을 처리했습니다. 메일 확인이 필요합니다. 발송 설정 미완료 시 일반 고객 메일은 도착하지 않을 수 있습니다."
          : "로그인했습니다.",
      );
    } catch (e) {
      setError(safeMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function createOrg(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await command("create_org", {
        name: String(new FormData(e.currentTarget).get("name")),
      });
      await refresh();
    } catch (e) {
      setError(safeMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submitModal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const p = Object.fromEntries(new FormData(e.currentTarget));
    let ok = false;
    if (modal.kind === "client")
      ok = await run("save_client", {
        ...p,
        ...(modal.data ? { id: modal.data.id } : {}),
      });
    if (modal.kind === "project")
      ok = await run("save_project", {
        ...p,
        amount: Number(p.amount),
        ...(modal.data ? { id: modal.data.id } : {}),
      });
    if (modal.kind === "task") ok = await run("task", p);
    if (modal.kind === "invite") ok = await run("invite", p);
    if (ok) setModal(null);
  }
  async function addVersion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!org || !project) return;
    const form = e.currentTarget,
      values = new FormData(form),
      file = values.get("file");
    if (!(file instanceof File) || !file.size) return;
    setBusy(true);
    setError("");
    try {
      const asset = await upload(file, org, project.id, demo);
      const ok = await run("version", {
        title: String(values.get("title")).trim(),
        ...asset,
      });
      if (ok) {
        setVersionId("");
        form.reset();
      }
    } catch (e) {
      setError(safeMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function placePin(e: MouseEvent<HTMLDivElement>) {
    if (!version || version.status === "approved" || locked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPin({
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    });
    setSelectedPin("");
  }
  async function newFeedback(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pin) return;
    const form = e.currentTarget;
    if (
      await run("feedback", {
        version_id: version?.id,
        ...pin,
        body: String(new FormData(form).get("body")),
      })
    ) {
      setPin(null);
      form.reset();
    }
  }
  async function reply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (
      await run("reply", {
        feedback_id: activeFeedback?.id,
        body: String(new FormData(form).get("body")),
      })
    )
      form.reset();
  }
  const Field = ({
    name,
    label,
    type = "text",
    value = "",
    required = false,
  }: {
    name: string;
    label: string;
    type?: string;
    value?: string | number;
    required?: boolean;
  }) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        maxLength={type === "text" ? 160 : undefined}
        min={type === "number" ? 0 : undefined}
      />
    </label>
  );
  const getDefault = (name: string) =>
    modal?.data && name in modal.data
      ? String((modal.data as unknown as Record<string, unknown>)[name] ?? "")
      : "";
  if (!ready)
    return (
      <main className="loading-page">ProjectFlow를 준비하고 있습니다…</main>
    );
  return (
    <div className="app-shell">
      <aside className="app-rail">
        <a className="af-brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            ProjectFlow<small>PMS · Project &amp; Feedback</small>
          </span>
        </a>
        <div className="workspace-name">
          <span className="avatar">{org?.name?.slice(0, 1) || "A"}</span>
          <div>
            <b>{org?.name || "나의 워크스페이스"}</b>
            <small>{demo ? "브라우저 샘플" : "회사 계정 · Supabase"}</small>
          </div>
        </div>
        <nav aria-label="워크스페이스 메뉴">
          {(Object.entries(labels) as [View, string][])
            .filter(([key]) => key !== "project")
            .filter(
              ([key]) =>
                !clientView ||
                ["overview", "projects", "review", "quotes"].includes(key),
            )
            .map(([key, label], i) => (
              <button
                key={key}
                aria-current={
                  view === key || (key === "projects" && view === "project")
                    ? "page"
                    : undefined
                }
                className={
                  view === key || (key === "projects" && view === "project")
                    ? "active"
                    : ""
                }
                onClick={() => setView(key)}
              >
                <span>{["◫", "▤", "◉", "⊙", "▧", "✓", "⚙"][i]}</span>
                {label}
              </button>
            ))}
        </nav>
        <div className="rail-bottom">
          <a
            href="/manuals/agencyflow-guide-orange-20261031.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            제품소개서 보기 ↗
          </a>
          <a href="/">← 서비스 소개</a>
          <button onClick={() => setDark(!dark)}>
            {dark ? "☀ 라이트 모드" : "◐ 다크 모드"}
          </button>
          <button onClick={() => changeMode(!demo)}>
            {demo ? "회사 계정으로 전환" : "샘플 체험으로 전환"}
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <span>
            워크스페이스 <i>/</i> <b>{labels[view]}</b>
          </span>
          <div>
            {demo ? (
              <label className="inline-label">
                체험 역할
                <select
                  aria-label="체험 역할"
                  value={demoRole}
                  onChange={(e) => {
                    setDemoRole(e.target.value);
                    setView("review");
                  }}
                >
                  <option value="admin">팀원 체험</option>
                  <option value="client">고객 체험</option>
                </select>
              </label>
            ) : session ? (
              <>
                <span className="status-badge">
                  {role === "admin" ? "관리자" : clientView ? "고객" : "팀원"}
                </span>
                <button onClick={() => refresh()}>새로고침</button>
                <button
                  onClick={async () => {
                    await db.auth.signOut();
                    setState(emptyState);
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
              {demo ? "가상 프로젝트 · 샘플 체험" : "회사 데이터 · 초기 검증판"}
            </b>
            <span>
              {demo
                ? "이 브라우저에만 저장됩니다. 실제 팀·고객과 공유되지 않으며 역할 전환은 시연용입니다."
                : "로그인한 회사의 데이터에 저장됩니다. 일반 고객 인증 메일·결제는 준비 중입니다. 익명화 자료로 검증하세요."}
            </span>
          </div>
          {error && (
            <div role="alert" className="error-message">
              {error}
            </div>
          )}
          {notice && (
            <p role="status" className="success-message">
              {notice}
            </p>
          )}
          {locked && org && (
            <div className="error-message">
              체험이 종료되어 읽기 전용입니다. 기존 자료는 보관 중이며 결제
              연결은 준비 중입니다.
            </div>
          )}
          {!demo && !session ? (
            <section className="auth-layout">
              <div>
                <span className="eyebrow">YOUR TEAM, CONNECTED</span>
                <h1>
                  고객의 피드백이
                  <br />
                  다음 작업으로 이어집니다.
                </h1>
                <p>
                  Admin은 회사와 팀을 관리하고, Member는 업무를 진행하며,
                  Client는 초대받은 프로젝트에서 피드백과 승인을 남깁니다.
                </p>
                <p className="muted">
                  SMTP와 인증 반환 주소 설정이 필요한 초기 검증판입니다. 메일이
                  도착하지 않으면 운영자에게 문의하세요.
                </p>
              </div>
              <form className="panel auth-form" onSubmit={auth}>
                <h2>로그인 · 회원가입</h2>
                <Field name="email" label="이메일" type="email" required />
                <label>
                  비밀번호 (10자 이상)
                  <input
                    type="password"
                    name="password"
                    minLength={10}
                    maxLength={128}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <button
                  className="button primary"
                  name="intent"
                  value="login"
                  disabled={busy}
                >
                  로그인
                </button>
                <button
                  className="button"
                  name="intent"
                  value="signup"
                  disabled={busy}
                >
                  가입 확인 메일 요청
                </button>
                <small>
                  가입만으로 요금이 청구되지 않습니다. 결제 기능은 비활성
                  상태입니다.
                </small>
              </form>
            </section>
          ) : !org ? (
            <section className="panel welcome-panel">
              <h1>팀의 공간을 만드세요.</h1>
              <p>
                새 회사는 14일 검증 체험으로 시작합니다. 고객으로 초대받았다면
                새 회사를 만들지 말고 관리자에게 프로젝트 연결을 요청하세요.
              </p>
              <form onSubmit={createOrg}>
                <Field name="name" label="회사·팀 이름" required />
                <button className="button primary" disabled={busy}>
                  회사 공간 만들기
                </button>
              </form>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {clientView ? "CLIENT PORTAL" : "PROJECT OPERATIONS"}
                  </span>
                  <h1>
                    {view === "overview"
                      ? "흩어진 요청을, 명확한 다음 일로."
                      : labels[view]}
                  </h1>
                  <p>
                    {view === "review"
                      ? "위치를 선택하고 피드백을 남기세요. 승인 기록은 버전별로 보관합니다."
                      : view === "projects"
                        ? "고객과 일정, 현재 단계를 한눈에 확인하세요."
                        : view === "quotes"
                          ? "수량과 단가로 계산하고, 버전별로 전달·승인 기록을 남깁니다."
                          : "팀과 고객이 같은 진행 상황을 확인하는 공간입니다."}
                  </p>
                </div>
                {state.orgs.length > 1 && (
                  <label>
                    회사 선택
                    <select
                      value={org.id}
                      onChange={(e) => {
                        setOrgId(e.target.value);
                        setProjectId("");
                        setVersionId("");
                      }}
                    >
                      {state.orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {["project", "review", "quotes", "tasks"].includes(view) && (
                <div className="project-switcher">
                  <label>
                    프로젝트
                    <select
                      value={project?.id || ""}
                      onChange={(e) => {
                        setProjectId(e.target.value);
                        setVersionId("");
                        setQuoteId("");
                      }}
                    >
                      {!projects.length && (
                        <option value="">프로젝트 없음</option>
                      )}
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {project && (
                    <span className="status-badge">
                      {stageLabels[project.stage]} ·{" "}
                      {project.owner_name || "담당자 미정"}
                    </span>
                  )}
                </div>
              )}
              {view === "overview" && (
                <>
                  <div className="stats-grid">
                    {[
                      [
                        "진행 중",
                        projects.filter(
                          (p) => !["완료", "유지보수"].includes(p.stage),
                        ).length + "개",
                        "활성 프로젝트",
                      ],
                      [
                        "기한 초과 작업",
                        projectTasks.filter(
                          (t) =>
                            t.status !== "완료" && t.due_on && t.due_on < today,
                        ).length + "개",
                        "미완료 작업 기준",
                      ],
                      [
                        "완료 프로젝트",
                        projects.filter((p) => p.stage === "완료").length +
                          "개",
                        "현재 단계 기준",
                      ],
                      [
                        "운영 단계",
                        projects.filter((p) => p.stage === "유지보수").length +
                          "곳",
                        "현재 단계 기준",
                      ],
                    ].map(([t, v, d]) => (
                      <article className="panel stat-card" key={t}>
                        <span>{t}</span>
                        <b>{v}</b>
                        <small>{d}</small>
                      </article>
                    ))}
                  </div>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <div className="section-heading">
                        <h2>다음 확인이 필요한 프로젝트</h2>
                        <button onClick={() => setView("projects")}>
                          전체 보기 ↗
                        </button>
                      </div>
                      {projects.length ? (
                        projects.map((p) => (
                          <button
                            key={p.id}
                            className="project-row"
                            onClick={() => pickProject(p.id)}
                          >
                            <span className="project-avatar">
                              {p.name.slice(0, 1)}
                            </span>
                            <span>
                              <b>{p.name}</b>
                              <small>
                                {p.owner_name || "담당자 미정"} · {p.due_on}{" "}
                                예정
                              </small>
                            </span>
                            <span className="status-badge">
                              {stageLabels[p.stage]}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="empty-state">
                          고객과 프로젝트를 등록하면 업무 흐름이 시작됩니다.
                        </p>
                      )}
                    </section>
                    <section className="panel">
                      <h2>다가오는 일정</h2>
                      {projects
                        .slice()
                        .sort((a, b) => a.due_on.localeCompare(b.due_on))
                        .map((p) => (
                          <div key={p.id} className="timeline-item">
                            <strong>{p.due_on}</strong>
                            <p>{p.name}</p>
                            <small>{stageLabels[p.stage]} · 종료 예정일</small>
                          </div>
                        ))}
                      {!projects.length && (
                        <p className="empty-state">등록된 일정이 없습니다.</p>
                      )}
                      <p className="muted">
                        계약일·중간보고일·유지보수 반복 일정은 후속 확장
                        범위입니다.
                      </p>
                    </section>
                  </div>
                  <section className="panel">
                    <h2>최근 피드백</h2>
                    {state.feedbacks
                      .filter((f) =>
                        projects.some((p) => p.id === f.project_id),
                      )
                      .slice(-5)
                      .reverse()
                      .map((f) => (
                        <button
                          className="activity-row"
                          key={f.id}
                          onClick={() => {
                            pickProject(f.project_id, "review");
                            setVersionId(f.version_id);
                            setSelectedPin(f.id);
                          }}
                        >
                          <span className="status-badge">{f.status}</span>
                          <span>{f.body}</span>
                        </button>
                      ))}
                    <p className="muted">
                      미수금·MRR은 실제 수금·결제 연결 전까지 표시하지 않습니다.
                    </p>
                  </section>
                </>
              )}
              {view === "clients" && !clientView && (
                <>
                  <div className="section-heading">
                    <h2>고객 {clients.length}곳</h2>
                    <button
                      className="button primary"
                      onClick={() => setModal({ kind: "client" })}
                      disabled={locked}
                    >
                      + 고객 등록
                    </button>
                  </div>
                  <div className="client-grid">
                    {clients.map((c) => (
                      <article className="panel client-card" key={c.id}>
                        <span className="project-avatar">
                          {c.name.slice(0, 1)}
                        </span>
                        <h2>{c.name}</h2>
                        <p>{c.contact || "담당자 미등록"}</p>
                        <dl>
                          <dt>이메일</dt>
                          <dd>{c.email || "—"}</dd>
                          <dt>연락처</dt>
                          <dd>{c.phone || "—"}</dd>
                          <dt>사업자번호</dt>
                          <dd>{c.business_number || "—"}</dd>
                        </dl>
                        <p>{c.memo}</p>
                        <div className="actions">
                          <button
                            onClick={() =>
                              setModal({ kind: "client", data: c })
                            }
                            disabled={locked}
                          >
                            정보 수정
                          </button>
                          <button
                            disabled={locked || busy}
                            onClick={() => run("archive_client", { id: c.id })}
                          >
                            고객 보관
                          </button>
                        </div>
                        <div className="client-history">
                          <b>연결 프로젝트</b>
                          {projects
                            .filter((p) => p.client_id === c.id)
                            .map((p) => (
                              <button
                                key={p.id}
                                onClick={() => pickProject(p.id)}
                              >
                                {p.name} ↗
                              </button>
                            ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  {!clients.length && (
                    <p className="empty-state">
                      첫 고객을 등록하세요. 보관한 고객은 목록에서 제외되며 기존
                      기록은 남습니다.
                    </p>
                  )}
                </>
              )}
              {view === "project" &&
                (project && summary ? (
                  <section className="panel pms-detail">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">PROJECT OVERVIEW</span>
                        <h2>{project.name}</h2>
                        <p>
                          {clients.find((c) => c.id === project.client_id)
                            ?.name || "연결 프로젝트"}
                        </p>
                      </div>
                      <button onClick={() => setView("projects")}>
                        ← 프로젝트 목록
                      </button>
                    </div>
                    <div className="pms-facts">
                      <div>
                        <small>담당자</small>
                        <b>{project.owner_name || "미정"}</b>
                      </div>
                      <div>
                        <small>기간</small>
                        <b>
                          {project.starts_on} ~ {project.due_on}
                        </b>
                      </div>
                      <div>
                        <small>진행 단계</small>
                        <b>{stageLabels[project.stage]}</b>
                      </div>
                      <div>
                        <small>일정 상태</small>
                        <b>
                          {summary.overdue
                            ? "기한 초과"
                            : ["완료", "운영"].includes(
                                  stageLabels[project.stage],
                                )
                              ? "완료"
                              : "일정 확인"}
                        </b>
                      </div>
                    </div>
                    {!clientView && (
                      <>
                        <h3>등록 작업 기준 진행률</h3>
                        <p>
                          {summary.percent === null
                            ? "등록된 작업이 없어 진행률을 계산하지 않습니다."
                            : summary.done +
                              " / " +
                              summary.total +
                              "개 완료 · " +
                              summary.percent +
                              "%"}
                        </p>
                        <progress
                          aria-label="작업 완료율"
                          max={100}
                          value={summary.percent ?? 0}
                        />
                        <p>
                          기한을 넘긴 미완료 작업 {summary.overdueTasks}개 ·
                          진행률은 프로젝트 승인이나 납품 완료를 뜻하지
                          않습니다.
                        </p>
                        <div className="actions">
                          <button
                            className="button primary"
                            disabled={locked || busy}
                            onClick={() => setModal({ kind: "task" })}
                          >
                            + 작업 추가
                          </button>
                          <button
                            onClick={() => {
                              setTaskScope("project");
                              setView("tasks");
                            }}
                          >
                            작업 보드 보기
                          </button>
                          <button
                            onClick={() =>
                              setModal({ kind: "project", data: project })
                            }
                            disabled={locked}
                          >
                            프로젝트 정보 수정
                          </button>
                        </div>
                      </>
                    )}
                    <div className="actions">
                      <button onClick={() => setView("review")}>
                        자료·시안 검토
                      </button>
                      <button onClick={() => setView("quotes")}>
                        견적·승인 기록
                      </button>
                    </div>
                    <p className="muted">
                      자료 검토는 필요한 프로젝트에서 선택적으로 사용하세요.
                      일정과 업무 관리는 시안 업로드 없이도 가능합니다.
                    </p>
                  </section>
                ) : (
                  <p className="empty-state">프로젝트를 먼저 선택하세요.</p>
                ))}
              {view === "projects" && (
                <>
                  <div className="section-heading">
                    <h2>프로젝트 단계별 보기</h2>
                    {!clientView && (
                      <button
                        className="button primary"
                        disabled={locked || !clients.length}
                        onClick={() => setModal({ kind: "project" })}
                      >
                        + 프로젝트
                      </button>
                    )}
                  </div>
                  {!clients.length && !clientView && (
                    <p className="muted">
                      고객 · 요청 부서에서 외부 고객 또는 내부 요청 부서를 먼저
                      등록하세요.
                    </p>
                  )}
                  <label className="pms-search">
                    프로젝트 검색
                    <input
                      aria-label="프로젝트 검색"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="프로젝트명 또는 담당자 검색"
                    />
                  </label>
                  <p className="muted">
                    컨설팅·교육·행사·제조·사내 개선 업무도 같은 흐름으로
                    관리하세요. 기존 저장 단계는 유지하며 일반 업무 명칭으로
                    표시합니다.
                  </p>
                  <p className="mobile-scroll-note">
                    보드를 좌우로 움직여 다음 단계를 확인하세요.
                  </p>
                  {!filteredProjects.length && (
                    <p className="empty-state">
                      검색 조건에 맞는 프로젝트가 없습니다.
                    </p>
                  )}
                  <div className="kanban-board">
                    {stages.map((stage) => (
                      <section className="kanban-column" key={stage}>
                        <h3>
                          {stageLabels[stage]}
                          <span>
                            {
                              filteredProjects.filter((p) => p.stage === stage)
                                .length
                            }
                          </span>
                        </h3>
                        {filteredProjects
                          .filter((p) => p.stage === stage)
                          .map((p) => (
                            <article className="kanban-card" key={p.id}>
                              <button
                                className="project-title"
                                onClick={() => pickProject(p.id)}
                              >
                                {p.name}
                              </button>
                              <p>
                                {clients.find((c) => c.id === p.client_id)
                                  ?.name || "초대받은 고객 프로젝트"}
                              </p>
                              <small>
                                {p.owner_name || "담당자 미정"} · {p.due_on}
                              </small>
                              <p className="pms-progress">
                                {projectSummary(p, projectTasks, today)
                                  .percent === null
                                  ? "등록 작업 없음"
                                  : `작업 ${projectSummary(p, projectTasks, today).percent}% 완료`}
                                {projectSummary(p, projectTasks, today).overdue
                                  ? " · 기한 초과"
                                  : ""}
                              </p>
                              {!clientView && (
                                <>
                                  <label>
                                    단계 변경
                                    <select
                                      aria-label={p.name + " 단계"}
                                      value={p.stage}
                                      disabled={locked || busy}
                                      onChange={(e) =>
                                        run("stage", {
                                          project_id: p.id,
                                          stage: e.target.value,
                                        })
                                      }
                                    >
                                      {stages.map((s) => (
                                        <option key={s} value={s}>
                                          {(
                                            stageLabels as Record<
                                              string,
                                              string
                                            >
                                          )[s] || s}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <div className="actions">
                                    <button
                                      onClick={() =>
                                        setModal({ kind: "project", data: p })
                                      }
                                      disabled={locked}
                                    >
                                      수정
                                    </button>
                                    <button
                                      onClick={() =>
                                        run("archive_project", {
                                          project_id: p.id,
                                        })
                                      }
                                      disabled={locked || busy}
                                    >
                                      보관
                                    </button>
                                  </div>
                                </>
                              )}
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                </>
              )}
              {view === "review" &&
                (project ? (
                  <>
                    <div className="review-toolbar">
                      <label>
                        시안 버전
                        <select
                          aria-label="시안 버전"
                          value={version?.id || ""}
                          onChange={(e) => setVersionId(e.target.value)}
                        >
                          {!versions.length && (
                            <option value="">등록된 시안 없음</option>
                          )}
                          {versions.map((v) => (
                            <option key={v.id} value={v.id}>
                              v{v.number} · {v.title} ·{" "}
                              {v.status === "approved" ? "승인됨" : "검수 중"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="actions">
                        <button onClick={() => setZoom(zoom === 1 ? 1.5 : 1)}>
                          {zoom === 1 ? "150% 확대" : "100% 보기"}
                        </button>
                        {version && (
                          <button
                            disabled={locked || version.status === "approved"}
                            onClick={() => setPin({ x: 0.5, y: 0.5 })}
                          >
                            중앙에 핀 추가
                          </button>
                        )}
                        {clientView && version && (
                          <button
                            className="button primary"
                            disabled={
                              locked || busy || version.status === "approved"
                            }
                            onClick={() =>
                              run("approve_version", { version_id: version.id })
                            }
                          >
                            {version.status === "approved"
                              ? "승인된 시안"
                              : "현재 버전 승인"}
                          </button>
                        )}
                      </div>
                    </div>
                    {version?.status === "approved" && (
                      <p className="approval-banner">
                        ✓ v{version.number} 고객 승인 ·{" "}
                        {new Date(
                          version.approved_at || version.created_at,
                        ).toLocaleString("ko-KR")}{" "}
                        · 기존 핀과 대화는 보관 전용입니다. 변경은 새 버전으로
                        시작하세요.
                      </p>
                    )}
                    <div className="review-layout">
                      <section className="design-panel">
                        <div className="canvas-label">
                          <span>{version?.title || "시안을 등록하세요"}</span>
                          <small>
                            {version
                              ? "이미지를 눌러 수정 위치 선택"
                              : "PNG·JPG·WebP · 5MB 이하"}
                          </small>
                        </div>
                        <div className="canvas-scroll">
                          {image ? (
                            <div
                              className="pin-canvas"
                              onClick={placePin}
                              style={{ width: zoom * 100 + "%" }}
                            >
                              <img
                                src={image}
                                alt={version?.title || "디자인 시안"}
                                draggable={false}
                              />
                              {feedbacks.map((f, i) => (
                                <button
                                  className={
                                    "feedback-pin " +
                                    (f.status === "완료" ? "resolved" : "") +
                                    (selectedPin === f.id ? " selected" : "")
                                  }
                                  key={f.id}
                                  style={{
                                    left: f.x * 100 + "%",
                                    top: f.y * 100 + "%",
                                  }}
                                  aria-label={`피드백 ${i + 1}: ${f.body}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPin(f.id);
                                    setPin(null);
                                  }}
                                >
                                  {i + 1}
                                </button>
                              ))}
                              {pin && (
                                <span
                                  className="pending-pin"
                                  style={{
                                    left: pin.x * 100 + "%",
                                    top: pin.y * 100 + "%",
                                  }}
                                >
                                  +
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="empty-state">
                              {version
                                ? "시안 이미지를 불러오는 중입니다. 권한·네트워크를 확인한 뒤 다시 선택하세요."
                                : "시안을 올리면 고객이 이미지 위에 수정 요청을 남길 수 있습니다."}
                            </p>
                          )}
                        </div>
                        {!clientView && !locked && (
                          <form className="upload-form" onSubmit={addVersion}>
                            <h3>새 시안 버전 등록</h3>
                            <label>
                              버전 제목
                              <input
                                name="title"
                                required
                                maxLength={160}
                                placeholder="메인 페이지 수정안"
                              />
                            </label>
                            <label>
                              이미지 파일
                              <input
                                name="file"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                required
                              />
                            </label>
                            <button className="button primary" disabled={busy}>
                              새 버전 업로드
                            </button>
                            <small>
                              기존 승인본·피드백은 그대로 남습니다. 웹사이트
                              URL은 프로젝트 정보에 참고 링크로만 저장하며 자동
                              캡처하지 않습니다.
                            </small>
                          </form>
                        )}
                      </section>
                      <aside className="panel feedback-panel">
                        <div className="section-heading">
                          <h2>피드백 {feedbacks.length}</h2>
                          <select
                            aria-label="피드백 상태 필터"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                          >
                            {["전체", "대기", "작업중", "완료"].map((s) => (
                              <option key={s} value={s}>
                                {(stageLabels as Record<string, string>)[s] ||
                                  s}
                              </option>
                            ))}
                          </select>
                        </div>
                        {pin && (
                          <form className="pin-form" onSubmit={newFeedback}>
                            <b>선택한 위치에 수정 요청</b>
                            <textarea
                              name="body"
                              required
                              maxLength={3000}
                              placeholder="어떻게 바꾸면 좋을까요?"
                              rows={3}
                            />
                            <div className="actions">
                              <button
                                className="button primary"
                                disabled={busy || locked}
                              >
                                피드백 등록
                              </button>
                              <button
                                type="button"
                                onClick={() => setPin(null)}
                              >
                                취소
                              </button>
                            </div>
                          </form>
                        )}
                        <div className="feedback-list">
                          {feedbacks
                            .filter(
                              (f) => filter === "전체" || f.status === filter,
                            )
                            .map((f, i) => (
                              <button
                                key={f.id}
                                className={
                                  "feedback-item " +
                                  (selectedPin === f.id ? "selected" : "")
                                }
                                onClick={() => {
                                  setSelectedPin(f.id);
                                  setPin(null);
                                }}
                              >
                                <span className="feedback-number">
                                  {feedbacks.indexOf(f) + 1}
                                </span>
                                <div>
                                  <span className="status-badge">
                                    {f.status}
                                  </span>
                                  <p>{f.body}</p>
                                  <small>
                                    {new Date(f.created_at).toLocaleDateString(
                                      "ko-KR",
                                    )}
                                  </small>
                                </div>
                              </button>
                            ))}
                          {!feedbacks.length && (
                            <p className="empty-state">
                              수정이 필요한 위치를 눌러 첫 요청을 남기세요.
                            </p>
                          )}
                        </div>
                        {activeFeedback && (
                          <div className="thread">
                            <h3>
                              핀 {feedbacks.indexOf(activeFeedback) + 1}의 대화
                            </h3>
                            <p>{activeFeedback.body}</p>
                            {!clientView && (
                              <label>
                                처리 상태
                                <select
                                  aria-label="선택한 피드백 상태"
                                  value={activeFeedback.status}
                                  disabled={
                                    locked ||
                                    busy ||
                                    version?.status === "approved"
                                  }
                                  onChange={(e) =>
                                    run("feedback_status", {
                                      id: activeFeedback.id,
                                      status: e.target.value,
                                    })
                                  }
                                >
                                  {["대기", "작업중", "완료"].map((s) => (
                                    <option key={s} value={s}>
                                      {(stageLabels as Record<string, string>)[
                                        s
                                      ] || s}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {state.comments
                              .filter(
                                (c) => c.feedback_id === activeFeedback.id,
                              )
                              .map((c) => (
                                <div className="reply" key={c.id}>
                                  <small>
                                    {new Date(c.created_at).toLocaleString(
                                      "ko-KR",
                                    )}
                                  </small>
                                  <p>{c.body}</p>
                                </div>
                              ))}
                            {!locked && version?.status !== "approved" && (
                              <form onSubmit={reply}>
                                <label>
                                  답글
                                  <textarea
                                    name="body"
                                    required
                                    rows={3}
                                    maxLength={3000}
                                  />
                                </label>
                                <button className="button" disabled={busy}>
                                  답글 남기기
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </aside>
                    </div>
                  </>
                ) : (
                  <p className="empty-state">
                    먼저 고객과 프로젝트를 등록하세요.
                  </p>
                ))}
              {view === "quotes" &&
                (project ? (
                  <div className="quote-layout">
                    {!clientView && (
                      <section className="panel quote-builder">
                        <h2>견적 항목 구성</h2>
                        <form
                          className="estimate-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            try {
                              const d = new FormData(e.currentTarget);
                              setQuoteLines(
                                estimateQuote({
                                  pages: +String(d.get("pages")),
                                  pageRate: +String(d.get("pageRate")),
                                  mainRate: +String(d.get("mainRate")),
                                  design: +String(d.get("design")),
                                  development: +String(d.get("development")),
                                  features: d.getAll("features").map(String),
                                }),
                              );
                            } catch (err) {
                              setError(safeMessage(err));
                            }
                          }}
                        >
                          <h3>범위로 기본 견적 만들기</h3>
                          <div className="form-pair">
                            <Field
                              name="pages"
                              label="페이지 수"
                              type="number"
                              value={5}
                              required
                            />
                            <Field
                              name="pageRate"
                              label="페이지 기본 단가 (가정, 원)"
                              type="number"
                              value={250000}
                              required
                            />
                            <Field
                              name="mainRate"
                              label="메인 시안 단가 (가정, 원)"
                              type="number"
                              value={800000}
                              required
                            />
                            <label>
                              디자인 난이도
                              <select name="design">
                                <option value="1">기본 ×1</option>
                                <option value="1.3">보통 ×1.3</option>
                                <option value="1.6">높음 ×1.6</option>
                              </select>
                            </label>
                            <label>
                              개발 난이도
                              <select name="development">
                                <option value="1">기본 ×1</option>
                                <option value="1.4">보통 ×1.4</option>
                                <option value="1.8">높음 ×1.8</option>
                              </select>
                            </label>
                          </div>
                          <fieldset>
                            <legend>
                              추가 기능 (단가는 예시이며 아래에서 수정)
                            </legend>
                            {[
                              "관리자 페이지",
                              "게시판",
                              "예약 기능",
                              "결제 기능",
                              "다국어 기능",
                            ].map((f) => (
                              <label className="checkbox-label" key={f}>
                                <input
                                  type="checkbox"
                                  name="features"
                                  value={f}
                                />
                                {f}
                              </label>
                            ))}
                          </fieldset>
                          <button type="submit">항목에 반영</button>
                        </form>
                        <p>
                          단가를 직접 합의하세요. 아래 초기 단가는 가상 예시이며
                          시장 가격을 보장하지 않습니다.
                        </p>
                        {quoteLines.map((line, i) => (
                          <div className="quote-line-editor" key={i}>
                            <label>
                              항목
                              <input
                                aria-label={"항목 " + (i + 1)}
                                value={line.name}
                                maxLength={160}
                                onChange={(e) =>
                                  setQuoteLines(
                                    quoteLines.map((l, k) =>
                                      k === i
                                        ? { ...l, name: e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              수량
                              <input
                                type="number"
                                aria-label={"수량 " + (i + 1)}
                                min={1}
                                max={10000}
                                value={line.quantity}
                                onChange={(e) =>
                                  setQuoteLines(
                                    quoteLines.map((l, k) =>
                                      k === i
                                        ? { ...l, quantity: +e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              단가 (원)
                              <input
                                type="number"
                                aria-label={"단가 " + (i + 1)}
                                min={0}
                                max={100000000}
                                value={line.unitPrice}
                                onChange={(e) =>
                                  setQuoteLines(
                                    quoteLines.map((l, k) =>
                                      k === i
                                        ? { ...l, unitPrice: +e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <button
                              aria-label={"항목 " + (i + 1) + " 삭제"}
                              onClick={() =>
                                setQuoteLines(
                                  quoteLines.filter((_, k) => k !== i),
                                )
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="actions">
                          <button
                            disabled={quoteLines.length >= 30}
                            onClick={() =>
                              setQuoteLines([
                                ...quoteLines,
                                {
                                  name: "추가 기능",
                                  quantity: 1,
                                  unitPrice: 0,
                                },
                              ])
                            }
                          >
                            + 항목 추가
                          </button>
                          <button
                            onClick={() =>
                              setQuoteLines([
                                ...quoteLines,
                                {
                                  name: "예약·결제·다국어 기능 (범위 협의)",
                                  quantity: 1,
                                  unitPrice: 500000,
                                },
                              ])
                            }
                            disabled={quoteLines.length >= 30}
                          >
                            기능 예시 추가
                          </button>
                        </div>
                        <button
                          className="button primary full"
                          disabled={busy || locked}
                          onClick={async () => {
                            try {
                              quoteTotal(quoteLines);
                              if (await run("quote", { lines: quoteLines }))
                                setQuoteId("");
                            } catch (e) {
                              setError(safeMessage(e));
                            }
                          }}
                        >
                          새 견적 버전 저장
                        </button>
                        <p className="muted">
                          기존 견적은 덮어쓰지 않습니다. 공급가액·VAT·총액은
                          서버가 재계산합니다.
                        </p>
                      </section>
                    )}
                    <section className="panel">
                      <div className="section-heading">
                        <label>
                          견적 버전
                          <select
                            value={quote?.id || ""}
                            onChange={(e) => setQuoteId(e.target.value)}
                          >
                            {!quotes.length && (
                              <option value="">견적 없음</option>
                            )}
                            {quotes.map((q) => (
                              <option key={q.id} value={q.id}>
                                v{q.number} ·{" "}
                                {q.status === "approved"
                                  ? "승인"
                                  : q.status === "sent"
                                    ? "고객 전달"
                                    : "초안"}
                              </option>
                            ))}
                          </select>
                        </label>
                        {quote && (
                          <button onClick={() => window.print()}>
                            인쇄 · PDF 저장
                          </button>
                        )}
                      </div>
                      {quote ? (
                        <>
                          <div className="quote-document">
                            <div className="quote-document-head">
                              <span className="af-brand">ProjectFlow</span>
                              <span>견적서 · v{quote.number}</span>
                            </div>
                            <h2>{project.name}</h2>
                            <p>
                              {org.name} →{" "}
                              {clients.find((c) => c.id === project.client_id)
                                ?.name || "이 프로젝트의 고객"}
                            </p>
                            <p>
                              발행{" "}
                              {new Date(quote.created_at).toLocaleDateString(
                                "ko-KR",
                              )}
                            </p>
                            <div className="table-scroll">
                              <table>
                                <thead>
                                  <tr>
                                    <th>항목</th>
                                    <th>수량</th>
                                    <th>단가</th>
                                    <th>금액</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quote.lines.map((l, i) => (
                                    <tr key={i}>
                                      <td>{l.name}</td>
                                      <td>{l.quantity}</td>
                                      <td>{money(l.unitPrice)}</td>
                                      <td>{money(l.quantity * l.unitPrice)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <dl className="quote-totals">
                              <dt>공급가액</dt>
                              <dd>{money(quote.subtotal)}</dd>
                              <dt>VAT 10%</dt>
                              <dd>{money(quote.vat)}</dd>
                              <dt>합계</dt>
                              <dd>
                                <strong>{money(quote.total)}</strong>
                              </dd>
                            </dl>
                            <p className="quote-terms">
                              제공 범위·납품 일정·수정 횟수·대금 지급 조건은
                              별도 합의가 필요합니다. 온라인 승인은 버전 확인
                              기록이며 전자서명 계약이 아닙니다.
                            </p>
                            {quote.status === "approved" && (
                              <p className="approval-banner">
                                ✓ 고객 승인 기록 ·{" "}
                                {new Date(
                                  quote.approved_at || quote.created_at,
                                ).toLocaleString("ko-KR")}
                              </p>
                            )}
                          </div>
                          <div className="actions">
                            {!clientView && quote.status === "draft" && (
                              <button
                                className="button primary"
                                disabled={busy || locked}
                                onClick={() =>
                                  run("send_quote", { id: quote.id })
                                }
                              >
                                고객에게 공개
                              </button>
                            )}
                            {clientView && quote.status === "sent" && (
                              <button
                                className="button primary"
                                disabled={busy || locked}
                                onClick={() =>
                                  run("approve_quote", { id: quote.id })
                                }
                              >
                                이 견적 버전 확인 · 승인
                              </button>
                            )}
                          </div>
                          <p className="muted">
                            고객 공개는 프로젝트 고객 계정의 열람을 허용합니다.
                            이메일을 발송하지 않습니다.
                          </p>
                        </>
                      ) : (
                        <p className="empty-state">전달된 견적이 없습니다.</p>
                      )}
                    </section>
                  </div>
                ) : (
                  <p className="empty-state">프로젝트를 먼저 등록하세요.</p>
                ))}
              {view === "tasks" && !clientView && (
                <>
                  <div className="section-heading">
                    <h2>
                      {taskScope === "all"
                        ? "전체 프로젝트 작업"
                        : (project?.name || "프로젝트 선택") + "의 작업"}
                    </h2>
                    <button
                      className="button primary"
                      disabled={!project || locked}
                      onClick={() => setModal({ kind: "task" })}
                    >
                      + 작업 추가
                    </button>
                  </div>
                  <label className="pms-search">
                    작업 범위
                    <select
                      value={taskScope}
                      onChange={(e) => setTaskScope(e.target.value)}
                    >
                      <option value="project">선택한 프로젝트</option>
                      <option value="all">전체 프로젝트</option>
                    </select>
                  </label>
                  <div className="task-columns">
                    {["대기", "진행중", "완료"].map((status) => (
                      <section className="panel" key={status}>
                        <h3>{status}</h3>
                        {projectTasks
                          .filter(
                            (t) =>
                              (taskScope === "all" ||
                                t.project_id === project?.id) &&
                              t.status === status,
                          )
                          .map((t) => (
                            <article className="task-card" key={t.id}>
                              <span className="status-badge">{t.priority}</span>
                              <small>
                                {
                                  projects.find((p) => p.id === t.project_id)
                                    ?.name
                                }
                              </small>
                              <h3>{t.title}</h3>
                              {t.status !== "완료" &&
                                t.due_on &&
                                t.due_on < today && (
                                  <span className="status-badge">
                                    기한 초과
                                  </span>
                                )}
                              <p>
                                {t.owner_name || "담당자 미정"} · {t.due_on}
                              </p>
                              <select
                                aria-label={t.title + " 상태"}
                                value={t.status}
                                disabled={busy || locked}
                                onChange={(e) =>
                                  run("task_status", {
                                    id: t.id,
                                    project_id: t.project_id,
                                    status: e.target.value,
                                  })
                                }
                              >
                                {["대기", "진행중", "완료"].map((s) => (
                                  <option key={s} value={s}>
                                    {(stageLabels as Record<string, string>)[
                                      s
                                    ] || s}
                                  </option>
                                ))}
                              </select>
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                </>
              )}
              {view === "settings" && !clientView && (
                <>
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <h2>팀과 고객 접근 권한</h2>
                        <p>
                          고객은 지정 프로젝트만 열람합니다. 기존 가입·이메일
                          확인 계정을 연결합니다.
                        </p>
                      </div>
                      {role === "admin" && (
                        <button
                          className="button primary"
                          disabled={locked || demo}
                          onClick={() => setModal({ kind: "invite" })}
                        >
                          구성원 연결
                        </button>
                      )}
                    </div>
                    {demo && (
                      <p className="muted">
                        실제 팀 초대·공유는 회사 계정에서 사용합니다. 샘플의
                        역할 전환은 시연입니다.
                      </p>
                    )}
                    <ul className="member-list">
                      {state.members
                        .filter((m) => m.org_id === org.id)
                        .map((m) => (
                          <li key={m.user_id}>
                            <b>{m.name}</b>
                            <span>{m.role}</span>
                          </li>
                        ))}
                    </ul>
                    {!demo && project && (
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              location.origin +
                                "/workspace/?mode=cloud&project=" +
                                project.id,
                            );
                            setNotice(
                              "프로젝트 링크를 복사했습니다. 초대된 계정으로 로그인해야 열립니다.",
                            );
                          } catch {
                            setError(
                              "복사할 수 없습니다. 주소를 직접 복사하세요.",
                            );
                          }
                        }}
                      >
                        현재 프로젝트 로그인 링크 복사
                      </button>
                    )}
                  </section>
                  <section className="panel">
                    <span className="eyebrow">BILLING STATUS</span>
                    <h2>
                      {org.subscription_status === "trialing"
                        ? "14일 검증 체험"
                        : "구독 상태"}{" "}
                      ·{" "}
                      {new Date(org.trial_ends_at).toLocaleDateString("ko-KR")}
                      까지
                    </h2>
                    <p>
                      현재 {org.plan.toUpperCase()} 범위 · 체험 저장공간 1GB ·
                      만료 시 읽기 전용. 결제·정기 청구·취소·실패 처리·자동
                      메일은 연결 전입니다.
                    </p>
                    <div className="plan-grid">
                      {Object.entries(plans).map(([key, plan]) => (
                        <article className="plan-box" key={key}>
                          <h3>{plan.label}</h3>
                          <strong>{money(plan.price)} / 월</strong>
                          <p>
                            활성 프로젝트 {plan.projects}개<br />
                            내부 {plan.seats}명 · {plan.storage}
                          </p>
                          <button disabled>결제 준비 중</button>
                        </article>
                      ))}
                    </div>
                    <p className="muted">
                      표시 가격은 VAT 별도 검증 가설입니다. 토스 자동결제
                      심사·테스트 키·서버 키·검증된 웹훅·갱신 작업이 갖춰지기
                      전에는 결제나 유료 활성화를 실행하지 않습니다.
                    </p>
                  </section>
                  {demo && (
                    <section className="panel">
                      <h2>샘플 초기화</h2>
                      <p>
                        이 브라우저의 가상 프로젝트를 처음 상태로 되돌립니다.
                      </p>
                      <button
                        onClick={() => {
                          const fresh = sample();
                          saveDemo(fresh);
                          setState(fresh);
                          setProjectId("");
                          setVersionId("");
                          setNotice(
                            "샘플을 초기화했습니다. 업로드 파일은 브라우저 저장소 정리 시 삭제됩니다.",
                          );
                        }}
                      >
                        샘플 기록 초기화
                      </button>
                    </section>
                  )}
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
              {modal.kind === "client"
                ? "고객 정보"
                : modal.kind === "project"
                  ? "프로젝트 정보"
                  : modal.kind === "task"
                    ? "작업 추가"
                    : "구성원 연결"}
            </h2>
            <button aria-label="창 닫기" onClick={() => setModal(null)}>
              ×
            </button>
          </div>
          <form onSubmit={submitModal}>
            {modal.kind === "client" && (
              <>
                <Field
                  name="name"
                  label="고객 · 요청 부서명"
                  value={getDefault("name")}
                  required
                />
                <Field
                  name="contact"
                  label="담당자"
                  value={getDefault("contact")}
                />
                <Field
                  name="email"
                  label="이메일"
                  type="email"
                  value={getDefault("email")}
                />
                <Field
                  name="phone"
                  label="연락처"
                  value={getDefault("phone")}
                />
                <Field
                  name="business_number"
                  label="사업자등록번호 (선택)"
                  value={getDefault("business_number")}
                />
                <label>
                  메모
                  <textarea
                    name="memo"
                    defaultValue={getDefault("memo")}
                    maxLength={3000}
                  />
                </label>
              </>
            )}
            {modal.kind === "project" && (
              <>
                <Field
                  name="name"
                  label="프로젝트명"
                  value={getDefault("name")}
                  required
                />
                <label>
                  고객 · 요청 부서
                  <select
                    name="client_id"
                    defaultValue={getDefault("client_id")}
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="owner_name"
                  label="담당자 표시 이름"
                  value={getDefault("owner_name")}
                />
                <Field
                  name="amount"
                  label="계약금액 (원, 입력값)"
                  type="number"
                  value={getDefault("amount") || 0}
                />
                <div className="form-pair">
                  <Field
                    name="starts_on"
                    label="시작일"
                    type="date"
                    value={
                      getDefault("starts_on") ||
                      new Date().toISOString().slice(0, 10)
                    }
                    required
                  />
                  <Field
                    name="due_on"
                    label="종료 예정일"
                    type="date"
                    value={
                      getDefault("due_on") ||
                      new Date().toISOString().slice(0, 10)
                    }
                    required
                  />
                </div>
                <label>
                  상태
                  <select
                    name="stage"
                    defaultValue={getDefault("stage") || "상담"}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>
                        {(stageLabels as Record<string, string>)[s] || s}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="website_url"
                  label="참고 웹사이트 (https, 자동 캡처 안 함)"
                  type="url"
                  value={getDefault("website_url")}
                />
              </>
            )}
            {modal.kind === "task" && (
              <>
                <label>
                  프로젝트
                  <select name="project_id" defaultValue={project?.id} required>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field name="title" label="작업 제목" required />
                <Field name="owner_name" label="담당자 표시 이름" />
                <Field name="due_on" label="마감일" type="date" required />
                <label>
                  우선순위
                  <select name="priority">
                    {["낮음", "보통", "높음", "긴급"].map((s) => (
                      <option key={s} value={s}>
                        {(stageLabels as Record<string, string>)[s] || s}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {modal.kind === "invite" && (
              <>
                <Field
                  name="email"
                  label="가입·이메일 확인을 마친 계정"
                  type="email"
                  required
                />
                <Field name="name" label="표시 이름" required />
                <label>
                  역할
                  <select name="role">
                    <option value="member">내부 팀원</option>
                    <option value="client">고객 검토자</option>
                  </select>
                </label>
                <label>
                  고객에게 공개할 프로젝트
                  <select name="project_id">
                    <option value="">팀원은 선택 안 함</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted">
                  초대 메일은 보내지 않습니다. 권한 추가 후 로그인 링크를 직접
                  안내하세요.
                </p>
              </>
            )}
            <button className="button primary" disabled={busy}>
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
