/* Copo baixo de vidro: uma parte de revolução, gerada pela família `peca-de-revolucao` (perfil `copo`): a família dá o perfil (raio, altura) com a
   parede de dentro deslocada da de fora e o gira por `lathe`; a receita só traz a TABELA em mm e o material. */
import { chamar, criarRegistroDeFamilias } from '../../familias/index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';

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

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* A TABELA em mm vira a chamada da família; o perfil e a parede de dentro são da família. */
export function derivar(T) {
  return chamar(familias().obter('peca-de-revolucao'), 'copo', {
    perfil: 'copo', copoAltura: T.altura, copoDiametroBoca: T.diametro_boca, copoDiametroBase: T.diametro_base, parede: T.parede, copoFundo: T.fundo,
    copoRaioCantoFundoDentro: T.raio_canto_fundo_dentro, raioCanto: T.raio_canto_fundo_fora, raioBoca: T.raio_borda,
    lados: T.lados, segmentosCurva: T.segmentos_curva, anguloLiso: T.angulo_liso,
  });
}

export function gerarPassos(T) {
  const { passos } = expandirChamadasDeComposicao(familias().registroComposicoes, [derivar(T)]);
  return passos.flatMap((passo) => (passo[0] === 'parte' ? [passo, ['material', { sel: passo[1].sel, usa: 'vidro' }]] : [passo]));
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
    familiaProcedural: 'peca-de-revolucao',
    partes: [
      {
        nome: 'copo',
        forma: 'corpo de revolução afinando em reta da boca (80) à base (70), parede de 3 mm, fundo de dentro plano em y 12 com canto raio 6, borda em meia-cana, canto de baixo de fora raio 2',
        tecnica: 'família peca-de-revolucao, perfil copo: lathe de um perfil (raio, altura) com concordâncias nos cantos, seguido de liso por ângulo',
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
