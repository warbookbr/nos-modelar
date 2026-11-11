/* carcaca-traseira.esboco.mjs — o rascunho da traseira da carcaça (capô, tampa, grade e contrapeso) sozinha, sem o poço da roda.
 *
 * A forma mora na receita da carcaça (`../partes/carcaca/receita.js`, com a traseira em `receita/traseira.js` e as medidas na TABELA
 * dela, seção `traseira`); este módulo só a monta sozinha para o esboço 2.0, e reexporta as ferramentas e as cores que as outras
 * frentes do rascunho da máquina usam.
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a peça para os três quartos de trás. */
import { TABELA } from '../partes/carcaca/receita.js';
import { ferramentas, simplifica, area, r1, interpolar } from '../partes/carcaca/receita/ferramentas.js';
import { montarTraseira as montarNaReceita, QUINAS } from '../partes/carcaca/receita/traseira.js';

const { laranja: LARANJA, cinzaClaro: CINZA_CLARO, cinza: CINZA, escuro: ESCURO } = TABELA.cores;
const meiaCapo = TABELA.traseira.capo.meiaPx * TABELA.traseira.vista.mmPorPx;

/** Monta a traseira no estado { passos, topo, origem }, com as medidas da receita; `pocoDaRoda` como na receita. */
export const montarTraseira = (estado, opcoes = {}) => montarNaReceita(estado, TABELA, TABELA.contornos, opcoes);

const estado = { passos: [], topo: {}, origem: 0 };
montarTraseira(estado);
const { passos, topo } = estado;
if (process.env.GIRAR) passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 600, -1830] }]);

export default {
  plano: 'Traseira da carcaça (capô, tampa, grade e contrapeso) pelas três vistas, com a ponta de trás acompanhando a planta.',
  vista: 'traseira',
  opcoes: [{ titulo: 'traseira pelas três vistas', nota: `capô com ${Math.round(2 * meiaCapo)} mm de largura`, passos, topo }],
};

export { ferramentas, QUINAS, LARANJA, CINZA_CLARO, CINZA, ESCURO, simplifica, area, r1, interpolar };
