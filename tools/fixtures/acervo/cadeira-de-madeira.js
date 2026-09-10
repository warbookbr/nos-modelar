/* cadeira-de-madeira.js — cadeira de jantar em madeira, realista e econômica.
 *
 * Exemplo de autoria, não referência de engenharia de mobiliário.
 *
 * Escolhida de propósito como objeto de prova: a cadeira faz três exigências
 * que nem o carro nem a prensa fizeram a este repositório — simetria parcial
 * (bilateral, mas frente diferente de trás), junção de peças finas em ângulo,
 * e um encosto que precisa curvar sem virar caixa.
 *
 * ECONOMIA DECLARADA. Todo volume desta peça é planar por escolha, não por
 * limitação: perna, travessa e ripa são caixas chanfradas em vez de cilindros.
 * Madeira maciça torneada num torno tem faceta; madeira serrada não tem curva.
 * O chanfro dá a quebra de luz que faz ler como madeira, a um custo de vértice
 * que um cilindro de 16 lados não daria. As únicas curvas reais estão onde a
 * mão encosta: quina dianteira do assento e topo do encosto.
 *
 * CONVENÇÃO DE `em`, medida e não suposta: X e Z são o CENTRO da caixa, Y é a
 * BASE — a caixa cresce para cima a partir de `em`. Supor centro nos três eixos
 * põe a peça a meia altura no ar; foi o primeiro defeito desta receita, pego
 * pela medida da caixa envolvente antes de qualquer render.
 *
 * SIMETRIA. O lado direito é autorado e o esquerdo vem por `espelha` em X.
 * Isso não é só economia de vértice — é economia de ERRO: uma correção na
 * perna direita não pode divergir da esquerda porque só existe uma autoria.
 */

import { criarCaminhoSimetrico } from '../../../src/autoria/caminho-simetrico.js';

const P = {
  /* Perfil ativo: 'jogo' (geometria externa limpa para real-time 3D) ou
     'marcenaria' (espigas técnicas para fabricação e exportação CAD/STEP). */
  perfil: 'jogo',

  /* Medidas de cadeira de jantar adulta, em metros. Altura de assento 0,45 é a
     convenção que faz o pé apoiar no chão; o encosto termina em 0,89 porque
     acima disso a cadeira lê como cadeira de escritório. */
  assento: { larg: 0.44, prof: 0.42, esp: 0.032, altura: 0.45 },
  perna: { secaoTopo: 0.040, secaoPe: 0.030, chanfro: 0.004 },
  saia: { alt: 0.055, esp: 0.020 },
  /* Travessas escalonadas (staggered): lateral a 13 cm e transversais a 17 cm,
     evitando conflito estrutural em 90° dentro da perna. */
  travessa: { esp: 0.020, alt: 0.032, alturaLateral: 0.13, alturaTransversal: 0.17 },
  encosto: { altura: 0.89, ripas: 5, ripaLarg: 0.026, ripaEsp: 0.016, reclinacaoGraus: -4 },
  travessaTopo: { alt: 0.070, esp: 0.024 },
  espiga: { profundidade: 0.015 },
};

export function gerarPassos(params = P) {
  const cfg = { ...P, ...params };
  const mx = cfg.assento.larg / 2;
  const mz = cfg.assento.prof / 2;
  const recuo = 0.035;
  const px = mx - recuo;
  const pz = mz - recuo;
  const yAssento = cfg.assento.altura;
  const marcenaria = cfg.perfil === 'marcenaria';

  /* Vão livre exato entre as faces internas das pernas (zero invasão e sem folga visível):
     - Pernas dianteiras: centro em [px, y, pz], seção 0.030 -> face interna em X = px - 0.015 = 0.170, em Z = pz - 0.015 = 0.160.
     - Pernas traseiras: centro em [px, y, -pz], seção 0.040 -> face interna em X = px - 0.020 = 0.165, em Z = -pz + 0.020 = -0.155.
     
     Portanto:
     - Vão livre frontal (entre pernas dianteiras): 2 * 0.170 = 0.340 m.
     - Vão livre traseiro (entre pernas traseiras): 2 * 0.165 = 0.330 m.
     - Vão livre lateral (entre dianteira e traseira): 0.160 - (-0.155) = 0.315 m, com centro em Z = +0.0025 m. */
  const largTravessaFrontal = 2 * (px - cfg.perna.secaoPe / 2); // 0.340
  const largTravessaTraseira = 2 * (px - cfg.perna.secaoTopo / 2); // 0.330
  const largSaiaFrontal = 2 * (px - cfg.perna.secaoPe / 2); // 0.340
  const largSaiaTraseira = 2 * (px - cfg.perna.secaoTopo / 2); // 0.330
  const profVaoLateral = (pz - cfg.perna.secaoPe / 2) - (-pz + cfg.perna.secaoTopo / 2); // 0.315
  const zCentroLateral = ((pz - cfg.perna.secaoPe / 2) + (-pz + cfg.perna.secaoTopo / 2)) / 2; // 0.0025

  const secao8 = (largA, largB, c = 0.003) => {
    const ha = largA / 2, hb = largB / 2;
    return [
      [ha - c, hb], [-(ha - c), hb],
      [-ha, hb - c], [-ha, -(hb - c)],
      [-(ha - c), -hb], [ha - c, -hb],
      [ha, -(hb - c)], [ha, hb - c],
    ];
  };

  const yTopo = cfg.encosto.altura;
  const zTopo = -pz;
  const caimentoY = 0.009;
  const sweepZ = 0.016;

  /* 1. Perna Traseira com Afunilamento Progressivo (Tapering):
     30 mm no pé, reforço de 38 mm na união com o assento e afunila para 24 mm
     no encontro com a travessa de topo, terminando em junta coplanar horizontal. */
  const yEncontro = yTopo - 0.035;
  const zEncontro = -pz - 0.010;

  const secoesPernaTraseira = [
    { pos: [px, 0, -pz], contorno: secao8(0.030, 0.030, 0.003) },
    { pos: [px, yAssento, -pz], contorno: secao8(0.038, 0.038, 0.004) },
    { pos: [px, 0.68, -pz - 0.006], contorno: secao8(0.030, 0.028, 0.003) },
    { pos: [px, yEncontro, zEncontro], contorno: secao8(0.024, 0.024, 0.003) },
  ];

  /* 2. Travessa de Topo Esculpida (Crest Rail) gerada por espelhamento simétrico:
     Modelada a partir do centro (x = 0) até o extremo direito (x = px) e espelhada
     automaticamente para a esquerda, garantindo simetria perfeita em ambos os lados.
     As pontas descem verticalmente alinhadas com o topo das pernas traseiras,
     eliminando 100% de qualquer fresta ou corte inclinado. */
  /* 2. Travessa de Topo Esculpida (Crest Rail) gerada por espelhamento simétrico:
     Consome criarCaminhoSimetrico() declarando apenas do centro (x = 0) até a ponta (x = px),
     com descida vertical que sela 100% a junta contra a perna traseira. */
  const secoesTopo = criarCaminhoSimetrico({
    eixo: 'x',
    meioPerfil: [
      { pos: [0, yTopo - 0.008, zTopo - sweepZ], contorno: secao8(0.020, 0.046, 0.003) },
      { pos: [px * 0.45, yTopo - 0.004, zTopo - sweepZ * 0.75], contorno: secao8(0.021, 0.048, 0.003) },
      { pos: [px - 0.028, yTopo + 0.002, zTopo - sweepZ * 0.25], contorno: secao8(0.022, 0.046, 0.003) },
      { pos: [px - 0.006, yTopo - 0.008, zEncontro], contorno: secao8(0.023, 0.032, 0.003) },
      { pos: [px, yEncontro + 0.008, zEncontro], contorno: secao8(0.024, 0.024, 0.003) },
      { pos: [px, yEncontro - 0.002, zEncontro], contorno: secao8(0.024, 0.024, 0.003) },
    ],
  });

  /* 3. Ripas com Spline Cúbica G2 (6 seções de tangência contínua):
     Curva anatômica contínua sem quebras ou "joelhos", com cantos almofadados. */
  const criarSecoesRipa = (x) => {
    const r = Math.abs(x) / px;
    const yMax = yTopo - 0.025 - (1 - r * 0.8) * caimentoY;
    const zBase = zTopo - 0.003 - (1 - r) * 0.004;
    const zLombar1 = zTopo - 0.012 - (1 - r) * 0.006;
    const zLombar2 = zTopo - 0.020 - (1 - r) * 0.008;
    const zTorax1 = zTopo - 0.014 - (1 - r) * 0.007;
    const zTorax2 = zTopo - 0.007 - (1 - r) * 0.005;
    const zTopoR = zTopo - (1 - r * 0.7) * sweepZ;
    return [
      { pos: [x, yAssento + cfg.assento.esp, zBase], contorno: secao8(0.026, 0.016, 0.003) },
      { pos: [x, 0.54, zLombar1], contorno: secao8(0.025, 0.015, 0.003) },
      { pos: [x, 0.62, zLombar2], contorno: secao8(0.025, 0.015, 0.003) },
      { pos: [x, 0.71, zTorax1], contorno: secao8(0.024, 0.015, 0.003) },
      { pos: [x, 0.79, zTorax2], contorno: secao8(0.024, 0.015, 0.003) },
      { pos: [x, yMax, zTopoR], contorno: secao8(0.024, 0.016, 0.003) },
    ];
  };

  return [
    /* ---------- pernas traseiras afuniladas ----------
       Sobe esbelta do assento ao topo com conicidade elegante de marcenaria fina. */
    ['loft', { origemId: 10, lados: 8, orientacao: [0, 0, 1], secoes: secoesPernaTraseira }],
    ['parte', { nome: 'pernaTraseira', sel: { origem: { op: 'loft', id: 10 } } }],

    /* ---------- pernas dianteiras ----------
       Param no assento. Seção menor que a traseira porque não carregam momento
       de encosto — é a diferença que faz a cadeira não parecer quatro postes. */
    ['chamferBox', {
      origemId: 11,
      larg: cfg.perna.secaoPe, prof: cfg.perna.secaoPe, alt: yAssento,
      chanfro: cfg.perna.chanfro,
      em: [px, 0, pz],
    }],
    ['parte', { nome: 'pernaDianteira', sel: { origem: { op: 'chamferBox', id: 11 } } }],

    /* ---------- travessa lateral inferior (escalonada a 13 cm) ----------
       Mais baixa que as transversais para não perfurar o mesmo nó de madeira. */
    ['chamferBox', {
      origemId: 12,
      larg: cfg.travessa.esp, alt: cfg.travessa.alt, prof: profVaoLateral,
      chanfro: 0.002,
      em: [px, cfg.travessa.alturaLateral, zCentroLateral],
    }],
    ['parte', { nome: 'travessaLateral', sel: { origem: { op: 'chamferBox', id: 12 } } }],

    /* ---------- saia lateral (apron) superior ----------
       Caixilho estrutural sob o assento que trava as pernas e suporta o tampo. */
    ['chamferBox', {
      origemId: 13,
      larg: cfg.saia.esp, alt: cfg.saia.alt, prof: profVaoLateral,
      chanfro: 0.002,
      em: [px, yAssento - cfg.saia.alt, zCentroLateral],
    }],
    ['parte', { nome: 'saiaLateral', sel: { origem: { op: 'chamferBox', id: 13 } } }],

    /* ---------- espelho: o lado esquerdo inteiro ----------
       A cópia HERDA a parte da fonte (`nf.parte = f.parte` no núcleo). */
    ['espelha', {
      origemId: 20, eixo: 'x', pos: 0,
      derivaDe: { op: 'loft', id: 10 },
      sel: { origem: { op: 'loft', id: 10 } },
    }],

    ['espelha', {
      origemId: 21, eixo: 'x', pos: 0,
      derivaDe: { op: 'chamferBox', id: 11 },
      sel: { origem: { op: 'chamferBox', id: 11 } },
    }],

    ['espelha', {
      origemId: 22, eixo: 'x', pos: 0,
      derivaDe: { op: 'chamferBox', id: 12 },
      sel: { origem: { op: 'chamferBox', id: 12 } },
    }],

    ['espelha', {
      origemId: 23, eixo: 'x', pos: 0,
      derivaDe: { op: 'chamferBox', id: 13 },
      sel: { origem: { op: 'chamferBox', id: 13 } },
    }],

    /* ---------- travessas transversais inferiores (escalonadas a 17 cm) ---------- */
    ['chamferBox', {
      origemId: 30,
      larg: largTravessaFrontal, alt: cfg.travessa.alt, prof: cfg.travessa.esp,
      chanfro: 0.002,
      em: [0, cfg.travessa.alturaTransversal, pz],
    }],
    ['parte', { nome: 'travessaFrontal', sel: { origem: { op: 'chamferBox', id: 30 } } }],

    ['chamferBox', {
      origemId: 31,
      larg: largTravessaTraseira, alt: cfg.travessa.alt, prof: cfg.travessa.esp,
      chanfro: 0.002,
      em: [0, cfg.travessa.alturaTransversal, -pz],
    }],
    ['parte', { nome: 'travessaTraseira', sel: { origem: { op: 'chamferBox', id: 31 } } }],

    /* ---------- saias transversais superiores (apron) ---------- */
    ['chamferBox', {
      origemId: 32,
      larg: largSaiaFrontal, alt: cfg.saia.alt, prof: cfg.saia.esp,
      chanfro: 0.002,
      em: [0, yAssento - cfg.saia.alt, pz],
    }],
    ['parte', { nome: 'saiaFrontal', sel: { origem: { op: 'chamferBox', id: 32 } } }],

    ['chamferBox', {
      origemId: 33,
      larg: largSaiaTraseira, alt: cfg.saia.alt, prof: cfg.saia.esp,
      chanfro: 0.002,
      em: [0, yAssento - cfg.saia.alt, -pz],
    }],
    ['parte', { nome: 'saiaTraseira', sel: { origem: { op: 'chamferBox', id: 33 } } }],

    /* ---------- assento ----------
       Placa sobre as pernas e a saia caixilho. Quina dianteira arredondada. */
    ['cubo', {
      origemId: 40,
      larg: cfg.assento.larg, alt: cfg.assento.esp, prof: cfg.assento.prof,
      em: [0, yAssento, 0],
    }],
    ['parte', { nome: 'assento', sel: { origem: { op: 'cubo', id: 40 } } }],
    ['arredondarAresta', {
      origemId: 41, de: { op: 'cubo', id: 40, face: 'topo' },
      aresta: 0, raio: 0.012, paineis: 3,
    }],

    /* ---------- encosto: 5 ripas anatômicas com curvatura em S ----------
       Ripas esguias com perfil chanfrado que acompanham a coluna humana (reclinadas
       na lombar, inflexão torácica e alinhamento sob o arco da travessa de topo). */
    ['loft', { origemId: 50, lados: 8, orientacao: [1, 0, 0], secoes: criarSecoesRipa(0) }],
    ['parte', { nome: 'ripaEncosto', sel: { origem: { op: 'loft', id: 50 } } }],

    ['loft', { origemId: 51, lados: 8, orientacao: [1, 0, 0], secoes: criarSecoesRipa(0.056) }],
    ['parte', { nome: 'ripaEncosto', sel: { origem: { op: 'loft', id: 51 } } }],

    ['loft', { origemId: 52, lados: 8, orientacao: [1, 0, 0], secoes: criarSecoesRipa(0.112) }],
    ['parte', { nome: 'ripaEncosto', sel: { origem: { op: 'loft', id: 52 } } }],

    ['espelha', { origemId: 53, eixo: 'x', pos: 0, derivaDe: { op: 'loft', id: 51 }, sel: { origem: { op: 'loft', id: 51 } } }],
    ['espelha', { origemId: 54, eixo: 'x', pos: 0, derivaDe: { op: 'loft', id: 52 }, sel: { origem: { op: 'loft', id: 52 } } }],

    /* ---------- travessa de topo: arqueamento 3D esculpido em arco ----------
       Crest rail contínuo em marcenaria fina: caimento côncavo central no plano XY
       e curvatura para trás em Z que abraça o topo dos montantes em concordância. */
    ['loft', { origemId: 60, lados: 8, orientacao: [0, 0, 1], secoes: secoesTopo }],
    ['parte', { nome: 'travessaTopo', sel: { origem: { op: 'loft', id: 60 } } }],

    /* ---------- acabamento ---------- */
    ['material', { usa: 'carvalho', sel: { grupo: 'assento' } }],
    ['material', { usa: 'carvalho', sel: { grupo: 'travessaTopo' } }],
    ['material', { usa: 'carvalho', sel: { grupo: 'ripaEncosto' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'pernaTraseira' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'pernaDianteira' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'travessaLateral' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'travessaFrontal' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'travessaTraseira' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'saiaLateral' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'saiaFrontal' } }],
    ['material', { usa: 'carvalhoEscuro', sel: { grupo: 'saiaTraseira' } }],
  ];
}

export const receitaCadeiraDeMadeira = {
  meta: { nome: 'Cadeira de Madeira', versao: '1.2.0', autor: 'Mecanifica Procedural AI' },

  PARAMS: P,

  /* Marcenaria: assento apoiado na estrutura, saias e travessas encaixadas nas
     pernas. Nenhum destes pares atravessa o outro; todos apenas encostam. */
  contatos: [
    { par: ['assento', 'pernaDianteira'], motivo: 'o assento apoia sobre o topo da perna' },
    { par: ['assento', 'saiaFrontal'], motivo: 'a saia frontal sustenta a borda do assento' },
    { par: ['assento', 'saiaLateral'], motivo: 'a saia lateral sustenta a borda do assento' },
    { par: ['assento', 'saiaTraseira'], motivo: 'a saia traseira sustenta a borda do assento' },
    { par: ['pernaDianteira', 'saiaFrontal'], motivo: 'a saia frontal encaixa na perna dianteira' },
    { par: ['pernaDianteira', 'saiaLateral'], motivo: 'a saia lateral encaixa na perna dianteira' },
    { par: ['pernaDianteira', 'travessaFrontal'], motivo: 'a travessa frontal trava as duas pernas' },
    { par: ['pernaDianteira', 'travessaLateral'], motivo: 'a travessa lateral trava as duas pernas' },
  ],

  TOPO: {
    /* Decisões que reconstroem a topologia, não resultados dela. */
    simetria: 'bilateral em X; lado direito autorado, esquerdo espelhado',
    volumesPlanares: 'perna, travessa, saia e ripa por chamferBox — marcenaria fina chanfrada',
    curvasReais: ['quinas do assento', 'topo do encosto', 'reclinacao ergonomica lombar'],
    apoio: 'quatro pernas em y=0; o chão é o plano de apoio',
    perfisDisponiveis: ['jogo', 'marcenaria'],
  },

  MATERIAIS: {
    carvalho: { cor: '#c89a65', metalicidade: 0.0, aspereza: 0.62 },
    carvalhoEscuro: { cor: '#9c6f3d', metalicidade: 0.0, aspereza: 0.65 },
  },

  get PASSOS() {
    return gerarPassos(this.PARAMS ?? P);
  },
};

export const receitaCadeiraJogo = {
  ...receitaCadeiraDeMadeira,
  meta: { ...receitaCadeiraDeMadeira.meta, nome: 'Cadeira de Madeira (Jogo)' },
  PARAMS: { ...P, perfil: 'jogo' },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export const receitaCadeiraMarcenaria = {
  ...receitaCadeiraDeMadeira,
  meta: { ...receitaCadeiraDeMadeira.meta, nome: 'Cadeira de Madeira (Marcenaria)' },
  PARAMS: { ...P, perfil: 'marcenaria' },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaCadeiraDeMadeira;
