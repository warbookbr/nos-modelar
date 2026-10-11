/* montagem.js — a mini-montagem v5 que a família gera: o pino e as duas folhas como peças soltas, ligadas por uma
   articulação de revolução com o curso declarado, para `conferirArticulacao` medir o curso contra as malhas.

   O formato da montagem não muda. Cada peça da montagem aponta por `alvo.ref` para uma receita, e quem carrega as peças
   (`carregarPeca` do resolvedor) devolve a receita já fina da instância, com os argumentos desta chamada da família
   dentro: é o que `receitas` leva. Parâmetro por instância (`vinculos`) não serve aqui, porque ele só deriva medidas de
   portas de outra peça, e os parâmetros da dobradiça vêm de quem a chama.

   O pino e as duas folhas ficam na pose do mundo (sem `pose` nem `posicoes`), já no quadro da família: o eixo do pino é
   y, a folha D (a que fica) está em +x e a folha E (a que gira) em -x. A articulação liga a porta dos nós da folha D à
   dos nós da folha E, que estão sobre o mesmo eixo, e o pino fica entre as peças que ficam; o curso vai de 0 (as folhas
   no mesmo plano, a dobradiça aberta) até o ângulo em que as bordas das chapas se tocam. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { argumentosDasPecas } from './derivar.js';
import { ID_DO_PINO, idDaFolha } from './composicoes.js';

/* A tolerância do contato, em metro (1 nanômetro, a do próprio `contato-de-solidos.js`): as peças têm feições de
   milímetro, e ela entra também como folga nas bordas do teste de raio, onde uma folga maior contaria duas vezes o raio
   que passa por uma aresta e inverteria a paridade de um ponto. */
export const TOLERANCIA_DO_CONTATO = 1e-9;

export const REFS_DA_DOBRADICA = Object.freeze({ pino: 'dobradica-pino', d: 'dobradica-folha-d', e: 'dobradica-folha-e' });
export const MATERIAIS_DA_DOBRADICA = Object.freeze({
  chapa: Object.freeze({ cor: '#8e98a3', aspereza: 0.45, metalicidade: 0.8 }),
  pino: Object.freeze({ cor: '#c9ccd1', aspereza: 0.3, metalicidade: 0.9 }),
});

const receitaDe = (nome, chamada) => ({
  meta: { nome, tipo: 'objeto', desc: `peça '${nome}' da dobradiça gerada pela família` },
  CHAMADAS_COMPOSICOES: [chamada],
  PARAMS: {},
  TOPO: {},
  ALIASES: [],
  MATERIAIS: { ...MATERIAIS_DA_DOBRADICA },
});

const completar = (contrato, parametros) => Object.fromEntries(Object.entries(contrato.parametros)
  .map(([nome, { padrao }]) => [nome, Object.hasOwn(parametros, nome) ? parametros[nome] : padrao]));

/**
 * Gera a montagem v5 da dobradiça para um conjunto de parâmetros. Confere a faixa e as restrições pelo `chamar` (uma
 * chamada recusada lança `ErroChamadaDeFamilia` antes de existir receita). Devolve `{ parametros, montagem, receitas,
 * articulacoes, cursoMaximo, anguloDeEncosto }`: `receitas` mapeia o `ref` de cada instância à receita dela e
 * `articulacoes` é a lista de declarações que `conferirArticulacao` lê.
 */
export function montarDobradica(familia, parametros = {}) {
  chamar(familia, 'conjunto', parametros);
  const completos = completar(familia.contrato, parametros);
  const { geometria, pino, d, e } = argumentosDasPecas(completos);
  const receitas = {
    [REFS_DA_DOBRADICA.pino]: receitaDe('pino', { id: 'pino', composicao: ID_DO_PINO, argumentos: pino }),
    [REFS_DA_DOBRADICA.d]: receitaDe('folha-d', { id: 'folha-d', composicao: idDaFolha('d', completos.nos, completos.furos), argumentos: d }),
    [REFS_DA_DOBRADICA.e]: receitaDe('folha-e', { id: 'folha-e', composicao: idDaFolha('e', completos.nos, completos.furos), argumentos: e }),
  };
  const montagem = {
    formato: 'mecanifica.montagem',
    versao: 5,
    id: 'dobradica',
    instancias: [
      { id: 'pino', alvo: { tipo: 'peca', ref: REFS_DA_DOBRADICA.pino } },
      { id: 'folha-d', alvo: { tipo: 'peca', ref: REFS_DA_DOBRADICA.d } },
      { id: 'folha-e', alvo: { tipo: 'peca', ref: REFS_DA_DOBRADICA.e } },
    ],
    relacoes: [],
    etapas: ['pino', 'folha-d', 'folha-e'],
    vinculos: [],
    posicoes: [],
    auditoriaIntersecoes: { toleranciaNumerica: TOLERANCIA_DO_CONTATO, expectativas: [] },
  };
  const articulacoes = [{
    id: 'abertura',
    tipo: 'revolucao',
    fixo: { caminho: ['folha-d'], porta: 'nos-da-folha-d' },
    movel: { caminho: ['folha-e'], porta: 'nos-da-folha-e' },
    unidade: 'graus',
    curso: { minimo: 0, maximo: geometria.cursoMaximo },
    passos: geometria.passosDoCurso,
    folga: { valor: 0, unidade: 'mm' },
  }];
  return { parametros: completos, montagem, receitas, articulacoes, cursoMaximo: geometria.cursoMaximo };
}
