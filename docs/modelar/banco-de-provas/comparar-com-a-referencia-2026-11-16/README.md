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

`olhar-bancada --sobrescrever`, com `--saida`, apaga e refaz a pasta quando ela tem o marcador `.saida-da-bancada`, que a bancada grava ao criar a pasta de `--saida`; a pasta sem o marcador é recusada com o caminho na mensagem, e a padrão, a que a contém e o uso sem `--saida` ou com `--analise` também. Dos 42 comandos do alvo nas sete rodadas da bicicleta, 21 entram no alvo só por apagar a saída ou conferir o motor, sem prancha nem medida de foto no mesmo comando: 14 de apagar a saída, que `--sobrescrever` tira, e 7 de conferir o motor (`nucleo(gerarPassos(...))`, `tmp/chk.mjs` e a busca por `orfaos`), que esperam o `descrever --recusas`. A conta usa `padroesDe`, `noAlvo` e `ALVO` do `contar-comandos.mjs`, tirando do alvo os padrões `apagar-saida` e `conferir-motor` e o auxiliar `tmp/chk.mjs`/`orfaos`, e mantendo o `tmp/prancha.*`. `--recusas` não entrou na primeira metade da fatia porque mora em `tools/modelar/descrever-peca.mjs`, território do plano do cache por passo; entrou em 2026-11-17 pelo empréstimo do arquivo, descrito abaixo.

## Fatia 2: `descrever --recusas`

`npm run descrever -- <peça> --recusas` executa a receita como o `descrever` faz e encerra antes das medidas: imprime os órfãos do núcleo pela `linhasDeOrfaos`, sem o corte de doze, a causa antes do eco, com passo, operação, motivo e referência, e sai com 1 quando há órfão e com 0 e a linha `SEM RECUSA` quando não há. As conferências do plano e das referências, que rodam antes da execução, ficam de fora com a opção, porque a pergunta é só se o motor gera. O ramo tem sete linhas no `descrever-peca.mjs` e a linha de ajuda, e o filtro das recusas de material que o plano citava não entrou.

O teste [`descrever-recusas.test.mjs`](../../../../tools/modelar/descrever-recusas.test.mjs) compara a lista com a do núcleo em três peças: a `carenagem-de-prova` e a `lava-loucas-compacta-branca`, que geram sem órfão, e a carenagem com um material a mais que cita uma origem inexistente, que dá um órfão no último passo. O núcleo do teste recebe o que a receita exporta além dos passos (PARAMS, TOPO, MATERIAIS, ESQUELETO, ALIASES), como `executarReceita` passa. A linha literal `nucleo(gerarPassos(TABELA)).orfaos`, sem eles, inventa órfãos de ponto e de alias que não existem na peça: 4 na carenagem e 42 na lava-louças, e é uma explicação plausível para o modelador que concluiu errado sobre onde o motor devolve as recusas. `--recusas` não tem esse erro, porque usa a mesma execução do `descrever`.

Com os 7 comandos de conferir o motor que `--recusas` substitui, as fatias 2 e 3 tiram 32 dos 42 do alvo nas sete rodadas, e sobram 10 em 83, o quarto do gate 5.

## Fatia 3: a prancha modelo e foto por um comando

[`tools/modelar/prancha-de-referencia.mjs`](../../../../tools/modelar/prancha-de-referencia.mjs) captura a vista na bancada, em memória e em projeção ortográfica, com a parte isolada e enquadrada (`--parte`) ou a peça inteira enquadrada, e monta a prancha no Chromium sem WebGL, como a fatia 1 decidiu: a página decodifica as imagens, mede a extensão do que não é fundo e desenha o plano que o módulo monta em Node, e devolve só o PNG em base64. A escala do modelo é medida pela câmera, com a origem e 100 mm em cada eixo projetados no quadro da vista; a da foto vem de `--regua`, uma medida conhecida dela em px e em mm. As duas metades saem na mesma escala, com régua em mm, a extensão de cada uma em caixa tracejada e um JSON ao lado com as escalas e as extensões em mm. As opções são `--foto`, `--regua`, `--regiao` (caixa em px da foto, ou `auto` pela extensão), `--vistas` (só as ortográficas de eixo), `--parte`, `--espelhar` e `--disposicao=lado|sobreposto`, além de `--saida`; com mais de uma vista, foto, régua e região levam um valor por vista separado por `;`. A `grade` do plano é a prancha com mais de uma vista, uma linha por vista, e não virou opção.

`--espelhar` entrou porque o caso o pediu: na vista `direita` da bancada a bicicleta tem a frente à esquerda, e na foto lateral a frente está à direita, o que é a inversão do contorno do selim que a sessão cometeu à mão. Na vista frontal a foto e o modelo concordam (o pedal baixo à esquerda nos dois), e ela não se espelha.

As duas pranchas da prova, com as fotos em `tmp/bicicleta/`, fora do repositório (a régua lateral é o pneu de 670 mm, medido de 1162 a 1811 px na linha do eixo; a frontal é o guidão de 680 mm do alvo, de 654 a 1345 px):

```
node tools/modelar/prancha-de-referencia.mjs bicicleta-urbana --parte=selim --vistas=direita,frontal --espelhar=direita \
  --foto='tmp/bicicleta/lateral.jpg;tmp/bicicleta/frontal.webp' --regua='1162,738,1811,738=670;654,80,1345,80=680' \
  --regiao='560,110,870,240;880,150,1100,250'
node tools/modelar/prancha-de-referencia.mjs bicicleta-urbana --parte=pedais --vistas=direita,frontal --espelhar=direita \
  --foto='tmp/bicicleta/lateral.jpg;tmp/bicicleta/frontal.webp' --regua='1162,738,1811,738=670;654,80,1345,80=680' \
  --regiao='1000,760,1140,840;820,630,1180,900'
```

| prancha | escala da prancha | vista | modelo, extensão e escala | foto, extensão na região e escala |
| --- | --- | --- | --- | --- |
| selim | 3,43 px/mm | direita | 260,1 x 77,9 mm, 3,55 px/mm | 260,2 x 116,7 mm, 0,97 px/mm (com o canote) |
| selim | | frontal | 148,1 x 77,9 mm, 5,50 px/mm | 142,7 x 98,4 mm, 1,02 px/mm (com a mesa na frente) |
| pedais | 1,73 px/mm | direita | 439,8 x 74,4 mm, 2,10 px/mm | 110,5 x 40,3 mm, 0,97 px/mm (o pedal de perto e a ponta do braço) |
| pedais | | frontal | 458,5 x 74,6 mm, 2,01 px/mm | 317,9 x 265,7 mm, 1,02 px/mm (os dois pedais, braços e pneu) |

Cada prancha leva uns 40 s, quase todos da bancada (servidor e carga da peça); a montagem no navegador leva menos de 1 s. A escala do modelo não depende do tamanho da captura: o selim deu 260,2 mm de comprido a 1280 por 720 e 260,1 a 1920 por 1080, que é o tamanho fixado, porque a 1280 os pedais saíam a 1,4 px/mm e a prancha os ampliava. A prancha só dá a extensão do que não é fundo na região, que serve à leitura; a medida de um detalhe da foto continua por script, que pode usar a régua e a região da prancha.

Dois limites ficam à vista nas pranchas. Os dois pedais aparecem juntos porque a parte `pedais` é uma só, e isolar um deles é a fatia 4. E `sobreposto` alinha pelo centro das extensões, o que desloca o selim quando a região da foto pega o canote; a região mais justa, sem o canote, conserta.

### O que a prancha tira da linha de base

Pela numeração de `contar-comandos.mjs ... --tipo=modelador --listar-alvo`, na mesma janela das sete rodadas, os 42 comandos do alvo se dividem assim. A fatia 2 tirou 14 (só apagar a saída: 3, 4, 6, 7, 10 a 13, 32, 33, 36, 37, 40, 41), e 7 esperam `descrever --recusas` (1, 2, 14, 15, 20, 31, 38). A prancha tira 11, os que montam, recortam ou escalam a vista contra a foto, ou preparam isso (capturar para a prancha, conferir o tamanho das imagens): 5, 8, 9, 16, 21, 22, 23, 25, 26, 27 e 34. Ficam 10: três que montam as vistas do modelo sozinhas, recortando um dos pedais (17 a 19, da fatia 4), três de medição livre na foto, que o plano mantém por script (30, 35, 39), a conferência das bibliotecas antes dela (29) e três que só caem em `medir-foto` porque citam `guarda:referencial` (24, 28, 42). Com as fatias 2 e 3 e o `--recusas`, o alvo cai de 42 para 10 em 83, que é o quarto do gate 5; sem o `--recusas`, para 17.

## Fatia 4: a cópia de uma parte repetida

A parte `pedais` da bicicleta tem as duas cópias, e isolá-la mostra os dois pedais juntos, a 2,0 px/mm de frente e 2,1 px/mm de lado numa captura de 1920 por 1080 (a tabela da fatia 3). O plano mandava medir primeiro se o `--zoom=<vista>:mm:<caixa>` da análise bastava. Não basta: ele recorta os pixels da captura já feita e amplia 3 vezes, e o pedal de uns 130 mm continua com os mesmos 2 px/mm, uns 260 px de largura num quadro de 1920; o recorte isola o pedal, mas não o enquadra. Por isso entrou a escolha de instância, pelo lado.

`--copia=<eixo><+|->[,...]`, em [`olhar-bancada.mjs`](../../../../tools/modelar/olhar-bancada.mjs) e na prancha, escolhe a cópia pelo lado do centro da caixa da seleção isolada, em cada eixo do referencial da peça. A página não desenha o que fica do outro lado (um plano de recorte do renderizador por item) e enquadra a câmera só nos vértices que ficam, com a mesma regra de 92 % do `--enquadrar`. O relato traz a caixa em mm do que ficou. Dois itens de eixos diferentes separam uma de quatro cópias (`x+,z-`). Pede `--selecionadas` e a seleção isolada, que vira o modo padrão com ela, e recusa `--mirar`, `--corte`, `--enquadrar`, `--revisar`, `--tela` e `--analise`. Na prancha, `--copia` vale com `--parte` e entra no nome do arquivo.

```
node tools/modelar/olhar-bancada.mjs bicicleta-urbana --selecionadas=pedais --copia=x- --vistas=direita,frontal,isometrica \
  --projecao=ortografica --res=1920x1080 --sem-contatos --saida=tools/bancadas/out/pedal-copia
node tools/modelar/prancha-de-referencia.mjs bicicleta-urbana --parte=pedais --copia=x- --vistas=direita,frontal --espelhar=direita \
  --foto='tmp/bicicleta/lateral.jpg;tmp/bicicleta/frontal.webp' --regua='1162,738,1811,738=670;654,80,1345,80=680' \
  --regiao='1012,790,1110,830;830,842,932,890'
```

O pedal de x negativo é o de baixo à esquerda na foto frontal e o de perto na lateral, do lado da corrente (`lado_da_corrente: -1`). A bancada relatou o centro da seleção em (0; 270; 0) mm e a caixa da cópia de (-229,1; 233; 107) a (-100; 261; 219,8) mm, com 8.052 dos 16.104 vértices à vista, a metade exata. O pedal ocupa 92 % da largura do quadro nas vistas direita e frontal e 92 % da altura na isométrica.

| prancha | escala da prancha | vista | modelo, extensão e escala | foto, extensão na região e escala |
| --- | --- | --- | --- | --- |
| pedal x- | 9,24 px/mm | direita | 112,9 x 28,1 mm, 15,66 px/mm | 98,1 x 37,2 mm, 0,97 px/mm (com um trecho do braço por cima) |
| pedal x- | | frontal | 129,3 x 28,1 mm, 13,68 px/mm | 92,5 x 41,3 mm, 1,02 px/mm (com a borda do braço à direita) |

O modelo passou de 2,0 a 2,1 px/mm com os dois pedais para 13,7 a 15,7 px/mm com um, e a prancha não amplia mais o modelo (a escala comum, 9,24 px/mm, fica abaixo da dele). A foto é que é ampliada, porque o pedal nela tem uns 100 px. A extensão da foto inclui o que a região não consegue deixar de fora (o braço cruza o pedal na lateral), e a leitura dela continua sendo a da prancha, não uma medida.

O teste fica em [`prancha-de-referencia.test.mjs`](../../../../tools/modelar/prancha-de-referencia.test.mjs): a leitura de `--copia`, a recusa sem `--parte`, o nome do arquivo, e a função da página rodando sobre uma cena three.js em Node com duas cópias de um bloco em x = -100 e +100 mm, em que o plano deixa de fora a de x positivo, a caixa relatada é a da outra e a câmera a centra a 92 % da largura.

Os comandos 17 a 19 da linha de base, que montavam as vistas do modelo recortando um dos pedais por script, saem com a fatia 4. Com as fatias 2, 3 e 4, o alvo cai de 42 para 7 em 83: três de medição livre na foto, que o plano mantém por script (30, 35, 39), a conferência das bibliotecas antes dela (29) e três que só caem em `medir-foto` porque citam `guarda:referencial` (24, 28, 42).
