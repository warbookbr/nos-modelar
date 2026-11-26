#!/usr/bin/env node
/* proporcoes.mjs — a fonte única das medidas de uma montagem, e a conferência de que os outros lugares a seguem.
 *
 * Medido em 2026-11-14 (plano da modelagem de robô, atrito "medidas escritas duas vezes"): trocar uma proporção do braço pediu a
 * mudança à mão de quatro arquivos, e nenhuma ferramenta acusaria o que ficasse para trás. Este arquivo é o lugar único. A pasta da
 * montagem tem um `proporcoes.json` (`mecanifica.proporcoes@1`) com:
 *
 *   medidas   nome para número em unidade da montagem, ou para uma fórmula "=a + b / 2" sobre outras medidas (sem eval: só números,
 *             nomes, + - * / e parênteses). A escala de referência (a altura total, por exemplo) é uma medida como as outras.
 *   andaime   `arquivo` e `modelo`: o `andaime.json` (forma-global N2) escrito com fórmulas no lugar dos números que dependem de
 *             medida ("=alturaDoOmbro - comprimentoDoBraco"). O arquivo do andaime é GERADO daqui, volumes e portas.
 *   esqueleto árvore de juntas (ver esqueleto.mjs): o andaime e as articulações dela também são conferidos e escritos aqui.
 *   receitas  pastas varridas atrás de linhas `chave: 330, // @proporcao nomeDaMedida`: o número daquela linha é o valor da medida.
 *             A receita continua lendo a sua TABELA de sempre; a TABELA é que é escrita daqui, e não o contrário.
 *
 * Dois comandos, os dois sem conhecer objeto algum:
 *   npm run proporcoes -- --proporcoes=<proporcoes.json>              confere: sai com 1 e diz, por lugar, o recebido, o esperado e o comando
 *   npm run proporcoes -- --proporcoes=<proporcoes.json> --escrever   reescreve o andaime e os números marcados das receitas
 *
 * A conferência acusa o andaime editado só nele, o número da TABELA editado só nela, a medida trocada só no `proporcoes.json` (andaime
 * e TABELA ficam para trás) e a marca que cita uma medida que não existe. Não cobre prosa (comentário e texto do PLANO que dizem
 * "330 mm"), nem o esboço de opções de proporção, que lê as próprias medidas. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { conferirEsqueleto, escreverEsqueleto } from './esqueleto.mjs';

export const FORMATO_DAS_PROPORCOES = 'mecanifica.proporcoes@1';
const CASAS = 6;
const TOLERANCIA = 1e-6;
const MARCA = /^(\s*)(["']?)([A-Za-z_$][\w$]*)\2(\s*:\s*)(-?\d+(?:\.\d+)?)(\s*,?\s*\/\/\s*@proporcao\s+)([A-Za-z_]\w*)/;

export class ErroDasProporcoes extends Error {
  constructor(recebido, esperado, comando) {
    super(`recebi ${recebido}; esperava ${esperado}.\n  conserte com: ${comando}`);
    this.name = 'ErroDasProporcoes';
  }
}

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const arred = (n) => Number(n.toFixed(CASAS));
const caminhoCurto = (a) => a.replace(/\\/g, '/');

/* ---------- fórmula ---------- */

function tokens(texto) {
  const saida = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|([-+*/()]))/y;
  let pos = 0;
  while (pos < texto.length) {
    re.lastIndex = pos;
    const m = re.exec(texto);
    if (!m) {
      if (/^\s*$/.test(texto.slice(pos))) break;
      throw new ErroDasProporcoes(`'${texto.slice(pos).trim()[0]}' na fórmula "=${texto}"`, 'números, nomes de medida, + - * / e parênteses', 'reescreva a fórmula só com esses símbolos');
    }
    pos = re.lastIndex;
    if (m[1] !== undefined) saida.push({ t: 'n', v: Number(m[1]) });
    else if (m[2] !== undefined) saida.push({ t: 'i', v: m[2] });
    else saida.push({ t: m[3] });
  }
  return saida;
}

/** Avalia `texto` (sem o "=") com `valorDe(nome)`; parser de descida recursiva, sem eval. */
export function avaliarFormula(texto, valorDe) {
  const ts = tokens(texto);
  let i = 0;
  const falha = (o) => { throw new ErroDasProporcoes(`a fórmula "=${texto}" (${o})`, 'uma expressão completa, como "=a - b / 2"', 'reescreva a fórmula'); };
  const expr = () => {
    let v = termo();
    while (ts[i] && (ts[i].t === '+' || ts[i].t === '-')) { const op = ts[i++].t; const d = termo(); v = op === '+' ? v + d : v - d; }
    return v;
  };
  const termo = () => {
    let v = unario();
    while (ts[i] && (ts[i].t === '*' || ts[i].t === '/')) {
      const op = ts[i++].t; const d = unario();
      if (op === '/' && d === 0) falha('divisão por zero');
      v = op === '*' ? v * d : v / d;
    }
    return v;
  };
  const unario = () => {
    if (ts[i] && ts[i].t === '-') { i++; return -unario(); }
    if (ts[i] && ts[i].t === '+') { i++; return unario(); }
    return atomo();
  };
  const atomo = () => {
    const t = ts[i++];
    if (!t) return falha('termina antes da hora');
    if (t.t === 'n') return t.v;
    if (t.t === 'i') return valorDe(t.v);
    if (t.t === '(') { const v = expr(); if (!ts[i] || ts[i++].t !== ')') falha('parêntese sem fechar'); return v; }
    return falha(`'${t.t}' fora do lugar`);
  };
  const v = expr();
  if (i < ts.length) falha(`sobra '${ts[i].t === 'n' ? ts[i].v : ts[i].v ?? ts[i].t}'`);
  if (!Number.isFinite(v)) falha('o resultado não é número');
  return v;
}

/* ---------- leitura e resolução ---------- */

export function lerProporcoes(caminho) {
  const comando = `confira o arquivo ${caminhoCurto(caminho)} contra o formato ${FORMATO_DAS_PROPORCOES}`;
  if (!existsSync(caminho)) throw new ErroDasProporcoes(`o arquivo ${caminhoCurto(caminho)}, que não existe`, 'um proporcoes.json', 'npm run proporcoes -- --proporcoes=<pasta-da-montagem>/proporcoes.json');
  let doc;
  try { doc = JSON.parse(readFileSync(caminho, 'utf8')); } catch (e) { throw new ErroDasProporcoes(`JSON inválido em ${caminhoCurto(caminho)} (${e.message})`, 'JSON válido', comando); }
  if (!objeto(doc) || doc.formato !== FORMATO_DAS_PROPORCOES) throw new ErroDasProporcoes(`formato ${JSON.stringify(doc?.formato)}`, `"${FORMATO_DAS_PROPORCOES}"`, comando);
  if (!objeto(doc.medidas) || !Object.keys(doc.medidas).length) throw new ErroDasProporcoes('medidas ausentes ou vazias', 'um objeto nome para número ou "=fórmula"', comando);
  for (const [nome, v] of Object.entries(doc.medidas)) {
    if (!/^[A-Za-z_]\w*$/.test(nome)) throw new ErroDasProporcoes(`o nome de medida '${nome}'`, 'letras, dígitos e _, sem começar por dígito', comando);
    if (!(typeof v === 'number' && Number.isFinite(v)) && !(typeof v === 'string' && v.startsWith('='))) throw new ErroDasProporcoes(`medidas.${nome} = ${JSON.stringify(v)}`, 'um número ou uma fórmula "=..."', comando);
  }
  if (doc.andaime !== undefined && !(objeto(doc.andaime) && typeof doc.andaime.arquivo === 'string' && objeto(doc.andaime.modelo))) {
    throw new ErroDasProporcoes('andaime sem "arquivo" e "modelo"', '{"arquivo": "andaime.json", "modelo": {...com "=fórmula"...}}', comando);
  }
  if (doc.receitas !== undefined && !(Array.isArray(doc.receitas) && doc.receitas.every((p) => typeof p === 'string'))) throw new ErroDasProporcoes('receitas fora de uma lista de pastas', '["partes"]', comando);
  return doc;
}

/** Todas as medidas como número, resolvendo as fórmulas por dependência e recusando ciclo e nome desconhecido. */
export function resolverMedidas(doc, comando = 'npm run proporcoes -- --proporcoes=<proporcoes.json>') {
  const dado = doc.medidas;
  const feitas = {};
  const pilha = [];
  const valor = (nome) => {
    if (!(nome in dado)) {
      const nomes = Object.keys(dado);
      throw new ErroDasProporcoes(`a medida '${nome}'`, `um destes nomes: ${nomes.slice(0, 12).join(', ')}${nomes.length > 12 ? ', ...' : ''}`, `acrescente '${nome}' em "medidas" ou corrija o nome`);
    }
    if (nome in feitas) return feitas[nome];
    if (pilha.includes(nome)) throw new ErroDasProporcoes(`o ciclo ${[...pilha.slice(pilha.indexOf(nome)), nome].join(' -> ')}`, 'medidas que dependem só de medidas já definidas', `quebre o ciclo em "medidas" de ${comando.split(' ').pop()}`);
    pilha.push(nome);
    const bruto = dado[nome];
    const v = typeof bruto === 'number' ? bruto : avaliarFormula(bruto.slice(1), valor);
    pilha.pop();
    feitas[nome] = arred(v);
    return feitas[nome];
  };
  for (const nome of Object.keys(dado)) valor(nome);
  return feitas;
}

/** O modelo do andaime com cada "=fórmula" trocada pelo número. */
export function gerarAndaime(doc, medidas) {
  const ir = (no, onde) => {
    if (typeof no === 'string' && no.startsWith('=')) {
      try { return arred(avaliarFormula(no.slice(1), (n) => { if (!(n in medidas)) throw new ErroDasProporcoes(`a medida '${n}' em andaime.modelo${onde}`, 'um nome de "medidas"', `acrescente '${n}' em "medidas" ou corrija o nome`); return medidas[n]; })); }
      catch (e) { if (e instanceof ErroDasProporcoes && !/andaime\.modelo/.test(e.message)) throw new ErroDasProporcoes(`${e.message.split(';')[0].replace(/^recebi /, '')} em andaime.modelo${onde}`, 'uma fórmula válida', 'corrija a fórmula'); throw e; }
    }
    if (Array.isArray(no)) return no.map((x, i) => ir(x, `${onde}[${i}]`));
    if (objeto(no)) return Object.fromEntries(Object.entries(no).map(([k, v]) => [k, ir(v, `${onde}.${k}`)]));
    return no;
  };
  return ir(doc.andaime.modelo, '');
}

function arquivosDeCodigo(pasta) {
  const saida = [];
  const ir = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') ir(p); } else if (/\.(m?js)$/.test(e.name)) saida.push(p);
    }
  };
  if (existsSync(pasta)) ir(pasta);
  return saida;
}

/** Cada linha `chave: numero, // @proporcao medida` das pastas de receitas. */
export function ligacoesDasReceitas(doc, base) {
  const ligacoes = [];
  for (const pasta of doc.receitas ?? []) {
    for (const arquivo of arquivosDeCodigo(resolve(base, pasta))) {
      readFileSync(arquivo, 'utf8').split(/\r?\n/).forEach((texto, i) => {
        const m = MARCA.exec(texto);
        if (m) ligacoes.push({ arquivo, linha: i + 1, chave: m[3], valor: Number(m[5]), medida: m[7] });
      });
    }
  }
  return ligacoes;
}

export function primeiraDiferenca(a, b, onde = '') {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= TOLERANCIA ? null : { onde, recebido: a, esperado: b };
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return { onde: `${onde}.length`, recebido: a.length, esperado: b.length };
    for (let i = 0; i < a.length; i++) { const d = primeiraDiferenca(a[i], b[i], `${onde}[${i}]`); if (d) return d; }
    return null;
  }
  if (objeto(a) && objeto(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) return { onde: `${onde}.${k}`, recebido: '(ausente)', esperado: JSON.stringify(b[k]) };
      if (!(k in b)) return { onde: `${onde}.${k}`, recebido: JSON.stringify(a[k]), esperado: '(ausente)' };
      const d = primeiraDiferenca(a[k], b[k], `${onde}.${k}`); if (d) return d;
    }
    return null;
  }
  return JSON.stringify(a) === JSON.stringify(b) ? null : { onde, recebido: JSON.stringify(a), esperado: JSON.stringify(b) };
}

/** Lista as divergências entre as proporções, o andaime e as TABELAs; vazia quando tudo concorda. */
export function conferirProporcoes(caminho) {
  const doc = lerProporcoes(caminho);
  const base = dirname(resolve(caminho));
  const comando = `npm run proporcoes -- --proporcoes=${caminhoCurto(caminho)} --escrever`;
  const medidas = resolverMedidas(doc, caminho);
  const divergencias = [];
  if (doc.andaime) {
    const arquivo = resolve(base, doc.andaime.arquivo);
    if (!existsSync(arquivo)) {
      divergencias.push({ lugar: caminhoCurto(doc.andaime.arquivo), mensagem: new ErroDasProporcoes(`o andaime ${caminhoCurto(doc.andaime.arquivo)}, que não existe`, 'o andaime gerado das proporções', comando).message });
    } else {
      const d = primeiraDiferenca(JSON.parse(readFileSync(arquivo, 'utf8')), gerarAndaime(doc, medidas));
      if (d) divergencias.push({ lugar: `${caminhoCurto(doc.andaime.arquivo)}${d.onde}`, mensagem: new ErroDasProporcoes(`${caminhoCurto(doc.andaime.arquivo)}${d.onde} = ${d.recebido}`, `${d.esperado}, o que as proporções dão`, comando).message });
    }
  }
  for (const l of ligacoesDasReceitas(doc, base)) {
    const lugar = `${caminhoCurto(relative(base, l.arquivo))}:${l.linha}`;
    if (!(l.medida in medidas)) {
      divergencias.push({ lugar, mensagem: new ErroDasProporcoes(`${lugar} marca '@proporcao ${l.medida}', que não é medida`, `um destes nomes: ${Object.keys(medidas).slice(0, 12).join(', ')}`, `corrija o nome na marca ou acrescente '${l.medida}' em "medidas" de ${caminhoCurto(caminho)}`).message });
    } else if (Math.abs(l.valor - medidas[l.medida]) > TOLERANCIA) {
      divergencias.push({ lugar, mensagem: new ErroDasProporcoes(`${lugar}: ${l.chave} = ${l.valor}`, `${medidas[l.medida]}, o valor de '${l.medida}'`, comando).message });
    }
  }
  divergencias.push(...conferirEsqueleto(caminho, doc));
  return divergencias;
}

/** Reescreve o andaime e os números marcados; devolve o que mudou. */
export function escreverProporcoes(caminho) {
  const doc = lerProporcoes(caminho);
  const base = dirname(resolve(caminho));
  const medidas = resolverMedidas(doc, caminho);
  const mudou = [];
  if (doc.andaime) {
    const arquivo = resolve(base, doc.andaime.arquivo);
    const texto = `${JSON.stringify(gerarAndaime(doc, medidas), null, 2)}\n`;
    if (!existsSync(arquivo) || readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n') !== texto) { writeFileSync(arquivo, texto); mudou.push(caminhoCurto(doc.andaime.arquivo)); }
  }
  const porArquivo = new Map();
  for (const l of ligacoesDasReceitas(doc, base)) {
    if (!(l.medida in medidas)) throw new ErroDasProporcoes(`${caminhoCurto(relative(base, l.arquivo))}:${l.linha} marca '@proporcao ${l.medida}', que não é medida`, `um destes nomes: ${Object.keys(medidas).slice(0, 12).join(', ')}`, `corrija o nome na marca ou acrescente '${l.medida}' em "medidas"`);
    if (!porArquivo.has(l.arquivo)) porArquivo.set(l.arquivo, []);
    porArquivo.get(l.arquivo).push(l);
  }
  for (const [arquivo, ls] of porArquivo) {
    const original = readFileSync(arquivo, 'utf8');
    const linhas = original.split('\n');
    let alterou = false;
    for (const l of ls) {
      const bruta = linhas[l.linha - 1];
      const fim = bruta.endsWith('\r') ? '\r' : '';
      const m = MARCA.exec(bruta.replace(/\r$/, ''));
      if (Math.abs(Number(m[5]) - medidas[l.medida]) <= TOLERANCIA) continue;
      const resto = bruta.replace(/\r$/, '').slice(m[0].length);
      linhas[l.linha - 1] = `${m[1]}${m[2]}${m[3]}${m[2]}${m[4]}${medidas[l.medida]}${m[6]}${m[7]}${resto}${fim}`;
      alterou = true;
    }
    if (alterou) { writeFileSync(arquivo, linhas.join('\n')); mudou.push(caminhoCurto(relative(base, arquivo))); }
  }
  mudou.push(...escreverEsqueleto(caminho, doc));
  return mudou;
}

const AJUDA = `uso: node tools/modelar/proporcoes.mjs --proporcoes=<proporcoes.json> [--escrever] [--json]
  sem --escrever confere o andaime e os números marcados das receitas contra as proporções; sai com 1 se divergirem.
  --escrever reescreve o andaime e os números marcados (// @proporcao nome) a partir das proporções.`;

export function comoCLI(argv, saida = (t) => process.stdout.write(`${t}
`)) {
  const args = lerArgumentos(argv, { opcoes: ['proporcoes'], bandeiras: ['escrever', 'json', 'ajuda'] });
  if (args.bandeira('ajuda')) { saida(AJUDA); return 0; }
  const caminho = args.opcao('proporcoes');
  if (!caminho) throw new ErroDasProporcoes('nenhum arquivo de proporções', '--proporcoes=<proporcoes.json>', 'npm run proporcoes -- --proporcoes=<pasta-da-montagem>/proporcoes.json');
  if (args.bandeira('escrever')) {
    const mudou = escreverProporcoes(caminho);
    saida(mudou.length ? `escrito: ${mudou.join(', ')}` : 'nada a escrever: tudo já concorda com as proporções');
    return 0;
  }
  const divergencias = conferirProporcoes(caminho);
  if (args.bandeira('json')) saida(JSON.stringify({ divergencias }, null, 2));
  else if (!divergencias.length) saida('proporções, andaime e TABELAs concordam');
  else { saida(`${divergencias.length} divergência(s):`); for (const d of divergencias) saida(`- ${d.mensagem}`); }
  return divergencias.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = comoCLI(process.argv.slice(2)); } catch (erro) { process.stderr.write(`${erro.message}\n`); process.exitCode = 2; }
}
