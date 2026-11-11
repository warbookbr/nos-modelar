# Fluxo do objeto

Um objeto de várias partes, como o braço robótico, a empilhadeira ou um carro, é conduzido por um caminho só, de seis passos, e `npm run fluxo:objeto -- <objeto>` lê a pasta do objeto, diz em que passo ele está, o que falta de cada passo, a ação de cada peça e o comando exato que vem agora. O estado vive nos arquivos da pasta, e não na conversa de quem conduz. `--json` dá a mesma leitura para um agente, e `--medir` mede cada peça de verdade em vez de usar as rodadas gravadas.

Há um segundo comando, `npm run objeto -- <objeto>`, e ele não é outro caminho: é o comando do passo 2 quando as referências passam por mapa de partes e prancha de contornos. Ele lê o estado dessas duas conversas com crítico (o mapa e a prancha) e lista o pacote de referência que o modelador e o crítico recebem. Use `fluxo:objeto` para saber o que fazer, e `objeto` para conduzir ou conferir as referências do objeto que as tem mapeadas.

## Os seis passos, na ordem em que o objeto é produzido

### 1. Alinhamento

A pessoa e a IA combinam como o objeto funciona, as partes, a escala, a ordem de montagem e o que fica fora do modelo (skill `alinhar-modelagem`). Sai `ALINHAMENTO.md`, com a tabela de medidas, a seção das partes (cada item da lista é uma peça, com nome de pasta em minúsculas e hífen) e o que reprova o objeto. O `PLANO` de cada peça sai dele, escrito pelo modelador na receita.

O passo só está feito com o aceite da pessoa registrado no próprio arquivo, numa seção `## Aceite` com uma linha por aceite e a data:

```
## Aceite

- alinhamento: aceito pela pessoa em 2026-11-11, "as palavras dela".
- rascunho: aceito pela pessoa em 2026-11-11, "as palavras dela".
- delegação: pela pessoa em 2026-11-11, "as palavras dela" (vale para os dois).
```

O alinhamento que um agente despachado escreve sem a pessoa presente fica como proposto: toda escolha que a referência não decide vai para a seção `## Decisões que dependem da pessoa`, um parágrafo por decisão, com a recomendação, e nenhuma linha de aceite. O fluxo mostra o passo como proposto, aguardando a pessoa, lista as decisões e não manda criar receita. Quem conduz com a pessoa leva as decisões a ela e só então registra o aceite. O objeto que já tem receita não fica preso por falta do registro: o fluxo avisa "sem registro de aceite" e segue, e a delegação ou o combinado com a pessoa que o alinhamento já conta em texto vale como aceite.

### 2. Referências

Imagens de referência em `referencias/`, uma por vista e sem marca nem logotipo, com o contorno por parte quando a conferência pedir. Duas conversas com crítico saem daqui, e `npm run objeto` acompanha as duas.

O mapa de partes. O agente `desenhador-de-contorno` semeia cada parte na imagem, e o `critico-visual` julga o pacote pelo roteiro, divisa por divisa. Nota 9 fecha, abaixo volta, até três rodadas, e depois a pessoa decide (skill `contorno-da-imagem`). Saem, ao lado da imagem, `<imagem>.regioes.json` com as sementes, `<imagem>.contornos.json` com o contorno de cada parte em milímetro, `<imagem>.pacote/` com `mapa-de-partes.png` (cada parte pintada a 20% por cima da imagem, com número e nome) e as folhas de divisa, e `<imagem>.regioes.rodadas/`.

A prancha. O agente `desenhista-de-prancha` escolhe as cotas de cada parte, confere a calibração e anota o que a imagem esconde, e o `critico-visual` julga com a mesma regra (skill `prancha-dos-contornos`). Entra `<imagem>.contornos.json`. Saem `<imagem>.prancha.json`, `<imagem>.prancha.svg` e `.png`, `<imagem>.prancha.pacote/roteiro.md` e `<imagem>.prancha.rodadas/`. O desenhista só corrige defeito do tipo `cota`; defeito de forma de contorno volta para o mapa de partes, porque o contorno vem dele. Medida que a vista esconde vem de outra imagem do mesmo objeto, com contornos próprios. Toda parte declara largura e altura, por `origem` ou `medivel: false` com motivo, e faltando alguma o comando para com código 4 e lista as faltas.

Objeto de lataria. A carroceria, a carenagem e o invólucro que se dividem em painéis têm a prancha desenhada por medida declarada (skill `desenhar-prancha`), com a silhueta, as aberturas e as linhas de painel nas quatro vistas. É nela que as linhas de painel são desenhadas e conferidas, antes do rascunho; o rascunho as leva ao núcleo como as linhas de vão de `paineisPorVaos`, e a técnica está em `modelar-veiculo-em-chassi-e-lataria.md`. Objeto de lataria sem imagem mapeada não passa por `npm run objeto`: a prancha por medida é o alvo.

Referências fora da pasta do objeto. O objeto cujas referências já existem noutra pasta do repositório, citadas pelos registros das rodadas que as produziram, as aponta em `referencias.json`, `{ "pasta": "<caminho relativo à pasta do objeto>", "motivo": "..." }`, em vez de copiá-las; é o caso do avião. O objeto não pode ter as duas coisas.

Papel de cada imagem. Com mais de uma imagem, o arquivo `papeis.json` da pasta `referencias/` declara o papel de cada uma: `{ "imagens": { "<imagem>": { "papel": "principal" | "apoio" | "substituida", "motivo": "...", "por": "..." } } }`. A principal passa pelo mapa e pela prancha. A de apoio passa só pelo mapa e dá medidas à prancha principal por `origem`. A substituída fica fora e declara `por` qual imagem e o `motivo`. Sem o arquivo, toda imagem com regiões é principal. `npm run objeto` lê esse arquivo.

### 3. Rascunho

O rascunho do objeto inteiro em `referencias/<nome>.esboco.mjs`, pelas formas do esboço 2.0 (skill `esbocar-opcoes` quando há escolha de forma), com a configuração da conferência em `<nome>.conferir.json` e o `resumo.json` que `npm run conferir:vistas` grava em `<objeto>/conferencia/<nome>/`. A conferência configurada e não rodada, ou rodada com sobra acima da tolerância, deixa o passo feito com ressalva. O rascunho também precisa do aceite da pessoa, na mesma seção `## Aceite` do alinhamento (`- rascunho: ...`, ou a delegação que vale para os dois), e proposto sem ele fica aguardando a pessoa. Uma família procedural entra no rascunho por uma chamada de `instanciaDeFamilia` (`npm run capacidade -- familia`).

### 4. Receitas

Cada peça da seção das partes, na ordem da montagem, vira `partes/<peça>/receita.js`, pelo laço de modelagem com um modelador novo e o crítico (skills `criar-peca` e `laco-de-modelagem`). Entram o `PLANO` da peça, escrito a partir do alinhamento, as peças já fixas e o pacote de referência. Saem a receita e as rodadas. A `montagem.json` se escreve junto das receitas, porque a peça depois da primeira precisa dela para passar no `guarda:referencial`.

O que várias peças dividem mora em `partes/_comum/`, o módulo comum do objeto: a superfície e as linhas de vão de uma lataria, as ferramentas de um chassi. Ele não é peça, as receitas o importam por caminho relativo, e o fluxo o lista com as receitas que o importam e avisa quando ele mudou depois da última rodada de uma peça que depende dele; nesse caso a peça pede uma rodada nova. O pacote de referência que o modelador e o crítico recebem vem na ordem: a imagem de referência, a prancha limpa (`<imagem>.prancha.png`) e o mapa de partes com as folhas de divisa. A ordem de entrega é diferente da de produção porque a prancha sai dos contornos do mapa; entregar as três ao crítico não fere a regra de não contar como a peça foi feita, porque elas vêm da referência.

### 5. Montagem

A pessoa aceita cada etapa, fechada pelo crítico ou, com defeito em aberto, por aceite humano (`npm run etapas -- <montagem.json> --fixar <instância> --por "<quem, data>"`, e `--aceite-humano` com defeito em aberto). Sai `montagem.etapas.json`. Só a pessoa reabre uma etapa fixa, com `--reabrir <instância> --por "<quem, data: motivo>"`; a etapa volta a aberta, o aceite e a receita antigos ficam em `reaberturas`, e o comando recusa etapa não fixa e etapa com posterior fixa, que se reabre da última para a primeira. O registro guarda de cada etapa fixa a assinatura da malha; comentário, `meta` e `PLANO` que mudam sem mudar a malha não quebram a etapa, e quando a malha ou uma junta muda a etapa vira `quebrada` e o aceite vai para `reaberturas` com o motivo.

### 6. Fechamento

Todas as etapas fixas. Ficam a auditoria da montagem (`npm run etapas -- <montagem.json> --auditar`) e o custo por peça (`npm run custo:peca -- <objeto>`).

## Regras que valem em todos os passos

Quem produz não julga o próprio resultado, e o crítico não recebe a história da construção. Toda conversa com crítico tem limite de rodadas, e depois dele a decisão é da pessoa. Etapa com defeito em aberto só passa por aceite humano. No mapa de partes e na prancha o aceite é gravado com `--aceite-humano --por="<quem, data: motivo>" --pendencias="<texto>"`, que guarda em `aceite.json` na pasta de rodadas quem aceitou, quando, a última nota, os defeitos em aberto e as pendências; nas etapas da montagem é o `--aceite-humano` de `etapas-da-montagem`. Nenhum agente usa o aceite por conta própria, e o agente despachado que escreveu o alinhamento ou o rascunho registra o que propôs, e não o aceite. A saída de cada passo fica em arquivo na pasta do objeto, para o seguinte ler do disco em vez de depender de quem conduz lembrar.
