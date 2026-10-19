import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(specifier+'.ts',context);throw error;}}});
const {parseContestWarListing,parseContestWarDetail,contestWarDeadline,readContestWar,contestWarPages}=await import('../lib/radar-contestwar.ts');
const {feedToActivity,canonicalURL}=await import('../lib/radar-parser.ts');
const {allowedSourceURL}=await import('../lib/radar-sources.ts');
const {activityStatus}=await import('../lib/radar-types.ts');
const field=(name,body)=>`<div class="field field-name-${name}"><div class="field-items"><div class="field-item">${body}</div></div></div>`;
const node=(id,title,body,date)=>`<div id="node-${id}" class="node node-contest"><h2><a href="/contest/${id}">${title}</a></h2><span class="submitted">Submitted by <span class="username">mod</span> on Tue, 2026-03-17 12:30</span><div class="content clearfix">${field('body',body)}${field('field-date',date)}</div></div>`;
const one=node(18094,'แข่งขัน CANSAT 2026','หน่วยงานตัวอย่าง ขอเชิญนักเรียน ม.4–6 แข่งขันนวัตกรรม จัดวันที่ 14 มิถุนายน 2569','<span class="date-display-start">04 Mar 2026 00:00</span> to <span class="date-display-end">31 Mar 2026 10:00</span>');

test('scoped listing fields cannot borrow the next event or sidebar eligibility',()=>{
 const two=node(18095,'ประกวดแอนิเมชัน','ผู้สนใจส่งผลงาน','<span class="date-display-single">Thu, 2026-04-30 17:00</span>');
 const items=parseContestWarListing(one+two+'<aside>รับ ม.4 ปิดรับสมัคร 31 ธันวาคม 2570</aside>','http://contestwar.com/eligibility-3');
 assert.equal(items.length,2);assert.equal(items[0].deadline,'2026-03-31');assert.equal(items[1].deadline,'2026-04-30');
 assert.equal(items[0].publishedAt,'2026-03-17T00:00:00+07:00');
 const a=feedToActivity(items[1],'contestwar','2026-10-13T07:00:00Z');
 assert.equal(a.category,'creative');assert.deepEqual(a.levels,[]);assert.equal(activityStatus(a,new Date('2026-10-13T07:00:00Z')),'closed');
 assert.equal(contestWarDeadline(field('field-date','<span class="date-display-single">31 Feb 2026</span>')),null);
});
test('public HTTP is confined to Contest War and URL identities merge HTTPS, www and tracking',()=>{
 assert.ok(allowedSourceURL('http://contestwar.com/contest/18094'));
 for(const url of ['http://example.com/','http://contestwar.com.evil.test/','http://user:pass@contestwar.com/','http://contestwar.com:8080/','https://127.0.0.1/'])assert.equal(allowedSourceURL(url),false,url);
 assert.equal(canonicalURL('https://www.contestwar.com/contest/18094/?utm_source=test#comments'),'http://contestwar.com/contest/18094');
});
test('detail parser retains a safe official link and registration end, not the event day',()=>{
 const withOfficial=one.replace('<div class="content clearfix">','<div class="content clearfix">'+field('field-contest-url','<a href="https://www.nsm.or.th/nsm/th/node/8040">รายละเอียด</a>'));
 const item=parseContestWarListing(one,'http://contestwar.com/')[0];
 const parsed=parseContestWarDetail(withOfficial,item);
 assert.equal(parsed.deadline,'2026-03-31');assert.equal(parsed.organizer,'หน่วยงานตัวอย่าง');assert.equal(parsed.officialURL,'https://www.nsm.or.th/nsm/th/node/8040');assert.equal(parsed.detailsRead,true);
 assert.throws(()=>parseContestWarListing('<h1>Access denied</h1>','http://contestwar.com/'));
});
test('multiple category pages deduplicate events, rotate details and report partial failures',async()=>{
 const checks=new Map([['http://contestwar.com/contest/18094','2026-10-12T00:00:00Z']]);
 const two=node(18095,'ประกวด Animation 2026','สมัครส่งผลงานแอนิเมชัน','<span class="date-display-single">Thu, 2026-04-30 17:00</span>');
 const calls=[];
 const result=await readContestWar(async url=>{calls.push(url);if(url.includes('page=2'))throw Error('timeout');return url.includes('/contest/')?(url.endsWith('18095')?two:one):one+two;},{now:new Date('2026-10-13'),detailsChecked:checks});
 assert.equal(result.items.length,2);assert.equal(result.warnings.length,1);
 assert.equal(calls[contestWarPages.length],'http://contestwar.com/contest/18095');
 await assert.rejects(readContestWar(async()=>{throw Error('offline');}),/ทุกหน้า/);
});
