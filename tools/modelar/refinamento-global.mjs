/* refinamento-global.mjs — o adaptador de disco do refinamento da forma global.
 *
 * O núcleo (`src/autoria/refinamento-global.js`) recebe o andaime já lido. Aqui o caminho que a receita declara em
 * `REFINA.andaime` vira o JSON do andaime: relativo à pasta da peça, e confinado ao repositório, como a referência
 * do PLANO. O alvo N2 que `REFINA.alvo` declara, para o G01 sobre a malha da peça, e as formas do esboço que `REFINA.esboco.arquivo`
 * declara, para a forma de cada parte contra a forma do esboço (`conferirFormaDoEsbocoDaReceita`), são lidos do mesmo jeito. Quem chama é o
 * veredito de `descrever-peca`, que a guarda do acervo e a auditoria da peça já rodam.
 *
 * AS FORMAS DO ESBOÇO SÃO DADO GUARDADO. Até 2026-11-05 `REFINA.esboco.arquivo` apontava um `.esboco.json`, e a conferência o resolvia pelo
 * módulo antigo do esboço. O módulo saiu (plano esboço pelo núcleo), e o arquivo agora é o que ele resolvia, gravado uma vez: as formas
 * resolvidas da opção (`mecanifica.formas-resolvidas@1`, `.formas.json`), com a malha de cada forma de família em `malhas` (como o
 * módulo a lia, recentrada e com as faces para fora), a orientação do plano do esboço em `orientacao` e, quando o pacote do crítico usa o
 * arquivo, a composta de cada unidade em `alvos`. `lerFormasGuardadas` confere o formato e a opção e entrega a malha de família. */
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

/** As formas do esboço que `REFINA.esboco.arquivo` declara, lidas do disco, ou `null` quando a receita não declara. */
export function lerEsbocoDoRefinamento(refinamento, caminhoDaReceita, { raiz = REPO } = {}) {
  return refinamento.esboco === undefined ? null : lerJsonDoRefinamento('esboco.arquivo', refinamento.esboco.arquivo, caminhoDaReceita, raiz);
}

/**
 * As formas resolvidas guardadas (`bruto`, o JSON lido), conferidas: o formato e a opção que `opcao` (número a partir de 1, ou título)
 * declara. Devolve `{ dados, malhaDaFamilia }`, em que `malhaDaFamilia(forma)` é a malha guardada da forma de família (a falta dela é um
 * `ErroDoSolido`, que a conferência relata como parte sem sólido). `onde` nomeia o arquivo nas mensagens. A Manifold só carrega aqui.
 */
export async function lerFormasGuardadas(bruto, opcao, onde = 'o arquivo das formas do esboço') {
  const { ErroDoSolido } = await import('../../src/autoria/solido-do-esboco.js');
  const { FORMATO_FORMAS_RESOLVIDAS } = await import('../../src/autoria/tradutor-nivel-zero.js');
  if (!bruto || typeof bruto !== 'object' || bruto.formato !== FORMATO_FORMAS_RESOLVIDAS || !Array.isArray(bruto.formas)) {
    throw new Error(`${onde} não é um arquivo de formas resolvidas ("formato": "${FORMATO_FORMAS_RESOLVIDAS}", com "formas"). O esboço antigo saiu do repositório em 2026-11-05, e a conferência lê as formas que ele resolvia, guardadas num .formas.json.`);
  }
  const gravada = bruto.opcao ?? {};
  const confere = typeof opcao === 'string' ? gravada.titulo === opcao : gravada.numero === opcao;
  if (!confere) {
    throw new Error(`${onde} guarda a opção ${gravada.numero}${gravada.titulo ? ` (${gravada.titulo})` : ''} do esboço, e a declaração pede a opção ${JSON.stringify(opcao)}; as formas de outra opção não foram guardadas.`);
  }
  const malhas = bruto.malhas ?? {};
  const malhaDaFamilia = (forma) => {
    if (!Object.hasOwn(malhas, forma.id)) throw new ErroDoSolido(`a forma de família "${forma.id}" não tem a malha guardada em ${onde}`, 'familia-sem-malha', forma.id);
    return malhas[forma.id];
  };
  return { dados: bruto, malhaDaFamilia };
}

/** A forma de cada parte contra a forma do esboço que ela refina (`REFINA.esboco`), pela razão interseção/união de volume. `null` quando a
 *  receita não declara `REFINA.esboco`; do contrário, o resultado de `conferirFormaDoEsboco`. A Manifold só carrega quando a receita
 *  declara o campo. */
export async function conferirFormaDoEsbocoDaReceita({ receita, neutro, caminhoDaReceita, raiz }) {
  const refinamento = normalizarRefinamentoGlobal(receita.REFINA);
  if (!refinamento || refinamento.esboco === undefined) return null;
  const bruto = lerEsbocoDoRefinamento(refinamento, caminhoDaReceita, { raiz });
  const { dados, malhaDaFamilia } = await lerFormasGuardadas(bruto, refinamento.esboco.opcao, `REFINA.esboco.arquivo '${refinamento.esboco.arquivo}'`);
  const { conferirFormaDoEsboco } = await import('../../src/autoria/forma-do-esboco.js');
  return conferirFormaDoEsboco({ esboco: refinamento.esboco, dados, neutro, malhaDaFamilia });
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
