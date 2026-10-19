# Plano de desenvolvimento

Base: `docs/gameplay-and-retention-gaps.md` e o design "Jogabilidade e Retorno" (https://claude.ai/artifact/Ezqgv2SECbp9V6RnjDeq8h).
Regra: os 4 esportes (vôlei, futevôlei, beach tennis, futebol 3×3). Cada fase termina jogável, com testes passando e teste no celular.

## Fase 1 — Controle
- [x] Tempo do toque decide o golpe no futevôlei e no beach tennis, medido por onde a bola encontra o atleta: na frente (cedo) vai na diagonal, atrás (tarde) vai na paralela e sai mais fraco, no centro sai PERFEITO. Direcional apertado ainda manda no lado. `lib/arcade.ts` (`shotTiming`), `lib/net.ts` (`strikeNet`, `stepNet`).
- [x] Carregar o golpe prende o atleta: a velocidade cai até 30% com a carga cheia. `lib/net.ts` (`stepNet`).
- [x] A ajuda que anda até a bola fica só no Tranquilo. `lib/net.ts` (`stepNet`).
- [x] Saque com tempo no futevôlei e no beach tennis: a bola sobe sozinha, o jogador toca Jogar no alto (~0,5 s). Na hora: rápido e onde mirou; fora do tempo: lento e para o meio. Se esquecer, sai fraco. CPU segue sacando na hora. `lib/net.ts` (`beginServe`, `tossQuality`, `serveNet`), `app/BeachMatch.tsx`.
- [x] Futebol: chute de primeira. Com um passe vindo para você, A chuta sem dominar. Apertar ~0,16 s antes da bola chegar = PERFEITO (forte, no alvo); cedo abre o chute; tarde vai fraco no goleiro; cedo demais a bola é dominada. Sem passe vindo, A segue sendo bote. `lib/soccer.ts` (`firstTimeSoccer`), `app/BeachMatch.tsx`.
- [x] Vôlei: no ataque, onde a bola encontra a mão decide (na frente = diagonal, atrás = paralela e mais fraco, centro = PERFEITO); o alvo escolhido no direcional continua mandando. A ajuda que anda até a bola e o salto automático no ataque ficam só no Tranquilo, no treino e no online. `lib/game.ts` (`hit`, `step`).
- [x] CPU com estilo por rival no futevôlei e no beach tennis: cada partida sorteia um rival de `lib/rivals.ts`, com nome no placar e dica na tela inicial. Ataque bate forte e fundo; colocação alterna curta e funda; defesa joga lob fundo; bloqueio busca ângulos curtos. Saque também varia. `lib/net.ts` (`cpuShot`, `cpuServe`), `app/BeachMatch.tsx`. Futebol e vôlei mantêm a CPU atual (o vôlei já usa `cpuStyle` na carreira).

Fase 1 fechada em 2026-10-19: testes, testes online, tipos, lint e build passam; páginas dos 4 esportes respondem 200 no servidor local. Falta jogar no celular e calibrar as faixas de tempo.

## Fase 2 — Impacto
- [x] Pausa no impacto nos 4 esportes: 16 ms em contato BOM, 28 ms em golpe forte/chute, 40 ms em PERFEITO, 55 ms em especial; tremor leve em PERFEITO, especial e gol. Desligado com `prefers-reduced-motion`. `lib/beach-scene.ts`, `lib/court.ts`.
- [x] Um som por tipo de contato (pé, peito, cabeça, mão, cortada, raquete, chute, especial), um "ding" extra no PERFEITO, e som de ponto com torcida curta. Tudo sintetizado, sem arquivo. `lib/match-audio.ts`.
- [x] Barra de tempo sobre o atleta logo após o toque: mostra onde o contato caiu (CEDO / PERFEITO / TARDE). `lib/timing-meter.ts`.

## Fase 3 — Movimentos e desenho
- [ ] Protótipo do novo atleta (maior, contorno, 3 tons) só no futevôlei. `lib/athlete-render.ts`.
- [ ] Os 16 movimentos, cada um com risco: vôlei (manchete, levantamento, cortada, peixinho), futevôlei (peito, cabeçada, shark attack, bicicleta), beach tennis (voleio, lob, smash, mergulho), futebol (chapéu, voleio de primeira, carrinho, defesa voadora).

## Fase 4 — Motivo para voltar
- [ ] Recordes e desbloqueios salvos nos 3 esportes novos, no padrão de `lib/gol.ts`.
- [ ] Duplas e trios com atributos (`lib/rivals.ts`).
- [ ] Circuito com treino que sobe atributo e desafio do dia na tela inicial (`app/page.tsx`).
- [ ] Online (previsão do próprio atleta) fica para depois.
