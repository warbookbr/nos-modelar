/* aceites-e-envio.mjs — o aceite da pessoa no ALINHAMENTO.md e os arquivos que o envio mudou, sem dependência de pacote.
 *
 * Mora à parte de `fluxo-do-objeto.mjs` (que o reexporta) porque o gerador do dossiê roda no job de junção do CI, que não faz `npm ci`:
 * aqui só entram `node:`. `tools/ci/geradores-sem-pacote.test.mjs` confere que cada gerador da junção carrega sem `node_modules`. */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const DATA = /\d{4}-\d{2}-\d{2}/;
const colapsar = (t) => t.replace(/\s+/g, ' ');

/**
 * O aceite da pessoa e as decisões pendentes de um `ALINHAMENTO.md`. O aceite é a linha `alinhamento:`, `rascunho:` ou `delegação:` com data
 * na seção "Aceite" (`origem: 'registrado'`); sem ela vale o registro anterior ao formato (`origem: 'anterior'`): a delegação da pessoa, o
 * combinado ou aprovado com ela. As decisões pendentes são os parágrafos da seção "Decisões que dependem da pessoa" (ou "pendentes").
 * O alinhamento que tem essa seção já está no formato novo, e o registro anterior não vale para ele: a frase "aceita pela pessoa" sobre a
 * prancha do carro fastback (2026-11-14) passava por aceite do alinhamento inteiro.
 */
export function lerAceites(texto) {
  const linhas = texto.split(/\r?\n/);
  const aceites = { alinhamento: null, rascunho: null };
  let dentro = false;
  for (const l of linhas) {
    if (/^#+\s/.test(l)) { dentro = /^#+\s*(aceite|delega)/i.test(l); continue; }
    if (!dentro) continue;
    const m = /^\s*(?:[-*]\s*)?(alinhamento|rascunho|delega[cç][aã]o)(?:\s+e\s+(rascunho|alinhamento))?\s*:\s*(.{8,})$/i.exec(l);
    if (!m || !DATA.test(m[3])) continue;
    const quem = [m[1], m[2]].filter(Boolean).map((x) => x.toLowerCase());
    const aceite = { origem: 'registrado', texto: m[3].trim() };
    if (quem.includes('alinhamento') || quem.some((x) => x.startsWith('delega'))) aceites.alinhamento ??= aceite;
    if (quem.includes('rascunho') || quem.some((x) => x.startsWith('delega'))) aceites.rascunho ??= aceite;
  }
  const plano = colapsar(texto);
  const formatoNovo = linhas.some((l) => /^#+.*\b(dependem da pessoa|decis[õo]es pendentes|pendentes? da pessoa|aguardando a pessoa)/i.test(l));
  const anterior = (re) => { const m = formatoNovo ? null : re.exec(plano); return m ? { origem: 'anterior', texto: m[0].trim() } : null; };
  const delegacao = anterior(/[^.]*(?:\bdeleg\p{L}+ d[ao] pessoa|\bpessoa (?:\p{L}+ ){0,3}deixou (?:a )?condu\p{L}+)[^.]*\./iu);
  const combinado = anterior(/[^.]*\b(?:combinad\w+|conduzid\w+|aprovad\w+|aceit\w+) (?:com a pessoa|pela pessoa|por ela)\b[^.]*\./i);
  aceites.alinhamento ??= delegacao ?? combinado;
  aceites.rascunho ??= delegacao ?? anterior(/[^.]*\brascunho\b[^.]*\b(?:aprovad\w+|aceit\w+)\b[^.]*\bpessoa\b[^.]*\./i);
  const decisoes = [];
  const inicio = linhas.findIndex((l) => /^#+.*\b(dependem da pessoa|decis[õo]es pendentes|pendentes? da pessoa|aguardando a pessoa)/i.test(l));
  if (inicio >= 0) {
    let paragrafo = [];
    const fecha = () => {
      if (paragrafo.length) decisoes.push(colapsar(paragrafo.join(' ')).replace(/^(?:[-*]|\d+[.)])\s+/, '').trim());
      paragrafo = [];
    };
    for (const l of linhas.slice(inicio + 1)) {
      if (/^#/.test(l)) break;
      if (l.trim() === '') fecha(); else paragrafo.push(l);
    }
    fecha();
  }
  return { ...aceites, decisoes: decisoes.filter(Boolean) };
}

const PASTA_DAS_PECAS_DO_ENVIO = 'procedural/pecas';

/**
 * Os arquivos de `procedural/pecas/` que o envio mudou, relativos a essa pasta (`<objeto>/...`), fora os `DOSSIE.md` gerados (o da raiz do objeto e
 * o de `partes/<parte>/`): a pasta de primeiro nível com arquivo mudado desde a base comum com a main, contando o que ainda não foi gravado.
 * Vazio quando a raiz não é um repositório git ou não há a ref da main (fora do CI a conferência segue sem eles, como o `territorio:check`).
 */
export function arquivosMudadosNoEnvio(raiz = REPO, { ref = 'origin/main' } = {}) {
  const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    const base = git('merge-base', `${ref}^{commit}`, 'HEAD').trim();
    if (!base) return [];
    const pasta = PASTA_DAS_PECAS_DO_ENVIO;
    const mudados = [...git('diff', '--name-only', '-z', '--no-renames', base, '--', `${pasta}/`).split('\0'), ...git('ls-files', '--others', '--exclude-standard', '-z', '--', `${pasta}/`).split('\0')].filter(Boolean);
    return [...new Set(mudados.map((c) => c.slice(pasta.length + 1)))]
      .filter((c) => c.split('/').length > 1 && !/^[^/]+(\/partes\/[^/]+)?\/DOSSIE\.md$/.test(c)).sort();
  } catch { return []; }
}

/** Os objetos de `procedural/pecas/` que o envio mudou (a pasta de primeiro nível de `arquivosMudadosNoEnvio`) e que ainda existem. */
export function objetosMudadosNoEnvio(raiz = REPO, opcoes = {}) {
  return [...new Set(arquivosMudadosNoEnvio(raiz, opcoes).map((c) => c.split('/')[0]))].filter((o) => existsSync(join(raiz, PASTA_DAS_PECAS_DO_ENVIO, o)));
}
