# Usar o Modelar

Esta pasta é para quem vai **usar** o Modelar: criar, inspecionar, corrigir
ou auditar uma peça. Fora dela, a leitura de uso são as skills e o catálogo
gerado de operações, que os roteiros entregam.

A entrada de qualquer tarefa é o `CLAUDE.md`, o contrato mínimo, e
`npm run comecar -- <roteiro>`, que diz o que ler. Quem vai **mudar** o
Modelar (núcleo, gates, arquitetura, plano) segue o roteiro `mudar`, que separa
o trabalho do plano da correção de um defeito.

## Por onde começar

O roteiro entrega a skill da tarefa, e ela diz os passos e aponta o documento
certo na hora certa. Os documentos abaixo são o contrato que as skills aplicam;
o que se lê antes de começar é o que o roteiro diz.

| se a tarefa é | skill | contrato |
| --- | --- | --- |
| conduzir um objeto de várias partes, da imagem à montagem | `npm run objeto` e as skills de cada etapa | [`FLUXO-DO-OBJETO.md`](FLUXO-DO-OBJETO.md) |
| combinar o que modelar, antes do primeiro passo | `alinhar-modelagem` | a própria skill; um caso respondido em [`RODADA-DE-ALINHAMENTO-EXEMPLO.md`](RODADA-DE-ALINHAMENTO-EXEMPLO.md) |
| criar ou refinar uma peça | `criar-peca` | [`AUTORIA-DE-PECA.md`](AUTORIA-DE-PECA.md), [`GUIA-AUTORIA-IA.md`](GUIA-AUTORIA-IA.md), [`AUTORIA-RECEITA-DECLARATIVA.md`](AUTORIA-RECEITA-DECLARATIVA.md), [`INTENCAO-PECA-V1.md`](INTENCAO-PECA-V1.md) |
| conferir uma peça pronta | `auditar-peca` | [`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| conferir um conjunto montado | `auditar-montagem` | [`MONTAGENS-SEMANTICAS.md`](MONTAGENS-SEMANTICAS.md) |
| parar e analisar uma forma antes de declará-la pronta | `olhar-bancada --analise` | [`PARE-E-ANALISE.md`](PARE-E-ANALISE.md) |
| parar e analisar um esboço de opções antes de mostrá-lo | `esboco --analise` | [`PARE-E-ANALISE.md`](PARE-E-ANALISE.md#esboço) |
| esboçar um objeto inteiro em formas primitivas, com crítico entre unidades (opcional: só objeto sem forma de referência, por escolha da pessoa) | `esboco-detalhado` (quem esboça) e `laco-do-esboco` (quem conduz) | [`PARE-E-ANALISE.md`](PARE-E-ANALISE.md#esboço) |
| desenhar a prancha alvo | `desenhar-prancha` | [`CONTRATO-AUTORIA-PRANCHA.md`](CONTRATO-AUTORIA-PRANCHA.md) |
| trazer de volta um ajuste feito na bancada | `absorver-ajuste-da-bancada` | [`AJUSTE-DA-BANCADA.md`](AJUSTE-DA-BANCADA.md) |

## Documentos que pedem contexto

A leitura obrigatória é a de cada ramo de `npm run comecar -- modelar/peca`, e o
gate `leitura:obrigatoria` a confere contra o orçamento. Aqui ficam os documentos
que o roteiro abre sob demanda e que precisam de uma frase sobre quando servem.

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
