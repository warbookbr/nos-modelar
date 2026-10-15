/* aviao/asas — as duas metades da asa do avião de pequeno porte, com a ponta levantada, os flaps, os ailerons, os eixos deles e os
 * suportes, na pose de pouso, com as superfícies de comando neutras.
 *
 * Quarta etapa do avião (`../../montagem.json`): o plano está em `../../ALINHAMENTO.md` e as formas vêm da unidade `asas` do esboço
 * aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre e
 * `aviao-detalhe-asas.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. Cada
 * forma do lado direito (D) tem a do esquerdo (E) espelhada em x: a receita monta o lado D e o espelha com `espelha` antes de nomear
 * as partes, porque a cópia herda o nome da fonte. A TABELA está em milímetro, no quadro do esboço, e a conversão para metro acontece
 * só em `derivar`. A fuselagem não publica porta, e por isso a raiz da asa (o ponto `raizDaAsaD` do esboço) e as medidas do trem
 * principal, que a asa recorta, estão na TABELA como os pontos e os parâmetros do esboço, e não saem de um vínculo de medida nem de um
 * encaixe de porta da montagem v5.
 *
 * A metade da asa e a ponta são a chamada da família `superficie-aerodinamica` com o perfil `asa` e os parâmetros do esboço, expandida
 * aqui dentro dos PASSOS. A família gera a semi-asa na pose dela, com a raiz na origem e a envergadura em +x, e o esboço a põe com a
 * raiz em `raizDaAsaD`; a receita faz o mesmo com `transladar`. Da expansão fica só o `loft`, com a identidade que esta receita lhe dá
 * (as duas chamadas partem da mesma origem `loft` 1, e uma identidade só pode ser de um passo), e saem a parte `fixa`, o material, o
 * sólido e o liso, porque a receita nomeia as partes depois de recortá-las, e as duas portas, que a família publica no quadro local.
 * A metade da asa tem a semi-envergadura `semiRecortada` (5400 mm) e a ponta tem a inteira (5656 mm), e as duas são cortadas no mesmo
 * plano, `x` da ponta: a metade perde o que passa dele (`cortaPonta`) e a ponta perde o que fica aquém (`cortaAsa`).
 *
 * O vão do flap e o do aileron são o próprio comando engrossado pela fresta (`subtrai` com `folga` no esboço): o contorno de cada
 * seção é deslocado para fora pela fresta, com a quina em esquadria, e as duas extremidades avançam a fresta, com o contorno
 * prolongado na reta que une as duas seções. O alojamento do trem principal tem três cortadores, a caixa da perna, a do braço e o
 * cilindro da roda, de eixo quase vertical, na pose do trem recolhido (`fim`).
 *
 * Cada comando é um `loft` em x de duas seções de sete pontos, como no esboço. O loft só fecha uma ponta com um polo de raio zero, e o
 * polo nasce no eixo, a `tampa.avanco` além da seção, e `moveV` o leva ao centro dela, de modo que cada ponta é um leque quase plano.
 * Os eixos são extrusões de um círculo em x, giradas em z e em y para a reta da dobradiça, e os suportes são extrusões em y de um
 * retângulo de cantos arredondados.
 */
import { chamar, criarRegistroDeFamilias } from '../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../nucleo/composicoes.js';
import { nucleo } from '../../../../nucleo/entrada.js';

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const LADOS = [['D', 'd', 'direito'], ['E', 'e', 'esquerdo']];
const porLado = (fazer) => LADOS.flatMap(([L, l, nome]) => fazer(L, l, nome));

/* parte da receita -> volume do andaime: o nome da forma do esboço em slug */
const VOLUMES = Object.fromEntries(porLado((L, l) => [
  [`asa${L}`, `asa-${l}`], [`ponta${L}`, `ponta-${l}`], [`flap${L}`, `flap-${l}`], [`aileron${L}`, `aileron-${l}`],
  [`eixoFlap${L}`, `eixo-flap-${l}`], [`eixoAileron${L}`, `eixo-aileron-${l}`],
  [`suporteFlap1${L}`, `suporte-flap1-${l}`], [`suporteFlap2${L}`, `suporte-flap2-${l}`],
  [`suporteAileron1${L}`, `suporte-aileron1-${l}`], [`suporteAileron2${L}`, `suporte-aileron2-${l}`],
]));
const PARTES = Object.keys(VOLUMES);

export const TABELA = {
  /* A asa: os parâmetros `asa*` do esboço. `raiz` é o ponto `raizDaAsaD` (x, y e o z a 25% da corda da raiz); `semi` é a
     semi-envergadura da asa com a ponta levantada, e `semiRecortada` a da metade de asa, que o corte da ponta aparra. As cordas, em
     milímetro, são as da raiz e as da ponta de `semi`, e a espessura é a relativa da família (a da ponta da metade de asa sai da reta
     entre as duas). `degrauDaRaiz` é a fração da semi-envergadura em que o diedro começa, constante da família. A ponta levantada
     (`pontaLevantada`, em graus) ocupa os últimos `extensaoDaPonta` da semi-envergadura da ponta. O corte da ponta é o plano em x
     `raiz[0] + fracaoDaSemi * semi - fracaoDaCordaNaPonta * cordaNaPonta + folga`, que a metade de asa e a ponta dividem; `cortaPonta`
     e `cortaAsa` são as duas caixas dele, grandes o bastante para a asa passar (y e z do centro, altura e profundidade), e `inicio` é o
     x em que a caixa da ponta termina do lado da raiz. */
  asa: {
    raiz: [745, 1022, 4408.5],
    semi: 5656,
    semiRecortada: 5400,
    cordaNaRaiz: 1762,
    cordaNaPonta: 931,
    espessuraNaRaiz: 0.15,
    espessuraNaPonta: 0.13,
    enflechamento: 0.86,
    diedro: 5.93,
    degrauDaRaiz: 0.004,
    pontaLevantada: 56,
    extensaoDaPonta: 0.05,
    corte: { fracaoDaSemi: 0.95, fracaoDaCordaNaPonta: 0.065, folga: 8 },
    cortaPonta: { largura: 1000, altura: 3000, profundidade: 3000, y: 1500, z: 4800 },
    cortaAsa: { inicio: 600, altura: 3000, profundidade: 3000, y: 1500, z: 4800 },
  },
  /* O flap e o aileron: `x` são os dois x das seções (a raiz e a ponta do comando), `corda` e `espessura` as frações da corda da asa
     naquele x que dão o comprimento e a espessura do contorno, e `alturaDoCentro` a do centro do contorno acima da linha do diedro,
     também em fração da corda. O suporte é a caixa de cada comando, [largura em x, altura em y, profundidade em z]. */
  flap: { x: [960, 4870], corda: 0.19, espessura: 0.055, alturaDoCentro: 0.0107, suporte: [80, 56, 280] },
  aileron: { x: [4912, 6040], corda: 0.375, espessura: 0.08, alturaDoCentro: 0.0167, suporte: [70, 56, 260] },
  /* O que os dois comandos têm em comum. O bordo de fuga do comando é o da asa (`posicaoNaCorda`: 75% da corda, de onde o comando
     recua o próprio comprimento), o nariz é o arco de 45 graus do contorno (`nariz`, em fração da espessura) e o bordo de fuga tem
     `meiaEspessuraDoBordoDeFuga` para cada lado. A `fresta` é a folga do vão em volta do comando. O eixo é a haste de `diametro`, em
     `lados` lados, que passa `sobra` além de cada seção, sobre a linha da dobradiça (o centro do nariz). Os suportes ficam nas frações
     `posicoes` do vão do comando, `abaixo` da face de baixo do comando e `atras` da dobradiça, com o `raio` do canto. `tampa.avanco` é
     quanto o polo de cada loft fica além da seção, e `segmentosDoCanto` os segmentos do canto do suporte. `assentamento` é o
     deslocamento [em z, em y], em milímetro, que a receita dá aos dois vãos: a booleana do núcleo recalcula cada canto novo pelos
     planos das faces de entrada, e a casca da asa tem faces de 840 mm, empenadas 0,26 mm e a 0,2 grau uma da outra, de modo que o
     canto que a face de baixo do vão (a 1,5 grau da casca) faz sobre uma aresta longa sai a metros da peça. Com [0, 0] a asa saía com
     um canto em x 6342, 277 mm além do corte, e em [3, -0.5] os cantos novos ficam a menos de 0,35 mm das faces de entrada; o
     valor está numa faixa estreita (1 mm em z e 0,1 mm em y em volta dele ainda dão canto limpo, 0,2 mm em y a mais já não), e os
     pontos declarados medem a caixa das duas asas e acusam o deslocamento que deixar de valer. */
  comando: {
    posicaoNaCorda: 0.75,
    nariz: [0.1465, 0.3535],
    meiaEspessuraDoBordoDeFuga: 4,
    fresta: 12,
    assentamento: [3, -0.5],
    eixo: { diametro: 30, sobra: 20, lados: 48 },
    suporte: { posicoes: [0.2, 0.8], abaixo: 18, atras: 70, raio: 20, segmentosDoCanto: 6 },
    tampa: { avanco: 0.5 },
  },
  /* O alojamento do trem principal, que a asa recorta: a unidade dos trens declara três cortadores, e esta é a medida deles no quadro
     do trem. `trem` traz o ponto de pivô da perna (x, y, z), o do cubo da roda (y), o raio e a largura da roda, o comprimento do
     braço e o giro do recolhimento. Os alojamentos da perna e do braço são caixas de [largura em x, altura em y] centradas no pivô
     mais o deslocamento [em x, em y], com a profundidade em z do braço mais `margemEmZ`; o da roda é um cilindro de `lados` lados, com
     o diâmetro e a largura da roda mais as margens, na posição da roda depois do giro. */
  trem: { pivo: [1920, 1115, 4522], cubo: 313.5, raioDaRoda: 296.5, larguraDaRoda: 140, comprimentoDoBraco: 340, recolhimento: 84 },
  alojamento: {
    perna: { caixa: [390, 315], deslocamento: [-25, -57.5] },
    braco: { caixa: [640, 310], deslocamento: [-540, -80] },
    roda: { margemNoDiametro: 40, margemNaLargura: 70, lados: 32 },
    margemEmZ: 60,
  },
};

const m = (mm) => mm / 1000;
const GRAUS = Math.PI / 180;
const tg = (graus) => Math.tan(graus * GRAUS);
const mAll = (v) => v.map(m);

let registro = null;
const registroDeFamilias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* A estação de um comando em x (mm): a corda da asa ali, o comprimento e a espessura do contorno, o centro dele em z e em y, e a
   dobradiça (`zh`, o centro do nariz). As contas são as das expressões `f1C`, `f1L`, `f1T`, `f1Zc`, `f1Yc` e `f1Zh` do esboço. */
function estacaoDoComando(t, comando, x) {
  const a = t.asa;
  const corda = a.cordaNaRaiz + ((a.cordaNaPonta - a.cordaNaRaiz) * (x - a.raiz[0])) / a.semi;
  const L = comando.corda * corda;
  const T = comando.espessura * corda;
  const zc = a.raiz[2] + (x - a.raiz[0]) * tg(a.enflechamento) + t.comando.posicaoNaCorda * corda - 0.5 * L;
  const yc = a.raiz[1] + (x - a.raiz[0] - a.degrauDaRaiz * a.semi) * tg(a.diedro) + comando.alturaDoCentro * corda;
  return { x, L, T, zc, yc, zh: zc - 0.5 * L + 0.5 * T };
}

/* O contorno de sete pontos do comando em uma estação, [z, y] em mm, anti-horário em (z, y): o topo do nariz, o arco, a ponta do
   nariz, o arco de baixo, a base do nariz e as duas pontas do bordo de fuga. */
function contornoDoComando(t, e) {
  const [n1, n2] = t.comando.nariz;
  const b = t.comando.meiaEspessuraDoBordoDeFuga;
  const frente = e.zc - 0.5 * e.L;
  return [
    [frente + 0.5 * e.T, e.yc + 0.5 * e.T],
    [frente + n1 * e.T, e.yc + n2 * e.T],
    [frente, e.yc],
    [frente + n1 * e.T, e.yc - n2 * e.T],
    [frente + 0.5 * e.T, e.yc - 0.5 * e.T],
    [e.zc + 0.5 * e.L, e.yc - b],
    [e.zc + 0.5 * e.L, e.yc + b],
  ];
}

/* O contorno deslocado `d` para fora, com a quina em esquadria: cada vértice anda `d` pela soma das normais das duas arestas, dividida
   por um mais o produto escalar delas. O contorno é anti-horário em (z, y), e a normal de fora de uma aresta (ex, ey) é (ey, -ex). */
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

/* Os dados de um comando, em mm: as duas estações, os dois contornos, o contorno do vão deslocado pela fresta nos x das seções e o
   vão com as pontas avançadas a fresta, as duas extremidades do eixo e o centro de cada suporte. */
function medidasDoComando(t, comando) {
  const [x1, x2] = comando.x;
  const e = [estacaoDoComando(t, comando, x1), estacaoDoComando(t, comando, x2)];
  const contornos = e.map((s) => contornoDoComando(t, s));
  const fresta = t.comando.fresta;
  const dentro = contornos.map((c) => deslocarContorno(c, fresta));
  /* O vão avança a fresta em x nas duas pontas: o contorno de lá é o da reta que une os dois deslocados, estendida. */
  const noX = (x) => dentro[0].map((p, k) => [
    p[0] + ((dentro[1][k][0] - p[0]) * (x - x1)) / (x2 - x1),
    p[1] + ((dentro[1][k][1] - p[1]) * (x - x1)) / (x2 - x1),
  ]);
  const [assentaZ, assentaY] = t.comando.assentamento;
  const assenta = (pontos) => pontos.map(([z, y]) => [z + assentaZ, y + assentaY]);
  const vao = [{ x: x1 - fresta, pontos: assenta(noX(x1 - fresta)) }, { x: x2 + fresta, pontos: assenta(noX(x2 + fresta)) }];

  const sob = t.comando.eixo.sobra;
  const eixo = { de: [x1 - sob, e[0].yc, e[0].zh], para: [x2 + sob, e[1].yc, e[1].zh] };
  const s = t.comando.suporte;
  const suportes = s.posicoes.map((f) => [
    x1 + f * (x2 - x1),
    e[0].yc + f * (e[1].yc - e[0].yc) - 0.5 * (e[0].T + f * (e[1].T - e[0].T)) - s.abaixo,
    e[0].zh + f * (e[1].zh - e[0].zh) + s.atras,
  ]);
  return {
    estacoes: e.map((s2, i) => ({ x: s2.x, pontos: contornos[i] })), vao, eixo, suportes, caixaDoSuporte: comando.suporte,
  };
}

/* A conta do eixo: o comprimento e os dois giros, em graus, que levam +x à direção da reta `de` a `para`. Em z o giro é o seno do
   ângulo de subida, e em y o que leva o resto de +x a (dx, dz). Cada um gira em torno de `de`. */
function giroDoEixo({ de, para }) {
  const d = para.map((v, k) => v - de[k]);
  const comprimento = Math.hypot(...d);
  const u = d.map((v) => v / comprimento);
  return { comprimento, em: Math.asin(u[1]) / GRAUS, y: Math.atan2(-u[2], u[0]) / GRAUS };
}

export function derivar(t = TABELA) {
  const a = t.asa;
  const registroDaFamilia = registroDeFamilias();
  const familia = registroDaFamilia.obter('superficie-aerodinamica');
  const xDaPonta = a.raiz[0] + a.corte.fracaoDaSemi * a.semi - a.corte.fracaoDaCordaNaPonta * a.cordaNaPonta + a.corte.folga;

  /* As duas chamadas da família, com os parâmetros do esboço. A metade de asa leva a semi-envergadura recortada, com as cordas e a
     espessura da reta da semi-asa inteira naquele ponto, e sem a ponta levantada; a ponta leva a semi-envergadura inteira. */
  const proporcao = a.semiRecortada / a.semi;
  const base = {
    perfil: 'asa', simetria: 0, enflechamento: a.enflechamento, diedro: a.diedro, torcao: 0, incidenciaNaRaiz: 0,
    espessuraNaRaiz: a.espessuraNaRaiz, extensaoDaPonta: a.extensaoDaPonta, comando: 0, comandoDiferencial: 0,
  };
  const chamadaDaAsa = chamar(familia, 'asa', {
    ...base,
    envergadura: a.semiRecortada,
    cordaNaRaiz: a.cordaNaRaiz / a.semiRecortada,
    cordaNaPonta: (a.cordaNaRaiz + (a.cordaNaPonta - a.cordaNaRaiz) * proporcao) / a.semiRecortada,
    espessuraNaPonta: a.espessuraNaRaiz - (a.espessuraNaRaiz - a.espessuraNaPonta) * proporcao,
    pontaLevantada: 0,
  });
  const chamadaDaPonta = chamar(familia, 'ponta', {
    ...base,
    envergadura: a.semi,
    cordaNaRaiz: a.cordaNaRaiz / a.semi,
    cordaNaPonta: a.cordaNaPonta / a.semi,
    espessuraNaPonta: a.espessuraNaPonta,
    pontaLevantada: a.pontaLevantada,
  });

  /* Os cortadores do plano da ponta: caixas em x, y e z. A da ponta vai do corte para fora e a da asa do `inicio` ao corte. */
  const cp = a.cortaPonta;
  const ca = a.cortaAsa;
  const caixa = (xMin, xMax, y, z, altura, profundidade) => ({ largura: m(xMax - xMin), altura: m(altura), profundidade: m(profundidade), em: [m((xMin + xMax) / 2), m(y - altura / 2), m(z)] });
  const cortadores = {
    cortaPonta: caixa(xDaPonta, xDaPonta + cp.largura, cp.y, cp.z, cp.altura, cp.profundidade),
    cortaAsa: caixa(ca.inicio, xDaPonta, ca.y, ca.z, ca.altura, ca.profundidade),
  };

  /* O alojamento do trem principal. */
  const g = t.trem;
  const al = t.alojamento;
  const profundidade = g.comprimentoDoBraco + al.margemEmZ;
  const braco = g.pivo[1] - g.cubo;
  const roda = [g.pivo[0] - braco * Math.sin(g.recolhimento * GRAUS), g.pivo[1] - braco * Math.cos(g.recolhimento * GRAUS), g.pivo[2]];
  const alojamentoDe = ({ caixa: [largura, altura], deslocamento: [dx, dy] }) => caixa(g.pivo[0] + dx - largura / 2, g.pivo[0] + dx + largura / 2, g.pivo[1] + dy, g.pivo[2], altura, profundidade);
  const alojamentos = {
    perna: alojamentoDe(al.perna),
    braco: alojamentoDe(al.braco),
    roda: {
      raio: m(g.raioDaRoda + al.roda.margemNoDiametro / 2),
      comprimento: m(g.larguraDaRoda + al.roda.margemNaLargura),
      segmentos: al.roda.lados / 4,
      giro: -g.recolhimento,
      centro: mAll(roda),
    },
  };

  /* Os dois comandos. */
  const comandos = Object.fromEntries(['flap', 'aileron'].map((nome) => {
    const c = medidasDoComando(t, t[nome]);
    const giro = giroDoEixo(c.eixo);
    return [nome, {
      estacoes: c.estacoes.map(({ x, pontos }) => ({ x: m(x), pontos: pontos.map(mAll) })),
      vao: c.vao.map(({ x, pontos }) => ({ x: m(x), pontos: pontos.map(mAll) })),
      eixo: {
        de: mAll(c.eixo.de), comprimento: m(giro.comprimento), raio: m(t.comando.eixo.diametro / 2), segmentos: t.comando.eixo.lados / 4,
        giroEmZ: giro.em, giroEmY: giro.y,
      },
      suportes: c.suportes.map((centro) => {
        const [largura, altura, fundo] = c.caixaDoSuporte;
        return {
          largura: m(largura), altura: m(altura), profundidade: m(fundo), raio: m(t.comando.suporte.raio),
          em: [m(centro[0]), m(centro[1] - altura / 2), m(centro[2])],
        };
      }),
    }];
  }));

  return {
    asa: { chamada: chamadaDaAsa, desloca: mAll(a.raiz) },
    ponta: { chamada: chamadaDaPonta, desloca: mAll(a.raiz) },
    cortadores, alojamentos, comandos, avanco: m(t.comando.tampa.avanco), segmentosDoCanto: t.comando.suporte.segmentosDoCanto,
    xDaPonta,
  };
}

/* Para o eixo do loft em x: o plano da seção é y e z, o sinal que leva z ao +w do núcleo é -1, e a `orientacao` fixa o +u em y. Com
   ela declarada o núcleo projeta a referência na tangente de cada seção, e u e w saem iguais em todas. */
const LOFT_EM_X = { sinalW: -1, orientacao: [0, 1, 0] };

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

/* Um loft em x por estações, em metro: `estacoes` são `{ x, pontos }` com os pontos [z, y] no mundo. O caminho é a reta paralela a x
   pelo centro da primeira estação, e o centro de cada contorno entra nos pontos, como no esboço, para as seções ficarem no plano x
   constante. Devolve as seções, com um polo de raio zero antes da primeira e depois da última, os `lados`, a `orientacao` e, para cada
   polo, a região que o seleciona e o deslocamento que o leva ao centro da estação de que ele fecha a ponta. */
function loftEmX(estacoes, avanco) {
  const [z0, y0] = estacoes[0].pontos[0].map((_, k) => estacoes[0].pontos.reduce((s, p) => s + p[k], 0) / estacoes[0].pontos.length);
  const { sinalW, orientacao } = LOFT_EM_X;
  const noEixo = (x) => [x, y0, z0];
  const secoes = estacoes.map(({ x, pontos }) => {
    const contorno = pontos.map(([z, y]) => [y - y0, sinalW * (z - z0)]);
    return { pos: noEixo(x), contorno: areaDoContorno(contorno) < 0 ? contorno.reverse() : contorno };
  });
  const polo = (estacao, sentido) => {
    const pos = noEixo(estacao.x + sentido * avanco);
    const media = (k) => estacao.pontos.reduce((soma, p) => soma + p[k], 0) / estacao.pontos.length;
    const folga = avanco / 4;
    return { pos, d: [0, media(1) - y0, media(0) - z0], regiao: { min: pos.map((v) => v - folga), max: pos.map((v) => v + folga) } };
  };
  const polos = [polo(estacoes[0], -1), polo(estacoes[estacoes.length - 1], 1)];
  return {
    secoes: [{ pos: polos[0].pos, raio: 0 }, ...secoes, { pos: polos[1].pos, raio: 0 }],
    lados: secoes[0].contorno.length,
    orientacao,
    polos,
  };
}

/* Identidade estrutural dos passos, escolhida aqui: um bloco de cem por forma, e dentro dele uma identidade por passo. A cópia
   espelhada (`espelha`) leva a identidade da fonte mais `ESPELHO`. */
const ID = {
  asa: 100, ponta: 110, cortaPonta: 120, cortaAsa: 121, perna: 122, braco: 123, roda: 124, cortadorDoFlap: 130, cortadorDoAileron: 131,
  asaRecortada: 140, pontaRecortada: 141,
  flap: 200, aileron: 210, eixoFlap: 220, eixoAileron: 221, suporteFlap1: 230, suporteFlap2: 231, suporteAileron1: 240, suporteAileron2: 241,
};
const ESPELHO = 500;

export const MATERIAIS = {
  asa: { cor: '#aeb9c4', metalicidade: 0.3, aspereza: 0.45 },
  eixo: { cor: '#2b3138', metalicidade: 0.4, aspereza: 0.4 },
  suporte: { cor: '#5f6b78', metalicidade: 0.3, aspereza: 0.5 },
};

/* O ângulo, em graus, a partir do qual a quina fica nítida no sombreado liso: o da família, de 60 graus, que deixa lisos o nariz do
   comando e os cantos do suporte (menos de 15 graus por segmento) e nítidos o bordo de fuga, as tampas e as paredes do vão. */
const ANGULO_LISO = 60;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  const doPasso = (op, id) => ({ origem: { op, id } });

  /* A expansão da família: só o `loft`, com a identidade desta receita. */
  const daFamilia = ({ chamada }, origemId) => {
    const { passos: expandidos } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [chamada]);
    const [, argumentos] = expandidos.find(([operacao]) => operacao === 'loft');
    return ['loft', { ...argumentos, origemId }];
  };
  const loft = (origemId, L) => {
    passos.push(['loft', { origemId, secoes: L.secoes, lados: L.lados, orientacao: L.orientacao }]);
    for (const polo of L.polos) passos.push(['moveV', { sel: { regiao: polo.regiao }, d: polo.d }]);
  };
  const caixa = (origemId, c) => passos.push(['extrusao', { origemId, eixo: 'y', altura: c.altura, perfil: { retangulo: { largura: c.largura, profundidade: c.profundidade } }, em: c.em }]);

  /* A metade de asa e a ponta, na pose do esboço, e os cortadores do corte da ponta. */
  passos.push(daFamilia(P.asa, ID.asa));
  passos.push(['transladar', { d: P.asa.desloca, sel: doPasso('loft', ID.asa) }]);
  passos.push(daFamilia(P.ponta, ID.ponta));
  passos.push(['transladar', { d: P.ponta.desloca, sel: doPasso('loft', ID.ponta) }]);
  caixa(ID.cortaPonta, P.cortadores.cortaPonta);
  caixa(ID.cortaAsa, P.cortadores.cortaAsa);

  /* O alojamento do trem: a caixa da perna, a do braço e o cilindro da roda, de eixo em x girado em z para quase vertical. */
  caixa(ID.perna, P.alojamentos.perna);
  caixa(ID.braco, P.alojamentos.braco);
  const roda = P.alojamentos.roda;
  passos.push(['extrusao', { origemId: ID.roda, eixo: 'x', altura: roda.comprimento, perfil: { circulo: { raio: roda.raio } }, segmentosArco: roda.segmentos, em: [-roda.comprimento / 2, 0, 0] }]);
  passos.push(['rotaciona', { eixo: 'z', graus: roda.giro, pivo: [0, 0, 0], sel: doPasso('extrusao', ID.roda) }]);
  passos.push(['transladar', { d: roda.centro, sel: doPasso('extrusao', ID.roda) }]);

  /* Os vãos dos comandos: o comando engrossado pela fresta. */
  loft(ID.cortadorDoFlap, loftEmX(P.comandos.flap.vao, P.avanco));
  loft(ID.cortadorDoAileron, loftEmX(P.comandos.aileron.vao, P.avanco));

  /* A metade de asa menos os vãos e o alojamento, e a ponta menos a metade de asa. */
  passos.push(['subtrair', {
    origemId: ID.asaRecortada,
    solidos: [
      doPasso('loft', ID.asa), doPasso('loft', ID.cortadorDoFlap), doPasso('loft', ID.cortadorDoAileron), doPasso('extrusao', ID.cortaPonta),
      doPasso('extrusao', ID.perna), doPasso('extrusao', ID.braco), doPasso('extrusao', ID.roda),
    ],
  }]);
  passos.push(['subtrair', { origemId: ID.pontaRecortada, solidos: [doPasso('loft', ID.ponta), doPasso('extrusao', ID.cortaAsa)] }]);

  /* Os comandos, os eixos e os suportes do lado direito. */
  loft(ID.flap, loftEmX(P.comandos.flap.estacoes, P.avanco));
  loft(ID.aileron, loftEmX(P.comandos.aileron.estacoes, P.avanco));
  const eixos = [['flap', ID.eixoFlap], ['aileron', ID.eixoAileron]];
  for (const [nome, id] of eixos) {
    const e = P.comandos[nome].eixo;
    passos.push(['extrusao', { origemId: id, eixo: 'x', altura: e.comprimento, perfil: { circulo: { raio: e.raio } }, segmentosArco: e.segmentos, em: e.de }]);
    passos.push(['rotaciona', { eixo: 'z', graus: e.giroEmZ, pivo: e.de, sel: doPasso('extrusao', id) }]);
    passos.push(['rotaciona', { eixo: 'y', graus: e.giroEmY, pivo: e.de, sel: doPasso('extrusao', id) }]);
  }
  const suportes = [['flap', ID.suporteFlap1, ID.suporteFlap2], ['aileron', ID.suporteAileron1, ID.suporteAileron2]];
  for (const [nome, ...ids] of suportes) {
    P.comandos[nome].suportes.forEach((s, k) => passos.push(['extrusao', {
      origemId: ids[k], eixo: 'y', altura: s.altura, perfil: { retangulo: { largura: s.largura, profundidade: s.profundidade, cantos: s.raio } }, segmentosArco: P.segmentosDoCanto, em: s.em,
    }]));
  }

  /* Cada forma do lado direito: a cópia espelhada em x e os quatro passos que a nomeiam, com o material, o sólido e o liso. */
  const formas = [
    ['asa', doPasso('subtrair', ID.asaRecortada), 'asa'],
    ['ponta', doPasso('subtrair', ID.pontaRecortada), 'asa'],
    ['flap', doPasso('loft', ID.flap), 'asa'],
    ['aileron', doPasso('loft', ID.aileron), 'asa'],
    ['eixoFlap', doPasso('extrusao', ID.eixoFlap), 'eixo'],
    ['eixoAileron', doPasso('extrusao', ID.eixoAileron), 'eixo'],
    ['suporteFlap1', doPasso('extrusao', ID.suporteFlap1), 'suporte'],
    ['suporteFlap2', doPasso('extrusao', ID.suporteFlap2), 'suporte'],
    ['suporteAileron1', doPasso('extrusao', ID.suporteAileron1), 'suporte'],
    ['suporteAileron2', doPasso('extrusao', ID.suporteAileron2), 'suporte'],
  ];
  for (const [nome, { origem }, material] of formas) {
    const copia = { op: 'espelha', id: origem.id + ESPELHO, de: origem };
    passos.push(['espelha', { eixo: 'x', pos: 0, origemId: copia.id, derivaDe: origem, sel: { origem } }]);
    for (const [sufixo, sel] of [['D', { origem }], ['E', { origem: copia }]]) {
      passos.push(['parte', { nome: `${nome}${sufixo}`, sel }]);
      passos.push(['material', { usa: material, sel }]);
      passos.push(['solido', { sel }]);
      passos.push(['liso', { angulo: ANGULO_LISO, sel }]);
    }
  }

  return passos;
}

/* A caixa de uma superfície da família depois da pose e do corte, em milímetro: a malha da família executada sozinha, deslocada pela
   raiz e aparada no plano do corte (Sutherland-Hodgman em cada face, ficando com o lado de x menor ou de x maior). */
function caixaDaSuperficie(t, chamada, desloca, xDoCorte, lado) {
  const { passos } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [chamada]);
  const { V, F } = nucleo(passos.filter(([operacao]) => operacao === 'loft'), {}, {}, {}, null, []);
  const dentro = (p) => (lado < 0 ? p[0] <= xDoCorte : p[0] >= xDoCorte);
  const pontos = [];
  for (const f of F.values()) {
    const poligono = f.vs.map((id) => V.get(id).map((v, k) => (v + desloca[k]) * 1000));
    poligono.forEach((p, i) => {
      const q = poligono[(i + 1) % poligono.length];
      if (dentro(p)) pontos.push(p);
      if (dentro(p) !== dentro(q)) {
        const s = (xDoCorte - p[0]) / (q[0] - p[0]);
        pontos.push(p.map((v, k) => v + s * (q[k] - v)));
      }
    });
  }
  return {
    min: [0, 1, 2].map((k) => Math.min(...pontos.map((p) => p[k]))),
    max: [0, 1, 2].map((k) => Math.max(...pontos.map((p) => p[k]))),
  };
}

const caixaDosPontos = (pontos) => ({
  min: [0, 1, 2].map((k) => Math.min(...pontos.map((p) => p[k]))),
  max: [0, 1, 2].map((k) => Math.max(...pontos.map((p) => p[k]))),
});

/* A caixa de cada parte do lado direito, em milímetro, calculada da TABELA sem passar pelos passos: a das duas superfícies da família
   é a da malha dela aparada no corte; a dos comandos, a dos contornos e do avanço dos polos; a dos eixos, a das duas tampas (um
   disco de raio `r` perpendicular à reta tem, em cada eixo, a extensão `r * sqrt(1 - d²)`); a dos suportes, a da caixa. */
function caixasDoLadoDireito(t) {
  const P = derivar(t);
  const avanco = t.comando.tampa.avanco;
  const caixas = {
    asa: caixaDaSuperficie(t, P.asa.chamada, P.asa.desloca, P.xDaPonta, -1),
    ponta: caixaDaSuperficie(t, P.ponta.chamada, P.ponta.desloca, P.xDaPonta, 1),
  };
  for (const nome of ['flap', 'aileron']) {
    const c = medidasDoComando(t, t[nome]);
    const todos = c.estacoes.flatMap(({ x, pontos }) => pontos.map(([z, y]) => [x, y, z]));
    const caixa = caixaDosPontos(todos);
    caixa.min[0] -= avanco;
    caixa.max[0] += avanco;
    caixas[nome] = caixa;

    const { de, para } = c.eixo;
    const comprimento = Math.hypot(...para.map((v, k) => v - de[k]));
    const raio = t.comando.eixo.diametro / 2;
    const u = para.map((v, k) => (v - de[k]) / comprimento);
    const folga = u.map((c2) => raio * Math.sqrt(1 - c2 * c2));
    const extremos = caixaDosPontos([de, para]);
    caixas[`eixo${nome === 'flap' ? 'Flap' : 'Aileron'}`] = { min: extremos.min.map((v, k) => v - folga[k]), max: extremos.max.map((v, k) => v + folga[k]) };

    const [largura, altura, fundo] = c.caixaDoSuporte;
    c.suportes.forEach((centro, k) => {
      caixas[`suporte${nome === 'flap' ? 'Flap' : 'Aileron'}${k + 1}`] = {
        min: [centro[0] - largura / 2, centro[1] - altura / 2, centro[2] - fundo / 2],
        max: [centro[0] + largura / 2, centro[1] + altura / 2, centro[2] + fundo / 2],
      };
    });
  }
  return caixas;
}

/* Os pontos declarados, em milímetro: o mínimo e o máximo da caixa de cada parte, do lado direito e do esquerdo (o espelho em x). */
export function pontosDeclarados(t = TABELA) {
  const tolerancia = 1;
  const caixas = caixasDoLadoDireito(t);
  return Object.entries(caixas).flatMap(([nome, { min, max }]) => [
    { nome: `${nome}D, o mínimo da caixa`, parte: `${nome}D`, medida: 'minimo', em: min, toleranciaMm: tolerancia },
    { nome: `${nome}D, o máximo da caixa`, parte: `${nome}D`, medida: 'maximo', em: max, toleranciaMm: tolerancia },
    { nome: `${nome}E, o mínimo da caixa`, parte: `${nome}E`, medida: 'minimo', em: [-max[0], min[1], min[2]], toleranciaMm: tolerancia },
    { nome: `${nome}E, o máximo da caixa`, parte: `${nome}E`, medida: 'maximo', em: [-min[0], max[1], max[2]], toleranciaMm: tolerancia },
  ]);
}

const receita = {
  meta: { nome: 'aviao/asas', desc: 'asas do avião de pequeno porte: as duas metades com a ponta levantada, os flaps, os ailerons, os eixos e os suportes' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; a asa direita em x positivo' },
  PLANO: {
    objeto: 'asa baixa de um avião monomotor de pequeno porte: as duas metades, cada uma com a ponta levantada, o flap e o aileron no bordo de fuga, os eixos deles e os suportes que os prendem',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/topo.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
    ],
    escala: { medida: 'envergadura no esboço, de ponta a ponta das pontas levantadas', milimetros: 12825 },
    partes: [
      ...porLado((L, l, nome) => [
        {
          nome: `asa${L}`,
          forma: `metade ${nome} da asa, da raiz junto à fuselagem até o começo da ponta, com enflechamento e diedro, perfil de 15% afinando para a ponta e os vãos do flap, do aileron e do alojamento do trem principal recortados`,
          tecnica: 'a superfície da família superficie-aerodinamica, perfil asa, com os parâmetros do esboço, expandida nos PASSOS e recortada por subtrair',
        },
        {
          nome: `ponta${L}`,
          forma: `ponta ${nome} da asa, levantada a 56 graus, continuando a metade da asa sem degrau`,
          tecnica: 'a superfície da família com a ponta levantada, como no esboço, cortada para ficar só além da metade da asa',
        },
        {
          nome: `flap${L}`,
          forma: `flap ${nome}, superfície do bordo de fuga entre a raiz e o aileron, no vão da asa com a fresta do esboço em volta`,
          tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
        },
        {
          nome: `aileron${L}`,
          forma: `aileron ${nome}, superfície do bordo de fuga entre o flap e a ponta, no vão da asa com a fresta do esboço em volta`,
          tecnica: 'loft das seções do esboço, com as pontas fechadas e sombreado liso',
        },
        { nome: `eixoFlap${L}`, forma: `eixo do flap ${nome}, haste de 30 mm de diâmetro ao longo da dobradiça do flap`, tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
        { nome: `eixoAileron${L}`, forma: `eixo do aileron ${nome}, haste de 30 mm de diâmetro ao longo da dobradiça do aileron`, tecnica: 'cilindro entre as duas pontas da dobradiça do esboço' },
        ...[1, 2].map((n) => ({ nome: `suporteFlap${n}${L}`, forma: `suporte ${n} do flap ${nome}, bloco de canto arredondado sob a asa que segura o eixo do flap`, tecnica: 'caixa de canto arredondado do esboço' })),
        ...[1, 2].map((n) => ({ nome: `suporteAileron${n}${L}`, forma: `suporte ${n} do aileron ${nome}, bloco de canto arredondado sob a asa que segura o eixo do aileron`, tecnica: 'caixa de canto arredondado do esboço' })),
      ]),
    ],
    criteriosDeReprovacao: [
      'asa reta, sem o enflechamento, o diedro ou o afinamento do esboço',
      'ponta sem a levantada, ou com degrau para a metade da asa',
      'flap ou aileron fora do vão, sem a fresta, ou atravessando a asa',
      'eixo ou suporte solto, que não segura o comando',
      'vão do flap, do aileron ou do alojamento do trem sem recorte na asa',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  /* Os contatos que o esboço mostra. O eixo passa 20 mm além de cada seção do comando e entra na parede do vão da asa nas duas
     pontas. O suporte sai da asa e entra 10 mm na face de baixo do comando; ele fica a 22 mm abaixo do eixo, e o par suporte e eixo,
     que o plano declarava, não se toca no esboço e por isso não está aqui. */
  contatos: porLado((L, l, nome) => [
    { par: [`ponta${L}`, `asa${L}`], motivo: `a ponta ${nome} continua a metade da asa` },
    { par: [`eixoFlap${L}`, `flap${L}`], motivo: `o eixo corre na dobradiça do flap ${nome}` },
    { par: [`eixoAileron${L}`, `aileron${L}`], motivo: `o eixo corre na dobradiça do aileron ${nome}` },
    { par: [`eixoFlap${L}`, `asa${L}`], motivo: `o eixo do flap ${nome} entra na parede do vão da asa em cada ponta` },
    { par: [`eixoAileron${L}`, `asa${L}`], motivo: `o eixo do aileron ${nome} entra na parede do vão da asa em cada ponta` },
    ...[1, 2].flatMap((n) => [
      { par: [`suporteFlap${n}${L}`, `asa${L}`], motivo: `o suporte ${n} do flap ${nome} sai da asa` },
      { par: [`suporteFlap${n}${L}`, `flap${L}`], motivo: `o suporte ${n} entra na face de baixo do flap ${nome}` },
      { par: [`suporteAileron${n}${L}`, `asa${L}`], motivo: `o suporte ${n} do aileron ${nome} sai da asa` },
      { par: [`suporteAileron${n}${L}`, `aileron${L}`], motivo: `o suporte ${n} entra na face de baixo do aileron ${nome}` },
    ]),
  ]),
  /* O esboço deixa sob o aileron uma lâmina do bordo de fuga da asa, de 0,3 a 6 mm, que liga a parede de dentro do vão à de fora e
     fecha uma alça: a asa do esboço tem um furo, e a de cada lado também. */
  formas: Object.fromEntries(PARTES.map((p) => [p, /^asa[DE]$/.test(p) ? { furos: 1, corpos: 1 } : 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: VOLUMES,
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: Object.fromEntries(PARTES.map((p) => [p, p])), minimo: 0.95 },
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
