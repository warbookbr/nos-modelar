/* leitura-das-rodadas.mjs — ler as rodadas e as decisões da pessoa de uma peça, sem dependência de pacote.
 *
 * Mora à parte de `rodada-de-modelagem.mjs` (que o reexporta) porque o gerador do dossiê roda no job de junção do CI, que não faz `npm ci`:
 * aqui só entram `node:` e módulos sem pacote. `tools/ci/geradores-sem-pacote.test.mjs` confere que cada gerador da junção carrega sem
 * `node_modules`. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATO_DE_QUEM, normalizarDecisaoDaPessoa } from '../../src/autoria/laco-de-modelagem.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

export const SEM_PREFIXO = (mensagem) => String(mensagem).replace(/^laço de modelagem: /, '');

export const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/* Onde grava a rodada da peça que ainda não tem pasta própria com `receita.js`: uma pasta de trabalho fora do git. Até
   2026-11-13 era `docs/modelar/historico/rodadas`, que nunca foi rastreada e saiu com a pasta de histórico. */
export const PASTA_RODADAS = join(REPO, 'tmp/rodadas');

/* Uma barra só, para a parte de um objeto (`braco-robotico/base`); `..` e
   segunda barra continuam recusados. */
const NOME_DE_PECA = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/;

/* A rodada grava DENTRO da pasta da peça, ao lado da receita que ela julgou.
   Enquanto ficava em `docs/`, responder "por que esta peça está assim" exigia
   saber de cor um caminho em outra árvore — e quem abre a peça não descobre
   que o registro existe. Peça em arquivo solto não tem pasta, e aí a rodada cai
   no lugar antigo. */
export function exigirNome(peca) {
  if (!NOME_DE_PECA.test(peca ?? '')) {
    throw new Error(`'${peca}' não é nome de peça; use letras minúsculas, dígitos e hífen, e no máximo uma barra entre objeto e parte.`);
  }
}

export function pastaDeRodadas(peca, { raiz = REPO } = {}) {
  exigirNome(peca);
  try {
    const receita = resolverCaminhoReceita(peca, { raiz });
    if (receita.endsWith(`${sep}receita.js`)) return join(dirname(receita), 'rodadas');
  } catch { /* peça que ainda não existe grava no lugar antigo */ }
  return join(raiz, 'tmp/rodadas', peca);
}

export function lerRodadas(peca, { pasta = pastaDeRodadas(peca) } = {}) {
  /* O nome é conferido mesmo quando a pasta vem por parâmetro. Sem isto, quem
     injeta a pasta — o teste, ou um comando futuro — passa a aceitar nome com
     `..` e a escrever fora da árvore pretendida. */
  exigirNome(peca);
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((nome) => /^rodada-\d{2}\.json$/.test(nome))
    .sort()
    .map((nome) => JSON.parse(readFileSync(join(pasta, nome), 'utf8')));
}

export const ARQUIVO_DAS_DECISOES = 'decisoes-da-pessoa.json';
export const FORMATO_DAS_DECISOES = 'mecanifica.decisoes-da-pessoa';
export const VERSAO_DAS_DECISOES = 1;
export const comandoDaDecisao = (peca, rodada = '<n>') => `node tools/modelar/rodada-de-modelagem.mjs ${peca} --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada ${rodada}`;

const CHAVES_DO_ARQUIVO = ['formato', 'versao', 'peca', 'decisoes'];
const CHAVES_DA_ENTRADA = ['rodada', 'decisao', 'gravadaEm', 'anteriores'];
const CHAVES_DA_ANTERIOR = ['decisao', 'gravadaEm'];
const INSTANTE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const instanteIso = (v) => typeof v === 'string' && INSTANTE_ISO.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString() === v;
const ehObjeto = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const chavesAMais = (objeto, aceitas) => Object.keys(objeto).filter((k) => !aceitas.includes(k));
export const recorte = (v) => { const t = JSON.stringify(v) ?? String(v); return t.length > 200 ? `${t.slice(0, 200)}…` : t; };

/* A conferência do conteúdo de `decisoes-da-pessoa.json`, a mesma na leitura e antes da gravação. Cada recusa diz o recebido, o esperado
   e o conserto. As chaves são fechadas: um campo a mais (`aprovada`, `limite`) seria lido por alguém como decisão que a ferramenta não
   conferiu. `rodadas` são as rodadas registradas da peça, que dão as que existem e a data do registro de cada uma. */
export function conferirDecisoes(dado, { peca, arquivo, rodadas }) {
  const molde = `{ "formato": "${FORMATO_DAS_DECISOES}", "versao": ${VERSAO_DAS_DECISOES}, "peca": "${peca}", "decisoes": [{ "rodada", "decisao", "gravadaEm", "anteriores"? }] }`;
  const conserto = `O arquivo é escrito pela ferramenta: desfaça a edição e grave com \`${comandoDaDecisao(peca)}\`.`;
  const recusar = (oQue, recebido, esperado) => { throw new Error(`${arquivo}: ${oQue} recebido: ${recorte(recebido)}; esperado ${esperado}. ${conserto}`); };
  if (!ehObjeto(dado)) recusar('conteúdo', dado, molde);
  if (dado.formato !== FORMATO_DAS_DECISOES) recusar("'formato'", dado.formato, `"${FORMATO_DAS_DECISOES}", em ${molde}`);
  if (dado.versao !== VERSAO_DAS_DECISOES) recusar("'versao'", dado.versao, `${VERSAO_DAS_DECISOES}, a única versão que esta ferramenta lê`);
  if (dado.peca !== peca) recusar("'peca'", dado.peca, `"${peca}", a peça dona desta pasta de rodadas`);
  if (!Array.isArray(dado.decisoes)) recusar("'decisoes'", dado.decisoes, `a lista das decisões, uma entrada por rodada, em ${molde}`);
  const aMais = chavesAMais(dado, CHAVES_DO_ARQUIVO);
  if (aMais.length) recusar('campo a mais', aMais, `só ${CHAVES_DO_ARQUIVO.join(', ')}`);
  const registradaEm = new Map(rodadas.map((r) => [r.numero, r.registradaEm ?? null]));
  const registradas = registradaEm.size ? `as registradas são ${[...registradaEm.keys()].join(', ')}` : 'a peça não tem rodada registrada';
  const texto = (valor, onde, rodada, gravadaEm) => {
    try { normalizarDecisaoDaPessoa(valor, { peca, rodada, ate: gravadaEm, registradaEm: registradaEm.get(rodada) }); } catch (erro) { throw new Error(`${arquivo}, ${onde}: ${SEM_PREFIXO(erro.message)}`); }
    if (valor !== valor.trim()) recusar(`${onde}, 'decisao'`, valor, 'o texto sem branco nas pontas, como a ferramenta grava');
  };
  const vistas = new Set();
  for (const d of dado.decisoes) {
    if (!ehObjeto(d)) recusar('entrada', d, '{ "rodada", "decisao", "gravadaEm" }');
    if (!Number.isInteger(d.rodada) || d.rodada < 1) recusar("'rodada'", d.rodada, 'o número inteiro, a partir de 1, da rodada que a pessoa viu');
    const onde = `rodada ${d.rodada}`;
    if (vistas.has(d.rodada)) recusar(`${onde}, segunda entrada`, d, 'uma entrada por rodada, com a substituída em \'anteriores\'');
    vistas.add(d.rodada);
    if (!registradaEm.has(d.rodada)) recusar("'rodada'", d.rodada, `o número de uma rodada registrada de '${peca}' (${registradas})`);
    const sobrando = chavesAMais(d, CHAVES_DA_ENTRADA);
    if (sobrando.length) recusar(`${onde}, campo a mais`, sobrando, `só ${CHAVES_DA_ENTRADA.join(', ')}`);
    if (!instanteIso(d.gravadaEm)) recusar(`${onde}, 'gravadaEm'`, d.gravadaEm, 'o instante da gravação em ISO e UTC, como "2026-01-31T12:00:00.000Z"');
    texto(d.decisao, onde, d.rodada, d.gravadaEm);
    if (d.anteriores === undefined) continue;
    if (!Array.isArray(d.anteriores) || d.anteriores.length === 0) recusar(`${onde}, 'anteriores'`, d.anteriores, 'a lista não vazia das decisões substituídas, [{ "decisao", "gravadaEm" }], ou o campo ausente');
    for (const a of d.anteriores) {
      if (!ehObjeto(a)) recusar(`${onde}, entrada de 'anteriores'`, a, '{ "decisao", "gravadaEm" }');
      const demais = chavesAMais(a, CHAVES_DA_ANTERIOR);
      if (demais.length) recusar(`${onde}, campo a mais em 'anteriores'`, demais, `só ${CHAVES_DA_ANTERIOR.join(', ')}`);
      if (!instanteIso(a.gravadaEm)) recusar(`${onde}, 'gravadaEm' de 'anteriores'`, a.gravadaEm, 'o instante da gravação em ISO e UTC, como "2026-01-31T12:00:00.000Z"');
      texto(a.decisao, `${onde}, 'anteriores'`, d.rodada, a.gravadaEm);
    }
    const instantes = [...d.anteriores.map((a) => a.gravadaEm), d.gravadaEm];
    const fora = instantes.findIndex((quando, k) => k > 0 && quando < instantes[k - 1]);
    if (fora > 0) recusar(`${onde}, ordem de 'anteriores'`, [instantes[fora - 1], instantes[fora]], 'as substituídas da mais antiga à mais nova, e todas antes da que vale');
  }
}

/**
 * As decisões da pessoa gravadas para a peça, em ordem de rodada: `[{ rodada, decisao, gravadaEm, anteriores? }]`, e vazia sem o
 * arquivo. O arquivo mexido à mão e errado é recusado com o recebido, o esperado e o comando que grava certo: a peça é a da pasta, toda
 * rodada citada existe, as chaves são as da ferramenta, `gravadaEm` é instante ISO e cada texto passa na regra do formato e das datas.
 */
export function lerDecisoesDaPessoa(peca, { pasta = pastaDeRodadas(peca) } = {}) {
  exigirNome(peca);
  const arquivo = join(pasta, ARQUIVO_DAS_DECISOES);
  if (!existsSync(arquivo)) return [];
  let dado;
  try { dado = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (erro) {
    throw new Error(`${arquivo}: recebido um texto que não é JSON (${erro.message}); esperado o arquivo que a ferramenta grava. O arquivo é escrito pela ferramenta: desfaça a edição e grave com \`${comandoDaDecisao(peca)}\`.`);
  }
  conferirDecisoes(dado, { peca, arquivo, rodadas: lerRodadas(peca, { pasta }) });
  return [...dado.decisoes].sort((a, b) => a.rodada - b.rodada);
}
