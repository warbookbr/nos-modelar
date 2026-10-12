# Atritos do esboço do avião

Cada atrito traz o comando que o reproduz, a partir da raiz do repositório.

## 1. A conferência por parte não se desliga

Toda forma cujo id coincide com o nome de uma região do contorno (capo, cone, fuselagem, deriva, leme, parabrisa, barbatana) é comparada com ela, e `plano.referencia.partes` não aceita lista vazia. A razão interseção/união mede a partição por watershed da imagem, e não a forma: fuselagem 0,67, barbatana 0,45, parabrisa 0,11 num esboço cuja silhueta tem 0,92. Contornei com cópias dos contornos só com a silhueta e as regiões comparáveis (`lateral.conferencia.contornos.json`, `topo.conferencia.contornos.json`).

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --referencia docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.contornos.json --vista lateral
```

## 2. Vistas do mesmo objeto com origens de z diferentes

Na lateral o z vai de 0 (proa) a 10470; no topo vai de -5062 a 5382, com o zero na asa. `plano.referencia` não aceita deslocamento para JSON de contornos, então uma só origem de esboço não confere as duas vistas. Contornei com uma cópia do topo com v deslocado em -5059 mm.

```bash
npm run esboco -- --medidas-da-referencia docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.contornos.json | grep silhueta
npm run esboco -- --medidas-da-referencia docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.contornos.json --vista superior | grep silhueta
```

## 3. A silhueta da frontal vem assimétrica

O contorno da silhueta da frontal vai de x -6400 a 4377,6 (a asa direita cortada), e a conferência a compara com o esboço simétrico (razão 0,44). A frontal ficou fora da conferência.

```bash
npm run esboco -- --medidas-da-referencia docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.contornos.json | grep silhueta
```

## 4. `--medidas-da-referencia` não deduz a vista de `topo.contornos.json`

Recusa e pede `--vista superior`, embora o nome do arquivo seja o da vista de topo e o `--referencia` aceite `lateral.contornos.json` pelo nome.

```bash
npm run esboco -- --medidas-da-referencia docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.contornos.json
```

## 5. A blocagem não traduz a pá girada em dois eixos

As pás `pa1` a `pa4` (caixa girada em y e copiada em torno de z) não têm equivalente no andaime, e a medida `helice.largura` é lida no esboço. A pá torcida do detalhe terá o mesmo problema.

```bash
npm run esboco -- --condutor docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json | grep helice
```

## 6. Contrato `fixa` com face contra face conta um ponto

O capô se prende ao fogo por uma face, e `contrato.fixa` com `pontos: 2` reprova com 1 ponto. Baixei para 1 no plano.

## 7. As famílias de procedural/familias não entram no JSON do esboço

`roda-pneu` e `cilindro-hidraulico` só se alcançam pelo `--envelope <unidade> <receita.js>` com `REFINA`. No JSON usei o componente `roda` e cilindros em `de`/`para` com `ligar`.

## 8. Peça inteira dentro de outra reprova mesmo sendo encaixe

O gate mede a penetração pelo menor eixo de separação, e um tubo de escape cuja base fica dentro do capô acusa 73 mm. A passagem implícita da mesma unidade só vale para par declarado em `contato.juntas`, o que obriga a listar cada par intra-unidade.

Para reproduzir, tire de `contato.juntas` a junta `["capo", "escapeE"]` de uma cópia do esboço e rode `npm run esboco -- <cópia> --descrever`.

## 9. As vistas da unidade enquadram o avião inteiro pequeno no quadro

Nas quatro vistas que o `--feito fuselagem` gravou, com 1100 px de largura, o
avião ocupa cerca de um terço da largura e o resto é branco; janelas, porta e
barbatana ficam com poucos pixels. O crítico da fuselagem disse que esses
detalhes estavam "no limite do que dá para afirmar" e deixou a porta como
dúvida. O brief não grava o texto em arquivo, só na saída do comando; para
despachar o crítico, a sessão principal teve de rodar o `--feito` de novo.

```bash
python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open('docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-fuselagem/aviao-unidade-fuselagem-lateral.png').convert('L'))[120:1100]; xs=np.nonzero((a<200).any(0))[0]; print('largura ocupada', xs.max()-xs.min(), 'de', a.shape[1])"
```
