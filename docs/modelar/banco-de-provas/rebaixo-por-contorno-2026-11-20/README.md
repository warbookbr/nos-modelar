# Rebaixo por contorno: provas do ajudante e aplicação no `carro-quadrado`

Registro das fatias 1 a 4 do plano [rebaixo por contorno](../../planos/2026-11-10-rebaixo-por-contorno.md), medidas em 2026-11-21.

## O que entrou

O ajudante `rebaixoPorContorno` (`procedural/nucleo/rebaixo-por-contorno.js`) emite os passos (`arranja`, `extrusao`, `subtrair`, `limparLascas` e opcionalmente `arredondarCostura`) que rebaixam, numa vista (`x`, `y` ou `z`, nos sentidos `+` e `-`), a região de um contorno fechado, uma faixa de largura dada em volta dele ou um sulco ao longo de uma linha aberta, a uma profundidade ao longo da vista, com o fundo acompanhando a superfície original do corpo.

A técnica é `corpo - (prisma - copia(corpo, ±profundidade))`. Como o plano previu em "Riscos e parada", a fatia 1 mediu três fatos antes de implementar:

1. `arranja` copia passos de `subdivisao` diretamente (usando `derivaDe` e `copia: 0`), sem precisar reemitir a gaiola.
2. A booleana do corpo inteiro leva ~130 ms no bloco curvo subdividido de 880 faces e ~23 s no `carro-quadrado/lataria` completo (com importação da receita em 1,91 s).
3. `arredondarCostura` arredonda a costura do rebaixo diretamente em corpos planos/extrudados (com zero órfãos e zero reprovas em `arestas: 'internas'`), enquanto em superfícies subdivididas curvas com faces pequenas o raio pode recusar por lasca na tampa — nesse caso o ajudante entrega o rebaixo limpo com `limparLascas`.

## Provas no corpo de prova neutro e no `carro-quadrado`

| Verificação | Resultado |
|---|---|
| `npx vitest run procedural/nucleo/rebaixo-por-contorno.test.mjs` | 7/7 testes verdes em 0,58 s |
| Profundidade em 9 pontos no fundo do rebaixo (bloco curvo subdividido 400 × 400 × 40 mm, pedido 10 mm) | erro máximo < 0,5 mm em todos os 9 pontos; superfície externa fora do rebaixo inalterada (< 0,01 mm) |
| Faixa em volta (`largura: 25 mm`, `profundidade: 8 mm`) e sulco (`largura: 20 mm`, `profundidade: 6 mm`) | 0 órfãos, 0 reprovas de topologia, miolo intacto na faixa |
| Vistas `x`, `y` e `z` nos dois sentidos (`+` e `-`) e raio via `arredondarCostura` | 0 órfãos, 0 reprovas de topologia |
| Revisão adversarial (3 achados corrigidos) | validação prévia de pontos coincidentes, contorno degenerado/colinear, auto-intersecção em contorno e em dobra aguda de sulco, e documentação explícita de `profundidade < espessura` e confinamento de `centroDaVista`/`comprimento` em corpos ocos |
| `carro-quadrado/lataria` (rebaixo de 4 mm da placa traseira na tampa de 8 mm) | `guarda:acervo ok` (23 s), `medir-importar-receita` 1,91 s, 0 órfãos, 0 reprovas |
| `npm run recusas:check` e `npm run arquitetura:check` | ambos verdes |
