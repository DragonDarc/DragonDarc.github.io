/** Normalized camera path for the opening. Pure math keeps overscroll bounded. */
export const clamp01=(value:number)=>Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
const ease=(value:number)=>{const t=clamp01(value);return t*t*(3-2*t);};
export function cinematicFrame(value:number){
 const progress=clamp01(value);
 const arrival=ease((progress-.34)/.38);
 return {
  progress,
  zoom:1.035+ease(progress)*.2,
  travelY:-ease(progress)*4.5,
  welcomeOpacity:1-ease((progress-.08)/.32),
  welcomeY:-ease(progress/.5)*75,
  arrivalOpacity:arrival,
  arrivalY:(1-arrival)*64,
  veil:arrival*.72,
  deckLift:ease(progress)*110,
  haze:ease(progress)*.8,
 };
}
