# Usar o Mecanifica

Esta pasta é para quem vai **usar** o Mecanifica: criar, inspecionar, corrigir
ou auditar uma peça. Não é preciso ler nada fora daqui para isso.

As regras que valem em qualquer tarefa estão no `CLAUDE.md`.

Quem vai **mudar** o Mecanifica — núcleo, gates, arquitetura, plano — entra por
[`../INDEX.md`](../INDEX.md) (`docs/mecanifica/INDEX.md`), não por aqui.

## Por onde começar

Comece pela skill da tarefa; ela diz os passos e aponta o documento certo na
hora certa. Os documentos abaixo são o contrato que as skills aplicam.

| se a tarefa é | skill | contrato |
| --- | --- | --- |
| conduzir um objeto de várias partes, da imagem à montagem | `npm run objeto` e as skills de cada etapa | [`FLUXO-DO-OBJETO.md`](FLUXO-DO-OBJETO.md) |
| combinar o que modelar, antes do primeiro passo | `alinhar-modelagem` | [`RODADA-DE-ALINHAMENTO-EXEMPLO.md`](RODADA-DE-ALINHAMENTO-EXEMPLO.md) |
| criar ou refinar uma peça | `criar-peca` | [`GUIA-AUTORIA-IA.md`](GUIA-AUTORIA-IA.md), [`AUTORIA-RECEITA-DECLARATIVA.md`](AUTORIA-RECEITA-DECLARATIVA.md), [`INTENCAO-PECA-V1.md`](INTENCAO-PECA-V1.md) |
| conferir uma peça pronta | `auditar-peca` | [`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| conferir um conjunto montado | `auditar-montagem` | [`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| parar e analisar uma forma antes de declará-la pronta | `olhar-bancada --analise` | [`PARE-E-ANALISE.md`](PARE-E-ANALISE.md) |
| parar e analisar um esboço de opções antes de mostrá-lo | `esboco --analise` | [`PARE-E-ANALISE.md`](PARE-E-ANALISE.md#esboço) |
| esboçar um objeto inteiro em formas primitivas, com crítico entre unidades (opcional: só objeto sem forma de referência, por escolha da pessoa) | `esboco-detalhado` (quem esboça) e `laco-do-esboco` (quem conduz) | [`PARE-E-ANALISE.md`](PARE-E-ANALISE.md#esboço) |
| desenhar a prancha alvo | `desenhar-prancha` | [`CONTRATO-AUTORIA-PRANCHA.md`](CONTRATO-AUTORIA-PRANCHA.md) |
| trazer de volta um ajuste feito na bancada | `absorver-ajuste-da-bancada` | [`AJUSTE-DA-BANCADA.md`](AJUSTE-DA-BANCADA.md) |

## Leitura obrigatória antes de gerar forma

A lista que vale é a do roteiro `modelar/peca`, em `docs/mecanifica/roteiros/`,
e o gate `leitura:obrigatoria` a confere contra o orçamento. Aqui ficam só os
que precisam de contexto, porque lista repetida envelhece em duas velocidades.

[`LACO-VISUAL.md`](LACO-VISUAL.md) reúne as quatro regras que valem em qualquer
tarefa que produza forma: olhar o PNG, sobrepor ao alvo, despachar o crítico sem
contexto e saber onde o método diagnóstico para de render.

[`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md) é o registro do que já
falhou e não pode se repetir. Ler antes
custa minutos; descobrir depois já custou doze rodadas neste repositório.

[`METODO-DIAGNOSTICO-E-SEU-LIMITE.md`](METODO-DIAGNOSTICO-E-SEU-LIMITE.md) diz
onde "observar, medir, corrigir" acha defeito para sempre sem a forma andar.

[`CONFERIR-CONTRA-REFERENCIA.md`](CONFERIR-CONTRA-REFERENCIA.md): com foto e sem
prancha, `npm run conferir:referencia` mede a borda em milímetro e separa erro
de inclinação de erro de altura.

[`PARAMETROS-VIVOS.md`](PARAMETROS-VIVOS.md): antes de alterar um número, saber
se aquele parâmetro está ligado em algo. `npm run parametros`.
