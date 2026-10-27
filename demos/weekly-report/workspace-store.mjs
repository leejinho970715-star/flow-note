import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ingest, report, validDate, shiftDate, parseCSV } from './core.js';

/** @type {(status: number, message: string) => never} */
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const hash = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const id = () => randomUUID();
const text = (value, label, max = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `${label}을(를) 확인하세요.`);
  return value.trim();
};
const passwordHash = password => {
  if (typeof password !== 'string' || password.length < 10 || password.length > 256) fail(400, '비밀번호는 10~256자여야 합니다.');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const safeUser = row => ({ id: row.id, companyId: row.company_id, name: row.name, email: row.email, role: row.role });

/** Local SQLite persistence. User authority is reloaded for every operation. CSV text is never stored. */
export class WorkspaceStore {
  constructor(path = resolve('data/flownote.sqlite')) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS companies(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL,is_demo INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','editor','reviewer')));
      CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),name TEXT NOT NULL,csv_id TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(company_id,csv_id));
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),client_id TEXT NOT NULL REFERENCES clients(id),name TEXT NOT NULL,campaigns TEXT NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL,owner_name TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),project_id TEXT NOT NULL REFERENCES projects(id),start TEXT NOT NULL,end TEXT NOT NULL,version INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','DELIVERED')),created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,approved_by TEXT REFERENCES users(id),approved_at TEXT,delivered_at TEXT,source_hash TEXT NOT NULL,filename TEXT NOT NULL,note TEXT NOT NULL,snapshot TEXT NOT NULL,issues TEXT NOT NULL,source_rows INTEGER NOT NULL,valid_rows INTEGER NOT NULL,UNIQUE(project_id,start,version),UNIQUE(project_id,start,source_hash));
      CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),user_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,target_id TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS reports_company ON reports(company_id,created_at);
      CREATE INDEX IF NOT EXISTS audit_company ON audit(company_id,created_at);
    `);
    if (!this.db.prepare('PRAGMA table_info(companies)').all().some(c => c.name === 'is_demo')) this.db.exec('ALTER TABLE companies ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0');
  }
  close() { this.db.close(); }
  tx(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  audit(user, action, targetId, note = '') {
    this.db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?)').run(id(), user.companyId, user.id, action, targetId, note, now());
  }
  authority(user, roles) {
    const row = user && this.db.prepare('SELECT * FROM users WHERE id=? AND company_id=?').get(user.id, user.companyId);
    if (!row) fail(401, '로그인이 필요합니다.');
    const actual = safeUser(row);
    if (roles && !roles.includes(actual.role)) fail(403, '이 작업을 수행할 권한이 없습니다.');
    return actual;
  }
  session(user) {
    const token = randomBytes(32).toString('hex'), csrf = hash(`csrf:${token}`);
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token), user.id, hash(csrf), Date.now() + 12 * 60 * 60 * 1000);
    return { token, csrf, user };
  }
  register({ company, name, email, password, isDemo = false }) {
    company = text(company, '회사명'); name = text(name, '이름'); email = this.email(email);
    const encoded = passwordHash(password);
    return this.tx(() => {
      if (this.db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail(409, '이미 등록된 이메일입니다.');
      const user = { id: id(), companyId: id(), name, email, role: 'owner' };
      this.db.prepare('INSERT INTO companies(id,name,created_at,is_demo) VALUES(?,?,?,?)').run(user.companyId, company, now(), isDemo === true ? 1 : 0);
      this.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id, user.companyId, name, email, encoded, user.role);
      this.audit(user, 'REGISTER', user.companyId);
      return this.session(user);
    });
  }
  email(value) {
    const result = text(value, '이메일', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, '이메일 형식을 확인하세요.');
    return result;
  }
  login({ email, password }) {
    email = this.email(email);
    if (typeof password !== 'string' || password.length > 256) fail(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
    const row = this.db.prepare('SELECT * FROM users WHERE email=?').get(email);
    // A fixed dummy hash keeps nonexistent accounts on the same expensive KDF path.
    const [salt, encoded] = (row?.password_hash ?? `${'00'.repeat(16)}:${'00'.repeat(64)}`).split(':');
    const candidate = scryptSync(password, salt, 64);
    if (!row || !timingSafeEqual(candidate, Buffer.from(encoded, 'hex'))) fail(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
    return this.tx(() => { const user = safeUser(row); this.audit(user, 'LOGIN', user.id); return this.session(user); });
  }
  authenticate(token) {
    if (typeof token !== 'string' || token.length > 256) fail(401, '로그인이 필요합니다.');
    const row = this.db.prepare('SELECT u.*,s.csrf_hash,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').get(hash(token));
    if (!row || row.expires_at <= Date.now()) fail(401, '세션이 만료되었습니다. 다시 로그인하세요.');
    const csrf = hash(`csrf:${token}`);
    if (hash(csrf) !== row.csrf_hash) fail(401, '세션 검증에 실패했습니다. 다시 로그인하세요.');
    return { user: safeUser(row), csrf };
  }
  verifyCSRF(token, csrf) {
    const session = this.authenticate(token);
    if (typeof csrf !== 'string' || csrf.length > 256 || hash(csrf) !== hash(session.csrf)) fail(403, '요청 검증에 실패했습니다.');
    return session.user;
  }
  logout(token) { if (typeof token === 'string') this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token)); }
  client(user, clientId) {
    const row = this.db.prepare('SELECT * FROM clients WHERE id=? AND company_id=?').get(clientId, user.companyId);
    if (!row) fail(404, '고객사를 찾을 수 없습니다.');
    return { id: row.id, companyId: row.company_id, name: row.name, csvId: row.csv_id, createdAt: row.created_at };
  }
  project(user, projectId) {
    const row = this.db.prepare('SELECT * FROM projects WHERE id=? AND company_id=?').get(projectId, user.companyId);
    if (!row) fail(404, '프로젝트를 찾을 수 없습니다.');
    return { id: row.id, companyId: row.company_id, clientId: row.client_id, name: row.name, campaigns: JSON.parse(row.campaigns), start: row.start, end: row.end, ownerName: row.owner_name, createdAt: row.created_at };
  }
  createUser(user, { name, email, password, role }) {
    user = this.authority(user, ['owner']); name = text(name, '이름'); email = this.email(email);
    if (!['editor', 'reviewer'].includes(role)) fail(400, '편집자 또는 검토자 역할만 생성할 수 있습니다.');
    const encoded = passwordHash(password);
    return this.tx(() => {
      if (this.db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail(409, '이미 등록된 이메일입니다.');
      const result = { id: id(), companyId: user.companyId, name, email, role };
      this.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(result.id, result.companyId, name, email, encoded, role);
      this.audit(user, 'CREATE_USER', result.id);
      return result;
    });
  }
  createClient(user, { name, csvId }) {
    user = this.authority(user, ['owner','editor']); name = text(name, '고객사명'); csvId = text(csvId, 'CSV 고객 ID', 40);
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(csvId)) fail(400, 'CSV 고객 ID 형식을 확인하세요.');
    return this.tx(() => {
      if (this.db.prepare('SELECT COUNT(*) AS count FROM clients WHERE company_id=?').get(user.companyId).count >= 3) fail(400, '고객사는 최대 3곳까지 등록할 수 있습니다.');
      if (this.db.prepare('SELECT id FROM clients WHERE company_id=? AND csv_id=?').get(user.companyId, csvId)) fail(409, '동일 CSV 고객 ID가 있습니다.');
      const result = { id: id(), companyId: user.companyId, name, csvId, createdAt: now() };
      this.db.prepare('INSERT INTO clients VALUES(?,?,?,?,?)').run(result.id, result.companyId, name, csvId, result.createdAt);
      this.audit(user, 'CREATE_CLIENT', result.id);
      return result;
    });
  }
  createProject(user, { clientId, name, campaigns, start, end, ownerName = '' }) {
    user = this.authority(user, ['owner','editor']); name = text(name, '프로젝트명');
    this.client(user, clientId);
    if (!validDate(start) || !validDate(end) || start > end) fail(400, '프로젝트 기간을 확인하세요.');
    if (!Array.isArray(campaigns) || campaigns.length < 1 || campaigns.length > 50 || campaigns.some(c => typeof c !== 'string' || !c.trim() || c.length > 200)) fail(400, '캠페인 이름 1~50개를 입력하세요.');
    // Campaign mapping is exact, including case. Do not silently normalize supplied names.
    campaigns = [...new Set(campaigns)];
    if (typeof ownerName !== 'string' || ownerName.length > 200) fail(400, '담당자명을 확인하세요.');
    return this.tx(() => {
      const overlapping = this.db.prepare('SELECT campaigns FROM projects WHERE company_id=? AND client_id=? AND start<=? AND end>=?').all(user.companyId, clientId, end, start);
      if (overlapping.some(p => JSON.parse(p.campaigns).some(c => campaigns.includes(c)))) fail(409, '동일 고객·캠페인의 프로젝트 기간이 겹칩니다.');
      const result = { id: id(), companyId: user.companyId, clientId, name, campaigns, start, end, ownerName: ownerName.trim(), createdAt: now() };
      this.db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?,?,?,?)').run(result.id, result.companyId, clientId, name, JSON.stringify(campaigns), start, end, result.ownerName, result.createdAt);
      this.audit(user, 'CREATE_PROJECT', result.id);
      return result;
    });
  }
  preview(user, { projectId, start, csv }) {
    user = this.authority(user, ['owner','editor']);
    const project = this.project(user, projectId), client = this.client(user, project.clientId);
    if (!validDate(start)) fail(400, '보고 시작일을 확인하세요.');
    const end = shiftDate(start, 6), previousStart = shiftDate(start, -7);
    if (start < project.start || end > project.end) fail(400, '보고 기간 7일이 프로젝트 기간 안에 있어야 합니다.');
    if (typeof csv !== 'string') fail(400, 'CSV 파일이 필요합니다.');
    try {
      const dataset = ingest(csv);
      const siblingProjects = this.db.prepare('SELECT campaigns,start,end FROM projects WHERE company_id=? AND client_id=? AND id<>?').all(user.companyId, client.id, project.id).map(p => ({ ...p, campaigns: JSON.parse(p.campaigns) }));
      const belongsElsewhere = r => siblingProjects.some(p => validDate(r.date) && r.date >= p.start && r.date <= p.end && p.campaigns.includes(r.campaign));
      // Even an invalid numerical row must not hide an unconfigured active campaign.
      const raw = parseCSV(csv), header = raw[0].values.map(v => v.trim());
      for (const row of raw.slice(1)) {
        if (row.values.length !== header.length) continue;
        const r = Object.fromEntries(header.map((k, i) => [k, row.values[i].trim()]));
        if (r.client_id === client.csvId && r.date >= previousStart && r.date <= end && !project.campaigns.includes(r.campaign) && !belongsElsewhere(r)) fail(400, `매핑하지 않은 캠페인입니다: ${r.campaign}. 캠페인 매핑과 CSV 범위를 확인하세요.`);
      }
      const issues = [...dataset.issues];
      const selected = dataset.records.filter(r => {
        let code, message;
        if (r.client_id !== client.csvId) { code = 'OTHER_CLIENT'; message = '다른 고객사 행을 이 보고서에서 제외했습니다.'; }
        else if (!project.campaigns.includes(r.campaign) && belongsElsewhere(r)) { code = 'OTHER_PROJECT'; message = '같은 고객사의 다른 등록 프로젝트에 귀속된 행을 제외했습니다.'; }
        else if (!project.campaigns.includes(r.campaign)) { code = 'OUTSIDE_MAPPING'; message = '보고 비교 기간 밖의 매핑되지 않은 캠페인 행을 제외했습니다.'; }
        else if (r.date < previousStart || r.date > end || r.date < project.start || r.date > project.end) { code = 'OUTSIDE_PERIOD'; message = '프로젝트 또는 현재·전주 비교 기간 밖의 행을 제외했습니다.'; }
        if (code) { issues.push({ line: r.line, code, message }); return false; }
        return true;
      });
      if (!selected.some(r => r.date >= start && r.date <= end)) fail(400, '선택한 프로젝트의 이번 주 정상 행이 없습니다.');
      const scoped = { records: selected, clients: [{ id: client.csvId, name: client.name }], issues, sourceRows: dataset.sourceRows };
      const snapshot = report(scoped, start, client.csvId);
      // Preserve attribution at creation time: approved exports never depend on mutable project labels.
      Object.assign(snapshot, {
        schemaVersion: 1,
        projectId: project.id,
        projectName: project.name,
        currency: 'KRW',
        mapping: { version: 1, clientId: client.id, csvId: client.csvId, campaigns: [...project.campaigns], projectStart: project.start, projectEnd: project.end },
      });
      return { snapshot, issues, sourceHash: hash(csv), sourceRows: dataset.sourceRows, validRows: selected.length, project };
    } catch (error) { if (error.status) throw error; fail(400, error.message); }
  }
  createReport(user, input) {
    user = this.authority(user, ['owner','editor']);
    if (input.mappingConfirmed !== true) fail(400, '고객·프로젝트·캠페인 매핑 확인이 필요합니다.');
    const prepared = this.preview(user, input);
    if (prepared.issues.length && input.exclusionsAccepted !== true) fail(400, '제외 행을 검토하고 동의해야 합니다.');
    const note = typeof input.note === 'string' ? input.note.trim() : '';
    if (note.length > 2000) fail(400, '메모는 2,000자 이하여야 합니다.');
    const filename = text(input.filename ?? 'upload.csv', '파일명', 200).replace(/[\\/]/g, '_');
    return this.tx(() => {
      if (this.db.prepare('SELECT id FROM reports WHERE project_id=? AND start=? AND source_hash=?').get(input.projectId, input.start, prepared.sourceHash)) fail(409, '동일 파일로 만든 보고서가 이미 있습니다.');
      const latest = this.db.prepare('SELECT MAX(version) AS version FROM reports WHERE project_id=? AND start=?').get(input.projectId, input.start);
      const reportId = id(), version = (latest.version ?? 0) + 1;
      this.db.prepare(`INSERT INTO reports(id,company_id,project_id,start,end,version,status,created_by,created_at,source_hash,filename,note,snapshot,issues,source_rows,valid_rows) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(reportId, user.companyId, input.projectId, input.start, prepared.snapshot.end, version, 'DRAFT', user.id, now(), prepared.sourceHash, filename, note, JSON.stringify(prepared.snapshot), JSON.stringify(prepared.issues), prepared.sourceRows, prepared.validRows);
      this.audit(user, 'CREATE_REPORT', reportId, `version=${version};excluded=${prepared.issues.length}`);
      return this.getReport(user, reportId);
    });
  }
  reportRecord(row, full = true) {
    const snapshot = JSON.parse(row.snapshot);
    const result = { id: row.id, companyId: row.company_id, projectId: row.project_id, start: row.start, end: row.end, version: row.version, status: row.status, createdBy: row.created_by, createdAt: row.created_at, approvedBy: row.approved_by, approvedAt: row.approved_at, deliveredAt: row.delivered_at, sourceHash: row.source_hash, filename: row.filename, note: row.note, sourceRows: row.source_rows, validRows: row.valid_rows };
    return full ? { ...result, snapshot, issues: JSON.parse(row.issues) } : { ...result, totals: snapshot.current, excludedRows: snapshot.excludedRows };
  }
  getReport(user, reportId) {
    user = this.authority(user);
    const row = this.db.prepare('SELECT * FROM reports WHERE id=? AND company_id=?').get(reportId, user.companyId);
    if (!row) fail(404, '보고서를 찾을 수 없습니다.');
    return { ...this.reportRecord(row), snapshot: JSON.parse(row.snapshot), issues: JSON.parse(row.issues) };
  }
  transition(user, { id: reportId, action, note = '' }) {
    user = this.authority(user);
    if (typeof note !== 'string' || note.length > 2000) fail(400, '검토 메모를 확인하세요.');
    if (!['submit','approve','request_changes','mark_delivered'].includes(action)) fail(400, '지원하지 않는 상태 변경입니다.');
    return this.tx(() => {
      const r = this.getReport(user, reportId);
      const latest = this.db.prepare('SELECT MAX(version) AS version FROM reports WHERE project_id=? AND start=?').get(r.projectId, r.start).version;
      if (r.version !== latest) fail(409, '최신 버전에서만 상태를 변경할 수 있습니다.');
      if (action === 'submit') {
        if (!['owner','editor'].includes(user.role) || (user.role !== 'owner' && r.createdBy !== user.id)) fail(403, '작성자 또는 회사 관리자만 검토를 요청할 수 있습니다.');
        if (!['DRAFT','CHANGES_REQUESTED'].includes(r.status)) fail(409, '초안 또는 수정 요청 상태에서만 제출할 수 있습니다.');
        this.db.prepare("UPDATE reports SET status='IN_REVIEW' WHERE id=?").run(reportId);
      } else if (action === 'approve' || action === 'request_changes') {
        if (!['owner','reviewer'].includes(user.role)) fail(403, '검토 권한이 필요합니다.');
        if (r.createdBy === user.id) fail(403, '본인이 작성한 보고서를 직접 검토 승인할 수 없습니다.');
        if (r.status !== 'IN_REVIEW') fail(409, '검토 대기 상태에서만 검토할 수 있습니다.');
        if (action === 'request_changes' && !note.trim()) fail(400, '수정 요청 사유가 필요합니다.');
        if (action === 'approve') this.db.prepare("UPDATE reports SET status='APPROVED',approved_by=?,approved_at=? WHERE id=?").run(user.id, now(), reportId);
        else this.db.prepare("UPDATE reports SET status='CHANGES_REQUESTED' WHERE id=?").run(reportId);
      } else {
        if (!['owner','editor'].includes(user.role) || (user.role !== 'owner' && r.createdBy !== user.id)) fail(403, '작성자 또는 회사 관리자만 전달을 기록할 수 있습니다.');
        if (r.status !== 'APPROVED') fail(409, '승인된 보고서만 전달 완료로 기록할 수 있습니다.');
        if (!note.trim()) fail(400, '실제 전달 경로 또는 기록 메모가 필요합니다.');
        this.db.prepare("UPDATE reports SET status='DELIVERED',delivered_at=? WHERE id=?").run(now(), reportId);
      }
      this.audit(user, action.toUpperCase(), reportId, note.trim());
      return this.getReport(user, reportId);
    });
  }
  state(user) {
    user = this.authority(user);
    const companyRow = this.db.prepare('SELECT id,name,created_at AS createdAt,is_demo AS isDemo FROM companies WHERE id=?').get(user.companyId);
    const company = { ...companyRow, isDemo: Boolean(companyRow.isDemo) };
    const users = this.db.prepare('SELECT * FROM users WHERE company_id=? ORDER BY rowid').all(user.companyId).map(safeUser);
    const clients = this.db.prepare('SELECT id FROM clients WHERE company_id=? ORDER BY rowid').all(user.companyId).map(r => this.client(user, r.id));
    const projects = this.db.prepare('SELECT id FROM projects WHERE company_id=? ORDER BY rowid').all(user.companyId).map(r => this.project(user, r.id));
    const reports = this.db.prepare('SELECT * FROM reports WHERE company_id=? ORDER BY created_at DESC,rowid DESC').all(user.companyId).map(r => this.reportRecord(r, false));
    const audit = this.db.prepare('SELECT id,user_id AS userId,action,target_id AS targetId,note,created_at AS createdAt FROM audit WHERE company_id=? ORDER BY rowid DESC LIMIT 300').all(user.companyId);
    return { company, users, clients, projects, reports, audit };
  }
}
