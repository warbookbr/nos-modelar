/* montagem.js — a montagem v5 que a família gera: a carcaça e a saída do atuador, peças soltas no mesmo referencial,
   ligadas por uma articulação de revolução em torno do eixo da junta.

   O formato é o de toda família que gera montagem: `montar` devolve `{ parametros, montagem, receitas, articulacoes,
   cursoMaximo }`. Cada peça é a composição `<forma>.carcaca` ou `<forma>.saida` com os argumentos desta chamada, e a
   posição da saída sai do encaixe da porta `eixo-da-saida` na porta `eixo` da carcaça, como qualquer posição derivada de
   porta. O curso vai de −180° a 180°: a flange de saída gira inteira sobre a face da carcaça. `pecasDoAtuador` dá as duas
   receitas com um prefixo, para uma montagem de várias juntas pôr mais de um atuador. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { idDaPeca } from './composicoes.js';
import { derivar } from './derivar.js';

export const CURSO_DA_JUNTA = Object.freeze({ minimo: -180, maximo: 180 });
export const PASSOS_DO_CURSO = 24;

const completar = (contrato, parametros) => Object.fromEntries(
  Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, parametros[nome] ?? padrao]),
);

const receitaDe = (ref, composicao, argumentos) => ({
  meta: { nome: ref },
  CHAMADAS_COMPOSICOES: [{ id: ref.split('.').at(-1), composicao, argumentos }],
  PARAMS: {},
  TOPO: {},
  ALIASES: [],
  MATERIAIS: {},
});

/** As receitas da carcaça e da saída para os parâmetros já completos, com as refs `<prefixo>.carcaca` e `<prefixo>.saida`. */
export function pecasDoAtuador(completos, prefixo = 'atuador-de-junta') {
  const { argumentos } = derivar(completos);
  const forma = completos.forma ?? 1;
  const refs = { carcaca: `${prefixo}.carcaca`, saida: `${prefixo}.saida` };
  return {
    refs,
    receitas: {
      [refs.carcaca]: receitaDe(refs.carcaca, idDaPeca(forma, 'carcaca'), argumentos),
      [refs.saida]: receitaDe(refs.saida, idDaPeca(forma, 'saida'), argumentos),
    },
  };
}

/** A declaração da junta de revolução entre a carcaça e a saída de um atuador, com as instâncias que a acompanham. */
export function declaracaoDaJunta(id, carcaca, saida, acompanham = []) {
  return {
    id,
    tipo: 'revolucao',
    fixo: { caminho: [carcaca], porta: 'eixo' },
    movel: { caminho: [saida], porta: 'eixo-da-saida' },
    ...(acompanham.length ? { acompanham: acompanham.map((instancia) => [instancia]) } : {}),
    unidade: 'graus',
    curso: { ...CURSO_DA_JUNTA },
    passos: PASSOS_DO_CURSO,
    folga: { valor: 0, unidade: 'mm' },
  };
}

/**
 * Gera a montagem da família para um conjunto de parâmetros. Confere faixa e restrição pela própria `chamar` (a recusa é
 * a da família, antes de existir peça) e devolve `{ parametros, montagem, receitas, articulacoes, cursoMaximo }`.
 */
export function montarAtuador(familia, parametros = {}) {
  chamar(familia, 'conjunto', parametros);
  const completos = completar(familia.contrato, parametros);
  const { refs, receitas } = pecasDoAtuador(completos);
  return {
    parametros: completos,
    montagem: {
      formato: 'mecanifica.montagem',
      versao: 5,
      id: 'atuador-de-junta',
      instancias: [{ id: 'carcaca', alvo: { tipo: 'peca', ref: refs.carcaca } }, { id: 'saida', alvo: { tipo: 'peca', ref: refs.saida } }],
      relacoes: [],
      etapas: ['carcaca', 'saida'],
      vinculos: [],
      posicoes: [{ id: 'saidaNoEixo', instancia: 'saida', porta: 'eixo-da-saida', em: { instancia: 'carcaca', porta: 'eixo' }, unidade: 'mm', afastamento: 0 }],
    },
    receitas,
    articulacoes: [declaracaoDaJunta('junta', 'carcaca', 'saida')],
    cursoMaximo: CURSO_DA_JUNTA.maximo,
  };
}
