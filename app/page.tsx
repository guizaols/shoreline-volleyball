'use client';
import BetaTools from './BetaTools';
import CareerPanel from './CareerPanel';
import {events} from '../lib/career';
import {applyCareer,beginEvent,rematch,eventOpponents,opponents,lessons,newProgress,readProgress,recordProgress,cupGame,challengeGame,type Progress} from '../lib/cup';
import TouchControls from './TouchControls';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Maximize, Pause, Play, RotateCcw, Volleyball, Wind, X } from 'lucide-react';
import { createGame, cycleAim, aimPresets, startPractice, prepareServe, serve, toss, setAttackStyle, switchPlayer, setAim, setServeStyle, type Game } from '../lib/game';

export default function Home(){
 const canvas=useRef<HTMLDivElement>(null), game=useRef(createGame()), keys=useRef(new Set<string>()), level=useRef('Club'), region=useRef<HTMLDivElement>(null);
 const [view,setView]=useState({...game.current}),[difficulty,setDifficulty]=useState('Club'),[help,setHelp]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const stick=useRef({x:0,z:0});
 const progressRef=useRef(newProgress()),menuVisible=useRef(true);
 const [menuPage,setMenuPage]=useState('home');
 const [progress,setProgress]=useState(newProgress),[cupOpen,setCupOpen]=useState(true),[saveError,setSaveError]=useState('');
 menuVisible.current=cupOpen;
 const persist=(next:Progress)=>{if(JSON.stringify(next)===JSON.stringify(progressRef.current))return;progressRef.current=next;setProgress(next);try{localStorage.setItem('shoreline-career-v2',JSON.stringify(next));setSaveError('');}catch{setSaveError('Não foi possível salvar neste navegador.');}};
 const sync=()=>{persist(recordProgress(progressRef.current,game.current));setView({...game.current,score:[...game.current.score]});};
 const openCup=()=>{setMenuPage('home');keys.current.clear();stick.current={x:0,z:0};if(['playing','tossing','practice-wait'].includes(game.current.status)){game.current.resumeStatus=game.current.status;game.current.status='paused';}setCupOpen(true);sync();};
 const configure=(g:Game)=>Object.assign(g,{serveStyle:game.current.serveStyle,attackStyle:game.current.attackStyle,power:game.current.power});
 const enterCup=()=>{let p=progressRef.current;if(p.stage===3){const next=beginEvent(p,p.event);if(next===p){setSaveError('Recupere a classificação no circuito antes de entrar novamente.');return;}p=next;persist(p);}game.current=configure(cupGame(p));keys.current.clear();stick.current={x:0,z:0};setCupOpen(false);sync();};
 const lesson=(index:number)=>{if(index>progressRef.current.training)return;game.current=applyCareer(challengeGame(index,progressRef.current.gold),progressRef.current);keys.current.clear();stick.current={x:0,z:0};setCupOpen(false);sync();};
 const start=()=>{
   if(game.current.status==='challenge-complete'){if(game.current.challenge<2)lesson(game.current.challenge+1);else openCup();return;}
   if(game.current.status==='over'){
     if(game.current.cupStage>=0){
       if(game.current.cupStage===2&&game.current.score[0]>game.current.score[1]){openCup();return;}
       if(game.current.score[0]<game.current.score[1])persist(rematch(progressRef.current));
       game.current=configure(cupGame(progressRef.current));
     }else{friendly(game.current.friendlyOpponent);}
   }
   prepareServe(game.current);keys.current.clear();stick.current={x:0,z:0};sync();
 };
 const release=()=>{if(game.current.status==='serving')toss(game.current);else serve(game.current);keys.current.clear();stick.current={x:0,z:0};sync();};
 const pause=()=>{setCupOpen(false);keys.current.clear();stick.current={x:0,z:0};if(['playing','tossing','practice-wait'].includes(game.current.status)){game.current.resumeStatus=game.current.status;game.current.status='paused';}else if(game.current.status==='paused')game.current.status=game.current.resumeStatus;sync();};
 const friendly=(index:number)=>{setCupOpen(false);const g=configure(applyCareer(createGame(),progressRef.current));g.friendlyOpponent=index;g.cpuStyle=opponents[index].style;g.cpuTier=Math.floor(index/3);g.opponentCountry=opponents[index].country;g.opponentPlayers=[...opponents[index].players];g.opponentName=opponents[index].name;g.pointGoal=7;game.current=g;keys.current.clear();stick.current={x:0,z:0};sync();};
 const reset=()=>friendly(0);
 const selectEvent=(index:number)=>{const p=progressRef.current;if(index!==p.event||p.stage===3){const next=beginEvent(p,index);if(next===p)return;persist(next);}enterCup();};
 const practice=()=>{setCupOpen(false);game.current=applyCareer(createGame(),progressRef.current);startPractice(game.current);keys.current.clear();stick.current={x:0,z:0};sync();};
 const changeStyle=()=>{setAttackStyle(game.current,game.current.attackStyle==='tip'?'power':'tip');sync();};
 const nextAim=()=>{cycleAim(game.current);sync();};
 const changePlayer=()=>{switchPlayer(game.current);sync();};
 const aim=(x:number,z:number)=>{setAim(game.current,x,z);sync();};
 useEffect(()=>{
 try{const saved=readProgress(localStorage.getItem('shoreline-career-v2')||localStorage.getItem('shoreline-cup-v1'));progressRef.current=saved;setProgress(saved);}catch{setSaveError('Progresso disponível apenas nesta sessão.');}
 let disposed=false,engine:{destroy:(removeCanvas:boolean)=>void}|undefined;
 import('../lib/court').then(({mountCourt})=>{
   if(disposed||!canvas.current)return;
   engine=mountCourt(canvas.current,()=>game.current,keys.current,()=>level.current,()=>{if(!disposed)sync();},()=>{if(!disposed)setLoaded(true);},message=>{if(!disposed)setError(message);},()=>stick.current);
 }).catch(()=>{if(!disposed)setError('Não foi possível abrir a quadra. Recarregue a página.');});
 const map=(k:string)=>['a','ArrowLeft'].includes(k)?'left':['d','ArrowRight'].includes(k)?'right':['w','ArrowUp'].includes(k)?'up':['s','ArrowDown'].includes(k)?'down':k===' '?'jump':k==='j'?'prepare':k==='i'?'attack':k==='k'?'dive':k==='l'?'block':'';
 const down=(e:KeyboardEvent)=>{if(menuVisible.current)return;if((e.target as HTMLElement).matches('select,input')||(e.target as HTMLElement).closest('[role=dialog]'))return;const k=map(e.key.length===1?e.key.toLowerCase():e.key);if(k){e.preventDefault();keys.current.add(k);if(k==='jump'&&!e.repeat){if(game.current.status==='ready'){start();return;}if(['serving','tossing'].includes(game.current.status)){release();return;}}}if(e.key.toLowerCase()==='f'&&!e.repeat){e.preventDefault();changeStyle();}if(e.key.toLowerCase()==='q'&&!e.repeat){e.preventDefault();nextAim();}if(e.key.toLowerCase()==='p'&&!e.repeat)pause();if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();changePlayer();}};const up=(e:KeyboardEvent)=>keys.current.delete(map(e.key.length===1?e.key.toLowerCase():e.key));const blur=()=>{keys.current.clear();stick.current={x:0,z:0};if(['playing','tossing','practice-wait'].includes(game.current.status)){game.current.resumeStatus=game.current.status;game.current.status='paused';sync();}};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);return()=>{disposed=true;engine?.destroy(true);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[]);
 const play=()=>{const status=game.current.status;if(status==='ready'||status==='over')start();else if(status==='serving'||status==='tossing')release();else if(status==='playing')keys.current.add('touch-prepare');};
 const playLabel=view.status==='serving'?'Lançar':view.status==='tossing'?'Sacar':view.lastTeam===0?(view.touches>=2?(view.attackStyle==='tip'?'Largar':'Cortar'):'Levantar'):'Jogar';
 return <main className="arcade-app">
 <section className={`game-shell ${cupOpen?'cup-open':''}`} ref={region}><div className="game-toolbar"><div className="court-label"><span className="live-dot"/> BEACH VOLLEYBALL <span className="tag">2 VS 2</span></div><div className="tools"><button onClick={openCup}>Carreira</button><button className="mobile-mode" onClick={practice}>Treino</button><button className="mobile-mode" onClick={reset}>Partida</button><button aria-label="Pause or resume game" onClick={pause}>{view.status==='paused'?<Play size={17}/>:<Pause size={17}/>}</button><button aria-label="Restart match" onClick={reset}><RotateCcw size={16}/></button><button aria-label="Toggle fullscreen" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void region.current?.requestFullscreen?.().catch(()=>{});}}><Maximize size={17}/></button></div></div>
 <div className="court"><div ref={canvas} className="phaser-court" role="img" aria-label="Quadra de vôlei em perspectiva. WASD move, espaço salta, E troca jogador, J prepara o contato, K mergulha."/><div className="scoreboard"><div><span className="you-dot"/> {view.country} <b>{view.score[0]}</b></div><span className="score-divider">:</span><div><b>{view.score[1]}</b> {view.opponentCountry} · {view.opponentName} <span className="cpu-dot"/></div><small>{view.practice?`TREINO · ${view.repetitions} SEQUÊNCIAS`:`ATÉ ${view.pointGoal} · VANTAGEM DE 2`}</small></div><span className="location"><span/> PALM COVE, SOMEWHERE SUNNY</span>
 {!cupOpen&&(!loaded||!['playing','serving','tossing','practice-wait'].includes(view.status))&&<div className="overlay"><div className="start-card"><span className="mini-label">{view.status==='paused'?'TAKE A BREATHER':view.status==='challenge-complete'?'DESAFIO CONCLUÍDO':view.status==='over'?'FIM DA PARTIDA':view.score[0]+view.score[1]>0?'KEEP THE GOOD TIMES GOING':'YOUR DAILY DOSE OF VITAMIN SEA'}</span><h2>{error||(!loaded?'Preparing your court…':view.status==='paused'?'Back in a splash.':view.status==='challenge-complete'?'Boa! Vamos ao próximo.':view.status==='over'&&view.cupStage>=0?(view.score[0]>view.score[1]?(view.cupStage===2?`Campeões · ${events[view.event].name}!`:'Vitória! Próxima etapa liberada.'):'Tente outra estratégia na revanche.'):view.message)}</h2><p>{view.status==='paused'?'The court will be right here.':view.status==='over'?`${view.score[0]} – ${view.score[1]} · ${view.cupStage===2&&view.score[0]>view.score[1]?'Uniforme dourado desbloqueado!':'Pronto para a próxima?' }`:view.lastRally?`${view.pointReason} · ${view.lastRally} contatos · Recorde: ${view.bestRally}`:'Two on your side. Two across the net. Let’s rally.'}</p><button className="primary" disabled={!loaded||!!error} onClick={view.status==='paused'?pause:start}>{view.status==='paused'?'Resume game':view.status==='challenge-complete'?(view.challenge<2?'Próximo desafio':'Voltar à copa'):view.status==='over'?(view.cupStage>=0&&view.score[0]>view.score[1]?(view.cupStage===2?'Ver troféu':'Próximo adversário'):'Revanche'):view.score[0]+view.score[1]>0?'Preparar próximo saque':'Entrar na quadra'} <ArrowUpRight size={18}/></button><small>{view.status==='ready'?'or press space to serve':'Make yourself at home.'}</small></div></div>}
 {cupOpen&&<div className={`overlay cup-overlay ${menuPage==='home'?'arcade-home':''}`}><section className="cup-card" aria-label="Menu do jogo">
 {menuPage==='home'?<>
 <span className="arcade-badge">BEACH VOLLEY · BETA</span><h1 className="arcade-title">SHORE<span>LINE</span></h1><p className="arcade-tagline">A praia é sua quadra.</p>
 <nav className="arcade-menu" aria-label="Modos de jogo">
 <button className="arcade-play" disabled={!loaded||!!error} onClick={()=>view.status==='paused'?pause():friendly(0)}>{view.status==='paused'?'CONTINUAR':'JOGAR AGORA'} <span>{view.status==='paused'?'Sua partida está esperando':'Amistoso · direto para a quadra'}</span></button>
 <button onClick={()=>setMenuPage('career')}>CARREIRA <span>{progress.career.country} · {progress.career.players.map(p=>p.name).join(' & ')}</span></button>
 <button onClick={()=>setMenuPage('training')}>TREINO <span>Aprenda os golpes · {progress.training}/3 desafios</span></button>
 <button onClick={()=>setMenuPage('settings')}>OPÇÕES <span>Controles · instalar · transferir carreira</span></button>
 </nav><small className="arcade-footer">2 JOGADORES POR LADO · UMA PRAIA INTEIRA PARA CONQUISTAR</small>
 </>:<>
 <button className="menu-back" onClick={()=>setMenuPage('home')}>← Menu principal</button>
 <h2>{menuPage==='career'?events[progress.event].name:menuPage==='training'?'DOMINE A QUADRA':'DO SEU JEITO'}</h2>
 {menuPage==='career'&&<>
 <CareerPanel progress={progress} onChange={persist} onEvent={selectEvent} onFriendly={friendly}/>
 <ol>{eventOpponents(progress.event).map((opponent,i)=><li key={opponent.name} className={progress.stage>i?'complete':progress.stage===i?'current':''}><strong>{progress.stage>i?'✓':i+1} · {opponent.country} · {opponent.name}</strong><small>{opponent.players.join(' & ')}</small><small>{opponent.description}</small></li>)}</ol>
 <button className="primary" disabled={!loaded||!!error} onClick={enterCup}>{progress.stage===3?'Repetir torneio':progress.score.some(Boolean)?'Continuar torneio':progress.stage?'Próxima etapa':'Começar torneio'}</button>
 {progress.champion&&<label className="cup-uniform"><input type="checkbox" checked={progress.gold} onChange={e=>{persist({...progressRef.current,gold:e.target.checked});game.current.gold=e.target.checked;sync();}}/> Uniforme dourado de campeão</label>}
 </>}
 {menuPage==='training'&&<div className="training-menu">{lessons.map((name,i)=><button key={name} disabled={!loaded||i>progress.training} onClick={()=>lesson(i)}><strong>{progress.training>i?'✓':i+1}</strong>{name}</button>)}<button onClick={practice} disabled={!loaded}>Treino livre</button></div>}
 {menuPage==='settings'&&<>
 <button className="menu-back" onClick={()=>setHelp(true)}>Ver todos os controles</button>
 <label className="arcade-option">Dificuldade<select value={difficulty} onChange={e=>{setDifficulty(e.target.value);level.current=e.target.value;}}><option value="Chill">Tranquilo</option><option value="Club">Clube</option><option value="Pro">Profissional</option></select></label>
 <p>Computador: WASD move · J prepara · Q mira · F troca golpe.<br/>Celular: direcional à esquerda · Jogar, Alvo e Golpe à direita.</p>
 {!view.practice&&<section className="shot-controls" aria-label="Mira e saque">
   <div className="aim-settings"><strong>Mire na quadra adversária</strong><p>Toque na quadra ou ajuste o alvo. Vale para saques e ataques.</p>
   <label>Curto ↔ Fundo<input type="range" min="570" max="935" value={view.aim.x} onChange={e=>aim(Number(e.target.value),game.current.aim.z)} aria-label="Profundidade do alvo"/></label>
   <label>Linha ↔ Diagonal<input type="range" min="55" max="395" value={view.aim.z} onChange={e=>aim(game.current.aim.x,Number(e.target.value))} aria-label="Direção do alvo"/></label></div>
   <div className="serve-settings"><label>Saque<select aria-label="Tipo de saque" value={view.serveStyle} onChange={e=>{setServeStyle(game.current,e.target.value);sync();}}><option value="underhand">Por baixo · seguro</option><option value="float">Flutuante · controlado</option><option value="jump">Em salto · rápido</option></select></label>
   <label>Ataque<select aria-label="Tipo de ataque" value={view.attackStyle} onChange={e=>{setAttackStyle(game.current,e.target.value);sync();}}><option value="power">Cortada</option><option value="roll">Colocado</option><option value="tip">Largadinha</option></select></label><p>Segure J para preparar qualquer contato. I ataca na primeira ou segunda bola. L + direção da rede para bloquear.</p><label>Força · {Math.round(view.power*100)}%<input aria-label="Força de saque e ataque" type="range" min="0.7" max="1.25" step="0.05" value={view.power} onChange={e=>{game.current.power=Number(e.target.value);sync();}}/></label>
   <label className="auto-switch"><input type="checkbox" checked={view.autoSwitch} onChange={e=>{game.current.autoSwitch=e.target.checked;sync();}}/> Troca automática de jogador</label><p>Espaço lança a bola; pressione de novo na faixa verde para bater. Mire tocando na quadra.</p></div>
 </section>}
 <label className="assist-toggle"><input type="checkbox" disabled={view.practice} checked={view.windEnabled} onChange={e=>{game.current.windEnabled=e.target.checked;if(!game.current.windEnabled)game.current.wind=0;sync();}}/> Vento variável · {view.wind>=0?'↓':'↑'} {Math.abs(view.wind).toFixed(0)} · observe o desvio lateral</label>
 <p className="guide-legend">Círculo branco: queda da bola · Círculo azul/verde: onde se posicionar · {view.practice?'Pressione Q para escolher o alvo amarelo e segure J até o contato. Você pode escolher o alvo antes da bola chegar.':'No ataque, espere “PULE AGORA”.'}</p>
 <label className="assist-toggle"><input type="checkbox" checked={view.assist} onChange={e=>{game.current.assist=e.target.checked;sync();}}/> Ajuda de contato e ajuste fino de posição ao soltar os controles</label>
 </>}
 <div hidden={menuPage!=='settings'}><BetaTools progress={progress} onImport={p=>{game.current=applyCareer(createGame(),p);persist(p);keys.current.clear();stick.current={x:0,z:0};sync();}}/></div>
 </>}
 <small role="status">{error||saveError||(!loaded?'Preparando a quadra…':menuPage==='career'?'Carreira salva neste navegador':'')}</small>
 </section></div>}
 {view.challenge>=0&&!cupOpen&&view.status==='playing'&&<div className="lesson-hint">{lessons[view.challenge]}</div>}
 {['serving','tossing'].includes(view.status)&&<div className="serve-prompt"><div><strong>{view.server?'Saque adversário':view.status==='tossing'?'Espaço novamente para bater':'1. Escolha tipo, força e mira · 2. Lance a bola'}</strong><small>{view.tossQuality||'Bata quando a barra estiver verde'}</small>{view.status==='tossing'&&<div className="toss-meter"><span style={{left:`${Math.min(100,view.tossTime/1.15*100)}%`}}/></div>}</div><button className="primary" onClick={release} disabled={view.server===1&&view.status==='tossing'}>{view.status==='tossing'?'Bater agora':view.server?'Pronto para receber':'Lançar bola'} · Espaço</button></div>}

 {view.feedbackTime>0&&<div role="status" className={`contact-feedback ${view.feedback.endsWith('RUIM')?'poor':''}`}>{view.feedback}<small>{view.contactHint}</small></div>}
 {view.status==='playing'&&<span className="rally">{view.rally?`${view.shot} · ${view.rally} hits`:'Find the ball. Make it yours.'}</span>}</div>
 <TouchControls onMove={(x,z)=>{stick.current={x,z};}} onPress={play} onRelease={()=>keys.current.delete('touch-prepare')} onAim={nextAim} onStyle={changeStyle} styleLabel={view.attackStyle==='tip'?'Largada':'Cortada'} label={playLabel} charge={view.players[view.active]?.preparation||0} enabled={loaded&&!error&&view.status!=='paused'&&view.status!=='challenge-complete'&&!help&&!cupOpen}/>
 <div className="game-bottom"><span><Wind size={15}/> Player {view.active+1} · <button className="switch-player" onClick={changePlayer}>E · Switch</button> · {view.autoSwitch?'AUTO':'MANUAL'}</span><label>YOUR PACE <select aria-label="Computer difficulty" value={difficulty} onChange={e=>{setDifficulty(e.target.value);level.current=e.target.value;}}><option>Chill</option><option>Club</option><option>Pro</option></select></label></div></section>
 <span className="sr-only" aria-live="polite">{view.country} {view.score[0]}, {view.opponentName} {view.score[1]}.</span>
 {help&&<div className="modal-backdrop"><section className="help" role="dialog" aria-modal="true" aria-label="How to play"><button className="close" aria-label="Close instructions" autoFocus onClick={()=>setHelp(false)}><X/></button><Volleyball size={32}/><h2>A little beach etiquette.</h2><p>Move across the court with WASD or all four arrow keys, including toward and away from the net line in perspective. Jump with space. Automatic switching selects the receiver; the ring marks who you control. E also switches manually. Turn automatic switching off below the court if preferred. On a phone, use the virtual stick on the left and hold Jogar on the right. Alvo changes your target; Golpe switches between a spike and a tip. F does the same on the keyboard. Preparation improves quality without changing the selected shot. The same button launches and strikes your serve on separate presses.</p><p>Receive automatically, pass to your partner, then attack on the third touch. Hold I for a first- or second-ball attack; choose power, roll or tip below. Hold L near the net to jump and block. Wind changes direction and drifts the ball; the landing guide updates with it. Press K plus a direction to dive forward, backward or diagonally. K alone dives toward the predicted ball. You slide and recover before moving again. Your partner also dives for difficult low balls. Press Q to cycle through four targets, shown by the yellow marker. Alternatively, click or drag on the opposing court (or tap on mobile) to aim. In practice, hold the mouse button or J to prepare; WASD always moves your player. J prepares the contextual contact in both practice and matches, including assisted jumps, dives and blocks near the net. You can also use the target sliders below. Choose underhand, float or jump serve and adjust power. Your partner covers the court and sets you up. Each team has three touches; the same player cannot touch twice in a row.</p><p>Land the ball on Coast’s side to score. First to 11 wins, with a two-point lead. Press P to pause.</p><button className="primary" onClick={()=>setHelp(false)}>Got it. Let’s rally <ArrowUpRight size={18}/></button></section></div>}
 </main>;
}
