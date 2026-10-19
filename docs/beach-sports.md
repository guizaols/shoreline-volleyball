# Evolução dos esportes de praia
- Vôlei: manter a física a 120 Hz, preservar o ponto real de contato, estabilizar as passadas e acrescentar áudio opcional; validar regressões e online.
- Futevôlei: duplas, até três contatos de pé/peito/cabeça, sem mãos; reutilizar movimento, projeção, bola e controles do vôlei.
- Beach tennis: duplas, uma rebatida por lado, raquete, voleio/lob/smash e pontuação sem vantagem; compartilhar a apresentação dos jogos de rede.
- Beach soccer: partida arcade 3 × 3 com goleiro, posse, passe, chute, troca de atleta, CPU e reposições; manter gol a gol disponível.
- Movimento: poses articuladas pré-renderizadas, antecipação/contato/recuperação, inércia e frenagem; voleio/lob/curta distintos, bola física no drible, reação do goleiro e retomada automática entre pontos.
- Validação: testes locais/online, TypeScript e build passaram; telas desktop/retrato/paisagem conferidas. Navegador de teste: cerca de 30 FPS também em canvas vazio, tanto WebGL quanto 2D (página sem canvas: 120 FPS); esse ambiente não confirma a meta de 60 FPS. Avaliação em celular físico/jogadores ainda pendente. Lint dos arquivos novos passou; lint global acusa erros em arquivos existentes.
