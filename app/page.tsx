import Link from 'next/link';
import {redirect} from 'next/navigation';
import {Volleyball,Goal,ArrowUpRight,Disc} from 'lucide-react';
import HomeProgress from './HomeProgress';

export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {room}=await searchParams;
 // Keep volleyball invitations created before the sports menu working.
 if(typeof room==='string')redirect(`/volei?room=${encodeURIComponent(room)}`);
 return <main className="sports-home">
  <header className="sports-header"><Link href="/" aria-label="Shoreline início">SHORELINE<span>BEACH SPORTS</span></Link><span>DE PÉS NA AREIA.</span></header>
  <section className="sports-select" aria-labelledby="sports-title">
   <p className="sports-eyebrow">SUA PRAIA. SEU JOGO.</p>
   <h1 id="sports-title">Escolha a sua<br/><em>próxima partida.</em></h1>
   <p className="sports-intro">Oito esportes. Uma praia inteira para jogar.</p>
   <HomeProgress/>
   <nav className="sports-grid" aria-label="Escolha seu esporte">
    <article className="sport-card sport-volley"><div className="sport-card-top"><span>DUPLAS · 2 × 2</span><Volleyball size={62} strokeWidth={1.4}/></div><div><h2>VÔLEI <br/>DE PRAIA</h2><p>Ralis, mergulhos e aquela cortada.</p><small>Amistosos · Online · Carreira · Treinos</small></div><div className="sport-actions"><Link href="/volei">ENTRAR NA QUADRA <ArrowUpRight size={20}/></Link><Link className="sport-online" href="/volei?online=1">JOGAR ONLINE · CRIAR CONVITE</Link></div></article>
    <article className="sport-card sport-goal"><div className="sport-card-top"><span>DUELO · 1 × 1</span><Goal size={62} strokeWidth={1.4}/></div><div><h2>GOL <br/>A GOL</h2><p>Defenda sua praia. Solte o especial.</p><small>Partida rápida · Online · Desafios e efeitos</small></div><div className="sport-actions"><Link href="/gol-a-gol">ENTRAR NA ARENA <ArrowUpRight size={20}/></Link><Link className="sport-online" href="/gol-a-gol?online=1">JOGAR ONLINE · CRIAR CONVITE</Link></div></article>
    <article className="sport-card sport-footvolley"><div className="sport-card-top"><span>DUPLAS · 2 × 2</span><Volleyball size={62} strokeWidth={1.4}/></div><div><h2>FUTEVÔLEI</h2><p>Pé, peito e cabeça. A bola não pode cair.</p><small>Contra a CPU · Três contatos · Sem mãos</small></div><div className="sport-actions"><Link href="/futevolei">ENTRAR NA QUADRA <ArrowUpRight size={20}/></Link></div></article>
    <article className="sport-card sport-altinha"><div className="sport-card-top"><span>RODA · 5 AMIGOS</span><Volleyball size={62} strokeWidth={1.4}/></div><div><h2>ALTINHA</h2><p>Não deixa cair. Mostra o trick.</p><small>Contra o relógio · Tricks · Recorde da roda</small></div><div className="sport-actions"><Link href="/altinha">ENTRAR NA RODA <ArrowUpRight size={20}/></Link></div></article>
    <article className="sport-card sport-frescobol"><div className="sport-card-top"><span>DUPLA · JUNTOS</span><Volleyball size={62} strokeWidth={1.4}/></div><div><h2>FRESCOBOL</h2><p>Bate e volta. A sequência é de vocês dois.</p><small>Contra o relógio · Ataques · Recorde da dupla</small></div><div className="sport-actions"><Link href="/frescobol">PEGAR A RAQUETE <ArrowUpRight size={20}/></Link></div></article>
    <article className="sport-card sport-tennis"><div className="sport-card-top"><span>DUPLAS · 2 × 2</span><Volleyball size={62} strokeWidth={1.4}/></div><div><h2>BEACH TENNIS</h2><p>Voleio, lob e smash. Encontre o espaço.</p><small>Contra a CPU · Partidas de 3 games · Ponto decisivo</small></div><div className="sport-actions"><Link href="/beach-tennis">PEGAR A RAQUETE <ArrowUpRight size={20}/></Link></div></article>
    <article className="sport-card sport-ultimate"><div className="sport-card-top"><span>EQUIPES · 5 × 5</span><Disc size={62} strokeWidth={1.4}/></div><div><h2>ULTIMATE</h2><p>Um disco. Sem correr com ele. Pegue na zona final.</p><small>Contra a CPU · Huck, hammer e layout · Primeiro a 5</small></div><div className="sport-actions"><Link href="/ultimate">ENTRAR NO CAMPO <ArrowUpRight size={20}/></Link></div></article>
    <article className="sport-card sport-soccer"><div className="sport-card-top"><span>EQUIPES · 3 × 3 ARCADE</span><Goal size={62} strokeWidth={1.4}/></div><div><h2>BEACH SOCCER</h2><p>Passe, avance e mande para o gol.</p><small>Contra a CPU · Goleiros · Primeiro a 5 gols</small></div><div className="sport-actions"><Link href="/beach-soccer">ENTRAR NO CAMPO <ArrowUpRight size={20}/></Link></div></article>
   </nav>
   <footer>NO COMPUTADOR OU CELULAR <span>•</span> CONVIDE UM AMIGO POR LINK</footer>
  </section>
 </main>;
}
