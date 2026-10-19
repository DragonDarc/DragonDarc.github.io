import type { Activity } from './radar-types';

export const portfolioFormats = {
 video:'คลิป / หนังสั้น', photo:'ภาพถ่าย', design:'ออกแบบ / วาดภาพ',
 animation:'แอนิเมชัน', writing:'งานเขียน', performance:'ดนตรี / การแสดง',
};
export type PortfolioFormat = keyof typeof portfolioFormats;
const patterns:Record<PortfolioFormat,RegExp>={
 video:/คลิป|วิดีโอ|วีดิทัศน์|วีดีโอ|ภาพยนตร์|หนังสั้น|สร้างหนัง|หนังโฆษณา|ละครสั้น|สปอตโทรทัศน์|ผลิตสื่อโฆษณา|tiktok|reels|short\s*film|video/i,
 photo:/ภาพถ่าย|ถ่ายภาพ|photograph|photo\s*contest/i,
 design:/ออกแบบ|วาดภาพ|จิตรกรรม|กราฟิก|กราฟฟิก|infographic|อินโฟกราฟิก|fan\s*art|visual\s*art|design|แฟชั่น/i,
 animation:/animation|แอนิเมชัน|แอนิเมชั่น/i,
 writing:/งานเขียน|เรื่องสั้น|เรียงความ|บทกวี|วรรณกรรม|นวนิยาย/i,
 performance:/ดนตรี|ร้องเพลง|เต้น|ละคร|การแสดง|cosplay|คอสเพลย์|music/i,
};
export function inferPortfolioFormats(text:string):PortfolioFormat[]{
 return (Object.keys(patterns) as PortfolioFormat[]).filter(key=>patterns[key].test(text));
}
export function submissionFormats(title:string,details:string):PortfolioFormat[]{
 const primary=inferPortfolioFormats(title);
 return primary.length?primary:inferPortfolioFormats(details);
}
export function activityFormats(a:Activity):PortfolioFormat[]{
 const primary=inferPortfolioFormats(a.title);
 return primary.length?primary:a.formats??inferPortfolioFormats(a.tags.join(' ')+' '+a.summary);
}
