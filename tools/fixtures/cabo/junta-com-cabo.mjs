/* junta-com-cabo.mjs — a montagem de prova do cabo na junta: os dois atuadores de junta de `duas-juntas.mjs` (o de 100 mm e o B preso na saída dele) com uma porta de cabo em cada lado da
 * junta A, e a declaração da junta A com o curso da prova. As famílias do atuador não publicam porta de cabo; elas são declaradas aqui, na receita de cada carcaça (a composição expandida em
 * passos e um `publicarPorta` a mais), e valem só para esta fixture.
 *
 * A porta `cabo` da carcaça A fica no topo do tambor, fora da flange de saída (raio 44 mm, na face a 65 mm), e o cabo sai por ela para cima. A da carcaça B fica no corpo cilíndrico dela, de lado
 * (raio 22,4 mm a 88 mm de altura), e o cabo sai por ela para fora. A junta A gira a carcaça B em torno de y, e a ponta do cabo em B dá a volta no eixo com ela. */
import { expandirChamadasDeComposicao } from '../../../procedural/nucleo/composicoes.js';
import { montarDuasJuntas } from '../atuador-de-junta/duas-juntas.mjs';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';

/** A altura da carcaça A em milímetro e a da B no referencial da montagem (a B assenta na saída da A). */
export const PORTAS_DE_CABO = Object.freeze({
  carcacaA: Object.freeze([
    Object.freeze({ id: 'cabo', centro: [44, 65, 0], eixo: [0, 1, 0] }),
    Object.freeze({ id: 'cabo-oposto', centro: [-44, 65, 0], eixo: [0, 1, 0] }),
  ]),
  carcacaB: Object.freeze([Object.freeze({ id: 'cabo', centro: [22.4, 88, 0], eixo: [1, 0, 0] })]),
});
const ALTURA_DA_B = 73;

const porta = (passos, id, centroMm, eixo) => {
  const [, eixoDaCarcaca] = passos.find(([op, a]) => op === 'publicarPorta' && a.id === 'eixo');
  return ['publicarPorta', { id, de: eixoDaCarcaca.de, interface: { forma: 'anel', papel: 'recebe', eixo, centro: centroMm.map((v) => v / 1000), raioInterno: 0, raioExterno: 0.003, inicio: -0.001, fim: 0 } }];
};

/**
 * A montagem de prova com a porta `cabo` nas carcaças A e B. `curso` é o da junta A em graus (o da prova padrão é −90° a 90°), com `passos` passos.
 * Devolve a montagem no formato de `montar` de uma família, como `montarDuasJuntas`.
 */
export function montarJuntaComCabo(familia, registro, { curso = { minimo: -90, maximo: 90 }, passos = 24 } = {}) {
  const gerada = montarDuasJuntas(familia);
  const receitas = { ...gerada.receitas };
  for (const [id, ref] of [['carcacaA', 'duas-juntas.a.carcaca'], ['carcacaB', 'duas-juntas.b.carcaca']]) {
    const original = receitas[ref];
    const { passos: expandidos } = expandirChamadasDeComposicao(registro.registroComposicoes, original.CHAMADAS_COMPOSICOES);
    const portas = PORTAS_DE_CABO[id].map(({ id: idDaPorta, centro, eixo }) => porta(expandidos, idDaPorta, id === 'carcacaB' ? [centro[0], centro[1] - ALTURA_DA_B, centro[2]] : centro, eixo));
    const { CHAMADAS_COMPOSICOES, ...resto } = original;
    receitas[ref] = { ...resto, PASSOS: [...expandidos, ...portas] };
  }
  const articulacoes = gerada.articulacoes.map((a) => (a.id === 'juntaA' ? { ...a, curso: { ...curso }, passos } : a));
  return { ...gerada, receitas, articulacoes };
}

const PONTAS = { de: { instancia: 'carcacaA', porta: 'cabo' }, para: { instancia: 'carcacaB', porta: 'cabo' } };
const PONTAS_OPOSTAS = { de: { instancia: 'carcacaA', porta: 'cabo-oposto' }, para: { instancia: 'carcacaB', porta: 'cabo' } };
/**
 * Os arranjos da prova, cada um um pedido por portas (`pedidoNaPose` de `procedural/familias/cabo/montagem.js`) com o que a conferência do curso tem de dizer:
 *   passa: o cabo de 110 mm de A a B, que passa no curso inteiro (−90° a 90°);
 *   curto: o cabo de 48 mm, curto para a volta da ponta B em torno do eixo, que estica de 60° para cada lado;
 *   fechado: a ponta A na porta oposta e o cabo de 110 mm, que dobra abaixo do raio mínimo de −30° a 30°;
 *   atravessa: a ponta A na porta oposta e o cabo de 115 mm, cuja curva passa por dentro da carcaça B no passo zero.
 */
export const ARRANJOS = Object.freeze({
  passa: Object.freeze({ descricao: 'cabo de 110 mm de A a B, folgado em todo o curso', pedido: Object.freeze({ ...PONTAS, comprimento: 110, diametro: 3, raioMinimo: 3, lados: 8 }) }),
  curto: Object.freeze({ descricao: 'cabo de 48 mm, curto: estica quando B dá a volta', pedido: Object.freeze({ ...PONTAS, comprimento: 48, diametro: 3, raioMinimo: 1.5, lados: 8 }) }),
  fechado: Object.freeze({ descricao: 'cabo de 110 mm da porta oposta de A: dobra fechado com B no meio do curso', pedido: Object.freeze({ ...PONTAS_OPOSTAS, comprimento: 110, diametro: 3, raioMinimo: 3, lados: 8 }) }),
  atravessa: Object.freeze({ descricao: 'cabo de 115 mm da porta oposta de A: atravessa a carcaça B com B no meio do curso', pedido: Object.freeze({ ...PONTAS_OPOSTAS, comprimento: 115, diametro: 3, raioMinimo: 2, lados: 8 }) }),
});

/** A montagem de prova montada e resolvida: `{ registro, execucao, gerada, resolvida, declaracao, problemas }`, com a declaração da junta A. */
export function prepararJuntaComCabo(opcoes) {
  const registro = criarRegistroDeFamilias();
  const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
  const gerada = montarJuntaComCabo(registro.obter('atuador-de-junta'), registro, opcoes);
  const { problemas, resolvida } = resolverMontagemDaFamilia({ montar: () => gerada }, {}, execucao);
  return { registro, execucao, gerada, resolvida, problemas, declaracao: gerada.articulacoes.find((a) => a.id === 'juntaA') };
}
