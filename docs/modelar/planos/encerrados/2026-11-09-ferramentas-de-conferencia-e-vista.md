# Ferramentas de conferência e de vista: o agente mede e vê sozinho o que hoje só a pessoa acha

**Estado:** concluído

**Território:** `src/autoria/dobras-aceitas.js`, `tools/modelar/vinco-oculto.mjs`, `tools/modelar/dobra-da-superficie.mjs`, `tools/modelar/descrever-peca.mjs`, `tools/modelar/ativar-bancada.mjs`, `tools/modelar/ativar-bancada.test.mjs`, `tools/modelar/olhar-bancada.mjs`, `tools/modelar/olhar-bancada.test.mjs`, `tools/modelar/analise-da-peca.mjs`, `tools/modelar/assinatura-da-malha.mjs`, `tools/modelar/etapas-da-montagem.mjs`, `src/autoria/plano-de-modelagem.js`, `src/autoria/plano-de-modelagem.test.js`, `modulos/esboco-nucleo/`, `tools/modelar/esboco-nucleo.mjs`, `tools/modelar/linhas-do-modelo.mjs`, `tools/modelar/vista-rapida.mjs`, `tools/modelar/leitura-por-regioes.mjs`, `tools/modelar/casamento-da-vista.mjs`, `tools/modelar/conferir-vistas.mjs`, `tools/modelar/descrever-sem-calar.test.mjs`, `tools/fixtures/descrever-sem-calar/`, `tools/modelar/regularidade-da-crista.mjs`, `tools/modelar/regularidade-da-crista.test.mjs`, `tools/modelar/modelo-aberto.mjs`, `tools/modelar/modelo-aberto.test.mjs`, `tools/fixtures/vinco-da-coluna/`

**Responsável:** a IA da sessão do núcleo (ramo claude/relaxed-thompson-d0a7r4), por decisão da pessoa em 2026-11-12, com as
decisões técnicas delegadas; a pessoa é a crítica por imagem, com um resumo curto do que olhar, e a forma de peça aceita
continua sendo dela.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-09.

Em 2026-11-09 a pessoa passou a este plano `etapas-da-montagem.mjs`, que era do plano do
[braço](2026-09-26-as-partes-do-braco.md), para o registro de etapas parar de se regravar; ele ficava de volta ao braço quando este
fechasse; o braço fechou e o arquivo fica neste plano de vez (2026-11-12). A câmera por ponto e o nome curto da captura saem do rascunho da [ferramenta de material](../2026-11-08-ferramenta-de-material.md).

## Problema observado

Nas rodadas de 2026-11-08 e 2026-11-09 do furgão e do braço, a pessoa achou na imagem o que as ferramentas não mostraram ao
agente, e os agentes gastaram horas em scripts próprios para ver ou medir:

- as rugas no canto de cima da coluna do para-brisa passaram porque a crista da coluna estava em `PLANO.dobrasAceitas`, e a
  régua testa a região só no centro da cadeia; a ruga na ponta da cadeia some junto, e o `descrever` não imprime as pontas;
- a bancada não tem câmera que mire uma coordenada em mm, a isométrica de trás falta, o `--focar` no modo contexto enquadra a
  peça inteira, e os closes saíram de recortes de capturas de 3.200 px, de 4 a 15 min cada;
- a `--analise` recarrega a peça a cada vista (31 a 33 min no furgão), e o `--zoom` aceita uma caixa em pixel de uma vista só;
- provar "malha idêntica" exigiu um script de hash em cada rodada;
- o limite de 240 caracteres dos campos do PLANO só aparece no `descrever`, de 3 min, e o `guarda:acervo` não o acusa;
- no esboço do núcleo a cor de cada forma é ignorada, e o esboço não roda na cópia isolada do agente sem copiar o `manifold-3d`;
- o `etapas-da-montagem` regrava o `montagem.etapas.json` ao só ler o estado, e o arquivo aparece modificado no git.

## Resultado

O agente confere uma dobra aceita pela cadeia inteira, mira a câmera num ponto da peça, tira as vistas da análise numa carga
só, prova malha idêntica com um comando, vê o limite do PLANO na guarda e roda o esboço com cor na cópia isolada; nada disso
pede script fora do repositório.

## Filtro Agent-First

Cada ferramenta nasce de um atrito relatado, com o comando que o reproduz, e é provada refazendo aquele caso.

## Incluído

- a região de `dobrasAceitas` valendo pela extensão da cadeia (a cadeia inteira dentro da caixa), com as pontas no texto do
  `descrever` e as declarações do acervo revistas;
- `olhar-bancada`: `--mirar=x,y,z` em mm com distância, e a isométrica de trás; a `--analise` numa carga só da página, e o
  `--zoom` por caixa em mm;
- `tools/modelar/assinatura-da-malha.mjs`: a assinatura de cada parte e da peça, e a comparação de duas rodadas;
- o limite de texto do PLANO conferido no normalizador, onde o `guarda:acervo` já passa;
- a cor por forma no esboço, e o esboço rodando na cópia isolada sem cópia manual;
- o `etapas-da-montagem` gravando os campos sempre na mesma ordem e só quando o conteúdo muda.
- uma régua da regularidade de uma crista ao longo dela, que ache o nó onde uma coluna da gaiola morre: no canto de cima da
  coluna do para-brisa do furgão (2026-11-09) o realce faz um gancho que a pessoa vê, e a `vinco-oculto`, que dá só posição e
  ângulo médio da cadeia inteira, não o acusa; e uma vista de perto só da chapa, sem rodar a receita inteira.
- um aviso no `descrever` para cada `aberturaPorContorno` que cai na booleana da chapa inteira, com o motivo do registro
  (`vizinhanca.motivo`) e o tempo do passo: a janela da cabine do furgão (2026-11-09) pôs quatro vãos nesse caminho, a
  receita foi de 118 s a 207 s, e só o CI acusou, depois do envio, pelos tetos de tempo.
- as ferramentas da empilhadeira (`linhas:modelo`, `vista:rapida`, `leitura:regioes`, `casamento:vista`, `conferir:vistas`)
  abrindo receita de peça, e não só esboço, e recortando a região pedida em mm: no furgão (2026-11-11) a vista rápida da cabine
  saiu em 11 s contra 4 a 15 min da bancada e as linhas da malha mostraram o degrau da porta, mas foi preciso um adaptador fora do
  repositório para rodar a receita, e a leitura por regiões só cortou certo com o painel passado à mão;
- a recusa silenciosa no `descrever` e no `guarda:acervo`: um passo que deixa `neutro.orfaos` (uma `aberturaPorContorno` cujo
  contorno cruza a fresta de uma porta, no furgão em 2026-11-11) esvazia a chapa e o resto da cadeia, e o `descrever` só diz que a
  peça não tem a parte; ele passa a imprimir cada órfão com o passo e o motivo, e a guarda a reprovar;
- a bancada: o `--focar` com vista de lado põe a câmera dentro da peça quando as partes escolhidas são pequenas (a cabine do
  furgão, 2026-11-12), a captura não diz em que passo está durante os minutos de carga, e uma captura recusada deixa o processo
  antigo segurando a porta do servidor até o prazo dele; o `descrever` e o `guarda:acervo` também passam de dois minutos sem saída.
- pedido da sessão do furgão (2026-11-12): o teto de tempo do furgão no `acervo-real.test.mjs` medido contra uma peça de
  referência na mesma bateria, e não por número fixo; a mesma receita levou 104 s, 188 s e 368 s no CI em três baterias do
  mesmo dia, e o teto fixo reprovou ao acaso duas vezes.

- pedido da sessão do furgão, já atendido (2026-11-12): o teste do acervo real compara a peça pesada com a soma das outras
  peças na mesma máquina (`tools/modelar/acervo-real.test.mjs`), no lugar de um teto fixo em segundos.

Caso de teste da régua da crista, pedido pela sessão do núcleo: a ruga no alto das duas colunas do para-brisa do furgão está
presente no envio `fee4b88c` (main de 2026-11-12) e no envio seguinte, o dos retrovisores, que não toca a coluna; a correção da
ruga vem num envio próprio depois deles.

## Excluído

- o material (amostra, biblioteca, relevo composto), que segue no rascunho da ferramenta de material;
- mudar receita de peça, salvo a região de uma dobra aceita que a régua nova pedir rever.

## Gate de saída

1. A ruga do canto da coluna do furgão, num estado antes da correção dela, é acusada pela régua com a região aceita de antes.
2. Cada ferramenta tem teste e refaz o caso que a motivou, sem script de fora, com o tempo medido.
3. Ler o estado das etapas não muda o `montagem.etapas.json`.
4. O acervo inteiro passa com as declarações revistas.

## Fatias

1. A dobra aceita pela cadeia inteira, com as pontas no `descrever`, e a revisão das declarações do acervo.
2. A câmera que mira um ponto, a isométrica de trás e a assinatura da malha.
3. A análise numa carga só e o zoom em mm.
4. O limite do PLANO na guarda, a cor e a cópia isolada no esboço, e o registro de etapas estável.
5. O `descrever` e a guarda dizendo o que hoje calam: o órfão de cada passo, a abertura que cai na booleana da chapa inteira e
   o progresso durante a carga.
6. A régua da regularidade da crista e as ferramentas de vista da empilhadeira abrindo receita de peça.
7. Fechamento.

## Riscos e parada

Se a régua pela cadeia inteira acusar no acervo feições aprovadas pela pessoa, a declaração é revista com região justa e a
mesma intenção; se a feição não couber em região nenhuma, ela vai à pessoa com a imagem antes de mudar a régua.

## Andamento

Fatia 1 (2026-11-12): a caixa de cada cadeia e as duas pontas mais distantes saem da `vinco-oculto` e da `dobra-da-superficie`
(`caixaMm`, `pontasMm`), e `aceitacaoDe` só cobre o achado quando a caixa inteira cabe na região; o `descrever` imprime as
pontas (`, de [x; y; z] a [x; y; z] mm`). Caso: `tools/fixtures/vinco-da-coluna/coluna-do-furgao.json` e
`tools/modelar/dobra-aceita-pela-cadeia.test.mjs`; com as regiões de antes do furgão, as duas cadeias da coluna (830,6 e 272,8
mm, 39 mm entre as pontas, onde está a ruga) saem como achado. O acervo acusou só declarações do furgão (regiões justas
demais para a cadeia); a revisão delas é da sessão do furgão, com as caixas medidas no relato da fatia.

Fatia 2 (2026-11-12): `olhar-bancada --mirar=x,y,z [--distancia=mm]` põe a câmera a `distancia` (padrão 600 mm) do ponto, em mm do
referencial da peça, na direção da vista pedida, e a vista `isometrica-traseira` gira a isométrica meia volta; os dois ajustes correm
na página pela ponte que já existe (`ajustarCamera`, exportada e testada com a câmera do three), sem tocar `src/bancada`. O
`--focar` que deixava a câmera dentro da caixa da peça recua-a pelo mesmo raio até passar da caixa, com o zoom compensando na
perspectiva, e diz na dica que a casca do lado oposto pode esconder o alvo; a mira dentro da peça também sai como dica. A CLI escreve
na saída de erro cada etapa longa ao entrar nela e uma batida a cada 15 s, o sinal de parada fecha o Chromium e o servidor, e o
processo ainda vivo 5 s depois da captura é encerrado. `tools/modelar/assinatura-da-malha.mjs` (`npm run malha:assinatura`) assina
cada parte e a peça (sha256 das faces em nanômetro, sem depender da numeração) e confere uma rodada contra outra, parte por parte.
Casos no furgão realista, com a máquina em carga de 3 a 10, de modo que os tempos valem como ordem de grandeza: a assinatura leva
99 s e a conferida contra ela 107 s, com as 115 partes idênticas, no lugar do script de hash de cada rodada; a janela da porta
da cabine de perto, `--mirar=1000,1650,1130 --distancia=900 --vistas=direita,isometrica-traseira`, saiu em um comando de 7 min 14 s
(a receita medida em Node, uns 100 s, mais a carga da página), sem recorte de captura de 3.200 px (4 a 15 min cada); o `--focar`
na maçaneta da porta da cabine vista do lado oposto tinha a câmera a 0,018 do centro do furgão, dentro dele (a foto mostrava o
forro da porta), e passa a ficar a 0,711 de fora, com o zoom em 2,2 (990 para 2.193 mm do alvo), 11 min contra 12 min com os dois
em paralelo e outro agente na máquina; com a câmera já fora (banco do motorista) a câmera e a imagem não mudam. Não reproduzi o
processo preso na porta: o servidor era fechado pelo `finally`, e o que entrou é a rede de segurança (sinal e encerramento
forçado). Testes: `olhar-bancada.test.mjs` e `assinatura-da-malha.test.mjs`. Para a fatia 3: a medida de contatos executa a
receita em Node a cada captura (uns 100 s no furgão, inclusive na mira) e deve ser pulada ou guardada, que é onde está a maior
parte dos minutos da captura; para a fatia 4: o aviso de progresso do `descrever` e do `guarda:acervo`, que seguem dois minutos sem
saída.

Fatia 3 (2026-11-12): a `--analise` abre o servidor, o navegador, a peça e a página uma vez (`abrirCapturaCompartilhada`, que a
`vistas:critica` já usava) e as 18 vistas mais as 6 da `--parte` trocam câmera, arame e seleção nessa página, com a medida de contatos
também uma vez; antes cada chamada recarregava a peça. O `--zoom` ganhou a caixa em mm do referencial da peça,
`--zoom=<vista>:mm:x0,y0,z0,x1,y1,z1` (dois cantos opostos), ao lado da caixa em pixels de sempre `--zoom=<vista>:x0,y0,x1,y1`: o
prefixo `mm:` é obrigatório, e a recusa diz o que escrever quando vêm 6 números sem ele, 4 com ele, decimal ou negativo em pixel,
ou vista inexistente, antes de abrir o navegador. A página projeta os 8 cantos pela câmera da vista (`projetarPontos`, que também sai
em `projecaoMm` no relato de cada vista), a ferramenta recorta o retângulo que os envolve, cortado ao quadro, e o manifesto guarda a
caixa em pixels e se o quadro a cortou; uma caixa toda fora do quadro é recusada. A medida de contatos agora é guardada em
`tmp/cache-de-medida/` (`contatos-<receita>-<chave>.json`, só a lista de pares), com a chave do cache das outras ferramentas de
medida (`assinaturaDaEntrada`: conteúdo da receita, do que ela importa, do núcleo e das variáveis de ambiente) mais o código da
própria medida de contatos, e a receita mudada ou o `--sem-cache` medem de novo; `--sem-contatos` pula a medida. O relato diz o que
houve: `contatos: medidos agora em N s`, `lidos do cache`, ou `NÃO medidos (--sem-contatos) ... falta de medida, não falta de achado`,
e o mesmo vai em `resultado.contatos.estado` (`medidos`, `do-cache`, `pulados`, `falhou`, `sem-receita`), com `paresAcusados` nulo
quando não houve medida; a `--analise` imprime a linha e as cargas de página. Achado no meio do caso real: com a página aberta por
meia hora, outro agente editou `src/autoria/molduras-do-vao.js` e o servidor de desenvolvimento mandou a página recarregar, que perdeu
a ponte e derrubou a análise na quinta vista; o servidor da captura agora sobe sem canal de recarga nem vigia de arquivos, e a
página sem ponte falha dizendo isso. Casos no furgão realista, com a carga da máquina de 4 a 9: uma vista `direita` de captura simples
levou 6 min 55 s, dos quais 124 s antes da medida (a ativação da peça na sessão, que também executa a receita em Node, em
`ativar-bancada.mjs`, fora deste plano), 146 s de medida de contatos e uns 2 min 15 s da página até a imagem; a medida chamada de novo
com a receita igual leu o cache em 0,086 s (as duas capturas seguintes mediram de novo, 128 s e 153 s, porque
`molduras-do-vao.js` mudava entre elas, como a chave manda); a `--analise --parte=carroceria --zoom=direita:mm:900,1400,300,1300,1800,700`
saiu num comando só, 1 carga de página, 19 min 7 s no total (a medida 131 s e a ativação 106 s inclusas), no lugar dos 31 a 33 min,
e o zoom em mm caiu em 557,301 a 602,346 px na vista direita, sobre a costura traseira da porta da cabine, como a conta pela escala
da imagem previa. Do que sobra dos 19 min, uns 15 são a carga da página e as 24 imagens em 500 mil triângulos no Chromium sem GPU. Testes:
`olhar-bancada.test.mjs` (a análise inteira com uma carga, a projeção, os quatro estados da medida, o cache por conteúdo e por
`--sem-cache`, a recusa do zoom ambíguo pela CLI, a página sem ponte e `projetarPontos` com a câmera do three) e
`analise-da-peca.test.mjs` (as duas sintaxes, as recusas, o recorte por caixa em mm e as opções de contatos), cada arquivo em menos
de 5 s. Fica para depois: a `--mirar` e a `--analise` ainda pagam a carga da página (uns 2 min no furgão) a cada comando. A ativação da
peça (`ativar-bancada.mjs`) passou a ler a execução da receita do mesmo cache (`executarReceitaGuardada`, em `entrada-de-medida.mjs`,
com a chave de sempre) e a medida de contatos a reusa quando a ativação acabou de gravá-la, de modo que a receita é executada uma vez só
por captura; no furgão, carga da máquina de 5 a 9, a ativação caiu de 94 s e 134 s (execução mais gravação) para 10,6 s lida do cache
(141 MB), e os contatos, na segunda parcela, de 50 a 67 s (só a medida, sem executar de novo) para 0,1 s; `--sem-cache` vale nas duas, e o
relato diz "ativação: execução da receita lida do cache". Com `--perfil` a execução não passa pelo cache. As duas primeiras rodadas
seguidas mediram de novo porque `limpar-lascas.js` do núcleo mudava entre elas.

Fatia 4 (2026-11-12): três dos quatro itens já estavam no código quando a fatia abriu, e a fatia os provou em vez de refazê-los. O
registro de etapas (`24f673f4`) já grava os campos na mesma ordem e só quando o texto muda, com teste, e ler o estado das
quatro montagens versionadas (aviao, braço, carrinho, empilhadeira) deixou os `montagem.etapas.json` intactos no git; a cor da forma
(`a6d6ce49`) já vira material liso e já chega à captura da bancada, e o esboço do farol do furgão saiu com o azul, o laranja e o
grafite das formas, igual nas três opções; o teste novo de `atalho.test.js` prova que a cor chega ao painel, à receita
(`MATERIAIS`) e à cor que a `vista:rapida` desenha. O que faltava era o limite de texto e a cópia isolada. A recusa dos 240
caracteres, que o `descrever` já dava antes de rodar a receita e que o `guarda:acervo` herda por ele, passa a dizer o campo, o
tamanho e quantos caracteres passam (`'objeto' excede 240 caracteres (tem 253, 13 a mais que o limite)`), no normalizador do PLANO
e no motivo das dobras aceitas; o acervo (43 receitas) normaliza sem recusa. O esboço numa cópia isolada sem `node_modules` morria
no primeiro pacote (`pngjs`, depois `earcut` e `manifold-3d`) e, na captura, no `manifold-3d` que o Vite procura a partir da cópia
(90 s de espera e erro); `tools/modelar/resolucao-da-raiz.mjs` resolve o pacote que falta pelas `node_modules` do repositório
principal, que o `.git` do worktree aponta, para o Node (`npm run esboco:nucleo` agora entra com `--import`) e para o servidor da
captura, sem copiar nem ligar pasta nenhuma. Caso refeito num worktree novo sem `node_modules`: o farol do furgão montou em 0,6 s e
capturou a imagem inteira em 36 s, com a mesma câmera nas três opções. Testes: `resolucao-da-raiz.test.mjs`, o caso do limite em
`plano-de-modelagem.test.js` e o da cor em `atalho.test.js`. A captura de `olhar-bancada` e das demais ferramentas que abrem a
bancada fora do esboço segue exigindo `node_modules` na cópia, porque `olhar-bancada.mjs` importa o Playwright por um caminho fixo
da raiz da cópia; isso fica para a fatia da bancada.

Fatia 5 (2026-11-12): o `descrever` já imprimia os órfãos quando a medida das partes quebrava e quando a peça fechava com eles, de modo que a
recusa calada do plano estava em outro lugar: toda recusa de uma etapa seguinte (o contorno por parte, os vãos, os contatos, as formas, as
razões, o G01) saía só com a própria mensagem, e a causa, o passo recusado antes, se perdia; no furgão, o contorno por parte que cita a chapa
esvaziada dizia só que a peça não tem a parte. Agora essas recusas levam o bloco `N ÓRFÃO(S), que costumam ser a causa` (`falhaDepois`), e a
lista mostra a causa antes do eco, até 12 linhas, com a conta do que o corte deixou de fora (antes eram 5 linhas sem conta); a guarda do acervo
já reprovava peça com órfão porque repassa o `stderr` do `descrever`, e o teste o prova numa peça mínima (`tools/fixtures/descrever-sem-calar/orfao`,
uma abertura com contorno fora da chapa), sem depender do furgão. O aviso da abertura que cai na booleana da chapa inteira sai na saída padrão e
numa linha `AVISO` na de erro, com o motivo de `vizinhanca.motivo` e o tempo do passo, e só para chapa de `FACES_MINIMAS_PARA_RECORTAR` faces ou
mais, porque a menor não recorta de propósito. O núcleo não mede o tempo de um passo, e não o mudei: o `descrever` entrega ao núcleo um registro
de operações que embrulha cada operação e anota o tempo por índice de passo (`registroCronometrado`, 543 passos do furgão sem diferença
visível). A peça de prova é uma chapa de 5.616 faces com um vão que toma 4.232 delas (`chapa-inteira`). O furgão de hoje não dá o aviso, porque
os oito vãos da janela passaram a recortar no plano da vizinhança de todo vão, e o caso de 2026-11-09 só se refaz na peça mínima. O progresso:
`descreverPecaReutilizavel` aceita `aoProgredir(linha)` e a CLI o manda à saída de erro, uma linha ao entrar em cada etapa longa (carga, execução,
partes, réguas, contatos, vãos, formas, referência) e uma batida a cada 15 s entre dois passos da receita, com o passo, o total e a operação; a
execução é síncrona, então a batida sai entre passos e não dentro de um passo longo, e a medida de contatos segue sem batida própria. No furgão
realista (543 passos, máquina com carga de 4 a 8, ou seja, ordem de grandeza) o `descrever --sem-veredito` levou 5 min 58 s e escreveu uma
linha a cada 15 s na saída de erro, com a saída padrão intacta; a `guarda:acervo` do acervo de 101 peças passou, em 10 min 16 s também com a
carga alta, e ficou 10 minutos sem saída, porque a guarda não passa `aoProgredir` ao `descrever`: `guarda-acervo.mjs` é do território do plano das costuras e
furos limpos, e a mudança (passar `aoProgredir` em `conferirPeca`, com o nome da peça na linha, e mandar a linha do fio ao processo principal) fica
com a sessão dele. Testes: `descrever-sem-calar.test.mjs` (9 casos, uns 4 s).

Fatia 6 (2026-11-12): a régua da regularidade da crista é uma ferramenta própria, `tools/modelar/regularidade-da-crista.mjs` (`npm run crista:regularidade -- <peça>`), e não uma opção da `vinco-oculto`, porque mede outra coisa (a série de uma cadeia, e não o resumo dela) e o `descrever` imprime a `vinco-oculto` em toda chamada; a `vinco-oculto` só passou a devolver as cadeias por dentro (`_cadeias`, que a receita corta antes de imprimir). A régua percorre o caminho mais longo de cada cadeia de cristas, aceita ou não pela receita, e acusa três coisas: o salto do diedro (uma aresta que passa 4 graus da mediana das três vizinhas de cada lado, com a vizinhança inteira, porque nas últimas arestas toda crista afina), a virada da direção (30 graus ou mais entre os 15 mm de antes e os de depois de um vértice) e a lacuna (a ponta de uma cadeia a até 60 mm da ponta de outra, com a outra adiante), cada uma com a parte, a posição em mm, a distância ao começo da cadeia, o valor e o da vizinhança; o texto diz que ela só aponta onde olhar. A fixture da fatia 1 bastou: nela a régua acusa, no lado +x da coluna, a lacuna de 39,1 mm entre as pontas da coluna e do canto (32,1 mm de lado, 70 graus entre as direções, contra arestas de 16,4 mm) em [909,1; 2146,4; 1242,2] mm, a virada de 64,1 graus em 15 mm (10,1 nas vizinhas) em [896,4; 2125,3; 1267] mm, e o salto de 31,5 graus de diedro contra 25,9 nas vizinhas em [899,4; 2102,6; 1283,5] mm, a 49 mm da ponta; a cadeia do canto não tem achado, e o corpo de 830 mm da coluna não varia. O mesmo vale rodando o furgão realista de hoje, que ainda tem a ruga, nos dois lados (x e -x). A calma foi provada em duas cristas sem defeito: a crista transversal de trás da carroceria do mesmo furgão (2070,9 mm, 64 arestas, fixture `crista-regular-do-furgao.json`) sai sem achado, e uma crista sintética reta sai sem achado e, com o cume desviado nas três últimas estações ou com um diedro de 32 graus numa estação, é acusada; antes de a vizinhança inteira ser exigida, o diedro acusava a ponta afinada de três cadeias, e esse é o limite que o filtro põe. A vista de perto só da chapa sai de `--imagem` (a chapa em volta do achado, de 120 mm de cada lado, com as cadeias em vermelho e o ponto em amarelo, câmera de fora pela normal média das faces) e a receita roda só até a chapa com `--ate-subdivisao=K` ou `--ate-passo=N`: o furgão levou 14,6 s no total (uns 7 s de importação do módulo, 2,6 s de execução) contra 90 a 100 s da receita inteira, e o que os passos seguintes cortam da chapa não entra (a parte sai como `sem parte`, porque as partes são dos passos seguintes). Não liguei a régua ao `descrever`, que já imprime a `vinco-oculto` em toda chamada: acrescentar uma linha por achado a cada peça pede a régua rodada no acervo inteiro, e só rodei o furgão e a carenagem de prova (que não tem cadeia de crista). As cinco ferramentas da empilhadeira abrem agora esboço ou receita de peça (nome, como `furgao-realista` e `braco-robotico/base`, ou caminho) pela entrada comum `tools/modelar/modelo-aberto.mjs` (`abrirModelo`), que devolve a estrutura de `montarOpcoes` com um painel só para a receita, aceita `--ate-passo=N` e `--composicoes=<módulo>` e diz as partes, as faces e o tempo da execução. O `--recorte=x0,y0,z0,x1,y1,z1` (mm do referencial da peça) vale na `vista:rapida` (enquadra a caixa, margem 0, e só desenha o que a caixa toca, com a luz das normais da malha inteira) e no `linhas:modelo` (o mesmo quadro, a meio pixel na altura), e a `vista:rapida` grava `<png>.rapida.json` com o painel e o fundo, que o `leitura:regioes --captura` usa quando `--painel` não vem; o `leitura:regioes --modelo=<peça> --vista=<vista> [--recorte]` tira a captura e as linhas da malha, no mesmo quadro, e monta a leitura num comando só. `casamento:vista` e `conferir:vistas` abrem a receita (as partes de `--partes` são as dela; a rodada usa a vista rápida, e a bancada lado a lado é do esboço e recusa a receita), sem `--recorte`: a conta é a do objeto inteiro contra a referência inteira, e uma caixa em mm cortaria o contorno do modelo numa borda que a referência não tem. Casos no furgão realista, com a máquina em carga de 4 a 6 (ordem de grandeza): a vista rápida da cabine por receita, `vista:rapida furgao-realista --vista=direita --recorte=-1100,0,700,1100,2300,2800 --largura=1000`, saiu em 102,8 s (90,7 s de execução da receita, 95,8 s de montagem com a importação, 6,4 s de desenho), sem adaptador, e as 11 s do relato de origem parecem ser o desenho com a malha já montada (não pude conferir): o que custa é executar a receita, que a `--ate-passo` evita só quando a chapa é o que se quer ver (a vista rápida da chapa da coluna saiu em 12,3 s). A legenda de cores de uma peça de 115 partes mostra as 12 primeiras e conta as outras. Não consegui reproduzir a falha de painel da leitura por regiões numa peça pequena, porque o achado do painel pelas linhas de fundo só encurta quando a peça ocupa o quadro quase inteiro e as margens não têm fundo; o painel e o fundo gravados ao lado da imagem tiram a dúvida, e o teste prova que valem. Testes: `regularidade-da-crista.test.mjs` (14 casos, uns 2 s) e `modelo-aberto.test.mjs` (10 casos, uns 7 s, sobre a `peca-de-prova`).

Régua no acervo e documentos de uso (2026-11-12): a `crista:regularidade` rodou nas 101 peças da `guarda:acervo` (máquina com carga de 4 a 7, duas a três rodadas em paralelo): 86 não têm superfície de subdivisão com cristas, 9 têm superfície e nenhuma cadeia (braço/ombro, carenagem-de-prova, carrinho-de-mão chassi, caçamba e pés, empilhadeira alça, escape e protetor, sedan vidros) e 6 têm cadeias e achados, todas em menos de 35 s salvo o furgão realista (134 s) e a carroceria do sedan (313 s). Achados de salto, virada e lacuna: empilhadeira banco 0, 6, 0; empilhadeira carcaça 8, 14, 0; furgão realista 26, 18, 4; sedan acessórios 4, 16, 2; sedan carroceria 2, 21, 6; sedan frente-e-traseira 4, 10, 4, uns 145 ao todo. Olhei 7 com `--imagem` (banco, carcaça, farol e lanterna do furgão, teto do sedan), um por família de achado: só a ruga da coluna do furgão (6 achados, que a régua acusa de novo: lacuna de 39,1 mm em ±[909,1; 2146,4; 1242,2], virada de 64,1 graus em ±[896,4; 2125,3; 1267] e salto de 31,5 graus em ±[899,4; 2102,6; 1283,5]) é defeito visível; a volta do canto do assento da empilhadeira, a borda da tampa do motor, os cantos dos para-choques e do forro dos vãos do sedan (virada de 80 a 90 graus contra vizinhas retas) são desenho, o refletor facetado do furgão (faróis e lanternas, 42 achados, viradas de 130 graus e diedros de 12 contra 48) parece desenho e não consegui separá-lo por imagem de um defeito, e uma virada de 173 graus na tampa do motor da empilhadeira é a cadeia dobrando sobre si na ponta, ruído da régua. Não mudei limiar: a virada de 30 graus e o salto de 4 graus não separam a ruga (64 graus; 5,6 graus acima das vizinhas) do canto de 90 graus, e subir um deles perde a ruga ou muda pouco o ruído; a lacuna de 60 mm acusa também a crista cortada por um vão (porta dianteira do sedan, 26 mm a 0 graus, ±[858,6; 998,6; 690]; lateral traseira, 10,4 mm), que é desenho. A régua fica como comando à parte, citado em `PARE-E-ANALISE.md`, e fora do `descrever`: uma linha de resumo em toda peça com superfície diria "uns 20 pontos" onde um em 24 é defeito, e a instrução existe para a leitura da imagem. Para depois, se o ruído atrapalhar: calar a virada de canto (80 graus ou mais com vizinhas retas dos dois lados) e a lacuna colinear (menos de 2 mm de lado e 10 graus), a medir quanto do ruído tiram, com a fixture da coluna como prova. Achados para as outras sessões, com a posição em mm do referencial da peça: furgão, a ruga da coluna acima, ainda presente nos dois lados; sedan, no teto a crista acaba a 39,6 mm de outra, a 50 graus, em ±[688,5; 1500,4; -1081,7] (a imagem mostra o canto de três cristas, arredondado, com a crista de baixo parando um pouco antes), e vira 41 graus em ±[683,8; 1521; 275,7] e 35 graus em ±[684,1; 1520; -1071], que parecem a dobra do teto; no retrovisor, a crista acaba a 22,4 mm de outra em ±[863,5; 961; 342,2], com viradas de 134 graus em volta, que é o canto da carcaça do espelho. Nada disso é para corrigir sem a pessoa olhar. Os documentos de uso ganharam as opções das fatias 2 a 6, cada uma onde o agente que modela a procura: `PARE-E-ANALISE.md` (a análise numa carga só com o tempo medido, o `--zoom` em mm, a seção "Olhar de perto sem recortar captura" com `--mirar`, `isometrica-traseira`, `--sem-contatos`, `--sem-cache`, `vista:rapida --ate-passo`, `linhas:modelo`, `leitura:regioes`, `malha:assinatura` e `crista:regularidade`, e o esboço com cor na cópia isolada), `README.md` de `usar` (uma linha na tabela), `ATIVACAO-BANCADA-SESSAO-ATIVA.md` (cache e relato dos contatos, servidor sem recarga), `CONFERIR-CONTRA-REFERENCIA.md` (o progresso, os órfãos e o aviso da booleana no `descrever`, e as ferramentas de vista abrindo receita), `GOTCHAS-AUTORIA-VISUAL.md` (a dobra aceita que esconde a ruga e a captura recortada) e as skills `criar-peca`, `auditar-peca` e `laco-de-modelagem`. A skill `criar-peca` cabia no orçamento de leitura do roteiro `modelar/peca/familia` com 8 bytes de folga, e o que entrou nela veio de cortes de texto velho (a regra da foto de terceiro, que o `CLAUDE.md` já tem, a nota da peça de prova e uma frase repetida); mais texto nessa skill pede mover algo para `sobDemanda`. Fica para depois: o `descrever` e a captura ainda não mostram o aviso de progresso do `guarda:acervo`, que é da sessão das costuras. Depois (2026-11-12) a régua passou a rebaixar a "provável desenho", com a regra e o motivo no relato, o canto de 80 graus ou mais com crista reta dos lados, a lacuna colinear, a dobra na ponta, a curva, a faceta repetida e a virada rente à ponta; nas seis peças com cadeia os achados foram de 145 para 36 acusados e 109 rebaixados, a ruga da coluna (lacuna de 39,1 mm, virada de 64,1 graus, salto de 31,5 graus, nos dois lados) segue acusada inteira, e como os outros 30 acusados ainda são quase todos desenho (a porta do sedan, o encontro de cristas, dois diedros do farol), o `descrever` fica sem a linha de resumo.

## Fechamento

Concluído em 2026-11-12, por decisão da IA da sessão do núcleo, a quem a pessoa delegou as decisões técnicas deste plano. As seis
fatias de trabalho estão na main desde o commit `7bfe8e48`, juntado pelo CI com as catorze tarefas verdes.

O gate de saída ficou cumprido. A ruga do canto da coluna do furgão, no estado de antes da correção dela, é acusada pela dobra
aceita pela cadeia e pela régua da crista, com os números na fixture `tools/fixtures/vinco-da-coluna/`. Cada ferramenta tem teste
e refaz o caso que a motivou: a análise completa do furgão foi de 31 a 33 min para 19, a ativação pelo cache de 94 a 134 s para
10,6 s, e a régua da crista rodou no acervo inteiro, com 36 pontos acusados. Ler o estado das etapas não regrava o
`montagem.etapas.json`. O acervo inteiro passa na `guarda:acervo` com a régua nova.

O primeiro envio à main reprovou no CI por custo: o cronômetro por passo do `descrever` embrulhava a operação e tirava o passo do
caminho rápido do núcleo, e o `descrever` do furgão foi de 180 s a 480 s. O cronômetro passou a medir de uma consulta do registro
à seguinte, com teste que prende a operação devolvida à original, e o tempo voltou a 170 s.

Ficam para outros planos, por estarem no território deles. As declarações de dobra e vinco do furgão, com regiões justas demais
para a cadeia inteira, saem hoje como 29 avisos de dobra não declarada, e a revisão é do plano do furgão. O progresso durante a
`guarda:acervo` pede uma linha em `guarda-acervo.mjs`, do plano das costuras. A escala da curvatura sem piso, que num vidro quase
plano satura em 0,123 1/m, e a curvatura pedida que não é vinco nomeado e sai como defeito, as duas achadas na rodada 1 do sedã,
são de `vistas-de-superficie.mjs`, do plano do furgão.

Os arquivos do território ficam sem plano. Defeito pontual neles segue o roteiro `mudar/defeito`, e capacidade nova pede plano.
