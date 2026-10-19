export function createArcade(){
 return {charge:0,shotCharge:0,shotDrift:0,shotWindow:0,energy:[0,0],combo:[0,0],comboTime:[0,0],specialArmed:false,specialShot:false,specialPlayer:-1,lastPower:0};
}
type Arcade=ReturnType<typeof createArcade>;
export const powerRisk=(charge:number)=>Math.max(0,(charge-.65)/.35);
// The visible aim and the shot use the same oscillation; misses are never a hidden dice roll.
export const aimDrift=(charge:number,clock:number)=>charge<=.65?0:Math.sin(clock*10)*powerRisk(charge)**2*110;
// Where the ball meets the athlete (-1 behind … 1 in front): in front pulls the shot cross-court, behind sends it down the line, centred is perfect.
export function shotTiming(ahead:number){
 const offset=Math.max(-1,Math.min(1,ahead));
 return {offset,perfect:Math.abs(offset)<=.36,early:offset>.36,late:offset<-.36};
}
export const specialName=(sport:string)=>sport==='soccer'?'CANHÃO':sport==='tennis'?'VOLEIO RELÂMPAGO':'BICICLETA';
export function armSpecial(g:Arcade&{status:string}){if(g.status==='playing'&&g.energy[0]>=100)g.specialArmed=!g.specialArmed;}
export function cancelArcadeInput(g:Arcade){g.charge=0;g.shotCharge=0;g.shotDrift=0;g.shotWindow=0;g.specialArmed=false;}
export function stepArcade(g:Arcade,dt:number){
 g.shotWindow=Math.max(0,g.shotWindow-dt);
 if(!g.shotWindow){g.shotCharge=0;g.shotDrift=0;}
 for(const team of [0,1]){g.comboTime[team]=Math.max(0,g.comboTime[team]-dt);if(!g.comboTime[team])g.combo[team]=0;}
}
export function rewardArcade(g:Arcade,team:number,quality=1){
 if(quality<.45){g.combo[team]=0;return;}
 g.combo[team]=quality>=.7?Math.min(5,g.combo[team]+1):0;g.comboTime[team]=6;
 g.energy[team]=Math.min(100,g.energy[team]+8+g.combo[team]*3);
}
export function takeSpecial(g:Arcade,team:number,player:number){
 const special=g.energy[team]>=100&&(team===1||g.specialArmed);
 g.specialShot=special;g.specialPlayer=special?player:-1;
 if(special){g.energy[team]=0;if(team===0)g.specialArmed=false;}
 return special;
}
