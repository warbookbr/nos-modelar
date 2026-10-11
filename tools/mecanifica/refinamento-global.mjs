/* refinamento-global.mjs — o adaptador de disco do refinamento da forma global.
 *
 * O núcleo (`src/autoria/refinamento-global.js`) recebe o andaime já lido. Aqui o caminho que a receita declara em
 * `REFINA.andaime` vira o JSON do andaime: relativo à pasta da peça, e confinado ao repositório, como a referência
 * do PLANO. O alvo N2 que `REFINA.alvo` declara, para o G01 sobre a malha da peça, é lido do mesmo jeito. Quem chama é o
 * veredito de `descrever-peca`, que a guarda do acervo e a auditoria da peça já rodam. */
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferirRefinamentoGlobal, normalizarRefinamentoGlobal } from '../../src/autoria/refinamento-global.js';
import { avaliarG01DaPeca } from '../../src/autoria/g01-do-andaime.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* Lê o JSON que `REFINA.<campo>` aponta: relativo à pasta da peça, confinado ao repositório. */
function lerJsonDoRefinamento(campo, caminho, caminhoDaReceita, raiz) {
  if (!caminhoDaReceita) {
    throw new Error(`REFINA.${campo} é um caminho relativo à pasta da peça, e esta peça foi entregue sem arquivo; execute-a pelo nome ou pelo caminho da receita.`);
  }
  const arquivo = resolve(dirname(caminhoDaReceita), caminho);
  const dentro = relative(raiz, arquivo);
  if (dentro.startsWith('..') || isAbsolute(dentro)) {
    throw new Error(`REFINA.${campo} '${caminho}' sai do repositório.`);
  }
  let texto;
  try {
    texto = readFileSync(arquivo, 'utf8');
  } catch {
    throw new Error(`REFINA.${campo} '${caminho}' não existe em ${dirname(relative(raiz, caminhoDaReceita)) || '.'}/ (procurado em ${dentro}).`);
  }
  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw new Error(`REFINA.${campo} '${caminho}' não é JSON: ${erro.message}`);
  }
}

export function lerAndaimeDoRefinamento(refinamento, caminhoDaReceita, { raiz = REPO } = {}) {
  return lerJsonDoRefinamento('andaime', refinamento.andaime, caminhoDaReceita, raiz);
}

/** O alvo N2 que `REFINA.alvo` declara, ou `null` quando a receita não declara. */
export function lerAlvoDoRefinamento(refinamento, caminhoDaReceita, { raiz = REPO } = {}) {
  return refinamento.alvo === undefined ? null : lerJsonDoRefinamento('alvo', refinamento.alvo, caminhoDaReceita, raiz);
}

/** Confere a receita que declara `REFINA`. `null` quando ela não declara; do contrário, o resultado do núcleo. */
export function conferirRefinamentoDaReceita({ receita, neutro, caminhoDaReceita, raiz }) {
  const refinamento = normalizarRefinamentoGlobal(receita.REFINA);
  if (!refinamento) return null;
  const andaime = lerAndaimeDoRefinamento(refinamento, caminhoDaReceita, { raiz });
  return conferirRefinamentoGlobal({ refinamento, andaime, neutro });
}

/** O G01 sobre a malha da peça, quando a receita declara `REFINA.alvo`. `null` quando não há alvo N2 para conferir (sem `REFINA` ou
 *  sem `alvo` nele); do contrário, o resultado de `avaliarG01DaPeca`. */
export function conferirG01DaReceita({ receita, neutro, caminhoDaReceita, raiz }) {
  const refinamento = normalizarRefinamentoGlobal(receita.REFINA);
  if (!refinamento || refinamento.alvo === undefined) return null;
  const andaime = lerAndaimeDoRefinamento(refinamento, caminhoDaReceita, { raiz });
  const alvo = lerAlvoDoRefinamento(refinamento, caminhoDaReceita, { raiz });
  return avaliarG01DaPeca({ neutro, refinamento, andaime, alvo });
}
