#!/usr/bin/env node
/* olhar-montagem.mjs — captura vistas confinadas de uma montagem persistida. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { lerArgumentos } from './argumentos.mjs';
import { verificarCaminhoConfinado } from './caminho-confinado.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = lerArgumentos(process.argv.slice(2), { opcoes: ['arquivo', 'raiz-montagens', 'raiz-pecas', 'saida', 'vistas', 'caminho'], bandeiras: [] });
const exigir = (nome) => { const valor = args.opcao(nome); if (!valor) throw new Error(`--${nome} é obrigatório.`); return valor; };
const raizMontagens = resolve(exigir('raiz-montagens'));
const raizPecas = resolve(exigir('raiz-pecas'));
const arquivo = resolve(exigir('arquivo'));
const saida = resolve(exigir('saida'));
for (const [caminho, raiz] of [[arquivo, raizMontagens], [saida, repo]]) verificarCaminhoConfinado(caminho, { raiz });
if (relative(repo, saida).startsWith('..')) throw new Error('--saida precisa ficar dentro do repositório.');
const ler = (caminho, raiz) => { verificarCaminhoConfinado(caminho, { raiz }); return JSON.parse(readFileSync(caminho, 'utf8')); };
const resolvida = await resolverMontagemPersistida(ler(arquivo, raizMontagens), {
  carregarMontagem: async (ref) => ler(resolve(raizMontagens, `${ref}.json`), raizMontagens),
  carregarPeca: async (ref) => ler(resolve(raizPecas, `${ref}.json`), raizPecas),
});
const foco = args.opcao('caminho')?.split('/').filter(Boolean) ?? [];
const prefixo = (a, b) => a.length <= b.length && a.every((segmento, indice) => segmento === b[indice]);
let encontrados = 0;
const serializar = (montagem) => ({
  id: montagem.id,
  instancias: montagem.instancias.filter((i) => foco.length === 0 || prefixo(foco, i.caminho) || prefixo(i.caminho, foco)).map((i) => {
    if (i.alvo.tipo === 'montagem') {
      return { id: i.id, caminho: i.caminho, alvo: i.alvo, poseMundo: i.poseMundo, montagem: serializar(i.montagem) };
    }
    encontrados += 1;
    return {
      id: i.id, caminho: i.caminho, alvo: i.alvo, poseMundo: i.poseMundo,
      definicao: { neutro: {
        ...i.definicao.neutro, V: [...i.definicao.neutro.V], F: [...i.definicao.neutro.F], portas: [...i.definicao.neutro.portas],
      } },
    };
  }),
});
const dadosVisuais = serializar(resolvida);
if (foco.length > 0 && encontrados === 0) throw new Error(`--caminho '${foco.join('/')}' não encontrou peça.`);
const vistas = (args.opcao('vistas') ?? 'isometrica,direita').split(',').filter(Boolean);
mkdirSync(saida, { recursive: true });
const vite = await (await import('vite')).createServer({ root: repo, configFile: join(repo, 'vite.config.js'), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await vite.listen();
const pw = (await import(pathToFileURL(join(repo, 'node_modules/playwright/index.js')).href)).default;
const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errosDaPagina = [];
  const consoleDaPagina = [];
  page.on('pageerror', (erro) => errosDaPagina.push(erro.message));
  page.on('console', (mensagem) => consoleDaPagina.push(`${mensagem.type()}: ${mensagem.text()}`));
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/nos-mecanifica/tools/mecanifica/visor-montagem.html`);
  try {
    await page.waitForFunction(() => typeof window.__mecanificaVisorMontagem === 'function');
  } catch (erro) {
    throw new Error(`visor de montagem não iniciou: ${[...errosDaPagina, ...consoleDaPagina].join(' | ') || erro.message}`);
  }
  const metadados = [];
  for (const vista of vistas) {
    const meta = await page.evaluate(([dados, nome]) => window.__mecanificaVisorMontagem(dados, nome), [dadosVisuais, vista]);
    const destino = join(saida, `montagem-${resolvida.id}-${vista}.png`);
    if (existsSync(destino)) throw new Error(`recusa sobrescrever '${destino}'.`);
    await page.screenshot({ path: destino });
    metadados.push({ ...meta, arquivo: relative(repo, destino) });
  }
  writeFileSync(join(saida, `montagem-${resolvida.id}.json`), `${JSON.stringify({ formato: 'mecanifica.vistas-montagem', versao: 1, metadados }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ metadados }, null, 2)}\n`);
} finally { await browser.close(); await vite.close(); }
