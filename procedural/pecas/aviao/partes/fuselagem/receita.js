/* aviao/fuselagem — o casco do avião de pequeno porte, com o para-brisa e o montante, as oito janelas, a porta traseira e a barbatana ventral.
 *
 * Primeira etapa do avião (`../../montagem.json`). O combinado com a pessoa e o plano da fuselagem estão em
 * `../../ALINHAMENTO.md`; as medidas vêm da unidade `fuselagem` do esboço aprovado da segunda rodada
 * (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json` e `aviao-detalhe-fuselagem.esboco.json`), e a receita
 * refina o andaime `../../andaime.json`, que é a tradução desse esboço (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. A
 * fuselagem começa em z = 2377 (onde o capô encosta, na etapa seguinte) e termina em z = 10461, na ponta da cauda. A TABELA está em
 * milímetro, no quadro do esboço, e a conversão para metro acontece só em `derivar`.
 *
 * Cada loft anda numa reta paralela ao eixo dele e com todas as seções no mesmo plano: o centro de cada seção entra no contorno,
 * como no esboço, e não na posição. Se o caminho seguisse o centro das seções, o núcleo inclinaria cada anel para a tangente e o
 * perfil de lado sairia torto (a cabine sobe 17 graus entre duas seções). O loft só fecha uma ponta com um polo de raio zero; o
 * polo nasce no eixo, a `tampa.avanco` além da última seção, e `moveV` o leva ao centro da seção, de modo que cada ponta é um
 * leque quase plano. As seções são escritas como pontos do plano delas, no quadro do mundo, e `derivar` os converte para o plano
 * local do loft (`orientacao` fixa o +u); o contorno que sai no sentido horário nesse plano é invertido, porque o núcleo só aceita
 * anti-horário. O loft do casco tem 22 seções, e o bloco de ids de um passo é de 1000: com 10 segmentos por canto são 44 pontos por
 * seção e 924 faces, e com 11 já são 1008.
 *
 * O vão de cada janela é um corte de extrusão cuja face de dentro está no plano da face de dentro da placa da janela: a placa
 * assenta no fundo do vão e sobra a folga em volta dela, no esboço e aqui. O raio da janela arredonda o contorno dela visto de
 * lado (y por z), na placa e no vão; o esboço aplica o mesmo raio ao perfil em planta, recortado a metade da espessura, e a
 * janela sai quase quadrada de lado. Cada placa e a porta são aparadas pelo casco inteiro, sem os vãos (`intersectar` com um
 * loft do casco refeito a cada uso): a placa da janela 1 e o ombro da porta, retos, passavam da superfície do casco, a janela 1
 * em 4,5 mm e a porta em 3,8 mm, e agora a face de fora deles fica rente a ela, e o alto da janela 1, que está no ombro curvo do
 * casco, perde o que ficava fora dele. O vão da porta é o `cortePorta`, que o esboço escreve com a folga já somada. A porta é
 * recortada pelo vão da janela 4 do lado esquerdo, e esse corte avança `porta.sobraDoVao` para dentro do avião: a face de dentro
 * da porta se afasta do plano da face de dentro da placa até 12 mm no alto do vão, e sem a sobra a placa tocaria a pele que sobra
 * da porta, um contato que o plano não declara.
 *
 * Sem porta publicada: o andaime não declara nenhuma, e o plano da etapa não pede. O motor, que vem na frente da fuselagem, nasce da
 * seção da frente (z = 2377).
 */

export const TABELA = {
  /* Casco: uma estação por linha, [z, largura em x, altura em y, raio do canto, y do centro]. O x do centro é zero. */
  casco: {
    estacoes: [
      [2377, 1450, 1030, 380, 1303],
      [2712, 1480, 1060, 380, 1308],
      [3012, 1490, 1190, 380, 1353],
      [3312, 1490, 1330, 370, 1443],
      [3612, 1490, 1500, 350, 1498],
      [3912, 1520, 1570, 350, 1533],
      [4400, 1560, 1580, 350, 1538],
      [5100, 1560, 1580, 350, 1538],
      [5700, 1540, 1530, 350, 1563],
      [6300, 1380, 1460, 350, 1588],
      [6900, 1240, 1358, 350, 1649],
      [7500, 1040, 1133, 330, 1711],
      [8100, 840, 930, 300, 1783],
      [8700, 640, 736, 250, 1860],
      [9300, 400, 535, 190, 1932],
      [9600, 370, 444, 175, 1973],
      [9900, 380, 352, 170, 2014],
      [10300, 360, 231, 110, 2069.5],
      [10400, 270, 200, 95, 2082],
      [10461, 130, 125, 60, 2092],
    ],
    /* Segmentos de cada canto arredondado: o canto de 380 mm sai em 10 passos de 9 graus, com a corda a 1,2 mm do arco. O loft de 22
       seções cabe no bloco de 1000 ids de um passo com até 47 pontos por seção, e 12 segmentos dariam 52. */
    segmentosPorCanto: 10,
  },
  /* Fechamento das pontas dos lofts: quanto o polo fica além da última seção, em z, em x ou em y, conforme o eixo do loft. */
  tampa: { avanco: 0.5 },
  /* Para-brisa: uma faixa de 50 mm de espessura, inclinada, larga sobre o dorso e curva em x. Cada estação é
     [x, y do centro, meio comprimento em z, y do perfil nos quatro cantos]: dois na frente (z do centro menos o meio comprimento) e
     dois atrás. O z do centro é o mesmo em todas as estações, e o conjunto sobe `deslocamentoY` depois de montado. */
  parabrisa: {
    centroZ: 3270.5,
    deslocamentoY: 30,
    estacoes: [
      [-668, 1922, 220, -127, -77, 127, 77],
      [-640, 1960, 280, -155, -105, 155, 105],
      [-600, 1996, 320, -173, -123, 173, 123],
      [-550, 2028, 350, -187, -137, 187, 137],
      [-500, 2050, 370, -196, -146, 196, 146],
      [-450, 2064, 380, -201, -151, 201, 151],
      [-375, 2072, 385, -203, -153, 203, 153],
      [375, 2072, 385, -203, -153, 203, 153],
      [450, 2064, 380, -201, -151, 201, 151],
      [500, 2050, 370, -196, -146, 196, 146],
      [550, 2028, 350, -187, -137, 187, 137],
      [600, 1996, 320, -173, -123, 173, 123],
      [640, 1960, 280, -155, -105, 155, 105],
      [668, 1922, 220, -127, -77, 127, 77],
    ],
  },
  /* Montante do para-brisa: barra de seção retangular de cantos arredondados, do ponto `de` ao ponto `para`. */
  montante: { de: [0, 1955, 2900], para: [0, 2298, 3640], largura: 70, profundidade: 36, raioDoCanto: 14, segmentosPorCanto: 6 },
  /* Janelas do lado direito, [x, y, z do centro, espessura em x, altura em y, profundidade em z, raio do canto, giro em y em graus].
     As do lado esquerdo são o espelho em x, com o giro de sinal trocado. */
  janelas: {
    j1: [739.5, 1856.5, 3741.5, 20, 423, 733, 90, 0],
    j2: [768, 1905, 4523.5, 20, 326, 267, 110, 0],
    j3: [768, 1905, 5108.5, 20, 326, 299, 110, 0],
    j4: [726.3, 1915.5, 5882, 35, 305, 256, 110, -7],
  },
  /* Vão de cada janela: a folga a mais em cada lado da placa, no plano dela, e a profundidade do corte para fora a partir da face de dentro. */
  vao: { folga: 5, profundidade: 100 },
  segmentosPorCantoDaJanela: 8,
  /* Porta traseira, do lado esquerdo: loft em y de seções de cinco pontos [x, z] da lateral externa para a de dentro. Cada estação é
     [y, x e z dos cinco pontos]. */
  porta: {
    estacoes: [
      [1160, -776, 5498, -741, 5944, -683, 6390, -664, 6390, -757, 5498],
      [1180, -777, 5468, -741, 5944, -679, 6420, -660, 6420, -758, 5468],
      [1974, -777, 5458, -741, 5944, -678, 6430, -659, 6430, -758, 5458],
      [2090, -757, 5458, -721, 5944, -658, 6430, -639, 6430, -738, 5458],
      [2150, -730, 5458, -693, 5944, -630, 6430, -611, 6430, -711, 5458],
      [2200, -694, 5470, -658, 5944, -597, 6418, -578, 6418, -675, 5470],
      [2232, -663, 5498, -627, 5944, -569, 6390, -550, 6390, -644, 5498],
    ],
    /* Quanto o corte da janela 4 avança, na porta, além do plano da face de dentro da placa, para o lado de dentro do avião. A porta
       acompanha o casco e a face de dentro dela se afasta desse plano para o lado de dentro, até uns 12 mm no alto do vão; sem
       essa sobra o vão não passa de lado a lado e a placa toca a pele que sobra. */
    sobraDoVao: 30,
    /* Vão da porta no casco: loft em y de seções de quatro pontos [x, z], com a folga em volta da porta já somada. */
    vao: [
      [1152, -833, 5506, -740, 6382, -664, 6382, -757, 5506],
      [1172, -834, 5476, -737, 6412, -661, 6412, -758, 5476],
      [1974, -834, 5450, -734, 6438, -658, 6438, -758, 5450],
      [2090, -814, 5450, -714, 6438, -638, 6438, -738, 5450],
      [2150, -787, 5450, -686, 6438, -610, 6438, -711, 5450],
      [2208, -744, 5478, -648, 6410, -572, 6410, -668, 5478],
      [2240, -711, 5506, -618, 6382, -542, 6382, -635, 5506],
    ],
  },
  /* Barbatana ventral: uma estação por linha, [z, largura em x, altura em y, raio dos dois cantos de baixo, y do centro]. Os dois
     cantos de cima, que entram no casco, são vivos. */
  barbatana: {
    estacoes: [
      [7439, 36, 25, 16, 1100.5],
      [7480, 52, 126, 24, 1088],
      [7533, 60, 241.5, 28, 1064.8],
      [7700, 60, 240.8, 28, 1112.4],
      [7979, 58, 238.7, 27, 1192.4],
      [8300, 52, 225, 24, 1290],
      [8500, 46, 216.5, 21, 1350.8],
      [8692, 40, 208, 18, 1409],
      [8739, 36, 186, 16, 1433],
      [8811, 24, 25, 10, 1534.5],
    ],
    segmentosPorCanto: 8,
  },
};

const m = (mm) => mm / 1000;

/* Para cada eixo de loft: o índice do eixo, os eixos do plano da seção no quadro do mundo, o sinal que leva o segundo eixo do plano
   ao +w do núcleo, e a `orientacao` que fixa o +u no primeiro eixo do plano. Com `orientacao` declarada, o núcleo projeta a
   referência na tangente de cada seção, então u e w saem iguais em todas e w = u x tangente. */
const LOFT = {
  x: { eixo: 0, plano: [1, 2], sinalW: -1, orientacao: [0, 1, 0] },
  y: { eixo: 1, plano: [0, 2], sinalW: 1, orientacao: [1, 0, 0] },
  z: { eixo: 2, plano: [0, 1], sinalW: -1, orientacao: [1, 0, 0] },
};

/* Área com sinal pelo cadarço, sobre os dois primeiros números de cada ponto; o núcleo só aceita contorno anti-horário. */
function areaDoContorno(pontos) {
  let soma = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    soma += a[0] * b[1] - b[0] * a[1];
  }
  return soma / 2;
}

/* Quantos pontos o contorno tem depois de o núcleo trocar cada canto de raio positivo por um arco de `segmentos` segmentos. */
const pontosDepoisDosArcos = (pontos, segmentos) => pontos.reduce((n, p) => n + (p[2] > 0 ? segmentos + 1 : 1), 0);

/* Um loft por estações, em metro. `linha` é o ponto do mundo por onde o caminho passa (a coordenada do eixo é ignorada) e
   `estacoes` são `{ p, pontos }`: a posição no eixo e os pontos [a, b, raio?] do plano da seção no quadro do mundo.
   Devolve as seções, com um polo de raio zero antes da primeira e depois da última, os `lados`, a `orientacao` e, para cada polo,
   a região que o seleciona e o deslocamento que o leva ao centro da seção de que ele fecha a ponta. */
function loftPorEstacoes({ eixo, linha, estacoes, avanco, segmentos }) {
  const { eixo: ia, plano: [i1, i2], sinalW, orientacao } = LOFT[eixo];
  const noEixo = (p) => { const q = [...linha]; q[ia] = p; return q; };
  const secoes = estacoes.map(({ p, pontos }) => {
    const contorno = pontos.map(([a, b, ...resto]) => [a - linha[i1], sinalW * (b - linha[i2]), ...resto]);
    return { pos: noEixo(p), contorno: areaDoContorno(contorno) < 0 ? contorno.reverse() : contorno };
  });
  const lados = pontosDepoisDosArcos(secoes[0].contorno, segmentos);
  secoes.forEach((s, i) => {
    if (pontosDepoisDosArcos(s.contorno, segmentos) !== lados) {
      throw new Error(`loft em ${eixo}: a estação ${i} tem ${pontosDepoisDosArcos(s.contorno, segmentos)} pontos depois dos arcos e a primeira tem ${lados}`);
    }
  });
  const polo = (estacao, sentido) => {
    const pos = noEixo(estacao.p + sentido * avanco);
    const media = (k) => estacao.pontos.reduce((soma, ponto) => soma + ponto[k], 0) / estacao.pontos.length;
    const d = [0, 0, 0];
    d[i1] = media(0) - linha[i1];
    d[i2] = media(1) - linha[i2];
    const folga = avanco / 4;
    return { pos, d, regiao: { min: pos.map((v) => v - folga), max: pos.map((v) => v + folga) } };
  };
  const polos = [polo(estacoes[0], -1), polo(estacoes[estacoes.length - 1], 1)];
  return {
    secoes: [{ pos: polos[0].pos, raio: 0 }, ...secoes, { pos: polos[1].pos, raio: 0 }],
    lados,
    orientacao,
    polos,
  };
}

/* Retângulo de quatro pontos com o raio no terceiro número: o canto de raio zero fica vivo. */
const retangulo = (hx, hy, y, raios) => [
  [hx, y + hy, raios[0]], [-hx, y + hy, raios[1]], [-hx, y - hy, raios[2]], [hx, y - hy, raios[3]],
];

export function derivar(t = TABELA) {
  const avanco = m(t.tampa.avanco);

  const cascoMm = t.casco.estacoes;
  const casco = loftPorEstacoes({
    eixo: 'z',
    linha: [0, m(cascoMm[0][4]), 0],
    estacoes: cascoMm.map(([z, largura, altura, canto, y]) => ({
      p: m(z), pontos: retangulo(m(largura) / 2, m(altura) / 2, m(y), [m(canto), m(canto), m(canto), m(canto)]),
    })),
    avanco,
    segmentos: t.casco.segmentosPorCanto,
  });

  const pb = t.parabrisa;
  const parabrisa = loftPorEstacoes({
    eixo: 'x',
    linha: [0, m(pb.estacoes[0][1] + pb.deslocamentoY), m(pb.centroZ)],
    estacoes: pb.estacoes.map(([x, y, meio, y1, y2, y3, y4]) => {
      const cy = y + pb.deslocamentoY;
      return {
        p: m(x),
        pontos: [[m(cy + y1), m(pb.centroZ - meio)], [m(cy + y2), m(pb.centroZ - meio)], [m(cy + y3), m(pb.centroZ + meio)], [m(cy + y4), m(pb.centroZ + meio)]],
      };
    }),
    avanco,
    segmentos: 1,
  });

  /* O eixo da barra vai de `de` a `para`; a extrusão nasce em y a partir da origem, gira em z e depois em x para apontar para
     `para` e sobe para `de`. Com os dois pontos no mesmo x só sobra o giro em x. */
  const [dx, dy, dz] = t.montante.para.map((v, k) => m(v - t.montante.de[k]));
  const comprimento = Math.hypot(dx, dy, dz);
  const montante = {
    comprimento,
    giroEmZ: -(Math.asin(dx / comprimento) * 180) / Math.PI,
    giroEmX: (Math.atan2(dz, dy) * 180) / Math.PI,
    em: t.montante.de.map(m),
    largura: m(t.montante.largura),
    profundidade: m(t.montante.profundidade),
    raio: m(t.montante.raioDoCanto),
  };

  /* Cada janela, dos dois lados. O lado esquerdo é o espelho em x do direito, com o giro em y de sinal trocado. A extrusão em x
     tem a altura da janela em y e a profundidade em z. A placa fica centrada na origem em x, e o vão sai da face de dentro da
     placa para fora (para +x no lado direito e para -x no esquerdo), de modo que as duas faces de dentro são o mesmo plano; os
     dois sólidos giram em torno do centro da placa. */
  const janelas = [];
  for (const [chave, [x, y, z, espessura, altura, profundidade, raio, giro]] of Object.entries(t.janelas)) {
    for (const lado of [1, -1]) {
      const folga = m(t.vao.folga);
      const funda = m(t.vao.profundidade);
      const sobra = m(t.porta.sobraDoVao);
      janelas.push({
        nome: `janela${chave.slice(1)}${lado > 0 ? 'D' : 'E'}`,
        numero: Number(chave.slice(1)),
        lado,
        centro: [lado * m(x), m(y), m(z)],
        giro: lado * giro,
        placa: {
          altura: m(espessura), largura: m(altura), profundidade: m(profundidade), raio: m(raio), em: [-m(espessura) / 2, 0, 0],
        },
        vao: {
          altura: funda, largura: m(altura) + 2 * folga, profundidade: m(profundidade) + 2 * folga, raio: m(raio) + folga,
          em: [lado > 0 ? -m(espessura) / 2 : m(espessura) / 2 - funda, 0, 0],
        },
        /* O mesmo vão, com a sobra a mais para o lado de dentro, para abrir a porta de lado a lado. */
        vaoNaPorta: {
          altura: funda + sobra, largura: m(altura) + 2 * folga, profundidade: m(profundidade) + 2 * folga, raio: m(raio) + folga,
          em: [lado > 0 ? -m(espessura) / 2 - sobra : m(espessura) / 2 - funda, 0, 0],
        },
      });
    }
  }

  const estacoesDaPorta = (linhas, quantos) => linhas.map(([y, ...xz]) => ({
    p: m(y),
    pontos: Array.from({ length: quantos }, (_, k) => [m(xz[2 * k]), m(xz[2 * k + 1])]),
  }));
  const porta = loftPorEstacoes({ eixo: 'y', linha: [0, 0, 0], estacoes: estacoesDaPorta(t.porta.estacoes, 5), avanco, segmentos: 1 });
  const vaoDaPorta = loftPorEstacoes({ eixo: 'y', linha: [0, 0, 0], estacoes: estacoesDaPorta(t.porta.vao, 4), avanco, segmentos: 1 });

  const bb = t.barbatana;
  const barbatana = loftPorEstacoes({
    eixo: 'z',
    linha: [0, m(bb.estacoes[0][4]), 0],
    estacoes: bb.estacoes.map(([z, largura, altura, canto, y]) => ({
      p: m(z), pontos: retangulo(m(largura) / 2, m(altura) / 2, m(y), [0, 0, m(canto), m(canto)]),
    })),
    avanco,
    segmentos: bb.segmentosPorCanto,
  });

  return { casco, parabrisa, montante, janelas, porta, vaoDaPorta, barbatana };
}

/* Identidade estrutural dos passos, escolhida aqui. */
const ID = {
  casco: 100, fuselagem: 101, vaoDaPorta: 110,
  parabrisa: 120, montante: 130, barbatana: 140,
  porta: 150, portaVazada: 151, portaAparada: 152,
  placa: 200, vaoNoCasco: 300, vaoNaPorta: 400, placaAparada: 500, gabarito: 600, gabaritoDaPorta: 700,
};
/* Uma identidade por janela: cada número e cada lado têm a sua. */
const idDaJanela = (base, janela) => base + janela.numero * 10 + (janela.lado > 0 ? 0 : 1);
/* A janela que a porta leva: a 4, do lado esquerdo, onde o esboço recorta o painel da porta. */
const JANELA_DA_PORTA = { numero: 4, lado: -1 };

export const MATERIAIS = {
  casco: { cor: '#c9d1d9', metalicidade: 0.2, aspereza: 0.45 },
  vidro: { cor: '#1b2733', metalicidade: 0.1, aspereza: 0.15 },
  porta: { cor: '#8f9cab', metalicidade: 0.2, aspereza: 0.45 },
};

/* O ângulo, em graus, entre faces vizinhas a partir do qual a quina fica nítida no sombreamento liso. O arredondamento do casco e
   as seções do loft ficam bem abaixo disso; a borda de uma tampa, de um vão e de uma placa fica acima. */
const ANGULO_LISO = 30;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];

  const loft = (origemId, L, segmentos) => {
    passos.push(['loft', { origemId, secoes: L.secoes, lados: L.lados, segmentosCurva: segmentos, orientacao: L.orientacao }]);
    for (const polo of L.polos) {
      /* Um deslocamento abaixo de um nanômetro é ruído da média dos pontos, e não leva o polo a lugar nenhum. */
      if (polo.d.some((v) => Math.abs(v) > 1e-9)) passos.push(['moveV', { sel: { regiao: polo.regiao }, d: polo.d }]);
    }
  };
  const extrusaoDaJanela = (origemId, janela, forma, segmentos) => {
    passos.push(['extrusao', {
      origemId, eixo: 'x', altura: forma.altura,
      perfil: { retangulo: { largura: forma.largura, profundidade: forma.profundidade, cantos: forma.raio } },
      segmentosArco: segmentos, em: forma.em,
    }]);
    if (janela.giro !== 0) passos.push(['rotaciona', { eixo: 'y', graus: janela.giro, pivo: [0, 0, 0], sel: { origem: { op: 'extrusao', id: origemId } } }]);
    passos.push(['transladar', { d: janela.centro, sel: { origem: { op: 'extrusao', id: origemId } } }]);
  };

  /* O casco e os vãos que saem dele. */
  loft(ID.casco, P.casco, t.casco.segmentosPorCanto);
  loft(ID.vaoDaPorta, P.vaoDaPorta, 1);
  for (const janela of P.janelas) extrusaoDaJanela(idDaJanela(ID.vaoNoCasco, janela), janela, janela.vao, t.segmentosPorCantoDaJanela);
  passos.push(['subtrair', {
    origemId: ID.fuselagem,
    solidos: [
      { origem: { op: 'loft', id: ID.casco } },
      { origem: { op: 'loft', id: ID.vaoDaPorta } },
      ...P.janelas.map((janela) => ({ origem: { op: 'extrusao', id: idDaJanela(ID.vaoNoCasco, janela) } })),
    ],
  }]);
  passos.push(['parte', { nome: 'fuselagem', sel: { origem: { op: 'subtrair', id: ID.fuselagem } } }]);
  passos.push(['material', { usa: 'casco', sel: { origem: { op: 'subtrair', id: ID.fuselagem } } }]);
  passos.push(['liso', { angulo: ANGULO_LISO, sel: { origem: { op: 'subtrair', id: ID.fuselagem } } }]);

  /* O para-brisa e o montante dele. */
  loft(ID.parabrisa, P.parabrisa, 1);
  passos.push(['parte', { nome: 'parabrisa', sel: { origem: { op: 'loft', id: ID.parabrisa } } }]);
  passos.push(['material', { usa: 'vidro', sel: { origem: { op: 'loft', id: ID.parabrisa } } }]);
  passos.push(['liso', { angulo: ANGULO_LISO, sel: { origem: { op: 'loft', id: ID.parabrisa } } }]);

  const M = P.montante;
  passos.push(['extrusao', {
    origemId: ID.montante, eixo: 'y', altura: M.comprimento,
    perfil: { retangulo: { largura: M.largura, profundidade: M.profundidade, cantos: M.raio } },
    segmentosArco: t.montante.segmentosPorCanto,
  }]);
  if (M.giroEmZ !== 0) passos.push(['rotaciona', { eixo: 'z', graus: M.giroEmZ, pivo: [0, 0, 0], sel: { origem: { op: 'extrusao', id: ID.montante } } }]);
  passos.push(['rotaciona', { eixo: 'x', graus: M.giroEmX, pivo: [0, 0, 0], sel: { origem: { op: 'extrusao', id: ID.montante } } }]);
  passos.push(['transladar', { d: M.em, sel: { origem: { op: 'extrusao', id: ID.montante } } }]);
  passos.push(['parte', { nome: 'montanteParabrisa', sel: { origem: { op: 'extrusao', id: ID.montante } } }]);
  passos.push(['material', { usa: 'casco', sel: { origem: { op: 'extrusao', id: ID.montante } } }]);
  passos.push(['liso', { angulo: ANGULO_LISO, sel: { origem: { op: 'extrusao', id: ID.montante } } }]);

  /* Cada sólido que assenta na superfície do casco (as placas das janelas e a porta) é aparado pelo casco inteiro, sem os vãos:
     a interseção deixa a face de fora dele rente à superfície, no lugar de passar dela. O gabarito é um loft do casco refeito a
     cada uso, porque a interseção o consome, e vem logo antes dela para o polo dele não dividir lugar com o de outro loft. */
  const apara = (origem, origemId, gabaritoId) => {
    loft(gabaritoId, P.casco, t.casco.segmentosPorCanto);
    passos.push(['intersectar', { origemId, solidos: [{ origem }, { origem: { op: 'loft', id: gabaritoId } }] }]);
  };

  /* As oito janelas: placas nos vãos, aparadas pela superfície do casco. */
  for (const janela of P.janelas) {
    const id = idDaJanela(ID.placa, janela);
    const aparada = idDaJanela(ID.placaAparada, janela);
    extrusaoDaJanela(id, janela, janela.placa, t.segmentosPorCantoDaJanela);
    apara({ op: 'extrusao', id }, aparada, idDaJanela(ID.gabarito, janela));
    passos.push(['parte', { nome: janela.nome, sel: { origem: { op: 'intersectar', id: aparada } } }]);
    passos.push(['material', { usa: 'vidro', sel: { origem: { op: 'intersectar', id: aparada } } }]);
    passos.push(['liso', { angulo: ANGULO_LISO, sel: { origem: { op: 'intersectar', id: aparada } } }]);
  }

  /* A porta, aparada pela superfície do casco e recortada pelo vão da janela 4 do lado esquerdo. */
  loft(ID.porta, P.porta, 1);
  apara({ op: 'loft', id: ID.porta }, ID.portaAparada, ID.gabaritoDaPorta);
  const janelaDaPorta = P.janelas.find((j) => j.numero === JANELA_DA_PORTA.numero && j.lado === JANELA_DA_PORTA.lado);
  extrusaoDaJanela(idDaJanela(ID.vaoNaPorta, janelaDaPorta), janelaDaPorta, janelaDaPorta.vaoNaPorta, t.segmentosPorCantoDaJanela);
  passos.push(['subtrair', {
    origemId: ID.portaVazada,
    solidos: [
      { origem: { op: 'intersectar', id: ID.portaAparada } },
      { origem: { op: 'extrusao', id: idDaJanela(ID.vaoNaPorta, janelaDaPorta) } },
    ],
  }]);
  passos.push(['parte', { nome: 'porta', sel: { origem: { op: 'subtrair', id: ID.portaVazada } } }]);
  passos.push(['material', { usa: 'porta', sel: { origem: { op: 'subtrair', id: ID.portaVazada } } }]);
  passos.push(['liso', { angulo: ANGULO_LISO, sel: { origem: { op: 'subtrair', id: ID.portaVazada } } }]);

  /* A barbatana. */
  loft(ID.barbatana, P.barbatana, t.barbatana.segmentosPorCanto);
  passos.push(['parte', { nome: 'barbatana', sel: { origem: { op: 'loft', id: ID.barbatana } } }]);
  passos.push(['material', { usa: 'casco', sel: { origem: { op: 'loft', id: ID.barbatana } } }]);
  passos.push(['liso', { angulo: ANGULO_LISO, sel: { origem: { op: 'loft', id: ID.barbatana } } }]);

  return passos;
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha: os extremos do casco, do para-brisa, da porta e da
   barbatana, o centro de cada placa de janela e o do montante. */
export function pontosDeclarados(t = TABELA) {
  const extremos = (listas) => ({
    min: [0, 1, 2].map((k) => Math.min(...listas.map((l) => l[k]))),
    max: [0, 1, 2].map((k) => Math.max(...listas.map((l) => l[k]))),
  });
  const casco = t.casco.estacoes;
  const caixaDoCasco = {
    min: [-Math.max(...casco.map((e) => e[1] / 2)), Math.min(...casco.map((e) => e[4] - e[2] / 2)), casco[0][0]],
    max: [Math.max(...casco.map((e) => e[1] / 2)), Math.max(...casco.map((e) => e[4] + e[2] / 2)), casco[casco.length - 1][0]],
  };
  const pb = t.parabrisa;
  const cantosDoParabrisa = pb.estacoes.flatMap(([x, y, meio, ...ys]) => [
    [x, y + pb.deslocamentoY + Math.min(...ys), pb.centroZ - meio], [x, y + pb.deslocamentoY + Math.max(...ys), pb.centroZ + meio],
  ]);
  const caixaDoParabrisa = extremos(cantosDoParabrisa);
  const pontosDaPorta = t.porta.estacoes.flatMap(([y, ...xz]) => Array.from({ length: 5 }, (_, k) => [xz[2 * k], y, xz[2 * k + 1]]));
  const caixaDaPorta = extremos(pontosDaPorta);
  const bb = t.barbatana.estacoes;
  const caixaDaBarbatana = {
    min: [-Math.max(...bb.map((e) => e[1] / 2)), Math.min(...bb.map((e) => e[4] - e[2] / 2)), bb[0][0]],
    max: [Math.max(...bb.map((e) => e[1] / 2)), Math.max(...bb.map((e) => e[4] + e[2] / 2)), bb[bb.length - 1][0]],
  };
  const tolerancia = 1;
  const pontos = [
    { nome: 'ponta da frente do casco', parte: 'fuselagem', medida: 'minimo', em: caixaDoCasco.min, toleranciaMm: tolerancia },
    { nome: 'ponta de trás do casco', parte: 'fuselagem', medida: 'maximo', em: caixaDoCasco.max, toleranciaMm: tolerancia },
    { nome: 'extremo baixo e frontal do para-brisa', parte: 'parabrisa', medida: 'minimo', em: caixaDoParabrisa.min, toleranciaMm: tolerancia },
    { nome: 'extremo alto e traseiro do para-brisa', parte: 'parabrisa', medida: 'maximo', em: caixaDoParabrisa.max, toleranciaMm: tolerancia },
    /* O máximo, e não o centro: o casco apara a face de fora da porta no ombro, e o centro em x anda uns milímetros. */
    { nome: 'canto de cima, de trás e de dentro do painel da porta', parte: 'porta', medida: 'maximo', em: caixaDaPorta.max, toleranciaMm: tolerancia },
    { nome: 'ponta da frente da barbatana', parte: 'barbatana', medida: 'minimo', em: caixaDaBarbatana.min, toleranciaMm: tolerancia },
    { nome: 'ponta de trás da barbatana', parte: 'barbatana', medida: 'maximo', em: caixaDaBarbatana.max, toleranciaMm: tolerancia },
    {
      nome: 'meio do montante do para-brisa',
      parte: 'montanteParabrisa',
      medida: 'centro',
      em: t.montante.de.map((v, k) => (v + t.montante.para[k]) / 2),
      toleranciaMm: tolerancia,
    },
  ];
  for (const [chave, [x, y, z]] of Object.entries(t.janelas)) {
    for (const lado of [1, -1]) {
      pontos.push({
        nome: `centro da janela ${chave.slice(1)} do lado ${lado > 0 ? 'direito' : 'esquerdo'}`,
        parte: `janela${chave.slice(1)}${lado > 0 ? 'D' : 'E'}`,
        medida: 'centro',
        em: [lado * x, y, z],
        toleranciaMm: tolerancia,
      });
    }
  }
  return pontos;
}

const PARES_COM_A_FUSELAGEM = [
  ['parabrisa', 'o para-brisa assenta sobre a frente da cabine e a faixa dele entra no dorso do casco, que desce em curva para os lados'],
  ['porta', 'o painel da porta assenta no fundo do vão que o casco tem do lado esquerdo, com a face de dentro sobre o fundo'],
  ['barbatana', 'a aleta ventral sai da barriga da cauda e o lado vivo dela entra no casco'],
  ...[1, 2, 3, 4].flatMap((n) => ['D', 'E'].map((lado) => [`janela${n}${lado}`, `a placa da janela ${n} do lado ${lado === 'D' ? 'direito' : 'esquerdo'} assenta no fundo do vão que o casco tem para ela`])),
];

const receita = {
  meta: { nome: 'aviao/fuselagem', desc: 'casco do avião de pequeno porte com para-brisa, janelas, porta traseira e barbatana ventral' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'a proa do avião em z 0; a fuselagem começa em z 2377 e termina em z 10461; y para cima com o chão em y 0; x para a direita do piloto' },
  PLANO: {
    objeto: 'fuselagem de um avião monomotor de asa baixa e pequeno porte, do ponto em que o capô a encontra até a ponta da cauda',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.prancha.png',
    ],
    escala: { medida: 'comprimento da fuselagem no esboço, de z 2377 a z 10461', milimetros: 8084 },
    partes: [
      {
        nome: 'fuselagem',
        forma: 'casco de 8084 mm de seções de retângulo arredondado, largo e alto na cabine, afinando em curva até a cauda, com o vão da porta e os das oito janelas recortados nele',
        tecnica: 'loft das 20 seções do esboço, com as pontas fechadas, sombreado liso, e recorte dos vãos da porta e das oito janelas por subtrair',
      },
      {
        nome: 'parabrisa',
        forma: 'faixa de 50 mm de espessura, inclinada e larga, sobre o dorso da frente da cabine, curva em x e dividida ao meio pelo montante',
        tecnica: 'loft em x de seções de quatro pontos, com as pontas fechadas e sombreado liso',
      },
      {
        nome: 'montanteParabrisa',
        forma: 'barra de 70 por 36 mm e cantos arredondados que sobe inclinada pelo meio do para-brisa, de z 2900 a z 3640',
        tecnica: 'extrusão de retângulo de cantos arredondados, girada em x para a inclinação do esboço',
      },
      ...[1, 2, 3, 4].flatMap((n) => ['D', 'E'].map((lado) => ({
        nome: `janela${n}${lado}`,
        forma: `placa escura de canto arredondado, no vão da janela ${n} do lado ${lado === 'D' ? 'direito' : 'esquerdo'} da cabine${n === 4 ? ', girada 7 graus para seguir o afinamento do casco' : ''}`,
        tecnica: 'extrusão em x de retângulo de cantos arredondados, assentada na face de dentro do vão',
      }))),
      {
        nome: 'porta',
        forma: 'painel da porta traseira do lado esquerdo, de 19 mm de espessura e cantos de baixo e de cima arredondados em seções, com o vão da janela 4 aberto de lado a lado',
        tecnica: 'loft em y de seções de cinco pontos, com as pontas fechadas, recortado por subtrair e com sombreado liso',
      },
      {
        nome: 'barbatana',
        forma: 'aleta ventral de seção afilada e cantos de baixo arredondados, sob a cauda, de z 7439 a z 8811, subindo até a barriga',
        tecnica: 'loft em z de seções de retângulo com os dois cantos de baixo arredondados, com as pontas fechadas e sombreado liso',
      },
    ],
    criteriosDeReprovacao: [
      'casco facetado, ou com degrau visível entre seções, em vez de curvo e liso',
      'perfil de lado ou de cima fora do esboço: o topo da cabine, a curva do para-brisa e o afinamento até a cauda',
      'porta ou janela sem vão no casco, ou uma placa solta por cima dele',
      'parte solta, que não encosta na fuselagem',
      'o REFINA acusando parte fora do envelope do volume dela',
      'fuselagem com mais de 3% de diferença para os 8084 mm de comprimento',
    ],
  },
  contatos: [
    ...PARES_COM_A_FUSELAGEM.map(([parte, motivo]) => ({ par: [parte, 'fuselagem'], motivo })),
    { par: ['montanteParabrisa', 'parabrisa'], motivo: 'o montante corre pela face de cima da faixa do para-brisa e o eixo dele fica sobre ela' },
  ],
  formas: {
    fuselagem: 'solido',
    parabrisa: 'solido',
    montanteParabrisa: 'solido',
    porta: { furos: 1 },
    barbatana: 'solido',
    ...Object.fromEntries([1, 2, 3, 4].flatMap((n) => ['D', 'E'].map((lado) => [`janela${n}${lado}`, 'solido']))),
  },
  REFINA: {
    andaime: '../../andaime.json',
    partes: {
      fuselagem: 'fuselagem',
      parabrisa: 'parabrisa',
      montanteParabrisa: 'fuselagem',
      porta: 'porta',
      barbatana: 'barbatana',
      ...Object.fromEntries([1, 2, 3, 4].flatMap((n) => ['d', 'e'].map((lado) => [`janela${n}${lado.toUpperCase()}`, `janela${n}-${lado}`]))),
    },
    tolerancia: { envelope: 5, porta: 0.5 },
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
