import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(specifier+'.ts',context);throw error;}}});
const { parseThaiDate, extractDeadline, inferLevels, parseFeed, feedToActivity, isOpportunity, safeURL } = await import('../lib/radar-parser.ts');
import { daysLeft, bangkokToday } from '../lib/radar-types.ts';

test('Thai dates convert Buddhist year and reject impossible or missing dates',()=>{
 assert.equal(parseThaiDate('14 ตุลาคม 2569'),'2026-10-14');
 assert.equal(parseThaiDate('๓๑ ต.ค. ๒๕๖๙'),'2026-10-31');
 assert.equal(parseThaiDate('31 กุมภาพันธ์ 2569'),null);
 assert.equal(parseThaiDate('14 ตุลาคม'),null);
});
test('deadline extraction does not turn event date into registration deadline',()=>{
 assert.equal(extractDeadline('รับสมัครถึง 31 ต.ค. 2569 จัดวันที่ 18 ธันวาคม 2569'),'2026-10-31');
 assert.equal(extractDeadline('จัดเมื่อไหร่ 18 ธันวาคม 2569'),null);
 assert.equal(extractDeadline('ปิดรับสมัคร 12 ต.ค. 2569 รับสมัครถึง 14 ต.ค. 2569'),null);
});
test('eligibility and news filtering keep lower secondary and holiday notices out',()=>{
 assert.deepEqual(inferLevels('นักเรียน ม.4–ม.6'),['ม.4','ม.5','ม.6']);
 assert.deepEqual(inferLevels('IJSO 2027 มัธยมศึกษาตอนต้น'),['ม.ต้น']);
 assert.deepEqual(inferLevels('เยาวชนที่สนใจ'),[]);
 assert.equal(isOpportunity('ประกาศวันหยุดราชการพิเศษ','แข่งขัน'),false);
 assert.equal(isOpportunity('ประกาศผลการแข่งขันคอมพิวเตอร์','รับสมัคร'),false);
 assert.equal(isOpportunity('ประกาศแนวปฏิบัติสำหรับผู้เข้าสอบการคัดเลือกเข้าค่าย 1 สอวน.','รับสมัคร'),false);
 assert.equal(isOpportunity('ประกาศมาตรการความปลอดภัยของสนามสอบค่ายโอลิมปิก','วิทยาศาสตร์'),false);
 assert.equal(isOpportunity('ค่ายนิติรัฐ นิติธรรม (นิติศาสตร์ รัฐศาสตร์)','เรียนรู้ Social Science'),false);
});
test('RSS CDATA, special characters and deterministic event identity',()=>{
 const xml='<rss><channel><item><title><![CDATA[AI &amp; Science Camp]]></title><link>https://www.camphub.in.th/test/</link><content:encoded><![CDATA[<p>รับนักเรียน ม.ปลาย รับสมัครถึง 14 ตุลาคม 2569</p>]]></content:encoded><category><![CDATA[คอม/ไอที]]></category><pubDate>Mon, 12 Oct 2026 05:00:00 GMT</pubDate></item></channel></rss>';
 const items=parseFeed(xml);assert.equal(items.length,1);assert.equal(items[0].title,'AI & Science Camp');
 const a=feedToActivity(items[0],'camphub','2026-10-12T05:00:00Z');
 assert.equal(a.deadline,'2026-10-14');assert.equal(a.needsReview,true);assert.equal(a.fee,null);assert.equal(a.startDate,null);
 assert.equal(a.id,feedToActivity(items[0],'camphub','2026-10-13T05:00:00Z').id);
 assert.throws(()=>parseFeed('<html>Access denied</html>'));
});
test('Bangkok midnight flips days left, not browser timezone',()=>{
 assert.equal(bangkokToday(new Date('2026-10-13T17:01:00Z')),'2026-10-14');
 assert.equal(daysLeft('2026-10-14',new Date('2026-10-13T17:01:00Z')),0);
 assert.equal(daysLeft('2026-10-14',new Date('2026-10-14T17:01:00Z')),-1);
 assert.equal(daysLeft(null),null);
});
test('outbound display URLs must be HTTPS without credentials',()=>{
 assert.equal(safeURL('javascript:alert(1)'),null);
 assert.equal(safeURL('https://user:secret@example.com'),null);
 assert.equal(safeURL('https://example.com/'),'https://example.com/');
});
