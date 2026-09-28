/* braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura:
 * um colar redondo, um corpo com planta em "D" e o tambor da junta.
 *
 * Terceira etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md`, e o rascunho dela em
 * `../../referencias/ombro-rascunho2-*.png`; os passos são escritos pelo
 * modelador. O raio do colar vem da porta `topo` do anel, por vínculo da
 * montagem, e o corpo segue esse raio.
 *
 * A forma anterior, um cotovelo de cano, foi reprovada pela pessoa depois de
 * três rodadas; as duas julgadas estão em `rodadas/` como histórico.
 *
 * Portas que a receita publica:
 *   apoio        — anel que ocupa, eixo +Y, centro no meio da face de baixo do
 *                  colar, borda de baixo do colar. Senta no `topo` do anel.
 *   juntaDoOmbro — cilindro, eixo +Z, centro no meio da face da frente do
 *                  tambor, raio do tambor. O `braco` se prende aqui.
 *
 * Regra das portas de apoio do braço: quem recebe publica a face inteira,
 * de raio interno zero ao raio da face, numa faixa de 5 mm para dentro da
 * peça; quem se apoia publica só a borda de baixo, uma faixa de 10 mm de
 * largura até o raio dela e 5 mm para dentro dela. A montagem confere que a
 * borda inteira está sobre a face, sem fresta e no mesmo eixo.
 */

export const TABELA = {
  raioDoColar: 105,
  alturaDoColar: 30,
  /* Distância, em Z, do eixo vertical da cintura até a face plana do bloco
     da frente do corpo, onde o tambor encosta. */
  frenteDoBloco: 125,
  /* Altura do topo plano do corpo, medida da face de baixo do colar. */
  alturaDoTopo: 240,
  /* A rampa de trás começa no eixo vertical e desce, abaulada, até esta
     altura na borda de trás. */
  alturaDaRampaAtras: 120,
  raioDoTambor: 150,
  espessuraDoTambor: 40,
  /* Altura do eixo do tambor, no meio da face do bloco. */
  alturaDoEixo: 135,
  /* Acabamento, escolhido pelo modelador. */
  chanfroDoColar: 3,
  suaveDoChanfro: 0.8,
  filDoTambor: 6,
  /* Expoente da superelipse da rampa: 2 é quarto de elipse, acima de 1 é
     sempre convexa; 1,7 desce sem chegar a parede vertical atrás. */
  curvaDaRampa: 1.7,
  /* Recuo da estação de trás do corpo, para a ponta do D não virar seção de
     largura nula. */
  recuoDaPonta: 1,
  expoenteSecao: 14,
  ladosDaSecao: 32,
  estacoesDoArco: 12,
  lados: 40,
};

const m = (mm) => mm / 1000;
const ID = { colar: 100, corpo: 200, tambor: 300 };

export function derivar(t = TABELA) {
  return {
    R: m(t.raioDoColar), hc: m(t.alturaDoColar), zf: m(t.frenteDoBloco),
    yt: m(t.alturaDoTopo), yr: m(t.alturaDaRampaAtras), Rt: m(t.raioDoTambor),
    et: m(t.espessuraDoTambor), ye: m(t.alturaDoEixo), c: m(t.chanfroDoColar),
    s: m(t.suaveDoChanfro), ft: m(t.filDoTambor), recuo: m(t.recuoDaPonta),
  };
}

export function gerarPassos(t = TABELA) {
  const { R, hc, zf, yt, yr, Rt, et, ye, c, s, ft, recuo } = derivar(t);
  const passos = [];
  const n = t.estacoesDoArco;
  const zTras = -(R - recuo);
  /* Estações do arco de trás em passos iguais de ângulo, medido do eixo -Z,
     da ponta recuada até o eixo; passo igual de ângulo deixa a faceta do arco
     do mesmo tamanho em toda a volta. */
  const phi0 = Math.acos(-zTras / R);
  const zArco = Array.from({ length: n + 1 }, (_, k) => -R * Math.cos(phi0 + (k / n) * (Math.PI / 2 - phi0)));
  zArco[n] = 0;
  const xArco = (z) => Math.sqrt(Math.max(R * R - z * z, 0));
  const p = t.curvaDaRampa;
  const yRampa = (z) => yr + (yt - yr) * Math.pow(Math.max(1 - Math.pow(Math.abs(z) / R, p), 0), 1 / p);

  /* colar: faixa com chanfro nas duas bordas; o de baixo forma a linha escura
     com o chanfro de cima do anel. */
  passos.push(['lathe', {
    origemId: ID.colar, lados: t.lados, segmentosCurva: 3,
    perfil: [[0, 0], [R - c, 0, s], [R, c, s], [R, hc - c, s], [R - c, hc, s], [0, hc]],
  }]);
  passos.push(['parte', { nome: 'colar', sel: { origem: { op: 'lathe', id: ID.colar } } }]);

  /* corpo: silhueta lateral (z×y) cruzada com a planta em D (z×x). */
  const lado = [[zTras, hc], [zf, hc], [zf, yt], [0, yt]];
  for (let k = n - 1; k >= 0; k--) lado.push([zArco[k], yRampa(zArco[k])]);
  const topo = [[zf, -R], [zf, R], [0, R]];
  for (let k = n - 1; k >= 0; k--) topo.push([zArco[k], xArco(zArco[k])]);
  for (let k = 0; k < n; k++) topo.push([zArco[k], -xArco(zArco[k])]);
  topo.push([0, -R]);
  const vao = zf - zTras;
  const estacoes = zArco.map((z) => (z - zTras) / vao);
  estacoes.push((zf / 2 - zTras) / vao, 1);
  passos.push(['inflate', {
    origemId: ID.corpo, modo: 'secoes', contornoLado: lado, contornoTopo: topo,
    estacoes, lados: t.ladosDaSecao, expoenteSecao: t.expoenteSecao,
  }]);
  passos.push(['parte', { nome: 'corpo', sel: { origem: { op: 'inflate', id: ID.corpo } } }]);

  /* tambor: disco de eixo Y com filete só na borda de cima, girado para +Z
     e levado ao eixo, encostado na face plana do corpo. */
  passos.push(['lathe', {
    origemId: ID.tambor, lados: t.lados, segmentosCurva: 3,
    perfil: [[0, 0], [Rt, 0, s], [Rt, et, ft], [0, et]],
  }]);
  const selT = { origem: { op: 'lathe', id: ID.tambor } };
  passos.push(['rotaciona', { eixo: 'x', graus: 90, pivo: [0, 0, 0], sel: selT }]);
  passos.push(['transladar', { d: [0, ye, zf], sel: selT }]);
  passos.push(['parte', { nome: 'tambor', sel: selT }]);

  passos.push(['publicarPorta', {
    nome: 'apoio', de: { op: 'lathe', id: ID.colar },
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['publicarPorta', {
    nome: 'juntaDoOmbro', de: selT.origem,
    interface: { forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [0, ye, zf + et], raio: Rt, inicio: 0, fim: 0.005 },
  }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.colar } } }]);
  passos.push(['liso', { sel: selT }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro do braço robótico: colar, corpo em D e tambor' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro da face de baixo do colar; y para cima, a face do tambor para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico: gira com a cintura e carrega a junta do ombro, de eixo horizontal',
    referencias: [
      '../../referencias/lateral.png',
      '../../referencias/ombro-rascunho2-arame-costas.png',
      '../../referencias/ombro-rascunho2-arame-lado.png',
      '../../referencias/ombro-rascunho2-arame-perspectiva.png',
      '../../referencias/ombro-rascunho2-arame-tras.png',
      '../../referencias/ombro-rascunho2-colar-e-corpo.png',
      '../../referencias/ombro-rascunho2-corpo-cima.png',
      '../../referencias/ombro-rascunho2-corpo-frente.png',
      '../../referencias/ombro-rascunho2-corpo-lado.png',
    ],
    escala: { medida: 'diâmetro do anel da cintura, onde o colar assenta', milimetros: 210 },
    partes: [
      { nome: 'colar', forma: 'cilindro baixo, 30 mm, com o diâmetro do anel e chanfro na borda de cima; o topo tem o diâmetro do corpo e os dois parecem uma peça só', tecnica: 'revolução com perfil' },
      { nome: 'corpo', forma: 'bloco com planta em D, reto na frente e redondo atrás no raio do colar; topo plano, face da frente plana 20 mm além do colar, rampa abaulada descendo atrás', tecnica: 'cruzamento de silhueta lateral e planta' },
      { nome: 'tambor', forma: 'disco de eixo Z encostado na face plana do corpo, 300 mm de diâmetro e 40 mm de espessura, cobrindo a face quadrada inteira vista de frente', tecnica: 'revolução com perfil' },
    ],
    criteriosDeReprovacao: [
      'quinas da face quadrada do corpo aparecendo atrás do tambor na vista de frente',
      'colar com diâmetro diferente do anel ou do corpo, formando degrau na junção',
      'corpo redondo na frente, ou quadrado atrás, invertendo a planta em D',
      'rampa de trás reta ou côncava, ou topo do corpo que não é plano',
      'face do tambor que não aponta para +Z, ou eixo fora da horizontal',
      'parte de uma peça aparecendo por baixo ou por trás de outra onde não deveria',
    ],
  },
  contatos: [
    { par: ['colar', 'corpo'], motivo: 'o corpo sai do topo do colar, com o mesmo diâmetro atrás' },
    { par: ['corpo', 'tambor'], motivo: 'o tambor encosta na face plana da frente do corpo' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
