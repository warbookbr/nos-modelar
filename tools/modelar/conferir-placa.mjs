#!/usr/bin/env node
/* conferir-placa.mjs — confere o cobre traçado de uma placa declarada e desenha o mapa das redes.
 *
 *   node tools/modelar/conferir-placa.mjs --placa=<módulo>#<export> --tracado=<arquivo.json> --pedido=<arquivo.json> [--mapa=<pasta>] [--so-tracadas]
 *
 * `--placa` é o módulo que exporta a declaração da placa (o objeto { id, contorno, pecas, ... } ou uma função sem argumento que
 * o devolve), `--tracado` o traçado salvo e `--pedido` a cópia do pedido com o item `ligacoes`. Imprime o relatório em JSON
 * (as violações, as redes e os mínimos medidos) e sai com código 1 se há violação. Com `--mapa`, grava em SVG o mapa de cada
 * face (`mapa-cima.svg` e `mapa-baixo.svg`, a de baixo vista de baixo): o contorno, as ilhas e o cobre de cada rede numa cor,
 * os terminais rotulados e as violações marcadas em vermelho. `--so-tracadas` confere só as redes que o traçado tem. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { placaDeclarada, PLACA } from '../../procedural/familias/componente-eletronico/placa.js';
import { pecasDoTracado } from '../../procedural/familias/componente-eletronico/cobre/geometria.js';
import { conferirCobre } from '../../procedural/familias/componente-eletronico/cobre/conferir.js';

export const AJUDA = `node tools/modelar/conferir-placa.mjs --placa=<módulo>#<export> --tracado=<arquivo.json> --pedido=<arquivo.json> [--mapa=<pasta>] [--so-tracadas]
Confere o cobre traçado de uma placa declarada pelas regras e pela conectividade e imprime o relatório em JSON.

  --placa=<módulo>#<export>  o módulo e o nome da declaração da placa (objeto ou função sem argumento)
  --tracado=<arquivo.json>   o traçado salvo
  --pedido=<arquivo.json>    a cópia do pedido, com o item ligacoes
  --mapa=<pasta>             grava mapa-cima.svg e mapa-baixo.svg nessa pasta
  --so-tracadas              confere só as redes que o traçado tem`;

/* uma cor por rede, na ordem da lista: matizes espaçados pela razão áurea, de saturação e luz fixas */
const corDaRede = (k) => `hsl(${Math.round((k * 137.508) % 360)}, 70%, 45%)`;

/** O mapa de uma face em SVG: 10 px por mm, a de baixo espelhada em x para ser vista de baixo. */
export function mapaDaFace({ face, contorno, ilhas, pecas, lista, violacoes }) {
  const xs = contorno.map((p) => p[0]); const zs = contorno.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs) - 2, Math.max(...xs) + 2, Math.min(...zs) - 2, Math.max(...zs) + 2];
  const E = 10;
  const px = ([x, z]) => [((face === 'baixo' ? x1 - (x - x0) : x) - x0) * E, (z - z0) * E].map((v) => Math.round(v * 100) / 100);
  const caminho = (p) => `M${p.map((q) => px(q).join(' ')).join(' L')} Z`;
  const redeDoTerminal = new Map(lista.flatMap((r) => r.terminais.map((t) => [`${t.peca}.${t.porta}`, r.id])));
  const indice = new Map(lista.map((r, k) => [r.id, k]));
  const cor = (rede) => (indice.has(rede) ? corDaRede(indice.get(rede)) : '#9aa0a6');
  const partes = [`<svg xmlns="http://www.w3.org/2000/svg" width="${(x1 - x0) * E}" height="${(z1 - z0) * E + 30}" font-family="sans-serif" font-size="9">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`, `<path d="${caminho(contorno)}" fill="#e8efe8" stroke="#2f6b3a" stroke-width="2"/>`];
  for (const i of ilhas.filter((x) => x.face === face)) partes.push(`<path d="${caminho(i.poligono)}" fill="${cor(redeDoTerminal.get(`${i.peca}.${i.terminal}`))}" fill-opacity="0.85"/>`);
  for (const q of pecas.filter((x) => x.face === face)) partes.push(`<path d="${caminho(q.poligono)}" fill="${cor(q.rede)}"/>`);
  for (const i of ilhas.filter((x) => x.face === face)) {
    const c = i.poligono.reduce((s, p) => [s[0] + p[0] / i.poligono.length, s[1] + p[1] / i.poligono.length], [0, 0]);
    const [u, v] = px(c);
    partes.push(`<text x="${u + 6}" y="${v - 4}" fill="#333">${i.peca}.${i.terminal}</text>`);
  }
  for (const v of violacoes.filter((x) => x.ponto && (!x.face || x.face === face))) {
    const [u, w] = px(v.ponto);
    partes.push(`<circle cx="${u}" cy="${w}" r="12" fill="none" stroke="#d00" stroke-width="3"/><text x="${u + 14}" y="${w + 4}" fill="#d00" font-size="11">${v.regra}</text>`);
  }
  const legenda = lista.map((r, k) => `<tspan fill="${corDaRede(k)}">${r.id}</tspan>`).join('  ');
  partes.push(`<text x="6" y="${(z1 - z0) * E + 20}" font-size="11">face de ${face}${face === 'baixo' ? ' (vista de baixo)' : ''}: ${legenda}</text>`, '</svg>');
  return partes.join('\n');
}

export async function conferirPlaca({ placa, tracado, pedido, mapa = null, soTracadas = false }) {
  const [arquivo, nome] = placa.split('#');
  const caminho = isAbsolute(arquivo) ? arquivo : resolve(process.cwd(), arquivo);
  const modulo = await import(pathToFileURL(caminho).href);
  const exportada = modulo[nome ?? 'default'];
  const declaracao = typeof exportada === 'function' ? exportada() : exportada;
  if (!declaracao) throw new Error(`conferir-placa: o módulo ${arquivo} não exporta ${nome ?? 'default'}; passe --placa=<módulo>#<export>`);
  const t = JSON.parse(readFileSync(tracado, 'utf8'));
  const item = JSON.parse(readFileSync(pedido, 'utf8')).itens.find((i) => i.tipo === 'ligacoes');
  if (!item) throw new Error(`conferir-placa: o pedido ${pedido} não tem item ligacoes`);
  const lista = soTracadas ? item.redes.filter((r) => t.redes.some((x) => x.id === r.id)) : item.redes;
  const { cobre: _, ...semCobre } = declaracao;
  const g = placaDeclarada(semCobre);
  const atravessam = new Set(g.furos.filter((f) => f.terminal).map((f) => `${f.peca}.${f.terminal}`));
  const ilhas = g.ilhas.map((i) => ({ ...i, atravessa: atravessam.has(`${i.peca}.${i.terminal}`) }));
  const contorno = g.pecas[0].contorno;
  const pecas = pecasDoTracado(t);
  const relatorio = conferirCobre({ contorno, ilhas, pecas, lista, regras: PLACA });
  if (mapa) {
    mkdirSync(mapa, { recursive: true });
    for (const face of ['cima', 'baixo']) writeFileSync(join(mapa, `mapa-${face}.svg`), `${mapaDaFace({ face, contorno, ilhas, pecas, lista, violacoes: relatorio.violacoes })}\n`);
  }
  return relatorio;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv.includes('--ajuda')) { console.log(AJUDA); process.exit(0); }
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  for (const n of ['placa', 'tracado', 'pedido']) if (!arg(n)) { console.error(`conferir-placa: falta --${n}=; veja --ajuda`); process.exit(2); }
  const relatorio = await conferirPlaca({ placa: arg('placa'), tracado: arg('tracado'), pedido: arg('pedido'), mapa: arg('mapa') ?? null, soTracadas: process.argv.includes('--so-tracadas') });
  console.log(JSON.stringify(relatorio, null, 2));
  process.exit(relatorio.violacoes.length ? 1 : 0);
}
