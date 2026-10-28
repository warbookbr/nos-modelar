#!/usr/bin/env node
/* retrato-do-acervo.mjs — mede cada peça do acervo e compara dois retratos, para saber o que uma mudança no núcleo fez com
 * as peças que já estavam aprovadas.
 *
 * Mudar o núcleo ou uma ferramenta geral pode mudar a forma de uma peça sem que nenhum gate diga: `guarda:acervo` confere
 * contato, plano e cadeia da receita, mas não a caixa, o volume nem as partes. O retrato registra por peça a caixa, o volume,
 * a área, as faces, as faces finas, as partes (cada uma com caixa, volume e área), os passos órfãos e o tempo; `--comparar`
 * diz o que mudou entre o retrato gravado e o de agora.
 *
 *   node tools/modelar/retrato-do-acervo.mjs                       resumo do acervo de agora
 *   node tools/modelar/retrato-do-acervo.mjs --gravar <arquivo>    grava o retrato
 *   node tools/modelar/retrato-do-acervo.mjs --comparar <arquivo>  mede de novo e compara com o gravado
 *   --pecas=a,b  restringe a medida (e a comparação) a estas peças · --json imprime o retrato em JSON
 *
 * SAI COM 1 quando caixa, volume, área ou partes mudam, quando uma peça some ou passa a falhar, e quando faces, faces finas ou
 * passos órfãos SOBEM; faces, faces finas e órfãos que CAEM são listados e não reprovam, porque uma correção que tira lasca é o
 * que se quer. O tempo nunca entra na comparação.
 *
 * As medidas estão em metro, a unidade da malha, com 12 algarismos significativos. Caixa compara a 1e-9 m; volume e área a
 * 1e-9 relativo.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { lerArgumentos } from './argumentos.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { lascasDoNeutro } from './lasca.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const FORMATO = 'modelar.retrato-do-acervo@1';
export const TOLERANCIA_CAIXA = 1e-9;
export const TOLERANCIA_RELATIVA = 1e-9;

const algarismos = (valor) => (valor === 0 ? 0 : Number(valor.toPrecision(12)));
const vetor = (v) => v.map((c) => algarismos(c + 0));

/* ---------- a medida de uma peça ---------- */

/* Volume com sinal e área de um conjunto de faces: o leque a partir do primeiro canto dá o volume exato de uma face plana, convexa ou
   não, porque soma áreas assinadas; a área vem de Newell, que não supõe face plana. */
function medirFaces(faces, vertices) {
  const caixa = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  let volume = 0;
  let area = 0;
  for (const face of faces) {
    const pontos = face.vs.map((id) => vertices.get(id));
    for (const p of pontos) {
      for (let k = 0; k < 3; k += 1) {
        if (p[k] < caixa.min[k]) caixa.min[k] = p[k];
        if (p[k] > caixa.max[k]) caixa.max[k] = p[k];
      }
    }
    const p0 = pontos[0];
    for (let k = 1; k < pontos.length - 1; k += 1) {
      const p1 = pontos[k]; const p2 = pontos[k + 1];
      volume += (p0[0] * (p1[1] * p2[2] - p1[2] * p2[1])
        - p0[1] * (p1[0] * p2[2] - p1[2] * p2[0])
        + p0[2] * (p1[0] * p2[1] - p1[1] * p2[0])) / 6;
    }
    let nx = 0; let ny = 0; let nz = 0;
    for (let k = 0; k < pontos.length; k += 1) {
      const a = pontos[k]; const b = pontos[(k + 1) % pontos.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    area += Math.hypot(nx, ny, nz) / 2;
  }
  return {
    faces: faces.length,
    caixa: faces.length ? { min: vetor(caixa.min), max: vetor(caixa.max) } : null,
    volume: algarismos(volume),
    area: algarismos(area),
  };
}

/** O retrato de um estado neutro (sem o tempo, que quem chama mede). */
export function retratarNeutro(neutro, { passos = [] } = {}) {
  const faces = [...neutro.F.values()].sort((a, b) => a.id - b.id);
  const porParte = new Map();
  const semParte = [];
  for (const face of faces) {
    if (typeof face.parte !== 'string' || face.parte === '') { semParte.push(face); continue; }
    if (!porParte.has(face.parte)) porParte.set(face.parte, []);
    porParte.get(face.parte).push(face);
  }
  const partes = {};
  for (const nome of [...porParte.keys()].sort()) partes[nome] = medirFaces(porParte.get(nome), neutro.V);
  const todas = medirFaces(faces, neutro.V);
  return {
    caixa: todas.caixa,
    volume: todas.volume,
    area: todas.area,
    faces: todas.faces,
    vertices: neutro.V.size,
    facesFinas: lascasDoNeutro(neutro, { passos }).length,
    facesSemParte: semParte.length,
    orfaos: (neutro.orfaos ?? []).length,
    partes,
  };
}

/** O retrato de uma receita já carregada. Receita que o núcleo recusa vira `{ erro }`: a recusa também é um fato da peça. */
export function retratarReceita(receita, execucao = {}) {
  const inicio = performance.now();
  try {
    const { entrada, neutro } = executarReceita(receita, execucao);
    const retrato = retratarNeutro(neutro, { passos: entrada.PASSOS });
    return { ...retrato, tempoMs: Math.round(performance.now() - inicio) };
  } catch (erro) {
    return { erro: String(erro?.message ?? erro).split('\n')[0], tempoMs: Math.round(performance.now() - inicio) };
  }
}

export async function retratarPeca(nome) {
  const inicio = performance.now();
  let receita;
  try {
    receita = receitaDoModulo(await importarReceita(resolverCaminhoReceita(nome)));
  } catch (erro) {
    return { erro: `não carregou: ${String(erro?.message ?? erro).split('\n')[0]}`, tempoMs: Math.round(performance.now() - inicio) };
  }
  const retrato = retratarReceita(receita);
  retrato.tempoMs = Math.round(performance.now() - inicio);
  return retrato;
}

export async function retratarPecas(nomes) {
  const pecas = {};
  for (const nome of [...nomes].sort()) pecas[nome] = await retratarPeca(nome);
  return { formato: FORMATO, pecas };
}

/* ---------- a comparação ---------- */

const relativa = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12);
const mm = (metros) => `${Math.round(metros * 1e6) / 1e3} mm`;
const numero = (v) => String(v).replace('.', ',');
const EIXOS = ['x', 'y', 'z'];

function compararCaixa(onde, antes, depois, achar) {
  if (!antes && !depois) return;
  if (!antes || !depois) { achar(onde, 'caixa', antes ? 'tinha caixa e deixou de ter' : 'não tinha caixa e passou a ter', true); return; }
  for (const lado of ['min', 'max']) {
    EIXOS.forEach((eixo, k) => {
      if (Math.abs(antes[lado][k] - depois[lado][k]) > TOLERANCIA_CAIXA) {
        achar(onde, 'caixa', `${lado} ${eixo} ${mm(antes[lado][k])} → ${mm(depois[lado][k])} (${numero(antes[lado][k])} → ${numero(depois[lado][k])} m)`, true);
      }
    });
  }
}

function compararMedidas(onde, antes, depois, achar) {
  compararCaixa(onde, antes.caixa, depois.caixa, achar);
  for (const campo of ['volume', 'area']) {
    if (relativa(antes[campo], depois[campo]) > TOLERANCIA_RELATIVA) {
      achar(onde, campo, `${numero(antes[campo])} → ${numero(depois[campo])} m${campo === 'volume' ? '³' : '²'} (diferença relativa ${relativa(antes[campo], depois[campo]).toExponential(2)})`, true);
    }
  }
}

/* Contagem que só pode cair: subir reprova, cair é listado. */
function compararContagem(onde, campo, antes, depois, achar, rotulo) {
  if (antes === depois) return;
  achar(onde, campo, `${antes} → ${depois}${depois > antes ? ` (${rotulo} subiu)` : ''}`, depois > antes);
}

/**
 * Compara dois retratos. Devolve `{ diferencas, iguais, novas }`: cada diferença é `{ peca, parte, campo, detalhe, grave }`.
 * `apenas` restringe a comparação a uma lista de peças (as ausentes do retrato de agora não contam como sumidas).
 */
export function compararRetratos(antes, depois, { apenas = null } = {}) {
  const diferencas = [];
  const achar = (peca, parte, campo, detalhe, grave) => diferencas.push({ peca, parte, campo, detalhe, grave });
  const nomesAntes = Object.keys(antes.pecas ?? {}).sort();
  const escopo = apenas ? new Set(apenas) : null;
  const novas = Object.keys(depois.pecas ?? {}).filter((n) => !(n in (antes.pecas ?? {})) && (!escopo || escopo.has(n))).sort();
  let iguais = 0;
  for (const nome of nomesAntes) {
    if (escopo && !escopo.has(nome)) continue;
    const a = antes.pecas[nome];
    const d = depois.pecas?.[nome];
    const antesDeFalhar = diferencas.length;
    const peca = (parte, campo, detalhe, grave) => achar(nome, parte, campo, detalhe, grave);
    if (!d) { peca(null, 'peça', 'estava no retrato e não está no de agora', true); continue; }
    if (a.erro || d.erro) {
      if (a.erro !== d.erro) peca(null, 'erro', a.erro ? (d.erro ? `"${a.erro}" → "${d.erro}"` : `falhava ("${a.erro}") e passou a executar`) : `executava e passou a falhar: ${d.erro}`, true);
      if (diferencas.length === antesDeFalhar) iguais += 1;
      continue;
    }
    compararMedidas(null, a, d, (_, campo, detalhe, grave) => peca(null, campo, detalhe, grave));
    const nomesA = Object.keys(a.partes); const nomesD = Object.keys(d.partes);
    for (const parte of nomesA.filter((p) => !nomesD.includes(p))) peca(parte, 'partes', `a parte '${parte}' sumiu`, true);
    for (const parte of nomesD.filter((p) => !nomesA.includes(p))) peca(parte, 'partes', `a parte '${parte}' apareceu`, true);
    for (const parte of nomesA.filter((p) => nomesD.includes(p))) {
      compararMedidas(parte, a.partes[parte], d.partes[parte], (_, campo, detalhe, grave) => peca(parte, `partes.${campo}`, detalhe, grave));
      compararContagem(parte, 'partes.faces', a.partes[parte].faces, d.partes[parte].faces, (_, campo, detalhe, grave) => peca(parte, campo, detalhe, grave), 'faces');
    }
    compararContagem(null, 'faces', a.faces, d.faces, (_, campo, detalhe, grave) => peca(null, campo, detalhe, grave), 'faces');
    compararContagem(null, 'facesFinas', a.facesFinas, d.facesFinas, (_, campo, detalhe, grave) => peca(null, campo, detalhe, grave), 'faces finas');
    compararContagem(null, 'orfaos', a.orfaos, d.orfaos, (_, campo, detalhe, grave) => peca(null, campo, detalhe, grave), 'passos órfãos');
    compararContagem(null, 'facesSemParte', a.facesSemParte, d.facesSemParte, (_, campo, detalhe, grave) => peca(null, campo, detalhe, grave), 'faces sem parte');
    if (diferencas.length === antesDeFalhar) iguais += 1;
  }
  return { diferencas, iguais, novas };
}

export function formatarComparacao({ diferencas, iguais, novas }) {
  const linhas = [];
  const porPeca = new Map();
  for (const d of diferencas) {
    if (!porPeca.has(d.peca)) porPeca.set(d.peca, []);
    porPeca.get(d.peca).push(d);
  }
  for (const [peca, lista] of porPeca) {
    for (const d of lista) {
      const onde = d.parte ? `${peca} · parte ${d.parte}` : peca;
      linhas.push(`${d.grave ? 'MUDOU' : 'caiu '} ${onde}: ${d.campo.replace(/^partes\./, '')} ${d.detalhe}`);
    }
  }
  const graves = diferencas.filter((d) => d.grave);
  const pecasGraves = new Set(graves.map((d) => d.peca)).size;
  linhas.push(`${iguais} peça(s) iguais; ${pecasGraves} com mudança de forma, de partes ou subida de contagem; ${porPeca.size - pecasGraves} só com queda de contagem.`);
  if (novas.length) linhas.push(`${novas.length} peça(s) sem retrato de antes (não comparadas): ${novas.join(', ')}.`);
  return linhas.join('\n');
}

/* ---------- arquivo ---------- */

/** Uma peça por bloco e uma parte por linha: o diff do arquivo mostra a peça e a parte que mudaram. */
export function serializarRetrato(retrato) {
  const blocos = Object.entries(retrato.pecas).map(([nome, peca]) => {
    if (peca.erro) return `    ${JSON.stringify(nome)}: ${JSON.stringify(peca)}`;
    const { partes, ...resto } = peca;
    const linhasDasPartes = Object.entries(partes).map(([parte, medida]) => `        ${JSON.stringify(parte)}: ${JSON.stringify(medida)}`);
    const cabeca = JSON.stringify(resto).slice(0, -1);
    return `    ${JSON.stringify(nome)}: ${cabeca},\n      "partes": {\n${linhasDasPartes.join(',\n')}\n      }}`;
  });
  const { pecas, ...cabecalho } = retrato;
  const cab = Object.entries(cabecalho).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  return `{\n${cab.join(',\n')},\n  "pecas": {\n${blocos.join(',\n')}\n  }\n}\n`;
}

export function lerRetrato(arquivo) {
  const retrato = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (retrato.formato !== FORMATO) throw new Error(`${arquivo} não é um retrato do acervo (formato '${retrato.formato}', esperado '${FORMATO}').`);
  return retrato;
}

/* ---------- linha de comando ---------- */

function uso(mensagem) {
  process.stderr.write(`retrato-do-acervo: ${mensagem}\n`
    + 'uso: node tools/modelar/retrato-do-acervo.mjs [--gravar <arquivo>] [--comparar <arquivo>] [--pecas=a,b] [--json] [--base=<texto>]\n');
  return 2;
}

/* `--comparar arquivo` e `--gravar arquivo` com espaço viram `--comparar=arquivo`, a forma que a leitura de argumentos aceita. */
function juntarValores(argv) {
  const saida = [];
  for (let i = 0; i < argv.length; i += 1) {
    if ((argv[i] === '--comparar' || argv[i] === '--gravar') && argv[i + 1] && !argv[i + 1].startsWith('-')) {
      saida.push(`${argv[i]}=${argv[i + 1]}`);
      i += 1;
    } else saida.push(argv[i]);
  }
  return saida;
}

export async function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(juntarValores(argv), { opcoes: ['gravar', 'comparar', 'pecas', 'base'], bandeiras: ['json'] });
  } catch (erro) {
    return uso(erro.message);
  }
  const { pecasDoAcervo } = await import('./guardas/guarda-acervo.mjs');
  const todas = pecasDoAcervo();
  const pedidas = lido.opcao('pecas');
  const escolhidas = pedidas === null ? todas : pedidas.split(',').map((p) => p.trim()).filter(Boolean);
  const fora = escolhidas.filter((p) => !todas.includes(p));
  if (fora.length) return uso(`peça(s) fora do acervo: ${fora.join(', ')}.`);
  const arquivoDeAntes = lido.opcao('comparar');
  let antes = null;
  if (arquivoDeAntes !== null) {
    if (!existsSync(arquivoDeAntes)) return uso(`retrato de antes não encontrado: ${arquivoDeAntes}`);
    try { antes = lerRetrato(arquivoDeAntes); } catch (erro) { return uso(erro.message); }
  }

  const inicio = performance.now();
  const retrato = await retratarPecas(escolhidas);
  const base = lido.opcao('base');
  if (base !== null) retrato.base = base;
  const segundos = (performance.now() - inicio) / 1000;

  const arquivoGravado = lido.opcao('gravar');
  if (arquivoGravado !== null) {
    mkdirSync(dirname(resolve(arquivoGravado)), { recursive: true });
    writeFileSync(arquivoGravado, serializarRetrato(retrato));
  }
  if (lido.bandeira('json') && arquivoGravado === null && antes === null) {
    process.stdout.write(serializarRetrato(retrato));
    return 0;
  }
  const falhas = Object.entries(retrato.pecas).filter(([, p]) => p.erro);
  process.stdout.write(`retrato de ${escolhidas.length} peça(s) em ${segundos.toFixed(1).replace('.', ',')} s`
    + `${arquivoGravado ? `, gravado em ${arquivoGravado}` : ''}.\n`);
  for (const [nome, p] of falhas) process.stdout.write(`  ${nome}: ${p.erro}\n`);
  if (antes === null) {
    if (arquivoGravado === null) {
      for (const [nome, p] of Object.entries(retrato.pecas).filter(([, q]) => !q.erro)) {
        process.stdout.write(`  ${nome}: ${p.faces} faces · ${p.facesFinas} finas · ${Object.keys(p.partes).length} partes · volume ${numero(p.volume)} m³ · ${p.tempoMs} ms\n`);
      }
    }
    return 0;
  }
  const comparacao = compararRetratos(antes, retrato, { apenas: pedidas === null ? null : escolhidas });
  process.stdout.write(`${formatarComparacao(comparacao)}\n`);
  return comparacao.diferencas.some((d) => d.grave) ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await comoCLI(process.argv.slice(2));
}
