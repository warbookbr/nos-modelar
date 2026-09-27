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

import { BLOCO } from '../../../../../nucleo/entrada.js';

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
  raioDoTambor: 160,
  espessuraDoTambor: 40,
  /* Altura do eixo do tambor, no meio da face do bloco. */
  alturaDoEixo: 135,
  /* Acabamento, escolhido pelo modelador. */
  chanfroDoColar: 3,
  /* O chanfro de cima é pequeno, para o topo do colar quase ter o raio do
     corpo e a linha do encontro continuar legível sem degrau. */
  chanfroDeCimaDoColar: 1.5,
  suaveDoChanfro: 0.8,
  suaveDoChanfroDeCima: 0.5,
  filDoTambor: 6,
  /* Expoente da superelipse da rampa: 2 é quarto de elipse, acima de 1 é
     sempre convexa; 1,7 desce sem chegar a parede vertical atrás. */
  curvaDaRampa: 1.7,
  /* Meio ângulo, visto de cima a partir do eixo -Z, da corda de baixo da
     rampa. Com zero a fatia de baixo da rampa teria largura nula. */
  anguloDoPeDaRampa: 10,
  /* Grade do corpo: o corpo é um loft em Z de retângulos (largura da planta
     em D por altura até a rampa). Cada retângulo tem divisoesDaLargura
     pontos em cima e embaixo e divisoesDaAltura em cada lado. */
  divisoesDaLargura: 6,
  divisoesDaAltura: 6,
  /* Estações na parede de trás, iguais em ângulo: do bico ao pé da rampa e
     do pé da rampa ao eixo; e estações iguais no bloco da frente. */
  estacoesDoBico: 1,
  estacoesDaRampa: 16,
  estacoesDaFrente: 8,
  /* Ângulo, a partir do eixo -Z, da última estação de trás. Atrás dela o
     polo fica em z = -R, 0,4 mm além dela com 5 graus. Com menos, as faces
     do bico saem com menos de 0,5 mm² e a medida de contato as recusa. */
  anguloDoBico: 5,
  /* Limite do sombreado liso, em graus: quinas mais fechadas que isto (o V
     da rampa com a parede, a frente com os lados, as tampas) ficam nítidas. */
  anguloDoLiso: 20,
  lados: 40,
  /* O tambor tem mais lados que o colar, para o contorno ficar liso de frente. */
  ladosDoTambor: 108,
};

const m = (mm) => mm / 1000;
const ID = { colar: 100, corpo: 200, tambor: 300 };

export function derivar(t = TABELA) {
  return {
    R: m(t.raioDoColar), hc: m(t.alturaDoColar), zf: m(t.frenteDoBloco),
    yt: m(t.alturaDoTopo), yr: m(t.alturaDaRampaAtras), Rt: m(t.raioDoTambor),
    et: m(t.espessuraDoTambor), ye: m(t.alturaDoEixo), c: m(t.chanfroDoColar),
    s: m(t.suaveDoChanfro), ft: m(t.filDoTambor),
    c2: m(t.chanfroDeCimaDoColar), s2: m(t.suaveDoChanfroDeCima),
  };
}

export function gerarPassos(t = TABELA) {
  const { R, hc, zf, yt, yr, Rt, et, ye, c, s, ft, c2, s2 } = derivar(t);
  const passos = [];
  const p = t.curvaDaRampa;
  const psi0 = (t.anguloDoPeDaRampa * Math.PI) / 180;
  const Rr = R * Math.cos(psi0);
  const yRampa = (z) => yr + (yt - yr) * Math.pow(Math.max(1 - Math.pow(Math.abs(z) / Rr, p), 0), 1 / p);

  /* colar: faixa com chanfro nas duas bordas; o de baixo forma a linha escura
     com o chanfro de cima do anel, o de cima a linha do encontro com o corpo. */
  passos.push(['lathe', {
    origemId: ID.colar, lados: t.lados, segmentosCurva: 3,
    perfil: [[0, 0], [R - c, 0, s], [R, c, s], [R, hc - c2, s2], [R - c2, hc, s2], [0, hc]],
  }]);
  passos.push(['parte', { nome: 'colar', sel: { origem: { op: 'lathe', id: ID.colar } } }]);

  /* corpo: loft ao longo de Z de retângulos verticais. Em cada z a planta
     em D dá a meia largura (R atrás do eixo pelo círculo, R constante no
     bloco da frente) e a rampa dá a altura do topo; a rampa só depende de z,
     então o corte é sempre um retângulo e a quina entre rampa e parede é a
     linha dos cantos de cima. Todos os retângulos têm os mesmos pontos, e as
     estações atrás são iguais em ângulo na parede, com uma estação exata no
     pé da rampa. A face da frente fecha em retângulos concêntricos e o bico
     de trás numa aresta vertical em z = -R, logo atrás da última estação. */
  const nb = t.divisoesDaLargura, nv = t.divisoesDaAltura;
  /* Altura do caminho: o meio do retângulo do bico, que fica dentro de todos
     os retângulos; os dois polos ficam nela e os anéis da frente encolhem
     para ela. */
  const ym = (hc + yr) / 2;
  const ret = (w, y0, y1) => {
    const pts = [];
    for (let k = 0; k < nb; k++) pts.push([-w + (2 * w * k) / nb, y0]);
    for (let k = 0; k < nv; k++) pts.push([w, y0 + ((y1 - y0) * k) / nv]);
    for (let k = 0; k < nb; k++) pts.push([w - (2 * w * k) / nb, y1]);
    for (let k = 0; k < nv; k++) pts.push([-w, y1 - ((y1 - y0) * k) / nv]);
    /* frame do loft em +Z com u = +X dá w = -Y; as seções ficam todas na
       altura ym, a mesma dos polos, para o caminho ser reto em Z. */
    return pts.map(([x, y]) => [x, ym - y]).reverse();
  };
  const grau = Math.PI / 180;
  const th0 = t.anguloDoBico * grau;
  const thetas = [];
  for (let k = 0; k < t.estacoesDoBico; k++) thetas.push(th0 + (k / t.estacoesDoBico) * (psi0 - th0));
  for (let k = 0; k <= t.estacoesDaRampa; k++) thetas.push(psi0 + (k / t.estacoesDaRampa) * (Math.PI / 2 - psi0));
  const secao = (z, w, y1) => ({ pos: [0, ym, z], contorno: ret(w, hc, y1) });
  const zBico = -R * Math.cos(th0);
  const eps = 0.00001;
  /* bico de trás: a primeira seção é a aresta vertical x = 0 em z = -R, de
     hc à rampa. Cada ponto do retângulo sobe ou desce para ela pela
     distância, em pontos, ao meio da base, e os dois lados do D chegam às
     mesmas alturas. O loft recusa contorno de área nula, então os lados
     ficam a meio mícron do plano x = 0 e o passo mescla, logo após o loft,
     junta cada par na aresta; a costura fica em quads, sem leque. */
  const nl = nb + nv;
  const yBico = yRampa(-R);
  const meioMicron = 5e-7;
  const pares = [];
  /* altura na aresta proporcional ao caminho, pelo contorno da estação do
     bico, desde o meio da base: as células de baixo e de cima ficam curtas. */
  const wB = R * Math.sin(th0), hB = yRampa(zBico) - hc;
  const passoDoContorno = (d) => (d <= nb / 2 ? d * (2 * wB / nb)
    : d <= nb / 2 + nv ? wB + (d - nb / 2) * (hB / nv) : wB + hB + (d - nb / 2 - nv) * (2 * wB / nb)) / (2 * wB + hB);
  /* os pontos do meio da base e do meio do topo se juntam aos vizinhos: sem
     isso cada um fica com duas faces dobradas uma sobre a outra, vértice que
     não é variedade. Os vizinhos ocupam então as pontas da aresta. */
  const s1 = passoDoContorno(1), sN = passoDoContorno(nl - 1);
  const bico = ret(wB, hc, yBico).map(([u], i) => {
    const d = (i + nb / 2 + 1) % (2 * nl);
    const dd = d <= nl ? d : 2 * nl - d;
    const f = Math.min(Math.max((passoDoContorno(dd) - s1) / (sN - s1), 0), 1);
    if (d > 0 && d < nl) pares.push([i, (i + 2 * (nl - d)) % (2 * nl)]);
    if (d === 1 || d === nl - 1) pares.push([i, (i + (d === 1 ? -1 : 1) + 2 * nl) % (2 * nl)]);
    const lado = d === 0 || d === nl ? 0 : Math.sign(u) * meioMicron;
    return [lado, ym - (hc + (yBico - hc) * f)];
  });
  const secoes = [{ pos: [0, ym, -R], contorno: bico }];
  for (const th of thetas) {
    const z = th >= Math.PI / 2 - 1e-12 ? 0 : -R * Math.cos(th);
    secoes.push(secao(z, R * Math.sin(th), yRampa(z)));
  }
  /* tampa da frente: anéis concêntricos 0,01 mm um à frente do outro, até
     o polo em z = zf; a última estação do bloco recua o que eles ocupam. */
  const aneis = Math.round(nb / 2);
  const zFace = zf - aneis * eps;
  for (let k = 1; k <= t.estacoesDaFrente; k++) secoes.push(secao((zFace * k) / t.estacoesDaFrente, R, yt));
  for (let k = 1; k < aneis; k++) {
    const f = 1 - k / aneis;
    secoes.push({ pos: [0, ym, zFace + k * eps], contorno: ret(R * f, ym + (hc - ym) * f, ym + (yt - ym) * f) });
  }
  secoes.push({ pos: [0, ym, zf], raio: 0 });
  passos.push(['loft', { origemId: ID.corpo, lados: 2 * (nb + nv), orientacao: [1, 0, 0], secoes }]);
  /* a primeira seção do loft é anel: os ids dela são a base do passo mais
     o índice no contorno (numeração do loft, formato salvo). */
  const baseDoLoft = (passos.length - 1) * BLOCO;
  for (const [i, j] of pares) passos.push(['mescla', { de: [baseDoLoft + j], para: baseDoLoft + i }]);
  passos.push(['parte', { nome: 'corpo', sel: { origem: { op: 'loft', id: ID.corpo } } }]);

  /* tambor: disco de eixo Y com filete só na borda de cima, girado para +Z
     e levado ao eixo, encostado na face plana do corpo. */
  passos.push(['lathe', {
    origemId: ID.tambor, lados: t.ladosDoTambor, segmentosCurva: 3,
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
  /* Um liso com ângulo por parte: a sombra atravessa só as quinas mais
     abertas que o limite, e a malha é a mesma. */
  const angulo = t.anguloDoLiso;
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.colar } }, angulo }]);
  passos.push(['liso', { sel: { origem: { op: 'loft', id: ID.corpo } }, angulo }]);
  passos.push(['liso', { sel: selT, angulo }]);
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
      { nome: 'corpo', forma: 'bloco com planta em D, reto na frente e redondo atrás no raio do colar; topo plano, face da frente plana 20 mm além do colar, rampa abaulada descendo atrás', tecnica: 'loft ao longo de Z de seções retangulares, com a largura da planta em D e a altura da rampa' },
      { nome: 'tambor', forma: 'disco de eixo Z encostado na face plana do corpo, 320 mm de diâmetro e 40 mm de espessura, cobrindo a face quadrada inteira vista de frente', tecnica: 'revolução com perfil' },
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
