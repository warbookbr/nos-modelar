/* tentativas-dos-planos.mjs — a tabela de tentativas do banco de provas de cada plano de modelagem, e a conferência que a cobra.
 *
 * O banco de provas de um plano de modelagem guarda uma tabela com a hipótese, o ensaio, o resultado medido e o destino de cada
 * tentativa (modelo em `docs/modelar/banco-de-provas/MODELO-DE-TENTATIVAS.md`). Quem retoma um defeito lê a tabela antes de propor um
 * ensaio que já falhou. A conferência recusa o plano de modelagem que passa a `concluído` sem a tabela no banco de provas.
 *
 * O QUE É PLANO DE MODELAGEM (critério escrito, decidido em 2026-11-27): o plano cujo **Território:** tem um caminho em
 * `procedural/pecas/` (uma peça ou um objeto), em `procedural/familias/` (uma família de forma) ou em `procedural/nucleo/` (uma operação
 * que dá forma à malha). O plano de ferramenta, de documentação, de processo ou de CI não muda forma e não é cobrado. Um caminho
 * compartilhado entre planos (`procedural/familias/index.js`) não conta, porque é só o registro das famílias.
 *
 * O QUE CONTA COMO TABELA: um arquivo `.md` do banco de provas do plano (a pasta `docs/modelar/banco-de-provas/<pasta>/` do
 * território, em qualquer profundidade) com uma linha de cabeçalho de tabela que tem as quatro colunas, nesta ordem: Hipótese, Ensaio,
 * Resultado medido, Destino. Só `concluído` é cobrado: o cancelado pode não ter chegado a ensaiar nada.
 *
 * Só importa `node:`; `planos.mjs` a chama e roda antes do `npm ci`. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const DOCUMENTOS = 'docs/modelar';
export const BANCO_DE_PROVAS = `${DOCUMENTOS}/banco-de-provas/`;
export const MODELO = `${BANCO_DE_PROVAS}MODELO-DE-TENTATIVAS.md`;
export const PASTAS_DE_MODELAGEM = ['procedural/pecas/', 'procedural/familias/', 'procedural/nucleo/'];
export const COLUNAS = ['hipótese', 'ensaio', 'resultado medido', 'destino'];
const COMPARTILHADOS = ['procedural/familias/index.js'];

/* O cabeçalho que o modelo prescreve; as quatro colunas em ordem. */
export const TABELA_DE_TENTATIVAS = '| Hipótese | Ensaio | Resultado medido | Destino |';

/** Os caminhos entre crases da linha **Território:** do plano, como escritos; vazio sem a linha ou com "nenhum". */
export function caminhosDoTerritorio(texto) {
  const linha = texto.match(/^\*\*Território:\*\*\s*(.*?)\s*$/m)?.[1] ?? '';
  return [...linha.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
}

/** Se o território do plano muda forma (critério no cabeçalho deste arquivo). */
export function ehPlanoDeModelagem(texto) {
  return caminhosDoTerritorio(texto).some((c) => !COMPARTILHADOS.includes(c) && PASTAS_DE_MODELAGEM.some((p) => c.startsWith(p) || p.startsWith(c.replace(/\/*$/, '/'))));
}

/** As pastas do banco de provas no território do plano, com a barra no fim. `documentos` é a pasta dos documentos (só a fixture a muda). */
export function bancosDeProvasDe(texto, documentos = DOCUMENTOS) {
  const banco = `${documentos}/banco-de-provas/`;
  return caminhosDoTerritorio(texto).filter((c) => c.startsWith(banco) && c !== `${banco}MODELO-DE-TENTATIVAS.md` && !c.endsWith('.md')).map((c) => c.replace(/\/*$/, '/'));
}

const normalizar = (s) => s.trim().toLowerCase();

/** Se o texto tem uma linha de cabeçalho de tabela com as quatro colunas, em ordem. */
export function temTabelaDeTentativas(texto) {
  return texto.split('\n').some((linha) => {
    if (!linha.trim().startsWith('|')) return false;
    const colunas = linha.trim().replace(/^\||\|$/g, '').split('|').map(normalizar);
    return colunas.length >= COLUNAS.length && COLUNAS.every((c, i) => colunas[i] === c);
  });
}

function arquivosMd(dir, achados = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.isDirectory()) arquivosMd(join(dir, e.name), achados);
    else if (e.name.endsWith('.md')) achados.push(join(dir, e.name));
  }
  return achados;
}

/** O caminho (relativo à raiz) do primeiro `.md` da pasta do banco de provas que tem a tabela, ou null. */
export function tabelaDeTentativasEm(raiz, pasta) {
  const dir = join(raiz, pasta);
  if (!existsSync(dir)) return null;
  const arquivo = arquivosMd(dir).find((a) => temTabelaDeTentativas(readFileSync(a, 'utf8')));
  return arquivo ? arquivo.slice(raiz.length + 1).split('\\').join('/') : null;
}

/**
 * As recusas do fechamento: `planos` são `[{ nome, estado, texto }]` dos planos em jogo na raiz de planos/. O plano de modelagem em
 * `concluído` precisa de uma pasta de banco de provas no território e da tabela nela.
 */
export function problemasDeTentativas(planos, raiz) {
  const problemas = [];
  for (const { nome, estado, texto } of planos) {
    if (estado !== 'concluído' || !ehPlanoDeModelagem(texto)) continue;
    const comoFazer = `copie o cabeçalho de ${MODELO}, preencha as tentativas e a lição, e leve a lição ao guia da técnica`;
    const bancos = bancosDeProvasDe(texto);
    if (!bancos.length) {
      problemas.push(`${nome}: plano de modelagem concluído sem banco de provas no **Território:** (esperado um caminho em ${BANCO_DE_PROVAS}<pasta>/ com a tabela de tentativas); ${comoFazer}`);
    } else if (!bancos.some((b) => tabelaDeTentativasEm(raiz, b))) {
      problemas.push(`${nome}: plano de modelagem concluído e o banco de provas (${bancos.join(', ')}) não tem a tabela de tentativas, com as colunas ${COLUNAS.join(', ')}; ${comoFazer}`);
    }
  }
  return problemas;
}
