/* refinamento-global.mjs — o adaptador de disco do refinamento da forma global.
 *
 * O núcleo (`src/autoria/refinamento-global.js`) recebe o andaime já lido. Aqui o caminho que a receita declara em
 * `REFINA.andaime` vira o JSON do andaime: relativo à pasta da peça, e confinado ao repositório, como a referência
 * do PLANO. Quem chama é o veredito de `descrever-peca`, que a guarda do acervo e a auditoria da peça já rodam. */
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferirRefinamentoGlobal, normalizarRefinamentoGlobal } from '../../src/autoria/refinamento-global.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function lerAndaimeDoRefinamento(refinamento, caminhoDaReceita, { raiz = REPO } = {}) {
  if (!caminhoDaReceita) {
    throw new Error('REFINA.andaime é um caminho relativo à pasta da peça, e esta peça foi entregue sem arquivo; execute-a pelo nome ou pelo caminho da receita.');
  }
  const arquivo = resolve(dirname(caminhoDaReceita), refinamento.andaime);
  const dentro = relative(raiz, arquivo);
  if (dentro.startsWith('..') || isAbsolute(dentro)) {
    throw new Error(`REFINA.andaime '${refinamento.andaime}' sai do repositório.`);
  }
  let texto;
  try {
    texto = readFileSync(arquivo, 'utf8');
  } catch {
    throw new Error(`REFINA.andaime '${refinamento.andaime}' não existe em ${dirname(relative(raiz, caminhoDaReceita)) || '.'}/ (procurado em ${dentro}).`);
  }
  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw new Error(`REFINA.andaime '${refinamento.andaime}' não é JSON: ${erro.message}`);
  }
}

/** Confere a receita que declara `REFINA`. `null` quando ela não declara; do contrário, o resultado do núcleo. */
export function conferirRefinamentoDaReceita({ receita, neutro, caminhoDaReceita, raiz }) {
  const refinamento = normalizarRefinamentoGlobal(receita.REFINA);
  if (!refinamento) return null;
  const andaime = lerAndaimeDoRefinamento(refinamento, caminhoDaReceita, { raiz });
  return conferirRefinamentoGlobal({ refinamento, andaime, neutro });
}
