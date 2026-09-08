import {rivals} from './rivals.ts';
import {readProgress,type Progress} from './cup.ts';
export function exportCareer(progress:Progress){
 return JSON.stringify({format:'shoreline-career',version:2,progress},null,2);
}
const canonical=(data:unknown)=>JSON.stringify(data,(_,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
export function importCareer(raw:string):Progress{
 if(raw.length>200000)throw new Error('Arquivo grande demais.');
 let data;
 try{data=JSON.parse(raw);}catch{throw new Error('O arquivo não contém uma carreira válida.');}
 if(data?.format!=='shoreline-career'||![1,2].includes(data.version)||!data.progress)throw new Error('Escolha uma carreira exportada pelo Shoreline.');
 if(data.version===1){
  if(data.progress.drills===undefined)data.progress.drills=[Array(9).fill(0),Array(9).fill(0)];
  if(Array.isArray(data.progress.career?.players))for(const player of data.progress.career.players)if(player&&typeof player==='object'&&player.gender===undefined)player.gender='unspecified';
  if(Array.isArray(data.progress.career?.rivalPoints)&&data.progress.career.rivalPoints.length===12)data.progress.career.rivalPoints.push(...rivals.slice(12).map(r=>r.points));
 }
 const normalized=readProgress(JSON.stringify(data.progress));
 for(const key of Object.keys(normalized) as (keyof Progress)[]){
  if(canonical(normalized[key])!==canonical(data.progress[key]))throw new Error('A carreira contém dados inválidos ou incompatíveis.');
 }
 return normalized;
}
