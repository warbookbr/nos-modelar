/* aviao/trem-do-nariz — o trem do nariz do avião de pequeno porte baixado, na pose de pouso: a carenagem, o pivô e os mancais, a
 * alavanca e o atuador, o compasso, a perna, o pistão, o garfo, o eixo e a roda.
 *
 * Sétima etapa do avião (`../../montagem.json`): o plano está em `../../ALINHAMENTO.md` e as formas vêm da unidade `trem-do-nariz` do
 * esboço aprovado da segunda rodada (`docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/`, o mestre e
 * `aviao-detalhe-trem-do-nariz.esboco.json`). A receita refina o andaime `../../andaime.json` (REFINA).
 *
 * Referencial do acervo e do esboço: Y para cima, chão em y = 0, x para a direita do piloto, a proa para -z e a cauda para +z. A TABELA
 * está em milímetro, no quadro do esboço, e a conversão para metro acontece só em `derivar`. A fuselagem não publica porta e a montagem
 * não tem vínculo de medida, e por isso o pivô (o ponto `tnP` do esboço), o ponto fixo do atuador (`tnAtF`) e a carenagem com o
 * alojamento estão na TABELA como os pontos e as caixas do esboço, e não saem de um encaixe de porta da montagem v5. O resto do trem
 * sai do pivô: a perna desce `tnLb` até o fim do barril, `tnLc` até a coroa e `tnL` até o centro da roda, e o garfo, o eixo, o compasso
 * e a alavanca se medem a partir desses pontos, com as expressões do esboço na pose baixada (curso 0, em que o seno do curso é zero e o
 * cosseno é um). O recolhimento do esboço não entra: a receita é só a pose baixada.
 *
 * Todo cilindro do esboço é um `extrusao` de um círculo entre os dois pontos dele. O que segue um eixo (x, y ou z) nasce direto nele,
 * com a base no menor dos dois extremos; o que não segue (o atuador, em y e z, e os dois braços do compasso, nos três eixos) nasce em
 * x no primeiro ponto e gira em z, para a subida, e em y, para o resto, em torno do primeiro ponto. A carenagem é a caixa de canto
 * arredondado menos a caixa do alojamento, que passa 20 mm abaixo dela e deixa o alojamento aberto por baixo; os dois mancais e a
 * orelha do atuador são caixas de canto arredondado, todas extrudadas em y.
 *
 * A roda é a chamada da família `roda-pneu` com o perfil `carro` e os parâmetros do esboço (o diâmetro do pneu, a largura e o desvio
 * zero), expandida aqui dentro dos PASSOS. A família a gera no centro, com o eixo em x, e o esboço a põe no ponto `tnW` com a rotação
 * `[0, tnEixoY, tnEixoZ]`, que na pose baixada é nula; a receita faz o mesmo com `transladar`. Da expansão ficam as quatro formas
 * (pneu, aro, cubo e chapa), o material e o sólido, e saem as quatro partes da família, porque a receita nomeia a roda inteira como
 * `rodaNariz` (o alias `rodaInteira` junta as quatro), e as três portas, que a família publica no centro local e que a pose deixaria
 * longe da forma (`porta-fora-do-plano`).
 */
import { chamar, criarRegistroDeFamilias } from '../../../../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../../../../nucleo/composicoes.js';

const ESBOCO = '../../../../../docs/mecanifica/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const slug = (id) => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/* parte -> [forma prometida, técnica], no nome da forma do esboço */
const PARTES = {
  carenagemTremNariz: ['carenagem sob o nariz, de canto arredondado, com o alojamento do trem recortado por baixo', 'caixa do esboço recortada pelo alojamento por subtrair'],
  eixoPivoNariz: ['eixo do pivô, de lado a lado do alojamento, em torno do qual o trem gira', 'cilindro entre os pontos do esboço'],
  mancalNarizE: ['mancal esquerdo do pivô, preso à carenagem', 'caixa do esboço'],
  mancalNarizD: ['mancal direito do pivô, preso à carenagem', 'caixa do esboço'],
  alavancaNariz: ['alavanca que sai do pivô para o atuador', 'cilindro entre os pontos do esboço'],
  pinoAtuadorNariz: ['pino que liga o atuador à alavanca', 'cilindro entre os pontos do esboço'],
  atuadorHasteNariz: ['haste do atuador', 'cilindro entre os pontos do esboço'],
  atuadorCorpoNariz: ['corpo do atuador, mais grosso que a haste', 'cilindro entre os pontos do esboço'],
  orelhaAtuadorNariz: ['orelha que prende o corpo do atuador à estrutura', 'caixa do esboço'],
  compassoSupNariz: ['braço de cima do compasso, da perna ao pino do meio', 'cilindro entre os pontos do esboço'],
  compassoInfNariz: ['braço de baixo do compasso, do pino do meio ao garfo', 'cilindro entre os pontos do esboço'],
  pinoCompassoNariz: ['pino do meio do compasso', 'cilindro entre os pontos do esboço'],
  pernaNariz: ['perna do trem, do pivô para baixo', 'cilindro entre os pontos do esboço'],
  pistaoNariz: ['pistão que sai da perna, mais fino que ela', 'cilindro entre os pontos do esboço'],
  coroaNariz: ['coroa no pé do pistão, onde o garfo se prende', 'cilindro entre os pontos do esboço'],
  garfoNariz: ['garfo que segura o eixo da roda', 'cilindro entre os pontos do esboço'],
  eixoRodaNariz: ['eixo da roda, atravessando o garfo e o cubo', 'cilindro entre os pontos do esboço'],
  rodaNariz: ['roda do nariz com o pneu, de 364 mm de diâmetro, encostando no chão', 'a roda da família roda-pneu, perfil carro, com os parâmetros do esboço, expandida nos PASSOS'],
};
const NOMES = Object.keys(PARTES);

export const TABELA = {
  /* O pivô, o ponto `tnP` do esboço: x, y (`tnPy`) e z (`tnPz`) do eixo em torno do qual o trem gira. */
  pivo: [0, 680, 1740],
  /* O quanto a perna desce do pivô, em y: até o fim do barril (`tnLb`, onde o pistão começa), até a coroa (`tnLc`, o pé do pistão) e até
     o centro da roda (`tnL`, onde o garfo acaba e o eixo passa). O centro da roda fica em y 199 e o raio do pneu é 182, e por isso o pé
     do pneu fica em y 17: o esboço deixa a roda 17 mm acima do chão, e a escala do plano (773 mm) mede do pé da roda ao alto da
     carenagem, em y 790. */
  descida: { barril: 160, coroa: 251, roda: 481 },
  /* A perna, o pistão e a coroa, em diâmetro. A coroa é horizontal: sai do pé do pistão `braco` para -x, onde o garfo de um braço desce
     até o centro da roda. O eixo da roda sai do garfo, passa pelo cubo e termina `passa` além do plano médio da roda, para +x. */
  perna: { diametro: 70 },
  pistao: { diametro: 44 },
  coroa: { diametro: 44, braco: 100 },
  garfo: { diametro: 34 },
  eixoRoda: { diametro: 30, passa: 40 },
  /* A roda: o perfil da família e os três ajustes do esboço (`diametroPneu` é `tnDRoda`, a largura é a razão do diâmetro, e o desvio
     zero põe o cubo no meio do aro). O resto é o do perfil `carro`. */
  roda: { perfil: 'carro', diametroPneu: 364, larguraPneu: 0.36, desvio: 0 },
  /* O pivô: o eixo vai `meio` para cada lado de `pivo`, e cada mancal é a caixa [largura em x, altura em y, profundidade em z] de canto
     arredondado `raio`, a `x` do pivô para cada lado. */
  eixoPivo: { diametro: 34, meio: 222 },
  mancal: { caixa: [30, 110, 110], raio: 12, x: 185 },
  /* A alavanca sai do pivô `alcance` para +z, e o pino do atuador atravessa a ponta dela em x. O atuador liga o ponto fixo `fixo`, no
     alto do alojamento, à ponta da alavanca: o corpo vai do ponto fixo ao meio do caminho, e a haste do meio à ponta. A orelha é a
     caixa que prende o corpo ao ponto fixo. */
  alavanca: { diametro: 30, alcance: 70 },
  pinoAtuador: { diametro: 22, comprimento: 50 },
  atuador: { fixo: [0, 738, 1900], corpo: 44, haste: 26 },
  orelha: { caixa: [44, 60, 44], raio: 8 },
  /* O compasso: o braço de cima parte da perna, `alto.descida` abaixo do pivô e a `alto.x` do plano médio, o de baixo chega à coroa, a
     `baixo.x`, e os dois se juntam no joelho, no meio dos dois pontos em x e na descida média, `avanco` para a proa. O pino do joelho
     atravessa a junta em x. */
  compasso: { diametro: 18, alto: { x: -35, descida: 110 }, baixo: { x: -45 }, joelho: { avanco: -55 }, pino: { diametro: 24, comprimento: 40 } },
  /* A carenagem e o alojamento que ela leva recortado, em caixas de [largura em x, altura em y, profundidade em z] com o centro e o raio
     do canto vertical: os valores do esboço, que a fuselagem fixa. O alojamento passa 20 mm abaixo da carenagem, e fica aberto por
     baixo, com 25 mm de teto. */
  carenagem: { caixa: [470, 230, 1120], raio: 30, centro: [0, 675, 2200] },
  alojamento: { caixa: [400, 225, 800], raio: 20, centro: [0, 652.5, 2090] },
  /* A resolução: os lados do círculo de cada cilindro e os segmentos de cada canto arredondado, por quarto de volta. */
  lados: 48,
  segmentosDoCanto: 6,
};

const m = (mm) => mm / 1000;
const mAll = (v) => v.map(m);
const GRAUS = Math.PI / 180;
/* Abaixo deste valor, uma componente da direção de um cilindro conta como zero. */
const EPS = 1e-9;

let registro = null;
const registroDeFamilias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* Tudo em milímetro: os pontos do trem, os cilindros entre dois pontos e as caixas de canto arredondado. É o que `derivar` converte
   para metro e o que os pontos declarados medem. Um cilindro é `{ parte, de, para, diametro, material }`; uma caixa, `{ parte,
   centro, caixa, raio, material }`. */
function medidas(t) {
  const [px, py, pz] = t.pivo;
  const d = t.descida;
  const c = t.compasso;
  const abaixo = (descida, x = 0, z = 0) => [px + x, py - descida, pz + z];
  const entre = (a, b) => a.map((v, k) => (v + b[k]) / 2);

  const pivo = [px, py, pz];
  const barrilFim = abaixo(d.barril);
  const coroa = abaixo(d.coroa);
  const roda = abaixo(d.roda);
  const bracoAlto = abaixo(d.coroa, -t.coroa.braco);
  const bracoBase = abaixo(d.roda, -t.coroa.braco);
  const eixoFim = abaixo(d.roda, t.eixoRoda.passa);
  const alavancaPonta = [px, py, pz + t.alavanca.alcance];
  const fixo = t.atuador.fixo;
  const meioDoAtuador = entre(fixo, alavancaPonta);
  const alto = abaixo(c.alto.descida, c.alto.x);
  const baixo = abaixo(d.coroa, c.baixo.x);
  const joelho = abaixo((c.alto.descida + d.coroa) / 2, (c.alto.x + c.baixo.x) / 2, c.joelho.avanco);
  /* o pino que atravessa um ponto em x: o ponto menos e mais a metade do comprimento */
  const emX = (ponto, comprimento) => [[ponto[0] - comprimento / 2, ponto[1], ponto[2]], [ponto[0] + comprimento / 2, ponto[1], ponto[2]]];

  const [eixoPivoDe, eixoPivoPara] = emX(pivo, 2 * t.eixoPivo.meio);
  const [pinoAtuadorDe, pinoAtuadorPara] = emX(alavancaPonta, t.pinoAtuador.comprimento);
  const [pinoCompassoDe, pinoCompassoPara] = emX(joelho, c.pino.comprimento);

  const cilindros = [
    { parte: 'eixoPivoNariz', de: eixoPivoDe, para: eixoPivoPara, diametro: t.eixoPivo.diametro, material: 'pino' },
    { parte: 'alavancaNariz', de: pivo, para: alavancaPonta, diametro: t.alavanca.diametro, material: 'articulacao' },
    { parte: 'pinoAtuadorNariz', de: pinoAtuadorDe, para: pinoAtuadorPara, diametro: t.pinoAtuador.diametro, material: 'pino' },
    { parte: 'atuadorHasteNariz', de: meioDoAtuador, para: alavancaPonta, diametro: t.atuador.haste, material: 'articulacao' },
    { parte: 'atuadorCorpoNariz', de: fixo, para: meioDoAtuador, diametro: t.atuador.corpo, material: 'articulacao' },
    { parte: 'compassoSupNariz', de: alto, para: joelho, diametro: c.diametro, material: 'articulacao' },
    { parte: 'compassoInfNariz', de: joelho, para: baixo, diametro: c.diametro, material: 'articulacao' },
    { parte: 'pinoCompassoNariz', de: pinoCompassoDe, para: pinoCompassoPara, diametro: c.pino.diametro, material: 'pino' },
    { parte: 'pernaNariz', de: pivo, para: barrilFim, diametro: t.perna.diametro, material: 'perna' },
    { parte: 'pistaoNariz', de: barrilFim, para: coroa, diametro: t.pistao.diametro, material: 'perna' },
    { parte: 'coroaNariz', de: coroa, para: bracoAlto, diametro: t.coroa.diametro, material: 'perna' },
    { parte: 'garfoNariz', de: bracoAlto, para: bracoBase, diametro: t.garfo.diametro, material: 'perna' },
    { parte: 'eixoRodaNariz', de: bracoBase, para: eixoFim, diametro: t.eixoRoda.diametro, material: 'pino' },
  ];

  const caixas = [
    { parte: 'mancalNarizE', centro: [px - t.mancal.x, py, pz], caixa: t.mancal.caixa, raio: t.mancal.raio, material: 'carenagem' },
    { parte: 'mancalNarizD', centro: [px + t.mancal.x, py, pz], caixa: t.mancal.caixa, raio: t.mancal.raio, material: 'carenagem' },
    { parte: 'orelhaAtuadorNariz', centro: fixo, caixa: t.orelha.caixa, raio: t.orelha.raio, material: 'carenagem' },
  ];

  return {
    cilindros,
    caixas,
    carenagem: { parte: 'carenagemTremNariz', ...t.carenagem, material: 'carenagem' },
    alojamento: t.alojamento,
    roda,
  };
}

export function derivar(t = TABELA) {
  const M = medidas(t);

  /* A direção de um cilindro, em metro: o eixo que ele segue (x, y ou z) quando os outros dois componentes são nulos, e senão os dois
     giros que levam +x à direção `de` a `para`: em z o seno da subida, e em y o que leva o resto de +x ao plano horizontal. Os giros
     são em torno de `de`, o primeiro ponto, onde a base nasce. */
  const cilindro = ({ parte, de, para, diametro, material }) => {
    const v = para.map((x, k) => x - de[k]);
    const comprimento = Math.hypot(...v);
    const u = v.map((x) => x / comprimento);
    const seguidos = [0, 1, 2].filter((k) => Math.abs(u[k]) > EPS);
    const base = {
      parte, material, raio: m(diametro / 2), comprimento: m(comprimento), lados: t.lados,
    };
    if (seguidos.length === 1) {
      const k = seguidos[0];
      const menor = para[k] < de[k] ? para : de;
      return { ...base, eixo: 'xyz'[k], em: mAll(menor), giros: [] };
    }
    return {
      ...base,
      eixo: 'x',
      em: mAll(de),
      giros: [
        { eixo: 'z', graus: Math.asin(u[1]) / GRAUS, pivo: mAll(de) },
        { eixo: 'y', graus: Math.atan2(-u[2], u[0]) / GRAUS, pivo: mAll(de) },
      ],
    };
  };

  /* Uma caixa de canto arredondado, em metro: a base no centro de baixo e a extrusão em y. */
  const caixa = ({ parte, centro, caixa: [largura, altura, profundidade], raio, material }) => ({
    parte, material, largura: m(largura), altura: m(altura), profundidade: m(profundidade), raio: m(raio),
    em: mAll([centro[0], centro[1] - altura / 2, centro[2]]),
  });

  /* A roda: a chamada da família com o perfil e os ajustes do esboço, e o ponto em que o esboço a põe, o centro da roda. */
  const r = t.roda;
  const chamada = chamar(registroDeFamilias().obter('roda-pneu'), 'roda', {
    perfil: r.perfil, diametroPneu: r.diametroPneu, larguraPneu: r.larguraPneu, desvio: r.desvio,
  });

  return {
    segmentosDoCanto: t.segmentosDoCanto,
    cilindros: M.cilindros.map(cilindro),
    caixas: M.caixas.map(caixa),
    carenagem: caixa(M.carenagem),
    alojamento: caixa({ parte: 'alojamento', ...M.alojamento }),
    roda: { chamada, desloca: mAll(M.roda) },
  };
}

/* Identidade estrutural dos passos, escolhida aqui: um bloco de dez por grupo, e a família da roda fica nos ids baixos (de 1 a 11). A
   carenagem recortada é o `subtrair`, e as outras partes levam o id da forma que as gera. */
const ID = {
  carenagem: 100, alojamento: 101, carenagemRecortada: 102,
  mancalNarizE: 110, mancalNarizD: 111, orelhaAtuadorNariz: 112,
  eixoPivoNariz: 120, alavancaNariz: 121, pinoAtuadorNariz: 122, atuadorHasteNariz: 123, atuadorCorpoNariz: 124,
  compassoSupNariz: 130, compassoInfNariz: 131, pinoCompassoNariz: 132,
  pernaNariz: 140, pistaoNariz: 141, coroaNariz: 142, garfoNariz: 143, eixoRodaNariz: 144,
};

/* As quatro formas da família, na identidade que ela lhes dá: o pneu, o aro, o cubo (a base furada) e a chapa. */
const PNEU = { op: 'lathe', id: 1 };
const ARO = { op: 'lathe', id: 2 };
const CUBO = { op: 'subtrair', id: 6 };
const CHAPA = { op: 'lathe', id: 11 };
export const ALIASES = [['rodaInteira', { unir: [{ origem: PNEU }, { origem: ARO }, { origem: CUBO }, { origem: CHAPA }] }]];

export const MATERIAIS = {
  carenagem: { cor: '#5f6b78', metalicidade: 0.3, aspereza: 0.5 },
  perna: { cor: '#8a96a3', metalicidade: 0.5, aspereza: 0.4 },
  articulacao: { cor: '#6f7b88', metalicidade: 0.5, aspereza: 0.45 },
  pino: { cor: '#2b3138', metalicidade: 0.4, aspereza: 0.4 },
  /* os dois que a família da roda usa */
  borracha: { cor: '#23272b', metalicidade: 0, aspereza: 0.9 },
  aco: { cor: '#aeb9c4', metalicidade: 0.6, aspereza: 0.35 },
};

/* O ângulo, em graus, a partir do qual a quina fica nítida no sombreado liso: o canto arredondado (15 graus por segmento) e o círculo de
   48 lados (7,5 graus) ficam lisos, e as tampas dos cilindros, o fundo e o topo das caixas ficam nítidos. */
const ANGULO_LISO = 30;

export function gerarPassos(t = TABELA) {
  const P = derivar(t);
  const passos = [];
  const doPasso = (op, id) => ({ origem: { op, id } });
  const nomear = (parte, sel, material) => {
    passos.push(['parte', { nome: parte, sel }]);
    passos.push(['material', { usa: material, sel }]);
    passos.push(['solido', { sel }]);
    passos.push(['liso', { angulo: ANGULO_LISO, sel }]);
  };

  /* A roda: a expansão da família sem as quatro partes e sem as portas, no centro, e depois a roda inteira no ponto do esboço. */
  const { passos: daFamilia } = expandirChamadasDeComposicao(registroDeFamilias().registroComposicoes, [P.roda.chamada]);
  passos.push(...daFamilia.filter(([operacao]) => operacao !== 'parte' && operacao !== 'publicarPorta'));
  const roda = { alias: 'rodaInteira' };
  passos.push(['transladar', { d: P.roda.desloca, sel: roda }]);
  passos.push(['parte', { nome: 'rodaNariz', sel: roda }]);
  passos.push(['liso', { angulo: ANGULO_LISO, sel: roda }]);

  /* Uma caixa de canto arredondado em y. */
  const caixa = (origemId, c) => passos.push(['extrusao', {
    origemId, eixo: 'y', altura: c.altura, perfil: { retangulo: { largura: c.largura, profundidade: c.profundidade, cantos: c.raio } },
    segmentosArco: P.segmentosDoCanto, em: c.em,
  }]);

  /* A carenagem menos o alojamento. */
  caixa(ID.carenagem, P.carenagem);
  caixa(ID.alojamento, P.alojamento);
  passos.push(['subtrair', { origemId: ID.carenagemRecortada, solidos: [doPasso('extrusao', ID.carenagem), doPasso('extrusao', ID.alojamento)] }]);
  nomear('carenagemTremNariz', doPasso('subtrair', ID.carenagemRecortada), P.carenagem.material);

  /* Os mancais e a orelha. */
  for (const c of P.caixas) {
    caixa(ID[c.parte], c);
    nomear(c.parte, doPasso('extrusao', ID[c.parte]), c.material);
  }

  /* Os cilindros entre dois pontos, na ordem do esboço. */
  for (const c of P.cilindros) {
    const id = ID[c.parte];
    passos.push(['extrusao', {
      origemId: id, eixo: c.eixo, altura: c.comprimento, perfil: { circulo: { raio: c.raio } }, segmentosArco: c.lados / 4, em: c.em,
    }]);
    for (const giro of c.giros) passos.push(['rotaciona', { eixo: giro.eixo, graus: giro.graus, pivo: giro.pivo, sel: doPasso('extrusao', id) }]);
    nomear(c.parte, doPasso('extrusao', id), c.material);
  }

  return passos;
}

/* A caixa de cada parte, em milímetro, calculada da TABELA sem passar pelos passos. Um cilindro tem a dos dois centros mais, em cada
   eixo, o raio vezes a raiz de um menos o quadrado da direção (um disco de raio `r` perpendicular à reta tem, em cada eixo, essa
   extensão); uma caixa tem a dela, e a carenagem a da caixa inteira, porque o alojamento fica por dentro e por baixo da face de baixo
   dela. A roda tem a largura do pneu em x e o diâmetro dele em y e z em volta do centro. */
function caixasDasPartes(t) {
  const M = medidas(t);
  const caixas = {};
  for (const { parte, de, para, diametro } of M.cilindros) {
    const v = para.map((x, k) => x - de[k]);
    const comprimento = Math.hypot(...v);
    const raio = diametro / 2;
    const folga = v.map((x) => raio * Math.sqrt(Math.max(0, 1 - (x / comprimento) ** 2)));
    caixas[parte] = {
      min: de.map((x, k) => Math.min(x, para[k]) - folga[k]),
      max: de.map((x, k) => Math.max(x, para[k]) + folga[k]),
    };
  }
  const daCaixa = ({ centro, caixa }) => ({ min: centro.map((x, k) => x - caixa[k] / 2), max: centro.map((x, k) => x + caixa[k] / 2) });
  for (const c of [...M.caixas, M.carenagem]) caixas[c.parte] = daCaixa(c);
  const r = t.roda;
  const meiaLargura = (r.larguraPneu * r.diametroPneu) / 2;
  const raio = r.diametroPneu / 2;
  caixas.rodaNariz = {
    min: [M.roda[0] - meiaLargura, M.roda[1] - raio, M.roda[2] - raio],
    max: [M.roda[0] + meiaLargura, M.roda[1] + raio, M.roda[2] + raio],
  };
  return caixas;
}

/* Os pontos declarados, em milímetro: o mínimo e o máximo da caixa de cada parte, que saem da mesma tabela que a malha. */
export function pontosDeclarados(t = TABELA) {
  const tolerancia = 1;
  return Object.entries(caixasDasPartes(t)).flatMap(([parte, { min, max }]) => [
    { nome: `${parte}, o mínimo da caixa`, parte, medida: 'minimo', em: min, toleranciaMm: tolerancia },
    { nome: `${parte}, o máximo da caixa`, parte, medida: 'maximo', em: max, toleranciaMm: tolerancia },
  ]);
}

export default {
  meta: { nome: 'aviao/trem-do-nariz', desc: 'trem do nariz do avião de pequeno porte, baixado: carenagem, pivô, atuador, compasso, perna, garfo e roda' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'a proa do avião em z 0; y para cima com o chão em y 0; x para a direita do piloto; o trem sob o nariz, de z 1558 a z 2760' },
  PLANO: {
    objeto: 'trem do nariz de um avião monomotor de pequeno porte, baixado: a perna presa ao pivô sob o nariz, com o atuador, o compasso, o pistão, o garfo e a roda no chão',
    referencias: [
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/lateral.prancha.png',
      'docs/mecanifica/banco-de-provas/aviao-2026-10-11/referencias/frontal.png',
    ],
    escala: { medida: 'altura do trem do nariz no esboço, do pé da roda ao alto da carenagem', milimetros: 773 },
    partes: NOMES.map((nome) => ({ nome, forma: PARTES[nome][0], tecnica: PARTES[nome][1] })),
    criteriosDeReprovacao: [
      'roda solta, fora do chão, ou atravessando o garfo',
      'perna, pistão, garfo ou eixo desalinhados entre si, ou soltos',
      'atuador ou compasso solto, que não liga as peças que o esboço liga',
      'carenagem sem o alojamento recortado',
      'o REFINA acusando parte fora do envelope do volume dela ou abaixo do mínimo contra a forma do esboço',
    ],
  },
  /* Os contatos, declarados antes de medir, pela geometria do esboço na pose baixada. O eixo do pivô entra 22 mm em cada parede do
     alojamento e atravessa os dois mancais, que se apoiam nas paredes. A perna, a alavanca e o pino do atuador se tocam no pivô e na
     ponta da alavanca, e a haste do atuador termina no centro do pino. O pistão, a coroa, o garfo e o eixo da roda formam a cadeia
     que desce da perna, e o compasso liga a perna à coroa pelo pino do joelho. A roda não toca o eixo: o furo central do cubo, de
     38,6 mm, deixa 4,3 mm de folga em volta do eixo de 30 mm, e a roda não toca o garfo, que fica 17,5 mm além da face do pneu. */
  contatos: [
    { par: ['carenagemTremNariz', 'eixoPivoNariz'], motivo: 'o eixo do pivô entra 22 mm na parede de cada lado do alojamento e termina dentro dela' },
    { par: ['carenagemTremNariz', 'mancalNarizE'], motivo: 'o mancal esquerdo se apoia na parede esquerda do alojamento e entra 5 mm na da frente' },
    { par: ['carenagemTremNariz', 'mancalNarizD'], motivo: 'o mancal direito se apoia na parede direita do alojamento e entra 5 mm na da frente' },
    { par: ['eixoPivoNariz', 'mancalNarizE'], motivo: 'o eixo do pivô gira no mancal esquerdo' },
    { par: ['eixoPivoNariz', 'mancalNarizD'], motivo: 'o eixo do pivô gira no mancal direito' },
    { par: ['pernaNariz', 'eixoPivoNariz'], motivo: 'a perna pende do pivô' },
    { par: ['alavancaNariz', 'eixoPivoNariz'], motivo: 'a alavanca nasce no centro do eixo do pivô' },
    { par: ['alavancaNariz', 'pernaNariz'], motivo: 'a alavanca sai do alto da perna, junto ao pivô' },
    { par: ['alavancaNariz', 'pinoAtuadorNariz'], motivo: 'o pino do atuador atravessa a ponta da alavanca' },
    { par: ['alavancaNariz', 'atuadorHasteNariz'], motivo: 'a haste do atuador termina na ponta da alavanca' },
    { par: ['atuadorHasteNariz', 'pinoAtuadorNariz'], motivo: 'a haste do atuador termina no centro do pino do atuador' },
    { par: ['atuadorCorpoNariz', 'atuadorHasteNariz'], motivo: 'a haste do atuador sai do corpo, no meio do caminho entre a orelha e a alavanca' },
    { par: ['atuadorCorpoNariz', 'orelhaAtuadorNariz'], motivo: 'o corpo do atuador nasce no centro da orelha' },
    { par: ['carenagemTremNariz', 'orelhaAtuadorNariz'], motivo: 'a orelha do atuador entra 3 mm no teto do alojamento' },
    { par: ['pistaoNariz', 'pernaNariz'], motivo: 'o pistão sai da perna' },
    { par: ['coroaNariz', 'pistaoNariz'], motivo: 'a coroa fica no pé do pistão' },
    { par: ['garfoNariz', 'coroaNariz'], motivo: 'o garfo se prende na coroa' },
    { par: ['eixoRodaNariz', 'garfoNariz'], motivo: 'o eixo da roda atravessa o garfo' },
    { par: ['compassoSupNariz', 'pernaNariz'], motivo: 'o braço de cima do compasso se prende à perna, 110 mm abaixo do pivô' },
    { par: ['compassoInfNariz', 'compassoSupNariz'], motivo: 'os dois braços do compasso se juntam no joelho' },
    { par: ['compassoSupNariz', 'pinoCompassoNariz'], motivo: 'o pino do joelho atravessa a ponta do braço de cima' },
    { par: ['compassoInfNariz', 'pinoCompassoNariz'], motivo: 'o pino do joelho atravessa a ponta do braço de baixo' },
    { par: ['compassoInfNariz', 'coroaNariz'], motivo: 'o braço de baixo do compasso se prende à coroa' },
  ],
  /* A roda tem quatro corpos e nove furos: o pneu, o aro e a chapa são anéis, de um furo cada, e o cubo é um anel com os cinco furos de
     fixação do perfil, seis. As outras partes são sólidos fechados. */
  formas: Object.fromEntries(NOMES.map((p) => [p, p === 'rodaNariz' ? { furos: 9, corpos: 4 } : 'solido'])),
  REFINA: {
    andaime: '../../andaime.json',
    partes: Object.fromEntries(NOMES.map((p) => [p, slug(p)])),
    tolerancia: { envelope: 5, porta: 0.5 },
    esboco: { arquivo: ESBOCO, opcao: 1, formas: Object.fromEntries(NOMES.map((p) => [p, p])), minimo: 0.95 },
  },
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};
