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

## Fatia 5: o contorno medido no pacote do crítico

Quando a peça tem contorno medido (`mecanifica.contornos@1`, citado no plano, ao lado de uma imagem citada ou na pasta da peça, onde o veredito o confere), `vistas:critica` grava `contorno-sobreposto.png` e o JSON das medidas ao lado, e o pedido ganha a seção "Contorno medido sobre o modelo", logo antes de "Modelo". A imagem é a vista ortográfica da bancada com a linha do contorno por cima, desenhada pela `prancharContorno` de [`prancha-de-referencia.mjs`](../../../../tools/modelar/prancha-de-referencia.mjs), no mesmo navegador sem WebGL da prancha das fatias 3 e 4. A linha não é alinhada pelo centro das extensões, como o `sobreposto` da prancha: cada ponto (h, v) do contorno vira um ponto em mm do referencial (na frontal h é x, na lateral h é z, na superior h é x e v é menos z, as convenções do comparador de contornos) e é projetado pela mesma câmera que dá a escala da vista, com a origem e 100 mm em cada eixo. A legenda dá a extensão do modelo e a de cada contorno em mm e a distância entre os cantos de baixo à esquerda dos dois.

O contorno de um objeto de várias partes está no mundo da montagem. Ele vai ao referencial da peça pela pose da instância, resolvida como os cortes nos encaixes a resolvem (uns 17 s no braço robótico), e a vista da bancada gira com a pose; só as regiões com o nome da instância ou de uma parte do plano entram, porque a silhueta do objeto inteiro afogaria a peça. O que não entra sai no pedido com o motivo: o lado que o contorno em mm não mede (traseira, por exemplo), o arquivo que não se lê, o contorno do objeto sem região da peça, a pose que gira o olho para fora de um eixo e a falha da prancha, que não derruba o pacote.

A prova é o ombro do braço robótico, que cita o contorno frontal do objeto (`procedural/pecas/braco-robotico/referencias/frontal.contornos.json`, região `ombro`), com a instância em (0; 245; 0) mm sem giro:

```
node tools/modelar/vistas-para-critica.mjs braco-robotico/ombro --saida=tools/bancadas/out/critica-ombro-depois
```

| medida | modelo | contorno `ombro` |
| --- | --- | --- |
| extensão na vista frontal | 190,2 x 210,1 mm | 202,1 x 176,9 mm |
| canto de baixo à esquerda, do contorno menos o do modelo | | -2 mm em x, 32,9 mm em y |

O contorno começa 32,9 mm acima da base do ombro porque, na foto, o anel da cintura tapa a parte de baixo dele, e a região do mapa é só o que aparece. O pacote leva cerca de 5 minutos, como sem o contorno; a prancha do contorno é uma captura a mais na sessão da bancada. O mesmo comando com `--saida=tools/bancadas/out/critica-ombro-antes`, na versão anterior à fatia, dá o pacote sem a seção, e os dois pedidos diferem só nela.

A medida de se a nota do crítico oscila menos entre rodadas parecidas com o contorno no pacote (item 6 do gate de saída) pede despachar o `critico-visual` várias vezes com cada pacote, sem a história; o agente da fatia não tem como despachar outro agente, e ela fica para quem conduz, com os dois pacotes acima.

### A medida do item 6 e o trecho de encontro

Quem conduz despachou o `critico-visual` duas vezes com cada pacote do ombro, sem a história. Sem o contorno (`critica-ombro-antes`) as notas foram 6 e 5; com o contorno (`critica-ombro-depois`), 6 e 5. A oscilação não mudou com o contorno sobreposto. Os dois críticos com o contorno apontaram como defeito o pé do ombro 33 mm mais baixo que o contorno e o contorno 8 a 12 mm além da borda direita do modelo. O primeiro não é defeito: na referência o anel da cintura tapa o pé do ombro, e o lado de baixo da região `ombro` é o encontro dela com a região `anelCintura` do mapa, e não a borda da peça. O processo não o pegou: o pacote desenhava a região inteira com a mesma linha cheia, e o pedido não dizia que parte dela é silhueta.

A correção está no pacote. `encontrosDoAnel`, em [`prancha-de-referencia.mjs`](../../../../tools/modelar/prancha-de-referencia.mjs), classifica cada lado do anel de uma região: é silhueta quando a mediana da distância de 11 amostras dele à silhueta do objeto fica até 3 px da imagem de referência (4,7 mm no braço robótico, pelo `mmPorPx` do contorno), e é encontro quando não fica, com a região vizinha mais próxima até duas folgas. A prancha desenha o trecho de encontro tracejado, a legenda diz o comprimento dele, com que regiões ele é encontro e que lado da caixa do contorno cai nele, e o pedido diz ao crítico que o trecho tracejado não é borda da peça, não serve de medida e que a distância dele ao modelo não é defeito. No ombro, lado a lado do anel, em px da referência:

| lados do anel `ombro` | distância à silhueta, mediana | classe |
| --- | --- | --- |
| esquerdo, x = 645 a 636, y = 419 a 526 | 4,3 a 30,4 px | encontro com `anelOmbro` |
| canto de baixo à esquerda, x = 636, y = 526 a 528 | 2,0 px | silhueta |
| de baixo, y = 528 a 530 | 7,5 a 52,0 px | encontro com `anelCintura` |
| direito, x = 762 a 764 | 0,5 e 0,8 px | silhueta |
| de cima, y = 418 a 419 | 1,4 px | silhueta |

Dos 13 lados, 9 são encontro, 376,2 mm, e o lado de baixo da caixa do contorno cai no encontro. O lado direito é silhueta: ali a região encosta no fundo, e os 8 a 12 mm do contorno além da borda direita do modelo são diferença medida entre a peça e a referência, que o pacote mantém como medida. O de cima também é silhueta e bate com o topo do modelo (32,9 + 176,9 = 209,8 mm contra 210,1). O pacote refeito está em `tools/bancadas/out/critica-ombro-encontro`, pelo mesmo comando com `--saida` trocada, e o pedido difere do de `critica-ombro-depois` só no parágrafo do tracejado e no parêntese do encontro na linha do contorno. Os testes ficam em [`prancha-de-referencia.test.mjs`](../../../../tools/modelar/prancha-de-referencia.test.mjs) (a classificação num objeto partido em cima e embaixo, os trechos abertos, o lado da caixa, o desenho tracejado e a marca que segue da entrada ao JSON das medidas na página) e em [`vistas-para-critica.test.mjs`](../../../../tools/modelar/vistas-para-critica.test.mjs) (a marca na região e não na silhueta, e o texto do pedido). Medido de novo em 2026-11-17 com o `critico-visual`, duas vezes sobre `critica-ombro-encontro`: notas 7 e 6. Nenhum dos dois apontou o pé abaixo do contorno, os dois apontaram o deslocamento lateral de uns 10 mm pela borda direita, que é silhueta, e os dois mantiveram o encontro de baixo do pescoço como o defeito que mais pesa, como os quatro críticos anteriores. O tracejado tirou o falso defeito; a oscilação, de um ponto, fica igual nas três versões do pacote, e quem a ataca é a fatia 6, das perguntas fechadas.

Um achado à parte, que o processo não pegou: o contorno lateral da carcaça da empilhadeira (`carcaca-lado.ia.contornos.json`) tem o eixo traseiro em h = +1700 mm, e a carcaça o tem em z = -1700; pelo comparador, que lê h como z na lateral, a silhueta dá razão interseção/união de 0,041. O contorno está espelhado em relação à peça, e o veredito não o confere porque ele mora na pasta do objeto. O contorno sobreposto o mostraria espelhado; a correção é do contorno ou da convenção do comparador e fica fora deste plano.

### O contorno de uma referência encerrada, 2026-11-17

A pessoa apontou que a prova desta fatia usou um contorno que não devia valer: a foto frontal do braço robótico saiu do repositório em 2026-10-21, e `frontal.contornos.json` ficou como resto dela, citado no `PLANO` do ombro no lugar da foto. O ombro já estava aceito pela pessoa desde 2026-11-05, com a etapa fixa no registro da montagem, e o contorno desenhado sobre a vista frontal não corresponde à peça aprovada. O processo não o pegou: o pacote desenhava e citava como medida todo contorno que o plano citava ou que estava na pasta das imagens citadas, sem olhar se a peça ainda estava em modelagem, e nenhum gate pergunta se a referência de um contorno ainda existe. Além do ombro, todas as partes do braço que citam uma imagem de `referencias/` recebiam pela varredura da pasta os contornos `frontal` e `lateral`, que não acompanham imagem nenhuma.

Por decisão da pessoa, o `PLANO` do ombro passa a citar o `ALINHAMENTO.md` do braço, que registra o que ela aceitou, e o arquivo de coordenadas fica. O pacote agora lê o registro de etapas gravado ao lado da montagem (`<montagem>.etapas.json`, que só `etapas-da-montagem.mjs --fixar` escreve, com o aceite da pessoa): quando toda instância da peça está fixa, nenhum contorno é desenhado nem citado como medida de um lado, e o pedido diz quais ficaram de fora, a etapa, o aceite e o comando que reabre a etapa. Etapa aberta ou quebrada continua recebendo o contorno. A peça sozinha, fora de montagem, não grava aprovação em lugar nenhum e continua recebendo o contorno; o processo passa a pegar o resto de referência só nas peças de montagem. Os testes estão em [`vistas-para-critica.test.mjs`](../../../../tools/modelar/vistas-para-critica.test.mjs), incluindo um que lê o registro real e confirma que o ombro está fixo. A prova da fatia passa a ser o selim da bicicleta, que tem referência em uso.
