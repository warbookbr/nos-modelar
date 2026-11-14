/* vaso-de-ceramica — vaso de cerâmica terracota de uma parte (`vaso`).
 * O combinado está em `referencias/alvo.md`.
 *
 * O corpo de revolução vem da família `peca-de-revolucao` (perfil `vaso`): a parede inteira (6 mm), com a de dentro deslocada da de fora
 * e o fundo do pé rebaixado, de modo que o vaso sai oco até a boca. Os quatro arcos do pé não são revolução e ficam aqui, saídos de
 * `subtrair`: dois cilindros em z e dois em x, cada um furando dois lados.
 */
import { chamar, criarRegistroDeFamilias } from '../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';

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

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };
const m = (mm) => mm / 1000;
const ID = { vaso: 100, cilZ: 101, cilX: 102, baixoZ: 103, baixoX: 104, cortado: 105 };

/** O corpo de revolução (família) e os cortes do pé (receita), em mm. */
export function derivar(T = TABELA) {
  const corpo = chamar(familias().obter('peca-de-revolucao'), 'corpo', {
    perfil: 'vaso', vasoAltura: T.altura, vasoBarrigaDiametro: T.barrigaDiametro, vasoBarrigaAltura: T.barrigaAltura, vasoPescocoDiametro: T.pescocoDiametro,
    vasoBocaDiametro: T.bocaDiametro, vasoPeDiametro: T.peDiametro, vasoPeAltura: T.peAltura, parede: T.parede, vasoPescocoAltura: T.pescocoAltura,
    vasoLabioAltura: T.labioAltura, vasoRebaixoDoPe: T.rebaixoDoPe, vasoBarrigaSemieixoY: T.barrigaSemieixoY, vasoAnguloInicioBarriga: T.tInicio,
    vasoAnguloFimBarriga: T.tFim, vasoPassosBarriga: T.passosBarriga, lados: T.lados, origem: ID.vaso,
  });
  /* arcos do pé: cilindro de raio arcoLargura/2 com o topo em arcoAltura, mais a caixa abaixo do centro dele */
  const raioArco = T.arcoLargura / 2;
  const centroArco = T.arcoAltura - raioArco;
  return { corpo, raioArco, centroArco, comprimento: T.peDiametro + 40 };
}

export function gerarPassos(T = TABELA) {
  const D = derivar(T);
  const passos = [];
  const { passos: doCorpo } = expandirChamadasDeComposicao(familias().registroComposicoes, [D.corpo]);
  passos.push(doCorpo.find(([op]) => op === 'lathe'));
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
    familiaProcedural: 'peca-de-revolucao',
    partes: [
      { nome: 'vaso', forma: 'revolução oca de 200 mm de altura e parede de 6 mm: barriga de 190 mm a 95 mm do chão, pescoço de 55 mm, boca de 75 mm com lábio virado para fora, pé em saia de 110 mm e 30 mm de altura com quatro arcos de 25 por 18 mm a 90 graus', tecnica: 'família peca-de-revolucao, perfil vaso: lathe do perfil da parede inteira (oco, fundo do pé rebaixado), subtrair de quatro cortadores em arco para o pé, liso com ângulo' },
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
