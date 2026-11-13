#!/usr/bin/env node
/* decisoes.mjs — os registros de decisão e a lista gerada das que estão em vigor.
 *
 * Cada decisão que ainda governa trabalho novo é um arquivo curto em `docs/modelar/decisoes/registros/`, com formato fixo:
 * título de uma frase, as linhas Estado, Decidido em, Origem e Substitui, e as seções "O que ficou decidido", "Por quê" e
 * "Quando reabrir". Registro aceito não se edita: uma decisão nova o substitui, e ele passa a dizer `substituído por <arquivo>`
 * e sai da lista. A lista das decisões em vigor, em ordem de data, é gerada entre marcadores no `README.md` de `decisoes/`.
 *
 *   npm run decisoes:gerar   regrava a lista no README.md de decisoes/
 *   npm run decisoes:check   reprova formato inválido e lista desatualizada
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA = 'docs/modelar/decisoes';
export const PASTA_DOS_REGISTROS = `${PASTA}/registros`;
export const CAMINHO_README = `${PASTA}/README.md`;
export const MARCADORES = ['<!-- decisoes:inicio -->', '<!-- decisoes:fim -->'];
export const COMANDO_GERAR = 'npm run decisoes:gerar';

/* O teto de palavras do arquivo inteiro. O registro do levantamento de falhas de autoria lista uma hipótese por linha e tem o dobro. */
export const TETO_DE_PALAVRAS = 250;
export const TETOS_ESPECIAIS = { '2026-11-13-hipoteses-de-forma-reprovadas-e-regras-de-processo.md': 500 };

export const SECOES = ['O que ficou decidido', 'Por quê', 'Quando reabrir'];
const NOME_DO_REGISTRO = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function palavrasDe(texto) {
  return texto.split(/\s+/).filter(Boolean).length;
}

function dataValida(texto) {
  if (!DATA.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d;
}

/* Lê um registro. Devolve { problemas, titulo, data, estado, substituidoPor } e nunca lança. `existentes` é o conjunto dos
   nomes de arquivo da pasta, para conferir o registro que substitui este. */
export function lerRegistro(nome, texto, existentes = new Set()) {
  const problemas = [];
  const falha = (msg) => problemas.push(`${nome}: ${msg}`);
  const dados = { nome, titulo: null, data: null, estado: null, substituidoPor: null };

  const m = NOME_DO_REGISTRO.exec(nome);
  if (!m) falha('o nome precisa ser AAAA-MM-DD-assunto-curto.md, em minúsculas, sem acento e com hífens');
  if (m && !dataValida(m[1])) falha(`a data do nome (${m[1]}) não existe`);

  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const titulo = /^# (\S.*)$/.exec(linhas[0] ?? '');
  if (!titulo) falha('a primeira linha precisa ser o título, "# <a decisão em uma frase>"');
  else dados.titulo = titulo[1].trim();

  if ((linhas[1] ?? '') !== '') falha('uma linha em branco separa o título do cabeçalho');
  const cabecalho = linhas.slice(2, 6);
  const [estado, decidido, origem, substitui] = cabecalho;

  const e = /^Estado: (em vigor|substituído por (\S+\.md))\.$/.exec(estado ?? '');
  if (!e) falha('a linha 3 precisa ser "Estado: em vigor." ou "Estado: substituído por <arquivo>.md."');
  else {
    dados.estado = e[2] ? 'substituído' : 'em vigor';
    if (e[2]) {
      dados.substituidoPor = e[2];
      if (e[2] === nome) falha('o registro não pode ser substituído por ele mesmo');
      else if (!existentes.has(e[2])) falha(`substituído por ${e[2]}, que não existe em ${PASTA_DOS_REGISTROS}/`);
    }
  }

  const d = /^Decidido em: (\d{4}-\d{2}-\d{2})\.$/.exec(decidido ?? '');
  if (!d || !dataValida(d[1])) falha('a linha 4 precisa ser "Decidido em: AAAA-MM-DD." com uma data que exista');
  else {
    dados.data = d[1];
    if (m && m[1] !== d[1]) falha(`a data do nome (${m[1]}) difere de "Decidido em" (${d[1]})`);
  }

  if (!/^Origem: `[^`\s]+`, no commit `[0-9a-f]{7,40}`\.$/.test(origem ?? '')) {
    falha('a linha 5 precisa ser "Origem: `<caminho>`, no commit `<hash curto>`."');
  }

  const s = /^Substitui: (nada|`?(\S+\.md)`?)\.$/.exec(substitui ?? '');
  if (!s) falha('a linha 6 precisa ser "Substitui: nada." ou "Substitui: <arquivo>.md."');
  else if (s[2] && !existentes.has(s[2])) falha(`Substitui ${s[2]}, que não existe em ${PASTA_DOS_REGISTROS}/`);

  const resto = linhas.slice(6);
  const titulos = resto.filter((l) => /^#{1,6} /.test(l));
  if (titulos.join('|') !== SECOES.map((s2) => `## ${s2}`).join('|')) {
    falha(`as seções precisam ser, nesta ordem e só elas: ${SECOES.map((s2) => `"## ${s2}"`).join(', ')}`);
  } else {
    SECOES.forEach((secao, i) => {
      const inicio = resto.indexOf(`## ${secao}`) + 1;
      const fim = i + 1 < SECOES.length ? resto.indexOf(`## ${SECOES[i + 1]}`) : resto.length;
      if (!resto.slice(inicio, fim).join(' ').trim()) falha(`a seção "${secao}" está vazia`);
    });
  }

  if (texto.includes('**')) falha('sem negrito no texto');

  const teto = TETOS_ESPECIAIS[nome] ?? TETO_DE_PALAVRAS;
  const palavras = palavrasDe(texto);
  if (palavras > teto) falha(`${palavras} palavras; o teto é ${teto}`);

  return { ...dados, problemas };
}

/* Todos os registros da pasta, lidos e validados, em ordem de data e depois de nome. */
export function lerRegistros(raiz = RAIZ) {
  const pasta = join(raiz, PASTA_DOS_REGISTROS);
  if (!existsSync(pasta)) return { problemas: [`pasta de registros ausente: ${PASTA_DOS_REGISTROS}/`], registros: [] };
  const arquivos = readdirSync(pasta).filter((a) => a.endsWith('.md')).sort();
  const existentes = new Set(arquivos);
  const problemas = [];
  const registros = arquivos.map((nome) => {
    const r = lerRegistro(nome, readFileSync(join(pasta, nome), 'utf8'), existentes);
    problemas.push(...r.problemas);
    return r;
  });
  registros.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? '') || a.nome.localeCompare(b.nome));
  return { problemas, registros };
}

/* A lista das decisões em vigor, uma por linha: data e título com o link para o registro. */
export function gerarLista(registros) {
  const emVigor = registros.filter((r) => r.estado === 'em vigor' && r.titulo && r.data);
  if (emVigor.length === 0) return '\nNenhuma decisão em vigor.\n';
  return `\n${emVigor.map((r) => `- ${r.data}: [${r.titulo}](registros/${r.nome})`).join('\n')}\n`;
}

/* O texto com o que está entre os marcadores trocado por `bloco`; null quando os marcadores faltam ou estão fora de ordem. */
export function trocarEntreMarcadores(texto, bloco) {
  const [inicio, fim] = MARCADORES;
  const i = texto.indexOf(inicio);
  const f = texto.indexOf(fim);
  if (i < 0 || f < i) return null;
  return `${texto.slice(0, i + inicio.length)}${bloco}${texto.slice(f)}`;
}

/* Confere o formato de todos os registros e que a lista do README.md está em dia. */
export function conferirDecisoes({ raiz = RAIZ } = {}) {
  const { problemas, registros } = lerRegistros(raiz);
  const readme = join(raiz, CAMINHO_README);
  if (!existsSync(readme)) {
    problemas.push(`${CAMINHO_README} ausente`);
    return { problemas, registros };
  }
  const atual = readFileSync(readme, 'utf8');
  const esperado = trocarEntreMarcadores(atual, gerarLista(registros));
  if (esperado === null) {
    problemas.push(`${CAMINHO_README} perdeu um marcador (${MARCADORES.join(', ')}); ponha de volta onde a lista deve ficar e rode \`${COMANDO_GERAR}\``);
  } else if (esperado !== atual && problemas.length === 0) {
    problemas.push(`a lista de decisões em vigor de ${CAMINHO_README} está desatualizada; rode \`${COMANDO_GERAR}\``);
  }
  return { problemas, registros };
}

/* Regrava a lista; devolve os problemas e não grava nada enquanto houver registro inválido. */
export function gerarDecisoes({ raiz = RAIZ } = {}) {
  const { problemas, registros } = lerRegistros(raiz);
  if (problemas.length > 0) return { problemas, registros };
  const readme = join(raiz, CAMINHO_README);
  if (!existsSync(readme)) return { problemas: [`${CAMINHO_README} ausente`], registros };
  const atual = readFileSync(readme, 'utf8');
  const esperado = trocarEntreMarcadores(atual, gerarLista(registros));
  if (esperado === null) {
    return { problemas: [`${CAMINHO_README} perdeu um marcador (${MARCADORES.join(', ')}); ponha de volta onde a lista deve ficar`], registros };
  }
  if (esperado !== atual) writeFileSync(readme, esperado);
  return { problemas: [], registros };
}

function executar() {
  if (process.argv.includes('--gerar')) {
    const { problemas, registros } = gerarDecisoes();
    for (const p of problemas) console.error(p);
    if (problemas.length > 0) process.exitCode = 1;
    else console.log(`decisoes:gerar ok — ${registros.filter((r) => r.estado === 'em vigor').length} decisão(ões) em vigor listadas em ${CAMINHO_README}`);
    return;
  }
  const { problemas, registros } = conferirDecisoes();
  if (problemas.length > 0) {
    console.error(`decisoes:check FALHOU — ${problemas.length} problema(s):`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(`decisoes:check ok — ${registros.length} registro(s), ${registros.filter((r) => r.estado === 'em vigor').length} em vigor`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
