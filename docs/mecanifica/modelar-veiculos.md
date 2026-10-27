# Modelar veículos a partir de uma fonte de referência

Instrução de modelagem de veículo a partir de fonte de referência, escrita no plano encerrado [veículos de referência livre](planos/encerrados/2026-10-20-veiculos-de-referencia-livre.md), cujas 27 peças estão no acervo. O diagnóstico da primeira leva, a decisão por peça, as lacunas daquele dia e o experimento da perua estão no [histórico](historico/VEICULOS-PRIMEIRA-LEVA-2026-10.md). Para chapa contínua com detalhe de borda, a técnica é a de [`modelar-carroceria.md`](modelar-carroceria.md); a interseção das três vistas, abaixo, é para o veículo de volumes facetados.

As ferramentas de apoio estão versionadas em `tools/mecanifica/`: `medidas-da-fonte.mjs` (perfil lateral, planta, seção frontal e rodas de `fonte-partes.json`, com a TABELA e as funções de perfil prontas para a receita), `vistas-da-receita.mjs` (folha de seis vistas coloridas por parte, a partir de uma `receita.js`), `folha-comparativa.mjs` (fonte e receita na mesma câmera e escala, com a vista de diferença), `comparar-silhueta.mjs` (com `--rigoroso` e `--cabine`) e `modelo-de-referencia.mjs` (gera `fonte-partes.json` e `fonte-vistas.png` e grava a `frente`). A origem de cada fonte está em `docs/mecanifica/veiculos-referencias.json`. O que não virou ferramenta aparece na seção 3, com a receita `procedural/pecas/carro-perua/receita.js` como exemplo da técnica. Os caminhos de peça dos exemplos são relativos à raiz do repositório, e `conferir-malha` e `descrever-peca` recusam caminho fora da árvore.

## 1. Instruções comuns para o agente modelador

Você vai recriar um veículo como peça do acervo, em `procedural/pecas/<nome>/receita.js`, a partir da referência que já está em `procedural/pecas/<nome>/referencias/` (`fonte-vistas.png` e `fonte-partes.json`). Leia `CLAUDE.md` e rode `npm run comecar -- modelar/peca` antes de tudo. Responda e escreva em pt-BR. Não use git e não rode `npm run gates`; quem integra roda. Não edite nada fora da pasta da sua peça, salvo arquivos de rascunho em `tmp/<nome>/` dentro do repositório (que o git ignora e onde as ferramentas aceitam caminho).

### 1.1 Antes de escrever código

1. Abra `fonte-vistas.png` e descreva para si, em três ou quatro frases, a forma: o grupo do veículo (seção 2), o estilo de arte da fonte, como é a seção frontal (onde é mais largo, quanto a estufa afunila, se a saia recolhe), onde as rodas aparecem e quanto, e as partes que a pessoa vai procurar. Confira que a frente está à esquerda na vista lateral e embaixo na vista de cima; se não estiver, pare e relate, porque a fonte precisa ser regerada com `--girar 180`.
2. Confira a origem na tabela do plano e escreva-a no cabeçalho da receita e em `referencias/alvo.md` (pacote, modelo, autor, licença livre sem exigência de crédito, página). A perua da primeira leva saiu com a origem trocada.
3. Rode `node tools/mecanifica/medidas-da-fonte.mjs procedural/pecas/<nome>/referencias/fonte-partes.json`. Ele imprime a caixa, as rodas (pelas malhas de roda, ou pelos vales de ymin quando a fonte é uma malha só), o perfil lateral do topo, a planta, a seção frontal e as faces de frente e de trás, já simplificados. Leia cada lista contra a imagem: o xmax de uma fatia é o máximo de tudo naquela altura, então nas alturas das rodas e dos espelhos a carroceria é mais estreita que o número.
4. Escreva o PLANO (partes, técnica de cada uma, critérios de reprovação, escala) antes da geometria, como o compacto faz. As partes vêm da decomposição do grupo, na seção 2.

### 1.2 A técnica da carroceria: interseção das três vistas

Cada volume da carroceria (a carroceria de baixo, cada trecho da estufa, o teto, o capô quando for parte própria) é a interseção de três sólidos: o perfil lateral (z, y) extrudado em x, a seção frontal (x, y) extrudada em z, e uma caixa que recorta a faixa de y e de z daquela parte. Quando a planta importa (nariz que estreita, traseira que recolhe, carro de corrida), entra um quarto sólido, a planta (x, z) extrudada em y. Essa construção dá o afunilamento da cabine, o vinco da cintura e a saia sem nenhum vértice calculado em 3D, e as faces saem planas, como nas fontes de baixo polígono. Como todas as partes saem dos mesmos prismas, as faces em que duas partes se encontram são o mesmo plano de corte, e o contato fecha exato sem `unir` e sem ajuste de coplanaridade.

O mapeamento dos perfis no núcleo foi medido: com `eixo: 'x'` o ponto [u, v] vai para y = -u e z = v; com `eixo: 'z'` vai para x = u e y = -v; com `eixo: 'y'` vai para x = u e z = v. Use sempre o sentido anti-horário no plano [u, v] e tire os vértices colineares. O trecho abaixo vem do experimento, com o perfil e a seção passados como argumento; a versão completa e testada, com arcos, caixas de roda, rodas, luzes e contatos, está em `procedural/pecas/carro-perua/receita.js`:

```js
const m = (v) => v / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);   // eixo 'x'
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);    // eixo 'z'
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

/* Uma parte: interseção do perfil lateral, da seção frontal e da caixa [y0,y1]×[z0,z1]. */
function parteDasVistas(base, nome, material, { y0, y1, z0, z1, lado, frente }) {
  const L = T.meia_largura + 50; const C = T.comprimento / 2 + 50;
  return [
    ['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(lado) }],
    ['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: secaoFrontal(espelhar(frente)) }],
    ['cubo', { origemId: base + 3, larg: m(2 * L + 100), alt: m(y1 - y0), prof: m(z1 - z0), em: [0, m(y0), m((z0 + z1) / 2)] }],
    ['intersectar', { origemId: base + 10, solidos: [
      { origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }, { origem: { op: 'cubo', id: base + 3 } }] }],
    ['parte', { nome, sel: { origem: { op: 'intersectar', id: base + 10 } } }],
    ['material', { sel: { origem: { op: 'intersectar', id: base + 10 } }, usa: material }],
  ];
}
```

Na perua, a carroceria é `parteDasVistas` de y 188 à cintura (y 1110); a estufa, entre a cintura e a base do teto (y 1510), é partida em z pelos planos das colunas, e cada trecho sai como vidro ou como coluna da cor da carroceria; o teto é a faixa de y 1510 a 1600. Para-brisa e vidros laterais são o mesmo sólido de vidro, porque nessas fontes o vidro é a própria face da estufa. Quando a fonte tem o vidro rebaixado com moldura (pacote A, pacote B, pacote C), faça a estufa da cor da carroceria e os vidros como placas finas de 10 a 20 mm por fora das faces, com o contorno recuado pelo `deslocar` do perfil 2D, como o compacto faz com o para-brisa.

### 1.3 Arcos de roda, para-lamas, caixas de roda e rodas

Recorte o arco no próprio perfil lateral, antes de extrudar: os vértices do polígono de raio (raio do pneu + folga de 40 a 60 mm), da parte acima da base, entram na borda de baixo do perfil, de trás para a frente. A receita da perua faz isso com `arcoNoPerfil(zc, yc, r, yBase, lados)`, que devolve os pontos do octógono (ou de qualquer número de lados, a mesma contagem do pneu) cortados na linha da base. Isso evita a booleana na carroceria grande, que no experimento da perua deixou uma lasca reprovada pelo `conferir-malha`. `subtrair` com cilindros continua aceitável em peça pequena e de faces simples, como o chassi do compacto, desde que `conferir-malha` não acuse `face-fina`.

O arco recortado no perfil atravessa o carro de lado a lado. Feche-o com uma caixa de roda por eixo: o mesmo polígono do arco, fechado na linha da base, extrudado em x entre as faces de dentro dos dois pneus, em material escuro. Ela encosta na carroceria pelas faces do arco e no pneu pela face de dentro, e assim a roda fica presa ao carro e o vão aparece escuro, como nas fontes. Sem ela, a roda só encosta na calota e fica solta do carro, e o `descrever` reprova no acervo a parte que não toca nenhuma outra.

A roda aparece quando a face de fora do pneu fica no plano mais largo da carroceria ou fora dele, e quando o arco sobe acima do eixo. Leia a largura da roda nas malhas de roda da fonte (pacote A e pacote C as têm separadas) ou na vista frontal. Pneu e calota são cilindros de eixo x com a mesma contagem de lados da fonte (8 nas fontes do pacote D de baixo polígono, 24 a 32 nas do pacote A); a calota sai alguns milímetros da face de fora do pneu. Para-lama em cápsula (pacote A) é a extrusão em x de um arco fechado na face de cima do chassi, como `capaDoParaLama` do compacto; para-lama plano (jipe, picape do pacote D) é uma placa fina em arco ou em trapézio por cima do pneu.

### 1.4 Erros da primeira leva e como evitá-los

A cabine de largura constante some quando toda a carroceria sai da interseção com a seção frontal; nunca extrude a estufa só pelo perfil lateral. O perfil com poucos vértices se resolve lendo o perfil pelo gerador e conferindo cada dobra na imagem; quantidade de vértice não é o objetivo, e cada vértice deve estar onde a forma dobra. Faces degeneradas no OBJ aparecem com vértices colineares, com ponta única de altura zero e com lascas de booleana: tire os colineares, feche ponta com dois pontos e prefira o recorte no perfil 2D. Não use `arredondarAresta` em aresta de booleana; arredonde no perfil 2D com `concordancia` ou com pontos de arco. Não use `unir` para juntar partes que se tocam por face; deixe-as como partes separadas que saem dos mesmos prismas. Contato que exige coplanaridade se resolve com planos de corte comuns e com placas encostadas em face plana derivada da TABELA, nunca com número digitado. Orientação invertida se resolve antes de modelar (passo 1 da seção 4.1). E não confie no "RESULTADO: confere" do comparador: ele mede escala, e a forma é a pessoa que aprova olhando a folha comparativa.

### 1.5 Regras de receita

Siga o compacto: uma TABELA em milímetro como única fonte de medidas, `m()` como única conversão, `derivar` que calcula formas, `gerarPassos` que escreve forma, corte, `parte` e `material`, `CONTATOS` com motivo em cada par, `PONTOS` declarados, `PLANO` completo e `ALIASES` para os cilindros inteiros (lateral mais as duas tampas). IDs de passo são blocos fixos por parte e nunca identidade persistida. Lados esquerdo e direito saem do mesmo código com o sinal de x. Material só como escolha por peça (`liso` ou `metal`), sem paleta nova. Nenhum ajuste específico deste veículo vai para ferramenta; se você achar defeito de ferramenta, relate.

### 1.6 A rodada, as provas e o custo

Uma rodada é: editar a receita; rodar `node tools/mecanifica/comparar-silhueta.mjs procedural/pecas/<nome>/receita.js procedural/pecas/<nome>/referencias/fonte-partes.json --rigoroso --cabine auto`; rodar `node tools/mecanifica/conferir-malha.mjs procedural/pecas/<nome>/receita.js` e `node tools/mecanifica/descrever-peca.mjs procedural/pecas/<nome>/receita.js`; gerar `referencias/vistas.png` (folha de seis por parte) com `node tools/mecanifica/vistas-da-receita.mjs procedural/pecas/<nome>/receita.js --saida procedural/pecas/<nome>/referencias/vistas.png` e a textura com `node tools/mecanifica/vistas-texturizadas.mjs procedural/pecas/<nome>/receita.js --saida procedural/pecas/<nome>/referencias/vistas-textura.png`; gerar a folha comparativa com `node tools/mecanifica/folha-comparativa.mjs procedural/pecas/<nome>/receita.js procedural/pecas/<nome>/referencias/fonte-partes.json --saida tmp/<nome>/folha --imagem procedural/pecas/<nome>/referencias/fonte-vistas.png`; e abrir as imagens e escrever, em frases, o que difere da fonte em cada vista. Na rodada final rode também `node tools/mecanifica/conferir-pontos.mjs` e `npm run guarda:acervo`.

As provas obrigatórias para entregar são: `conferir-malha` sem `✗` (alerta de n-gon, polo e ilhas é aceito), `descrever-peca` com código 0 e nenhum contato não declarado, `comparar-silhueta` em `--rigoroso` e com `--cabine auto`, sem fatia acima de 2% do comprimento e com a estufa dentro da tolerância, `conferir-pontos` dentro da tolerância, `guarda:acervo` aprovando a peça, e a folha comparativa olhada, com a lista de diferenças escrita no `alvo.md`.

O limite de rodadas com o crítico é o de [O laço do crítico](usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico). Pare antes e relate se a mesma falha de ferramenta se repetir duas vezes; nesse caso descreva a falha com o passo mínimo que a reproduz e não force contorno dentro da receita. Pare também se a peça passar de 60 partes, porque nenhum destes veículos pede mais que isso.

### 1.7 Relato

O relato tem seis parágrafos curtos: o que foi feito e a técnica por parte; os números finais do comparador, do `conferir-malha` e do `descrever-peca`; o que difere da fonte, por vista, e por quê; as rodadas gastas e o motivo de cada uma; as falhas de ferramenta encontradas e se algum processo as teria pego sozinho; e o que depende da pessoa, com a recomendação. Diga os caminhos completos de `receita.js`, `alvo.md`, `vistas.png`, `vistas-textura.png` e da folha comparativa.

### 1.8 Checklist final

Antes de declarar pronto, confira cada item. A frente está em +z e a lateral da fonte mostra a frente à esquerda. A origem do cabeçalho e do `alvo.md` bate com a tabela do plano. A carroceria e a estufa saem da interseção com a seção frontal, e a vista frontal da folha mostra o mesmo afunilamento da fonte. As rodas aparecem na isométrica tanto quanto na fonte, com arco recortado e caixa de roda. O perfil lateral da folha, sobreposto em pensamento ao da fonte, tem as mesmas dobras no nariz, no capô, no para-brisa, no teto e na traseira. As partes características do grupo (seção 2) estão todas lá. Os dois lados são iguais. As provas da seção 1.6 passaram e os números estão no relato. Você abriu `fonte-vistas.png`, `vistas.png`, `vistas-textura.png` e a folha comparativa nesta rodada, e escreveu o que viu.

## 2. Seções por grupo

Os grupos abaixo cobrem as 27 peças. Há três estilos de arte nas fontes, e o estilo decide o nível de detalhe mais que o tipo do veículo.

O estilo do pacote A (os 20 do pacote A) é de brinquedo arredondado: carroceria de cor lisa, faixa inferior cinza escura mais larga que a carroceria e que forma o chassi e os para-choques, para-lamas em cápsula, rodas grandes (o diâmetro é perto de 23% do comprimento num carro) com pneu escuro, aro cinza e calota, faróis amarelos, placa clara, cabine que afunila pouco, quinas levemente chanfradas e vidros como placas azul claras rebaixadas na estufa. O nível de detalhe é médio, de 25 a 45 partes, e a receita do compacto é o modelo de partida para todos eles.

O estilo do pacote D (Sedan, Wagon, Pickup, Jipe e Bus do pacote D) é facetado e plano: carroceria verde de uma cor só, sem chassi separado, vinco na cintura, estufa afunilada em plano reto, vidros que são a própria face da estufa, rodas octogonais com pneu preto e calota cinza, faróis brancos e lanternas vermelhas pequenas. O nível de detalhe é baixo, de 15 a 30 partes, e o caráter está todo na seção frontal e nas facetas; arredondar estraga.

pacote B e pacote C (pacotes B e C) são de outro estilo, liso e detalhado, monocromático (vermelho no pacote B, branco no pacote C), com cantos arredondados de raio grande, arcos de roda com borda, para-choques próprios e rodas com raios ou cubo. pacote B tem 38 mil triângulos na carroceria. Eles pedem mais detalhe: seções com concordâncias, mais estações, para-choques e frisos como partes, e rodas pela família `roda-pneu` ou por `lathe`. Como a fonte não distingue o vidro pela cor, a escolha de um material de vidro é desvio a registrar no `alvo.md` e a decidir com a pessoa; a recomendação é usar vidro escuro discreto, porque um carro monocromático em primitivas fica ilegível.

### 2.1 Sedã, hatch e perua

Fontes: pacote A sedan (carro-sedan-compacto, aprovado), pacote A taxi (carro-taxi), pacote A police (carro-policia), pacote D Sedan (carro-sedan-angular), pacote D Wagon (carro-perua) e pacote B (carro-sedan-classico).

A decomposição é carroceria de baixo (até a cintura, com capô, porta-malas e arcos no perfil), estufa (partida em z pelas colunas quando a fonte mostra colunas), teto, vidros, chassi e para-choques (só do pacote A), para-lamas (cápsula no pacote A, nenhum no pacote D, borda de arco no pacote B), caixas de roda, rodas e calotas, faróis, lanternas, retrovisores e, no pacote A, placa e grade. O característico é o volume de três caixas do sedã (capô, cabine, porta-malas em degrau), a traseira em rampa do hatch e o teto longo da perua com a coluna de trás quase vertical. O táxi é o compacto com frente alta, grade cinza entre os faróis, luminoso branco no teto e faixa de chassi mais larga; a polícia tem pintura em duas cores (portas claras), barra de sirene vermelha e azul no teto e protetor de para-choque. As armadilhas são a cabine constante, o nariz em rampa quando a fonte tem face vertical (táxi) e o entalhe do arco posto na borda de cima do perfil (angular). No pacote B, a estufa é bem mais estreita que a carroceria e o capô tem tomada de ar; faça a seção frontal com concordâncias e o perfil com mais estações, e espere de 40 a 60 partes.

### 2.2 Esportivo e corrida

Fontes: pacote A sedan-sports (carro-esportivo-sedan), hatchback-sports (carro-esportivo-hatch), race (carro-corrida) e race-future (carro-corrida-futurista).

Os esportivos são sedã e hatch do pacote A mais baixos, com aerofólio traseiro em duas hastes e placa, faixa lateral de outra cor (hatch) e para-lamas mais largos. Decompõem como o grupo 2.1, mais o aerofólio. Os carros de corrida são de roda descoberta: monocoque estreito e longo (planta afunilada no nariz, entra a quarta vista, a planta), cockpit aberto com encosto e santantônio de cabeça, asa dianteira larga e baixa, asa traseira alta em duas placas laterais, pontões laterais, rodas grandes e largas fora da carroceria com aro laranja, e braços de suspensão finos ligando roda e monocoque (que também são o contato da roda). A armadilha é tentar o perfil lateral sozinho: no carro de corrida a forma está na planta. O nível é médio, de 30 a 45 partes.

### 2.3 SUV

Fontes: pacote A suv (carro-suv) e suv-luxury (carro-suv-luxo).

A SUV é alta, com teto longo em outra cor (cinza na suv), estufa quase vertical, frente alta com grade, faróis redondos, estribo lateral entre as rodas e estepe na traseira (a fonte da suv traz a malha `wheel-back` em z -2074, y 1236). A decomposição é a do 5.1 mais teto próprio, estribos, estepe com suporte e grade. A suv-luxo é mais arredondada, de uma cor, sem estepe. A armadilha é a seção frontal medida pelo xmax: entre y 1195 e 1578 ele é dos retrovisores (1324 mm) e não da carroceria (1147 mm).

### 2.4 Jipe aberto

Fonte: pacote D Jipe (jipe-aberto), estilo de baixo polígono.

Não tem teto nem portas. A carroceria é uma banheira: a interseção das vistas dá o volume externo, e o interior aberto sai de um `subtrair` de uma caixa só (ou da interseção com uma seção frontal em U, que evita a booleana). O para-brisa é vertical ou quase, com moldura grossa da cor do carro e vidro dentro, e fica na frente da banheira, rebatível (modelado em pé). O santantônio atrás é feito de barras de seção quadrada grossa (no jipe da fonte, cerca de 100 mm), um arco em U invertido com duas barras diagonais para trás. Os bancos têm assento e encosto separados, de cor marrom, um por lado, e não uma tábua de lado a lado. A frente tem grade com fendas, faróis redondos brancos e para-choque preto largo; os para-lamas são placas pretas planas sobre as rodas, salientes da lateral; as rodas são grandes, octogonais, e o estepe pode ficar atrás. O nível é de 25 a 35 partes. A armadilha é tratar o jipe como sedã sem teto: o característico é a banheira baixa, o para-brisa em pé e o santantônio.

### 2.5 Picape e utilitário de carga

Fontes: pacote A truck (picape-compacta), truck-flat (picape-plataforma) e pacote D Pickup (picape-angular).

A picape tem cabine curta afunilada (pelas três vistas) e caçamba aberta atrás. A caçamba é um prisma pelas vistas (o mesmo perfil lateral da carroceria até a borda da caçamba) do qual se tira o interior por uma seção frontal em U ou por um único `subtrair` de caixa, deixando paredes de 60 a 100 mm; a tampa traseira é uma parede própria. O santantônio (pacote D Pickup) é um arco de barra grossa logo atrás da cabine, e o para-choque do pacote D tem protetor de duas barras verticais. A picape-plataforma tem, no lugar da caçamba, uma plataforma plana de pouca altura com bordas baixas. A armadilha da primeira leva foram as paredes da caçamba como lajes altas e soltas; elas devem sair do mesmo prisma da carroceria e ter a altura da borda da fonte. O nível é de 25 a 40 partes.

### 2.6 Van, furgão e ambulância

Fontes: pacote A van (furgao) e ambulance (ambulancia).

A van é um volume único alto e longo, com capô curto inclinado, para-brisa grande, teto quase plano e traseira vertical; a estufa afunila pouco, a seção é quase retangular com quinas chanfradas, e as janelas laterais são poucas (a van do pacote A tem só as da frente). A ambulância é cabine de picape na frente e baú alto atrás, mais largo e mais alto que a cabine, branco com faixa vermelha, giroflex azul na cabine e no baú, e janela no baú. A decomposição é carroceria (cabine), baú como parte própria encostada na traseira da cabine e na face de cima do chassi, faixas de cor como placas finas sobre o baú, luzes, rodas e chassi. A armadilha é fazer a ambulância como uma van: o baú é outra caixa, com degrau visível sobre a cabine.

### 2.7 Ônibus

Fontes: pacote D Bus (onibus-urbano), de baixo polígono, e pacote C (onibus-rodoviario), liso e detalhado.

O ônibus é uma caixa longa de seção quase retangular, com a frente de vidro grande e inclinada e a traseira vertical. O característico é a fileira de janelas: a estufa (faixa de y das janelas) partida em z por colunas regulares, que saem como trechos alternados de vidro e de carroceria, todos da interseção dos mesmos prismas; a porta de entrada no urbano é um recorte do vidro até embaixo, na frente à direita. As rodas são pequenas para o tamanho do veículo e precisam de arco recortado no perfil e caixa de roda, porque a saia desce até perto do chão. Os espelhos do urbano são hastes curvas na frente. No rodoviário, o teto tem cantos arredondados de raio grande (faça a seção frontal com concordâncias nas quinas de cima), as janelas são escuras em fileira com colunas finas, a saia tem bagageiros marcados por vincos e as rodas têm cubo. O nível é de 30 a 50 partes. As armadilhas são as rodas escondidas, a faixa única de janela sem colunas e a orientação da fonte (o rodoviário veio invertido).

### 2.8 Caminhões

Fontes: pacote A delivery (caminhao-entrega), delivery-flat (caminhao-entrega-aberto), firetruck (caminhao-bombeiro) e garbage-truck (caminhao-lixo).

O caminhão é cabine e implemento separados sobre um chassi longo e cinza: a cabine curta e alta na frente (pelas três vistas, com afunilamento pequeno) e o implemento atrás, encostado na traseira da cabine e na face de cima do chassi. Na entrega, o implemento é um baú alto e mais largo que a cabine, verde; na entrega-aberto, uma plataforma plana sobre o chassi, com a longarina aparecendo; no bombeiro, a carroceria vermelha com compartimentos laterais em fileira (persianas), escada no teto e giroflex; no lixo, a caçamba compactadora verde de topo curvo, os braços da frente que passam por cima da cabine e a traseira inclinada. A decomposição é chassi, cabine, vidros da cabine, implemento e os acessórios do implemento, para-choque, faróis, rodas (o eixo traseiro pode ser duplo) e caixas de roda. O nível é de 30 a 50 partes. A armadilha é fazer cabine e implemento num perfil só: o degrau e a diferença de largura entre os dois são o que se reconhece.

### 2.9 Trator

Fontes: pacote A tractor (trator), tractor-shovel (trator-pa) e tractor-police (trator-sirene).

O trator tem rodas traseiras muito maiores que as dianteiras (na fonte do trator, a traseira tem quase o dobro do diâmetro), capô estreito e longo na frente com escapamento vertical, cabine de vidro alta sobre o eixo traseiro com teto saliente, e para-lamas grandes em arco sobre as rodas traseiras. Não há carroceria contínua: o capô é um prisma pelas vistas (planta estreita), a cabine é uma moldura de colunas finas com vidros e teto, o chassi liga os eixos. O trator-pá tem a lâmina à frente, inclinada, com braços até o chassi e dentes na borda; o trator-sirene tem barra de sirene no teto e pintura branca e preta. O nível é de 25 a 40 partes. A armadilha é igualar as rodas ou usar arco recortado: as rodas do trator ficam inteiras para fora, e o contato delas é com o eixo e o para-lama, não com uma caixa de roda.

## 3. Lições dos dois últimos lotes

As 18 peças dos lotes seguintes à primeira leva trouxeram quatro achados que valem para qualquer receita de veículo, todos registrados em 'Ajustes no núcleo' do plano encerrado; o primeiro já é recusado, e os outros esperam o plano de ajustes no núcleo dos veículos.

Uma parte cujo contorno repete um ponto, por espelhamento sobre o eixo ou por arredondamento de arco, é recusada pelo núcleo, que grita, e o `descrever-peca` reprova a peça. Arredonde e deduplique os pontos na receita, em especial depois de espelhar um meio contorno que toca o eixo de simetria.

A revolução (`lathe`) de um perfil que não toca o eixo sai com a casca aberta. Passe `furos: []` ou use um aro que enche o bolsão, e confira o resultado no `conferir-malha`.

A malha guarda os vértices em precisão simples, com erro de cerca de 1e-8 m contra a tolerância de contato de 1e-9 m. Por isso um contato em plano inclinado só fecha quando os vértices das duas partes são idênticos, e o vidro sobre uma face inclinada precisa de um encaixe declarado de cerca de 1 mm em vez de coplanaridade exata.

Os auxiliares de arco copiados de uma receita para outra, como `arcoNoPerfil`, deixam lasca de 0,5 mm quando o corte cai a menos de 1 mm de um vértice do perfil. Ao copiar o auxiliar, confira a distância entre a linha de corte e os vértices vizinhos e desloque o corte ou o vértice antes de rodar o `conferir-malha`.
