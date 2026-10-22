# Régua, pacote cego e oráculo da subdivisão

Esta página ensina a usar as ferramentas opcionais do Blender que ficam em `tools/blender/`: a régua, que mede uma malha candidata contra uma malha de referência dentro de uma caixa; o pacote cego, que prepara as vistas de uma referência para quem vai modelá-la sem ver a malha; o olhar da candidata, que renderiza o que se modelou nas mesmas câmeras do pacote; e o gerador do oráculo da subdivisão, que regera a fixture congelada do núcleo. Nenhuma delas entra no núcleo, no CI nem no `--completo`, e nenhum dado vai junto: a referência, a caixa, os rótulos e as saídas ficam fora do repositório, com o usuário. Nenhuma métrica delas aprova forma; quem aprova é a pessoa, olhando a folha.

## Antes de usar

Precisa do Blender (provado no 5.0.1; a instalação está em [`INSTALAR-E-CONVERTER.md`](INSTALAR-E-CONVERTER.md)) e do Python do sistema com Pillow e numpy, que desenha a grade e compõe a folha, porque o Python do Blender não traz Pillow. A variável `MECANIFICA_PYTHON` troca o executável, que por padrão é `python3`.

O quadro é o das peças da Mecanifica, em metro, com y para cima e a frente em +z. O OBJ é lido cru; o GLB volta ao quadro do glTF, desfazendo a troca de eixos do importador; o `.blend` é lido no quadro do arquivo, e `--z-cima` o converte para y para cima como o exportador de glTF converteria. Na régua, `--z-cima` vale para as duas malhas, e `--z-cima-referencia` ou `--z-cima-candidata` para uma só, como a referência num `.blend` com z para cima medida contra uma candidata em OBJ já com y para cima. Os oclusores vêm sempre no quadro de trabalho, com y para cima, e `--z-cima-oclusores` os converte quando não vêm. Em GLB e `.blend`, `--objeto` (ou `--objeto-referencia` e `--objeto-candidata` na régua) escolhe o objeto pelo nome; sem ele, entram todas as malhas. No OBJ, o nome é o do `o` ou do `g`.

## A caixa e a configuração

Toda medida e todo recorte valem dentro de uma caixa, dada por `--caixa xmin,xmax,ymin,ymax,zmin,zmax` ou pela chave `caixa` de um arquivo `--config` em JSON, que o usuário guarda fora do repositório. Com `--simetria-x`, a caixa declara a metade x ≥ xmin: o recorte, a oclusão e as vistas pegam as duas metades (|x| até xmax), e a medida só a metade declarada.

As chaves do `--config`, com o padrão entre parênteses, estão em `PADRAO`, no começo de `tools/blender/comum.py`. As que mais mudam o resultado são `visibilidade` (todas as direções), que limita de onde um observador pode olhar por `cima` e `elevacao_minima` e por `lado` e `lado_minimo`, de modo que com `{"elevacao_minima": 0.3}` o observador fica ao menos uns 17 graus acima do horizonte e não vê a peça por baixo; `angulo_painel` (40 graus), `fracao_painel_visivel` (0,5) e `fracao_componente` (0,1), que decidem o que sai do recorte; `margem` (0,08 m), a folga em volta da caixa em que a candidata ainda conta; `vistas` (frente de +z, traseira de −z, lado de +x, topo de +y com a frente embaixo e três-quartos), cada uma com `nome`, `direcao`, `cima` e, se quiser, `escala` (largura da imagem em metro), `centro` e `meia` (só x ≥ 0); e `resolucao` e `amostras_render`. O pacote cego acrescenta `angulo_feicao` (25 graus), o limiar das vistas de linhas, e `cortes` (nenhum), a lista de cortes planos `{nome, eixo, valor}` com o valor em metro, e `passo_corte_regua` (0,01 m). A régua acrescenta `angulo_vinco` (40 graus), `densidade` (40.000 amostras por m²), `tolerancias_mm` ([5, 10]), `mapa_max_mm` (20), `resolucao_folha` ([480, 360]) e `omitidas` (nenhum), os rótulos que a candidata pode deixar de modelar.

`--oclusores <malha>` acrescenta uma malha que só bloqueia a vista, como tampas sobre vãos que o observador não deve atravessar. `--rotulos <arquivo.json>` dá um rótulo a cada triângulo da referência, por `{"por_face": [rótulo por polígono, na ordem de leitura]}` ou por `{"sementes": {"rótulo": [[x, y, z], ...]}}`, em que cada triângulo leva o rótulo da semente mais perto; `--excluir a,b` tira esses rótulos do recorte. Um painel que fica inteiro pode levar triângulos de rótulo excluído na borda da região rotulada, e esses recebem o rótulo do triângulo mantido e não excluído mais perto, para que nenhuma medida por rótulo relate região escondida. A régua relata a distância e os vincos por rótulo.

## Pacote cego

```text
blender -b --factory-startup --python tools/blender/pacote-cego.py -- \
    --referencia <ref.obj|.glb|.blend> --caixa <seis números> --saida <pasta> [--simetria-x] [--config <cfg.json>]
```

O preparo recorta a referência pelos seis planos da caixa com o bisect do Blender, sem preenchimento, de modo que nenhum triângulo atravessa a borda e não sobra lasca; marca como visível o triângulo de que um dos quatro pontos vê o lado de fora por um raio pela normal, contra ela ou por uma direção permitida, contra a referência inteira mais os oclusores; junta as faces em painéis pelas arestas de diedro abaixo de `angulo_painel` e deixa cada painel inteiro, quando a maior parte da área se vê de fora, ou o tira inteiro, de modo que um painel interno que não toca a pele externa sai e a borda do que fica é corte, borda livre ou dobra; e tira os componentes com menos de `fracao_componente` da área do maior. As vistas são ortográficas, em cinza e em listras de reflexo, com o avesso (a face vista por trás, como o lado de dentro da chapa visto pelo corte) em magenta, a grade em milímetro nas vistas alinhadas aos eixos, rótulo a cada duas linhas e a barra de escala no primeiro canto que não cobre rótulo nem título.

Além das vistas sombreadas, o pacote desenha as linhas de feição de cada vista em `<vista>-linhas.png`, na mesma câmera e grade, em traço preto sobre branco: as arestas entre faces mantidas com diedro acima de `angulo_feicao`, as dobras e as bordas livres, sem o trecho escondido (cada ponto, a cada 2 mm, só aparece se o raio dele para a câmera não bate na superfície), e a borda de corte da caixa em cinza fino. Essas linhas mostram o vinco raso que o sombreado esconde. Com `cortes` na configuração, cada corte sai em `<saida>/cortes/<nome>.png` como contorno 2D em milímetro, com grade e de quatro a seis cotas: os extremos dos dois eixos do plano, a maior saliência (o ponto mais longe da corda) das duas linhas mais longas e, se faltar, as pontas e os pontos a 25, 50 e 75% da linha mais longa, todos na metade x ≥ 0 com `--simetria-x`. O rótulo de cada cota fica fora do traço: se o lugar colado ao ponto cobriria o contorno, outra cota ou o título, a caixa se afasta em anéis cada vez maiores e uma linha fina a liga ao ponto. Saem também a tabela `cortes/cotas.md`, o quadro de cada desenho em `cortes/quadro.json`, sem contorno, e as caixas dos rótulos em `cortes/rotulos.json`, com o ponto de cada cota e se a caixa foi afastada. Os pontos do contorno a cada `passo_corte_regua` saem só com `--privado <pasta>`, em `<pasta>/cortes.json`, fora do pacote, para a régua. Quem modela não recebe o contorno, só o desenho cotado.

Sai em `<saida>/vistas/` cada `<vista>-cinza.png`, `<vista>-zebra.png` e `<vista>-linhas.png`, o `camera.json` com centro, escala, tamanho e eixos de cada câmera, e o `grade.json` com o passo, as caixas dos rótulos e a da barra; e em `<saida>/pacote.json` a caixa, as contagens do recorte (triângulos, painéis e componentes tirados, bordas por tipo e quanto algum vértice passa da caixa), a fração de avesso de cada vista cinza, a contagem das linhas por tipo e os cortes. Nenhuma malha é gravada, e quem modela recebe só a pasta `vistas/`.

## Olhar a candidata

```text
blender -b --factory-startup --python tools/blender/olhar-candidata.py -- \
    --candidata <cand.obj|.glb|.blend> --pacote <pasta do pacote> --saida <prefixo>
```

Recorta a candidata pelos mesmos planos, sem filtro de visibilidade, e a renderiza nas câmeras do `camera.json`, com a mesma grade e a mesma cor de avesso, em `<prefixo><vista>-cinza.png`, `<prefixo><vista>-zebra.png` e `<prefixo><vista>-linhas.png`, para comparar lado a lado com o pacote. Se o pacote tem cortes, desenha os cortes da candidata nos mesmos planos e no mesmo quadro, em `<prefixo>cortes/`.

## Régua

```text
blender -b --factory-startup --python tools/blender/regua.py -- \
    --referencia <ref> --candidata <cand> --caixa <seis números> --saida <pasta> --nome <rótulo> \
    [--simetria-x] [--config <cfg.json>] [--rotulos <rotulos.json>] [--omitidas a,b] [--sem-imagens]
```

A referência passa pelo mesmo preparo do pacote cego, e as duas malhas são amostradas por área com semente fixa, de modo que a mesma entrada dá a mesma medida. Só conta o ponto dentro da caixa que se vê de fora. `metricas.json` traz a distância da referência para a candidata (o que a candidata deixa de cobrir, até a superfície visível dela) e da candidata para a referência (o que ela põe a mais), cada uma com mediana, p90, p99 e as frações a até 2 e 5 mm; o erro de normal nos dois sentidos, sem sinal; os vincos, que são as arestas com diedro acima de `angulo_vinco` entre faces visíveis, amostradas a cada 2 mm, com a cobertura (fração do vinco da referência a até 5 e 10 mm de um vinco da candidata), a precisão (o contrário), o F1 e o desvio mediano e p90; os vértices da candidata na caixa; e, com rótulos, a distância por rótulo (`por_rotulo`) e os vincos por rótulo (`vincos_por_rotulo`, com cobertura, precisão, F1 e desvio de cada um). O ponto de vinco da referência leva o rótulo da face dele, e o da candidata o rótulo da face da referência mais perto; rótulo sem vinco aparece com comprimento zero. Com `omitidas`, cada rótulo traz `omitida`, e `ref_para_cand_sem_omitidas_mm` e `vincos_sem_omitidas` repetem a medida sem esses rótulos, para separar o erro da forma do que a candidata não se propôs a modelar. Sem `--sem-imagens`, a régua grava também `folha.png`, com a referência e a candidata em cinza e em listras de reflexo e o mapa da distância de cada vértice da referência à candidata, de azul em 0 a vermelho em `mapa_max_mm`.

## Oráculo da subdivisão

```text
MECANIFICA_BLENDER=<blender> node tools/blender/oraculo-subdivisao.mjs [--conferir] [--saida <arquivo.json>]
```

Desenha por código as gaiolas da fixture `procedural/nucleo/fixtures/subdivisao-oraculo-blender.json` (os casos por índice e as receitas por nome), passa-as ao modificador Subdivision Surface do Blender por `oraculo-subdivisao.py` e escreve a fixture; com `--conferir`, só compara com a versionada e falha se alguma coordenada diferir mais de 1e-7. Os testes do núcleo leem a fixture congelada e não precisam do Blender.

## Testes

`tools/blender/blender.test.mjs` só roda com `MECANIFICA_BLENDER` apontando o executável do Blender e se ignora sem ele. Ele confere que o oráculo regera a fixture a 1e-7; que a régua dá zero na forma de prova da gaiola por estações medida contra ela mesma, acusa a mesma forma decimada a um décimo e repete a medida; que a folha sai e a distância se separa por rótulo; e que o pacote cego da forma com um painel interno e uma lasca tira os dois, deixa as mesmas bordas da forma limpa, sem vértice fora da caixa, marca o avesso só na vista que olha pelo corte e não põe a barra sobre rótulo, que o pacote desenha as linhas de feição de cada vista e os cortes cotados, com quatro a seis cotas por corte e os pontos do contorno a cada 10 mm só na pasta privada; que a régua separa os vincos por rótulo, somando o total, e repete a medida sem as omitidas; e que a candidata olhada nas câmeras do pacote dá os mesmos pixels e as mesmas cotas. `MECANIFICA_BLENDER_GUARDAR=1` guarda a pasta das saídas. `tools/blender/cotas-dos-cortes.test.mjs` roda sem Blender, só com python3, Pillow e numpy (e se ignora sem eles): desenha por código um perfil com bossa, entalhe e uma linha aberta, inteiro e pela metade com simetria, e confere, a partir do quadro e dos segmentos do contorno, que nenhuma caixa de rótulo o cruza, que o lugar colado ao ponto cruzava em parte das cotas (o teste não é vazio) e que duas execuções dão as mesmas caixas.
