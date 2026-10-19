import type { Activity, Category } from './radar-types';
import { activityFormats } from './radar-formats';
export const tracks = {
 all: { label:'ทุกสาย', description:'สำรวจทุกความสนใจ' },
 science: { label:'สายวิทย์–เทคโนโลยี', description:'วิทย์ คณิต คอมพิวเตอร์ วิศวกรรม' },
 arts: { label:'สายศิลป์–ภาษา', description:'ภาษา งานเขียน สื่อ ศิลปะและการแสดง' },
};
export type Track = keyof typeof tracks;
const scienceCategories:Category[]=['computer','science','math','engineering'];
export function activityCategories(a:Activity):Category[]{
 const found=new Set<Category>([a.category]);
 const text=a.title+' '+a.tags.join(' ');
 if(activityFormats(a).some(f=>f!=='design'||a.category==='creative'||/วาดภาพ|กราฟิก|กราฟฟิก|infographic|จิตรกรรม|ออกแบบตรา|ออกแบบโปสเตอร์/i.test(a.title)))found.add('creative');
 if(/ภาษาอังกฤษ|ภาษาจีน|ภาษาญี่ปุ่น|ภาษาเกาหลี|ภาษาไทย|ภาษาฝรั่งเศส|ภาษาต่างประเทศ|ภาษาศาสตร์|มนุษยศาสตร์|อักษรศาสตร์|สุนทรพจน์|โต้วาที|debate|speech|spelling\s*bee/i.test(text))found.add('language');
 if(/คอมพิวเตอร์|programming|coding|\bAI\b|ปัญญาประดิษฐ์|ดิจิทัล/i.test(text))found.add('computer');
 if(/วิทยาศาสตร์|science|ฟิสิกส์|เคมี|ชีววิทยา|ดาราศาสตร์/i.test(text))found.add('science');
 if(/คณิตศาสตร์|mathematics|\bmath\b/i.test(text))found.add('math');
 if(/วิศว|engineering|robot|หุ่นยนต์|นวัตกรรม|สิ่งประดิษฐ์/i.test(text))found.add('engineering');
 return [...found];
}
export function matchesTrack(a:Activity,track:Track){
 const c=activityCategories(a);
 return track==='all'||(track==='science'?c.some(x=>scienceCategories.includes(x)):c.includes('creative')||c.includes('language'));
}
export function categoriesForTrack(track:Track):Category[]{
 return track==='science'?scienceCategories:track==='arts'?['language','creative']:[...scienceCategories,'language','creative'];
}
