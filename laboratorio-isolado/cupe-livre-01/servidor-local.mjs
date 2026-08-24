/* Servidor de inspeção local, sem dependências. Publica somente esta pasta. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('.', import.meta.url)));
const porta = Number(process.argv[2] ?? 8765);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

createServer(async (pedido, resposta) => {
  const url = new URL(pedido.url ?? '/', 'http://127.0.0.1');
  const relativo = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
  const arquivo = resolve(raiz, relativo);
  if (arquivo !== raiz && !arquivo.startsWith(`${raiz}${sep}`)) {
    resposta.writeHead(403).end('fora da raiz isolada'); return;
  }
  try {
    const conteudo = await readFile(arquivo);
    resposta.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    resposta.end(conteudo);
  } catch {
    resposta.writeHead(404).end('não encontrado');
  }
}).listen(porta, '127.0.0.1', () => {
  console.log(`cupe-livre-01: http://127.0.0.1:${porta}`);
});
