/* montagem.js — a montagem v5 que a família gera: a camisa e a haste, peças distintas, ligadas por uma articulação
   prismática com o curso declarado.

   O formato é o de toda família que gera montagem: `montar` devolve `{ parametros, montagem, receitas, articulacoes,
   cursoMaximo }`. A montagem v5 persistida só nomeia peças por `alvo.ref` e não leva parâmetro por instância, então a
   família entrega junto a receita já fina de cada peça ('cilindro-hidraulico.camisa' e 'cilindro-hidraulico.haste'), que
   executa a composição da peça com os parâmetros da chamada. As duas peças nascem no mesmo referencial, com a haste
   recolhida (curso 0), e a posição da haste sai do encaixe da porta `eixo-da-haste` na porta `guia-da-haste`, como qualquer
   posição derivada de porta; a conferência da aprovação a deriva pelas mesmas funções do resolvedor.

   A articulação não faz parte do JSON da montagem: ela é a declaração que `conferirArticulacao` lê. Fica aqui a mesma que
   o conjunto emite pela extensão `articulacao`, com o curso em milímetro. Sem estado global. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { chamadasDasPecas, passosDoCurso } from './derivar.js';

export const REF_DA_CAMISA = 'cilindro-hidraulico.camisa';
export const REF_DA_HASTE = 'cilindro-hidraulico.haste';
export const ID_DA_MONTAGEM = 'cilindro-hidraulico';
export const ID_DA_ARTICULACAO = 'haste-na-camisa';

const completar = (contrato, parametros) => Object.fromEntries(
  Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, parametros[nome] ?? padrao]),
);

/** A montagem v5 persistida: duas instâncias, a ordem de construção e a posição da haste derivada da porta da guia. */
export function montagemPersistida() {
  return {
    formato: 'mecanifica.montagem',
    versao: 5,
    id: ID_DA_MONTAGEM,
    instancias: [
      { id: 'camisa', alvo: { tipo: 'peca', ref: REF_DA_CAMISA } },
      { id: 'haste', alvo: { tipo: 'peca', ref: REF_DA_HASTE } },
    ],
    relacoes: [],
    etapas: ['camisa', 'haste'],
    vinculos: [],
    posicoes: [{
      id: 'hasteNaGuia', instancia: 'haste', porta: 'eixo-da-haste', em: { instancia: 'camisa', porta: 'guia-da-haste' }, unidade: 'mm', afastamento: 0,
    }],
  };
}

/** A declaração da articulação prismática: o curso em milímetro, de 0 (recolhida) ao curso da família, em passos de 25 mm. */
export function declaracaoDaArticulacao(curso) {
  return {
    id: ID_DA_ARTICULACAO,
    tipo: 'prismatica',
    fixo: { caminho: ['camisa'], porta: 'guia-da-haste' },
    movel: { caminho: ['haste'], porta: 'eixo-da-haste' },
    unidade: 'mm',
    curso: { minimo: 0, maximo: curso },
    passos: passosDoCurso(curso),
    folga: { valor: 0, unidade: 'mm' },
  };
}

const receitaDe = (ref, chamada) => ({
  meta: { nome: ref },
  CHAMADAS_COMPOSICOES: [{ id: ref.split('.').at(-1), ...chamada }],
  PARAMS: {},
  TOPO: {},
  ALIASES: [],
  MATERIAIS: {},
});

/**
 * Gera a montagem da família para um conjunto de parâmetros. Confere faixa e restrição pela própria `chamar` (a recusa é
 * a da família, antes de existir peça) e devolve `{ parametros, montagem, receitas, articulacoes, cursoMaximo }`:
 * `montagem` é o JSON v5, `receitas` mapeia o `ref` de cada instância à receita dela e `articulacoes` é a lista de
 * declarações que `conferirArticulacao` lê. O curso máximo é o `curso` da família, em milímetro.
 */
export function montarCilindro(familia, parametros = {}) {
  chamar(familia, 'conjunto', parametros);
  const completos = completar(familia.contrato, parametros);
  const chamadas = chamadasDasPecas(completos);
  return {
    parametros: completos,
    montagem: montagemPersistida(),
    receitas: {
      [REF_DA_CAMISA]: receitaDe(REF_DA_CAMISA, chamadas.camisa),
      [REF_DA_HASTE]: receitaDe(REF_DA_HASTE, chamadas.haste),
    },
    articulacoes: [declaracaoDaArticulacao(completos.curso)],
    cursoMaximo: completos.curso,
  };
}
