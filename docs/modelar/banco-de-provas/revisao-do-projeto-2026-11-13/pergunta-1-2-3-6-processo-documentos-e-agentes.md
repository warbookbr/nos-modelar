# Perguntas 1, 2, 3 e 6: gates e regras, leitura, gerado e manual, sessões e agentes (primeiro levantamento)

Medido em 2026-11-13 pela sessão do furgão, sobre a main de `db6499e2` e o histórico do CI do ramo `claude/revisar-plano-ativo-cyj8c3`. É o primeiro levantamento da metade de processo, documentos e agentes: cada número tem o comando que o reproduz, e o que ainda não foi medido está dito como lacuna. Fato medido e leitura minha vêm separados.

## Pergunta 1: as reprovações do CI e o que cada uma era

Fato medido. As 40 últimas execuções terminadas do CI no ramo da sessão do furgão, de 2026-11-09 02:43 a 2026-11-13 01:45, saíram 25 verdes, 11 vermelhas e 4 canceladas (por um envio mais novo). Comando: a ferramenta `actions_list` do GitHub com `list_workflow_runs`, filtro do ramo e `status: completed`, 40 por página. Das 11 vermelhas, 7 tiveram o motivo lido no log do trabalho que falhou (`get_job_logs` com `failed_only`):

| Execução | Trabalho que falhou | Motivo | Classe |
|---|---|---|---|
| 43341197222 (2026-11-13) | Acervo, famílias e MCP; Testes lentos 3/10 | `guarda-acervo.test`: a aba nova da caixa do farol deixou uma volta de borda livre sem declaração em `vaos` | defeito real |
| 43304138492 (2026-11-12) | Juntar à main | a main andou durante o CI | corrida de junção |
| 43264017953 (2026-11-12) | Testes lentos 3/10 | o teste das conferências da instalação solar passou do prazo de 60 s (80 s no CI, 27 s sozinho) | teto de tempo |
| 43154074735 (2026-11-12) | Testes lentos 8/10 | `acervo-real.test`: o furgão levou 337 s, acima do teto próprio de 320 s | teto de tempo |
| 43144959889 (2026-11-12) | Testes lentos 2/10 e 8/10 | `abre-na-bancada.test` passou do prazo de 180 s | teto de tempo |
| 43171803561 e 43162210097 (2026-11-12) | os 13 trabalhos | o log já não existe (HTTP 404); todos os trabalhos falhando juntos indica a instalação ou a máquina | não lido |

As quatro de 2026-11-09 não foram lidas. Leitura minha: em 7 reprovações lidas, 1 era defeito da peça; 3 eram teto de tempo posto com uma medida só ou ultrapassado porque o acervo cresceu; 1 era corrida com a outra sessão. O defeito real, a guarda da própria peça rodada à mão o pegava em 2 minutos (`node tools/modelar/guardas/guarda-acervo.mjs furgao-realista`), mas a bateria local deixa o `guarda-acervo.test` para o CI, e o ciclo perdido custou 17 minutos de CI e um reenvio.

Fato medido. A bateria local custa de 259 a 336 s nesta máquina de 4 núcleos, com 21 dos 28 gates rodando e 7 deixados para o CI (saída de `npm run gates`, quatro execuções em 2026-11-12 e 13). O CI completo leva de 15 a 17 minutos por envio.

Fato medido. A guarda de face degenerada e a auditoria de interseções discordam no braço montado: o `guarda:acervo` passa as 13 peças do braço, e `node tools/modelar/etapas-da-montagem.mjs procedural/pecas/braco-robotico/montagem.json --auditar` deixa 30 dos 66 pares inconclusivos, por um triângulo de área nula no braço e no antebraço e uma face de 4 cantos com área de 6,2e-12 no elo do punho 5. A guarda mede a normal de Newell da face inteira (`tools/modelar/reguas-de-malha/face-degenerada.mjs`, limite 1e-12); a auditoria mede cada triângulo da triangulação, com piso relativo à diagonal da peça (`src/autoria/contato-de-solidos.js`). Leitura minha: duas réguas para o mesmo defeito, com critérios diferentes, deixam passar o que a outra recusa.

Fato medido. Na bateria local de 269 s (`npm run gates`, 2026-11-13), o `test:rapidos` leva 260 s e os outros 20 gates que rodam somam 25 s; os doze gates de documento e de mapa (`origens`, `mapa`, `reguas`, `docs:toc`, `docs:links`, `planos`, `docs:estrutura`, `docs:citacoes`, `leitura:obrigatoria`, `catalogo`, `ferramentas`, `banco-de-provas`) somam 12,4 s. Leitura minha: o custo dos gates de formato não está no tempo de rodar, e sim no reenvio quando um deles reprova.

Lacuna: as reprovações dos gates locais (quantas vezes cada um parou um envio antes do CI) não têm registro; a bateria só imprime a execução corrente.

## Pergunta 2: quanto se lê para começar

Fato medido. O teto de leitura obrigatória por roteiro (`npm run leitura:obrigatoria`):

| Roteiro | Bytes | Orçamento | Folga |
|---|---|---|---|
| mudar/plano | 26.649 | 27.000 | 351 |
| mudar/defeito | 3.273 | 6.000 | 2.727 |
| documentar | 12.578 | 13.000 | 422 |
| pesquisar | 5.407 | 6.000 | 593 |
| modelar/peca/familia | 15.000 | 15.000 | 0 |
| modelar/peca/nova | 14.965 | 15.000 | 35 |
| modelar/peca/corrigir | 12.839 | 15.000 | 2.161 |
| modelar/opcoes | 6.781 | 12.000 | 5.219 |
| modelar/auditar-peca | 22.625 | 24.000 | 1.375 |
| modelar/auditar-montagem | 25.599 | 27.000 | 1.401 |

Leitura minha: quatro roteiros estão a menos de 500 bytes do teto e um está nele. Toda frase nova nesses documentos obriga a cortar outra, o que explica o estouro de 143 bytes que obrigou a encurtar um texto correto (sinal citado no plano). Lacuna: quanto do que se lê é usado de fato na tarefa ainda não foi medido.

Fato medido. Os dez roteiros de `docs/modelar/roteiros/roteiros.json` mandam ler, somados sem repetição, 13 arquivos (113.681 bytes) e citam mais 31 para abrir sob condição (742.515 bytes). Dos 413 documentos `.md` versionados em `docs/` (4,8 MB), todos são alcançados por link a partir desses 44, do `CLAUDE.md` e das skills, em até quatro saltos, porque o `MAPA.md`, os `INDEX.md` e os `README.md` de pasta listam tudo. Sem atravessar essas páginas de índice, 239 são alcançados e 174 (1,06 MB) só existem para quem chega por um índice: 66 dos 118 planos encerrados (535 KB), 37 dos 113 do banco de provas, 26 dos 64 do histórico, 25 dos 36 arquivos da pasta de planos fora de encerrados e 19 de outras pastas. Reproduz: um script que lê os campos `ler` e `sobDemanda` do JSON, extrai de cada `.md` os links relativos e os caminhos entre crases, e faz a busca em largura parando nas páginas de nome `MAPA.md`, `INDEX.md` e `README.md`. Leitura minha: alcançável por link não mede leitura; a medida que falta é quais arquivos uma sessão abre de fato, que só o registro das sessões daria.

## Pergunta 3: o que é escrito à mão e se repete, e o que é gerado e conflita

Fato medido. A lista dos planos ativos está escrita à mão em três arquivos, `README.md`, `docs/modelar/planos/README.md` e `docs/modelar/INDEX.md`, e gerada no quarto, `docs/MAPA.md` (`grep -rlE "costuras-e-furos-limpos\.md" --include=*.md . | grep -v encerrados`). Nesta sessão, das junções da main nos ramos de trabalho, todas as que trouxeram trabalho da outra sessão conflitaram em `docs/MAPA.md`, sempre resolvidas da mesma forma, `git checkout --theirs docs/MAPA.md` e `npm run mapa`, e um envio reprovou no `mapa:check` local por esquecer o segundo passo.

Fato medido. O pedido a cada agente desta sessão repetiu à mão a mesma lista de proibições (worktree sem reset, `git -C` sem `cd`, sem gates, `pkill`, `stash` nem `find /`, uma carga pesada por vez, teste acima de 12 s em `TESTES_LENTOS`), em cinco agentes diferentes.

## Pergunta 6: sessões e agentes

Fato medido nesta sessão, de 2026-11-12 a 13:

- Agentes despachados: implementador das costuras, revisor adversarial, modeladores do farol, da casa e do kit solar.
- O limite de uso de 5 horas da conta derrubou os agentes uma vez, e eles foram retomados depois.
- Um agente parado pela troca de contexto (o do farol) deixou o trabalho sem commit na worktree. O trabalho foi conferido por imagem e enviado pela sessão principal. O retomar por mensagem recusou o agente: "was stopped and won't be resumed".
- O revisor adversarial reprovou a troca de canto das costuras três vezes, cada uma com um defeito real reproduzido: um polo regravado sem fresta, o portão que deixou de recusar sólidos que só se tocam, e a dispensa da guarda que escondia fresta. Leitura minha: protege, e o custo foi de três rodadas.
- A sessão não tinha ferramenta de recado. Respondia à outra escrevendo na conversa, e a outra lia de lá. Isso funcionou, mas só enquanto as duas estavam vivas.

Fato medido. Há oito diários `ATRITOS.md` de objeto no banco de provas, com 244 itens contados por título ou número (`find docs -name 'ATRITOS*.md'`; avião 8, 46 e 54 em três arquivos, sedã 67, empilhadeira 23, carrinho de mão 22, furgão realista 17, carrinho refeito 7), e uma tabela resumo, `docs/modelar/ATRITOS-AUTORIA.md`, com 38 identificadores, 35 marcados resolvidos e 3 abertos. Só o diário da empilhadeira escreve o destino de cada item num campo próprio: dos 23, 14 têm destino, 10 deles numa ferramenta, teste ou instrução geral e 4 na própria peça; os 9 últimos não têm destino escrito. Os outros sete diários contam o destino em texto corrido ou não o contam. Leitura minha: quantos atritos viraram correção não se conta por máquina, porque cada diário tem um formato; o do sedã, com 70 KB, é o maior arquivo e não tem campo de destino.

## Conferência por amostra da outra metade

A sessão que levantou as perguntas 4 e 5 foi encerrada, e os scripts dela ficaram numa pasta de rascunho que não existe mais. Cinco números dela foram refeitos aqui contra o código, e os cinco bateram: o registro tem 42 operações (`REGISTRO_OPERACOES.listar().length`); 18 delas não declaram nenhum argumento obrigatório; `parte` aceita `sel, faces, nome, pai, pivo, substituir` e `material` aceita `sel, faces, usa`, sem campo de material em `parte`; a operação com nome errado volta como órfão `operação desconhecida 'cilindr'`, sem sugestão; e `tools/arquitetura/independencia-catalogo.mjs` só varre arquivos `.js` (linha 18). O cilindro com `raio: -1` e `lados: 2` executa sem recusa por causa desses valores. O defeito da lista `disponíveis em pecas/:` sempre vazia eu já tinha reproduzido antes. As contagens que pedem importar as 103 receitas (uso por operação, pares parte e material, linhas por peça), o grafo de imports e os tempos por operação não foram refeitos.
