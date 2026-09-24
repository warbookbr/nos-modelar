/* braco-robotico/base — a base do braço robótico, com a caixa lateral.
 *
 * Primeira etapa da montagem `braco-robotico/montagem.json`. O combinado com a
 * pessoa está em `../../ALINHAMENTO.md`; este arquivo traz o PLANO, a TABELA e
 * os contatos, e os passos são escritos pelo modelador.
 *
 * Direções: Y para cima; a vista frontal da bancada, que olha de +Z, é a vista
 * lateral da foto; o braço alcança para +X e a caixa fica em -X.
 *
 * Porta que a receita publica, porque a etapa seguinte nasce dela:
 *   assento — anel que recebe, eixo +Y, centro no meio do topo do corpo, face
 *             inteira do topo. O `anelCintura` senta aqui.
 *
 * Regra das portas de apoio do braço: quem recebe publica a face inteira,
 * de raio interno zero ao raio da face, numa faixa de 5 mm para dentro da
 * peça; quem se apoia publica só a borda de baixo, uma faixa de 10 mm de
 * largura até o raio dela e 5 mm para dentro dela. A montagem confere que a
 * borda inteira está sobre a face, sem fresta e no mesmo eixo.
 */

export const TABELA = {
  raioDoCorpo: 105,
  alturaDoCorpo: 200,
  ladoDoPe: 230,
  alturaDoPe: 20,
  saidaDaCaixa: 50,
  larguraDaCaixa: 120,
  /* A caixa termina este tanto abaixo do topo do corpo. */
  caixaAbaixoDoTopo: 10,
  /* Acabamento, escolhido pelo modelador. */
  fileteDoTopo: 12,
  fileteDoPe: 5,
  /* O pé avança este tanto além da face do corpo em -X, por baixo da caixa até o meio dela. */
  avancoDoPe: 25,
  /* Chanfro da quina do topo do corpo; substitui o filete, que abria sulco sob o anel. */
  chanfroDoTopo: 1.5,
  cantoDoPe: 25,
  cantoDaCaixa: 10,
  fileteDaCaixa: 5,
  /* Quanto a caixa entra no corpo para encostar sem fresta na curva dele. */
  entradaDaCaixa: 30,
  /* A tampa do loft é um leque quase plano, 0,4 mm abaixo da face: a caixa
     afunda este tanto no pé para o apoio ser contato de verdade. */
  afundoDaCaixa: 1,
  raioDoBotao: 9,
  saidaDoBotao: 5,
  alturaDoBotao: 150,
  ladosDoCorpo: 64,
};

const m = (mm) => mm / 1000;
const ID = { corpo: 100, pe: 200, caixa: 300, botao: 400 };

/* Retângulo de cantos arredondados em [u,w], encolhido `recuo` de cada lado. */
function retangulo(meioU, meioW, canto, recuo) {
  const u = meioU - recuo, w = meioW - recuo, c = Math.max(canto - recuo, 0.0005);
  return [[u, w, c], [-u, w, c], [-u, -w, c], [u, -w, c]];
}

/* Placa de bordas arredondadas: loft vertical de seções retangulares, com a
   quina de cima e de baixo aproximada por seções recuadas num quarto de arco. */
function placa(origemId, centroX, centroZ, y0, y1, meioU, meioW, canto, filete) {
  const secoes = [{ pos: [centroX, y0, centroZ], raio: 0 }];
  /* O ponto do arco no próprio fundo fica de fora: a seção coincidiria com o polo, e o loft
     recusa segmento de comprimento zero. A tampa vira leque quase plano. */
  const arco = [0.3827, 0.7071, 0.9239, 1];
  for (const k of arco) {
    const a = Math.acos(k);
    secoes.push({ pos: [centroX, y0 + filete * (1 - Math.sin(a)), centroZ], contorno: retangulo(meioU, meioW, canto, filete * (1 - Math.cos(a))) });
  }
  for (const k of [...arco].reverse()) {
    const a = Math.acos(k);
    secoes.push({ pos: [centroX, y1 - filete * (1 - Math.sin(a)), centroZ], contorno: retangulo(meioU, meioW, canto, filete * (1 - Math.cos(a))) });
  }
  secoes.push({ pos: [centroX, y1, centroZ], raio: 0 });
  return ['loft', { origemId, secoes, lados: 4 * 9, segmentosCurva: 8, orientacao: [1, 0, 0] }];
}

export function derivar(t = TABELA) {
  const R = m(t.raioDoCorpo);
  const yPe = m(t.alturaDoPe);
  const yTopo = yPe + m(t.alturaDoCorpo);
  const xFora = -(R + m(t.saidaDaCaixa));
  const xDentro = -(R - m(t.entradaDaCaixa));
  return {
    R, yPe, yTopo,
    meioPe: m(t.ladoDoPe) / 2,
    pe: {
      centroX: (m(t.ladoDoPe) / 2 - (R + m(t.avancoDoPe))) / 2,
      meioU: (m(t.ladoDoPe) / 2 + R + m(t.avancoDoPe)) / 2,
    },
    caixa: {
      centroX: (xFora + xDentro) / 2,
      meioU: (xDentro - xFora) / 2,
      meioW: m(t.larguraDaCaixa) / 2,
      y0: yPe - m(t.afundoDaCaixa),
      y1: yTopo - m(t.caixaAbaixoDoTopo),
      xFora,
    },
    botao: { x: xFora, y: yPe + m(t.alturaDoBotao) },
  };
}

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  passos.push(['lathe', {
    origemId: ID.corpo, lados: t.ladosDoCorpo, segmentosCurva: 8,
    perfil: [[0, P.yPe], [P.R, P.yPe], [P.R, P.yTopo - m(t.chanfroDoTopo)], [P.R - m(t.chanfroDoTopo), P.yTopo], [0, P.yTopo]],
  }]);
  passos.push(['parte', { nome: 'corpo', sel: { origem: { op: 'lathe', id: ID.corpo } } }]);
  passos.push(placa(ID.pe, P.pe.centroX, 0, 0, P.yPe, P.pe.meioU, P.meioPe, m(t.cantoDoPe), m(t.fileteDoPe)));
  passos.push(['parte', { nome: 'pe', sel: { origem: { op: 'loft', id: ID.pe } } }]);
  const C = P.caixa;
  passos.push(placa(ID.caixa, C.centroX, 0, C.y0, C.y1, C.meioU, C.meioW, m(t.cantoDaCaixa), m(t.fileteDaCaixa)));
  passos.push(['lathe', {
    origemId: ID.botao, eixo: 'x', lados: 24, segmentosCurva: 4,
    perfil: [[0, -m(t.saidaDoBotao)], [m(t.raioDoBotao), -m(t.saidaDoBotao), m(2)], [m(t.raioDoBotao), m(1)], [0, m(1)]],
    em: [P.botao.x, P.botao.y, 0],
  }]);
  passos.push(['parte', { nome: 'caixaLateral', sel: { origem: { op: 'loft', id: ID.caixa } } }]);
  passos.push(['parte', { nome: 'caixaLateral', sel: { origem: { op: 'lathe', id: ID.botao } } }]);
  passos.push(['publicarPorta', {
    nome: 'assento', de: { op: 'lathe', id: ID.corpo, faixa: 3 },
    interface: {
      forma: 'anel', papel: 'recebe', eixo: [0, 1, 0], centro: [0, P.yTopo, 0],
      raioInterno: 0, raioExterno: P.R, inicio: -0.005, fim: 0,
    },
  }]);
  passos.push(['liso', { sel: { origem: { op: 'lathe', id: ID.corpo } } }]);
  /* O pé é loft de seções recuadas em arco; sem liso a sombra marca cada seção como degrau. */
  passos.push(['liso', { sel: { origem: { op: 'loft', id: ID.pe } } }]);
  passos.push(['liso', { sel: { origem: { op: 'loft', id: ID.caixa } } }]);
  return passos;
}


const receita = {
  meta: { nome: 'braco-robotico/base', desc: 'base do braço robótico com a caixa lateral' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro do fundo do pé no chão; y para cima, a caixa em -X' },
  PLANO: {
    objeto: 'base do braço robótico industrial, presa no chão, com uma caixa colada no lado esquerdo',
    referencias: ['../../referencias/lateral.png'],
    escala: { medida: 'diâmetro do corpo da base', milimetros: 210 },
    partes: [
      { nome: 'corpo', forma: 'cilindro de revolução em pé, 210 mm de diâmetro e 200 mm de altura; a quina do topo leva só um chanfro pequeno, sem sulco na junção com o anel', tecnica: 'revolução com perfil' },
      { nome: 'pe', forma: 'placa de 20 mm de altura, 230 mm de lado, que avança à esquerda por baixo da caixa até o meio dela; cantos e borda arredondados', tecnica: 'placa com cantos e bordas arredondados' },
      { nome: 'caixaLateral', forma: 'caixa de cantos arredondados encostada no corpo em -X, 50 mm de saída, apoiada no pé só onde ele existe, 10 mm mais baixa que o corpo, com um botão ou conector na face de fora', tecnica: 'caixa com bordas arredondadas' },
    ],
    criteriosDeReprovacao: [
      'o corpo não é redondo visto de cima',
      'o pé não é quadrado de cantos arredondados visto de cima',
      'sulco visível entre o topo do corpo e o anel, ou quina viva na borda do pé',
      'a caixa solta do corpo, com fresta, ou flutuando acima do pé',
      'a caixa do lado errado: na vista frontal ela fica à esquerda, em -X',
    ],
  },
  contatos: [
    { par: ['corpo', 'pe'], motivo: 'o corpo nasce no centro do pé' },
    { par: ['caixaLateral', 'corpo'], motivo: 'a caixa encosta no corpo sem fresta' },
    { par: ['caixaLateral', 'pe'], motivo: 'a caixa se apoia no pé' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
