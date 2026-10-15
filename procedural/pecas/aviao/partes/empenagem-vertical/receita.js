/* aviao/empenagem-vertical — a deriva do avião de pequeno porte, com a dorsal, o leme, o eixo dele e as dobradiças, na pose de pouso,
 * com o leme neutro.
 *
 * Sexta etapa do avião (`../../montagem.json`): o plano está em `../../ALINHAMENTO.md` e as formas vêm da unidade `empenagem-vertical`
 * do esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre e
 * `aviao-detalhe-empenagem-vertical.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. A
 * TABELA está em milímetro, no quadro do esboço, e a conversão para metro acontece só em `derivar`. A fuselagem não publica porta, e
 * por isso a raiz da deriva (`y0` e o z do eixo a 25% da corda, `vY0` e `vZq0` do esboço) e a linha da dobradiça estão na TABELA como
 * os parâmetros do esboço, e nenhum vínculo de medida nem encaixe de porta da montagem v5 os fornece. Os nomes das partes não levam
 * ponto: `deriva` é a forma `deriva.fin` e `dorsal` é a `deriva.dorsal`.
 *
 * A deriva é a superfície da família `superficie-aerodinamica`, perfil `deriva`, expandida dentro dos PASSOS
 * (`docs/mecanifica/usar/AUTORIA-DE-PECA.md`) com os parâmetros do módulo `derivaVertical` do esboço, e cortada na raiz e no vão do
 * leme (`deriva.corteRaiz` e `vaoDoLeme`). A corda da raiz é 0,995 da altura, acima do teto de 0,8 da família para a semi-superfície,
 * e por isso o esboço chama a família com `simetria` 1, de envergadura o dobro da altura (a razão cai a 0,50), e corta a metade de
 * baixo com a caixa `corteRaiz`; a receita faz o mesmo. A família gera a superfície na pose dela, com a raiz na origem e a envergadura
 * em y, e o esboço a põe com a raiz em (0, `y0`, z do eixo); a receita faz o mesmo com `transladar`. Da expansão ficam o `loft` e o
 * espelho em y, com a identidade que esta receita lhes dá, porque a semi-superfície sai aberta na raiz e só fecha com a metade
 * espelhada, e a booleana só aceita sólido fechado (o alias `derivaInteira`, de `ALIASES`, junta os dois). Saem a parte `fixa`, o
 * material, o sólido e o liso, porque a receita nomeia a deriva depois de recortá-la, e as duas portas, que a família publica no
 * quadro local.
 *
 * A família começa a superfície com uma faixa de 7,86 mm entre a seção da raiz e a seguinte, e a caixa da raiz corta na segunda seção
 * da família: a deriva começa 7,86 mm acima de `y0`.
 *
 * O vão do leme é o próprio leme engrossado pela fresta (`subtrai` com `folga` no esboço): o contorno de cada seção é deslocado para
 * fora pela fresta, com a quina em esquadria, e as duas extremidades avançam a fresta, com o contorno prolongado na reta que une as
 * duas seções de cada ponta. O esboço engrossa cada trecho entre duas seções pelos planos das faces dele, e a receita desloca o contorno
 * das seções. As quatro seções do vão ficam onde esse contorno as põe, sem deslocamento próprio. A fresta fica em 12 mm ao longo do
 * leme. Os pontos declarados medem a caixa da deriva, e o contato entre a deriva e o leme acusa o vão que deixar de valer.
 *
 * O leme e o vão são lofts em y de seções de sete pontos, como no esboço. O loft só fecha uma ponta com um polo de raio zero, e o polo
 * nasce no eixo, a `tampa.avanco` além da seção, e `moveV` o leva ao centro dela, de modo que cada ponta é um leque quase plano. A
 * dorsal é um loft em z, `suave` no esboço: uma curva de tangente contínua (cúbica de Hermite com a tangente de Fritsch e Carlson, a
 * do PCHIP, que não passa do valor de nenhuma seção) passa pelas seções, e a receita a avalia em estações a mais entre elas. A seção
 * da dorsal não é o retângulo do esboço: é o dorso da fuselagem subindo até a deriva, com a crista em meia elipse e um filete côncavo
 * de cada lado até a base, e por isso a dorsal passa do volume do esboço em x e declara o `alongamento` e o `motivo` em `REFINA`. As dobradiças são o mesmo loft, com as quatro seções ligadas em reta, como o esboço as liga: ele não
 * acrescenta estação entre elas. As do lado esquerdo são o espelho em x das do direito. O eixo do leme é uma extrusão de um círculo em
 * y, girada em x para a reta da dobradiça.
 */
import { chamar, criarRegistroDeFamilias } from '../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../nucleo/composicoes.js';
import { nucleo } from '../../../../nucleo/entrada.js';

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const DOBRADICAS = [1, 2, 3].flatMap((n) => [['D', 'd', 'direita'], ['E', 'e', 'esquerda']].map(([L, l, lado]) => ({ n, L, l, lado })));

const VOLUMES = {
  deriva: 'deriva-fin', dorsal: 'deriva-dorsal', leme: 'leme', eixoLeme: 'eixo-leme',
  ...Object.fromEntries(DOBRADICAS.map(({ n, L, l }) => [`dobradicaLeme${n}${L}`, `dobradica-leme${n}-${l}`])),
};
const FORMAS = {
  deriva: 'deriva.fin',
  dorsal: {
    formas: 'deriva.dorsal',
    minimo: 0.6,
    alongamento: { '+x': 87.5, '-x': 87.5 },
    motivo: 'a dorsal lisa pedida na rodada de ajustes: o dorso sobe até a deriva por um filete côncavo de até 300 mm de base, no lugar da aleta de ponta fina de 125 mm do esboço; a razão de volume cai a 0,63 pela largura a mais',
  },
  leme: 'leme', eixoLeme: 'eixoLeme',
  ...Object.fromEntries(DOBRADICAS.map(({ n, L }) => [`dobradicaLeme${n}${L}`, `dobradicaLeme${n}${L}`])),
};
const PARTES = Object.keys(VOLUMES);

export const TABELA = {
  /* A deriva: os parâmetros `v*` do esboço. `y0` é onde a raiz assenta (`vY0`), `altura` a da raiz ao topo (`vH`), e `bordoDeAtaque` e
     `corda` são o z do bordo de ataque e a corda na raiz e no topo (`vZle0`, `vZle1`, `vC0`, `vC1`). O eixo da superfície fica a
     `fracaoDoEixo` da corda da raiz (`vZq0`), e o enflechamento é o ângulo da reta dos 25% da corda da raiz ao topo. `espessura` é a
     relativa da família na raiz e no topo (`vTr0`, `vTr1`). `corteRaiz` é a caixa que tira a metade de baixo da superfície espelhada:
     largura em x, altura em y, profundidade em z e o z do centro. O topo da caixa fica na segunda seção da família (`derivar`). */
  deriva: {
    perfil: 'deriva',
    y0: 2225,
    altura: 1965,
    bordoDeAtaque: [7791, 9690],
    corda: [1956, 710],
    espessura: [0.1, 0.09],
    fracaoDoEixo: 0.25,
    corteRaiz: { largura: 600, altura: 2500, profundidade: 3600, z: 8900 },
  },
  /* O leme e o vão: o y de cada seção (a base do leme, a seção `d` logo acima, a `b` e a `e` do degrau do topo e o topo, `vYl0`, `vYd`,
     `vYb`, `vYe`, `vYc`; o vão usa a raiz da deriva no lugar da base) e a linha da dobradiça, o z do nariz do leme: `inicio` na raiz
     (`vZh0`), `inclinacao` em z por y (`vKh`) até a seção `b`, e `noE` e `noTopo` nas duas seções de cima (`vZhe`, `vZhc`). O leme
     acaba na base no `bordoDeFugaNaBase` (`vZte0`), e o contorno de sete pontos tem o nariz de `nariz` (em fração da espessura: o
     arco de 45 graus) e o bordo de fuga de `meiaEspessuraDoBordoDeFuga` para cada lado. A `fresta` é a folga do vão em volta do leme. */
  leme: {
    y: { base: 2240, d: 2393, b: 3896, e: 3950, topo: 4185 },
    linhaDaDobradica: { inicio: 9040, inclinacao: 0.5855, noE: 9780, noTopo: 9825 },
    bordoDeFugaNaBase: 9360,
    nariz: [0.1465, 0.3535],
    meiaEspessuraDoBordoDeFuga: 4,
    fresta: 12,
  },
  /* O eixo do leme: haste de `diametro`, em `lados` lados, ao longo do centro do nariz, de `sobra` acima da base do leme até `sobra`
     abaixo da seção `b`. */
  eixo: { diametro: 30, sobra: 15, lados: 48 },
  /* A dorsal lisa: o dorso da fuselagem subindo até a deriva. Uma estação por linha, [z, y do dorso da fuselagem naquele z, largura da
     crista, subida da crista acima do dorso, largura da base]; o x do centro é zero. O y do dorso é o topo da fuselagem em x = 0,
     medido na malha dela (a fuselagem não publica porta, e o dorso é plano até uns 150 mm de cada lado do centro). A seção sobe da
     base, que assenta `assenta` abaixo do dorso e desce em parede até `fundo` abaixo dele, por um filete côncavo (um quarto de elipse,
     horizontal no dorso e vertical na crista) até a crista, que é uma meia elipse. `subdivisoes` é quantas estações a curva suave
     passa a ter entre duas seções, e `passosDoArco` quantos trechos tem cada quarto de arco da seção. */
  dorsal: {
    estacoes: [
      [6960, 2323, 20, 2, 60],
      [7300, 2294, 40, 60, 240],
      [7700, 2268, 60, 170, 300],
      [8100, 2248, 80, 317, 260],
      [8300, 2241, 80, 399, 150],
    ],
    assenta: 3,
    fundo: 25,
    fracaoDoFundo: 0.5,
    subdivisoes: 2,
    passosDoArco: 4,
  },
  /* As dobradiças: três pares, cada um a `y` de um y da lista (`vK1y`, `vK2y`, `vK3y`). Cada estação é [z a partir da linha da
     dobradiça naquele y, largura em x, altura em y, raio do canto, fração da espessura do leme naquele y que dá o x do centro]. */
  dobradicas: {
    y: [2450, 3070, 3690],
    estacoes: [
      [-60, 30, 52, 13, 0.46],
      [10, 44, 70, 17, 0.42],
      [90, 32, 62, 15, 0.38],
      [170, 24, 40, 9, 0.28],
    ],
    subdivisoes: 1,
    segmentosPorCanto: 8,
  },
  /* Fechamento das pontas dos lofts: quanto o polo fica além da última seção. */
  tampa: { avanco: 0.5 },
};

const m = (mm) => mm / 1000;
const GRAUS = Math.PI / 180;
const mAll = (v) => v.map(m);

let registro = null;
const registroDeFamilias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* A espessura do perfil simétrico do esboço (NACA de bordo de fuga fechado) a uma fração `s` da corda, em fração da corda. */
const naca = (s) => 0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s ** 2 + 0.2843 * s ** 3 - 0.1036 * s ** 4;

/* A estação do leme ou do vão no y dado, com o nariz em `zh`: a corda e o z do bordo de ataque da deriva ali, a espessura do perfil
   no nariz (`T`), o comprimento até o bordo de fuga (`L`) e o z do centro do contorno (`zc`). São as contas de `vSa`, `vTa`, `vLa` e
   `vZca` do esboço, uma estação por y. */
function estacaoDoLeme(t, y, zh) {
  const d = t.deriva;
  const u = (y - d.y0) / d.altura;
  const corda = d.corda[0] + (d.corda[1] - d.corda[0]) * u;
  const bordoDeAtaque = d.bordoDeAtaque[0] + (d.bordoDeAtaque[1] - d.bordoDeAtaque[0]) * u;
  const espessura = 10 * (d.espessura[0] + (d.espessura[1] - d.espessura[0]) * u) * corda * naca((zh - bordoDeAtaque) / corda);
  const L = bordoDeAtaque + corda - zh;
  return { y, zh, T: espessura, L, zc: zh + 0.5 * L };
}

/* A linha da dobradiça: o z do nariz em y, entre a raiz e a seção `b`. */
const dobradicaEm = (t, y) => t.leme.linhaDaDobradica.inicio + t.leme.linhaDaDobradica.inclinacao * (y - t.deriva.y0);

/* As cinco seções do leme e as quatro do vão, [y, zh]. O leme sai da base com a espessura da raiz e o bordo de fuga em `bordoDeFugaNaBase`
   (o canto de baixo cortado), e o vão começa na raiz da deriva, com a dobradiça no `inicio`. */
function estacoesDoLeme(t) {
  const { y, linhaDaDobradica: h, bordoDeFugaNaBase } = t.leme;
  const raiz = estacaoDoLeme(t, t.deriva.y0, h.inicio);
  const naBase = estacaoDoLeme(t, y.base, dobradicaEm(t, y.base));
  const leme = [
    { ...naBase, T: raiz.T, L: bordoDeFugaNaBase - naBase.zh, zc: naBase.zh + 0.5 * (bordoDeFugaNaBase - naBase.zh) },
    estacaoDoLeme(t, y.d, dobradicaEm(t, y.d)),
    estacaoDoLeme(t, y.b, dobradicaEm(t, y.b)),
    estacaoDoLeme(t, y.e, h.noE),
    estacaoDoLeme(t, y.topo, h.noTopo),
  ];
  const vao = [raiz, leme[2], leme[3], leme[4]];
  return { leme, vao };
}

/* O contorno de sete pontos do leme em uma estação, [x, z] em mm, anti-horário em (x, z): o bordo de fuga, o arco do nariz e de volta. */
function contornoDoLeme(t, e) {
  const [n1, n2] = t.leme.nariz;
  const b = t.leme.meiaEspessuraDoBordoDeFuga;
  const frente = e.zc - 0.5 * e.L;
  return [
    [b, e.zc + 0.5 * e.L],
    [-b, e.zc + 0.5 * e.L],
    [-0.5 * e.T, frente + 0.5 * e.T],
    [-n2 * e.T, frente + n1 * e.T],
    [0, frente],
    [n2 * e.T, frente + n1 * e.T],
    [0.5 * e.T, frente + 0.5 * e.T],
  ];
}

/* O contorno deslocado `d` para fora, com a quina em esquadria: cada vértice anda `d` pela soma das normais das duas arestas, dividida
   por um mais o produto escalar delas. O contorno é anti-horário, e a normal de fora de uma aresta (ex, ey) é (ey, -ex). */
function deslocarContorno(pontos, d) {
  const n = pontos.length;
  const normal = (a, b) => {
    const ex = b[0] - a[0]; const ey = b[1] - a[1]; const l = Math.hypot(ex, ey);
    return [ey / l, -ex / l];
  };
  return pontos.map((p, i) => {
    const antes = normal(pontos[(i + n - 1) % n], p);
    const depois = normal(p, pontos[(i + 1) % n]);
    const k = d / (1 + antes[0] * depois[0] + antes[1] * depois[1]);
    return [p[0] + k * (antes[0] + depois[0]), p[1] + k * (antes[1] + depois[1])];
  });
}

/* O vão do leme, em mm: os quatro contornos deslocados pela fresta e as duas pontas avançadas a fresta, cada uma com o contorno da
   reta que une as duas seções da ponta, estendida. */
function secoesDoVao(t, estacoes) {
  const fresta = t.leme.fresta;
  const dentro = estacoes.map((e) => deslocarContorno(contornoDoLeme(t, e), fresta));
  const prolonga = (a, b, y) => dentro[a].map((p, k) => [
    p[0] + ((dentro[b][k][0] - p[0]) * (y - estacoes[a].y)) / (estacoes[b].y - estacoes[a].y),
    p[1] + ((dentro[b][k][1] - p[1]) * (y - estacoes[a].y)) / (estacoes[b].y - estacoes[a].y),
  ]);
  const n = estacoes.length;
  const de = estacoes[0].y - fresta;
  const ate = estacoes[n - 1].y + fresta;
  return [
    { y: de, pontos: prolonga(0, 1, de) },
    { y: estacoes[1].y, pontos: dentro[1] },
    { y: estacoes[2].y, pontos: dentro[2] },
    { y: ate, pontos: prolonga(n - 2, n - 1, ate) },
  ];
}

/* A cúbica de Hermite por trechos com a tangente do PCHIP (a de Fritsch e Carlson): passa por todos os pontos, tem tangente contínua
   neles e não passa do valor de nenhum entre dois vizinhos. `xs` crescente; devolve a função que avalia `ys` em x. */
function curvaSuave(xs, ys) {
  const n = xs.length;
  const h = xs.slice(1).map((x, k) => x - xs[k]);
  const d = ys.slice(1).map((y, k) => (y - ys[k]) / h[k]);
  const interna = (h0, h1, d0, d1) => {
    if (d0 * d1 <= 0) return 0;
    const a = 2 * h1 + h0;
    const b = h1 + 2 * h0;
    return (a + b) / (a / d0 + b / d1);
  };
  const daPonta = (h0, h1, d0, d1) => {
    const tg = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(tg) !== Math.sign(d0)) return 0;
    if (Math.sign(d0) !== Math.sign(d1) && Math.abs(tg) > 3 * Math.abs(d0)) return 3 * d0;
    return tg;
  };
  const tangente = xs.map((_, k) => {
    if (k === 0) return daPonta(h[0], h[1], d[0], d[1]);
    if (k === n - 1) return daPonta(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
    return interna(h[k - 1], h[k], d[k - 1], d[k]);
  });
  return (x) => {
    let k = 0;
    while (k < n - 2 && x > xs[k + 1]) k++;
    const s = (x - xs[k]) / h[k];
    const [h00, h10, h01, h11] = [2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2];
    return h00 * ys[k] + h10 * h[k] * tangente[k] + h01 * ys[k + 1] + h11 * h[k] * tangente[k + 1];
  };
}

/* As estações de um loft suave: as das seções, com `subdivisoes` estações a mais entre cada par, avaliadas pela curva suave de cada
   grandeza. `seccoes` são `{ p, ...grandezas }`, e a saída tem as mesmas grandezas. O raio não passa de 0,98 do meio vão menor. */
function estacoesSuaves(secoes, subdivisoes) {
  const chaves = Object.keys(secoes[0]).filter((c) => c !== 'p');
  const curvas = Object.fromEntries(chaves.map((c) => [c, curvaSuave(secoes.map((s) => s.p), secoes.map((s) => s[c]))]));
  const ps = secoes.flatMap((s, k) => (k === 0 ? [s.p] : Array.from({ length: subdivisoes }, (_, j) => secoes[k - 1].p + ((s.p - secoes[k - 1].p) * (j + 1)) / subdivisoes)));
  return ps.map((p) => {
    const e = { p, ...Object.fromEntries(chaves.map((c) => [c, curvas[c](p)])) };
    if (e.raio !== undefined) e.raio = Math.min(e.raio, 0.98 * 0.5 * Math.min(e.largura, e.altura));
    return e;
  });
}

/* As estações da dorsal em mm: [z, y do dorso, largura da crista, subida, largura da base] como objetos, com a curva suave entre as
   seções. */
function estacoesDaDorsal(t) {
  const secoes = t.dorsal.estacoes.map(([p, y, crista, subida, base]) => ({ p, y, crista, subida, base }));
  return estacoesSuaves(secoes, t.dorsal.subdivisoes);
}

/* O contorno da dorsal em uma estação, [x, y] em mm, anti-horário: a meia elipse da crista (semieixos metade da crista e `b`, o menor
   entre ela e 0,45 da subida), o filete côncavo de cada lado, de um quarto de elipse (semieixos: metade da diferença das larguras e
   a altura que sobra) até a base, que assenta `assenta` abaixo do dorso, e o pé enterrado, de `fracaoDoFundo` da largura da base, até
   `fundo`. O filete sai vertical da crista e chega horizontal na base. */
function contornoDaDorsal(t, e) {
  const { assenta, fundo, passosDoArco: n, fracaoDoFundo } = t.dorsal;
  const hc = e.crista / 2;
  const hb = e.base / 2;
  const hf = hb * fracaoDoFundo;
  const topo = e.y + e.subida;
  const b = Math.min(hc, 0.45 * e.subida);
  const equador = topo - b;
  const chao = e.y - assenta;
  const altura = equador - chao;
  const passo = Math.PI / 2 / n;
  const crista = Array.from({ length: 2 * n + 1 }, (_, k) => [hc * Math.cos(k * passo), equador + b * Math.sin(k * passo)]);
  const filete = Array.from({ length: n - 1 }, (_, k) => {
    const fi = (k + 1) * passo;
    return [hc + (hb - hc) * (1 - Math.cos(fi)), chao + altura * (1 - Math.sin(fi))];
  });
  const base = [hb, chao];
  const pe = [[hf, chao], [hf, e.y - fundo]];
  const espelha = ([x, y]) => [-x, y];
  return [
    ...crista,
    ...filete.map(espelha), espelha(base),
    ...pe.map(espelha), ...[...pe].reverse(),
    base, ...[...filete].reverse(),
  ];
}

/* A linha da dobradiça e a espessura do leme em y, para o x do centro de cada dobradiça: o nariz do leme na seção `b` e na raiz dão a
   espessura em y por interpolação, como `vT1`, `vT2` e `vT3` do esboço. */
function medidasDaDobradica(t, y) {
  const { leme: seco } = estacoesDoLeme(t);
  const raiz = estacaoDoLeme(t, t.deriva.y0, t.leme.linhaDaDobradica.inicio);
  const b = seco[2];
  const espessura = raiz.T + ((b.T - raiz.T) * (y - t.deriva.y0)) / (t.leme.y.b - t.deriva.y0);
  return { zh: dobradicaEm(t, y), espessura };
}

/* As estações de cada dobradiça em mm, com a curva suave: [z, x do centro, largura, altura, raio] como objetos. */
function estacoesDaDobradica(t, y) {
  const { zh, espessura } = medidasDaDobradica(t, y);
  const secoes = t.dobradicas.estacoes.map(([dz, largura, altura, raio, fracao]) => ({ p: zh + dz, x: fracao * espessura, largura, altura, raio }));
  return estacoesSuaves(secoes, t.dobradicas.subdivisoes).map((e) => ({ ...e, y }));
}

/* Para cada eixo de loft: o índice do eixo, os eixos do plano da seção no quadro do mundo, o sinal que leva o segundo eixo do plano
   ao +w do núcleo, e a `orientacao` que fixa o +u no primeiro eixo do plano. Com `orientacao` declarada, o núcleo projeta a
   referência na tangente de cada seção, então u e w saem iguais em todas e w = u x tangente. */
const LOFT = {
  y: { eixo: 1, plano: [0, 2], sinalW: 1, orientacao: [1, 0, 0] },
  z: { eixo: 2, plano: [0, 1], sinalW: -1, orientacao: [1, 0, 0] },
};

/* A área com sinal pelo cadarço, sobre os dois primeiros números de cada ponto; o núcleo só aceita contorno anti-horário. */
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

/* Um loft por estações, em metro. `linha` é o ponto do mundo por onde o caminho passa (a coordenada do eixo é ignorada) e `estacoes`
   são `{ p, pontos }`: a posição no eixo e os pontos [a, b, raio?] do plano da seção no quadro do mundo, de modo que o centro de cada
   seção entra no contorno, como no esboço, e as seções ficam no plano de coordenada constante. Devolve as seções, com um polo de raio
   zero antes da primeira e depois da última, os `lados`, a `orientacao` e, para cada polo, a região que o seleciona e o deslocamento
   que o leva ao centro da seção de que ele fecha a ponta. */
function loftPorEstacoes({ eixo, linha, estacoes, avanco, segmentos = 1 }) {
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
    segmentos,
    orientacao,
    polos,
  };
}

/* O retângulo de cantos arredondados de quatro pontos com o raio no terceiro número, centrado em (cx, cy). */
const retanguloArredondado = (cx, cy, largura, altura, raio) => [
  [cx + largura / 2, cy + altura / 2, raio], [cx - largura / 2, cy + altura / 2, raio],
  [cx - largura / 2, cy - altura / 2, raio], [cx + largura / 2, cy - altura / 2, raio],
];

/* A conta do eixo: o comprimento e o giro em x, em graus, que levam +y à direção da reta `de` a `para`; a reta está no plano de x
   constante. */
function giroDoEixo({ de, para }) {
  const d = para.map((v, k) => v - de[k]);
  return { comprimento: Math.hypot(...d), emX: Math.atan2(d[2], d[1]) / GRAUS };
}

/* As duas pontas do eixo do leme, em mm: do centro do nariz na base do leme, `sobra` acima dela, ao da seção `b`, `sobra` abaixo. O
   nariz do leme fica a meia espessura da dobradiça, e a reta do centro dele é a que une as duas seções. */
function eixoEmMm(t) {
  const y0 = t.deriva.y0;
  const raiz = estacaoDoLeme(t, y0, t.leme.linhaDaDobradica.inicio);
  const b = estacoesDoLeme(t).leme[2];
  const inclinacao = (b.zh + 0.5 * b.T - (raiz.zh + 0.5 * raiz.T)) / (t.leme.y.b - y0);
  const sobra = t.eixo.sobra;
  const yDe = t.leme.y.base + sobra;
  const yAte = t.leme.y.b - sobra;
  return {
    de: [0, yDe, raiz.zh + 0.5 * raiz.T + inclinacao * (yDe - y0)],
    para: [0, yAte, b.zh + 0.5 * b.T - inclinacao * sobra],
  };
}

export function derivar(t = TABELA) {
  const d = t.deriva;
  const avanco = m(t.tampa.avanco);
  const zEixo = d.bordoDeAtaque[0] + d.fracaoDoEixo * d.corda[0];

  /* A chamada da família, com os parâmetros do módulo do esboço: a envergadura é o dobro da altura, e a corda e o enflechamento
     seguem dela. O enflechamento é o ângulo, em graus, da reta dos 25% da corda da raiz ao topo. */
  const flecha = Math.atan((d.bordoDeAtaque[1] + d.fracaoDoEixo * d.corda[1] - d.bordoDeAtaque[0] - d.fracaoDoEixo * d.corda[0]) / d.altura) / GRAUS;
  const chamada = chamar(registroDeFamilias().obter('superficie-aerodinamica'), 'fin', {
    perfil: d.perfil,
    envergadura: 2 * d.altura,
    simetria: 1,
    orientacao: 1,
    cordaNaRaiz: d.corda[0] / (2 * d.altura),
    cordaNaPonta: d.corda[1] / (2 * d.altura),
    enflechamento: flecha,
    diedro: 0,
    torcao: 0,
    incidenciaNaRaiz: 0,
    curvatura: 0,
    espessuraNaRaiz: d.espessura[0],
    espessuraNaPonta: d.espessura[1],
    pontaLevantada: 0,
    comando: 0,
    comandoDiferencial: 0,
  });
  /* A caixa da raiz corta na segunda seção da família, e a deriva começa uma faixa (7,86 mm) acima de `y0`. */
  const { passos: expandidos } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [chamada]);
  const [, loftDaFamilia] = expandidos.find(([operacao]) => operacao === 'loft');
  const degrauDaRaiz = loftDaFamilia.secoes[1].pos[1];
  const corte = d.corteRaiz;
  const deriva = {
    loft: loftDaFamilia,
    desloca: [0, m(d.y0), m(zEixo)],
    planoDaRaiz: m(d.y0),
    degrauDaRaiz,
    corteRaiz: {
      largura: m(corte.largura), altura: m(corte.altura), profundidade: m(corte.profundidade),
      em: [0, m(d.y0) + degrauDaRaiz - m(corte.altura), m(corte.z)],
    },
    flecha,
  };

  /* O leme e o vão: lofts em y de contornos [x, z]. */
  const { leme: estacoesDoLemeMm, vao: estacoesDoVaoMm } = estacoesDoLeme(t);
  const emMetro = (pontos) => pontos.map(([x, z]) => [m(x), m(z)]);
  const leme = loftPorEstacoes({
    eixo: 'y', linha: [0, 0, 0], avanco,
    estacoes: estacoesDoLemeMm.map((e) => ({ p: m(e.y), pontos: emMetro(contornoDoLeme(t, e)) })),
  });
  const vao = loftPorEstacoes({
    eixo: 'y', linha: [0, 0, 0], avanco,
    estacoes: secoesDoVao(t, estacoesDoVaoMm).map(({ y, pontos }) => ({ p: m(y), pontos: emMetro(pontos) })),
  });

  const eixoMm = eixoEmMm(t);
  const giro = giroDoEixo(eixoMm);
  const eixo = { de: mAll(eixoMm.de), comprimento: m(giro.comprimento), raio: m(t.eixo.diametro / 2), segmentos: t.eixo.lados / 4, giroEmX: giro.emX };

  /* A dorsal: loft em z do contorno liso de cada estação, com o centro em x = 0. */
  const dorsalMm = estacoesDaDorsal(t);
  const dorsal = loftPorEstacoes({
    eixo: 'z', linha: [0, m(dorsalMm[0].y), 0], avanco,
    estacoes: dorsalMm.map((e) => ({ p: m(e.p), pontos: emMetro(contornoDaDorsal(t, e)) })),
  });

  /* As três dobradiças do lado direito. */
  const dobradicas = t.dobradicas.y.map((y) => {
    const estacoes = estacoesDaDobradica(t, y);
    return loftPorEstacoes({
      eixo: 'z', linha: [m(estacoes[0].x), m(y), 0], avanco, segmentos: t.dobradicas.segmentosPorCanto,
      estacoes: estacoes.map((e) => ({ p: m(e.p), pontos: retanguloArredondado(m(e.x), m(y), m(e.largura), m(e.altura), m(e.raio)) })),
    });
  });

  return { deriva, leme, vao, eixo, dorsal, dobradicas };
}

/* Identidade estrutural dos passos, escolhida aqui: um bloco de cem por forma. A cópia espelhada leva a identidade da fonte mais
   `ESPELHO`. */
const ID = {
  fin: 100, finEspelhada: 101, corteRaiz: 110, vaoDoLeme: 120, derivaRecortada: 130, derivaCortada: 131,
  dorsal: 200, leme: 210, eixoLeme: 220, dobradica1: 300, dobradica2: 310, dobradica3: 320,
};
const ESPELHO = 500;
const FIN = { op: 'loft', id: ID.fin };
const FIN_ESPELHADA = { op: 'espelha', id: ID.finEspelhada, de: FIN };

/* A deriva inteira para a booleana: a semi-superfície da família e a cópia espelhada dela em y, que fecham juntas. */
export const ALIASES = [['derivaInteira', { unir: [{ origem: FIN }, { origem: FIN_ESPELHADA }] }]];

export const MATERIAIS = {
  deriva: { cor: '#9fb0c0', metalicidade: 0.3, aspereza: 0.45 },
  eixo: { cor: '#2b3138', metalicidade: 0.4, aspereza: 0.4 },
  dobradica: { cor: '#5f6b78', metalicidade: 0.3, aspereza: 0.5 },
};

/* O ângulo, em graus, a partir do qual a quina fica nítida no sombreado liso: o da família, de 60 graus, que deixa lisos o nariz do
   leme e os cantos da dorsal e das dobradiças (menos de 15 graus por segmento) e nítidos o bordo de fuga, as tampas e as paredes do
   vão. */
const ANGULO_LISO = 60;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  const doPasso = (op, id) => ({ origem: { op, id } });

  const loft = (origemId, L) => {
    passos.push(['loft', { origemId, secoes: L.secoes, lados: L.lados, segmentosCurva: L.segmentos, orientacao: L.orientacao }]);
    for (const polo of L.polos) {
      /* Um deslocamento abaixo de um nanômetro é ruído da média dos pontos, e não leva o polo a lugar nenhum. */
      if (polo.d.some((v) => Math.abs(v) > 1e-9)) passos.push(['moveV', { sel: { regiao: polo.regiao }, d: polo.d }]);
    }
  };

  /* A semi-superfície da família, na pose do esboço, e a cópia espelhada no plano da raiz: só o `loft` da expansão, com a
     identidade desta receita. */
  passos.push(['loft', { ...P.deriva.loft, origemId: ID.fin }]);
  passos.push(['transladar', { d: P.deriva.desloca, sel: doPasso('loft', ID.fin) }]);
  passos.push(['espelha', { eixo: 'y', pos: P.deriva.planoDaRaiz, origemId: ID.finEspelhada, derivaDe: FIN, sel: { origem: FIN } }]);

  /* O corte da raiz e o vão do leme, e a deriva menos os dois. */
  const c = P.deriva.corteRaiz;
  passos.push(['extrusao', { origemId: ID.corteRaiz, eixo: 'y', altura: c.altura, perfil: { retangulo: { largura: c.largura, profundidade: c.profundidade } }, em: c.em }]);
  loft(ID.vaoDoLeme, P.vao);
  passos.push(['subtrair', { origemId: ID.derivaCortada, solidos: [{ alias: 'derivaInteira' }, doPasso('extrusao', ID.corteRaiz)] }]);
  passos.push(['subtrair', { origemId: ID.derivaRecortada, solidos: [doPasso('subtrair', ID.derivaCortada), doPasso('loft', ID.vaoDoLeme)] }]);

  /* O leme, a dorsal, o eixo e as dobradiças do lado direito. */
  loft(ID.leme, P.leme);
  loft(ID.dorsal, P.dorsal);
  const e = P.eixo;
  passos.push(['extrusao', { origemId: ID.eixoLeme, eixo: 'y', altura: e.comprimento, perfil: { circulo: { raio: e.raio } }, segmentosArco: e.segmentos, em: e.de }]);
  passos.push(['rotaciona', { eixo: 'x', graus: e.giroEmX, pivo: e.de, sel: doPasso('extrusao', ID.eixoLeme) }]);
  const idDaDobradica = [ID.dobradica1, ID.dobradica2, ID.dobradica3];
  P.dobradicas.forEach((L, k) => loft(idDaDobradica[k], L));

  /* Cada parte: os quatro passos que a nomeiam, com o material, o sólido e o liso. A cópia espelhada em x das dobradiças leva a
     identidade da fonte mais `ESPELHO`. */
  const nomear = (nome, sel, material) => {
    passos.push(['parte', { nome, sel }]);
    passos.push(['material', { usa: material, sel }]);
    passos.push(['solido', { sel }]);
    passos.push(['liso', { angulo: ANGULO_LISO, sel }]);
  };
  nomear('deriva', doPasso('subtrair', ID.derivaRecortada), 'deriva');
  nomear('dorsal', doPasso('loft', ID.dorsal), 'deriva');
  nomear('leme', doPasso('loft', ID.leme), 'deriva');
  nomear('eixoLeme', doPasso('extrusao', ID.eixoLeme), 'eixo');
  idDaDobradica.forEach((id, k) => {
    const origem = { op: 'loft', id };
    const copia = { op: 'espelha', id: id + ESPELHO, de: origem };
    passos.push(['espelha', { eixo: 'x', pos: 0, origemId: copia.id, derivaDe: origem, sel: { origem } }]);
    nomear(`dobradicaLeme${k + 1}D`, { origem }, 'dobradica');
    nomear(`dobradicaLeme${k + 1}E`, { origem: copia }, 'dobradica');
  });

  return passos;
}

/* O ponto dentro do polígono, pelo cruzamento de um raio, e o encontro de dois segmentos: as duas contas da maior cota z da deriva. */
function pontoNoPoligono([x, z], poligono) {
  let dentro = false;
  poligono.forEach(([x1, z1], i) => {
    const [x2, z2] = poligono[(i + 1) % poligono.length];
    if ((z1 > z) !== (z2 > z) && x < x1 + ((z - z1) * (x2 - x1)) / (z2 - z1)) dentro = !dentro;
  });
  return dentro;
}

function encontroDeSegmentos([ax, az], [bx, bz], [cx, cz], [dx, dz]) {
  const r = [bx - ax, bz - az];
  const q = [dx - cx, dz - cz];
  const det = r[0] * q[1] - r[1] * q[0];
  if (Math.abs(det) < 1e-12) return null;
  const u = ((cx - ax) * q[1] - (cz - az) * q[0]) / det;
  const v = ((cx - ax) * r[1] - (cz - az) * r[0]) / det;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [ax + u * r[0], az + u * r[1]] : null;
}

/* A caixa da deriva, em mm, calculada sem passar pelos passos. A do corte da raiz, de x, y e z mínimos e de x máximo, é a da malha da
   família executada sozinha, deslocada pela raiz e aparada na segunda seção. O y máximo é o da seção da ponta. O z máximo é o do ponto
   mais alto que o vão deixa: na seção `b` do vão (onde a linha da dobradiça dá o degrau) o contorno do vão sai da pele da deriva, e o
   ponto mais alto da deriva é onde o contorno entra na pele, a de cada seção da família interpolada em y como a faixa entre duas
   seções, em reta. */
function caixaDaDeriva(t) {
  const P = derivar(t).deriva;
  const { V } = nucleo([['loft', { ...P.loft, origemId: ID.fin }]], {}, {}, {}, null, []);
  const corte = P.degrauDaRaiz;
  const pontos = [...V.values()].filter((v) => v[1] >= corte - 1e-9).map((v) => v.map((c, k) => (c + P.desloca[k]) * 1000));
  const caixa = {
    min: [0, 1, 2].map((k) => Math.min(...pontos.map((p) => p[k]))),
    max: [0, 1, 2].map((k) => Math.max(...pontos.map((p) => p[k]))),
  };

  const { vao } = estacoesDoLeme(t);
  const b = secoesDoVao(t, vao)[1];
  const yDoCorte = b.y;
  const aneis = P.loft.secoes.filter((secao) => secao.contorno);
  const k = aneis.findIndex((secao, i) => (secao.pos[1] + P.desloca[1]) * 1000 <= yDoCorte && (aneis[i + 1].pos[1] + P.desloca[1]) * 1000 >= yDoCorte);
  if (k < 0) throw new Error(`deriva: a seção b do vão, em y ${yDoCorte} mm, fica fora das seções da família com contorno`);
  const [y1, y2] = [k, k + 1].map((i) => (aneis[i].pos[1] + P.desloca[1]) * 1000);
  const f = (yDoCorte - y1) / (y2 - y1);
  const pele = aneis[k].contorno.map(([u, w], i) => [
    (w + f * (aneis[k + 1].contorno[i][1] - w)) * 1000,
    (u + f * (aneis[k + 1].contorno[i][0] - u) + P.desloca[2]) * 1000,
  ]);
  const candidatos = pele.filter((p) => !pontoNoPoligono(p, b.pontos));
  pele.forEach((p, i) => b.pontos.forEach((q, j) => {
    const encontro = encontroDeSegmentos(p, pele[(i + 1) % pele.length], q, b.pontos[(j + 1) % b.pontos.length]);
    if (encontro) candidatos.push(encontro);
  }));
  caixa.max[2] = Math.max(...candidatos.map((p) => p[1]));
  return caixa;
}

const caixaDosPontos = (pontos) => ({
  min: [0, 1, 2].map((k) => Math.min(...pontos.map((p) => p[k]))),
  max: [0, 1, 2].map((k) => Math.max(...pontos.map((p) => p[k]))),
});

/* A caixa de cada parte do lado direito, em mm, calculada da TABELA sem passar pelos passos: a da deriva é a de `caixaDaDeriva`; a
   da dorsal e a das dobradiças, a dos retângulos de cada estação e do avanço dos polos; a do leme, a dos contornos e do avanço dos
   polos; a do eixo, a das duas tampas (um disco de raio `r` perpendicular à reta tem, em cada eixo, a extensão `r * sqrt(1 - d²)`). */
function caixasDasPartes(t) {
  const avanco = t.tampa.avanco;
  const caixas = { deriva: caixaDaDeriva(t) };

  const dorsal = estacoesDaDorsal(t);
  caixas.dorsal = {
    min: [-Math.max(...dorsal.map((e) => e.base / 2)), Math.min(...dorsal.map((e) => e.y - t.dorsal.fundo)), dorsal[0].p - avanco],
    max: [Math.max(...dorsal.map((e) => e.base / 2)), Math.max(...dorsal.map((e) => e.y + e.subida)), dorsal[dorsal.length - 1].p + avanco],
  };

  const { leme } = estacoesDoLeme(t);
  const doLeme = caixaDosPontos(leme.flatMap((e) => contornoDoLeme(t, e).map(([x, z]) => [x, e.y, z])));
  doLeme.min[1] -= avanco;
  doLeme.max[1] += avanco;
  caixas.leme = doLeme;

  const { de, para } = eixoEmMm(t);
  const comprimento = Math.hypot(...para.map((v, k) => v - de[k]));
  const raio = t.eixo.diametro / 2;
  const folga = para.map((v, k) => raio * Math.sqrt(1 - ((v - de[k]) / comprimento) ** 2));
  const extremos = caixaDosPontos([de, para]);
  caixas.eixoLeme = { min: extremos.min.map((v, k) => v - folga[k]), max: extremos.max.map((v, k) => v + folga[k]) };

  t.dobradicas.y.forEach((y, n) => {
    const estacoes = estacoesDaDobradica(t, y);
    caixas[`dobradicaLeme${n + 1}`] = {
      min: [Math.min(...estacoes.map((e) => e.x - e.largura / 2)), y - Math.max(...estacoes.map((e) => e.altura)) / 2, estacoes[0].p - avanco],
      max: [Math.max(...estacoes.map((e) => e.x + e.largura / 2)), y + Math.max(...estacoes.map((e) => e.altura)) / 2, estacoes[estacoes.length - 1].p + avanco],
    };
  });
  return caixas;
}

/* Os pontos declarados, em milímetro: o mínimo e o máximo da caixa de cada parte. As partes de x simétrico (a deriva, a dorsal, o
   leme e o eixo) têm a caixa dela mesma, e cada dobradiça tem a do lado direito e a do esquerdo (o espelho em x). */
export function pontosDeclarados(t = TABELA) {
  const tolerancia = 1;
  const caixas = caixasDasPartes(t);
  const ponto = (parte, medida, em, rotulo) => ({ nome: `${parte}, ${rotulo} da caixa`, parte, medida, em, toleranciaMm: tolerancia });
  return Object.entries(caixas).flatMap(([nome, { min, max }]) => {
    if (!nome.startsWith('dobradicaLeme')) return [ponto(nome, 'minimo', min, 'o mínimo'), ponto(nome, 'maximo', max, 'o máximo')];
    return [
      ponto(`${nome}D`, 'minimo', min, 'o mínimo'), ponto(`${nome}D`, 'maximo', max, 'o máximo'),
      ponto(`${nome}E`, 'minimo', [-max[0], min[1], min[2]], 'o mínimo'), ponto(`${nome}E`, 'maximo', [-min[0], max[1], max[2]], 'o máximo'),
    ];
  });
}

const receita = {
  meta: { nome: 'aviao/empenagem-vertical', desc: 'empenagem vertical do avião de pequeno porte: a deriva, a dorsal, o leme, o eixo e as dobradiças' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; a deriva no plano x 0, de z 6960 a z 10398' },
  PLANO: {
    objeto: 'empenagem vertical de um avião monomotor de pequeno porte: a deriva sobre a cauda, a dorsal que a liga ao dorso da fuselagem, o leme no bordo de fuga, o eixo dele e três pares de dobradiças',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'altura da deriva com o leme no esboço, da raiz em y 2225 ao topo do leme em y 4185', milimetros: 1960 },
    partes: [
      {
        nome: 'deriva',
        forma: 'deriva de perfil simétrico, enflechada para trás, da raiz sobre a cauda até o topo, com o vão do leme recortado no bordo de fuga',
        tecnica: 'a superfície da família superficie-aerodinamica, perfil deriva, com os parâmetros do esboço, expandida nos PASSOS, cortada na raiz e no vão do leme por subtrair',
      },
      {
        nome: 'dorsal',
        forma: 'dorsal lisa, o dorso da fuselagem subindo até a frente da deriva, sem a aleta de ponta fina do esboço',
        tecnica: 'loft em z de seções de crista em meia elipse e filete côncavo até o dorso, com as pontas fechadas e sombreado liso',
      },
      {
        nome: 'leme',
        forma: 'leme no vão do bordo de fuga da deriva, da raiz ao topo, com a fresta do esboço em volta',
        tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
      },
      { nome: 'eixoLeme', forma: 'eixo do leme, haste de 30 mm ao longo da dobradiça', tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
      ...DOBRADICAS.map(({ n, L, lado }) => ({
        nome: `dobradicaLeme${n}${L}`,
        forma: `dobradiça ${n} do leme, do lado ${lado}, peça fina que liga a deriva ao eixo`,
        tecnica: 'loft das seções do esboço',
      })),
    ],
    criteriosDeReprovacao: [
      'deriva reta, sem o enflechamento ou o afinamento do esboço',
      'dorsal solta, ou com degrau para a deriva',
      'leme fora do vão, sem a fresta, ou atravessando a deriva',
      'eixo ou dobradiça solta, que não segura o leme',
      'vão do leme sem recorte na deriva',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  /* Os contatos que o esboço mostra. A dobradiça cobre a fresta do leme: sai da deriva e entra no nariz do leme (o plano declarava só o
     primeiro). No par 3 o leme é fino, e a dobradiça começa a 4 mm do plano de simetria, dentro do raio de 15 mm do eixo, de modo que
     ela também entra no eixo; nos pares 1 e 2 ela não toca o eixo. */
  contatos: [
    { par: ['dorsal', 'deriva'], motivo: 'a dorsal continua a frente da deriva' },
    { par: ['eixoLeme', 'leme'], motivo: 'o eixo corre na dobradiça do leme' },
    ...DOBRADICAS.flatMap(({ n, L, lado }) => [
      { par: [`dobradicaLeme${n}${L}`, 'deriva'], motivo: `a dobradiça ${n} do lado ${lado} sai da deriva` },
      { par: [`dobradicaLeme${n}${L}`, 'leme'], motivo: `a dobradiça ${n} do lado ${lado} cobre a fresta e entra no nariz do leme` },
      ...(n === 3 ? [{ par: [`dobradicaLeme${n}${L}`, 'eixoLeme'], motivo: `a dobradiça 3 do lado ${lado} entra no eixo, porque o leme é fino ali e o centro dela cai junto dele` }] : []),
    ]),
  ],
  formas: Object.fromEntries(PARTES.map((p) => [p, 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: VOLUMES,
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: FORMAS, minimo: 0.95 },
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
