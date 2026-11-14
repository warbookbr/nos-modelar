# Planejador de execução da receita

**Estado:** ativo

**Território:** `procedural/nucleo/planejador/`, `procedural/nucleo/memoria-de-execucao.js`, a opção `planejar` em `src/autoria/executar-receita.js`, o rastreio de escrita das operações em `procedural/nucleo/nucleo.js` (`ESCRITA_DAS_OPERACOES`), os manifestos de `procedural/nucleo/operacoes/` onde o planejador exigir a declaração de leitura e escrita, e a ligação no `descrever` e na bancada.

**Responsável:** a IA da sessão do furgão. A pessoa pediu a ativação em 2026-11-14; o plano do núcleo para quem escreve receita já fechou, então o território está livre.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-14.

## Problema observado

A receita executa na ordem em que está escrita, passo a passo, e cada passo pega o estado inteiro do anterior. Três
coisas decorrem disso e foram medidas.

Primeiro, o tempo. A bancada abre o furgão realista (262.947 faces) em 102 a 174 s só na execução da receita, no navegador, e o
`descrever` dele leva 84 s no Node; a carroceria do sedã levou 171 s (`memoria-de-execucao.js`). A junta do cabeçote, com 60
furos numa extrusão, leva uns 40 s só na execução, relatada pela sessão que a modela (a peça não está nesta cópia, então o número não
foi reproduzido aqui). Em todos esses casos o custo está nas booleanas sobre uma malha já grande.

Segundo, a repetição. Subtrações seguidas sobre o mesmo alvo (os 60 furos são 60 `subtrair`, ou um `subtrair` por vão da cabine)
recortam a malha crescente uma vez por ferramenta, e cada recorte reconstrói o manifold do alvo inteiro. O `subtrair` já aceita
`solidos: [peça, ferramenta, ferramenta...]` (`booleanas.js`), mas a receita não o usa por conta própria, e um ajudante que
junta as ferramentas pela mão de quem escreve não ajuda a receita que já existe.

Terceiro, o reaproveitamento. A memória de execução atual (`procedural/nucleo/memoria-de-execucao.js`) guarda o estado depois de
certos passos e recomeça do último prefixo que não mudou. Ela é linear: mudar o passo 40 refaz do 40 ao fim, mesmo que o passo 41 em
diante não dependa dele (uma roda e um para-choque não dependem um do outro). E a bancada, que é um processo novo a cada carga, não a
vê: o cache de malha da bancada (`src/bancada/cache-da-execucao.js`, fora do núcleo) guarda só o resultado final por receita inteira, e
qualquer byte mudado refaz tudo.

## Hipótese

Se o núcleo ler a receita como grafo de dependência antes de executar, três ganhos saem do mesmo grafo, sem mudar o que a receita
significa: agrupar subtrações seguidas sobre o mesmo alvo numa só (unir as ferramentas e cortar uma vez), guardar o resultado por passo
com a impressão digital das entradas dele e recomputar só o que depende do que mudou, e executar em paralelo as partes
independentes. A hipótese é medida: o agrupamento tem de dar a malha igual (ou igual dentro de uma tolerância declarada) e o tempo
tem de cair nas peças pesadas abaixo, e se não cair o plano para.

## Linha de base: o `descrever` das peças pesadas

Medido em 2026-11-14, nesta cópia, `node tools/modelar/descrever-peca.mjs <peça>` em processo novo, uma peça por vez, máquina de uso
geral (Windows, Node 22, sem outra carga pesada, exceto onde dito). É o tempo de parede, que inclui a execução da receita, a
medição das partes e os contatos.

| Peça | Faces | `descrever` | Execução da receita sozinha |
|---|---|---|---|
| `furgao-realista` | 262.947 | 84 s (uma execução) | 72 s |
| `carenagem-de-prova` | 34.176 | 4,1 s e 4,3 s (duas execuções) | 0,85 s |
| `kukri` | 12.179 | 2,7 s e 2,6 s (duas execuções) | 0,86 s |

A execução da receita sozinha é `executarReceita(receita)` em Node, sem a medição. No navegador, a mesma execução do furgão realista
levou entre 102 e 174 s em seis aberturas (a máquina estava dividida com outras sessões), e a abertura seguinte, do cache da bancada,
levou 2,0 s (leitura de 146 MB do IndexedDB). O número que este plano tenta mover é a coluna de execução; o `descrever`
acrescenta a medição, que este plano não toca. Só o furgão realista pesa de verdade: as outras duas peças mais lentas do acervo
ficam abaixo de 1 s de execução, e a fatia 1 inclui a junta do cabeçote (40 s relatados) assim que ela estiver no acervo.

## Resultado

Um planejador de execução no núcleo, atrás de uma opção que fica desligada até o gate passar (`planejar: true` em `executarReceita`,
que a bancada e o `descrever` ligam por escolha), com quatro partes:

1. **O grafo.** Cada passo declara, pelo registro de operações (que já tem os manifestos), o que lê (seleções por `origemId`, `sel`,
   `de`, `solidos`, aliases, parâmetros, o esqueleto) e o que escreve (as faces e os sólidos que cria, as partes que nomeia). Passo
   cuja leitura o manifesto não declara é tratado como barreira: lê tudo e escreve tudo, e a ordem dele não muda.
2. **Agrupamento de subtrações.** Uma sequência de `subtrair` com o mesmo primeiro sólido (a peça), sem passo intermediário que leia ou
   escreva o alvo, vira um `subtrair` com as ferramentas unidas, que o `solidos` já aceita. A união das ferramentas só vale se elas
   não dependerem do resultado das subtrações anteriores; o grafo diz isso. A ordem das ferramentas, e as faces que cada uma cria,
   seguem a da receita, para a identidade das faces não mudar.
3. **Cache por passo.** A chave de um passo é o hash da operação e dos argumentos normalizados mais as impressões dos estados de que
   ele depende (e não da cadeia inteira de passos anteriores, que é o que a memória de execução faz). Mudar um passo invalida o
   dele e os dos que o leem; o resto volta do cache. O armazém é injetável: memória no núcleo, e o adaptador da bancada pode
   persistir.
4. **Execução paralela de partes independentes.** Os ramos do grafo sem dependência entre si (partes do furgão que só compartilham
   parâmetros) executam em trabalhadores, e o resultado volta por clonagem estruturada; a junção final segue a ordem da receita, para o
   estado ser o mesmo.

## Filtro Agent-First

- `memoria-de-execucao.js`: ESTENDER. O ponto de prefixo continua valendo como caso de grafo linear, e o cache por passo é a
  generalização; os dois não coexistem ligados ao mesmo tempo.
- `subtrair` com `solidos` de várias ferramentas: USAR DIRETO; o agrupamento reescreve para ele, sem operação nova.
- Registro de operações e manifestos: USAR DIRETO como fonte do que cada passo lê e escreve; passo sem leitura declarada vira
  barreira, e a lacuna vira um achado a declarar no manifesto, e não regra do planejador.
- Cache de malha da bancada (`cache-da-execucao.js`): MANTER como camada de cima (resultado final por receita); o do planejador é
  de baixo (por passo). A bancada pode abrir sem os dois.
- Paralelismo: ADIAR para a fatia 4, e só se as fatias 2 e 3 não bastarem; é a parte de maior risco (clonagem do estado, trabalhadores
  no Node e no navegador).

## Incluído

- `procedural/nucleo/planejador/` (grafo, agrupamento, impressão digital) e testes;
- a opção `planejar` em `executarReceita` e a ligação na bancada e no `descrever`;
- a medição de tempo antes e depois em `npm run descrever` nas peças da linha de base, e a ficha da comparação de malha;
- a declaração de leitura e escrita nos manifestos das operações que ainda não a têm, onde o planejador exigir.

## Excluído

- mudar o significado de qualquer operação ou a ordem em que a receita é escrita;
- o cache persistente por passo no navegador (depende do que a fatia 3 mostrar; seria plano à parte);
- otimizar a booleana em si (`manifold-3d`) ou a medição de contatos, que têm planos próprios;
- peças novas.

## Critério de pronto (gate de saída)

1. A malha com o planejador é bit a bit igual à sem ele em cada peça da linha de base e em todo o acervo (`npm run gates` do acervo
   com a opção ligada): mesmos vértices, mesmas faces, mesma identidade de face, mesmas partes. Onde o agrupamento das subtrações não
   puder dar bit a bit (a booleana de várias ferramentas de uma vez pode ordenar vértices de outro jeito), a tolerância é declarada
   antes da medição, no plano, e medida: distância máxima entre as superfícies, volume por parte, contagem de faces por parte. Sem
   tolerância declarada e dentro dela, o agrupamento fica desligado.
2. O tempo da execução e do `descrever` nas três peças pesadas da linha de base cai, medido antes e depois na mesma máquina, três
   execuções cada, com a mediana escrita aqui. Meta de partida: a execução do furgão realista cai pelo menos pela metade; a meta é
   revista pela fatia 1, que mede onde o tempo está.
3. Mudar um passo no meio de uma receita refaz só os passos que dependem dele, com o número de passos recomputados contado em teste.
4. A mesma receita dá o mesmo resultado em duas execuções e com cache frio e cache quente; a opção desligada deixa tudo como hoje.
5. Testes e `npm run gates` verdes.

## Decisão na ativação

A pessoa exige malha idêntica antes e depois. Por isso o gate 1 vale sem tolerância: o agrupamento de subtrações só fica ligado nos casos em que a malha sai bit a bit igual, com a mesma identidade de face e as mesmas partes, e nos outros fica desligado. Nenhuma tolerância se declara neste plano sem nova decisão da pessoa. A fatia 1 roda em processo novo, uma peça por vez, sem outra carga pesada na máquina, e mede de novo a linha de base aqui (Linux), porque a tabela acima é de outra máquina.

## Redirecionamento depois da fatia 1 (decisão da pessoa, 2026-11-14)

A fatia 1 acionou o critério de parada: o agrupamento de subtrações alcança no máximo 2,2% do tempo do furgão, e 48% do tempo está em `rotaciona`, `transladar`, `arranja` e `limparLascas`. A pessoa aprovou trocar o rumo. A fatia 2 deixa de ser o agrupamento, que sai do plano, e passa a ser: medir primeiro se essas operações fazem o núcleo refazer o rastreio da malha inteira (execução com `retrato: 'completo'` contra a rápida); se a hipótese se confirmar, declarar a escrita delas em `ESCRITA_DAS_OPERACOES`, com a malha idêntica bit a bit provada pelo modo `conferido` no acervo inteiro, e a meta de levar a execução do furgão de 118 s para menos de 85 s, mediana de três. Se a hipótese não se confirmar, o plano para de novo com o número. O cache por passo (fatia 3) segue para depois, e o paralelismo (fatia 4) continua adiado.

## Fatias

1. Medir sem mudar nada: perfil da execução das peças da linha de base (que passos e que operações consomem o tempo), o grafo de
   leitura e escrita extraído em modo só-leitura, e quantas sequências de subtrações seguidas sobre o mesmo alvo há no acervo, com o
   tamanho delas. Fecha a meta de tempo da fatia 2.
2. Agrupamento de subtrações, com a comparação de malha (bit a bit ou a tolerância) e o tempo, na junta do cabeçote se a peça já
   estiver no acervo, e no furgão realista.
3. Cache por passo com a impressão digital das entradas, e a prova de que mudar um passo recomputa só os dependentes.
4. Execução paralela das partes independentes, se ainda valer; a decisão sai dos números das fatias 2 e 3.

## Andamento — fatia 1

Medida em 2026-11-14, nesta cópia, em Linux com 4 núcleos e Node 22. Todas as medidas de tempo rodaram em processo novo, uma de cada vez, e só começaram com nenhum processo de vitest, gates, descrever ou blender de outro agente em execução; a carga média de um minuto antes de cada medida ficou entre 0,82 e 0,96 (a do próprio processo anterior), sem outra carga pesada. O comando que reproduz a execução sozinha é `node tools/modelar/perfil-da-execucao.mjs <peça> --executar` e o do `descrever` é `node tools/modelar/descrever-peca.mjs <peça>`; as ferramentas ficaram no repositório e não ligam nada por padrão.

### Linha de base no Linux

Três execuções cada, com a mediana entre parênteses depois dos três valores. A coluna da execução é `executarReceita` sozinha, sem importar nada no tempo medido.

| Peça | Faces | Execução da receita (s) | `descrever` (s) |
|---|---|---|---|
| `furgao-realista` | 262.947 | 116,1 / 123,5 / 118,1 (mediana 118,1) | 162,0 / 168,3 / 170,0 (mediana 168,3) |
| `carenagem-de-prova` | 34.176 | 1,61 / 1,71 / 1,45 (mediana 1,61) | 7,02 / 7,08 / 6,85 (mediana 7,02) |
| `kukri` | 12.179 | 1,94 / 1,93 / 1,74 (mediana 1,93) | 4,59 / 4,89 / 4,94 (mediana 4,89) |

O furgão realista leva 118 s na execução aqui, contra os 72 s da tabela acima, que era de outra máquina; as duas peças pequenas pesam quase o mesmo nas duas. A diferença entre o `descrever` e a execução (50 s no furgão, 5 s na carenagem, 3 s no kukri) é a medição das partes e dos contatos, que este plano não toca.

### Perfil da execução do furgão

Uma execução cronometrada passo a passo, com o cronometrador do `descrever` (um registro que só embrulha `resolver`, de modo que o caminho rápido do núcleo continua valendo): 131,0 s de parede, 130,0 s dentro dos passos, 739 passos. Comando: `node tools/modelar/perfil-da-execucao.mjs furgao-realista --perfil`.

Soma por operação:

| Operação | Passos | Tempo (s) | Parte | Maior passo (ms) |
|---|---|---|---|---|
| `rotaciona` | 75 | 33,9 | 26,1% | 695 |
| `aberturaPorContorno` | 17 | 30,0 | 23,1% | 2.631 |
| `transladar` | 35 | 18,2 | 14,0% | 659 |
| `subtrair` | 18 | 15,4 | 11,8% | 1.978 |
| `arranja` | 12 | 6,2 | 4,7% | 643 |
| `unir` | 6 | 5,1 | 3,9% | 1.171 |
| `limparLascas` | 4 | 4,5 | 3,5% | 1.219 |
| `lathe` | 63 | 3,4 | 2,6% | 94 |
| `subdivisao` | 34 | 2,7 | 2,1% | 1.481 |
| `intersectar` | 4 | 2,7 | 2,1% | 725 |
| `extrusao` | 35 | 2,1 | 1,6% | 117 |
| `material` | 188 | 2,0 | 1,5% | 757 |
| `friso` | 32 | 1,9 | 1,5% | 91 |
| `parte` | 164 | 1,3 | 1,0% | 707 |
| `cubo`, `liso`, `loft`, `solido` | 51 | 0,6 | 0,4% | 58 |

Os 20 passos mais caros, em ms: passo 91 `aberturaPorContorno` 2.631; 92 `aberturaPorContorno` 2.363; 112 `aberturaPorContorno` 2.121; 384 `aberturaPorContorno` 2.032; 438 `subtrair` 1.978; 396 `aberturaPorContorno` 1.935; 372 `aberturaPorContorno` 1.851; 338 `aberturaPorContorno` 1.845; 360 `aberturaPorContorno` 1.834; 111 `aberturaPorContorno` 1.793; 378 `aberturaPorContorno` 1.789; 354 `aberturaPorContorno` 1.624; 114 `aberturaPorContorno` 1.565; 390 `aberturaPorContorno` 1.535; 0 `subdivisao` 1.481; 366 `aberturaPorContorno` 1.398; 113 `aberturaPorContorno` 1.385; 477 `subtrair` 1.346; 559 `subtrair` 1.271; 109 `aberturaPorContorno` 1.266. Dezesseis deles são `aberturaPorContorno`, três são `subtrair` e um é `subdivisao`; nenhum passa de 2,7 s, e o tempo está espalhado: os 20 mais caros somam 35 s, 27% do total.

As booleanas (`aberturaPorContorno`, `subtrair`, `unir`, `intersectar`) somam 53,2 s, 40,9%. Os passos que não são booleana e pagam o tamanho da malha (`rotaciona`, `transladar`, `arranja`, `limparLascas`) somam 62,8 s, 48,3%. `rotaciona` e `transladar` mexem numa parte pequena e custam em média 450 e 520 ms por passo. A hipótese, ainda não medida, é que o rastreio do retrato da malha inteira, que o núcleo refaz depois de cada passo cuja escrita não está declarada em `ESCRITA_DAS_OPERACOES` (só as primitivas, `parte`, `material`, `liso`, `solido`, `publicarPorta` e `pesar` estão), é o que esses passos pagam.

### O grafo de leitura e escrita, só leitura

Extraído de `REGISTRO_DA_RECEITA.manifesto` (`procedural/nucleo/planejador/leitura-escrita.js`, `--acervo` para o acervo). O manifesto traz só `artefatos.entra` e `artefatos.sai` por operação: dizer que a operação lê a malha, sem dizer que seleções. Nenhuma operação declara leitura por seleção, então nenhum passo tem leitura declarada e todo passo que lê a malha é barreira pela regra do plano. A leitura que se enxerga é a dos argumentos (`sel`, `de`, `solidos`, `chapa` e os outros campos de referência, por `origem`, `alias` ou id), contada à parte como extraível.

Furgão realista (739 passos): 179 criadores (`artefatos.entra` vazio: `lathe` 63, `extrusao` 35, `subdivisao` 34, `friso` 32, `cubo` 8, `loft` 7), 560 que leem a malha, 0 com leitura declarada, 560 barreiras, 560 com leitura extraível dos argumentos e 0 dinâmicos. Por operação, todos os passos que leem viram barreira: `material` 188, `parte` 164, `rotaciona` 75, `transladar` 35, `liso` 21, `subtrair` 18, `aberturaPorContorno` 17, `solido` 16, `arranja` 12, `unir` 6, `intersectar` 4, `limparLascas` 4.

Acervo (110 receitas de passos: as peças e as partes das montagens): 9.444 passos, 6.611 leem a malha, 0 com leitura declarada, 6.611 barreiras, 6.363 com leitura extraível dos argumentos e 248 dinâmicos (seleção por `onde` ou forma não enumerável: `arredondarAresta` 100, `moveV` 53, `limparLascas` 36, `parte` 23, `publicarPorta` 21). Duas observações para o planejador: `friso` e `subdivisao` constam no manifesto sem leitura (`artefatos.entra` vazio) embora `friso` receba `linha` e `superficie`, e `parte` e `material` são 4.694 passos, 71% dos que leem, de modo que o planejador só ajuda se tratar esses dois como leitura declarada e não como barreira.

### Sequências de `subtrair` sobre o mesmo alvo

O acervo tem 91 `subtrair`, e a quase totalidade já usa `solidos` com várias ferramentas. Sequências de dois ou mais cortes seguidos, em que o primeiro sólido do corte é o resultado do anterior ou o mesmo alvo:

- estritas (cortes vizinhos na receita): 1, em `aviao/empenagem-vertical`, passos 7 e 8, com 2 cortes e 2 ferramentas;
- relaxadas (aceitam no meio passos que só criam geometria e não leem o alvo): 8, todas de 2 cortes: `aviao/empenagem-vertical` 7-8; `empilhadeira/protetor` 7-9 e 17-19; `furgao-realista` 654-657 e 703-706; `instalacao-solar/grampo-ponta-30` e `-40`, 2-4 (8 ferramentas cada).

Nenhuma sequência tem ferramenta que dependa do corte anterior. A junta do cabeçote (60 furos em 60 `subtrair`) não está nesta cópia, então o caso que motivou o plano não existe no acervo. No perfil do furgão as duas sequências somam 2,85 s (1,31 s e 1,55 s), 2,2% da execução; unir as ferramentas pode poupar uma fração disso.

### Critério de parada

O plano diz que, se a fatia 1 mostrar o tempo fora das booleanas, ele para e o achado vai ao dono dessa medição. A medição mostra isso pela metade: 41% do tempo do furgão está em booleanas, mas só 2,2% está em sequências agrupáveis de `subtrair`, e 48% está em `rotaciona`, `transladar`, `arranja` e `limparLascas`, que não são booleanas. Com o agrupamento sozinho, a meta de partida (a execução do furgão cair pela metade) é inalcançável: o limite superior dele é 2,2% do tempo. A fatia 2 como está escrita não paga; a decisão de redirecioná-la é da pessoa.

### Meta de tempo proposta para a fatia 2

Recomendação: não executar a fatia 2 como agrupamento de subtrações para o furgão. Se a pessoa decidir fazê-la mesmo assim, a meta honesta é a execução do furgão realista cair pelo menos 1 s (0,8%) com a malha idêntica, e a do agrupamento na junta do cabeçote só medir quando a peça entrar no acervo. Se a pessoa decidir redirecionar, a fatia 2 passa a ser a declaração do rastreio rápido (`ESCRITA_DAS_OPERACOES`) para `rotaciona`, `transladar`, `arranja` e `limparLascas`, com a malha idêntica provada pelo modo `conferido` do retrato, e a meta é a execução do furgão cair de 118 s para menos de 85 s, o que corresponde a recuperar metade dos 62,8 s dessas quatro operações; essa meta só vale depois de medir a hipótese do retrato numa execução com `retrato: 'completo'` contra a rápida, e o arquivo a mudar (`procedural/nucleo/nucleo.js`) está fora do território deste plano.

## Riscos e parada

A identidade de face é o risco central: unir as ferramentas de uma subtração pode mudar quais faces o núcleo nomeia como criadas por
qual passo, e as partes, os contatos e as vistas leem essa identidade. Se o agrupamento mudar identidade de face em qualquer peça do
acervo, a fatia 2 para e fica só com os casos em que não muda. O cache por passo depende de o estado ser serializável (a memória
atual já recusa `Map` e classe e liga e desliga por execução): se o custo de copiar o estado a cada passo passar do que o passo
custa, o cache guarda só os passos acima de um custo mínimo medido na fatia 1. O paralelismo pode custar mais em clonagem do que
ganha; por isso é a última fatia e tem gate próprio. Se a fatia 1 mostrar que o tempo está fora das booleanas (por exemplo na
medição de contatos), o plano para e o achado vai ao dono dessa medição.

## O que precisa ser combinado antes de ativar

O território é `procedural/nucleo/` e `src/autoria/executar-receita.js`, hoje do plano ativo do núcleo: este plano espera ele fechar ou
que a pessoa decida a ordem. Ele reusa `memoria-de-execucao.js`, que é dele, e não pode mudar a assinatura de `executarReceita` sem
o acordo. A parte da bancada (`src/bancada/cache-da-execucao.js`) já está feita e fica como está.

## Fechamento

Preencher somente ao concluir ou cancelar.
