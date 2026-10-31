import test from "node:test";
import assert from "node:assert/strict";
import { projectSummary, stageLabels } from "../agencyflow/lib/pms.ts";
import type { Project, Task } from "../agencyflow/lib/domain.ts";
const p = {
  id: "p",
  org_id: "org",
  stage: "개발",
  due_on: "2026-11-03",
} as Project;
const task = (id: string, status: string, extra = {}) =>
  ({
    id,
    org_id: "org",
    project_id: "p",
    status,
    due_on: "2026-10-30",
    ...extra,
  }) as Task;
test("PMS progress counts only this company/project; empty progress is unknown", () => {
  assert.equal(projectSummary(p, [], "2026-10-31").percent, null);
  const result = projectSummary(
    p,
    [
      task("a", "완료"),
      task("b", "진행중"),
      task("foreign", "완료", { org_id: "another" }),
      task("other", "완료", { project_id: "other" }),
    ],
    "2026-10-31",
  );
  assert.deepEqual(result, {
    total: 2,
    done: 1,
    percent: 50,
    overdueTasks: 1,
    overdue: false,
  });
});
test("PMS due date is exclusive and completed/operating projects are not late", () => {
  assert.equal(projectSummary(p, [], "2026-11-03").overdue, false);
  assert.equal(projectSummary(p, [], "2026-11-04").overdue, true);
  assert.equal(
    projectSummary({ ...p, stage: "완료" }, [], "2026-11-04").overdue,
    false,
  );
  assert.equal(
    projectSummary({ ...p, stage: "유지보수" }, [], "2026-11-04").overdue,
    false,
  );
  assert.equal(stageLabels.개발, "실행");
});
