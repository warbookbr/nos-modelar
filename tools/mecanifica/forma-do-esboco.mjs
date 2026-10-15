#!/usr/bin/env node
/**
 * forma-do-esboco.mjs — a forma de uma receita contra a forma do esboço que ela refina, sem mudar a receita.
 *
 * O veredito de `descrever-peca` roda essa conferência quando a receita declara `REFINA.esboco`. Esta CLI roda a mesma conferência
 * (`src/autoria/forma-do-esboco.js`) sobre uma receita que não declara, ligando as partes às formas por linha de comando: serve para medir
 * uma peça fixa, ou para escolher o mínimo antes de escrever a declaração. A receita é executada sem veredito, o esboço é resolvido pelo
 * módulo (a parte cara, guardada no processo) e a saída diz a razão interseção/união de volume de cada parte.
 *
 *   npm run forma:esboco -- <peça> --esboco=<arquivo.esboco.json> --mesmo-id [--opcao=1] [--minimo=0.95]
 *   npm run forma:esboco -- <peça> --esboco=<arquivo.esboco.json> --formas=asa:asaD+pontaD,porta:porta
 *   npm run forma:esboco -- <peça>
 *
 * Sem `--esboco`, a CLI lê o `REFINA.esboco` que a receita declara: o arquivo, a opção, o mapa das partes às formas e os mínimos. Os
 * modeladores do avião repetiam em `--formas` o mapa que a receita já trazia, a cada medida.
 *
 * `--mesmo-id` liga cada parte da peça à forma do esboço que tem o mesmo id (as que não têm ficam de fora). `--formas` liga as partes que
 * cita, com `+` entre as formas de uma parte. A saída é não-zero quando alguma parte fica abaixo do mínimo ou não tem sólido. */
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { OPCAO_COMPOSICOES } from './configuracao-composicoes.mjs';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { conferirFormaDoEsbocoDoJson, formasDoEsboco } from './esboco-solido.mjs';
import { normalizarEsbocoDoRefinamento } from '../../src/autoria/refinamento-global.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const MINIMO_PADRAO = 0.95;
const virgula = (numero, casas) => numero.toFixed(casas).replace('.', ',');
const segundos = (ms) => virgula(ms / 1000, ms < 10_000 ? 2 : 1);

/** As partes da peça executada ligadas a formas do esboço, na forma que `REFINA.esboco.formas` aceita. */
export function ligarPartes({ partes, ids, formas = null, mesmoId = false }) {
  if (formas !== null) {
    const mapa = {};
    for (const item of formas.split(',').map((t) => t.trim()).filter(Boolean)) {
      const [parte, lista, ...sobra] = item.split(':');
      if (!parte || !lista || sobra.length) throw new Error(`--formas espera parte:forma[+forma],...; recebi '${item}'`);
      if (Object.hasOwn(mapa, parte)) throw new Error(`--formas repete a parte '${parte}'`);
      mapa[parte] = lista.split('+').map((id) => id.trim()).filter(Boolean);
    }
    if (!Object.keys(mapa).length) throw new Error('--formas veio vazio; informe parte:forma ou use --mesmo-id');
    return mapa;
  }
  if (!mesmoId) throw new Error('diga como ligar as partes às formas: --mesmo-id (a forma de mesmo id) ou --formas=parte:forma,...');
  const comForma = partes.filter((parte) => ids.has(parte));
  if (!comForma.length) throw new Error(`nenhuma parte da peça (${partes.join(', ') || 'nenhuma'}) tem uma forma de mesmo id na opção do esboço`);
  return Object.fromEntries(comForma.map((parte) => [parte, [parte]]));
}

/**
 * Executa a peça e confere as partes ligadas. Devolve `{ resultado, partes, semForma, tempo }` com `tempo.resolverMs` (a opção do esboço)
 * e `tempo.conferirMs` (os sólidos, as interseções e a peça executada).
 */
/** O `REFINA.esboco` que a receita da peça declara, pronto para `formaDoEsbocoDaPeca`, ou null quando ela não declara. */
export async function esbocoDeclarado(peca) {
  const caminho = resolverCaminhoReceita(peca);
  const declarado = receitaDoModulo(await importarReceita(caminho))?.REFINA?.esboco;
  if (!declarado) return null;
  const canonico = normalizarEsbocoDoRefinamento(declarado);
  return {
    esboco: resolve(dirname(caminho), canonico.arquivo),
    opcao: canonico.opcao,
    minimo: canonico.minimo,
    ligadas: Object.fromEntries(canonico.formas.map((f) => [f.parte, f.minimo === undefined ? f.formas : { formas: f.formas, minimo: f.minimo }])),
  };
}

export async function formaDoEsbocoDaPeca({ peca, esboco, opcao = 1, minimo = MINIMO_PADRAO, formas = null, mesmoId = false, ligadas: declaradas = null, composicoes = null }) {
  const execucao = await descreverPecaReutilizavel({ peca, semVeredito: true, composicoes });
  if (!execucao.ok) throw new Error(`a peça '${peca}' não executou:\n${execucao.stderr.trim()}`);
  const neutro = execucao.resultado.neutro;
  let bruto;
  try {
    bruto = JSON.parse(readFileSync(esboco, 'utf8'));
  } catch (erro) {
    throw new Error(`não foi possível ler o esboço ${esboco}: ${erro.message}`);
  }
  const t0 = performance.now();
  const dados = formasDoEsboco(bruto, opcao);
  const resolverMs = performance.now() - t0;
  const partes = [...new Set([...neutro.F.values()].map((f) => f.parte).filter(Boolean))].sort();
  const ids = new Set(dados.formas.map((f) => f.id));
  const ligadas = declaradas ?? ligarPartes({ partes, ids, formas, mesmoId });
  const declaracao = normalizarEsbocoDoRefinamento({ arquivo: basename(esboco), opcao, formas: ligadas, minimo });
  const t1 = performance.now();
  const resultado = conferirFormaDoEsbocoDoJson({ esboco: declaracao, bruto, neutro });
  return {
    resultado,
    semForma: partes.filter((parte) => !declaracao.formas.some((f) => f.parte === parte)),
    tempo: { resolverMs, conferirMs: performance.now() - t1 },
  };
}

/** O texto da conferência: uma linha por parte medida, os achados e o tempo. */
export function descreverFormaDoEsboco({ peca, resultado, semForma, tempo }) {
  const opcao = resultado.opcao?.titulo ?? resultado.opcao?.numero ?? resultado.opcao;
  const linhas = [
    `forma de ${peca} contra o esboço ${resultado.arquivo} (opção ${opcao}): ${resultado.ok ? 'aprovada' : 'REPROVADA'}`,
    `  razão interseção/união de volume, mínimo ${virgula(resultado.minimo, 2)} (as partes com mínimo próprio dizem qual)`,
    ...resultado.partes.map((p) => `  ${p.parte.padEnd(20)} ${virgula(p.razao, 4)}  ${p.ok ? 'ok     ' : 'ABAIXO '}`
      + `  parte ${String(Math.round(p.volumeParteMm3 / 1000)).padStart(10)} cm3`
      + `  forma ${String(Math.round(p.volumeFormasMm3 / 1000)).padStart(10)} cm3`
      + `  em comum ${String(Math.round(p.volumeComumMm3 / 1000)).padStart(10)} cm3`
      + `  (${p.formas.join('+')}${p.minimo === resultado.minimo ? '' : `, mínimo ${virgula(p.minimo, 2)}`})`),
    ...(semForma.length ? [`  sem forma ligada, fora da conferência: ${semForma.join(', ')}`] : []),
    ...resultado.achados.map((a) => `  ACHADO ${a.codigo}: ${a.mensagem}`),
    `  tempo: resolver a opção do esboço ${segundos(tempo.resolverMs)} s, sólidos e razões ${segundos(tempo.conferirMs)} s`,
  ];
  return `${linhas.join('\n')}\n`;
}

export async function comoCLI(argv) {
  const uso = (mensagem) => ({ codigo: 2, stdout: '', stderr: `forma-do-esboco: ${mensagem}\n` });
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['esboco', 'opcao', 'minimo', 'formas', OPCAO_COMPOSICOES],
      bandeiras: ['mesmo-id'],
      posicional: { nome: 'a peça', obrigatorio: true },
    });
  } catch (erro) {
    return uso(erro.message);
  }
  const esboco = lido.opcao('esboco');
  const peca = lido.posicional;
  if (esboco === null || !esboco.trim()) {
    if (lido.opcao('formas') !== null || lido.bandeira('mesmo-id')) return uso('diga o esboço: --esboco=<arquivo .esboco.json>');
    let declarado;
    try {
      declarado = await esbocoDeclarado(peca);
    } catch (erro) {
      return { codigo: 1, stdout: '', stderr: `forma-do-esboco: ${erro.message}\n` };
    }
    if (!declarado) return uso('diga o esboço: --esboco=<arquivo .esboco.json>, ou declare REFINA.esboco na receita');
    try {
      const feito = await formaDoEsbocoDaPeca({ peca, ...declarado, composicoes: lido.opcao(OPCAO_COMPOSICOES) });
      return { codigo: feito.resultado.ok ? 0 : 1, stdout: descreverFormaDoEsboco({ peca, ...feito }), stderr: '', ...feito };
    } catch (erro) {
      return { codigo: 1, stdout: '', stderr: `forma-do-esboco: ${erro.message}\n` };
    }
  }
  const opcaoTexto = lido.opcao('opcao', '1');
  const opcao = /^\d+$/.test(opcaoTexto) ? Number(opcaoTexto) : opcaoTexto;
  const minimo = Number(lido.opcao('minimo', String(MINIMO_PADRAO)));
  if (!(minimo > 0 && minimo <= 1)) return uso(`--minimo precisa ser a razão mínima, maior que 0 e até 1; recebi '${lido.opcao('minimo')}'`);
  try {
    const feito = await formaDoEsbocoDaPeca({
      peca, esboco: resolve(esboco), opcao, minimo, formas: lido.opcao('formas'), mesmoId: lido.bandeira('mesmo-id'), composicoes: lido.opcao(OPCAO_COMPOSICOES),
    });
    return { codigo: feito.resultado.ok ? 0 : 1, stdout: descreverFormaDoEsboco({ peca, ...feito }), stderr: '', ...feito };
  } catch (erro) {
    return { codigo: 1, stdout: '', stderr: `forma-do-esboco: ${erro.message}\n` };
  }
}

const executadoComoCLI = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const saida = await comoCLI(process.argv.slice(2));
  process.stdout.write(saida.stdout);
  process.stderr.write(saida.stderr);
  process.exitCode = saida.codigo;
}
