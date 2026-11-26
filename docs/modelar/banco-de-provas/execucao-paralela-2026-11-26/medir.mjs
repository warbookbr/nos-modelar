/* medir.mjs — as medidas do plano da execução paralela (fatia 1). Uso, da raiz do repositório, um modo por processo:
 *   node --max-old-space-size=8192 <este arquivo> receita <peça>
 *       executa a receita passo a passo com o cronômetro do `descrever`, monta o grafo de dependência dos passos pela leitura e escrita
 *       declaradas (`procedural/nucleo/planejador/leitura-escrita.js`) e imprime o tempo em série, o caminho mais longo pelo grafo (o
 *       tempo com núcleos à vontade) e o custo de serializar e desserializar o estado inteiro da peça.
 *   node <este arquivo> partes <peça>[,<peça>...] --processos=<n>
 *       executa as peças em n processos filhos, repartidas pela mais lenta primeiro (os tempos vêm de uma execução em série com
 *       --processos=1), e imprime o tempo de parede, o pico de memória de cada filho e a impressão da malha de cada peça.
 * Cada modo imprime uma linha JSON. Nada do repositório versionado é escrito.
 *
 * O grafo é conservador: o passo depende do último que escreveu cada origem que ele lê; quem lê uma origem conta também como quem a
 * escreve (a maioria das operações muda o que lê); o passo sem `origemId` escreve só o que lê; e o passo que é barreira para o planejador
 * (lê a malha sem leitura declarada) ou que tem seleção dinâmica depende de todos os anteriores, e todos os seguintes dependem dele. A
 * conta `otimista` supõe a leitura declarada em toda operação: só a seleção dinâmica fica barreira, o que dá o teto do ganho. */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { fileURLToPath } from 'node:url';
import { serialize, deserialize } from 'node:v8';
import { importarReceita, receitaDoModulo } from '../../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../../tools/modelar/resolver-caminho-receita.mjs';
import { REGISTRO_DA_RECEITA, executarReceita, entradaDaReceita } from '../../../../src/autoria/executar-receita.js';
import { registroCronometrado } from '../../../../tools/modelar/descrever-peca.mjs';
import { analisarPassos } from '../../../../procedural/nucleo/planejador/leitura-escrita.js';
import { REGISTRO_OPERACOES, neutroCanonico } from '../../../../procedural/nucleo/entrada.js';

const [modo, alvo, ...resto] = process.argv.slice(2);
const s = (ms) => Number((ms / 1000).toFixed(2));
const opcao = (nome, padrao) => resto.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1] ?? padrao;
const cpu = () => { try { return readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number); } catch { return null; } };
const roubado = (a, b) => { if (!a || !b) return null; const d = b.map((v, i) => v - a[i]); const tot = d.reduce((x, y) => x + y, 0); return tot ? Number((d[7] / tot).toFixed(3)) : null; };
const base = (chave) => chave.split(/[</]/)[0];
const impressao = (neutro) => createHash('sha256').update(JSON.stringify(neutroCanonico(neutro))).digest('hex').slice(0, 16);

/** O caminho mais longo pelo grafo de dependência, com o tempo de cada passo como peso. */
export function caminhoMaisLongo(passos, analise, ms, { otimista = false } = {}) {
  const ultimoQueEscreveu = new Map();
  let ultimaBarreira = -1;
  const fim = new Array(passos.length).fill(0);
  const deps = [];
  let barreiras = 0;
  let maiorFim = 0;
  for (let i = 0; i < passos.length; i += 1) {
    const a = analise[i];
    const args = (Array.isArray(passos[i]) ? passos[i][1] : null) ?? {};
    const le = [...new Set(a.referencias.map(base))];
    const barreira = otimista ? a.dinamica : a.barreira || a.dinamica;
    const de = new Set();
    if (barreira) { for (let j = 0; j < i; j += 1) de.add(j); barreiras += 1; } else {
      if (ultimaBarreira >= 0) de.add(ultimaBarreira);
      for (const k of le) if (ultimoQueEscreveu.has(k)) de.add(ultimoQueEscreveu.get(k));
    }
    const inicio = Math.max(0, ...[...de].map((j) => fim[j]));
    fim[i] = inicio + ms[i];
    if (fim[i] > maiorFim) maiorFim = fim[i];
    deps.push(de.size);
    if (barreira) { ultimaBarreira = i; ultimoQueEscreveu.clear(); } else {
      for (const k of le) ultimoQueEscreveu.set(k, i);
      if (args.origemId !== undefined) ultimoQueEscreveu.set(`${a.op}#${args.origemId}`, i);
    }
  }
  return { caminhoMs: maiorFim, barreiras, semDependencia: deps.filter((d) => d === 0).length };
}

async function receita() {
  const caminho = resolverCaminhoReceita(alvo);
  const modulo = receitaDoModulo(await importarReceita(caminho));
  const entrada = entradaDaReceita(modulo);
  const tempos = new Map();
  const n = entrada.PASSOS.length;
  const cronometro = registroCronometrado(REGISTRO_DA_RECEITA, { total: n, tempos });
  const c0 = cpu(); const carga = loadavg()[0];
  const t0 = performance.now();
  const executada = executarReceita(modulo, { registroOperacoes: cronometro.registro });
  const execMs = performance.now() - t0;
  const c1 = cpu();
  cronometro.fechar(executada.entrada?.PASSOS);
  const passos = executada.entrada.PASSOS;
  const ms = passos.map((_, k) => tempos.get(k)?.ms ?? 0);
  const total = ms.reduce((x, y) => x + y, 0);
  const analise = analisarPassos(passos, { manifesto: REGISTRO_OPERACOES.manifesto, aliases: executada.entrada.ALIASES ?? [] });
  const grafo = caminhoMaisLongo(passos, analise, ms);
  const otimista = caminhoMaisLongo(passos, analise, ms, { otimista: true });
  const opsDeBarreira = {}; analise.forEach((a) => { if (a.barreira || a.dinamica) opsDeBarreira[a.op] = (opsDeBarreira[a.op] ?? 0) + 1; });
  const porOp = new Map();
  passos.forEach(([op], k) => porOp.set(op, (porOp.get(op) ?? 0) + ms[k]));
  const maisCaras = [...porOp].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([op, v]) => ({ op, s: s(v), fracao: Number((v / total).toFixed(3)) }));
  const maiorPasso = Math.max(...ms);
  let tc = performance.now(); const bytes = serialize(executada.neutro); const serializarMs = performance.now() - tc;
  tc = performance.now(); deserialize(bytes); const desserializarMs = performance.now() - tc;
  return {
    modo, peca: alvo, passos: n, execucaoS: s(execMs), somaDosPassosS: s(total), caminhoMaisLongoS: s(grafo.caminhoMs),
    ganhoMaximo: Number((total / grafo.caminhoMs).toFixed(2)), barreiras: grafo.barreiras, passosSemDependencia: grafo.semDependencia,
    otimista: { caminhoMaisLongoS: s(otimista.caminhoMs), ganhoMaximo: Number((total / otimista.caminhoMs).toFixed(2)), barreiras: otimista.barreiras },
    opsDeBarreira: Object.fromEntries(Object.entries(opsDeBarreira).sort((x, y) => y[1] - x[1]).slice(0, 6)),
    maiorPassoS: s(maiorPasso), maiorPassoFracao: Number((maiorPasso / total).toFixed(3)), maisCaras,
    estado: { megabytes: Number((bytes.length / 1e6).toFixed(1)), serializarS: s(serializarMs), desserializarS: s(desserializarMs) },
    picoRssMB: Math.round(process.resourceUsage().maxRSS / 1e3), cargaAntes: carga, roubado: roubado(c0, c1), impressao: impressao(executada.neutro),
  };
}

/** Filho: executa as peças da lista, uma depois da outra, e devolve o tempo e a impressão de cada uma. */
async function filho() {
  const saida = [];
  for (const peca of alvo.split(',')) {
    const t0 = performance.now();
    const modulo = receitaDoModulo(await importarReceita(resolverCaminhoReceita(peca)));
    const executada = executarReceita(modulo);
    saida.push({ peca, s: s(performance.now() - t0), impressao: impressao(executada.neutro) });
  }
  return { modo, pecas: saida, picoRssMB: Math.round(process.resourceUsage().maxRSS / 1e3) };
}

function rodarFilho(lista) {
  return new Promise((ok, falha) => {
    const p = spawn(process.execPath, ['--max-old-space-size=4096', fileURLToPath(import.meta.url), 'filho', lista.join(',')], { stdio: ['ignore', 'pipe', 'inherit'] });
    let texto = '';
    p.stdout.on('data', (d) => { texto += d; });
    p.on('close', (codigo) => { try { ok(JSON.parse(texto.trim().split('\n').pop())); } catch (e) { falha(new Error(`filho saiu com ${codigo}: ${texto.slice(-300)}`)); } });
  });
}

async function partes() {
  const pecas = alvo.split(',');
  const n = Number(opcao('processos', '1'));
  const tempos = opcao('tempos', null);
  const peso = new Map(tempos ? Object.entries(JSON.parse(tempos)) : pecas.map((p) => [p, 1]));
  /* a mais lenta primeiro, cada uma ao processo com menos tempo somado */
  const grupos = Array.from({ length: n }, () => ({ lista: [], soma: 0 }));
  for (const p of [...pecas].sort((a, b) => (peso.get(b) ?? 0) - (peso.get(a) ?? 0))) {
    const g = grupos.reduce((m, x) => (x.soma < m.soma ? x : m));
    g.lista.push(p); g.soma += peso.get(p) ?? 0;
  }
  const c0 = cpu(); const carga = loadavg()[0];
  const t0 = performance.now();
  const filhos = await Promise.all(grupos.filter((g) => g.lista.length).map((g) => rodarFilho(g.lista)));
  const paredeMs = performance.now() - t0;
  const c1 = cpu();
  const porPeca = Object.fromEntries(filhos.flatMap((f) => f.pecas.map((x) => [x.peca, { s: x.s, impressao: x.impressao }])));
  return {
    modo, processos: n, paredeS: s(paredeMs), somaS: Number(Object.values(porPeca).reduce((a, x) => a + x.s, 0).toFixed(2)),
    picoRssPorFilhoMB: filhos.map((f) => f.picoRssMB), picoRssSomaMB: filhos.reduce((a, f) => a + f.picoRssMB, 0),
    cargaAntes: carga, roubado: roubado(c0, c1), porPeca,
  };
}

const modos = { receita, filho, partes };
if (!modos[modo]) { console.error(`modo desconhecido: ${modo}`); process.exit(2); }
console.log(JSON.stringify(await modos[modo]()));
