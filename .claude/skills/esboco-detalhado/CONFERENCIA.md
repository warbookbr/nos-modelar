# Conferência da divisão da skill esboco-detalhado

Mapeamento de cada frase e instrução do `SKILL.md` original (`git show HEAD:.claude/skills/esboco-detalhado/SKILL.md`) para o seu destino atual (arquivo e linha).

| Linha original | Instrução original | Arquivo de destino | Linha de destino |
| ---: | :--- | :--- | ---: |
| 1 | Frontmatter (name: esboco-detalhado, description: ...) | `SKILL.md` | 1 |
| 4 | # Esboço detalhado | `SKILL.md` | 5 |
| 6 | Esta skill diz como esboçar um objeto inteiro, qualquer que seja, com a ferramenta `npm run esboco`. | `SKILL.md` | 7 |
| 7 | A referência completa do JSON está em [`modulos/esboco/README.md`](../../../modulos/esboco/README... | `SKILL.md` | 8 |
| 11 | Prefira sempre a relação de posição (`sobre`, `ponta`, `encosta`, `alinha`, `encaixa`, `de`/`para... | `SKILL.md` | 12 |
| 14 | Quem conduz o esboço entre unidades e despacha o crítico é a skill [`laco-do-esboco`](../laco-do-... | `SKILL.md` | 15 |
| 17 | ## Pare e planeje | `SKILL.md` | 18 |
| 19 | Antes de escrever qualquer JSON, pare e decida por escrito, em um parágrafo curto por decisão, o ... | `SKILL.md` | 20 |
| 19 | O nível de detalhe que a pessoa pediu, gravado em `plano.nivel`: `esquematico` (conceito de propo... | `SKILL.md` | 20 |
| 19 | O nível decide quanto se planeja e quanto se confere. | `SKILL.md` | 20 |
| 19 | As medidas do objeto em `plano.medidas` (nome, valor, unidade, origem `ficha`, `foto` ou `ia` (ou... | `SKILL.md` | 20 |
| 19 | Antes de modelar qualquer forma, o inventário das partes que o tipo de objeto precisa ter, em `pl... | `SKILL.md` | 20 |
| 19 | Havendo foto, o arquivo dela em `plano.referencia` (`arquivo`, `vista`, `tolerancia` em mm e `iou... | `SKILL.md` | 20 |
| 19 | Como cada peça será detalhada com caixa (com `raio` ou `chanfro`), cilindro, anel, cone, esfera, ... | `SKILL.md` | 20 |
| 19 | E as regras de contato: o gate `contato: { usar: true }` fica ligado por padrão quando o esboço t... | `SKILL.md` | 20 |
| 19 | Com o gate ligado, decida a tolerância, a penetração e as exceções declaradas: `atravessa` com o ... | `SKILL.md` | 20 |
| 19 | Declare `atravessa` só onde uma peça de fato passa pela outra (eixo em furo, anel em volta de cub... | `SKILL.md` | 20 |
| 19 | O texto pode ir no campo opcional `plano` da raiz do JSON, que o desenho ignora e a análise copia... | `SKILL.md` | 20 |
| 19 | Detalhes em [`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md). | `SKILL.md` | 20 |
| 21 | ## O fluxo de um esboço grande | `SKILL.md` | 22 |
| 23 | Um esboço com mais de uns 6 formas por opção segue esta ordem, e o Condutor (`npm run esboco -- -... | `SKILL.md` | 24 |
| 23 | Primeiro o contrato: o nível, as medidas nomeadas com a origem de cada número e as relações (o qu... | `SKILL.md` | 24 |
| 23 | Depois as medidas da referência viram parâmetros: havendo foto, o contorno de cada parte sai da s... | `SKILL.md` | 24 |
| 23 | Com os subsistemas prontos vem a montagem do conjunto, e a Conferência da maquete a confere por n... | `SKILL.md` | 24 |
| 23 | Depois vêm imagens limpas, sem legenda numerada, que vão a um crítico sem contexto (só as imagens... | `SKILL.md` | 24 |
| 23 | Só o nível `detalhado` segue: o Plano de detalhe agrupa em unidades as formas de acoplamento aper... | `nivel-detalhado.md` | 5 |
| 23 | Quando falta ajustar, `--mover <forma\|instância\|padrão\|a,b,c> --para <unidade> --motivo <texto>` ... | `nivel-detalhado.md` | 5 |
| 23 | Cada unidade recebe o Envelope da maquete (a caixa e as portas, que são as âncoras que outras uni... | `nivel-detalhado.md` | 5 |
| 23 | Um `atravessa` entre formas da mesma unidade, declarada ou planejada, passa sem `motivo` nem `max... | `nivel-detalhado.md` | 5 |
| 23 | O Detalhe por unidade troca cada unidade pela versão detalhada: `--detalhar <unidade> [arquivo]` ... | `nivel-detalhado.md` | 5 |
| 23 | Quando o detalhado declara `substitui: "<forma-da-maquete>"` em cada forma que troca uma da maque... | `nivel-detalhado.md` | 5 |
| 23 | Para o crítico cego de uma unidade, `npm run esboco -- <arquivo> --unidade <unidade> [--vista <vi... | `nivel-detalhado.md` | 5 |
| 23 | A cada 25% do custo estimado (o número de formas das unidades na maquete, que o `--integrar` não ... | `nivel-detalhado.md` | 5 |
| 25 | Antes de fechar uma unidade com mais de 8 formas, escreva a `funcao` dela na raiz do esboço (`uni... | `nivel-detalhado.md` | 7 |
| 25 | Ao fechar uma unidade assim, o `--feito` grava as quatro vistas `--unidade` numa pasta (`<arquivo... | `nivel-detalhado.md` | 7 |
| 25 | O comando não despacha agente: a skill [`laco-do-esboco`](../laco-do-esboco/SKILL.md) despacha o ... | `nivel-detalhado.md` | 7 |
| 25 | Nota baixa ou ponta no ar vira correção do JSON e nova leitura em texto antes da unidade seguinte. | `nivel-detalhado.md` | 7 |
| 25 | No Marco (25, 50, 75, 100%) o `--feito` imprime também o brief do crítico cego do Marco, com as q... | `nivel-detalhado.md` | 7 |
| 1 | `npm run esboco -- <arquivo> --medidas` mostra em texto o declarado, o medido e o desvio de cada ... | `SKILL.md` | 27 |
| 1 | `npm run esboco -- <arquivo> --ligacoes [--unidade <unidade>] [--forma <id>]` mostra em texto, se... | `SKILL.md` | 27 |
| 27 | Quem modela sem poder despachar agente (um subagente, que não tem a ferramenta de despacho) para ... | `nivel-detalhado.md` | 9 |
| 27 | Antes de cada `--feito`, abra as quatro imagens da unidade (`--unidade <unidade>`) e confira nela... | `nivel-detalhado.md` | 9 |
| 27 | O Condutor recusa o `--feito` de outra unidade e o `--proximo` enquanto o último veredito de uma ... | `nivel-detalhado.md` | 9 |
| 27 | Quem o chamou (o `laco-do-esboco`) despacha o `critico-visual` cego com esse brief e devolve a no... | `nivel-detalhado.md` | 9 |
| 29 | Quando as quatro vistas de uma unidade não bastam, o crítico (ou você, antes de despachá-lo) pede... | `nivel-detalhado.md` | 11 |
| 29 | `--corte <x\|y\|z>=<mm>` quando a pergunta é o que há por dentro: um eixo que atravessa o cubo, um ... | `nivel-detalhado.md` | 11 |
| 29 | `--explodir` (na isométrica, ou com `--eixo`) quando as peças se cobrem e o crítico não separa um... | `nivel-detalhado.md` | 11 |
| 29 | `--zoom-forma <id\|padrão> [--margem <mm>]` quando um detalhe pequeno (um encaixe, uma ponta, um p... | `nivel-detalhado.md` | 11 |
| 29 | `--previa` só para iterar rápido na própria edição: a imagem sai rotulada "prévia", sem arestas f... | `nivel-detalhado.md` | 11 |
| 29 | Pedir a mesma unidade de novo só redesenha as vistas cujo conteúdo mudou (o comando diz "reaprove... | `nivel-detalhado.md` | 11 |
| 31 | Não audite um esboço por imagem com legenda numerada: o balão e a chave escondem a peça, e a lege... | `SKILL.md` | 29 |
| 31 | A auditoria é numérica (a leitura padrão do `--descrever`, o gate, as medidas e o contrato) e, qu... | `SKILL.md` | 29 |
| 31 | Imagem com legenda é para a pessoa escolher forma, e não para conferir posição. | `SKILL.md` | 29 |
| 33 | ## Formas novas e componentes | `formas-e-componentes.md` | 1 |
| 35 | Para um garfo, uma barra dobrada ou um tubo de quadro, escreva `{ "id": "tubo", "tipo": "tubo", "... | `formas-e-componentes.md` | 2 |
| 35 | Um ponto ao longo de uma haste é `{ "entre": [A, B], "mm": 90 }` (a 90 mm de A), `{ "entre": [A, ... | `formas-e-componentes.md` | 2 |
| 35 | `cone` com `diametroTopo` é o tronco, `extrusao` tem o centro no centro da caixa do perfil e `cha... | `formas-e-componentes.md` | 2 |
| 35 | O tubo, o espelho e o arranjo se combinam (o espelho copia o tubo inteiro). | `formas-e-componentes.md` | 2 |
| 35 | Para dobrar o tubo num ponto sem esfera oculta nem `desloca` de folga, dê nome ao ponto: `{ "nome... | `formas-e-componentes.md` | 2 |
| 35 | Toda referência de componente aceita `<instancia>.<parte>` (`rodaFrente.pneu`, inclusive a forma ... | `formas-e-componentes.md` | 2 |
| 37 | Antes de modelar uma roda, um garfo, um quadro de caixas ou um mancal à mão, use o componente: `{... | `formas-e-componentes.md` | 4 |
| 37 | As formas saem com o id prefixado (`rodaFrente.pneu`), as âncoras do componente valem como `<inst... | `formas-e-componentes.md` | 4 |
| 37 | Os parâmetros, as entradas (`centro`, `de`, `para`, `desloca`...) e as âncoras de cada componente... | `formas-e-componentes.md` | 4 |
| 37 | Cite as outras partes do componente pelo id com prefixo (`quadro.coluna`, `rodaFrente.disco`) e, ... | `formas-e-componentes.md` | 4 |
| 37 | O `--descrever` marca cada forma como "principal" ou "parte" do componente, e o `--ajustar` só mo... | `formas-e-componentes.md` | 4 |
| 37 | O exemplo é `modulos/esboco/tests/fixtures/moto-componentes.esboco.json`. | `formas-e-componentes.md` | 4 |
| 39 | ## Ler em texto antes da imagem | `leitura-em-texto.md` | 1 |
| 41 | Antes de gerar qualquer imagem, rode `npm run esboco -- <arquivo> --descrever`: em milissegundos ... | `leitura-em-texto.md` | 2 |
| 41 | `--forma <id>` (ou um padrão como `garfoE.*`) traz o detalhe de uma forma (centro, extensão, eixo... | `leitura-em-texto.md` | 2 |
| 41 | A cada edição do JSON rode `npm run esboco -- <arquivo> --descrever --mudou`, que grava a leitura... | `leitura-em-texto.md` | 2 |
| 41 | Para posicionar uma forma em relação a outra sem calcular, escreva `centro` como `"<id>.<ancora>"... | `leitura-em-texto.md` | 2 |
| 41 | Não calcule centro, comprimento nem ângulo: um garfo, uma barra ou um braço é `{ "tipo": "cilindr... | `leitura-em-texto.md` | 2 |
| 41 | Para pôr uma forma junto de outra use `encosta: { "referencia": "<id>", "direcao": "-y", "folga":... | `leitura-em-texto.md` | 2 |
| 41 | Referência declarada depois ou `oculto` vale; ciclo é recusado. | `leitura-em-texto.md` | 2 |
| 41 | A `--descrever` mostra a relação usada ao lado do centro resolvido, e o gate trata `encosta` como... | `leitura-em-texto.md` | 2 |
| 41 | Só gere a imagem quando a leitura em texto estiver como você quer. | `leitura-em-texto.md` | 2 |
| 43 | ## Variantes, simetria e repetição | `variantes-simetria-repeticao.md` | 1 |
| 45 | Quando a pessoa pede duas atitudes do mesmo objeto (alto e baixo, aberto e fechado), escreva a li... | `variantes-simetria-repeticao.md` | 2 |
| 45 | O parâmetro é um número, o nome de outro parâmetro ou `"=expressão"` com `+ - * /` e parênteses, ... | `variantes-simetria-repeticao.md` | 2 |
| 45 | A opção sobrepõe a raiz nome a nome, e o que depende do parâmetro se recalcula sozinho. | `variantes-simetria-repeticao.md` | 2 |
| 45 | Não há seno nem cosseno: para uma haste inclinada use `de`/`para`, e para pôr peças numa circunfe... | `variantes-simetria-repeticao.md` | 2 |
| 45 | Parâmetro inexistente, ciclo e expressão inválida são recusados com o campo, a forma e os parâmet... | `variantes-simetria-repeticao.md` | 2 |
| 45 | A leitura `--descrever` imprime `parâmetros:` por opção com os valores resolvidos, e o manifesto ... | `variantes-simetria-repeticao.md` | 2 |
| 47 | Para a peça simétrica escreva só a metade: `{ "id": "garfoD", "espelha": { "forma": "garfoE", "ei... | `variantes-simetria-repeticao.md` | 4 |
| 19 | Com o gate ligado, o par do espelho herda o `atravessa`, o `livre` ou o `encosta` do original com... | `SKILL.md` | 20 |
| 47 | Para repetir uma peça, escreva na lista uma entrada `{ "arranja": { "forma": "parafuso", "modo": ... | `variantes-simetria-repeticao.md` | 4 |
| 47 | O exemplo completo é `modulos/esboco/tests/fixtures/moto-parametros.esboco.json`. | `variantes-simetria-repeticao.md` | 4 |
| 49 | ## Escrever menos JSON | `escrever-menos-json.md` | 1 |
| 51 | Repetir cor, repetir o lado simétrico e listar pontos de um perfil são o grosso do que se escreve... | `escrever-menos-json.md` | 2 |
| 51 | `estilos` na raiz (`{ "metal": { "cor": "#c3c7cc" } }`, com `cor`, `opacidade` e `linhaCentro`) e... | `escrever-menos-json.md` | 2 |
| 51 | `simetrico: { "eixo": "x", "pos": 0 }` na raiz (ou dentro de uma unidade, que manda sobre a raiz,... | `escrever-menos-json.md` | 2 |
| 51 | O `perfil` de `extrusao`, `revolucao` e de uma seção de `loft` pode ser uma função, com parâmetro... | `escrever-menos-json.md` | 2 |
| 51 | Para mudar um esboço pronto não regrave o JSON nem escreva um script: `npm run esboco -- --editar... | `escrever-menos-json.md` | 2 |
| 51 | Um exemplo pequeno de tudo isso é `modulos/esboco/tests/fixtures/estilos-perfis.esboco.json`. | `escrever-menos-json.md` | 2 |
| 53 | ## Faixas, rodas e discos | `faixas-rodas-discos.md` | 1 |
| 55 | A faixa que contorna círculos (correia, esteira, corrente, cabo em polia) é `{ "tipo": "envolve",... | `faixas-rodas-discos.md` | 2 |
| 55 | O gate, a projeção e o `--descrever` a tratam como o tubo, e os elos saem de `{ "arranja": { "for... | `faixas-rodas-discos.md` | 2 |
| 55 | A `roda` aceita `raios` (número de raios, que trocam o disco por cubo e raios), `raioCubo`, `flan... | `faixas-rodas-discos.md` | 2 |
| 57 | ## Regras de contato | `regras-de-contato.md` | 1 |
| 59 | `contato: { "usar": true, "tolerancia": mm, "penetracao": mm, "folga": mm, "pares": [...] }` na r... | `regras-de-contato.md` | 2 |
| 59 | Sem `usar` nada muda. | `regras-de-contato.md` | 2 |
| 59 | Quando muitas peças se atravessam por uma mesma razão (as partes de um garfo e o guidão), declare... | `regras-de-contato.md` | 2 |
| 59 | Toda exceção declara por quê: `atravessa` e `livre` exigem `motivo` (pelo menos 15 caracteres) e ... | `regras-de-contato.md` | 2 |
| 59 | Par sem isso é "esboço recusado", com o par, o campo que falta e um exemplo. | `regras-de-contato.md` | 2 |
| 59 | Exemplos: | `regras-de-contato.md` | 2 |
| 62 | ```json { "a": "garfoE", "b": "guidao", "tipo": "atravessa", "max": 15, "motivo": "a presilha do ... | `regras-de-contato.md` | 5 |
| 19 | Com o gate ligado, a ponta de tubo ou de haste (`de`/`para` em cilindro ou caixa) que não encosta... | `SKILL.md` | 20 |
| 69 | O `livre` continua ignorando o par, mas o relato o lista em "pares silenciados:" com o motivo; le... | `regras-de-contato.md` | 12 |
| 69 | Os padrões são tolerância de 1% (folga máxima para ligar duas peças), penetração de 0,3% (sobrepo... | `regras-de-contato.md` | 12 |
| 69 | `npm run esboco` imprime `colisao`, `longe`, `voando`, `par-nao-encosta` e `atravessa-excedido` p... | `regras-de-contato.md` | 12 |
| 69 | Leia cada achado contra a imagem: peça `voando` costuma ser posição errada, e colisão de peças qu... | `regras-de-contato.md` | 12 |
| 69 | Leia também cada atravessamento: profundidade que a imagem mostra como peça dentro da outra, e nã... | `regras-de-contato.md` | 12 |
| 19 | Detalhes em [`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md). | `SKILL.md` | 20 |
| 71 | Cada achado de contato vem com uma sugestão em milímetros ("mova banco em [0 0 -13] mm (...)"), t... | `regras-de-contato.md` | 14 |
| 71 | Leia o motivo antes de aceitar: ele diz qual forma se move (a que depende da outra, ou a de menor... | `regras-de-contato.md` | 14 |
| 71 | Para aplicar, rode `npm run esboco -- <arquivo> --ajustar`: grava `<nome>.ajustado.esboco.json` a... | `regras-de-contato.md` | 14 |
| 71 | Depois abra a imagem do arquivo ajustado, porque o gate aprova a geometria e não a intenção: se a... | `regras-de-contato.md` | 14 |
| 71 | Na `--analise --sugerir`, o achado de projeção traz o menor deslocamento que zera a cobertura na ... | `regras-de-contato.md` | 14 |
| 73 | ## Sobreposição na projeção | `sobreposicao-na-projecao.md` | 1 |
| 75 | O gate mede em três dimensões, e uma peça a 10 mm de outra pode parecer sobre ela numa vista. | `sobreposicao-na-projecao.md` | 2 |
| 75 | Com `contato.usar` ligado (e sempre na `--analise`), `npm run esboco` imprime "sobreposição na pr... | `sobreposicao-na-projecao.md` | 2 |
| 75 | É informativo (`aviso`); `contato.projecao.reprova: true` o faz reprovar e `--estrito` sair com c... | `sobreposicao-na-projecao.md` | 2 |
| 75 | O relato mostra os achados agrupados por componente, só os 10 mais graves, sem pares de espelho n... | `sobreposicao-na-projecao.md` | 2 |
| 75 | Não decida camadas à mão: leia o achado, abra a vista que ele indica como alternativa e as imagen... | `sobreposicao-na-projecao.md` | 2 |
| 75 | Se a folga real é a que você quer, o achado só informa que a vista engana e nada muda no JSON. | `sobreposicao-na-projecao.md` | 2 |
| 75 | Se a folga é pequena demais para ler na imagem, mova a peça. | `sobreposicao-na-projecao.md` | 2 |
| 75 | Para mostrar a peça separada à pessoa, declare `explosao: { "eixo": "z", "fator": 2.5 }` na raiz ... | `sobreposicao-na-projecao.md` | 2 |
| 75 | O achado só vale como conferência e não substitui olhar a imagem. | `sobreposicao-na-projecao.md` | 2 |
| 75 | Arestas ocultas tracejadas não existem: use a variante transparente. | `sobreposicao-na-projecao.md` | 2 |
| 77 | ## Resumo do formato | `resumo-do-formato.md` | 1 |
| 79 | Raiz: `opcoes` (obrigatório), `plano` (texto ou `{ texto, nivel, medidas, contrato, pecas, refere... | `resumo-do-formato.md` | 2 |
| 79 | Opção: `titulo`, `nota`, `formas`, `parametros`, `pontos`, `contato`, `explosao`, `legendas`, `li... | `resumo-do-formato.md` | 2 |
| 79 | Forma: `id`, `tipo` (`caixa`, `cilindro`, `anel`, `cone`, `esfera`, `extrusao`, `loft`, `revoluca... | `resumo-do-formato.md` | 2 |
| 79 | Também uma forma pode ser `{ id, usa: "<componente>", ... }`, `{ id, espelha: { forma, eixo, pos ... | `resumo-do-formato.md` | 2 |
| 79 | Contato: `usar`, `tolerancia`, `penetracao`, `folga`, `pares` (`a`, `b`, `tipo` `atravessa`, `enc... | `resumo-do-formato.md` | 2 |
| 79 | O arquivo é validado antes de qualquer leitura: um campo que não existe, um `tipo`, um `eixo` ou ... | `resumo-do-formato.md` | 2 |
