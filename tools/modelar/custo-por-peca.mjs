#!/usr/bin/env node
/* custo-por-peca.mjs — a tabela de custo de cada peça de um objeto, lida dos registros de rodada e do registro das etapas.
 *
 * POR QUE ELE EXISTE. O plano do núcleo para qualquer mecanismo (2026-11-10) mede o progresso pelo custo por peça: um objeto de
 * prova só vale se custar menos rodadas de crítico que o anterior. O custo estava espalhado em `rodada-NN.json` por peça e no aceite
 * do `montagem.etapas.json`, e somá-lo era trabalho à mão. Esta ferramenta lê os dois e devolve os números, sem julgar forma.
 *
 * O QUE ELE LÊ. A pasta do objeto no acervo: as peças em `partes/<peça>/rodadas/rodada-NN.json`, no formato que
 * `rodada-de-modelagem.mjs` grava (o `veredito` do crítico com `nota` e `defeitos`, o `atrito` como lista de frases), ou uma peça de
 * arquivo único com `rodadas/` na própria pasta. Se houver `montagem.etapas.json`, o aceite de cada etapa diz se a peça foi fixa pela
 * pessoa e com quantos defeitos aceitos; a instância vira peça pelo `alvo.ref` do `montagem.json` ou, sem ele, pelo nome em kebab.
 *
 * A ATRIBUIÇÃO. Quem conduz escreve no atrito a quem atribui cada defeito ("atribuido ao modelador", "ao plano", "a ferramenta", "ao
 * critico", "a familia"). Conta-se cada ocorrência dessas palavras-chave depois de "atribuído(s)"; frase sem elas não conta, e nada é
 * deduzido do texto livre.
 *
 * O FECHO. A peça fecha pelo crítico quando a última rodada não tem defeito; com defeito na última e aceite no registro das etapas,
 * foi fixa por aceite humano; sem aceite, fica aberta. Os defeitos abertos são os da última rodada quando ela não fecha.
 *
 * Uso: npm run custo:peca -- <pasta do objeto> [--json] [--saida=<arquivo.json>]
 * Sem opção imprime a tabela em texto; `--json` imprime o JSON; `--saida` grava o JSON no arquivo e imprime a tabela. Sai 2 em
 * argumento ruim ou pasta sem rodadas. */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ATRIBUICOES = Object.freeze(['modelador', 'plano', 'ferramenta', 'critico', 'familia']);
const CAMPOS_DE_DATA = ['data', 'em', 'registradaEm', 'quando'];
const RODADA = /^rodada-(\d+)\.json$/;

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const porNome = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();
const kebab = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** As atribuições declaradas numa lista de frases de atrito, `{ modelador, plano, ferramenta, critico, familia }`. */
export function contarAtribuicoes(atrito) {
  const conta = Object.fromEntries(ATRIBUICOES.map((a) => [a, 0]));
  if (!Array.isArray(atrito)) return conta;
  const padrao = /atribuid[oa]s?\s+(?:ao|aos|a|as)\s+([a-z]+)/g;
  for (const frase of atrito) {
    if (typeof frase !== 'string') continue;
    for (const m of semAcento(frase).matchAll(padrao)) if (m[1] in conta) conta[m[1]] += 1;
  }
  return conta;
}

function dataDe(registro) {
  for (const c of CAMPOS_DE_DATA) {
    const v = registro?.[c];
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

/** Uma rodada lida do arquivo: número, nota, defeitos, data e atribuições. Campo ausente vira `null`; JSON ruim marca `ilegivel`. */
export function lerRodada(caminho, numeroDoArquivo) {
  let j;
  try { j = JSON.parse(readFileSync(caminho, 'utf8')); } catch {
    return { numero: numeroDoArquivo, nota: null, defeitos: null, data: null, atribuicoes: contarAtribuicoes([]), ilegivel: true };
  }
  const veredito = j && typeof j.veredito === 'object' ? j.veredito : null;
  return {
    numero: Number.isInteger(j?.numero) ? j.numero : numeroDoArquivo,
    nota: typeof veredito?.nota === 'number' ? veredito.nota : null,
    defeitos: Array.isArray(veredito?.defeitos) ? veredito.defeitos.length : null,
    data: dataDe(j),
    atribuicoes: contarAtribuicoes(j?.atrito),
  };
}

function rodadasDaPasta(pasta) {
  return readdirSync(pasta)
    .map((nome) => [nome, RODADA.exec(nome)])
    .filter(([, m]) => m)
    .map(([nome, m]) => lerRodada(join(pasta, nome), Number(m[1])))
    .sort((a, b) => a.numero - b.numero);
}

function lerJson(caminho) {
  try { return JSON.parse(readFileSync(caminho, 'utf8')); } catch { return null; }
}

/** O aceite por peça do `montagem.etapas.json`, `Map<peça, { defeitosAceitos, data }>`, juntando as instâncias da mesma peça. */
export function aceitesDasEtapas(pasta) {
  const aceites = new Map();
  const etapas = lerJson(join(pasta, 'montagem.etapas.json'));
  if (!Array.isArray(etapas?.etapas)) return aceites;
  const montagem = lerJson(join(pasta, 'montagem.json'));
  const refs = new Map();
  for (const i of Array.isArray(montagem?.instancias) ? montagem.instancias : []) {
    if (typeof i?.id === 'string' && typeof i?.alvo?.ref === 'string') refs.set(i.id, i.alvo.ref.split('/').pop());
  }
  for (const e of etapas.etapas) {
    if (!e?.aceite || typeof e.instancia !== 'string') continue;
    const peca = refs.get(e.instancia) ?? kebab(e.instancia);
    const n = Array.isArray(e.aceite.defeitosAceitos) ? e.aceite.defeitosAceitos.length : 0;
    const data = /\d{4}-\d{2}-\d{2}/.exec(String(e.aceite.por ?? ''))?.[0] ?? null;
    const antes = aceites.get(peca);
    aceites.set(peca, {
      defeitosAceitos: Math.max(antes?.defeitosAceitos ?? 0, n),
      data: [antes?.data, data].filter(Boolean).sort().pop() ?? null,
    });
  }
  return aceites;
}

const somar = (contas) => {
  const total = Object.fromEntries(ATRIBUICOES.map((a) => [a, 0]));
  for (const c of contas) for (const a of ATRIBUICOES) total[a] += c[a];
  return total;
};

/** O custo de uma peça pelas rodadas dela e pelo aceite, se houver. */
export function custoDaPeca(nome, rodadas, aceite = null) {
  const ultima = rodadas.at(-1) ?? null;
  const defeitosNaUltima = ultima?.defeitos ?? null;
  let fecho;
  if (!ultima) fecho = 'sem rodadas';
  else if (defeitosNaUltima === 0) fecho = 'critico';
  else if (aceite) fecho = 'aceite';
  else fecho = defeitosNaUltima === null ? 'sem veredito' : 'aberta';
  const datas = rodadas.map((r) => r.data).filter(Boolean).sort();
  return {
    peca: nome,
    rodadas: rodadas.length,
    notas: rodadas.map((r) => r.nota),
    notaFinal: ultima?.nota ?? null,
    defeitos: rodadas.map((r) => r.defeitos),
    defeitosNaUltima,
    defeitosAbertos: fecho === 'critico' ? 0 : (defeitosNaUltima ?? 0),
    defeitosAceitos: aceite ? aceite.defeitosAceitos : null,
    atribuicoes: somar(rodadas.map((r) => r.atribuicoes)),
    fecho,
    dataDoAceite: aceite?.data ?? null,
    primeiraRodada: datas[0] ?? null,
    ultimaRodada: datas.at(-1) ?? null,
    ...(rodadas.some((r) => r.ilegivel) ? { ilegiveis: rodadas.filter((r) => r.ilegivel).map((r) => r.numero) } : {}),
  };
}

/** O custo do objeto inteiro: cada peça e o resumo. Lança quando a pasta não tem rodada nenhuma. */
export function custoDoObjeto(pasta) {
  const raiz = resolve(pasta);
  if (!ehPasta(raiz)) throw new Error(`${pasta}: não é pasta.`);
  const pecas = [];
  const partes = join(raiz, 'partes');
  if (ehPasta(partes)) {
    const aceites = aceitesDasEtapas(raiz);
    for (const nome of readdirSync(partes).sort(porNome)) {
      const r = join(partes, nome, 'rodadas');
      if (ehPasta(r)) pecas.push(custoDaPeca(nome, rodadasDaPasta(r), aceites.get(nome) ?? null));
    }
  }
  if (ehPasta(join(raiz, 'rodadas'))) {
    const nome = basename(raiz);
    pecas.push(custoDaPeca(nome, rodadasDaPasta(join(raiz, 'rodadas')), aceitesDasEtapas(raiz).get(nome) ?? null));
  }
  if (pecas.length === 0) throw new Error(`${pasta}: nenhuma pasta rodadas/ em partes/<peça>/ nem na própria pasta.`);
  return { formato: 'modelar.custo-por-peca', versao: 1, objeto: basename(raiz), pecas, resumo: resumir(pecas) };
}

function resumir(pecas) {
  const rodadas = pecas.reduce((s, p) => s + p.rodadas, 0);
  const notasFinais = {};
  for (const p of pecas) {
    const k = p.notaFinal === null ? 'sem nota' : String(p.notaFinal);
    notasFinais[k] = (notasFinais[k] ?? 0) + 1;
  }
  const fechos = {};
  for (const p of pecas) fechos[p.fecho] = (fechos[p.fecho] ?? 0) + 1;
  const ordenado = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => porNome(a, b)));
  return {
    pecas: pecas.length,
    rodadas,
    mediaDeRodadas: Math.round((rodadas / pecas.length) * 100) / 100,
    fecharamNaPrimeira: pecas.filter((p) => p.rodadas === 1 && p.fecho === 'critico').length,
    notasFinais: ordenado(notasFinais),
    fechos: ordenado(fechos),
    defeitosAbertos: pecas.reduce((s, p) => s + p.defeitosAbertos, 0),
    atribuicoes: somar(pecas.map((p) => p.atribuicoes)),
  };
}

const ROTULO = { modelador: 'mod', plano: 'pla', ferramenta: 'fer', critico: 'cri', familia: 'fam' };
const lista = (xs) => xs.map((x) => (x === null ? '-' : String(x))).join(' ');

/** A tabela em texto, com as colunas alinhadas e o resumo no fim. */
export function emTexto(custo) {
  const cab = ['peça', 'rod', 'notas', 'defeitos', 'abertos', 'aceitos', 'fecho', 'mod pla fer cri fam', 'datas'];
  const linhas = custo.pecas.map((p) => [
    p.peca, String(p.rodadas), lista(p.notas), lista(p.defeitos), String(p.defeitosAbertos),
    p.defeitosAceitos === null ? '-' : String(p.defeitosAceitos), p.fecho,
    ATRIBUICOES.map((a) => String(p.atribuicoes[a]).padStart(3)).join(' '),
    p.primeiraRodada ? `${p.primeiraRodada} a ${p.ultimaRodada}` : '-',
  ]);
  const larguras = cab.map((c, i) => Math.max(c.length, ...linhas.map((l) => l[i].length)));
  const fmt = (l) => l.map((c, i) => c.padEnd(larguras[i])).join('  ').trimEnd();
  const r = custo.resumo;
  const pares = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ');
  return [
    `custo por peça: ${custo.objeto}`,
    '',
    fmt(cab),
    fmt(larguras.map((n) => '-'.repeat(n))),
    ...linhas.map(fmt),
    '',
    `peças: ${r.pecas}; rodadas: ${r.rodadas}; média de rodadas por peça: ${r.mediaDeRodadas}; fecharam na primeira rodada: ${r.fecharamNaPrimeira}`,
    `notas finais: ${pares(r.notasFinais)}`,
    `fecho: ${pares(r.fechos)}; defeitos abertos na última rodada: ${r.defeitosAbertos}`,
    `atribuições: ${ATRIBUICOES.map((a) => `${a} ${r.atribuicoes[a]}`).join(', ')}`,
  ].join('\n');
}

/** A linha de comando: devolve `{ codigo, texto }` sem sair do processo. */
export function rodar(args) {
  const pastas = args.filter((a) => !a.startsWith('--'));
  const opcoes = args.filter((a) => a.startsWith('--'));
  const desconhecida = opcoes.find((o) => o !== '--json' && !o.startsWith('--saida='));
  if (pastas.length !== 1 || desconhecida) {
    return { codigo: 2, texto: `uso: custo-por-peca.mjs <pasta do objeto> [--json] [--saida=<arquivo.json>]${desconhecida ? ` (opção desconhecida: ${desconhecida})` : ''}` };
  }
  let custo;
  try { custo = custoDoObjeto(pastas[0]); } catch (erro) { return { codigo: 2, texto: `custo-por-peca: ${erro.message}` }; }
  const json = `${JSON.stringify(custo, null, 2)}\n`;
  const saida = opcoes.find((o) => o.startsWith('--saida='))?.slice('--saida='.length);
  if (saida) writeFileSync(saida, json);
  return { codigo: 0, texto: opcoes.includes('--json') ? json.trimEnd() : emTexto(custo) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { codigo, texto } = rodar(process.argv.slice(2));
  (codigo === 0 ? console.log : console.error)(texto);
  process.exitCode = codigo;
}
