/* junta-com-cabo.mjs — a montagem de prova do cabo na junta: os dois atuadores de junta de `duas-juntas.mjs` (o de 100 mm e o B preso na saída dele) com o curso da junta A da prova. O cabo prende nas portas `cabo` que a própria família do atuador
 * publica, no centro da ponta do cilindro de saída do cabo de cada carcaça e com o eixo para fora dele (+x na pose zero); a fixture não inventa porta. A junta A gira a carcaça B em torno de y, e a ponta do cabo em B dá a volta no eixo com ela. */
import { montarDuasJuntas } from '../atuador-de-junta/duas-juntas.mjs';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';

/**
 * A montagem de prova com a junta A no curso pedido (o da prova padrão é −90° a 90°, com `passos` passos). Devolve a montagem no formato de `montar` de uma família, como `montarDuasJuntas`.
 */
export function montarJuntaComCabo(familia, { curso = { minimo: -90, maximo: 90 }, passos = 24 } = {}) {
  const gerada = montarDuasJuntas(familia);
  const articulacoes = gerada.articulacoes.map((a) => (a.id === 'juntaA' ? { ...a, curso: { ...curso }, passos } : a));
  return { ...gerada, articulacoes };
}

const PONTAS = { de: { instancia: 'carcacaA', porta: 'cabo' }, para: { instancia: 'carcacaB', porta: 'cabo' } };
const BASE = { ...PONTAS, diametro: 3, lados: 8 };
/**
 * Os arranjos da prova, cada um um pedido por portas (`pedidoNaPose` de `procedural/familias/cabo/montagem.js`) entre as portas `cabo` reais dos dois atuadores, com o que a conferência do curso tem de dizer. As pontas ficam a 71 mm
 * (pose zero) e 88 mm (±90°) uma da outra, as duas saindo para +x na pose zero:
 *   passa: o cabo de 150 mm, que passa no curso de −90° a 90° (o da prova padrão);
 *   curto: o cabo de 80 mm, que não alcança: estica em todo o curso;
 *   fechado: o cabo de 130 mm, que dobra abaixo do raio mínimo nos extremos do curso (±90°);
 *   atravessa: o cabo de 200 mm, que no curso de −180° a 180° atravessa a carcaça A de 157° ao fim do curso, para cada lado.
 * O `atravessa` pede o curso de ±180°, que a junta do atuador permite; os outros usam o de ±90°. */
export const ARRANJOS = Object.freeze({
  passa: Object.freeze({ descricao: 'cabo de 150 mm de A a B, folgado em todo o curso de ±90°', curso: { minimo: -90, maximo: 90 }, pedido: Object.freeze({ ...BASE, comprimento: 150, raioMinimo: 3 }) }),
  curto: Object.freeze({ descricao: 'cabo de 80 mm, curto: não alcança em pose nenhuma', curso: { minimo: -90, maximo: 90 }, pedido: Object.freeze({ ...BASE, comprimento: 80, raioMinimo: 1.5 }) }),
  fechado: Object.freeze({ descricao: 'cabo de 130 mm: dobra abaixo do raio mínimo com B nos extremos do curso', curso: { minimo: -90, maximo: 90 }, pedido: Object.freeze({ ...BASE, comprimento: 130, raioMinimo: 3 }) }),
  atravessa: Object.freeze({ descricao: 'cabo de 200 mm: atravessa a carcaça A com a junta perto de ±180°', curso: { minimo: -180, maximo: 180 }, pedido: Object.freeze({ ...BASE, comprimento: 200, raioMinimo: 3 }) }),
});

/** A montagem de prova montada e resolvida: `{ registro, execucao, gerada, resolvida, declaracao, problemas }`, com a declaração da junta A. */
export function prepararJuntaComCabo(opcoes) {
  const registro = criarRegistroDeFamilias();
  const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
  const gerada = montarJuntaComCabo(registro.obter('atuador-de-junta'), opcoes);
  const { problemas, resolvida } = resolverMontagemDaFamilia({ montar: () => gerada }, {}, execucao);
  return { registro, execucao, gerada, resolvida, problemas, declaracao: gerada.articulacoes.find((a) => a.id === 'juntaA') };
}
