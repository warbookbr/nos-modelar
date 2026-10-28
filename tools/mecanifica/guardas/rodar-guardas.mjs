#!/usr/bin/env node
/* rodar-guardas.mjs — o gate `bancada:guardas`: as guardas que abrem a bancada num navegador só e, quando precisam, num servidor só.
 *
 * Medido em 2026-10-28, em série e uma a uma: porteiro 23 s, bancada:vazia:check 4 s, guarda:portas 12 s, guarda:camera 32 s,
 * guarda:par 13 s, guarda:referencia 14 s, guarda:escolha 28 s, guarda:junta 21 s, guarda:edicao 99 s, guarda:gesto 9 s, 254 s
 * somados. Cada uma subia o próprio Chromium, e cinco delas o próprio servidor do Vite, que reescrevem o cache de
 * pré-empacotamento um do outro quando sobem juntos (`RECURSOS_DO_GATE` em tools/gates.mjs).
 *
 * Aqui o Chromium sobe uma vez (`launchServer`) e o servidor do Vite uma vez, só se alguma guarda escolhida o usa, e cada guarda
 * roda no PRÓPRIO processo, em sequência, conectando-se ao navegador pelo endereço que recebe no ambiente
 * (tools/bancadas/ambiente-das-guardas.mjs) e abrindo a própria página, que é um contexto novo, sem cookie nem armazenamento do
 * anterior. O código de cada guarda é o mesmo que roda sozinha por `npm run guarda:camera` e afins, que continuam existindo.
 *
 * O QUE CADA UMA AFIRMA NÃO MUDA, e o relatório diz o nome e o veredito de cada uma: a falha de uma não interrompe as outras, e
 * a saída lista no fim as que falharam. Uma guarda que passa de TEMPO_POR_GUARDA_MS é morta e conta como falha com o nome dela,
 * para uma travada não esconder as seguintes.
 *
 * ISOLAMENTO. O estado que uma guarda deixa não pode mudar o que a seguinte vê. A sessão local da bancada (`sessao-ativa.json`,
 * na raiz e em `public/`) é posta de lado durante a rodada inteira, antes de o servidor subir, porque o servidor registra os
 * arquivos de `public/` ao subir e a guarda do catálogo vazio depende de ela não existir. `guarda:escolha` fabrica a sessão dela
 * numa pasta temporária, `guarda:gesto` baixa o arquivo para outra, e as fotos de `tools/bancadas/out/` têm um nome por guarda.
 *
 *   npm run bancada:guardas                          todas
 *   npm run bancada:guardas -- --so=guarda:camera    só as nomeadas, separadas por vírgula
 *   npm run bancada:guardas -- --faixas=1            uma de cada vez (o padrão são duas) */
import { spawn } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ARGS_DO_NAVEGADOR, VARIAVEL_DO_NAVEGADOR, VARIAVEL_DO_VITE, carregarPlaywright, subirVite,
} from '../../bancadas/ambiente-das-guardas.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/* `usa`: 'vite' (abre o servidor de desenvolvimento), 'pacote' (abre `dist/`, que o gate `build` escreve) ou null (nada de
   navegador; só os testes do runner). O nome é o do script do package.json. A ordem é a do relatório: primeiro as que levam
   poucos segundos, e a mais longa por último. `longa` manda a guarda começar antes das outras quando há mais de uma faixa, para
   ela não ser a última a começar e alongar a rodada. */
export const GUARDAS = [
  { nome: 'bancada:vazia:check', script: 'tools/mecanifica/guardas/guarda-bancada-vazia.mjs', usa: 'vite' },
  { nome: 'guarda:portas', script: 'tools/mecanifica/guardas/guarda-portas-bancada.mjs', usa: 'vite' },
  { nome: 'guarda:par', script: 'tools/mecanifica/guardas/guarda-inspecao-par.mjs', usa: 'vite' },
  { nome: 'guarda:camera', script: 'tools/mecanifica/guardas/guarda-camera-livre.mjs', usa: 'vite' },
  { nome: 'porteiro', script: 'tools/bancadas/porteiro.mjs', usa: 'vite' },
  { nome: 'guarda:gesto', script: 'tools/mecanifica/guardas/guarda-gesto.mjs', usa: 'pacote' },
  { nome: 'guarda:referencia', script: 'tools/mecanifica/guardas/guarda-referencia-da-peca.mjs', usa: 'pacote' },
  { nome: 'guarda:junta', script: 'tools/mecanifica/guardas/guarda-junta-da-bancada.mjs', usa: 'pacote' },
  { nome: 'guarda:escolha', script: 'tools/mecanifica/guardas/guarda-escolha-da-peca.mjs', usa: 'pacote' },
  { nome: 'guarda:edicao', script: 'tools/mecanifica/guardas/guarda-edicao-de-malha.mjs', usa: 'pacote', longa: true },
];

/* A guarda mais longa levou 99 s sozinha com a máquina carregada; o teto dá folga de quatro vezes. */
export const TEMPO_POR_GUARDA_MS = 420_000;

/* Quantas guardas rodam ao mesmo tempo no navegador e no servidor que dividem. Duas, porque a máquina de quatro processadores
   também roda o Chromium e o Vite, e a mais longa (a edição, ~100 s) sozinha numa faixa deixa as outras nove na outra. */
export const FAIXAS_PADRAO = 2;

const SESSOES_LOCAIS = ['public/sessao-ativa.json', 'sessao-ativa.json'];

/* Põe de lado a sessão local e devolve a função que a restaura. Um arquivo `.guarda-bak` que sobrou de uma rodada morta é
   sobrescrito, como a guarda do catálogo vazio já fazia. */
export function poremSessaoDeLado(repo) {
  const movidos = [];
  for (const relativo of SESSOES_LOCAIS) {
    const real = join(repo, relativo);
    if (!existsSync(real)) continue;
    renameSync(real, `${real}.guarda-bak`);
    movidos.push(real);
  }
  let restaurado = false;
  return () => {
    if (restaurado) return;
    restaurado = true;
    for (const real of movidos) if (existsSync(`${real}.guarda-bak`)) renameSync(`${real}.guarda-bak`, real);
  };
}

/* Roda uma guarda num processo próprio e devolve o veredito dela. */
export function rodarUma(guarda, { repo, ambiente, tempo = TEMPO_POR_GUARDA_MS }) {
  return new Promise((resolver) => {
    const inicio = Date.now();
    const pedacos = [];
    let vencido = false;
    const filho = spawn(process.execPath, [join(repo, guarda.script)], {
      cwd: repo, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...ambiente },
    });
    const relogio = setTimeout(() => { vencido = true; filho.kill('SIGKILL'); }, tempo);
    filho.stdout.on('data', (d) => pedacos.push(d));
    filho.stderr.on('data', (d) => pedacos.push(d));
    const terminar = (codigo, extra = '') => {
      clearTimeout(relogio);
      resolver({
        nome: guarda.nome,
        codigo: vencido ? 124 : (codigo ?? 1),
        duracao: Date.now() - inicio,
        saida: Buffer.concat(pedacos).toString() + extra,
        vencido,
      });
    };
    filho.on('error', (erro) => terminar(1, `não foi possível iniciar a guarda: ${erro.message}\n`));
    filho.on('close', (codigo) => terminar(codigo));
  });
}

const segundos = (ms) => `${(Math.round(ms / 100) / 10).toFixed(1)}s`;

/* O relatório de uma guarda: o nome dela, a saída que ela escreveu e o veredito. */
export function relatarGuarda(r, escrever) {
  escrever(`\n▶ ${r.nome}\n`);
  const saida = r.saida.trim();
  if (saida) escrever(`${saida.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n')}\n`);
  escrever(r.codigo === 0
    ? `✓ ${r.nome} — ok em ${segundos(r.duracao)}\n`
    : `✗ ${r.nome} — FALHOU (${r.vencido ? `passou de ${TEMPO_POR_GUARDA_MS / 1000}s e foi interrompida` : `código ${r.codigo}`}) em ${segundos(r.duracao)}\n`);
}

/* Sobe o que as guardas escolhidas usam, roda uma de cada vez e fecha tudo no fim, mesmo com erro. */
export async function rodarGuardas({
  guardas = GUARDAS, selecionadas = null, repo = REPO, escrever = (t) => process.stdout.write(t), tempo = TEMPO_POR_GUARDA_MS,
  faixas = FAIXAS_PADRAO,
} = {}) {
  const escolhidas = selecionadas ? guardas.filter((g) => selecionadas.includes(g.nome)) : guardas;
  const desconhecidas = (selecionadas ?? []).filter((n) => !guardas.some((g) => g.nome === n));
  if (desconhecidas.length) throw new Error(`guarda desconhecida: ${desconhecidas.join(', ')} (as que existem: ${guardas.map((g) => g.nome).join(', ')})`);

  const precisaDoVite = escolhidas.some((g) => g.usa === 'vite');
  const precisaDoNavegador = escolhidas.some((g) => g.usa);
  const ambiente = {};
  let restaurarSessao = () => {};
  let vite = null;
  let servidorDoNavegador = null;
  const resultados = [];
  const inicioDaRodada = Date.now();
  const aoInterromper = () => { restaurarSessao(); process.exit(130); };
  process.once('SIGINT', aoInterromper);
  process.once('SIGTERM', aoInterromper);
  try {
    if (precisaDoNavegador) {
      const playwright = await carregarPlaywright(repo);
      if (!playwright) throw new Error('Playwright não encontrado. Rode: npm ci');
      if (precisaDoVite) {
        restaurarSessao = poremSessaoDeLado(repo);
        vite = await subirVite(repo);
        ambiente[VARIAVEL_DO_VITE] = String(vite.port);
      }
      servidorDoNavegador = await playwright.chromium.launchServer({ args: ARGS_DO_NAVEGADOR });
      ambiente[VARIAVEL_DO_NAVEGADOR] = servidorDoNavegador.wsEndpoint();
    }
    /* Cada faixa pega a próxima guarda da fila quando termina a sua. O relatório de cada uma sai inteiro, quando ela termina,
       para a saída de duas não se misturar linha a linha. */
    const fila = [...escolhidas.filter((g) => g.longa), ...escolhidas.filter((g) => !g.longa)];
    const faixa = async () => {
      while (fila.length) {
        const r = await rodarUma(fila.shift(), { repo, ambiente, tempo });
        relatarGuarda(r, escrever);
        resultados.push(r);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.min(faixas, fila.length)) }, faixa));
    resultados.sort((a, b) => escolhidas.findIndex((g) => g.nome === a.nome) - escolhidas.findIndex((g) => g.nome === b.nome));
  } finally {
    process.removeListener('SIGINT', aoInterromper);
    process.removeListener('SIGTERM', aoInterromper);
    await servidorDoNavegador?.close().catch(() => {});
    await vite?.close().catch(() => {});
    restaurarSessao();
  }

  const falhas = resultados.filter((r) => r.codigo !== 0);
  const somado = resultados.reduce((s, r) => s + r.duracao, 0);
  const decorrido = Date.now() - inicioDaRodada;
  escrever(`\n${'─'.repeat(52)}\n`);
  for (const r of resultados) escrever(`${r.codigo === 0 ? '✓' : '✗'} ${r.nome.padEnd(22)} ${segundos(r.duracao).padStart(7)}\n`);
  escrever(`${'─'.repeat(52)}\nbancada:guardas — ${resultados.length - falhas.length}/${resultados.length} guardas verdes em ${segundos(decorrido)} (${segundos(somado)} somadas, ${faixas} de cada vez)`
    + `${falhas.length ? ` — falharam: ${falhas.map((r) => r.nome).join(', ')}` : ''}\n`);
  return { resultados, falhas };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pedido = process.argv.find((a) => a.startsWith('--so='));
  const faixasPedidas = process.argv.find((a) => a.startsWith('--faixas='));
  if (faixasPedidas && !(Number.isInteger(Number(faixasPedidas.slice(9))) && Number(faixasPedidas.slice(9)) >= 1)) {
    console.error(`bancada:guardas — '${faixasPedidas}' não é um número inteiro de faixas.`);
    process.exit(2);
  }
  try {
    const { falhas } = await rodarGuardas({
      selecionadas: pedido ? pedido.slice('--so='.length).split(',').filter(Boolean) : null,
      ...(faixasPedidas ? { faixas: Number(faixasPedidas.slice('--faixas='.length)) } : {}),
    });
    process.exitCode = falhas.length ? 1 : 0;
  } catch (erro) {
    console.error(`bancada:guardas — ${erro.message}`);
    process.exitCode = 2;
  }
}
