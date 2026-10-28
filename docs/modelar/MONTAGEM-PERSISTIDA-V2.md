# Montagem persistida v2

Contrato executável para declarar relações mecânicas locais entre instâncias
de peças em montagens v1/v2, preservando identidade semântica e composição
recursiva.

## Forma persistida

O documento usa `formato: mecanifica.montagem`, `versao: 2`, `id`, `instancias`
e `relacoes`. `instancias` preserva a forma da v1. Cada relação tem `id` único,
`tipo`, `referencia`, `movel` e `especificacao`. Cada endpoint é
`{ caminho: [ids de instância], porta: id-da-porta }`, relativo à montagem que
declara a relação, e termina em uma instância de peça.

Os tipos suportados são:

- `encaixaCilindrico`: `folgaRadial { nominal, toleranciaFabricacao { menos, mais } }` e `toleranciaNumerica`;
- `assentaAnular`: `sobreposicaoRadial`, `sobreposicaoAxial` e `toleranciaNumerica`, usando a mesma forma de faixa.

Todos os números devem ser finitos e não negativos; a faixa nominal menos a
tolerância inferior não pode ser negativa.

## Forma resolvida

Cada relação resolvida mantém `id`, `tipo`, endpoints semânticos (`referencia`
e `movel`), `especificacao`, `satisfeita`, `medidas` e `diagnosticos`.
Endpoints resolvidos apontam para as instâncias da árvore por identidade. A
relação pode ser mecanicamente reprovada com `satisfeita: false`, medidas e
diagnósticos.

Erro estrutural — versão, tipo, ID, caminho, endpoint, porta ou especificação
inválidos — falha fechado com exceção e diagnóstico; não produz árvore parcial.
Reprovação mecânica é resultado válido e não interrompe as demais relações.

Montagens v1 continuam legíveis e resolvíveis sem `relacoes`; montagens v1 e v2
podem coexistir recursivamente. A resolução é determinística, não muta as
entradas e não copia geometria ou autoria para a montagem.

Este contrato não inclui solver, correção ou prévia de pose, mapa global,
contexto, revalidação automática, writer, CLI ou MCP de autoria.
