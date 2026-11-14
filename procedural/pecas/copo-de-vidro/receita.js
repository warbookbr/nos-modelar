/* Copo baixo de vidro: uma parte de revolução. Perfil (raio, altura) em mm na `derivar`, girado por `lathe`. */
export const TABELA = {
  altura: 90,
  diametro_boca: 80,
  diametro_base: 70,
  parede: 3,
  fundo: 12,
  raio_canto_fundo_dentro: 6,
  raio_canto_fundo_fora: 2,
  raio_borda: 1.4,
  lados: 64,
  segmentos_curva: 8,
  angulo_liso: 40,
};

/* Perfil da seção, de baixo para cima pelo lado de fora e de volta pelo de dentro; terceiro número = raio de concordância no canto. */
export function derivar(T) {
  const rBoca = T.diametro_boca / 2;
  const rBase = T.diametro_base / 2;
  const inclina = (y) => rBase + ((rBoca - rBase) * y) / T.altura;
  const rDentroBoca = rBoca - T.parede;
  const rDentroFundo = rDentroBoca - ((rBoca - rBase) * (T.altura - T.fundo)) / T.altura;
  const perfil = [
    [0, 0],
    [rBase, 0, T.raio_canto_fundo_fora],
    [rBoca, T.altura, T.raio_borda],
    [rDentroBoca, T.altura, T.raio_borda],
    [rDentroFundo, T.fundo, T.raio_canto_fundo_dentro],
    [0, T.fundo],
  ];
  return { perfil, rBoca, rBase, rDentroBoca, rDentroFundo, inclina };
}

const m = (mm) => mm / 1000;

export function gerarPassos(T) {
  const { perfil } = derivar(T);
  const perfilM = perfil.map(([r, y, c]) => (c === undefined ? [m(r), m(y)] : [m(r), m(y), m(c)]));
  const sel = { origem: { op: 'lathe', id: 1 } };
  return [
    ['lathe', { origemId: 1, perfil: perfilM, lados: T.lados, segmentosCurva: T.segmentos_curva }],
    ['parte', { nome: 'copo', sel }],
    ['material', { sel, usa: 'vidro' }],
    ['liso', { angulo: T.angulo_liso, sel }],
  ];
}

export const CONTATOS = [];

const receita = {
  meta: { nome: 'copo-de-vidro', desc: 'copo baixo de vidro liso, uma peca de revolucao com parede de 3 mm e fundo maciço de 12 mm' },
  PARAMS: TABELA,
  MATERIAIS: { vidro: { tipo: 'liso', cor: '#d6e8f0' } },
  TOPO: { origem: 'centro da face de baixo do copo, no chao; y para cima, eixo de revolucao em y' },
  PLANO: {
    objeto: 'copo baixo de vidro liso, 90 mm de altura, 80 mm de boca e 70 mm de base, parede de 3 mm, fundo maciço de 12 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da peça', milimetros: 90 },
    partes: [
      {
        nome: 'copo',
        forma: 'corpo de revolução afinando em reta da boca (80) à base (70), parede de 3 mm, fundo de dentro plano em y 12 com canto raio 6, borda em meia-cana, canto de baixo de fora raio 2',
        tecnica: 'lathe de um perfil (raio, altura) com concordâncias nos cantos, seguido de liso por ângulo',
      },
    ],
    criteriosDeReprovacao: [
      'parede ou fundo sem espessura (maciço ou casca)',
      'quina viva na borda ou no fundo',
      'interior que não chega a 12 mm do chão',
      'boca menor que a base',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'borda de fora na boca', parte: 'copo', medida: 'maximo', em: [T.diametro_boca / 2, T.altura, T.diametro_boca / 2], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
