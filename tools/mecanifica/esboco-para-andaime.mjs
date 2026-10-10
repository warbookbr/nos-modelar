/* esboco-para-andaime.mjs — o adaptador que liga o esboço ao andaime da forma global N2.
 *
 * Lê o esboço (JSON escrito ou já expandido, ou um arquivo `.esboco.json`), pede ao módulo as formas resolvidas da opção
 * (`formasResolvidas`) e entrega o dado ao tradutor de `src/autoria/tradutor-nivel-zero.js`, que não conhece o módulo. É o único
 * lugar que importa os dois lados, e pode virar comando depois: a função devolve o resultado do tradutor com a opção lida, e
 * `descreverTraducao` dá o texto de uma linha por forma que ficou de fora. */
import { readFileSync } from 'node:fs';
import { formasResolvidas } from '../../modulos/esboco/src/formas-resolvidas.js';
import { traduzirFormasParaAndaime } from '../../src/autoria/tradutor-nivel-zero.js';

/** O andaime da opção `opcao` (número a partir de 1, ou título) de um esboço já lido. As opções do tradutor (`id`, `objetivo`,
 *  `alvo`, `familia`, `intencao`, `eixos`, `estrito`) passam como estão. */
export function andaimeDoEsboco(esboco, { opcao = 1, ...opcoes } = {}) {
  const dados = formasResolvidas(esboco, opcao);
  return { ...traduzirFormasParaAndaime(dados, opcoes), opcao: dados.opcao };
}

/** O mesmo, lendo o arquivo do esboço. */
export function andaimeDoArquivo(caminho, opcoes = {}) {
  let esboco;
  try {
    esboco = JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    throw new Error(`não foi possível ler o esboço ${caminho}: ${erro.message}`);
  }
  return andaimeDoEsboco(esboco, opcoes);
}

/** O resumo em texto: quantos volumes entraram e, por forma que ficou de fora, o motivo. */
export function descreverTraducao({ andaime, naoTraduzidas, ocultas, opcao }) {
  const linhas = [
    `opção ${opcao.numero}${opcao.titulo ? ` (${opcao.titulo})` : ''}: ${andaime.volumes.length} volumes no andaime ${andaime.id}, ${naoTraduzidas.length} forma(s) sem correspondência exata, ${ocultas.length} oculta(s) fora do andaime`,
    ...naoTraduzidas.map((n) => `  ${n.id} (${n.tipo}): ${n.motivo}`),
  ];
  return linhas.join('\n');
}
