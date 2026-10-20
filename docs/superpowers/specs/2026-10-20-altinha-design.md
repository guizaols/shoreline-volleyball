# Altinha — design

## Intenção
Um novo jogo de praia: a roda de altinha. Amigos em círculo mantendo a bola no ar com o pé, peito, coxa e cabeça. A graça, nas palavras do usuário: **tempo de bola no ar, tricks, salvadas, score tipo FIFA Street, aprender novos tricks**. A referência de sensação é o FIFA Street (estilo, combo, nomes na tela) com o visual 16-bit arcade dos outros jogos (Neo Geo, Hyper V-Ball).

## Objetivos
- Roda com 4 a 5 jogadores. Você controla um; a CPU controla os outros.
- **Dois scores ao mesmo tempo**:
  - **Score da roda**: coletivo, cresce enquanto a bola não cai, com recorde salvo.
  - **Score individual**: cada jogador soma seus tricks e salvadas; placar no fim da rodada.
- **Tricks com nome** que valem mais quanto mais difíceis, com risco maior da bola cair.
- **Salvadas**: chegar na bola no último instante antes do chão dá bônus e nome na tela.
- **Combo estilo FIFA Street**: multiplicador que cresce enquanto você varia os tricks; repetir o mesmo trick não aumenta o combo.
- **Medidor de estilo / gamebreaker**: quando enche, ativa um momento especial com o corte Neo Geo que os especiais já usam.
- **Passe com escolha**: você escolhe para quem mandar. Passe bom deixa o colega pronto para trick; passe ruim força uma salvada.
- **Aprender tricks**: começa com 3 (embaixadinha, coxa, cabeça). Novos tricks liberam ao bater marcas de score; cada trick novo abre com uma aula curta mostrando o comando.
- Card novo na home (estilo arcade atual) e entrada no progresso salvo.

## Fora do escopo agora
- **Online**: o usuário quer ("seria sucesso"), mas fica para a etapa 2, com as mesmas regras. Hoje as salas (`server/rooms.ts`) têm 2 lugares; a roda online vai pedir até 5, com CPU nos lugares vazios.
- Frescobol e ultimate frisbee: projetos separados, depois da altinha.
- Rival, placar contra adversário, circuito.

## Anti-objetivos (falha mesmo se funcionar)
- A bola não ir para onde o jogador mirou sem explicação visível (foi a queixa do futevôlei). A mira do passe precisa aparecer na tela, ao vivo.
- Sorteio escondido decidir se o trick dá certo. O risco precisa ser lido na tela (tempo do toque, altura da bola), como `aimDrift` em `lib/arcade.ts`.
- Bonecos pequenos 8-bit em blocos (já rejeitados). Usar os sprites e o render atuais.
- Rodada longa e monótona.

## Regras decididas
- **Toques por vez** *(do usuário)*: cada jogador dá até 3 toques seguidos (domina, faz trick, passa) antes de passar. Opção de modo com limite de 1 ou 2 toques. O combo individual cresce dentro da sua vez; o passe encerra a vez.
- **A CPU também deixa cair**, mais quando recebe um passe ruim, para o score da roda não depender só do humano. *(decisão do Claude)*
- **Liberar tricks**: pela soma do score individual entre rodadas; tricks liberados ficam salvos. Save próprio da altinha; não entra no rodízio do circuito/desafio (`beachSports`), mas golpes perfeitos somam ao `perfects` de `lib/beach-progress.ts` (bolas da home). *(decisão do Claude)*
- **Fim da rodada**: placar individual com título "Rei da roda" para o maior; o recorde da roda é a meta coletiva. Sem vitória/derrota. *(decisão do Claude)*
- **Gamebreaker**: por alguns segundos a bola fica mais lenta e os pontos valem em dobro. *(decisão do Claude)*
- **Quando a bola cai**: a roda continua. O score da roda zera a sequência; quem deixou cair perde parte do combo individual. *(decisão do Claude)*
- **Duração**: rodada com tempo fixo, cerca de 2 minutos. *(decisão do Claude)*
- Tricks começam com: embaixadinha, coxa, cabeça. Candidatos para liberar: peito, ombro, letra, volta ao mundo, carretilha, tesoura no ar. *(lista é sugestão do Claude)*

## Restrições
- Reaproveitar o que existe: movimento e física de bola (`lib/game.ts`, `moveRunner` em `lib/net.ts`), tempo do toque (`shotTiming`, `pressTiming`), energia e especiais (`lib/arcade.ts`), apresentação e controles (`app/BeachMatch.tsx`, `TouchControls`), cena de praia (`lib/beach-scene.ts`, `lib/athlete-render.ts`), progresso (`lib/beach-progress.ts`).
- Funciona no computador e no celular (controles de toque).
- Um passo por vez: cada parte em um commit com seu teste (`node --experimental-strip-types lib/<x>.test.ts`, adicionado ao `npm test`).
- Validar com simulação headless (bot jogador + CPU) antes de dizer que está bom: a rodada não pode acabar com a bola quase nunca caindo nem caindo o tempo todo.
- Dizer claramente o que não foi visto na tela.

## Deixado para quem constrói
- Arquivo da lógica (sugestão: `lib/altinha.ts`) e se a tela entra em `BeachMatch` ou num componente próprio.
- Comandos exatos de cada trick (botão + direção, segurar/soltar), desde que caibam nos controles atuais do futevôlei e do celular.
- Valores de ponto, tamanho do combo, marcas que liberam cada trick, e como a CPU escolhe passes e tricks.
- Disposição da roda na cena e câmera.
