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
