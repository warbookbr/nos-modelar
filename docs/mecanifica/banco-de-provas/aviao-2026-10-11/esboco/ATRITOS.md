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

## 20. Nenhum comando reimprime o brief de um Marco já registrado

O Condutor recusa o `--feito` de outra unidade e o `--proximo` com o Marco de 25% em nota 7 e manda "chamar o crítico do Marco de novo", mas o brief do Marco só é impresso no `--feito` que cruza o limiar pela primeira vez. O `--feito` de uma unidade já feita reimprime o brief dela e não o do Marco, e não existe opção `--marco` na linha de comando, embora a função `briefDoMarco` exista exportada em `tools/mecanifica/esboco.mjs`. Corrigidas as unidades do Marco, a única forma de obter o brief de novo é chamar essa função por fora do comando.

```bash
npm run esboco -- --condutor docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --feito helice
```

Para reproduzir, rode o comando com o Marco de 25% registrado: sai o brief da hélice e nenhum do Marco.

## 21. Nenhuma vista fixa olha pelo lado esquerdo, e a porta que a função põe à esquerda não aparece em nenhuma

`lateral` olha de +x, `superior` de +y e `isometrica` de [1,1,1], de modo que o flanco de x negativo (o esquerdo, E) não é visto de fora em vista nenhuma, e a porta traseira esquerda só aparece como marca escura além do flanco na superior. As janelas aparecem na lateral porque o `lado: "E"` gera as cópias D, e a porta, que não tem `lado`, não tem cópia. A zoom na porta na lateral mostra o flanco direito liso. O contorno da porta só se vê em corte (`--corte x=-770` e `--corte z=5940` com `--zoom-forma portaE`, em que a vista olha o plano de corte de dentro), e os cortes entraram no brief como imagens extras.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade fuselagem --vista lateral --zoom-forma portaE --margem 600 --largura 1400 --saida <pasta>
```

## 22. O Envelope por forma conta a caixa da forma girada, e a porta inclinada para seguir a cauda deixou de caber

Girar a porta 2,19 graus em torno de y, para ela acompanhar o estreitamento do flanco da fuselagem, dobra a extensão em x da caixa dela (de 36 para 70 mm com a espessura de 36), e o `--integrar` recusa pelo `substitui` ("portaE passa 42,3 mm em x"), porque a caixa da forma da maquete é uma caixa de 30 mm de espessura sem giro. A porta teve de afinar para 24 mm e mudar de centro até a caixa girada caber nos 30 mm de tolerância.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --integrar fuselagem docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-fuselagem.esboco.json
```

Para reproduzir, ponha em `portaE` do detalhe `"largura": 36`, `"rotacao": [0, 2.19, 0]` e `"centro": [-758, 1660, 5940]` e rode o comando.

## 23. A âncora de uma caixa girada é a da caixa envolvente, e a maçaneta presa por `ponta` saiu do flanco

`macanetaPortaE` se prende à face `-x` da porta por `ponta`, e com a porta girada a âncora `-x` passa a ser o `x` mínimo da caixa envolvente (-793,3 no extremo da proa), não o ponto da face na altura da maçaneta (-790,6 em z 5560). A maçaneta ficou 13 mm fora da face, e o `desloca` teve de levar um acerto à mão (`[17, -70, -380]`), o que volta a ser um número que não acompanha o ângulo da porta.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-fuselagem.esboco.json --forma portaE
```

## 24. Uma nota de hélice abaixo de 8 trava o `--feito` das outras unidades que o Marco também aponta

Os defeitos do Marco de 25% estão na fuselagem e no capô, e o veredito 7 da hélice, que é de unidade e não do Marco, faz o `--feito fuselagem` voltar recusado ("a unidade helice tirou nota 7"), de modo que uma só rodada do esbocista corrige as três unidades no JSON e só consegue marcar a primeira como refeita. As duas outras ficam sem brief até o veredito da hélice entrar.

```bash
npm run esboco -- --condutor docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --feito fuselagem
```

## 25. A função `briefDoMarco` não se alcança por `node -e`, só por um arquivo de script

O brief do Marco continua sem comando (atrito 20). Chamar a função exportada por `node --input-type=module -e` cai no último laço de `tools/mecanifica/esboco.mjs`, que faz `pathToFileURL(process.argv[1])` e recusa com "The path argument must be of type string. Received undefined", porque no modo `-e` não há `argv[1]`. O que funciona é um arquivo `.mjs` fora do repositório que importa a função e a chama.

```bash
node --input-type=module -e "import { briefDoMarco } from './tools/mecanifica/esboco.mjs'; await briefDoMarco('docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json', 25)"
```

## 26. Não há como rebaixar a porta no casco: ela só existe como placa saliente

O crítico apontou a porta como "saliente, e não rebaixada". O módulo não subtrai uma forma de outra (o `furo` da caixa é passante só na direção y, o loft não tem recorte), de modo que um painel rebaixado não se escreve. A porta passou a ser um loft em z, de 16 mm de espessura, cujo centro de cada seção segue o flanco da fuselagem (790 mm até z 5500, 772,5 em z 6000, 750 em z 6500) e que sai 5 mm do casco, com o batente de 8 mm, 2 mm acima do casco, à volta dela. Como o loft corre em z, o contorno da porta em y e z tem cantos vivos, e o `raio` da seção só arredonda a aresta da espessura.

```bash
npm run esboco -- --ajuda caixa
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --forma portaE
```

## 27. A caixa da forma da maquete limita a altura da porta, e o ombro da cabine teve de ser reduzido para ela caber

Com a porta de 1040 mm centrada em y 1603 (a que cabe no trecho plano do flanco), o `--envelope fuselagem` reprova: "portaE passa 46 mm em y (detalhe 1083..2123, forma da maquete 1129..2209, tolerância 30 mm)". A porta teve de subir para 1099..2139, e, como o trecho plano do flanco com os cantos de 250 e 280 mm tem só 946 mm em z 6000, os cantos das seções de z 5500, 6000 e 6500 baixaram para 200 e 230 mm. É o mesmo mecanismo do atrito 14: a caixa da maquete vira restrição do detalhe.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --envelope fuselagem docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-fuselagem.esboco.json
```

Para reproduzir, ponha em `portaE` do detalhe `"encaixa"` com `mm` `[-787, 36, -29.5]` (y 1603 em vez de 1619).

## 28. O esboço isolado da fuselagem não acusa a travessia do cone de cauda com o estabilizador e o profundor

Alargar o cone de cauda para 580 mm em z 9250 e 420 mm em z 9900 deixou `--descrever` do `--detalhar fuselagem` com "divergências: nenhuma", porque as outras unidades ficam ocultas, e o mestre, depois do `--integrar`, acusou quatro: `estabE` e `estabD` com 130,3 mm de travessia (máximo 130) e `profundorE` e `profundorD` com 59,6 mm, sem junta declarada. As juntas ficam em duas listas, a do mestre e a do detalhe, e o `--integrar` não leva a do detalhe ao mestre, de modo que a junta nova teve de ser escrita nos dois arquivos.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --descrever
```

Para reproduzir, ponha `"max": 130` na junta `estabE`/`fuselagem` do mestre e tire a junta `profundorE`/`fuselagem`.

## 29. O crítico do esboço julga sem a referência e afasta a forma dela

O crítico cego da unidade e do Marco recebe as vistas e a função, mas não a
imagem de referência. Ele reprovou duas vezes o cone de cauda como "agulha"
fina sob os estabilizadores, e o esbocista o alargou de 12% a 100% além da
`topo.png` (580 mm contra 515 em z 9250, 420 contra 294 em z 9900). A
conferência de silhueta não acusou o desvio, porque fica dentro da tolerância
de área. A forma passa a seguir o crítico, e não a referência que a pessoa
escolheu. Falta ao brief do esboço a referência, ou ao Envelope a largura da
referência por seção.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --referencia docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/topo.conferencia.contornos.json --vista superior
```

## 30. A seção do loft só aceita polígono convexo, e o perfil da asa saiu sem curvatura côncava no intradorso

O perfil aerodinâmico da asa, do flap e do aileron foi escrito como polígono convexo (extradorso arredondado e intradorso quase plano, de 13 pontos na asa e 7 no flap e no aileron). Um perfil com curvatura positiva real tem o intradorso côncavo perto da borda de fuga e o módulo o recusa. Além disso, a recusa só cita a primeira seção que falha: a fresta de 15 mm deslocou a face da frente do aileron e o canto superior ficou côncavo só nas seções de corda menor (680 mm), e o erro apareceu em `aileronE`, `secoes[0]`, sem dizer qual ponto.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-asas.esboco.json --descrever
```

Para reproduzir, ponha em `aileronE` a face da frente em `"=0.5*asC4+fresta"` com `"=-0.362*asT4"` e `"=0.2437*asT4"`.

## 31. As quatro vistas não mostram o ventre da asa, onde ficam os suportes do flap e do aileron

Os suportes de dobradiça ficam sob a borda de fuga e só aparecem como traço fino na lateral. O corte `x=<valor>` na lateral os mostra em perfil, mas nenhuma vista olha de baixo, e o `--corte y=<valor> --lado -` na superior mostra o corte pela parte de cima, não o ventre. O recolhimento do trem para dentro da asa também não se representa: o módulo não subtrai forma de outra (atrito 26), então o alojamento da roda não existe.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade asas --vista superior
```

## 32. A divisão entre flap e aileron da maquete contraria a referência, e o Envelope não acusa

A maquete põe o flap de x -830 a -4887 e o aileron de -4910 a -6000. O `topo.png` mostra a linha de painel em cerca de |x| 3130, o flap por dentro e o aileron por fora. O detalhe seguiu a referência (flap -830 a -3130, aileron -3170 a -5800), e nada no gate nem no Envelope acusou a diferença, porque a caixa da unidade é a mesma. Só a leitura da referência por parte pegaria isso.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --envelope asas docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-asas.esboco.json
```
