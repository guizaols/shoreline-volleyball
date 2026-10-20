import {tricks,STARTING_TRICKS,type TrickId,type altinhaResult} from './altinha.ts';

// Altinha save on this device: totals, records, and which new tricks already had their lesson.
export const ALTINHA_KEY='shoreline-altinha';
export type AltinhaSave={total:number;best:number;rodaBest:number;rounds:number;learned:TrickId[]};
const numbers=['total','best','rodaBest','rounds'] as const;
const fresh=():AltinhaSave=>({total:0,best:0,rodaBest:0,rounds:0,learned:[]});
export function readAltinha(raw:string|null):AltinhaSave{
 try{
  const data=JSON.parse(raw||'null'),save=fresh();if(!data||typeof data!=='object')return save;
  for(const key of numbers){const n=data[key];if(n===undefined)continue;if(!Number.isSafeInteger(n)||n<0||n>10_000_000)return fresh();save[key]=n;}
  if(Array.isArray(data.learned))save.learned=tricks.map(t=>t.id).filter(id=>data.learned.includes(id));
  return save;
 }catch{return fresh();/* A broken save starts fresh. */}
}
export const unlockedTricks=(total:number)=>tricks.filter(t=>t.unlockAt<=total).map(t=>t.id);
export function recordAltinha(save:AltinhaSave,r:ReturnType<typeof altinhaResult>){
 const mine=r.individual[0],next={...save,total:Math.min(10_000_000,save.total+mine),best:Math.max(save.best,mine),rodaBest:Math.max(save.rodaBest,r.rodaBest),rounds:save.rounds+1};
 const before=unlockedTricks(save.total),newTricks=unlockedTricks(next.total).filter(id=>!before.includes(id));
 const notes=newTricks.map(id=>`Novo trick: ${tricks.find(t=>t.id===id)!.name}`);
 if(r.rodaBest>save.rodaBest)notes.push(`Recorde da roda: ${r.rodaBest}`);
 if(r.king===0)notes.push('Rei da roda!');
 return {save:next,notes,newTricks};
}
// The starting tricks are explained on the start card, so only unlocked ones get a lesson.
export const lessonFor=(save:AltinhaSave)=>unlockedTricks(save.total).find(id=>!STARTING_TRICKS.includes(id)&&!save.learned.includes(id))??null;
export const markLearned=(save:AltinhaSave,id:TrickId):AltinhaSave=>save.learned.includes(id)?save:{...save,learned:[...save.learned,id]};
