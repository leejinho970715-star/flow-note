import { ingest, report, shiftDate, escapeHTML as e, exportReportCSV, exportErrors, reportHTML, LIMITS } from './core.js';

const root = document.querySelector('#app');
let data = null, current = null, source = 'demo', filename = '', client = 'C01', start = '2026-10-12', tab = 'report', acknowledged = false, fatal = '', elapsed = 0;
let requestId = 0;
const roi = {before:'20',after:'5',hourly:'20000',setup:'900000',support:'0',tools:'0'};
const fmt = (v, digits=0) => v === null ? 'N/A' : Number(v).toLocaleString('ko-KR',{maximumFractionDigits:digits});
const money = v => v===null?'N/A':'₩'+fmt(v,2);
const metric = (label,value,sub) => `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${sub}</small></article>`;
function delta(now,before) {
  if (!current.previous.rows || !before) return '직전 주 비교 불가';
  const d=(now-before)/before*100;
  return `직전 주 대비 ${d>0?'+':''}${fmt(d,1)}% · 업로드 행 기준`;
}
const canExport = () => current?.current.rows > 0 && (!data.issues.length || acknowledged);
function calculate() {
  current = data ? report(data,start,client) : null;
}
function render() {
  root.innerHTML = `<header class="topbar"><a class="brand" href="./"><img class="demo-brand-image" src="./assets/brandmark.png?v=2" alt="Flownote 로고" width="40" height="40">flownote<span class="brand-divider"></span><span class="product-name">주간보고 자동화</span></a><div class="top-right"><span class="local-dot"></span><span class="local-label">브라우저 내 처리</span><a class="tag" href="/workspace">워크스페이스 ↗</a></div></header>
  <main><div class="intro"><div><div class="eyebrow">WEEKLY REPORT, WITHOUT THE REPETITION</div><h1>반복 정리는 줄이고,<br class="mobile-break"> 검토에 집중하세요.</h1><p>CSV 한 양식을 고객사별 주간보고로. 숫자의 출처와 제외된 행까지 함께 확인합니다.</p></div><div class="intro-note"><b>작동하는 작은 샘플</b><span>실제 CSV 집계 · 실제 오류 검사<br>광고 API·AI 호출 없이 실행</span></div></div>
  <ol class="steps"><li><b>01</b> CSV 가져오기</li><li><b>02</b> 오류 확인하기</li><li><b>03</b> 고객별 보고서 받기</li></ol>
  ${fatal?`<div role="alert" class="fatal"><strong>처리를 중단했습니다.</strong> ${e(fatal)}<br><small>이전 결과도 비웠습니다. 파일을 수정하거나 샘플로 다시 실행하세요.</small></div>`:''}
  <div class="workspace"><aside class="sidebar"><section class="panel input-panel"><div class="section-top"><span class="overline">INPUT</span><span class="small-tag">CSV 1종</span></div><h2>보고할 자료를 넣으세요</h2><p class="muted">샘플로 먼저 확인하거나, 같은 열 구조의 익명화 CSV를 넣어 보세요.</p><label class="file-zone"><span class="upload-icon" aria-hidden="true">↥</span><strong>CSV 파일 선택</strong><span>최대 2MB · 15,000행 · 고객사 3곳</span><input id="file" type="file" accept=".csv,text/csv" aria-label="CSV 파일 선택"></label><button class="button primary full" data-action="sample">샘플 데이터로 ${data?'다시 실행':'시작'}</button><button class="button text full" data-action="sample-download">샘플 CSV 다운로드 ↓</button>
  <div class="file-info">${data?`<span class="file-symbol">CSV</span><div><b>${e(filename)}</b><small>${source==='demo'?'가상 브랜드·가상 수치':'직접 업로드한 데이터'} · ${fmt(data.sourceRows)}행</small></div>`:'파일을 선택하면 여기에 표시됩니다.'}</div><div class="privacy"><span>⌁</span><p>업로드 파일은 이 브라우저에서만 처리합니다. 서버 전송·영구 저장하지 않습니다.</p></div></section>
  <section class="panel scope-panel"><span class="overline">TEMPLATE SCOPE</span><h3>이 샘플이 하는 일</h3><ul><li>고객사·주간별 합계와 비율 계산</li><li>누락·중복·잘못된 값 검사</li><li>원본 대조와 고객별 파일 출력</li></ul><p>KRW · 같은 CSV 양식 · 보고서 1종<br>실시간 수집·성과 원인 분석은 범위 밖입니다.</p></section></aside>
  <section class="output-area"><div class="panel report-shell"><div class="output-header"><div><span class="overline">OUTPUT</span><h2>주간 리포트</h2></div><span class="status ${data?.issues.length?'warning':''}">${data?(data.issues.length?`제외 ${data.issues.length}행 확인 필요`:'파일 검증 통과'):'입력 대기'}</span></div>
  <div class="filters"><label>고객사<select id="client" ${!data?'disabled':''}>${data?data.clients.map(c=>`<option value="${e(c.id)}" ${client===c.id?'selected':''}>${e(c.name)} · ${e(c.id)}</option>`).join(''):'<option>파일을 넣어 주세요</option>'}</select></label><label>보고 시작일<input id="start" type="date" value="${e(start)}"></label><span class="period-end">~ ${e(shiftDate(start,6))}<small>7일 단위 · 직전 7일과 비교</small></span></div>
  <div class="tabs" role="tablist" aria-label="보고서 보기"><button role="tab" aria-selected="${tab==='report'}" data-tab="report">보고서</button><button role="tab" aria-selected="${tab==='checks'}" data-tab="checks">검수 내역 ${data?`<span>${data.issues.length}</span>`:''}</button></div>
  <div class="tab-content">${data?tab==='report'?reportView():checksView():'<div class="empty">샘플 데이터로 시작해 보세요.<br><small>파일을 넣으면 보고서와 검수 내역이 함께 만들어집니다.</small></div>'}</div></div>
  <div class="panel trace-panel"><div><span class="overline">TRACEABLE BY DESIGN</span><h3>결과를 믿기 전에, 원본과 대조합니다.</h3></div>${data?`<div class="trace-numbers"><span><b>${data.sourceRows}</b>원본 행</span><i>→</i><span><b>${data.records.length}</b>집계 가능</span><span class="amber"><b>${data.issues.length}</b>검수 제외</span></div>`:'<p>검증되지 않은 행을 정상 처리로 표시하지 않습니다.</p>'}<p class="trace-foot">${data?`${fmt(elapsed,1)}ms 브라우저 파일 검사 · `:''}행 수 대조는 파일 내부 기준입니다. 광고 플랫폼에서 빠진 자료까지 검증한 것은 아닙니다.</p></div>
  </section></div>
  <section class="panel roi-panel"><div class="roi-title"><span class="overline">IS THIS WORTH PAYING FOR?</span><h2>우리 업무에도 비용이 맞을까요?</h2><p>실측값으로 바꿔 판단하세요. 아래 기본값은 계산 예시이며 절감 효과를 측정한 결과가 아닙니다.</p></div><div class="roi-layout"><div class="roi-inputs">${[['before','현재 월 작업시간','20','시간'],['after','도입 후 월 작업시간','5','시간'],['hourly','내부 시간당 비용','20000','원'],['setup','구축 견적 가정','900000','원'],['support','월 관리비 가정','0','원'],['tools','월 추가 도구비 가정','0','원']].map(([id,label,value,unit])=>`<label>${label}<span><input data-roi="${id}" type="number" min="0" max="1000000000" step="any" value="${e(roi[id])}"><small>${unit}</small></span></label>`).join('')}</div><div id="roi-result" aria-live="polite"></div></div><p class="roi-foot">절약한 시간의 가치와 실제 현금 인건비 절감은 다릅니다. 업로드·검수·예외 처리·교육 시간도 포함하세요. 관리비는 필요할 때 선택합니다.</p></section>
  <footer>FLOWNOTE / AI UNIVERSE <span>샘플은 가상 데이터입니다. 유료 고객 수요·납품 역량·운영 안정성은 별도 검증 대상입니다.</span></footer></main>`;
  updateROI();
}
function reportView() {
  const r=current, t=r.current;
  return `<div class="sample-banner ${source==='demo'?'':'uploaded'}"><span>${source==='demo'?'SAMPLE':'UPLOADED'}</span>${source==='demo'?'가상 고객 3곳의 샘플입니다. 실제 고객 성과가 아닙니다.':'업로드한 데이터입니다. 완전성과 적법한 사용 권한은 담당자가 확인해야 합니다.'}</div>
  ${data.issues.length?`<div class="review-alert"><div><b>${data.issues.length}행을 제외한 잠정 보고서입니다.</b><button class="inline-link" data-tab="checks">검수 내역 보기 →</button></div><label><input id="ack" type="checkbox" ${acknowledged?'checked':''}> 제외 내역을 확인했으며, 해당 행을 제외한 보고서를 다운로드합니다.</label></div>`:''}
  ${!t.rows?'<div class="empty">선택한 고객·기간에 정상 데이터가 없습니다.<br><small>데이터 없음은 실적 0이라는 뜻이 아닙니다. 다운로드를 중지했습니다.</small></div>':`<div class="report-heading"><div><span class="overline">${e(r.start)} — ${e(r.end)}</span><h3>${e(r.client.name)} <span>주간 운영보고</span></h3></div><span class="currency">KRW</span></div><div class="metrics">${metric('광고 비용',money(t.spendCents/100),delta(t.spendCents,r.previous.spendCents))}${metric('클릭',fmt(t.clicks),delta(t.clicks,r.previous.clicks))}${metric('리드',fmt(t.leads),delta(t.leads,r.previous.leads))}${metric('리드당 비용',money(t.cpl),'CPL · 총비용 ÷ 총리드')}</div>
  <div class="report-grid"><div class="campaign-card"><div class="subheading"><h4>캠페인별 비용</h4><span>업로드된 행 기준</span></div>${r.campaigns.map((c,i)=>`<div class="bar-row"><span>${e(c.name)}</span><b>${money(c.spendCents/100)}</b><div class="bar-track"><i style="width:${t.spendCents?c.spendCents/t.spendCents*100:0}%;background:${i%2?'#93b7ac':'#226754'}"></i></div></div>`).join('')}<div class="ratio-note">클릭률 <b>${fmt(t.ctr,2)}${t.ctr===null?'':'%'}</b><span>클릭당 비용 <b>${money(t.cpc)}</b></span></div></div><div class="notes-card"><span class="overline">검토 메모 · 규칙 생성</span><p>선택 기간의 정상 데이터 <b>${t.rows}행</b>을 합산했습니다.</p><p>${r.previous.rows?`직전 주 ${r.previous.rows}행과 비교했습니다. 수집 범위가 같아야 비교가 유효합니다.`:'직전 주 자료가 없어 증감을 판단하지 않았습니다.'}</p><small>리드는 원본의 집계값입니다. 실제 매출이나 이익으로 환산하지 않았습니다.</small></div></div>
  <div class="subheading table-title"><h4>캠페인 상세</h4><span>0분모는 N/A</span></div><div class="table-scroll"><table><thead><tr><th>캠페인</th><th>노출</th><th>클릭</th><th>비용</th><th>리드</th><th>CTR</th><th>CPL</th></tr></thead><tbody>${r.campaigns.map(c=>`<tr><th scope="row">${e(c.name)}</th><td>${fmt(c.impressions)}</td><td>${fmt(c.clicks)}</td><td>${money(c.spendCents/100)}</td><td>${fmt(c.leads)}</td><td>${fmt(c.ctr,2)}${c.ctr===null?'':'%'}</td><td>${money(c.cpl)}</td></tr>`).join('')}</tbody><tfoot><tr><th>합계</th><td>${fmt(t.impressions)}</td><td>${fmt(t.clicks)}</td><td>${money(t.spendCents/100)}</td><td>${fmt(t.leads)}</td><td>${fmt(t.ctr,2)}${t.ctr===null?'':'%'}</td><td>${money(t.cpl)}</td></tr></tfoot></table></div>
  <details class="reconcile"><summary>원본 대조 · 이 보고서에 포함된 ${t.rows}행</summary><p>원본 CSV의 실제 행 번호입니다. CTR·CPC·CPL은 행별 비율의 평균이 아니라 합계에서 계산합니다.</p><div class="table-scroll"><table><thead><tr><th>원본 행</th><th>날짜</th><th>캠페인</th><th>비용</th><th>리드</th></tr></thead><tbody>${r.records.map(x=>`<tr><th>${x.line}</th><td>${e(x.date)}</td><td>${e(x.campaign)}</td><td>${money(x.spendCents/100)}</td><td>${fmt(x.leads)}</td></tr>`).join('')}</tbody></table></div></details>`}
  <div class="download-area"><div><b>이 고객의 보고서만 다운로드</b><small>${e(r.client.name)} · 다른 고객 데이터는 포함하지 않습니다.</small></div><div><button class="button secondary" data-action="csv" ${!canExport()?'disabled':''}>집계 CSV ↓</button><button class="button primary" data-action="html" ${!canExport()?'disabled':''}>고객용 보고서 ↓</button></div></div><p class="download-hint">고객용 보고서는 HTML 파일입니다. 브라우저에서 열어 인쇄 → PDF 저장할 수 있습니다. ${!canExport()?'제외 내역 확인 또는 데이터가 있는 기간 선택 후 다운로드하세요.':''}</p>`;
}
function checksView() {
  return `<div class="checks-heading"><div><h3>어떤 행을 제외했나요?</h3><p>행 단위 오류는 제외하고 집계합니다. 수치가 충돌하는 중복·파일 구조 오류는 전체 처리를 중단합니다.</p></div><button class="button secondary" data-action="errors" ${!data.issues.length?'disabled':''}>오류 CSV ↓</button></div>${data.issues.length?`<div class="table-scroll"><table class="checks-table"><thead><tr><th>원본 CSV 행</th><th>유형</th><th>처리 내역</th></tr></thead><tbody>${data.issues.map(x=>`<tr><th>${x.line}</th><td><span class="issue-code">${e(x.code)}</span></td><td>${e(x.message)}</td></tr>`).join('')}</tbody></table></div><p class="check-bottom">정상 ${data.records.length}행 + 제외 ${data.issues.length}행 = 원본 ${data.sourceRows}행. 원본을 수정한 뒤 다시 올리면 재검사합니다.</p>`:'<div class="empty success-text">제외된 행이 없습니다.<br><small>파일 내부 형식 검사를 통과했습니다. 업무상 정확성은 원본과 대조해 주세요.</small></div>'}`;
}
function updateROI() {
  const inputs = Object.fromEntries([...root.querySelectorAll('[data-roi]')].map(el=>[el.dataset.roi,Number(el.value)]));
  const target = root.querySelector('#roi-result'); if(!target)return;
  if(Object.values(inputs).some(n=>!Number.isFinite(n)||n<0||n>1e9)) { target.innerHTML='<p>0 이상의 유효한 값을 입력하세요.</p>'; return; }
  const saved=inputs.before-inputs.after, benefit=saved*inputs.hourly, net=benefit-inputs.support-inputs.tools;
  const months=net>0?inputs.setup/net:null;
  target.innerHTML=`<span class="overline">입력 가정에 따른 계산</span><strong>${money(net)}<small>/월 순편익</small></strong><p>시간가치 ${money(benefit)} − 관리·도구비 ${money(inputs.support+inputs.tools)}</p><div><span>구축비 회수</span><b>${months===null?'회수 불가':inputs.setup===0?'초기비용 없음':fmt(months,1)+'개월'}</b></div><small>${saved<0?'도입 후 작업시간이 늘어나는 가정입니다.':months!==null&&months<=6?'가정상 6개월 이내입니다. 실제 파일럿으로 시간과 비용을 측정하세요.':'가격·범위·고객군을 다시 검토할 조건입니다.'}</small>`;
}
async function loadInput(read,name,mode) {
  const ticket=++requestId;
  acknowledged=false; fatal=''; data=null; current=null;
  render();
  try {
    const text=await read();
    if(ticket!==requestId)return;
    const before=performance.now(); data=ingest(text); elapsed=performance.now()-before;
    filename=name; source=mode; client=data.clients[0].id;
    const latest=data.records.map(r=>r.date).sort().at(-1);
    const day=new Date(latest+'T00:00:00Z').getUTCDay(); start=shiftDate(latest,-((day+6)%7));
    tab='report'; calculate();
  } catch(err) { if(ticket!==requestId)return; data=null; current=null; fatal=err.message; }
  render();
}
async function sample() {
  await loadInput(async()=>{const res=await fetch('./fixtures/sample.csv',{cache:'no-store'});if(!res.ok)throw new Error('샘플 파일을 읽지 못했습니다.');return res.text();},'sample.csv','demo');
}
function download(content,type,name) {
  const url=URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
root.addEventListener('click',async event=>{
  const el=event.target.closest('button'); if(!el||el.disabled)return;
  if(el.dataset.tab){tab=el.dataset.tab;render();return;}
  const action=el.dataset.action;
  if(action==='sample')await sample();
  if(action==='sample-download'){const r=await fetch('./fixtures/sample.csv');if(r.ok)download(await r.text(),'text/csv;charset=utf-8','flownote-sample.csv');}
  if(action==='errors'&&data)download(exportErrors(data),'text/csv;charset=utf-8','검수-제외내역.csv');
  if((action==='csv'||action==='html')&&canExport()){
    const name=`${current.client.id}_${current.start}`;
    download(action==='csv'?exportReportCSV(current):reportHTML(current,source==='demo'),action==='csv'?'text/csv;charset=utf-8':'text/html;charset=utf-8',name+(action==='csv'?'.csv':'.html'));
  }
});
root.addEventListener('change',async event=>{
  const el=event.target;
  if(el.id==='file'&&el.files[0]){const file=el.files[0];await loadInput(async()=>{if(file.size>LIMITS.bytes)throw new Error('파일은 2MB 이하여야 합니다.');return file.text();},file.name,'upload');}
  if(el.id==='client'){client=el.value;calculate();render();}
  if(el.id==='start'&&el.value){start=el.value;calculate();render();}
  if(el.id==='ack'){acknowledged=el.checked;render();}
});
root.addEventListener('input',event=>{if(event.target.dataset.roi){roi[event.target.dataset.roi]=event.target.value;updateROI();}});
render();sample();
