'use client';
import {attributes,events,nations,improve,standings,canEnter,type Attribute} from '../lib/career';
import {achievements,opponents,type Progress} from '../lib/cup';

export default function CareerPanel({progress,onChange,onEvent,onFriendly}:{progress:Progress;onChange:(p:Progress)=>void;onEvent:(index:number)=>void;onFriendly:(index:number)=>void}){
 const career=progress.career,busy=progress.stage<3&&(progress.stage>0||progress.score.some(Boolean));
 return <div className="career-panel">
 <details className="trophy-cabinet" open><summary>Conquistas · {achievements(progress).filter(a=>a.unlocked).length}/{achievements(progress).length}</summary>
 <div className="badge-grid">{achievements(progress).map(a=><div key={a.id} className={a.unlocked?'earned':'locked'}><span aria-hidden="true">{a.unlocked?'★':'◇'}</span><strong>{a.title}</strong><small>{a.detail} · {a.unlocked?'Conquistado':'Bloqueado'}</small></div>)}</div></details>
 <details><summary>{career.country} · {career.players.map(p=>p.name).join(' & ')} · Editar dupla</summary>
 <form key={career.country+career.players.map(p=>p.name).join('|')} onSubmit={e=>{
  e.preventDefault();const data=new FormData(e.currentTarget);
  onChange({...progress,career:{...career,country:String(data.get('country')),players:career.players.map((p,i)=>({...p,name:String(data.get('name'+i)||'').trim().slice(0,24)||['Alex','Dani'][i]}))}});
 }}>
 <label>Nacionalidade<select name="country" defaultValue={career.country}>{nations.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>
 {career.players.map((player,i)=><label key={i}>Atleta {i+1}<input name={'name'+i} maxLength={24} defaultValue={player.name} placeholder={['Alex','Dani'][i]}/></label>)}
 <button type="submit">Salvar dupla</button></form></details>
 <details><summary>Evolução dos atletas</summary><p>100 XP = 1 ponto. Cada melhoria acrescenta 5 ao atributo (máximo 100). Saque e ataque aumentam a velocidade da bola; defesa amplia o alcance; mobilidade acelera o deslocamento.</p>
 <div className="athlete-stats">{career.players.map((player,i)=><section key={i}><strong>{player.name}</strong><small>{player.xp} XP · {player.points} pontos disponíveis</small>
 {(Object.keys(attributes) as Attribute[]).map(key=><div key={key}><span>{attributes[key]} · {player.stats[key]}</span><button aria-label={`Melhorar ${attributes[key]} de ${player.name}`} disabled={!player.points||player.stats[key]>=100} onClick={()=>onChange({...progress,career:improve(career,i,key)})}>+5</button></div>)}
 </section>)}</div></details>
 <details><summary>Ranking mundial · {standings(career).findIndex(r=>r.you)+1}º lugar</summary><p>Os rivais pontuam a cada partida de carreira. Olimpíadas: 300 pontos e top 4; em empate, os rivais ficam à frente.</p>
 <table className="ranking-table"><thead><tr><th>Pos.</th><th>Dupla</th><th>Pontos</th></tr></thead><tbody>{standings(career).map((row,i)=><tr key={row.name} className={row.you?'your-ranking':''}><td>{i+1}</td><td>{row.country} · {row.name}{row.you?' (você)':''}</td><td>{row.points}</td></tr>)}</tbody></table></details>
 <details><summary>Calendário · {career.ranking} pontos no circuito</summary><p>Vitória: 30 pontos · derrota: 5 · título: +30. Conclua o torneio em andamento antes de trocar.</p>
 {events.map((event,i)=><div className="calendar-event" key={event.name}><span><strong>{progress.completed.includes(i)?'✓ ':''}{event.name}</strong><small>{event.location} · {event.required?event.required+' pontos'+(i===3?' e top 4':' para entrar'):'Aberto'}</small></span>
 <button disabled={((i!==progress.event||progress.stage===3)&&!canEnter(career,i))||(busy&&i!==progress.event)} onClick={()=>onEvent(i)}>{i===progress.event&&progress.stage<3?'Continuar':'Jogar'}</button></div>)}</details>
 <details><summary>Amistosos</summary><p>Escolha o adversário. O resultado não altera XP, atributos nem ranking.</p>{opponents.map((opponent,i)=><button key={opponent.name} onClick={()=>onFriendly(i)}>{opponent.name}</button>)}</details>
 <details><summary>Histórico · últimas {career.history.length} partidas</summary>{career.history.length?career.history.slice().reverse().map((match,i)=><p key={i}>{match.won?'Vitória':'Derrota'} · {match.score} × {match.opponent}<small>{match.event}</small></p>):<p>Jogue seu primeiro torneio para começar.</p>}</details>
 </div>;
}
