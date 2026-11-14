/* vaso-de-ceramica — vaso de cerâmica terracota de uma parte (`vaso`).
 * O combinado está em `referencias/alvo.md`.
 *
 * O perfil (raio, altura) é uma lista de pontos escrita na `derivar`, separada
 * da operação: `lathe` só o gira. O corpo é a seção da parede inteira (6 mm),
 * fechada no eixo nas duas pontas, de modo que o vaso sai oco até a boca e com
 * o fundo do pé rebaixado. Os quatro arcos do pé não são revolução e saem de
 * `subtrair`: dois cilindros em z e dois em x, cada um furando dois lados.
 */

export const TABELA = {
  /* Medidas do alvo, em mm. */
  altura: 200,
  barrigaDiametro: 190,
  barrigaAltura: 95,
  pescocoDiametro: 55,
  bocaDiametro: 75,
  peDiametro: 110,
  peAltura: 30,
  parede: 6,
  arcoLargura: 25,
  arcoAltura: 18,
  /* Escolhas do modelador. */
  pescocoAltura: 170, /* onde o pescoço atinge o menor diâmetro */
  labioAltura: 6, /* faixa reta do lábio virado */
  rebaixoDoPe: 26, /* altura do teto do rebaixo sob o fundo */
  barrigaSemieixoY: 63, /* a barriga é uma elipse de semieixo horizontal barrigaDiametro/2 */
  tInicio: 34, /* graus da elipse onde o pé encontra a barriga */
  tFim: 146, /* graus da elipse onde a barriga entra no pescoço */
  passosBarriga: 14,
  lados: 48,
  lacosDeArco: 16,
};

export const MATERIAIS = { terracota: { cor: '#b9683f', aspereza: 0.85 } };

const m = (mm) => mm / 1000;
const ID = { vaso: 100, cilZ: 101, cilX: 102, baixoZ: 103, baixoX: 104, cortado: 105 };

/* Desloca uma polilinha aberta (raio, altura) em `d` mm para o lado esquerdo de quem a percorre, por esquadria nos vértices. */
function deslocar(pts, d) {
  const n = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return [-dy / L, dx / L]; };
  return pts.map((p, i) => {
    const a = n(pts[Math.max(i - 1, 0)], p), b = n(p, pts[Math.min(i + 1, pts.length - 1)]);
    let [nx, ny] = i === 0 ? b : i === pts.length - 1 ? a : [a[0] + b[0], a[1] + b[1]];
    const L = Math.hypot(nx, ny); nx /= L; ny /= L;
    const k = i === 0 || i === pts.length - 1 ? 1 : 1 / Math.max(0.5, nx * a[0] + ny * a[1]);
    return [p[0] + nx * d * k, p[1] + ny * d * k];
  });
}

/** Perfil e cortes em mm. `externo` sobe do fundo do pé até o topo do lábio; `interno` desce do topo até o piso da barriga. */
export function derivar(T = TABELA) {
  const Rb = T.barrigaDiametro / 2, Rp = T.peDiametro / 2, Rn = T.pescocoDiametro / 2, Rl = T.bocaDiametro / 2;
  const yb = T.barrigaAltura, Hy = T.barrigaSemieixoY;
  const ang = (g) => (g * Math.PI) / 180;
  const elipse = [];
  for (let i = 0; i <= T.passosBarriga; i++) {
    const t = ang(T.tInicio + ((T.tFim - T.tInicio) * i) / T.passosBarriga);
    elipse.push([Rb * Math.sin(t), yb - Hy * Math.cos(t)]);
  }
  const yPesc = T.pescocoAltura, yTopo = T.altura, yLab = yTopo - T.labioAltura;
  /* o pé é uma saia levemente aberta para baixo (raio Rp na borda de baixo) */
  const saia = [[Rp, 0], [Rp - 3, T.peAltura * 0.55], [elipse[0][0], T.peAltura + 2]];
  const externo = [
    ...saia, ...elipse,
    [Rn + 3, yPesc - 12], [Rn, yPesc], [Rn, yLab - 12],
    [Rn + (Rl - Rn) * 0.45, yLab - 5], [Rl, yLab], [Rl, yTopo],
  ];
  /* interno: a parede paralela à do corpo, de cima para baixo, do topo do lábio ao piso */
  const baixo = externo.slice(saia.length - 1, externo.length - 1).reverse(); /* da boca ao fim da saia, sem o ponto do topo */
  const ponta = [Rl - T.parede, yTopo];
  const parede = deslocar([[Rl, yTopo], ...baixo], -T.parede).slice(1);
  const interno = [ponta, ...parede];
  const pisoY = interno[interno.length - 1][1];
  const raioInternoPe = Rp - T.parede;
  const perfil = [
    [0, T.rebaixoDoPe], [raioInternoPe, T.rebaixoDoPe], [raioInternoPe, 0],
    ...externo, ...interno, [0, pisoY],
  ];
  /* arcos do pé: cilindro de raio arcoLargura/2 com o topo em arcoAltura, mais a caixa abaixo do centro dele */
  const raioArco = T.arcoLargura / 2;
  const centroArco = T.arcoAltura - raioArco;
  return { perfil, externo, interno, pisoY, raioArco, centroArco, comprimento: T.peDiametro + 40 };
}

export function gerarPassos(T = TABELA) {
  const D = derivar(T);
  const passos = [];
  passos.push(['lathe', {
    origemId: ID.vaso, lados: T.lados, segmentosCurva: 3,
    perfil: D.perfil.map(([r, y]) => [m(r), m(y)]),
  }]);
  const L = D.comprimento, r = D.raioArco, c = D.centroArco;
  const larg = r * 2, baixoAlt = c + 10;
  /* cortadores: eixo em z (arcos a +/-x) e em x (arcos a +/-z); `em` dá o ponto de partida, e o cilindro é centrado pela altura. */
  passos.push(['cilindro', { origemId: ID.cilZ, eixo: 'z', raio: m(r), altura: m(L), lados: T.lacosDeArco, em: [0, m(c), m(-L / 2)] }]);
  passos.push(['cilindro', { origemId: ID.cilX, eixo: 'x', raio: m(r), altura: m(L), lados: T.lacosDeArco, em: [m(-L / 2), m(c), 0] }]);
  passos.push(['cubo', { origemId: ID.baixoZ, larg: m(larg), alt: m(baixoAlt), prof: m(L), em: [0, m(-10), 0] }]);
  passos.push(['cubo', { origemId: ID.baixoX, larg: m(L), alt: m(baixoAlt), prof: m(larg), em: [0, m(-10), 0] }]);
  const de = (op, id) => ({ origem: { op, id } });
  passos.push(['subtrair', { origemId: ID.cortado, solidos: [de('lathe', ID.vaso), { alias: 'arcoZInteiro' }, { alias: 'arcoXInteiro' }, de('cubo', ID.baixoZ), de('cubo', ID.baixoX)] }]);
  const sel = de('subtrair', ID.cortado);
  passos.push(['parte', { nome: 'vaso', sel }]);
  passos.push(['material', { usa: 'terracota', sel }]);
  passos.push(['liso', { sel, angulo: 40 }]);
  return passos;
}

const inteiro = (id) => ({ unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }] });
/* o cilindro inteiro (lateral e as duas tampas), que `subtrair` exige fechado */
export const ALIASES = [['arcoZInteiro', inteiro(ID.cilZ)], ['arcoXInteiro', inteiro(ID.cilX)]];

export const CONTATOS = [];

const receita = {
  meta: { nome: 'vaso-de-ceramica', desc: 'vaso de cerâmica terracota oco, barriga quase esférica, pescoço estreito, lábio virado e pé em saia com quatro arcos' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS,
  TOPO: { origem: 'centro do fundo do pé, no chão; y para cima' },
  PLANO: {
    objeto: 'vaso de cerâmica rústica de uma parte: barriga quase esférica, pescoço estreito, boca de lábio virado e pé em saia com quatro arcos',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total do vaso', milimetros: 200 },
    partes: [
      { nome: 'vaso', forma: 'revolução oca de 200 mm de altura e parede de 6 mm: barriga de 190 mm a 95 mm do chão, pescoço de 55 mm, boca de 75 mm com lábio virado para fora, pé em saia de 110 mm e 30 mm de altura com quatro arcos de 25 por 18 mm a 90 graus', tecnica: 'lathe do perfil da parede inteira (oco, fundo do pé rebaixado), subtrair de quatro cortadores em arco para o pé, liso com ângulo' },
    ],
    criteriosDeReprovacao: [
      'vaso maciço, sem o oco por dentro até a boca',
      'pé sem os quatro recortes ou com recortes desiguais',
      'lábio sem a dobra para fora',
      'barriga que não é a parte mais larga',
    ],
  },
  contatos: CONTATOS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
