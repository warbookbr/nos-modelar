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
| quadro | foto lateral | não começado |
| garfo de suspensão | foto frontal do garfo | não começado |
| roda | foto lateral | não começado |
| guidão e freios | foto de cima | não começado |
| transmissão | foto lateral | não começado |

## Atritos

Um por bloco, na ordem em que aconteceram. Formato: o que eu tentava fazer, o
que a ferramenta respondeu, o que eu fiz no lugar, e o que teria resolvido.

<!-- primeiro atrito entra aqui -->

## Acertos que valem registrar

O que funcionou melhor do que eu esperava também é medida do projeto, e some se
ninguém escrever.

<!-- primeiro acerto entra aqui -->
