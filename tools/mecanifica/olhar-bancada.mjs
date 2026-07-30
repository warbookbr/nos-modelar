#!/usr/bin/env node
/**
 * olhar-bancada.mjs — o OLHO DA BANCADA: dirige `bancada.html` headless pela URL
 * e salva PNG por vista, para que uma sessão sem navegador possa inspecionar o
 * que está modelando.
 *
 * Dirige sempre pela URL (nunca pela API interna): assim cada foto vem com o
 * endereço reproduzível que outra pessoa ou agente abre para ver o mesmo estado.
 *
 *   npm run bancada                                       # peça padrão, 3 vistas
 *   npm run bancada -- freio-disco --vistas=direita,frontal
 *   npm run bancada -- freio-disco --selecionadas=disco,pinca --modo=contexto
 *   npm run bancada -- freio-disco --explosao=0.4 --projecao=ortografica
 *   npm run bancada -- freio-disco --selecionadas=pastilhaInterna --focar
 *   npm run bancada -- --listar                           # peças disponíveis
 *
 * Saída: tools/bancadas/out/bancada-<peça>-<vista>[-<estado>].png — e o passo
 * seguinte é sempre LER os PNGs (screenshot que ninguém olha é ruído).
 *
 * Sai ≠0 quando a bancada não sobe, quando um nome de parte pedido não existe
 * na peça, ou com `--estrito` quando a peça tem face sem identidade semântica.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');

const VISTAS = ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];
const MODOS = ['todas', 'contexto', 'isolar'];
const PROJECOES = ['perspectiva', 'ortografica'];

const args = process.argv.slice(2);
function opcao(nome, padrao = null) {
  const achado = args.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
}
const bandeira = (nome) => args.includes(`--${nome}`);

const peca = args.find((a) => !a.startsWith('--')) ?? null;
const vistas = opcao('vistas', 'isometrica,frontal,direita').split(',').map((v) => v.trim()).filter(Boolean);
const selecionadas = opcao('selecionadas', '').split(',').map((s) => s.trim()).filter(Boolean);
const modo = opcao('modo', 'todas');
const projecao = opcao('projecao', 'perspectiva');
const explosao = Number(opcao('explosao', '0'));
const largura = Math.max(640, parseInt(opcao('res', '1280'), 10) || 1280);
const altura = Math.round(largura * 9 / 16);
const espera = parseInt(opcao('espera', '1200'), 10) || 1200;
const estrito = bandeira('estrito');
const focar = bandeira('focar');

function erroDeUso(mensagem) {
  console.error(`olhar-bancada: ${mensagem}`);
  process.exit(2);
}
for (const vista of vistas) {
  if (!VISTAS.includes(vista)) erroDeUso(`vista '${vista}' não existe. Use: ${VISTAS.join(', ')}`);
}
if (!MODOS.includes(modo)) erroDeUso(`modo '${modo}' não existe. Use: ${MODOS.join(', ')}`);
if (!PROJECOES.includes(projecao)) erroDeUso(`projeção '${projecao}' não existe. Use: ${PROJECOES.join(', ')}`);
if (!Number.isFinite(explosao) || explosao < 0 || explosao > 1) erroDeUso('explosao precisa estar entre 0 e 1');

const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) erroDeUso('Playwright não encontrado. Rode: npm ci');

const { createServer } = await import('vite');
const vite = await createServer({
  root: REPO,
  configFile: join(REPO, 'vite.config.js'),
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
await vite.listen();
const { port } = vite.httpServer.address();
const base = `http://127.0.0.1:${port}/nos-mecanifica/bancada.html`;

const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await pw.chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: largura, height: altura } });
const errosDaPagina = [];
page.on('pageerror', (e) => errosDaPagina.push(e.message));

function urlDa(vista) {
  const params = new URLSearchParams();
  if (peca) params.set('peca', peca);
  if (selecionadas.length) params.set('selecionadas', [...selecionadas].sort().join(','));
  if (vista !== 'isometrica') params.set('vista', vista);
  if (projecao === 'ortografica') params.set('projecao', 'ortografica');
  if (modo !== 'todas') params.set('modo', modo);
  if (explosao > 0) params.set('explosao', explosao.toFixed(2));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/* sufixo do arquivo: o estado não-padrão entra no nome, para que duas rodadas
   com estados diferentes não sobrescrevam a mesma foto */
const partesDoSufixo = [
  selecionadas.length ? `sel-${[...selecionadas].sort().join('+')}` : null,
  modo !== 'todas' ? modo : null,
  projecao === 'ortografica' ? 'orto' : null,
  explosao > 0 ? `exp${Math.round(explosao * 100)}` : null,
  focar ? 'focado' : null,
].filter(Boolean);
const sufixo = partesDoSufixo.length ? `-${partesDoSufixo.join('-')}` : '';

mkdirSync(OUT, { recursive: true });
let falhou = false;

try {
  for (const [indice, vista] of vistas.entries()) {
    const url = urlDa(vista);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(
      () => typeof window.__mecanificaBancada === 'object' && window.__mecanificaBancada !== null,
      { timeout: 20000 },
    );
    const relato = await page.evaluate(() => {
      const b = window.__mecanificaBancada;
      return {
        ready: b.ready,
        erro: b.erro ?? null,
        peca: b.peca ?? null,
        partes: b.partes ?? [],
        selecaoIgnorada: b.selecaoIgnorada ?? [],
        diagnosticos: b.diagnosticos ?? null,
        estatisticas: b.estatisticas ?? null,
        estado: b.estado ? b.estado() : null,
      };
    });

    if (!relato.ready) {
      console.error(`\nBANCADA NÃO SUBIU\n  ${relato.erro}\n  ${url}`);
      falhou = true;
      break;
    }

    if (indice === 0) {
      if (bandeira('listar')) {
        const disponiveis = await page.evaluate(() => window.__mecanificaBancada.pecasDisponiveis);
        console.log(`peças disponíveis (${disponiveis.length}):\n  ${disponiveis.join('\n  ')}`);
        break;
      }
      const semParte = relato.diagnosticos?.facesSemParte?.length ?? 0;
      console.log(`peça: ${relato.peca}`);
      console.log(`partes (${relato.partes.length}): ${relato.partes.join(', ')}`);
      console.log(
        `malha: ${relato.estatisticas.facesNeutras} faces, `
        + `${relato.estatisticas.triangulos} triângulos, `
        + `${semParte} sem identidade`,
      );
      if (relato.selecaoIgnorada.length) {
        console.error(
          `\nNOME DE PARTE INEXISTENTE: ${relato.selecaoIgnorada.join(', ')}`
          + `\n  a peça expõe: ${relato.partes.join(', ')}`,
        );
        falhou = true;
        break;
      }
      if (semParte && estrito) {
        console.error(`\n${semParte} face(s) sem identidade semântica (--estrito)`);
        falhou = true;
        break;
      }
      if (focar) {
        console.log(
          'atenção: --focar aproxima a seleção, mas o enquadramento AINDA NÃO entra na URL.'
          + '\n         quem abrir o endereço abaixo verá a peça inteira, não este recorte.',
        );
      }
      console.log('');
    }

    if (focar) {
      if (!selecionadas.length) erroDeUso('--focar exige --selecionadas');
      await page.evaluate(() => window.__mecanificaBancada.focar());
    }

    await page.waitForTimeout(espera);
    const arquivo = join(OUT, `bancada-${relato.peca}-${vista}${sufixo}.png`);
    await page.screenshot({ path: arquivo });
    console.log(`${vista.padEnd(11)} ${arquivo}\n            ${url}`);
  }
} finally {
  await browser.close();
  await vite.close();
}

if (errosDaPagina.length) {
  console.error(`\nerros de página:\n  ${errosDaPagina.join('\n  ')}`);
  falhou = true;
}
process.exit(falhou ? 1 : 0);
