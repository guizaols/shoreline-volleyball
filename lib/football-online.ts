import {type Football,shootFootball,diveFootball,jumpFootball,armFootballSpecial} from './gol.ts';
export const emptyInput=()=>({x:0,y:0,charging:false});
export function perspective(g:Football):Football{
 const p=structuredClone(g);
 p.players=g.players.slice().reverse().map(a=>({...a,x:1000-a.x,vx:-a.vx}));
 p.ball={...g.ball,x:1000-g.ball.x,vx:-g.ball.vx};p.impact={...g.impact,x:1000-g.impact.x};
 p.score=[...g.score].reverse();p.saves=[...g.saves].reverse();
 p.owner=g.owner<0?-1:1-g.owner;p.winner=g.winner<0?-1:1-g.winner;p.lastShooter=1-g.lastShooter;
 p.charge=g.remoteCharge;p.remoteCharge=g.charge;p.energy=g.remoteEnergy;p.remoteEnergy=g.energy;
 p.specialArmed=g.remoteArmed;p.remoteArmed=g.specialArmed;p.aim=g.remoteAim;p.remoteAim=g.aim;
 p.shotStyle=g.remoteStyle;p.remoteStyle=g.shotStyle;
 if(['goal','over'].includes(p.status)){p.message=p.winner===0?'GOOOL!':'Gol adversário!';p.last=p.message;}
 return p;
}
export function onlineAction(g:Football,team:number,action:string,value:unknown){
 const p=team?perspective(g):g;
 if(action==='shoot')shootFootball(p);
 if(action==='dive')diveFootball(p,typeof value==='number'&&Number.isFinite(value)?Math.sign(value):0);
 if(action==='jump')jumpFootball(p);
 if(action==='special')armFootballSpecial(p);
 if(action==='aim'&&Number.isInteger(value)&&Number(value)>=0&&Number(value)<=2)p.aim=Number(value);
 if(action==='style'&&typeof value==='string'&&['direct','top','bottom','curve-up','curve-down','lob'].includes(value))p.shotStyle=value;
 if(team)Object.assign(g,perspective(p));
}
