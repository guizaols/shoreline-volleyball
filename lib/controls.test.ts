import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {stickDirection} from './controls.ts';
import {createGame,step,cancelVolleyStroke} from './game.ts';

// Exercise actual component handlers without installing a DOM or test framework.
const listeners=new Map<string,()=>void>(),cleanups:(()=>void)[]=[];
const events={addEventListener:(name:string,fn:()=>void)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name)};
const jsx=(_type:unknown,props:any)=>props;
const exports:any={};
runInNewContext(ts.transpileModule(readFileSync(new URL('../app/TouchControls.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
}).outputText,{
  exports,window:events,document:{...events,hidden:true},
  require:(id:string)=>id==='react'?{
    useRef:(current:unknown)=>({current}),useState:(initial:unknown)=>[initial,()=>{}],
    useEffect:(fn:()=>void|(()=>void))=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup);},
  }:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:{stickDirection},
});
let movement={x:0,z:0},pressed=false,alternate=false,aims=0,boundsReads=0,cancelled=false,jumping=false;
const tree=exports.default({onMove:(x:number,z:number)=>{movement={x,z};},onPress:()=>{pressed=true;},
  onAlternate:()=>{alternate=true;},alternateLabel:'Largar',onRelease:(cancel=false)=>{cancelled=cancel;pressed=false;alternate=false;},onAim:()=>aims++,onJump:(held:boolean)=>{jumping=held;},label:'Jogar',charge:0,enabled:true});
const stick=tree.children[0],actions=tree.children[1].children,button=actions[1][0],secondary=actions[1][1];
const event=(pointerId:number,clientX=120,clientY=60)=>({
  pointerId,clientX,clientY,preventDefault:()=>{},
  currentTarget:{setPointerCapture:()=>{},getBoundingClientRect:()=>{boundsReads++;return {left:0,top:0,width:120,height:120};}},
});
stick.onPointerDown(event(1));button.onPointerDown(event(2));
assert.ok(movement.x>.9&&pressed,'Both thumbs must work simultaneously');
stick.onPointerMove(event(1,90,60));
assert.equal(boundsReads,1,'Read stick geometry only once per gesture');
const before={...movement};
stick.onPointerMove(event(2,0,0));
assert.deepEqual(movement,before,'The action finger must not move the stick');
stick.onPointerCancel(event(1));
assert.deepEqual(movement,{x:0,z:0});assert.ok(pressed,'Cancelling the stick must not release the action');
button.onLostPointerCapture(event(2));assert.equal(pressed,false);
stick.onPointerDown(event(3));button.onPointerDown(event(4));
listeners.get('blur')!();assert.deepEqual(movement,{x:0,z:0});assert.equal(pressed,false);
assert.ok(cancelled,'Losing focus must cancel, not fire, a charged shot');
actions[0].onClick();assert.equal(aims,1);
stick.onPointerDown(event(5));secondary.onPointerDown(event(6));
assert.ok(movement.x>.9&&alternate,'Alternative action must work while running');
button.onPointerDown(event(7));assert.equal(pressed,false,'One action finger cannot start two shots');
secondary.onPointerCancel(event(6));assert.equal(alternate,false);
stick.onPointerUp(event(5));
const jump=actions[2];assert.ok(jump,'Games with aerial attacks need a touch jump control');
button.onPointerDown(event(8));jump.onPointerDown(event(9));
assert.ok(pressed&&jumping,'Jumping must preserve a charged shot');
jump.onPointerCancel(event(9));assert.equal(jumping,false);assert.ok(pressed);
jump.onPointerDown(event(10));listeners.get('blur')!();
assert.equal(jumping,false,'Focus loss must release a held jump');
const enter={key:'Enter',repeat:false,preventDefault:()=>{},stopPropagation:()=>{}};
button.onKeyDown(enter);assert.ok(pressed);
assert.ok(button.onBlur,'Moving keyboard focus must cancel a held action');button.onBlur();
assert.equal(pressed,false);assert.ok(cancelled,'Tabbing away must cancel rather than fire');
for(const [dx,dy] of [[200,0],[0,-200],[-100,100]])assert.ok(Math.hypot(...Object.values(stickDirection(dx,dy,40)))<=1.00001);
assert.deepEqual(stickDirection(2,2,40),{x:0,z:0});
const halfway=Math.hypot(...Object.values(stickDirection(20,0,40)));
assert.ok(halfway>.65&&halfway<.75,'Half a gesture should give useful running speed');
assert.ok(Math.abs(Math.hypot(...Object.values(stickDirection(28,0,40)))-1)<1e-10,'Reach full speed before the edge');
const up=stickDirection(0,-40,40);
assert.ok(Math.abs(.77*up.x+.2*up.z)<1e-10,'Up on the stick must move vertically on screen');
cleanups.forEach(fn=>fn());
console.log('Passed: two-finger controls, cancellation, focus loss, target button, analog speed and perspective.');
const volleyballSource=readFileSync(new URL('../app/volei/page.tsx',import.meta.url),'utf8');
const shotUpSource=volleyballSource.slice(volleyballSource.indexOf(' const shotUp='),volleyballSource.indexOf(' const serveBand='));
for(const type of ['pointercancel','lostpointercapture']){
 const g=createGame();g.status='playing';g.ball.y=-1000;
 step(g,1/120,0,false,'Club',true,false,0,false,true);
 runInNewContext(ts.transpileModule(`${shotUpSource}\nshotUp({pointerId:5,type});`,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  type,game:{current:g},keys:{current:new Set(['touch-attack'])},shotPointer:{current:5},cancelVolleyStroke,setMobileTools:()=>{},
 });
 step(g,1/120,0,false,'Club');assert.equal(g.strokes[0].time,0,'Cancelling the shot picker cannot become a fresh release stroke');
}
console.log('Passed: cancelled volleyball shot gestures never rearm a stroke.');
