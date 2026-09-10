import {redirect} from 'next/navigation';
import {Volleyball,Goal,ArrowUpRight} from 'lucide-react';

export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {room}=await searchParams;
 // Keep volleyball invitations created before the sports menu working.
 if(typeof room==='string')redirect(`/volei?room=${encodeURIComponent(room)}`);
 return <main className="sports-home">
  <header className="sports-header"><a href="/" aria-label="Shoreline início">SHORELINE<span>BEACH SPORTS</span></a><span>DE PÉS NA AREIA.</span></header>
  <section className="sports-select" aria-labelledby="sports-title">
   <p className="sports-eyebrow">SUA PRAIA. SEU JOGO.</p>
   <h1 id="sports-title">Escolha a sua<br/><em>próxima partida.</em></h1>
   <p className="sports-intro">Dois esportes. Uma praia inteira para jogar.</p>
   <nav className="sports-grid" aria-label="Escolha seu esporte">
    <article className="sport-card sport-volley"><div className="sport-card-top"><span>DUPLAS · 2 × 2</span><Volleyball size={62} strokeWidth={1.4}/></div><div><h2>VÔLEI <br/>DE PRAIA</h2><p>Ralis, mergulhos e aquela cortada.</p><small>Amistosos · Online · Carreira · Treinos</small></div><div className="sport-actions"><a href="/volei">ENTRAR NA QUADRA <ArrowUpRight size={20}/></a><a className="sport-online" href="/volei?online=1">JOGAR ONLINE · CRIAR CONVITE</a></div></article>
    <article className="sport-card sport-goal"><div className="sport-card-top"><span>DUELO · 1 × 1</span><Goal size={62} strokeWidth={1.4}/></div><div><h2>GOL <br/>A GOL</h2><p>Defenda sua praia. Solte o especial.</p><small>Partida rápida · Online · Desafios e efeitos</small></div><div className="sport-actions"><a href="/gol-a-gol">ENTRAR NA ARENA <ArrowUpRight size={20}/></a><a className="sport-online" href="/gol-a-gol?online=1">JOGAR ONLINE · CRIAR CONVITE</a></div></article>
   </nav>
   <footer>NO COMPUTADOR OU CELULAR <span>•</span> CONVIDE UM AMIGO POR LINK</footer>
  </section>
 </main>;
}
