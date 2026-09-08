import {readProgress,type Progress} from './cup.ts';
export function exportCareer(progress:Progress){
 return JSON.stringify({format:'shoreline-career',version:1,progress},null,2);
}
export function importCareer(raw:string):Progress{
 if(raw.length>200000)throw new Error('Arquivo grande demais.');
 let data;
 try{data=JSON.parse(raw);}catch{throw new Error('O arquivo não contém uma carreira válida.');}
 if(data?.format!=='shoreline-career'||data.version!==1||!data.progress)throw new Error('Escolha uma carreira exportada pelo Shoreline.');
 const normalized=readProgress(JSON.stringify(data.progress));
 for(const key of Object.keys(normalized) as (keyof Progress)[]){
  if(JSON.stringify(normalized[key])!==JSON.stringify(data.progress[key]))throw new Error('A carreira contém dados inválidos ou incompatíveis.');
 }
 return normalized;
}
