#!/usr/bin/env node
/* estrutura-docs.mjs — sustenta a separação da documentação por quem a lê.
 *
 * A pasta `docs/mecanifica/usar/` existe para que uma IA que só vai criar,
 * inspecionar ou auditar uma peça não atravesse o material de desenvolvimento.
 * Separar as pastas uma vez não mantém isso: basta uma citação nova para a
 * fronteira vazar, e ninguém percebe até o acervo estar misturado de novo.
 *
 * Três regras, cada uma com o defeito real que a motivou:
 *
 *   G1 — documento em `usar/` só cita documento em `usar/`. Vazamento custa uma
 *        linha na allowlist abaixo, com motivo escrito, do mesmo jeito que
 *        `links.mjs` já faz. Sem glob e sem exceção por diretório: exceção
 *        barata vira regra, e regra que não custa nada não segura nada.
 *   G3 — todo documento em `usar/` é citado por ao menos uma skill. Motivo:
 *        `GOTCHAS-AUTORIA-VISUAL.md` era declarado leitura obrigatória e
 *        nenhuma skill apontava para ele. Documento de uso sem dono não é
 *        documento de uso.
 *   G5 — as portas têm teto de linhas. Porta que cresce deixa de ser porta e
 *        vira o catálogo que a reorganização veio desfazer: o INDEX já chegou
 *        a 635 linhas apontando para 158 documentos.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PASTA_USAR = 'docs/mecanifica/usar';
const PASTA_SKILLS = '.claude/skills';

/* Allowlist fechada por par arquivo→destino, com motivo. Estas duas apontam
   para EVIDÊNCIA — onde a prova está —, não para autoridade, que é onde a
   regra mora. A distinção não é automatizável, então cada caso custa uma linha
   escrita à mão e revisável. */
export const ALLOWLIST_G1 = new Map([
  [
    'docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md:docs/mecanifica/ATRITOS-AUTORIA.md',
    'aponta a lista detalhada e a evidência de cada atrito; a regra continua sendo a tabela local',
  ],
  [
    'docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md:docs/mecanifica/historico/REGISTRO-FALHAS-AUTORIA-V.md',
    'as 38 falhas medidas saíram daqui: eram 15,6 dos 35,8 KB de um documento de leitura '
    + 'obrigatória, e a maior parte é arqueologia do N6 congelado. Quem vai modelar uma peça '
    + 'não precisa delas; quem vai reabrir hipótese de forma precisa de todas, e o ponteiro '
    + 'existe para isso — redescobrir o que a tabela já mediu é a própria falha V-31',
  ],
  [
    'docs/mecanifica/usar/METODO-DIAGNOSTICO-E-SEU-LIMITE.md:docs/mecanifica/planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md',
    'cita plano encerrado como registro do caso que originou o método; plano encerrado não governa',
  ],
  [
    'docs/mecanifica/usar/README.md:docs/mecanifica/INDEX.md',
    'a porta manda quem vai DESENVOLVER sair daqui; apontar a saída é o oposto de depender dela',
  ],
  [
    'docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md:docs/mecanifica/MONTAGEM-PERSISTIDA-V1.md',
    'aponta o recorte executável do contrato; candidato a vir para usar/ quando alguma skill precisar dele',
  ],
  [
    'docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md:docs/mecanifica/planos/BACKLOG.md',
    'manda a questão em aberto para onde questão em aberto mora, em vez de deliberar dentro do contrato',
  ],
]);

/* Porta é porta: se cresce, vira o catálogo que a reorganização veio desfazer.
   O INDEX já chegou a 665 linhas apontando para 158 documentos, e mais da
   metade era crônica de plano encerrado — que hoje mora em
   `planos/encerrados/README.md`. O teto entrou como catraca no tamanho de
   então e caiu para a meta assim que o conteúdo saiu, em vez de o número ser
   afrouxado para o gate ficar verde. */
export const TETO_PORTAS = new Map([
  ['docs/mecanifica/usar/README.md', 60],
  ['docs/mecanifica/INDEX.md', 200],
]);

/* A raiz é parâmetro, não constante derivada da localização do script: sem isso
   a ferramenta analisa sempre o próprio repositório e o teste que a vê reprovar
   fica impossível de escrever — foi exatamente o que aconteceu na primeira
   versão, com quatro casos de falha passando em verde. */
function rastreados(raiz) {
  let saida;
  try {
    saida = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
      cwd: raiz, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
  } catch (erro) {
    if (erro?.status !== 0 || typeof erro?.stdout !== 'string') throw erro;
    saida = erro.stdout;
  }
  return saida.split('\n').filter(Boolean).filter((f) => existsSync(path.join(raiz, f)));
}

/* Resolve toda citação de um markdown para caminho relativo à raiz do repo,
   nas duas formas que o repositório usa: caminho `docs/<...>.md` e link
   relativo. Sem isso, G1 enxergaria metade das citações — o mesmo buraco que
   deixou 26 links quebrados passarem pelo gate de links. */
function citacoesDe(raiz, arquivo) {
  const texto = readFileSync(path.join(raiz, arquivo), 'utf8');
  const encontradas = new Set();
  for (const m of texto.matchAll(/\bdocs\/[A-Za-z0-9_.\-/]+\.md\b/g)) encontradas.add(m[0]);
  for (const m of texto.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
    const alvo = m[1];
    if (/^(https?:|mailto:)/.test(alvo)) continue;
    const absoluto = alvo.startsWith('/')
      ? path.join(raiz, alvo)
      : path.resolve(path.dirname(path.join(raiz, arquivo)), alvo);
    encontradas.add(path.relative(raiz, absoluto).split(path.sep).join('/'));
  }
  return encontradas;
}

export function conferirEstrutura({ raiz = REPO } = {}) {
  const problemas = [];
  const arquivos = rastreados(raiz);
  const docsUsar = arquivos.filter((f) => f.startsWith(`${PASTA_USAR}/`) && f.endsWith('.md'));

  if (!docsUsar.length) problemas.push(`pasta de uso vazia ou ausente: ${PASTA_USAR}`);

  /* G1 — a fronteira */
  for (const doc of docsUsar) {
    for (const citado of citacoesDe(raiz, doc)) {
      if (!citado.startsWith('docs/')) continue;
      if (citado.startsWith(`${PASTA_USAR}/`)) continue;
      if (ALLOWLIST_G1.has(`${doc}:${citado}`)) continue;
      problemas.push(
        `G1 — ${doc} cita ${citado}, que está fora de ${PASTA_USAR}. ` +
        'Ou o documento está na pasta errada, ou a citação precisa de uma linha na allowlist com o motivo.',
      );
    }
  }

  /* G3 — nenhum órfão */
  const skills = arquivos.filter((f) => f.startsWith(`${PASTA_SKILLS}/`) && f.endsWith('.md'));
  const textoSkills = skills.map((f) => readFileSync(path.join(raiz, f), 'utf8')).join('\n');
  for (const doc of docsUsar) {
    if (path.basename(doc) === 'README.md') continue;
    if (!textoSkills.includes(path.basename(doc))) {
      problemas.push(
        `G3 — ${doc} não é citado por nenhuma skill. Documento de uso sem skill que o aplique ` +
        'provavelmente não é documento de uso.',
      );
    }
  }

  /* G5 — teto das portas */
  for (const [porta, teto] of TETO_PORTAS) {
    const caminho = path.join(raiz, porta);
    if (!existsSync(caminho)) { problemas.push(`G5 — porta ausente: ${porta}`); continue; }
    const linhas = readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
    if (linhas > teto) problemas.push(`G5 — ${porta}: ${linhas} linhas; o teto é ${teto}`);
  }

  return { problemas, docsUsar, skills };
}

const executadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDireto) {
  const raizPedida = process.argv.find((a) => a.startsWith('--raiz='))?.slice('--raiz='.length);
  const { problemas, docsUsar } = conferirEstrutura(raizPedida ? { raiz: path.resolve(raizPedida) } : {});
  if (problemas.length) {
    console.error(`docs:estrutura — ${problemas.length} problema(s):`);
    for (const p of problemas) console.error(`  ${p}`);
    if (process.argv.includes('--check')) process.exit(1);
  } else {
    console.log(`docs:estrutura ok — ${docsUsar.length} doc(s) em ${PASTA_USAR}, fronteira e portas em dia.`);
  }
}
