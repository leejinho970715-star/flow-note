import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceStore } from '../demos/weekly-report/workspace-store.mjs';

const header = 'date,client_id,client_name,campaign,currency,impressions,clicks,spend,leads';
const csv = (clicks = 10) => `${header}\n2026-10-19,C1,고객A,검색,KRW,100,${clicks},1000,2`;
const status = (code: number) => (error: unknown) => (error as { status?: number }).status === code;
const make = (path = ':memory:') => {
  const store = new WorkspaceStore(path);
  const owner = store.register({ company: '내회사', name: '대표', email: 'owner@example.com', password: 'correct-password-10' });
  const editor = store.createUser(owner.user, { name: '작성자', email: 'editor@example.com', password: 'editor-password-10', role: 'editor' });
  const reviewer = store.createUser(owner.user, { name: '검토자', email: 'reviewer@example.com', password: 'review-password-10', role: 'reviewer' });
  const client = store.createClient(owner.user, { name: '고객A', csvId: 'C1' });
  const project = store.createProject(owner.user, { clientId: client.id, name: '주간', campaigns: ['검색'], start: '2026-10-01', end: '2026-11-30' });
  return { store, owner, editor, reviewer, client, project };
};

test('passwords and session secrets are hashed; session authentication, CSRF and logout are enforced', () => {
  const { store, owner } = make();
  try {
    const stored = store.db.prepare('SELECT * FROM users WHERE id=?').get(owner.user.id);
    assert.ok(stored);
    assert.notEqual(stored.password_hash, 'correct-password-10');
    const secret = store.db.prepare('SELECT * FROM sessions').get();
    assert.ok(secret);
    assert.notEqual(secret.token_hash, owner.token); assert.notEqual(secret.csrf_hash, owner.csrf);
    assert.deepEqual(store.authenticate(owner.token).user, owner.user);
    assert.deepEqual(store.verifyCSRF(owner.token, owner.csrf), owner.user);
    assert.throws(() => store.verifyCSRF(owner.token, 'wrong'), status(403));
    assert.throws(() => store.login({ email: owner.user.email, password: 'wrong' }), status(401));
    assert.throws(() => store.register({ company: 'x', name: 'x', email: 'x@example.com', password: 'short' }), status(400));
    assert.equal(store.login({ email: owner.user.email.toUpperCase(), password: 'correct-password-10' }).user.id, owner.user.id);
    const serialized = JSON.stringify(store.state(owner.user));
    assert.doesNotMatch(serialized, /password_hash|csrf_hash|token_hash|correct-password/);
    store.db.prepare('UPDATE sessions SET expires_at=0 WHERE token_hash=?').run(secret.token_hash);
    assert.throws(() => store.authenticate(owner.token), status(401));
    const renewed = store.login({ email: owner.user.email, password: 'correct-password-10' });
    store.logout(renewed.token); assert.throws(() => store.authenticate(renewed.token), status(401));
  } finally { store.close(); }
});

test('company isolation applies to object access and list state; caller cannot forge role', () => {
  const { store, owner, editor, project, client } = make();
  try {
    const outsider = store.register({ company: '타회사', name: '외부인', email: 'outside@example.com', password: 'outside-password' }).user;
    assert.equal(store.state(outsider).clients.length, 0);
    assert.throws(() => store.preview(outsider, { projectId: project.id, start: '2026-10-19', csv: csv() }), status(404));
    assert.throws(() => store.createProject(outsider, { clientId: client.id, name: '공격', campaigns: ['검색'], start: '2026-10-01', end: '2026-12-01' }), status(404));
    const r = store.createReport(editor, { projectId: project.id, start: '2026-10-19', csv: csv(), mappingConfirmed: true });
    assert.throws(() => store.getReport(outsider, r.id), status(404));
    assert.throws(() => store.transition(outsider, { id: r.id, action: 'approve' }), status(404));
    assert.throws(() => store.createUser({ ...editor, role: 'owner' }, { name: '관리자', email: 'forged@example.com', password: 'forged-password', role: 'reviewer' }), status(403));
    assert.equal(store.state(owner.user).reports.length, 1);
  } finally { store.close(); }
});

test('approval requires independent reviewer and latest IN_REVIEW version; v2 never inherits v1 approval', () => {
  const { store, owner, editor, reviewer, project } = make();
  try {
    const input = { projectId: project.id, start: '2026-10-19', csv: csv(), mappingConfirmed: true };
    const first = store.createReport(editor, input);
    assert.equal(first.version, 1); assert.equal(first.status, 'DRAFT');
    assert.equal(first.snapshot.schemaVersion, 1);
    assert.equal(first.snapshot.projectId, project.id);
    assert.equal(first.snapshot.projectName, '주간');
    assert.equal(first.snapshot.currency, 'KRW');
    assert.deepEqual(first.snapshot.mapping.campaigns, ['검색']);
    assert.equal(first.snapshot.mapping.version, 1);
    store.db.prepare('UPDATE projects SET name=? WHERE id=?').run('변경된 이름', project.id);
    assert.equal(store.getReport(owner.user, first.id).snapshot.projectName, '주간');
    assert.throws(() => store.transition(reviewer, { id: first.id, action: 'approve' }), status(409));
    store.transition(editor, { id: first.id, action: 'submit' });
    assert.throws(() => store.transition({ ...editor, role: 'owner' }, { id: first.id, action: 'approve' }), status(403));
    assert.equal(store.transition(reviewer, { id: first.id, action: 'approve' }).status, 'APPROVED');
    assert.throws(() => store.createReport(editor, input), status(409));
    const second = store.createReport(editor, { ...input, csv: csv(12) });
    assert.equal(second.version, 2); assert.equal(second.status, 'DRAFT'); assert.equal(second.approvedBy, null);
    assert.equal(store.getReport(owner.user, first.id).status, 'APPROVED');
    assert.equal(store.getReport(owner.user, first.id).snapshot.current.clicks, 10);
    assert.equal(second.snapshot.current.clicks, 12);
    assert.throws(() => store.transition(owner.user, { id: first.id, action: 'mark_delivered', note: 'old' }), status(409));
    assert.throws(() => store.transition(owner.user, { id: second.id, action: 'mark_delivered', note: 'unapproved' }), status(409));
    store.transition(editor, { id: second.id, action: 'submit' });
    store.transition(reviewer, { id: second.id, action: 'request_changes', note: '합계 재확인' });
    store.transition(editor, { id: second.id, action: 'submit' });
    store.transition(owner.user, { id: second.id, action: 'approve' });
    assert.equal(store.transition(editor, { id: second.id, action: 'mark_delivered', note: '고객에게 직접 전달 기록' }).status, 'DELIVERED');
    const own = store.createReport(owner.user, { ...input, start: '2026-10-26', csv: csv().replace('2026-10-19', '2026-10-26') });
    store.transition(owner.user, { id: own.id, action: 'submit' });
    assert.throws(() => store.transition(owner.user, { id: own.id, action: 'approve' }), status(403));
    assert.ok(store.state(owner.user).audit.some(a => a.action === 'APPROVE'));
  } finally { store.close(); }
});

test('preview maps exact campaigns and client, reconciles exclusions and rejects unmapped numeric-invalid rows', () => {
  const { store, owner, project } = make();
  try {
    const mixed = `${csv()}\n2026-10-19,C2,다른고객,검색,KRW,999,99,9999,99\n2026-10-20,C1,고객A,검색,KRW,100,nope,1,1`;
    const p = store.preview(owner.user, { projectId: project.id, start: '2026-10-19', csv: mixed });
    assert.equal(p.snapshot.current.clicks, 10); assert.equal(p.sourceRows, 3); assert.equal(p.validRows, 1);
    assert.deepEqual(p.issues.map(i => i.code), ['NUMBER', 'OTHER_CLIENT']);
    assert.throws(() => store.createReport(owner.user, { projectId: project.id, start: '2026-10-19', csv: mixed, mappingConfirmed: true }), status(400));
    const r = store.createReport(owner.user, { projectId: project.id, start: '2026-10-19', csv: mixed, mappingConfirmed: true, exclusionsAccepted: true });
    assert.equal(r.snapshot.records.length, 1);
    assert.doesNotMatch(JSON.stringify(store.state(owner.user).reports), /다른고객|records|campaigns/);
    const unconfigured = csv() + '\n2026-10-20,C1,고객A,미등록,KRW,100,nope,1,1';
    assert.throws(() => store.preview(owner.user, { projectId: project.id, start: '2026-10-19', csv: unconfigured }), /매핑하지 않은/);
    assert.throws(() => store.preview(owner.user, { projectId: project.id, start: '2026-11-27', csv: csv() }), status(400));
  } finally { store.close(); }
});

test('client limit, overlapping project attribution and read-only reviewer are enforced', () => {
  const { store, owner, reviewer, client, project } = make();
  try {
    assert.throws(() => store.createProject(owner.user, { clientId: client.id, name: '겹침', campaigns: ['검색'], start: '2026-11-01', end: '2026-12-01' }), status(409));
    const other = store.createProject(owner.user, { clientId: client.id, name: '다른캠페인', campaigns: ['브랜드'], start: '2026-11-01', end: '2026-12-01' });
    assert.ok(other.id);
    assert.throws(() => store.createClient(reviewer, { name: 'x', csvId: 'R1' }), status(403));
    assert.throws(() => store.preview(reviewer, { projectId: project.id, start: '2026-10-19', csv: csv() }), status(403));
    store.createClient(owner.user, { name: 'B', csvId: 'B' }); store.createClient(owner.user, { name: 'C', csvId: 'C' });
    assert.throws(() => store.createClient(owner.user, { name: 'D', csvId: 'D' }), status(400));
  } finally { store.close(); }
});

test('combined CSV separates same-client sibling projects without trusting another company mapping', () => {
  const { store, owner, client, project } = make();
  try {
    store.createProject(owner.user, { clientId: client.id, name: '브랜드 프로젝트', campaigns: ['브랜드'], start: '2026-10-01', end: '2026-11-30' });
    const combined = csv() + '\n2026-10-19,C1,고객A,브랜드,KRW,200,20,2000,4';
    const preview = store.preview(owner.user, { projectId: project.id, start: '2026-10-19', csv: combined });
    assert.equal(preview.snapshot.current.clicks, 10);
    assert.deepEqual(preview.issues.map(i => i.code), ['OTHER_PROJECT']);
    assert.equal(preview.sourceRows, 2); assert.equal(preview.validRows, 1);
    const outsider = store.register({ company: '외부회사', name: '외부대표', email: 'external@example.com', password: 'outside-password' }).user;
    const externalClient = store.createClient(outsider, { name: '외부고객', csvId: 'C1' });
    store.createProject(outsider, { clientId: externalClient.id, name: '외부 프로젝트', campaigns: ['미등록'], start: '2026-10-01', end: '2026-11-30' });
    for (const click of ['10', 'not-a-number']) {
      const unknown = csv() + `\n2026-10-19,C1,고객A,미등록,KRW,100,${click},1000,1`;
      assert.throws(() => store.preview(owner.user, { projectId: project.id, start: '2026-10-19', csv: unknown }), /매핑하지 않은/);
    }
    const invalidSibling = csv() + '\n2026-10-19,C1,고객A,브랜드,KRW,200,bad,2000,4';
    assert.deepEqual(store.preview(owner.user, { projectId: project.id, start: '2026-10-19', csv: invalidSibling }).issues.map(i => i.code), ['NUMBER']);
    // Registration outside the row's date cannot authorize that row's campaign.
    const beforeSibling = store.createProject(owner.user, { clientId: client.id, name: '과거 프로젝트', campaigns: ['과거'], start: '2026-10-01', end: '2026-10-10' });
    assert.ok(beforeSibling.id);
    assert.throws(() => store.preview(owner.user, { projectId: project.id, start: '2026-10-19', csv: csv() + '\n2026-10-19,C1,고객A,과거,KRW,200,20,2000,4' }), /매핑하지 않은/);
  } finally { store.close(); }
});

test('database reopens with immutable report snapshots and valid sessions without storing raw CSV', () => {
  const directory = mkdtempSync(join(tmpdir(), 'flownote-store-')), path = join(directory, 'db.sqlite');
  const { store, owner, editor, project } = make(path);
  const raw = csv();
  const r = store.createReport(editor, { projectId: project.id, start: '2026-10-19', csv: raw, mappingConfirmed: true, filename: 'sample.csv' });
  store.close();
  const reopened = new WorkspaceStore(path);
  try {
    assert.equal(reopened.authenticate(owner.token).user.id, owner.user.id);
    assert.equal(reopened.getReport(owner.user, r.id).snapshot.current.spendCents, 100000);
    const database = readFileSync(path).toString('utf8');
    assert.ok(!database.includes(raw)); assert.ok(!database.includes('correct-password-10'));
  } finally { reopened.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('failed audit write rolls report transaction back with no partial record', () => {
  const { store, owner, project } = make();
  try {
    const before = store.state(owner.user).reports.length;
    store.db.exec("CREATE TRIGGER reject_report_audit BEFORE INSERT ON audit WHEN NEW.action='CREATE_REPORT' BEGIN SELECT RAISE(ABORT,'forced audit failure'); END;");
    assert.throws(() => store.createReport(owner.user, { projectId: project.id, start: '2026-10-19', csv: csv(), mappingConfirmed: true }), /forced audit failure/);
    assert.equal(store.state(owner.user).reports.length, before);
    store.db.exec('DROP TRIGGER reject_report_audit');
    assert.equal(store.createReport(owner.user, { projectId: project.id, start: '2026-10-19', csv: csv(), mappingConfirmed: true }).version, 1);
  } finally { store.close(); }
});
