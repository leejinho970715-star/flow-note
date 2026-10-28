import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {base} from './site-config.mjs';
const root=new URL('../marketing/',import.meta.url),out=new URL('../dist/',import.meta.url);
const canonical=process.env.LANDING_CANONICAL_URL||'https://flownote-studio.vercel.app/';
const faqs=[
 ['Flownote 제품 도입과 맞춤 구축은 어떻게 다른가요?','Flownote는 고객 보고 업무를 위한 정해진 범위의 템플릿입니다. 맞춤 구축은 회사의 업무를 진단한 뒤 ERP·PMS·CRM 등 필요한 모듈과 연결 기능을 별도로 설계하는 서비스입니다.'],
 ['지금 체험판에서 무엇을 할 수 있나요?','공개 대시보드는 가상 자료 조회용입니다. CSV 체험에서는 브라우저로 파일을 검사·집계하고 고객별 HTML·CSV를 내려받을 수 있습니다. 실제 광고 수집·메일 발송·결제는 연결하지 않았습니다.'],
 ['Flownote는 설치형인가요, 클라우드 구독형인가요?','현재 표준 설정은 한 PC에서 운영하는 로컬판을 기준으로 합니다. 클라우드에는 회사·고객·프로젝트 등록 화면이 연결돼 있으며, 일반 고객 가입 메일과 보고서 작성·검수 화면 연결은 준비 중입니다. 여러 PC의 공유 운영이 필요하면 별도로 범위를 검토합니다.'],
 ['월 5만 원 유지관리에 무엇이 포함되나요?','선택 유지관리는 월 30분 원격 안내, 기존 설정 점검과 합의한 업데이트 지원입니다. 서버 이용권, 클라우드 SaaS 사용료, 보고서 작성 대행, 새 기능, 무제한 수정은 포함하지 않습니다.'],
 ['19만 9천 원 파일럿 이후에는 어떻게 되나요?','2주 파일럿은 고객 1곳·CSV 1양식·보고서 1종으로 적합성을 확인합니다. 총 59만 원 표준 설정으로 전환하면 파일럿 비용을 포함하므로 잔금은 39만 1천 원입니다. 모두 VAT 별도 제안 기준이며 범위와 일정 확인 후 견적을 확정합니다.'],
 ['ERP의 회계·급여·재고까지 모두 구축해 주나요?','맞춤 구축은 필요한 업무를 먼저 정하는 방식입니다. 회계·급여·재고·생산 등 ERP 전체 기능은 기본 제공 범위가 아닙니다. 기존 ERP나 도구 활용이 적합한지도 검토한 뒤 구축 또는 연결 범위를 제안합니다.'],
 ['회사 자료와 상담 내용은 어디에 저장되나요?','CSV 체험 파일은 브라우저에서 처리합니다. 로컬 운영판은 해당 PC의 DB에, 클라우드 계정 자료는 회사별 접근 제한을 적용한 Supabase에 저장합니다. 이 페이지의 문의 초안은 서버에 저장·전송하지 않으며 텔레그램 전송은 방문자가 직접 진행합니다.'],
 ['견적을 받으려면 무엇을 준비하면 되나요?','업종, 반복되는 업무, 현재 도구, 사용 인원과 필요한 범위를 알려주세요. 우선 텔레그램 @evanlee97로 문의할 수 있습니다. 민감한 고객 원본이나 비밀번호는 보내지 말고, 자료 검토가 필요하면 익명화한 양식과 전달 방법부터 협의합니다.']
];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const organization={'@type':'Organization','@id':canonical+'#organization',name:'Flownote',url:canonical,contactPoint:{'@type':'ContactPoint',contactType:'sales',url:'https://t.me/evanlee97',availableLanguage:'Korean'}};
const schema={'@context':'https://schema.org','@graph':[
 organization,
 {'@type':'WebSite','@id':canonical+'#website',url:canonical,name:'Flownote',inLanguage:'ko-KR',publisher:{'@id':canonical+'#organization'}},
 {'@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:'Flownote — 보고 업무 자동화 · 맞춤 ERP·PMS·CRM 구축',inLanguage:'ko-KR',isPartOf:{'@id':canonical+'#website'},about:[{'@id':canonical+'#flownote'},{'@id':canonical+'#custom'}]},
 {'@type':'SoftwareApplication','@id':canonical+'#flownote',name:'Flownote',applicationCategory:'BusinessApplication',operatingSystem:'Web, local Node.js runtime',description:'CSV 검사·고객별 주간 집계·HTML/CSV 출력과 로컬판 검수·승인·버전 보관을 제공하는 보고 업무 템플릿. 클라우드 보고서 화면과 일반 고객 가입 메일은 준비 중.',url:canonical+'#product'},
 {'@type':'Service','@id':canonical+'#custom',name:'맞춤 ERP·PMS·CRM 업무 시스템 구축',serviceType:'기업 맞춤 업무 시스템 구축',provider:{'@id':canonical+'#organization'},description:'업무 진단, 범위·완료 기준 합의, 구축·교육·인수, 유지관리·추가 확장. 필요한 모듈과 연결 범위를 확인해 개별 견적을 제안합니다.',url:canonical+'#solutions'}
]};
await mkdir(new URL('marketing/',out),{recursive:true});
for(const file of ['landing.css','landing.js','mark.svg','favicon.svg'])await copyFile(new URL(file,root),new URL('marketing/'+file,out));
for(const file of ['clay-workflow-640.jpg','clay-workflow-1200.jpg','og-flownote.png','favicon-32.png','favicon.ico','apple-touch-icon.png'])await copyFile(new URL('assets/'+file,root),new URL('marketing/'+file,out));
let html=await readFile(new URL('index.html',root),'utf8');
html=html.replaceAll('__BASE__',base).replaceAll('__CANONICAL__',canonical).replaceAll('__IMAGE_URL__',canonical+'marketing/og-flownote.png').replaceAll('__ACCOUNT_URL__',base==='/'?'/account.html':canonical+'account.html')
 .replace('__FAQ_HTML__',faqs.map(([question,answer])=>`<details><summary>${escape(question)}</summary><p>${escape(answer)}</p></details>`).join('\n'))
 .replace('__SCHEMA__',JSON.stringify(schema).replaceAll('<','\\u003c'));
await writeFile(new URL('index.html',out),html);
await writeFile(new URL('robots.txt',out),'User-agent: *\nAllow: /\nSitemap: '+canonical+'sitemap.xml\n');
await writeFile(new URL('sitemap.xml',out),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+canonical+'</loc></url></urlset>\n');
console.log('Marketing landing built: static content, truthful scope, Telegram handoff, canonical production URL.');
