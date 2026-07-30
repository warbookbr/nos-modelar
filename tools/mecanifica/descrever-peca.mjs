#!/usr/bin/env node
/**
 * descrever-peca.mjs — a RÉGUA DA BANCADA: constrói uma peça headless e imprime,
 * por parte semântica, caixa (min/max), centro, dimensões e contagem de faces, e
 * entre pares de partes a folga ou a interpenetração — em NÚMERO.
 *
 * Existe porque foto não tem escala nem gnômon de eixo: responder "o eixo do
 * disco está em X?" custou 4 leituras de PNG e perícia de pixel, e a resposta
 * certa veio de uma medição em Node feita fora da bancada (ATRITOS-AUTORIA
 * A-13). A medida vem do módulo neutro `src/autoria/descrever-partes.js`, o
 * mesmo que alimenta o painel de diagnóstico da bancada — uma verdade só.
 *
 *   npm run descrever -- freio-disco
 *   npm run descrever -- freio-disco --partes=disco,pastilhaInterna,pistao
 *   npm run descrever -- freio-disco --casas=9
 *   npm run descrever -- --listar                          # peças disponíveis
 *
 * Saída determinística: precisão fixa, ordem de nome estável, nenhuma dependência
 * de relógio, sorteio ou índice de face. A mesma peça imprime sempre o mesmo
 * texto, então o relatório pode virar teste.
 *
 * Sai ≠0 quando a peça não é nomeada ou não existe, quando ela não é escrita em
 * passos da Oficina, quando um nome de parte pedido não existe, quando a peça
 * tem órfão — e com `--estrito` quando alguma face está sem identidade.
 *
 * Sai 2 em erro de USO, e bandeira desconhecida É erro de uso: `--estrit` não
 * some com o gate do `--estrito` em silêncio, `--parte=` não passa por
 * `--partes=`, e duas peças de uma vez não medem a primeira calado. A leitura
 * fica em `argumentos.mjs`, compartilhada com `olhar-bancada.mjs`.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PECAS = join(REPO, 'prototipos/fps/v3/pecas');

function erroDeUso(mensagem) {
  console.error(`descrever-peca: ${mensagem}`);
  process.exit(2);
}
function falha(mensagem) {
  console.error(`\n${mensagem}`);
  process.exit(1);
}

/* vocabulário DECLARADO: qualquer coisa fora dele para o comando com
   diagnóstico. Um typo em `--estrito` fazia o gate sumir sem uma linha de
   aviso, e `--parte=disco` imprimia a peça inteira como se tivesse filtrado. */
let opcao;
let bandeira;
let peca;
try {
  const lido = lerArgumentos(process.argv.slice(2), {
    opcoes: ['partes', 'casas'],
    bandeiras: ['listar', 'estrito'],
    posicional: { nome: 'a peça', obrigatorio: false },
  });
  ({ opcao, bandeira, posicional: peca } = lido);
} catch (erro) {
  erroDeUso(erro.message);
}

/* mesma escolha de peça por nome que `olhar-bancada.mjs`: o argumento solto é a
   peça, e o nome é o do arquivo em prototipos/fps/v3/pecas/. */
const disponiveis = readdirSync(PECAS)
  .filter((arquivo) => arquivo.endsWith('.js'))
  .map((arquivo) => arquivo.slice(0, -'.js'.length))
  .sort();

if (bandeira('listar')) {
  console.log(`peças disponíveis (${disponiveis.length}):\n  ${disponiveis.join('\n  ')}`);
  process.exit(0);
}

const partes = opcao('partes', '').split(',').map((p) => p.trim()).filter(Boolean);
const casas = parseInt(opcao('casas', '6'), 10);
const estrito = bandeira('estrito');

/* peça sem nome NÃO cai numa peça padrão: medir a peça errada em silêncio é
   pior do que não medir. */
if (!peca) {
  erroDeUso(
    'diga qual peça medir, pelo nome do arquivo em prototipos/fps/v3/pecas/.'
    + '\n  ex.: npm run descrever -- freio-disco   (use --listar para ver todas)',
  );
}
if (!disponiveis.includes(peca)) {
  erroDeUso(
    `peça '${peca}' não existe em prototipos/fps/v3/pecas/.`
    + `\n  disponíveis: ${disponiveis.join(', ')}`,
  );
}
if (!Number.isInteger(casas) || casas < 0 || casas > 12) {
  erroDeUso(`--casas precisa ser inteiro entre 0 e 12, recebi '${opcao('casas', '6')}'`);
}
if (opcao('partes') !== null && partes.length === 0) {
  erroDeUso('--partes veio vazio; informe nomes de parte ou omita a opção');
}

const { nucleo } = await import(pathToFileURL(join(REPO, 'prototipos/fps/v3/motor/oficina.js')).href);
const { descreverPeca, formatarDescricao } = await import(
  pathToFileURL(join(REPO, 'src/autoria/descrever-partes.js')).href
);

let modulo;
try {
  modulo = await import(pathToFileURL(join(PECAS, `${peca}.js`)).href);
} catch (erro) {
  falha(`PEÇA NÃO CARREGOU\n  ${peca}: ${erro.message}`);
}

if (!Array.isArray(modulo.PASSOS)) {
  falha(
    `PEÇA SEM ENVELOPE DA OFICINA\n  '${peca}' não exporta PASSOS.`
    + '\n  esta régua só mede peça escrita como passos da Oficina.',
  );
}

let neutro;
try {
  neutro = nucleo(
    modulo.PASSOS,
    modulo.PARAMS ?? {},
    modulo.TOPO ?? {},
    modulo.MATERIAIS ?? {},
    modulo.ESQUELETO ?? null,
    modulo.ALIASES ?? [],
  );
} catch (erro) {
  falha(`O NÚCLEO RECUSOU A PEÇA\n  ${peca}: ${erro.message}`);
}

let descricao;
try {
  descricao = descreverPeca(neutro, { partes: partes.length ? partes : null });
} catch (erro) {
  falha(`NÃO CONSEGUI MEDIR\n  ${erro.message}`);
}

process.stdout.write(formatarDescricao(descricao, { peca, casas }));

let falhou = false;
if (descricao.totais.orfaos) {
  const amostra = neutro.orfaos.slice(0, 5)
    .map((o) => `passo ${o.passo} (${o.op}): ${o.motivo}${o.ref === undefined ? '' : ` — ref ${JSON.stringify(o.ref)}`}`);
  console.error(
    `\n${descricao.totais.orfaos} ÓRFÃO(S): a peça tem referência inválida e as medidas acima`
    + ' descrevem uma peça incompleta.\n  ' + amostra.join('\n  '),
  );
  falhou = true;
}
if (descricao.totais.facesSemParte && estrito) {
  console.error(
    `\n${descricao.totais.facesSemParte} face(s) sem identidade semântica (--estrito)`
    + `\n  ids: ${descricao.facesSemParte.slice(0, 20).join(', ')}`,
  );
  falhou = true;
}
process.exit(falhou ? 1 : 0);
