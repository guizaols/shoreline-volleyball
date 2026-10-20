import assert from 'node:assert/strict';
import {createUltimate,startUltimate,stepUltimate,pressUltimate,releaseUltimate,pauseUltimate,throwTarget,END_LEFT,END_RIGHT,type Ultimate} from './ultimate.ts';

const DT=1/120,still={x:0,z:0,jump:false};
const run=(g:Ultimate,seconds:number,input=still)=>{for(let t=0;t<seconds*120&&g.status!=='over';t++)stepUltimate(g,DT,input,'Club');};
// Places players for a scripted situation (ai:false keeps everyone where they are put).
const place=(g:Ultimate,spots:Record<number,[number,number]>)=>{for(const [i,[x,z]] of Object.entries(spots)){const p=g.players[Number(i)];p.x=x;p.z=z;p.vx=p.vz=0;}};
const toward=(g:Ultimate,from:number,to:number)=>{const a=g.players[from],b=g.players[to],d=Math.hypot(b.x-a.x,b.z-a.z);return {x:(b.x-a.x)/d,z:(b.z-a.z)/d};};
const pass=(g:Ultimate,to:number,kind:'pass'|'hammer'='pass')=>{pressUltimate(g);releaseUltimate(g,toward(g,g.holder,to),kind);};

// Kick-off: you hold the disc at your own end zone; holding it never moves you (pivot).
{const g=createUltimate({ai:false});startUltimate(g);assert.equal(g.status,'playing');assert.equal(g.holder,0);assert.equal(g.active,0);
 const x=g.players[0].x;run(g,1,{x:1,z:0,jump:false});assert.equal(g.players[0].x,x);}

// Stall: ten seconds without throwing gives the disc to the other team.
{const g=createUltimate({ai:false});startUltimate(g);run(g,10.8);assert.ok(g.holder>=5,`holder ${g.holder}`);assert.equal(g.feedback,'STALL!');}

// A pass to an open teammate is caught, and you now control the catcher.
{const g=createUltimate({ai:false});startUltimate(g);place(g,{0:[300,225],2:[480,150],5:[900,400],6:[900,50],7:[950,225],8:[700,420],9:[700,30]});
 assert.equal(throwTarget(g,toward(g,0,2)),2);pass(g,2);assert.equal(g.holder,-1);run(g,1.2);assert.equal(g.holder,2);assert.equal(g.active,2);}

// A defender standing in the lane knocks the flat pass down: turnover.
{const g=createUltimate({ai:false});startUltimate(g);place(g,{0:[300,225],2:[520,225],5:[410,225]});pass(g,2);run(g,1.5);
 assert.ok(g.holder>=5,`holder ${g.holder}`);assert.match(g.feedback,/BLOQUEIO|INTERCEPTOU/);}

// A disc nobody can reach falls to the sand: turnover.
{const g=createUltimate({ai:false});startUltimate(g);place(g,{0:[300,225],2:[480,150]});pass(g,2);place(g,{2:[480,420]});run(g,2.5);
 assert.ok(g.holder>=5,`holder ${g.holder}`);assert.equal(g.feedback,'CAIU!');}

// A catch inside the end zone you attack scores; the other team restarts from its own end zone.
{const g=createUltimate({ai:false});startUltimate(g);place(g,{0:[700,225],2:[850,200]});pass(g,2);run(g,1);
 assert.deepEqual(g.score,[1,0]);run(g,2);assert.ok(g.holder>=5);assert.ok(g.players[g.holder].x>=END_RIGHT,`restart x ${g.players[g.holder].x}`);}
assert.ok(END_LEFT<END_RIGHT);

// First to 5 wins.
{const g=createUltimate({ai:false});startUltimate(g);g.score=[4,0];place(g,{0:[700,225],2:[850,200]});pass(g,2);run(g,1);assert.equal(g.status,'over');}

// Pause freezes the disc in the air.
{const g=createUltimate({ai:false});startUltimate(g);place(g,{0:[300,225],2:[480,150]});pass(g,2);run(g,.2);const disc={...g.disc};
 pauseUltimate(g);run(g,1);assert.deepEqual(g.disc,disc);pauseUltimate(g);assert.equal(g.status,'playing');}

// Pressing when you don't hold the disc throws nothing.
{const g=createUltimate({ai:false});startUltimate(g);g.holder=6;pressUltimate(g);releaseUltimate(g,{x:1,z:0},'pass');assert.equal(g.holder,6);assert.equal(g.flight,null);}

console.log('Passed: ultimate core.');
