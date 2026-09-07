/* citacoes.mjs — documento de leitura obrigatória não pode mandar abrir arquivo
 * que não existe.
 *
 * `docs:links:check` confere link entre documentos. Ninguém conferia o que a
 * documentação cita em CRASE: caminho de arquivo e passo de npm. E era ali que
 * estava o estrago, porque quem lê essas citações é justamente quem não conhece
 * a árvore e vai obedecer.
 *
 * Medido em 2026-09-07: vinte e duas citações mortas no caminho de leitura
 * obrigatório. A pior concentração estava na referência de operações — a peça
 * apontada como modelo de identidade estável, a que ensina a abrir vão e mais
 * nove exemplos foram removidos do acervo em `c78961f`, e a referência
 * continuou mandando abrir todos. O README mandava copiar um `_modelo.js` para
 * satisfazer um gate de selo, e os dois saíram no MESMO commit.
 *
 * Documento longo custa contexto; documento ERRADO custa rodada. Uma sessão que
 * obedece a citação morta procura, não acha, e tem de decidir sozinha se o erro
 * é dela ou do texto — e é justamente a sessão nova, sem histórico, que menos
 * consegue decidir isso.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/* O caminho que uma sessão percorre antes de escrever a primeira linha. Não é
   o acervo inteiro de documentação: é o que a porta e as skills mandam ler. */
const PORTAS = ['README.md', 'CLAUDE.md', 'AGENTS.md'];
const PASTAS = ['docs/mecanifica/usar', '.claude/skills'];

/* Pastas onde uma receita citada pelo nome curto pode morar. */
const PASTAS_RECEITA = [
  'prototipos/procedural/v3/pecas',
  'prototipos/procedural/v3/armas',
  'prototipos/procedural/v3/maquinas',
];

/* Nomes que as skills mandam CRIAR, não abrir. `modelar-maquina` diz para
   escrever `estrutura.js`, `cinematico.js`, `ferramentas.js` e `montagem.js`
   dentro da pasta da máquina nova: são gabaritos de nome, não citações. */
const NOMES_A_CRIAR = new Set(['estrutura.js', 'cinematico.js', 'ferramentas.js', 'montagem.js', 'index.js']);

const RE_CAMINHO = /`((?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.(?:js|mjs|ts|tsx|json|html|css|py|svg|png))`/g;
const RE_RECEITA = /`(_?[a-z][a-z0-9-]*\.js)`/g;
const RE_NPM = /`?npm run ([a-z0-9:_-]+)/g;

function documentos() {
  const encontrados = PORTAS.filter((p) => existsSync(join(RAIZ, p)));
  const varrer = (relativo) => {
    const absoluto = join(RAIZ, relativo);
    if (!existsSync(absoluto)) return;
    for (const entrada of readdirSync(absoluto, { withFileTypes: true })) {
      const filho = `${relativo}/${entrada.name}`;
      if (entrada.isDirectory()) varrer(filho);
      else if (entrada.name.endsWith('.md')) encontrados.push(filho);
    }
  };
  for (const pasta of PASTAS) varrer(pasta);
  return encontrados;
}

/* Arquivo GERADO é citação legítima e pode não existir agora: `sessao-ativa.json`
   nasce quando alguém ativa a bancada e some quando a suíte limpa atrás de si.
   Exigir que ele esteja no disco transformaria o gate numa exigência de estado
   de trabalho, não de documentação. O critério é o `.gitignore`: o que o
   repositório não versiona, este gate não cobra. */
function ignoradosPeloGit(caminhos) {
  if (caminhos.length === 0) return new Set();
  const execucao = spawnSync('git', ['check-ignore', '--stdin'], {
    cwd: RAIZ, input: caminhos.join('\n'), encoding: 'utf8',
  });
  if (execucao.error) return new Set();
  return new Set((execucao.stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean));
}

function existeArquivo(relativo) {
  const alvo = join(RAIZ, relativo);
  try { return existsSync(alvo) && statSync(alvo).isFile(); } catch { return false; }
}

function existeReceita(nome) {
  return PASTAS_RECEITA.some((pasta) => existeArquivo(`${pasta}/${nome}`));
}

export function conferirCitacoes({ raiz = RAIZ } = {}) {
  const passos = new Set(Object.keys(JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).scripts));
  const problemas = [];
  let conferidas = 0;

  for (const doc of documentos()) {
    const texto = readFileSync(join(raiz, doc), 'utf8');

    for (const [, caminho] of texto.matchAll(RE_CAMINHO)) {
      conferidas += 1;
      /* Caminho citado dentro de uma skill pode ser relativo à própria skill
         (`references/x.md`) ou à raiz. Vale se resolver por qualquer um. */
      const daSkill = join(dirname(doc), caminho).replace(/\\/g, '/');
      if (!existeArquivo(caminho) && !existeArquivo(daSkill)) {
        problemas.push({ doc, citacao: caminho, tipo: 'caminho' });
      }
    }

    for (const [, nome] of texto.matchAll(RE_RECEITA)) {
      if (NOMES_A_CRIAR.has(nome)) continue;
      conferidas += 1;
      if (!existeReceita(nome) && !existeArquivo(nome)) {
        problemas.push({ doc, citacao: nome, tipo: 'receita' });
      }
    }

    for (const [, passo] of texto.matchAll(RE_NPM)) {
      conferidas += 1;
      if (!passos.has(passo)) problemas.push({ doc, citacao: `npm run ${passo}`, tipo: 'passo' });
    }
  }

  const ignorados = ignoradosPeloGit(problemas.filter((p) => p.tipo === 'caminho').map((p) => p.citacao));
  return {
    problemas: problemas.filter((p) => !ignorados.has(p.citacao)),
    conferidas,
    documentos: documentos().length,
  };
}

function executar() {
  const { problemas, conferidas, documentos: total } = conferirCitacoes();
  if (problemas.length > 0) {
    console.error(`docs:citacoes FALHOU — ${problemas.length} citação(ões) sem alvo:`);
    for (const { doc, citacao, tipo } of problemas) {
      console.error(`  ${doc}\n    ${tipo}: ${citacao}`);
    }
    console.error(
      '\nCorrija a citação ou remova o ponteiro. Se o arquivo foi removido de propósito,'
      + '\no texto que o citava precisa ser reescrito — a lição continua valendo, o endereço não.',
    );
    process.exitCode = 1;
    return;
  }
  console.log(`docs:citacoes ok — ${conferidas} citação(ões) conferidas em ${total} documento(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
