import { test } from "node:test";
import assert from "node:assert/strict";
import {
  studioSample,
  studioDemoCommand,
} from "../agencyflow/lib/studio-domain.ts";
test("CRM forbids archiving customer with open deal, preserves sample source", () => {
  const s = studioSample();
  assert.throws(() =>
    studioDemoCommand(s, "archive_contact", { id: "ct-1" }, "demo-kim"),
  );
  const n = studioDemoCommand(
    s,
    "deal_stage",
    { id: "deal-1", stage: "수주" },
    "demo-kim",
  );
  assert.equal(s.deals[0].stage, "제안");
  assert.equal(
    studioDemoCommand(n, "archive_contact", { id: "ct-1" }, "demo-kim")
      .contacts[0].archived,
    true,
  );
});
test("groupware assigned reviewer decides once, author cannot approve own request", () => {
  const s = studioSample();
  assert.throws(() =>
    studioDemoCommand(
      s,
      "decide_approval",
      { id: "ap-1", status: "승인" },
      "demo-kim",
    ),
  );
  const n = studioDemoCommand(
    s,
    "decide_approval",
    { id: "ap-1", status: "승인", decision_note: "확인" },
    "demo-lee",
  );
  assert.equal(n.approvals[0].status, "승인");
  assert.throws(() =>
    studioDemoCommand(
      n,
      "decide_approval",
      { id: "ap-1", status: "반려" },
      "demo-lee",
    ),
  );
});
