#!/usr/bin/env node
/* familia.mjs — a aprovação mecânica das famílias e o gate que a confere.
 *
 *   npm run familia -- aprovar <id> [--sem-gravar] [--json] [--familias=<módulo>]
 *   npm run familias:check                      (node tools/mecanifica/familia.mjs conferir)
 *
 * `aprovar` roda a camada mecânica de `aprovacao-da-familia.mjs` sobre a família registrada em
 * `procedural/familias/index.js` e, aprovada, grava `aprovacao.json` na pasta `procedural/familias/<id>/`. `conferir` é
 * o gate: para cada família registrada confere o contrato, o nome da pasta e o hash da geometria dos três pontos contra o
 * `aprovacao.json`; uma pasta de `procedural/familias` com `familia.json` que não está registrada também reprova. Sem
 * família registrada, passa dizendo isso.
 *
 * `--familias=<módulo>` troca o registro por uma lista exportada por um módulo do repositório (`default`, `FAMILIAS` ou
 * `familias`, uma lista de famílias de `definirFamilia`); a pasta de cada família é a do módulo. Serve para as famílias
 * de prova que moram em `tools/fixtures`. */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ARQUIVO_CONTRATO, aprovarFamilia, conferirAprovacao } from './aprovacao-da-familia.mjs';
import { importarReceita } from './importar-receita.mjs';
import { REPO, resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const PASTA_DAS_FAMILIAS = join(REPO, 'procedural', 'familias');

const USO = [
  'uso:',
  '  npm run familia -- aprovar <id> [--sem-gravar] [--json] [--familias=<módulo>]',
  '  npm run familias:check [-- --familias=<módulo>]',
].join('\n');

export class ErroDeUso extends Error {}

function lerArgumentos(argv) {
  const posicionais = [];
  const opcoes = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) { posicionais.push(arg); continue; }
    const [nome, ...resto] = arg.slice(2).split('=');
    opcoes[nome] = resto.length ? resto.join('=') : true;
  }
  return { comando: posicionais[0] ?? null, id: posicionais[1] ?? null, opcoes };
}

/** As famílias com a pasta de cada uma: as do registro do produto, ou as de um módulo apontado por `--familias`. */
export async function carregarFamilias(alvo = null) {
  if (alvo === null || alvo === undefined) {
    const { FAMILIAS } = await import(pathToFileURL(join(REPO, 'procedural/familias/index.js')).href);
    return { exigirNomeDaPasta: true, entradas: FAMILIAS.map((familia) => ({ familia, pasta: join(PASTA_DAS_FAMILIAS, familia.contrato.id) })) };
  }
  if (typeof alvo !== 'string' || !alvo.trim()) throw new ErroDeUso('--familias veio vazio; aponte o módulo que exporta a lista de famílias.');
  const caminho = resolverCaminhoReceita(alvo, { raiz: REPO });
  const modulo = await importarReceita(caminho);
  const lista = modulo.default ?? modulo.FAMILIAS ?? modulo.familias;
  if (!Array.isArray(lista)) throw new ErroDeUso(`o módulo '${alvo}' não exporta a lista de famílias (default, FAMILIAS ou familias).`);
  const pasta = join(caminho, '..');
  return { exigirNomeDaPasta: false, entradas: lista.map((familia) => ({ familia, pasta })) };
}

/** Pastas de `procedural/familias` que têm `familia.json` e não estão no registro. */
export function pastasNaoRegistradas(ids, raiz = PASTA_DAS_FAMILIAS) {
  if (!existsSync(raiz)) return [];
  return readdirSync(raiz)
    .filter((nome) => statSync(join(raiz, nome)).isDirectory() && existsSync(join(raiz, nome, ARQUIVO_CONTRATO)) && !ids.includes(nome))
    .sort();
}

function linhasDosProblemas(problemas) {
  return problemas.map((p) => `    - ${p.ponto ? `[${p.ponto}] ` : ''}${p.codigo}: ${p.mensagem}`);
}

export async function aprovar(id, opcoes, saida = console) {
  if (!id) throw new ErroDeUso('falta o id da família.');
  const { entradas } = await carregarFamilias(opcoes.familias ?? null);
  const entrada = entradas.find(({ familia }) => familia.contrato.id === id);
  if (!entrada) {
    throw new ErroDeUso(`a família '${id}' não está registrada. Registradas: ${entradas.map(({ familia }) => familia.contrato.id).sort().join(', ') || '(nenhuma)'}.`);
  }
  const resultado = aprovarFamilia(entrada.familia, { pasta: entrada.pasta, gravar: !opcoes['sem-gravar'] });
  if (opcoes.json) {
    saida.log(JSON.stringify(resultado, null, 2));
  } else if (resultado.aprovada) {
    const estados = resultado.varredura.map((p) => p.estado);
    const perfis = Object.entries(resultado.perfis ?? {});
    saida.log(`familia ${id}: aprovada na camada mecânica — 3 pontos${perfis.length ? `, ${perfis.length} perfis` : ''}, ${resultado.varredura.length} sondas da varredura (${estados.filter((e) => e === 'recusa-declarada').length} recusadas por restrição declarada)${perfis.length ? ` e ${resultado.escalas.length} sondas de escala dos perfis (${resultado.escalas.filter((p) => p.estado === 'recusa-declarada').length} recusadas)` : ''}.`);
    for (const [nome, ponto] of Object.entries(resultado.pontos)) saida.log(`  ${nome}: ${ponto.hash}`);
    for (const [nome, ponto] of perfis) saida.log(`  perfil ${nome}: ${ponto.hash}`);
    saida.log(resultado.gravada ? `  gravada em ${join(entrada.pasta, 'aprovacao.json')}${resultado.esvaziou ? ' (a geometria mudou: as camadas do crítico e da pessoa foram esvaziadas)' : ''}.` : '  nada gravado (--sem-gravar).');
  } else {
    saida.error(`familia ${id}: REPROVADA na camada mecânica — ${resultado.problemas.length} problema(s):`);
    for (const linha of linhasDosProblemas(resultado.problemas)) saida.error(linha);
  }
  return resultado.aprovada ? 0 : 1;
}

/** O gate sobre uma lista de `{ familia, pasta }`; `naoRegistradas` são pastas com `familia.json` fora do registro. */
export function conferirEntradas(entradas, { exigirNomeDaPasta = true, naoRegistradas = [] } = {}, saida = console) {
  if (!entradas.length && !naoRegistradas.length) {
    saida.log('familias:check ok — nenhuma família registrada em procedural/familias (FAMILIAS está vazia); nada a conferir.');
    return 0;
  }
  const falhas = [];
  for (const { familia, pasta } of entradas) {
    const { ok, problemas } = conferirAprovacao(familia, { pasta, exigirNomeDaPasta });
    if (!ok) falhas.push({ id: familia.contrato.id, problemas });
  }
  for (const nome of naoRegistradas) {
    falhas.push({ id: nome, problemas: [{ codigo: 'pasta-nao-registrada', mensagem: `procedural/familias/${nome} tem ${ARQUIVO_CONTRATO} e a família não está em FAMILIAS (procedural/familias/index.js)` }] });
  }
  if (falhas.length) {
    saida.error(`familias:check FALHOU — ${falhas.length} família(s):`);
    for (const { id, problemas } of falhas) {
      saida.error(`  ${id}`);
      for (const linha of linhasDosProblemas(problemas)) saida.error(linha);
    }
    return 1;
  }
  saida.log(`familias:check ok — ${entradas.length} família(s) com contrato válido e os três pontos batendo com a aprovação.`);
  return 0;
}

export async function conferir(opcoes, saida = console) {
  const { entradas, exigirNomeDaPasta } = await carregarFamilias(opcoes.familias ?? null);
  const naoRegistradas = opcoes.familias ? [] : pastasNaoRegistradas(entradas.map(({ familia }) => familia.contrato.id));
  return conferirEntradas(entradas, { exigirNomeDaPasta, naoRegistradas }, saida);
}

export async function principal(argv, saida = console) {
  const { comando, id, opcoes } = lerArgumentos(argv);
  try {
    if (comando === 'aprovar') return await aprovar(id, opcoes, saida);
    if (comando === 'conferir') return await conferir(opcoes, saida);
    throw new ErroDeUso(comando ? `comando '${comando}' desconhecido.` : 'falta o comando.');
  } catch (erro) {
    if (!(erro instanceof ErroDeUso)) throw erro;
    saida.error(`familia: ${erro.message}\n${USO}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await principal(process.argv.slice(2));
}
