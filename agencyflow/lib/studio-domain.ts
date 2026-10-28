export type ProductKind = "follonote" | "crewmemo";
export const productInfo = {
  follonote: {
    name: "Follonote",
    ko: "팔로노트",
    color: "#137d71",
    tag: "SALES CRM",
    title: "다음 연락까지, 놓치지 않는 영업.",
    description: "고객 정보·영업기회·연락 일정·상담 기록을 연결하는 영업 CRM",
  },
  crewmemo: {
    name: "Crewmemo",
    ko: "크루메모",
    color: "#3864d9",
    tag: "TEAM GROUPWARE",
    title: "오늘의 팀 업무를, 한곳에.",
    description: "공지·팀 일정·결재·담당 업무를 모으는 작은 팀의 그룹웨어",
  },
};
export const dealStages = ["신규", "상담", "제안", "협상", "수주", "종료"];
export type StudioRow = {
  id: string;
  org_id: string;
  created_by: string;
  created_at: string;
  [key: string]: string | number | boolean;
};
export type StudioData = Record<
  | "contacts"
  | "deals"
  | "followups"
  | "contact_notes"
  | "notices"
  | "calendar"
  | "approvals"
  | "team_tasks",
  StudioRow[]
>;
export const studioEmpty: StudioData = {
  contacts: [],
  deals: [],
  followups: [],
  contact_notes: [],
  notices: [],
  calendar: [],
  approvals: [],
  team_tasks: [],
};
export const sampleMembers = [
  { user_id: "demo-kim", name: "김하린", role: "admin" },
  { user_id: "demo-lee", name: "이유진", role: "member" },
  { user_id: "demo-park", name: "박서연", role: "member" },
];
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function studioSample(): StudioData {
  const now = new Date(),
    today = localDay(now),
    tomorrow = localDay(new Date(+now + 86400000)),
    base = {
      org_id: "demo-studio",
      created_by: "demo-kim",
      created_at: now.toISOString(),
    };
  return {
    ...structuredClone(studioEmpty),
    contacts: [
      {
        ...base,
        id: "ct-1",
        name: "모노디자인",
        contact: "이민지",
        email: "contact@example.invalid",
        phone: "010-0000-0000",
        source: "홈페이지 문의",
        owner_name: "김하린",
        memo: "브랜드 웹사이트 상담 · 가상 고객",
        archived: false,
      },
      {
        ...base,
        id: "ct-2",
        name: "라움커머스",
        contact: "정지훈",
        email: "hello@example.invalid",
        phone: "",
        source: "소개",
        owner_name: "이유진",
        memo: "운영 시스템 도입 상담 · 가상 고객",
        archived: false,
      },
      {
        ...base,
        id: "ct-3",
        name: "소담스튜디오",
        contact: "윤서진",
        email: "team@example.invalid",
        phone: "",
        source: "행사",
        owner_name: "박서연",
        memo: "리뉴얼 제안 검토 · 가상 고객",
        archived: false,
      },
    ],
    deals: [
      {
        ...base,
        id: "deal-1",
        contact_id: "ct-1",
        title: "브랜드 웹사이트 리뉴얼",
        amount: 8000000,
        stage: "제안",
        due_on: tomorrow,
        owner_name: "김하린",
        archived: false,
      },
      {
        ...base,
        id: "deal-2",
        contact_id: "ct-2",
        title: "고객 관리 프로세스 구축",
        amount: 4500000,
        stage: "협상",
        due_on: tomorrow,
        owner_name: "이유진",
        archived: false,
      },
      {
        ...base,
        id: "deal-3",
        contact_id: "ct-3",
        title: "포트폴리오 사이트 제작",
        amount: 3200000,
        stage: "상담",
        due_on: tomorrow,
        owner_name: "박서연",
        archived: false,
      },
    ],
    followups: [
      {
        ...base,
        id: "fu-1",
        contact_id: "ct-1",
        title: "제안서 검토 의견 확인",
        due_on: today,
        status: "예정",
      },
      {
        ...base,
        id: "fu-2",
        contact_id: "ct-2",
        title: "다음 미팅 일정 잡기",
        due_on: today,
        status: "예정",
      },
    ],
    contact_notes: [
      {
        ...base,
        id: "note-1",
        contact_id: "ct-1",
        body: "고객은 모바일 사용 경험을 중요하게 보고 있습니다. 제안 범위와 일정부터 확인하기로 했습니다.",
      },
    ],
    notices: [
      {
        ...base,
        id: "notice-1",
        title: "이번 주 팀 운영 안내",
        body: "목요일 오후 3시에 주간 프로젝트 리뷰가 있습니다. 검토할 자료와 진행 중인 이슈를 미리 정리해 주세요.",
        pinned: true,
        archived: false,
      },
      {
        ...base,
        id: "notice-2",
        title: "새 프로젝트 자료는 공용 공간에",
        body: "승인된 결과물과 변경 이력은 프로젝트별로 정리해 주세요.",
        pinned: false,
        archived: false,
      },
    ],
    calendar: [
      {
        ...base,
        id: "ev-1",
        title: "주간 프로젝트 리뷰",
        starts_at: today + "T15:00:00+09:00",
        ends_at: today + "T16:00:00+09:00",
        location: "회의실 A",
      },
      {
        ...base,
        id: "ev-2",
        title: "디자인 방향 공유",
        starts_at: tomorrow + "T11:00:00+09:00",
        ends_at: tomorrow + "T12:00:00+09:00",
        location: "온라인",
      },
    ],
    approvals: [
      {
        ...base,
        id: "ap-1",
        title: "프로젝트 도구 도입 검토",
        body: "팀의 반복 업무를 줄이기 위한 도구 검증을 요청합니다. 비용과 제공 범위는 별도 확인 예정입니다.",
        approver_id: "demo-lee",
        status: "대기",
        decision_note: "",
      },
    ],
    team_tasks: [
      {
        ...base,
        id: "tk-1",
        title: "고객 피드백 정리",
        assignee_id: "demo-kim",
        due_on: today,
        status: "진행중",
        priority: "높음",
      },
      {
        ...base,
        id: "tk-2",
        title: "다음 주 일정 공유",
        assignee_id: "demo-park",
        due_on: tomorrow,
        status: "대기",
        priority: "보통",
      },
    ],
  };
}
export function studioDemoCommand(
  source: StudioData,
  action: string,
  p: any,
  actor: string,
): StudioData {
  const s = structuredClone(source),
    base = {
      id: crypto.randomUUID(),
      org_id: "demo-studio",
      created_by: actor,
      created_at: new Date().toISOString(),
    };
  const add = (key: keyof StudioData, row: any) =>
    s[key].push({ ...base, ...row });
  const change = (key: keyof StudioData, id: string, values: any) => {
    const row = s[key].find((r) => r.id === id);
    if (!row) throw Error("대상이 없습니다.");
    Object.assign(row, values);
  };
  if (action === "save_contact") {
    if (!p.name?.trim()) throw Error("회사명을 입력하세요.");
    p.id
      ? change("contacts", p.id, p)
      : add("contacts", { ...p, archived: false });
  } else if (action === "archive_contact") {
    if (
      s.deals.some(
        (d) =>
          d.contact_id === p.id &&
          !d.archived &&
          !["수주", "종료"].includes(String(d.stage)),
      )
    )
      throw Error("진행 중 영업기회를 먼저 정리하세요.");
    change("contacts", p.id, { archived: true });
  } else if (action === "save_deal") {
    if (
      !s.contacts.some((c) => c.id === p.contact_id && !c.archived) ||
      !Number.isSafeInteger(+p.amount) ||
      +p.amount < 0 ||
      +p.amount > 10000000000 ||
      !dealStages.includes(p.stage)
    )
      throw Error("고객·금액을 확인하세요.");
    p.id ? change("deals", p.id, p) : add("deals", { ...p, archived: false });
  } else if (action === "deal_stage") {
    if (!dealStages.includes(p.stage)) throw Error("단계를 확인하세요.");
    change("deals", p.id, { stage: p.stage });
  } else if (action === "archive_deal")
    change("deals", p.id, { archived: true });
  else if (action === "followup") add("followups", { ...p, status: "예정" });
  else if (action === "followup_done")
    change("followups", p.id, { status: "완료" });
  else if (action === "contact_note") {
    if (!p.body?.trim()) throw Error("상담 내용을 입력하세요.");
    add("contact_notes", p);
  } else if (action === "notice") add("notices", { ...p, archived: false });
  else if (action === "archive_notice")
    change("notices", p.id, { archived: true });
  else if (action === "calendar") {
    if (new Date(p.ends_at) <= new Date(p.starts_at))
      throw Error("종료 시각은 시작 이후여야 합니다.");
    add("calendar", p);
  } else if (action === "approval") {
    if (p.approver_id === actor)
      throw Error("다른 팀원을 결재자로 선택하세요.");
    add("approvals", { ...p, status: "대기", decision_note: "" });
  } else if (action === "decide_approval") {
    const a = s.approvals.find((a) => a.id === p.id);
    if (
      !a ||
      a.status !== "대기" ||
      a.approver_id !== actor ||
      a.created_by === actor ||
      !["승인", "반려"].includes(p.status)
    )
      throw Error("지정된 다른 결재자만 처리할 수 있습니다.");
    change("approvals", p.id, {
      status: p.status,
      decision_note: p.decision_note || "",
      decided_at: new Date().toISOString(),
    });
  } else if (action === "cancel_approval") {
    const a = s.approvals.find((a) => a.id === p.id);
    if (!a || a.created_by !== actor || a.status !== "대기")
      throw Error("작성자만 대기 문서를 취소할 수 있습니다.");
    change("approvals", p.id, { status: "취소" });
  } else if (action === "team_task")
    add("team_tasks", { ...p, status: "대기" });
  else if (action === "team_task_status")
    change("team_tasks", p.id, { status: p.status });
  else throw Error("지원하지 않는 작업입니다.");
  return s;
}
