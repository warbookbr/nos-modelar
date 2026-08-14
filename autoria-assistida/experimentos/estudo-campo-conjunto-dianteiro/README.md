# Estudo de campo — conjunto dianteiro mínimo

## Pergunta

Até onde uma IA consegue criar, montar, inspecionar, alterar e revalidar um
pequeno sistema mecânico usando somente os contratos e as ferramentas atuais da
Mecanifica?

As peças deste estudo são instrumentos de prova. Não são ativos de produto e
não buscam fidelidade automotiva.

## Recorte

O conjunto possui seis peças procedurais independentes:

- eixo;
- cubo;
- disco de freio;
- pinça;
- aro;
- pneu.

A composição usa duas montagens filhas (`freio` e `roda`) e uma montagem raiz.
As relações executáveis esperadas são:

1. eixo no cubo — `encaixaCilindrico`;
2. piloto do cubo no aro — `encaixaCilindrico`;
3. disco no flange do cubo — `assentaAnular`;
4. aro no pneu — `assentaAnular`.

A folga entre disco e pinça é intencionalmente observável, mas não é simulada
com um tipo de relação inexistente.

## Rodadas

### R001 — construção

1. escrever as seis receitas em `PASSOS`;
2. descrever cada peça em modo estrito;
3. renderizar e ler as quatro vistas canônicas;
4. resolver a montagem v2 e registrar relações e diagnósticos;
5. tentar inspecionar visualmente interfaces entre instâncias.

### R002 — alteração localizada

1. aumentar o raio externo do disco sem mudar seu assento no cubo;
2. repetir descrição e vistas do disco;
3. reexecutar as relações persistidas;
4. verificar se o sistema descobre a redução de folga com a pinça;
5. comparar a revisão com a anterior.

## Evidência e classificação

Cada achado deve registrar comando, resultado e uma decisão Agent-First:

- `USAR DIRETO`;
- `ENVOLVER`;
- `REFATORAR`;
- `ADIAR`.

O relatório final fica em
[`docs/mecanifica/RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md`](../../../docs/mecanifica/RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md).

## Reprodução sem publicação

As receitas ficam em `receitas/`, fora do catálogo público de peças. O
resolvedor e as duas rodadas são reproduzidos por:

```bash
node autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/executar-estudo.mjs --disco-raio=0.140 --resumo
node autoria-assistida/experimentos/estudo-campo-conjunto-dianteiro/executar-estudo.mjs --disco-raio=0.165 --resumo
```

As vistas já lidas estão em `evidencias/`. Recapturá-las pelas CLIs atuais
exige inserir temporariamente uma receita no catálogo de `pecas/`; essa própria
limitação é um achado do estudo, não uma etapa recomendada de publicação.
