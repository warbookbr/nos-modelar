#!/usr/bin/env node
/* calibracao-do-critico.mjs — o conjunto de calibração do crítico visual e o gate `calibracao:check`.
 *
 *   npm run calibracao:check                  (node tools/mecanifica/calibracao-do-critico.mjs conferir)
 *   npm run calibracao -- gerar [--so=c01,c07] [--sem-prancha]
 *   npm run calibracao -- listar
 *
 * O conjunto mora em `docs/mecanifica/banco-de-provas/calibracao-do-critico/conjunto.json` (formato
 * `mecanifica.calibracao-do-critico@1`, validado por `src/autoria/calibracao-do-critico.js`). Doze imagens, cada uma com uma fonte
 * que se reproduz sem navegador: um esboço (com o remendo que o conjunto declara) ou uma chamada de família com a mutação declarada
 * (parâmetros que violam restrições nomeadas e substituições de argumento já derivado). As quatro vistas são as que o brief do
 * crítico do objeto recebe: as do esboço pelo mesmo desenhista de `briefDoObjeto` e as das famílias pelo desenhista da blocagem, com a
 * malha da peça executada, no mesmo quadro e com a mesma tinta.
 *
 * `conferir` é o gate e não abre navegador. Confere, para cada imagem, que o formato é válido, que a impressão do que a fonte desenha
 * hoje é a gravada (o SVG e a camada de cada vista, de modo que mudar a fonte, o desenhista ou a geometria exige gerar de novo), que
 * cada PNG é o arquivo gravado e que o controle é a geometria que o `aprovacao.json` da família aprovou. Confere também que o
 * agente `critico-visual.md` e o texto fixo do brief são os gravados, para que uma mudança no crítico obrigue a medir de novo, e que
 * a medida reprova, sem o crítico olhar, cada defeito que o conjunto diz ser dela, e só ele: a imagem é reprovada pelas medidas que
 * os defeitos citam e por nenhuma outra, de modo que `decide` vale dos dois lados.
 *
 * `gerar` abre o navegador, grava as quatro vistas de cada imagem em `imagens/<id>/`, as impressões no conjunto e a prancha. Os
 * resultados dos julgamentos ficam em `resultados`, vazio até a primeira rodada, e vazio o gate passa dizendo "calibração não medida".
 *
 *   npm run calibracao -- brief <id>                                       o brief exato que o crítico cego recebe para a imagem
 *   npm run calibracao -- registrar <id> --arquivo <saida-do-critico.txt>  grava o julgamento (a resposta termina com o JSON do veredito)
 *   npm run calibracao -- resumo                                           a pontuação por imagem e a do conjunto
 *
 * A pontuação (`pontuarConjunto`, em `src/autoria/calibracao-do-critico.js`) entra no gate: enquanto faltam julgamentos o gate diz
 * quantos faltam por imagem e passa; com todos, reprova se o conjunto não acerta. O gate também reprova o brief que conta o defeito
 * ou a mutação e o julgamento dado a um brief que já não é o da imagem. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { medirEsboco } from '../../modulos/esboco/src/descrever.js';
import { expandirChamadasDeComposicao } from '../../procedural/nucleo/entrada.js';
import { triangularFace } from '../../procedural/nucleo/triangulacao-face.js';
import { FAMILIAS, chamar } from '../../procedural/familias/index.js';
import { avaliarRestricao } from '../../src/autoria/familia.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { formasDaPeca } from '../../src/autoria/forma-da-parte.js';
import { conferirRazoesDaPeca, normalizarRazoesDaPeca } from '../../src/autoria/razoes-da-peca.js';
import { TIPOS_DE_DEFEITO } from '../../src/autoria/veredito-de-forma.js';
import {
  ErroDeCalibracao, FORMATO_CALIBRACAO, LARGURA_DAS_VISTAS, VISTAS_DO_CONJUNTO, dobrar, extrairVeredito, lerConjunto, medidasEsperadas, pontuarConjunto,
  resumoDoConjunto,
} from '../../src/autoria/calibracao-do-critico.js';
import { perguntasDoEsboco } from '../../modulos/esboco/src/perguntas.js';
import { juntarPerguntas } from '../../src/autoria/perguntas-do-critico.js';
import { ambienteDaExecucao, hashDe, MATERIAL_NEUTRO, pontosDaFamilia, pontosDosPerfis } from './aprovacao-da-familia.mjs';
import {
  ESCALA_DA_NOTA, MOTOR_DO_PNG, VISTAS_DA_ANALISE, desenhoParaPng, desenhosDoObjeto, linhasDoBriefDoObjeto, objetoDoEsboco,
} from './esboco.mjs';
import { blocoDasPerguntas } from './perguntas-da-peca.mjs';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA_DO_CONJUNTO = 'docs/mecanifica/banco-de-provas/calibracao-do-critico';
export const ARQUIVO_DO_CONJUNTO = 'conjunto.json';
export const ARQUIVO_DA_PRANCHA = 'prancha.png';
const IDENTIDADE_DA_CHAMADA = 'corpo';

const USO = [
  'uso:',
  '  npm run calibracao:check',
  '  npm run calibracao -- gerar [--so=c01,c07] [--sem-prancha]',
  '  npm run calibracao -- listar',
  '  npm run calibracao -- brief <id>',
  '  npm run calibracao -- registrar <id> --arquivo <saida-do-critico.txt>',
  '  npm run calibracao -- resumo',
].join('\n');

export class ErroDeUso extends Error {}
/* uma fonte que não se reproduz: a mensagem diz o que a fonte declara e o que existe */
export class ErroDaFonte extends Error {}

const sha256 = (dado) => `sha256:${createHash('sha256').update(dado).digest('hex')}`;
const semCR = (texto) => texto.replace(/\r\n/g, '\n');
const copia = (v) => JSON.parse(JSON.stringify(v));
const plano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ordenar = (lista) => [...lista].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/* ---------- o conjunto no disco ---------- */

export function caminhoDoConjunto(raiz = RAIZ) { return join(raiz, PASTA_DO_CONJUNTO, ARQUIVO_DO_CONJUNTO); }

export function lerConjuntoDoDisco({ raiz = RAIZ, exigirGerados = true } = {}) {
  const arquivo = caminhoDoConjunto(raiz);
  if (!existsSync(arquivo)) throw new ErroDaFonte(`o conjunto não existe: ${arquivo}`);
  return lerConjunto(JSON.parse(readFileSync(arquivo, 'utf8')), { exigirGerados });
}

/* ---------- o crítico: o agente e o brief ---------- */

export function hashDoAgente(arquivo, raiz = RAIZ) {
  const caminho = resolve(raiz, arquivo);
  if (!existsSync(caminho)) throw new ErroDaFonte(`o agente do crítico não existe: ${arquivo}`);
  return sha256(semCR(readFileSync(caminho, 'utf8')));
}

/** O texto fixo do brief do crítico do objeto, com e sem perguntas de forma, o bloco das perguntas da peça e a escala da nota. */
export function modeloDoBrief() {
  const imagens = VISTAS_DO_CONJUNTO.map((v) => `<pasta>/${v}.png`);
  const perguntas = ['De que lado fica a parte?'];
  return {
    objeto: linhasDoBriefDoObjeto({ objeto: '<título>: <nota>', anterior: [], imagens, perguntas: [] }),
    comPerguntas: linhasDoBriefDoObjeto({ objeto: '<título>: <nota>', anterior: [], imagens, perguntas }),
    bloco: blocoDasPerguntas(perguntas),
    escala: ESCALA_DA_NOTA,
  };
}
export const hashDoBrief = () => sha256(JSON.stringify(modeloDoBrief()));

/* ---------- o brief exato de uma imagem ---------- */

const ABRE_O_BRIEF = '--- brief para o crítico cego ---';
const FECHA_O_BRIEF = '--- fim do brief ---';

/**
 * O brief que o crítico cego recebe para uma imagem, o mesmo que o `--proximo` do esboço (ou o brief da peça) daria: o texto fixo do
 * brief do objeto, as perguntas de forma (as do esboço, com a família de objeto que o plano escolhe, ou as do `familia.json` da
 * família procedural da fonte), os caminhos absolutos das quatro vistas (pelo id neutro `cNN`) e a escala da nota, que é a última
 * das cinco perguntas fixas. Só o trecho entre as marcas do brief: a instrução a quem despacha o crítico não é do crítico.
 * A impressão (`sha256`) tira o caminho do repositório do texto, para valer em qualquer cópia dele.
 * Devolve `{ texto, sha256, imagens, perguntas, objeto, variavel }`; `variavel` é o que muda de uma imagem para outra (objeto, perguntas e
 * caminhos relativos), onde `vazamentosDoBrief` procura o defeito: o texto fixo é igual para todas e nomeia as categorias de defeito.
 */
export function briefDaImagem(imagem, { raiz = RAIZ } = {}) {
  let objeto;
  let perguntas;
  if (imagem.fonte.tipo === 'esboco') {
    const { bruto } = esbocoDaFonte(imagem.fonte, raiz);
    objeto = objetoDoEsboco(bruto);
    perguntas = perguntasDoEsboco(bruto).todas;
  } else {
    const familia = familiaRegistrada(imagem.fonte.familia);
    objeto = `${imagem.objeto.titulo}: ${imagem.objeto.nota}`;
    perguntas = juntarPerguntas(...Object.values(familia.contrato.perguntas ?? {}));
  }
  const imagens = VISTAS_DO_CONJUNTO.map((vista) => resolve(raiz, PASTA_DO_CONJUNTO, imagem.vistas?.[vista]?.arquivo ?? `imagens/${imagem.id}/${vista}.png`));
  const linhas = linhasDoBriefDoObjeto({ objeto, anterior: [], imagens, perguntas });
  const texto = `${linhas.slice(linhas.indexOf(ABRE_O_BRIEF) + 1, linhas.indexOf(FECHA_O_BRIEF)).join('\n')}\n`;
  const caminhos = VISTAS_DO_CONJUNTO.map((vista) => `imagens/${imagem.id}/${vista}.png`);
  return { texto, sha256: sha256(texto.replaceAll(resolve(raiz), '<raiz>')), imagens, perguntas, objeto, variavel: [objeto, ...perguntas, ...caminhos].join('\n') };
}

/* os sentidos de defeito que só se diriam ao descrever o defeito, e não a peça */
const SENTIDOS_QUE_DENUNCIAM = ['anguloso', 'segmentado', 'facetado', 'atravessando', 'afastado', 'faltando'];

/**
 * O que, na parte variável do brief de uma imagem, conta o defeito ou a mutação: o nome descritivo da imagem (em hífen e em
 * palavras), as restrições violadas, as razões que o defeito cita e os sentidos de defeito que só se usariam para descrevê-lo. As
 * partes de `forma:` não entram, porque nomeiam parte da peça que o objeto cita sem culpa. Vazio quando o brief é cego.
 */
export function vazamentosDoBrief(imagem, variavel) {
  const lido = dobrar(variavel);
  const nomes = [imagem.nome, imagem.nome.replace(/-/g, ' ')];
  const ids = [...(imagem.fonte.viola ?? []), ...imagem.defeitos.flatMap((d) => (d.medida ?? []).filter((m) => !m.startsWith('forma:')).map((m) => m.split(':').slice(1).join(':')))];
  const sentidos = imagem.defeitos.map((d) => d.sentido).filter((s) => SENTIDOS_QUE_DENUNCIAM.includes(s));
  const achados = [];
  for (const [rotulo, lista] of [['o nome da imagem', nomes], ['a restrição ou a medida do defeito', ids], ['o sentido do defeito', sentidos]]) {
    for (const palavra of new Set(lista)) if (lido.includes(dobrar(palavra))) achados.push(`${rotulo} '${palavra}'`);
  }
  return achados;
}

/** O vocabulário de defeito que o agente escreve (`- **tipo** — ...: `sentido`, ...`), por tipo. */
export function vocabularioDoAgente(texto) {
  const vocabulario = {};
  let atual = null;
  for (const linha of semCR(texto).split('\n')) {
    const m = /^- \*\*([a-z]+)\*\*/.exec(linha);
    if (m) { atual = m[1]; vocabulario[atual] = new Set(); } else if (linha.trim() === '') atual = null;
    if (atual) for (const t of linha.matchAll(/`([a-z_]+)`/g)) vocabulario[atual].add(t[1]);
  }
  return vocabulario;
}

/** Os tipos e sentidos que o conjunto aceita (os de `veredito-de-forma.js`) que o agente não escreve; vazio quando coincidem. */
export function faltaNoAgente(texto) {
  const escrito = vocabularioDoAgente(texto);
  const falta = [];
  for (const [tipo, sentidos] of Object.entries(TIPOS_DE_DEFEITO)) {
    if (!escrito[tipo]) { falta.push(`tipo ${tipo}`); continue; }
    for (const sentido of sentidos) if (!escrito[tipo].has(sentido)) falta.push(`sentido ${tipo}/${sentido}`);
  }
  return falta;
}

/* ---------- a fonte de uma imagem ---------- */

const fundir = (base, remendo) => {
  if (!plano(base) || !plano(remendo)) return copia(remendo);
  const saida = copia(base);
  for (const [chave, valor] of Object.entries(remendo)) saida[chave] = plano(valor) && plano(saida[chave]) ? fundir(saida[chave], valor) : copia(valor);
  return saida;
};

/** O esboço da fonte, com o remendo declarado, e a impressão do arquivo que o originou. */
export function esbocoDaFonte(fonte, raiz = RAIZ) {
  const caminho = resolve(raiz, fonte.arquivo);
  if (!existsSync(caminho)) throw new ErroDaFonte(`o esboço da fonte não existe: ${fonte.arquivo}`);
  const texto = semCR(readFileSync(caminho, 'utf8'));
  const bruto = JSON.parse(texto);
  return { bruto: fonte.remendo ? fundir(bruto, fonte.remendo) : bruto, arquivoSha256: sha256(texto) };
}

function familiaRegistrada(id) {
  const familia = FAMILIAS.find((f) => f.contrato.id === id);
  if (!familia) throw new ErroDaFonte(`a família '${id}' não está registrada; registradas: ${FAMILIAS.map((f) => f.contrato.id).sort().join(', ')}`);
  return familia;
}

/** Os parâmetros completos do ponto de partida da fonte: o perfil da família (`perfis` do familia.json), o padrão ou um ponto da faixa. */
function parametrosBase(familia, { base, perfil }) {
  if (perfil !== undefined) {
    const perfis = pontosDosPerfis(familia.contrato);
    if (!perfis[perfil]) throw new ErroDaFonte(`a família '${familia.contrato.id}' não declara o perfil '${perfil}'; os perfis são: ${Object.keys(perfis).join(', ') || 'nenhum'}`);
    return perfis[perfil];
  }
  if (base === 'padrao') return Object.fromEntries(Object.entries(familia.contrato.parametros).map(([nome, p]) => [nome, p.padrao]));
  return pontosDaFamilia(familia.contrato)[base];
}

/**
 * A chamada da família que a fonte declara: os parâmetros sobre a base e, quando violam restrições, só as que a fonte nomeia
 * (`viola`, que tem de ser exatamente o conjunto violado); depois a mutação dos argumentos derivados. `semMutacao` devolve a chamada
 * do ponto de partida, sem parâmetro, violação nem substituição.
 */
export function chamadaDaFonte(fonte, { semMutacao = false } = {}) {
  const familia = familiaRegistrada(fonte.familia);
  const completos = { ...parametrosBase(familia, fonte), ...(semMutacao ? {} : fonte.parametros ?? {}) };
  const declaradas = semMutacao ? [] : ordenar(fonte.viola ?? []);
  const violadas = ordenar(familia.contrato.restricoes.filter((r) => !avaliarRestricao(r, completos).satisfeita).map((r) => r.id));
  if (JSON.stringify(violadas) !== JSON.stringify(declaradas)) {
    throw new ErroDaFonte(`os parâmetros violam as restrições [${violadas.join(', ')}] e a fonte declara [${declaradas.join(', ')}] em \`viola\`: a mutação só viola de propósito o que nomeia`);
  }
  const permitida = declaradas.length > 0
    ? { ...familia, contrato: { ...familia.contrato, restricoes: familia.contrato.restricoes.filter((r) => !declaradas.includes(r.id)) } }
    : familia;
  const chamada = chamar(permitida, IDENTIDADE_DA_CHAMADA, completos);
  if (semMutacao) return { familia, chamada };
  const composicao = familia.composicoes.find((c) => c.id === chamada.composicao);
  const declarados = Object.keys(composicao.parametros ?? {});
  const argumentos = copia(chamada.argumentos);
  for (const op of fonte.argumentos ?? []) {
    if (op.nome !== undefined) {
      if (!declarados.includes(op.nome)) throw new ErroDaFonte(`'${op.nome}' não é argumento de '${composicao.id}'; os argumentos são: ${declarados.join(', ')}`);
      argumentos[op.nome] = copia(op.valor);
      continue;
    }
    const alvos = Object.keys(argumentos).filter((nome) => nome.startsWith(op.prefixo) && Array.isArray(argumentos[nome]));
    if (alvos.length === 0) throw new ErroDaFonte(`nenhum argumento de posição de '${composicao.id}' começa por '${op.prefixo}'`);
    for (const nome of alvos) argumentos[nome] = argumentos[nome].map((c, i) => (op.componentes.includes(i) ? c * op.fator : c));
  }
  return { familia, chamada: { ...chamada, argumentos } };
}

/** A peça executada de uma chamada, com o material neutro da aprovação (a aparência não entra na geometria). */
export function executarChamada(familia, chamada) {
  const { execucao } = ambienteDaExecucao(familia, { medir: false });
  const receita = { CHAMADAS_COMPOSICOES: [chamada], PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} };
  const { passos } = expandirChamadasDeComposicao(execucao.registroComposicoes, receita.CHAMADAS_COMPOSICOES);
  receita.MATERIAIS = Object.fromEntries(passos.filter(([operacao, args]) => operacao === 'material' && typeof args?.usa === 'string').map(([, args]) => [args.usa, MATERIAL_NEUTRO]));
  return executarReceita(receita, execucao).neutro;
}

/* ---------- o desenho ---------- */

/* a cor de cada parte, na ordem em que a parte aparece nas faces: pastéis claros, para as arestas pretas lerem */
export const CORES_DAS_PARTES = Object.freeze(['#c9d6e8', '#e8d2c9', '#cfe8c9', '#e8e2c9', '#d9c9e8', '#c9e8e4', '#e8c9d9', '#d8d8d8']);

/** A malha da peça executada no formato do desenhista da blocagem: milímetro, triângulos, um volume por parte. */
export function painelDoNeutro(neutro, { titulo, nota }) {
  const ids = [...neutro.V.keys()];
  const indice = new Map(ids.map((v, i) => [v, i]));
  const vertices = ids.map((v) => neutro.V.get(v).map((c) => c * 1000));
  const faces = [];
  const partes = [];
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    const parte = face.parte ?? '(sem parte)';
    if (!partes.includes(parte)) partes.push(parte);
    for (const [a, b, c] of triangularFace(face.vs.map((v) => neutro.V.get(v)))) {
      faces.push({ vertices: [indice.get(face.vs[a]), indice.get(face.vs[b]), indice.get(face.vs[c])], volume: parte });
    }
  }
  return {
    titulo, nota, ocultar: [], malha: { vertices, faces }, volumes: partes.map((id, i) => ({ id, cor: CORES_DAS_PARTES[i % CORES_DAS_PARTES.length] })),
  };
}

export function desenhosDoNeutro(neutro, objeto) {
  const painel = painelDoNeutro(neutro, objeto);
  return VISTAS_DO_CONJUNTO.map((vista) => ({ vista, r: desenharBlocagem({ vista, paineis: [painel] }, { camada: true }) }));
}

/** A impressão do que a fonte desenha: o SVG e a camada de cada vista, a largura do brief e o motor. */
export function hashDoDesenho(desenhos) {
  const h = createHash('sha256');
  h.update(JSON.stringify({ largura: LARGURA_DAS_VISTAS, motor: 'webgl', vistas: desenhos.map((d) => d.vista) }));
  for (const { vista, r } of desenhos) h.update(JSON.stringify({ vista, largura: r.largura, altura: r.altura, svg: r.svg, camada: r.camada ?? null }));
  return `sha256:${h.digest('hex')}`;
}

/* ---------- a medida ---------- */

function idsDaMedidaDoEsboco(medido) {
  return ordenar(medido.divergencias.map((d) => {
    const achado = (medido.plano.achados ?? []).find((a) => a.texto === d.texto);
    if (d.classe === 'medida' && achado?.nome) return `esboco-medida:${achado.nome}`;
    return `esboco-${d.classe}:${d.tipo}${d.pecas?.length ? `:${d.pecas.join('|')}` : ''}`;
  }));
}

/** As medidas que reprovam a peça de uma família, pelas declaradas em `medidas.familias.<id>`: `razao:<nome>` e `forma:<parte>`. */
export function idsDaMedidaDaPeca(neutro, suite = {}) {
  const ids = [];
  if (suite.razoes?.length) {
    const razoes = normalizarRazoesDaPeca(suite.razoes);
    for (const m of conferirRazoesDaPeca({ razoes, neutro }).medidas) if (!m.lida || !m.ok) ids.push(`razao:${m.nome}`);
  }
  if (suite.formas && Object.keys(suite.formas).length) {
    const { divergentes, indecidiveis } = formasDaPeca(neutro, { formas: suite.formas });
    for (const d of divergentes) ids.push(`forma:${d.parte}`);
    for (const i of indecidiveis ?? []) ids.push(`forma:${i.parte ?? i}`);
  }
  return ordenar(ids);
}

/* ---------- a imagem preparada ---------- */

/**
 * Tudo o que a fonte de uma imagem produz sem navegador: o desenho das quatro vistas e a impressão dele, a impressão da fonte
 * (arquivo ou geometria), a geometria do ponto de partida e as medidas que a reprovam.
 */
export function prepararImagem(imagem, conjunto, raiz = RAIZ) {
  const { fonte } = imagem;
  if (fonte.tipo === 'esboco') {
    const { bruto, arquivoSha256 } = esbocoDaFonte(fonte, raiz);
    if (MOTOR_DO_PNG !== 'webgl') throw new ErroDaFonte(`o motor das imagens do esboço é '${MOTOR_DO_PNG}' (ESBOCO_PNG); o conjunto é do motor webgl, com a camada de profundidade`);
    const desenhos = desenhosDoObjeto(bruto);
    return { desenhos, desenho: hashDoDesenho(desenhos), fonteSha256: arquivoSha256, medidas: idsDaMedidaDoEsboco(medirEsboco(bruto, { projecao: false })) };
  }
  const { familia, chamada } = chamadaDaFonte(fonte);
  const neutro = executarChamada(familia, chamada);
  const desenhos = desenhosDoNeutro(neutro, imagem.objeto);
  const preparada = {
    desenhos, desenho: hashDoDesenho(desenhos), fonteSha256: hashDe(neutro),
    medidas: idsDaMedidaDaPeca(neutro, conjunto.medidas.familias[fonte.familia]),
  };
  const mutada = (fonte.parametros && Object.keys(fonte.parametros).length > 0) || (fonte.argumentos?.length ?? 0) > 0;
  if (mutada) {
    const { familia: base, chamada: chamadaBase } = chamadaDaFonte(fonte, { semMutacao: true });
    preparada.baseSha256 = hashDe(executarChamada(base, chamadaBase));
  }
  return preparada;
}

/** O que a imagem é, em uma frase: a fonte e a mutação declaradas. */
export function descreverFonte(fonte) {
  if (fonte.tipo === 'esboco') {
    return `esboço ${fonte.arquivo.split('/').pop()}${fonte.remendo ? `, remendado com ${JSON.stringify(fonte.remendo)}` : ''}`;
  }
  const partes = [`${fonte.familia} ${fonte.perfil !== undefined ? `no perfil ${fonte.perfil}` : fonte.base === 'padrao' ? 'no padrão' : `no ponto ${fonte.base}`}`];
  if (fonte.aprovacao) partes.push(`geometria aprovada ${fonte.perfil !== undefined ? `do perfil ${fonte.perfil}` : `do ponto ${fonte.aprovacao}`}`);
  if (fonte.parametros) partes.push(Object.entries(fonte.parametros).map(([n, v]) => `${n}=${v}`).join(', '));
  if (fonte.viola) partes.push(`viola ${fonte.viola.join(', ')}`);
  for (const op of fonte.argumentos ?? []) {
    partes.push(op.nome !== undefined ? `${op.nome}=${JSON.stringify(op.valor)}` : `${op.prefixo}* × ${op.fator} nas componentes ${op.componentes.join(',')}`);
  }
  return partes.join('; ');
}

/* ---------- o gate ---------- */

/** O hash da geometria aprovada do ponto da faixa ou, com `perfil`, do perfil (`mecanica.perfis`) da família. */
function aprovadoDoPonto(familiaId, ponto, raiz, perfil) {
  const arquivo = join(raiz, 'procedural/familias', familiaId, 'aprovacao.json');
  if (!existsSync(arquivo)) return null;
  const { mecanica } = JSON.parse(readFileSync(arquivo, 'utf8'));
  return (perfil !== undefined ? mecanica?.perfis?.[perfil] : mecanica?.pontos?.[ponto])?.hash ?? null;
}

function lerIds(so, conjunto) {
  if (so === null || so === undefined || so === true) return null;
  const pedidos = String(so).split(',').map((s) => s.trim()).filter(Boolean);
  const existentes = conjunto.imagens.map((i) => i.id);
  const fora = pedidos.filter((id) => !existentes.includes(id));
  if (fora.length) throw new ErroDeUso(`--so cita ${fora.join(', ')}, que não está no conjunto (${existentes.join(', ')}).`);
  return pedidos;
}

/**
 * Confere o conjunto sem navegador. Devolve `{ ok, problemas, conjunto, resumo, medidasConferidas }`; cada problema é
 * `{ imagem, codigo, mensagem }`. `so` limita a conferência das imagens a uma lista de ids (o crítico e o formato valem sempre).
 */
export function conferirConjunto({ raiz = RAIZ, conjunto = null, so = null } = {}) {
  const problemas = [];
  const reprovar = (imagem, codigo, mensagem) => problemas.push({ imagem, codigo, mensagem });
  let conj = conjunto;
  if (conj === null) {
    try { conj = lerConjuntoDoDisco({ raiz }); } catch (erro) {
      if (!(erro instanceof ErroDeCalibracao || erro instanceof ErroDaFonte || erro instanceof SyntaxError)) throw erro;
      return { ok: false, problemas: [{ imagem: null, codigo: 'formato-invalido', mensagem: erro.message }], conjunto: null, resumo: null, medidasConferidas: 0 };
    }
  }
  const resumo = resumoDoConjunto(conj);

  /* o crítico: o agente, o vocabulário dele e o texto do brief */
  try {
    const caminho = resolve(raiz, conj.critico.agente.arquivo);
    const atual = hashDoAgente(conj.critico.agente.arquivo, raiz);
    if (atual !== conj.critico.agente.sha256) {
      reprovar(null, 'agente-mudou', `o agente ${conj.critico.agente.arquivo} mudou desde a calibração (gravado ${conj.critico.agente.sha256.slice(0, 19)}, agora ${atual.slice(0, 19)}): meça de novo as imagens e grave o crítico com \`npm run calibracao -- gerar\``);
    }
    const falta = faltaNoAgente(readFileSync(caminho, 'utf8'));
    if (falta.length) reprovar(null, 'vocabulario-do-agente', `o agente não escreve o vocabulário de defeito do conjunto: faltam ${falta.join(', ')}`);
  } catch (erro) {
    if (!(erro instanceof ErroDaFonte)) throw erro;
    reprovar(null, 'agente-ausente', erro.message);
  }
  const briefAtual = hashDoBrief();
  if (briefAtual !== conj.critico.brief.sha256) {
    reprovar(null, 'brief-mudou', `o texto fixo do brief do crítico mudou desde a calibração (gravado ${conj.critico.brief.sha256.slice(0, 19)}, agora ${briefAtual.slice(0, 19)}): meça de novo as imagens e grave o crítico com \`npm run calibracao -- gerar\``);
  }
  if (JSON.stringify(VISTAS_DA_ANALISE) !== JSON.stringify(conj.vistas.ordem)) {
    reprovar(null, 'vistas-do-esboco', `o esboço desenha as vistas ${VISTAS_DA_ANALISE.join(', ')} e o conjunto pede ${conj.vistas.ordem.join(', ')}`);
  }
  for (const [i, res] of conj.resultados.entries()) {
    if (res.agenteSha256 !== conj.critico.agente.sha256 || res.briefSha256 !== conj.critico.brief.sha256) {
      reprovar(res.imagem, 'resultado-de-outro-critico', `o resultado ${i + 1} foi medido com outro agente ou outro brief que o gravado em \`critico\`: refaça os julgamentos`);
    }
  }

  /* as imagens */
  const ids = lerIds(so, conj);
  let medidasConferidas = 0;
  for (const imagem of conj.imagens) {
    if (ids && !ids.includes(imagem.id)) continue;
    const quem = `${imagem.id} ${imagem.nome}`;
    let p;
    try { p = prepararImagem(imagem, conj, raiz); } catch (erro) {
      if (!(erro instanceof ErroDaFonte || erro instanceof ErroDeCalibracao || (erro && erro.name === 'ErroChamadaDeFamilia') || (erro && erro.name === 'ErroFamilia') || (erro && erro.name === 'ErroDeEsboco'))) throw erro;
      reprovar(quem, 'fonte-nao-reproduz', erro.message);
      continue;
    }
    if (p.desenho !== imagem.desenho.hash) {
      reprovar(quem, 'desenho-mudou', `o que a fonte desenha hoje (${p.desenho.slice(0, 19)}) não é o gravado (${imagem.desenho.hash.slice(0, 19)}): gere as vistas de novo com \`npm run calibracao -- gerar --so=${imagem.id}\` e meça o crítico nelas`);
    }
    const gravada = imagem.fonte.tipo === 'esboco' ? imagem.fonte.arquivoSha256 : imagem.fonte.geometria;
    if (p.fonteSha256 !== gravada) {
      reprovar(quem, imagem.fonte.tipo === 'esboco' ? 'esboco-mudou' : 'geometria-mudou', `${imagem.fonte.tipo === 'esboco' ? 'o arquivo do esboço' : 'a geometria da chamada'} mudou desde a geração (gravado ${gravada.slice(0, 19)}, agora ${p.fonteSha256.slice(0, 19)})`);
    }
    for (const vista of conj.vistas.ordem) {
      const { arquivo, sha256: esperado } = imagem.vistas[vista];
      const caminho = join(raiz, PASTA_DO_CONJUNTO, arquivo);
      if (!existsSync(caminho)) { reprovar(quem, 'imagem-ausente', `${arquivo} não existe`); continue; }
      const atual = sha256(readFileSync(caminho));
      if (atual !== esperado) reprovar(quem, 'imagem-diferente', `${arquivo} não é o arquivo gravado (gravado ${esperado.slice(0, 19)}, agora ${atual.slice(0, 19)})`);
    }
    if (imagem.fonte.aprovacao) {
      const { perfil } = imagem.fonte;
      const aprovado = aprovadoDoPonto(imagem.fonte.familia, imagem.fonte.aprovacao, raiz, perfil);
      const qual = perfil !== undefined ? `o perfil ${perfil}` : `o ponto ${imagem.fonte.aprovacao}`;
      if (aprovado === null) reprovar(quem, 'sem-aprovacao', `a família ${imagem.fonte.familia} não tem ${qual} aprovado em aprovacao.json`);
      else if (aprovado !== p.fonteSha256) reprovar(quem, 'controle-nao-e-o-aprovado', `o controle não é a geometria aprovada d${perfil !== undefined ? 'o perfil' : 'o ponto'} ${perfil ?? imagem.fonte.aprovacao} (aprovada ${aprovado.slice(0, 19)}, a fonte dá ${p.fonteSha256.slice(0, 19)})`);
    } else if (p.baseSha256 !== undefined && p.baseSha256 === p.fonteSha256) {
      reprovar(quem, 'mutacao-sem-efeito', 'a mutação declarada não muda a geometria do ponto de partida');
    }
    try {
      const brief = briefDaImagem(imagem, { raiz });
      const vazou = vazamentosDoBrief(imagem, brief.variavel);
      if (vazou.length) reprovar(quem, 'brief-vaza', `o brief que o crítico cego recebe conta o defeito: ${vazou.join('; ')}`);
      for (const res of conj.resultados.filter((r) => r.imagem === imagem.id)) {
        const outros = res.julgamentos.filter((j) => j.briefSha256 !== brief.sha256).length;
        if (outros) reprovar(quem, 'julgamento-de-outro-brief', `${outros} julgamento(s) foram dados a outro brief que o desta imagem hoje (perguntas, caminhos ou objeto mudaram): refaça-os`);
      }
    } catch (erro) {
      if (!(erro instanceof ErroDaFonte || erro instanceof ErroDeCalibracao || (erro && erro.name === 'ErroDeEsboco'))) throw erro;
      reprovar(quem, 'brief-nao-sai', erro.message);
    }
    const esperadas = medidasEsperadas(imagem);
    if (JSON.stringify(p.medidas) !== JSON.stringify(esperadas)) {
      const faltam = esperadas.filter((id) => !p.medidas.includes(id));
      const sobram = p.medidas.filter((id) => !esperadas.includes(id));
      reprovar(quem, 'medida-nao-decide', `a medida reprova [${p.medidas.join(', ') || 'nada'}] e os defeitos dela citam [${esperadas.join(', ') || 'nada'}]`
        + `${faltam.length ? `; não reprova ${faltam.join(', ')}, que é do crítico só se o defeito disser \`decide: critico\`` : ''}`
        + `${sobram.length ? `; reprova ${sobram.join(', ')}, que nenhum defeito cita (declare o defeito com \`decide: medida\` ou tire a medida)` : ''}`);
    } else {
      medidasConferidas += imagem.defeitos.filter((d) => d.decide === 'medida').length;
    }
  }
  if (!ids) {
    const prancha = conj.prancha;
    const caminho = join(raiz, PASTA_DO_CONJUNTO, prancha.arquivo);
    if (!existsSync(caminho)) reprovar(null, 'prancha-ausente', `${prancha.arquivo} não existe`);
    else if (sha256(readFileSync(caminho)) !== prancha.sha256) reprovar(null, 'prancha-diferente', `${prancha.arquivo} não é o arquivo gravado; gere a prancha de novo com \`npm run calibracao -- gerar\``);
  }
  /* a pontuação: enquanto faltam julgamentos o gate só conta o que falta; com todos, o conjunto tem de acertar */
  const pontuacao = ids ? null : pontuarConjunto(conj);
  if (pontuacao?.estado === 'reprova') {
    reprovar(null, 'calibracao-nao-acerta', `o crítico acerta ${pontuacao.acertos} de ${pontuacao.de} imagens (mínimo ${pontuacao.minimo})${pontuacao.obrigatoriasErradas.length ? `, e erra a obrigatória ${pontuacao.obrigatoriasErradas.join(', ')}` : ''}: `
      + `${pontuacao.imagens.filter((i) => i.acerta === false).map((i) => `${i.id} ${i.nome} (${i.motivos.join('; ')})`).join(' | ')}`);
  }
  return { ok: problemas.length === 0, problemas, conjunto: conj, resumo, pontuacao, medidasConferidas, conferidas: ids ?? conj.imagens.map((i) => i.id) };
}

export function conferir(opcoes = {}, saida = console) {
  let resultado;
  try {
    resultado = conferirConjunto({ so: opcoes.so ?? null, raiz: opcoes.raiz ?? RAIZ });
  } catch (erro) {
    if (!(erro instanceof ErroDeUso)) throw erro;
    saida.error(`calibracao: ${erro.message}\n${USO}`);
    return 2;
  }
  if (!resultado.ok) {
    saida.error(`calibracao:check FALHOU — ${resultado.problemas.length} problema(s):`);
    for (const p of resultado.problemas) saida.error(`  ${p.imagem ? `[${p.imagem}] ` : ''}${p.codigo}: ${p.mensagem}`);
    return 1;
  }
  const { resumo } = resultado;
  const classes = `${resumo.porClasse.controle} controles, ${resumo.porClasse.superficie} de superfície, ${resumo.porClasse.estrutural} estruturais`;
  saida.log(`calibracao:check ok — ${resultado.conferidas.length} de ${resumo.imagens} imagens (${classes}): formato válido, o desenho de cada fonte e os arquivos batem com o gravado, `
    + `${resultado.medidasConferidas} defeito(s) da medida reprovado(s) por ela sem chegar ao crítico, agente e brief iguais aos gravados.`);
  saida.log(resumo.frase);
  if (resultado.pontuacao) saida.log(linhaDoEstado(resultado.pontuacao));
  return 0;
}

/** O estado da pontuação em uma linha: o que falta por imagem enquanto falta, ou o veredito do conjunto quando estão todos. */
export function linhaDoEstado(pontuacao) {
  if (pontuacao.estado === 'nao-medido' || pontuacao.estado === 'pendente') {
    const faltam = Object.entries(pontuacao.faltam).map(([id, n]) => `${id} ${n}`).join(', ');
    return `pontuação pendente: faltam ${pontuacao.faltamNoTotal} julgamentos (${faltam}); o gate passa até que estejam todos.`;
  }
  return `pontuação: o crítico acerta ${pontuacao.acertos} de ${pontuacao.de} imagens (mínimo ${pontuacao.minimo}), com as obrigatórias ${pontuacao.obrigatoriasErradas.length ? 'erradas' : 'certas'}.`;
}

/* ---------- brief, registrar e resumo ---------- */

function imagemPorId(conj, id) {
  if (typeof id !== 'string' || id === '') throw new ErroDeUso(`diga o id da imagem (${conj.imagens.map((i) => i.id).join(', ')}).`);
  const achada = conj.imagens.find((i) => i.id === id);
  if (!achada) throw new ErroDeUso(`'${id}' não está no conjunto (${conj.imagens.map((i) => i.id).join(', ')}).`);
  return achada;
}

/** `brief <id>`: imprime o brief exato que o crítico cego recebe para a imagem. */
export function brief({ id, raiz = RAIZ }, saida = console) {
  const conj = lerConjuntoDoDisco({ raiz });
  const imagem = imagemPorId(conj, id);
  const { texto, variavel } = briefDaImagem(imagem, { raiz });
  const vazou = vazamentosDoBrief(imagem, variavel);
  if (vazou.length) throw new ErroDaFonte(`o brief de ${id} conta o defeito (${vazou.join('; ')}); corrija o objeto ou as perguntas antes de despachar o crítico`);
  saida.log(texto.trimEnd());
  return 0;
}

/**
 * `registrar <id> --arquivo <saida>`: lê a resposta do crítico, que termina com o JSON do veredito, e grava um julgamento em
 * `resultados` com a nota, os defeitos, a impressão do brief exato, a data e as impressões do agente e do brief fixo. Recusa
 * resposta sem JSON válido, o crítico que mudou desde a calibração e a imagem que já tem todos os julgamentos.
 */
export function registrar({ id, arquivo, raiz = RAIZ, agora = () => new Date() }, saida = console) {
  const conj = copia(lerConjuntoDoDisco({ raiz }));
  const imagem = imagemPorId(conj, id);
  if (typeof arquivo !== 'string' || arquivo === '') throw new ErroDeUso('diga a resposta do crítico: --arquivo <saida-do-critico.txt>.');
  if (!existsSync(resolve(arquivo))) throw new ErroDeUso(`o arquivo da resposta do crítico não existe: ${arquivo}`);
  const veredito = extrairVeredito(readFileSync(resolve(arquivo), 'utf8'));
  const agente = hashDoAgente(conj.critico.agente.arquivo, raiz);
  if (agente !== conj.critico.agente.sha256 || hashDoBrief() !== conj.critico.brief.sha256) {
    throw new ErroDaFonte('o agente ou o texto fixo do brief mudou desde a calibração: o julgamento não seria do crítico gravado; grave o crítico atual com `npm run calibracao -- gerar` e refaça os julgamentos');
  }
  const exato = briefDaImagem(imagem, { raiz });
  const vazou = vazamentosDoBrief(imagem, exato.variavel);
  if (vazou.length) throw new ErroDaFonte(`o brief de ${id} conta o defeito (${vazou.join('; ')}); não registro julgamento dele`);
  const entradas = conj.resultados.filter((r) => r.imagem === id);
  const outra = entradas.find((r) => r.agenteSha256 !== agente || r.briefSha256 !== conj.critico.brief.sha256);
  if (outra) throw new ErroDaFonte(`${id} tem julgamentos de outro agente ou de outro brief fixo; apague-os de \`resultados\` e refaça`);
  const recebidos = entradas.reduce((s, r) => s + r.julgamentos.length, 0);
  if (recebidos >= imagem.julgamentos) throw new ErroDaFonte(`${id} já tem ${recebidos} de ${imagem.julgamentos} julgamentos; não há mais o que registrar`);
  const julgamento = { nota: veredito.nota, defeitos: veredito.defeitos, briefSha256: exato.sha256, data: agora().toISOString() };
  if (entradas.length) entradas[0].julgamentos.push(julgamento);
  else conj.resultados.push({ imagem: id, agenteSha256: agente, briefSha256: conj.critico.brief.sha256, julgamentos: [julgamento] });
  lerConjunto(conj);
  writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(conj, null, 2)}\n`, 'utf8');
  saida.log(`${id} ${imagem.nome}: julgamento ${recebidos + 1} de ${imagem.julgamentos} registrado, nota ${veredito.nota}, ${veredito.defeitos.length} defeito(s); brief ${exato.sha256.slice(0, 19)}.`);
  return 0;
}

const numero = (n) => String(n).replace('.', ',');

/** `resumo`: a pontuação por imagem (notas, mediana, amplitude, critérios) e a do conjunto. Sai com 1 só quando estão todos os julgamentos e o conjunto não acerta. */
export function resumo({ raiz = RAIZ } = {}, saida = console) {
  const conj = lerConjuntoDoDisco({ raiz });
  const p = pontuarConjunto(conj);
  for (const i of p.imagens) {
    const cabeca = `${i.id} ${i.nome} (${i.classe}, nota ${i.faixa[0]} a ${i.faixa[1]}): ${i.recebidos} de ${i.esperados} julgamentos`;
    if (i.recebidos === 0) { saida.log(`${cabeca}; faltam ${i.faltam}`); continue; }
    const veredito = i.acerta === null ? `faltam ${i.faltam}` : i.acerta ? 'acerta' : 'erra';
    saida.log(`${cabeca}; notas ${i.notas.join(' ')}, mediana ${numero(i.mediana)}, amplitude ${numero(i.amplitude)}; ${veredito}`);
    for (const c of i.criterios.citacoes) saida.log(`    defeito de '${c.parte}' (${c.tipo}): citado em ${c.n} de ${i.recebidos} (mínimo ${c.minimo} de ${i.esperados}) ${c.ok ? 'ok' : 'abaixo'}`);
    if (i.criterios.estruturais) saida.log(`    defeito estrutural citado em ${i.criterios.estruturais.n} de ${i.recebidos} (máximo ${i.criterios.estruturais.maximo}) ${i.criterios.estruturais.ok ? 'ok' : 'acima'}`);
    for (const m of i.motivos) saida.log(`    erra: ${m}`);
  }
  const amplitudes = p.imagens.filter((i) => i.amplitude !== null).map((i) => i.amplitude);
  if (amplitudes.length) saida.log(`amplitude das notas por imagem: maior ${numero(Math.max(...amplitudes))}, média ${numero((amplitudes.reduce((s, a) => s + a, 0) / amplitudes.length).toFixed(2))}`);
  saida.log(resumoDoConjunto(conj).frase);
  saida.log(linhaDoEstado(p));
  if (p.estado === 'passa') saida.log('o conjunto passa.');
  if (p.estado === 'reprova') saida.log(`o conjunto reprova${p.obrigatoriasErradas.length ? `; obrigatória errada: ${p.obrigatoriasErradas.join(', ')}` : ''}.`);
  return p.estado === 'reprova' ? 1 : 0;
}

/* ---------- gerar ---------- */

const PALETA_DA_PRANCHA = { fundo: '#ffffff', texto: '#111111', suave: '#555555', borda: '#cccccc' };
const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function decisoresDaImagem(imagem) {
  if (imagem.defeitos.length === 0) return 'controle, sem defeito';
  const medida = imagem.defeitos.filter((d) => d.decide === 'medida').length;
  const critico = imagem.defeitos.length - medida;
  return [medida ? `medida decide ${medida}` : null, critico ? `crítico decide ${critico}` : null].filter(Boolean).join('; ');
}

/** A prancha das doze imagens: em cada célula as quatro vistas em grade e a legenda com o id, o nome, a classe, a faixa e quem decide. */
export function htmlDaPrancha(conjunto, raiz = RAIZ, { colunas = 3, vista = 270 } = {}) {
  const celulas = conjunto.imagens.map((imagem) => {
    const vistas = conjunto.vistas.ordem.map((v) => {
      const dados = readFileSync(join(raiz, PASTA_DO_CONJUNTO, imagem.vistas[v].arquivo)).toString('base64');
      return `<img src="data:image/png;base64,${dados}" width="${vista}">`;
    }).join('');
    const defeitos = imagem.defeitos.map((d) => `${d.parte} (${d.tipo} ${d.sentido}, ${d.decide})`).join('; ') || 'nenhum';
    return `<div class="celula"><div class="grade" style="width:${2 * vista}px">${vistas}</div>`
      + `<div class="legenda"><b>${escapar(imagem.id)} · ${escapar(imagem.nome)}</b> · ${escapar(imagem.classe)}, nota ${imagem.faixaDaNota[0]} a ${imagem.faixaDaNota[1]}, ${imagem.julgamentos} julgamentos${imagem.chave ? ', chave' : ''}${imagem.obrigatoria ? ', obrigatória' : ''}`
      + `<br>${escapar(decisoresDaImagem(imagem))}<br>defeitos: ${escapar(defeitos)}<br><span class="mut">${escapar(descreverFonte(imagem.fonte))}</span></div></div>`;
  }).join('\n');
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; padding: 16px; background: ${PALETA_DA_PRANCHA.fundo}; color: ${PALETA_DA_PRANCHA.texto}; font: 13px/1.35 Helvetica, Arial, sans-serif; }
    h1 { font-size: 20px; margin: 0 0 4px; } p { margin: 0 0 14px; color: ${PALETA_DA_PRANCHA.suave}; }
    .prancha { display: grid; grid-template-columns: repeat(${colunas}, ${2 * vista}px); gap: 18px 16px; width: max-content; }
    .celula { border: 1px solid ${PALETA_DA_PRANCHA.borda}; padding: 6px; }
    .grade { display: flex; flex-wrap: wrap; } .grade img { display: block; }
    .legenda { padding: 6px 2px 2px; } .mut { color: ${PALETA_DA_PRANCHA.suave}; }
  </style><h1>Conjunto de calibração do crítico: as doze imagens</h1>
  <p>Cada célula mostra as quatro vistas que o brief do crítico recebe (isométrica, frontal, lateral e superior). A legenda é para quem confere o conjunto: o crítico recebe só as vistas, sem título de célula nem legenda.</p>
  <div class="prancha">${celulas}</div>`;
}

export async function gerar({ raiz = RAIZ, so = null, prancha = true } = {}, saida = console) {
  if (MOTOR_DO_PNG !== 'webgl') throw new ErroDeUso(`ESBOCO_PNG=${MOTOR_DO_PNG}: o conjunto é do motor webgl; tire a variável.`);
  const caminho = caminhoDoConjunto(raiz);
  const conj = copia(lerConjuntoDoDisco({ raiz, exigirGerados: false }));
  const ids = lerIds(so, conj);
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  try {
    for (const imagem of conj.imagens) {
      if (ids && !ids.includes(imagem.id)) continue;
      const p = prepararImagem(imagem, conj, raiz);
      mkdirSync(join(raiz, PASTA_DO_CONJUNTO, 'imagens', imagem.id), { recursive: true });
      const vistas = {};
      for (const { vista, r } of p.desenhos) {
        const arquivo = `imagens/${imagem.id}/${vista}.png`;
        await desenhoParaPng(r, LARGURA_DAS_VISTAS, join(raiz, PASTA_DO_CONJUNTO, arquivo), navegador);
        vistas[vista] = { arquivo, sha256: sha256(readFileSync(join(raiz, PASTA_DO_CONJUNTO, arquivo))) };
      }
      if (imagem.fonte.tipo === 'esboco') imagem.fonte.arquivoSha256 = p.fonteSha256; else imagem.fonte.geometria = p.fonteSha256;
      imagem.desenho = { hash: p.desenho };
      imagem.vistas = vistas;
      saida.log(`${imagem.id} ${imagem.nome}: quatro vistas em ${PASTA_DO_CONJUNTO}/imagens/${imagem.id}/`);
    }
    conj.critico.agente.sha256 = hashDoAgente(conj.critico.agente.arquivo, raiz);
    conj.critico.brief.sha256 = hashDoBrief();
    if (prancha && !ids) {
      const completa = lerConjunto(conj, { exigirGerados: false });
      if (completa.imagens.every((i) => i.vistas)) {
        const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
        await pagina.setContent(htmlDaPrancha(completa, raiz));
        const destino = join(raiz, PASTA_DO_CONJUNTO, ARQUIVO_DA_PRANCHA);
        writeFileSync(destino, await pagina.screenshot({ fullPage: true }));
        await pagina.close();
        conj.prancha = { arquivo: ARQUIVO_DA_PRANCHA, sha256: sha256(readFileSync(destino)) };
        saida.log(`prancha: ${PASTA_DO_CONJUNTO}/${ARQUIVO_DA_PRANCHA}`);
      }
    }
  } finally {
    await navegador.close();
  }
  lerConjunto(conj, { exigirGerados: Boolean(conj.prancha) && conj.imagens.every((i) => i.vistas && i.desenho) });
  writeFileSync(caminho, `${JSON.stringify(conj, null, 2)}\n`, 'utf8');
  saida.log(`conjunto gravado em ${PASTA_DO_CONJUNTO}/${ARQUIVO_DO_CONJUNTO}; agente ${conj.critico.agente.sha256.slice(0, 19)}, brief ${conj.critico.brief.sha256.slice(0, 19)}.`);
  return 0;
}

export function listar(opcoes = {}, saida = console) {
  const conj = lerConjuntoDoDisco({ raiz: opcoes.raiz ?? RAIZ, exigirGerados: false });
  for (const imagem of conj.imagens) {
    saida.log(`${imagem.id} ${imagem.nome} — ${imagem.classe}, nota ${imagem.faixaDaNota[0]} a ${imagem.faixaDaNota[1]}, ${imagem.julgamentos} julgamentos${imagem.chave ? ', chave' : ''}${imagem.obrigatoria ? ', obrigatória' : ''}; ${decisoresDaImagem(imagem)}`);
    saida.log(`    fonte: ${descreverFonte(imagem.fonte)}`);
    for (const d of imagem.defeitos) saida.log(`    ${d.decide === 'medida' ? 'medida ' : 'crítico'} ${d.parte}: ${d.tipo} ${d.sentido}, ${d.onde}${d.medida ? ` [${d.medida.join(', ')}]` : ''}`);
  }
  saida.log(resumoDoConjunto(conj).frase);
  return 0;
}

/* ---------- a linha de comando ---------- */

/* as opções que levam valor aceitam `--arquivo x` e `--arquivo=x` */
const OPCOES_COM_VALOR = ['arquivo'];

function lerArgumentos(argv) {
  const posicionais = [];
  const opcoes = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { posicionais.push(arg); continue; }
    const [nome, ...resto] = arg.slice(2).split('=');
    if (resto.length) opcoes[nome] = resto.join('=');
    else if (OPCOES_COM_VALOR.includes(nome) && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) { opcoes[nome] = argv[i + 1]; i += 1; } else opcoes[nome] = true;
  }
  return { comando: posicionais[0] ?? null, argumentos: posicionais.slice(1), opcoes };
}

export async function principal(argv, saida = console) {
  const { comando, argumentos, opcoes } = lerArgumentos(argv);
  try {
    if (comando === 'conferir') return conferir({ so: opcoes.so }, saida);
    if (comando === 'brief') return brief({ id: argumentos[0] }, saida);
    if (comando === 'registrar') return registrar({ id: argumentos[0], arquivo: opcoes.arquivo === true ? undefined : opcoes.arquivo }, saida);
    if (comando === 'resumo') return resumo({}, saida);
    if (comando === 'gerar') return await gerar({ so: opcoes.so, prancha: !opcoes['sem-prancha'] }, saida);
    if (comando === 'listar') return listar({}, saida);
    throw new ErroDeUso(comando ? `comando '${comando}' desconhecido.` : 'falta o comando.');
  } catch (erro) {
    if (erro instanceof ErroDeUso) {
      saida.error(`calibracao: ${erro.message}\n${USO}`);
      return 2;
    }
    if (erro instanceof ErroDaFonte || erro instanceof ErroDeCalibracao) {
      saida.error(`calibracao: ${erro.message}`);
      return 1;
    }
    throw erro;
  }
}

export { FORMATO_CALIBRACAO };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await principal(process.argv.slice(2));
}
