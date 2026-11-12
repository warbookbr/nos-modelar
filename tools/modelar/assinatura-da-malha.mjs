#!/usr/bin/env node
/* assinatura-da-malha.mjs — a assinatura de cada parte e da peça inteira, e a comparação de duas rodadas.
 *
 * POR QUE ELE EXISTE. Provar "a malha ficou idêntica" depois de uma mudança no núcleo ou na receita (um envio que só deve mexer no
 * tempo, uma divisão de arquivo, um passo trocado por outro) pedia um script de hash por rodada, escrito fora do repositório e
 * diferente a cada vez. Aqui a prova é um comando: grava a assinatura de uma rodada e confere a seguinte contra ela, parte por parte.
 *
 * O QUE A ASSINATURA É. Para cada parte, o sha256 do conjunto de faces dela, cada face como a lista dos cantos em nanômetro, na ordem do
 * contorno e começando pelo menor canto, e as faces em ordem. A numeração de vértices e de faces não entra: duas rodadas que numeram
 * diferente e produzem a mesma superfície têm a mesma assinatura, e uma face que vira outra, um canto que anda 1 nm ou o sentido do
 * contorno que troca, não. A peça é o sha256 das assinaturas das partes por nome. Cada parte leva também a contagem de faces, de
 * vértices usados e a caixa em milímetro, para a comparação dizer o tamanho do que mudou, e não só que mudou.
 *
 *   node tools/modelar/assinatura-da-malha.mjs <receita | esboço> [--opcao=<n>] [--salvar=<arquivo.json>] [--contra=<arquivo.json>] [--json] [--cache]
 *   node tools/modelar/assinatura-da-malha.mjs --comparar=<a.json> --com=<b.json> [--json]
 *
 * Sai com 0 quando a assinatura é igual à do `--contra` (ou quando não há contra), com 1 quando a malha difere, e com 2 quando o comando
 * foi mal usado. A receita é executada de novo, sem o cache das ferramentas de medida (que guarda o resultado de uma fonte já medida e
 * provaria a si mesmo), salvo com `--cache`. Nada é escrito sem `--salvar`. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeEntrada, lerEntradaDeMedida, opcaoDaLinha } from './entrada-de-medida.mjs';

export const FORMATO_DA_ASSINATURA = 'mecanifica.assinatura-da-malha@1';
const NM = 1e9;
const MM = 1000;
const SEM_PARTE = '(sem parte)';
const sha = (texto) => createHash('sha256').update(texto).digest('hex');
const arredMm = (x) => Math.round(x * MM * 1000) / 1000 + 0;

/* a face como texto: cada canto em nanômetro, na ordem do contorno, a partir do menor canto (a ordem de numeração não conta) */
function textoDaFace(cantos) {
  const nm = cantos.map(([x, y, z]) => [Math.round(x * NM) + 0, Math.round(y * NM) + 0, Math.round(z * NM) + 0]);
  let menor = 0;
  for (let i = 1; i < nm.length; i++) {
    const a = nm[i]; const b = nm[menor];
    if (a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])))) menor = i;
  }
  return [...nm.slice(menor), ...nm.slice(0, menor)].map((c) => c.join(',')).join('|');
}

/**
 * assinaturaDoNeutro(neutro) -> { formato, peca, faces, partes: { [nome]: { assinatura, faces, vertices, caixaMm } } }
 * `neutro` é o estado de uma receita executada (`V` e `F`, mapas por id; cada face com os cantos em `vs` e a parte em `parte`).
 */
export function assinaturaDoNeutro(neutro) {
  const V = neutro.V instanceof Map ? neutro.V : new Map(Object.entries(neutro.V ?? {}));
  const F = neutro.F instanceof Map ? neutro.F : new Map(Object.entries(neutro.F ?? {}));
  const porParte = new Map();
  for (const [id, face] of F) {
    const ids = (face?.vs ?? face).map(Number);
    const cantos = ids.map((v) => {
      const p = V.get(v) ?? V.get(String(v));
      if (!p) throw new Error(`a face ${id} cita o vértice ${v}, que não existe`);
      return p;
    });
    const nome = face?.parte ?? SEM_PARTE;
    if (!porParte.has(nome)) porParte.set(nome, { textos: [], vertices: new Set(), min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
    const parte = porParte.get(nome);
    parte.textos.push(textoDaFace(cantos));
    ids.forEach((v, i) => {
      parte.vertices.add(v);
      for (let k = 0; k < 3; k++) { parte.min[k] = Math.min(parte.min[k], cantos[i][k]); parte.max[k] = Math.max(parte.max[k], cantos[i][k]); }
    });
  }
  const partes = {};
  for (const nome of [...porParte.keys()].sort()) {
    const p = porParte.get(nome);
    p.textos.sort();
    partes[nome] = {
      assinatura: `sha256:${sha(p.textos.join('\n'))}`,
      faces: p.textos.length,
      vertices: p.vertices.size,
      caixaMm: { min: p.min.map(arredMm), max: p.max.map(arredMm) },
    };
  }
  const resumo = Object.entries(partes).map(([nome, p]) => `${nome}:${p.assinatura}`).join('\n');
  return { formato: FORMATO_DA_ASSINATURA, peca: `sha256:${sha(resumo)}`, faces: F.size, partes };
}

const mesmaCaixa = (a, b) => [...a.min, ...a.max].every((v, i) => v === [...b.min, ...b.max][i]);

/**
 * compararAssinaturas(a, b) -> { identicas, pecaIgual, iguais: [nome], diferentes: [{ nome, de, para, deltaFaces, caixaMudou }], soEmA, soEmB }
 * `de` e `para` são as contagens de faces e a caixa de cada lado, para dizer o tamanho do que mudou.
 */
export function compararAssinaturas(a, b) {
  for (const [nome, s] of [['a', a], ['b', b]]) {
    if (s?.formato !== FORMATO_DA_ASSINATURA) throw new Error(`a assinatura ${nome} não é ${FORMATO_DA_ASSINATURA}`);
  }
  const iguais = []; const diferentes = []; const soEmA = []; const soEmB = [];
  for (const nome of Object.keys(a.partes)) {
    const pb = b.partes[nome];
    if (!pb) { soEmA.push(nome); continue; }
    const pa = a.partes[nome];
    if (pa.assinatura === pb.assinatura) { iguais.push(nome); continue; }
    diferentes.push({
      nome,
      de: { faces: pa.faces, vertices: pa.vertices, caixaMm: pa.caixaMm },
      para: { faces: pb.faces, vertices: pb.vertices, caixaMm: pb.caixaMm },
      deltaFaces: pb.faces - pa.faces,
      caixaMudou: !mesmaCaixa(pa.caixaMm, pb.caixaMm),
    });
  }
  for (const nome of Object.keys(b.partes)) if (!a.partes[nome]) soEmB.push(nome);
  const pecaIgual = a.peca === b.peca;
  return { identicas: pecaIgual && !diferentes.length && !soEmA.length && !soEmB.length, pecaIgual, iguais, diferentes, soEmA, soEmB };
}

export function formatarAssinatura(nome, s) {
  const linhas = [`${nome}: ${s.peca.slice(0, 19)}…, ${Object.keys(s.partes).length} partes, ${s.faces} faces`];
  for (const [parte, p] of Object.entries(s.partes)) linhas.push(`  ${parte.padEnd(32)} ${p.assinatura.slice(7, 19)}  ${String(p.faces).padStart(6)} faces`);
  return linhas.join('\n');
}

export function formatarComparacao(r, rotulos = ['antes', 'depois']) {
  if (r.identicas) return `malha idêntica: as ${r.iguais.length} partes têm a mesma assinatura em ${rotulos[0]} e ${rotulos[1]}.`;
  const linhas = [`malha DIFERENTE entre ${rotulos[0]} e ${rotulos[1]}: ${r.diferentes.length} parte(s) mudaram, ${r.soEmA.length} só em ${rotulos[0]}, ${r.soEmB.length} só em ${rotulos[1]}, ${r.iguais.length} iguais.`];
  for (const d of r.diferentes) {
    const faces = d.deltaFaces === 0 ? `${d.de.faces} faces nas duas` : `${d.de.faces} para ${d.para.faces} faces (${d.deltaFaces > 0 ? '+' : ''}${d.deltaFaces})`;
    linhas.push(`  ${d.nome}: ${faces}${d.caixaMudou ? `; a caixa mudou de [${d.de.caixaMm.min}] [${d.de.caixaMm.max}] para [${d.para.caixaMm.min}] [${d.para.caixaMm.max}] mm` : '; a caixa é a mesma (a mudança é de forma por dentro dela, de triangulação ou de sentido)'}`);
  }
  for (const nome of r.soEmA) linhas.push(`  ${nome}: só em ${rotulos[0]}`);
  for (const nome of r.soEmB) linhas.push(`  ${nome}: só em ${rotulos[1]}`);
  return linhas.join('\n');
}

function lerArquivoDeAssinatura(caminho) {
  const abs = resolve(caminho);
  if (!existsSync(abs)) throw new ErroDeEntrada(`${caminho} não existe`);
  let dado;
  try { dado = JSON.parse(readFileSync(abs, 'utf8')); } catch (erro) { throw new ErroDeEntrada(`${caminho} não é JSON: ${erro.message}`); }
  if (dado?.formato !== FORMATO_DA_ASSINATURA) throw new ErroDeEntrada(`${caminho} não é uma assinatura (${FORMATO_DA_ASSINATURA})`);
  return dado;
}

/** A assinatura de uma receita ou esboço, executada agora; `cache: true` aceita o resultado guardado das ferramentas de medida. */
export async function assinaturaDaEntrada(alvo, { opcao = 1, cache = false } = {}) {
  const entrada = await lerEntradaDeMedida(alvo, { opcao, cache, montagem: false });
  return { entrada, assinatura: assinaturaDoNeutro(entrada.executar().neutro) };
}

const uso = (mensagem) => { process.stderr.write(`assinatura-da-malha: ${mensagem}\n`); return 2; };

export async function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['opcao', 'salvar', 'contra', 'comparar', 'com'],
      bandeiras: ['json', 'cache'],
      posicional: { nome: 'a receita', obrigatorio: false },
    });
  } catch (erro) { return uso(erro.message); }
  const json = lido.bandeira('json');
  try {
    if (lido.opcao('comparar') !== null || lido.opcao('com') !== null) {
      if (lido.posicional) return uso('--comparar compara dois arquivos de assinatura; não leva uma receita.');
      if (lido.opcao('comparar') === null || lido.opcao('com') === null) return uso('--comparar=<a.json> pede também --com=<b.json>.');
      const r = compararAssinaturas(lerArquivoDeAssinatura(lido.opcao('comparar')), lerArquivoDeAssinatura(lido.opcao('com')));
      process.stdout.write(json ? `${JSON.stringify(r, null, 2)}\n` : `${formatarComparacao(r)}\n`);
      return r.identicas ? 0 : 1;
    }
    if (!lido.posicional) return uso('diga a receita ou o esboço, ou use --comparar=<a.json> --com=<b.json>.');
    const inicio = performance.now();
    const { assinatura } = await assinaturaDaEntrada(lido.posicional, { opcao: opcaoDaLinha(lido.opcao('opcao')), cache: lido.bandeira('cache') });
    const segundos = Math.round((performance.now() - inicio) / 100) / 10;
    if (lido.opcao('salvar')) writeFileSync(resolve(lido.opcao('salvar')), `${JSON.stringify(assinatura, null, 2)}\n`);
    let codigo = 0;
    let comparacao = null;
    if (lido.opcao('contra')) {
      comparacao = compararAssinaturas(lerArquivoDeAssinatura(lido.opcao('contra')), assinatura);
      codigo = comparacao.identicas ? 0 : 1;
    }
    if (json) process.stdout.write(`${JSON.stringify({ assinatura, ...(comparacao ? { comparacao } : {}) }, null, 2)}\n`);
    else {
      process.stdout.write(`${formatarAssinatura(lido.posicional, assinatura)}\n`);
      if (comparacao) process.stdout.write(`${formatarComparacao(comparacao, ['--contra', 'agora'])}\n`);
    }
    process.stderr.write(`assinatura-da-malha: receita executada e assinada em ${segundos} s${lido.opcao('salvar') ? `; gravada em ${lido.opcao('salvar')}` : ''}\n`);
    return codigo;
  } catch (erro) {
    if (erro instanceof ErroDeEntrada) return uso(erro.message);
    throw erro;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await comoCLI(process.argv.slice(2));
}
