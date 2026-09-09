# Bicicleta realista: diário de atrito da rodada

Diário ABERTO de uma rodada de modelagem que corre com dois objetivos ao mesmo
tempo: entregar a peça, e medir o Mecanifica de dentro enquanto ele é usado.

**Por que ele é escrito durante, e não no fim.** Atrito lembrado depois vira
opinião sobre o processo; atrito anotado no momento traz o comando que falhou, a
mensagem que veio e o que foi preciso fazer no lugar. A diferença aparece no
`ATRITOS-AUTORIA.md`: os itens que viraram capacidade são os que tinham
evidência anexada.

**O que entra aqui.** Operação que faltou e o contorno que foi usado. Mensagem de
erro que não disse o que fazer. Conta feita à mão que a ferramenta poderia ter
derivado. Comando repetido três vezes com o mesmo argumento. Rodada gasta num
defeito que uma medida já existente teria pego mais cedo. Documento consultado
que estava errado ou desatualizado.

**O que não entra.** Defeito da peça, que vive na receita e no veredito.

## Contrato da rodada

- Alvo: bicicleta nova, receita própria. `bicicleta-urbana` fica intocada: ela
  carrega o defeito `rodaDianteiraPneu ↔ tuboInferior`, e herdar isso
  contaminaria a medição.
- Referência: três fotos de produto de terceiros, entregues na sessão. **Elas não
  entram no repositório em hipótese alguma.** Só coordenadas derivadas, em
  `docs/mecanifica/referencias/`.
- Ordem: prancha alvo primeiro, depois geometria por módulo. Módulo aprovado é
  módulo que passou em `contexto`, nunca só em `isolar`.
- Cada módulo declara `contatos` ANTES de medir.

## Módulos previstos

| módulo | referência | estado |
|---|---|---|
| prancha alvo | tabela pública + fotos para caráter | **feita**, relatório sem alertas |
| quadro | prancha lateral | não começado |
| garfo de suspensão | foto frontal do garfo | não começado |
| roda | foto lateral | não começado |
| guidão e freios | foto de cima | não começado |
| transmissão | foto lateral | não começado |

## Atritos

Um por bloco, na ordem em que aconteceram. Formato: o que eu tentava fazer, o
que a ferramenta respondeu, o que eu fiz no lugar, e o que teria resolvido.

### 1. Referência que chega pela conversa não entra no laço de medição

**O que eu tentava fazer.** Calibrar a prancha contra as três fotos de produto,
como manda o passo 1 da skill, e comparar por região com
`prancha-referencia.mjs`.

**O que aconteceu.** A ferramenta lê um PNG do disco. As fotos chegaram pela
conversa e eu não tenho como gravá-las em arquivo. O caminho oficial de
"comparar com a referência por número" ficou indisponível, e o que sobrava era
estimar proporção olhando a foto — que a mesma skill proíbe no passo 1, e que já
custou doze rodadas neste repositório.

**O que fiz no lugar.** Troquei a fonte do alvo: geometria de bicicleta é
publicada como TABELA (entre-eixos, ângulos, balanço, diâmetro de roda), e
tabela não depende do meu olho. As fotos passaram a informar só caráter. Está
declarado em `autoria.procedencias` da prancha, com a incerteza
`sem-comparacao-por-numero`.

**O que teria resolvido.** Um jeito de materializar em disco uma imagem que
chega pela sessão. Enquanto não existir, toda referência fotográfica de sessão
fica fora do laço medido, e isso vale para qualquer rodada, não só esta.

### 2. O motor de prancha assume objeto com casca; bicicleta é esqueleto

**O que eu tentava fazer.** Usar as duas verificações mais fortes do motor:
`contornoFechado`, que encadeia os trechos num anel e acusa silhueta aberta, e a
coerência entre vistas, que compara lateral e frontal pelos eixos que elas
compartilham.

**O que aconteceu.** As duas dependem de um anel fechado. Bicicleta não tem
silhueta fechada — é quadro, garfo e rodas — e `medirCoerencia` pula a vista
quando `m.caixa` é nula, que é o caso sem anel. Perdi fechamento e coerência de
uma vez, sem nenhum alerta avisando que perdi.

**O que fiz no lugar.** Deixei sem contorno e declarei a incerteza
`esqueleto-sem-silhueta`. Declarar um contorno fechado para recuperar as
verificações seria ficção, e a skill nomeia esse movimento no checklist como o
pior defeito da lista.

**O que teria resolvido.** O motor aceitar envelope declarado como base da
coerência quando não há anel, em vez de silenciar. Hoje a ausência de
verificação é indistinguível de verificação que passou.

### 3. `imprimirRelatorio` devolve texto e não imprime

**O que aconteceu.** Chamei `imprimirRelatorio(relatorio)` e rodei; a saída veio
sem relatório nenhum. Só percebi porque estranhei o vazio.

**O que teria resolvido.** O nome dizer o que a função faz. A skill até escreve
"o script deve imprimir `imprimirRelatorio(relatorio)`", mas a frase só se lê
depois de já ter caído.

## Acertos que valem registrar

O que funcionou melhor do que eu esperava também é medida do projeto, e some se
ninguém escrever.

### 1. O contrato de autoria da prancha cobrou o que eu ia deixar implícito

`validarAutoriaPrancha` recusa a prancha sem fonte, evidência, confiança e
incerteza declaradas. Eu tinha as duas limitações acima na cabeça e teria
seguido sem escrevê-las; o contrato obrigou a escrever, e elas viraram os dois
atritos acima. Exigência estrutural produziu registro que a boa intenção não
produziria.
