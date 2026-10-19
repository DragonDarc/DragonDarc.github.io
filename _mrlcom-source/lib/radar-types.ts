import type { PortfolioFormat } from './radar-formats';
export type Category = 'computer' | 'science' | 'math' | 'engineering' | 'creative' | 'language';
export type Activity = {
 id:string; title:string; organizer:string; source:string; url:string; category:Category;
 kind:'competition'|'camp'|'workshop'; summary:string; levels:string[]; deadline:string|null;
 startDate:string|null; endDate:string|null; fee:number|null; feeNote:string; location:string;
 area:'bangkok'|'other'|'online'|'unknown'; team:string; tags:string[]; reviewed:boolean;
 needsReview:boolean; checkedAt:string; fetchedAt:string|null; publishedAt:string|null; custom?:boolean;
 officialURL?:string|null; detailsCheckedAt?:string|null; formats?:PortfolioFormat[];
};
export type SourceState = {
 id:string; name:string; url:string; feed:string|null; status:'pending'|'success'|'error';
 lastAttempt:string|null; lastSuccess:string|null; message:string; scanned:number; imported:number;
 method?:string; description?:string; latestPublishedAt?:string|null; channels?:{label:string;url:string}[];
};
export type AppData = {
 activities:Activity[]; saved:string[]; sources:SourceState[]; lastSync:string|null; nextSync:string|null;
 scheduleEnabled:boolean; error?:string;
};
export const categories:Record<Category,{label:string;short:string;color:string}>={
 computer:{label:'คอมพิวเตอร์ & AI',short:'คอมพิวเตอร์',color:'purple'},
 science:{label:'วิทยาศาสตร์',short:'วิทยาศาสตร์',color:'green'},
 math:{label:'คณิตศาสตร์',short:'คณิตศาสตร์',color:'orange'},
 engineering:{label:'วิศวกรรม & นวัตกรรม',short:'วิศวกรรม',color:'blue'},
 language:{label:'ภาษา & มนุษยศาสตร์',short:'ภาษา / มนุษยศาสตร์',color:'orange'},
 creative:{label:'สื่อ & งานสร้างสรรค์',short:'งานสร้างสรรค์',color:'purple'},
};
export const kindLabels={competition:'ประกวด / แข่งขัน',camp:'ค่าย',workshop:'เวิร์กช็อป'};
export function bangkokToday(now=new Date()) {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function daysLeft(deadline:string|null,now=new Date()) {
 if(!deadline)return null;
 return Math.round((Date.parse(deadline+'T00:00:00+07:00')-Date.parse(bangkokToday(now)+'T00:00:00+07:00'))/86400000);
}
export function activityStatus(a:Activity,now=new Date()) {
 const days=daysLeft(a.deadline,now);return days===null?'unknown':days<0?'closed':days<=7?'soon':'open';
}
export function thaiDate(value:string|null,options?:Intl.DateTimeFormatOptions) {
 if(!value)return 'ยังไม่ระบุ';
 return new Date(value.length===10?value+'T12:00:00+07:00':value).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',...options});
}
