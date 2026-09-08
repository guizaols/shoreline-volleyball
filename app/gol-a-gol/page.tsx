'use client';
import {useEffect,useRef,useState} from 'react';
import TouchControls from '../TouchControls';
import {readProgress} from '../../lib/cup';
import {goal,newFootball,startFootball,shootFootball,diveFootball,stepFootball,type Football} from '../../lib/gol';

function draw(ctx:CanvasRenderingContext2D,g:Football,beach:HTMLImageElement,name:string){
 ctx.clearRect(0,0,1000,620);
 if(beach.complete&&beach.naturalWidth)ctx.drawImage(beach,0,0,1000,620);
 else{ctx.fillStyle='#dbbd86';ctx.fillRect(0,0,1000,620);}
 ctx.fillStyle='#e8c28bdd';ctx.fillRect(45,110,910,410);
 ctx.strokeStyle='#fff7d8';ctx.lineWidth=3;ctx.strokeRect(70,115,860,400);
 ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(500,115);ctx.lineTo(500,515);ctx.stroke();ctx.setLineDash([]);
 for(const side of [0,1]){
  const x=side?930:30;ctx.fillStyle='#143e4933';ctx.fillRect(x,goal.top,40,190);ctx.strokeStyle='#c9e1da';
  ctx.lineWidth=1;for(let y=goal.top;y<=goal.bottom;y+=15){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+40,y);ctx.stroke();}
  for(let col=x;col<=x+40;col+=10){ctx.beginPath();ctx.moveTo(col,goal.top);ctx.lineTo(col,goal.bottom);ctx.stroke();}
  ctx.lineWidth=6;ctx.strokeStyle='#faf9e5';ctx.strokeRect(x,goal.top,40,190);
  ctx.lineWidth=2;ctx.strokeRect(side?790:70,185,140,260);
 }
 if(g.owner===0){
  ctx.strokeStyle='#ffe36b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(925,[240,315,390][g.aim],18,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#173e49';ctx.font='bold 12px sans-serif';ctx.fillText('ALVO',897,[240,315,390][g.aim]-24);
 }
 g.players.forEach((p,i)=>{
  const stride=Math.sin(g.clock*15)*Math.min(8,Math.hypot(p.vx,p.vy)/30);
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='#4d381740';ctx.beginPath();ctx.ellipse(0,10,21,10,0,0,Math.PI*2);ctx.fill();
  if(p.dive>0)ctx.rotate(Math.sign(p.vy)*.9);
  ctx.lineCap='round';ctx.lineWidth=8;ctx.strokeStyle='#76533c';
  ctx.beginPath();ctx.moveTo(-7,10);ctx.lineTo(-9,25+stride);ctx.moveTo(7,10);ctx.lineTo(10,25-stride);ctx.stroke();
  ctx.fillStyle='#172e43';ctx.fillRect(-12,0,24,15);
  ctx.fillStyle=i?'#ee8561':'#26bbaa';ctx.beginPath();ctx.roundRect(-14,-24,28,29,7);ctx.fill();
  ctx.strokeStyle='#c58d62';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-14,-17);ctx.lineTo(-24,p.dive>0?-28:-1);ctx.moveTo(14,-17);ctx.lineTo(24,p.dive>0?-28:-1);ctx.stroke();
  ctx.fillStyle='#cf996b';ctx.beginPath();ctx.arc(0,-34,11,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#343330';ctx.beginPath();ctx.arc(0,-37,10,Math.PI,Math.PI*2);ctx.fill();
  ctx.restore();ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#153e45';ctx.fillText(i?'RIVAL':name,p.x,p.y+47);
 });
 const b=g.ball;ctx.fillStyle='#543b3340';ctx.beginPath();ctx.ellipse(b.x+3,b.y+7,11,7,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fff';ctx.strokeStyle='#25434a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,10,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#203d44';ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5+g.clock*3;const x=b.x+Math.cos(a)*5,y=b.y+Math.sin(a)*5;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
 ctx.textAlign='left';
}
export default function GoalToGoal(){
 const canvas=useRef<HTMLCanvasElement>(null),game=useRef(newFootball()),keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),held=useRef(false);
 const [view,setView]=useState(newFootball),[name,setName]=useState('Você');
 const sync=()=>setView({...game.current,score:[...game.current.score]});
 const press=()=>{if(game.current.status==='ready'){startFootball(game.current);sync();return;}if(game.current.status==='playing'&&game.current.owner===0)held.current=true;};
 const release=()=>{if(held.current)shootFootball(game.current);held.current=false;sync();};
 const pause=()=>{held.current=false;game.current.charge=0;keys.current.clear();stick.current={x:0,z:0};if(game.current.status==='playing')game.current.status='paused';else if(game.current.status==='paused')game.current.status='playing';sync();};
 useEffect(()=>{
  let playerName='Você';try{playerName=readProgress(localStorage.getItem('shoreline-career-v2')).career.players[0].name;setName(playerName);}catch{}
  const ctx=canvas.current!.getContext('2d');if(!ctx)return;
  const beach=new Image();beach.src='/art/beach.png';
  let frame=0,last=0,accumulator=0,lastView='';
  const animate=(time:number)=>{
   accumulator+=Math.min(.1,(time-last)/1000);last=time;
   while(accumulator>=1/120){
    stepFootball(game.current,1/120,stick.current.x+(keys.current.has('d')||keys.current.has('arrowright')?1:0)-(keys.current.has('a')||keys.current.has('arrowleft')?1:0),
     stick.current.z+(keys.current.has('s')||keys.current.has('arrowdown')?1:0)-(keys.current.has('w')||keys.current.has('arrowup')?1:0),held.current);accumulator-=1/120;
   }
   draw(ctx,game.current,beach,playerName);
   const g=game.current,signature=[g.status,g.score.join(),g.owner,g.aim,Math.floor(g.charge*20),g.last].join(':');
   if(signature!==lastView){lastView=signature;sync();}
   frame=requestAnimationFrame(animate);
  };
  const down=(e:KeyboardEvent)=>{
   if((e.target as HTMLElement).closest('select,input,textarea'))return;
   const k=e.key.toLowerCase();
   if(k===' '&&(e.target as HTMLElement).closest('button,a'))return;
   if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','q','k','p'].includes(k))e.preventDefault();
   keys.current.add(k);
   if(!e.repeat){if(k===' ')press();if(k==='q')game.current.aim=(game.current.aim+1)%3;if(k==='k')diveFootball(game.current,(keys.current.has('s')?1:0)-(keys.current.has('w')?1:0));if(k==='p')pause();}
  };
  const up=(e:KeyboardEvent)=>{keys.current.delete(e.key.toLowerCase());if(e.key===' ')release();};
  const blur=()=>{if(game.current.status==='playing')pause();else{held.current=false;keys.current.clear();stick.current={x:0,z:0};}};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[]);
 return <main className="arcade-app football-app"><section className="game-shell">
  <div className="game-toolbar"><a href="/">← Esportes</a><strong>GOL A GOL · AREIA</strong><button onClick={e=>{pause();e.currentTarget.blur();}}>{view.status==='paused'?'Continuar':'Pausar'}</button></div>
  <div className="court football-court"><canvas ref={canvas} width={1000} height={620} aria-label="Gol a Gol: você protege o gol esquerdo. WASD move, espaço chuta, K mergulha."/>
   <div className="scoreboard"><div>{name}<b>{view.score[0]}</b></div><span>:</span><div><b>{view.score[1]}</b>RIVAL</div><small>PRIMEIRO A 5 GOLS</small></div>
   <div className="football-feedback" role="status">{view.owner===0?'SUA BOLA · MIRE E SEGURE PARA CHUTAR':view.owner===1?'PREPARE A DEFESA':view.last}</div>
   {['ready','over','paused'].includes(view.status)&&<div className="overlay"><div className="start-card"><span className="mini-label">SHORELINE · GOL A GOL</span><h2>{view.status==='over'?(view.score[0]===5?'A praia é sua!':'Hora da revanche!'):view.status==='paused'?'Pausa na areia':'Um gol de cada lado.'}</h2><p>Mova, defenda e chute. Cada atleta fica na sua metade.<br/>A lateral rebate; fora do gol dá reposição ao rival.</p><button className="primary" onClick={e=>{e.currentTarget.blur();if(view.status==='paused')pause();else{game.current=newFootball();startFootball(game.current);held.current=false;sync();}}}>{view.status==='over'?'Revanche':view.status==='paused'?'Continuar':'Jogar'}</button></div></div>}
   {view.status==='goal'&&<div className="football-goal" role="status">{view.message}</div>}
  </div>
  <div className="shot-bar"><small>{view.owner===0?'ESCOLHA O CANTO · SEGURE E SOLTE CHUTAR':'DEFESA AUTOMÁTICA AO ALCANÇAR A BOLA'}</small><div>{['Canto ↑','Centro','Canto ↓'].map((label,i)=><button key={i} aria-pressed={view.aim===i} onClick={e=>{game.current.aim=i;sync();e.currentTarget.blur();}}>{label}</button>)}<button onClick={e=>{diveFootball(game.current,stick.current.z);e.currentTarget.blur();}} disabled={view.status!=='playing'||view.owner===0}>Mergulhar · K</button><button className="desktop-kick" disabled={view.status!=='playing'||view.owner!==0}
 onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);press();}} onPointerUp={release}
 onPointerCancel={()=>{held.current=false;game.current.charge=0;}} onLostPointerCapture={()=>{held.current=false;}}
 onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)press();}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release();}}}>Segure e solte · Chutar</button></div>
 <meter className="football-power" min={0} max={1} value={view.charge} aria-label="Força do chute"/><small>{Math.round(view.charge*100)}% · FORÇA</small></div>
  <TouchControls flat onMove={(x,z)=>{stick.current={x,z};}} onPress={press} onRelease={release} onAim={()=>{game.current.aim=(game.current.aim+1)%3;sync();}} label="Chutar" charge={view.charge} enabled={view.status==='playing'}/>
  <p className="football-help">WASD / setas: mover · Espaço: segurar e soltar para chutar · Q: alvo · K: mergulhar · P: pausa</p>
 </section></main>;
}
