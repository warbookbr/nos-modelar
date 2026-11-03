#!/usr/bin/env node
/* pedidos-da-pessoa.mjs — registra os pedidos de alteração da pessoa e conta quantos foram por etapa.
 *
 * Os pedidos de uma peça moram em `pedidos.json`, na pasta da peça, ao lado da receita (formato `mecanifica.pedidos-da-pessoa@1`). O
 * registro da rodada não é tocado: as rodadas guardam o que o modelador e o crítico fizeram, e este arquivo guarda o que a pessoa
 * pediu depois de ver as imagens da etapa.
 *
 * Uso (pela ferramenta da rodada):
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --pedidos                 conta os pedidos por etapa
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --pedidos --json          a contagem em JSON, para a sessão principal ler
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --pedidos <arquivo.json>   acrescenta os pedidos do arquivo ({ "pedidos": [...] } ou lista) e conta
 *
 * Cada pedido tem `texto`, `etapa`, `regra` (id da regra que faltou, que precisa existir em `procedural/criterios/`) e `ondeMora`. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATO_PEDIDOS, contarPedidos, lerPedidos } from '../../src/autoria/pedidos-da-pessoa.js';
import { CRITERIOS } from '../../procedural/criterios/index.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/* O arquivo de pedidos da peça, ao lado da receita. */
export function arquivoDosPedidos(peca, { raiz = REPO } = {}) {
  return join(dirname(resolverCaminhoReceita(peca, { raiz })), 'pedidos.json');
}

/* Os ids de regra do catálogo: { id: família }. */
export function regrasConhecidas(criterios = CRITERIOS) {
  const mapa = {};
  for (const familia of Object.values(criterios)) for (const r of familia.regras ?? []) mapa[r.id] = familia.id;
  return mapa;
}

/* Cada pedido cita uma regra que existe, e o arquivo que diz onde ela mora existe (o id depois de "#", quando houver, é o dela). */
export function conferirPedidos(pedidos, { raiz = REPO, regras = regrasConhecidas() } = {}) {
  const problemas = [];
  for (const [i, p] of pedidos.entries()) {
    if (!Object.hasOwn(regras, p.regra)) problemas.push(`pedidos[${i}].regra '${p.regra}' não é regra de nenhum arquivo de procedural/criterios/; as que existem são ${Object.keys(regras).join(', ') || 'nenhuma'}.`);
    const [arquivo, ancora] = p.ondeMora.split('#');
    if (!existsSync(join(raiz, arquivo))) problemas.push(`pedidos[${i}].ondeMora '${arquivo}' não existe no repositório.`);
    else if (ancora !== undefined && !readFileSync(join(raiz, arquivo), 'utf8').includes(ancora)) problemas.push(`pedidos[${i}].ondeMora '${arquivo}' não cita '${ancora}'.`);
  }
  return problemas;
}

export function lerPedidosDaPeca(peca, opcoes = {}) {
  const arquivo = arquivoDosPedidos(peca, opcoes);
  if (!existsSync(arquivo)) return { formato: FORMATO_PEDIDOS, peca, pedidos: [] };
  return lerPedidos(JSON.parse(readFileSync(arquivo, 'utf8')));
}

/* Acrescenta os pedidos de `entrada` ao arquivo da peça, depois de validar tudo junto. Devolve o arquivo gravado. */
export function registrarPedidos(peca, entrada, { raiz = REPO, regras = regrasConhecidas() } = {}) {
  const novos = Array.isArray(entrada) ? entrada : entrada?.pedidos;
  if (!Array.isArray(novos) || novos.length === 0) throw new Error('o arquivo de pedidos precisa trazer uma lista { "pedidos": [...] } com ao menos um pedido.');
  const atuais = lerPedidosDaPeca(peca, { raiz });
  const juntos = lerPedidos({ formato: FORMATO_PEDIDOS, peca, pedidos: [...atuais.pedidos, ...novos] });
  const problemas = conferirPedidos(juntos.pedidos, { raiz, regras });
  if (problemas.length > 0) throw new Error(`pedidos recusados:\n  ${problemas.join('\n  ')}`);
  const arquivo = arquivoDosPedidos(peca, { raiz });
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, `${JSON.stringify(juntos, null, 2)}\n`, 'utf8');
  return { arquivo, registro: juntos };
}

export function textoDaContagem(peca, contagem) {
  if (contagem.total === 0) return `nenhum pedido da pessoa registrado para '${peca}'.`;
  const etapas = Object.entries(contagem.porEtapa).map(([e, n]) => `  etapa ${e}: ${n}`);
  const regras = Object.entries(contagem.porRegra).map(([r, n]) => `  ${r}: ${n}`);
  return [`${contagem.total} pedido(s) da pessoa registrado(s) para '${peca}', por etapa:`, ...etapas, 'regras que faltaram:', ...regras].join('\n');
}

export function comoCLI(argv) {
  const peca = argv.find((a) => !a.startsWith('--'));
  if (!peca) return { codigo: 1, texto: 'diga a peça: rodada-de-modelagem.mjs <peça> --pedidos [arquivo.json] [--json]' };
  const i = argv.indexOf('--pedidos');
  const proximo = argv[i + 1];
  if (proximo !== undefined && !proximo.startsWith('--') && proximo !== peca) registrarPedidos(peca, JSON.parse(readFileSync(proximo, 'utf8')));
  const registro = lerPedidosDaPeca(peca);
  const problemas = conferirPedidos(registro.pedidos);
  if (problemas.length > 0) return { codigo: 1, texto: `pedidos de '${peca}' com problema:\n  ${problemas.join('\n  ')}` };
  const contagem = contarPedidos(registro.pedidos);
  return { codigo: 0, texto: argv.includes('--json') ? JSON.stringify({ peca, ...contagem }) : textoDaContagem(peca, contagem) };
}
