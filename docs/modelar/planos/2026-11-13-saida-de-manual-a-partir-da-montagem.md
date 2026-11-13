# Saída de manual a partir da montagem: lista de peças e passo a passo

**Estado:** ativo

**Território:** `modulos/manual/`, `src/autoria/ler-montagem-persistida.js`, `src/autoria/texto-do-manual.test.mjs`, `docs/modelar/banco-de-provas/saida-de-manual-2026-11-13/`

**Responsável:** a IA da sessão do furgão conduz, com agentes; a pessoa pediu o módulo em 2026-11-13 e julga as páginas geradas por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-13.

## Problema observado

A instalação solar no telhado foi modelada e serviu a um manual real. O projeto deu o modelo, as imagens e a auditoria que acusou um grampo sobre a emenda do trilho. A lista de peças com quantidade, a ordem dos passos e a página do manual foram escritas à mão, fora do repositório, e as imagens de cada passo foram tiradas uma a uma por script de rascunho. A montagem já guarda as instâncias de cada peça e a ordem de construção em `etapas`, e nenhum comando tira dela a lista nem o passo a passo.

## Resultado

De uma montagem persistida sai, por um comando, um manual: a lista de peças com quantidade e medidas principais, e um passo por etapa com a imagem do que entra nele e do que já estava montado. A pessoa abre o resultado e o reconhece como o manual que ela usaria.

## Filtro Agent-First

USAR DIRETO: a montagem v5 com `etapas` e instâncias, o resolvedor da montagem, a captura de vistas da montagem e o desenho das etapas (`npm run etapas -- <montagem.json> --olhar`). ADIAR: projeção com linha escondida e cotas, até a primeira etapa estar aprovada; editor de manual; tradução.

## Incluído, em fatias pela ordem de execução

1. A lista de peças. O módulo lê a montagem resolvida e escreve, em dados e em Markdown, cada peça com o nome, a quantidade de instâncias, a caixa em milímetros e o material declarado, agrupando as instâncias da mesma receita com os mesmos parâmetros. Prova: a lista da instalação solar bate, linha a linha, com a contagem das instâncias da montagem, e a mesma entrada dá a mesma saída, byte a byte.
2. O passo a passo. Para cada etapa da montagem, a lista do que entra nela e uma imagem com as peças novas destacadas e as já montadas esmaecidas, na vista que a etapa declarar ou numa vista padrão. A saída é uma página só, em HTML sem dependência de rede, e os dados dela em JSON. Prova: a página da instalação solar gerada pelo comando, julgada pela pessoa por imagem contra o manual feito à mão.
3. O texto de cada passo. A etapa da montagem pode declarar uma instrução curta e os avisos (ferramenta, aperto, o que conferir); o módulo só a dispõe, e não inventa instrução. Prova: a etapa sem instrução sai com a lista e a imagem, sem texto inventado.
4. O desenho de uma peça com cotas declaradas: as três vistas ortográficas com linha visível e escondida e as cotas que a receita declarar. Só começa depois de a pessoa aprovar as fatias 1 e 2, e pode virar plano próprio se a projeção pedir trabalho no núcleo.

Estado em 2026-11-13: as fatias 1 e 2 foram feitas por um agente, em `modulos/manual/`, reaproveitando o resolvedor da montagem e a captura sem mudar nada fora do módulo. A instalação solar sai com 48 instâncias em 14 linhas de peça e 48 passos, em 113 s (94 s de imagens, cerca de 2 s cada); o avião, em 15 s. Cada imagem enquadra a peça nova, porque numa vista da casa inteira o grampo e a emenda não aparecem. Dois atritos viraram candidatos de ferramenta: a captura sobe o servidor e o navegador a cada chamada, e o visor da montagem não tem destaque por instância, de modo que o módulo pinta uma cópia da malha. A página foi mostrada à pessoa, que ainda não a julgou. A pessoa aprovou seguir, e a fatia 3 foi feita com três mudanças pedidas por ela: nome de exibição da peça e do parâmetro, passos agrupados quando etapas seguidas põem a mesma peça (a instalação solar foi de 48 a 29 passos), e instrução e avisos por etapa. Os textos moram num campo opcional `manual` da montagem v5 (`nomes`, `parametros` e `etapas`), aceito por `src/autoria/ler-montagem-persistida.js`; montagem sem o campo é lida como antes. O passo agrupado tem duas imagens, a vista geral e o detalhe de uma das peças, porque na vista geral as oito hastes viravam pontos. A instalação solar gera em 104 s. A fatia 4, o desenho com cotas, foi aprovada pela pessoa em 2026-11-13 ("eu aprovo, vamos concluir esse plano de desenho tecnico antes"), que aprovou também as fatias 1 a 3.

## Excluído

Escolher cotas sozinho; desenho de conjunto com balões; exportar para formato de editor de texto; dado elétrico, marca ou modelo de produto, que não entram no repositório.

## Invariantes

O módulo não constrói forma e não importa peça pelo nome: lê qualquer montagem persistida. O núcleo não muda nas fatias 1 a 3. A saída é determinística. Nenhuma imagem de terceiro entra na página.

## Gate de saída

1. `npm run manual -- <montagem.json>` gera a lista e a página para a instalação solar e para uma segunda montagem do acervo, sem opção específica de objeto.
2. A lista confere com as instâncias da montagem, por teste.
3. A pessoa viu a página gerada e a decisão dela está registrada.
4. `npm run gates` verde, com o módulo no catálogo de mecanismos.

## Riscos e parada

A captura de uma imagem por etapa ser lenta numa montagem grande: mede-se o tempo por etapa na instalação solar antes de escolher o formato, e a página sai com imagem menor se passar de dois minutos no total. A montagem não ter o que o manual precisa (instrução, vista): o campo entra como opção declarada da etapa, e a montagem sem ele continua válida. Se a fatia 4 pedir mudança no núcleo, ela para e vira plano próprio.

## Fechamento

Preencher ao concluir ou cancelar.
