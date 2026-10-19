import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(specifier+'.ts',context);throw error;}}});
const {parseCamphubDetail,readCamphub,camphubFeeds}=await import('../lib/radar-camphub.ts');
const {feedToActivity,classify}=await import('../lib/radar-parser.ts');
const {activityFormats}=await import('../lib/radar-formats.ts');
const {activityStatus}=await import('../lib/radar-types.ts');
const item={title:'ประกวดคลิป AI เพื่อวิทยาศาสตร์',url:'https://www.camphub.in.th/example/',text:'ส่งผลงานคลิปสั้นและ infographic',publishedAt:'2026-10-01',categories:['ผลงานสร้างสรรค์']};
const panel=(date='2026-10-31')=>`<div class="chv2"><div class="byline">จัดโดย <b>ผู้จัดตัวอย่าง</b></div><div class="dl" data-regto="${date}"><span>วันที่จัด 15 ธันวาคม 2569</span></div><div class="fact"><div><div class="fk">ใครสมัครได้</div><div class="fv"><b>ม.4-ม.6</b></div></div></div></div>`;

test('creative submissions retain theme-independent formats and reviewed date/eligibility scope',()=>{
 const parsed=parseCamphubDetail(panel()+'<aside><div data-regto="2027-02-15">ม.ต้น</div></aside>',item);
 const a=feedToActivity(parsed,'camphub','2026-10-14T00:00:00Z');
 assert.equal(a.category,'creative');assert.equal(a.deadline,'2026-10-31');assert.deepEqual(a.levels,['ม.4','ม.5','ม.6']);
 assert.equal(a.organizer,'ผู้จัดตัวอย่าง');assert.deepEqual(activityFormats(a),['video']);
 assert.equal(activityStatus(a,new Date('2026-10-14')),'open');
 assert.equal(classify('แข่งขันออกแบบหุ่นยนต์'),'engineering');
 assert.equal(feedToActivity({...item,title:'ประกาศผลประกวดคลิป'},'camphub','2026-10-14'),null);
 const music=feedToActivity({...item,title:'ประกวดวงดนตรี',text:'ส่งคลิปวิดีโอเพื่อคัดเลือกรอบแรก'},'camphub','2026-10-14');
 assert.deepEqual(activityFormats(music),['performance']);
 const multiple=feedToActivity({...item,title:'Teen Club challenge',text:'ประกวดคลิปสั้นและ infographic'},'camphub','2026-10-14');
 assert.deepEqual(activityFormats(multiple),['video','design']);
});
test('missing or impossible deadlines remain unknown and archived media stays closed',()=>{
 const unknown=feedToActivity(parseCamphubDetail(panel('2026-02-31'),item),'camphub','2026-10-14');
 assert.equal(unknown.deadline,null);assert.equal(activityStatus(unknown),'unknown');
 const old=feedToActivity(parseCamphubDetail(panel('2026-03-01'),item),'camphub','2026-10-14');
 assert.equal(activityStatus(old,new Date('2026-10-14')),'closed');
 assert.throws(()=>parseCamphubDetail('<aside data-regto="2027-02-15">ม.4</aside>',item));
});
test('multiple feeds deduplicate activity URLs and tolerate feed/detail failures',async()=>{
 const xml=`<rss><channel><item><title>${item.title}</title><link>${item.url}</link><description>${item.text}</description><category>ผลงานสร้างสรรค์</category></item></channel></rss>`;
 const result=await readCamphub(async url=>{if(url===camphubFeeds[0])throw Error('timeout');return url===item.url?panel():xml;});
 assert.equal(result.items.length,1);assert.equal(result.scanned,2);assert.equal(result.warnings.length,1);assert.equal(result.items[0].deadline,'2026-10-31');
 const partial=await readCamphub(async url=>{if(url===item.url)throw Error('timeout');return xml;});
 assert.equal(partial.items.length,1);assert.equal(partial.items[0].deadline,undefined);assert.equal(partial.warnings.length,1);
 await assert.rejects(readCamphub(async()=>{throw Error('offline');}));
});
