import { canonicalURL, classify, parseFeed, plainText } from './radar-parser';
import type { NewsItem } from './radar-source-reader';

export const camphubFeeds=[
 'https://www.camphub.in.th/feed/',
 'https://www.camphub.in.th/contest/feed/',
 'https://www.camphub.in.th/tag/contest-creative/feed/',
];
// Keep the activity's facts separate from recommended cards and page navigation.
function activityPanel(html:string){
 const start=html.search(/<div\b[^>]*class=["']chv2["'][^>]*>/i);
 if(start<0)throw new Error('ไม่พบส่วนข้อมูลกิจกรรม CAMPHUB');
 let depth=0;
 for(const tag of html.slice(start).matchAll(/<\/?div\b[^>]*>/gi)){
  depth+=tag[0].startsWith('</')?-1:1;
  if(depth===0)return html.slice(start,start+(tag.index??0)+tag[0].length);
 }
 throw new Error('ส่วนข้อมูลกิจกรรม CAMPHUB ไม่ครบ');
}
export function parseCamphubDetail(html:string,item:NewsItem):NewsItem{
 const panel=activityPanel(html);
 const rawDate=panel.match(/\bdata-regto=["'](\d{4}-\d{2}-\d{2})["']/)?.[1];
 let deadline:string|null=null;
 if(rawDate){const date=new Date(rawDate+'T12:00:00Z');if(Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===rawDate)deadline=rawDate;}
 const eligibility=panel.match(/<div\b[^>]*class=["']fk["'][^>]*>\s*ใครสมัครได้\s*<\/div>\s*<div\b[^>]*class=["']fv["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
 const organizer=panel.match(/<div\b[^>]*class=["']byline["'][^>]*>\s*จัดโดย\s*<b[^>]*>([\s\S]*?)<\/b>/i)?.[1];
 return {...item,...(deadline?{deadline}:{}),...(eligibility?{eligibility:plainText(eligibility)}:{}),...(organizer?{organizer:plainText(organizer)}:{}),detailsRead:true};
}
export async function readCamphub(fetchPage:(url:string)=>Promise<string>,options:{detailsChecked?:Map<string,string|null>}={}){
 const warnings:string[]=[];let scanned=0;const byURL=new Map<string,NewsItem>();
 const feeds=await Promise.allSettled(camphubFeeds.map(async url=>parseFeed(await fetchPage(url))));
 if(feeds.every(r=>r.status==='rejected'))throw new Error('อ่านฟีด CAMPHUB ไม่สำเร็จทุกช่องทาง');
 feeds.forEach((result,i)=>{
  if(result.status==='rejected'){warnings.push('อ่านฟีด '+(i===0?'ข่าวรวม':i===1?'ประกวดแข่งขัน':'ผลงานสร้างสรรค์')+' ไม่สำเร็จ');return;}
  scanned+=result.value.length;
  for(const item of result.value){
   const url=canonicalURL(item.url);const prior=byURL.get(url);
   byURL.set(url,prior?{...prior,categories:[...new Set([...prior.categories,...item.categories])]}:item);
  }
 });
 const items=[...byURL.values()];
 const candidates=items.filter(i=>classify(i.title+' '+i.categories.join(' '))==='creative')
  .sort((a,b)=>(options.detailsChecked?.get(a.url)??'').localeCompare(options.detailsChecked?.get(b.url)??''))
  .slice(0,8);
 const details=await Promise.allSettled(candidates.map(async item=>parseCamphubDetail(await fetchPage(item.url),item)));
 details.forEach((result,i)=>{
  if(result.status==='fulfilled')items[items.indexOf(candidates[i])]=result.value;
  else warnings.push('อ่านรายละเอียดงานสร้างสรรค์ไม่ได้ 1 รายการ');
 });
 return {items,scanned,warnings};
}
