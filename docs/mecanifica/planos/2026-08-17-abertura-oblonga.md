# Abertura oblonga — rasgo como forma de primeira classe

**Estado:** concluído

**Responsável:** execução assistida por IA

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/abertura-oblonga` sobre `main`.

## Problema observado

`docs/mecanifica/INDEX.md` listava "expressar abertura oblonga sem simulação
visual" como pendência, e
[`RELATORIO-ANALISE-GRANDES-MELHORIAS.md`](../RELATORIO-ANALISE-GRANDES-MELHORIAS.md)
a classificava entre as lacunas geométricas que "limitam peças reais", a serem
fechadas uma por vez, com peça de prova.

O rasgo é a abertura de regulagem: o furo alongado por onde o parafuso desliza
antes do aperto. Sem ele, a única saída era SIMULAR — dois furos redondos
vizinhos e a esperança de que a foto parecesse um rasgo. Simular contradiz o
repositório inteiro: a peça mediria duas aberturas onde a máquina real tem uma,
e a medida mentiria para quem consultasse a peça depois.

## Resultado

`furo` aceita `ate`, o segundo centro, e o anel deixa de ser um círculo para ser
um **estádio**: meia-volta de raio `raio` em cada extremo, ligadas por dois
lados retos. A largura sai exata (`2·raio`) e o comprimento é inscrito, como o
diâmetro de um furo redondo já era.

## Decisão de projeto

O rasgo **não** é operação nova nem família de endereço nova. Ele gasta os
mesmos `lados` pontos do círculo, e é só por isso que `borda`, `parede`,
`saida`, `tampa`, `preenchimento`, `furo` e `grupo` continuam valendo palavra
por palavra. Uma receita que endereçava furo redondo continua endereçando.

A alternativa recusada foi criar uma op `rasgo` própria. Ela duplicaria margem,
sobreposição, partição, projeção de saída e o bloco de ids — cinco maquinários
já provados — para entregar a mesma superfície com um segundo vocabulário de
endereço, contra o que o AGENT-FIRST pede em composição e custo de contexto.

## Filtro Agent-First

| Interface | Decisão | Razão |
|---|---|---|
| `furo` (anel, margem, partição, saída, tampa) | **USAR DIRETO** | o maquinário já é genérico sobre "anel fechado de L pontos"; só a geração do anel supunha círculo |
| eixos de endereço do `furo` | **USAR DIRETO** | o rasgo não acrescenta região; endereço estável sobrevive sem contrato novo |
| `lados: {desvio}` | **ENVOLVER** | um extremo com `n` pontos cobre meia-volta em `n−1` cordas; o passo compensa com dois pontos para que o desvio continue promessa em metros |
| op `rasgo` separada | **ADIAR** (recusada) | duplicaria maquinário provado e um segundo vocabulário de endereço |
| costuras de `lathe`, endereço de grupo linear | **ADIAR** | lacunas vizinhas, uma por vez conforme o relatório de melhorias |

## Incluído

- `ate` no passo `furo`, na forma de topo (`centro` + `ate`) e dentro de
  `centros` (`{nome?, centro, ate, raio?, profundidade?}`);
- compensação de dois pontos quando `lados` vem de `{desvio}`;
- recusa de comprimento zero e de menos de quatro lados;
- peça de prova `_rasgo-oblongo` com rasgo passante agrupado, rasgo cego e furo
  redondo no mesmo passo;
- `tools/mecanifica/rasgo-oblongo.test.ts` com 16 provas.

## Excluído

- op `rasgo` separada;
- rasgo de largura variável, curvo ou com mais de dois extremos;
- chanfro ou filete de borda de rasgo;
- costuras de `lathe`, endereço de grupo linear e materiais canônicos;
- qualquer mudança em peça publicada.

## Gate de saída

1. **comportamento mensurável** — largura exata em `±raio` nas duas mãos,
   comprimento inscrito e nunca maior que o nominal, quatro pontos na largura
   máxima (dois por reta), direção obedecida fora dos eixos do mundo;
2. **compatibilidade e determinismo** — as 36 peças anteriores permanecem
   byte-idênticas ao gabarito; a peça nova repete a mesma malha entre execuções;
3. **prova visual** — vistas superior e isométrica de `_rasgo-oblongo`, com o
   rasgo cego mostrando fundo;
4. **testes e documentação** — 16 provas novas, contrato de origem do `furo`
   atualizado no núcleo, `ate` classificado no inventário de chaves;
5. **decisão Agent-First registrada** — tabela acima.

## Fechamento

Os gates completos de [`../INDEX.md`](../INDEX.md) passaram: 83 arquivos de
teste, 1.281 aprovados e 2 ignorados; typecheck, build, porteiro 7/7, gabarito
de seleção com 37 peças byte-idênticas, id cru, exportação, mapa, índice,
links, planos e criação de `_viga`.

O erro de corda do estádio foi medido contra o do círculo sob o mesmo desvio
pedido (0,00005 m): ambos 0,000048153 m, o que só é verdade por causa da
compensação de dois pontos. Sem ela, pedir acabamento fino num rasgo entregaria
acabamento grosso em silêncio.

**Decisão: aprovar.** Continuam fora, e sem abertura automática, as costuras de
`lathe`, o endereço único de grupo linear, o contrato genérico de materiais e o
Caso 3 da homologação.
