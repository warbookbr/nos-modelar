#!/usr/bin/env node
/* Gera docs/modelar/FERRAMENTAS-POR-OBJETO.md a partir de
   docs/modelar/ferramentas-por-objeto.json e confere que o JSON cobre a fase
   atual de FAMILIAS-DE-OBJETOS.md, objeto por objeto. Com --check não escreve:
   sai 1 se faltar ou sobrar objeto, se um objeto citar ferramenta que não
   existe, se uma ferramenta não for usada ou se o documento não for o que o
   JSON gera. A análise anterior tinha documento e JSON divergentes porque nada
   conferia um contra o outro. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = path.join(raiz, 'docs/modelar');
const ARQ_JSON = path.join(DOCS, 'ferramentas-por-objeto.json');
const ARQ_FAMILIAS = path.join(DOCS, 'FAMILIAS-DE-OBJETOS.md');
const ARQ_MD = path.join(DOCS, 'FERRAMENTAS-POR-OBJETO.md');

export function familiasDaFaseAtual(texto) {
  const inicio = texto.indexOf('## Fase atual');
  const fim = texto.indexOf('## Fase posterior');
  if (inicio < 0 || fim < 0) throw new Error('FAMILIAS-DE-OBJETOS.md sem "## Fase atual" ou "## Fase posterior"');
  const familias = {};
  for (const paragrafo of texto.slice(inicio, fim).split(/\n\s*\n/)) {
    const m = paragrafo.replace(/\s+/g, ' ').trim().match(/^\*\*(.+?)\*\*:\s*(.+?)\.?$/);
    if (!m) continue;
    familias[m[1]] = m[2].split(', ').map((s) => s.trim());
  }
  return familias;
}

export function conferir(dados, familias) {
  const erros = [];
  const ids = new Set(Object.keys(dados.ferramentas));
  const usadas = new Set();
  for (const [familia, objetos] of Object.entries(familias)) {
    const doJson = dados.objetos[familia];
    if (!doJson) { erros.push(`família sem entrada no JSON: ${familia}`); continue; }
    for (const o of objetos) if (!doJson[o]) erros.push(`${familia}: objeto sem ferramentas: ${o}`);
    for (const o of Object.keys(doJson)) if (!objetos.includes(o)) erros.push(`${familia}: objeto que não está na lista de famílias: ${o}`);
  }
  for (const familia of Object.keys(dados.objetos)) if (!familias[familia]) erros.push(`família que não está na lista: ${familia}`);
  for (const [familia, objetos] of Object.entries(dados.objetos)) {
    for (const [o, fs] of Object.entries(objetos)) {
      if (!fs.length) erros.push(`${familia}: ${o} sem ferramenta`);
      for (const f of fs) { if (!ids.has(f)) erros.push(`${familia}: ${o} cita ferramenta inexistente: ${f}`); usadas.add(f); }
    }
  }
  for (const id of ids) if (!usadas.has(id)) erros.push(`ferramenta que nenhum objeto usa: ${id}`);
  return erros;
}

const ORDEM_AQUI = { não: 0, parcial: 1, tem: 2 };

export function gerar(dados) {
  const uso = {};
  for (const id of Object.keys(dados.ferramentas)) uso[id] = { objetos: 0, familias: new Set() };
  let total = 0;
  for (const [familia, objetos] of Object.entries(dados.objetos)) {
    for (const fs of Object.values(objetos)) {
      total++;
      for (const f of fs) { uso[f].objetos++; uso[f].familias.add(familia); }
    }
  }
  const nFamilias = Object.keys(dados.objetos).length;
  const ordem = Object.keys(dados.ferramentas).sort((a, b) => uso[b].objetos - uso[a].objetos || a.localeCompare(b));
  const pct = (n) => `${Math.round((100 * n) / total)}%`;
  const L = [];
  L.push('# Ferramentas por objeto');
  L.push('');
  L.push('<!-- Gerado por `npm run ferramentas:gerar` a partir de `ferramentas-por-objeto.json`. Não edite à mão; `ferramentas:check` reprova a divergência. -->');
  L.push('');
  L.push(`Este documento responde que ferramentas o Modelar precisa ter para a IA modelar os objetos da [lista de famílias](FAMILIAS-DE-OBJETOS.md) sem reconstruir cada forma a partir de primitivas. Cada um dos ${total} objetos das ${nFamilias} famílias da fase atual recebeu as ferramentas que tirariam dela a maior parte do trabalho, e as ferramentas estão ordenadas pelo número de objetos que atendem. A referência diz de onde vem a ideia (addon ou modificador do Blender, CAD por código, bancada de CAD ou catálogo), e a coluna "aqui" diz o que o esboço e o núcleo já fazem. Os dados estão em [\`ferramentas-por-objeto.json\`](ferramentas-por-objeto.json).`);
  L.push('');
  L.push(dados.criterio);
  L.push('');
  L.push('Os tipos são três. O modificador age sobre uma forma que já existe; o gerador cria uma forma geral a partir de poucos parâmetros; o especializado gera uma peça mecânica padronizada, que costuma virar família do catálogo.');
  L.push('');
  L.push('## Ferramentas, por objetos atendidos');
  L.push('');
  L.push('| # | Ferramenta | Tipo | Objetos | Famílias | Aqui | O que automatiza |');
  L.push('|---|---|---|---|---|---|---|');
  ordem.forEach((id, i) => {
    const f = dados.ferramentas[id];
    L.push(`| ${i + 1} | ${f.nome} (\`${id}\`) | ${f.tipo} | ${uso[id].objetos} (${pct(uso[id].objetos)}) | ${uso[id].familias.size} | ${f.aqui} | ${f.automatiza} |`);
  });
  L.push('');
  L.push('## O que falta, por objetos atendidos');
  L.push('');
  L.push('As ferramentas que não existem ou existem em parte, na mesma ordem, com o que já há.');
  L.push('');
  for (const id of ordem) {
    const f = dados.ferramentas[id];
    if (f.aqui === 'tem') continue;
    L.push(`- ${f.nome} (\`${f.aqui}\`, ${uso[id].objetos} objetos): ${f.onde}.`);
  }
  L.push('');
  L.push('## Cada ferramenta');
  L.push('');
  for (const id of [...ordem].sort((a, b) => ORDEM_AQUI[dados.ferramentas[a].aqui] - ORDEM_AQUI[dados.ferramentas[b].aqui] || uso[b].objetos - uso[a].objetos)) {
    const f = dados.ferramentas[id];
    L.push(`### ${f.nome} (\`${id}\`)`);
    L.push('');
    L.push(`${f.automatiza[0].toUpperCase()}${f.automatiza.slice(1)}. Parâmetros: ${f.parametros}. Referências: ${f.referencias.join('; ')}. Aqui: ${f.aqui}, ${f.onde}. Atende ${uso[id].objetos} objetos em ${uso[id].familias.size} famílias.`);
    L.push('');
  }
  L.push('## Objetos');
  L.push('');
  for (const [familia, objetos] of Object.entries(dados.objetos)) {
    L.push(`### ${familia}`);
    L.push('');
    L.push('| Objeto | Ferramentas |');
    L.push('|---|---|');
    for (const [o, fs] of Object.entries(objetos)) L.push(`| ${o} | ${fs.map((f) => dados.ferramentas[f].nome).join(', ')} |`);
    L.push('');
  }
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dados = JSON.parse(readFileSync(ARQ_JSON, 'utf8'));
  const erros = conferir(dados, familiasDaFaseAtual(readFileSync(ARQ_FAMILIAS, 'utf8')));
  const md = gerar(dados);
  if (process.argv.includes('--check')) {
    let atual = '';
    try { atual = readFileSync(ARQ_MD, 'utf8'); } catch { /* ausente conta como divergente */ }
    if (atual !== md) erros.push('FERRAMENTAS-POR-OBJETO.md difere do que o JSON gera; rode npm run ferramentas:gerar');
    if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
    console.log('ferramentas por objeto: em dia com o JSON e com a lista de famílias');
  } else {
    if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
    writeFileSync(ARQ_MD, md);
    console.log(`gerado ${path.relative(raiz, ARQ_MD)}`);
  }
}
