# Fluxo do objeto

Um objeto de várias partes, como o braço robótico, é desenvolvido em cinco
etapas. Cada etapa tem quem faz, o que entra, o que sai e onde fica, e a saída
de uma é a entrada da seguinte. `npm run objeto -- <objeto>` lê o estado de
cada etapa na pasta do objeto e diz a próxima.

## As etapas, na ordem em que o objeto é produzido

**1. Alinhamento.** A pessoa e a IA combinam como o objeto funciona, as
partes, a escala, a ordem de montagem e o que fica fora do modelo. Skill
`alinhar-modelagem`. Sai `ALINHAMENTO.md`, a `montagem.json` com as etapas e o
`PLANO` de cada parte.

**2. Separação das partes.** O agente `desenhador-de-contorno` semeia cada
parte na imagem de referência, e o `critico-visual` julga o pacote pelo
roteiro, divisa por divisa. Nota 9 fecha, abaixo volta, até três rodadas, e
depois a pessoa decide. Skill `contorno-da-imagem`. Entra a imagem em
`referencias/`. Saem, ao lado dela, `<imagem>.regioes.json` com as sementes,
`<imagem>.contornos.json` com o contorno de cada parte em milímetro,
`<imagem>.pacote/` com a sobreposição a 20% e as folhas de divisa, e
`<imagem>.regioes.rodadas/`.

**3. Prancha.** O agente `desenhista-de-prancha` escolhe as cotas de cada
parte, confere a calibração e anota o que a imagem esconde, e o
`critico-visual` julga com a mesma regra. Skill `prancha-dos-contornos`. Entra
`<imagem>.contornos.json`. Saem `<imagem>.prancha.json` com as escolhas,
`<imagem>.prancha.svg` e `<imagem>.prancha.png`, e `<imagem>.prancha.rodadas/`.

**4. Modelagem por etapa.** Cada parte, na ordem da montagem, passa pelo laço
de modelagem, com um modelador novo e o crítico. Skill `laco-de-modelagem`.
Entram o `PLANO` da parte, as partes já fixas e o pacote de referência. Saem a
receita da parte e as rodadas dela.

**5. Aceite.** A pessoa aceita cada etapa, fechada pelo crítico ou, com
defeito em aberto, por aceite humano. `npm run etapas -- --fixar`. Sai o
registro `montagem.etapas.json`.

## O pacote de referência

O modelador e o crítico da modelagem recebem as mesmas três imagens, nesta
ordem:

1. a imagem de referência, como ela é;
2. a prancha limpa (`<imagem>.prancha.png`), com a silhueta, as partes e as
   cotas em milímetro, que dá a forma e a proporção;
3. a sobreposição a 20% (`<imagem>.pacote/sobreposicao.png`) e as folhas de
   divisa, que dão a separação entre as partes e o detalhe.

A ordem de entrega é diferente da de produção, porque a prancha sai dos
contornos da separação. Entregar as três ao crítico não fere a regra de não
contar como a peça foi feita: elas vêm da referência, e não da construção.
`npm run objeto` lista o caminho de cada uma.

## Regras que valem em todas as etapas

Quem produz não julga o próprio resultado, e o crítico não recebe a história
da construção. Toda conversa com crítico tem limite de rodadas, e depois dele
a decisão é da pessoa. Etapa com defeito em aberto só passa por aceite
humano. A saída de cada etapa fica em arquivo na pasta do objeto, para a
seguinte ler do disco em vez de depender de quem conduz lembrar.
