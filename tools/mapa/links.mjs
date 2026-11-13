#!/usr/bin/env node
/* links.mjs — o gate de referência: varre todo arquivo rastreado por menções a
   `<pasta>/<...>.md` sob docs/, procedural/, modulos/, tools/ ou src/ (caminho
   com barra, não prosa solta) e reprova quando o
   caminho citado não resolve. Duas zonas, dois rigores: ZONA VIVA (todo
   arquivo fora de `docs/nos-herdado/`) exige resolução EXATA; ZONA HISTÓRICA
   (arquivos sob `docs/nos-herdado/`) aceita resolução por NOME de arquivo em
   qualquer lugar sob `docs/` — histórico é imutável por regra do repo, e
   reescrever caminho ali seria editar registro. A allowlist registra
   referências históricas a arquivos removidos, com o motivo escrito abaixo.
   Caminho sob `docs/modelar/planos/encerrados/` ou `docs/modelar/historico/`, pastas que saíram da árvore em 2026-11-13, não
   entra na allowlist: vale quando o nome do arquivo consta na crônica da pasta (`tools/mapa/retirados.mjs`).
   `npm run docs:links` imprime;
   `npm run docs:links:check` sai ≠0 em qualquer falha. Zero dependências (git
   ls-files + fs).

   Segunda checagem: a ALCANÇABILIDADE. Todo `.md` sob `docs/` precisa ser
   alcançável, direta ou transitivamente, a partir de
   `docs/modelar/INDEX.md`. Assim a porta de entrada pode ser curta e delegar
   inventário e legado a índices especializados sem esconder documentação. */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caminhoRetirado, motivoRecusa } from './retirados.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXTS = new Set(['.md', '.js', '.mjs', '.ts', '.html', '.json']);
// o próprio verificador cita, em comentário, os caminhos da allowlist — não se auto-varre.
const IGNORAR = new Set(['tools/mapa/links.mjs']);

/* Caminho no formato <pasta>/<...>.md — exige barra depois da pasta pra não
   capturar menção solta a nome de arquivo em prosa (ex.: "veja o LORE.md").
   Até 2026-10-08 só `docs/` era conferido, e o README da raiz citou por semanas
   `procedural/pecas/ACERVO-SEM-PECA.md`, que tinha saído quando o braço
   repovoou o acervo; as outras pastas do repositório entraram nessa data. */
const PADRAO = /\b(?:docs|procedural|modulos|tools|src)\/[A-Za-z0-9_.\-\/]+\.md\b/g;

/* Allowlist fechada por par arquivo→referência, com o motivo. As entradas da
   limpeza são históricas e específicas: o arquivo citado existiu no histórico
   Git e foi removido intencionalmente. A exceção R3 é o registro anterior de
   um arquivo que nunca existiu. Não há glob, prefixo ou exceção por diretório.
   Chave = "arquivo:caminho citado". */
const ALLOWLIST = new Map([
  // arquivo genuinamente inexistente, citado pelo DECISIONS-ARCHIVE.md como registro histórico de uma branch já descartada.
  ['docs/nos-herdado/DECISIONS-ARCHIVE.md:docs/R3_COMPARATIVO_RENDER.md', 'arquivo nunca existiu na main — citado como registro de branch descartada'],
  // referências preservadas em decisões e walkthroughs históricos; os documentos de origem foram removidos nesta limpeza.
  ['docs/nos-herdado/DECISIONS-ARCHIVE.md:docs/PORTALS_PROTOCOL.md', 'referência histórica preservada'],
  ['docs/nos-herdado/DECISIONS-ARCHIVE.md:docs/CIDADE.md', 'referência histórica preservada'],
  ['docs/nos-herdado/DECISIONS-ARCHIVE.md:docs/COMUNICACAO.md', 'referência histórica preservada'],
  ['docs/nos-herdado/DECISIONS-ARCHIVE.md:docs/CODER.md', 'referência histórica preservada'],
  ['docs/nos-herdado/DECISIONS.md:docs/FERRAMENTAS.md', 'referência histórica preservada'],
  ['docs/nos-herdado/DECISIONS.md:docs/AUDIO_E_CENAS.md', 'referência histórica preservada'],
  ['docs/nos-herdado/DECISIONS.md:docs/HABITANTES.md', 'referência histórica preservada'],
  ['docs/nos-herdado/walkthrough_colaborador4.md:docs/COMUNICACAO.md', 'referência histórica preservada'],
  ['docs/nos-herdado/walkthrough_colaborador4.md:docs/PORTALS_PROTOCOL.md', 'referência histórica preservada'],
  /* O README do esboço antigo saiu com o módulo em 2026-11-05 (HISTORICO-RETIRADO.md, na linha de `esboco-2d.md`, diz o commit que o
     guarda). As análises e a medição de tokens que o citam são registro da época, e a medição de transcrição reconhece a leitura dele
     nas transcrições antigas. As revisões de rumo e o plano encerrado que também o citavam saíram da árvore em 2026-11-13. */
  ['docs/modelar/pesquisas/ANALISES-DE-2026-10.md:modulos/esboco/README.md', 'análise de 2026-10 sobre o esboço antigo, que saiu em 2026-11-05'],
  ['docs/modelar/banco-de-provas/MEDICAO-DE-TOKENS-2026-10.md:modulos/esboco/README.md', 'medição encerrada de 2026-10; o README do esboço antigo saiu em 2026-11-05'],
  ['tools/modelar/medir-transcricao.mjs:modulos/esboco/README.md', 'reconhece a leitura do README do esboço antigo nas transcrições de antes de 2026-11-05'],
  ['tools/modelar/medir-transcricao.test.mjs:modulos/esboco/README.md', 'o teste da medição de transcrição usa o caminho da leitura antiga'],
]);

let saidaGit;
try {
  saidaGit = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
} catch (erro) {
  /* O runtime pode reportar EPERM depois de entregar stdout com status 0. */
  if (erro?.status !== 0 || typeof erro?.stdout !== 'string') throw erro;
  saidaGit = erro.stdout;
}
const rastreados = saidaGit
  .split('\n').filter(Boolean)
  .filter((f) => existsSync(path.join(REPO, f)))
  .filter((f) => !IGNORAR.has(f) && EXTS.has(path.extname(f)));

const todosDocsMd = rastreados.filter((f) => f.startsWith('docs/') && f.endsWith('.md'));
const nomeParaCaminhos = new Map(); // basename -> [caminhos]
for (const f of todosDocsMd) {
  const nome = path.basename(f);
  if (!nomeParaCaminhos.has(nome)) nomeParaCaminhos.set(nome, []);
  nomeParaCaminhos.get(nome).push(f);
}

function ehZonaHistorica(arquivo) {
  return arquivo.startsWith('docs/nos-herdado/');
}

const falhas = [];

for (const arquivo of rastreados) {
  const texto = readFileSync(path.join(REPO, arquivo), 'utf8');
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    let m;
    PADRAO.lastIndex = 0;
    while ((m = PADRAO.exec(linha))) {
      const citado = m[0];
      const chaveAllow = `${arquivo}:${citado}`;
      if (ALLOWLIST.has(chaveAllow)) continue;

      const resolveExato = existsSync(path.join(REPO, citado));
      if (resolveExato) continue;

      /* pasta que saiu da árvore: vale se a crônica guarda o nome do arquivo (o texto está no git); senão é recusado */
      const retirado = caminhoRetirado(citado, REPO);
      if (retirado) {
        if (retirado.consta) continue;
        falhas.push({ arquivo, linha: i + 1, citado, zona: 'retirada', retirado });
        continue;
      }

      if (ehZonaHistorica(arquivo)) {
        const nome = path.basename(citado);
        const resolvePorNome = (nomeParaCaminhos.get(nome) ?? []).length > 0;
        if (resolvePorNome) continue;
      }

      falhas.push({ arquivo, linha: i + 1, citado, zona: ehZonaHistorica(arquivo) ? 'historica' : 'viva' });
    }
  }
}

/* --- G7: link RELATIVO de markdown também precisa resolver ---

   A varredura acima só enxerga caminho no formato `docs/<...>.md`, e a maioria
   dos documentos não escreve assim: escreve `](../INDEX.md)`. O buraco não é
   teórico — quando este gate foi escrito, a `main` carregava 26 links relativos
   quebrados com todos os gates verdes, e uma reorganização passou por ele com
   159 quebrados. Gate cego transmite confiança que não tem.

   A zona histórica de topo fica de fora pelo mesmo motivo de sempre: é registro
   imutável, e reescrever caminho ali seria editar histórico. */
/* Link para pasta (terminado em `/`) também conta: o README da raiz lista os
   módulos assim, e um módulo removido deixaria o link quebrado sem aviso. */
const PADRAO_RELATIVO = /\]\(([^)#\s]+(?:\.md|\/))(?:#[^)]*)?\)/g;

for (const arquivo of rastreados.filter((f) => f.endsWith('.md') && !ehZonaHistorica(f))) {
  const texto = readFileSync(path.join(REPO, arquivo), 'utf8');
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    PADRAO_RELATIVO.lastIndex = 0;
    let m;
    while ((m = PADRAO_RELATIVO.exec(linhas[i]))) {
      const alvo = m[1];
      if (/^(https?:|mailto:)/.test(alvo)) continue;
      const absoluto = alvo.startsWith('/')
        ? path.join(REPO, alvo)
        : path.resolve(path.dirname(path.join(REPO, arquivo)), alvo);
      if (existsSync(absoluto)) continue;
      /* link relativo para pasta retirada (o alinhamento de uma peça cita o plano dela): vale se a crônica guarda o nome */
      const retirado = caminhoRetirado(path.relative(REPO, absoluto), REPO);
      if (retirado?.consta) continue;
      falhas.push(retirado
        ? { arquivo, linha: i + 1, citado: alvo, zona: 'retirada', retirado }
        : { arquivo, linha: i + 1, citado: alvo, zona: 'relativa' });
    }
  }
}

/* --- alcançabilidade: todo doc parte do índice curado do Modelar --- */
const PORTA_ENTRADA = 'docs/modelar/INDEX.md';

/* Citar uma PASTA cobre o que está dentro dela. A lista é EXPLÍCITA, e não
   uma regra geral de "pasta citada cobre o conteúdo", porque títulos de seção
   como `docs/rumo/` não podem isentar uma árvore inteira por acidente. */
const PASTAS_BLOCO = [];

function referenciasDocsDe(arquivo) {
  const refs = new Set();
  const texto = readFileSync(path.join(REPO, arquivo), 'utf8');
  let m;
  PADRAO.lastIndex = 0;
  while ((m = PADRAO.exec(texto))) {
    if (todosDocsMd.includes(m[0])) refs.add(m[0]);
  }
  /* Link relativo também liga um documento ao outro. Contar só o caminho
     absoluto obrigaria todo doc a repetir `docs/modelar/...` no texto só
     para o gate enxergar — e um índice que aponta os seus vizinhos com
     `](./X.md)`, que é o normal, apareceria como se não apontasse ninguém. */
  PADRAO_RELATIVO.lastIndex = 0;
  while ((m = PADRAO_RELATIVO.exec(texto))) {
    const alvo = m[1];
    if (/^(https?:|mailto:)/.test(alvo)) continue;
    const absoluto = alvo.startsWith('/')
      ? path.join(REPO, alvo)
      : path.resolve(path.dirname(path.join(REPO, arquivo)), alvo);
    const relativo = path.relative(REPO, absoluto).split(path.sep).join('/');
    if (todosDocsMd.includes(relativo)) refs.add(relativo);
  }
  return refs;
}

const referenciasPorDoc = new Map(
  todosDocsMd.map((doc) => [doc, referenciasDocsDe(doc)]),
);
const alcancados = new Set();

if (existsSync(path.join(REPO, PORTA_ENTRADA))) {
  const pendentes = [PORTA_ENTRADA];
  while (pendentes.length) {
    const atual = pendentes.pop();
    if (alcancados.has(atual)) continue;
    alcancados.add(atual);
    for (const ref of referenciasPorDoc.get(atual) ?? []) {
      if (!alcancados.has(ref)) pendentes.push(ref);
    }
  }

  for (const pasta of PASTAS_BLOCO) {
    const pastaFoiApontada = [...alcancados].some((doc) =>
      readFileSync(path.join(REPO, doc), 'utf8').includes(pasta));
    if (!pastaFoiApontada) continue;
    for (const doc of todosDocsMd) {
      if (doc.startsWith(pasta)) alcancados.add(doc);
    }
  }
}

const inalcançaveis = todosDocsMd.filter((doc) => !alcancados.has(doc));
const check = process.argv.includes('--check');

if (falhas.length) {
  console.error(`docs:links — ${falhas.length} referência(s) quebrada(s):`);
  for (const { arquivo, linha, citado, zona, retirado } of falhas) {
    /* a mensagem diz o que DE FATO foi tentado: na zona viva só existe a
       resolução exata, então dizer "nem por nome" ali seria mentira. */
    const motivo = zona === 'retirada'
      ? motivoRecusa(retirado)
      : zona === 'historica'
      ? 'não resolve exato nem por nome sob docs/'
      : zona === 'relativa'
        ? 'link relativo não resolve a partir da pasta do arquivo'
        : 'não resolve (zona viva exige caminho exato)';
    console.error(`  ${arquivo}:${linha} → ${citado} → ${motivo}`);
  }
} else {
  console.log(`docs:links ok — todas as referências docs/*.md resolvem (${rastreados.length} arquivos varridos).`);
}

if (!existsSync(path.join(REPO, PORTA_ENTRADA))) {
  console.error(`docs:links — porta de entrada ausente: ${PORTA_ENTRADA}`);
} else if (inalcançaveis.length) {
  console.error(`docs:links — ${inalcançaveis.length} doc(s) não alcançável(is) a partir de ${PORTA_ENTRADA}:`);
  for (const doc of inalcançaveis) console.error(`  ${doc}`);
} else {
  console.log(`docs:links ok — ${alcancados.size} docs alcançáveis a partir de ${PORTA_ENTRADA}.`);
}

if (check && (falhas.length || inalcançaveis.length)) process.exit(1);
