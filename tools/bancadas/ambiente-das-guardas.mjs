/* ambiente-das-guardas.mjs — o servidor do Vite e o Chromium que as guardas da bancada podem dividir.
 *
 * Medido em 2026-10-28: as dez guardas que abrem a bancada (`porteiro`, `bancada:vazia:check` e as oito `guarda:*` de navegador)
 * subiam cada uma o próprio Chromium e, cinco delas, o próprio servidor do Vite, e somavam uns 250 s. O cache de
 * pré-empacotamento do Vite é um só em `node_modules/.vite`, e dois servidores subindo juntos reescreviam o cache um do outro.
 * O gate `bancada:guardas` (tools/mecanifica/guardas/rodar-guardas.mjs) sobe um servidor e um navegador uma vez e roda as
 * guardas em sequência, cada uma no próprio processo e na própria página; ele avisa o ambiente pelas duas variáveis abaixo.
 *
 * Sem as variáveis (a guarda rodada sozinha, por `npm run guarda:camera`, por exemplo) tudo continua como antes: cada guarda sobe
 * o que usa e fecha no fim. É por isso que o código de cada guarda não sabe se está sozinha ou dentro do gate. */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VARIAVEL_DO_VITE = 'MODELAR_GUARDAS_VITE_PORTA';
export const VARIAVEL_DO_NAVEGADOR = 'MODELAR_GUARDAS_NAVEGADOR_WS';

/* Os argumentos de sempre das guardas que desenham a cena: WebGL por software, para o resultado não depender da placa de vídeo. */
export const ARGS_DO_NAVEGADOR = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'];

/* `{ port, close }`: o servidor do gate, quando há um (`close` não faz nada, porque quem o subiu é quem o fecha), ou um próprio. */
export async function subirVite(repo, { importar = (nome) => import(nome) } = {}) {
  const compartilhada = process.env[VARIAVEL_DO_VITE];
  if (compartilhada) return { port: Number(compartilhada), close: async () => {} };
  const vite = await (await importar('vite')).createServer({
    root: repo,
    configFile: join(repo, 'vite.config.js'),
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'error',
  });
  await vite.listen();
  return { port: vite.httpServer.address().port, close: () => vite.close() };
}

/* O Playwright instalado no repositório, ou `null` quando não está (quem chama diz o que fazer). */
export async function carregarPlaywright(repo) {
  const caminho = join(repo, 'node_modules/playwright/index.js');
  try { return (await import(pathToFileURL(caminho).href)).default; } catch { return null; }
}

/* O navegador do gate (conectado pelo endereço dele; `close()` só desconecta) ou um próprio, aberto com `opcoes`. */
export async function abrirNavegador(playwright, opcoes = {}) {
  const compartilhado = process.env[VARIAVEL_DO_NAVEGADOR];
  if (compartilhado) return playwright.chromium.connect(compartilhado);
  return playwright.chromium.launch(opcoes);
}
