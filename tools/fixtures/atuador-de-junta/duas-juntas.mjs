/* duas-juntas.mjs — a montagem de prova de duas juntas do atuador de junta: o atuador B preso pela flange de fixação na
 * flange de saída do atuador A, com os furos casando, e cada junta de revolução com o curso de −180° a 180°. A junta de A
 * leva junto o atuador B inteiro. O B é um atuador fora da tabela, do tamanho em que a furação da flange de fixação dele é
 * a da flange de saída do atuador de 100 mm (círculo de 43,4 mm, oito furos de 4,2 mm), porque a montagem é direta, sem
 * peça entre as duas; a junta em ângulo, com o elo entre elas, é o plano do elo entre juntas.
 *
 * Devolve a montagem no formato que `montar` de uma família devolve, para a mesma conferência da aprovação
 * (`conferirMontagemDaFamilia`) medir o curso de cada junta e as duas abertas ao mesmo tempo. */
import { chamar } from '../../../src/autoria/chamar-familia.js';
import { parametrosDoAtuador } from '../../../procedural/familias/atuador-de-junta/tabela.js';
import { declaracaoDaJunta, pecasDoAtuador } from '../../../procedural/familias/atuador-de-junta/montagem.js';

export const ATUADOR_B = Object.freeze({
  forma: 1, diametro: 36, comprimento: 30, diametroDoFlange: 52, espessuraDoFlange: 5, circuloDoFlange: 43.4, furosDoFlange: 8, diametroDoFuroDoFlange: 4.2,
  diametroDaSaida: 24, espessuraDaSaida: 4, circuloDaSaida: 16.8, furosDaSaida: 4, diametroDoFuroDaSaida: 2.5, diametroDoCabo: 6, chanfro: 1,
});

const completar = (contrato, parametros) => Object.fromEntries(Object.entries(contrato.parametros).map(([nome, { padrao }]) => [nome, parametros[nome] ?? padrao]));

/** A montagem de prova com o atuador A da tabela e o B que casa com a saída dele. */
export function montarDuasJuntas(familia, a = { forma: 1, ...parametrosDoAtuador(100) }, b = ATUADOR_B) {
  chamar(familia, 'a', a);
  chamar(familia, 'b', b);
  const pa = pecasDoAtuador(completar(familia.contrato, a), 'duas-juntas.a');
  const pb = pecasDoAtuador(completar(familia.contrato, b), 'duas-juntas.b');
  return {
    montagem: {
      formato: 'mecanifica.montagem',
      versao: 5,
      id: 'duas-juntas',
      instancias: [
        { id: 'carcacaA', alvo: { tipo: 'peca', ref: pa.refs.carcaca } }, { id: 'saidaA', alvo: { tipo: 'peca', ref: pa.refs.saida } },
        { id: 'carcacaB', alvo: { tipo: 'peca', ref: pb.refs.carcaca } }, { id: 'saidaB', alvo: { tipo: 'peca', ref: pb.refs.saida } },
      ],
      relacoes: [],
      etapas: ['carcacaA', 'saidaA', 'carcacaB', 'saidaB'],
      vinculos: [],
      posicoes: [
        { id: 'saidaANoEixo', instancia: 'saidaA', porta: 'eixo-da-saida', em: { instancia: 'carcacaA', porta: 'eixo' }, unidade: 'mm', afastamento: 0 },
        { id: 'bNaSaidaDeA', instancia: 'carcacaB', porta: 'fixacao', em: { instancia: 'saidaA', porta: 'saida' }, unidade: 'mm', afastamento: 0 },
        { id: 'saidaBNoEixo', instancia: 'saidaB', porta: 'eixo-da-saida', em: { instancia: 'carcacaB', porta: 'eixo' }, unidade: 'mm', afastamento: 0 },
      ],
    },
    receitas: { ...pa.receitas, ...pb.receitas },
    articulacoes: [declaracaoDaJunta('juntaA', 'carcacaA', 'saidaA', ['carcacaB', 'saidaB']), declaracaoDaJunta('juntaB', 'carcacaB', 'saidaB')],
  };
}
