import type { SourceDefinition } from './radar-sources';
import { canonicalURL, plainText, parseFeed, isOpportunity, classify } from './radar-parser';
import { readContestWar, contestWarArticleText } from './radar-contestwar';
import { readCamphub } from './radar-camphub';

export type NewsItem={title:string;url:string;text:string;publishedAt:string;categories:string[];deadline?:string|null;organizer?:string;officialURL?:string|null;detailsRead?:boolean;eligibility?:string};
type FetchPage=(url:string)=>Promise<string>;
const anchor=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const headings=/<h[1-3]\b([^>]*)>([\s\S]*?)<\/h[1-3]>/gi;
export function articleText(html:string){
 if(/\bclass=["'][^"']*\bnode-contest\b/.test(html))return contestWarArticleText(html);
 const article=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
 const start=html.search(/<div\b[^>]*data-elementor-type=["']wp-page["']/i);
 const text=plainText(article??main??(start>=0?html.slice(start).split(/<footer\b/i)[0]:html));
 const body=text.indexOf(' Body ');return text.includes('Start Date เริ่มต้น')&&body>=0?text.slice(body+6):text;
}
function resolveURL(path:string,base:string){try{const u=new URL(plainText(path),base);return u.protocol==='https:'&&u.hostname===new URL(base).hostname&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function parseNSM(html:string,base:string):NewsItem[]{
 const blocks=html.split(/<div\b[^>]*class=["']views-col\s/i).slice(1);
 if(!blocks.length)throw new Error('ไม่พบรายการประกวดในรูปแบบที่รองรับ');
 return blocks.flatMap(block=>{
  const m=block.match(/class=["'][^"']*link-science-hall[^"']*["'][^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  const url=m&&resolveURL(m[1],base);if(!m||!url)return [];
  return [{title:plainText(m[2]),url,text:plainText('<div class="views-col '+block).slice(0,5000),publishedAt:'',categories:['วิทยาศาสตร์']}];
 }).slice(0,12);
}
export function parseMathAnnouncements(html:string,base:string):NewsItem[]{
 const hs=[...html.matchAll(headings)];
 if(!hs.some(h=>/คณิตศาสตร์/.test(plainText(h[2]))))throw new Error('ไม่พบหัวข้อประกาศของสมาคม');
 return hs.flatMap((h,i)=>{
  const title=plainText(h[2]);const text=plainText(html.slice((h.index??0)+h[0].length,hs[i+1]?.index??html.length));
  if(!/สอบแข่งขัน|ประกวดโครงงาน/.test(title)||!isOpportunity(title,text)||!/รับสมัคร/.test(text))return [];
  const id=h[1].match(/\bid=["']([^"']+)["']/)?.[1];if(!id)return [];
  return [{title,url:base+'#'+id,text:text.slice(0,9000),publishedAt:'',categories:['คณิตศาสตร์']}];
 }).slice(0,6);
}
export function parseHeadingNews(html:string,base:string,categories:string[]=[]):NewsItem[]{
 if(!/<h[1-6]\b/i.test(html)||/just a moment|checking your browser|access denied|verify you are human/i.test(plainText(html).slice(0,250)))throw new Error('ไม่พบหน้าข่าวที่อ่านได้');
 const links=[...html.matchAll(anchor)];
 const items=links.flatMap((a,i)=>{
  const url=resolveURL(a[1],base);const title=plainText(a[2]);
  if(!url||title.length<12||new URL(url).pathname===new URL(base).pathname||/\/(?:category|tag|author|page)\//.test(url))return [];
  if(/^(?:ข่าวประชาสัมพันธ์|ประกวด \/ แข่งขัน|การแข่งขันทั้งหมด|สมัคร \/ ตรวจสอบสถานะ|อ่านรายละเอียด|ดูเพิ่มเติม)$/.test(title))return [];
  const text=plainText(html.slice((a.index??0)+a[0].length,Math.min(links[i+1]?.index??html.length,(a.index??0)+a[0].length+6000))).slice(0,1000);
  if(!isOpportunity(title,'')||(!categories.length&&!classify(title+' '+text)))return [];
  return [{title,url,text,publishedAt:'',categories}];
 });
 return [...new Map(items.map(item=>[canonicalURL(item.url),item])).values()].slice(0,12);
}
export function parseNSCPosts(raw:string):NewsItem[]{
 const posts=JSON.parse(raw);if(!Array.isArray(posts))throw new Error('รูปแบบข่าว สวทช. เปลี่ยนไป');
 return posts.flatMap((p:{title?:{rendered?:string};content?:{rendered?:string};link?:string;date_gmt?:string})=>{
  const title=plainText(p.title?.rendered??'');const text=plainText(p.content?.rendered??'');
  if(!p.link||!/(?:\bNSC\b|National Software Contest|การแข่งขันพัฒนาโปรแกรมคอมพิวเตอร์)/i.test(title+' '+text)||!isOpportunity(title,text))return [];
  return [{title,url:p.link,text,publishedAt:p.date_gmt?p.date_gmt+'Z':'',categories:['คอมพิวเตอร์']}];
 });
}
export function yscAnnouncementLinks(html:string,base:string){
 return [...new Set([...html.matchAll(anchor)].flatMap(a=>{
  const url=resolveURL(a[1],base);return url&&(/\/ysc\/ysc\d{4}\/?$/.test(url)||/เปิดรับสมัคร/.test(plainText(a[2])))?[url]:[];
 }))].slice(0,3);
}
export async function readSource(source:SourceDefinition,fetchPage:FetchPage,options:{detailsChecked?:Map<string,string|null>}={}){
 if(source.reader==='contest')return readContestWar(fetchPage,options);
 if(source.reader==='camphub')return readCamphub(fetchPage,options);
 let items:NewsItem[]=[];const warnings:string[]=[];let scanned=0;
 if(source.reader==='nsm')items=parseNSM(await fetchPage(source.url),source.url);
 else if(source.reader==='math')items=parseMathAnnouncements(await fetchPage(source.url),source.url);
 else if(source.reader==='nsc')items=parseNSCPosts(await fetchPage(source.readURL!));
 else if(source.reader==='ysc'){
  const feeds=await Promise.allSettled([fetchPage(source.feed!),fetchPage(source.url)]);
  if(feeds.every(r=>r.status==='rejected'))throw new Error('ติดต่อ RSS และหน้าหลัก YSC ไม่สำเร็จ');
  if(feeds[0].status==='fulfilled'){try{items=parseFeed(feeds[0].value);}catch{warnings.push('อ่าน RSS ไม่ได้');}}
  else warnings.push('อ่าน RSS ไม่ได้');
  if(feeds[1].status==='fulfilled'){
   const urls=yscAnnouncementLinks(feeds[1].value,source.url);
   const pages=await Promise.allSettled(urls.map(async url=>{
    const html=await fetchPage(url);const text=articleText(html);
    const title=text.match(/YSC\s*20\d{2}\s*เปิดรับสมัคร(?:แล้ว)?/i)?.[0]??plainText(html.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1]??'');
    return {title,url,text,publishedAt:'',categories:['วิทยาศาสตร์']};
   }));
   for(const page of pages){if(page.status==='fulfilled')items.push(page.value);else warnings.push('อ่านหน้ารับสมัคร YSC ไม่สำเร็จ');}
  }else warnings.push('อ่านหน้าหลัก YSC ไม่ได้');
 }else if(source.reader==='psu'){
  try{items=parseFeed(await fetchPage(source.feed!));}
  catch{items=parseHeadingNews(await fetchPage(source.url),source.url,['วิทยาศาสตร์']);warnings.push('RSS อ่านไม่ได้ จึงใช้หน้าข่าวของผู้จัด');}
 }else items=parseFeed(await fetchPage(source.feed!));
 scanned=items.length;
 const unique=[...new Map(items.map(item=>[canonicalURL(item.url),item])).values()];
 // Read only a bounded set of new listing details per run; never guess missing fields.
 if(source.reader==='nsm'||source.reader==='psu'){
  const candidates=(source.reader==='nsm'?unique:unique.filter(i=>isOpportunity(i.title,i.text))).slice(0,6);
  const detail=await Promise.allSettled(candidates.map(async item=>({...item,text:articleText(await fetchPage(item.url))})));
  for(let i=0;i<candidates.length;i++){
   const result=detail[i];if(result.status==='fulfilled')unique[unique.indexOf(candidates[i])]=result.value;
   else warnings.push('อ่านรายละเอียดไม่ได้ 1 รายการ');
  }
 }
 return {items:unique,scanned,warnings};
}
