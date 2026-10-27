import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ingest, parseCSV, report, aggregate, reportHTML, exportReportCSV, encodeCSV, shiftDate, COLUMNS } from '../demos/weekly-report/core.js';

const sample=readFileSync(new URL('../demos/weekly-report/fixtures/sample.csv',import.meta.url),'utf8');
const header=COLUMNS.join(',');
const row=(changes:Record<string,string|undefined>={})=>COLUMNS.map(k=>({date:'2026-10-12',client_id:'C01',client_name:'가상고객',campaign:'검색',currency:'KRW',impressions:'100',clicks:'10',spend:'100.25',leads:'2',...changes})[k]).join(',');
test('fixture reconciles original rows, valid rows and all exclusions',()=>{
  const d=ingest(sample);assert.equal(d.sourceRows,18);assert.equal(d.records.length,12);assert.equal(d.issues.length,6);assert.equal(d.clients.length,3);
  assert.deepEqual(d.issues.map(i=>i.code),['DUPLICATE','DATE','REQUIRED','NUMBER','CURRENCY','NUMBER']);
});
test('known client totals and weighted ratios match independently calculated values',()=>{
  const r=report(ingest(sample),'2026-10-12','C01');
  assert.equal(r.current.spendCents,27000000);assert.equal(r.current.impressions,30000);assert.equal(r.current.clicks,870);assert.equal(r.current.leads,45);
  assert.ok(Math.abs(r.current.ctr!-2.9)<1e-10);assert.equal(r.current.cpl,6000);assert.equal(r.previous.spendCents,25000000);assert.equal(r.previous.leads,30);
  assert.equal(r.current.rows,2);assert.deepEqual(r.records.map((x:{line:number})=>x.line),[8,9]);
});
test('client isolation holds in both downloadable formats',()=>{
  const r=report(ingest(sample),'2026-10-12','C02');
  for(const output of [exportReportCSV(r),reportHTML(r)]){
    assert.match(output,/모노핏/);assert.doesNotMatch(output,/라움리빙|소담커피|270,000|630,000/);
  }
  assert.equal(r.current.spendCents,20500000);assert.equal(r.current.leads,25);
});
test('CSV supports BOM, CRLF, quotes, commas, embedded newlines and physical line numbers',()=>{
  const result=parseCSV('\uFEFFa,b\r\n"a,b","줄1\n줄2"\r\n"a""b",c');
  assert.deepEqual(result.map(x=>x.values),[['a','b'],['a,b','줄1\n줄2'],['a"b','c']]);assert.deepEqual(result.map(x=>x.line),[1,2,4]);
});
test('broken CSV structure never silently becomes a report',()=>{
  for(const input of [header+'\n"unclosed',header+'\na"b',header+'\n"x"suffix'])assert.throws(()=>ingest(input));
  assert.throws(()=>ingest('date,client_id\n2026-10-12,C01'),/열 이름/);
  assert.throws(()=>ingest(header.replace('leads','date')+'\n'+row()),/열 이름/);
});
test('conflicting duplicate blocks entire input instead of accepting arbitrary first value',()=>{
  assert.throws(()=>ingest(header+'\n'+row()+'\n'+row({spend:'999'})),/충돌/);
});
test('same campaign across different dates is distinct while exact repeated row is excluded',()=>{
  const d=ingest(header+'\n'+row()+'\n'+row({date:'2026-10-13'})+'\n'+row());assert.equal(d.records.length,2);assert.equal(d.issues[0].code,'DUPLICATE');
});
test('zero denominators yield N/A and missing periods remain identifiable as no data',()=>{
  const d=ingest(header+'\n'+row({clicks:'0',impressions:'0',leads:'0'}));const r=report(d,'2026-10-12','C01');
  assert.equal(r.current.ctr,null);assert.equal(r.current.cpc,null);assert.equal(r.current.cpl,null);assert.match(exportReportCSV(r),/N\/A/);
  assert.equal(report(d,'2026-11-02','C01').current.rows,0);assert.throws(()=>report(d,'2026-10-12','unknown'),/고객사/);
});
test('money uses integer minor units to prevent floating point summation errors',()=>{
  const d=ingest(header+'\n'+row({spend:'0.10'})+'\n'+row({date:'2026-10-13',spend:'0.20'}));assert.equal(aggregate(d.records).spendCents,30);
});
test('reject impossible dates, negative values, exponent notation and currencies without conversion',()=>{
  for(const changes of [{date:'2026-02-30'},{spend:'-10'},{spend:'1e5'},{clicks:'1.2'},{currency:'USD'},{spend:'10.123'}])assert.throws(()=>ingest(header+'\n'+row(changes)));
  assert.equal(shiftDate('2024-02-28',1),'2024-02-29');assert.equal(shiftDate('2026-10-12',6),'2026-10-18');
});
test('HTML escapes customer content and CSV neutralizes spreadsheet formulas',()=>{
  const d=ingest(header+'\n'+row({client_name:'<script>alert(1)</script>',campaign:'=SUM(A1:A2)'}));const html=reportHTML(report(d,'2026-10-12','C01'));
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(exportReportCSV(report(d,'2026-10-12','C01')),/'=SUM/);
  assert.match(encodeCSV([['  =1','+1','-1','@SUM(A1)']]),/"'  =1","'\+1","'-1","'@SUM/);
});
test('client name inconsistency and client cap produce visible exclusions',()=>{
  const d=ingest(header+'\n'+row()+'\n'+row({date:'2026-10-13',client_name:'다른이름'})+'\n'+row({client_id:'C02'})+'\n'+row({client_id:'C03'})+'\n'+row({client_id:'C04'}));
  assert.equal(d.clients.length,3);assert.deepEqual(d.issues.map(i=>i.code),['CLIENT_NAME','CLIENT_LIMIT']);
});
