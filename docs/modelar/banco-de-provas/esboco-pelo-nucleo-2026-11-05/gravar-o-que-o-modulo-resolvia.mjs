#!/usr/bin/env node
/* gravar-o-que-o-modulo-resolvia.mjs — grava, uma vez, o que o módulo antigo do esboço (`modulos/esboco/`) resolvia para quem fica.
 *
 * Fatia 3 do plano esboço pelo núcleo, em 2026-11-05. Rodou no commit que ainda tinha o módulo (o pai do commit que o remove, ver
 * `docs/modelar/historico/esboco-2d.md`) e não roda depois dele: o módulo não existe mais, e o que ele resolvia ficou guardado como dado.
 * Para refazer, volte àquele commit e rode `node docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/gravar-o-que-o-modulo-resolvia.mjs`.
 *
 * O que grava:
 *  - `procedural/pecas/aviao/esboco-r2.formas.json`: as formas resolvidas (`mecanifica.formas-resolvidas@1`) da opção 1 do esboço aprovado
 *    do avião que as sete partes com `REFINA.esboco` ligam, com os moldes do recorte delas; a malha de cada forma de família entre elas,
 *    como o módulo a lia (recentrada, faces para fora); a orientação do plano do esboço; e o alvo do pacote do crítico de cada unidade;
 *  - `procedural/pecas/aviao/alvos/<unidade>-composta.png`: a composta da unidade, como o pacote do crítico a gerava (a cópia do
 *    `.esboco.json` sozinha numa pasta, `compostaArquivo` com a unidade);
 *  - `tools/fixtures/forma-do-esboco/bloco.formas.json`, com a composta do esboço inteiro como alvo (`alvos/bloco-composta.png`, na
 *    chave `*`), e as duas formas resolvidas da pá de hélice em `tools/fixtures/esboco-com-familias/`, para os testes da conferência de
 *    forma e do pacote do crítico;
 *  - `docs/modelar/banco-de-provas/calibracao-do-critico/fontes-de-esboco.json`: o objeto, as perguntas e as medidas de cada imagem do
 *    conjunto de calibração cuja fonte é um esboço;
 *  - `tools/modelar/familia-com-esboco.andaimes.json`, a partir das linhas que `familia-com-esboco.mjs` registrou com `GRAVAR_ANDAIMES`
 *    nos testes das famílias (ver `andaimes` abaixo).
 *
 * Uso: node <este arquivo> [aviao] [fixtures] [calibracao] [andaimes=<linhas.jsonl>]. Sem argumento, grava os três primeiros. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const imp = (c) => import(pathToFileURL(join(REPO, c)).href);
const lerJson = (c) => JSON.parse(readFileSync(join(REPO, c), 'utf8'));
const DATA = '2026-11-05';
const ESBOCO_DO_AVIAO = 'docs/modelar/banco-de-provas/aviao-2026-10-11/esboco-r2/aviao.esboco.json';
const PARTES_DO_AVIAO = ['asas', 'empenagem-horizontal', 'empenagem-vertical', 'helice', 'motor', 'trem-do-nariz', 'trens-principais'];
const args = process.argv.slice(2);
const pedidos = args.length ? args : ['aviao', 'fixtures', 'calibracao'];

/* Uma forma por linha e uma malha por linha: o arquivo fica legível em diff sem perder um bit dos números. */
function serializar(dados) {
  const linhas = ['{'];
  const chaves = Object.keys(dados);
  chaves.forEach((chave, i) => {
    const fim = i === chaves.length - 1 ? '' : ',';
    const valor = dados[chave];
    if (chave === 'formas') {
      linhas.push(`  "formas": [`, valor.map((f) => `    ${JSON.stringify(f)}`).join(',\n'), `  ]${fim}`);
    } else if (chave === 'malhas') {
      const ids = Object.keys(valor);
      linhas.push('  "malhas": {', ids.map((id) => `    ${JSON.stringify(id)}: ${JSON.stringify(valor[id])}`).join(',\n'), `  }${fim}`);
    } else linhas.push(`  ${JSON.stringify(chave)}: ${JSON.stringify(valor)}${fim}`);
  });
  linhas.push('}');
  return `${linhas.join('\n')}\n`;
}

/* As formas de `ids` e os moldes do recorte delas, de forma transitiva, na ordem da opção. */
function comMoldes(dados, ids) {
  const porId = new Map(dados.formas.map((f) => [f.id, f]));
  const queridas = new Set();
  const fila = [...ids];
  while (fila.length) {
    const id = fila.shift();
    if (queridas.has(id)) continue;
    if (!porId.has(id)) throw new Error(`a forma '${id}' não está na opção`);
    queridas.add(id);
    for (const c of porId.get(id).geometria.recorte?.cortadores ?? []) fila.push(c.id);
  }
  return dados.formas.filter((f) => queridas.has(f.id));
}

const malhaGuardada = (m) => ({ vertices: m.vertices, faces: m.faces, partes: m.partes });

async function formasGuardadas({ bruto, opcao, ids, origem, extra = {} }) {
  const { formasDoEsboco, malhaDaFormaDeFamilia } = await imp('tools/modelar/esboco-solido.mjs');
  const { lerPlano } = await imp('modulos/esboco/src/plano.js');
  const dados = formasDoEsboco(bruto, opcao);
  const formas = ids ? comMoldes(dados, ids) : dados.formas;
  const malhas = {};
  for (const f of formas) if (f.tipo === 'familia') malhas[f.id] = malhaGuardada(malhaDaFormaDeFamilia(f));
  const orientacao = lerPlano(bruto.plano)?.orientacao ?? null;
  const { formas: _todas, ...resto } = dados;
  return {
    ...resto,
    origem: { ...origem, gravadoEm: DATA, por: 'docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/gravar-o-que-o-modulo-resolvia.mjs' },
    orientacao,
    ...extra,
    formas,
    ...(Object.keys(malhas).length ? { malhas } : {}),
  };
}

async function aviao() {
  const { esbocoDeclarado } = await imp('tools/modelar/forma-do-esboco.mjs');
  const { unidadeDoAlvo } = await imp('tools/modelar/vistas-para-critica.mjs');
  const { formasDoEsboco } = await imp('tools/modelar/esboco-solido.mjs');
  const bruto = lerJson(ESBOCO_DO_AVIAO);
  const dados = formasDoEsboco(bruto, 1);
  const ligadas = new Set();
  const unidades = {};
  for (const parte of PARTES_DO_AVIAO) {
    const declarado = await esbocoDeclarado(`aviao/${parte}`);
    if (relative(REPO, declarado.esboco) !== ESBOCO_DO_AVIAO || declarado.opcao !== 1) throw new Error(`aviao/${parte} declara outro esboço ou outra opção`);
    const ids = [...new Set(Object.values(declarado.ligadas).flatMap((v) => (Array.isArray(v) ? v : v.formas)))].sort();
    for (const id of ids) ligadas.add(id);
    unidades[parte] = unidadeDoAlvo(dados, ids).unidade;
  }
  const pastaDosAlvos = join(REPO, 'procedural/pecas/aviao/alvos');
  mkdirSync(pastaDosAlvos, { recursive: true });
  const alvos = {};
  for (const unidade of [...new Set(Object.values(unidades))].sort()) {
    const nome = `${unidade}-composta.png`;
    await composta(ESBOCO_DO_AVIAO, unidade, join(pastaDosAlvos, nome));
    alvos[unidade] = `alvos/${nome}`;
  }
  const guardadas = await formasGuardadas({
    bruto, opcao: 1, ids: [...ligadas], origem: { esboco: ESBOCO_DO_AVIAO, opcao: 1, sha256: createHash('sha256').update(readFileSync(join(REPO, ESBOCO_DO_AVIAO))).digest('hex') },
    extra: { alvos },
  });
  writeFileSync(join(REPO, 'procedural/pecas/aviao/esboco-r2.formas.json'), serializar(guardadas));
  process.stderr.write(`avião: ${guardadas.formas.length} formas, ${Object.keys(guardadas.malhas ?? {}).length} malhas de família, ${Object.keys(alvos).length} alvos\n`);
}

/* A composta da unidade (null: o esboço inteiro) como o pacote do crítico a gerava: a cópia do esboço sozinha numa pasta. */
async function composta(esboco, unidade, destino) {
  const { compostaArquivo } = await imp('tools/modelar/esboco.mjs');
  const pasta = mkdtempSync(join(tmpdir(), 'alvo-do-esboco-'));
  try {
    const copia = join(pasta, basename(esboco));
    copyFileSync(join(REPO, esboco), copia);
    const feita = await compostaArquivo(copia, { unidade });
    mkdirSync(dirname(destino), { recursive: true });
    copyFileSync(feita.destino, destino);
    process.stderr.write(`composta ${unidade ?? 'do esboço inteiro'}: ${feita.largura}x${feita.altura} px\n`);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

async function fixtures() {
  const bloco = 'tools/fixtures/forma-do-esboco/bloco.esboco.json';
  await composta(bloco, null, join(REPO, 'tools/fixtures/forma-do-esboco/alvos/bloco-composta.png'));
  writeFileSync(join(REPO, 'tools/fixtures/forma-do-esboco/bloco.formas.json'), serializar(await formasGuardadas({ bruto: lerJson(bloco), opcao: 1, ids: null, origem: { esboco: bloco, opcao: 1 }, extra: { alvos: { '*': 'alvos/bloco-composta.png' } } })));
  /* a pá de hélice da família, como no teste da conferência: a forma de família no centro da caixa da malha, sem e com o molde */
  const { malhaDaChamada } = await imp('tools/modelar/esboco-familias.mjs');
  const PEDIDO = { familia: 'superficie-aerodinamica', perfil: 'pa-de-helice', parametros: {} };
  const malha = malhaDaChamada(PEDIDO);
  const caixa = { min: [0, 1, 2].map((i) => Math.min(...malha.vertices.map((v) => v[i]))), max: [0, 1, 2].map((i) => Math.max(...malha.vertices.map((v) => v[i]))) };
  const centro = caixa.min.map((m, i) => (m + caixa.max[i]) / 2);
  const esboco = (cortador = null) => ({
    opcoes: [{
      titulo: 'Pá',
      formas: [
        { id: 'pa', tipo: 'familia', ...PEDIDO, centro, ...(cortador ? { subtrai: ['corte'] } : {}) },
        ...(cortador ? [{ id: 'corte', tipo: 'caixa', cortador: true, ...cortador }] : []),
      ],
    }],
  });
  const altura = caixa.max[2] - caixa.min[2];
  const molde = { largura: 400, altura: 400, profundidade: altura, centro: [caixa.min[0] + 50 + 200, centro[1], centro[2]] };
  const origem = { esboco: 'superficie-aerodinamica, perfil pa-de-helice, no centro da caixa da malha', opcao: 1 };
  writeFileSync(join(REPO, 'tools/fixtures/esboco-com-familias/pa.formas.json'), serializar(await formasGuardadas({ bruto: esboco(), opcao: 1, ids: null, origem })));
  writeFileSync(join(REPO, 'tools/fixtures/esboco-com-familias/pa-recortada.formas.json'), serializar(await formasGuardadas({ bruto: esboco(molde), opcao: 1, ids: null, origem: { ...origem, esboco: `${origem.esboco}, menos uma caixa de 400 mm a 50 mm da ponta` } })));
  process.stderr.write('fixtures: bloco, pá e pá recortada\n');
}

async function calibracao() {
  const { esbocoDaFonte, idsDaMedidaDoEsboco } = await imp('tools/modelar/calibracao-do-critico.mjs');
  const { objetoDoEsboco } = await imp('tools/modelar/esboco.mjs');
  const { perguntasDoEsboco } = await imp('modulos/esboco/src/perguntas.js');
  const { medirEsboco } = await imp('modulos/esboco/src/descrever.js');
  const pasta = 'docs/modelar/banco-de-provas/calibracao-do-critico';
  const conj = lerJson(`${pasta}/conjunto.json`);
  const fontes = {};
  for (const imagem of conj.imagens.filter((i) => i.fonte.tipo === 'esboco')) {
    const { bruto, arquivoSha256 } = esbocoDaFonte(imagem.fonte, REPO);
    fontes[imagem.id] = {
      arquivo: imagem.fonte.arquivo, arquivoSha256, objeto: objetoDoEsboco(bruto), perguntas: perguntasDoEsboco(bruto).todas,
      medidas: idsDaMedidaDoEsboco(medirEsboco(bruto, { projecao: false })),
    };
  }
  const saida = { formato: 'mecanifica.fontes-de-esboco-da-calibracao@1', gravadoEm: DATA, por: 'docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/gravar-o-que-o-modulo-resolvia.mjs', fontes };
  writeFileSync(join(REPO, pasta, 'fontes-de-esboco.json'), `${JSON.stringify(saida, null, 2)}\n`);
  process.stderr.write(`calibração: ${Object.keys(fontes).length} fontes de esboço\n`);
}

/* As linhas que `familia-com-esboco.mjs` registra com GRAVAR_ANDAIMES=<arquivo> (uma por esboço mínimo conferido), sem repetir. */
function andaimes(arquivo) {
  const porChave = {};
  for (const linha of readFileSync(arquivo, 'utf8').split('\n').filter(Boolean)) {
    const { chave, componente, parametros, andaime, tabela } = JSON.parse(linha);
    if (porChave[chave] && JSON.stringify(porChave[chave].andaime) !== JSON.stringify(andaime)) throw new Error(`a chave ${chave} deu dois andaimes`);
    porChave[chave] = { componente, parametros, andaime, tabela };
  }
  const chaves = Object.keys(porChave).sort();
  const saida = { formato: 'mecanifica.andaimes-dos-componentes@1', gravadoEm: DATA, por: 'docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/gravar-o-que-o-modulo-resolvia.mjs', andaimes: Object.fromEntries(chaves.map((c) => [c, porChave[c]])) };
  const linhas = ['{', `  "formato": ${JSON.stringify(saida.formato)},`, `  "gravadoEm": ${JSON.stringify(saida.gravadoEm)},`, `  "por": ${JSON.stringify(saida.por)},`, '  "andaimes": {',
    chaves.map((c) => `    ${JSON.stringify(c)}: ${JSON.stringify(porChave[c])}`).join(',\n'), '  }', '}'];
  writeFileSync(join(REPO, 'tools/modelar/familia-com-esboco.andaimes.json'), `${linhas.join('\n')}\n`);
  process.stderr.write(`andaimes: ${chaves.length} esboços mínimos\n`);
}

for (const pedido of pedidos) {
  if (pedido === 'aviao') await aviao();
  else if (pedido === 'fixtures') await fixtures();
  else if (pedido === 'calibracao') await calibracao();
  else if (pedido.startsWith('andaimes=')) andaimes(resolve(pedido.slice('andaimes='.length)));
  else throw new Error(`pedido desconhecido: ${pedido}`);
}
