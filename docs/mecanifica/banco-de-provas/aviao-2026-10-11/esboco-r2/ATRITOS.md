# Avião de pequeno porte, segunda rodada: atritos da maquete e do plano de detalhe

Cada atrito traz o comando que o reproduz, a partir de `esboco-r2/aviao.esboco.json` no estado em que a maquete entrou no Detalhe por unidade. Os comandos usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json` e `R=docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias`.

## 1. `encaixa.em` não conta na ordem das unidades nem vira porta do Envelope

O `capo` se posiciona por `encaixa: { ancora: "fim", em: "fuselagem.frente" }`. O Condutor lista a unidade `motor` antes da `fuselagem` e mostra "sem portas" para as duas, de modo que o detalhe da fuselagem pode mover ou renomear a seção `frente` sem que o Envelope acuse, e o `--integrar` só falharia na leitura do mestre.

```bash
npm run esboco -- --condutor $A
```

## 2. A mensagem do andaime diz "gira em dois eixos" para uma rotação em um eixo

A `pontaD` é um loft de eixo x com `rotacao: [0, 0, 40]`, uma rotação só em torno de z. A blocagem a recusa com "a rotação não deixa nenhum eixo da forma sobre um eixo do mundo (gira em dois eixos)", e as medidas `envergadura`, `helice diametro` e `semi-envergadura da asa` ficam "não lidas na blocagem". A recusa é a documentada (a N2 não inclina sólido), mas o texto descreve a causa errada.

```bash
npm run esboco -- --condutor $A
```

## 3. O desvio da silhueta não diz onde está

Uma fenda de 65 mm entre o cone de cauda e a raiz do estabilizador, dentro da silhueta cheia da referência, deu desvio de 595 mm (28 células) com razão interseção/união de 0,95, e o relato e a imagem de `--imagem` não marcam a célula do desvio máximo. Achei o ponto lendo os pixels do PNG da imagem por fora do módulo.

```bash
cp $A docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/zz.esboco.json
npm run esboco -- --editar docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/zz.esboco.json "estabilizadorD.secoes[0].pos=290" "estabilizadorD.encaixa.em[0]=290" "profundorD.secoes[0].pos=290" "profundorD.encaixa.em[0]=290"
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/zz.esboco.json --referencia $R/topo.contornos.json --vista superior --imagem
rm docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/zz.esboco.json*
```

## 4. O contorno da frontal está espelhado em relação ao mundo do esboço

`frontal.contornos.json` guarda o x do desenho visto da proa, com `asaDir` em x negativo, e a conferência do esboço compara com o x do mundo (a direita do piloto em +x, como no topo). Declarar `partes: { "asaDir": ["asaD"] }` na frontal dá razão 0,00 e centro a 6.977 mm, e a entrada de `plano.referencia` não tem como espelhar. Por isso a frontal ficou só com a silhueta.

```bash
sed 's/"iou_min": 0.65, "partes": \[\]/"iou_min": 0.65, "partes": {"asaDir": ["asaD"]}/' $A > docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/zz.esboco.json
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/zz.esboco.json --referencia $R/frontal.contornos.json
rm docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/zz.esboco.json*
```

## 5. `--editar` não alcança `plano.*` nem as cópias de `arranja`

`--editar` recusa um caminho que não começa por forma, e a mensagem de `--remover` de uma cópia de `arranja` diz "não há forma com esse id" embora o `--descrever` liste a cópia.

```bash
npm run esboco -- --editar $A 'plano.referencia[2].partes=[]'
npm run esboco -- --editar $A --remover helicePa1
```

## Unidade helice (detalhe)

Os comandos desta seção usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json`, no estado em que a hélice foi integrada (cone e `helicePa` por `tipo: "familia"`, perfil `pa-de-helice`, repetida por `arranja`).

### 6. O `substitui` confere a forma da maquete contra a caixa da forma detalhada, e a pá da maquete estava em bandeira

A `helicePa` da maquete tem a corda de 230 mm ao longo de z e a espessura de 70 mm no plano do disco, de modo que a caixa dela em y é de 70 mm. A pá com 52 graus de incidência na raiz e 18 na ponta ocupa 195 mm em y, e o `--integrar` recusou com "a forma helicePa da maquete foi excedida: passa 91,5 mm em y", embora a caixa da unidade coubesse. O caminho foi `--refazer-envelope helice --de <detalhe>` com o motivo no histórico; o texto da recusa já aponta esse caminho, e o atrito está em a maquete ter sido escrita com a pá em bandeira sem que o gate da maquete o dissesse.

```bash
npm run esboco -- --condutor $A --historico | grep -i "envelope refeito"
```

### 7. O relato de sobreposição na vista superior acusa as pás vizinhas de um arranjo radial

Cada pá do `arranja` cobre a vizinha em 33 a 62% na vista superior, com folga real de 142 mm, e o relato sai no `--descrever --forma helicePa` como se fosse achado. O contrato `livres` não tem como declarar o par entre a fonte e as próprias cópias do arranjo (`helicePa` com `helicePa*`), então o ruído não se apaga.

```bash
npm run esboco -- $A --descrever --forma helicePa
```

### 8. A medida `helice diametro` mede a caixa em y de cinco pás, que depende da fase e não do diâmetro

Com cinco pás e a primeira em +x, a caixa em y vale cerca de 0,95 do diâmetro (2 x raio x sen 72 graus); o plano declara 2075 mm como diâmetro e a conferência lê 2106,8 mm com a pá de raio 1090 mm. A medida passa, mas o número que ela confere não é o diâmetro. Não editei o plano; o campo é `plano.medidas[nome=helice diametro].mede`, que poderia medir a distância entre a ponta da pá e o eixo (`{ "distancia": ["helicePa.+x", "eixoHelice"], "eixo": "x" }`).

```bash
npm run esboco -- $A --medidas | grep "helice diametro"
```

### 9. O `--detalhar` e o `--unidade` sobre o detalhe deixam imagens soltas na pasta do esboço

`--unidade helice --composta` rodado sobre `aviao-detalhe-helice.esboco.json` grava `aviao-detalhe-helice-unidade-helice-composta.png` ao lado do mestre, e o arquivo de detalhe fica na pasta depois do `--integrar`. Nada os remove nem os marca como transitórios.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao-detalhe-helice.esboco.json --unidade helice --composta
```

## Unidade motor (detalhe)

Os comandos desta seção usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json` e `D=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2`, no estado em que o motor foi integrado (capô e lábio da entrada de ar recortados pelo cortador `bocaDeAr`, escapes de casca).

### 10. Integrar de novo um detalhe que traz um cortador novo recusa por id repetido

O detalhe do motor declara o cortador `bocaDeAr`. A primeira integração o grava no mestre. Se o detalhe é corrigido depois (aqui, o comprimento do escape, que a medida `escape comprimento` acusou no mestre) e a mesma cópia é integrada outra vez, a recusa é `id "bocaDeAr" repetido`, porque o `--integrar` troca as formas visíveis da unidade e deixa no mestre o cortador, que não é visível. A recusa não diz o caminho. O que funcionou foi refazer o `--detalhar motor` (o cortador volta ao detalhe como entrada da unidade), repetir a edição e integrar. O comando abaixo reproduz com a cópia do detalhe de antes da correção, guardada fora da pasta.

```bash
cp <copia-do-detalhe-antes-da-correcao>.json $D/zz-motor.esboco.json
npm run esboco -- $A --integrar motor $D/zz-motor.esboco.json
rm $D/zz-motor.esboco.json*
```

### 11. A medida `escape comprimento` só aparece no mestre depois da integração

O detalhe isolado mostra `--descrever` sem divergência porque o plano mínimo dele não leva `medidas`. O escape com 440 mm de comprimento (referência 537 mm, tolerância 50 mm) passou no `--envelope` e na leitura do detalhe, e a divergência só saiu na leitura do mestre depois do `--integrar`, que gravou o mestre mesmo assim. O `--detalhar` poderia levar ao detalhe as medidas do plano que citam formas da unidade.

```bash
npm run esboco -- $D/aviao-detalhe-motor.esboco.json --medidas
npm run esboco -- $A --medidas | grep "escape comprimento"
```

## Unidade fuselagem (detalhe)

Os comandos desta seção usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json` e `D=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2`, no estado em que a fuselagem foi integrada (vãos de janela e rebaixo da porta recortados por cortadores, para-brisa e barbatana por loft).

### 12. A tolerância de 40 mm do gate aceita o vidro solto dentro do vão

A `janela2D` é uma caixa de 20 mm que apoia no piso do vão recortado pelo `corteJanela2D`. Afastada 30 mm do piso, ela deixa de tocar o piso e as paredes do vão, e o `--descrever` diz só "fuselagem toca janela2D (folga 9,1 mm)" e "divergências: nenhuma", porque a folga até o casco, medida na superfície externa, é menor que a tolerância. Não há como declarar que a peça se apoia no piso do vão (o contrato `fixa` conta pontos de contato, e a folga de 9 mm já conta como contato).

```bash
cp $D/aviao-detalhe-fuselagem.esboco.json $D/zz.esboco.json
npm run esboco -- --editar $D/zz.esboco.json "janela2D.centro[0]=798"
npm run esboco -- $D/zz.esboco.json --descrever --forma janela2D
rm $D/zz.esboco.json*
```

### 13. Não há âncora nem medida que dê o semicomprimento do casco numa cota z qualquer

O piso do vão da janela, a face externa da porta e o corte do rebaixo dependem da meia-largura do casco em cada z, e as âncoras do loft só existem nas seções nomeadas (`frente`, `cabine`, `cauda`, `ponta`). Calculei a meia-largura por interpolação linear das seções fora do módulo e escrevi os números nas seções da `porta`, do `cortePorta` e nos centros das janelas, de modo que mudar uma seção da `fuselagem` não move o vão nem a porta. A superfície suave (PCHIP) difere da interpolação linear em até 13 mm na porta, que ficou com a face externa em polígono convexo e o piso plano para compensar.

```bash
npm run esboco -- $D/aviao-detalhe-fuselagem.esboco.json --descrever --forma fuselagem | grep "âncoras"
```

## Correção do Marco de 50% (unidades motor e fuselagem)

Os comandos desta seção usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json` e `D=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2`. Quando o comando pede o estado de antes da correção, ele sai do último commit com `git show HEAD:<caminho>`.

### 14. Nenhuma medida confere para onde o escape aponta, e o escape de abas planas passou em tudo

O escape do commit anterior saía 425 mm de lado e recuava 110 mm, com a abertura olhando para o flanco, enquanto a `funcao` da unidade diz que os escapes "se curvam para trás". O `escape comprimento` mede só a caixa em z (530 mm contra 537 mm declarados) e a leitura do mestre não traz divergência, de modo que o crítico foi quem pegou o defeito. O que falta é uma medida do recuo do fim do escape em relação ao início, por exemplo `{ "distancia": ["escapeD.inicio", "escapeD.fim"], "eixo": "z" }` em `plano.medidas` (cerca de 430 mm no escape novo). Não editei o plano.

```bash
git show HEAD:docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json > $D/zz.esboco.json
npm run esboco -- $D/zz.esboco.json --medidas | grep escape
npm run esboco -- $D/zz.esboco.json --descrever | grep divergências
rm $D/zz.esboco.json*
```

### 15. O `--detalhar` regrava o arquivo de detalhe que já existe sem avisar

Rodar `--detalhar motor` sobre uma unidade já integrada grava de novo `aviao-detalhe-motor.esboco.json` a partir do mestre e apaga o conteúdo anterior, sem dizer que o arquivo existia. Qualquer edição do detalhe que não tenha sido integrada se perde. É o caminho que o atrito 10 manda seguir, e por isso o aviso faria falta.

```bash
npm run esboco -- --editar $D/aviao-detalhe-motor.esboco.json "escapeD.diametro=210"
npm run esboco -- $A --detalhar motor
grep -c '"diametro": 210' $D/aviao-detalhe-motor.esboco.json
```

### 16. A asa vizinha em cinza lê como parte da fuselagem e vira um "bojo cônico" no flanco inferior

Na vista lateral da fuselagem, a `asaD` entra como vizinha com o mesmo contorno escuro e o mesmo hachurado das formas da unidade, e a projeção lateral da asa de ponta levantada (corda de 1.762 mm na raiz e 630 mm na ponta, 550 mm mais alta) aparece como um cone assentado sobre o flanco, sob as janelas. O crítico da unidade o apontou como defeito da fuselagem ("bojo cônico no flanco inferior, sob a asa, contra uma lente baixa e longa"). Sem as vizinhas o cone some, e a lente da referência está no mapa da lateral como parte da região `asa` (x de 165 a 282 px), de modo que cabe à unidade asas. Não mudei a fuselagem por causa disso; a nota de passagem da fuselagem diz o mesmo.

```bash
npm run esboco -- $A --unidade fuselagem --vista lateral --largura 1600 --forçar
npm run esboco -- $A --unidade fuselagem --vista lateral --largura 1600 --sem-vizinhos --forçar
```

### 17. O cotovelo do tubo sai com um leque de traços finos nas vistas superior e isométrica

Cada seção reta de 6 graus do cotovelo do escape deixa um traço de aresta, e o conjunto lê como hachura ou serrilha no ponto onde o tubo vira. Na vista superior do motor o leque aparece do tamanho do próprio escape.

```bash
npm run esboco -- $D/aviao-detalhe-motor.esboco.json --unidade motor --vista superior --forçar
```

### 18. O gate acusa "travessia de lado a lado" para uma placa que só afunda no dorso

O para-brisa novo (loft de eixo x com seção em paralelogramo, 1.336 mm de largura e 50 mm de espessura) assentado sobre o dorso sem a elevação de 30 mm dá `fuselagem e parabrisa se penetram 47,4 mm (... parabrisa cruza fuselagem de lado a lado (travessia, e não encaixe))`. A placa cobre o dorso em x e entra no casco só 47 mm, e a expressão "de lado a lado" descreve a caixa dela em x, não uma travessia. A sugestão de mover 63,2 mm em y resolve, mas a mensagem faz parecer que a peça atravessa o casco inteiro.

```bash
cp $D/aviao-detalhe-fuselagem.esboco.json $D/zz.esboco.json
npm run esboco -- --editar $D/zz.esboco.json "parabrisa.desloca=[0,0,0]"
npm run esboco -- $D/zz.esboco.json --descrever
rm $D/zz.esboco.json*
```

## Unidade asas (detalhe)

Os comandos desta seção usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json`, `D=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2` e `R=docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias`, no estado em que as asas foram integradas (asa e ponta levantada pela família `superficie-aerodinamica`, flap e aileron em vãos recortados com folga de 12 mm).

### 19. Cortar a ponta levantada de uma forma de família acusa `recorte-vazio` e o volume sai negativo

A asa inteira da família (perfil `asa`, `pontaLevantada` 56) com um cortador que retira só a ponta, a partir de x 6.065,7 mm, tem a caixa encolhida até esse x (o corte acontece), mas a leitura diz `cortaPontaD (não toca a forma); retira 0 cm3` e o plano reprova com a divergência `recorte-vazio`, que bloqueia o `--feito` da unidade. A mesma conta no outro sentido (a asa inteira menos o cortador da parte de dentro, para ficar só a ponta) dá `retira 1017880 cm3 e sobram -118792 cm3`, um volume negativo, de modo que as peças convexas da ponta curva têm volume com sinal invertido e a diferença entre o volume antes e depois não conta o que saiu. O contorno foi dividir a asa em duas chamadas da família: a parte reta, com `pontaLevantada` 0 e a envergadura menor (a conta do volume dá positivo ao cortar o trecho reto), e a ponta curva, que perde a parte de dentro.

```bash
cp $A $D/zz.esboco.json
npm run esboco -- --editar $D/zz.esboco.json "asaD.parametros.pontaLevantada=56" "asaD.parametros.envergadura=asaSemi" "asaD.parametros.cordaNaRaiz==asaCRaiz/asaSemi" "asaD.parametros.cordaNaPonta==asaCPonta/asaSemi" "asaD.parametros.espessuraNaPonta=0.13"
npm run esboco -- $D/zz.esboco.json --descrever --forma asaD | grep -E "recorte|divergência"
npm run esboco -- $A --descrever --forma pontaD | grep recorte
rm $D/zz.esboco.json*
```

### 20. O plano cita `pontaD` por id em quatro campos, e o `--integrar` só reescreve o contrato

A asa e a ponta levantada saem de uma chamada da família, de modo que `pontaD` e `pontaE` deixariam de existir. O `--integrar` avisa dos pares de `plano.contrato` que citam a forma e manda reescrevê-los no detalhe, mas `plano.medidas` (`semi-envergadura da asa`), `plano.pecas` (`ponta levantada da asa`, obrigatória) e `plano.referencia` (`asaDir` e `asaEsq`) citam o mesmo id e só aparecem depois, quando a leitura do mestre é recusada e o mestre fica ilegível. Não editei o plano: mantive `pontaD` e `pontaE` como a ponta curva da mesma superfície, o que obrigou o corte em duas chamadas do atrito 19. Se a ponta fosse parte da asa, o campo a mudar seria `plano.pecas` (juntar `ponta levantada da asa` em `asa, duas metades`), `plano.medidas` e `plano.referencia`, e o `--integrar` poderia avisar desses três como avisa do contrato.

```bash
cp $A $D/zz.esboco.json
npm run esboco -- --editar $D/zz.esboco.json --remover pontaD
rm $D/zz.esboco.json*
```

### 21. A razão interseção/união sai com duas casas e `0,85 reprova` convive com `0,85 passa`

Na vista superior o flap e o aileron com o mínimo de 0,85 saem como `razão interseção/união 0,85: reprova` para o aileron direito e `0,85: passa` para o esquerdo, porque a razão é arredondada na saída e comparada sem arredondar. Quem lê não sabe se falta um milésimo ou um décimo. O comando abaixo reproduz com as medidas do primeiro desenho dos comandos (flap de x 910 a 4.850 e aileron de x 4.930 a 6.030).

```bash
cp $A $D/zz.esboco.json
npm run esboco -- --editar $D/zz.esboco.json "parametros.f1X=910" "parametros.f2X=4850" "parametros.a1X=4930" "parametros.a2X=6030" "parametros.a1L==0.355*a1C" "parametros.a2L==0.355*a2C"
npm run esboco -- $D/zz.esboco.json --referencia $R/topo.contornos.json --vista superior | grep -E "aileron|flapEsq"
rm $D/zz.esboco.json*
```

### 22. O contorno do topo traz o flap esquerdo começando em x 1.132 e o direito em x 910, e `plano.referencia` não tem como dizer isso

`topo.contornos.json` tem `flapDir` de x 910 a 4.933 e `flapEsq` de x 1.132 a 4.944 (o mesmo desenho, dos dois lados, com 220 mm de diferença na raiz), e o contrato `simetricas` pede flaps iguais. Com o flap a partir da fuselagem nos dois lados, a parte esquerda dá razão 0,85 contra 0,91 da direita. O flap ficou em x 960 nos dois lados, a meio caminho, e a referência passou com 0,86 e 0,91. Uma tolerância por parte em `plano.referencia`, ou o aceite da assimetria de uma parte, evitaria deslocar o flap para caber na conferência.

```bash
npm run esboco -- --medidas-da-referencia $R/topo.contornos.json --vista superior | grep -E "parte flap"
```

### 23. O Envelope por `substitui` não aceita uma forma de família que cobre duas formas da maquete

Quando a asa e a ponta levantada saem de uma chamada só, `substitui: "asaD"` confere a caixa inteira da família contra a asa da maquete (que acaba em x 6.050) e reprova com `asaD passa 362,6 mm em x`, embora a ponta da maquete (`pontaD`) cubra o resto. Sem o `substitui` a forma cai na caixa da unidade, que confere só o conjunto. O contorno foi o corte em duas chamadas do atrito 19, cada uma com o próprio `substitui`.

```bash
cp $D/aviao-detalhe-asas.esboco.json $D/zz-asas.esboco.json
npm run esboco -- --editar $D/zz-asas.esboco.json "asaD.parametros.envergadura=asaSemi" "asaD.parametros.pontaLevantada=asaPontaGraus" "asaD.parametros.cordaNaRaiz==asaCRaiz/asaSemi" "asaD.parametros.cordaNaPonta==asaCPonta/asaSemi" "asaD.parametros.espessuraNaPonta=0.13" 'asaD.subtrai=[{"forma":"flapD","folga":"asaFresta"},{"forma":"aileronD","folga":"asaFresta"}]'
npm run esboco -- $A --envelope asas $D/zz-asas.esboco.json
rm $D/zz-asas.esboco.json*
npm run esboco -- $A --envelope asas $D/aviao-detalhe-asas.esboco.json
```

A última linha refaz o registro do Condutor: o `--envelope` reprovado também grava `envelope reprovado com zz-asas.esboco.json` na unidade, e o Portão de Detalhe só volta a ler `envelope conferido` depois de uma conferência que passa.

### 24. Posicionar o flap e o aileron na linha de dobradiça da família pede 44 expressões à mão

A família não publica a linha de dobradiça nem o bordo de fuga da asa sem comando como âncora (só `raiz`, `eixo-da-dobradica` e as seis faces da caixa, que no caso da asa com diedro e ponta é a caixa inteira), de modo que o centro, a corda e a espessura de cada seção do flap e do aileron saem de 56 parâmetros que repetem a planta da asa (`asaCRaiz`, `asaFlecha`, `asaDiedro`...) e de 44 expressões nos polígonos das seções. Mudar a flecha ou a corda da asa move o flap junto, mas errar um fator de uma linha desloca uma seção sem o gate acusar. Uma âncora `bordo-de-fuga` por estação, ou um `comando` da família que aceite mais de um trecho (o flap e o aileron na mesma superfície), tiraria o cálculo.

```bash
npm run esboco -- $A --descrever | grep -o "parâmetros: .*" | tr ';' '\n' | wc -l
```

## Unidade empenagem-horizontal (detalhe)

Os comandos desta seção usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json`, `D=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2` e `R=docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias`, no estado em que o estabilizador e o profundor foram integrados (estabilizador pela família com o profundor recortado com fresta de 12 mm, profundor com ressalto na ponta, eixo no vão e três suportes por lado).

### 25. A maquete passou na conferência da silhueta com um profundor 205 mm mais raso que o da referência

O profundor da maquete tinha a linha de dobradiça reta até a ponta (caixa z de 9.810 a 10.289, 479 mm), e a referência do topo o mede com 684 mm (z 4543 a 5228 no contorno, 9.605 a 10.290 no mundo), por causa do ressalto da ponta, que avança 170 mm para a frente. A conferência da silhueta deu `razão interseção/união 0,90: passa` para as duas metades, e `plano.medidas` não tinha medida da profundidade do profundor, de modo que nada acusou até o detalhe ser desenhado olhando a imagem. O Envelope da unidade recusou o detalhe depois (`profundorD passa 170 mm em z`) e foi refeito com `--refazer-envelope`. A linha `profundorDir.profundidade` que `--medidas-da-referencia` sugere não entra no plano sozinha, e o `iou_min` de 0,65 da frontal e 0,85 do topo deixa passar uma diferença dessas.

```bash
git show 4036e06e:docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json > $D/zz.esboco.json
npm run esboco -- $D/zz.esboco.json --referencia $R/topo.contornos.json --vista superior | grep profundorDir
npm run esboco -- $D/zz.esboco.json --descrever --forma profundorD | grep -o "caixa x.*"
npm run esboco -- --medidas-da-referencia $R/topo.contornos.json --vista superior | grep "parte profundorDir"
rm $D/zz.esboco.json*
```

### 26. A família não publica a espessura do perfil na linha de dobradiça, e o nariz do profundor foi desenhado com número calculado fora do módulo

O nariz do profundor tem de ter a espessura que o estabilizador tem na linha de dobradiça, e a família só publica o centro, as seis faces da caixa, a raiz e o `eixo-da-dobradica` (que com `comando` 0 cai no meio da superfície, em [543 2129,7 9913,5], sem relação com a dobradiça). As quatro espessuras `eT0` a `eT3` (88, 49, 66 e 63 mm) saíram do polinômio do perfil simétrico a 60% e 42% da corda, calculado à mão, e mudar a corda ou a espessura relativa do estabilizador não as move. É o mesmo atrito 24 das asas, agora para a espessura em vez do bordo de fuga: uma âncora `dobradica` por estação, com a espessura, tiraria o cálculo.

```bash
npm run esboco -- $A --descrever --forma estabilizadorD | grep "âncoras"
```

## Blocagem (achados de quem orquestra)

### 27. A blocagem levava a forma de família inteira quando um molde cortava a ponta, e a família inteira já não coincide com o desenho

O gate de silhueta pela blocagem (`tools/mecanifica/esboco-blocagem.test.mjs`) reprovou a hélice, o motor e as asas desta rodada. A hélice e o motor eram defeitos da blocagem e do desenho com recorte, corrigidos na origem. Nas asas, a ponta levantada sai de um molde que corta a asa inteira da família, e o andaime levava a forma inteira, com o envelope 79 mm maior; agora a forma cujo recorte muda o envelope sai em `semEquivalente` com o motivo. Fica o achado de que a família `superficie-aerodinamica` inteira, sem recorte, dá IoU 0,89 na isométrica contra o desenho num caso mínimo (envergadura 3000, corda 0,3 e 0,15), pelo casco convexo por seções; nenhum teste cobre uma asa de família na blocagem. O processo pegou as três reprovações pelo gate; a coincidência da família inteira não tem gate.

```bash
npx vitest run tools/mecanifica/esboco-blocagem-casos.test.mjs
npx vitest run tools/mecanifica/esboco-blocagem.test.mjs -t aviao
```

## Unidade empenagem-vertical (detalhe)

Os comandos desta seção usam `A=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json`, `D=docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2` e `R=docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias`, no estado em que a deriva (módulo `derivaVertical`: lâmina pela família e filete dorsal) e o leme foram integrados. Os estados anteriores saem de `git show <commit>:<caminho>`.

### 28. O `--integrar` recusa a unidade que traz um módulo novo, embora a ajuda diga que o módulo novo entra

A deriva e o filete dorsal ficam sob o id `deriva` porque o plano cita `deriva` por id, e a única forma de dois sólidos terem um id citável é uma instância de módulo. O detalhado traz `modulos.derivaVertical` e a instância `{ "id": "deriva", "usa": "derivaVertical" }`, e o `--integrar` expande o mestre com a unidade trocada antes de copiar o `modulos` do detalhado, de modo que recusa com `o componente "derivaVertical" não existe`. O contorno foi escrever o módulo no mestre à mão e integrar depois. A ajuda de `--ajuda detalhar` diz que o módulo novo entra.

```bash
git show 422816c5:$A > $D/zz.esboco.json
git show 52a234c4:$D/aviao-detalhe-empenagem-vertical.esboco.json > $D/zz-detalhe.esboco.json
npm run esboco -- $D/zz.esboco.json --integrar empenagem-vertical $D/zz-detalhe.esboco.json
rm $D/zz*.esboco.json*
```

### 29. A família recusa `cordaNaRaiz` acima de 0,8 e a deriva tem a corda da raiz quase igual à altura

A deriva da referência tem 1.956 mm de corda na raiz para 1.965 mm de altura (razão 0,995), e a família aceita `cordaNaRaiz` de 0,02 a 0,8 da envergadura. O contorno foi chamar a família com `simetria: 1` (a envergadura vira o dobro da altura, a razão cai a 0,50) e cortar a metade de baixo com um molde de caixa no plano da raiz (`deriva.corteRaiz`). O volume que o recorte retira sai grande (408.524 cm3 na leitura da forma) e a metade espelhada entra no gate como peças que nunca aparecem.

```bash
cat > $D/zz.esboco.json <<'JSON'
{ "opcoes": [ { "titulo": "deriva", "formas": [ { "id": "deriva", "tipo": "familia", "familia": "superficie-aerodinamica", "perfil": "deriva", "centro": [0, 0, 0],
  "parametros": { "envergadura": 1965, "simetria": 0, "orientacao": 1, "cordaNaRaiz": 0.995, "cordaNaPonta": 0.361, "enflechamento": 38.9, "comando": 0, "comandoDiferencial": 0 } } ] } ] }
JSON
npm run esboco -- $D/zz.esboco.json --descrever
rm $D/zz*.esboco.json*
```

### 30. O plano cita `deriva` por id em quatro campos e o detalhe que a divide em duas formas só passa se uma instância guardar o id

O mapa de partes da lateral (`plano.referencia`), o contrato (`tocam` e `fixa`) e o inventário (`plano.pecas`) citam `deriva`, e o contorno da referência dessa região inclui o filete dorsal (3.063 mm de profundidade, de z 6.943 a 10.006). Com a lâmina e o filete como duas formas soltas a conferência da lateral deu `deriva` com desvio de 979,5 mm e razão interseção/união 0,83 (a lâmina sozinha tem 2.233 mm de profundidade), e o `--feito` ficaria recusado. Como o esbocista não edita o plano, as duas formas viraram uma instância de módulo com o id `deriva`, que o seletor do plano já lê como o conjunto das partes (`[deriva.fin, deriva.dorsal]`). É o mesmo defeito do atrito 20: o `--editar` não alcança `plano.*` e o `--integrar` não avisa de `plano.referencia`.

```bash
npm run esboco -- $A --referencia $R/lateral.contornos.json --vista lateral | grep "parte deriva"
```

### 31. A conferência da silhueta dá cada célula a uma forma só, a mais próxima do olho, e as carenagens de dobradiça tiram células do leme

Com as três carenagens de dobradiça do lado +x a razão do leme na lateral sai 0,86 contra 0,88 sem elas (mínimo 0,85), embora o contorno do leme seja o mesmo. As carenagens cobrem parte do leme e parte da deriva e a célula coberta passa a ser delas, de modo que o diferencial pequeno entre passar e reprovar vem de uma peça que a referência nem desenha. Na primeira versão (carenagens de 300 mm de comprimento e 90 mm de altura) a razão foi 0,83 e reprovou; reduzi as carenagens a 230 mm e 70 mm.

```bash
cp $A $D/zz.esboco.json
npm run esboco -- $D/zz.esboco.json --referencia $R/lateral.contornos.json --vista lateral | grep "parte leme"
npm run esboco -- --editar $D/zz.esboco.json "dobradicaLeme1D.oculto=true" "dobradicaLeme2D.oculto=true" "dobradicaLeme3D.oculto=true"
npm run esboco -- $D/zz.esboco.json --referencia $R/lateral.contornos.json --vista lateral | grep "parte leme"
rm $D/zz*.esboco.json*
```

### 32. O `--nota-de-passagem` aceita texto de mais de 240 caracteres

A ajuda e o agente dizem que a nota tem até 240 caracteres, e o comando grava uma de 244 sem recusar nem avisar.

```bash
npm run esboco -- --condutor $A --nota-de-passagem empenagem-vertical --texto "A região deriva da referência inclui o filete dorsal, então lâmina e filete são o módulo deriva. O vão do leme é o cortador vaoDoLeme (fresta 12 mm); o leme tem o canto traseiro de baixo cortado e o ressalto no topo, como a referência."
```

### 33. A leitura do mestre com a deriva em família leva cerca de um minuto

Cada `--descrever` do mestre (ou do detalhe) depois da deriva por família de envergadura 3.930 mm (simetria 1, recortada pelo vão do leme e pela caixa da raiz) leva de 55 a 60 s, e o `--historico` do Condutor, que também lê o mestre, passou dos 120 s uma vez. Cada ajuste do detalhe custa essa leitura mais a do `--integrar`.

```bash
time npm run esboco -- $A --descrever
```

## Unidade trem-do-nariz (detalhe)

Os comandos desta seção usam `A`, `D` e `R` como na anterior, no estado em que o trem do nariz foi integrado (carenagem oca com o alojamento, pino de pivô, amortecedor, garfo de um braço, roda de família, compasso e atuador, e o curso `recolhe`).

### 34. O `--integrar` descarta em silêncio o `subtrai` que o detalhe escreve em forma de outra unidade, e o trem não consegue abrir o alojamento no casco que o recebe

O trem recolhe para dentro do ventre, e o recorte de uma forma por outra (`subtrai`) é a ferramenta para isso, mas a forma que perde volume é o capô (e a fuselagem), de outras unidades. No detalhe essas formas ficam ocultas e só servem de referência: o cortador novo entra no mestre (é forma da unidade trem-do-nariz), o `subtrai` do capô que o cita não entra, e o mestre acusaria `cortador-solto`. Nem o `--integrar` nem o `--descrever` do detalhe avisam que o `subtrai` foi descartado (o `--editar` do detalhe aceita o campo e a leitura do detalhe já diz que nenhuma forma subtrai o cortador). A saída foi fazer do alojamento a própria carenagem, oca e aberta por baixo, e deitar a roda (90 graus em torno da perna) para ela caber nos 225 mm de altura do alojamento, o que afasta o desenho do trem que recolhe dentro do casco.

```bash
cp $A $D/zz.esboco.json && cp $A.condutor.json $D/zz.esboco.json.condutor.json
npm run esboco -- $D/zz.esboco.json --detalhar trem-do-nariz
npm run esboco -- --editar $D/zz-detalhe-trem-do-nariz.esboco.json 'capo.subtrai=["bocaDeAr","alojamentoNariz"]'
npm run esboco -- $D/zz.esboco.json --integrar trem-do-nariz $D/zz-detalhe-trem-do-nariz.esboco.json
grep -n -A1 '"id": "capo"' $D/zz.esboco.json | head -3   # o subtrai do capô segue só com bocaDeAr
rm $D/zz*.esboco.json*
```

### 35. O `plano.contrato.tocam` do detalhe recusa o par com a forma oculta de outra unidade, e o `--integrar` tira do mestre o par que a unidade tinha com a vizinha

O detalhe que declara `plano.contrato.tocam` substitui todo par que cita a unidade. Escrever nele o par `["fuselagem", "carenagemTremNariz"]` dá `esboço recusado: ... plano.contrato: "fuselagem" não é uma forma visível da opção`, porque a fuselagem está oculta no detalhe. Sem o par, o `--integrar` diz `pares tirados (o detalhado declara os dele): tocam fuselagem + carenagemTremNariz`, e o contrato do mestre perde a relação da carenagem com o casco (a `fixa` com 2 pontos continua). Repus o par à mão no mestre. É a mesma família do atrito 20: o plano é escrito fora do alcance do `--editar` e a integração não avisa do que sai.

```bash
cp $A $D/zz.esboco.json && cp $A.condutor.json $D/zz.esboco.json.condutor.json
npm run esboco -- $D/zz.esboco.json --detalhar trem-do-nariz
# acrescente a mão em "plano" de zz-detalhe-trem-do-nariz.esboco.json: "contrato": { "tocam": [["fuselagem", "carenagemTremNariz"]] }
npm run esboco -- $D/zz-detalhe-trem-do-nariz.esboco.json --descrever
rm $D/zz*.esboco.json*
```

### 36. O curso gira um grupo só por forma, e o trem que recolhe e deita a roda exige cada ponto escrito com seno e cosseno

A roda do nariz gira em torno do pivô (recolhimento, 0 a 90 graus) e, ao mesmo tempo, em torno da perna (para deitar). `curso` com `formas` e `gira` dá uma rotação por forma, e uma forma em dois grupos é recusada. O contorno foi não usar `gira`: o parâmetro `tnCurso` entra por expressão em 10 pontos nomeados (`tnW`, `tnBracoAlto`, `tnLugJ`...) com `sin` e `cos` escritos à mão, e a `rotacao` da roda (`[0, tnEixoY, tnEixoZ]`) calculada da direção do eixo por `atan2`. É o cálculo de centro à mão que a skill manda evitar, e mudar o comprimento da perna exige reler todos os pontos.

```bash
cp $A $D/zz.esboco.json
# em "curso" de zz.esboco.json, acrescente a mão:
#   "a": { "parametro": "tnCurso", "de": 0, "ate": 90, "passos": 3, "formas": ["pernaNariz", "rodaNariz"], "gira": { "eixo": "x", "centro": "tnP" } },
#   "b": { "parametro": "tnFi", "de": 0, "ate": -90, "passos": 3, "formas": ["rodaNariz"], "gira": { "eixo": "y", "centro": "tnW" } }
npm run esboco -- $D/zz.esboco.json --curso a
# esboço recusado: opção 1 (...), giro 2: a forma "rodaNariz" já gira no giro 1; uma forma gira em um grupo só
rm $D/zz*.esboco.json*
```

### 37. As imagens do curso no brief só usam as quatro vistas de sempre, e no fim do curso o trem recolhido não aparece em nenhuma

O brief traz seis poses do curso, cada uma com as quatro vistas que olham de +x, +y e +z. Com o trem recolhido dentro da carenagem (tnCurso 90) as seis vistas mostram só a caixa da carenagem, e o crítico não vê a roda deitada nem a perna, que são o que o critério de não atravessar em nenhuma posição pergunta. As `vistas` da unidade (`inferior`, `frontal-oposta`) valem só para a pose de repouso, e o curso não aceita `--corte`. Gerei à mão a pose 90 vista de baixo e em corte `x=0`, em `aviao-critico-trem-do-nariz-recolhido/`, para quem despacha o crítico juntar ao brief.

```bash
npm run esboco -- --condutor $A --brief trem-do-nariz        # abra o curso-recolhe-90-composta.png do brief
cp $A $D/zz.esboco.json && npm run esboco -- --editar $D/zz.esboco.json parametros.tnCurso=90
npm run esboco -- $D/zz.esboco.json --unidade trem-do-nariz --vista inferior --largura 1100
npm run esboco -- $D/zz.esboco.json --unidade trem-do-nariz --vista lateral --corte x=0 --largura 1100
rm $D/zz*
```

### 38. A linguagem de expressões não tem `asin` nem `abs`

Para pôr o eixo da roda (a direção que sai de duas rotações seguidas) em `rotacao` precisei do arco seno, e a expressão recusa a função. O contorno é `atan2(s, sqrt(1-s*s))` com `s` o seno, que vale porque o seno ali nunca chega a 1. O menos unário vale (`=-tnCurso` é aceito); a mensagem lista as funções que existem (atan, atan2, sin, cos, tan, sqrt).

```bash
cp $A $D/zz.esboco.json
npm run esboco -- --editar $D/zz.esboco.json 'parametros.zz="=asin(0.5)"'
rm $D/zz*
```

### 39. O custo da unidade do trem: o curso e o `--feito` levam minutos

Com o trem do nariz integrado, `--curso recolhe` no mestre leva 2 min 21 s (10 posições, cada uma com o gate completo e a roda de família), `--descrever` do mestre 1 min 12 s (1 min 05 s antes da unidade, então a unidade soma 7 s) e `--feito trem-do-nariz` 6 min 06 s (as sete vistas, as seis poses do curso e o brief). Cada passada do laço de ajuste do detalhe isolado custa de 50 s a 2 min por causa das famílias das outras unidades trazidas à vista pelo curso.

```bash
time npm run esboco -- $A --curso recolhe
time npm run esboco -- --condutor $A --feito trem-do-nariz
```
