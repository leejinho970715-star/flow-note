import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.COMPANY_SITE_URL||'https://'+(process.env.VERCEL_PROJECT_PRODUCTION_URL||'flownote-studio.vercel.app');
process.env.LANDING_CANONICAL_URL=new URL('/',origin).href;
process.env.FLOWNOTE_BASE_PATH='/';
await mkdir(new URL('../dist/assets/',import.meta.url),{recursive:true});
await copyFile(new URL('../demos/weekly-report/assets/PretendardVariable.woff2',import.meta.url),new URL('../dist/assets/PretendardVariable.woff2',import.meta.url));
await copyFile(new URL('../demos/weekly-report/assets/Pretendard-LICENSE.txt',import.meta.url),new URL('../dist/assets/Pretendard-LICENSE.txt',import.meta.url));
await import('./build-landing.mjs');
const file=new URL('../dist/index.html',import.meta.url);
let html=await readFile(file,'utf8');
html=html.replaceAll('href="/workspace/"','href="https://flow-note-psi.vercel.app/workspace/"').replaceAll('href="/csv.html"','href="https://flow-note-psi.vercel.app/csv.html"').replaceAll('href="/account.html"','href="https://flow-note-psi.vercel.app/account.html"')
 .replace('<title>Flownote — 보고 업무 자동화 · 맞춤 ERP·PMS·CRM 구축</title>','<title>Flownote Studio — 기업 맞춤 업무 시스템·ERP·PMS·CRM 개발</title>')
 .replace('aria-label="Flownote 홈"','aria-label="Flownote Studio 홈"')
 .replace('<span>flownote<span class="brand-dot">.</span></span>','<span>flownote<span class="brand-dot">.</span><small class="studio-label">STUDIO</small></span>');
html=html.replace('<section class="message-section wrap"',`<section class="section wrap agency-offer" id="agencyflow"><div><span class="eyebrow">FOR AGENCIES & DESIGN STUDIOS</span><h2>고객의 수정 요청도,<br>같은 화면에서.</h2><p>AgencyFlow는 시안 위 위치별 피드백·댓글·작업 상태·버전별 승인과 고객·프로젝트·견적을 연결합니다.</p><p class="section-note">초기 검증판입니다. 자동 웹 검수·전자서명·결제·메일 알림은 준비 중입니다.</p></div><div class="custom-panel"><span class="eyebrow">AGENCYFLOW</span><h3>시안을 올리고, 고객과 함께 확인하세요.</h3><p>웹에이전시·브랜딩·디자인 스튜디오를 위한 별도 서비스입니다. 가상 샘플에서 피드백부터 승인까지 체험할 수 있습니다.</p><a class="btn btn-orange" href="https://agencyflow-studio.vercel.app/">AgencyFlow 살펴보기 ↗</a></div></section><section class="message-section wrap"`);
assert(html.includes(origin+'/marketing/og-flownote.png'),'Company OG must use its own origin');
assert(html.includes('https://flow-note-psi.vercel.app/workspace/'));
await copyFile(new URL('../marketing/assets/og-studio.png',import.meta.url),new URL('../dist/marketing/og-studio.png',import.meta.url));
html=html.replaceAll('marketing/og-flownote.png','marketing/og-studio.png').replaceAll('https://agencyflow-studio.vercel.app/',(process.env.AGENCY_PUBLIC_URL||'https://agencyflow-studio.vercel.app')+'/');
assert(html.includes('id="agencyflow"'),'AgencyFlow must be included in company offerings');
await writeFile(file,html);
console.log('Independent company landing built at '+origin);
