# Relatório N4 — sonda de autoria por restrição

**Decisão:** aprovar novamente a viabilidade estreita de C2 após corrigir uma
crista central C0; N5 pode provar C3 somente em alvo sintético, e N6 permanece
bloqueada.

N4 não produz um veículo. Ela prova somente que uma representação limpa pode
gerar duas seções diferentes a partir do mesmo enunciado, sem reparar R2B,
cupê livre ou o quarto histórico depois de prontos.

## Enunciado fechado

As duas seções, `compacto` e `gran-turismo`, satisfazem exatamente estas três
restrições:

1. o ponto mais largo fica abaixo e para fora do ombro;
2. o capô usa uma base suave, não tem cavidade e mantém G1 no plano central;
3. a tangente do capô é reutilizada pelo flanco no ombro, garantindo G1.

O construtor é uma família de curvas contínuas: base `smoothstep` no capô,
bojo com derivadas nulas nos extremos, flanco de Hermite e coroamento
longitudinal amostrado. Não há solver geral nem coordenada histórica escondida.

### Correção obrigatória da primeira versão

A primeira fórmula comparava o capô à corda entre centro e ombro. Ao espelhar
a seção, ela produzia uma crista pontuda C0 no centro; o P95 aprovava porque
o defeito era local. A imagem individual revelou o problema e aquele aceite foi
revogado. A fórmula atual garante tangente nula no centro e no ombro, e o gate
agora exige também diedro máximo de até 19°, não só P95/parcela abrupta.

## Resultado verificável

| Seção | Restrições | C1 p95 | C1 máximo | Abrupta |
|---|---:|---:|---:|---:|
| compacto | 3/3 | 4,771° | 18,704° | 0% |
| gran-turismo | 3/3 | 4,834° | 15,903° | 0% |

As doze imagens obrigatórias foram abertas individualmente: zebra nas quatro
vistas, isófota e curvatura por seção. O aceite em
[`inspecao-individual.json`](../../autoria-assistida/experimentos/sonda-restricoes-n4/evidencias/inspecao-individual.json)
é vinculado por SHA-256 ao manifesto; uma regeneração diferente retorna o gate
para pendente. Procedência estrutural passou sem usar `declarado`.

## Limite e próximo gate

N4 aprova **somente** a sonda de C2: a lista fechada de três restrições cabe em
uma representação limpa e é verificável. Não prova solver geral, proporção de
veículo, G02, nem qualidade de carroceria completa.

A N5 declarou e testou uma liberdade residual (`bojoRelativo`) e um objetivo
medido sintético. Isso prova o mecanismo C3, não a escolha de estilo de um
veículo. N6 precisa antes de alvo automotivo vinculante, briefing visual e
crítica independente; N4/N5 isoladas não a liberam.

## Verificação executada

```text
npx vitest run autoria-assistida/experimentos/sonda-restricoes-n4/sonda-restricoes-n4.test.mjs
# 2 testes verdes
node autoria-assistida/experimentos/sonda-restricoes-n4/gerar-evidencias.mjs
# gate N4: passa
npm run procedencia:check -- autoria-assistida/experimentos/sonda-restricoes-n4/fonte-n4.json
# passa
```
