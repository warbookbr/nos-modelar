# Ajustes da bancada — o objeto abre inteiro e a tela perde o que a pessoa não usa

**Estado:** pronto

**Execução:** em paralelo ao plano ativo, autorizada pela pessoa em 2026-11-03.

**Responsável:** a definir

**Repositório e base:** `warbookbr/nos-modelar`, ramo de trabalho do furgão realista

## Problema observado

Ao usar a bancada em 2026-11-03, a pessoa apontou seis pontos.

1. A janela "Abrir" lista o avião e o braço robótico só pelas partes (`aviao/asas`, `braco-robotico/ombro`). Os dois objetos têm montagem em `procedural/pecas/<objeto>/montagem.json` (formato `mecanifica.montagem`, versão 5), que a ferramenta de auditoria de montagem já lê. A varredura de `src/bancada/acervo-receitas.js` só reconhece receitas `.js`, e a bancada não lê a montagem em dados.
2. O bloco de diagnóstico e de portas publicadas da aba Inspeção ("2 componentes: nenhuma superfície sem identidade", "apoio · unir:400") é informação para a ferramenta, que a pessoa não usa.
3. O nome da peça com a luz de estado (`.nome-peca`) na barra superior não serve à pessoa.
4. O botão de atalhos de teclado (`btnMenuAtalhos`) tomou o lugar do botão de configurações, que saiu em 2026-09-16 (commit `8e6808f9`). A pessoa quer o botão de configurações de volta, à direita do "Abrir".
5. O botão "Abrir" (`btnMenuAbrir`) às vezes mostra só o ícone da pasta, sem o nome.
6. A dica de estado (`dicaEstado`) da barra de estado não serve à pessoa.

A pessoa trouxe para cá, no mesmo dia, as duas correções de interface que as capturas da fatia 8 do [plano das visões](2026-10-30-visoes-de-conferencia-na-bancada.md) acharam:

7. No tema Foco, as legendas da curvatura e da luz rasante cobrem a peça.
8. No tema Bancada, a aba de referência fica estreita (216 px) e corta o botão e os campos.

Ainda em 2026-11-03, a pessoa decidiu ficar com um arranjo só da tela, o da Bancada, e tirar os temas Foco e Revisão, sem interruptor que os substitua. Com isso o ponto 7 deixa de existir, porque as legendas só cobriam a peça no Foco.

9. A bancada fica só com o arranjo Bancada; os temas Foco e Revisão saem, com o seletor de tema.
10. Ao girar a câmera, o cursor pisca. O controle de órbita avisa `change` a cada quadro (`src/bancada/criar-ambiente.js`), e a cada aviso a bancada reescreve o endereço com a câmera nova por `history.replaceState` (`componentes/endereco.js`), umas 60 vezes por segundo; o navegador passa a frear as trocas de endereço. O endereço passa a ser gravado só quando o giro ou o zoom terminam.

## Resultado

A janela "Abrir" lista cada objeto de várias partes como uma entrada que abre a montagem inteira; a tela perde o diagnóstico e as portas da aba Inspeção, o nome da peça com a luz e a dica de estado; o botão de configurações volta à direita do "Abrir", que mostra sempre o nome.

## Filtro Agent-First

- **Montagem em dados na bancada (ENVOLVER):** a bancada passa a abrir `montagem.json` pelo mesmo leitor que a auditoria usa (`src/autoria/ler-montagem-persistida.js`), sem um segundo leitor.
- **Remoções (USAR DIRETO):** os elementos saem da página e do código que os alimenta; o que a ferramenta ou o agente leem desses dados continua disponível pela linha de comando e pela sessão, e não pela tela.

## Incluído

- a janela "Abrir" com uma entrada por objeto de montagem, que abre a montagem inteira; as partes deixam de aparecer como entradas próprias, porque a árvore de objetos, o isolar e o ocultar já servem para ver uma parte sozinha;
- a saída do bloco de diagnóstico e de portas da aba Inspeção, mantendo o resto da aba (ver no contexto, isolar, arame, opacidade, explosão, focar);
- a saída de `.nome-peca` com a luz de estado e da `dicaEstado`;
- o botão de configurações de volta, à direita do "Abrir", no lugar do botão de atalhos; a lista de atalhos passa a ser uma seção da janela de configurações;
- o "Abrir" com o nome visível em qualquer largura de tela em que a barra cabe;
- a aba de referência com largura que mostra o botão e os campos inteiros;
- a saída dos temas Foco e Revisão e do seletor de tema, com a guarda `guarda:temas` ajustada ao arranjo único;
- o endereço com a câmera gravado só no fim do giro ou do zoom, com teste que conta as escritas durante um arrasto;
- as capturas da bancada para a pessoa aprovar por imagem.

## Excluído

- editar montagem pela bancada;
- mudanças nas visões de conferência, que são do [plano das visões](2026-10-30-visoes-de-conferencia-na-bancada.md).

## Gate de saída

1. Na janela "Abrir", `aviao` e `braco-robotico` aparecem como uma entrada cada uma e abrem as peças todas nas posições da montagem, com a árvore de objetos listando as partes.
2. Os pontos conferidos por teste de página e por captura, e aprovados pela pessoa por imagem.
3. Nenhuma guarda de navegador quebra; as que dependiam dos elementos removidos passam a ler o mesmo dado por outro caminho ou saem junto, com o motivo escrito.
4. `npm run gates` verde.

## Fatias

1. **Montagem na janela Abrir.** A varredura reconhece `montagem.json`, a entrada abre a montagem inteira, e a prova com o avião e o braço robótico.
2. **Barra, aba Inspeção e temas.** As remoções, o botão de configurações de volta com os atalhos dentro, o "Abrir" com nome, a aba de referência larga e a saída dos temas Foco e Revisão.
3. **Aprovação e fechamento.** As capturas para a pessoa e o plano movido para `encerrados/`.

## Riscos e parada

Se a bancada não conseguir posicionar as peças pela montagem em dados sem um segundo leitor de montagem, a fatia 1 para e volta à pessoa com o que falta.

## Fechamento

A preencher ao concluir ou cancelar.
