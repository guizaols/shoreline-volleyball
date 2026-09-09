'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import AchievementToast from '../AchievementToast';
import {athleteFrames} from '../../lib/athlete-art';
import TouchControls from '../TouchControls';
import {readProgress} from '../../lib/cup';
import {footballEffects,effectUnlocked,newFootballProgress,readFootballProgress,recordFootball,armFootballSpecial,goal,newFootball,startFootball,shootFootball,diveFootball,jumpFootball,stepFootball,type Football} from '../../lib/gol';

function draw(ctx:CanvasRenderingContext2D,g:Football,beach:HTMLImageElement,name:string,trail:{x:number;y:number}[],athlete:HTMLImageElement,reduced=false){
 ctx.clearRect(0,0,1000,620);
 if(beach.complete&&beach.naturalWidth)ctx.drawImage(beach,0,0,1000,620);
 else{ctx.fillStyle='#dbbd86';ctx.fillRect(0,0,1000,620);}
 const sand=ctx.createLinearGradient(0,110,0,530);sand.addColorStop(0,'#eacd99');sand.addColorStop(1,'#cfa36b');ctx.fillStyle=sand;ctx.fillRect(45,110,910,410);
 ctx.fillStyle='#87613718';for(let i=0;i<160;i++)ctx.fillRect(55+(i*167)%890,120+(i*53)%390,2,1);
 ctx.fillStyle='#0d3645';ctx.fillRect(45,91,910,18);ctx.fillRect(45,522,910,20);
 ctx.font='bold 10px sans-serif';ctx.fillStyle='#cce5da';for(let i=0;i<6;i++)ctx.fillText('SHORELINE  /  BEACH ARENA',65+i*150,535);
 ctx.strokeStyle='#fff3d380';ctx.lineWidth=2;ctx.beginPath();ctx.arc(500,315,66,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#fff3d370';ctx.font='900 27px sans-serif';ctx.textAlign='center';ctx.fillText('GOL A GOL',500,310);ctx.font='10px sans-serif';ctx.fillText('S H O R E L I N E',500,333);ctx.textAlign='left';
 ctx.strokeStyle='#fff7d8';ctx.lineWidth=3;ctx.strokeRect(70,115,860,400);
 ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(500,115);ctx.lineTo(500,515);ctx.stroke();ctx.setLineDash([]);
 for(const side of [0,1]){
  const x=side?930:30;ctx.fillStyle='#143e4933';ctx.fillRect(x,goal.top,40,190);ctx.strokeStyle='#c9e1da';
  ctx.lineWidth=1;for(let y=goal.top;y<=goal.bottom;y+=15){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+40,y);ctx.stroke();}
  for(let col=x;col<=x+40;col+=10){ctx.beginPath();ctx.moveTo(col,goal.top);ctx.lineTo(col,goal.bottom);ctx.stroke();}
  ctx.lineWidth=9;ctx.strokeStyle='#21434b66';ctx.strokeRect(x+4,goal.top+5,40,190);
  ctx.lineWidth=6;ctx.strokeStyle='#faf9e5';ctx.strokeRect(x,goal.top,40,190);
  ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.beginPath();ctx.moveTo(x,goal.top);ctx.lineTo(x+40,goal.top);ctx.stroke();
  ctx.lineWidth=2;ctx.strokeRect(side?790:70,185,140,260);
 }
 if(g.owner===0){
  ctx.strokeStyle='#ffe36b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(925,[240,315,390][g.aim],18,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#173e49';ctx.font='bold 12px sans-serif';ctx.fillText('ALVO',897,[240,315,390][g.aim]-24);
 }
 const effect=footballEffects.find(e=>e.id===g.effect)||footballEffects[0],effectColor=g.specialShot?'#fff078':g.lastShooter===0?effect.color:'#ffac86';
 if(trail.length>1&&!reduced){
  ctx.save();ctx.lineCap='round';ctx.shadowColor=effectColor;ctx.shadowBlur=g.effect==='classic'?0:12;
  for(let i=1;i<trail.length;i++){ctx.globalAlpha=i/trail.length*.65;ctx.strokeStyle=effectColor;ctx.lineWidth=i/trail.length*(g.specialShot?24:g.effect==='classic'?8:14);ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke();}
  ctx.restore();
 }
 g.players.forEach((p,i)=>{
  const speed=Math.hypot(p.vx,p.vy),stride=Math.sin(g.clock*15)*Math.min(10,speed/25),facing=i?-1:1,kick=Math.sin(p.kick/.32*Math.PI);
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='#513a2440';ctx.beginPath();ctx.ellipse(0,14,p.dive>0?35:22,10,0,0,Math.PI*2);ctx.fill();
  ctx.translate(0,-p.jump*.65);
  if(i===0){ctx.strokeStyle=g.owner===0?effect.color:'#5de7d3';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,14,27,12,0,0,Math.PI*2);ctx.stroke();}
  if(i===0&&g.charge>0){ctx.strokeStyle=effect.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-7,43,-Math.PI/2,-Math.PI/2+g.charge*Math.PI*2);ctx.stroke();}
  if(athlete.complete&&athlete.naturalWidth){
   const row=p.dive>0?5:p.jump>0||p.save>0?3:speed>25?1:0;
   const frame=p.dive>0?Math.min(5,Math.floor((1-p.dive/.28)*6)):Math.floor(g.clock*(speed>25?12:4))%6;
   const [sx,sy,sw,sh]=athleteFrames[row][frame],scale=.56;
   ctx.save();if(i===1)ctx.scale(-1,1);
   if(p.kick>0)ctx.rotate(-Math.sin(p.kick/.32*Math.PI)*.15);
   ctx.drawImage(athlete,sx,sy,sw,sh,-sw*scale/2,-sh*scale+14,sw*scale,sh*scale);
   ctx.restore();
  }else{
  ctx.rotate(p.dive>0?Math.sign(p.vy)*1.1:p.vx/300*.1);
  const skin=i?'#b97b50':'#d99e70';
  ctx.lineCap='round';ctx.lineJoin='round';
  const limb=(points:number[][],color:string,width:number)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  for(const side of [-1,1]){
   const footX=side===facing?side*9+facing*kick*29:side*9,footY=25+side*stride-kick*8;
   limb([[side*7,5],[side*10,16],[footX,footY]],'#263e42',11);
   limb([[side*7,7],[side*10,16],[footX,footY]],skin,7);
   limb([[footX-3,footY],[footX+6*facing,footY+1]],'#f9f1dc',6);
  }
  ctx.fillStyle='#152d43';ctx.beginPath();ctx.roundRect(-14,-2,28,15,4);ctx.fill();
  limb([[-7,6],[-7,13]],'#31516a',3);
  const arms=p.save>0||p.dive>0||p.jump>0;
  for(const side of [-1,1]){
   const handY=p.jump>0?-58:arms?-23:-2+side*stride*.4,handX=arms?side*31:side*23-facing*kick*9;
   limb([[side*12,-23],[side*20,-13],[handX,handY]],'#263e42',9);
   limb([[side*12,-23],[side*20,-13],[handX,handY]],skin,6);
   ctx.fillStyle='#f8eed7';ctx.beginPath();ctx.arc(handX,handY,4,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle=i?'#dc684c':'#159e98';ctx.strokeStyle='#1b4b52';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-15,-31,30,32,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=i?'#f99465':'#42d5bf';ctx.fillRect(-12,-27,24,7);
  ctx.fillStyle='#fff1c9';ctx.font='900 14px sans-serif';ctx.textAlign='center';ctx.fillText(i?'9':'1',0,-6);
  ctx.fillStyle=skin;ctx.fillRect(-5,-37,10,8);ctx.beginPath();ctx.ellipse(0,-44,11,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=i?'#3c271e':'#28332d';ctx.beginPath();ctx.ellipse(-2,-51,11,7,-.1,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-10,-51,4,9);
  ctx.fillStyle='#293837';ctx.fillRect(facing*4-1,-46,2,2);ctx.fillStyle='#ab6e50';ctx.fillRect(facing*9,-43,3,4);
  }
  ctx.restore();
  if(!reduced&&speed>80){ctx.fillStyle='#fbe0ac80';for(let j=0;j<5;j++){ctx.beginPath();ctx.arc(p.x-p.vx*.025-j*3,p.y+15+Math.sin(j*2+g.clock*7)*7,2+j*.5,0,Math.PI*2);ctx.fill();}}
  ctx.font='bold 11px sans-serif';ctx.textAlign='center';const label=i?'RIVAL':name;const width=ctx.measureText(label).width+16;
  ctx.fillStyle=i?'#903f37':'#124951';ctx.beginPath();ctx.roundRect(p.x-width/2,p.y+37,width,19,5);ctx.fill();ctx.fillStyle='#fff2d7';ctx.fillText(label,p.x,p.y+50);
 });
 if(g.impact.life>0){
  const phase=1-g.impact.life/.35;ctx.save();ctx.globalAlpha=1-phase;ctx.strokeStyle=g.impact.kind==='save'?'#71efd6':effectColor;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(g.impact.x,g.impact.y,12+phase*35,0,Math.PI*2);ctx.stroke();
  if(!reduced)for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.fillStyle=effectColor;ctx.fillRect(g.impact.x+Math.cos(a)*phase*50,g.impact.y+Math.sin(a)*phase*50,4,4);}
  ctx.restore();
 }
 if(g.status==='goal'&&!reduced){const phase=(1.2-g.delay)/1.2;for(let i=0;i<32;i++){ctx.fillStyle=[effect.color,'#fff2bb','#65dbca'][i%3];ctx.fillRect(70+(i*137)%860,120+phase*350+Math.sin(i)*45,4,9);}}
 const b=g.ball;ctx.fillStyle='#543b3340';ctx.beginPath();ctx.ellipse(b.x+3,b.y+7,11,7,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(0,-g.ballHeight*.65);ctx.fillStyle='#fff';ctx.strokeStyle='#25434a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,10,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#203d44';ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5+g.clock*3;const x=b.x+Math.cos(a)*5,y=b.y+Math.sin(a)*5;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
 ctx.restore();ctx.textAlign='left';
}
export default function GoalToGoal(){
 const canvas=useRef<HTMLCanvasElement>(null),game=useRef(newFootball()),keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),held=useRef(false);
 const [view,setView]=useState(newFootball),[name,setName]=useState('Você');
 const progressRef=useRef(newFootballProgress()),[progress,setProgress]=useState(newFootballProgress),[saveError,setSaveError]=useState(''),[unlocks,setUnlocks]=useState<string[]>([]);
 const dismiss=useCallback(()=>setUnlocks(q=>q.slice(1)),[]);
 const persist=(next:ReturnType<typeof newFootballProgress>)=>{progressRef.current=next;setProgress(next);try{localStorage.setItem('shoreline-goal-progress-v1',JSON.stringify(next));setSaveError('');}catch{setSaveError('Não foi possível salvar neste navegador.');}};
 const equip=(id:string)=>{if(!effectUnlocked(progressRef.current,id))return;game.current.effect=id;persist({...progressRef.current,effect:id});sync();};
 const sync=()=>setView({...game.current,score:[...game.current.score]});
 const press=()=>{if(game.current.status==='ready'){startFootball(game.current);sync();return;}if(game.current.status==='playing'&&game.current.owner===0)held.current=true;};
 const release=()=>{if(held.current)shootFootball(game.current);held.current=false;sync();};
 const pause=()=>{held.current=false;game.current.charge=0;keys.current.clear();stick.current={x:0,z:0};if(game.current.status==='playing')game.current.status='paused';else if(game.current.status==='paused')game.current.status='playing';sync();};
 useEffect(()=>{
  let playerName='Você';try{playerName=readProgress(localStorage.getItem('shoreline-career-v2')).career.players[0].name;setName(playerName);}catch{}
  try{const saved=readFootballProgress(localStorage.getItem('shoreline-goal-progress-v1'));progressRef.current=saved;setProgress(saved);game.current.effect=saved.effect;}catch{setSaveError('Progresso disponível apenas nesta sessão.');}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trail:{x:number;y:number}[]=[];
  const ctx=canvas.current!.getContext('2d');if(!ctx)return;
  const beach=new Image();beach.src='/art/beach.png';
  const athlete=new Image();athlete.src='/art/athlete-clean.png';
  let frame=0,last=0,accumulator=0,lastView='';
  const animate=(time:number)=>{
   accumulator+=Math.min(.1,(time-last)/1000);last=time;
   while(accumulator>=1/120){
    stepFootball(game.current,1/120,stick.current.x+(keys.current.has('d')||keys.current.has('arrowright')?1:0)-(keys.current.has('a')||keys.current.has('arrowleft')?1:0),
     stick.current.z+(keys.current.has('s')||keys.current.has('arrowdown')?1:0)-(keys.current.has('w')||keys.current.has('arrowup')?1:0),held.current);accumulator-=1/120;
   }
   if(game.current.owner<0&&game.current.status==='playing'){trail.push({x:game.current.ball.x,y:game.current.ball.y-game.current.ballHeight*.65});if(trail.length>14)trail.shift();}else trail.length=0;
   draw(ctx,game.current,beach,playerName,trail,athlete,reduced);
   if(game.current.status==='over'&&!game.current.recorded){
    const before=progressRef.current,next=recordFootball(before,game.current);
    const earned=footballEffects.filter(e=>!effectUnlocked(before,e.id)&&effectUnlocked(next,e.id));
    if(earned.length)setUnlocks(q=>[...q,...earned.map(e=>e.name)]);
    persist(next);
   }
   const g=game.current,signature=[g.status,g.score.join(),g.owner,g.aim,g.shotStyle,g.effect,g.energy,g.specialArmed,g.difficulty,Math.floor(g.charge*20),g.last].join(':');
   if(signature!==lastView){lastView=signature;sync();}
   frame=requestAnimationFrame(animate);
  };
  const down=(e:KeyboardEvent)=>{
   if((e.target as HTMLElement).closest('select,input,textarea'))return;
   const k=e.key.toLowerCase();
   if(k===' '&&(e.target as HTMLElement).closest('button,a'))return;
   if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','q','k','l','f','p'].includes(k))e.preventDefault();
   keys.current.add(k);
   if(!e.repeat){if(k===' ')press();if(k==='q')game.current.aim=(game.current.aim+1)%3;if(k==='k')diveFootball(game.current,(keys.current.has('s')?1:0)-(keys.current.has('w')?1:0));if(k==='f'){armFootballSpecial(game.current);sync();}if(k==='l')jumpFootball(game.current);if(k==='p')pause();}
  };
  const up=(e:KeyboardEvent)=>{keys.current.delete(e.key.toLowerCase());if(e.key===' ')release();};
  const blur=()=>{if(game.current.status==='playing')pause();else{held.current=false;keys.current.clear();stick.current={x:0,z:0};}};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[]);
 return <main className="arcade-app football-app"><section className="game-shell">
  <div className="game-toolbar"><a href="/">← Esportes</a><strong>GOL A GOL · AREIA</strong><select aria-label="Dificuldade" value={view.difficulty} onChange={e=>{game.current.difficulty=e.target.value;sync();}}><option value="arcade">Arcade · assistido</option><option value="pro">Pro</option></select><button onClick={e=>{pause();e.currentTarget.blur();}}>{view.status==='paused'?'Continuar':'Pausar'}</button></div>
  <div className="court football-court"><canvas ref={canvas} width={1000} height={620} aria-label="Gol a Gol: você protege o gol esquerdo. WASD move, espaço chuta, K mergulha."/>
   <div className="scoreboard"><div>{name}<b>{view.score[0]}</b></div><span>:</span><div><b>{view.score[1]}</b>RIVAL</div><small>PRIMEIRO A 5 GOLS</small></div>
   <div className="football-feedback" role="status">{view.owner===0?'SUA BOLA · MIRE E SEGURE PARA CHUTAR':view.owner===1?'PREPARE A DEFESA':view.last}</div>
   {['ready','over','paused'].includes(view.status)&&<div className="overlay"><div className="start-card"><span className="mini-label">SHORELINE · GOL A GOL</span><h2>{view.status==='over'?(view.score[0]===5?'A praia é sua!':'Hora da revanche!'):view.status==='paused'?'Pausa na areia':'DOMINE A ARENA.'}</h2><p>Mire direto ou use a tabela. Carregue, solte, comemore.<br/>Defesas, gols e tabelas carregam o Turbo. Ative no botão Turbo ou com F e solte um chute potente.</p><button className="primary" onClick={e=>{e.currentTarget.blur();if(view.status==='paused')pause();else{const difficulty=game.current.difficulty;game.current=newFootball();game.current.difficulty=difficulty;game.current.effect=progressRef.current.effect;startFootball(game.current);held.current=false;sync();}}}>{view.status==='over'?'Revanche':view.status==='paused'?'Continuar':'Jogar'}</button></div></div>}
   {view.status==='goal'&&<div className="football-goal" role="status">{view.message}</div>}
  </div>
  {unlocks[0]&&<AchievementToast key={unlocks[0]} title={`Efeito ${unlocks[0]}`} onDone={dismiss}/>}
  <div className="shot-bar"><button className="football-special" style={{background:`linear-gradient(90deg, #99712c ${view.energy}%, #28535b ${view.energy}%)`}} disabled={view.energy<100||view.owner!==0||view.status!=='playing'} aria-pressed={view.specialArmed} onClick={e=>{armFootballSpecial(game.current);sync();e.currentTarget.blur();}}>{view.specialArmed?'TURBO ARMADO · CHUTE!':view.energy>=100?'ATIVAR TURBO · F':`TURBO · ${view.energy}%`}</button><div className="football-shot-types">{[['direct','Direto'],['top','Tabela ↑'],['bottom','Tabela ↓'],['curve-up','Curva ↑'],['curve-down','Curva ↓'],['lob','Cobertura']].map(([style,label])=><button key={style} aria-pressed={view.shotStyle===style} onClick={e=>{game.current.shotStyle=style;sync();e.currentTarget.blur();}}>{label}</button>)}</div><small>{view.owner===0?'ESCOLHA O CANTO · SEGURE E SOLTE CHUTAR':'DEFESA AUTOMÁTICA AO ALCANÇAR A BOLA'}</small><div>{['Canto ↑','Centro','Canto ↓'].map((label,i)=><button key={i} aria-pressed={view.aim===i} onClick={e=>{game.current.aim=i;sync();e.currentTarget.blur();}}>{label}</button>)}<button onClick={e=>{diveFootball(game.current,stick.current.z);e.currentTarget.blur();}} disabled={view.status!=='playing'||view.owner===0}>Mergulhar · K</button><button disabled={view.status!=='playing'||view.owner===0} onClick={e=>{jumpFootball(game.current);e.currentTarget.blur();}}>Pular · L</button><button className="desktop-kick" disabled={view.status!=='playing'||view.owner!==0}
 onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);press();}} onPointerUp={release}
 onPointerCancel={()=>{held.current=false;game.current.charge=0;}} onLostPointerCapture={()=>{held.current=false;}}
 onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)press();}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release();}}}>Segure e solte · Chutar</button></div>
 <meter className="football-power" min={0} max={1} value={view.charge} aria-label="Força do chute"/><small>{Math.round(view.charge*100)}% · FORÇA</small></div>
  <TouchControls flat onMove={(x,z)=>{stick.current={x,z};}} onPress={press} onRelease={release} onAim={()=>{game.current.aim=(game.current.aim+1)%3;sync();}} label="Chutar" charge={view.charge} enabled={view.status==='playing'}/>
  <p className="football-help">WASD / setas: mover · Espaço: segurar e soltar para chutar · Q: alvo · K: mergulhar · L: pular · A/D: avançar e recuar · F: armar especial · P: pausa</p>
 </section>
 <section className="football-club" aria-label="Desafios e efeitos"><div className="football-club-heading"><div><small>SEU CAMINHO NA AREIA</small><h2>Jogue. Conquiste. Brilhe.</h2></div><p>{progress.wins} vitórias · {progress.goals} gols · {progress.saves} defesas</p></div>
 <p>Efeitos visuais equipáveis. As conquistas são salvas ao terminar a partida.</p>
 <div className="football-unlocks">{footballEffects.map(effect=>{const unlocked=effectUnlocked(progress,effect.id);return <button key={effect.id} disabled={!unlocked} aria-pressed={progress.effect===effect.id} onClick={e=>{equip(effect.id);e.currentTarget.blur();}}>
 <span className="effect-orb" style={{background:effect.color,boxShadow:`0 0 24px ${effect.color}88`}}/><strong>{effect.name}</strong><small>{effect.description}</small><span>{unlocked?(progress.effect===effect.id?'EQUIPADO':'EQUIPAR'):`${Math.min(progress[effect.metric],effect.target)}/${effect.target}`}</span></button>;})}</div>
 <p role="status">{saveError}</p></section></main>;
}
