/**
 * Prato fundo de cerâmica branca: uma parte só (`prato`), uma revolução em y de um perfil de seção fechada (casca de 5 mm), gerada pela
 * família `peca-de-revolucao` (perfil `prato`): a família percorre a face de cima do eixo à borda (fundo plano, arco côncavo, parede,
 * ombro convexo, aba inclinada, borda em meia-volta), desloca a de baixo em `espessura` e acrescenta o anel de apoio por baixo.
 * A receita só traz a TABELA em mm e o material. `poco_diametro` é nota do alvo: o poço sai da aba e dos raios, e a família não o pede.
 */
import { chamar, criarRegistroDeFamilias } from '../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';

export const TABELA = {
  diametro: 230,
  altura: 45,
  aba_largura: 35,
  poco_diametro: 155,
  poco_profundidade: 35,
  anel_diametro: 95,
  anel_altura: 5,
  anel_largura: 7.5,
  espessura: 5,
  aba_inclinacao_graus: 8,
  raio_fundo: 15,
  raio_ombro: 12,
  passos_arco: 8,
  lados: 72,
};

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };
const ANGULO_LISO = 40;

export function derivar(T) {
  return chamar(familias().obter('peca-de-revolucao'), 'prato', {
    perfil: 'prato', pratoDiametro: T.diametro, pratoAltura: T.altura, pratoAbaLargura: T.aba_largura, pratoPocoProfundidade: T.poco_profundidade,
    pratoAnelDiametro: T.anel_diametro, pratoAnelAltura: T.anel_altura, pratoAnelLargura: T.anel_largura, parede: T.espessura,
    pratoAbaInclinacao: T.aba_inclinacao_graus, pratoRaioFundo: T.raio_fundo, pratoRaioOmbro: T.raio_ombro, pratoPassosArco: T.passos_arco,
    lados: T.lados, anguloLiso: ANGULO_LISO,
  });
}

export function gerarPassos(T) {
  const { passos } = expandirChamadasDeComposicao(familias().registroComposicoes, [derivar(T)]);
  return passos.flatMap((passo) => (passo[0] === 'parte' ? [passo, ['material', { sel: passo[1].sel, usa: 'ceramica' }]] : [passo]));
}

export const CONTATOS = [];

const receita = {
  meta: { nome: 'prato-fundo', desc: 'prato fundo de cerâmica branca, revolução de uma casca de 5 mm com aba inclinada, poço e anel de apoio' },
  PARAMS: TABELA,
  MATERIAIS: { ceramica: { cor: '#f4f2ec', metalicidade: 0, aspereza: 0.25 } },
  TOPO: { origem: 'centro do plano de apoio, sob o anel; y para cima, eixo de revolução em y' },
  PLANO: {
    objeto: 'prato fundo de cerâmica branca de 230 mm de diâmetro e 45 mm de altura, aba de 35 mm, poço de 155 mm e anel de apoio de 95 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'diâmetro total da peça', milimetros: 230 },
    familiaProcedural: 'peca-de-revolucao',
    partes: [
      {
        nome: 'prato',
        forma: 'casca de 5 mm de revolução: aba de 35 mm inclinada para cima com borda de fora redonda, poço de 155 mm e 35 mm de fundo, fundo plano, transição em curva, anel de apoio de 95 mm e 5 mm de altura por baixo',
        tecnica: 'família peca-de-revolucao, perfil prato: lathe de perfil fechado (face de cima, face de baixo deslocada pela espessura e anel de apoio) com liso',
      },
    ],
    criteriosDeReprovacao: [
      'prato maciço, sem a cavidade do poço entre as faces de dentro e de baixo',
      'aba plana, sem inclinação ou sem borda de fora arredondada',
      'sem anel de apoio por baixo',
      'transição aba-poço em degrau',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const R = T.diametro / 2;
    return [
      { nome: 'topo da borda', parte: 'prato', medida: 'maximo', em: [R, T.altura, R], toleranciaMm: 0.5 },
      { nome: 'base do anel', parte: 'prato', medida: 'minimo', em: [-R, 0, -R], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
