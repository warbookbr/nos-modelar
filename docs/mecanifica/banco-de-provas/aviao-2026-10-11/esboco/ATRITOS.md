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

Corrigido na fatia 5, onda 1: na mesma unidade, o par sem junta passa como encaixe raso (a peça menor entra por uma face e a penetração não passa de metade da extensão dela ao longo da saída) e reprova a travessia, a quina, a peça idêntica e a enterrada demais. A reprodução de antes (tirar a junta `["capo", "escapeE"]` do mestre, que hoje já não acusa nada porque o escape foi refeito) deixou de discriminar, e a de hoje é o par de casos mínimos do módulo, um aceito e um reprovado:

```bash
npm run esboco -- modulos/esboco/tests/fixtures/adversarial/e8-meio-a-meio-controle.esboco.json --descrever
npm run esboco -- modulos/esboco/tests/fixtures/adversarial/e8-flap-na-asa.esboco.json --descrever
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-empenagem-horizontal.esboco.json --descrever
```

O primeiro (duas caixas iguais de 100 mm sobrepostas 10 mm, na mesma unidade) sai com "a e b se penetram 10,0 mm" e a razão: a peça menor ocupa 100% da outra transversalmente à entrada, e o encaixe pede no máximo 60%; o segundo (o flap de 50 mm com 45 mm dentro da asa) reprova por passar da metade da extensão do flap; o terceiro, com o suporte da dobradiça do profundor (caixa de 70 por 56 por 220 mm) com o topo 24 mm dentro do estabilizador, que era a ocorrência, sai com `divergências: nenhuma` sem a junta.

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

Ocorrência na empenagem-horizontal: na lateral da unidade com a fuselagem em cinza (1600 px de largura) a empenagem ocupa cerca de um décimo da largura, no canto da cauda, e o perfil, a fresta e os suportes não se leem. O `--feito` aceita `--largura` e `--sem-vizinhos`, mas com `--sem-vizinhos` o crítico perde o ponto onde a raiz entra na cauda, de modo que as quatro vistas do brief ficaram com a fuselagem e a lateral sem ela entrou como imagem extra.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade empenagem-horizontal --vista lateral --largura 1600 --saida <pasta>
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade empenagem-horizontal --vista lateral --largura 1600 --sem-vizinhos --saida <pasta>
```

Ocorrência no trem-do-nariz: com a fuselagem, o capô e o duto em cinza, o trem (1 m de altura) ocupa cerca de um décimo do quadro nas quatro vistas de 550 px, e a roda, o compasso e os mancais não se leem. O `--feito` foi gravado com `--sem-vizinhos` e o ponto de fixação sob o capô entrou como imagem extra com `--zoom-forma pernaNariz --margem 700`. O brief do Marco, que não aceita `--sem-vizinhos`, grava as vistas da unidade com a fuselagem inteira.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade trem-do-nariz --composta
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --condutor --feito trem-do-nariz --sem-vizinhos
```

Ocorrência nos trens-principais: com as quatro vistas gravadas por `--feito`, a asa inteira (12,8 m) entra no quadro como vizinha e a unidade ficaria com um décimo da largura; o `--feito` foi gravado com `--sem-vizinhos`, e o ponto em que a baia encosta no ventre da asa entrou como corte com `--zoom-forma baiaPrincE`. O brief do Marco de 100% grava as vistas da unidade com a asa inteira, porque o Marco não aceita `--sem-vizinhos`.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade trens-principais --composta
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade trens-principais --composta --sem-vizinhos
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

Ocorrência nos trens-principais: a baia do trem principal (loft com `casca`, aberta embaixo) sai com o tracejado da parede de dentro nas vistas lateral e frontal, e o crítico pode lê-lo como marca na superfície.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade trens-principais --sem-vizinhos --vista lateral --largura 1100 --saida <pasta>
```

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

Ocorrência no trem-do-nariz: o `--feito` da unidade imprimiu o brief do Marco de 75% no mesmo comando e o comando seguinte, que regrava o brief da unidade, não o imprimiu de novo. O texto do Marco só existia na saída do primeiro `--feito`, e `aviao-critico-marco-75/brief.md` foi escrito a mão a partir dela.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --condutor --feito trem-do-nariz --sem-vizinhos
```

Ocorrência nos trens-principais: o `--feito` imprimiu o brief da unidade e o do Marco de 100% no mesmo comando e nenhum comando os reimprime; os dois textos só existiam na saída, e `brief.md` de cada pasta foi escrito a mão a partir dela.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --condutor --feito trens-principais --sem-vizinhos
```

## 21. Nenhuma vista fixa olha pelo lado esquerdo, e a porta que a função põe à esquerda não aparece em nenhuma

`lateral` olha de +x, `superior` de +y e `isometrica` de [1,1,1], de modo que o flanco de x negativo (o esquerdo, E) não é visto de fora em vista nenhuma, e a porta traseira esquerda só aparece como marca escura além do flanco na superior. As janelas aparecem na lateral porque o `lado: "E"` gera as cópias D, e a porta, que não tem `lado`, não tem cópia. A zoom na porta na lateral mostra o flanco direito liso. O contorno da porta só se vê em corte (`--corte x=-770` e `--corte z=5940` com `--zoom-forma portaE`, em que a vista olha o plano de corte de dentro), e os cortes entraram no brief como imagens extras.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade fuselagem --vista lateral --zoom-forma portaE --margem 600 --largura 1400 --saida <pasta>
```

Ocorrência no trem-do-nariz: o atuador de recolhimento fica a x -135, ao lado da roda, para a roda passar por ele ao recolher. Na lateral, que olha de +x, ele aparece atrás da perna, e na frontal, que olha de trás, a perna o cobre; o ponto onde a haste se prende à alavanca só se lê no corte `x=-128`, que olha o plano de dentro, e o corte `x=-135` deixa a ponta da haste no ar porque a alavanca fica do outro lado do plano.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade trem-do-nariz --sem-vizinhos --corte x=-128 --vista lateral --zoom-forma atuadorCorpoNariz --margem 500 --largura 1100 --saida <pasta>
```

Ocorrência nos trens-principais: nenhuma das quatro vistas olha de baixo, e a boca da baia, aberta para baixo, a roda deitada dentro dela e o ventre da asa só aparecem em corte (`--corte z=4520 --vista frontal`, `--corte x=-1344 --vista lateral`, `--corte y=700 --vista superior`, todos com `--zoom-forma baiaPrincE`). A frontal olha de +z, que neste objeto é a cauda.

```bash
npm run esboco -- <cópia do mestre com tpCurso=83> --unidade trens-principais --corte y=700 --vista superior --zoom-forma baiaPrincE --margem 300 --largura 1100 --saida <pasta>
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

Ocorrência na empenagem-horizontal: a referência (`topo.png`, `lateral.png`) mostra em cada profundor um compensador recuado na borda de fuga, junto à raiz, e um degrau na linha da dobradiça perto da ponta. Sem subtração, o compensador só se escreve como uma chapa sobreposta à superfície ou como o profundor partido em três lofts, e as duas formas leem como marca sem explicação ou como emenda; ficou de fora.

```bash
npm run esboco -- --ajuda loft
```

Ocorrência no trem-do-nariz: o recolhimento da perna para trás leva a roda para dentro do ventre do capô e da fuselagem, onde a função põe o alojamento, e como o módulo não subtrai forma de outra o alojamento não existe. O gate não acusa nada de 0 a 85 graus de giro (a folga da roda ao capô é de 34 mm a 80 graus e passa a penetração de 9,8 mm a 85) e acusa a travessia do capô, do duto e da fuselagem de 90 graus em diante, de modo que o fim do curso, com a roda recolhida, não se representa nem se confere.

```bash
npm run esboco -- --editar <cópia do detalhe do trem do nariz>.esboco.json capo.oculto=null fuselagem.oculto=null entradaAr.oculto=null parametros.tnCurso=95
```

Ocorrência nos trens-principais: o recolhimento da roda para dentro da asa não se representa, porque o módulo não subtrai forma de outra e a asa é maciça de 220 mm de espessura. Para o curso não atravessar nada, o alojamento foi desenhado como uma carenagem oca (`baiaPrincE`, loft com `casca` aberta embaixo) pendurada sob a asa, com 300 mm de profundidade, que guarda a roda deitada, e não como alojamento dentro da asa. É um desvio do alinhamento, que diz "recolhem para dentro da asa".

```bash
npm run esboco -- --ajuda loft
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

Ocorrência no trem-do-nariz: o `--descrever` do `--detalhar trem-do-nariz` deu "divergências: nenhuma" com o trem a 20, 40 e 60 graus de giro e com a roda a 95 graus dentro do capô, porque o capô, o duto e a fuselagem ficam ocultos. A conferência do curso só saiu de uma cópia do detalhe com o `oculto` das três formas retirado por `--editar`.

```bash
npm run esboco -- --editar docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-trem-do-nariz.esboco.json parametros.tnCurso=95
```

Ocorrência nos trens-principais: o `--descrever` do `--detalhar trens-principais` deu "divergências: nenhuma" com a asa oculta, e o mesmo detalhe com `asaE.oculto=null` e o resto da asa visível só mostra a travessia a partir de 90 graus (roda contra asa e baia), de modo que a conferência do curso saiu de uma cópia do detalhe varrida de 0 a 90 graus.

```bash
npm run esboco -- --editar <cópia do detalhe>.esboco.json asaE.oculto=null flapE.oculto=null fuselagem.oculto=null parametros.tpCurso=90
```

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

Ocorrência na empenagem-horizontal: os dois suportes de cada profundor ficam sob a linha da dobradiça e, nas quatro vistas, só aparecem como dois dentes pequenos sob o estabilizador na frontal e na lateral. A forma da seção e o suporte só se leem no corte `x=-600` ou `x=-1850` na lateral.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade empenagem-horizontal --sem-vizinhos --corte x=-600 --vista lateral --largura 1100 --saida <pasta>
```

## 32. A divisão entre flap e aileron da maquete contraria a referência, e o Envelope não acusa

A maquete põe o flap de x -830 a -4887 e o aileron de -4910 a -6000. O `topo.png` mostra a linha de painel em cerca de |x| 3130, o flap por dentro e o aileron por fora. O detalhe seguiu a referência (flap -830 a -3130, aileron -3170 a -5800), e nada no gate nem no Envelope acusou a diferença, porque a caixa da unidade é a mesma. Só a leitura da referência por parte pegaria isso.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --envelope asas docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-asas.esboco.json
```

## 33. Gravar uma imagem extra da unidade com outro enquadramento sobrescreve a vista do brief

A vista `--unidade <u> --vista lateral` com a fuselagem em cinza e a mesma vista com `--sem-vizinhos` gravam no mesmo arquivo, `<nome>-unidade-<u>-lateral.png`, e a segunda substitui a primeira sem aviso, de modo que a lateral que o `--feito` gravou para o crítico passou a ser a sem vizinhos quando gravei a extra na mesma pasta (`--saida`). O contorno foi copiar a extra para outro nome e regravar a lateral do brief com `--forçar`. O nome do arquivo não leva o `--sem-vizinhos`, e o `--forçar` só se descobre olhando o tamanho da imagem.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade empenagem-horizontal --vista lateral --largura 1600 --saida <pasta>
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --unidade empenagem-horizontal --vista lateral --largura 1100 --sem-vizinhos --saida <pasta>
```

## 34. O perfil de uma seção `poligono` se reescreve inteiro em cada seção, e reduzir uma seção pede reescrever os pontos

O estabilizador (15 pontos por seção, 3 seções), o profundor (8 pontos, 3 seções) e a ponteira (17 pontos, 5 seções) saíram com o mesmo desenho de perfil repetido 11 vezes, cada ponto com duas expressões como `"=-0.22*ehC1"` e `"=0.4613*ehT1"`. A ponteira que fecha a ponta é o mesmo perfil encolhido de 1 a 0,15, e para encolher foi preciso um parâmetro de escala por seção e a reescrita dos 34 números de cada uma. Um campo `escala` na seção, ou um perfil nomeado reaproveitado por `usa`, tiraria a repetição, e um erro de sinal numa linha mudaria só uma seção sem o gate acusar.

```bash
grep -c 'ehCt' docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-empenagem-horizontal.esboco.json
npm run esboco -- --ajuda loft
```

Ocorrência na empenagem-vertical: a deriva (15 pontos por seção, 4 seções), o leme (8 pontos, 4 seções), a bota de degelo (7 pontos, 4 seções) e a ponteira (15 pontos, 3 seções) repetem o mesmo perfil em 15 seções, cerca de 340 expressões escritas à mão. A bota é o nariz do mesmo perfil (os 7 primeiros pontos da deriva com 4 mm a mais) e a ponteira é o perfil da deriva encolhido por `dvPs1` e `dvPs2`, de modo que uma mudança de espessura ou de corda pede editar as quatro formas.

```bash
grep -c 'dvT3' docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-empenagem-vertical.esboco.json
```

## 35. O `--descrever` arredonda os parâmetros a uma casa decimal e mostra uma inclinação como zero

Na linha de parâmetros, `ehDz` (0,0188, o avanço em z do eixo por milímetro de envergadura) sai como `ehDz 0`, `ehDy` (0,136) como `ehDy 0,1` e a escala `ehS1` (0,917) como `ehS1 0,9`. Parece que o parâmetro não foi lido, e a conferência de uma inclinação ou de uma razão exige ler o JSON.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --descrever | grep -o 'ehDz [^;]*'
```

## 36. A `funcao` da unidade não volta ao mestre pelo `--integrar` nem se edita por `--editar`

O detalhe da empenagem-vertical trazia `unidades.empenagem-vertical.funcao` reescrita (a deriva com bota de degelo e ponteira, o leme com três suportes). Depois do `--integrar` o mestre manteve o texto antigo, "deriva e leme preso por eixo, montados no dorso da cauda da fuselagem", e o `--editar` recusa o caminho porque só aceita campo que comece por uma forma declarada. A função, que o brief do crítico e o do Marco imprimem, só se atualiza editando a linha do JSON do mestre à mão. Nesta unidade, com 8 formas, o `--feito` não pediu a função nem imprimiu brief, de modo que nada acusaria o texto desatualizado.

```bash
npm run esboco -- --editar docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json 'unidades.empenagem-vertical.funcao=teste'
```

Para reproduzir o `--integrar`, mude a `funcao` da unidade em `aviao-detalhe-empenagem-vertical.esboco.json` e rode `npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --integrar empenagem-vertical docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-empenagem-vertical.esboco.json` e leia `unidades.empenagem-vertical.funcao` do mestre.

Ocorrência no trem-do-nariz: a `funcao` da unidade (roda, perna, amortecedor e garfo, com o braço) ficou desatualizada depois que o detalhe trocou o braço por atuador, alavanca, compasso e mancais, e o `--editar` recusou `unidades.trem-do-nariz.funcao` do mesmo modo. A função nova foi escrita a mão no mestre e no detalhe, e o brief da unidade, que tem 19 formas, a imprime.

```bash
npm run esboco -- --editar docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json 'unidades.trem-do-nariz.funcao=teste'
```

Ocorrência nos trens-principais (atritos 36 e 37): o `--integrar` deixou no mestre as juntas `pistaoPrincE`/`rodaPrincE.*` ("o amortecedor termina no eixo do cubo da roda") e `pernaPrincE`/`asaE` ("a perna se prende na longarina da asa"), que o detalhe tinha apagado e que continuam com formas existentes, e a função da unidade (`unidades.trens-principais.funcao`) voltou com o texto antigo. As duas foram retiradas a mão no mestre.

```bash
git diff -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json | grep -n 'PrincE'
```

## 37. O `--integrar` não tira do mestre a junta que o detalhe apagou

O detalhe do trem do nariz apagou a junta `pernaNariz`/`capo` ("a perna do trem do nariz se prende sob o capô"), porque a perna passou a ficar a 50 mm sob o piso do capô e quem toca o capô são os mancais. Depois do `--integrar` a junta continuou no mestre, já que a perna e o capô continuam existindo, e só saiu com uma edição à mão. O `--integrar` diz quantas juntas saíram por citar forma removida (1 junta, a do braço), mas não compara a lista de juntas do detalhe com a do mestre, de modo que uma junta que perdeu o sentido sem perder a forma fica declarando uma travessia que não existe, com `max` de 40 mm que esconderia uma travessia de verdade.

```bash
git show HEAD:docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json | grep -n '"pernaNariz", "capo"'
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --integrar trem-do-nariz docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-detalhe-trem-do-nariz.esboco.json
```

Para reproduzir, parta do mestre do `HEAD`, rode o `--integrar` do detalhe sem a junta e procure `"pernaNariz", "capo"` no mestre.

## 38. Nenhuma ferramenta varre um parâmetro de curso e junta os achados de cada posição

O recolhimento do trem do nariz é um giro em torno de um eixo, escrito no detalhe como o parâmetro `tnCurso` (0 é o trem estendido) e como pontos nomeados que seguem o ângulo, de modo que a perna, o amortecedor, a roda, o compasso e o atuador acompanham sem coordenada à mão. Para saber em que ponto do curso algo atravessa o capô ou a fuselagem foi preciso copiar o detalhe, tirar o `oculto` das três formas vizinhas e rodar `--editar parametros.tnCurso=<n>` quinze vezes, lendo as divergências de cada uma. A opção do esboço serviria às posições (a ajuda de variantes fala em "aberto e fechado"), mas o mestre tem as 121 formas dentro da opção, e não na raiz, de modo que cada posição pediria uma cópia da lista inteira. O resultado foi gravado só na nota de passagem e no brief.

```bash
npm run esboco -- --editar <cópia do detalhe>.esboco.json capo.oculto=null fuselagem.oculto=null entradaAr.oculto=null
npm run esboco -- --editar <cópia do detalhe>.esboco.json parametros.tnCurso=85
npm run esboco -- --ajuda parametros
```

Ocorrência nos trens-principais: o curso é o parâmetro `tpCurso` (0 estendido, 83 recolhido) e foi varrido com uma repetição de shell sobre `--editar parametros.tpCurso=<n>` em uma cópia do detalhe com a asa visível, de 0 a 90 graus. As medidas do plano (`principal.roda.diametro`, `principal.bitola`) e a silhueta da lateral só valem no curso 0, e em 83 graus o gate acusa três divergências de medida e de silhueta que não são defeito.

## 39. O `--descrever --completo` imprime `[object Object]` na relação de uma haste cujos pontos são âncoras com deslocamento

Toda forma com `de` e `para` escritos como `{ "ancora": ..., "mm": [...] }` ou `{ "entre": ... }` sai com "relação: de [object Object] para [object Object]", e o `--forma garfoNarizE` mostra o mesmo. A posição resolvida (centro, extensão, caixa) sai certa, mas a relação, que é a parte que o `--descrever` existe para mostrar, não diz de onde a forma foi posicionada.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --descrever --completo | grep "object Object"
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --forma garfoNarizE
```

## 40. O crítico só vê as posições do curso que o esbocista escolhe mostrar

O trem do nariz recolhe sem achado até 85 graus e, a partir de 90, a roda
atravessa capô, duto e fuselagem, porque não há alojamento (atrito 26). O
esbocista relatou isso por escrito, mas as imagens extras do brief foram as de
45 e 80 graus, e o crítico deu 8 dizendo que a unidade "recolhe sem atravessar o
capô nem a fuselagem". O critério 5 do alinhamento (nenhuma travessia em
posição nenhuma do curso) ficou fora do julgamento. O processo não teria pego
sozinho: a sessão principal só soube pelo relato. Falta o brief da unidade com
mecanismo trazer o fim do curso declarado, ou o gate varrer o curso (atrito 38).

A travessia a 95 graus se reproduz como na ocorrência do atrito 26 (copiar o
detalhe, tirar o `oculto` de capô, duto e fuselagem e editar
`parametros.tnCurso=95`); a lista de imagens extras está no brief:

```bash
grep -n "extra-" docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao-critico-trem-do-nariz/brief.md
```

Ocorrência no Marco de 75%: o crítico deu 7 apontando o leme "à frente da
deriva" na frontal da empenagem vertical, porque o brief não diz que a frontal
olha de +z, que neste objeto é a cauda. Informado disso, retirou o defeito e deu
8. O brief precisa dizer de que lado cada vista olha (atritos 12 e 21).

## 41. O contrato `tocam` do plano cita o contato da maquete, e só se edita à mão quando o detalhe muda quem toca quem

O trem principal da maquete tocava a asa pela perna (`pernaPrincE` toca `asaE`). No detalhe a perna fica dentro da baia, presa por dois mancais ao teto dela, e a baia toca a asa, de modo que o Portão acusou "pernaPrincE e asaE deviam tocar (contrato) e há 154,2 mm de folga" depois do `--integrar`. O `--integrar` não leva o `plano.contrato` do detalhe ao mestre (o detalhe tem um plano mínimo), de modo que a linha foi trocada a mão no mestre por `baiaPrincE`/`asaE` e pelos contatos dos mancais, como no trem do nariz. É uma mudança do campo `plano.contrato.tocam` (e de `plano.pecas` e `plano.medidas`), feita por quem detalha.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --descrever
```

Para reproduzir, ponha `["pernaPrincE", "asaE"]` de volta em `plano.contrato.tocam`.

## 42. Uma cópia do mestre só aceita `--editar` com os contornos de referência ao lado, e as poses do curso exigem essa cópia

Para gravar o trem em 0, 30, 60 e 83 graus foi preciso copiar o mestre inteiro para outra pasta (o isolado do detalhe esconde a asa, e o estado do Condutor é do nome do arquivo). `--editar parametros.tpCurso=<n>` recusa a cópia com "referência lateral.conferencia.contornos.json: o arquivo não existe" até as duas cópias dos contornos irem para a mesma pasta, e a primeira tentativa, com o resultado filtrado por `grep`, parecia ter funcionado e gravou a pose estendida com o nome de 83 graus.

```bash
cp docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json <pasta>/p83.esboco.json
npm run esboco -- --editar <pasta>/p83.esboco.json parametros.tpCurso=83
```

## 43. A instância de componente não gira, e o trem que recolhe de lado precisou de um módulo `roda` próprio

O componente `roda` tem o eixo em x e a instância não aceita `rotacao`, de modo que a roda do trem principal, que gira em torno de z ao recolher, não pôde usá-lo. Foi escrito o módulo `rodaGira` no JSON (pneu de revolução e dois cubos com `rotacao: [0, 0, "=ang"]`, e o centro dos cubos calculado com seno e cosseno de `ang`), que repete o desenho do componente. Uma entrada `rotacao` no componente, ou a âncora `lado` da roda acompanhando o giro, evitaria a cópia; hoje o `ponta` da roda (`cuboE` na face do pneu) não vale com a forma girada.

```bash
npm run esboco -- docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco/aviao.esboco.json --ajuda componentes
```

## 44. A blocagem do nível zero leva o teto inclinado da baia ao ponto mais alto, e a baia sai 19% maior na vista de frente

A baia do trem principal (`baiaPrincD` e `baiaPrincE`, loft em y com a seção `teto` inclinada 7,5 graus) passava pelo tradutor como `casco-secoes`: a seção da ponta vai ao plano perpendicular ao eixo, no ponto mais extremo dela (y 959, em vez de 900 na borda baixa do teto), e a casca vira o sólido cheio. A perda `inclinacao` era declarada, mas o erro de volume do sólido externo é 18,3%, contra 10,1% da caçamba do carrinho que o teste aceita com 0,95 de IoU. A silhueta pela blocagem ficou com IoU 0,934 na isométrica e 0,878 na frontal (a baia sozinha, 0,843 na frontal), abaixo do mínimo, e `esboco-blocagem.test.mjs` reprovou `aviao-detalhe-trens-principais.esboco.json`. A causa não é o módulo `rodaGira` (com `tpCurso` 0 a rotação é identidade, e o pneu sozinho tem IoU alto) e não é a rotação em dois eixos do E5. O E43 não entra: a roda girada não é recusada, só não é exercida com `tpCurso` diferente de 0 nesta medição.

A correção está em `tools/mecanifica/esboco-blocagem.mjs`: a forma cuja perda `inclinacao` muda o volume externo em mais de 15% (`MUDANCA_MAXIMA_POR_INCLINACAO`) vai para `semEquivalente` com o motivo e o percentual, e o andaime é refeito sem ela, como o tradutor já faz com a forma que gira em dois eixos. O tradutor não muda, porque o contrato dele é medir e declarar a perda (o teste do prisma oblíquo a 30 graus aceita 50%). As duas baias deixam de aparecer na imagem do `--nivel-zero`, e o limite só serve a imagem: a Maquete e a Conferência da maquete do Condutor leem o tradutor direto e seguem com a baia aproximada. Uma tradução fiel pediria que a N2 recebesse a seção inclinada, ou que o tradutor repartisse a ponta em seções recortadas pelo plano.

```bash
npx vitest run tools/mecanifica/esboco-blocagem.test.mjs -t trens-principais
```
