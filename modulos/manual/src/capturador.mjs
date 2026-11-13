/* capturador.mjs — a captura de vistas de várias montagens com UM servidor e UM navegador.
   `capturarMontagem` abre e fecha o servidor e o Chromium a cada chamada; aqui o servidor e o navegador sobem uma
   vez e a função de captura os entrega a cada chamada pela injeção de dependências que `capturarMontagem` já tem, com o
   fechamento adiado para o fim. Nada em `tools/` muda. */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { capturarMontagem } from '../../../tools/modelar/capturar-montagem.mjs';
import { lancarChromium } from '../../../tools/modelar/navegador.mjs';
import { REPO } from '../../../tools/modelar/resolver-caminho-receita.mjs';

export async function abrirCapturador() {
  const vite = await (await import('vite')).createServer({
    root: REPO, configFile: join(REPO, 'vite.config.js'), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error',
  });
  await vite.listen();
  const playwright = (await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href)).default;
  const navegador = await lancarChromium(playwright.chromium);
  const servidorEmprestado = { listen: async () => {}, close: async () => {}, httpServer: vite.httpServer };
  const navegadorEmprestado = new Proxy(navegador, {
    get: (alvo, nome) => (nome === 'close' ? async () => {} : Reflect.get(alvo, nome)?.bind?.(alvo) ?? Reflect.get(alvo, nome)),
  });
  const dependencias = {
    criarServidor: async () => servidorEmprestado,
    carregarPlaywright: async () => ({ chromium: { launch: async () => navegadorEmprestado } }),
  };
  return {
    capturar: (opcoes) => capturarMontagem({ ...opcoes, dependencias }),
    fechar: async () => {
      try { await navegador.close(); } catch { /* melhor esforço */ }
      try { await vite.close(); } catch { /* melhor esforço */ }
    },
  };
}
