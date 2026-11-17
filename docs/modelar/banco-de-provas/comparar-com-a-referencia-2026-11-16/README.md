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

### A prova do item 6 no selim da bicicleta, 2026-11-17

O contorno do selim é o `tmp/bicicleta/lateral.contornos.json`, tirado pelo `npm run contorno` da foto lateral `tmp/bicicleta/lateral.png` (a `lateral.jpg` convertida, com os mesmos 2000 x 1116 px), com a região `selim` e a declaração `imagem.foraDoRepositorio` ("foto de terceiro da bicicleta, fica em tmp", `encerrada: false`). A foto e o contorno ficam fora do git. A série de regiões do contorno teve três rodadas do crítico do roteiro do contorno e está à espera do aceite da pessoa: o pacote abaixo usa o contorno antes desse aceite, e a medida do item 6 vale como prova do pacote, não como aceite da série. Se a pessoa mudar a série, os dois pacotes se refazem pelos mesmos comandos.

O pacote só lia contorno citado no plano, ao lado de imagem citada ou na pasta da peça, e o da foto de terceiro não está em nenhum dos três. Entrou `--contorno=<caminho>[@<lado>]` em `vistas:critica`, que o desenha sobre o modelo e o cita como medida do lado, como `--referencia` traz a foto: sem `@`, o lado sai do nome do arquivo; o contorno sem a origem da imagem dita (`imagem.caminho` ou `imagem.foraDoRepositorio`, conferida pela mesma `motivoDaOrigem` da guarda do acervo) e o de referência encerrada são recusados antes da captura, com o motivo. Entrou também `--regioes-do-contorno=<nome>[,...]`, que vale para o `--contorno` anterior e desenha só as regiões dadas, sem a silhueta: na bicicleta, sem ela, a silhueta inteira e as quinze regiões com nome de parte iriam juntas para a mesma vista. Quando a `--referencia` tem o mesmo nome do contorno, o pedido diz de que imagem ele foi tirado. Os testes estão em [`vistas-para-critica.test.mjs`](../../../../tools/modelar/vistas-para-critica.test.mjs).

Os dois pacotes saem sobre as mesmas fotos e as mesmas orientações da fatia 6, um com o contorno e outro sem:

```
node tools/modelar/vistas-para-critica.mjs bicicleta-urbana --saida=tools/bancadas/out/critica-bicicleta-selim-com-contorno \
  --referencia=<raiz>/tmp/bicicleta/lateral.png@esquerda \
  --orientacao-da-referencia='foto do lado da corrente, como a vista esquerda do modelo, com a frente da bicicleta à direita da imagem, sem giro nem espelho' \
  --referencia=<raiz>/tmp/bicicleta/frontal.webp@frontal \
  --orientacao-da-referencia='foto de frente, como a vista frontal do modelo, sem giro nem espelho' \
  --contorno=<raiz>/tmp/bicicleta/lateral.contornos.json --regioes-do-contorno=selim
```

O sem contorno é o mesmo comando com `--saida=tools/bancadas/out/critica-bicicleta-selim-sem-contorno` e sem as duas últimas opções. O pacote com o contorno levou 10 min 30 s e o sem, 8 min 13 s, os dois com a medição da receita aprovada. Os dois `pedido.md` citam as mesmas 49 imagens, e o com o contorno cita também `contorno-sobreposto.png`; as 41 capturas comuns, gravadas na mesma pasta da bancada, deram o mesmo sha256 depois de cada pacote, e as 8 de superfície, uma cópia em cada pasta, são iguais pixel a pixel. Os pedidos diferem só na seção "Contorno medido sobre o modelo" e nas duas linhas das vistas laterais, que no pacote com o contorno dizem que a medida daquele lado vem de `lateral.contornos.json`, tirado de `lateral.png`.

O contorno cai na vista esquerda do modelo, que olha o lado da corrente com a frente à direita, como a foto. Na imagem, em mm a partir do canto de baixo à esquerda da extensão do modelo (1.670,6 x 1.065,9 mm), medido pelos pixels da imagem gravada, a 0,51 px por mm:

| medida | selim do modelo | contorno `selim` |
| --- | --- | --- |
| começo e fim na horizontal | 435 a 691 mm | 427,4 a 681,0 mm |
| topo | 966 mm | 951 mm |
| extensão | 256 mm de comprimento | 253,6 x 89,5 mm, com o trilho e a braçadeira |

A linha do contorno corre sobre o corpo do selim, uns 15 mm abaixo do topo do modelo e 8 a 10 mm mais para trás, e desce pelo trilho até a braçadeira; os 43,9 mm do encontro com o canote saem tracejados. A diferença de altura tem uma causa provável na escala: o contorno põe a foto em mm pelos dois eixos das rodas, 1.000 mm de entre-eixos em 988,7 px (1,0114 mm por px), e a prancha da fatia 3 a pôs pelo pneu, 670 mm em 649 px (1,0324 mm por px). As duas medidas da foto não cabem juntas no modelo, que tem os dois valores, e a diferença de 2 % dá uns 19 mm na altura do selim. Quem decide qual régua vale é a pessoa, no aceite da série.

A medida do item 6, dois `critico-visual` em cada pacote com o `pedido.md` de hoje, sem a história, fica com quem conduz. Os dois pacotes apontam para as capturas da bancada em `tools/bancadas/out`, que o próximo pacote da bicicleta apaga e refaz; os críticos rodam antes de outro pacote dela.

## Fatia 6: o pedido por perguntas fechadas, em duas ordens

`vistas:critica` grava, ao lado do `pedido.md` de hoje e sobre as mesmas imagens, `pedido-fechado-a.md`, `pedido-fechado-b.md` e `perguntas-fechadas.json`, em [`vistas-para-critica.mjs`](../../../../tools/modelar/vistas-para-critica.mjs). As perguntas saem do que a receita já declara: uma por vista do modelo que tem referência do mesmo lado, uma pela composta do alvo quando a receita refina um esboço, uma por parte do `PLANO` com a forma prometida inteira, e uma por critério de reprovação. A resposta é `sim`, `não` ou `não dá para ver`, e cada `sim` e `não` cita a imagem e diz o que ela mostra. As duas polaridades se misturam de propósito: na pergunta de forma o defeito é o `não`, e na de critério é o `sim`, porque a pergunta de sim ou não convida a confirmar o que se leu, que é a razão de `perguntas-do-critico.js` recusar essa forma nas perguntas abertas da família.

A ordem A tem as seções de imagem na ordem do pedido de hoje, do alvo e das referências para o modelo e as partes, e as perguntas de P1 em diante. A ordem B põe o modelo, a superfície, o montado e as partes antes do alvo e das referências, e lista as perguntas de trás para a frente, com os mesmos números. Os critérios de reprovação saem da seção deles porque viraram perguntas, e a seção das partes deixa de pedir a linha por parte. As respostas vêm num bloco cercado `respostas`, uma lista JSON antes do veredito, e o veredito JSON continua fechando a resposta, que é onde `extrairVeredito` o lê. A nota sai das respostas pela regra escrita no pedido (`REGRA_DA_NOTA`): com defeito de critério, 7 com um, 6 com dois e 5 com três ou mais; sem ele, 9 com um defeito de forma, 8 com dois ou mais, e 10 sem defeito; `não dá para ver` não conta. `.claude/agents/critico-visual.md` não mudou.

`--juntar=<pasta da rodada> <resposta A> <resposta B> [...]` lê as perguntas da pasta e cada par de respostas: a pergunta com a mesma resposta nas duas ordens fica com ela, a que muda sai como não verificável e não conta como defeito, e a nota é a da regra sobre as respostas juntas, com a de cada ordem sozinha e a que o crítico escreveu ao lado. Com mais de um par, o relatório dá a variação das notas (amplitude, média e desvio padrão) e as perguntas cuja resposta final mudou entre repetições. `--notas <resposta>...` dá a nota escrita em cada resposta ao pedido de hoje e a mesma variação.

O pacote da medida é o da bicicleta, sem contorno medido, com as duas fotos de `tmp/bicicleta/`, fora do repositório, como referências externas: a lateral vale para a vista esquerda do modelo, que olha o lado da corrente com a frente à direita como a foto, e a frontal para a frontal.

```
node tools/modelar/vistas-para-critica.mjs bicicleta-urbana --saida=tools/bancadas/out/critica-bicicleta-fechada \
  --referencia=<raiz>/tmp/bicicleta/lateral.jpg@esquerda \
  --orientacao-da-referencia='foto do lado da corrente, como a vista esquerda do modelo, com a frente da bicicleta à direita da imagem, sem giro nem espelho' \
  --referencia=<raiz>/tmp/bicicleta/frontal.webp@frontal \
  --orientacao-da-referencia='foto de frente, como a vista frontal do modelo, sem giro nem espelho'
```

O pacote levou 7 min 45 s, com a medição da receita aprovada. Os três pedidos citam as mesmas 49 imagens, e os fechados têm 23 perguntas: as duas das referências, as 15 partes e os 6 critérios. A medida do item 8 do gate de saída, a mesma imagem cinco vezes com o pedido de hoje e cinco pares com o fechado, pede despachar o `critico-visual`, e fica para quem conduz.

### A medida do item 8, 2026-11-17

Quem conduz despachou o `critico-visual` quinze vezes sobre o pacote `critica-bicicleta-fechada`, sem a história: cinco com o `pedido.md` de hoje e cinco pares com os dois pedidos fechados de então, de 23 perguntas, uma por parte com a forma prometida inteira. As respostas ficaram fora do repositório, e as notas saíram de `--notas` e `--juntar`:

| leitura | notas das cinco repetições | amplitude | desvio |
| --- | --- | --- | --- |
| pedido de hoje, a nota que o crítico escreveu | 8, 7, 7, 7, 8 | 1 | 0,49 |
| pedido fechado, a nota que o crítico escreveu | 8 nas dez respostas | 0 | 0 |
| pedido fechado, pela regra, só a ordem A | 8, 8, 8, 8, 8 | 0 | 0 |
| pedido fechado, pela regra, só a ordem B | 8, 8, 8, 8, 8 | 0 | 0 |
| pedido fechado, pela regra, as duas ordens juntas | 10, 8, 8, 8, 8 | 2 | 0,8 |

O item 8 não passou, e a medida mostrou três defeitos do pedido fechado. O primeiro é a junção: a pergunta que mudava entre as ordens saía como não verificável e contava como sem defeito, e a repetição 1, com seis perguntas mudando, deu 10 com as duas ordens em 8, porque tirar a pergunta tirava o defeito. O segundo é a pergunta: as que mudaram de resposta entre as ordens ou entre repetições (P1, P4, P5, P6, P10, P12, P13 e P21) eram quase todas compostas e traziam número que a imagem não mostra, como "pinhão de 16 dentes", "pneu de 48 mm de largura e 42 mm de altura" e "dois trechos retos e dois enrolamentos"; o crítico respondia `não` quando não conseguia contar os dentes e `sim` quando a forma geral estava lá. O terceiro é a regra: com dois defeitos de forma ou mais a nota ficava em 8, e as dez respostas com dois, três, quatro ou seis defeitos deram todas 8, o que explica a amplitude 0 de cada ordem sozinha sem que as respostas fossem estáveis.

As três correções estão em [`vistas-para-critica.mjs`](../../../../tools/modelar/vistas-para-critica.mjs). A junção conta agora cada pergunta pela média das duas ordens: o defeito dado nas duas tira o peso inteiro, o dado numa só tira a metade, e o que nenhuma dá não tira nada. A nota das duas é assim a média das notas das duas ordens, a menos do arredondamento, e fica abaixo dela só quando uma ordem dá dois defeitos de critério ou mais e a outra nenhum, porque o primeiro defeito de critério tira mais que os seguintes; ela nunca passa da média. A não verificável continua listada à parte e não vira defeito inteiro, e a média de duas leituras varia menos que cada leitura sozinha. Escolhi a média e não o teto na menor das duas ordens porque o teto dá sempre a nota da pior ordem, já que o defeito confirmado nas duas está em cada uma, e a nota passaria a carregar a variação inteira da ordem mais severa.

A forma prometida de cada parte chega agora em afirmações simples, uma pergunta por afirmação. `semMedidas` tira do texto a medida com unidade, a coordenada, o intervalo de números e a contagem antes do nome (`36 raios cruzados` vira `raios cruzados` e `pinhão de 16 dentes` vira `pinhão com dentes`), e `afirmacoesDaForma` parte o que sobra nas vírgulas, nos dois-pontos e nos pontos e vírgulas de fora dos parênteses, juntando ao vizinho o pedaço que não se sustenta sozinho: o de uma palavra de conteúdo, como "superior" ou "com sulcos", e o de até duas que só qualifica o anterior, como "no movimento central" ou "achatados e afunilados". O nome da forma antes dos dois-pontos (`garfo reto`, `tubos redondos`) é a primeira afirmação e vai entre parênteses nas outras, e a parte só de medidas, como os botões do micro-ondas, vira a pergunta de que ela aparece nas imagens. O critério de reprovação sai sem medida, ou como está quando a medida é tudo o que ele diz. O pedido fechado diz que medida não se responde a olho, que a contagem e o milímetro se medem na malha, fora do pedido, e que a diferença que só uma medida diria não é `não`, e a seção das partes deixa de repetir a forma prometida com os números. A regra de partir é geral e foi lida sobre as 1.363 formas prometidas das receitas do repositório, que dão 2.305 afirmações; ela erra em frases como "do cubo sobe" na barra do caminhão de lixo, que fica compreensível pelo nome da parte, e uma lista de afirmações declarada no `PLANO` seria mais limpa, mas pede mudar o esquema dele, em `src/autoria/plano-de-modelagem.js`, fora deste plano.

A regra da nota passou a tirar o peso de cada defeito sem saturar. Cada vista com referência, a composta do alvo e cada parte valem um ponto, repartido igualmente entre as perguntas delas, para a parte de seis afirmações não pesar nem oscilar mais que a de uma; o primeiro defeito de critério tira 3 pontos e cada um dos seguintes tira 1, o que mantém o teto de 7 da regra anterior para a peça com defeito estrutural e o 6 e o 5 dela sem defeito de forma; a nota é 10 menos o que os defeitos tiram, com uma casa decimal, até 0. Cada pergunta de forma diz no pedido quanto o `não` dela tira. A pergunta gravada antes do peso vale pela origem, e `--juntar` relê as respostas antigas pela regra nova.

Relidas pela regra nova, com as perguntas de então valendo um ponto cada, as mesmas dez respostas dão 8, 6,5, 7, 7,5 e 6,5 com as duas ordens juntas (amplitude 1,5, desvio 0,58), 8, 6, 7, 8 e 8 só na ordem A (amplitude 2, desvio 0,8) e 8, 7, 7, 7 e 5 só na B (amplitude 3, desvio 0,98). A saturação escondia a instabilidade das respostas: pela regra que separa, cada ordem sozinha varia mais que o pedido de hoje, e a média das duas varia menos que cada uma, mas ainda um pouco mais que ele. O que resta vem das perguntas que mudaram, que são o que a divisão em afirmações ataca, e o item 8 fica em aberto até a medida se repetir com os pedidos novos.

O processo não pegou nenhum dos três. O teste da regra conferia 10, 9 e 8 com duas perguntas de forma, e nenhum tinha várias perguntas mudando entre as ordens nem conferia a saturação; nenhum gate olha se a pergunta fechada traz número. Os testes novos, em [`vistas-para-critica.test.mjs`](../../../../tools/modelar/vistas-para-critica.test.mjs), cobrem a nota que não passa da melhor ordem quando todas as perguntas de defeito mudam (dois defeitos em cada ordem, todos diferentes, dão 8 e não 10), a meia pergunta do `não dá para ver` contra o `não`, a nota que desce com quatro defeitos de forma em vez de parar em 8, o peso repartido na parte de quatro afirmações, a pergunta antiga sem peso, a retirada de medida, coordenada, intervalo e contagem nas frases da bicicleta, do caminhão e do furgão, e a parte só de medidas.

O pacote grava também `dados-do-pedido.json`, os mesmos dados de que os três pedidos saem, e `--refazer-pedidos=<pasta da rodada>` refaz o `pedido.md`, os dois fechados e o `perguntas-fechadas.json` por ele, sem capturar nada, para a próxima mudança de pergunta ou de regra não custar os 8 minutos do pacote. A pasta de antes desta mudança não tinha os dados, e o pacote da bicicleta foi refeito inteiro, pelo mesmo comando da fatia, em uns 8 minutos. Os pedidos novos citam as mesmas 49 imagens de antes, nas duas ordens, e têm 45 perguntas: as duas das referências, 37 afirmações das 15 partes (de uma no canote, na catraca, na corrente e nas manoplas a seis no quadro) e os 6 critérios, nenhuma com contagem ou milímetro. `--refazer-pedidos` sobre o pacote refeito reproduz os quatro arquivos byte a byte. A medida do item 8 com eles, cinco pares, fica com quem conduz.

### A medida do item 8 com os pedidos refeitos, 2026-11-17

Os mesmos críticos, sobre os pedidos fechados refeitos (afirmações simples, sem medida nem contagem, e a regra nova da nota), em quatro pares das duas ordens; o quinto par não se completou porque a ordem A foi parada duas vezes pela salvaguarda do modelo do crítico, sem resposta. Pela regra, com as duas ordens: 8,8, 9, 9,4 e 9 (amplitude 0,6, desvio 0,22); só a ordem A: amplitude 0,2, desvio 0,1; só a ordem B: amplitude 1,2, desvio 0,47. O pedido de hoje deu 8, 7, 7, 7 e 8 (amplitude 1, desvio 0,49). A nota varia menos com as perguntas fechadas, e o item 8 passa. Duas ressalvas ficam escritas: a nota fechada é mais alta (média 9,05 contra 7,4), porque a medida saiu da pergunta e o crítico deixa de apontar diferença de tamanho, que passa a ser do `descrever`; e de 3 a 5 perguntas por repetição ainda viram não verificáveis, quase todas entre `não dá para ver` numa ordem e uma resposta na outra.


## Fatia 7: várias miras numa chamada, os eixos na prancha e os atritos por comando

### Várias miras numa chamada da bancada

`--mirar` aceita agora uma lista, `x,y,z[,d]/x,y,z[,d]/...`, com a distância de cada mira no quarto número (sem ele vale `--distancia` ou a padrão), e a chamada tira cada vista de `--vistas` em cada mira, na mesma página, com uma subida de servidor e navegador e uma execução da receita. Cada imagem leva a mira no nome, como já levava, e o relato de cada vista traz `mira`; duas miras que dariam o mesmo nome de imagem, ou a mesma mira repetida, são recusadas antes de abrir a bancada. A leitura da lista é `lerMiras`, em [`olhar-bancada.mjs`](../../../../tools/modelar/olhar-bancada.mjs), e os testes em [`olhar-bancada.test.mjs`](../../../../tools/modelar/olhar-bancada.test.mjs) conferem a ordem das câmeras e das imagens, a carga única da página e os nomes.

A medida refez a prancha da fatia 2 da família de componentes (`procedural/familias/componente-eletronico/prancha-2.js`, 12 miras com a distância de cada uma, nas vistas isométrica, isométrica de trás e superior, 900 px, sem contatos), que tinham sido 36 chamadas de uma mira e uma vista por script. As duas formas rodaram na mesma rodada, a lista antes e depois das 36 chamadas, com outro agente usando a bancada na máquina ao mesmo tempo:

| forma | chamadas | tempo |
| --- | --- | --- |
| uma chamada com a lista, antes | 1 | 70,8 s |
| 36 chamadas de uma mira e uma vista | 36 | 552,0 s (de 9,2 a 109,8 s cada) |
| uma chamada com a lista, depois | 1 | 62,6 s |

As 36 imagens da lista e as 36 das chamadas avulsas, com os mesmos nomes, são iguais pixel a pixel (diferença 0 em todos os canais), e as duas rodadas da lista também. A lista levou entre 11 % e 13 % do tempo das 36 chamadas.

### Para onde cada eixo do modelo cai na prancha

A prancha modelo e foto escreve, numa terceira linha do rótulo do modelo e em `modelo.eixos` do JSON, a frase de lado da vista, que [`lados-das-vistas.mjs`](../../../../tools/modelar/lados-das-vistas.mjs) já dava ao pacote do crítico: na vista direita, "olha de +x; +y fica em cima, +z fica à esquerda". A tabela das vistas da bancada (`VISTA_DO_ESBOCO`) passou do pacote do crítico para esse arquivo, que os dois usam. A frase é conferida pela projeção que a bancada mede dos pontos da escala (`eixosMedidosNaImagem`), e a captura que não projeta como a frase diz é recusada, para a prancha não sair com o lado errado escrito.

Na bancada de verdade, com a bicicleta em ortográfica, as seis vistas da prancha deram a medida igual à frase: na direita +z fica à esquerda e o ponto a z = +500 mm cai 622 px à esquerda do ponto a z = -500 mm, e na esquerda os mesmos 622 px à direita. A bicicleta tem a frente em +z, e a prancha da vista direita com a captura da esquerda no lugar da foto lateral tirada do outro lado mostra a frente à esquerda no modelo e à direita na foto, com a frase acima do modelo. O teste em [`prancha-de-referencia.test.mjs`](../../../../tools/modelar/prancha-de-referencia.test.mjs) usa uma forma assimétrica, um corpo com o nariz em +z, e confere que a frase diz +z à esquerda, que o nariz está à esquerda do corpo na imagem e que a extensão começa nele.

### Os atritos por comando em `medir:transcricao`

`npm run medir:transcricao -- --atritos[=N] <sessão.jsonl>` lê a transcrição e as dos subagentes dela, com a leitura de registros do `contar-comandos.mjs`, que passou para a ferramenta e é importada de lá (a linha de base da fatia 1 refeita com ela deu os mesmos números, nas duas janelas de `linha-de-base.json`). Cada chamada de shell é partida em trechos fora das aspas e sem o corpo dos heredocs, e cada trecho vira uma chave (`node <script>`, `node -e`, `npm run <x>`, `npx <ferramenta>`, `python3 <script>`), com o caminho do script sem a pasta da cópia isolada. O relatório dá as chaves chamadas mais de N vezes (padrão 10) e as que falharam, fora ler, navegar e versionar, com o tempo somado; os scripts criados em `tmp/` (do repositório, do sistema e do scratchpad) e quantas vezes rodaram; e as opções de Node fora do padrão do projeto (as de código na linha e a `--import` do `package.json`), também pelo `NODE_OPTIONS`. A ferramenta passou a responder a `--ajuda`, que a ajuda da opção nova pedia, e aceita `--raiz=`.

Sobre a sessão de 2026-11-13 a 2026-11-17 (o registro principal e 189 subagentes, 8.173 comandos de shell, 161 com falha), sem padrão dado, a lista trouxe a bancada entre as chaves repetidas, 152 chamadas diretas de `olhar-bancada.mjs` (10 falhas, 2,8 h somadas) e 123 por `npm run bancada` (5 falhas, 2,5 h), e a opção de memória do Node à frente das opções fora do padrão, `--max-old-space-size` em 48 comandos, com 6000, 6144 e 8192. Trouxe também 163 `sleep` (29 falhas, 4,9 h), 292 `rm` e 243 scripts criados em `tmp/`, em 295 escritas, rodados 434 vezes. Os números são os do registro lido em 2026-11-17, com esta fatia em curso, e nada dele entra no repositório além deles.

A primeira rodada sobre o registro deu à frente uma chave `1` com 2.623 chamadas: o `2>&1` partia o comando no `&`. O teste com a sessão de mentira não tinha o redirecionamento e não pegou; o `&` junto de `>` deixou de partir, e o teste passou a ter o caso.

## Fatia 8: skills, agente, documentação e o gate de saída

O `--ajuda` de cada comando já trazia as opções novas, conferido em 2026-11-17 com `--ajuda` em `olhar-bancada.mjs` (`--sobrescrever`, `--copia` e a lista de `--mirar`), `prancha-de-referencia.mjs` (as oito opções e a frase dos eixos), `vistas-para-critica.mjs` (o contorno sobreposto, os pedidos fechados, `--juntar`, `--notas` e `--refazer-pedidos`), `descrever-peca.mjs` (`--recusas`) e `medir-transcricao.mjs` (`--atritos`), e nenhuma ajuda mudou nesta fatia. A nota de quando usar cada comando e de quando o script livre continua está em [`comparar-com-a-referencia.md`](../../../../.claude/skills/criar-peca/references/comparar-com-a-referencia.md), uma consulta nova da skill `criar-peca`, que a aponta numa linha; a skill cabe no orçamento de leitura do roteiro `modelar/peca/nova` (16.490 de 16.500 bytes) porque quatro frases dela ficaram mais curtas. O agente `modelador` ganhou a seção "Comparar com a referência por comando", a consulta das rodadas fora do laço manda o pacote seguinte pelo pedido fechado, e a skill `contorno-da-imagem` diz que o crítico dela continua pelo roteiro do contorno e que o contorno fechado vai ao pacote da peça, com o trecho de encontro tracejado.

O laço que despacha o crítico passa a usar o pedido fechado nas duas ordens, com a nota de `--juntar`. A regra está em [O laço do crítico](../../usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico), que é a definição única que as skills dos laços apontam. O registro da rodada (`rodada-de-modelagem --registrar`) lê um `--critico` só e fica fora deste plano: até ele ler o par, a resposta da ordem A entra como veio, a nota das duas ordens vai em `--atrito` e a rodada que uma nota fecha e a outra não vai à pessoa; o registro do par foi ao backlog. `.claude/agents/critico-visual.md` não mudou. A skill `laco-de-modelagem` não recebeu a nota, porque é território do plano da leitura por partes, e ela chega à regra pelo link que já tem para O laço do crítico. A skill `contorno-da-imagem` e `REFERENCIA-E-CRITICA-VISUAL.md` não estão no território deste plano nem no de outro ativo, e mudaram a pedido de quem conduz.

As duas pranchas do item 1 foram refeitas em 2026-11-17 pelos comandos das fatias 3 e 4, com a frase dos eixos da fatia 7 em cada linha: a do selim em 30 s e a do pedal de x negativo em 33 s, com as mesmas escalas e extensões das tabelas acima (3,43 e 9,24 px/mm na prancha). Ficam em `tools/bancadas/out/prancha-bicicleta-urbana-selim-direita-frontal.png` e `tools/bancadas/out/prancha-bicicleta-urbana-pedais-copia-xmenos-direita-frontal.png`, fora do repositório, porque levam as fotos de terceiro.

| item do gate de saída | estado | evidência |
| --- | --- | --- |
| 1. a prancha do selim e a do pedal saem com um comando, na escala da régua, e a pessoa confirma que leem como as feitas à mão | o comando cumpre; a confirmação espera a pessoa | as duas pranchas acima, de um comando cada |
| 2. `descrever --recusas` dá a lista do núcleo em três peças, uma com recusa | passou | `npx vitest run tools/modelar/descrever-recusas.test.mjs`, 3 de 3 |
| 3. `--sobrescrever` refaz a pasta da bancada e recusa a outra, dizendo o caminho | passou | `npx vitest run tools/modelar/olhar-bancada.test.mjs -t sobrescrever`, 4 de 4 |
| 4. um pedal sai isolado e enquadrado sozinho | passou | `--copia=x-`, 13,7 a 15,7 px/mm contra 2,0 a 2,1 com os dois |
| 5. uma rodada de modelador com referência usa no máximo um quarto dos 42 em 83 | em aberto | a conta pela numeração da linha de base dá 7 em 83, mas nenhuma rodada de modelador com os comandos foi medida |
| 6. o crítico recebe o contorno sobreposto e a revisão registra a oscilação | em aberto | medido no ombro (6 e 5 com e sem o contorno, 7 e 6 com o tracejado), mas o contorno do ombro era resto de uma referência encerrada; os dois pacotes do selim, com e sem o contorno medido, estão prontos, e faltam os críticos |
| 7. a ajuda de cada comando e a nota nas skills | passou, menos a nota na `laco-de-modelagem` | esta seção |
| 8. a nota fechada varia menos e a pergunta que muda sai como não verificável | passou | amplitude 0,6 e desvio 0,22 contra 1 e 0,49, em quatro pares |

O item 5 pede uma rodada de modelador de verdade, com referência e com os comandos à mão, medida por `npm run medir:transcricao -- --atritos <sessão.jsonl>` e por `contar-comandos.mjs <sessão.jsonl> --tipo=modelador --listar-alvo` na janela dela; o agente desta fatia não despacha outro agente, e ela fica com quem conduz. O item 6 pede dois críticos em cada pacote do selim, com e sem o contorno, que estão prontos desde [a prova no selim](#a-prova-do-item-6-no-selim-da-bicicleta-2026-11-17).
