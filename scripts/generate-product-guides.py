"""Generate public product guides and matching code-drawn identity/social assets.
Run with the bundled Python (reportlab, pypdfium2, fonttools, brotli).
Screens are fictional-sample screenshots captured from the actual static apps.
"""
from pathlib import Path
import shutil, io, json
from xml.sax.saxutils import escape
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
import pypdfium2 as pdfium
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
TMP=ROOT/'tmp/pdfs'; OUT=ROOT/'output/pdf'; SHOTS=ROOT/'docs/product-screens'
PUBLIC=ROOT/'agencyflow/public'; TMP.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
for weight,name in [(400,'Pretendard'),(700,'PretendardBold')]:
    target=TMP/(name+'.ttf')
    if not target.exists():
        font=TTFont(ROOT/'demos/weekly-report/assets/PretendardVariable.woff2')
        font=instantiateVariableFont(font,{'wght':weight},inplace=True)
        font.flavor=None; font.save(target)
    pdfmetrics.registerFont(RLFont(name,str(target)))

INK=HexColor('#243c32'); MUTED=HexColor('#65776b'); GREEN=HexColor('#226754'); LINE=HexColor('#e1e7dd'); BG=HexColor('#f5f7f3')
W,H=595.28,841.89
STYLE=ParagraphStyle('body',fontName='Pretendard',fontSize=13,leading=22,textColor=INK,wordWrap='CJK',spaceAfter=12)

products={
'flownote':dict(name='Flownote',ko='플로노트',tag='보고 자동화 · 고객 프로젝트 운영',summary='매번 정리하는 자료를 고객과 프로젝트별로 확인하고, 보고할 내용을 명확하게 만드세요.',url='https://flow-note-psi.vercel.app/workspace/',steps=['공개 체험에서 가상 고객·보고 흐름을 살펴봅니다.','CSV 직접 체험에서 내 양식을 검사하고 집계·출력합니다.','실제 저장·검수·승인이 필요하면 로컬 운영판 도입 범위를 상담합니다.'],screens=[
 ('dash','전체 업무','진행 현황을 한눈에 확인합니다.',['프로젝트, 검수 대기, 승인 상태를 구분해 확인하세요.','빠른 시작에서 필요한 업무로 이동합니다.','공개 화면의 수치와 승인 상태는 가상 샘플입니다.']),
 ('projects','고객 · 프로젝트','보고 자료가 연결될 고객과 업무를 확인합니다.',['고객과 프로젝트, 캠페인 연결 관계를 살펴보세요.','로컬 운영판에서는 담당자·기간·캠페인 매핑을 설정합니다.','공개 체험에서는 실제 고객 정보를 저장하지 않습니다.']),
 ('csv','CSV 직접 체험','원본과 제외 내역을 확인한 뒤 고객별 파일을 출력합니다.',['샘플 CSV를 내려받아 열 구조를 확인합니다. 최대 2MB·15,000행·고객 3곳의 같은 양식을 사용합니다.','고객과 보고 시작일을 선택하고 검수 내역·누락·중복·제외 행을 확인하세요.','제외 내역 확인 후 집계 CSV 또는 고객용 HTML 보고서를 다운로드합니다. HTML은 브라우저 인쇄로 PDF 저장할 수 있습니다.']),
 ('reports','보고서 보관함','검수할 보고서와 승인된 버전을 구분합니다.',['상태와 고객·기간을 확인하고 보고서를 선택하세요.','다운로드한 샘플은 실제 고객 실적이 아닙니다.','로컬 운영판은 작성자와 다른 담당자의 검수·승인 흐름을 제공합니다.']),
 ('team','팀 · 권한','작성자와 검수자의 역할을 나눕니다.',['공개 화면은 가상 팀의 역할 예시입니다.','실제 계정·권한 검사는 로컬 운영판에서 동작합니다.','작성자가 자신이 만든 보고서를 승인하지 않는 것이 기본 원칙입니다.']),
 ('audit','변경 기록','어떤 버전과 상태를 확인했는지 살펴봅니다.',['공개 화면은 가상 변경 이력입니다.','로컬 운영판에서 버전·검수 이력을 확인합니다.','수동 전달 기록과 고객의 실제 수신 확인은 다릅니다.'])],limits=['공개 대시보드는 가상 자료 조회용입니다. 브라우저 CSV 체험과 로컬 저장 운영판은 제공 범위가 다릅니다.','클라우드 계정 화면은 기초자료 등록 단계이며, 클라우드 보고서 업무 전체 연결은 준비 중입니다.','외부 광고 계정 자동 수집·이메일 자동 발송·클라우드 구독 결제를 기본 기능으로 제공하지 않습니다.']),
'agencyflow':dict(name='AgencyFlow',ko='에이전시플로우',tag='웹에이전시 · 디자인 스튜디오의 고객 피드백',summary='시안 위에 수정할 위치를 남기고, 대화·처리 상태·최종 버전을 함께 확인하세요.',url='https://agencyflow-studio-dun.vercel.app/workspace/',steps=['가상 프로젝트를 선택하고 시안 피드백 메뉴를 엽니다.','이미지 위치를 선택해 핀과 의견을 남깁니다.','담당자가 처리한 뒤 고객이 올바른 버전을 확인하고 승인합니다.'],screens=[
 ('dash','전체 흐름','먼저 확인해야 할 프로젝트와 요청을 찾습니다.',['진행 중 프로젝트와 미완료 피드백을 확인하세요.','프로젝트 종료 예정일은 다른 세부 일정과 구분됩니다.','미수금·MRR은 결제·수금 연결 전까지 계산하지 않습니다.']),
 ('projects','프로젝트','고객·담당자·기간과 진행 단계를 연결합니다.',['프로젝트를 만들 때 고객과 담당자·기간을 확인하세요.','상담부터 검수·완료까지 단계를 바꿔 진행 상태를 공유합니다.','회사의 고객은 배정된 프로젝트만 조회하는 권한 구조입니다.']),
 ('clients','고객 관리','프로젝트의 고객과 연락 정보를 정리합니다.',['고객 등록·수정 후 프로젝트와 연결하세요.','불필요한 실제 개인정보는 샘플 체험에 입력하지 마세요.','고객 보관과 계정 접근 권한 회수는 같은 기능이 아닙니다.']),
 ('feedback','시안 피드백','수정 위치와 의견을 같은 화면에 남깁니다.',['PNG·JPEG·WebP 시안을 업로드합니다. 파일당 최대 5MB입니다.','이미지를 눌러 핀과 의견을 남기고 답글·처리 상태를 확인합니다.','새 시안은 새 버전으로 등록합니다. 고객 승인은 해당 버전에 남습니다.']),
 ('quotes','견적서','수량·단가와 견적 버전을 확인합니다.',['페이지·난이도·선택 기능은 견적 입력을 돕는 기준입니다.','회사 모드에서는 서버가 금액을 다시 계산합니다.','고객 공개·승인과 브라우저 인쇄/PDF 저장을 제공합니다. 계약 전자서명과는 다릅니다.']),
 ('tasks','작업 목록','담당자와 해야 할 일을 정리합니다.',['필요한 작업을 등록하고 상태를 확인하세요.','상태는 실제 작업자가 완료 여부를 확인한 뒤 바꿉니다.','외부 서비스를 대신 실행하거나 자동 납품하는 기능은 아닙니다.']),
 ('team','팀 · 요금','역할과 체험 조건을 확인합니다.',['회사 모드는 이메일 확인을 마친 계정의 연결이 필요합니다.','현재 초대 메일은 자동 발송하지 않습니다. 일반 고객 메일 서비스도 준비 중입니다.','체험 종료 후에는 읽기 전용이 됩니다. 결제 버튼은 준비 중으로 표시됩니다.'])],limits=['샘플은 이 브라우저에만 저장됩니다. 회사 모드는 실제 회사 권한과 DB를 사용하며, 일반 고객 가입·초대 전체 흐름은 추가 검증이 필요합니다.','이미지 시안 검수 중심입니다. 임의 웹사이트 URL 자동 검수·계약 전자서명·자동 청구는 제공하지 않습니다.','구독 결제·메일 알림·권한 회수와 운영 복구 등의 상용 운영 보완이 남아 있습니다.']),
'follonote':dict(name='Follonote',ko='팔로노트',tag='고객 정보 · 상담 기록 · 영업 진행 관리',summary='고객과 나눈 이야기부터 다음 연락까지, 영업 담당자의 다음 행동을 분명하게 만드세요.',url='https://flownote-studio.vercel.app/follonote/workspace/',steps=['고객 관리에서 고객과 담당자 정보를 등록합니다.','영업기회에 금액·목표일·현재 단계를 입력합니다.','상담 기록을 남기고 다음 연락 날짜를 확인합니다.'],screens=[
 ('dash','영업 현황','진행 중인 기회와 오늘의 연락을 확인합니다.',['등록 고객 수와 진행 중인 기회를 확인하세요.','입력 기회 금액은 확정 매출·수금·이익이나 예측 매출이 아닙니다.','오늘 연락할 내용을 살펴보고 실제 연락 후 완료 표시합니다.']),
 ('contacts','고객 관리','고객별 맥락을 기록합니다.',['고객 회사를 선택하면 담당자·연락처·유입 경로와 메모를 확인합니다.','정보 수정으로 연락 정보를 고치고 상담 기록을 추가하세요.','진행 중인 기회가 있으면 고객 보관이 제한됩니다.']),
 ('deals','영업 파이프라인','기회의 현재 단계를 구분합니다.',['고객과 연결한 영업기회를 만들고 입력 금액·목표일을 정하세요.','신규·상담·제안·협상·수주·종료 단계를 직접 변경합니다.','수주 표시는 영업 상태 기록이며 자동 결제나 입금 확인이 아닙니다.']),
 ('followups','후속 연락','다음에 할 연락을 놓치지 않도록 기록합니다.',['고객과 연락할 내용·날짜를 등록하세요.','연락이 끝난 뒤 완료 버튼을 누릅니다.','이메일·문자 알림은 자동 발송하지 않으며 일정 수정·취소는 보완 예정입니다.'])],limits=['브라우저 체험과 회사 공유 모드를 구분합니다. 샘플 담당자 전환은 권한 흐름 시연입니다.','회사·팀 권한과 체험 기간은 AgencyFlow 기반 회사 공간을 함께 사용합니다. 제품별 독립 체험이 아닙니다.','등록 한도·권한 회수·대량 조회·반출·후속 연락 수정 등 상용 운영 보완이 남아 있습니다.']),
'crewmemo':dict(name='Crewmemo',ko='크루메모',tag='팀 공지 · 공유 일정 · 내부 결재 · 담당 업무',summary='메신저에 묻힌 소식과 구두로 끝난 결정을 팀이 함께 확인할 수 있는 기록으로 남기세요.',url='https://flownote-studio.vercel.app/crewmemo/workspace/',steps=['오늘의 팀에서 공지·일정·내 업무를 확인합니다.','일정이나 담당 업무를 등록하고 상태를 공유합니다.','결재 요청은 다른 팀원을 지정해 검토·승인 또는 반려를 받습니다.'],screens=[
 ('dash','오늘의 팀','팀과 나에게 필요한 내용을 확인합니다.',['오늘 일정, 내 결재 대기, 미완료 업무를 살펴보세요.','팀 공지와 다가오는 일정은 등록 자료를 기준으로 표시됩니다.','샘플 담당자 전환은 실제 사용자를 초대하는 기능이 아닙니다.']),
 ('notices','공지 게시판','팀이 알아야 할 소식을 기록합니다.',['공지 작성에서 제목과 내용을 입력하세요.','관리자는 공지를 상단에 고정할 수 있습니다.','작성자 또는 관리자가 공지를 보관할 수 있습니다.']),
 ('calendar','팀 일정','회의와 공유 일정을 한곳에서 확인합니다.',['시작·종료 시각과 장소를 입력합니다.','종료 시각은 시작 시각 이후여야 합니다.','일정 내용 수정·취소와 외부 캘린더 동기화는 제공 범위에 포함되지 않습니다.']),
 ('approvals','내부 결재','서로 다른 사람이 요청과 검토를 맡습니다.',['작성자가 다른 내부 팀원을 결재자로 지정합니다.','지정 결재자만 대기 문서를 승인·반려할 수 있습니다.','처리된 문서를 다시 승인할 수 없습니다. 실제 지급이나 계약 전자서명은 실행하지 않습니다.']),
 ('tasks','팀 업무','담당자와 마감일을 명확히 합니다.',['업무 제목·담당자·기한·우선순위를 등록합니다.','대기·진행중·완료 상태를 직접 변경합니다.','업무 내용·담당자·기한 수정과 취소는 보완 예정입니다.'])],limits=['공지·일정·내부 결재·업무 공유에 집중하는 초기 검증판입니다. 급여·근태·회계·사내 메신저를 포함한 종합 그룹웨어는 아닙니다.','다른 결재자가 필요하므로 내부 구성원 2명 이상이 필요합니다. 공통 Lite 1좌석 정책과의 상품 조정이 남아 있습니다.','회사 모드는 공통 회사·체험 권한을 사용합니다. 가입 메일·결제·권한 회수·복구 등의 운영 보완이 남아 있습니다.'])}

def para(c,text,x,y,width=515,size=13,color=INK,bold=False):
    st=ParagraphStyle('p',parent=STYLE,fontName='PretendardBold' if bold else 'Pretendard',fontSize=size,leading=size*1.65,textColor=color)
    p=Paragraph(escape(text),st); _,height=p.wrap(width,1000);p.drawOn(c,x,y-height);return y-height-12

def logo(c,kind,x,y,size=36):
    c.saveState();c.translate(x,y);c.scale(size/64,size/64)
    c.setFillColor(HexColor('#ed7834') if kind=='enote' else GREEN);c.roundRect(2,2,60,60,17,fill=1,stroke=0)
    c.setStrokeColor(white);c.setLineWidth(3.5);c.setLineCap(1);c.setLineJoin(1)
    def line(points):
        p=c.beginPath();p.moveTo(*points[0]);[p.lineTo(*pt) for pt in points[1:]];c.drawPath(p)
    if kind=='flownote':line([(20,15),(20,49),(41,49),(48,42),(48,15),(20,15)]);line([(27,35),(41,35)]);line([(27,27),(37,27)])
    elif kind=='agencyflow':line([(18,47),(47,47),(47,22),(33,22),(21,13),(21,22),(18,22),(18,47)]);line([(27,38),(39,38)]);line([(27,31),(34,31)])
    elif kind=='follonote':line([(18,46),(18,17),(48,17)]);line([(24,25),(33,35),(40,31),(48,45)]);line([(39,45),(48,45),(48,36)])
    elif kind=='crewmemo':
        for xx,yy,rr in [(32,42,6),(19,35,4),(45,35,4)]:c.circle(xx,yy,rr,fill=0,stroke=1)
        line([(15,19),(15,25),(23,29),(32,26),(41,29),(49,25),(49,19)]);line([(24,17),(24,25),(40,25),(40,17)])
    else:line([(19,48),(47,48)]);line([(19,48),(19,15),(47,15)]);line([(19,32),(40,32)]);line([(39,40),(47,32),(39,24)])
    c.restoreState()

def shell(c,p,page,section):
    c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0);logo(c,p,40,H-66,30)
    c.setFillColor(INK);c.setFont('PretendardBold',12);c.drawString(82,H-47,products[p]['name'])
    c.setFillColor(MUTED);c.setFont('Pretendard',9);c.drawRightString(W-40,H-47,'ENOTE-LABS | 제품 소개 · 사용 가이드')
    c.setStrokeColor(LINE);c.line(40,43,W-40,43);c.setFont('Pretendard',9);c.drawString(40,27,'2026.10.30 · 초기 검증판 · 가상 자료 화면');c.drawRightString(W-40,27,f'{page:02d}')
    c.bookmarkPage('page'+str(page));c.addOutlineEntry(section,'page'+str(page),level=0,closed=False)

for key,p in products.items():
    path=OUT/(key+'-guide.pdf');c=canvas.Canvas(str(path),pagesize=(W,H));c.setTitle(p['name']+' 제품소개 및 사용 매뉴얼 | ENOTE-LABS');c.setAuthor('ENOTE-LABS (이노트랩스)')
    page=1;shell(c,key,page,'제품 소개');y=H-116;y=para(c,p['name'],40,y,size=35,bold=True);y=para(c,p['ko']+' | '+p['tag'],40,y,size=15,color=GREEN);y=para(c,p['summary'],40,y-10,size=19,bold=True)
    c.drawImage(str(SHOTS/(key+'-dash.jpg')),40,194,width=515,height=326,preserveAspectRatio=True,anchor='c',mask='auto')
    para(c,'실제 프로그램의 가상 샘플 화면입니다. 고객 실적이나 상용 전체 완성을 의미하지 않습니다.',40,166,size=12,color=MUTED)
    para(c,'목차: 제품 소개 / 시작하기 / 화면별 사용법 / 제공 범위와 도입 안내',40,96,size=12)
    c.showPage();page+=1;shell(c,key,page,'시작하기');y=H-110;y=para(c,'처음이라면, 이 순서대로.',40,y,size=25,bold=True)
    for i,step in enumerate(p['steps'],1):y=para(c,f'{i:02d}. {step}',40,y-20,size=16,bold=True)
    y=para(c,'샘플과 회사 모드',40,y-35,size=19,bold=True)
    y=para(c,('공개 대시보드는 가상 조회용입니다. 실제 자료의 저장·타인 검수·승인은 로컬 운영판 범위를 별도로 확인하세요.' if key=='flownote' else '샘플 입력은 현재 브라우저에만 저장됩니다. 회사 계정 모드는 실제 DB와 권한을 사용하며 일반 고객 가입·메일·운영 검증은 준비 중입니다.'),40,y)
    y=para(c,'실제 고객 개인정보나 민감한 파일은 공개 체험에 넣지 마세요. 모드 안내를 확인한 뒤 사용하세요.',40,y)
    y=para(c,'브라우저에서 체험하기',40,y-20,size=17,bold=True);y=para(c,p['url'],40,y,size=10,color=GREEN)
    c.linkURL(p['url'],(40,y,555,y+35),relative=0,thickness=0);c.showPage()
    for view,title,desc,steps in p['screens']:
        page+=1;shell(c,key,page,title);y=H-108;y=para(c,title,40,y,size=25,bold=True);para(c,desc,40,y,size=13,color=MUTED)
        shot=SHOTS/(key+'-'+view+'.jpg');c.setFillColor(BG);c.roundRect(36,306,523,334,12,fill=1,stroke=0)
        c.drawImage(str(shot),40,310,width=515,height=326,preserveAspectRatio=True,anchor='c',mask='auto')
        y=282
        for i,step in enumerate(steps,1):y=para(c,f'{i:02d}  {step}',40,y,size=13)
        para(c,'화면은 PDF를 확대해 확인할 수 있습니다. 버튼·메뉴 이름은 해당 샘플 기준입니다.',40,89,size=10,color=MUTED)
        c.showPage()
    page+=1;shell(c,key,page,'제공 범위와 도입 안내');y=H-112;y=para(c,'도입 전에 확인해 주세요.',40,y,size=25,bold=True)
    for item in p['limits']:y=para(c,item,40,y-15)
    y=para(c,'도입·교육·맞춤 구축',40,y-25,size=18,bold=True);y=para(c,'회사 업무와 필요한 기능을 확인한 뒤 도입 범위·기간·비용·지원 조건을 정합니다. 이 문서는 자동 결제나 계약 체결을 실행하지 않습니다.',40,y)
    y=para(c,'제품 자료는 2026년 10월 30일 구현 범위를 기준으로 작성했습니다. 준비 중인 기능을 완료 기능으로 안내하지 않습니다.',40,y,size=11,color=MUTED)
    y=para(c,'상담: ENOTE-LABS(이노트랩스) · 텔레그램 @evanlee97',40,y-20,size=13,bold=True);c.linkURL('https://t.me/evanlee97',(40,y,555,y+35),relative=0,thickness=0);c.showPage();c.save()
    assert len(PdfReader(path).pages)==len(p['screens'])+3
    target=PUBLIC/'manuals'/path.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,target)

# Draw the same identities for PNG favicons and social cards; rasterization is mechanical.
for kind in ['flownote','agencyflow','follonote','crewmemo','enote']:
    raw=io.BytesIO();cc=canvas.Canvas(raw,pagesize=(64,64));logo(cc,kind,0,0,64);cc.showPage();cc.save()
    doc=pdfium.PdfDocument(raw.getvalue());im=doc[0].render(scale=4).to_pil().convert('RGBA')
    for size in [32,180]:
        target=PUBLIC/'product-assets'/f'{kind}-{size}.png';im.resize((size,size),Image.Resampling.LANCZOS).save(target)
    if kind=='agencyflow':
        shutil.copyfile(PUBLIC/'product-assets/agencyflow-32.png',PUBLIC/'favicon-32.png');shutil.copyfile(PUBLIC/'product-assets/agencyflow-180.png',PUBLIC/'apple-touch-icon.png')
    if kind=='flownote':
        for size,name in [(32,'favicon-32.png'),(180,'apple-touch-icon.png')]:shutil.copyfile(PUBLIC/'product-assets'/f'{kind}-{size}.png',ROOT/'demos/weekly-report/assets'/name)
    raw=io.BytesIO();cc=canvas.Canvas(raw,pagesize=(1200,630));cc.setFillColor(white);cc.rect(0,0,1200,630,fill=1,stroke=0);logo(cc,kind,48,520,60)
    name='ENOTE-LABS(이노트랩스)' if kind=='enote' else products[kind]['name'];tag='회사에 맞는 업무 시스템' if kind=='enote' else products[kind]['tag']
    cc.setFillColor(INK);cc.setFont('PretendardBold',34);cc.drawString(130,540,name);cc.setFont('PretendardBold',44);cc.drawString(48,440,tag);cc.setFont('Pretendard',20);cc.setFillColor(MUTED);cc.drawString(48,390,'ENOTE-LABS · 실제 화면으로 살펴보는 제품과 업무 흐름')
    shot=SHOTS/(('flownote' if kind=='enote' else kind)+'-dash.jpg');cc.drawImage(str(shot),48,-350,width=1104,height=699,preserveAspectRatio=True,anchor='c');cc.showPage();cc.save();doc=pdfium.PdfDocument(raw.getvalue());img=doc[0].render(scale=1).to_pil().convert('RGB')
    target=(ROOT/'studio/assets/og-studio.png') if kind=='enote' else (PUBLIC/'og-agencyflow.png' if kind=='agencyflow' else PUBLIC/'product-assets'/f'{kind}-og.png');img.save(target)
    if kind=='flownote':img.save(ROOT/'demos/weekly-report/assets/og-image.jpg',quality=92)

for kind in products:
    shutil.copyfile(SHOTS/(kind+'-dash.jpg'),ROOT/'studio/assets'/(kind+'-screen.jpg'))
    if kind in ['follonote','crewmemo']:shutil.copyfile(SHOTS/(kind+'-dash.jpg'),PUBLIC/'product-assets'/(kind+'-screen.jpg'))

# Render every PDF page for mandatory visual review and text verification.
for path in OUT.glob('*-guide.pdf'):
    doc=pdfium.PdfDocument(str(path));pages=[]
    for i in range(len(doc)):
        image=doc[i].render(scale=0.65).to_pil().convert('RGB');image.save(TMP/f'{path.stem}-{i+1:02d}.png');pages.append(image)
    contact=Image.new('RGB',(pages[0].width*3,pages[0].height*((len(pages)+2)//3)), '#dddddd')
    for i,image in enumerate(pages):contact.paste(image,((i%3)*image.width,(i//3)*image.height))
    contact.save(TMP/(path.stem+'-contact.png'))
    text=''.join(p.extract_text() or '' for p in PdfReader(path).pages)
    assert 'ENOTE-LABS' in text and '가상' in text and '제공' in text
    print(path.name,len(doc),'pages',path.stat().st_size,'bytes')
