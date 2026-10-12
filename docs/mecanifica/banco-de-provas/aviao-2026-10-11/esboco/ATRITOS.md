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
avião ocupa 499 dos 1100 px de largura, e na altura 180 dos 980 px úteis; janelas, porta e
barbatana ficam com poucos pixels. O crítico da fuselagem disse que esses
detalhes estavam "no limite do que dá para afirmar" e deixou a porta como
dúvida. O brief não grava o texto em arquivo, só na saída do comando; para
despachar o crítico, a sessão principal teve de rodar o `--feito` de novo.

```bash
python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open('docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-fuselagem/aviao-unidade-fuselagem-lateral.png').convert('L'))[120:1100]; xs=np.nonzero((a<200).any(0))[0]; print('largura ocupada', xs.max()-xs.min(), 'de', a.shape[1])"
```

Na unidade motor, o esbocista achou a causa: o quadro da unidade inclui a
vizinha que ela toca, e a fuselagem entra inteira.

A ajuda diz que o enquadramento continua em torno da unidade, mas o capô toca a fuselagem e esta entra inteira (10 m) no quadro, de modo que o motor (1,7 m) ocupa cerca de um décimo de cada vista e o detalhe de escapes, venezianas e painel some. Sem vizinhos o quadro fecha no motor. Contornei gravando as imagens do crítico com `--sem-vizinhos`, o que perde o contexto do ponto onde o capô se prende.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade motor --composta --largura 1600
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade motor --composta --largura 1600 --sem-vizinhos
```

## 10. Loft sem posição vai para a origem e o esboço isolado não o acusa solto

Um loft sem `encaixa`, `centro` nem `sobre` é centrado na origem pelo centro da caixa dos vértices, e os `centro` das seções valem só como deslocamento relativo. No isolado de `--detalhar motor`, a entrada de ar e a boca dela, a 800 mm do capô, saíram com `divergências: nenhuma`, porque o grupo flutuante de duas formas não conta como solta enquanto as outras unidades estão ocultas. Só `--forma entradaAr` mostrou o centro `[0 0 0]`.

Para reproduzir, tire o `encaixa` da `entradaAr` de uma cópia de `aviao-detalhe-motor.esboco.json` (guardada ao lado do estado do Condutor) e rode:

```bash
npm run esboco -- <cópia>.esboco.json --descrever
npm run esboco -- <cópia>.esboco.json --forma entradaAr
```

## 11. As vistas da unidade levam o subtítulo do objeto

As quatro vistas do crítico de cada unidade saem com o título e o subtítulo do
objeto ("Maquete do avião inteiro, com a proa em z 0"), embora o brief diga
"sem legenda". O crítico do motor estranhou a legenda, que descreve o avião
inteiro numa imagem que mostra só o capô.

```bash
python3 -c "print(open('docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-motor/brief.md').read().count('sem legenda'))"
```

## 12. Nenhuma das quatro vistas olha do nariz, e a boca da entrada de ar fica oculta

A frontal olha de +z, a isométrica de [1, 1, 1], a lateral de +x e a superior de +y. Como o avião tem a proa em z 0 e a cauda em z positivo, as quatro olham pela traseira ou de lado, e uma face voltada para -z (a boca da entrada de ar sob o cone, o lábio do capô) não aparece em nenhuma delas. A frontal da unidade motor mostra o fogo do capô (a face traseira) e a entrada de ar só aparece como uma faixa cinza no perfil da lateral. Foi isso que o crítico leu como "não aparece como abertura em nenhuma vista" na rodada anterior, e a correção (casca aberta para -z com garganta escura) não muda o que as quatro vistas mostram. O `--corte x=0 --vista lateral` mostra a seção, mas o brief do `--feito` lista só as quatro vistas padrão.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade motor --sem-vizinhos --composta --largura 1600
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade motor --sem-vizinhos --corte x=0 --vista lateral --largura 1100
```

## 13. `--integrar` recusa o parâmetro que o detalhe reescreve, e a iteração deixa parâmetros órfãos no mestre

Cada volta de ajuste de um número de parâmetro do detalhe (a largura do capô em z 1600, a inclinação das venezianas, o desvio da entrada de ar) volta recusada com "o detalhado redefine o parâmetro ... dê outro nome no detalhado", e o único caminho é dar um nome novo a cada rodada. Os nomes antigos ficam no mestre sem uso (`capoLarg1600`, `venezianaInclina`, `escBaseX`, `escBaseZ`, `escDx`, `escDz`, `escAng`, `arDy`), e o `--descrever` do mestre os lista entre os parâmetros.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --integrar motor docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-motor.esboco.json
```

Para reproduzir, mude o valor de `entArDy` no detalhe e rode o comando de novo.

## 14. A caixa da forma da maquete vira restrição da forma detalhada, mesmo quando a maquete estava errada

Os escapes da maquete saíam em balanço, de x -500 a -800 e a 160 mm do flanco, e o Envelope guardou essa caixa (x -841,7 a -437,4). Um escape que assenta no flanco do capô, como o brief do crítico pede, termina mais para dentro do que a caixa permite e o `--envelope` reprova (67,5 mm em x), de modo que o detalhe teve de ser deformado (eixo a 55 mm do flanco, flange menor, ponta encurtada em 15 mm) para caber. Só `--condutor --replanejar` refaz o Envelope, e ele refaz o plano inteiro.

Para reproduzir, ponha `"escSai": 25` no detalhe e rode:

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --envelope motor docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-motor.esboco.json
```

## 15. A casca desenha, nas quatro vistas de fora, as arestas da parede interna em traço tracejado

Um loft com `casca` (o capô do motor, `espessura` 20, `aberta` no início) sai nas vistas lateral, superior e isométrica com uma linha tracejada paralela ao contorno, a poucos milímetros dele, que é a aresta da parede de dentro vista através da parede de fora. O crítico lê o tracejado como marca na superfície sem explicação. Quanto mais grossa a casca, mais para dentro fica o tracejado (espessura 45 deixa-o bem visível, 12 o cola no contorno). A casca fina não resolve, porque o contrato `cone toca capô` mede o intervalo até a face interna do anel do lábio e passa dos 30 mm de tolerância com espessura abaixo de 18 (36 mm com espessura 12).

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade motor --sem-vizinhos --vista lateral --largura 1100 --saida <pasta>
```

Para ver o intervalo do cone, ponha `"espessura": 12` em `capo.casca` numa cópia do mestre e rode `npm run esboco -- <cópia> --descrever`.

## 16. Cada ajuste de altura do escape volta recusado duas vezes: pelo nome do parâmetro e pela caixa da maquete

Baixar o escape para que o escape do outro flanco deixe de aparecer sobre o dorso na isométrica pediu mudar `escBaseY`. O `--integrar` recusou o nome ("o detalhado redefine o parâmetro escBaseY", atrito 13), e, com o nome novo `escAlturaY` em 1230, recusou de novo pela caixa da maquete (escapes passam 120 mm em y, atrito 14). O valor que cabe (1325, só 15 mm abaixo do original) obrigou a diminuir também os diâmetros do escape para o tirar do dorso.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --integrar motor docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-motor.esboco.json
```

Para reproduzir, ponha `"escAlturaY": 1230` no detalhe e rode o comando.

## 17. A torção da pá não existe: a seção do loft não gira no próprio plano

`inclinacao` do loft gira a seção em torno de u ou de v, o que a tira do plano, e nenhum campo gira a seção em torno do eixo do sólido. A pá com passo que cai de 52 para 18 graus da raiz à ponta (reprova 3 do alinhamento) só se escreve com seções `poligono` em que cada ponto traz a rotação à mão: seis seções de oito pontos, 96 expressões `=a*cos(t)-b*sin(t)` repetidas em cada seção, com os parâmetros `hA0` a `hT5`. Qualquer erro de sinal inverte o sentido da torção sem o gate acusar.

```bash
npm run esboco -- --ajuda loft
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --forma pa --descrever
```

## 18. O `arranja` repete uma forma só, e a pá e o colar levam dois arranjos separados

O colar de cada pá e a pá são formas diferentes, e o arranjo radial aceita uma `forma` por entrada, de modo que `total`, `eixo` e `centro` ficam escritos duas vezes (nos ids `colar1` a `colar4` e `pa1` a `pa4`). Mudar o número de pás pede editar as duas entradas, e o gate não acusa se uma das duas ficar com outro `total`.

```bash
grep -n '"arranja"' docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json
```

## 19. O parâmetro do detalhe só se ajusta pelo mestre, com `--editar parametros.<nome>`

Para espessar a pá depois da primeira integração (atrito 13), mudei `hB0` a `hB5` no mestre com `--editar parametros.<nome>=<valor>` e depois igualei os valores no detalhe, e só então o `--integrar` aceitou. O caminho evita o parâmetro órfão, mas o `--integrar` não o oferece na mensagem de recusa, que manda dar outro nome.

```bash
npm run esboco -- --editar docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json parametros.hB3=30
```
