/* perna-estreita.mjs — a perna estreita do plano perna estreita: a mesma perna de `perna-de-prova.mjs` (o quadril, o joelho e o tornozelo, três atuadores de junta de 100 mm,
 * postos só pelas portas e ligados pelas três articulações do esqueleto humanoide aprovado), mas com a coxa e a canela em chapa reta (a `forma` 2 da família do elo, 431 mm
 * cada, lidos de proporcoes.json) no lugar dos elos em U. A chapa tem as duas bocas voltadas para o mesmo lado, então os três atuadores ocupam o mesmo intervalo ao longo do eixo
 * (73 mm), a coxa fica de um lado deles e a canela do outro, e a perna toda tem 85 mm de largura em x, em vez dos 387 mm da perna em U (que segue em perna-de-prova.mjs).
 * O joelho desliza ao longo do eixo para as faces de apoio ficarem no mesmo plano; os eixos, as alturas e os cursos são os do esqueleto, e nada é escrito aqui à mão além da chapa.
 *
 * A montagem, a transformação ao esqueleto, a pose, a caixa e o neutro para exportar são as funções da perna de prova. Aqui a perna fica no x do esqueleto (o quadril em x = 100 mm). */
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { resolverPortasDeMontagem } from '../../../src/autoria/interfaces-montagem.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { COMPRIMENTOS, caixaNoEsqueleto, montarPerna, paraOEsqueleto } from './perna-de-prova.mjs';
import { chapaEntreAtuadores } from './elo-de-chapa.mjs';

export const CHAPA_DA_COXA = chapaEntreAtuadores(COMPRIMENTOS.coxa);
export const CHAPA_DA_CANELA = chapaEntreAtuadores(COMPRIMENTOS.canela);
/** A largura máxima da perna (mm) e a folga mínima da linha do meio do corpo (mm), do gate do plano. */
export const LARGURA_MAXIMA = 180;
export const FOLGA_MINIMA = 20;

/** A montagem da perna estreita, no formato de `montar` de uma família. */
export const montarPernaEstreita = (familiaAtuador, familiaElo) => montarPerna(familiaAtuador, familiaElo, { coxa: CHAPA_DA_COXA, canela: CHAPA_DA_CANELA });

let guardada = null;
/** A perna estreita montada e resolvida (uma vez por processo): a montagem gerada, os problemas, a resolvida, o tempo de resolver em segundos, as portas na pose zero e a transformação ao esqueleto (o quadril no x dele). */
export function resolverPernaEstreita() {
  guardada ??= (() => {
    const registro = criarRegistroDeFamilias();
    const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
    const gerada = montarPernaEstreita(registro.obter('atuador-de-junta'), registro.obter('elo-entre-juntas'));
    const inicio = performance.now();
    const { problemas, resolvida } = resolverMontagemDaFamilia({ montar: () => gerada }, {}, execucao);
    const segundos = (performance.now() - inicio) / 1000;
    const instancias = resolvida ? resolvida.instancias.map((i) => ({ id: i.id, neutro: i.definicao.neutro, escala: 1, rotacao: i.poseMundo.rotacao, deslocamento: i.poseMundo.deslocamento })) : [];
    const portas = instancias.length ? resolverPortasDeMontagem(instancias) : null;
    return { gerada, problemas, resolvida, segundos, portas, paraEsqueleto: resolvida ? paraOEsqueleto(portas) : null };
  })();
  return guardada;
}

/** A caixa em x (mínimo, máximo e largura, em mm, no referencial do esqueleto) de todas as peças da `resolvida`. */
export function larguraEmX(resolvida, paraEsq) {
  const caixas = resolvida.instancias.map((i) => caixaNoEsqueleto(resolvida, paraEsq, i.id));
  const minimo = Math.min(...caixas.map((c) => c.minimo[0])); const maximo = Math.max(...caixas.map((c) => c.maximo[0]));
  return { minimo, maximo, largura: maximo - minimo };
}
