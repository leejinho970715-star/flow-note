export const COLUMNS = ['date','client_id','client_name','campaign','currency','impressions','clicks','spend','leads'];
export const LIMITS = { bytes: 2 * 1024 * 1024, rows: 15000, clients: 3 };
export class InputError extends Error {}

// RFC4180-style fields; preserve physical line numbers even in quoted fields.
export function parseCSV(text) {
  if (new TextEncoder().encode(text).length > LIMITS.bytes) throw new InputError('파일은 2MB 이하여야 합니다.');
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let fields = [], field = '', quoted = false, closed = false, line = 1, start = 1;
  const pushField = () => { fields.push(field); field = ''; closed = false; };
  const pushRow = () => { pushField(); if (fields.some(v => v.trim() !== '')) rows.push({ line: start, values: fields }); fields = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else { field += c; if (c === '\n') line++; }
    } else if (c === '"') {
      if (field.length || closed) throw new InputError(`${line}행: 따옴표 형식이 잘못되었습니다.`);
      quoted = true;
    } else if (c === ',') pushField();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i+1] === '\n') i++;
      pushRow(); line++; start = line;
    } else {
      if (closed) throw new InputError(`${line}행: 닫힌 따옴표 뒤에 문자가 있습니다.`);
      field += c;
    }
  }
  if (quoted) throw new InputError('닫히지 않은 따옴표가 있습니다.');
  if (field.length || fields.length || closed) pushRow();
  if (!rows.length) throw new InputError('CSV가 비어 있습니다.');
  if (rows.length - 1 > LIMITS.rows) throw new InputError('데이터는 최대 15,000행까지 처리합니다.');
  return rows;
}

export function validDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) === s;
}
export function shiftDate(date, days) {
  if (!validDate(date)) throw new InputError('유효한 시작 날짜를 선택하세요.');
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0,10);
}
function numberValue(value, money = false) {
  const pattern = money ? /^\d+(\.\d{1,2})?$/ : /^\d+$/;
  if (!pattern.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const result = money ? Number(whole) * 100 + Number(fraction.padEnd(2,'0')) : Number(whole);
  return Number.isSafeInteger(result) && result <= 1e12 ? result : null;
}
export function ingest(text) {
  const parsed = parseCSV(text); const header = parsed[0].values.map(v => v.trim());
  if (header.length !== COLUMNS.length || new Set(header).size !== header.length || COLUMNS.some(c => !header.includes(c))) {
    throw new InputError(`열 이름을 확인하세요. 필요한 열: ${COLUMNS.join(', ')}`);
  }
  const records = [], issues = [], identities = new Map(), names = new Map();
  const issue = (line, code, message) => issues.push({ line, code, message });
  for (const row of parsed.slice(1)) {
    if (row.values.length !== header.length) { issue(row.line,'COLUMN_COUNT','열 개수가 맞지 않아 제외했습니다.'); continue; }
    const r = Object.fromEntries(header.map((key, i) => [key, row.values[i].trim()]));
    if (Object.values(r).some(v => !v || v.length > 200)) { issue(row.line,'REQUIRED','필수값이 없거나 필드가 200자를 초과했습니다.'); continue; }
    if (!validDate(r.date)) { issue(row.line,'DATE','실제 달력에 없는 날짜이거나 YYYY-MM-DD 형식이 아닙니다.'); continue; }
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(r.client_id)) { issue(row.line,'CLIENT_ID','고객 ID는 영문·숫자·밑줄·하이픈 40자 이내입니다.'); continue; }
    if (r.currency !== 'KRW') { issue(row.line,'CURRENCY','이번 템플릿은 KRW만 지원합니다. 환산하지 않고 제외했습니다.'); continue; }
    const metrics = { impressions: numberValue(r.impressions), clicks: numberValue(r.clicks), spendCents: numberValue(r.spend,true), leads: numberValue(r.leads) };
    if (Object.values(metrics).some(v => v === null)) { issue(row.line,'NUMBER','지표는 음수·쉼표 없는 숫자여야 합니다. 비용은 소수 둘째 자리까지 허용합니다.'); continue; }
    const record = { ...r, ...metrics, line: row.line };
    if (names.has(r.client_id) && names.get(r.client_id) !== r.client_name) { issue(row.line,'CLIENT_NAME','같은 고객 ID의 이름이 달라 제외했습니다.'); continue; }
    if (!names.has(r.client_id) && names.size >= LIMITS.clients) { issue(row.line,'CLIENT_LIMIT','최대 고객사 3곳을 초과해 제외했습니다.'); continue; }
    const key = JSON.stringify([r.client_id,r.date,r.campaign,r.currency]);
    if (identities.has(key)) {
      const old = identities.get(key);
      const same = ['impressions','clicks','spendCents','leads'].every(k => old[k] === record[k]);
      if (!same) throw new InputError(`${old.line}행과 ${row.line}행의 동일 고객·날짜·캠페인 수치가 충돌합니다. 원본을 수정한 뒤 다시 업로드하세요.`);
      issue(row.line,'DUPLICATE',`동일 데이터가 ${old.line}행에 있어 중복 행을 제외했습니다.`); continue;
    }
    names.set(r.client_id,r.client_name); identities.set(key,record); records.push(record);
  }
  if (!records.length) throw new InputError('집계 가능한 정상 행이 없습니다. 파일 형식과 데이터를 확인하세요.');
  return { records, issues, sourceRows: parsed.length - 1, clients: [...names].map(([id,name])=>({id,name})) };
}

export function aggregate(records) {
  const totals = { impressions: 0, clicks: 0, spendCents: 0, leads: 0, rows: records.length };
  for (const r of records) for (const k of ['impressions','clicks','spendCents','leads']) {
    totals[k] += r[k];
    if (!Number.isSafeInteger(totals[k])) throw new InputError('합계가 안전한 숫자 범위를 초과했습니다. 파일을 나누세요.');
  }
  return { ...totals, ctr: totals.impressions ? totals.clicks/totals.impressions*100 : null, cpc: totals.clicks ? totals.spendCents/100/totals.clicks : null, cpl: totals.leads ? totals.spendCents/100/totals.leads : null };
}
export function report(dataset, start, clientId) {
  if (!dataset.clients.some(c => c.id === clientId)) throw new InputError('고객사를 선택하세요.');
  const end = shiftDate(start,6), previousStart = shiftDate(start,-7), previousEnd = shiftDate(start,-1);
  const rows = dataset.records.filter(r => r.client_id === clientId);
  const current = rows.filter(r => r.date >= start && r.date <= end);
  const previous = rows.filter(r => r.date >= previousStart && r.date <= previousEnd);
  const groups = new Map();
  for (const row of current) { if (!groups.has(row.campaign)) groups.set(row.campaign,[]); groups.get(row.campaign).push(row); }
  return { client: dataset.clients.find(c=>c.id === clientId), start, end, previousStart, previousEnd, current: aggregate(current), previous: aggregate(previous), campaigns: [...groups].map(([name,rows])=>({name,...aggregate(rows)})), records: current, excludedRows: dataset.issues.length, sourceRows: dataset.sourceRows };
}
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeCell = value => {
  let s = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"'+s.replace(/"/g,'""')+'"';
};
export const encodeCSV = rows => '\uFEFF'+rows.map(row=>row.map(safeCell).join(',')).join('\r\n');
export const exportErrors = data => encodeCSV([['원본CSV행','code','처리내역'],...data.issues.map(i=>[i.line,i.code,i.message])]);
export function exportReportCSV(r) {
  return encodeCSV([['client_id','client_name','period_start','period_end','campaign','currency','impressions','clicks','spend','leads','CTR_percent','CPC','CPL'],...r.campaigns.map(c=>[r.client.id,r.client.name,r.start,r.end,c.name,'KRW',c.impressions,c.clicks,(c.spendCents/100).toFixed(2),c.leads,c.ctr?.toFixed(2)??'N/A',c.cpc?.toFixed(2)??'N/A',c.cpl?.toFixed(2)??'N/A'])]);
}
export function reportHTML(r, demo = true, fontData = '') {
  if(fontData && !/^[A-Za-z0-9+/=]+$/.test(fontData))throw new InputError('폰트 데이터 형식을 확인하세요.');
  const fontStyle=fontData?`@font-face{font-family:Pretendard;font-weight:45 920;font-display:swap;src:url(data:font/woff2;base64,${fontData}) format("woff2")}`:'';
  const e=escapeHTML, n=v=>v===null?'N/A':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2});
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(r.client.name)} 주간보고</title><style>${fontStyle}small{font-size:14px}body{font:16px/1.7 Pretendard,system-ui,sans-serif;color:#17253a;max-width:900px;margin:48px auto;padding:24px}h1{font-size:32px}small{color:#52647c}table{border-collapse:collapse;width:100%;margin:24px 0}td,th{padding:12px;text-align:right;border-bottom:1px solid #ccd5df}td:first-child,th:first-child{text-align:left}.notice{background:#f4f6fa;padding:16px}button{padding:12px}@media print{button{display:none}body{margin:0}}</style><body><small>FLOWNOTE / ${demo?'가상 데이터 샘플 · 고객 실적 아님':'업로드 데이터 · 담당자 검수 필요'}</small><h1>${e(r.client.name)} 주간보고</h1><p>${e(r.start)} — ${e(r.end)} · KRW</p><p>비용 <b>₩${n(r.current.spendCents/100)}</b> · 클릭 <b>${n(r.current.clicks)}</b> · 리드 <b>${n(r.current.leads)}</b></p><table><thead><tr><th>캠페인</th><th>노출</th><th>클릭</th><th>비용</th><th>리드</th><th>CTR</th><th>CPL</th></tr></thead><tbody>${r.campaigns.map(c=>`<tr><td>${e(c.name)}</td><td>${n(c.impressions)}</td><td>${n(c.clicks)}</td><td>₩${n(c.spendCents/100)}</td><td>${n(c.leads)}</td><td>${n(c.ctr)}${c.ctr===null?'':'%'}</td><td>${c.cpl===null?'N/A':'₩'+n(c.cpl)}</td></tr>`).join('')}</tbody></table><p class="notice">${r.excludedRows?'일부 입력 행을 검수 대상에서 제외한 파일로 생성했습니다. 담당자가 원본과 제외 내역을 확인해야 합니다. ':''}업로드된 행만 집계했습니다. 기간 전체의 수집 완전성은 검증하지 않았습니다. 리드는 원본의 집계 지표이며 실제 매출·이익이 아닙니다. 광고 성과의 원인이나 개선 효과를 추정하지 않습니다.</p><p><small>CTR=총클릭/총노출, CPC=총비용/총클릭, CPL=총비용/총리드. 0분모는 N/A. AI 문장 생성 없이 규칙으로 집계했습니다.</small></p></body></html>`;
}
