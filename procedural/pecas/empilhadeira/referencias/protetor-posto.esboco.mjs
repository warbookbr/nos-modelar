/* protetor-posto.esboco.mjs — o rascunho do protetor do operador, do posto do operador e dos acessórios da empilhadeira (fatias 5, 6 e
 * 7 do plano), montado sobre a carcaça em rascunho (`carcaca.esboco.mjs`).
 *
 * O módulo exporta `montarProtetorPosto(estado)`, que escreve as partes num estado { passos, topo, origem } como `montarTraseira`;
 * rodado sozinho, ele monta a carcaça inteira (os passos da opção de `carcaca.esboco.mjs`) e as partes daqui por cima. Cada parte é a
 * receita da sua etapa, chamada daqui: o protetor (fatia 5), o posto e os acessórios (fatias 6 e 7).
 *
 * DE ONDE VEM CADA MEDIDA.
 *   Lado: `lateral.contornos.json` (4,437 mm/px, z da lateral para trás). Na lateral o cubo dianteiro fica em z 200,5 e y 189,5 e o
 *   traseiro em z 1.956,5 (centros das caixas dos dois pneus), com o chão em y -190; o entre-eixos dela é 1.756, contra os 1.700 da
 *   carcaça. A lateral entra então na escala da carcaça por k = 1.700 / 1.756 = 0,968, com o cubo dianteiro em z 0 e o chão em y 0:
 *   Z(px) = -(px - 349,8) x 4,2955 + 194,1 e Y(py) = (493,6 - py) x 4,2955 + 183,9, em px da imagem da lateral (as funções ZL e YL).
 *   Conferido na carcaça: a ponta do capô da lateral cai em z -2.176 (carcaça -2.178) e o topo da tampa em y 1.150 (carcaça 1.150).
 *   Trás: `tras.ia.png`, medida por cor linha a linha; a largura pelo capô (laranja das colunas 388 a 684 nas linhas 366 a 396, 297 px
 *   para 1.193 mm, 4,02 mm/px, centro na coluna 536). A altura dessa vista não casa com a largura (a perspectiva da IA), e dela só se
 *   tira largura.
 *   Cima: `cima.ia.png` (frente à esquerda), medida por cor coluna a coluna; a largura pelo capô (laranja das linhas 143 a 453 na
 *   coluna 860, 3,85 mm/px, centro na linha 298) e o comprimento pela régua da carcaça: z = 188 - (coluna - 360) x 4,058 (a frente do
 *   paralama na coluna 360 e a ponta do capô na 943, as mesmas da vista de cima da carcaça).
 *   Frente: `frente.ia.png`; a largura pelo paralama (laranja das colunas 368 a 721 na linha 355, 353 px para 1.212 mm, 3,43 mm/px).
 * Eixos: x lateral (+x é a esquerda de quem dirige), y altura com o chão em 0, z comprimento com a frente em +z e o eixo dianteiro em 0.
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira o conjunto 180 graus para os três quartos de trás. */
import { montarProtetor } from '../partes/protetor/receita.js';
import { montarBanco } from '../partes/banco/receita.js';
import { montarColunaDirecao } from '../partes/coluna-direcao/receita.js';
import { montarVolante } from '../partes/volante/receita.js';
import { montarGlp } from '../partes/glp/receita.js';
import { montarEscape } from '../partes/escape/receita.js';
import { montarAlca } from '../partes/alca/receita.js';
import carcaca from './carcaca.esboco.mjs';

/* --- o protetor, o posto e os acessórios --------------------------------------------------------------------------------------- */
/* TUDO MORA NAS RECEITAS DAS ETAPAS (2026-11-10): o protetor em `../partes/protetor/receita.js` (`montarProtetor`, fatia 5); o banco, a
   coluna de direção com os pedais e as alavancas, e o volante em `../partes/banco/`, `../partes/coluna-direcao/` e `../partes/volante/`
   (fatia 6); o GLP com o berço e as cintas, o escape e a alça de acesso em `../partes/glp/`, `../partes/escape/` e `../partes/alca/`
   (fatia 7), com as medidas e a fonte de cada uma na TABELA delas. Este módulo só as chama sobre o estado da máquina. A forma é a deste
   rascunho, com o que encosta na carcaça e no protetor cortado pela face que recebe a peça, onde antes entrava nela: os pés do
   protetor, a base do assento, o pé da coluna, as hastes dos pedais e das alavancas, a chapa do berço, o pé do escape e os braços da
   alça; o volante ganhou o furo do eixo da coluna. */
export function montarProtetorPosto(estado) {
  montarProtetor(estado);
  montarBanco(estado);
  montarColunaDirecao(estado);
  montarVolante(estado);
  montarGlp(estado);
  montarEscape(estado);
  montarAlca(estado);
}

/* --- a carcaça mais as partes daqui ------------------------------------------------------------------------------------------------- */
const base = carcaca.opcoes[0];
const passosDaCarcaca = base.passos.filter(([op, a]) => !(op === 'rotaciona' && !a.sel));
const maiorId = passosDaCarcaca.reduce((m, [, a]) => Math.max(m, a?.origemId ?? 0), 0);
const estado = { passos: [...passosDaCarcaca], topo: { ...base.topo }, origem: maiorId };
montarProtetorPosto(estado);
if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 1000, -995] }]);

export default {
  plano: 'Protetor do operador, posto do operador e acessórios da empilhadeira sobre a carcaça em rascunho, pelas vistas de IA e pela lateral.',
  vista: 'direita',
  opcoes: [{ titulo: 'carcaça com protetor, posto e acessórios', nota: 'rascunho das fatias 5, 6 e 7', passos: estado.passos, topo: estado.topo }],
};
