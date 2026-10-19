# Lacunas de jogabilidade e retenção
Pergunta do dono: falta jogabilidade boa (nem nível SNES/Mega Drive, muito menos Virtua Tennis), falta motivo para jogar e voltar, e falta saber do que precisamos. Este documento responde com base no código atual e em fontes primárias.

# Onde estamos hoje (pelo código)
## Laço e entrada
- Física fixa a 120 Hz com interpolação: `lib/beach-scene.ts:60-62`. Bom ponto de partida.
- Teclado age na hora, sem fila: `app/BeachMatch.tsx:36-38` chama `pressNet` direto. Tecla repetida é ignorada.
- Apertar J/A abre uma janela de 320 ms para o contato: `lib/net.ts:40`. O único "buffer" é essa janela.
- Online: o cliente troca o estado inteiro a cada mensagem (`app/gol-a-gol/useOnline.ts:20`). O servidor manda estado a 60/2 = 30 Hz (`server/rooms.ts:74`). Não há previsão local, então o próprio movimento chega com atraso de ida e volta.

## Golpe (futevôlei e beach tennis)
- A qualidade do golpe vem de distância, preparação e velocidade do atleta: `lib/net.ts:174` usando `strokeQuality` em `lib/game.ts:58-60`. O momento do toque em relação à bola não conta. Apertar cedo ou tarde dá o mesmo golpe, desde que a bola passe perto.
- Mira: o direcional no toque escolhe uma de 3 × 3 casas fixas (`lib/net.ts:39`). Sem direcional, vale o alvo anterior.
- Carga: segurar sobe 110% por segundo e solta 300% por segundo (`lib/net.ts:119`). Acima de 65% a mira oscila de forma visível (`lib/arcade.ts:5-7`).
- Carregar não prende o atleta. A velocidade só cai para 78% durante a animação do golpe (`lib/net.ts:14`). Não existe escolha entre "chegar e carregar" e "correr e rebater fraco".
- A ajuda leva o atleta até a bola quando o jogador não mexe o direcional (`lib/net.ts:142-144`) e prepara a pose sozinha (`lib/net.ts:146-147`). No vôlei a ajuda também puxa o atleta (`lib/game.ts:331-334`) e salta sozinha (`lib/game.ts:336`). O alcance do toque varia por dificuldade: 48/38/28 (`lib/net.ts:169`).
- Saque no futevôlei e no tennis é automático: ao fim da contagem, `serveNet` dispara (`lib/net.ts:115`, `lib/net.ts:42-50`). Não há habilidade no saque. O vôlei tem lançamento e tempo de batida (`lib/game.ts:147-152`, faixa em `lib/game.ts:70-75`).
- Especial: energia por boas jogadas e sequência de até 5 (`lib/arcade.ts:16-20`), gasto total no golpe (`lib/arcade.ts:21-26`).

## CPU
- Reação por dificuldade: 0,26 / 0,20 / 0,12 s (`lib/net.ts:121`).
- O CPU sempre ataca no fundo, na mesma profundidade `x:220`, só trocando o lado (`lib/net.ts:85`). Saca sempre no mesmo ponto `{x:220,z:145}` (`lib/net.ts:46`). Força fixa em 0,5 (`lib/net.ts:78`). O tipo de golpe segue um ciclo fixo de 5 trocas (`lib/net.ts:71`). Dá para decorar.
- No vôlei os rivais têm estilos (defesa, bloqueio, ataque, colocação) em `lib/rivals.ts` e usados em `lib/game.ts:64`, `lib/game.ts:213`, `lib/game.ts:325`. Os esportes novos não usam isso.
- No soccer o CPU decide por tempo de posse: 0,3 s sob pressão, 0,8 s sem (`lib/soccer.ts:139`).

## Impacto ("juice")
- Pausa de impacto: 25 ms só em golpe forte do jogador; 55 ms e tremor de 90 ms só no especial (`lib/beach-scene.ts:102`). Golpe normal não tem pausa nem tremor.
- No vôlei não há pausa nem tremor, só um círculo de impacto e som (`lib/court.ts:145-147`).
- Som: um único oscilador sintético com 3 variações (`lib/match-audio.ts:11-19`). Sem torcida, sem música, sem som por tipo de contato, sem som de ponto.
- Há rastro da bola acima de 430 de velocidade (`lib/beach-scene.ts:104-106`) e achatamento na aterrissagem (`lib/beach-scene.ts:85`).

## O que fica salvo entre sessões
- Vôlei: carreira com XP, pontos de atributo (+5 por ponto), calendário de 8 torneios, ranking, histórico e conquistas (`lib/career.ts:10-62`, `lib/cup.ts:64-72`), salvo em `localStorage` (`app/volei/page.tsx:60`). Os pontos dos rivais sobem por fórmula fixa, não por jogo (`lib/career.ts:48`).
- Gol a gol: contadores e efeitos de bola desbloqueáveis (`lib/gol.ts:113-128`).
- Futevôlei, beach tennis e beach soccer: nada é salvo. `app/BeachMatch.tsx` não usa `localStorage`. Adversário sem nome ("PRAIA") e local fixo "PALM COVE" (`app/BeachMatch.tsx:58`).
- Online: só vôlei e gol a gol, por link para um amigo (`server/rooms.ts:30-34`). A sala some quando alguém sai (`server/rooms.ts:58`). Sem ranking, sem fila de partidas.
- Tela inicial: cinco cartões de esporte (`app/page.tsx:15-21`). Nenhum "continuar", nenhuma meta do dia, nenhum progresso visível.

# Lacuna de jogabilidade
O que os clássicos têm e nós não temos. Cada item cita a fonte.

- **Tempo do golpe decide o golpe.** No Mario Tennis de N64, o manual diz: "Shot Strength Depends on Timing and Technique!" ([manual oficial Nintendo](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_MarioTennis_EN.pdf)). No Mario Tennis Aces, bater um pouco antes manda a bola para a diagonal; bater depois mantém a paralela ([Play Nintendo](https://play.nintendo.com/news-tips/tips-tricks/mario-tennis-aces-tips-tricks/)). Hoje nosso golpe só olha distância (`lib/net.ts:174`).
- **Carregar prende o atleta.** No Mario Tennis, ao carregar o golpe "he or she won't be able to move very easily" ([manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_MarioTennis_EN.pdf)). Isso cria a leitura de posição: quem chega cedo bate forte. Hoje a carga não custa movimento (`lib/net.ts:14`).
- **Chegar cedo dá golpe forte; chegar esticado dá golpe fraco.** O manual do Virtua Tennis diz: golpe forte "if you move quickly towards the ball and have time to prepare your shot", fraco "if your character has to lunge" ([manual Dreamcast](https://www.digitpress.com/library/manuals/dreamcast/virtua_tennis.pdf)). Temos parte disso em `strokeQuality`, mas a ajuda automática (`lib/net.ts:142`) leva o atleta até a bola e apaga a diferença.
- **Mirar enquanto segura o botão.** No Virtua Tennis, o direcional vale "while the A Button is pressed and before you hit the ball", inclusive fundo e curta ([manual](https://www.digitpress.com/library/manuals/dreamcast/virtua_tennis.pdf)). Hoje a mira é lida só no toque e na soltura (`lib/net.ts:39`), em casas fixas.
- **Saque com tempo.** No Mario Tennis, bater no ponto mais alto mostra "NICE!" e o saque sai mais rápido ([manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_MarioTennis_EN.pdf)). Nosso vôlei tem isso; futevôlei e tennis sacam sozinhos (`lib/net.ts:115`).
- **Golpe especial ligado a posição, não só a barra.** No Mario Tennis, a estrela de smash aparece; quem corre até ela e carrega faz o smash ([manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_MarioTennis_EN.pdf)). No Mario Tennis Open, a área de chance aparece após uma devolução ruim do rival ([MarioWiki, fonte secundária](https://www.mariowiki.com/Chance_Shot)). No Aces, um golpe no tempo perfeito enche a energia; um atrasado custa o ponto ([Play Nintendo](https://play.nintendo.com/news-tips/tips-tricks/mario-tennis-aces-tips-tricks/)). Nosso especial é só uma barra cheia mais um botão (`lib/arcade.ts:21-26`).
- **Física que segue a intenção, previsível.** A Psyonix diz que a física real era "too random and unpredictable" e que buscava "predictability and consistency" ([Game Developer, GDC 2016](https://www.gamedeveloper.com/business/smart-calls-timing-luck-poverty-how-i-rocket-league-i-succeeded)). Nos slides: "Emulate player intent, not real impact" e força na bola "not a linear curve" ([slides GDC 2016](https://media.gdcvault.com/gdc2016/Presentations/Davis_Corey_RocketLeagueThe.pdf)). Também ali: um impulso que exige tempo virou habilidade de veterano, enquanto iniciantes jogam mais devagar. Nossa base já é determinística (`lib/arcade.ts:6`); falta dar ao tempo do toque esse peso.
- **Pausa de impacto e tremor em todo golpe bom.** Nijman (Vlambeer): o jogo congela "about 10-20 milliseconds whenever you hit something" e cada alvo tem seu próprio som de impacto ([entrevista citada em infovore](https://infovore.org/?p=5275); palestra ["The art of screenshake", INDIGO 2013](https://www.youtube.com/watch?v=AJdEqssNZ-U)). Sakurai dedica um vídeo a parar o jogo nos grandes momentos ([Stop for Big Moments!](https://www.youtube.com/watch?v=OdVkEOzdCPw)). Swink define a sensação de jogo como resposta imediata somada a imagem e som, e chama o acabamento de "the interactive impression of physicality" ([Game Feel: The Secret Ingredient](https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient)). Jonasson e Purho mostram o mesmo em "Juice it or lose it" ([resumo](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-)). Hoje só o golpe forte e o especial pausam (`lib/beach-scene.ts:102`); o vôlei nunca pausa (`lib/court.ts:145`).
- **Rivais que jogam diferente.** Windjammers tem personagens "with their own special skills and super throws" ([Dotemu](https://www.dotemu.com/games/windjammers/)). O Mario Tennis pede para testar os 14 personagens e "discover their individual abilities" ([manual](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_MarioTennis_EN.pdf)). O Virtua Tennis lista o ponto forte de cada atleta, como "POWERFUL STROKE" ([manual](https://www.digitpress.com/library/manuals/dreamcast/virtua_tennis.pdf)). Nosso CPU dos esportes novos repete o mesmo padrão (`lib/net.ts:71`, `lib/net.ts:85`).

# Lacuna de retenção
Motivos para jogar e voltar.

- **Carreira que mistura partida e treino, com loja.** O World Circuit do Virtua Tennis: viajar, jogar "Trial Matches", ganhar dinheiro, comprar roupas, raquetes e parceiros de duplas. O manual avisa que só se vence jogando partidas e treinos "in equal measure" ([manual](https://www.digitpress.com/library/manuals/dreamcast/virtua_tennis.pdf)). Nosso vôlei já tem o esqueleto (`lib/career.ts`, `lib/training.ts`). Os outros três esportes não têm nada.
- **Desbloqueáveis ligados a metas jogáveis.** Nosso gol a gol já faz isso: efeito de bola por "Faça 5 defesas" ou "3 gols de tabela" (`lib/gol.ts:110-117`). O Virtua Tennis libera roupas usáveis nos outros modos ([manual](https://www.digitpress.com/library/manuals/dreamcast/virtua_tennis.pdf)). A personalização de carros está na lista de mudanças que fizeram o Rocket League dar certo ([slides GDC 2016](https://media.gdcvault.com/gdc2016/Presentations/Davis_Corey_RocketLeagueThe.pdf)).
- **Personagens com atributos e golpes próprios.** Fontes acima (Mario Tennis, Windjammers, Virtua Tennis). Temos atributos no vôlei (`lib/game.ts:61-66`), mas `lib/net.ts` e `lib/soccer.ts` ignoram atributos.
- **Desafio do dia igual para todos.** O Spelunky lançou o desafio diário: a mesma fase para todos, uma tentativa por dia, placar compartilhado. Mossmouth: "One chance... each day" ([Shacknews](https://www.shacknews.com/article/80294/spelunky-pc-introduces-daily-challenges)). Há críticas a esse formato ([The Ludite](https://theludite.com/2014/06/23/spelunky-when-scoring-goes-bad/)) e a missões diárias que viram obrigação ([Game Developer](https://www.gamedeveloper.com/design/reward-me-demotivate-me)). Logo: desafio curto e opcional, sem punição por faltar.
- **Online com fila e nível de habilidade.** O Rocket League cita "Massively improved Matchmaking" e "Uncertainty-based skill rating" como mudanças centrais ([slides GDC 2016](https://media.gdcvault.com/gdc2016/Presentations/Davis_Corey_RocketLeagueThe.pdf)). Nosso online é só por link para um amigo (`server/rooms.ts:30-34`).
- **Foco.** A Psyonix manteve "A single mode, a single layout" e carros sem atributos para aperfeiçoar uma coisa só ([Game Developer](https://www.gamedeveloper.com/business/smart-calls-timing-luck-poverty-how-i-rocket-league-i-succeeded)). Nós temos cinco esportes, dois com progressão e três sem. Isso espalha o esforço.
- **Retenção é efeito de diversão, não de truque.** Hodent (Epic, GDC 2017) trata retenção como problema de motivação, emoção e fluxo, e diz que resolver a usabilidade não garante engajamento ([GDC Vault](https://gdcvault.com/browse/gdc-17/play/1024055)). Por isso a jogabilidade vem primeiro nesta lista.

# O que precisamos
Mudanças pequenas e concretas, da mais impactante para a menos. Cada uma cabe em poucos arquivos.

1. **Tempo do toque decide qualidade e ângulo nos jogos de rede.** Guardar o instante do toque e medir a diferença para o instante em que a bola chega ao ponto de contato. Perto do ideal: "PERFEITO", mais velocidade e energia. Cedo: diagonal. Tarde: paralela e mais fraco. Arquivos: `lib/net.ts` (`releaseNet`, linha 40; contato, linha 174), `lib/game.ts:58` (`strokeQuality`). Testes em `lib/net.test.ts`.
2. **Carregar prende o atleta.** Com carga acima de zero, velocidade cai para cerca de 30%. Chegar cedo vira a única forma de bater forte. Arquivo: `lib/net.ts:14` (`moveRunner`) e `lib/net.ts:152`.
3. **Ajuda automática só no Tranquilo.** Em Clube e Profissional, não mover o atleta nem saltar por ele. Arquivos: `lib/net.ts:142-144`, `lib/game.ts:331-336`. Sem isso, os itens 1 e 2 não aparecem para o jogador.
4. **Pausa e tremor em todo contato bom, proporcionais à qualidade.** 15 a 40 ms de pausa, tremor leve em cortada, smash, chute forte e ponto. Levar o mesmo para o vôlei. Arquivos: `lib/beach-scene.ts:100-103`, `lib/court.ts:145`. Respeitar `prefers-reduced-motion`, já lido em `lib/beach-scene.ts:12`.
5. **Sons distintos.** Um som por tipo de contato (pé, peito, cabeça, raquete, mão, chute), um som de ponto e um de torcida curta. Ainda com Web Audio, sem arquivo novo. Arquivo: `lib/match-audio.ts`.
6. **Saque com tempo no futevôlei e no tennis.** Reaproveitar o lançamento do vôlei (`toss`/`serve`, `lib/game.ts:139-168`). Arquivo: `lib/net.ts:42-50` e `lib/net.ts:115` (parar o saque automático do jogador).
7. **CPU com estilo por rival nos esportes novos.** Variar profundidade, força e saque em vez de `x:220`, força 0,5 e ponto fixo. Reaproveitar `style` de `lib/rivals.ts`. Arquivo: `lib/net.ts:46`, `lib/net.ts:71`, `lib/net.ts:78`, `lib/net.ts:85`.
8. **Salvar progresso dos três esportes novos.** Copiar o padrão do gol a gol: contadores (vitórias, especiais, golpes perfeitos) e desbloqueáveis de cor de bola ou uniforme. Arquivos: novo bloco em `lib/net.ts` ou `lib/soccer.ts` no estilo de `lib/gol.ts:113-128`, salvo em `app/BeachMatch.tsx`.
9. **"Continuar" e desafio do dia na tela inicial.** Desafio do dia com semente pela data: mesmo rival e mesma meta para todos, melhor resultado salvo no aparelho. Arquivos: `app/page.tsx`, reaproveitando `lib/training.ts` e `lib/cup.ts`.
10. **Rivais nomeados e atributos nos esportes novos.** Usar nomes, países e estilos de `lib/rivals.ts` em vez de "PRAIA" e "PALM COVE" (`app/BeachMatch.tsx:58`). Ler atributos como `playerAttribute` faz em `lib/game.ts:61`.
11. **Online: previsão do próprio atleta, depois fila.** Primeiro mover o próprio atleta no cliente e corrigir com o estado do servidor (`app/gol-a-gol/useOnline.ts:20`). Fila e ranking ficam para depois, quando houver jogadores suficientes (`server/rooms.ts`).

Escolha de foco: aplicar 1 a 6 primeiro no beach tennis e no futevôlei, que dividem `lib/net.ts`. Uma mudança cobre dois esportes. Depois levar ao vôlei.
