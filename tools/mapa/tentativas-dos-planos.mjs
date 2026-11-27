/* tentativas-dos-planos.mjs — a tabela de tentativas do banco de provas de cada plano de modelagem, e a conferência que a cobra.
 *
 * O banco de provas de um plano de modelagem guarda uma tabela com a hipótese, o ensaio, o resultado medido e o destino de cada
 * tentativa (modelo em `docs/modelar/banco-de-provas/MODELO-DE-TENTATIVAS.md`). Quem retoma um defeito lê a tabela antes de propor um
 * ensaio que já falhou. A conferência recusa o plano de modelagem que passa a `concluído` sem a tabela no banco de provas.
 *
 * O QUE É PLANO DE MODELAGEM (critério escrito, decidido em 2026-11-27): o plano cujo **Território:** tem um caminho em
 * `procedural/pecas/` (uma peça ou um objeto), em `procedural/familias/` (uma família de forma) ou em `procedural/nucleo/` (uma operação
 * que dá forma à malha). O plano de ferramenta, de documentação, de processo ou de CI não muda forma e não é cobrado; o arquivo de documento (`.md`, o `DOSSIE.md` entre eles), de teste (`.test.`) e de dado (`.json`) do território também não conta. Um caminho
 * compartilhado entre planos (`procedural/familias/index.js`) não conta, porque é só o registro das famílias.
 *
 * O QUE CONTA COMO TABELA: um arquivo `.md` do banco de provas do plano (uma subpasta `docs/modelar/banco-de-provas/<pasta>/` do
 * território, em qualquer profundidade; a raiz do banco e o caminho com `..` não valem) com uma linha de cabeçalho de tabela, fora de
 * bloco de código, que tem as quatro colunas, nesta ordem: Hipótese, Ensaio, Resultado medido, Destino (negrito e espaços a mais não
 * contam), seguida de ao menos uma linha de dados. Só `concluído` é cobrado: o cancelado pode não ter chegado a ensaiar nada.
 *
 * O PLANO QUE SAI NO ENVIO. `git rm` à mão de plano concluído escapava da conferência, que só vê o que está na raiz de planos/: por isso
 * `planosRemovidosNoEnvio` devolve os planos concluídos que o envio tirou da raiz (removidos ou movidos de pasta), lidos na última versão
 * que o envio os tinha, desde a base comum com a main (como `territorio:check`), e a conferência os cobra do mesmo modo.
 *
 * Só importa `node:`; `planos.mjs` a chama e roda antes do `npm ci`. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

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

const semPontoBarra = (c) => c.replace(/^(\.\/)+/, '');

/** Se o caminho do território dá forma à malha: o arquivo de documento (`.md`, o `DOSSIE.md` entre eles), de teste (`.test.`) e de dado (`.json`, fixture ou medida) não dá. */
export function caminhoQueMudaForma(caminho) {
  const c = semPontoBarra(caminho);
  const nome = c.split('/').pop();
  return !(/\.md$/.test(nome) || /\.test\./.test(nome) || /\.json$/.test(nome));
}

/** Se o território do plano muda forma (critério no cabeçalho deste arquivo). */
export function ehPlanoDeModelagem(texto) {
  return caminhosDoTerritorio(texto).map(semPontoBarra).some((c) => !COMPARTILHADOS.includes(c) && caminhoQueMudaForma(c)
    && PASTAS_DE_MODELAGEM.some((p) => c.startsWith(p) || p.startsWith(c.replace(/\/*$/, '/'))));
}

const temPontoPonto = (c) => c.split(/[\\/]/).includes('..');

/**
 * As pastas do banco de provas no território do plano, com a barra no fim: uma subpasta de `docs/modelar/banco-de-provas/` (a raiz do
 * banco não vale, porque qualquer plano a emprestaria) e sem `..`. `documentos` é a pasta dos documentos (só a fixture a muda).
 */
export function bancosDeProvasDe(texto, documentos = DOCUMENTOS) {
  const banco = `${documentos}/banco-de-provas/`;
  return caminhosDoTerritorio(texto).map(semPontoBarra)
    .filter((c) => c.startsWith(banco) && c.length > banco.length && !temPontoPonto(c) && !c.endsWith('.md'))
    .map((c) => c.replace(/\/*$/, '/'));
}

/* O texto de uma célula de cabeçalho: sem negrito, itálico nem crase, com os espaços juntos. */
const normalizar = (s) => s.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const celulas = (linha) => linha.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const ehSeparador = (linha) => celulas(linha).every((c) => /^:?-{1,}:?$/.test(c));

/**
 * Se o texto tem, fora de bloco de código, uma linha de cabeçalho de tabela com as quatro colunas, em ordem, seguida de ao menos uma
 * linha de dados (o cabeçalho sozinho, ou com o separador e células vazias, é só o modelo copiado).
 */
export function temTabelaDeTentativas(texto) {
  let dentro = false;
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i];
    if (/^\s*(```|~~~)/.test(linha)) { dentro = !dentro; continue; }
    if (dentro || !linha.trim().startsWith('|')) continue;
    const colunas = celulas(linha).map(normalizar);
    if (colunas.length < COLUNAS.length || !COLUNAS.every((c, k) => colunas[k] === c)) continue;
    for (let j = i + 1; j < linhas.length && linhas[j].trim().startsWith('|'); j += 1) {
      if (!ehSeparador(linhas[j]) && celulas(linhas[j]).some((c) => c !== '')) return true;
    }
  }
  return false;
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
    if (estado !== 'concluído') continue;
    const fora = caminhosDoTerritorio(texto).filter(temPontoPonto);
    if (fora.length) { problemas.push(`${nome}: o **Território:** de plano concluído tem \`..\` em ${fora.join(', ')}; escreva o caminho a partir da raiz do repositório, sem sair dele`); continue; }
    if (!ehPlanoDeModelagem(texto)) continue;
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

/**
 * Os planos concluídos que o envio tirou da raiz de `docs/modelar/planos/` (apagados ou movidos), como `[{ nome, estado, texto }]`, com
 * o texto da última versão que o envio teve deles. Vazio quando a raiz não é um repositório git, ou quando não há a ref da main nem
 * base comum com `HEAD` (fora do CI a conferência segue sem eles).
 */
export function planosRemovidosNoEnvio(raiz, { ref = 'origin/main' } = {}) {
  const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    const base = git('merge-base', `${ref}^{commit}`, 'HEAD').trim();
    if (!base) return [];
    const pasta = `${DOCUMENTOS}/planos/`;
    const removidos = git('diff', '--no-renames', '--name-status', '-z', base, 'HEAD', '--', pasta).split('\0').filter(Boolean);
    const achados = [];
    for (let i = 0; i < removidos.length; i += 2) {
      const caminho = removidos[i + 1];
      const nome = caminho.slice(pasta.length);
      if (removidos[i] !== 'D' || nome.includes('/') || !/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(nome)) continue;
      const ultimoCommit = git('log', '-1', '--format=%H', `${base}..HEAD`, '--', caminho).trim();
      const texto = git('show', `${ultimoCommit ? `${ultimoCommit}^` : base}:${caminho}`);
      const estado = texto.match(/^\*\*Estado:\*\*\s*(.+?)\s*$/mi)?.[1]?.toLowerCase();
      achados.push({ nome, estado, texto });
    }
    return achados;
  } catch { return []; }
}
