/* pistao-de-motor — pistão de motor com pino e três anéis: cabeça com dois rebaixos de válvula, três canaletas de anel, saia lisa oca,
 * cubos do pino nas laterais e pino tubular saindo para o lado +x. Y para cima, chão em y 0, tabela em milímetro e malha em metro. */

export const TABELA = {
  diametro: 86, // o alvo: 86 mm de diâmetro (o anel é a parte mais larga)
  altura: 70, // o alvo: 70 mm de altura, da borda da saia ao topo da cabeça
  folga_saia: 0.4, // a saia e as ilhas entre canaletas ficam 0,4 mm abaixo do raio do anel
  parede: 6, // parede da saia, de dentro até a saia
  coroa: 8, // espessura da cabeça sobre a cavidade
  chanfro_topo: 1.2, // quebra da aresta do topo
  canaleta_altura: 2.4, // altura de cada canaleta de anel
  canaleta_fundo: 3.5, // profundidade de cada canaleta, do raio da saia ao fundo
  ilha_topo: 4, // ilha de topo, entre o topo da cabeça e a primeira canaleta
  ilha_entre: 2.6, // ilha entre canaletas
  anel_altura: 2.2, // altura do anel, menor que a canaleta
  lados: 48, // lados da revolução do corpo e dos anéis
  lados_pino: 32, // lados do pino e do furo dele (iguais, para as paredes coincidirem)
  rebaixo_boca: 15, // raio da boca de cada rebaixo de válvula
  rebaixo_fundo: 3.5, // profundidade do rebaixo, curvo (calota de esfera)
  rebaixo_x: 17, // centro dos rebaixos em x, para os dois lados
  pino_externo: 22, // o alvo: 22 mm de diâmetro externo
  pino_interno: 12, // o alvo: 12 mm de diâmetro interno
  folga_pino: 0.0005, // folga radial do furo sobre o pino: 0,5 micrometro, abaixo da tolerância de encosto (1 micrometro); com furo e pino de raio idêntico o ruído de ponto flutuante da subtração (6 nm) lia como invasão
  pino_y: 34, // altura do eixo do pino
  pino_ponta_dentro: 41, // ponta do lado -x, dentro do furo da saia
  pino_ponta_fora: 64, // ponta do lado +x, para fora da saia
  cubo_raio: 14, // raio externo do cubo do pino
  cubo_x0: 24, // cubo: da face de dentro...
  cubo_x1: 38, // ...até dentro da parede da saia
  cubo_alma_x1: 37, // a alma que sobe do cubo à cabeça entra na parede e o canto dela fica abaixo do fundo das canaletas
  cubo_alma_z: 10, // meia largura da alma em z
  cubo_alma_folga: 0.5, // a alma entra 0,5 mm na cabeça
};

export function derivar(T) {
  const R = T.diametro / 2;
  const Rs = R - T.folga_saia; // raio da saia
  const Rf = Rs - T.canaleta_fundo; // raio do fundo da canaleta
  const Ri = Rs - T.parede; // raio interno da cavidade
  const yTopo = T.altura;
  const yCavidade = yTopo - T.coroa;
  const canaletas = [];
  let y = yTopo - T.ilha_topo;
  for (let i = 0; i < 3; i++) {
    canaletas.push({ y1: y, y0: y - T.canaleta_altura });
    y = y - T.canaleta_altura - T.ilha_entre;
  }
  const aneis = canaletas.map((c, i) => {
    const folga = (T.canaleta_altura - T.anel_altura) / 2;
    return { nome: `anel${i + 1}`, y0: c.y0 + folga, y1: c.y1 - folga, r0: Rf, r1: R };
  });
  const perfil = [[0, yTopo], [Rs - T.chanfro_topo, yTopo], [Rs, yTopo - T.chanfro_topo]];
  for (const c of canaletas) perfil.push([Rs, c.y1], [Rf, c.y1], [Rf, c.y0], [Rs, c.y0]);
  perfil.push([Rs, 0], [Ri, 0], [Ri, yCavidade], [0, yCavidade]);
  const R_esfera = (T.rebaixo_boca ** 2 + T.rebaixo_fundo ** 2) / (2 * T.rebaixo_fundo);
  const rebaixoY = yTopo + R_esfera - T.rebaixo_fundo; // centro da esfera que corta a calota
  const pinoR = T.pino_externo / 2;
  return { R, Rs, Rf, Ri, yTopo, yCavidade, canaletas, aneis, perfil: perfil.reverse() /* do eixo de baixo para o de cima: o sentido que o lathe fecha para fora */, R_esfera, rebaixoY, pinoR };
}

const m = (mm) => mm / 1000;
const pm = (p) => p.map(([r, y]) => [m(r), m(y)]);

/** Os PASSOS, em metro. Ids: 1 corpo, 2 e 3 almas, 4 e 5 cubos do pino, 6 união, 7 e 8 rebaixos, 9 furo do pino,
 * 10 subtração, 21 a 23 anéis, 31 pino. */
export function gerarPassos(T) {
  const d = derivar(T);
  const S = (op, id) => ({ origem: { op, id } });
  const p = [];
  p.push(['lathe', { origemId: 1, perfil: pm(d.perfil), lados: T.lados }]);
  // cubos do pino e almas até a cabeça, um de cada lado em x
  const almaAlt = d.yCavidade + T.cubo_alma_folga - T.pino_y;
  [[1, 2, 4], [-1, 3, 5]].forEach(([s, idAlma, idCubo]) => {
    p.push(['cubo', { origemId: idAlma, larg: m(T.cubo_alma_x1 - T.cubo_x0), alt: m(almaAlt), prof: m(2 * T.cubo_alma_z), em: [m(s * (T.cubo_x0 + T.cubo_alma_x1) / 2), m(T.pino_y), 0] }]);
    p.push(['lathe', { origemId: idCubo, eixo: 'x', lados: T.lados_pino, perfil: pm((s > 0 ? [T.cubo_x0, T.cubo_x1] : [-T.cubo_x1, -T.cubo_x0]).flatMap((x, k, a) => (k === 0 ? [[0, x], [T.cubo_raio, x]] : [[T.cubo_raio, x], [0, x]]))), em: [0, m(T.pino_y), 0] }]);
  });
  p.push(['unir', { origemId: 6, solidos: [S('lathe', 1), S('cubo', 2), S('cubo', 3), S('lathe', 4), S('lathe', 5)] }]);
  // rebaixos de válvula: calotas de esfera tiradas da cabeça
  [-1, 1].forEach((s, i) => {
    p.push(['esfera', { origemId: 7 + i, raio: m(d.R_esfera), aneis: 16, lados: 32, em: [m(s * T.rebaixo_x), m(d.rebaixoY - d.R_esfera), 0] }]);
  });
  // furo do pino: a mesma revolução do pino, por dentro, para as paredes coincidirem
  p.push(['lathe', { origemId: 9, eixo: 'x', lados: T.lados_pino, perfil: pm([[0, -T.pino_ponta_fora], [d.pinoR + T.folga_pino, -T.pino_ponta_fora], [d.pinoR + T.folga_pino, T.pino_ponta_fora], [0, T.pino_ponta_fora]]), em: [0, m(T.pino_y), 0] }]);
  p.push(['subtrair', { origemId: 10, solidos: [S('unir', 6), S('esfera', 7), S('esfera', 8), S('lathe', 9)] }]);
  p.push(['parte', { nome: 'pistao', sel: S('subtrair', 10) }]);
  // anéis nas canaletas
  d.aneis.forEach((a, i) => {
    const id = 21 + i;
    p.push(['lathe', { origemId: id, lados: T.lados, perfil: pm([[a.r0, a.y0], [a.r1, a.y0], [a.r1, a.y1], [a.r0, a.y1], [a.r0, a.y0]]) }]);
    p.push(['parte', { nome: 'aneis', sel: S('lathe', id) }]);
  });
  // pino tubular, com o furo de dentro, saindo para +x
  const ri = T.pino_interno / 2;
  p.push(['lathe', { origemId: 31, eixo: 'x', lados: T.lados_pino, perfil: pm([[ri, -T.pino_ponta_dentro], [d.pinoR, -T.pino_ponta_dentro], [d.pinoR, T.pino_ponta_fora], [ri, T.pino_ponta_fora], [ri, -T.pino_ponta_dentro]]), em: [0, m(T.pino_y), 0] }]);
  p.push(['parte', { nome: 'pino', sel: S('lathe', 31) }]);
  return p;
}

export const CONTATOS = [
  { par: ['pistao', 'pino'], motivo: 'o pino de 22 mm assenta no furo de 22 mm dos cubos e da saia: a parede do furo é a parede externa do pino' },
  { par: ['pistao', 'aneis'], motivo: 'o lado de dentro de cada anel assenta no fundo da canaleta, no mesmo raio' },
];

export const PLANO = {
  objeto: 'pistão de motor de 86 mm de diâmetro e 70 mm de altura, oco, com cabeça de dois rebaixos de válvula, três canaletas de anel com os anéis, saia lisa, cubos do pino e pino tubular saindo para o lado +x',
  referencias: ['referencias/alvo.md', 'referencias/locais/prancha.jpg'],
  escala: { medida: 'diâmetro do pistão nos anéis', milimetros: 86 },
  partes: [
    { nome: 'pistao', forma: 'corpo de revolução oco de y 0 a 70, saia lisa de raio 42,6 e três canaletas de 2,4 por 3,5 mm de y 53,6 a 66, cabeça de 8 mm com dois rebaixos curvos rasos, cubos do pino em x ±24 a ±38 e furo de 22 mm em y 34', tecnica: 'lathe de seção fechada oca, unir com os cubos do pino e subtrair as calotas de esfera dos rebaixos e o furo do pino', dePerto: [{ ponto: [17, 70, 0], oQue: 'rebaixo de válvula raso e curvo na cabeça' }, { ponto: [42, 60, 0], oQue: 'canaletas dos anéis e anéis sobre a saia' }] },
    { nome: 'pino', forma: 'tubo de 22 mm externo e 12 mm interno, eixo em x na altura 34, de x -41 a 64, saindo 21 mm para o lado +x', tecnica: 'lathe de eixo x de seção em anel' },
    { nome: 'aneis', forma: 'três anéis de 2,2 mm de altura de raio 39,1 a 43 mm, um em cada canaleta, saindo 0,4 mm da saia', tecnica: 'um lathe de seção retangular por anel, com o lado de dentro no fundo da canaleta' },
  ],
  criteriosDeReprovacao: [
    'pistão maciço: a cavidade por dentro da saia precisa existir',
    'canaletas sem os anéis, ou anéis que atravessam o pistão',
    'pino fora do eixo do furo do pino',
    'cabeça plana sem os dois rebaixos de válvula',
  ],
};

const receita = {
  meta: { nome: 'pistao-de-motor', desc: 'pistão de motor oco com dois rebaixos, três anéis e pino tubular' },
  PARAMS: TABELA,
  MATERIAIS: {},
  TOPO: { origem: 'chão, no eixo do pistão em x e z; y para cima, o pino sai para +x' },
  PLANO,
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const d = derivar(T);
    return [
      { nome: 'topo da cabeça', parte: 'pistao', medida: 'maximo', em: [d.Rs, T.altura, d.Rs], toleranciaMm: 1 },
      { nome: 'ponta do pino', parte: 'pino', medida: 'maximo', em: [T.pino_ponta_fora, T.pino_y + d.pinoR, d.pinoR], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
