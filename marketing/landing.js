const names={pilot:'Flownote 2주 유료 파일럿 · 제안 기준 19만 9천 원',setup:'Flownote 표준 설정 · 제안 기준 총 59만 원',care:'선택 유지관리 · 제안 기준 월 5만 원',custom:'맞춤 ERP·PMS·CRM 구축 · 범위 확인 후 견적'};
const form=document.querySelector('#brief-form'),output=document.querySelector('#brief-text'),result=document.querySelector('#brief-result'),status=document.querySelector('#brief-status');
function invalidateDraft(){const existed=!result.hidden;result.hidden=true;output.value='';if(existed)status.textContent='내용이 바뀌었습니다. 문의 초안을 다시 만들어 주세요.';}
document.querySelectorAll('[data-package]').forEach(link=>link.addEventListener('click',()=>{if(form.elements.package.value!==link.dataset.package)invalidateDraft();form.elements.package.value=link.dataset.package;}));
form.addEventListener('input',invalidateDraft);
form.addEventListener('change',invalidateDraft);
form.addEventListener('submit',event=>{
 event.preventDefault();
 const data=Object.fromEntries(new FormData(form));
 const problem=String(data.problem||'').trim();
 if(!problem){form.elements.problem.setCustomValidity('반복되는 업무나 불편한 점을 알려주세요.');form.elements.problem.reportValidity();return;}
 form.elements.problem.setCustomValidity('');
 output.value=`안녕하세요. Flownote 도입 / 맞춤 업무 시스템 구축을 문의드립니다.\n\n관심 상품: ${names[data.package]||names.custom}\n업종: ${data.industry}\n회사·팀: ${String(data.company||'').trim()||'상담 시 안내'}\n사용 인원: ${String(data.people||'').trim()||'상담 시 안내'}\n현재 도구: ${String(data.tools||'').trim()||'상담 시 안내'}\n\n반복되는 업무와 불편한 점:\n${problem}\n\n현재 자료와 업무에 맞는 제공 범위, 비용, 진행 방법을 안내받고 싶습니다.\n※ 게시 가격은 VAT 별도 제안 기준이며 최종 범위·견적은 상담 후 확인합니다.`;
 result.hidden=false;status.textContent='문의 초안을 만들었습니다. 아직 전송되지 않았습니다. 복사한 뒤 텔레그램에서 직접 보내주세요.';
 output.focus();
});
form.elements.problem.addEventListener('input',()=>form.elements.problem.setCustomValidity(''));
document.querySelector('#copy-brief').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(output.value);status.textContent='초안을 복사했습니다. 텔레그램에서 붙여 넣고 직접 전송해 주세요.';}
 catch{output.focus();output.select();status.textContent='자동 복사를 사용할 수 없습니다. 선택된 초안을 직접 복사해 주세요.';}
});
document.querySelector('#download-brief').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob(['\uFEFF'+output.value],{type:'text/plain;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='flownote-inquiry-draft.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status.textContent='문의 초안 파일을 만들었습니다. 문의가 자동으로 전송되지는 않습니다.';
});
