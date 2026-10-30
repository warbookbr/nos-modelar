# Interface da bancada — a tela organizada em torno da peça, sobre um sistema visual único, com a forma escolhida pela pessoa por imagem

**Estado:** cancelado

**Responsável:** Claude, com a pessoa escolhendo a proposta de tela e aprovando cada parte por imagem

**Repositório e base:** `warbookbr/nos-modelar`, main depois do fechamento do plano [visões de conferência na bancada](../2026-10-30-visoes-de-conferencia-na-bancada.md); o [furgão realista](../2026-10-30-furgao-realista.md) vem depois deste

## Problema observado

A pessoa achou a interface da bancada genérica, com a aparência de uma tela feita de uma vez por IA, e pediu em 2026-10-30 a reestruturação que um engenheiro sênior faria. Medido no código: `src/bancada/main.js` tem 2.093 linhas e busca 63 elementos da página pelo identificador; `src/bancada/styles.css` tem 1.896 linhas, 43 cores escritas à mão, duas famílias de fonte sem serifa e 49 declarações de arredondamento. Na tela, os dois painéis laterais ocupam quase metade da largura numa janela de 1400 pixels, a barra das vistas de câmera transborda, o painel da direita mistura modos de exibição, controles, ações e edição, os modos desabilitados parecem botões quebrados, a lista de componentes mostra contagens internas como "120F", e a janela e a tela inicial usam nomes diferentes para a mesma bancada.

## Resultado

A bancada passa a ter a peça no centro e a ocupar o resto da tela, uma barra superior com o nome e o estado da peça e a busca de comandos, a árvore das partes num painel estreito e recolhível, o painel da direita só com o que vale para a seleção, a edição como modo explícito e uma barra de estado; tudo sobre um sistema visual único de espaçamento, tipografia, cor e ícones, na proposta de tela que a pessoa escolheu, e com as imagens da captura automática para o crítico iguais às de antes.

## Filtro Agent-First

USAR DIRETO a ponte `window.__mecanificaBancada` como contrato fixo da captura automática, e as guardas da bancada como régua de que nada mudou para o crítico. ENVOLVER o estado da bancada num lugar só, que os componentes leem e escrevem, no lugar dos 63 acessos diretos à página. REFATORAR o `main.js` em componentes por painel, um de cada vez, sem mudar comportamento antes de mudar aparência. ADIAR qualquer função nova que não seja de organização da tela.

## Incluído

As propostas de tela desenhadas para a pessoa escolher; as definições do sistema visual (espaçamento numa grade de 4 e 8 pixels, uma família de fonte com variante monoespaçada para números, dois ou três tamanhos de texto, uma cor de destaque e cinzas neutros, bordas finas, um conjunto de ícones, os estados de foco, desabilitado e carregando); a barra superior com a busca de comandos; a árvore das partes com visibilidade e isolar por linha; o cubo de orientação no lugar das nove vistas em botão; a barra flutuante da cena com câmera, projeção, visão e enquadrar, onde o seletor do plano das visões entra; o painel contextual da seleção com abas; o modo de edição explícito; a barra de estado; a cena com fundo neutro, luz de estúdio, sombra suave no chão e contorno da seleção; a quebra do `main.js` em componentes com estado central; um teste de imagem por componente.

## Excluído

Funções novas da bancada; mudar a ponte da captura automática ou as imagens que o crítico recebe; material físico (PBR) e paleta nova de materiais das peças; uma aplicação para a pessoa fora da bancada.

## Invariantes

As guardas da bancada saem com as mesmas imagens de antes, e a `vistas:critica` gera o mesmo pacote. A edição de juntas, a edição de malha, a sessão ativa e o ajuste salvo funcionam como antes. A bancada publicada no Pages abre sem servidor local.

## Gate de saída

1. A pessoa escolheu uma das propostas de tela por imagem antes de qualquer código, e aprovou por imagem cada parte entregue.
2. A folha de estilo usa só as definições do sistema visual: nenhuma cor, tamanho de fonte ou espaçamento fora delas, conferido por um gate.
3. Numa janela de 1400 por 900 a cena ocupa ao menos 70% da largura com os painéis abertos, e nada transborda em 1100 pixels.
4. `main.js` sem acesso direto à página fora dos componentes, e cada componente com teste de imagem.
5. As guardas da bancada, a captura da `vistas:critica` e o `npm run gates -- --completo` passam.

## Fatias

1. **Propostas de tela.** Duas ou três propostas desenhadas, na mesma peça e no mesmo tamanho de janela, para a pessoa escolher.
2. **Sistema visual e estado central.** As definições, o gate que as cobra e o estado da bancada num lugar só, sem mudar a aparência ainda.
3. **Estrutura da tela.** Barra superior, árvore das partes, cena com a barra flutuante e o cubo de orientação, painel contextual e barra de estado, um componente de cada vez.
4. **Cena e acabamento.** Fundo, luz, sombra, contorno da seleção e os estados dos controles.
5. **Fechamento.** Imagens para a pessoa, documentação da bancada, bateria completa e o plano movido para `encerrados/`.

## Decisões que dependem da pessoa

1. **Plano e ordem.** Aprovada em 2026-10-30: a pessoa pediu o plano logo depois do das visões e antes do furgão realista.
2. **Proposta de tela.** A pessoa escolhe na fatia 1.

## Riscos e parada

O risco maior é a reestruturação mudar o que a captura automática vê e o crítico passar a julgar por outra imagem: as guardas da bancada são a parada, e qualquer diferença nelas volta à pessoa antes de seguir. Para também se a quebra do `main.js` pedir mudar a ponte da captura.

## Andamento

Rascunho escrito em 2026-10-30, a pedido da pessoa; ativa quando o plano das visões fechar.

Absorvido em 2026-10-30 pelo plano ativo das [visões de conferência e interface da bancada](../2026-10-30-visoes-de-conferencia-na-bancada.md), a pedido da pessoa, que quis a interface começando já.
