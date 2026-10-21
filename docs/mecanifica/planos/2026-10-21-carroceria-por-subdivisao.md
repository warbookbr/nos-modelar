# Carroceria por subdivisão — superfície contínua com vincos nomeados no núcleo

**Estado:** ativo

**Responsável:** Claude, com a pessoa decidindo as três escolhas da seção de decisões

**Repositório e base:** `warbookbr/nos-modelar`, main em `8f33c169`

## Problema observado

O núcleo modela bem peça de bloco, por extrusão, interseção de vistas, loft fechado e booleana, mas não tem como descrever uma carroceria de chapa contínua com dobras vivas, que é como se modela à mão a superfície hard surface: uma gaiola de quads de poucas centenas de pontos, vincos marcados e a superfície lisa que sai da subdivisão. Um estudo local em 2026-10-21, fora do repositório, modelou trechos de carroceria a partir só de vistas ortográficas com grade e de uma ficha de medidas, sem acesso a malha, e comparou cinco representações. A interseção de vistas saiu facetada; o loft por parâmetros nomeados e a subdivisão Catmull-Clark com vincos acertaram o volume no mesmo nível; e só a subdivisão deu superfície lisa sem remendo de lofts. Num segundo trecho, totalmente cego, o modelador escolheu sozinho a subdivisão e montou a estrutura da receita. Nos dois trechos o volume ficou certo e as linhas vincadas não: menos de um quinto delas coincidiu a até 5 mm, o mesmo que uma malha reduzida a um vigésimo dos vértices.

O estudo deixou uma operação `subdivisao` experimental, conferida contra o modificador Subdivision Surface do Blender a 1,5e-7 m em 16 gaiolas desenhadas por código, e cinco atritos que o modelador relatou e que são do núcleo, não da leitura das imagens:

| Atrito | Consequência | O processo pegaria? |
|---|---|---|
| a subdivisão aproxima e não passa pelos pontos da gaiola | toda medida da TABELA sai encolhida, e o canto de borda não tem raio controlado | não: a peça exporta sem erro |
| vinco declarado por índice de aresta | índice de array vira endereço salvo, contra a regra do `CLAUDE.md`, e mudar a gaiola desloca os vincos | não |
| a gaiola em grade adensa a peça inteira para adensar perto de um vinco | dez vezes mais vértices que o necessário (35 mil na meia peça) | não |
| vértice de gaiola sem face vira órfão na saída | a receita compacta a gaiola à mão | sim, `neutro.orfaos` acusa |
| superfície sem espessura | não fecha sólido para contato, volume e exportação de peça | sim, `conferir-malha` acusa casca aberta |

A régua que mediu o estudo (distância nos dois sentidos só do que se vê de fora, erro de normais, casamento de vincos e folha com listras de reflexo) e o preparo do pacote cego (recorte exato pelos planos de uma caixa, vistas com grade, avesso marcado) ficaram em scripts locais. Dois defeitos deles só foram vistos pela pessoa: o recorte por triângulo inteiro deixava lascas no alvo, e a vista que olha a chapa por dentro mostrava o avesso como se fosse a superfície.

## Resultado

Uma receita descreve uma carroceria de chapa como gaiola nomeada com vincos nomeados, a superfície passa pelos pontos declarados e fecha sólido com espessura, e a régua geral do repositório mede vincos, distância e normais entre duas malhas quaisquer, de modo que um trecho cego refeito com o núcleo novo acerta mais linhas vincadas que antes, medido pela mesma régua.

## Filtro Agent-First

`subdivisao` é USAR DIRETO: passo do núcleo, determinístico, sem Three.js, com a gaiola e os vincos como dados da receita. A interpolação é REFATORAR da operação: uma opção declarada que resolve a gaiola para que a superfície limite passe pelos pontos marcados, por eliminação de Gauss em ordem fixa, para continuar bit a bit. Os vincos por nome e a gaiola por estações são ENVOLVER: um ajudante em `procedural/nucleo/` monta a gaiola a partir de estações e colunas nomeadas, aceita colunas que se fundem (polígono de três ou cinco lados na transição) e traduz vinco nomeado em arestas, sem que a receita veja índice. A espessura é USAR DIRETO como passo novo sobre superfície aberta. A régua e o pacote cego são ENVOLVER do Blender, em `tools/blender/`, opcionais e fora do núcleo, do CI e do `--completo`, como o gabarito do plano de ajustes. O loft de chapa aberta fica ADIAR: a subdivisão cobre o caso, e o pedido volta ao backlog.

## Incluído

A operação `subdivisao` promovida ao núcleo com catálogo, skill e fixture do oráculo; a interpolação; os vincos nomeados com nitidez fracionária para raio de borda; o ajudante de gaiola por estações; o passo de espessura; `tools/blender/regua.py` e `tools/blender/pacote-cego.py` com instrução de uso em `docs/mecanifica/blender/`; uma peça de prova desenhada por código, sem referência externa, que exercite vinco, arco e vão; uma instrução nova de modelar carroceria em `docs/mecanifica/`, ao lado da de veículos; o gate de vazamento; a nota em `docs/mecanifica/UPSTREAM-NOS.md`.

## Excluído

Modelar o carro inteiro, que é plano próprio depois deste; o loft de chapa aberta; superfície NURBS; booleana sobre superfície subdividida; mudança em peça aprovada do acervo; qualquer malha, imagem, medida ou nome tirado de referência externa dentro do repositório.

## Invariantes

O núcleo continua sem Three.js, sem domínio automotivo e sem ferramenta externa. Mesma receita, mesma malha, bit a bit. Nenhum índice de vértice, aresta ou face vira identidade salva: gaiola, estações, colunas e vincos são endereçados por nome. As 53 peças do acervo regeneram iguais, porque nenhuma usa a operação. O Blender fica só como oráculo congelado em fixture e como ferramenta opcional local.

## Gate de saída

1. `subdivisao` confere com o oráculo congelado a 1e-6 m em todas as gaiolas da fixture, com e sem vincos inteiros e fracionários.
2. Com `medidas`, cada ponto marcado da gaiola fica a no máximo 1e-6 m da superfície limite, nas gaiolas da fixture e na peça de prova.
3. A receita da peça de prova não contém índice numérico de aresta, vértice ou face, e o teste confere.
4. A peça de prova com espessura sai fechada em `conferir-malha`, com volume igual à área vezes a espessura a 2%.
5. Um trecho cego refeito localmente, fora do repositório, com o mesmo pacote e a mesma régua do estudo, sobe o F1 dos vincos a 5 mm em relação ao registrado no estudo; a folha vai à pessoa, que aprova a forma.
6. O gate de vazamento recusa, em teste, arquivo de malha ou cena, mensagem de commit e nome de ramo com termo da lista protegida.
7. `npm run gates -- --completo` verde.

## Fatias

1. **Promover a subdivisão.** A operação experimental do estudo entra com a fixture do oráculo de 16 gaiolas desenhadas por código, o catálogo, `uso-operacoes.js` e `.claude/skills/criar-peca/references/operacoes-procedurais.md`. Vértice de gaiola sem face passa a gritar com o nome do ponto, no lugar de virar órfão. Pronto quando o gate 1 passa e o teste do catálogo e o da skill listam a operação.
2. **Interpolação.** A opção `medidas` move só os pontos marcados da gaiola, resolvidos de uma vez sobre os pesos do ponto limite, até a superfície limite passar por eles (decisão 2). Pronto quando o gate 2 passa e duas execuções dão a mesma malha bit a bit.
3. **Vincos nomeados e raio de borda.** O vinco se declara como sequência de pontos nomeados da gaiola com nitidez de 0 a 1; a fração dá o raio de borda. O oráculo ganha gaiolas com vinco fracionário. Pronto quando os gates 1 e 3 passam para essas gaiolas.
4. **Gaiola por estações.** O ajudante monta a gaiola de estações e colunas nomeadas, aceita colunas que se fundem e vãos tirados por nome. Pronto quando a peça de prova sai com menos de um terço dos vértices da mesma forma em grade cheia.
5. **Espessura.** O passo desloca a superfície pela normal e costura as bordas, com os vãos fechados por parede. Pronto quando o gate 4 passa.
6. **Régua e pacote cego.** `tools/blender/regua.py` e `tools/blender/pacote-cego.py` saem dos scripts locais sem nenhum dado, com o recorte exato por planos, a remoção de componente solto, a visibilidade pelo lado de fora e o avesso marcado em outra cor; validados em teste que se ignora sem `MECANIFICA_BLENDER`, contra uma forma desenhada por código e sua versão decimada.
7. **Gate de vazamento.** O teste de termos proibidos passa a ler mensagens de commit e nomes de ramo, recusa arquivo de malha ou cena no índice e passa a usar a lista embaralhada com a chave do segredo do CI (decisão 3); sem a chave, o teste local diz que ela falta e o CI falha.
8. **Prova e instrução.** A peça de prova vai à bancada e à pessoa; a instrução de modelar carroceria escreve o fluxo: vistas e ficha, gaiola por estações, vincos nomeados, espessura, régua. O trecho cego é refeito localmente e o gate 5 é medido.
9. **Fechamento.** `UPSTREAM-NOS.md`, backlog, `npm run gates -- --completo` e o plano movido para `encerrados/`.

## Decisões da pessoa

1. **Ordem dos planos.** Aprovada em 2026-10-21: este plano fica ativo primeiro, porque só acrescenta operações e nenhuma peça aprovada muda; o de ajustes no núcleo dos veículos volta a `pronto` e é o seguinte.
2. **Interpolar por opção.** Aprovada em 2026-10-21: a aproximação continua o padrão, que é o que o oráculo confere, e a interpolação é opção declarada, porque muda o sentido do dado salvo. Revista em 2026-10-21, depois da parada da fatia 2: a opção passa a ser `medidas`, a lista dos pontos nomeados da gaiola que a superfície limite deve atravessar, e só eles se movem; as posições deles se resolvem de uma vez por eliminação de Gauss sobre os pesos do ponto limite, no lugar da iteração fixa, e sistema singular ou mal condicionado falha com os nomes dos pontos.
3. **Segredo do CI.** Aprovada em 2026-10-21, porque o repositório deve ficar público: a lista de termos é embaralhada com a chave `MECANIFICA_CHAVE_TERMOS`, cadastrada pela pessoa como segredo do repositório no mesmo dia; a cópia local fica fora do repositório e a pessoa a guarda. Antes de tornar o repositório público, o histórico limpo vai para um repositório novo, porque o GitHub pode guardar commits antigos acessíveis pelo código depois de um push forçado.

## Riscos e parada

O risco maior é a interpolação não convergir em gaiola com vinco vivo, o que tornaria a medida da TABELA inexata justamente nas quinas; a fatia 2 para e volta à pessoa se o gate 2 não fechar em 20 iterações. Também para se uma fatia passar de dois dias, se o núcleo precisar de dependência externa ou se o trecho cego refeito não subir os vincos, caso em que o investimento muda para a conversão assistida.

## Andamento

Escrito e ativado em 2026-10-21 a partir do estudo local, com as três decisões aprovadas, sem implementação no repositório.

Fatia 1 feita em 2026-10-21: a operação `subdivisao` e a fixture do oráculo entraram copiadas do estudo, sem os comentários que citavam o estudo, com o catálogo, a skill `criar-peca` e `UPSTREAM-NOS.md`. A fixture tem 7 gaiolas desenhadas por código em 16 combinações de gaiola e nível, e não 16 gaiolas como o texto do plano dizia. O gate 1 passa sem vincos fracionários novos: a diferença máxima para o Blender é 9e-7 m, quase toda do arredondamento da fixture a 1e-6, e a mesma receita dá a mesma malha bit a bit. Vértice de gaiola sem face grita com o nome do ponto. Falta a medida de vincos fracionários na fatia 3, que acrescenta gaiolas ao oráculo.

Fatia 2 feita em 2026-10-21, pelo desenho revisto na decisão 2. A primeira tentativa, a iteração fixa em que a gaiola anda a diferença entre o ponto declarado e o ponto limite, só fechava 1e-6 m em 20 iterações no cubo liso, e as outras gaiolas do oráculo pediam de 25 a 677, porque cada passo encolhe o erro por 1 menos o menor autovalor do operador de ponto limite (de 0,015 a 0,33). A opção entregue é `medidas`. O ponto limite sai por fórmula fechada no vértice liso de qualquer valência, no vinco, na borda e no canto, e pelo autovetor da matriz de refino da estrela no fim de vinco vivo, onde a máscara lisa errava 3,4e-2 m; todos conferem a menos de 1e-12 m com a estrela refinada 80 níveis. Os pontos marcados passam pela superfície limite a cerca de 1e-15 m nas 7 gaiolas do oráculo e em gaiolas com vinco infinito, com vinco fracionário de nitidez 0,4 e com fim de vinco vivo, medidos pela fórmula e pelo refino; os pontos não marcados da gaiola não se movem, e duas execuções dão a mesma malha bit a bit. O ganho do sistema vai de 2,6 a 77 nas gaiolas do oráculo, e o limite é 100. A superfície se desloca no máximo 7% além da correção nos pontos marcados, mas a gaiola anda até 3 m no cubo de 2 m com os oito cantos medidos. Como a peça mostra a malha de nível finito, que ficava de 1 a 18 cm do ponto medido no nível 2, a operação com `medidas` põe todo vértice da malha entregue no seu ponto limite: os vértices ficam a até 1,2e-15 m da superfície limite (conferido pela estrela refinada 60 níveis) e cada ponto medido é vértice da malha exportada a até 5,4e-16 m. Sem a projeção, os vértices de nível 2 ficavam a até 18 cm do limite. O preço é a corda: no cubo de 2 m em nível 2, o meio da face fica a 5,8 cm da superfície limite contra 2 cm sem a projeção, e na grade, 6,2 mm contra 2,1 mm, medidos contra a malha de nível 5 no limite; a distância máxima da malha inteira à superfície ainda cai, de 9,5 para 5,8 cm no cubo e de 1,2 cm para 6,2 mm na grade. A projeção leva de 0,8 a 9 ms nas gaiolas do oráculo em nível 2 e 3, contra 0,1 a 1 ms da subdivisão sozinha. Os oito cantos do cubo liso, e do cubo com fim de vinco vivo, formam sistema singular e gritam com os nomes. Sem `medidas`, a saída da operação não mudou e o oráculo passa.

Fatia 3 feita em 2026-10-21. O vinco é `{ nome, pontos, nitidez }` sobre pontos nomeados da gaiola, a face e o canto aceitam nomes, e o passo traduz os nomes em índices só para chamar a função pura. Nenhuma receita do acervo nem fixture usava a operação, então vinco e canto por índice gritam com a forma nomeada, no lugar de continuar aceitos; a face ainda aceita índice para a gaiola de pontos anônimos. A nitidez n de 0 a 1 vira 10 n² níveis, a conversão do Blender, e `'viva'` é o vinco vivo explícito. A medida mostrou que o vinco 1 do Blender já é vivo: o OpenSubdiv trata nitidez de 10 para cima como infinita, a superfície limite do Blender com vinco 1 confere com a do núcleo a 1,7e-7 m quando 10 conta como vivo e fica a 4,3e-4 m quando conta como 10 níveis finitos, e o núcleo passou a tratar 10 como vivo, o que não muda nenhuma malha de até 6 níveis. A fixture do oráculo ganhou 6 receitas escritas só com nomes, geradas no Blender 5.0.1 e arredondadas a 1e-7: o cubo de 1 m com as doze arestas a 0,25, 0,5, 0,75 e viva, uma chapa ondulada com vincos de 0,25, 0,5 e 0,75 que se cruzam, terminam dentro dela e têm um canto, e a mesma chapa com vinco vivo e borda com cantos. Elas conferem a 4,5e-7 m no modo uniforme e a 5,1e-7 m contra a superfície limite do Blender (`use_limit_surface`, qualidade 10), o que confere também o ponto limite da fatia 2 com vinco fracionário; o teste confere que nenhuma delas tem índice numérico em vértice, face, vinco, canto ou medida, por `enderecosPorIndice`, que a peça de prova da fatia 8 pode reusar, e `medidas` com vincos nomeados passam a 4,6e-16 m. O raio de borda, medido como o filete circular de mesma folga na diagonal do meio da aresta, no cubo de 1 m com as doze arestas vincadas, é de 628 mm com nitidez 0,1, 428 mm com 0,25, 107 mm com 0,5, 12,2 mm com 0,75, 2,1 mm com 0,9, 1,1 mm com 0,95 e zero com 1, o que dá raio ≈ 0,6 × lado da face × 2^(−10 n²) de 0,5 para cima; abaixo de 0,5 a face do cubo deixa de ser plana (com 0,25 o meio dela cai 30 mm) e a nitidez só arredonda a forma toda. O roteiro que gerou a fixture ficou fora do repositório e cabe na fatia 6, ao lado da régua.
