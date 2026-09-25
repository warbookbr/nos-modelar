---
name: prancha-dos-contornos
description: Fazer a prancha lateral de um objeto a partir dos contornos que a separação tirou da imagem, com o desenhista de prancha escolhendo as cotas e um crítico dando nota, até três rodadas. Use depois de a separação da imagem fechar, antes da modelagem. Não use para prancha de carroceria desenhada por medida declarada; essa é a skill desenhar-prancha.
---

# Prancha dos contornos

Você conduz e não desenha. Quem escolhe é o agente `desenhista-de-prancha`, e
quem julga é o `critico-visual`. O comando é `npm run contorno:prancha`, e a
etapa faz parte do fluxo descrito em `docs/mecanifica/usar/FLUXO-DO-OBJETO.md`.

A prancha só começa com a separação fechada (`npm run objeto -- <objeto>`
mostra). Ela sai inteira dos contornos, e o que o agente decide é o que o
comando não sabe: as cotas de cada parte, a conferência da calibração e o que
a imagem esconde. Sem esse trabalho o crítico aprovaria uma cópia do contorno.

## O ciclo

Pergunte a ação, sempre:

```bash
npm run contorno:prancha -- <imagem>.contornos.json --acao
```

**desenhar** — despache o `desenhista-de-prancha` com o caminho dos
contornos, o alinhamento do objeto e, da segunda rodada em diante, só os
defeitos que o comando imprimiu.

**Crítico.** Despache o `critico-visual` com a imagem de referência como alvo
e `<imagem>.prancha.png` como modelo. Pergunte se a silhueta e cada parte da
prancha seguem a imagem, se as cotas estão nas partes que o modelador precisa
e se alguma medida contradiz o alinhamento. Nunca mande as escolhas do agente
nem o que mudou.

**Registre** o veredito sem editar:

```bash
npm run contorno:prancha -- <imagem>.contornos.json --registrar=<veredito.json>
```

Nota 9 ou mais fecha. Abaixo disso volta ao agente, até três rodadas; depois
a decisão é da pessoa, e nenhum agente estende o limite. Se a pessoa decidir
tentar de novo, arquive a série com `--nova-serie --por=<quem decidiu>`.
