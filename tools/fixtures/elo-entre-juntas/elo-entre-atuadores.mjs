/* elo-entre-atuadores.mjs — a montagem de prova do elo reto: um atuador de junta (a flange de saída), o elo de membro (o
 * antebraço do esqueleto aprovado, de 230 mm entre os planos das flanges) e o atuador seguinte (a flange de fixação), todos
 * coaxiais em y. A boca A do elo assenta na porta de saída do primeiro atuador e a fixação do segundo assenta na boca B.
 *
 * Devolve a montagem no formato que `montar` de uma família devolve, para a conferência da aprovação
 * (`resolverMontagemDaFamilia`) e o curso de cada junta. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { parametrosDoAtuador } from '../../../procedural/familias/atuador-de-junta/tabela.js';
import { declaracaoDaJunta, pecasDoAtuador } from '../../../procedural/familias/atuador-de-junta/montagem.js';
import { derivar } from '../../../procedural/familias/elo-entre-juntas/derivar.js';
import { parametrosDoElo } from '../../../procedural/familias/elo-entre-juntas/tabela.js';

const completar = (contrato, parametros) => Object.fromEntries(Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, parametros[nome] ?? padrao]));
const ATUADOR = { forma: 1, ...parametrosDoAtuador(100) };

/** Os parâmetros do elo de antebraço entre dois atuadores de 100 mm (o comprimento do antebraço está em proporcoes.json do esqueleto humanoide). */
export const ELO_DO_ANTEBRACO = Object.freeze({ ...parametrosDoElo({ de: ATUADOR, para: ATUADOR, comprimento: 230, larguraDaSecao: 96, profundidadeDaSecao: 76, cintura: 0.85 }) });

/** A montagem de prova com os dois atuadores de `atuadorA` e `atuadorB` (padrão, o de 100 mm) e o elo de `parametrosDoElo`. */
export function montarEloEntreAtuadores(familiaAtuador, familiaElo, elo = ELO_DO_ANTEBRACO, atuadorA = ATUADOR, atuadorB = ATUADOR) {
  chamar(familiaAtuador, 'a', atuadorA);
  chamar(familiaAtuador, 'b', atuadorB);
  chamar(familiaElo, 'elo', elo);
  const pa = pecasDoAtuador(completar(familiaAtuador.contrato, atuadorA), 'elo-entre-atuadores.a');
  const pb = pecasDoAtuador(completar(familiaAtuador.contrato, atuadorB), 'elo-entre-atuadores.b');
  const { composicao, argumentos } = derivar(completar(familiaElo.contrato, elo));
  const refElo = 'elo-entre-atuadores.elo';
  const receitaDoElo = { meta: { nome: refElo }, CHAMADAS_COMPOSICOES: [{ id: 'elo', composicao, argumentos }], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} };
  return {
    montagem: {
      formato: 'mecanifica.montagem',
      versao: 5,
      id: 'elo-entre-atuadores',
      instancias: [
        { id: 'carcacaA', alvo: { tipo: 'peca', ref: pa.refs.carcaca } }, { id: 'saidaA', alvo: { tipo: 'peca', ref: pa.refs.saida } },
        { id: 'elo', alvo: { tipo: 'peca', ref: refElo } },
        { id: 'carcacaB', alvo: { tipo: 'peca', ref: pb.refs.carcaca } }, { id: 'saidaB', alvo: { tipo: 'peca', ref: pb.refs.saida } },
      ],
      relacoes: [],
      etapas: ['carcacaA', 'saidaA', 'elo', 'carcacaB', 'saidaB'],
      vinculos: [],
      posicoes: [
        { id: 'saidaANoEixo', instancia: 'saidaA', porta: 'eixo-da-saida', em: { instancia: 'carcacaA', porta: 'eixo' }, unidade: 'mm', afastamento: 0 },
        { id: 'eloNaSaidaDeA', instancia: 'elo', porta: 'boca-a', em: { instancia: 'saidaA', porta: 'saida' }, unidade: 'mm', afastamento: 0 },
        { id: 'bNoElo', instancia: 'carcacaB', porta: 'fixacao', em: { instancia: 'elo', porta: 'boca-b' }, unidade: 'mm', afastamento: 0 },
        { id: 'saidaBNoEixo', instancia: 'saidaB', porta: 'eixo-da-saida', em: { instancia: 'carcacaB', porta: 'eixo' }, unidade: 'mm', afastamento: 0 },
      ],
    },
    receitas: { ...pa.receitas, ...pb.receitas, [refElo]: receitaDoElo },
    articulacoes: [declaracaoDaJunta('juntaA', 'carcacaA', 'saidaA', ['elo', 'carcacaB', 'saidaB']), declaracaoDaJunta('juntaB', 'carcacaB', 'saidaB')],
  };
}
