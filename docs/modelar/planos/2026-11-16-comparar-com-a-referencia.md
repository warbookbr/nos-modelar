# Comparar com a referência sem script: a prancha modelo e foto, a conferência da receita, a saída da bancada e o pacote do crítico

**Estado:** ativo

**Território:** `tools/modelar/olhar-bancada.mjs`, `tools/modelar/medir-transcricao.mjs`, `tools/modelar/lados-das-vistas.mjs`, `tools/modelar/vistas-para-critica.mjs`, `tools/modelar/vistas-para-critica.test.mjs`, `tools/modelar/prancha-de-referencia.mjs`, `tools/modelar/prancha-de-referencia.test.mjs`, `tools/bancadas/`, `.claude/skills/criar-peca/`, `.claude/agents/modelador.md`, `docs/modelar/banco-de-provas/comparar-com-a-referencia-2026-11-16/`, `tools/modelar/descrever-recusas.test.mjs`; e, por empréstimo do plano do cache por passo que a pessoa decidiu em 2026-11-17, tools/modelar/descrever-peca.mjs só para a opção recusas (o caminho fica sem crase para não sobrepor os territórios)

Ativado em 2026-11-16 no fechamento do reflexo na bancada, como a pessoa decidiu. Duas partes esperavam outro plano: `--recusas` em `descrever` mexe em `tools/modelar/descrever-peca.mjs`, que é do cache por passo enquanto ele estiver ativo, e entrou em 2026-11-17 pelo empréstimo do arquivo que a pessoa decidiu, só para essa mudança; a nota na skill `laco-de-modelagem` é do plano da leitura por partes; as duas entram quando o dono fechar, ou com a pessoa decidindo emprestar o arquivo.

**Responsável:** a IA da sessão implementa; Tiago aprova por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação.

Sucessor do plano [reflexo na bancada](../decisoes/PLANOS-ENCERRADOS.md), decidido pela pessoa em 2026-11-16: é ativado no fechamento dele.

## Problema observado

Na sessão de 2026-11-13 a 2026-11-16 (furgão, cordão de solda e bicicleta), os 67 registros de agente (a sessão principal e 66 subagentes) somam 3.945 comandos de shell: 1.488 do implementador, 1.144 da sessão principal, 518 do modelador, 458 do revisor e 337 do agente geral; o crítico visual não roda shell, só abre imagens. A contagem, por padrão de comando, se refaz pelos registros com o [`contar-comandos.mjs`](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md) da pasta do plano, na janela da análise (`--ate=2026-11-16T11:50:22Z`).

Uma parte desses comandos é o trabalho normal de ler, editar, testar e versionar (1.389 leituras, 836 edições por script, 547 rodadas de teste, 903 de git) e não é assunto deste plano. Outra parte é a mesma tarefa reescrita à mão a cada vez, com a mesma forma:

- montar a prancha do modelo ao lado da foto: 163 scripts de imagem, 133 da sessão principal e 26 do modelador, cada um recortando, escalando e colando de novo;
- conferir se a receita gera sem recusa: 188 scripts de uma linha com `nucleo(gerarPassos(TABELA))`, e um modelador concluiu errado que o motor não devolvia as recusas;
- apagar a pasta de saída antes da bancada, que não sobrescreve: 86 `rm -rf`, com 8 rodadas perdidas porque a pasta já existia;
- separar uma das cópias de uma parte repetida (os dois pedais) recortando a imagem por script, porque o isolamento pega a parte inteira;
- preparar a pasta do crítico, copiando e recortando as vistas e as fotos a cada rodada (sete vezes só no selim).

Nas sete rodadas de modelador da bicicleta, 42 dos 83 comandos de shell foram prancha, apagar saída, conferir o motor e medir a foto, contados pelo comando da fatia 1 (a contagem à mão tinha dado 41). Além do custo, a conta manual é onde o erro entra sem aviso: a régua da foto frontal errada no começo, o contorno do selim invertido e a escala diferente entre as metades de uma prancha do pedal saíram desses scripts.

O crítico do selim deu 5, 7, 5, 6, 7 e 5 em rodadas que mudavam pouco, e se contradisse (abas cheias demais numa, finas demais na seguinte). As fotos do selim eram pequenas e o crítico julgava a olho, sem a medida; a espessura que ele disse estar o dobro batia com a foto ponto a ponto quando medida.

A análise também mostrou o que não deve virar ferramenta fechada. A medição na foto usou mais de doze limiares e máscaras diferentes (cor para o garfo cinza-azulado contra o pneu preto, luminância para o selim, o primeiro trecho escuro de cada coluna para a silhueta, o maior trecho para as orelhas), varreu por linha ou por coluna conforme a peça, e o recorte foi escolhido à mão em 58 casos e pela extensão da peça em 43. Essa liberdade é o que fez a medida servir a cada peça. E a bancada já tinha uma parte do que faltou: `--zoom=<vista>:mm:<caixa>` recorta uma caixa em mm da peça, mas só com `--analise`, e ninguém a usou para o pedal.

## Resultado

Um comando monta a prancha do modelo ao lado da foto na mesma escala, por régua declarada, a partir de vistas que a bancada gera ou de imagens já geradas; a bancada sobrescreve a saída quando pedido e enquadra uma cópia de parte repetida; a conferência da receita sem recusa é um comando; e o pacote do crítico sai pronto, com o contorno medido sobreposto quando houver. A medição livre na foto continua por script, com a régua e o recorte da prancha disponíveis como parâmetros.

## Filtro Agent-First

Prancha modelo e referência: ENVOLVER. A intenção é "ponha esta vista da peça ao lado desta foto, na mesma escala". Um comando com parâmetros (`--foto`, `--regiao` em px da foto, `--regua` como `<px>=<mm>` numa medida da foto, `--vistas`, `--parte` para isolar, `--disposicao=lado|sobreposto|grade`) cobre os 163 casos medidos; recorte à mão e por extensão viram as duas formas de `--regiao` (caixa em px, ou `auto` pela extensão). O script de imagem continua permitido para o caso que o comando não cobre, e cada caso assim vira registro de atrito, não regra nova.

Conferência da receita: ENVOLVER `descrever`. A intenção é "esta receita gera sem recusa, e qual é a primeira". Uma opção curta (`--recusas`) que roda só o motor e imprime as recusas com passo, operação e motivo, filtrando as de material quando pedido, evita o script de uma linha e o engano sobre onde as recusas aparecem.

Saída da bancada: REFATORAR `olhar-bancada` com `--sobrescrever`, que apaga só a pasta pedida e só se ela tiver sido criada pela bancada (um marcador dentro dela), para não virar um `rm -rf` de qualquer caminho.

Cópia de parte repetida: REFATORAR. Primeiro medir se `--zoom=<vista>:mm:<caixa>` fora de `--analise` basta; se bastar, a mudança é liberar o zoom em mm para as vistas comuns e dizer na ajuda de `--selecionadas` que ele isola uma cópia. Só se não bastar entra uma escolha de instância por lado ou índice.

Pacote do crítico: ENVOLVER a prancha. O comando grava a pasta com as vistas recortadas e as fotos, o brief com as instruções de orientação já usadas nesta sessão (de que lado cada vista olha, o que a foto esconde) e, quando a peça tiver contorno medido, a sobreposição do contorno da foto sobre a vista, para o crítico julgar a medida e não só a impressão.

Medição livre na foto: ADIAR, de propósito. Fica por script, porque a máscara, o sentido da varredura e o trecho escolhido mudam com a peça; a skill [contorno da imagem](../../../.claude/skills/contorno-da-imagem/SKILL.md) já cobre o contorno de parte inteira. O que o plano oferece a ela é a régua e o recorte da prancha como parâmetros reaproveitáveis.

Sonda de teste fora de `tools/`: ADIAR. A sessão copiou 117 vezes um teste de `tmp/` para `tools/zz-*.test.ts` para o vitest o achar, e renderizou `.obj` da fixture no Blender 44 vezes porque a bancada só mostra peça. Os dois são do trabalho de núcleo e ficam no backlog, com a contagem.

Crítico por perguntas fechadas: REFATORAR o pedido do crítico. Acrescentado pela pessoa em 2026-11-16, a partir das pesquisas de projetos parecidos (`modulos/pesquisa/novidades-2026-11/agentes-de-ia-para-cad.md`): a nota oscila entre rodadas parecidas, e os trabalhos que a estabilizaram trocaram a nota livre por perguntas fechadas (sim, não ou não dá para ver, cada uma apontando a imagem), mostraram as imagens em duas ordens e só aceitaram o veredito que se manteve nas duas. A nota passa a sair das respostas, por regra escrita, e a variação se mede em cinco repetições da mesma imagem. A mudança vai no pedido que `vistas:critica` monta e no laço que o despacha; `.claude/agents/critico-visual.md` não muda sem a pessoa pedir.

Envio por git: USAR DIRETO. A rotina de envio é sensível e depende da sessão; fica manual.

## Incluído

- o comando de prancha com régua, região, vistas, isolamento e disposição, e a prova em duas peças com referência (a bicicleta e uma do acervo com foto);
- `--recusas` em `descrever`;
- `--sobrescrever` em `olhar-bancada`, com o marcador de pasta criada pela bancada;
- a cópia de parte repetida, primeiro pelo zoom em mm;
- o pacote do crítico com o contorno sobreposto quando houver;
- a skill `criar-peca`, a do laço e o agente `modelador` dizendo quando usar o comando e quando o script livre continua sendo o caminho.

## Excluído

- a medição livre na foto como ferramenta fechada;
- a sonda fora de `tools/` e a vista da fixture sem Blender, que vão ao backlog;
- a espera de comando longo em segundo plano (155 leituras de saída e 147 esperas), que é do ambiente e não do projeto;
- o envio por git;
- `medir:transcricao` não responde a `--ajuda` (lê a opção como arquivo); vai ao backlog como item curto.

## Gate de saída

1. Nas rodadas de forma da bicicleta refeitas como prova (o selim de lado e de frente e o pedal isolado), a prancha de cada uma sai com um comando, na mesma escala da foto pela régua declarada, e a pessoa confirma por imagem que lê como as pranchas feitas à mão nesta sessão.
2. `descrever --recusas` dá a mesma lista que `nucleo(gerarPassos(TABELA)).orfaos` em três peças, uma delas com recusa de propósito.
3. `olhar-bancada --sobrescrever` refaz a saída numa pasta que ela criou e recusa, com mensagem que diz o caminho, uma pasta que ela não criou.
4. Um pedal da bicicleta sai isolado e enquadrado sozinho, sem recorte por script.
5. Uma rodada de modelador com referência, medida por `medir:transcricao` e pelo filtro desta análise, usa no máximo um quarto dos comandos de prancha, saída e conferência da linha de base (42 em 83 nas sete rodadas da bicicleta, pelo `contar-comandos.mjs` da fatia 1), e nenhum script de medição livre foi impedido.
6. O crítico recebe o pacote com o contorno sobreposto numa peça com contorno medido, e a revisão registra se a nota oscilou menos entre rodadas parecidas.
7. Ajuda de cada comando com as opções novas, e a nota nas skills.
8. O crítico por perguntas fechadas: na mesma imagem repetida cinco vezes, a nota varia menos que com o pedido de hoje (medido nos dois, com o mesmo pacote), e a pergunta que muda de resposta entre as duas ordens sai como "não verificável" em vez de virar defeito.

## Fatias

1. Linha de base: a contagem desta análise reproduzida por um comando sobre os registros, e a decisão de onde a prancha é montada (no navegador da bancada, que já lê jpg e webp, ou em Node com a foto convertida antes). Feita em 2026-11-16, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md): o `contar-comandos.mjs` refaz todos os números do Problema observado, menos o das sete rodadas, que dá 42 em 83 e não os 41 contados à mão. A prancha é montada no navegador: o Chromium já é dependência da bancada, lê jpg e webp sem passo prévio e montou a prancha das fotos da bicicleta em 166 a 250 ms, contra 348 a 457 ms em Node com a conversão pelo `ffmpeg`, que é do sistema; o projeto não declara decodificador de jpg nem de webp para Node, e o `sharp` da raiz é dependência transitiva que a cópia de `npm ci` não traz.
2. `descrever --recusas` e `olhar-bancada --sobrescrever`, que são pequenas e tiram metade dos comandos repetidos. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md): `--sobrescrever` tira 14 dos 42 comandos do alvo nas sete rodadas e `--recusas` mais 7, e com a prancha da fatia 3 sobram 10 em 83; `--recusas` dá a mesma lista do núcleo em três peças, uma com recusa de propósito. O filtro das recusas de material não entrou.
3. A prancha, com régua, região, vistas e isolamento, provada no selim e no pedal. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md): `tools/modelar/prancha-de-referencia.mjs` monta modelo e foto na mesma escala, com régua em mm, e tira 11 dos 42 comandos do alvo; entrou também `--espelhar`, porque a vista direita da bancada mostra a bicicleta espelhada em relação à foto lateral. A confirmação da pessoa pedida no item 1 do gate de saída fica para o fechamento.
4. A cópia de parte repetida, pelo zoom em mm ou pela escolha de instância. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md): o zoom em mm não bastava, porque recorta a captura dos dois pedais e o pedal fica com os mesmos 2 px/mm; entrou `--copia=<eixo><+|->` na bancada e na prancha, que desenha só a cópia do lado pedido do centro da seleção e enquadra a câmera nela, e o pedal sai a 13,7 a 15,7 px/mm. Tira os 3 comandos de recorte do pedal, e sobram 7 em 83.
5. O pacote do crítico com o contorno sobreposto. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md): `vistas:critica` grava `contorno-sobreposto.png` quando a peça tem contorno medido, pela `prancharContorno` de `tools/modelar/prancha-de-referencia.mjs`, que põe a linha do contorno no referencial da peça pela câmera da vista e, no objeto de várias partes, pela pose da instância na montagem; provada no ombro do braço robótico. Medido o item 6 do gate de saída em 2026-11-17, com o `critico-visual` duas vezes em cada pacote do ombro: sem o contorno, notas 6 e 5, e com ele, 6 e 5, e a oscilação não mudou. Os dois críticos com o contorno leram como defeito o pé do ombro 33 mm abaixo do contorno, que na referência é tapado pelo anel da cintura; o trecho do contorno que divide fronteira com outra região do mapa passou a sair tracejado, com o pedido dizendo que ele não é borda da peça e não serve de medida, e o lado direito do ombro, que o outro apontamento cita, é silhueta e continua medida. Em 2026-11-17 a pessoa apontou que o contorno frontal do braço é resto de uma foto que saiu do repositório e não corresponde ao ombro aprovado: o pacote passou a deixar de fora, com o motivo no pedido, o contorno de peça com a etapa fixa no registro da montagem, e a prova da fatia passa ao selim da bicicleta, ainda por fazer.
6. O crítico por perguntas fechadas, em duas ordens, com a variação medida em cinco repetições antes e depois. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md): ao lado do pedido de hoje saem dois pedidos fechados, com a forma de cada parte em afirmações simples sem medida e a nota por regra; com as duas ordens juntas a nota variou 0,6 (desvio 0,22) contra 1 (desvio 0,49) do pedido de hoje, em quatro pares, e saiu mais alta, porque o tamanho passa a ser julgado só pela medida.
7. Três melhorias levantadas em 2026-11-17 pela análise dos atritos e debatidas antes de entrar: a bancada gera uma vista por mira de uma lista numa chamada só (a prancha de componentes levou 36 chamadas de uns 40 s); a prancha e o JSON dela dizem para onde cada eixo do modelo cai na imagem, pela frase de lado de `lados-das-vistas.mjs`, para o espelhamento da vista direita contra a foto lateral não passar sem aviso; e `medir:transcricao` ganha a contagem de atritos por comando ao fim de um trabalho (comando repetido acima de N vezes, comandos que falharam, scripts criados em `tmp/`, opções de Node fora do padrão), que o gate 5 já usa pelo `contar-comandos.mjs`. Feita em 2026-11-17, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md): `--mirar` da bancada aceita uma lista de miras com a distância de cada uma, e a prancha de componentes saiu numa chamada em 63 a 71 s contra 552 s das 36 chamadas, na mesma rodada, com as 36 imagens iguais pixel a pixel; a prancha diz em cada linha e no JSON para onde os eixos do modelo caem na vista, pela frase de lado conferida com a projeção medida, e recusa a captura que não bate; e `medir:transcricao --atritos[=N]` contou na sessão 275 chamadas da bancada e 48 comandos com `--max-old-space-size` sem padrão dado, com a leitura dos registros que o `contar-comandos.mjs` passou a importar dela.
8. Skills, agente, documentação e fechamento. Em 2026-11-17, na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md), entraram a consulta `comparar-com-a-referencia.md` da skill `criar-peca`, a seção do agente `modelador`, a nota na skill `contorno-da-imagem` e, em [O laço do crítico](../usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico), o pedido fechado nas duas ordens com a nota de `--juntar`; a ajuda de cada comando já trazia as opções novas. O gate de saída foi conferido item a item: passam 2, 3, 4, 7 (menos a nota na skill `laco-de-modelagem`, território da leitura por partes) e 8, o item 1 espera a confirmação da pessoa sobre as duas pranchas, refeitas por um comando cada, e os itens 5 e 6 pedem medidas que só quem conduz despacha.

## Riscos e parada

Se a prancha precisar de mais de cinco opções novas para cobrir os casos medidos, o comando está tentando fechar o que é aberto: para, e a pessoa decide entre cortar opções e deixar o caso para o script. Em 2026-11-17 a prancha chegou a oito opções (as seis do Filtro, mais `--espelhar` da fatia 3 e `--copia` da fatia 4, que vieram dos casos medidos), e a pessoa aceitou as oito. Se uma rodada de modelador com o comando passar a gastar mais chamadas do que sem ele, a ferramenta volta ao desenho. A medição livre na foto não entra em nenhuma fatia; se a pessoa quiser trazê-la, é outro plano.

## Fechamento

Preparado em 2026-11-17, antes da confirmação da pessoa; o plano continua ativo até ela e até os itens em aberto do gate de saída, e o estado final e o commit do encerramento se escrevem ao fechar.

Entregou a prancha modelo e foto por um comando (`tools/modelar/prancha-de-referencia.mjs`, com régua, região, vistas, parte, cópia, espelho e disposição, e a frase de para onde cada eixo do modelo cai na vista), `descrever --recusas`, `olhar-bancada --sobrescrever` com o marcador da pasta criada pela bancada, a cópia de parte repetida por `--copia`, várias miras numa chamada da bancada, o contorno medido sobreposto no pacote do crítico com o trecho de encontro tracejado e a peça fixa fora dele, o pedido do crítico por perguntas fechadas em duas ordens com a nota por regra e `--juntar`, e `medir:transcricao --atritos`. Pela numeração da linha de base, os comandos tiram 35 dos 42 comandos de prancha, saída e conferência das sete rodadas de modelador da bicicleta, e sobram 7 em 83.

O gate de saída, conferido na [pasta do plano](../banco-de-provas/comparar-com-a-referencia-2026-11-16/README.md#fatia-8-skills-agente-documentação-e-o-gate-de-saída): passaram os itens 2, 3, 4 e 8, e o 7 sem a nota na skill `laco-de-modelagem`, que é território da leitura por partes e chega à regra pelo link dela para O laço do crítico. O item 1 passou em 2026-11-17: a pessoa olhou as duas pranchas e delegou o julgamento a quem conduz, que as dá por corretas, porque as duas metades saem na mesma escala medida (o selim com 260 mm no modelo e na foto), com régua em mm, a frase dos eixos e a região da foto pedida, e mostram as diferenças de forma que as pranchas à mão mostravam. O item 5 espera uma rodada de modelador com referência medida, porque a conta de 7 em 83 é projeção sobre a linha de base. O item 6 espera o contorno medido do selim e dois críticos em cada pacote, porque a medida feita no ombro usou o contorno de uma referência encerrada.

O resultado observado que muda o trabalho é a nota do crítico: com as duas ordens ela variou 0,6 contra 1 do pedido de hoje, e saiu mais alta, porque o tamanho deixa de ser julgado a olho e passa a ser do `descrever`. A oscilação não mudou com o contorno sobreposto no ombro.

Voltam ao backlog o registro da rodada com as duas respostas do crítico, o filtro das recusas de material em `--recusas`, a lista de afirmações declarada no `PLANO` no lugar da partição da forma prometida, o contorno lateral espelhado da carcaça da empilhadeira e a conferência de que a imagem de um contorno ainda existe; a sonda fora de `tools/` e a vista da fixture sem Blender já estavam lá, e o item de `medir:transcricao` sem `--ajuda` saiu, porque a fatia 7 o resolveu.
