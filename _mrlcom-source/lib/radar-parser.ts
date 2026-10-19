import type { Activity, Category } from './radar-types';
import { submissionFormats } from './radar-formats';
export function plainText(value:string) {
 return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')
 .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(Math.min(parseInt(h,16),0x10ffff))).replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(Math.min(+d,0x10ffff)))
 .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
function tag(item:string,name:string){return item.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'';}
export function parseFeed(xml:string){
 if(!/<rss[\s>]|<feed[\s>]/i.test(xml))throw new Error('แหล่งข้อมูลไม่ได้ส่ง RSS ที่อ่านได้');
 return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,30).map(m=>({
 title:plainText(tag(m[1],'title')),url:plainText(tag(m[1],'link')),text:plainText(tag(m[1],'content:encoded')||tag(m[1],'description')),
 publishedAt:tag(m[1],'pubDate'),categories:[...m[1].matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)].map(x=>plainText(x[1])),
 })).filter(x=>x.title&&/^https:\/\//.test(x.url));
}
const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const short=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
export function parseThaiDate(text:string):string|null{
 const normalized=text.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-3664));
 const m=normalized.match(/(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(?:พ\.ศ\.\s*)?(\d{4})/);
 if(!m)return null;let year=+m[3];if(year>2400)year-=543;
 const month=Math.max(months.indexOf(m[2]),short.indexOf(m[2]))+1;
 const result=`${year}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
 const date=new Date(result+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===result?result:null;
}
export function extractDeadline(text:string):string|null{
 const normalized=text.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-3664));
 const dates:string[]=[];
 const direct=/(?:(?<!เ)ปิดรับสมัคร(?:วันที่)?|รับสมัคร[^.!]{0,100}?(?:จน)?ถึง(?:วันที่)?|รับสมัครถึง(?:วันที่)?|สมัครได้ถึง(?:วันที่)?|หมดเขต(?:รับ)?สมัคร(?:วันที่)?)/g;
 for(const m of normalized.matchAll(direct)){
  const tail=normalized.slice((m.index??0)+m[0].length,(m.index??0)+m[0].length+65);
  if(/^\s*[:：]?\s*(?:วันที่\s*)?\d{1,2}\s/.test(tail)){const d=parseThaiDate(tail);if(d)dates.push(d);}
 }
 // Only registration-labelled ranges, never an unlabeled event date.
 const ranges=/(?:เปิดรับสมัคร(?:และส่งผลงาน)?|รับสมัครตั้งแต่|สร้างรหัสข้อเสนอโครงการได้ตั้งแต่วันนี้)/g;
 for(const m of normalized.matchAll(ranges)){
  const tail=normalized.slice((m.index??0)+m[0].length,(m.index??0)+m[0].length+110);
  const range=tail.match(/^\s*[:：]?\s*(?:ตั้งแต่(?:วันที่)?|วันที่|วันนี้)?\s*(?:\d{1,2}[^\d–—-]{0,20}(?:\d{4})?\s*)?[–—-]\s*(\d{1,2}\s*[^\d]{2,12}\s*\d{4})/);
  if(range){const d=parseThaiDate(range[1]);if(d)dates.push(d);}
 }
 return new Set(dates).size===1?dates[0]:null;
}
export function safeURL(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function canonicalURL(url:string){const u=new URL(url);if(['contestwar.com','www.contestwar.com'].includes(u.hostname)){u.protocol='http:';u.hostname='contestwar.com';if(/^\/contest\/\d+\/?$/.test(u.pathname)){u.pathname=u.pathname.replace(/\/$/,'');u.search='';}}if(!(u.hostname==='www.mathassociation.or.th'&&u.hash.startsWith('#h.')))u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);return u.href;}
export function classify(text:string):Category|null{
 if(/ภาษาอังกฤษ|ภาษาจีน|ภาษาญี่ปุ่น|ภาษาเกาหลี|ภาษาไทย|ภาษาฝรั่งเศส|ภาษาต่างประเทศ|ภาษาศาสตร์|มนุษยศาสตร์|อักษรศาสตร์|สุนทรพจน์|โต้วาที|debate|speech|spelling\s*bee/i.test(text))return 'language';
 // The submitted work can be creative even when its theme is AI or science.
 if(/คลิป|วิดีโอ|วีดีโอ|วีดิทัศน์|ภาพถ่าย|ถ่ายภาพ|ภาพยนตร์|หนังสั้น|หนังโฆษณา|ละครสั้น|แอนิเมชัน|แอนิเมชั่น|animation|infographic|กราฟิก|กราฟฟิก|วาดภาพ|ออกแบบตรา|ผลงานสร้างสรรค์|ประกวดสื่อ|ประลองสื่อ|tiktok|cosplay|design\s*lab|designer\s*awards|งานเขียน|เรื่องสั้น|ดนตรี|ร้องเพลง/i.test(text))return 'creative';
 if(/คอมพิวเตอร์|programming|coding|artificial intelligence|\bAI\b|ไอที|data\s*(science|hub)|digital|ดิจิทัล/i.test(text))return 'computer';
 if(/วิศว|engineering|robot|หุ่นยนต์|hackathon|นวัตกรรม|สิ่งประดิษฐ์|medihack|cansat|cubesat/i.test(text))return 'engineering';
 if(/คณิตศาสตร์|mathematics|math\b/i.test(text))return 'math';
 if(/วิทยาศาสตร์|science|ฟิสิกส์|เคมี|ชีววิทยา|ดาราศาสตร์|เภสัช|แพทย์แผนไทย/i.test(text))return 'science';
 if(/animation|แอนิเมชัน|แอนิเมชั่น|infographic|กราฟิก|กราฟฟิก|ออกแบบ|วาดภาพ|ศิลปกรรม|ภาพถ่าย|คลิป|ภาพยนตร์|หนังสั้น|งานเขียน|เรื่องสั้น|ดนตรี|ร้องเพลง/i.test(text))return 'creative';return null;
}
export function isOpportunity(title:string,text:string){
 if(/รับสมัครร้านค้า|วิดีโอบันทึก|สถิติการแข่งขัน|เกียรติบัตร|คู่มือ|รอบชิงชนะเลิศ|รอบนำเสนอ|รอบข้อเสนอ|พิธีมอบรางวัล|เลื่อนพิธี|ดาวน์โหลดบัตร|ประกาศคะแนน|ขอแสดงความยินดี|วันหยุด|ปิดทำการ|ประกาศผล|ประกาศรายชื่อ|ผลการแข่งขัน|ภาพบรรยากาศ|สรรหา.*ครู|รับรางวัล|สรุปผล|มาตรการความปลอดภัย|แนวปฏิบัติสำหรับ|หนังสือรับรอง/.test(title))return false;
 if(/นิติศาสตร์|นิติรัฐ|รัฐศาสตร์|บัญชี|ศิลปะการแสดง|การท่องเที่ยว|ภาษาจีน|ภาษาอังกฤษ/.test(title)&&!classify(title))return false;
 return /รับสมัคร|ค่าย|แข่งขัน|ประกวด|ชิงเงินรางวัล|ส่งผลงาน|hackathon|camp|challenge|contest|workshop|เวิร์กช็อป/i.test(title+' '+text.slice(0,500));
}
export function inferLevels(text:string){
 const levels=new Set<string>();
 if(/มัธยมศึกษาตอนปลาย|ม\.\s*ปลาย/.test(text))for(const n of [4,5,6])levels.add('ม.'+n);
 const normalized=text.replace(/มัธยมศึกษา(?:ปีที่)?\s*/g,'ม.');
 for(const m of normalized.matchAll(/ม\.\s*([1-6])\s*(?:[–—-]|ถึง)\s*(?:ม\.\s*)?([1-6])/g))for(let n=+m[1];n<=+m[2];n++)levels.add('ม.'+n);
 if(levels.size)return [...levels];
 if(/มัธยมศึกษาตอนต้น|ม\.\s*ต้น|IJSO/i.test(text))return ['ม.ต้น'];
 for(const m of normalized.matchAll(/ม\.\s*([1-6])(?!\d)/g))levels.add('ม.'+m[1]);
 return [...levels];
}
export function hashString(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
export function feedToActivity(item:ReturnType<typeof parseFeed>[number]&{deadline?:string|null;organizer?:string;officialURL?:string|null;detailsRead?:boolean;eligibility?:string},source:string,now:string):Activity|null{
 const combined=item.title+' '+item.categories.join(' ')+' '+item.text;const category=classify(item.title+' '+item.categories.join(' '))||classify(item.text.slice(0,500));
 if(!category||!isOpportunity(item.title,item.categories.join(' ')+' '+item.text))return null;
 const published=Date.parse(item.publishedAt);const feeMatch=item.text.match(/(?:ค่าใช้จ่าย|ค่าสมัคร)\s*[:：]?\s*([\d,]+)\s*บาท/);
 return {id:'auto-'+hashString(canonicalURL(item.url)),title:item.title,organizer:item.organizer||(source==='posn'?'สอวน. · ดูผู้จัดในประกาศ':'ดูผู้จัดในประกาศต้นทาง'),source,url:canonicalURL(item.url),category,
 kind:/ค่าย|camp/i.test(item.title)?'camp':/workshop|เวิร์กช็อป|อบรม/i.test(item.title)?'workshop':'competition',summary:item.text.slice(0,280)+(item.text.length>280?'…':''),
 levels:inferLevels(item.eligibility??combined),deadline:item.deadline===undefined?extractDeadline(item.text):item.deadline,startDate:null,endDate:null,fee:feeMatch?Number(feeMatch[1].replaceAll(',','')):null,
 feeNote:feeMatch?'ตามข้อความที่อ่านได้จากประกาศ':'ตรวจสอบค่าใช้จ่ายในประกาศ',location:'ดูสถานที่ในประกาศ',area:'unknown',team:'ตรวจสอบจำนวนสมาชิกกับผู้จัด',tags:item.categories.slice(0,3),
 reviewed:false,needsReview:true,checkedAt:now,fetchedAt:now,publishedAt:Number.isFinite(published)?new Date(published).toISOString():null,
 formats:submissionFormats(item.title,combined),officialURL:item.officialURL??null,detailsCheckedAt:item.detailsRead?now:null};
}
