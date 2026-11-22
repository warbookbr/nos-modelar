#!/usr/bin/env node
/* preenchimento-da-rede.mjs — diz, de cada rede de curvas de uma receita, como o preenchimento do miolo pelas curvas vizinhas usou os
 * vizinhos: quantos lados dos retalhos de quatro lados tiveram a curva seguinte da rede e, dos outros, por quê.
 *
 * POR QUE ELE EXISTE. Com `alisarSuperficie`, a `gaiolaPorRede` preenche o miolo de cada retalho de quatro lados pela curva seguinte da rede
 * de cada lado (`preencherPelasVizinhas`). O lado sem vizinho cai na reta do preenchimento padrão, que erra a dupla curvatura, e o miolo
 * desse retalho fica pior. No quarto traseiro do carro a contagem de lados sem vizinho saiu de uma cópia instrumentada do núcleo (banco de
 * provas `correcao-de-superficie-2026-11-16`); aqui ela sai do campo `preenchimento` que a própria rede publica.
 *
 * O QUE ELE FAZ. Lê `PASSOS` da receita (a variante de `--params` inclusive) com a opção `alisarSuperficie` ligada em todas as redes, pela
 * alteração de teste da rede (`comAlteracoesNaRede`), e o alisamento pela normal desligado, que a opção pede; a receita não muda e a
 * subdivisão não roda. Cada rede que publica `preenchimento` sai com os lados por motivo (`vizinho`; `cortado` pela razão de cordas; `vinco`;
 * `borda` livre; `simetria`, no plano x = 0; `nLados`, o retalho do outro lado não tem quatro lados; `dividido`, mais de um retalho de
 * quatro lados na mesma aresta; `desencontrado`; `misto`), a razão de cordas dos lados com vizinho em faixas e os retalhos pelo número de
 * lados com vizinho. Com `--retalhos`, a tabela lista cada retalho com o motivo de cada lado e a curva dele.
 *
 * Uso: node tools/modelar/preenchimento-da-rede.mjs <chapa de prova | caminho da receita> [--params=<json | arquivo.json>] [--onda=<mm>]
 *        [--retalhos] [--saida=<json>]
 *   O JSON vai para a saída padrão e a tabela para a saída de erro. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { capturarGaiolas, comAlteracoesNaRede } from '../../procedural/nucleo/gaiola-captura.js';
import { MOTIVOS_DO_PREENCHIMENTO } from '../../procedural/nucleo/gaiola-por-rede.js';
import { CHAPAS_DE_PROVA, receitaDeProva } from '../fixtures/correcao-de-superficie/chapas.mjs';
import { lerArgumentos } from './argumentos.mjs';
import { lerParams, receitaComParams } from './entrada-de-medida.mjs';

/** preenchimentoDaReceita(receita, { onda }) -> [{ rede, preenchimento }]: o diagnóstico de cada rede montada ao ler PASSOS, com a opção
 *  ligada. `receita` é a receita, ou uma função que a monta (a chapa de prova monta a gaiola ao ser gerada). `rede` é a posição dela entre
 *  as gaiolas montadas (0, 1, ...), e só entram as que publicam o diagnóstico. */
export function preenchimentoDaReceita(receita, { onda = null } = {}) {
  const alt = { alisarSuperficie: onda == null ? true : { onda } };
  const { gaiolas } = comAlteracoesNaRede(alt, () => capturarGaiolas(() => (typeof receita === 'function' ? receita() : receita).PASSOS));
  const redes = gaiolas.map((g, rede) => ({ rede, preenchimento: g.preenchimento })).filter((r) => r.preenchimento);
  if (!redes.length) {
    throw new Error(gaiolas.length
      ? `nenhuma das ${gaiolas.length} gaiola(s) montadas ao ler PASSOS tem retalho de quatro lados de gaiolaPorRede; o preenchimento pelas vizinhas só vale nela`
      : 'nenhuma gaiola foi montada ao ler PASSOS; a receita precisa montar a gaiolaPorRede na leitura de PASSOS (um getter), e não na importação');
  }
  return redes;
}

const MOTIVOS_DITOS = {
  vizinho: 'com vizinho', cortado: 'cortado pela razão de cordas', vinco: 'vinco', borda: 'borda livre', simetria: 'plano de simetria',
  nLados: 'retalho de n lados ao lado', dividido: 'aresta com mais de um retalho', desencontrado: 'vizinho sem o ponto do lado', misto: 'misto',
};

/** tabelaDoPreenchimento(redes, nome, { retalhos }) -> o texto legível do diagnóstico. */
export function tabelaDoPreenchimento(redes, nome, { retalhos = false } = {}) {
  const linhas = [];
  for (const { rede, preenchimento: p } of redes) {
    linhas.push(`${nome}, rede ${rede}: ${p.retalhos} retalhos de quatro lados, ${p.lados} lados`);
    for (const m of MOTIVOS_DO_PREENCHIMENTO) if (p.porMotivo[m]) linhas.push(`  ${String(p.porMotivo[m]).padStart(4)}  ${MOTIVOS_DITOS[m]}`);
    if (p.vizinhoQueNaoCobreOLado) linhas.push(`  dos lados com vizinho, ${p.vizinhoQueNaoCobreOLado} têm vizinho que não cobre o lado inteiro`);
    linhas.push(`  razão de cordas dos lados com vizinho: ${Object.entries(p.razaoDoVizinho).map(([f, n]) => `${f}: ${n}`).join(', ')}`);
    linhas.push(`  retalhos por lados com vizinho: ${Object.entries(p.retalhosPorLadosComVizinho).map(([k, n]) => `${k}: ${n}`).join(', ')}`);
    if (retalhos) {
      for (const [r, lados] of Object.entries(p.porRetalho)) {
        linhas.push(`  ${r}: ${lados.map((l) => `${l.curva ?? '?'} ${l.motivo}${l.razao != null && l.motivo !== 'vizinho' ? ` ${l.razao}` : ''}${l.pontos ? ` ${JSON.stringify(l.pontos)}` : ''}`).join(' | ')}`);
      }
    }
  }
  return linhas.join('\n');
}

export const OPCOES_DA_CLI = ['params', 'onda', 'saida'];

async function receitaDoAlvo(alvo, params) {
  if (CHAPAS_DE_PROVA.includes(alvo)) {
    if (params) throw new Error(`--params pede uma receita com PARAMS, e ${alvo} é chapa de prova, gerada na hora`);
    return () => receitaDeProva(alvo);
  }
  const abs = resolve(alvo);
  const receita = (await import(pathToFileURL(abs).href)).default;
  return params ? receitaComParams(receita, params, { texto: readFileSync(abs, 'utf8'), nome: alvo }) : receita;
}

async function principal(argv) {
  let lido;
  try { lido = lerArgumentos(argv.slice(2), { opcoes: OPCOES_DA_CLI, bandeiras: ['ajuda', 'retalhos'], posicional: { nome: 'receita', obrigatorio: false } }); } catch (e) { process.stderr.write(`preenchimento-da-rede: ${e.message}\n`); return 2; }
  const alvo = lido.posicional;
  if (lido.bandeira('ajuda') || !alvo) {
    process.stderr.write(`uso: node tools/modelar/preenchimento-da-rede.mjs <chapa de prova | caminho da receita> [--${OPCOES_DA_CLI.join('=...] [--')}=...] [--retalhos]\n  liga alisarSuperficie em todas as redes só para medir; ver o cabeçalho do arquivo\n`);
    return lido.bandeira('ajuda') ? 0 : 2;
  }
  let saida;
  try {
    const t = lido.opcao('onda'); const onda = t == null ? null : Number(t);
    if (onda !== null && !(Number.isFinite(onda) && onda > 0)) throw new Error(`--onda espera um comprimento em mm maior que zero, e veio '${t}'`);
    const receita = await receitaDoAlvo(alvo, lerParams(lido.opcao('params')));
    saida = { alvo, ...(lido.opcao('params') ? { params: lido.opcao('params') } : {}), redes: preenchimentoDaReceita(receita, { onda }) };
  } catch (e) { process.stderr.write(`preenchimento-da-rede: ${alvo}: ${e.message}\n`); return 2; }
  const texto = `${JSON.stringify(saida, null, 1)}\n`;
  if (lido.opcao('saida')) { const s = resolve(lido.opcao('saida')); mkdirSync(dirname(s), { recursive: true }); writeFileSync(s, texto); }
  process.stderr.write(`${tabelaDoPreenchimento(saida.redes, alvo, { retalhos: lido.bandeira('retalhos') })}\n`);
  process.stdout.write(texto);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(`${e.message}\n`); process.exitCode = 1; });
}
