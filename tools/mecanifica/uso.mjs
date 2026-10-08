#!/usr/bin/env node
/* uso.mjs — registro local do que a IA pede às ferramentas de entrada, e o resumo dele: `npm run uso`.
 *
 * A divulgação progressiva só funciona se o índice acerta: o tópico que a IA procura existe, o roteiro que ela pede tem esse
 * nome, e a recusa que ela leva aponta o tópico que resolve. Nada disso aparece sem um registro. Três comandos acrescentam
 * uma linha JSON a `.diario/uso.jsonl` (fora do Git, junto do diário da oficina): `esboco --ajuda <tópico>` (o tópico pedido,
 * e se existia), `comecar <roteiro>` (idem) e as recusas do esboço e do gate de contato (a mensagem e o tópico apontado).
 * `npm run uso` resume: tópicos mais pedidos, tópicos não encontrados, roteiros pedidos e recusas repetidas.
 *
 * O registro mede a ferramenta, nunca o agente, e não pode atrapalhar o comando que registra: qualquer falha de escrita é
 * ignorada, nada sai em stdout e o código de saída não muda. Desligar: `MECANIFICA_USO=0`. Redirecionar:
 * `MECANIFICA_USO_ARQUIVO=<caminho>`. Sob o vitest ele fica calado, para a suíte não encher o registro de quem trabalha com
 * linhas de fixture, a menos que o teste redirecione o arquivo de propósito.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TAMANHO_DA_MENSAGEM = 300;

export function caminhoDoUso(env = process.env) {
  return env.MECANIFICA_USO_ARQUIVO ? resolve(env.MECANIFICA_USO_ARQUIVO) : resolve(REPO, '.diario/uso.jsonl');
}

function ligado(env) {
  if (env.MECANIFICA_USO === '0') return false;
  if (env.MECANIFICA_USO_ARQUIVO) return true;
  return !env.VITEST;
}

/* Acrescenta uma linha ao registro. Devolve true quando gravou e false quando não gravou, por estar desligado ou por falha,
   que nunca sobe para quem chamou. `destino` explícito grava mesmo sob o vitest, para o teste do próprio registro. */
export function registrarUso(evento, { env = process.env, destino = null, agora = () => new Date() } = {}) {
  try {
    if (destino === null && !ligado(env)) return false;
    const caminho = destino ?? caminhoDoUso(env);
    const limpo = { ...evento };
    if (typeof limpo.mensagem === 'string') limpo.mensagem = limpo.mensagem.replace(/\s+/g, ' ').trim().slice(0, TAMANHO_DA_MENSAGEM);
    mkdirSync(dirname(caminho), { recursive: true });
    appendFileSync(caminho, `${JSON.stringify({ quando: agora().toISOString(), ...limpo })}\n`);
    return true;
  } catch {
    return false;
  }
}

/* As linhas do registro; a linha ilegível é pulada. */
export function lerUso(caminho = caminhoDoUso()) {
  if (!existsSync(caminho)) return [];
  const registros = [];
  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    if (!linha.trim()) continue;
    try { registros.push(JSON.parse(linha)); } catch { /* linha cortada por uma escrita interrompida */ }
  }
  return registros;
}

const contar = (valores) => {
  const mapa = new Map();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa].map(([chave, vezes]) => ({ chave, vezes })).sort((a, b) => b.vezes - a.vezes || a.chave.localeCompare(b.chave));
};

/* A mensagem sem o que muda de uma ocorrência para outra (nomes entre aspas e números), para a mesma recusa contar junta. */
export function chaveDaRecusa(mensagem) {
  return String(mensagem).replace(/"[^"]*"/g, '"…"').replace(/\d+(?:[.,]\d+)?/g, '#').slice(0, 140);
}

export function resumirUso(registros) {
  const de = (evento) => registros.filter((r) => r.evento === evento);
  const ajuda = de('ajuda');
  const comecar = de('comecar');
  const recusas = de('recusa');
  const porChave = new Map();
  for (const r of recusas) {
    const chave = `${r.topico ?? 'sem tópico'}\u0000${chaveDaRecusa(r.mensagem ?? '')}`;
    const atual = porChave.get(chave) ?? { topico: r.topico ?? null, origem: r.origem ?? null, mensagem: chaveDaRecusa(r.mensagem ?? ''), exemplo: r.mensagem ?? '', vezes: 0 };
    atual.vezes += 1;
    porChave.set(chave, atual);
  }
  const quando = registros.map((r) => r.quando).filter(Boolean).sort();
  return {
    total: registros.length,
    de: quando[0] ?? null,
    ate: quando[quando.length - 1] ?? null,
    topicosPedidos: contar(ajuda.filter((r) => r.achado).map((r) => r.topico)).map(({ chave, vezes }) => ({ topico: chave, vezes })),
    topicosNaoEncontrados: contar(ajuda.filter((r) => !r.achado).map((r) => r.topico)).map(({ chave, vezes }) => ({ topico: chave, vezes })),
    roteirosPedidos: contar(comecar.filter((r) => r.achado).map((r) => r.roteiro)).map(({ chave, vezes }) => ({ roteiro: chave, vezes })),
    roteirosDesconhecidos: contar(comecar.filter((r) => !r.achado).map((r) => r.roteiro)).map(({ chave, vezes }) => ({ roteiro: chave, vezes })),
    recusas: { total: recusas.length, repetidas: [...porChave.values()].filter((x) => x.vezes >= 2).sort((a, b) => b.vezes - a.vezes) },
  };
}

const LIMITE_DA_LISTA = 15;
const lista = (itens, linha) => (itens.length === 0 ? ['  nenhum'] : [...itens.slice(0, LIMITE_DA_LISTA).map(linha), ...(itens.length > LIMITE_DA_LISTA ? [`  e mais ${itens.length - LIMITE_DA_LISTA}`] : [])]);

export function formatarUso(resumo, caminho) {
  const n = (x) => String(x).padStart(4);
  if (resumo.total === 0) return `registro de uso vazio (${caminho}): rode npm run esboco -- --ajuda <tópico> ou npm run comecar -- <roteiro> e volte aqui\n`;
  return [
    `registro de uso: ${resumo.total} ${resumo.total === 1 ? 'evento' : 'eventos'} de ${resumo.de} a ${resumo.ate} em ${caminho}`,
    '',
    'tópicos de ajuda mais pedidos:',
    ...lista(resumo.topicosPedidos, (t) => `${n(t.vezes)}  ${t.topico}`),
    '',
    'tópicos de ajuda não encontrados (o índice não tem o nome que a IA procurou):',
    ...lista(resumo.topicosNaoEncontrados, (t) => `${n(t.vezes)}  ${t.topico}`),
    '',
    'roteiros pedidos:',
    ...lista(resumo.roteirosPedidos, (r) => `${n(r.vezes)}  ${r.roteiro}`),
    '',
    'roteiros desconhecidos:',
    ...lista(resumo.roteirosDesconhecidos, (r) => `${n(r.vezes)}  ${r.roteiro}`),
    '',
    `recusas repetidas (a mesma mensagem duas vezes ou mais; ${resumo.recusas.total} no total):`,
    ...lista(resumo.recusas.repetidas, (r) => `${n(r.vezes)}  [${r.topico ?? 'sem tópico'}] ${r.mensagem}`),
    '',
  ].join('\n');
}

function executar(argv) {
  const caminho = caminhoDoUso();
  const resumo = resumirUso(lerUso(caminho));
  process.stdout.write(argv.includes('--json') ? `${JSON.stringify({ caminho, ...resumo }, null, 2)}\n` : formatarUso(resumo, caminho));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar(process.argv.slice(2));
