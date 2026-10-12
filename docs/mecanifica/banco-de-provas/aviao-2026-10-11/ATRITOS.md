# Avião de pequeno porte: atritos

Cada atrito do plano [o que o avião pede](../../planos/2026-10-11-o-que-o-aviao-pede.md),
com o comando que o reproduz. A classificação (ferramenta nova, correção do
núcleo ou nada) é da fatia 4.

## 1. Reflexo mais claro que o fundo fica sem dono no contorno

Na lateral, logo abaixo da linha escura do topo da fuselagem (linhas 95 e 96 da
imagem), há pixels de reflexo com cinza de 225 a 239, no mesmo tom ou mais claros
que o fundo (232). O watershed só pinta o que fica abaixo do `limiar` (225), então
esses pixels ficam fora da silhueta, como buracos cercados por ela, e nenhuma
semente os alcança. O crítico das rodadas 1 e 2 os apontou como pontos soltos, e o
desenhador não tem como corrigir mexendo só nas sementes. Subir o limiar não
resolve, porque parte deles é mais clara que o fundo.

```bash
python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open('docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png').convert('L')); print((a[95:97,180:300]>=225).sum(), 'pixels acima do limiar sob o topo da fuselagem')"
```

O processo pegou o defeito (o crítico o viu), mas a ferramenta não oferece
saída: falta o contorno fechar buracos pequenos cercados pela silhueta.

## 2. Partes vizinhas no mesmo tom no mapa de partes

Na vista de topo, o crítico não achou a divisa entre estabilizador e profundor
e os apontou como defeito, embora a semente já seguisse o degrau. A cor de cada
parte saía da posição do nome na lista, pelo ângulo de ouro, e os pares caíram
a 20° um do outro; a 20% de opacidade não se vê a fronteira. O desenhador
achou a causa e não tinha como corrigi-la mexendo só nas sementes.

Corrigido em 2026-10-11 em `modulos/contorno-da-imagem/src/desenho.js`: o
matiz passa a ser escolhido contra as partes vizinhas na imagem
(`matizesPorVizinhanca`), com teste no módulo. A menor distância entre
vizinhas ficou em 85° no topo e 65° na lateral e na frontal. O processo pegou o
sintoma pelo crítico, e o teste novo passa a pegar a causa.

```bash
npx vitest run modulos/contorno-da-imagem
```

## 3. Parte em vários pedaços fica só com o maior no contorno

O contorno em milímetro guarda, de cada parte, só o maior pedaço da região
(`regioes.js`, `findContours` com `RETR_EXTERNAL` e o de maior área). Na
lateral, a hélice ficou só com a pá de baixo (869 mm de altura no contorno), e a cota de altura da prancha mede uma pá,
752 mm, e não o diâmetro de cerca de 2.100 mm; as janelas ficaram só com a
primeira atrás do para-brisa. O desenhista da prancha achou ao cotar. O
processo não teria pego sozinho: o crítico do contorno julga a pintura, que
mostra todos os pedaços, e o contorno guardado não aparece para ele.

```bash
node -e "const d=require('./docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.contornos.json'); const y=d.regioes.helice.contornoMm.map(p=>p[1]); console.log('altura do contorno da hélice', Math.round(Math.max(...y)-Math.min(...y)), 'mm')"
```

Corrigido em 2026-10-12: `segmentar` guarda todos os pedaços acima de 9 px²
no campo `pedacos`, a prancha desenha e mede a união, e o esboço confere contra a
união. Com os contornos refeitos, a hélice da lateral tem 2 pedaços e 1.995 mm de
altura, e as janelas têm os 4. O comando acima passa a medir só o maior pedaço,
como antes; a união está em `pedacos`.

## 4. A prancha só sabe ser lateral

A prancha de topo sai com o rótulo "LATERAL — projeção" e com o eixo do
relatório da lateral, fixos no comando, e o comprimento ao longo do avião vira
"altura" nas cotas. A skill `prancha-dos-contornos` também se descreve como
prancha lateral. O desenhista contornou com `--titulo`, mas o rótulo e o eixo
continuam errados. Num objeto que precisa da vista de cima, como o avião, a
planta e a lateral são as duas vistas principais.

```bash
grep -n "LATERAL" tools/mecanifica/prancha/*.mjs
```

Corrigido em 2026-10-12: o `<imagem>.prancha.json` declara `"vista"` (lateral,
topo ou frontal, lateral por padrão), o rótulo, as cotas gerais, o relatório e o
roteiro do crítico usam as palavras da vista, e imagem chamada topo ou frontal
sem o campo é recusada. A skill e o agente desenhista dizem isso.
