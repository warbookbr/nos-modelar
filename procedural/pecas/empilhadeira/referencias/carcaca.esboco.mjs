/* carcaca.esboco.mjs — o rascunho da carcaça inteira da empilhadeira: chassi, laterais, paralamas, piso, painel, tampa do motor,
 * colunas e a traseira, para o esboço 2.0.
 *
 * A forma mora na receita da carcaça (`../partes/carcaca/receita.js`, a primeira etapa de `../montagem.json`): a TABELA dela traz
 * cada medida com a fonte, e `receita/frente.js` e `receita/traseira.js` escrevem os passos em mm. Este módulo só monta a carcaça
 * por `montarCarcacaEmMm`, a mesma função que a receita usa, e reexporta as medidas das rodas, que `eixos-rodas.esboco.mjs` lê.
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a peça 180 graus para os três quartos de trás. */
import { TABELA, montarCarcacaEmMm } from '../partes/carcaca/receita.js';

/** As rodas, uma medida por roda, da TABELA da carcaça (ALINHAMENTO.md, "Divergências entre as fontes"). */
export const RODAS = TABELA.rodas;

/** Monta a carcaça inteira no estado { passos, topo, origem } e devolve as medidas que as outras frentes usam. */
export const montarCarcaca = (estado) => montarCarcacaEmMm(estado);

const estado = { passos: [], topo: {}, origem: 0 };
montarCarcaca(estado);

if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -995] }]);

export default {
  plano: 'Carcaça inteira da empilhadeira: chassi, laterais, paralamas, piso, painel, tampa do motor, colunas e a traseira, pelas vistas de IA.',
  vista: 'direita',
  opcoes: [{ titulo: 'carcaça inteira', nota: 'rascunho pelas quatro vistas', passos: estado.passos, topo: estado.topo }],
};
