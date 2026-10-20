import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as net from './net.ts';
import * as soccer from './soccer.ts';
import * as arcade from './arcade.ts';
import * as game from './game.ts';
import * as rivals from './rivals.ts';
import * as progress from './beach-progress.ts';
import * as teams from './teams.ts';

type KeyEvent={key:string;repeat:boolean;preventDefault:()=>void;target:{closest:(selector:string)=>object|null}};
const listeners=new Map<string,(event:KeyEvent)=>void>(),refs:{current:unknown}[]=[],exports={} as {default:(props:{sport:string})=>unknown};
const events={addEventListener:(name:string,fn:(e:KeyEvent)=>void)=>listeners.set(name,fn),removeEventListener:()=>{}};
const jsx=(_type:unknown,props:unknown)=>props;
runInNewContext(ts.transpileModule(readFileSync(new URL('../app/BeachMatch.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 exports,window:events,document:{...events,hidden:false},require:(id:string)=>id==='react'?{
  useRef:(current:unknown)=>{const ref={current};refs.push(ref);return ref;},useState:(initial:unknown)=>[typeof initial==='function'?initial():initial,()=>{}],useCallback:(fn:unknown)=>fn,useSyncExternalStore:(_subscribe:unknown,_get:unknown,server:()=>unknown)=>server(),
  useEffect:(fn:()=>void)=>fn(),
 }:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id.endsWith('/net')?net:id.endsWith('/soccer')?soccer:id.endsWith('/game')?game:id.endsWith('/arcade')?arcade:id.endsWith('/rivals')?rivals:id.endsWith('/beach-progress')?progress:id.endsWith('/teams')?teams:{},
});
exports.default({sport:'soccer'});const match=refs[0].current as soccer.Soccer;
const key=(key:string,button=false)=>({key,repeat:false,preventDefault:()=>{},target:{closest:(selector:string)=>button&&selector.includes('button')?{}:null}});
listeners.get('keydown')!(key(' '));listeners.get('keydown')!(key('j'));
for(let i=0;i<30;i++)soccer.stepSoccer(match,1/120,{x:0,z:0,prepare:true,jump:false},'Club');
assert.ok(match.charge>0);listeners.get('keyup')!(key('j'));for(let i=0;i<10;i++)soccer.stepSoccer(match,1/120,{x:0,z:0,prepare:false,jump:false},'Club');assert.equal(match.owner,-1,'Releasing J must shoot');
listeners.get('keydown')!(key('d',true));assert.ok((refs[2].current as Set<string>).has('d'),'Toolbar focus must not disable movement');
listeners.get('blur')!(key(''));assert.equal(match.status,'paused');assert.equal((refs[2].current as Set<string>).size,0);
console.log('Passed: keyboard charge/release, toolbar focus and blur cleanup.');
match.status='playing';match.owner=1;match.energy[0]=100;listeners.get('keydown')!(key('k'));assert.equal(match.specialArmed,true,'K arms the earned special');
listeners.get('keydown')!(key('j'));for(let i=0;i<20;i++)soccer.stepSoccer(match,1/120,{x:0,z:0,prepare:true,jump:false},'Club');
listeners.get('blur')!(key(''));assert.equal(match.charge,0);assert.equal(match.specialArmed,false);assert.equal(match.energy[0],100);assert.equal(match.pendingKick,'');
listeners.get('keyup')!(key('j'));assert.equal(match.pendingKick,'','Key release after blur cannot shoot');
console.log('Passed: special shortcut and charged input cancellation.');
const startRef=refs.length;exports.default({sport:'tennis'});const tennis=refs[startRef].current as net.NetMatch;tennis.status='playing';
listeners.get('keydown')!(key('j'));assert.ok(tennis.shotWindow>0,'A tap must immediately arm a playable stroke');
listeners.get('keydown')!(key('f'));listeners.get('keyup')!(key('f'));
assert.ok((refs[startRef+2].current as Set<string>).has('j'),'Changing the shot type must preserve held J');
assert.equal(tennis.attackStyle,'roll','The second button always plays a lob, without cycling a menu');
listeners.get('keydown')!(key('f'));assert.equal(tennis.attackStyle,'roll','The same button must give the same shot on every press');
listeners.get('keydown')!(key('3'));assert.equal(tennis.attackStyle,'tip','Direct shot selection must work during a charged volley');
assert.ok((refs[startRef+2].current as Set<string>).has('j'));
const defenderRef=refs.length;exports.default({sport:'soccer'});const defender=refs[defenderRef].current as soccer.Soccer;
soccer.startSoccer(defender);defender.owner=4;
listeners.get('keydown')!(key('f'));assert.equal(defender.players[defender.active].action,'dive','Pass button becomes a deliberate tackle on defense');
listeners.get('keyup')!(key('f'));assert.equal(defender.pendingKick,'');
listeners.get('keydown')!(key('j'));assert.ok((refs[defenderRef+2].current as Set<string>).has('j'),'Holding the action through a tackle must continue into possession');
console.log('Passed: immediate strokes, direct alternate shot and a held action through defense.');
