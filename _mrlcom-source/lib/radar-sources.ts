import type { SourceState } from './radar-types';

export type SourceDefinition = SourceState & {
 reader:'rss'|'camphub'|'announcement'|'nsm'|'math'|'ysc'|'nsc'|'contest'|'psu';
 readURL?:string;
};
const pending={status:'pending' as const,lastAttempt:null,lastSuccess:null,message:'รอตรวจแหล่งข่าว',scanned:0,imported:0};
export const sourceDefinitions:SourceDefinition[]=[
 {...pending,id:'camphub',name:'CAMPHUB',url:'https://www.camphub.in.th/',feed:'https://www.camphub.in.th/feed/',reader:'camphub',method:'3 ฟีดข่าวและรายละเอียดกิจกรรม',description:'ค่าย เวิร์กช็อป งานแข่งขัน และผลงานสร้างสรรค์ เช่น คลิป TikTok หนังสั้น ออกแบบ ดนตรี และการแสดง ตรวจวันปิดรับจากรายละเอียด',channels:[{label:'ประกวดแข่งขัน',url:'https://www.camphub.in.th/contest/'},{label:'ผลงานสร้างสรรค์',url:'https://www.camphub.in.th/tag/contest-creative/'}]},
 {...pending,id:'posn',name:'สอวน.',url:'https://www.posn.or.th/',feed:'https://www.posn.or.th/feed/',reader:'rss',method:'RSS',description:'ค่ายและการแข่งขันโอลิมปิกวิชาการ ตรวจระดับชั้นแยกแต่ละประกาศ'},
 {...pending,id:'kmutt',name:'SIT KMUTT',url:'https://ict.sit.kmutt.ac.th/',feed:null,reader:'announcement',method:'หน้าประกาศผู้จัด',description:'ตรวจการเปลี่ยนแปลงของประกาศ ICT Challenge'},
 {...pending,id:'utcc',name:'UTCC Science',url:'https://science.utcc.ac.th/articles/utcc_digital_and_aichallenge2026/',feed:null,reader:'announcement',method:'หน้าประกาศผู้จัด',description:'ตรวจการเปลี่ยนแปลงของประกาศ Digital and AI Challenge'},
 {...pending,id:'contestwar',name:'Contest War',url:'http://contestwar.com/',feed:null,reader:'contest',method:'หน้าหมวดประกวดและรายละเอียด',description:'คอมพิวเตอร์ วิชาการ นวัตกรรม แอนิเมชัน ประกวดคลิป หนังสั้น สื่อ และงานออกแบบ อ่านหลายหน้าและรวมข่าวซ้ำ · ใช้หน้า HTTP ที่ต้นทางเปิดอ่านได้',channels:[{label:'ประกวดสื่อ / คลิป',url:'http://contestwar.com/contest-type-43'},{label:'งานออกแบบ',url:'http://contestwar.com/contest-type-45'},{label:'แอนิเมชัน',url:'http://contestwar.com/contest-type-52'}]},
 {...pending,id:'nsm',name:'NSM · Science Hall Contest',url:'https://curiosity.nsm.or.th/th/science-hall-contest',feed:null,reader:'nsm',method:'หน้ารวมและรายละเอียดประกวด',description:'งานประกวดวิทยาศาสตร์ สิ่งประดิษฐ์ และการสื่อสารวิทยาศาสตร์'},
 {...pending,id:'mathassociation',name:'สมาคมคณิตศาสตร์แห่งประเทศไทยฯ',url:'https://www.mathassociation.or.th/home',feed:null,reader:'math',method:'ประกาศบนเว็บไซต์สมาคม',description:'การสอบแข่งขันและโครงงานคณิตศาสตร์ แยกกำหนดการตามแต่ละข่าว'},
 {...pending,id:'ysc',name:'YSC · สวทช.',url:'https://www.nstda.or.th/ysc/',feed:'https://www.nstda.or.th/ysc/feed/',reader:'ysc',method:'RSS และหน้าประกาศรับสมัคร',description:'โครงงานนักวิทยาศาสตร์รุ่นเยาว์ ตรวจหน้ารับสมัครซ้ำแม้ข่าวไม่อยู่ใน RSS ล่าสุด'},
 {...pending,id:'nsc',name:'NSC · สวทช.',url:'https://www.nstda.or.th/ssh/activity/competition/',feed:null,readURL:'https://www.nstda.or.th/ssh/wp-json/wp/v2/posts?search=NSC&per_page=10',reader:'nsc',method:'ข่าวสาธารณะจากเว็บไซต์ สวทช.',description:'ติดตามข่าวที่กล่าวถึง NSC บนเว็บบ้านวิทยาศาสตร์สิรินธร ไม่รวมโพสต์ในกลุ่ม Facebook'},
 {...pending,id:'psu',name:'สัปดาห์วิทยาศาสตร์ · ม.อ.',url:'https://sciweek.sci.psu.ac.th/',feed:'https://sciweek.sci.psu.ac.th/feed/',reader:'psu',method:'RSS / หน้าข่าวของผู้จัด',description:'การประกวดโครงงานและการแข่งขันวิทย์–คณิตของคณะวิทยาศาสตร์ ม.อ.'},
];

const hosts=new Set(sourceDefinitions.flatMap(s=>[s.url,s.feed,s.readURL].filter((u):u is string=>!!u).map(u=>new URL(u).hostname)));
hosts.add('www.contestwar.com');
export function allowedSourceURL(value:string){
 try{const u=new URL(value);const legacy=u.protocol==='http:'&&['contestwar.com','www.contestwar.com'].includes(u.hostname);return (u.protocol==='https:'||legacy)&&!u.username&&!u.password&&!u.port&&hosts.has(u.hostname);}catch{return false;}
}
export function sourceState(def:SourceDefinition,stored?:SourceState):SourceState{
 return {...def,...stored,id:def.id,name:def.name,url:def.url,feed:def.feed,method:def.method,description:def.description,channels:def.channels};
}
