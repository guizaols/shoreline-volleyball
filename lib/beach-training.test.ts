import assert from 'node:assert/strict';
import {createNetMatch,startNetDrill,beginServe,stepNet,pressNet,releaseNet,netGuide,type NetSport} from './net.ts';
import {createSoccer,startSoccerDrill,startSoccer,stepSoccer,shootSoccer,passSoccer,firstTimeSoccer} from './soccer.ts';
import {beachDrills,readTraining,recordDrill,trainedStats,trainingKey,DRILL_TRIES} from './beach-training.ts';

// A scripted player for each drill: proves every drill can be passed, and that standing still cannot.
function netDrill(sport:NetSport,drill:number,play:boolean){
 const g=createNetMatch(sport);startNetDrill(g,drill);beginServe(g);let pressed=-1,held=-1;
 for(let tick=0;tick<120*90&&g.status!=='over';tick++){
  if(g.status==='ready'&&!g.restartDelay)beginServe(g);
  const guide=netGuide(g),p=g.players[g.active],dx=guide.x-p.x,dz=guide.z-p.z,d=Math.hypot(dx,dz),mine=g.status==='playing'&&guide.team===0;
  const t=g.drillTarget,aim={x:t.x>750?1:-1,z:t.z<225?-1:1},attack=sport==='tennis'||g.lastTeam===0&&g.touches===2,charge=play&&drill===1&&mine&&attack&&d<60&&guide.time<.85;
  // Holding = key down (pressNet), then release at the right time.
  if(charge&&held!==g.contactSerial){held=g.contactSerial;pressNet(g);}
  if(play&&mine&&guide.time<.13&&pressed!==g.contactSerial){
   pressed=g.contactSerial;if(drill===2)g.attackStyle='tip';
   if(charge)releaseNet(g,aim);else pressNet(g,drill===0||!attack?undefined:aim);
  }
  const move=play&&mine&&d>12;
  stepNet(g,1/120,{x:move?dx/d:0,z:move?dz/d:0,prepare:charge,jump:false},'Club');
 }
 assert.equal(g.status,'over',`${sport} ${beachDrills(false)[drill].name} must finish`);
 assert.equal(g.drillTries,DRILL_TRIES);return g.drillHits;
}
function soccerDrill(drill:number,play:boolean){
 const g=createSoccer();startSoccerDrill(g,drill);startSoccer(g);let shot=-1;
 for(let tick=0;tick<120*90&&g.status!=='over';tick++){
  const p=g.players[g.active],b=g.ball,t=g.drillTarget;let x=0,z=0;
  if(play&&g.status==='playing'){
   if(drill===3){z=Math.max(-1,Math.min(1,(b.z-p.z)/20));x=Math.max(-1,Math.min(1,(100-p.x)/20));}
   else if(g.owner===g.active){
    x=1;z=Math.max(-1,Math.min(1,(225-p.z)/40));
    if(drill===2&&p.x>420&&shot!==g.drillTries){shot=g.drillTries;passSoccer(g,{x:.6,z:p.z<225?1:-1});}
    else if(drill!==2&&p.x>700)shootSoccer(g,{x:1,z:drill===1?(t.z<225?-1:1):-1});
   }else if(g.owner<0&&g.passReceiver===g.active){
    const eta=Math.hypot(b.x-p.x,b.z-p.z)/(Math.hypot(b.vx,b.vz)||1);
    if(eta<.2&&!g.shotWindow)firstTimeSoccer(g,{x:1,z:-1});
    const dx=b.x+b.vx*.25-p.x,dz=b.z+b.vz*.25-p.z,d=Math.hypot(dx,dz)||1;x=dx/d;z=dz/d;
   }else if(g.owner<0){const dx=b.x-p.x,dz=b.z-p.z,d=Math.hypot(dx,dz)||1;x=dx/d;z=dz/d;}
  }
  stepSoccer(g,1/120,{x,z,prepare:false,jump:false},'Club');
 }
 assert.equal(g.status,'over',`${beachDrills(true)[drill].name} must finish`);
 assert.equal(g.drillTries,DRILL_TRIES);return g.drillHits;
}
for(const sport of ['footvolley','tennis'] as const)for(let drill=0;drill<4;drill++){
 const hits=netDrill(sport,drill,true),idle=netDrill(sport,drill,false);
 console.log(sport,beachDrills(false)[drill].name,{hits,idle});
 assert.ok(hits>=3,`${sport} ${beachDrills(false)[drill].name}: a good player passes (${hits}/5)`);
 assert.ok(idle<3,`${sport} ${beachDrills(false)[drill].name}: standing still fails (${idle}/5)`);
}
for(let drill=0;drill<4;drill++){
 const hits=soccerDrill(drill,true),idle=soccerDrill(drill,false);
 console.log('soccer',beachDrills(true)[drill].name,{hits,idle});
 assert.ok(hits>=3,`${beachDrills(true)[drill].name}: a good player passes (${hits}/5)`);
 assert.ok(idle<3,`${beachDrills(true)[drill].name}: standing still fails (${idle}/5)`);
}

// Rewards: +1 once per drill and team, never above 5, kept apart for soccer; broken saves start fresh.
const key=trainingKey('Muralha',false),base=[2,4,5,2];
const first=recordDrill({},key,base,0,3,'VELOCIDADE');let save=first.save;assert.equal(first.note,'+1 VELOCIDADE!');
assert.deepEqual(trainedStats(base,save,key),[3,4,5,2]);
assert.equal(recordDrill(save,key,base,0,5,'VELOCIDADE').save,save,'A drill pays only once');
assert.equal(recordDrill(save,key,base,2,5,'REDE').save,save,'A maxed attribute stays at 5');
assert.equal(recordDrill(save,key,base,1,2,'FORÇA').save,save,'Two hits are not enough');
assert.deepEqual(trainedStats(base,save,trainingKey('Muralha',true)),base);
({save}=recordDrill(save,key,base,1,4,'FORÇA'));
assert.deepEqual(readTraining(JSON.stringify(save)),save);
assert.deepEqual(readTraining('{"Muralha":[9,"x"],"Nope":[1,1,1,1]}'),{});assert.deepEqual(readTraining('not json'),{});
console.log('Passed: 12 playable beach drills and +1 attribute rewards.');
