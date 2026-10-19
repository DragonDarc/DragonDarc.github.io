import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(specifier+'.ts',context);throw error;}}});
const {parseNSM,parseMathAnnouncements,parseNSCPosts,parseHeadingNews,articleText,readSource}=await import('../lib/radar-source-reader.ts');
const {extractDeadline,canonicalURL,feedToActivity,inferLevels}=await import('../lib/radar-parser.ts');
const {sourceDefinitions,allowedSourceURL,sourceState}=await import('../lib/radar-sources.ts');

test('registration ranges use the end date and distinguish project creation from submission',()=>{
 assert.equal(extractDeadline('เปิดรับสมัคร: 20 สิงหาคม – 15 กันยายน 2569 วันสอบ 1 พฤศจิกายน 2569'),'2026-09-15');
 assert.equal(extractDeadline('เปิดรับสมัครและส่งผลงาน ตั้งแต่วันที่ 8 ตุลาคม – 30 ธันวาคม 2569'),'2026-12-30');
 assert.equal(extractDeadline('เปิดรับสมัคร 6–25 ตุลาคม 2569'),'2026-10-25');
 assert.equal(extractDeadline('สมัครและสร้างรหัสข้อเสนอโครงการได้ตั้งแต่วันนี้ – 25 สิงหาคม 2569 ส่งข้อเสนอได้จนถึงวันที่ 10 กันยายน 2569'),'2026-08-25');
 assert.equal(extractDeadline('เปิดรับสมัครนักเรียนที่สนใจสอบแข่งขัน ตั้งแต่วันนี้จนถึงวันที่ 30 กันยายน 2568'),'2025-09-30');
 assert.equal(extractDeadline('จัดกิจกรรม 20 สิงหาคม – 15 กันยายน 2569'),null);
});
test('separate announcements on the same Google Sites page retain their identities',()=>{
 const html='<h1 id="h.one">การสอบแข่งขันคณิตศาสตร์ 2569</h1><p>เปิดรับสมัคร: 20 สิงหาคม – 15 กันยายน 2569 มัธยมศึกษาตอนปลาย</p><h1 id="h.two">การประกวดโครงงานคณิตศาสตร์ 2569</h1><p>รับสมัครถึง 31 สิงหาคม 2569</p><h1 id="h.results">ประกาศผลการสอบแข่งขันคณิตศาสตร์</h1><p>เปิดรับสมัคร</p>';
 const items=parseMathAnnouncements(html,'https://www.mathassociation.or.th/home');
 assert.equal(items.length,2);
 assert.notEqual(canonicalURL(items[0].url),canonicalURL(items[1].url));
 assert.equal(feedToActivity(items[0],'mathassociation','2026-10-13T05:00:00Z').deadline,'2026-09-15');
 assert.equal(canonicalURL('https://contestwar.com/test?utm_source=x#top'),'http://contestwar.com/test');
});
test('NSM listing dates are not guessed to be registration deadlines',()=>{
 const html='<div class="views-col col-1"><span class="date-scihall-display">30/12/2026</span><div class="link-science-hall"><a href="/th/node/123">ประกวดวิทยาศาสตร์</a></div><p>เยาวชนร่วมประกวด</p></div>';
 const [item]=parseNSM(html,'https://curiosity.nsm.or.th/th/science-hall-contest');
 assert.equal(item.url,'https://curiosity.nsm.or.th/th/node/123');
 assert.equal(extractDeadline(item.text),null);
 assert.ok(!item.text.includes('col-1'));
 assert.equal(articleText('<nav>ม.ปลาย</nav><article><h1>ค่าย</h1><p>เฉพาะ ม.ต้น</p></article>'),'ค่าย เฉพาะ ม.ต้น');
});
test('school ranges include only stated years',()=>{
 assert.ok(inferLevels('มัธยมศึกษาปีที่ 2 – 6').includes('ม.4'));
 assert.deepEqual(inferLevels('รับนักเรียน ม.5–6'),['ม.5','ม.6']);
 assert.deepEqual(inferLevels('สำหรับ ม.4'),['ม.4']);
});
test('NSC reader excludes unrelated and results posts returned by broad CMS search',()=>{
 const raw=JSON.stringify([
  {title:{rendered:'Asian Science Camp'},content:{rendered:'<style>.NSC{}</style>เปิดรับสมัครวิทยาศาสตร์'},link:'https://www.nstda.or.th/ssh/asc/'},
  {title:{rendered:'เปิดรับสมัคร NSC 2027'},content:{rendered:'แข่งขันพัฒนาโปรแกรม รับสมัครถึง 31 มกราคม 2570'},link:'https://www.nstda.or.th/ssh/nsc/'},
  {title:{rendered:'ประกาศผล NSC 2026'},content:{rendered:'ประกาศผลการแข่งขัน'},link:'https://www.nstda.or.th/ssh/results/'}]);
 assert.equal(parseNSCPosts(raw).length,1);assert.throws(()=>parseNSCPosts('{"code":"denied"}'));
});
test('source state keeps history while refreshing registry metadata and validates outgoing hosts',()=>{
 const def=sourceDefinitions.find(s=>s.id==='nsc');
 const merged=sourceState(def,{...def,url:'https://www.nstda.or.th/nsc/',lastSuccess:'2026-10-12T00:00:00Z'});
 assert.equal(merged.url,def.url);assert.equal(merged.lastSuccess,'2026-10-12T00:00:00Z');
 assert.ok(allowedSourceURL(def.readURL));assert.equal(allowedSourceURL('https://127.0.0.1/'),false);
 assert.equal(allowedSourceURL('https://user:secret@www.nstda.or.th/'),false);
 assert.equal(allowedSourceURL('https://www.nstda.or.th:8443/'),false);
});
test('an unavailable source fails explicitly, and a detail failure retains only unverified listing text',async()=>{
 const source=sourceDefinitions.find(s=>s.id==='nsm');
 await assert.rejects(readSource(source,async()=>{throw Error('timeout');}),/timeout/);
 const listing='<div class="views-col col-1"><div class="link-science-hall"><a href="/th/node/12">ประกวดโครงงานวิทยาศาสตร์</a></div><p>รับสมัครผู้สนใจ</p></div>';
 const r=await readSource(source,async url=>{if(url===source.url)return listing;throw Error('timeout');});
 assert.equal(r.items.length,1);assert.equal(r.warnings.length,1);
 const a=feedToActivity(r.items[0],source.id,'2026-10-13T05:00:00Z');
 assert.equal(a.deadline,null);assert.equal(a.needsReview,true);assert.deepEqual(a.levels,[]);
});


test('university listings support links around or outside headings without importing results or vendor notices',()=>{
 const html='<h1>สัปดาห์วิทยาศาสตร์</h1><a href="/math-project/"><h3>การประกวดโครงงานคณิตศาสตร์</h3></a><div><a href="/science-project/">การประกวดโครงงานวิทยาศาสตร์</a></div><h3><a href="/result/">ประกาศผลการแข่งขันวิทยาศาสตร์</a></h3><a href="/vendors/">เปิดรับสมัครร้านค้างานสัปดาห์วิทยาศาสตร์</a>';
 const items=parseHeadingNews(html,'https://sciweek.sci.psu.ac.th/',['วิทยาศาสตร์']);
 assert.equal(items.length,2);assert.ok(items.some(i=>i.url.endsWith('/math-project/')));
 assert.throws(()=>parseHeadingNews('<h1>Access denied</h1>','https://sciweek.sci.psu.ac.th/'));
 assert.equal(extractDeadline('ขยายเวลารับสมัครประกวดเรื่องสั้นวิทยาศาสตร์ ถึง 26 มิถุนายน 2569'),'2026-06-26');
});
