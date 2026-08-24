# Prova: seções por medida — interrompida, com um achado que fica

Rodada aberta para testar o "caminho 1": trocar seções transversais digitadas
por seções derivadas de dado medido. **Interrompida antes de produzir geometria**,
porque a discussão que ela abriu é mais importante que o resultado dela.

## O que ficou medido

`informacao-das-vistas.mjs` responde se três vistas ortográficas determinam a
seção transversal. Não determinam:

- **82% das estações ficam escondidas** atrás da envoltória frontal. Para elas,
  as três vistas dão dois números — faixa de altura e largura máxima — e nada
  mais sobre a forma da seção;
- duas famílias de seção com as **três vistas idênticas** (lateral 0 mm, planta
  1 mm, frontal 0 mm) ainda diferem até **28 mm** no flanco;
- para comparação, a nossa própria calibração registra **~40 mm** de ruído numa
  silhueta extraída de prancha rasterizada.

Conclusão: blueprint dá o esqueleto, nunca a seção. Quem fecha a lacuna é um
prior de seção — e o prior continua sendo número digitado.

## Por que parou

`secoes-por-medida.mjs` chegou a ler o perfil real do cupê fastback 1965 e a
separar carroceria de pneu na silhueta inferior. Ao escrever o prior, ficou
evidente o que o usuário apontou: trocar 80 coordenadas por 12 parâmetros com
nome não muda o ato. `larguraNoOmbro: 0.94` não foi medido, foi chutado com
nome bonito em cima.

O problema não é qual representação nem qual fonte de dado: é que milímetro não
é a linguagem em que forma é decidida nem julgada. Enquanto o trabalho for
digitar número e julgar imagem, o laço não fecha — e é exatamente essa a
assinatura das quatro tentativas anteriores, incluindo o cupê livre feito por
outro modelo sem tocar neste repositório.

## Um achado que vale, independente disso

O perfil medido põe o **alto do nariz do cupê a 841 mm do chão**. O alvo P0
que eu inventei põe em **520 mm** — 321 mm abaixo, e abaixo do topo do pneu
dianteiro. É a causa do perfil ler como cunha, e apareceu no primeiro contato
com dado real.
