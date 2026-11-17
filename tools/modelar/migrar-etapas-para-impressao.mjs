#!/usr/bin/env node
/* migrar-etapas-para-impressao.mjs — migra o registro de etapas de uma montagem (versão 2, com o estado gravado em cada etapa) para o
 * da versão 3 (eventos e impressão do aceite), sem novo aceite: o aceite de cada etapa fixa entra como está.
 *
 * Uso:
 *   node tools/modelar/migrar-etapas-para-impressao.mjs <montagem.json>            ensaio: só imprime o relatório por etapa
 *   node tools/modelar/migrar-etapas-para-impressao.mjs <montagem.json> --gravar    grava o registro da versão 3 no lugar do antigo
 *   node tools/modelar/migrar-etapas-para-impressao.mjs <montagem.json> --json      o relatório em JSON
 *
 * Cada etapa fixa é classificada em uma de três vias:
 *   (a) reconstruída pelo commit que gravou o aceite: a árvore `procedural/` daquele commit é extraída numa pasta temporária, com o
 *       código de agora ao lado, e a montagem é medida ali; a impressão sai dali, e o hash da forma gravado é a contraprova (se bate,
 *       as portas, a pose e as juntas dali são as do aceite);
 *   (b) onde o commit não reproduz a forma (ou não pôde ser medido), a impressão de agora, marcada `origem: migração` e com a porta
 *       não provada, com a condição de a forma de agora ser a gravada no aceite e as medidas das juntas gravadas baterem com as de agora;
 *   (c) onde nem isso vale, a etapa não migra: fica aberta, e o relatório diz por quê, para a pessoa decidir.
 * As etapas que não estão fixas (abertas, quebradas) também ficam abertas. O ensaio não grava nada. */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import {
  acrescentarAceiteMigrado, canonico, diferencasDaImpressao, imprimirEtapa, lerEtapas, registroVazio,
} from '../../src/autoria/etapas-pela-impressao.js';
import { arquivoDoRegistro, medirAgora } from './etapas-da-montagem.mjs';
import { REPO } from './resolver-caminho-receita.mjs';

const git = (args, opcoes = {}) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opcoes });

/* A classificação de uma etapa fixa do registro antigo, pura: `medidoDoCommit` é o medido da árvore do commit do aceite (ou null), e
   `medidoAgora` o de agora. Devolve { via, impressao?, origem?, motivo } com via 'a', 'b' ou 'c'. */
export function classificarEtapa(etapa, medidoDoCommit, medidoAgora, { commit = null, erroDoCommit = null } = {}) {
  const id = etapa.instancia;
  if (typeof etapa.forma !== 'string' || !etapa.aceite) {
    return { via: 'c', motivo: `a etapa fixa não traz ${typeof etapa.forma !== 'string' ? 'a forma gravada no aceite' : 'o aceite'}; não há o que conferir.` };
  }
  const noCommit = medidoDoCommit?.etapas?.[id]?.forma;
  if (noCommit === etapa.forma) {
    return { via: 'a', impressao: imprimirEtapa(medidoDoCommit, id), origem: { tipo: 'migração', via: 'commit do aceite', commit }, motivo: `a forma do commit ${commit?.slice(0, 8)} é a gravada no aceite` };
  }
  const razaoDoCommit = commit === null ? 'o commit do aceite não foi achado' : erroDoCommit ? `o commit ${commit.slice(0, 8)} não pôde ser medido (${erroDoCommit})`
    : noCommit ? `a forma do commit ${commit.slice(0, 8)} não é a gravada no aceite` : `o commit ${commit.slice(0, 8)} não tem geometria para esta etapa`;
  const agora = medidoAgora.etapas[id];
  const falhas = [];
  if (!agora?.forma) falhas.push(`não há geometria para medir agora${agora?.erro ? ` (${agora.erro})` : ''}`);
  else if (agora.forma !== etapa.forma) falhas.push('a forma de agora não é a gravada no aceite');
  if (agora?.forma) {
    const gravadas = canonico(etapa.juntas ?? []);
    const medidas = canonico([...(agora.juntas ?? [])].sort((x, y) => (x.relacao < y.relacao ? -1 : 1)));
    const dif = diferencasDaImpressao(gravadas, medidas, 'juntas');
    if (dif.length) falhas.push(`as medidas das juntas de agora diferem das gravadas (${dif.slice(0, 3).join('; ')}${dif.length > 3 ? `; e mais ${dif.length - 3}` : ''})`);
  }
  if (falhas.length) return { via: 'c', motivo: `${razaoDoCommit}, e a impressão de agora não vale: ${falhas.join('; ')}.` };
  return {
    via: 'b', impressao: imprimirEtapa(medidoAgora, id),
    origem: { tipo: 'migração', via: 'impressão de agora', portaNaoProvada: true, commit },
    motivo: `${razaoDoCommit}; a impressão de agora vale porque a forma e as medidas das juntas são as gravadas, e a porta citada não está provada.`,
  };
}

/* O commit que gravou o aceite de cada etapa: o primeiro, na ordem do histórico, em que a etapa aparece fixa com o aceite de agora. */
export function commitsDosAceites(arquivoRegistro, registro) {
  const relativo = relative(REPO, arquivoRegistro);
  const commits = git(['log', '--reverse', '--format=%H', '--', relativo]).split('\n').filter(Boolean);
  const achados = new Map();
  const faltam = new Map(registro.etapas.filter((e) => e.estado === 'fixa' && e.aceite).map((e) => [e.instancia, JSON.stringify(e.aceite)]));
  for (const commit of commits) {
    if (!faltam.size) break;
    let antigo;
    try { antigo = JSON.parse(git(['show', `${commit}:${relativo}`])); } catch { continue; }
    for (const e of antigo.etapas ?? []) {
      if (faltam.has(e.instancia) && e.estado === 'fixa' && JSON.stringify(e.aceite) === faltam.get(e.instancia)) {
        achados.set(e.instancia, commit);
        faltam.delete(e.instancia);
      }
    }
  }
  return achados;
}

/* Mede a montagem na árvore de um commit, num processo à parte: a árvore daquele commit (`procedural`, `src`, `tools`, `modulos`) é
   extraída numa pasta temporária, o filho `medir-arvore-para-migracao.mjs` é copiado para dentro dela e roda com os módulos do próprio
   commit (misturar o código de agora com o núcleo antigo não carrega: os módulos de agora importam arquivos que o commit não tem).
   Devolve { medido } ou { erro }. */
function medirNoCommit(commit, arquivoMontagem) {
  const raiz = mkdtempSync(join(tmpdir(), 'migracao-'));
  try {
    execFileSync('bash', ['-c', `git archive ${commit} procedural src tools modulos package.json | tar -x -C "${raiz}"`], { cwd: REPO, maxBuffer: 256 * 1024 * 1024 });
    symlinkSync(join(REPO, 'node_modules'), join(raiz, 'node_modules'));
    const dentro = join(raiz, relative(REPO, arquivoMontagem));
    if (!existsSync(dentro)) return { erro: 'a montagem não existia neste commit' };
    const filho = join(raiz, 'tools/modelar/medir-arvore-para-migracao.mjs');
    cpSync(join(REPO, 'tools/modelar/medir-arvore-para-migracao.mjs'), filho);
    const saida = execFileSync('node', [filho, dentro], { cwd: raiz, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 1_500_000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { medido: JSON.parse(saida.slice(saida.indexOf('{"medido"')).trim()).medido };
  } catch (erro) {
    const linhas = String(erro.stderr || erro.message).split('\n').map((l) => l.trim()).filter(Boolean);
    return { erro: (linhas.find((l) => /^(\w*Error|Error)/.test(l) || /Cannot find|não/.test(l)) ?? linhas[0] ?? 'falhou').slice(0, 220) };
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

/* O relatório da migração de uma montagem, sem gravar nada. `medirDoCommit(commit)`, `medidoAgora` e `commits` (Map instância → commit) são injetáveis para o teste. */
export async function planejarMigracao(arquivoMontagem, { medirDoCommit = (commit) => medirNoCommit(commit, arquivoMontagem), medidoAgora = null, commits: dosCommits = null, avisar = () => {} } = {}) {
  const arquivoRegistro = arquivoDoRegistro(arquivoMontagem);
  const antigo = JSON.parse(readFileSync(arquivoRegistro, 'utf8'));
  if (antigo.versao === 3) throw new Error(`${relative(REPO, arquivoRegistro)} já é da versão 3; nada a migrar.`);
  if (!Array.isArray(antigo.etapas)) throw new Error(`${relative(REPO, arquivoRegistro)} não traz a lista \`etapas\` do formato antigo.`);
  const agora = medidoAgora ?? await medirAgora(arquivoMontagem);
  const commits = dosCommits ?? commitsDosAceites(arquivoRegistro, antigo);
  const medidos = new Map();
  const medidoDe = async (commit) => {
    if (!medidos.has(commit)) { avisar(`medindo a montagem no commit ${commit.slice(0, 8)}...`); medidos.set(commit, await medirDoCommit(commit)); }
    return medidos.get(commit);
  };
  let registro = registroVazio(agora.montagem);
  const etapas = [];
  for (const etapa of antigo.etapas) {
    if (etapa.estado !== 'fixa') {
      etapas.push({ instancia: etapa.instancia, via: 'aberta', estadoAntigo: etapa.estado, motivo: `a etapa estava ${etapa.estado} no registro antigo e fica aberta.` });
      continue;
    }
    const commit = commits.get(etapa.instancia) ?? null;
    const doCommit = commit ? await medidoDe(commit) : { erro: null };
    const r = classificarEtapa(etapa, doCommit.medido ?? null, agora, { commit, erroDoCommit: doCommit.erro });
    const linha = { instancia: etapa.instancia, via: r.via, commit, motivo: r.motivo };
    if (r.impressao) {
      registro = acrescentarAceiteMigrado(registro, etapa.instancia, etapa.aceite, r.impressao, r.origem);
      linha.reaberturasAntigas = (etapa.reaberturas ?? []).length;
    }
    etapas.push(linha);
  }
  /* o estado que a leitura de agora dá ao registro migrado: a etapa migrada pela via (a) pode estar quebrada, se algo mudou desde o aceite */
  const leitura = lerEtapas(registro, agora);
  for (const linha of etapas) {
    const lida = leitura.etapas.find((e) => e.instancia === linha.instancia);
    if (linha.via === 'a' || linha.via === 'b') { linha.estadoDepois = lida.estado; if (lida.motivo) linha.motivoDepois = lida.motivo; }
  }
  const contagem = { a: 0, b: 0, c: 0, aberta: 0 };
  for (const linha of etapas) contagem[linha.via] += 1;
  return {
    montagem: agora.montagem, arquivo: relative(REPO, arquivoMontagem), contagem, etapas,
    fixasDepois: leitura.etapas.filter((e) => e.estado === 'fixa').length, registro,
  };
}

export function descreverMigracao(r) {
  const linhas = [`migração de '${r.montagem}' (${r.arquivo}): ${r.contagem.a} pela via (a), ${r.contagem.b} pela (b), ${r.contagem.c} pela (c), ${r.contagem.aberta} já abertas; ${r.fixasDepois} de ${r.etapas.length} fixas pela leitura de agora.`];
  for (const e of r.etapas) {
    linhas.push(`  ${e.instancia.padEnd(18)} (${e.via})${e.commit ? ` ${e.commit.slice(0, 8)}` : ''}${e.estadoDepois ? ` → ${e.estadoDepois}` : ''} — ${e.motivo}${e.motivoDepois ? ` [${e.motivoDepois.slice(0, 200)}]` : ''}`);
  }
  return linhas.join('\n');
}

export function gravarMigracao(arquivoMontagem, relatorio) {
  const arquivo = arquivoDoRegistro(arquivoMontagem);
  const disco = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (disco.versao === 3 || 'eventos' in disco) throw new Error(`${relative(REPO, arquivo)} já é da versão 3; não se regrava por cima.`);
  writeFileSync(arquivo, `${JSON.stringify(relatorio.registro, null, 2)}\n`);
}

if (process.argv[1] && process.argv[1].endsWith('migrar-etapas-para-impressao.mjs')) {
  const argv = process.argv.slice(2);
  (async () => {
    const arquivo = argv.find((a) => a.endsWith('.json'));
    if (!arquivo) { console.error('diga a montagem: migrar-etapas-para-impressao.mjs <montagem.json> [--gravar] [--json]'); process.exit(1); }
    const relatorio = await planejarMigracao(resolve(arquivo), { avisar: (t) => console.error(t) });
    if (argv.includes('--gravar')) gravarMigracao(resolve(arquivo), relatorio);
    const { registro, ...resto } = relatorio;
    console.log(argv.includes('--json') ? JSON.stringify(resto, null, 2) : `${descreverMigracao(relatorio)}\n${argv.includes('--gravar') ? 'registro da versão 3 gravado.' : 'ensaio: nada foi gravado.'}`);
  })().catch((erro) => { console.error(`migrar-etapas-para-impressao: ${erro.message}`); process.exit(1); });
}
