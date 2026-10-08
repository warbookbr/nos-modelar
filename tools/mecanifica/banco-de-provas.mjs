#!/usr/bin/env node
/* Catálogo e registro de custo do banco de provas de modelagem.
   Compara autonomia, rodadas, notas e tokens consumidos entre o início e o fim
   do plano de ferramentas. Gera BANCO-DE-PROVAS.md e valida via --check. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RAIZ = resolve(__dirname, '../..');

export const CAMINHO_JSON = join(RAIZ, 'docs/mecanifica/banco-de-provas/banco-de-provas.json');
export const CAMINHO_MD = join(RAIZ, 'docs/mecanifica/banco-de-provas/BANCO-DE-PROVAS.md');

function obterCommitGit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: RAIZ }).trim();
  } catch {
    return 'desconhecido';
  }
}

export function validarRegistro(registro, { objetosValidos = null, origensValidas = null } = {}) {
  if (!registro || typeof registro !== 'object') {
    throw new Error('Registro inválido: esperado um objeto.');
  }

  const { objeto, unidade, tokens, nota, rodada, rodadas, origemTokens, data, commit, motivo } = registro;

  if (typeof objeto !== 'string' || !objeto.trim()) {
    throw new Error('Registro recusado: campo "objeto" obrigatório.');
  }
  const nomeObjeto = objeto.trim();
  if (objetosValidos && !objetosValidos.includes(nomeObjeto)) {
    throw new Error(`Registro recusado: objeto "${nomeObjeto}" não listado no banco de provas (válidos: ${objetosValidos.join(', ')}).`);
  }

  if (typeof unidade !== 'string' || !unidade.trim()) {
    throw new Error('Registro recusado: campo "unidade" obrigatório.');
  }
  const nomeUnidade = unidade.trim();

  const nNota = Number(nota);
  if (!Number.isFinite(nNota) || nNota < 0 || nNota > 10) {
    throw new Error(`Registro recusado: nota deve ser um número entre 0 e 10 (recebido: ${JSON.stringify(nota)}).`);
  }

  const nTokens = Number(tokens);
  if (!Number.isInteger(nTokens) || nTokens < 0) {
    throw new Error(`Registro recusado: tokens deve ser um número inteiro maior ou igual a zero (recebido: ${JSON.stringify(tokens)}).`);
  }

  const rVal = rodadas !== undefined ? rodadas : rodada;
  const nRodadas = rVal !== undefined ? Number(rVal) : 1;
  if (!Number.isInteger(nRodadas) || nRodadas < 1) {
    throw new Error(`Registro recusado: rodadas deve ser um número inteiro maior ou igual a 1 (recebido: ${JSON.stringify(rVal)}).`);
  }

  const sOrigem = typeof origemTokens === 'string' && origemTokens.trim() ? origemTokens.trim() : 'condutor';
  if (origensValidas && origensValidas.length && !origensValidas.includes(sOrigem)) {
    throw new Error(`Registro recusado: origem dos tokens "${sOrigem}" desconhecida (válidas: ${origensValidas.join(', ')}).`);
  }

  const sData = typeof data === 'string' && data.trim() ? data.trim() : new Date().toISOString();
  const sCommit = typeof commit === 'string' && commit.trim() ? commit.trim() : obterCommitGit();
  const sMotivo = typeof motivo === 'string' ? motivo.trim() : '';

  return {
    objeto: nomeObjeto,
    unidade: nomeUnidade,
    rodadas: nRodadas,
    rodada: nRodadas,
    data: sData,
    commit: sCommit,
    tokens: nTokens,
    origemTokens: sOrigem,
    nota: nNota,
    motivo: sMotivo,
  };
}

/* O dia de uma medição. Cada dia é uma campanha: o resumo não soma medições de dias diferentes, que repetem os mesmos
   objetos por outro caminho e existem para ser comparadas lado a lado. */
export const diaDaMedicao = (m) => String(m.data ?? '').slice(0, 10);

/* Os dias com medição, do mais antigo ao mais recente. */
export function campanhas(dados) {
  return [...new Set((dados.medicoes ?? []).map(diaDaMedicao))].sort();
}

/* O resumo por objeto das medições de um dia (`campanha`), ou de todas quando não se dá o dia. */
export function resumoPorObjeto(dados, { campanha = null } = {}) {
  const resumo = {};
  const objetos = dados.objetos ?? [];
  const medicoes = (dados.medicoes ?? []).filter((m) => campanha === null || diaDaMedicao(m) === campanha);

  for (const obj of objetos) {
    resumo[obj.nome] = {
      objeto: obj.nome,
      familia: obj.familia,
      nivel: obj.nivel,
      totalTokens: 0,
      totalRodadas: 0,
      notaFinal: null,
      medicoes: 0,
    };
  }

  const rodadasPorUnidade = new Map();

  for (const m of medicoes) {
    if (!resumo[m.objeto]) {
      resumo[m.objeto] = {
        objeto: m.objeto,
        familia: 'Outro',
        nivel: 'esboço',
        totalTokens: 0,
        totalRodadas: 0,
        notaFinal: null,
        medicoes: 0,
      };
    }
    const r = resumo[m.objeto];
    r.totalTokens += m.tokens;
    r.medicoes += 1;

    if (!rodadasPorUnidade.has(m.objeto)) {
      rodadasPorUnidade.set(m.objeto, new Map());
    }
    const unidades = rodadasPorUnidade.get(m.objeto);
    const atual = unidades.get(m.unidade) ?? { rodada: 0, nota: null };
    const rVal = m.rodada ?? m.rodadas ?? 1;
    /* A nota de uma unidade é a da rodada mais recente dela. */
    unidades.set(m.unidade, rVal >= atual.rodada ? { rodada: rVal, nota: m.nota } : atual);
  }

  for (const [nomeObjeto, unidades] of rodadasPorUnidade.entries()) {
    if (resumo[nomeObjeto]) {
      let somaRodadas = 0;
      let menorNota = null;
      for (const u of unidades.values()) {
        somaRodadas += u.rodada;
        if (menorNota === null || u.nota < menorNota) menorNota = u.nota;
      }
      resumo[nomeObjeto].totalRodadas = somaRodadas;
      /* A nota do objeto é a pior nota final entre as unidades: o objeto só passa quando todas passam. */
      resumo[nomeObjeto].notaFinal = menorNota;
    }
  }

  return resumo;
}

/* As linhas do resumo: cada objeto em cada dia em que foi medido, ou uma linha sem dia se nunca foi. */
function linhasDoResumo(dados) {
  const porDia = campanhas(dados).map((dia) => ({ dia, resumo: resumoPorObjeto(dados, { campanha: dia }) }));
  const linhas = [];
  for (const obj of dados.objetos ?? []) {
    const medidos = porDia.filter(({ resumo }) => resumo[obj.nome]?.medicoes > 0);
    if (medidos.length === 0) linhas.push({ obj, dia: null, r: null });
    for (const { dia, resumo } of medidos) linhas.push({ obj, dia, r: resumo[obj.nome] });
  }
  return linhas;
}

export function gerarMarkdown(dados) {
  const L = [];
  L.push('<!-- Gerado por tools/mecanifica/banco-de-provas.mjs. Não edite à mão; rode npm run banco-de-provas:gerar. -->');
  L.push('# Banco de provas e registro de custo');
  L.push('');
  L.push('Este banco de provas define os objetos de referência que serão modelados no');
  L.push('começo e no fim do plano de ferramentas de modelagem. O objetivo é comparar');
  L.push('objetivamente a autonomia do agente, a conformidade geométrica e o custo de');
  L.push('inferência (tokens, rodadas e nota final do crítico visual).');
  L.push('');
  L.push('A medição experimental completa fica para execução sob demanda com aval humano,');
  L.push('pois envolve consumo significativo de recursos.');
  L.push('');
  L.push('## Objetos do banco de provas');
  L.push('');
  L.push('| # | Objeto | Família | Nível | Ferramentas exercitadas | Referência | Justificativa |');
  L.push('| - | ------ | ------- | ----- | ----------------------- | ---------- | ------------- |');

  (dados.objetos ?? []).forEach((obj, idx) => {
    const ferramentas = (obj.ferramentas ?? []).map((f) => `\`${f}\``).join(', ');
    const ref = obj.referencia ? `[Link](${obj.referencia})` : '—';
    L.push(`| ${idx + 1} | **${obj.nome}** | ${obj.familia} | ${obj.nivel} | ${ferramentas} | ${ref} | ${obj.justificativa} |`);
  });

  L.push('');
  L.push('## Resumo de custo por objeto');
  L.push('');
  L.push('Uma linha por objeto e dia de medição; dias diferentes não se somam.');
  L.push('');
  L.push('| Objeto | Nível | Família | Dia | Medições | Rodadas | Tokens | Menor nota final entre as unidades |');
  L.push('| ------ | ----- | ------- | --- | -------- | ------- | ------ | ---------- |');

  for (const { obj, dia, r } of linhasDoResumo(dados)) {
    const notaStr = r && r.notaFinal !== null ? String(r.notaFinal).replace('.', ',') : '—';
    L.push(r
      ? `| **${obj.nome}** | ${obj.nivel} | ${obj.familia} | ${dia} | ${r.medicoes} | ${r.totalRodadas} | ${r.totalTokens} | ${notaStr} |`
      : `| **${obj.nome}** | ${obj.nivel} | ${obj.familia} | aguardando medição | 0 | 0 | 0 | — |`);
  }

  L.push('');
  L.push('## Histórico de medições');
  L.push('');
  const medicoes = dados.medicoes ?? [];
  if (medicoes.length === 0) {
    L.push('Nenhuma medição registrada até o momento. As medições serão gravadas via');
    L.push('`npm run banco-de-provas:registrar` quando a rodada de avaliação for autorizada.');
  } else {
    L.push('| Data | Commit | Objeto | Unidade | Rodada | Tokens | Origem | Nota | Motivo |');
    L.push('| ---- | ------ | ------ | ------- | ------ | ------ | ------ | ---- | ------ |');
    for (const m of medicoes) {
      const notaStr = String(m.nota).replace('.', ',');
      L.push(`| ${m.data} | \`${m.commit}\` | **${m.objeto}** | ${m.unidade} | ${m.rodada} | ${m.tokens} | ${m.origemTokens} | ${notaStr} | ${m.motivo || '—'} |`);
    }
  }
  L.push('');
  return `${L.join('\n')}\n`;
}

export function conferir(dados, markdownAtual) {
  const erros = [];
  const objetos = dados.objetos ?? [];
  if (objetos.length < 5 || objetos.length > 8) {
    erros.push(`Banco de provas deve ter entre 5 e 8 objetos (encontrados: ${objetos.length}).`);
  }

  const objetosValidos = objetos.map((o) => o.nome);
  const origensValidas = dados.origensTokensValidas ?? [];

  for (const [idx, m] of (dados.medicoes ?? []).entries()) {
    try {
      validarRegistro(m, { objetosValidos, origensValidas });
    } catch (e) {
      erros.push(`Medição ${idx + 1} inválida: ${e.message}`);
    }
  }

  const esperado = gerarMarkdown(dados);
  if (esperado.trim() !== (markdownAtual ?? '').trim()) {
    erros.push('O arquivo docs/mecanifica/banco-de-provas/BANCO-DE-PROVAS.md está desatualizado em relação a banco-de-provas.json. Rode `npm run banco-de-provas:gerar`.');
  }

  return erros;
}

export function registrarMedicao(caminhoJson, registro) {
  const texto = readFileSync(caminhoJson, 'utf8');
  const dados = JSON.parse(texto);
  const objetosValidos = (dados.objetos ?? []).map((o) => o.nome);
  const origensValidas = dados.origensTokensValidas ?? [];

  const limpo = validarRegistro(registro, { objetosValidos, origensValidas });
  dados.medicoes = [...(dados.medicoes ?? []), limpo];

  writeFileSync(caminhoJson, `${JSON.stringify(dados, null, 2)}\n`, 'utf8');
  const md = gerarMarkdown(dados);
  writeFileSync(CAMINHO_MD, md, 'utf8');
  return { dados, medicao: limpo };
}

function parseArgs(argv) {
  const flags = new Set();
  const valores = new Map();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, ...v] = a.split('=');
      flags.add(k);
      if (v.length > 0) {
        valores.set(k, v.join('='));
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        valores.set(k, argv[++i]);
      }
    }
  }
  return {
    tem: (f) => flags.has(f),
    valor: (f) => valores.get(f),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(CAMINHO_JSON)) {
    process.stderr.write(`Erro: banco-de-provas.json não encontrado em ${CAMINHO_JSON}\n`);
    process.exit(1);
  }

  const dados = JSON.parse(readFileSync(CAMINHO_JSON, 'utf8'));

  if (args.tem('--check')) {
    const mdAtual = existsSync(CAMINHO_MD) ? readFileSync(CAMINHO_MD, 'utf8') : '';
    const erros = conferir(dados, mdAtual);
    if (erros.length > 0) {
      process.stderr.write('Falha na verificação do banco de provas:\n');
      for (const err of erros) process.stderr.write(`  - ${err}\n`);
      process.exit(1);
    }
    process.stdout.write('banco-de-provas:check passou. Dados e documentação íntegros.\n');
    process.exit(0);
  }

  if (args.tem('--gerar')) {
    const md = gerarMarkdown(dados);
    writeFileSync(CAMINHO_MD, md, 'utf8');
    process.stdout.write(`Documento gerado com sucesso em ${CAMINHO_MD}\n`);
    process.exit(0);
  }

  if (args.tem('--resumo')) {
    const traco = `${'-'.repeat(96)}\n`;
    process.stdout.write('\nResumo de Custo do Banco de Provas por Objeto e dia de medição:\n');
    process.stdout.write(traco);
    process.stdout.write(`${'Objeto'.padEnd(22)} | ${'Nível'.padEnd(10)} | ${'Dia'.padEnd(10)} | ${'Medições'.padStart(8)} | ${'Rodadas'.padStart(7)} | ${'Tokens'.padStart(8)} | ${'Nota'.padStart(6)}\n`);
    process.stdout.write(traco);
    for (const { obj, dia, r } of linhasDoResumo(dados)) {
      const notaStr = r && r.notaFinal !== null ? String(r.notaFinal).replace('.', ',') : '—';
      process.stdout.write(`${obj.nome.padEnd(22)} | ${obj.nivel.padEnd(10)} | ${(dia ?? 'aguardando').padEnd(10)} | ${String(r?.medicoes ?? 0).padStart(8)} | ${String(r?.totalRodadas ?? 0).padStart(7)} | ${String(r?.totalTokens ?? 0).padStart(8)} | ${notaStr.padStart(6)}\n`);
    }
    process.stdout.write(`${traco}\n`);
    process.exit(0);
  }

  if (args.tem('--registrar')) {
    try {
      const registro = {
        objeto: args.valor('--objeto'),
        unidade: args.valor('--unidade'),
        tokens: args.valor('--tokens'),
        nota: args.valor('--nota'),
        rodada: args.valor('--rodada') ?? args.valor('--rodadas'),
        origemTokens: args.valor('--origem') ?? args.valor('--origem-tokens'),
        motivo: args.valor('--motivo'),
        commit: args.valor('--commit'),
        data: args.valor('--data'),
      };
      const res = registrarMedicao(CAMINHO_JSON, registro);
      process.stdout.write(`Medição registrada com sucesso para o objeto "${res.medicao.objeto}" (${res.medicao.unidade}): ${res.medicao.tokens} tokens, nota ${res.medicao.nota}.\n`);
      process.exit(0);
    } catch (e) {
      process.stderr.write(`Erro ao registrar medição: ${e.message}\n`);
      process.exit(1);
    }
  }

  process.stdout.write('Uso:\n');
  process.stdout.write('  node tools/mecanifica/banco-de-provas.mjs --gerar\n');
  process.stdout.write('  node tools/mecanifica/banco-de-provas.mjs --check\n');
  process.stdout.write('  node tools/mecanifica/banco-de-provas.mjs --resumo\n');
  process.stdout.write('  node tools/mecanifica/banco-de-provas.mjs --registrar --objeto <nome> --unidade <unidade> --tokens <n> --nota <0-10> [--rodada <n>] [--origem <origem>] [--motivo <texto>] [--commit <hash>] [--data <iso>]\n');
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main();
}
