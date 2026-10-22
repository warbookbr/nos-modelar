/* testes-lentos.mjs — a lista dos arquivos de teste que saem da bateria padrão, e o comando que roda cada uma das duas.
 *
 * Medido em 2026-10-16 (plano gates em poucos minutos, fatia 1): a suíte inteira levava 18 minutos sozinha no contêiner de 4
 * processadores, e os 59 arquivos acima de 5 s somavam 92% do tempo, um deles com 309 s. Eles vieram para cá, com os testes do
 * servidor MCP e os que abrem a bancada, que disputam o servidor de desenvolvimento e o cache do Vite com os gates de MCP.
 *
 * `npm run test:rapidos` roda todo o resto, sempre. `npm run test:lentos` roda só os desta lista que importam, direta ou
 * indiretamente, um arquivo mudado desde o ramo remoto (`vitest --changed`), e roda todos com `--completo` no `npm run gates`
 * (variável GATES_COMPLETO=1), no CI (variável CI) e quando não dá para saber o ramo remoto. Assim nenhum teste deixa de rodar
 * antes de chegar à main. `npm test` continua rodando a suíte inteira de uma vez. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TESTES_LENTOS = [
  'modulos/desenho-por-restricoes/tests/familia.test.js',
  'modulos/esboco/tests/brief-do-critico.test.js',
  'modulos/esboco/tests/camada-sem-perfil.test.js',
  'modulos/esboco/tests/condutor.test.js',
  'modulos/esboco/tests/conserto.test.js',
  'modulos/esboco/tests/contato.test.js',
  'modulos/esboco/tests/critico.test.js',
  'modulos/esboco/tests/curso-na-linha-de-comando.test.js',
  'modulos/esboco/tests/curvas.test.js',
  'modulos/esboco/tests/desempenho.test.js',
  'modulos/esboco/tests/edicao.test.js',
  'modulos/esboco/tests/esboco.test.js',
  'modulos/esboco/tests/incremental.test.js',
  'modulos/esboco/tests/integracao-do-detalhe.test.js',
  'modulos/esboco/tests/leitura.test.js',
  'modulos/esboco/tests/malha.test.js',
  'modulos/esboco/tests/marco-e-medidas.test.js',
  'modulos/esboco/tests/parametros.test.js',
  'modulos/esboco/tests/perguntas-do-critico.test.js',
  'modulos/esboco/tests/portas.test.js',
  'modulos/esboco/tests/profundidade-por-pixel.test.js',
  'modulos/esboco/tests/projecao.test.js',
  'modulos/esboco/tests/unidades.test.js',
  'modulos/esboco/tests/vizinhos.test.js',
  'modulos/esboco/tests/zoom-forma.test.js',
  'modulos/exportador-cad/tests/exportador-cad.test.js',
  'modulos/textura/tests/metal-tecido.test.js',
  'procedural/familias/cilindro-hidraulico/cilindro-hidraulico.test.js',
  'procedural/familias/dobradica/dobradica.test.mjs',
  'procedural/familias/movel-de-caixa/movel-de-caixa.test.mjs',
  'procedural/familias/roda-pneu/roda-pneu.test.js',
  'procedural/familias/superficie-aerodinamica/superficie-aerodinamica.test.js',
  'procedural/nucleo/friso-contato.test.mjs',
  'procedural/nucleo/operacoes/arredondar-costura-convexa.test.ts',
  'procedural/nucleo/operacoes/booleana-casca-raspada.test.ts',
  'tools/mcp/catalogo-montagens.test.mjs',
  'tools/mcp/ensaio-ponta-a-ponta.test.mjs',
  'tools/mcp/mcp.test.mjs',
  'tools/mcp/perfis/parametros.test.mjs',
  'tools/mcp/procedural.test.mjs',
  'tools/mcp/universo-dependencias.test.mjs',
  'tools/mecanifica/acervo-real.test.mjs',
  'tools/mecanifica/calibracao-do-critico.test.mjs',
  'tools/mecanifica/capturar-montagem.test.ts',
  'tools/mecanifica/cilindro-hidraulico-aprovacao.test.mjs',
  'tools/mecanifica/desenho.test.mjs',
  'tools/mecanifica/esboco-blocagem-casos.test.mjs',
  'tools/mecanifica/esboco-blocagem.test.mjs',
  'tools/mecanifica/esboco-composta.test.mjs',
  'tools/mecanifica/esboco-condutor-nivel-zero.test.mjs',
  'tools/mecanifica/esboco-familias.test.mjs',
  'tools/mecanifica/esboco-importar-step.test.mjs',
  'tools/mecanifica/esboco-importar-stl.test.mjs',
  'tools/mecanifica/familia.test.mjs',
  'tools/mecanifica/forma-do-esboco.test.mjs',
  'tools/mecanifica/forma-global-n2-g01-primitivas.test.mjs',
  'tools/mecanifica/guardas/guarda-acervo.test.mjs',
  'tools/mecanifica/mcp-degrau-1-preparacao.test.mjs',
  'tools/mecanifica/olhar-bancada.test.mjs',
  'tools/mecanifica/parametros-peca.test.mjs',
  'tools/mecanifica/receita-planejada.test.mjs',
  'tools/mecanifica/rodada-de-modelagem.test.mjs',
  'tools/mecanifica/vinco-na-imagem.test.mjs',
  'tools/oficina/ensaio-ponta-a-ponta-dobradica.test.mjs',
  'tools/oficina/oficina.test.ts',
  'tools/oficina/plataforma-procedural-campo-r10.test.mjs',
  'tools/oficina/sonda-supercarro-1-0.test.mjs',
];

/* O ORÇAMENTO DE TEMPO DOS RÁPIDOS.
 *
 * Um arquivo da bateria rápida que passa de TETO_DO_RAPIDO_MS reprova o `test:rapidos`, com o nome dele: ou ele vai para a lista
 * acima, ou fica mais leve. O teto é largo porque a duração depende da carga da máquina: medido em 2026-10-16, o mais lento dos
 * rápidos levava 4,9 s sozinho e 18 s dentro do `npm run gates`, com outros três gates rodando ao lado. Um teste novo de 8 s
 * sozinho já passa dele na bateria, que foi como o teste do importador de STEP, de 18 a 50 s, entrou sem ninguém notar. */
export const TETO_DO_RAPIDO_MS = 30_000;

export function acimaDoTeto(duracoes, teto = TETO_DO_RAPIDO_MS) {
  return duracoes.filter(({ arquivo, ms }) => ms > teto && !TESTES_LENTOS.includes(arquivo));
}

function ramoRemoto() {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', '@{u}'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function argumentosDoVitest(modo, { ambiente = process.env, remoto = ramoRemoto } = {}) {
  if (modo === 'rapidos') return { args: ['run'], motivo: 'todos os testes fora da lista dos lentos' };
  if (ambiente.CI || ambiente.GATES_COMPLETO === '1') return { args: ['run'], motivo: 'todos os lentos (CI ou --completo)' };
  const base = remoto();
  if (!base) return { args: ['run'], motivo: 'todos os lentos (não deu para saber o ramo remoto)' };
  return { args: ['run', '--changed', base, '--passWithNoTests'], motivo: `os lentos ligados ao que mudou desde ${base}` };
}

function rodar(modo) {
  const { args, motivo } = argumentosDoVitest(modo);
  console.log(`test:${modo} — ${motivo}.`);
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
  const inicio = Date.now();
  const r = spawnSync('npx', ['vitest', ...args], { cwd: raiz, stdio: 'inherit', shell: true, env: { ...process.env, MECANIFICA_TESTES: modo } });
  process.exitCode = r.status ?? 1;
  const caminho = join(raiz, 'tmp', 'gates', `duracoes-dos-testes-${modo}.json`);
  if (modo !== 'rapidos' || !existsSync(caminho)) return;
  const { gravado, duracoes } = JSON.parse(readFileSync(caminho, 'utf8'));
  if (Date.parse(gravado) < inicio) return;
  const lentos = acimaDoTeto(duracoes);
  if (!lentos.length) return;
  console.error(`test:rapidos — ${lentos.length} arquivo(s) passaram do teto de ${TETO_DO_RAPIDO_MS / 1000} s da bateria rápida:`);
  for (const { arquivo, ms } of lentos) console.error(`  ${Math.round(ms / 100) / 10} s  ${arquivo}`);
  console.error('Ponha cada um em TESTES_LENTOS, em tools/testes-lentos.mjs, ou deixe-o mais leve.');
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modo = process.argv.includes('--lentos') ? 'lentos' : process.argv.includes('--rapidos') ? 'rapidos' : null;
  if (!modo) { console.error('uso: node tools/testes-lentos.mjs --rapidos | --lentos'); process.exit(2); }
  rodar(modo);
}
