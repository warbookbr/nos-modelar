#!/usr/bin/env node
/* tracar-placa.mjs — traça o cobre de uma placa declarada pela lista de redes do pedido e grava o traçado salvo.
 *
 *   node tools/modelar/tracar-placa.mjs --placa=<módulo>#<export> --pedido=<arquivo.json> --saida=<traçado.json> [--base=<traçado.json>] [--passo=<mm>]
 *
 * Lê a declaração da placa (objeto ou função sem argumento), a lista do item `ligacoes` do pedido e, com `--base`, um traçado
 * declarado cujos trechos ficam como estão. Grava o traçado com a chave das entradas, que a placa confere, e imprime o relatório:
 * as redes traçadas, as não traçadas com o terminal que faltou, e a conferência do conferidor. Sai com código 1 se alguma rede
 * não fechou ou se o conferidor acha violação. A mesma entrada grava o mesmo arquivo, byte a byte. */
import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { placaDeclarada, PLACA } from '../../procedural/familias/componente-eletronico/placa.js';
import { tracar } from '../../procedural/familias/componente-eletronico/cobre/tracador.js';
import { pecasDoTracado } from '../../procedural/familias/componente-eletronico/cobre/geometria.js';
import { conferirCobre } from '../../procedural/familias/componente-eletronico/cobre/conferir.js';
import { chaveDasEntradas } from '../../procedural/familias/componente-eletronico/cobre/chave.js';

export const AJUDA = `node tools/modelar/tracar-placa.mjs --placa=<módulo>#<export> --pedido=<arquivo.json> --saida=<traçado.json> [--base=<traçado.json>] [--passo=<mm>]
Traça o cobre da placa pela lista de redes do pedido, grava o traçado salvo e imprime o relatório.

  --placa=<módulo>#<export>  o módulo e o nome da declaração da placa (objeto ou função sem argumento)
  --pedido=<arquivo.json>    a cópia do pedido, com o item ligacoes
  --saida=<traçado.json>     onde gravar o traçado
  --base=<traçado.json>      trechos declarados que ficam como estão
  --passo=<mm>               o passo da grade (padrão 0,25)`;

export async function carregarDeclaracao(placa) {
  const [arquivo, nome] = placa.split('#');
  const modulo = await import(pathToFileURL(isAbsolute(arquivo) ? arquivo : resolve(process.cwd(), arquivo)).href);
  const exportada = modulo[nome ?? 'default'];
  const declaracao = typeof exportada === 'function' ? exportada() : exportada;
  if (!declaracao) throw new Error(`tracar-placa: o módulo ${arquivo} não exporta ${nome ?? 'default'}`);
  return declaracao;
}

export async function tracarPlaca({ placa, pedido, base = null, passo = 0.25 }) {
  const declaracao = await carregarDeclaracao(placa);
  const item = JSON.parse(readFileSync(pedido, 'utf8')).itens.find((i) => i.tipo === 'ligacoes');
  if (!item) throw new Error(`tracar-placa: o pedido ${pedido} não tem item ligacoes`);
  const { cobre: _, ...semCobre } = declaracao;
  const g = placaDeclarada(semCobre);
  const contorno = g.pecas[0].contorno;
  const { tracado, naoTracadas } = tracar({
    placa: semCobre.id ?? 'placa', contorno, ilhas: g.ilhas, furosDeFixacao: g.furos.filter((f) => f.terminal === null).map((f) => f.poligono),
    lista: item.redes, regras: PLACA, base: base ? JSON.parse(readFileSync(base, 'utf8')) : null, passo,
  });
  const comChave = { versao: tracado.versao, placa: tracado.placa, chave: chaveDasEntradas(semCobre, item.redes, PLACA), passo, redes: tracado.redes };
  const atravessam = new Set(g.furos.filter((f) => f.terminal).map((f) => `${f.peca}.${f.terminal}`));
  const conferencia = conferirCobre({ contorno, ilhas: g.ilhas.map((i) => ({ ...i, atravessa: atravessam.has(`${i.peca}.${i.terminal}`) })), pecas: pecasDoTracado(comChave), lista: item.redes, regras: PLACA });
  return { tracado: comChave, relatorio: { tracadas: item.redes.length - naoTracadas.length, naoTracadas, conferencia } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv.includes('--ajuda')) { console.log(AJUDA); process.exit(0); }
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  for (const n of ['placa', 'pedido', 'saida']) if (!arg(n)) { console.error(`tracar-placa: falta --${n}=; veja --ajuda`); process.exit(2); }
  const { tracado, relatorio } = await tracarPlaca({ placa: arg('placa'), pedido: arg('pedido'), base: arg('base') ?? null, passo: arg('passo') ? Number(arg('passo')) : 0.25 });
  writeFileSync(arg('saida'), `${JSON.stringify(tracado, null, 2)}\n`);
  console.log(JSON.stringify(relatorio, null, 2));
  process.exit(relatorio.naoTracadas.length || relatorio.conferencia.violacoes.length ? 1 : 0);
}
