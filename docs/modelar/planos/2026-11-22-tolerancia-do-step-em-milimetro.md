# Tolerância do STEP em milímetro: a peça pequena exporta sem bandeira

**Estado:** rascunho

**Território:** a declarar ao ativar: `modulos/exportador-cad/`, `tools/modelar/exportar-step.mjs` e o teste dele, `docs/modelar/banco-de-provas/tolerancia-do-step-2026-11-22/`.

**Responsável:** a IA da sessão na nuvem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-22.

## Problema observado

`npm run exportar:step` recusa peças pequenas com "Face tem área abaixo da tolerância". O parafuso M8 e a mola da família, e a peça neutra `tools/fixtures/helice/`, só passam com `--tolerancia=0.00001`. A causa está em dois pontos. `validarMalha` compara a área de cada triângulo com o quadrado da tolerância no neutro, que está em metro, antes da escala: a tolerância padrão de 0,001 vira 1 mm², e toda face menor que isso é recusada. E o backend costura as faces com `tolerancia × fator`, e o fator leva metro a milímetro: a costura padrão é de 1 mm, larga demais para uma peça de 3 mm. O [dossiê do STEP](../pesquisas/DOSSIE-EXPORTACAO-CAD-STEP.md) diz que a tolerância é expressa na unidade de saída, e o código a usa na unidade do neutro; a ajuda do comando não diz a unidade. O processo não pegou isso porque nenhum teste exporta uma peça pequena.

## Resultado

A tolerância vale na unidade de saída nos três usos (área mínima, costura e impressão geométrica), e o parafuso, a mola e a peça neutra da hélice exportam com o padrão, sem bandeira.

## Filtro Agent-First

REFATORAR pequeno: `validarMalha` passa a receber o fator de escala e compara a área já na unidade de saída, e o backend costura com a tolerância como veio. A interface do comando não muda; muda o sentido do número, que passa a ser o que o dossiê já diz.

## Incluído

1. A medida antes: cada peça do acervo exportada com `--somente-validar` e com a exportação completa, com o padrão de hoje, gravando quais passam, o número de corpos e a impressão geométrica, no banco de provas.
2. A correção em `validarMalha` e no backend, com teste de peça pequena (o parafuso M8 da família `fixador` e um cubo de 1 mm) que falha hoje e passa depois.
3. A medida depois, com a comparação: nenhuma peça que passava deixa de passar, e a diferença de impressão de cada uma explicada.
4. A ajuda do comando e o dossiê do STEP dizendo a unidade da tolerância, e o item tirado do backlog.

## Excluído

A exportação sólida (B-rep não facetado), outros formatos e a unidade padrão do comando.

## Invariantes

Toda peça do acervo que exporta hoje continua exportando, com o mesmo número de corpos. A malha das peças não muda: a correção é só do exportador.

## Gate de saída

1. A tabela antes e depois no banco de provas, sem peça que passe a falhar.
2. O teste da peça pequena e o teste de unidade da tolerância (a mesma peça em mm e em m dá a mesma decisão).
3. `npm run gates` e o CI verdes.

## Fatias

1. A medida antes, no acervo inteiro.
2. A correção e os testes.
3. A medida depois, a documentação e o fechamento.

## Riscos e parada

Se a costura a 0,001 mm deixar de fechar alguma peça do acervo que fechava a 1 mm, a peça mostra uma costura que dependia da tolerância larga: o plano para e leva a lista à pessoa antes de mudar o padrão. Se a exportação do acervo inteiro passar de 15 minutos, a medida roda em partes.

## Fechamento

Preencher somente ao concluir ou cancelar.
