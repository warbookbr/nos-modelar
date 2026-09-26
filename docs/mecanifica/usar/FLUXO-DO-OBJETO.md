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

**2. Mapear as partes.** O agente `desenhador-de-contorno` semeia cada
parte na imagem de referência, e o `critico-visual` julga o pacote pelo
roteiro, divisa por divisa. Nota 9 fecha, abaixo volta, até três rodadas, e
depois a pessoa decide. Skill `contorno-da-imagem`. Entra a imagem em
`referencias/`. Saem, ao lado dela, `<imagem>.regioes.json` com as sementes,
`<imagem>.contornos.json` com o contorno de cada parte em milímetro,
`<imagem>.pacote/` com o mapa de partes (`mapa-de-partes.png`, cada parte pintada a 20% por cima da imagem, com número e nome) e as folhas de divisa, e
`<imagem>.regioes.rodadas/`.

**3. Prancha.** O agente `desenhista-de-prancha` escolhe as cotas de cada
parte, confere a calibração e anota o que a imagem esconde, e o
`critico-visual` julga com a mesma regra. Skill `prancha-dos-contornos`. Entra
`<imagem>.contornos.json`. Saem `<imagem>.prancha.json` com as escolhas,
`<imagem>.prancha.svg` e `<imagem>.prancha.png`, `<imagem>.prancha.pacote/roteiro.md`
com uma etapa por parte para o crítico, e `<imagem>.prancha.rodadas/`. O
desenhista só corrige defeito do tipo `cota`; defeito de forma de contorno
(`superficie`, `comprimento` e os outros tipos de geometria) apontado na
prancha volta para o mapa de partes, porque o contorno vem dela. Medida que a vista
esconde vem de outra imagem de referência do mesmo objeto, com contornos
próprios; nota de texto sem número deixa a medida em falta. Toda parte
declara largura e altura, medida, por `origem` ou `medivel: false` com
motivo; faltando alguma, o comando para com código 4 e lista as faltas por
parte, e o roteiro do crítico traz as duas cotas esperadas de cada parte.

**Papel de cada imagem.** Com mais de uma imagem de referência, o arquivo
`papeis.json` da pasta `referencias/` declara o papel de cada uma:
`{ "imagens": { "<imagem>": { "papel": "principal" | "apoio" | "substituida", "motivo": "...", "por": "..." } } }`.
A `principal` passa pelas etapas 2 e 3. A de `apoio` passa só pela etapa 2 e
dá medidas à prancha principal por `origem`. A `substituida` fica fora das
etapas e declara `por` qual imagem e o `motivo`. Apoio e substituída exigem
motivo. Sem o arquivo, ou para imagem que ele não cita, toda imagem com
regiões é principal. `npm run objeto` lê esse arquivo.

**4. Modelagem por etapa.** Cada parte, na ordem da montagem, passa pelo laço
de modelagem, com um modelador novo e o crítico. Skill `laco-de-modelagem`.
Entram o `PLANO` da parte, as partes já fixas e o pacote de referência. Saem a
receita da parte e as rodadas dela.

**5. Aceite.** A pessoa aceita cada etapa, fechada pelo crítico ou, com
defeito em aberto, por aceite humano. `npm run etapas -- --fixar`. Sai o
registro `montagem.etapas.json`. Só a pessoa reabre uma etapa fixa, com
`npm run etapas -- <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"`;
a etapa volta a aberta, o aceite e a receita antigos ficam em `reaberturas`, e o
comando recusa etapa não fixa e etapa com posterior fixa, que se reabre antes,
da última para a primeira.

## O pacote de referência

O modelador e o crítico da modelagem recebem as mesmas três imagens, nesta
ordem:

1. a imagem de referência, como ela é;
2. a prancha (`<imagem>.prancha.png`), o desenho limpo sem a foto, com a silhueta, as partes e as
   cotas em milímetro, que dá a forma e a proporção;
3. o mapa de partes (`<imagem>.pacote/mapa-de-partes.png`) e as folhas de
   divisa, que dão a divisa entre as partes e o detalhe.

A ordem de entrega é diferente da de produção, porque a prancha sai dos
contornos do mapa de partes. Entregar as três ao crítico não fere a regra de não
contar como a peça foi feita: elas vêm da referência, e não da construção.
`npm run objeto` lista o caminho de cada uma.

## Regras que valem em todas as etapas

Quem produz não julga o próprio resultado, e o crítico não recebe a história
da construção. Toda conversa com crítico tem limite de rodadas, e depois dele
a decisão é da pessoa. Etapa com defeito em aberto só passa por aceite
humano. No mapa de partes e na prancha o aceite é gravado com
`--aceite-humano --por="<quem, data: motivo>" --pendencias="<texto>"`, que
guarda em `aceite.json` na pasta de rodadas quem aceitou, quando, a última
nota, os defeitos em aberto e as pendências; nas etapas da montagem é o
`--aceite-humano` de `etapas-da-montagem`. Nenhum agente usa o aceite por
conta própria. A saída de cada etapa fica em arquivo na pasta do objeto, para a
seguinte ler do disco em vez de depender de quem conduz lembrar.
