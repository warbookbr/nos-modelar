#!/usr/bin/env node
/* migrar-etapas-para-impressao.mjs — migra o registro de etapas de uma montagem (versão 2, com o estado gravado em cada etapa) para o
 * da versão 3 (eventos e impressão do aceite), sem novo aceite: o aceite de cada etapa fixa entra como está.
 *
 * Uso:
 *   node tools/modelar/migrar-etapas-para-impressao.mjs <montagem.json>            ensaio: só imprime o relatório por etapa
 *   node tools/modelar/migrar-etapas-para-impressao.mjs <montagem.json> --gravar    grava o registro da versão 3 no lugar do antigo
 *   node tools/modelar/migrar-etapas-para-impressao.mjs <montagem.json> --json      o relatório em JSON
 *   node tools/modelar/migrar-etapas-para-impressao.mjs <montagem.json> --regravar --gravar
 *                                                                         refaz a migração de um registro que só tem eventos migrados,
 *                                                                         a partir do último registro v2 do histórico (o git)
 *
 * Cada etapa fixa é classificada em uma de três vias:
 *   (a) reconstruída pelo commit que gravou o aceite (o começo da última sequência contínua do histórico em que a etapa aparece fixa com
 *       o aceite de agora e a mesma lista de reaberturas; havendo lacuna, o commit é ambíguo e a etapa vai para a (b)): a árvore `procedural/` daquele commit é extraída numa pasta temporária, com o
 *       código de agora ao lado, e a montagem é medida ali; a impressão sai dali, e o hash da forma gravado é a contraprova da malha (se
 *       bate, as portas, a pose e as juntas dali são as do aceite), e as juntas do commit são conferidas com as gravadas;
 *   (b) onde o commit não reproduz a forma (ou não pôde ser medido), a impressão de agora, marcada `origem: migração` e com a porta
 *       não provada, com a condição de a forma de agora ser a gravada no aceite e as medidas das juntas gravadas baterem com as de agora (a junta gravada prova o último comando, não o aceite; e a porta que se move
 *       junto com a peça que se apoia nela não é vista). A porta citada fica `portaNaoProvada` só quando a etapa cita alguma;
 *   (c) onde nem isso vale, a etapa não migra: fica aberta, e o relatório diz por quê, para a pessoa decidir.
 * As etapas que não estão fixas (abertas, quebradas) também ficam abertas. O ensaio não grava nada, e `--gravar` recusa quando alguma etapa
 * fixa ficou na via (c). Cada evento migrado leva em `origem` o commit do último registro v2 (`v2`), onde as reaberturas antigas, que não
 * viram eventos, ficam legíveis no git, e o relatório as imprime. */
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

const juntasDe = (lista) => canonico([...(lista ?? [])].sort((x, y) => (x.relacao < y.relacao ? -1 : 1)));
function diferencasDasJuntas(gravadas, medidas) {
  const dif = diferencasDaImpressao(juntasDe(gravadas), juntasDe(medidas), 'juntas');
  return dif.length ? `${dif.slice(0, 3).join('; ')}${dif.length > 3 ? `; e mais ${dif.length - 3}` : ''}` : null;
}

/* A classificação de uma etapa fixa do registro antigo, pura: `medidoDoCommit` é o medido da árvore do commit do aceite (ou null), e
   `medidoAgora` o de agora. `commit` é o começo da última sequência em que a etapa aparece fixa com o aceite de agora, `lacuna` diz que
   esse aceite aparece também em outra sequência (reaberto e aceito de novo com as mesmas palavras: o commit é ambíguo) e `ultimoV2` é o
   commit do último registro v2. Devolve { via, impressao?, origem?, motivo } com via 'a', 'b' ou 'c'. */
export function classificarEtapa(etapa, medidoDoCommit, medidoAgora, { commit = null, erroDoCommit = null, lacuna = false, ultimoV2 = null } = {}) {
  const id = etapa.instancia;
  if (typeof etapa.forma !== 'string' || !etapa.aceite) {
    return { via: 'c', motivo: `a etapa fixa não traz ${typeof etapa.forma !== 'string' ? 'a forma gravada no aceite' : 'o aceite'}; não há o que conferir.` };
  }
  const comum = { tipo: 'migração', ...(ultimoV2 ? { v2: ultimoV2 } : {}), ...((etapa.reaberturas ?? []).length ? { reaberturasAntigas: etapa.reaberturas.length } : {}) };
  const noCommit = lacuna ? undefined : medidoDoCommit?.etapas?.[id]?.forma;
  let razaoDoCommit;
  if (commit === null) razaoDoCommit = 'o commit do aceite não foi achado';
  else if (lacuna) razaoDoCommit = `o aceite de agora aparece também em outra sequência do histórico (reaberto e aceito de novo com as mesmas palavras), e o commit ${commit.slice(0, 8)} é ambíguo`;
  else if (erroDoCommit) razaoDoCommit = `o commit ${commit.slice(0, 8)} não pôde ser medido (${erroDoCommit})`;
  else if (!noCommit) razaoDoCommit = `o commit ${commit.slice(0, 8)} não tem geometria para esta etapa`;
  else if (noCommit !== etapa.forma) razaoDoCommit = `a forma do commit ${commit.slice(0, 8)} não é a gravada no aceite`;
  else {
    const dif = diferencasDasJuntas(etapa.juntas, medidoDoCommit.etapas[id].juntas);
    if (!dif) {
      return { via: 'a', impressao: imprimirEtapa(medidoDoCommit, id), origem: { ...comum, via: 'commit do aceite', commit }, motivo: `a forma e as juntas do commit ${commit.slice(0, 8)} são as gravadas no aceite` };
    }
    razaoDoCommit = `a forma do commit ${commit.slice(0, 8)} é a gravada, mas as juntas dele diferem das gravadas (${dif})`;
  }
  const agora = medidoAgora.etapas[id];
  const falhas = [];
  if (!agora?.forma) falhas.push(`não há geometria para medir agora${agora?.erro ? ` (${agora.erro})` : ''}`);
  else if (agora.forma !== etapa.forma) falhas.push('a forma de agora não é a gravada no aceite');
  if (agora?.forma) {
    const dif = diferencasDasJuntas(etapa.juntas, agora.juntas);
    if (dif) falhas.push(`as medidas das juntas de agora diferem das gravadas (${dif})`);
  }
  if (falhas.length) return { via: 'c', motivo: `${razaoDoCommit}, e a impressão de agora não vale: ${falhas.join('; ')}.` };
  const impressao = imprimirEtapa(medidoAgora, id);
  const cita = impressao.citadas.length > 0;
  return {
    via: 'b', impressao,
    origem: { ...comum, via: 'impressão de agora', ...(cita ? { portaNaoProvada: true } : {}) },
    motivo: `${razaoDoCommit}; a impressão de agora vale porque a forma e as medidas das juntas são as gravadas${cita ? ', e a porta citada não está provada' : ', e a etapa não cita porta de etapa anterior'}.`,
  };
}

/* O começo da última sequência contínua do histórico em que cada etapa fixa aparece fixa com o aceite de agora e a mesma lista de
   reaberturas, e se esse aceite aparece também em outra sequência (`lacuna`). `historico` é a lista, do mais antigo ao mais novo, de
   { commit, registro } com o registro v2 de cada commit. Pura. */
export function inicioDasSequencias(historico, registro) {
  const alvos = new Map(registro.etapas.filter((e) => e.estado === 'fixa' && e.aceite)
    .map((e) => [e.instancia, { aceite: JSON.stringify(e.aceite), reaberturas: JSON.stringify(e.reaberturas ?? []), inicio: null, sequencias: 0 }]));
  for (const { commit, registro: antigo } of historico) {
    for (const [id, alvo] of alvos) {
      const e = (antigo.etapas ?? []).find((x) => x.instancia === id);
      const casa = e && e.estado === 'fixa' && JSON.stringify(e.aceite) === alvo.aceite && JSON.stringify(e.reaberturas ?? []) === alvo.reaberturas;
      if (casa) { if (alvo.inicio === null) { alvo.inicio = commit; alvo.sequencias += 1; } } else alvo.inicio = null;
    }
  }
  return new Map([...alvos].map(([id, a]) => [id, { commit: a.inicio, lacuna: a.sequencias > 1 }]));
}

/* O histórico do registro no git: cada commit que o tocou, do mais antigo ao mais novo, com o registro que ele tinha. Fora do repositório
   (ou sem git) devolve a lista vazia, e as etapas vão para a via (b). */
export function historicoDoRegistro(arquivoRegistro) {
  const relativo = relative(REPO, arquivoRegistro);
  if (relativo.startsWith('..')) return [];
  try {
    const commits = git(['log', '--reverse', '--format=%H', '--', relativo]).split('\n').filter(Boolean);
    return commits.flatMap((commit) => {
      try { return [{ commit, registro: JSON.parse(git(['show', `${commit}:${relativo}`])) }]; } catch { return []; }
    });
  } catch { return []; }
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

/* O relatório da migração de uma montagem, sem gravar nada. `medirDoCommit(commit)`, `medidoAgora`, `historico` (a lista de
   { commit, registro } do git) e `registroAntigo` (no lugar do arquivo, que depois da migração já é o v3) são injetáveis para o teste.
   Com `regravar`, o registro de agora pode já ser um v3 feito só de eventos migrados: o último v2 do histórico é refeito. */
export async function planejarMigracao(arquivoMontagem, { medirDoCommit = (commit) => medirNoCommit(commit, arquivoMontagem), medidoAgora = null, historico: dado = null, registroAntigo = null, regravar = false, avisar = () => {} } = {}) {
  const arquivoRegistro = arquivoDoRegistro(arquivoMontagem);
  const historico = dado ?? historicoDoRegistro(arquivoRegistro);
  const ultimoV2 = [...historico].reverse().find((h) => h.registro.versao !== 3 && Array.isArray(h.registro.etapas)) ?? null;
  let antigo = registroAntigo ?? JSON.parse(readFileSync(arquivoRegistro, 'utf8'));
  if (antigo.versao === 3) {
    if (!regravar) throw new Error(`${relative(REPO, arquivoRegistro)} já é da versão 3; nada a migrar (--regravar refaz um v3 feito só de eventos migrados).`);
    if (antigo.eventos.some((e) => e.origem?.tipo !== 'migração' || e.tipo !== 'aceite')) throw new Error(`${relative(REPO, arquivoRegistro)} tem eventos que não são de migração (aceites ou reaberturas novas); regravar os perderia.`);
    if (!ultimoV2) throw new Error(`o histórico de ${relative(REPO, arquivoRegistro)} não tem o registro v2 que a regravação refaria.`);
    antigo = ultimoV2.registro;
  }
  if (!Array.isArray(antigo.etapas)) throw new Error(`${relative(REPO, arquivoRegistro)} não traz a lista \`etapas\` do formato antigo.`);
  const agora = medidoAgora ?? await medirAgora(arquivoMontagem);
  const sequencias = inicioDasSequencias(historico.filter((h) => h.registro.versao !== 3), antigo);
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
    const { commit = null, lacuna = false } = sequencias.get(etapa.instancia) ?? {};
    const doCommit = commit && !lacuna ? await medidoDe(commit) : { erro: null };
    const r = classificarEtapa(etapa, doCommit.medido ?? null, agora, { commit, erroDoCommit: doCommit.erro, lacuna, ultimoV2: ultimoV2?.commit ?? null });
    const reaberturasAntigas = (etapa.reaberturas ?? []).map((x) => ({ por: x.por, quando: x.quando, motivo: x.motivo }));
    const linha = { instancia: etapa.instancia, via: r.via, commit, motivo: r.motivo, ...(reaberturasAntigas.length ? { reaberturasAntigas } : {}) };
    if (r.impressao) registro = acrescentarAceiteMigrado(registro, etapa.instancia, etapa.aceite, r.impressao, r.origem);
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
    montagem: agora.montagem, arquivo: relative(REPO, arquivoMontagem), contagem, etapas, ultimoV2: ultimoV2?.commit ?? null,
    fixasDepois: leitura.etapas.filter((e) => e.estado === 'fixa').length, registro,
  };
}

export function descreverMigracao(r) {
  const linhas = [`migração de '${r.montagem}' (${r.arquivo}): ${r.contagem.a} pela via (a), ${r.contagem.b} pela (b), ${r.contagem.c} pela (c), ${r.contagem.aberta} já abertas; ${r.fixasDepois} de ${r.etapas.length} fixas pela leitura de agora.${r.ultimoV2 ? ` Último registro v2: ${r.ultimoV2.slice(0, 8)} (as reaberturas antigas ficam legíveis nele).` : ''}`];
  for (const e of r.etapas) {
    linhas.push(`  ${e.instancia.padEnd(18)} (${e.via})${e.commit ? ` ${e.commit.slice(0, 8)}` : ''}${e.estadoDepois ? ` → ${e.estadoDepois}` : ''} — ${e.motivo}${e.motivoDepois ? ` [${e.motivoDepois.slice(0, 200)}]` : ''}`);
    for (const x of e.reaberturasAntigas ?? []) linhas.push(`      reabertura antiga: ${x.por}${x.quando ? `, ${x.quando}` : ''}: ${x.motivo}`);
  }
  return linhas.join('\n');
}

/* Grava o registro v3 no lugar do v2 (ou, com `regravar`, no de um v3 feito só de eventos migrados). Recusa quando alguma etapa fixa
   ficou na via (c): a migração deixaria sem aceite uma etapa que a pessoa aceitou, e quem decide é ela. */
export function gravarMigracao(arquivoMontagem, relatorio, { regravar = false } = {}) {
  const arquivo = arquivoDoRegistro(arquivoMontagem);
  const disco = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (relatorio.contagem.c > 0) throw new Error(`${relatorio.contagem.c} etapa(s) fixa(s) ficaram na via (c) e perderiam o aceite; nada foi gravado, e a decisão é da pessoa.`);
  const migrado = disco.versao === 3 && disco.eventos.every((e) => e.origem?.tipo === 'migração' && e.tipo === 'aceite');
  if ((disco.versao === 3 || 'eventos' in disco) && !(regravar && migrado)) throw new Error(`${relative(REPO, arquivo)} já é da versão 3; não se regrava por cima${disco.versao === 3 && !migrado ? ' (tem eventos que não são de migração)' : ''}.`);
  writeFileSync(arquivo, `${JSON.stringify(relatorio.registro, null, 2)}\n`);
}

if (process.argv[1] && process.argv[1].endsWith('migrar-etapas-para-impressao.mjs')) {
  const argv = process.argv.slice(2);
  (async () => {
    const arquivo = argv.find((a) => a.endsWith('.json'));
    if (!arquivo) { console.error('diga a montagem: migrar-etapas-para-impressao.mjs <montagem.json> [--gravar] [--regravar] [--json]'); process.exit(1); }
    const regravar = argv.includes('--regravar');
    const relatorio = await planejarMigracao(resolve(arquivo), { regravar, avisar: (t) => console.error(t) });
    if (argv.includes('--gravar')) gravarMigracao(resolve(arquivo), relatorio, { regravar });
    const { registro, ...resto } = relatorio;
    console.log(argv.includes('--json') ? JSON.stringify(resto, null, 2) : `${descreverMigracao(relatorio)}\n${argv.includes('--gravar') ? 'registro da versão 3 gravado.' : 'ensaio: nada foi gravado.'}`);
  })().catch((erro) => { console.error(`migrar-etapas-para-impressao: ${erro.message}`); process.exit(1); });
}
