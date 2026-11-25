/* conferir-pedido.mjs — CLI que lê um pedido da mecatrônica, exporta a ficha do objeto a que ele responde e escreve a resposta de
   cada item medindo a forma de agora (espaço, posição, saída de ar, ligações; a passagem volta não cumprida, sem chicote modelado).
   O pedido recusado (esquema, versão, peça ou porta que a ficha não tem, revisão de outra ficha) não ganha resposta.
   Uso: npm run conferir:pedido -- <pedido.json> [--objeto=<objeto>] [--escrever] [--saida=<arquivo>] */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { responderPedido } from '../../modulos/ficha-do-objeto/src/pedido.js';
import { exportarFicha, malhasNaMontagem } from './exportar-ficha.mjs';
import { REPO } from './exportar-gltf.mjs';

const USO = 'Uso: npm run conferir:pedido -- <pedido.json> [--objeto=<objeto>] [--escrever] [--saida=<arquivo>]\n'
  + '  <pedido.json>       o pedido da mecatrônica (esquema da ponte)\n'
  + '  --objeto=<objeto>   o objeto montado a exportar (padrão: o campo objeto do pedido)\n'
  + '  --escrever          grava a resposta de cada item no próprio pedido\n'
  + '  --saida=<arquivo>   grava o pedido respondido em outro arquivo\n';

export function parseArgs(args = process.argv.slice(2)) {
  const opcoes = { pedido: null, objeto: null, escrever: false, saida: null, ajuda: false };
  for (const arg of args) {
    const [nome, valor] = arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    if (nome === '--ajuda' || nome === '--help') opcoes.ajuda = true;
    else if (nome === '--escrever') opcoes.escrever = true;
    else if (nome === '--objeto' || nome === '--saida') {
      if (!valor) throw new Error(`${nome} pede um valor com =.\n${USO}`);
      opcoes[nome.slice(2)] = valor;
    } else if (arg.startsWith('--')) throw new Error(`opção desconhecida '${arg}'.\n${USO}`);
    else if (!opcoes.pedido) opcoes.pedido = arg;
    else throw new Error(`argumento a mais '${arg}'.\n${USO}`);
  }
  return opcoes;
}

const absoluto = (p) => (isAbsolute(p) ? resolve(p) : resolve(process.cwd(), p));

/** Responde o pedido do arquivo. Devolve o resultado de `responderPedido`, com `destino` quando gravou. */
export async function conferirPedido({ pedido: arquivo, objeto = null, escrever = false, saida = null, pastaDaFicha = null }) {
  if (!arquivo) throw new Error(`Informe o pedido.\n${USO}`);
  const caminho = absoluto(arquivo);
  const pedido = JSON.parse(readFileSync(caminho, 'utf8'));
  const { ficha, separadas, placas, declaracao } = await exportarFicha({ objeto: objeto ?? pedido.objeto, ...(pastaDaFicha ? { saida: pastaDaFicha } : {}) });
  const r = responderPedido({ pedido, ficha, malhas: malhasNaMontagem(separadas), placas, componentes: declaracao.componentesDoPedido ?? {} });
  if (r.recusa) return r;
  const destino = saida ? absoluto(saida) : escrever ? caminho : null;
  if (destino) {
    writeFileSync(`${destino}.tmp`, `${JSON.stringify(r.pedido, null, 2)}\n`);
    renameSync(`${destino}.tmp`, destino);
  }
  return { ...r, destino };
}

async function main() {
  try {
    const opcoes = parseArgs();
    if (opcoes.ajuda || !opcoes.pedido) { process.stdout.write(USO); process.exit(opcoes.ajuda ? 0 : 1); }
    const r = await conferirPedido(opcoes);
    if (r.recusa) { process.stderr.write(`Pedido recusado, sem resposta:\n${r.recusa}\n`); process.exit(1); }
    for (const i of r.itens) process.stdout.write(`${i.estado === 'cumprido' ? 'cumprido    ' : 'não cumprido'}  ${i.tipo.padEnd(9)} ${i.id}${i.motivo ? `: ${i.motivo}` : ''}\n`);
    if (r.destino) process.stdout.write(`Resposta gravada em ${relative(REPO, r.destino)}.\n`);
  } catch (err) {
    process.stderr.write(`Erro: ${err.message}\n`);
    process.exit(1);
  }
}

const executadoDireto = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (executadoDireto) main();
