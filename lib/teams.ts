import {rivals} from './rivals.ts';

// Playable duos/trios (approved design "Escolha da dupla"): every team has 13 attribute points, spread by style.
// Net sports: speed, power, net (reach), spin (makes AI defenders misread). Soccer: speed, shot, pass, keeper.
export const TEAM_KEY='shoreline-team';
export const teamNames=['Tempestade','Muralha','Maré','Sakura','Dunas','Farol'] as const;
const netStats:Record<string,number[]>={attack:[3,5,2,3],block:[2,4,5,2],defense:[5,2,3,3],placement:[3,2,3,5]};
const soccerStats:Record<string,number[]>={attack:[3,5,2,3],block:[2,3,3,5],defense:[5,2,3,3],placement:[3,2,5,3]};
export const statLabels=(soccer:boolean)=>soccer?['VELOCIDADE','CHUTE','PASSE','GOLEIRO']:['VELOCIDADE','FORÇA','REDE','EFEITO'];
export function playableTeams(soccer:boolean){
 return teamNames.map(name=>{const r=rivals.find(x=>x.name===name)!;return {name,country:r.country,players:r.players,style:r.style,stats:(soccer?soccerStats:netStats)[r.style]};});
}
// Neutral stats are 3 everywhere; each point above or below shifts the matching ability a few percent.
export const statFactor=(value:number,step=.04)=>1+(value-3)*step;
