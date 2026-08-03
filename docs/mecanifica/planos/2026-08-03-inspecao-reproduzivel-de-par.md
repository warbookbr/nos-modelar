# AUT-2026-19 — inspeção reproduzível de par

**Estado:** pronto

**Responsável:** Codex

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`codex/concluir-pendencias-autoria`, base `845d430`.

## Problema observado

Na prova sem contexto posterior ao `AUT-2026-18`, um agente encontrou a
subárvore `pinca` na primeira consulta e isolou `pastilhaInterna` e `pistao` na
primeira execução da bancada. Porém, `--focar` enquadrou as capturas sem colocar
essa câmera na URL; quem abre o link recebe a seleção e o isolamento, mas não o
mesmo recorte. A vista isométrica escolhida também ocultou quase todo o pistão
atrás da pastilha. Além disso, o índice não avisa junto do comando que
`npm run bancada` grava PNGs em `tools/bancadas/out/`.

## Resultado

Uma IA pede a inspeção de exatamente duas partes e recebe capturas e uma URL
que reproduzem o mesmo enquadramento legível, sem mover a geometria nem criar
estado de montagem.

## Incluído

- fazer a URL emitida por `--focar` reutilizar o contrato existente de câmera
  livre reproduzível;
- declarar no guia de entrada que `npm run bancada` grava capturas;
- um modo explícito de inspeção de duas partes semânticas;
- escolha determinística de uma vista legível entre candidatos limitados;
- prova visual com `pastilhaInterna` e `pistao` e prova neutra fora do domínio
  automotivo.

## Excluído

- deslocar, explodir ou alterar a geometria para desocultar uma parte;
- inferir conexão mecânica, contato ou importância das partes;
- aceitar mais ou menos de duas partes no modo novo;
- criar pose, montagem, animação, solver ou novo formato persistido;
- substituir vistas escolhidas explicitamente pelo autor.

## Gate de saída

1. a URL de uma captura focada reabre seleção, modo e câmera equivalentes;
2. o modo de par aceita exatamente dois nomes semânticos válidos e mantém ordem
   determinística;
3. a vista automática mostra pixels visíveis das duas partes, vence a vista
   isométrica ruim do caso pinça e explica qual vista escolheu;
4. empates e casos sem vista suficiente têm resultado estável e diagnóstico,
   sem deslocar peças;
5. a documentação avisa, antes da execução, que a ferramenta grava PNGs e onde;
6. um agente Sol sem contexto conclui consulta e inspeção em uma tentativa de
   cada, e o link reproduz o resultado;
7. testes, tipos, build, guardas de câmera, documentação e mapa passam.

## Fatias

1. congelar a falha: provar que `--focar` não serializa a câmera calculada;
2. serializar a câmera pelo contrato já entregue no `AUT-2026-05`, com regressão
   para vistas e URLs existentes;
3. tornar explícita, ao lado do comando, a geração de PNGs;
4. medir a visibilidade de exatamente duas partes nas vistas candidatas e
   escolher uma delas de forma determinística;
5. expor o modo de inspeção de par sem mudar a geometria;
6. validar no caso pinça, numa fixture neutra e com um Sol sem contexto;
7. encerrar o plano e devolver qualquer ampliação ao backlog.

## Riscos e parada

Se tornar as duas partes legíveis exigir afastá-las, abrir uma montagem ou
inferir sua relação, o plano para: isso é apresentação de montagem, não escolha
de câmera. Se a câmera focada não couber no contrato de URL existente, o plano
também para antes de criar parâmetros concorrentes. Heurísticas abertas de
“melhor ângulo” não entram; os candidatos, a métrica e o desempate precisam ser
enumeráveis e testáveis.

## Fechamento

Preencher somente ao concluir ou cancelar: estado final, commit/PR, gates,
resultado observado e candidatos devolvidos ao backlog.
