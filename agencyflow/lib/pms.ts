import type { Project, Task, Stage } from "./domain";

// Persisted codes remain compatible with existing company records and RPCs.
export const stageLabels: Record<Stage, string> = {
  상담: "접수",
  견적: "계획",
  계약: "승인",
  디자인: "준비",
  개발: "실행",
  검수: "검토",
  완료: "완료",
  유지보수: "운영",
};
export function projectSummary(project: Project, tasks: Task[], today: string) {
  const scoped = tasks.filter(
    (t) => t.org_id === project.org_id && t.project_id === project.id,
  );
  const done = scoped.filter((t) => t.status === "완료").length;
  const overdueTasks = scoped.filter(
    (t) => t.status !== "완료" && t.due_on && t.due_on < today,
  ).length;
  const finished = project.stage === "완료" || project.stage === "유지보수";
  return {
    total: scoped.length,
    done,
    overdueTasks,
    percent: scoped.length ? Math.round((done / scoped.length) * 100) : null,
    overdue: !finished && !!project.due_on && project.due_on < today,
  };
}
