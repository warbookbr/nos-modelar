/* medir-linha-de-base.mjs — a linha de base do plano do cache por passo (fatia 1): onde vai o tempo de cada comando do laço numa peça pesada.
 * Uso, da raiz do repositório, um modo e uma peça por processo (o processo novo paga a importação como o comando paga):
 *   node --max-old-space-size=8192 <este arquivo> execucao <peça>    importar, executar passo a passo, copiar e serializar o estado
 *   node --max-old-space-size=8192 <este arquivo> descrever <peça>   as etapas do `descrever`, pelo andamento que ele já relata
 *   node --max-old-space-size=8192 <este arquivo> bancada <peça> [--zebra] [--com-cache]   as etapas de uma captura da bancada
 * Sem `--com-cache` a captura apaga antes as entradas desta receita em `tmp/cache-de-medida/` (o cache das ferramentas, fora do controle de versão),
 * para medir a captura de depois de uma edição.
 * Cada modo imprime uma linha JSON, com a carga da máquina (`os.loadavg()`) antes e depois. Nada no repositório versionado é escrito: a captura
 * grava na saída padrão da bancada, `tools/bancadas/out/`, que o controle de versão ignora. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { loadavg } from 'node:os';
import { serialize, deserialize } from 'node:v8';
import { importarReceita, receitaDoModulo } from '../../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../../tools/modelar/resolver-caminho-receita.mjs';
import { REGISTRO_DA_RECEITA, executarReceita } from '../../../../src/autoria/executar-receita.js';
import { PASTA_DO_CACHE } from '../../../../tools/modelar/entrada-de-medida.mjs';
import { descreverPecaReutilizavel, registroCronometrado } from '../../../../tools/modelar/descrever-peca.mjs';

const [modo, peca, ...resto] = process.argv.slice(2);
const carga = () => loadavg().map((v) => Number(v.toFixed(2)));
const s = (ms) => Number((ms / 1000).toFixed(2));
/* o tempo de CPU roubado pelo hospedeiro da máquina virtual (`steal`, de /proc/stat), em fração do tempo total das CPUs durante a medida:
   a carga de `uptime` não o mostra, e ele muda o tempo de uma mesma execução */
const cpu = () => { try { return readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number); } catch { return null; } };
/* uma conta fixa, antes da medida, que diz quão rápida a máquina estava: o mesmo número em duas medidas é a mesma máquina */
const calibrar = () => { const ti = performance.now(); let x = 0; for (let i = 0; i < 3e8; i += 1) x = (x + Math.sqrt(i)) % 1e9; return [s(performance.now() - ti), x > -1]; };
const [calibracaoS] = calibrar();
const cargaAntes = carga();
const cpuAntes = cpu();
const t0 = performance.now();

function perfilDaExecucao(tempos, n) {
  const ms = Array.from({ length: n }, (_, k) => tempos.get(k)?.ms ?? 0);
  const total = ms.reduce((a, b) => a + b, 0);
  const porOp = new Map();
  ms.forEach((v, k) => { const op = tempos.get(k)?.op ?? '?'; const o = porOp.get(op) ?? { n: 0, ms: 0 }; o.n += 1; o.ms += v; porOp.set(op, o); });
  const operacoes = [...porOp].sort((a, b) => b[1].ms - a[1].ms).slice(0, 8)
    .map(([op, o]) => ({ op, passos: o.n, s: s(o.ms), fracao: Number((o.ms / total).toFixed(3)) }));
  /* o que um cache de prefixo refaria se o passo p mudasse: os passos p..n-1 */
  const sufixo = new Array(n + 1).fill(0);
  for (let k = n - 1; k >= 0; k -= 1) sufixo[k] = sufixo[k + 1] + ms[k];
  const fracoes = sufixo.slice(0, n).map((v) => v / total).sort((a, b) => a - b);
  let acumulado = 0; let metade = n;
  for (let k = 0; k < n; k += 1) { acumulado += ms[k]; if (acumulado >= total / 2) { metade = k; break; } }
  const passosCaros = ms.map((v, k) => ({ k, op: tempos.get(k)?.op, s: s(v) })).sort((a, b) => b.s - a.s).slice(0, 5);
  return {
    passos: n, execucaoS: s(total), operacoes, passosCaros,
    ultimoPassoS: s(ms[n - 1] ?? 0),
    /* mediana, sobre a posição do passo mudado, da fração do tempo de execução que o prefixo refaria */
    prefixoRefazMediana: Number(fracoes[Math.floor(n / 2)].toFixed(3)),
    metadeDoTempoNoPasso: metade, metadeDoTempoNaFracao: Number((metade / n).toFixed(3)),
    ultimos10pcRefazem: Number((sufixo[Math.floor(n * 0.9)] / total).toFixed(3)),
  };
}

async function execucao() {
  const caminho = resolverCaminhoReceita(peca);
  const ti = performance.now();
  const receita = receitaDoModulo(await importarReceita(caminho));
  const importarS = s(performance.now() - ti);
  const tempos = new Map();
  const n = Array.isArray(receita.PASSOS) ? receita.PASSOS.length : null;
  /* o pico de memória: `heapUsed` amostrado ao fim de cada passo (a execução é síncrona, e só o fim do passo dá vez à amostra) e o `rss`
     máximo do processo, que o sistema conta (`resourceUsage().maxRSS`, em KB) */
  let picoHeap = process.memoryUsage().heapUsed;
  const amostrar = () => { const h = process.memoryUsage().heapUsed; if (h > picoHeap) picoHeap = h; };
  const cronometro = registroCronometrado(REGISTRO_DA_RECEITA, { total: n, tempos, aoPasso: amostrar });
  /* `--sem-cronometro`: a execução com o registro da receita como ele é, sem o cronômetro do `descrever` por cima, para comparar */
  const semCronometro = resto.includes('--sem-cronometro');
  const te = performance.now();
  const executada = executarReceita(receita, semCronometro ? {} : { registroOperacoes: cronometro.registro });
  const executarS = s(performance.now() - te);
  if (!semCronometro) cronometro.fechar(executada.entrada?.PASSOS);
  const perfil = tempos.size ? perfilDaExecucao(tempos, executada.entrada.PASSOS.length) : { passos: executada.entrada?.PASSOS?.length, semPerfil: true };
  amostrar();
  const memoria = { picoHeapMB: Math.round(picoHeap / 1e6), heapNoFimMB: Math.round(process.memoryUsage().heapUsed / 1e6), picoRssMB: Math.round(process.resourceUsage().maxRSS / 1e3) };
  const { neutro } = executada;
  let tc = performance.now(); structuredClone(neutro); const copiarS = s(performance.now() - tc);
  tc = performance.now(); const bytes = serialize(executada); const serializarS = s(performance.now() - tc);
  tc = performance.now(); deserialize(bytes); const desserializarS = s(performance.now() - tc);
  return {
    importarS, executarS, semCronometro, memoria, ...perfil,
    faces: neutro.F.size, vertices: neutro.V.size, partes: Object.keys(neutro.partes ?? {}).length, orfaos: neutro.orfaos.length,
    estado: { copiarS, serializarS, desserializarS, megabytes: Number((bytes.length / 1e6).toFixed(1)) },
  };
}

async function descrever() {
  const marcas = [];
  const r = await descreverPecaReutilizavel({ peca, aoProgredir: (linha) => marcas.push({ t: performance.now(), linha }), intervaloDoProgressoMs: 0 });
  const fim = performance.now();
  const etapas = marcas.map((m, i) => ({ etapa: m.linha.replace(/^descrever: /, '').replace(/, \d+ s desde o começo$/, ''), s: s((marcas[i + 1]?.t ?? fim) - m.t) }));
  return { codigo: r.codigo, etapas };
}

async function bancada() {
  const zebra = resto.includes('--zebra');
  const comCache = resto.includes('--com-cache');
  /* Sem `--com-cache`, a captura é a de depois de uma edição: as execuções e os contatos guardados desta receita saem de `tmp/cache-de-medida/`
     antes, e a captura executa a receita uma vez no Node (a ativação, que guarda a execução para os contatos) e uma na página. Com ele, a
     captura é a de uma receita que não mudou desde a anterior. */
  const caminho = resolverCaminhoReceita(peca);
  const apagados = [];
  if (!comCache) {
    const rotulo = basename(caminho).replace(/[^A-Za-z0-9._-]/g, '_') + '.' + createHash('sha256').update(caminho).digest('hex').slice(0, 6);
    for (const f of existsSync(PASTA_DO_CACHE) ? readdirSync(PASTA_DO_CACHE) : []) if (f.startsWith(rotulo) || f.includes(rotulo)) { unlinkSync(join(PASTA_DO_CACHE, f)); apagados.push(f); }
  }
  const marcas = [{ t: performance.now(), linha: 'bancada: antes da primeira etapa (ativar a sessão, que executa a receita no Node)' }];
  const { olharBancada } = await import('../../../../tools/modelar/olhar-bancada.mjs');
  const r = await olharBancada({
    peca, vistas: zebra ? 'direita' : 'isometrica', ...(zebra ? { visao: 'zebra', enquadrar: true } : {}),
    auditoria: true,
    /* a página do quarto traseiro executa a receita por mais que o prazo padrão de 90 s por etapa, e a captura caía duas vezes nele */
    prazoDeCargaMs: 600_000,
    aoProgredir: (linha) => marcas.push({ t: performance.now(), linha }), intervaloDoProgressoMs: 200,
  });
  const fim = performance.now();
  /* a etapa de cada linha: a de entrada (`bancada: <etapa> (peça)`) e a da batida (`ainda em '<etapa>'`) */
  const porEtapa = new Map();
  marcas.forEach((m, i) => {
    const etapa = m.linha.match(/ainda em '([^']+)'/)?.[1] ?? m.linha.replace(/^bancada: /, '').replace(/ \(.*$/, '').replace(/, \d+ s desde o começo$/, '');
    porEtapa.set(etapa, (porEtapa.get(etapa) ?? 0) + ((marcas[i + 1]?.t ?? fim) - m.t));
  });
  return { ok: r?.ok ?? null, erro: r?.ok === false ? String(r?.erro?.message ?? r?.stderr ?? '').slice(0, 300) : undefined, zebra, comCache, apagados, etapas: [...porEtapa].map(([etapa, ms]) => ({ etapa, s: s(ms) })) };
}

const medir = { execucao, descrever, bancada }[modo];
if (!medir || !peca) { console.error('uso: <execucao|descrever|bancada> <peça>'); process.exit(2); }
const dado = await medir();
const cpuDepois = cpu();
const roubo = cpuAntes && cpuDepois ? (() => { const d = cpuDepois.map((v, i) => v - cpuAntes[i]); const tot = d.reduce((a, b) => a + b, 0); return tot ? Number((d[7] / tot).toFixed(3)) : null; })() : null;
console.log(JSON.stringify({ modo, peca, totalS: s(performance.now() - t0), cargaAntes, cargaDepois: carga(), roubo, calibracaoS, ...dado }));
process.exit(0);
