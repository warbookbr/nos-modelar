# Os seis mecanismos que ficaram de fora: o que uma melhoria mudaria no trabalho da IA

Medido em 2026-11-13 na worktree `revisao`, só por leitura e pelos comandos de ajuda do projeto. Nada do repositório foi alterado, e os gates e os testes não foram rodados. A pergunta é a da pessoa: se melhorássemos cada mecanismo de alguma maneira, o que aconteceria. A resposta de cada seção vem em atritos registrados que a melhoria teria evitado, porque rodada perdida não tem registro próprio. Fato medido e leitura minha vêm separados.

## Resumo

| Mecanismo | Melhoria de maior efeito | Número que a sustenta |
|---|---|---|
| Skills | Fechar as quatro instruções ainda abertas e acrescentar duas perguntas ao alinhamento | 6 atritos de 221; custo de umas 15 linhas em 3 arquivos |
| Bancada e crítico | O pedido ao crítico levar as decisões travadas no alinhamento e os defeitos adiados | 5 atritos de 221, e 54 de 86 pares de rodadas seguidas sem subir a nota |
| Servidor MCP | Nenhuma com evidência; o que ele tem de útil e o resto não tem (o contrato de uma operação) vai para a linha de comando | 0 menções em 221 atritos de diário e em 577 de rodada |
| Backlog | Cada linha dizer a ferramenta, o contorno conhecido e quantos objetos bateram nela | 12 atritos repetiram limite já registrado; 4 linhas já resolvidas continuam abertas |
| Começar | O tópico desconhecido cair nos nomes de operação, de capacidade e de comando, e os roteiros citarem `npm run capacidade` e `--ajuda` | 2 becos no meu teste e 3 comandos errados da semana; nos diários, 5 capacidades que existiam e não foram achadas |
| Ficha de capacidade | `npm run capacidade -- <operação>` imprimir o contrato que o núcleo já publica | 16 fichas contra 42 operações com exemplo pronto; 3 atritos diretos e o meu teste do `aparar` |

Leitura minha, antes do detalhe. Dos 221 atritos lidos, 153 (69%) são capacidade que faltava ou defeito e mensagem de ferramenta, e nenhum dos seis mecanismos os alcança; eles são do grupo D do relatório. Os seis mecanismos juntos tocam 54 atritos (24%): 11 de ajuda (comando por tentativa e capacidade não achada), 18 de instrução e 25 de bancada e crítico. A melhoria mais barata por atrito evitado é a da ficha de capacidade, porque o conteúdo já existe e falta só a porta.

## Os atritos por causa

Fato medido. `find docs -name 'ATRITOS*.md'` dá oito diários de objeto e a tabela `ATRITOS-AUTORIA.md`. Contei 221 itens numerados (`grep -cE '^[0-9]+\. '` e `grep -cE '^#{2,3} [0-9]+\. '` em cada arquivo); o inventário anterior deu 244 porque contou também títulos de seção. Li inteiros os diários do furgão realista, da empilhadeira, do carrinho de mão, do sedã, do carrinho refeito e o de contorno e prancha do avião; nos dois de esboço do avião li o título e os primeiros 430 a 520 caracteres de cada item. Cada item recebeu uma causa só, a principal. A classificação é minha e outra pessoa moveria alguns itens entre "faltava" e "defeito".

| Diário | Itens | Comando ou opção por tentativa | Existia e não foi achada | Capacidade que faltava | Instrução ausente, errada ou contraditória | Bancada ou crítico | Ambiente | Defeito ou mensagem de ferramenta | Outra |
|---|---|---|---|---|---|---|---|---|---|
| Furgão realista | 17 | 0 | 0 | 5 | 3 | 5 | 0 | 4 | 0 |
| Empilhadeira | 23 | 0 | 0 | 9 | 2 | 5 | 3 | 4 | 0 |
| Carrinho de mão | 22 | 0 | 1 | 7 | 6 | 1 | 0 | 6 | 1 |
| Sedã, três etapas | 57 | 0 | 3 | 33 | 7 | 1 | 2 | 9 | 2 |
| Carrinho refeito | 6 | 1 | 0 | 2 | 0 | 1 | 0 | 1 | 1 |
| Avião, contorno e prancha | 8 | 0 | 0 | 4 | 0 | 0 | 0 | 4 | 0 |
| Avião, esboço | 44 | 4 | 1 | 22 | 0 | 8 | 0 | 8 | 1 |
| Avião, esboço, segunda rodada | 44 | 1 | 0 | 20 | 0 | 4 | 0 | 15 | 4 |
| Total | 221 | 6 | 5 | 102 | 18 | 25 | 5 | 51 | 9 |

Os seis itens de comando por tentativa são todos do esboço antigo (`npm run esboco`), de outubro. As cinco capacidades que existiam e não foram achadas: o rascunho de outubro da caçamba, que a pessoa teve de apontar (carrinho de mão, 20); a operação `casca`, registrada como extensão desde 2026-10-10 e fora do catálogo gerado (sedã, 15; `grep -c casca docs/modelar/gerado/CATALOGO-CAPACIDADES.md` dá 0); as booleanas e a abertura achadas por busca de palavra num arquivo de 125 KB (sedã, 21); a seleção por grupo, conhecida só de outra receita (sedã, segunda etapa, 11); e o `--editar parametros.<nome>`, que a recusa do `--integrar` não oferecia (esboço, 19). Os 18 de instrução se dividem em 7 de texto de skill, 6 em que o `fluxo:objeto` respondeu errado ou contra a skill, e 5 de guia ou documento.

Achei uma segunda fonte que o inventário não contou: o campo `atrito` de cada rodada registrada. São 577 entradas em 129 rodadas de 42 peças (script de leitura de `procedural/pecas/**/rodadas/*.json`, fora do repositório). Não as classifiquei uma a uma. Por palavra, 139 citam o crítico, 23 o `vistas:critica`, 25 a bancada, 13 uma resposta recusada pelo registro por formato, 3 o backlog, 2 uma skill, 1 a ficha de capacidade e nenhuma o MCP nem o começar. Numa amostra de 60 (semente 7) lida à mão, 11 eram de crítico ou de vista, 13 de capacidade que faltava, 7 de instrução ou promessa mal escrita, 6 de defeito de ferramenta e as demais eram notas de forma e de decisão; com 60 itens a margem é de uns dez pontos.

## 1. Skills

Fato medido. São 10 skills em `.claude/skills/`, com 1.604 linhas e 90 KB (`wc -lc .claude/skills/*/SKILL.md`): laco-de-modelagem 239 linhas e 19,3 KB, desenhar-prancha 271 e 12,1 KB, contorno-da-imagem 182 e 11,1 KB, auditar-peca 191 e 8,7 KB, alinhar-modelagem 151 e 8,4 KB, prancha-dos-contornos 129 e 8,2 KB, auditar-montagem 147 e 7,3 KB, criar-peca 143 e 7,2 KB, esbocar-opcoes 72 e 4,2 KB, absorver-ajuste-da-bancada 79 e 3,7 KB. A `criar-peca` carrega ainda uma referência de operações de 148 KB. Os 78 comandos `npm run` e os 22 caminhos citados em skills e agentes existem todos hoje (conferência por script contra `package.json` e o disco), e o gate `docs:citacoes` cobre as skills. Nenhuma das 10 skills cita `npm run capacidade`, e só uma cita `--ajuda`; quem os cita é o agente modelador (`.claude/agents/modelador.md`, linhas 90 e 106). A `criar-peca`, linha 37, manda ler cada operação por `descrever_capacidade` no MCP, que a sessão de linha de comando não tem.

Dos 7 atritos de texto de skill, 3 já estão corrigidos no texto de hoje: a razão entre medidas das vistas e o nome de pasta da peça na `alinhar-modelagem` (linhas 50 e 58) e a conferência antes de mostrar na `esbocar-opcoes` (linha 63). Quatro continuam, por `grep`: a `desenhar-prancha` ainda manda rodar `node tools/modelar/<especificacao>.mjs` (linha 163; furgão, 3) e não fala da linha do chão (furgão, 6); a `alinhar-modelagem` não pergunta se há referência a caminho (carrinho de mão, 1); a `contorno-da-imagem` não diz como medir referência que fica fora do repositório (carrinho de mão, 4). Nas rodadas, 2 entradas de 577 citam skill, uma delas um comando que três skills traziam com o nome errado, já corrigido.

Leitura minha. As skills são o mecanismo que menos apareceu como causa: 7 de 221, e metade já foi fechada pela própria prática de levar o atrito à instrução. Três melhorias.

A primeira é fechar as quatro abertas e acrescentar ao alinhamento duas perguntas que os diários pedem: se existe rascunho anterior do mesmo objeto no banco de provas (carrinho de mão, 20) e a tradução em frase do caráter de toda referência que não pode entrar (furgão, 16). Teria evitado 6 atritos registrados. O do carrinho de mão custou reescrever o rascunho inteiro, e o da caçamba custou uma correção da pessoa. Custo: 3 arquivos, umas 15 linhas. O teto de leitura não aperta, porque nenhuma das três skills mudadas entra na leitura obrigatória de um roteiro (`ler` de cada roteiro em `roteiros.json`).

A segunda é a `criar-peca` e a `laco-de-modelagem` apontarem as portas de ajuda que existem na linha de comando, no lugar da ferramenta do MCP. O efeito depende da seção 6: hoje a porta não cobre operação. Evidência direta: os 3 atritos de capacidade não achada do sedã. A `criar-peca` é leitura obrigatória dos três roteiros de peça, e a troca precisa caber no teto deles.

A terceira é uma conferência que compare o que o `fluxo:objeto` manda fazer em "agora" com o passo da skill correspondente, porque 6 atritos vieram desse desencontro (carrinho de mão 2, 14 e 15; sedã 7, 8 e 10). Parte já foi entregue: rodei `npm run fluxo:objeto -- pasta-que-nao-existe` e ele hoje lista os passos em falta, e no carrinho de mão distingue a conferência configurada da rodada. Quantos dos 6 ainda reproduzem eu não medi. Custo: um teste novo sobre `tools/modelar/fluxo-do-objeto.mjs`, dezenas de linhas.

## 2. Bancada e crítico visual

Fato medido. `src/bancada/` tem 138 arquivos e cerca de 13.000 linhas de código (`find src/bancada -type f | wc -l`). O comando `npm run bancada` é `tools/modelar/olhar-bancada.mjs`, de 1.570 linhas, com 20 opções e 13 bandeiras e uma ajuda de uma linha por opção. O pacote do crítico é `tools/modelar/vistas-para-critica.mjs`, de 1.854 linhas, e a conferência é `tools/modelar/conferir-vistas.mjs`, de 849. O agente `critico-visual.md` tem 176 linhas e só a ferramenta de leitura.

Dos 221 atritos, 25 são limite da bancada ou do crítico. Por tipo: em 7 as vistas padrão não mostravam a região (o lado esquerdo, o nariz, o ventre, a cuba aberta, o fim do curso de um mecanismo); em 5 o crítico leu errado por falta de vista (a roda do outro lado através do vão, a vizinha em cinza como parte da peça, cinco encaixes lidos como travessia na empilhadeira); em 4 o crítico não conhecia a decisão do alinhamento ou não tinha a referência e puxou a forma para longe dela (furgão 7, 12 e 16; esboço do avião, 29); em 4 o enquadramento deixava a parte com poucos pixels; em 3 quem conduz olhava a vista inteira ou uma vista por vez e não via; em 2 o crítico encheu todas as regiões ou herdou um título errado.

Nas rodadas registradas (mesmo script da seção anterior): 128 vereditos com nota mediana 8 e 2 defeitos por veredito. Em 86 pares de rodadas seguidas da mesma peça, a nota ficou igual ou caiu em 54. Dos 197 defeitos da rodada seguinte, 99 (50%) estavam em parte e tipo que a rodada anterior não tinha apontado. Das 29 peças com duas ou mais rodadas julgadas, a nota final subiu em 12, ficou igual em 10 e caiu em 7. Treze entradas de atrito são respostas do crítico ou do modelador recusadas pelo registro por formato, 5 delas pelo limite de 240 caracteres e outras 5 pelo mesmo limite no `PLANO`, conferido só depois de minutos de execução.

Por leitura do código de hoje, o pacote já traz a vista em corte de cada encaixe com a vizinha (`vistas-para-critica.mjs`, linha 37), a vista de perto por `dePerto`, e a `vista:rapida` já aceita `--recorte` em mm. Não achei no pacote nem no registro da rodada as decisões travadas do alinhamento, os defeitos adiados por decisão escrita nem o aviso do que se vê através de um vão (`grep -c -i travad` e `grep -c "vão aberto"` dão 0).

Leitura minha. É o mecanismo com mais atrito depois do núcleo, e o que mais gasta rodada inteira: cada leitura errada do crítico é uma rodada de modelador para desfazer ou uma medida de quem conduz. Três melhorias.

A primeira é o pedido ao crítico levar o que ele não pode reabrir: as decisões que a pessoa já aprovou, os defeitos adiados para outra etapa e o caráter da referência em frase. Teria evitado 5 atritos (furgão 7, 12, 13 e 16; esboço, 29). O do furgão 7 desfez em 660 mm uma decisão aprovada, e o 13 fez a ferramenta mandar parar por falta de convergência contando defeitos adiados. Na amostra das rodadas, 3 de 60 eram promessa ou critério que o plano não dizia ao crítico. Custo: um campo no `PLANO` ou na rodada, o texto do pedido em `vistas-para-critica.mjs`, a conta de convergência em `rodada-de-modelagem.mjs` e uma linha no agente; 4 arquivos, perto de 100 linhas com teste. Mexe no contrato do `PLANO` e pede plano.

A segunda é completar as vistas que o conjunto padrão esconde, escolhidas pela forma: o lado sem simetria, a vista que entra na cavidade, a isolada ao lado da montada quando há vão aberto. Treze atritos tinham essa causa, e pelo menos três tipos já têm entrega; não medi quantos dos 13 ainda reproduzem. Custo: `vistas-para-critica.mjs` e a luz rasante, ordem de 100 a 200 linhas.

A terceira é o limite de tamanho ser conferido antes do trabalho caro: o `PLANO` recusado na leitura da receita e a resposta do crítico encurtada com aviso em vez de recusada. Teria evitado a maior parte das 13 entradas de formato: 8 foram um despacho repetido do crítico ou do modelador, e 2 das 5 do `PLANO` dizem que a recusa veio depois de minutos de execução. Custo: 2 arquivos, poucas dezenas de linhas.

Sobre a nota que não sobe em 54 de 86 pares, eu não sei separar o crítico instável da peça que mudou; fica em "o que não consegui medir".

## 3. Servidor de ferramentas (MCP)

Fato medido. O perfil padrão, de revisão, expõe 22 ferramentas e 9 recursos, e o de autoria, 39: as 22, mais 5 de revalidação, 8 de autoria de montagem e 4 de autoria de receita (`tools/mcp/mcp.test.mjs`, linhas 226 a 235 e 698 a 708). O código de `tools/mcp/` soma 166 KB (`wc -c`), em 10 módulos de ferramenta, e os guias são 3 arquivos com 2 KB ao todo. Não há `.mcp.json` no repositório, o servidor não está na configuração desta máquina (`grep -c "servidor.mjs\|modelar-mcp" /root/.claude.json` dá 0) e a sessão que me despachou não tem as ferramentas dele. Nos oito diários de objeto a palavra MCP aparece 0 vezes (`grep -c -i mcp`), e nas 577 entradas de rodada também 0. Das ferramentas que os diários mais usam (`fluxo:objeto`, `esboco:nucleo`, `conferir:vistas`, `vista:rapida`, `vao:partes`, `sobra:partes`, `vistas:critica`, `capacidade`), nenhuma está no servidor.

Uma coisa o servidor tem e a linha de comando não: `descrever_capacidade`, que entrega o contrato de uma operação só. Chamei o serviço por trás dela para o `aparar` e ele devolve 4,5 KB com os argumentos obrigatórios, a descrição de cada um e um exemplo executável.

Leitura minha. Sem evidência. Não há atrito registrado porque não há uso registrado nas sessões de modelagem desta fase, e por isso não sei dizer o que uma melhoria do servidor mudaria. As duas ações com efeito previsível estão fora dele: levar o contrato da operação para `npm run capacidade` (seção 6) e trocar, na `criar-peca` e na referência de operações, a indicação do MCP pela da linha de comando. Registrar o servidor num `.mcp.json` custa um arquivo, e o efeito disso eu não tenho como estimar. O custo de manter o servidor nos gates (`mcp:check`) eu não medi.

## 4. Backlog

Fato medido. `docs/modelar/planos/BACKLOG.md` tem 242 linhas e 43 KB, com 101 linhas de tabela e 7 seções em texto (`wc -lc`; `grep -c '^| '` menos o cabeçalho). Pela última edição de cada linha (`git blame --line-porcelain`), a idade mediana é de 19 dias: 17 linhas com até 7 dias, 64 de 8 a 30, 1 de 31 a 60 e 19 com mais de 60, a mais antiga com 101. Cinquenta e uma linhas não trazem data escrita. Quatro linhas contradizem `ATRITOS-AUTORIA.md`, que dá os assuntos por resolvidos: as costuras do `lathe`, o endereço de grupo linear, a abertura oblonga e a linha dos identificadores A-4 a A-29 (linhas 16, 17, 18 e 21 do backlog contra as linhas 53 a 57 da tabela). Nenhum dos 10 roteiros do começar cita o backlog nem os diários de atrito (`grep -c BACKLOG docs/modelar/roteiros/roteiros.json` dá 0), e o roteiro `pesquisar`, cuja pergunta é o que já se tentou, não os lista.

Doze atritos de diário repetem um limite que já estava escrito no diário ou no backlog do objeto anterior: o relato de contatos que chama de travessia o que não é (carrinho de mão 10, 11 e 18; sedã, primeira etapa 5, segunda 12 e terceira 12, depois de quatro itens da empilhadeira), a sobra entre partes com anel (carrinho de mão, 12), a conferência sem vista de referência (carrinho de mão, 3), a roda de família estreita (carrinho de mão, 17; sedã, 13), o trilho com raio nos cantos escrito à mão pela terceira vez (carrinho de mão, 6) e a captura do navegador (empilhadeira, 2).

Leitura minha. O backlog guarda, e ninguém chega a ele pelo caminho normal de quem modela. Quantas rodadas a repetição custou não está registrado; o que se conta são as 12 vezes em que um agente descreveu de novo um limite conhecido, em duas delas dizendo que já o conhecia. Três melhorias.

A primeira é cada linha ganhar três campos: a ferramenta ou operação, o contorno que funcionou e os objetos que bateram nela. Com a ferramenta nomeada, a recusa ou a ajuda da própria ferramenta pode citar o limite conhecido, e a IA o encontra no ponto em que bate nele. Teria poupado a redescoberta nos 12 casos; em rodadas, sem evidência. Custo: reescrever 101 linhas, à mão ou por script, e uma linha de ajuda em cinco ou seis ferramentas.

A segunda é a contagem de objetos por linha virar a ordem do backlog. O relato de contatos, com 10 atritos em 3 objetos, ficaria em primeiro. Isso serve à decisão da pessoa e não evita rodada por si.

A terceira é tirar as 4 linhas resolvidas e conferir por máquina a linha que cita identificador dado por resolvido na tabela de autoria. Custo: um teste pequeno.

## 5. Começar

Fato medido. `docs/modelar/roteiros/roteiros.json` tem 10 roteiros em 4 ramos de primeira linha, e a ferramenta é `tools/modelar/comecar.mjs`. Testei como quem chega sem contexto.

Para rodar a bancada numa receita, a resposta chegou em 4 chamadas (`npm run comecar`, `-- modelar`, `-- modelar/peca`, `-- modelar/peca/nova`): a folha traz `node tools/modelar/olhar-bancada.mjs --analise --peca=<nome>`, já com o sinal de igual. A ajuda parou em três lugares. O tópico livre procura só títulos de documento: `npm run comecar -- bancada` devolve 8 títulos, nenhum com o comando `npm run bancada`, e `-- "como rodar a bancada"` devolve títulos sem relação. A bandeira `--listar` da bancada lista 7 peças de teste, e não as 49 pastas de `procedural/pecas`, e a ajuda dela não dá exemplo de nome de peça real. E na worktree a bancada escreveu erros de carga do Manifold por o `node_modules` ser um atalho para fora da pasta servida; o `--listar` terminou com saída 0, e eu não testei uma captura.

Para usar o `aparar`, `npm run comecar -- aparar` responde que não é ramo nem título e lista os 10 roteiros. A folha `modelar/peca/nova` diz "42 operações do motor em CATALOGO-CAPACIDADES.md (no MCP, buscar_capacidades)". O catálogo tem uma linha para o `aparar`, sem argumentos. Os argumentos estão em `schemas-operacoes.json`, de 178 KB, ou num parágrafo único de 3 KB na linha 1.203 da referência de 148 KB da skill. Foram 3 saltos e uma busca por palavra, e a ajuda parou na linha do catálogo.

Os roteiros não citam `npm run capacidade`, `fluxo:objeto` nem `--ajuda` (`grep -c` de cada um em `roteiros.json` dá 0), e só `mudar/defeito` diz como rodar um teste. Os comandos das folhas de modelagem vêm sem argumento (`npm run parametros`, `npm run conferir:referencia`).

Relato da sessão que conduz, fora dos diários: três comandos errados por tentativa nesta semana. Reproduzi dois. `olhar-bancada.mjs furgao-realista --vistas direita` responde "use --vistas=<valor>", e `descrever-montagem-persistida.mjs <arquivo>` responde que não aceita argumento solto e lista as opções. As duas recusas corrigem, de modo que cada erro custou uma chamada. `tools/modelar/descrever-peca.mjs peca-que-nao-existe` imprime "disponíveis em pecas/:" vazio, porque a linha 48 filtra arquivos `.js` numa pasta que hoje só tem subpastas.

Nos diários, o começar aparece como causa uma vez (sedã, 17: o roteiro não apontava o guia de veículos), já corrigida.

Leitura minha. O começar entrega bem o que está nos roteiros e não sabe procurar fora deles. Duas melhorias.

A primeira é o tópico que não é ramo nem título ser procurado também nos nomes das operações do núcleo, das fichas de capacidade e dos comandos do `package.json`, com a resposta em uma linha (para `aparar`, a ficha; para `bancada`, `npm run bancada -- --ajuda`), e as folhas de modelagem ganharem as linhas de `npm run capacidade` e de `<comando> --ajuda`. Teria evitado os 2 becos do meu teste e, por estimativa, parte das 5 capacidades não achadas dos diários; os 3 comandos errados da semana custaram uma chamada cada e pesam pouco. Custo: `comecar.mjs` e o teste dele, perto de 40 linhas, e 3 linhas em `roteiros.json`, onde `modelar/peca/nova` tem 1.535 bytes de folga.

A segunda é corrigir a lista vazia do `descrever` (uma linha, já apontada na pergunta 5) e o `--listar` da bancada mostrar as peças do acervo. Sem evidência de rodada perdida nos diários.

## 6. Ficha de capacidade

Fato medido. `npm run capacidade` lista 16 fichas, todas de ajudantes: gaiolas, laços, painéis, vão, instância de família, raio, ondulação, apoio do vinco e contorno com arcos. O núcleo tem 42 operações no catálogo e 5 extensões em `procedural/extensoes/`, há 7 famílias e uma de exemplo em `procedural/familias/`, e 59 ferramentas de `tools/modelar/` têm comando no `package.json`, fora as guardas (script sobre `package.json`). Nenhuma operação, extensão ou família tem ficha. As 42 operações já publicam schema e exemplo executável pelo serviço de descoberta (42 de 42 com exemplo, mediana de 1,8 KB por operação), mas a porta para eles é o MCP ou o arquivo de 178 KB. Não existe comando que liste as famílias com perfis, limites e portas: `npm run familia` só aceita `aprovar`.

Rodei três fichas. `gaiolaVarrida` tem 32 linhas e 3,5 KB, `vaoEntrePartes` 29 e 3,1 KB, `paineisPorVaos` 22 linhas e 7,6 KB, com linhas de mais de 300 caracteres. Cada uma traz o arquivo, para que serve, quando usar em vez das outras, os campos, o exemplo e uma peça que a usa, e me bastou para saber chamar. `npm run capacidade -- aparar` responde "não existe" e lista as 16, sem apontar o catálogo; `-- raio` já acha por parte do nome. Das 14 ferramentas de vista e de medida em que pedi `--ajuda`, 6 respondem com saída 0, 3 imprimem o uso e saem com 2, e 5 recusam a bandeira e listam só os nomes das opções (`vistas-para-critica`, `descrever-montagem-persistida`, `fluxo-do-objeto`, `conferir-contra-referencia`, `vistas-de-superficie`). Vinte e sete ferramentas leem argumentos pelo mesmo `argumentos.mjs`.

Evidência nos diários e nas rodadas: sedã 21 (o comando lista só as gaiolas, e cada operação de corte foi achada por busca no arquivo grande), sedã 15 (a `casca` existia como extensão e foi dada por inexistente), uma entrada de rodada (a ficha não achava `raioDaAresta` pelo nome e a ferramenta recusava `--ajuda`, a primeira parte já corrigida), e quatro atritos em que o limite de uma família só apareceu pela recusa ou não estava em documento nenhum (carrinho de mão 16 e 17; sedã 13; esboço do avião, segunda rodada, 29).

Leitura minha. É onde a melhoria é mais barata. Três melhorias.

A primeira é `npm run capacidade -- <operação>` imprimir o contrato que o serviço já tem, para as 42 operações e as extensões, e a lista sem nome dizer que elas existem. Teria evitado 3 atritos registrados e o beco do meu teste, e dá destino ao achado do relatório sobre argumento obrigatório e padrão não declarado, porque a ficha passa a ser onde a IA os lê antes de errar. Custo: `capacidade.mjs` e o teste dele, de 40 a 60 linhas, sem escrever conteúdo novo.

A segunda é a ficha de família, com perfis, faixa de cada parâmetro, portas e a unidade de cada uma. Teria antecipado os 4 atritos de limite de família; a falta do perfil continua, mas a IA a sabe antes de escrever a receita. Custo: o cabeçalho das 7 famílias, ou a leitura do que cada uma já declara, e a mesma porta.

A terceira é `--ajuda` valer em toda ferramenta que usa `argumentos.mjs`, com o texto de uso que a recusa já imprime. Custo: um arquivo, perto de 10 linhas. Evidência: 1 entrada de rodada e 5 de 14 ferramentas testadas.

## O processo teria pego sozinho

Em parte. O comando citado em skill que não existe já tem gate, e a ficha tem teste de tamanho e de campo. Nada confere que toda operação, extensão ou família tem ficha, que toda ferramenta com comando responde a `--ajuda`, que a linha do backlog dada por resolvida em outra tabela saiu dele, nem que o "agora" do `fluxo:objeto` concorda com a skill. Esses quatro são o que falta virar conferência antes de dar as melhorias por prontas.

## O que não consegui medir

Quantas rodadas cada atrito custou: os diários dizem o que aconteceu e raramente o tempo, e o único com tempo de autoria é o do sedã. Quantos dos atritos de vista e de `fluxo:objeto` ainda reproduzem hoje, porque rodar a bancada e o pacote do crítico estava fora do permitido. Se a nota que não sobe em 54 de 86 pares é do crítico ou da peça. O uso real do MCP em sessões fora desta máquina. O custo do `mcp:check` nos gates. As 577 entradas de rodada foram contadas por palavra e por uma amostra de 60, e não uma a uma. Nos dois diários de esboço do avião a causa foi atribuída pelo começo de cada item, e o esboço antigo que eles descrevem pode ter mudado desde outubro. A contagem de ferramentas com `--ajuda` vale para as 14 que executei; a leitura por expressão regular das outras 45 não era confiável e ficou fora.
