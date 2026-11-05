#!/usr/bin/env node
/* calibracao-do-critico.mjs — o conjunto de calibração do crítico visual e o gate `calibracao:check`.
 *
 *   npm run calibracao:check                  (node tools/modelar/calibracao-do-critico.mjs conferir)
 *   npm run calibracao -- listar
 *
 * O conjunto mora em `docs/modelar/banco-de-provas/calibracao-do-critico/conjunto.json` (formato
 * `mecanifica.calibracao-do-critico@1`, validado por `src/autoria/calibracao-do-critico.js`). Doze imagens, cada uma com uma fonte: um
 * esboço (com o remendo que o conjunto declara) ou uma chamada de família com a mutação declarada (parâmetros que violam restrições
 * nomeadas e substituições de argumento já derivado). As quatro vistas são as que o brief do crítico do objeto recebia, desenhadas pelo
 * desenhista de linhas do módulo antigo do esboço: as do esboço pelo desenho dele e as das famílias pelo desenhista da blocagem, com a
 * malha da peça executada.
 *
 * AS IMAGENS SÃO AS GRAVADAS. O desenhista saiu com o módulo antigo do esboço em 2026-11-05 (plano esboço pelo núcleo), e com ele o
 * `gerar`, que redesenhava as vistas, e a conferência de que o que a fonte desenha hoje é o gravado. O conjunto vale pelas imagens que o
 * crítico julgou: os PNG, a geometria de cada fonte de família (o hash da peça executada, contra o `aprovacao.json`), o arquivo de cada
 * fonte de esboço e, dessas duas fontes, o objeto, as perguntas e as medidas que o módulo dava, gravados em `fontes-de-esboco.json` ao lado
 * do conjunto. Gerar de novo é refazer o conjunto por outro desenhista (as capturas da bancada), e então medir o crítico de novo.
 *
 * `conferir` é o gate e não abre navegador. Confere, para cada imagem, que o formato é válido, que a fonte é a gravada (a geometria da
 * família, o arquivo do esboço), que cada PNG é o arquivo gravado e que o controle é a geometria que o `aprovacao.json` da família
 * aprovou. Confere também que o agente `critico-visual.md` e o texto fixo do brief são os gravados, para que uma mudança no crítico
 * obrigue a medir de novo, e que a medida reprova, sem o crítico olhar, cada defeito que o conjunto diz ser dela, e só ele: a imagem é
 * reprovada pelas medidas que os defeitos citam e por nenhuma outra, de modo que `decide` vale dos dois lados.
 *
 *   npm run calibracao -- brief <id>                                       o brief exato que o crítico cego recebe para a imagem
 *   npm run calibracao -- registrar <id> --arquivo <saida-do-critico.txt>  grava o julgamento (a resposta termina com o JSON do veredito)
 *   npm run calibracao -- resumo                                           a pontuação por imagem e a do conjunto
 *   npm run calibracao -- migrar-imagem                                    migração única: grava `imagemSha256` nos julgamentos que ainda não o têm
 *
 * A pontuação (`pontuarConjunto`, em `src/autoria/calibracao-do-critico.js`) entra no gate: enquanto faltam julgamentos o gate diz
 * quantos faltam por imagem e passa; com todos, reprova se o conjunto não acerta. O gate também reprova o brief que conta o defeito
 * ou a mutação e o julgamento dado a um brief ou a vistas que já não são os da imagem (`imagemSha256`, a impressão das quatro vistas). */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expandirChamadasDeComposicao } from '../../procedural/nucleo/entrada.js';
import { FAMILIAS, chamar } from '../../procedural/familias/index.js';
import { avaliarRestricao } from '../../src/autoria/familia.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { formasDaPeca } from '../../src/autoria/forma-da-parte.js';
import { conferirRazoesDaPeca, normalizarRazoesDaPeca } from '../../src/autoria/razoes-da-peca.js';
import { TIPOS_DE_DEFEITO } from '../../src/autoria/veredito-de-forma.js';
import {
  ErroDeCalibracao, FORMATO_CALIBRACAO, VISTAS_DO_CONJUNTO, dobrar, extrairVeredito, lerConjunto, medidasEsperadas,
  nomeDaAmpliada, pontuarConjunto, resumoDoConjunto, vistasGravadas,
} from '../../src/autoria/calibracao-do-critico.js';
import { juntarPerguntas, linhasDasPerguntas } from '../../src/autoria/perguntas-do-critico.js';
import { ambienteDaExecucao, hashDe, MATERIAL_NEUTRO, pontosDaFamilia, pontosDosPerfis } from './aprovacao-da-familia.mjs';
import { blocoDasPerguntas } from './perguntas-da-peca.mjs';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA_DO_CONJUNTO = 'docs/modelar/banco-de-provas/calibracao-do-critico';
export const ARQUIVO_DO_CONJUNTO = 'conjunto.json';
export const ARQUIVO_DA_PRANCHA = 'prancha.png';
/* O objeto, as perguntas e as medidas das imagens de fonte esboço, como o módulo antigo do esboço os dava (gravados em 2026-11-05). */
export const ARQUIVO_DAS_FONTES_DE_ESBOCO = 'fontes-de-esboco.json';
export const FORMATO_DAS_FONTES_DE_ESBOCO = 'mecanifica.fontes-de-esboco-da-calibracao@1';
const IDENTIDADE_DA_CHAMADA = 'corpo';

const USO = [
  'uso:',
  '  npm run calibracao:check',
  '  npm run calibracao -- listar',
  '  npm run calibracao -- brief <id>',
  '  npm run calibracao -- registrar <id> --arquivo <saida-do-critico.txt>',
  '  npm run calibracao -- resumo',
  '  npm run calibracao -- migrar-imagem',
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

/* O TEXTO DO BRIEF DO CRÍTICO DO OBJETO. Era do esboço antigo (`tools/modelar/esboco.mjs` e `esboco-brief.mjs`), que o montava para o
   crítico cego do objeto inteiro; o conjunto de calibração o monta igual, byte a byte, para que a impressão gravada do brief (`critico.brief`)
   e a de cada julgamento continuem as mesmas. Veio para cá sem mudança quando o esboço antigo saiu. */
export const MARCA_DO_BRIEF = '--- brief para o crítico cego ---';
export const FIM_DO_BRIEF = '--- fim do brief ---';
const UNIDADE_DO_OBJETO = 'objeto';
/* A escala ancorada da nota, igual no agente `critico-visual` e nas perguntas da nota da unidade e do Marco. */
export const ESCALA_DA_NOTA = '10: nenhum achado. 8 e 9: só detalhe de superfície, acabamento ou proporção fina. 5 a 7: pelo menos um defeito estrutural (ponta no ar, travessia sem explicação, peça fora de onde deveria estar presa, peça sem função). 0 a 4: a unidade não cumpre a funcao. Nota abaixo de 8 tem de citar o defeito estrutural que a puxou; detalhe de superfície sozinho não desce a nota abaixo de 8.';
const PERGUNTA_DA_NOTA = (para) => `Nota de 0 a 10 para ${para}, com a razão em uma frase. Escala: ${ESCALA_DA_NOTA}`;
/* As perguntas do crítico do objeto inteiro. */
export const PERGUNTAS_DO_OBJETO = [
  'Que pontas ficam no ar, sem encostar em nada?',
  'O que atravessa o quê, sem que a forma explique a travessia?',
  'O que está fora do lugar em relação à parte a que deveria estar preso?',
  'O que a vista mostra que a função do objeto não explica?',
  PERGUNTA_DA_NOTA('o objeto'),
];
const TEXTO_DA_ESCALA_COMUM = 'na mesma escala, com a barra de 100 mm do mesmo comprimento nas quatro';

/* As linhas do brief que listam as vistas ampliadas (`ampliadas`, os caminhos), vazias quando não há. */
function linhasDasAmpliadas(ampliadas, recuo = '') {
  if (ampliadas.length === 0) return [];
  return [`${recuo}Vista ampliada em escala própria (na escala comum a peça fica pequena nela; a barra de 100 mm desta imagem tem outro comprimento, e as proporções entre vistas se comparam pelas quatro de cima):`, ...ampliadas.map((d) => `${recuo}  ${d}`)];
}

/** O texto do brief do crítico do objeto, sem desenhar nada: `objeto` (título e nota), `anterior` (as linhas do veredito anterior),
 *  `imagens` (os caminhos das quatro vistas, na escala comum), `ampliadas` (os das vistas ampliadas em escala própria, logo depois delas,
 *  quando há) e `perguntas` de forma além das cinco fixas. */
export function linhasDoBriefDoObjeto({ objeto, anterior = [], imagens, ampliadas = [], perguntas = [] }) {
  const L = ['crítico do objeto: o nível deste esboço não tem Detalhe por unidade, e a conclusão espera o veredito do crítico sobre o objeto inteiro.'];
  L.push(`Despache o agente critico-visual (Sonnet) com o brief abaixo e as imagens, sem o JSON, o plano nem o histórico; depois registre o veredito: --condutor --veredito ${UNIDADE_DO_OBJETO} --nota <0-10> --motivo <o que ele apontou> e rode --proximo de novo.`);
  L.push(MARCA_DO_BRIEF);
  L.push(`Objeto: ${objeto || '(sem título no esboço)'}`);
  L.push(...anterior);
  L.push(`Imagens do objeto (as quatro vistas, sem legenda, ${TEXTO_DA_ESCALA_COMUM}):`);
  for (const d of imagens) L.push(`  ${d}`);
  L.push(...linhasDasAmpliadas(ampliadas));
  L.push('Responda, olhando só as imagens:');
  L.push(...linhasDasPerguntas(PERGUNTAS_DO_OBJETO, perguntas));
  L.push(FIM_DO_BRIEF);
  return L;
}

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
    /* o texto que diz que a vista ampliada tem escala própria também é fixo */
    comAmpliada: linhasDoBriefDoObjeto({ objeto: '<título>: <nota>', anterior: [], imagens, ampliadas: [`<pasta>/${nomeDaAmpliada('lateral')}.png`], perguntas: [] }),
    bloco: blocoDasPerguntas(perguntas),
    escala: ESCALA_DA_NOTA,
  };
}
export const hashDoBrief = () => sha256(JSON.stringify(modeloDoBrief()));

/**
 * A impressão das quatro vistas que o crítico vê de uma imagem, na ordem do brief: o `sha256` gravado de cada PNG. Um julgamento
 * guarda essa impressão em `imagemSha256`; trocar a fonte de uma imagem sem mudar o texto do brief muda esta e não a do brief.
 */
export const hashDaImagem = (imagem) => sha256(vistasGravadas(imagem).map((vista) => imagem.vistas[vista].sha256).join('\n'));

/* ---------- o brief exato de uma imagem ---------- */

const ABRE_O_BRIEF = MARCA_DO_BRIEF;
const FECHA_O_BRIEF = FIM_DO_BRIEF;

/**
 * O brief que o crítico cego recebe para uma imagem, o mesmo que o `--proximo` do esboço (ou o brief da peça) daria: o texto fixo do
 * brief do objeto, as perguntas de forma (as do esboço, com a família de objeto que o plano escolhe, ou as do `familia.json` da
 * família procedural da fonte), os caminhos absolutos das quatro vistas (pelo id neutro `cNN`) e a escala da nota, que é a última
 * das cinco perguntas fixas. Só o trecho entre as marcas do brief: a instrução a quem despacha o crítico não é do crítico.
 * A impressão (`sha256`) tira do texto o caminho da pasta do conjunto e o do repositório, para valer em qualquer cópia dele e
 * depois de a pasta mudar de lugar: medido em 2026-10-28, trocar o nome da pasta `docs` do projeto para `docs/modelar` invalidou os 40 julgamentos das
 * doze imagens sem que nada do que o crítico vê tivesse mudado.
 * Devolve `{ texto, sha256, imagens, perguntas, objeto, variavel }`; `variavel` é o que muda de uma imagem para outra (objeto, perguntas e
 * caminhos relativos), onde `vazamentosDoBrief` procura o defeito: o texto fixo é igual para todas e nomeia as categorias de defeito.
 */
export const impressaoDoBrief = (texto, raiz = RAIZ) => sha256(texto.replaceAll(resolve(raiz, PASTA_DO_CONJUNTO), '<conjunto>').replaceAll(resolve(raiz), '<raiz>'));

export function briefDaImagem(imagem, { raiz = RAIZ } = {}) {
  let objeto;
  let perguntas;
  if (imagem.fonte.tipo === 'esboco') {
    ({ objeto, perguntas } = fonteDeEsbocoGravada(imagem, raiz));
  } else {
    const familia = familiaRegistrada(imagem.fonte.familia);
    objeto = `${imagem.objeto.titulo}: ${imagem.objeto.nota}`;
    perguntas = juntarPerguntas(...Object.values(familia.contrato.perguntas ?? {}));
  }
  const caminhos = vistasGravadas(imagem).map((vista) => `imagens/${imagem.id}/${vista}.png`);
  const imagens = caminhos.map((c, k) => resolve(raiz, PASTA_DO_CONJUNTO, imagem.vistas?.[vistasGravadas(imagem)[k]]?.arquivo ?? c));
  /* as quatro na escala comum e, depois, a ampliada em escala própria, quando a imagem tem */
  const linhas = linhasDoBriefDoObjeto({ objeto, anterior: [], imagens: imagens.slice(0, VISTAS_DO_CONJUNTO.length), ampliadas: imagens.slice(VISTAS_DO_CONJUNTO.length), perguntas });
  const texto = `${linhas.slice(linhas.indexOf(ABRE_O_BRIEF) + 1, linhas.indexOf(FECHA_O_BRIEF)).join('\n')}\n`;
  return { texto, sha256: impressaoDoBrief(texto, raiz), imagens, perguntas, objeto, variavel: [objeto, ...perguntas, ...caminhos].join('\n') };
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

/** O que o módulo antigo do esboço dava de uma imagem de fonte esboço, gravado em `fontes-de-esboco.json`: `{ arquivo, arquivoSha256,
 *  objeto, perguntas, medidas }`. Recusa a imagem que não está lá, e a fonte cujo arquivo mudou desde a gravação (o objeto, as perguntas e
 *  as medidas seriam de outro esboço). */
export function fonteDeEsbocoGravada(imagem, raiz = RAIZ) {
  const caminho = join(raiz, PASTA_DO_CONJUNTO, ARQUIVO_DAS_FONTES_DE_ESBOCO);
  if (!existsSync(caminho)) throw new ErroDaFonte(`${ARQUIVO_DAS_FONTES_DE_ESBOCO} não existe ao lado do conjunto: sem ele a imagem de fonte esboço não tem objeto, perguntas nem medidas`);
  const lidas = JSON.parse(readFileSync(caminho, 'utf8'));
  if (lidas.formato !== FORMATO_DAS_FONTES_DE_ESBOCO) throw new ErroDaFonte(`${ARQUIVO_DAS_FONTES_DE_ESBOCO} não é ${FORMATO_DAS_FONTES_DE_ESBOCO}`);
  const gravada = lidas.fontes?.[imagem.id];
  if (!gravada) throw new ErroDaFonte(`a imagem ${imagem.id} é de fonte esboço e não está em ${ARQUIVO_DAS_FONTES_DE_ESBOCO}; o esboço antigo saiu, e só as fontes gravadas se leem`);
  const { arquivoSha256 } = esbocoDaFonte(imagem.fonte, raiz);
  if (gravada.arquivo !== imagem.fonte.arquivo || gravada.arquivoSha256 !== arquivoSha256) {
    throw new ErroDaFonte(`o esboço da fonte de ${imagem.id} não é o que ${ARQUIVO_DAS_FONTES_DE_ESBOCO} gravou (gravado ${gravada.arquivo} ${gravada.arquivoSha256.slice(0, 19)}, agora ${imagem.fonte.arquivo} ${arquivoSha256.slice(0, 19)})`);
  }
  return gravada;
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

/* ---------- a medida ---------- */

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
 * Tudo o que a fonte de uma imagem produz sem navegador: a impressão da fonte (arquivo ou geometria), a geometria do ponto de partida e
 * as medidas que a reprovam. A fonte esboço dá as medidas gravadas (`fontes-de-esboco.json`), conferido o arquivo dela.
 */
export function prepararImagem(imagem, conjunto, raiz = RAIZ) {
  const { fonte } = imagem;
  if (fonte.tipo === 'esboco') {
    const gravada = fonteDeEsbocoGravada(imagem, raiz);
    return { fonteSha256: gravada.arquivoSha256, medidas: [...gravada.medidas] };
  }
  const { familia, chamada } = chamadaDaFonte(fonte);
  const neutro = executarChamada(familia, chamada);
  const preparada = {
    fonteSha256: hashDe(neutro),
    medidas: idsDaMedidaDaPeca(neutro, conjunto.medidas.familias[fonte.familia]),
  };
  const mutada = (fonte.parametros && Object.keys(fonte.parametros).length > 0) || (fonte.argumentos?.length ?? 0) > 0;
  if (mutada) {
    const { familia: base, chamada: chamadaBase } = chamadaDaFonte(fonte, { semMutacao: true });
    preparada.baseSha256 = hashDe(executarChamada(base, chamadaBase));
  }
  return preparada;
}

/* O que `prepararImagem` devolve depende só da fonte, do objeto da imagem, das medidas que o conjunto declara para a família, da raiz e,
   numa fonte de esboço, do texto do arquivo; o resto é código, que não muda num processo. Preparar uma imagem é o que o gate mais gasta
   (de 1 a 3 s por imagem, 12 imagens), e quem o chama várias vezes no mesmo processo (os testes do gate, que chamam o conferir com um
   conjunto novo a cada caso) repetia a conta com as mesmas entradas. A chave leva todas essas entradas, e a imagem de outra fonte, de
   outro remendo ou de outro arquivo é preparada de novo. O resultado guardado só é lido, nunca alterado, por quem o recebe. */
const IMAGENS_PREPARADAS = new Map();
export function prepararImagemGuardada(imagem, conjunto, raiz = RAIZ) {
  const { fonte } = imagem;
  let arquivo = null;
  if (fonte.tipo === 'esboco') {
    const caminho = resolve(raiz, fonte.arquivo);
    arquivo = existsSync(caminho) ? sha256(semCR(readFileSync(caminho, 'utf8'))) : null;
  }
  const chave = JSON.stringify([fonte, imagem.objeto ?? null, conjunto.medidas?.familias?.[fonte.familia] ?? null, raiz, arquivo]);
  if (!IMAGENS_PREPARADAS.has(chave)) IMAGENS_PREPARADAS.set(chave, prepararImagem(imagem, conjunto, raiz));
  return IMAGENS_PREPARADAS.get(chave);
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
      reprovar(null, 'agente-mudou', `o agente ${conj.critico.agente.arquivo} mudou desde a calibração (gravado ${conj.critico.agente.sha256.slice(0, 19)}, agora ${atual.slice(0, 19)}): meça o crítico de novo nas imagens e grave a impressão do agente em \`critico.agente\``);
    }
    const falta = faltaNoAgente(readFileSync(caminho, 'utf8'));
    if (falta.length) reprovar(null, 'vocabulario-do-agente', `o agente não escreve o vocabulário de defeito do conjunto: faltam ${falta.join(', ')}`);
  } catch (erro) {
    if (!(erro instanceof ErroDaFonte)) throw erro;
    reprovar(null, 'agente-ausente', erro.message);
  }
  const briefAtual = hashDoBrief();
  if (briefAtual !== conj.critico.brief.sha256) {
    reprovar(null, 'brief-mudou', `o texto fixo do brief do crítico mudou desde a calibração (gravado ${conj.critico.brief.sha256.slice(0, 19)}, agora ${briefAtual.slice(0, 19)}): meça o crítico de novo nas imagens e grave a impressão do brief em \`critico.brief\``);
  }
  if (JSON.stringify(VISTAS_DO_CONJUNTO) !== JSON.stringify(conj.vistas.ordem)) {
    reprovar(null, 'vistas-do-conjunto', `o brief mostra as vistas ${VISTAS_DO_CONJUNTO.join(', ')} e o conjunto pede ${conj.vistas.ordem.join(', ')}`);
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
    try { p = prepararImagemGuardada(imagem, conj, raiz); } catch (erro) {
      if (!(erro instanceof ErroDaFonte || erro instanceof ErroDeCalibracao || (erro && erro.name === 'ErroChamadaDeFamilia') || (erro && erro.name === 'ErroFamilia') || (erro && erro.name === 'ErroDeEsboco'))) throw erro;
      reprovar(quem, 'fonte-nao-reproduz', erro.message);
      continue;
    }
    const gravada = imagem.fonte.tipo === 'esboco' ? imagem.fonte.arquivoSha256 : imagem.fonte.geometria;
    if (p.fonteSha256 !== gravada) {
      reprovar(quem, imagem.fonte.tipo === 'esboco' ? 'esboco-mudou' : 'geometria-mudou', `${imagem.fonte.tipo === 'esboco' ? 'o arquivo do esboço' : 'a geometria da chamada'} mudou desde a geração (gravado ${gravada.slice(0, 19)}, agora ${p.fonteSha256.slice(0, 19)})`);
    }
    for (const vista of vistasGravadas(imagem)) {
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
      const hashAtual = hashDaImagem(imagem);
      const deOutraImagem = conj.resultados.filter((r) => r.imagem === imagem.id).flatMap((r) => r.julgamentos).filter((j) => j.imagemSha256 !== hashAtual).length;
      if (deOutraImagem) reprovar(quem, 'julgamento-de-outra-imagem', `${deOutraImagem} julgamento(s) foram dados a outra imagem que a de hoje (as vistas mudaram desde que o crítico as viu): julgue de novo`);
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
    else if (sha256(readFileSync(caminho)) !== prancha.sha256) reprovar(null, 'prancha-diferente', `${prancha.arquivo} não é o arquivo gravado`);
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
    resultado = conferirConjunto({ so: opcoes.so ?? null, raiz: opcoes.raiz ?? RAIZ, conjunto: opcoes.conjunto ?? null });
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
  saida.log(`calibracao:check ok — ${resultado.conferidas.length} de ${resumo.imagens} imagens (${classes}): formato válido, a fonte de cada imagem e os arquivos batem com o gravado, `
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
 * `resultados` com a nota, os defeitos, a impressão do brief exato, a das quatro vistas, a data e as impressões do agente e do brief
 * fixo. Recusa resposta sem JSON válido, o crítico que mudou desde a calibração, a imagem que já tem julgamentos dados a outras vistas
 * e a imagem que já tem todos os julgamentos.
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
  const hashDasVistas = hashDaImagem(imagem);
  if (entradas.some((r) => r.julgamentos.some((j) => j.imagemSha256 !== hashDasVistas))) {
    throw new ErroDaFonte(`${id} tem julgamentos dados a outra imagem que a de hoje (as vistas mudaram desde que o crítico as viu); apague-os de \`resultados\` e julgue de novo`);
  }
  const recebidos = entradas.reduce((s, r) => s + r.julgamentos.length, 0);
  if (recebidos >= imagem.julgamentos) throw new ErroDaFonte(`${id} já tem ${recebidos} de ${imagem.julgamentos} julgamentos; não há mais o que registrar`);
  const julgamento = { nota: veredito.nota, defeitos: veredito.defeitos, briefSha256: exato.sha256, imagemSha256: hashDasVistas, data: agora().toISOString() };
  if (entradas.length) entradas[0].julgamentos.push(julgamento);
  else conj.resultados.push({ imagem: id, agenteSha256: agente, briefSha256: conj.critico.brief.sha256, julgamentos: [julgamento] });
  lerConjunto(conj);
  writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(conj, null, 2)}\n`, 'utf8');
  saida.log(`${id} ${imagem.nome}: julgamento ${recebidos + 1} de ${imagem.julgamentos} registrado, nota ${veredito.nota}, ${veredito.defeitos.length} defeito(s); brief ${exato.sha256.slice(0, 19)}.`);
  return 0;
}

/**
 * `migrar-imagem`: migração única dos julgamentos gravados antes de `imagemSha256`. Preenche, em cada julgamento que não tem o campo, a
 * impressão das vistas atuais da imagem (todos foram dados às vistas gravadas hoje) e não muda nenhum outro campo nem sobrescreve o que
 * já tem. Roda sobre o JSON bruto, porque o conjunto sem o campo já não é válido. Sai com 0 e diz quantos preencheu.
 */
export function migrarImagemDosJulgamentos({ raiz = RAIZ } = {}, saida = console) {
  const arquivo = caminhoDoConjunto(raiz);
  if (!existsSync(arquivo)) throw new ErroDaFonte(`o conjunto não existe: ${arquivo}`);
  const conj = JSON.parse(readFileSync(arquivo, 'utf8'));
  let preenchidos = 0;
  for (const res of conj.resultados) {
    const imagem = conj.imagens.find((i) => i.id === res.imagem);
    if (!imagem) throw new ErroDaFonte(`o resultado cita a imagem ${res.imagem}, que não está no conjunto`);
    const hash = hashDaImagem(imagem);
    res.julgamentos = res.julgamentos.map((j) => {
      if (j.imagemSha256 !== undefined) return j;
      preenchidos += 1;
      const { data, ...resto } = j;
      return { ...resto, imagemSha256: hash, data };
    });
  }
  lerConjunto(conj);
  if (preenchidos > 0) writeFileSync(arquivo, `${JSON.stringify(conj, null, 2)}\n`, 'utf8');
  saida.log(`migrar-imagem: ${preenchidos} julgamento(s) receberam a impressão das vistas atuais da imagem.`);
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
    const vistas = vistasGravadas(imagem).map((v) => {
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
  <p>Cada célula mostra as quatro vistas que o brief do crítico recebe (isométrica, frontal, lateral e superior), na mesma escala, e depois delas a vista ampliada em escala própria, quando a imagem tem. A legenda é para quem confere o conjunto: o crítico recebe só as vistas, sem título de célula nem legenda.</p>
  <div class="prancha">${celulas}</div>`;
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
    if (comando === 'migrar-imagem') return migrarImagemDosJulgamentos({}, saida);
    if (comando === 'gerar') throw new ErroDeUso('o gerar redesenhava as vistas pelo desenhista do esboço antigo, que saiu em 2026-11-05; as imagens do conjunto são as gravadas.');
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
