# Comparar com a referência: a linha de base dos comandos repetidos e onde a prancha é montada

Pasta do plano [comparar com a referência sem script](../../planos/2026-11-16-comparar-com-a-referencia.md), fatia 1, medida em 2026-11-16. A fatia tem duas perguntas: se a contagem do "Problema observado" do plano se refaz por um comando sobre os registros da sessão, e se a prancha modelo e foto deve ser montada no navegador da bancada ou em Node com a foto convertida antes.

## A contagem por comando

O script [`contar-comandos.mjs`](contar-comandos.mjs) lê o registro da sessão principal e os dos subagentes, que o Claude Code grava em `~/.claude/projects/<pasta>/<sessão>.jsonl` e em `<sessão>/subagents/`, e conta as chamadas de shell por tipo de agente e pelos padrões que a análise do plano usou, copiados como estavam. A análise foi tirada às 11:50:22 UTC de 2026-11-16, e a mesma janela a refaz:

```
node docs/modelar/banco-de-provas/comparar-com-a-referencia-2026-11-16/contar-comandos.mjs <sessão.jsonl> --ate=2026-11-16T11:50:22Z
node docs/modelar/banco-de-provas/comparar-com-a-referencia-2026-11-16/contar-comandos.mjs <sessão.jsonl> --desde=2026-11-16T10:54Z --ate=2026-11-16T11:50:22Z --tipo=modelador
```

O primeiro dá os números da sessão, e o segundo os das sete rodadas de modelador da bicicleta (o selim em três rodadas, o guidão e o garfo, as pedivelas e os pedais em três). Os dois resultados estão em [`linha-de-base.json`](linha-de-base.json), e `--exemplos=<padrão>` mostra até dez comandos de um padrão. Um comando pode cair em mais de um padrão.

| medida | plano | comando |
| --- | --- | --- |
| registros (principal e subagentes) | 67 | 67 |
| comandos de shell | 3.945 | 3.945 |
| do implementador, da sessão principal, do modelador, do revisor e do agente geral | 1.488, 1.144, 518, 458, 337 | 1.488, 1.144, 518, 458, 337 |
| leituras, edições por script, rodadas de teste, git | 1.389, 836, 547, 903 | 1.389, 836, 547, 903 |
| scripts de imagem (prancha), total, da sessão principal e do modelador | 163, 133, 26 | 163, 133, 26 |
| conferências do motor com `nucleo(gerarPassos(...))` | 188 | 188 |
| `rm -rf` da saída | 86 | 86 |
| cópias de teste para `tools/zz-*`, na sessão principal | 117 | 117 |
| renderizações de `.obj` no Blender | 44 | 44 |
| esperas com `sleep` e leituras da saída de tarefa | 147 e 155 | 147 e 155 |
| sete rodadas da bicicleta: comandos e os de prancha, saída, motor e foto | 41 em 83 | 42 em 83 |

A única medida que não bate é a das sete rodadas, que o plano contou à mão. Pelos padrões, prancha, apagar a saída, conferir o motor e medir a foto dão 37 dos 83; o comando conta também os que rodam ou editam o script auxiliar dessas tarefas (`tmp/prancha.py`, `tmp/chk.mjs`) e a busca de onde o motor devolve as recusas (`orfaos`), que os padrões deixam em `outro` ou em edição, e chega a 42. A linha de base do gate 5 passa a ser 42 em 83, medida por este comando, e um quarto dela são 10 comandos por 83.

Nas sete rodadas, a bancada teve 20 comandos, dos quais 3 falharam, e o `rm -rf` 16, com 3 falhas.

## Onde a prancha é montada

O script [`medir-montagem.mjs`](medir-montagem.mjs) monta a mesma prancha dos dois jeitos, a foto escalada para a altura da vista com a vista ao lado: no Chromium da bancada, numa página sem WebGL, com as imagens por data URL, `createImageBitmap` e um `OffscreenCanvas`, e o PNG de volta em base64; e em Node, com a foto convertida para PNG pelo `ffmpeg` antes, lida pelo `pngjs`, escalada por interpolação bilinear e colada. Foram as duas fotos da bicicleta (jpg de 2000 por 1116 e webp do mesmo tamanho, que ficam fora do repositório) contra a vista direita da bancada (1280 por 720), três vezes cada; a prancha sai com 2570 por 720 nos dois.

| foto | navegador, total (lançar, decodificar, montar, devolver) | Node, total (converter, ler, montar) |
| --- | --- | --- |
| jpg | 219 a 250 ms (57 a 64, 24, 34, 29) | 451 a 457 ms (170 a 172, 75 a 78, 204 a 208) |
| webp | 166 a 170 ms (56 a 58, 21 a 22, 21 a 22, 12) | 348 a 352 ms (91 a 93, 67 a 70, 188 a 191) |

Com `--fidelidade`, os pixels da foto que o Chromium decodifica diferem dos do PNG do `ffmpeg` em 0,117 de média e 9 no máximo por canal (de 255) no jpg, e em 0,253 e 7 no webp, iguais com e sem a conversão do perfil de cor: as duas fotos trazem perfil ICC e o Chromium sem tela não muda as cores por ele.

A decisão é montar no navegador. O projeto não declara decodificador de jpg nem de webp para Node: o `sharp` que aparece em `node_modules` da raiz vem por dependência do `manifold-3d` e não está na cópia instalada por `npm ci`, e o `ffmpeg` e o `convert` são do sistema, sem garantia no CI nem na máquina da pessoa. Em Node a prancha exigiria uma dependência nova ou a conversão à mão antes, que é o passo que o plano quer tirar. O Chromium já é a dependência da bancada, lê jpg, webp e png sem passo prévio, montou a prancha na metade do tempo e, quando o comando gera as vistas, já está aberto. A diferença de pixels é de decodificador e não pesa na prancha; a medição livre na foto continua lendo o arquivo original pelo script dela.

## O que a fatia 3 precisa saber da medida

A primeira versão da medida devolvia os pixels das duas decodificações da foto como lista de números e a página levou 67 s; os mesmos pixels em base64 levaram 1 s, e só o PNG da prancha em base64, 12 a 29 ms. A página deve devolver só o PNG em base64, ou bytes, e fazer na página toda conta sobre pixels. A página sem WebGL é a de `lancarChromium(chromium, { webgl: false })`, de [`navegador.mjs`](../../../../tools/modelar/navegador.mjs), que no contêiner cai no headless shell.

## Fatia 2: o que `--sobrescrever` tira da linha de base

`olhar-bancada --sobrescrever`, com `--saida`, apaga e refaz a pasta quando ela tem o marcador `.saida-da-bancada`, que a bancada grava ao criar a pasta de `--saida`; a pasta sem o marcador é recusada com o caminho na mensagem, e a padrão, a que a contém e o uso sem `--saida` ou com `--analise` também. Dos 42 comandos do alvo nas sete rodadas da bicicleta, 21 entram no alvo só por apagar a saída ou conferir o motor, sem prancha nem medida de foto no mesmo comando: 14 de apagar a saída, que `--sobrescrever` tira, e 7 de conferir o motor (`nucleo(gerarPassos(...))`, `tmp/chk.mjs` e a busca por `orfaos`), que esperam o `descrever --recusas`. A conta usa `padroesDe`, `noAlvo` e `ALVO` do `contar-comandos.mjs`, tirando do alvo os padrões `apagar-saida` e `conferir-motor` e o auxiliar `tmp/chk.mjs`/`orfaos`, e mantendo o `tmp/prancha.*`. `--recusas` não entrou nesta fatia porque mora em `tools/modelar/descrever-peca.mjs`, território do plano do cache por passo.
