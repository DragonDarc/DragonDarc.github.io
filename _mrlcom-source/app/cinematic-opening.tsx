'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Atom, Compass, Film, MoveDown, Pause, Play, Sparkles } from 'lucide-react';
import { cinematicFrame } from '../lib/cinematic-motion';
import type { Track } from '../lib/radar-tracks';

type Props={onExplore:()=>void;onChoose:(track:Track)=>void;sourceCount:number;activityCount:number};
export default function CinematicOpening({onExplore,onChoose,sourceCount,activityCount}:Props){
 const rootRef=useRef<HTMLElement>(null);
 const stageRef=useRef<HTMLDivElement>(null);
 const [reduced,setReduced]=useState(false);
 const [phase,setPhase]=useState<'welcome'|'path'>('welcome');
 const currentPhase=useRef<'welcome'|'path'>('welcome');
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);
  return()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const root=rootRef.current,stage=stageRef.current;if(!root||!stage)return;
  let frame=0,visible=true;
  const target={x:0,y:0},pointer={x:0,y:0};
  const paint=()=>{
   frame=0;if(document.hidden)return;
   const box=root.getBoundingClientRect();
   const distance=Math.max(1,root.offsetHeight-stage.offsetHeight);
   const values=cinematicFrame(reduced?0:-box.top/distance);
   for(const [name,value] of Object.entries(values))stage.style.setProperty(`--${name}`,value.toFixed(4));
   const next=values.progress>=.52?'path':'welcome';
   if(currentPhase.current!==next){currentPhase.current=next;setPhase(next);}
   pointer.x+=(target.x-pointer.x)*.09;pointer.y+=(target.y-pointer.y)*.09;
   stage.style.setProperty('--look-x',reduced?'0':pointer.x.toFixed(4));
   stage.style.setProperty('--look-y',reduced?'0':pointer.y.toFixed(4));
   if(!reduced&&visible&&(Math.abs(target.x-pointer.x)>.003||Math.abs(target.y-pointer.y)>.003))frame=requestAnimationFrame(paint);
  };
  const schedule=()=>{if(!frame&&!document.hidden)frame=requestAnimationFrame(paint);};
  const move=(event:PointerEvent)=>{if(reduced||event.pointerType!=='mouse')return;const box=stage.getBoundingClientRect();target.x=(event.clientX-box.left)/Math.max(1,box.width)*2-1;target.y=(event.clientY-box.top)/Math.max(1,box.height)*2-1;schedule();};
  const leave=()=>{target.x=target.y=0;schedule();};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}if(visible)schedule();});observer.observe(root);
  const scroll=()=>{if(visible)schedule();};
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);
  stage.addEventListener('pointermove',move);stage.addEventListener('pointerleave',leave);paint();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',scroll);window.removeEventListener('resize',schedule);document.removeEventListener('visibilitychange',schedule);stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerleave',leave);};
 },[reduced]);
 function start(){
  const root=rootRef.current,stage=stageRef.current;if(!root||!stage)return;
  if(reduced){document.getElementById('cinematic-paths')?.scrollIntoView({behavior:'auto',block:'center'});return;}
  const top=root.getBoundingClientRect().top+window.scrollY;
  window.scrollTo({top:top+(root.offsetHeight-stage.offsetHeight)*.78,behavior:'smooth'});
 }
 return <section className="cinematic-opening" ref={rootRef} data-reduced={reduced} aria-label="สำรวจโลกแห่งโอกาสของ MRLCOM">
  <div className="cine-stage" ref={stageRef} data-phase={phase}>
   <div className="cine-world" aria-hidden="true">
    <img className="cine-photograph" src={`${import.meta.env.BASE_URL}images/mrlcom-students-scifi.webp`} width="1672" height="941" fetchPriority="high" alt=""/>
    <div className="cine-world-tint"/>
   </div>
   <div className="cine-horizon" aria-hidden="true"><div className="cine-floor"/><i className="cine-ring ring-a"/><i className="cine-ring ring-b"/><i className="cine-ring ring-c"/></div>
   <div className="cine-dust" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
   <div className="cine-vignette" aria-hidden="true"/>
   <div className="cine-arrival-shade" aria-hidden="true"/>
   <div className="cine-corner corner-one" aria-hidden="true"/><div className="cine-corner corner-two" aria-hidden="true"/>
   <div className="cine-welcome" inert={!reduced&&phase==='path'}>
    <p className="cine-overline"><span/> MRLCOM · MARIALAI SCHOOL</p>
    <h1>โลกใบถัดไป<br/>เริ่มที่<span>ความสนใจ</span><br/>ของคุณ<span className="cine-period">.</span></h1>
    <p className="cine-description">จากห้องเรียน สู่เวทีที่ได้ลองจริง<br/>ค้นหาค่าย การแข่งขัน และกิจกรรม<br className="cine-mobile-break"/>ที่พาไอเดียของคุณไปไกลกว่าเดิม</p>
    <div className="cine-actions"><button className="cine-primary" onClick={start}>ออกไปค้นพบ <ArrowUpRight size={19}/></button><button className="cine-text-button" onClick={onExplore}>ค้นหากิจกรรมเลย <ArrowRight size={16}/></button></div>
    <div className="cine-source-note"><span className="cine-small-dot"/>{activityCount} ข่าวและกิจกรรม · จาก {sourceCount} แหล่งข้อมูล</div>
   </div>
   <div id="cinematic-paths" className="cine-gateway" inert={!reduced&&phase!=='path'}>
    <div className="cine-path-intro"><p className="cine-overline"><Sparkles size={14}/> YOUR INTEREST. YOUR NEXT CHAPTER.</p><h2>ทุกความสนใจ<br/><span>มีเส้นทางของตัวเอง</span></h2><p>เลือกสิ่งที่อยากลอง แล้วไปเจอสนามที่ใช่</p></div>
    <div className="cine-path-grid">
     <button className="cine-path-card science-path" onClick={()=>onChoose('science')}><span className="cine-path-label">01 / DISCOVER & INVENT</span><div className="cine-path-orb"><Atom size={45} strokeWidth={1.25}/><i/><i/></div><h3>วิทย์–เทคโนโลยี</h3><p>วิทยาศาสตร์ คณิต คอมพิวเตอร์<br/>วิศวกรรม และนวัตกรรม</p><span className="cine-path-action">สำรวจสายวิทย์ <ArrowUpRight size={19}/></span></button>
     <button className="cine-path-card arts-path" onClick={()=>onChoose('arts')}><span className="cine-path-label">02 / IMAGINE & CREATE</span><div className="cine-path-orb"><Film size={41} strokeWidth={1.3}/><i/><i/></div><h3>ศิลป์–ภาษา</h3><p>ภาษา สื่อ งานเขียน การออกแบบ<br/>ดนตรี และความคิดสร้างสรรค์</p><span className="cine-path-action">สำรวจสายศิลป์ <ArrowUpRight size={19}/></span></button>
    </div>
    <button className="cine-all-paths" onClick={()=>onChoose('all')}><Compass size={16}/>ยังไม่เลือกสาย · ดูทุกโอกาส <ArrowRight size={16}/></button>
   </div>
   <div className="cine-controls"><button onClick={()=>setReduced(v=>!v)} aria-pressed={reduced}>{reduced?<Play size={12}/>:<Pause size={12}/>}<span>{reduced?'เปิดการเคลื่อนไหว':'ลดการเคลื่อนไหว'}</span></button><button onClick={onExplore}>ข้ามไปค้นหา <ArrowDown size={13}/></button></div>
   <div className="cine-bottom-bar" aria-hidden="true"><span>EXPLORE BEYOND THE CLASSROOM</span><span className="cine-scroll-cue">{phase==='welcome'?'เลื่อนเพื่อเริ่มสำรวจ':'เลื่อนต่อเพื่อดูกิจกรรม'}<MoveDown size={15}/></span><span>{phase==='welcome'?'01 / THE NEXT WORLD':'02 / CHOOSE YOUR PATH'}</span></div>
   <div className="cine-progress" aria-hidden="true"><span/><i/></div>
  </div>
 </section>;
}
