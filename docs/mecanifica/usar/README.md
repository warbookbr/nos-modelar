# Usar o Mecanifica

Esta pasta é para quem vai **usar** o Mecanifica: criar, inspecionar, corrigir
ou auditar uma peça. Não é preciso ler nada fora daqui para isso.

Quem vai **mudar** o Mecanifica — núcleo, gates, arquitetura, plano — entra por
[`../INDEX.md`](../INDEX.md) (`docs/mecanifica/INDEX.md`), não por aqui.

## Por onde começar

Comece pela skill da tarefa; ela diz os passos e aponta o documento certo na
hora certa. Os documentos abaixo são o contrato que as skills aplicam.

| se a tarefa é | skill | contrato |
| --- | --- | --- |
| criar ou refinar uma peça | `criar-peca` | [`GUIA-AUTORIA-IA.md`](GUIA-AUTORIA-IA.md), [`AUTORIA-RECEITA-DECLARATIVA.md`](AUTORIA-RECEITA-DECLARATIVA.md), [`INTENCAO-PECA-V1.md`](INTENCAO-PECA-V1.md) |
| conferir uma peça pronta | `auditar-peca` | [`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| conferir um conjunto montado | `auditar-montagem` | [`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| desenhar a prancha alvo | `desenhar-prancha` | [`CONTRATO-AUTORIA-PRANCHA.md`](CONTRATO-AUTORIA-PRANCHA.md) |
| modelar máquina ou equipamento | `modelar-maquina` | [`AUTORIA-RECEITA-DECLARATIVA.md`](AUTORIA-RECEITA-DECLARATIVA.md) |

## Leitura obrigatória antes de gerar forma

São onze arquivos. A lista que vale mora em `tools/mapa/leitura-obrigatoria.mjs`
e o gate de mesmo nome a confere; `npm run leitura:obrigatoria` imprime os onze
com tamanho e total. Aqui ficam só os que precisam de contexto para serem
usados, porque lista repetida em dois lugares envelhece em duas velocidades.

[`LACO-VISUAL.md`](LACO-VISUAL.md) reúne as quatro regras que valem em qualquer
tarefa que produza forma: olhar o PNG, sobrepor ao alvo, despachar o crítico sem
contexto e saber onde o método diagnóstico para de render.


[`GOTCHAS-AUTORIA-VISUAL.md`](GOTCHAS-AUTORIA-VISUAL.md) é o registro do que já
falhou e não pode se repetir. Malha fechada não é objeto bom, métrica verde não
aprova forma, e perspectiva bonita não compensa ortográfica ruim. Ler antes
custa minutos; descobrir depois já custou doze rodadas neste repositório.

[`METODO-DIAGNOSTICO-E-SEU-LIMITE.md`](METODO-DIAGNOSTICO-E-SEU-LIMITE.md) diz
onde o método de "observar, medir, corrigir" funciona e onde ele acha defeito
para sempre sem a forma andar. Vale ler quando os achados encolhem e a
qualidade não sobe.

[`PARAMETROS-VIVOS.md`](PARAMETROS-VIVOS.md): antes de alterar um número, saber
se aquele parâmetro está ligado em algo. `npm run parametros`.

[`CADEIRA-REALISTA-NOTAS.md`](CADEIRA-REALISTA-NOTAS.md) documenta o processo de
modelagem de uma cadeira de jantar realista contra referência fotográfica,
com problemas e limitações de motor e ferramentas anotados durante a criação.

## Regras que valem em qualquer tarefa daqui

- O núcleo de autoria é independente de Three.js e do domínio automotivo.
- ID interno, índice de array e posição de passo nunca são identidade
  persistida.
- Conteúdo salvo é determinístico, versionado, reexecutável e validável.
- Modele e revise na bancada neutra antes de levar ao produto.
- Nenhuma métrica aprova forma sozinha. Quem aprova forma é o usuário.
