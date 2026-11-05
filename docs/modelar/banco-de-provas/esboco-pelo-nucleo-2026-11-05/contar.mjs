#!/usr/bin/env node
/* contar.mjs — as contagens do inventário do esboço (plano "Esboço pelo núcleo", fatia 1), reexecutáveis.
 *
 *   node docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/contar.mjs [usuarios|recursos|receitas|tudo] [--json]
 *
 * `usuarios`: o grafo de import do repositório (import estático, `export ... from` e `import('literal')`), quem fora de
 * `modulos/esboco/` importa o módulo direto e quem chega a ele por outro arquivo, agrupado por papel, e os scripts do
 * package.json cuja entrada chega ao módulo; mais os arquivos que citam `npm run esboco` ou um `.esboco.json`.
 * `recursos`: os recursos usados nos `.esboco.json` versionados, por grupo (testes do módulo, fixtures de ferramenta, uso real).
 * `receitas`: as receitas de `procedural/` que declaram `REFINA.esboco` ou `REFINA.andaime`.
 * Lê só arquivos versionados (`git ls-files`); não escreve nada. Mesma árvore, mesma saída. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MODULO = 'modulos/esboco/';
const arquivos = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean).sort();
const ler = (c) => readFileSync(join(REPO, c), 'utf8');
const args = process.argv.slice(2);
const json = args.includes('--json');
const parte = args.find((a) => !a.startsWith('--')) ?? 'tudo';

/* ---------- papel de cada arquivo ---------- */

const PACOTE_DO_CRITICO = new Set(['tools/modelar/vistas-para-critica.mjs', 'tools/modelar/sobreposicao-de-cortes.mjs']);
export function papel(c) {
  if (c.startsWith('.claude/skills/')) return 'skill';
  if (c.startsWith('.claude/agents/')) return 'agente';
  if (/(\.test\.|\/tests?\/|^tools\/fixtures\/|malha-de-prova)/.test(c)) return 'teste';
  if (PACOTE_DO_CRITICO.has(c)) return 'pacote do crítico';
  if (c.startsWith('procedural/pecas/')) return 'receita';
  if (c.startsWith('procedural/familias/')) return 'família';
  if (c.startsWith('procedural/')) return 'núcleo procedural';
  if (c.startsWith('src/')) return 'biblioteca de autoria';
  if (c.startsWith('tools/')) return 'ferramenta';
  if (c.startsWith('docs/') || c.endsWith('.md')) return 'documento';
  return 'configuração';
}

/* ---------- o grafo de import ---------- */

const CODIGO = /\.(m?js|ts|cjs)$/;
const PADROES = [
  /(?:^|[^\w.])(?:import|export)\s[^'"`;]*?\sfrom\s*['"]([^'"]+)['"]/g,
  /(?:^|[^\w.])import\s*['"]([^'"]+)['"]/g,
  /import\(\s*['"]([^'"]+)['"]\s*\)/g,
];
function importsDe(c) {
  const texto = ler(c);
  const saida = new Set();
  for (const p of PADROES) {
    for (const m of texto.matchAll(p)) {
      if (!m[1].startsWith('.')) continue;
      const alvo = normalize(join(dirname(c), m[1]));
      saida.add(alvo);
    }
  }
  return [...saida];
}

export function grafo() {
  const codigo = arquivos.filter((c) => CODIGO.test(c) && !c.startsWith('node_modules/'));
  const arestas = new Map(codigo.map((c) => [c, importsDe(c)]));
  const diretos = new Map();
  for (const [c, alvos] of arestas) {
    if (c.startsWith(MODULO)) continue;
    const doModulo = alvos.filter((a) => a.startsWith(MODULO)).map((a) => a.slice(MODULO.length));
    if (doModulo.length) diretos.set(c, doModulo.sort());
  }
  /* quem chega ao módulo: o fecho reverso a partir dos diretos */
  const reverso = new Map();
  for (const [c, alvos] of arestas) for (const a of alvos) { if (!reverso.has(a)) reverso.set(a, []); reverso.get(a).push(c); }
  const alcanca = new Map([...diretos.keys()].map((c) => [c, null]));
  const fila = [...diretos.keys()];
  while (fila.length) {
    const atual = fila.shift();
    for (const quem of reverso.get(atual) ?? []) {
      if (quem.startsWith(MODULO) || alcanca.has(quem)) continue;
      alcanca.set(quem, atual);
      fila.push(quem);
    }
  }
  return { codigo, arestas, diretos, alcanca };
}

function usuarios() {
  const { diretos, alcanca } = grafo();
  const porPapel = (lista) => {
    const g = {};
    for (const c of lista) (g[papel(c)] ??= []).push(c);
    return Object.fromEntries(Object.entries(g).sort(([a], [b]) => a.localeCompare(b)));
  };
  const indiretos = [...alcanca.keys()].filter((c) => !diretos.has(c)).sort();
  const pkg = JSON.parse(ler('package.json')).scripts;
  const scripts = Object.entries(pkg).flatMap(([nome, cmd]) => {
    const m = /node\s+(\S+\.m?js)/.exec(cmd);
    if (!m) return [];
    const entrada = normalize(m[1]);
    if (!alcanca.has(entrada)) return [];
    return [{ nome, entrada, direto: diretos.has(entrada) }];
  });
  const citam = (re) => arquivos.filter((c) => !c.startsWith(MODULO) && /\.(md|m?js|ts|json|ya?ml)$/.test(c) && re.test(ler(c)));
  const npmEsboco = citam(/npm run esboco\b/);
  const leEsboco = arquivos.filter((c) => !c.startsWith(MODULO) && CODIGO.test(c) && /\.esboco\.json/.test(ler(c)));
  return {
    diretos: Object.fromEntries([...diretos].sort(([a], [b]) => a.localeCompare(b))),
    diretosPorPapel: porPapel([...diretos.keys()]),
    indiretosPorPapel: porPapel(indiretos),
    scripts,
    citamNpmRunEsboco: porPapel(npmEsboco),
    codigoCitaEsbocoJson: porPapel(leEsboco),
    usoDosArquivosDoModulo: Object.entries([...diretos.values()].flat().reduce((o, a) => ({ ...o, [a]: (o[a] ?? 0) + 1 }), {}))
      .sort(([, a], [, b]) => b - a),
  };
}

/* ---------- os recursos nos .esboco.json ---------- */

const TIPOS = ['caixa', 'cilindro', 'anel', 'cone', 'esfera', 'extrusao', 'loft', 'revolucao', 'tubo', 'envolve', 'familia'];
const POSICAO = ['centro', 'sobre', 'ponta', 'encosta', 'alinha', 'de', 'para', 'desloca', 'rotacao'];
const OUTROS_DA_FORMA = ['subtrai', 'cortador', 'ligar', 'encaixa', 'porta', 'unidade', 'material', 'estilo', 'substitui', 'oculto', 'opacidade', 'raio', 'chanfro', 'furos', 'furo', 'achatado', 'casca', 'suave'];
const RAIZ = ['parametros', 'pontos', 'contato', 'unidades', 'plano', 'modulos', 'estilos', 'simetrico', 'curso', 'materiais', 'geometria', 'explosao', 'legendas', 'vista', 'corte', 'previa', 'baseDoMestre', 'ladosPorEscala', 'enquadrar', 'linhasCentro', 'ocultar'];
const ehAncora = (v) => typeof v === 'string' && /^[A-Za-z_][\w-]*(\.[\w+-]+)+$/.test(v);

function grupoDoEsboco(c) {
  if (c.startsWith('modulos/esboco/tests/')) return 'testes do módulo';
  if (c.startsWith('tools/fixtures/')) return 'fixtures de ferramenta';
  if (c.startsWith('procedural/pecas/')) return 'opções de forma de peça';
  if (c.includes('/receitas-externas-')) return 'receitas externas traduzidas';
  return 'esboço detalhado do banco de provas';
}

/* o perfil numérico é convexo quando o produto vetorial das arestas não troca de sinal; o perfil com expressão não é julgado */
function convexo(perfil) {
  if (!Array.isArray(perfil) || !perfil.every((p) => Array.isArray(p) && p.every((x) => typeof x === 'number'))) return null;
  let sinal = 0;
  for (let i = 0; i < perfil.length; i += 1) {
    const [a, b, c] = [perfil[i], perfil[(i + 1) % perfil.length], perfil[(i + 2) % perfil.length]];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-12) continue;
    if (sinal === 0) sinal = Math.sign(z);
    else if (Math.sign(z) !== sinal) return false;
  }
  return true;
}

/* o que a forma pede além do tipo, para saber se a operação do núcleo a cobre */
function detalhes(f) {
  const d = [];
  const tem = (v) => v !== undefined && v !== 0 && v !== false;
  if (f.tipo === 'caixa') d.push(tem(f.chanfro) ? 'caixa.chanfro' : tem(f.raio) ? 'caixa.raio' : (f.furos || f.furo) ? 'caixa.furos' : 'caixa.simples');
  if (f.tipo === 'cilindro') d.push(f.achatado ? 'cilindro.achatado' : 'cilindro.simples');
  if (f.tipo === 'cone') d.push(tem(f.diametroTopo) ? 'cone.tronco' : 'cone.ponta');
  if (f.tipo === 'loft') {
    const secoes = Array.isArray(f.secoes) ? f.secoes : [];
    if (secoes.some((s) => s?.inclinacao)) d.push('loft.inclinacao');
    if (f.casca) d.push('loft.casca');
    if (f.suave) d.push('loft.suave');
    if (secoes.some((s) => Array.isArray(s?.tamanho) && s.tamanho[0] === 0 && s.tamanho[1] === 0)) d.push('loft.secao-ponto');
    if (secoes.some((s) => s?.centro)) d.push('loft.centro-deslocado');
    if (!d.some((x) => x.startsWith('loft.'))) d.push('loft.reto');
  }
  if (f.tipo === 'revolucao') d.push(f.suave ? 'revolucao.suave' : 'revolucao.reta');
  if (f.tipo === 'tubo') d.push(tem(f.raioCurva) ? 'tubo.raioCurva' : 'tubo.cantos-em-esfera');
  if (f.tipo === 'extrusao') { const c = convexo(f.perfil); d.push(c === null ? 'extrusao.perfil-por-expressao' : c ? 'extrusao.convexa' : 'extrusao.concava'); }
  if (f.tipo === 'familia') d.push(`familia.${f.familia}`);
  const r = Array.isArray(f.rotacao) ? f.rotacao.filter((x) => x !== 0 && x !== '0').length : (f.rotacao ? 1 : 0);
  if (r >= 2) d.push('rotacao.dois-ou-tres-eixos');
  return d;
}

function contarArquivo(bruto) {
  const n = { formas: 0, visiveis: 0, tipos: {}, posicao: {}, ancoras: 0, centroAncora: 0, centroEntre: 0, instancias: 0, componentes: {}, espelhos: 0, arranjos: {}, outros: {}, detalhes: {}, raiz: {}, pares: 0, contatoLigado: false, nivel: null, opcoes: 0, unidadesDeclaradas: new Set() };
  const conta = (o, k, q = 1) => { o[k] = (o[k] ?? 0) + q; };
  const ancorasEm = (v) => {
    if (ehAncora(v)) n.ancoras += 1;
    else if (Array.isArray(v)) v.forEach(ancorasEm);
    else if (v && typeof v === 'object') {
      if (ehAncora(v.ancora)) n.ancoras += 1;
      if (v.entre) v.entre.forEach(ancorasEm);
      for (const k of ['id', 'referencia', 'com']) if (ehAncora(v[k])) n.ancoras += 1;
    }
  };
  const forma = (f) => {
    if (!f || typeof f !== 'object') return;
    if (f.arranja) { conta(n.arranjos, f.arranja.modo ?? 'linear'); return; }
    if (f.espelha) { n.espelhos += 1; if (f.unidade) n.unidadesDeclaradas.add(f.unidade); return; }
    if (f.usa) { n.instancias += 1; conta(n.componentes, f.usa); }
    else if (TIPOS.includes(f.tipo)) {
      n.formas += 1; conta(n.tipos, f.tipo);
      for (const k of detalhes(f)) conta(n.detalhes, k);
      if (f.oculto !== true && f.cortador !== true) n.visiveis += 1;
    } else return;
    for (const k of POSICAO) if (f[k] !== undefined) conta(n.posicao, k);
    if (typeof f.centro === 'string' || (f.centro && !Array.isArray(f.centro) && f.centro.ancora)) n.centroAncora += 1;
    if (f.centro && !Array.isArray(f.centro) && f.centro.entre) n.centroEntre += 1;
    for (const k of ['centro', 'de', 'para', 'sobre', 'ponta', 'encosta', 'alinha']) if (f[k] !== undefined) ancorasEm(f[k]);
    if (f.tipo === 'tubo' && f.caminho) ancorasEm(f.caminho);
    for (const k of OUTROS_DA_FORMA) if (f[k] !== undefined && f[k] !== false) conta(n.outros, k);
    if (f.tipo === 'loft' && Array.isArray(f.secoes)) for (const s of f.secoes) if (s?.forma) conta(n.outros, `loft.secao.${s.forma}`);
    if (f.unidade) n.unidadesDeclaradas.add(f.unidade);
  };
  for (const k of RAIZ) if (bruto[k] !== undefined) conta(n.raiz, k);
  const contatos = [bruto.contato, ...(bruto.opcoes ?? []).map((o) => o?.contato)].filter(Boolean);
  n.contatoLigado = contatos.some((c) => c.usar === true);
  n.pares = contatos.reduce((s, c) => s + (Array.isArray(c.pares) ? c.pares.length : 0), 0);
  n.nivel = bruto.plano && typeof bruto.plano === 'object' ? bruto.plano.nivel ?? 'sem nivel' : (typeof bruto.plano === 'string' ? 'texto' : null);
  n.opcoes = (bruto.opcoes ?? []).length;
  (bruto.formas ?? []).forEach(forma);
  for (const o of bruto.opcoes ?? []) (o?.formas ?? []).forEach(forma);
  for (const m of Object.values(bruto.modulos ?? {})) (m?.formas ?? []).forEach(forma);
  return n;
}

function recursos() {
  const esbocos = arquivos.filter((c) => c.endsWith('.esboco.json'));
  const grupos = {};
  for (const c of esbocos) {
    const g = grupoDoEsboco(c);
    const t = (grupos[g] ??= { arquivos: 0, formas: 0, visiveis: 0, opcoes: 0, tipos: {}, arquivosPorTipo: {}, posicao: {}, arquivosPorPosicao: {}, ancoras: 0, centroAncora: 0, centroEntre: 0, instancias: 0, componentes: {}, espelhos: 0, arranjos: {}, outros: {}, arquivosPorOutro: {}, detalhes: {}, raiz: {}, contatoLigado: 0, pares: 0, nivel: {}, comUnidades: 0, unidades: 0, condutor: 0, detalhe: 0 });
    const n = contarArquivo(JSON.parse(ler(c)));
    t.arquivos += 1; t.formas += n.formas; t.visiveis += n.visiveis; t.opcoes += n.opcoes; t.ancoras += n.ancoras;
    t.centroAncora += n.centroAncora; t.centroEntre += n.centroEntre; t.instancias += n.instancias; t.espelhos += n.espelhos;
    const soma = (dest, orig) => { for (const [k, v] of Object.entries(orig)) dest[k] = (dest[k] ?? 0) + v; };
    const presenca = (dest, orig) => { for (const k of Object.keys(orig)) dest[k] = (dest[k] ?? 0) + 1; };
    soma(t.tipos, n.tipos); presenca(t.arquivosPorTipo, n.tipos); soma(t.posicao, n.posicao); presenca(t.arquivosPorPosicao, n.posicao);
    soma(t.componentes, n.componentes); soma(t.detalhes, n.detalhes); soma(t.arranjos, n.arranjos); soma(t.outros, n.outros); presenca(t.arquivosPorOutro, n.outros); soma(t.raiz, n.raiz);
    if (n.contatoLigado) t.contatoLigado += 1;
    t.pares += n.pares;
    if (n.nivel) t.nivel[n.nivel] = (t.nivel[n.nivel] ?? 0) + 1;
    if (n.unidadesDeclaradas.size) { t.comUnidades += 1; t.unidades += n.unidadesDeclaradas.size; }
    if (existsSync(join(REPO, `${c}.condutor.json`)) && arquivos.includes(`${c}.condutor.json`)) t.condutor += 1;
    if (/-detalhe-/.test(c)) t.detalhe += 1;
  }
  const ordenar = (o) => Object.fromEntries(Object.entries(o).sort(([a, x], [b, y]) => (y - x) || a.localeCompare(b)));
  for (const t of Object.values(grupos)) for (const k of ['tipos', 'arquivosPorTipo', 'posicao', 'arquivosPorPosicao', 'componentes', 'arranjos', 'outros', 'arquivosPorOutro', 'detalhes', 'raiz', 'nivel']) t[k] = ordenar(t[k]);
  return { total: esbocos.length, grupos };
}

/* ---------- as receitas que declaram o esboço ---------- */

function receitas() {
  const lista = arquivos.filter((c) => c.startsWith('procedural/') && /\/receita\.js$/.test(c));
  const saida = [];
  for (const c of lista) {
    const t = ler(c);
    const esboco = /REFINA\s*=\s*\{|REFINA:/.test(t) && /\besboco:\s*\{\s*(arquivo|\n)/.test(t);
    const andaime = /andaime:\s*['"]([^'"]+)['"]/.exec(t)?.[1] ?? null;
    if (!esboco && !andaime) continue;
    let objetivo = null;
    if (andaime) {
      const caminho = normalize(join(dirname(c), andaime));
      if (arquivos.includes(caminho)) objetivo = JSON.parse(ler(caminho)).objetivo ?? null;
    }
    saida.push({ receita: c, declaraREFINAesboco: esboco, andaime, objetivoDoAndaime: objetivo });
  }
  return saida;
}

/* ---------- saída ---------- */

const resultado = {};
if (parte === 'usuarios' || parte === 'tudo') resultado.usuarios = usuarios();
if (parte === 'recursos' || parte === 'tudo') resultado.recursos = recursos();
if (parte === 'receitas' || parte === 'tudo') resultado.receitas = receitas();

if (json) {
  process.stdout.write(`${JSON.stringify(resultado, null, 2)}\n`);
} else {
  const contagem = (g) => Object.entries(g).map(([k, v]) => `${k} ${Array.isArray(v) ? v.length : v}`).join(', ');
  if (resultado.usuarios) {
    const u = resultado.usuarios;
    console.log(`importam o módulo direto: ${Object.keys(u.diretos).length} (${contagem(u.diretosPorPapel)})`);
    console.log(`chegam a ele por outro arquivo: ${Object.values(u.indiretosPorPapel).flat().length} (${contagem(u.indiretosPorPapel)})`);
    console.log(`scripts do package.json que chegam ao módulo: ${u.scripts.length} (${u.scripts.map((s) => s.nome).join(', ')})`);
    console.log(`arquivos que citam \`npm run esboco\`: ${Object.values(u.citamNpmRunEsboco).flat().length} (${contagem(u.citamNpmRunEsboco)})`);
    console.log(`código que cita um .esboco.json: ${Object.values(u.codigoCitaEsbocoJson).flat().length} (${contagem(u.codigoCitaEsbocoJson)})`);
    console.log(`arquivos do módulo importados de fora (arquivo: quantos importam): ${u.usoDosArquivosDoModulo.map(([a, n]) => `${a} ${n}`).join(', ')}`);
    for (const [papelDe, lista] of Object.entries(u.diretosPorPapel)) {
      console.log(`\n[direto, ${papelDe}]`);
      for (const c of lista) console.log(`  ${c}: ${u.diretos[c].join(', ')}`);
    }
    for (const [papelDe, lista] of Object.entries(u.indiretosPorPapel)) console.log(`\n[indireto, ${papelDe}] ${lista.join(', ')}`);
  }
  if (resultado.recursos) {
    console.log(`\n.esboco.json versionados: ${resultado.recursos.total}`);
    for (const [g, t] of Object.entries(resultado.recursos.grupos)) {
      console.log(`\n[${g}] ${t.arquivos} arquivos, ${t.opcoes} opções, ${t.formas} formas simples (${t.visiveis} visíveis), ${t.instancias} instâncias de componente, ${t.espelhos} espelhos`);
      console.log(`  tipos (formas): ${contagem(t.tipos)}`);
      console.log(`  tipos (arquivos): ${contagem(t.arquivosPorTipo)}`);
      console.log(`  detalhe do tipo (formas): ${contagem(t.detalhes)}`);
      console.log(`  posição (formas): ${contagem(t.posicao)}; âncoras citadas ${t.ancoras}; centro por âncora ${t.centroAncora}; centro por entre ${t.centroEntre}`);
      console.log(`  posição (arquivos): ${contagem(t.arquivosPorPosicao)}`);
      console.log(`  componentes: ${contagem(t.componentes) || 'nenhum'}; arranjos: ${contagem(t.arranjos) || 'nenhum'}`);
      console.log(`  outros campos (formas): ${contagem(t.outros)}`);
      console.log(`  outros campos (arquivos): ${contagem(t.arquivosPorOutro)}`);
      console.log(`  raiz (arquivos): ${contagem(t.raiz)}`);
      console.log(`  gate de contato ligado: ${t.contatoLigado} arquivos, ${t.pares} pares declarados; plano.nivel: ${contagem(t.nivel) || 'nenhum'}`);
      console.log(`  unidades: ${t.comUnidades} arquivos com ${t.unidades} unidades; estado do Condutor versionado: ${t.condutor}; detalhe de unidade: ${t.detalhe}`);
    }
  }
  if (resultado.receitas) {
    console.log(`\nreceitas com REFINA.esboco ou REFINA.andaime: ${resultado.receitas.length}`);
    for (const r of resultado.receitas) console.log(`  ${r.receita}: REFINA.esboco ${r.declaraREFINAesboco ? 'sim' : 'não'}; andaime ${r.andaime ?? '-'} (objetivo ${r.objetivoDoAndaime ?? '-'})`);
  }
}
