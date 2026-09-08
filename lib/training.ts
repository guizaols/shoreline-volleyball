export const medalNames=['Sem medalha','Bronze','Prata','Ouro'];
export const medalXP=[0,20,50,100];
export const drills=(['serve','defense','attack'] as const).flatMap((kind)=>
 [0,1,2].map(level=>({kind,level,name:`${{serve:'Saque',defense:'Defesa',attack:'Ataque'}[kind]} · Nível ${level+1}`,
 radius:[90,65,45][level],flight:[2.1,1.8,1.5][level]})));
export function trainingMedal(hits:number){return hits>=5?3:hits>=3?2:hits>=2?1:0;}
export function trainingUnlocked(medals:number[],index:number){return !!drills[index]&&(drills[index].level===0||medals[index-1]>0);}
