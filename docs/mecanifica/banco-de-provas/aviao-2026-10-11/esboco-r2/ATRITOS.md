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
