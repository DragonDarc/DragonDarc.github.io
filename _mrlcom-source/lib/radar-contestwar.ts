import { canonicalURL, classify, extractDeadline, isOpportunity, plainText, safeURL } from './radar-parser';
import type { NewsItem } from './radar-source-reader';

// Public pages observed on Contest War. /rss.xml is stale, so read the category pages.
export const contestWarPages = [
 {path:'/contest-type-28',categories:['คอมพิวเตอร์/IT']},
 {path:'/contest-type-38',categories:[]},
 {path:'/contest-type-39',categories:['นวัตกรรมและสิ่งประดิษฐ์']},
 {path:'/contest-type-52',categories:['แอนิเมชัน']},
 {path:'/contest-type-43',categories:['ประกวดสื่อ']},
 {path:'/contest-type-43?page=1',categories:['ประกวดสื่อ']},
 {path:'/contest-type-45',categories:['ออกแบบ']},
 {path:'/eligibility-3',categories:[]},
 {path:'/eligibility-3?page=1',categories:[]},
 {path:'/eligibility-3?page=2',categories:[]},
];

// Extract a balanced div instead of allowing a sidebar or another event to leak into fields.
function divAt(html:string,start:number){
 let depth=0;
 for(const m of html.slice(start).matchAll(/<\/?div\b[^>]*>/gi)){
  depth+=m[0].startsWith('</')?-1:1;
  if(depth===0)return html.slice(start,start+(m.index??0)+m[0].length);
 }
 return '';
}
function field(html:string,name:string){
 const tags=html.matchAll(/<div\b[^>]*>/gi);
 for(const tag of tags){
  const classes=tag[0].match(/\bclass=["']([^"']*)["']/i)?.[1].split(/\s+/)??[];
  if(classes.includes('field-name-'+name))return divAt(html,tag.index??0);
 }
 return '';
}
function datePart(value:string){
 const iso=value.match(/\b(\d{4}-\d{2}-\d{2})\b/);
 let result=iso?.[1];
 if(!result){
  const m=value.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/i);
  if(m){const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase())+1;result=`${m[3]}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
 }
 if(!result)return null;
 const date=new Date(result+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===result?result:null;
}
export function contestWarDeadline(html:string){
 const dates=field(html,'field-date');
 const end=dates.match(/<span\b[^>]*class=["'][^"']*\bdate-display-end\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
 const single=dates.match(/<span\b[^>]*class=["'][^"']*\bdate-display-single\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
 return datePart(plainText(end?.[1]??single?.[1]??''));
}
export function contestWarArticleText(html:string){
 const node=html.search(/<div\b[^>]*\bid=["']node-\d+["']/i);
 if(node<0)throw new Error('ไม่พบเนื้อหาประกาศ Contest War');
 const block=divAt(html,node);
 const body=field(block,'body');
 if(!body)throw new Error('ไม่พบรายละเอียดประกาศ Contest War');
 return plainText(body);
}
function itemFromBlock(block:string,title:string,url:string,categories:string[]):NewsItem{
 const text=plainText(field(block,'body'));
 const submitted=block.match(/Submitted by[\s\S]*?\bon\s+(?:[A-Za-z]{3},\s*)?(\d{4}-\d{2}-\d{2})/i)?.[1]??'';
 const published=datePart(plainText(submitted));
 const declaredCategories=[...field(block,'field-contest-type').matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m=>plainText(m[1]));
 return {title,url:canonicalURL(url),text,publishedAt:published?published+'T00:00:00+07:00':'',categories:[...new Set([...declaredCategories,...categories])],deadline:contestWarDeadline(block)??extractDeadline(text)};
}
export function parseContestWarListing(html:string,base:string,categories:string[]=[]):NewsItem[]{
 const nodes=[...html.matchAll(/<div\b[^>]*\bid=["']node-(\d+)["'][^>]*>/gi)];
 if(!nodes.length)throw new Error('ไม่พบรายการประกวดในหน้าหมวด Contest War');
 return nodes.flatMap(node=>{
  const block=divAt(html,node.index??0);
  const h=block.match(/<h2\b[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!h)return [];
  const url=new URL(plainText(h[1]),base);
  if(!['contestwar.com','www.contestwar.com'].includes(url.hostname)||!/^\/contest\/\d+\/?$/.test(url.pathname)||url.username||url.password||url.port||!['http:','https:'].includes(url.protocol))return [];
  const item=itemFromBlock(block,plainText(h[2]),url.href,categories);
  return item.text?[item]:[];
 });
}
export function parseContestWarDetail(html:string,item:NewsItem):NewsItem{
 const node=html.search(/<div\b[^>]*\bid=["']node-\d+["']/i);
 if(node<0)throw new Error('ไม่พบหน้ารายละเอียดประกวด');
 const block=divAt(html,node);
 const updated=itemFromBlock(block,item.title,item.url,item.categories);
 if(!updated.text)throw new Error('ไม่มีเนื้อหาประกาศ');
 const organizer=updated.text.split(/ขอเชิญ|เชิญชวน|เปิดรับสมัคร/)[0].trim();
 const official=field(block,'field-contest-url').match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1];
 return {...updated,organizer:organizer&&organizer.length<=220?organizer:undefined,officialURL:official?safeURL(plainText(official)):null,detailsRead:true};
}
export async function readContestWar(fetchPage:(url:string)=>Promise<string>,options:{now?:Date;detailsChecked?:Map<string,string|null>}={}){
 const now=options.now??new Date();const warnings:string[]=[];let scanned=0;let successes=0;const byURL=new Map<string,NewsItem>();
 for(const page of contestWarPages){
  try{
   const url='http://contestwar.com'+page.path;
   const items=parseContestWarListing(await fetchPage(url),url,page.categories);scanned+=items.length;successes++;
   for(const item of items){
    // Drop very old pinned posts, retaining the recent archive as explicitly closed activities.
    const date=Date.parse(item.deadline??item.publishedAt);
    if(Number.isFinite(date)&&date<now.getTime()-730*86400000)continue;
    const previous=byURL.get(item.url);
    byURL.set(item.url,previous?{...previous,categories:[...new Set([...previous.categories,...item.categories])]}:item);
   }
  }catch{warnings.push('อ่านหน้าหมวด '+page.path+' ไม่สำเร็จ');}
 }
 if(!successes)throw new Error('ติดต่อหน้าหมวด Contest War ไม่สำเร็จทุกหน้า');
 const items=[...byURL.values()].filter(item=>isOpportunity(item.title,item.text)&&classify(item.title+' '+item.categories.join(' ')+' '+item.text));
 // Rotate detailed checks: recently read full pages should not starve other items forever.
 const candidates=[...items].sort((a,b)=>{
  const ac=options.detailsChecked?.get(a.url)??'';const bc=options.detailsChecked?.get(b.url)??'';
  return ac.localeCompare(bc)||b.publishedAt.localeCompare(a.publishedAt);
 }).slice(0,2);
 for(const item of candidates){
  try{items[items.indexOf(item)]=parseContestWarDetail(await fetchPage(item.url),item);}
  catch{warnings.push('อ่านรายละเอียดไม่ได้ 1 รายการ');}
 }
 return {items,scanned,warnings};
}
