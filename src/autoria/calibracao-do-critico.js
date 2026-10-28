/* calibracao-do-critico.js — o formato `mecanifica.calibracao-do-critico@1`: o conjunto de imagens com defeito conhecido em que o
 * crítico visual é medido.
 *
 * O crítico dá nota e aponta defeito, e nada diz se a nota dele é a de um olho que acerta. Este conjunto responde com doze
 * imagens geradas da geometria do próprio repositório, cada uma com a fonte que a reproduz (um esboço, ou uma chamada de
 * família, a partir de um ponto da faixa ou de um perfil do `familia.json`, mais a mutação declarada), as quatro vistas que o brief do crítico recebe, os defeitos esperados no vocabulário fechado
 * do crítico, a faixa de nota esperada e quem decide cada defeito: a medida, que o reprova antes de o crítico olhar, ou o crítico.
 *
 * A faixa de nota é a escala ancorada do brief: o controle (sem defeito) de 8 a 10, o defeito só de superfície de 8 a 9 e o
 * defeito estrutural de 5 a 7. Quatro imagens são as chaves e recebem cinco julgamentos cegos; as outras recebem três.
 *
 * O validador é puro: lê o JSON e recusa o que o formato não aceita, com o campo, o valor e o que era aceito. Os hashes, as
 * imagens e as medidas são conferidos por `tools/modelar/calibracao-do-critico.mjs`, que é o gate `calibracao:check`. O campo
 * `resultados` fica vazio até a primeira rodada de julgamentos, e vazio o conjunto diz "calibração não medida". Cada julgamento
 * guarda a nota, os defeitos que o crítico apontou, a impressão do brief exato, a impressão das quatro vistas que ele viu e a data; `extrairVeredito` lê a resposta do crítico
 * e `pontuarImagem` e `pontuarConjunto` dizem se a imagem e o conjunto acertam, pela regra da tarefa 6 do desenho da fatia 8. */
import { normalizarRazoesDaPeca } from './razoes-da-peca.js';
import { TIPOS_DE_DEFEITO, TIPOS_ESTRUTURAIS } from './veredito-de-forma.js';

export const FORMATO_CALIBRACAO = 'mecanifica.calibracao-do-critico@1';
export const CLASSES = Object.freeze(['controle', 'superficie', 'estrutural', 'funcao']);
export const FAIXAS_DA_NOTA = Object.freeze({
  controle: Object.freeze([8, 10]),
  superficie: Object.freeze([8, 9]),
  estrutural: Object.freeze([5, 7]),
  /* o defeito que tira a função da peça (a folha solta do pino, a roda fechada num tambor): a pessoa decidiu em 2026-10-11
     que vale de 0 a 7, porque o que se cobra é que o crítico reprove e cite o defeito, e ele pode descer à faixa de 0 a 4 */
  funcao: Object.freeze([0, 7]),
});
export const JULGAMENTOS_DA_CHAVE = 5;
export const JULGAMENTOS_DAS_OUTRAS = 3;
export const DECISORES = Object.freeze(['medida', 'critico']);
export const VISTAS_DO_CONJUNTO = Object.freeze(['isometrica', 'frontal', 'lateral', 'superior']);
export const LARGURA_DAS_VISTAS = 1100;
export const PONTOS_DA_FAMILIA = Object.freeze(['minimo', 'medio', 'maximo']);
/** O valor de `aprovacao` do controle que parte de um perfil: a geometria aprovada em `mecanica.perfis.<perfil>`. */
export const APROVACAO_DO_PERFIL = 'perfil';
export const BASES_DA_FAMILIA = Object.freeze(['padrao', ...PONTOS_DA_FAMILIA]);
/* `cota` é anotação de prancha: o conjunto só tem imagens de objeto */
export const TIPOS_DO_CONJUNTO = Object.freeze(Object.keys(TIPOS_DE_DEFEITO).filter((tipo) => tipo !== 'cota'));
/* os prefixos dos identificadores de medida que um defeito `medida` cita; o de esboço vem do `--medidas` do esboço */
export const PREFIXOS_DE_MEDIDA = Object.freeze({ familia: ['razao', 'forma'], esboco: ['esboco-medida'] });
export const MINIMO_DO_ONDE = 10;

export class ErroDeCalibracao extends Error {
  constructor({ onde, valor, aceito }) {
    super(`calibração do crítico: ${onde} recebeu ${JSON.stringify(valor)}; aceito: ${aceito}`);
    this.name = 'ErroDeCalibracao';
    this.onde = onde;
    this.valor = valor;
    this.aceito = aceito;
  }
}

const plano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const recusar = (onde, valor, aceito) => { throw new ErroDeCalibracao({ onde, valor, aceito }); };
const texto = (v) => typeof v === 'string' && v.trim() !== '';
const sha = (v) => typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v);
const finito = (v) => typeof v === 'number' && Number.isFinite(v);
const SLUG = /^[a-z][a-z0-9-]*$/;
const ID_DA_IMAGEM = /^c\d{2}$/;

function chaves(valor, permitidas, onde) {
  for (const chave of Object.keys(valor)) if (!permitidas.includes(chave)) recusar(`${onde}.${chave}`, valor[chave], `campo conhecido: ${permitidas.join(', ')}`);
}
function exigirChaves(valor, obrigatorias, onde) {
  for (const chave of obrigatorias) if (!Object.hasOwn(valor, chave)) recusar(`${onde}.${chave}`, undefined, 'o campo é obrigatório');
}
function exigirSha(valor, onde, exigirGerados) {
  if (valor === undefined && !exigirGerados) return;
  if (!sha(valor)) recusar(onde, valor, 'impressão "sha256:" seguida de 64 algarismos hexadecimais');
}
const caminhoRelativo = (v) => texto(v) && !v.startsWith('/') && !/^[a-zA-Z]:/.test(v) && !v.split('/').includes('..') && !v.includes('\\');

/* ---------- a fonte de uma imagem ---------- */

function lerArgumentos(lista, onde) {
  if (lista === undefined) return [];
  if (!Array.isArray(lista)) recusar(onde, lista, 'lista de mutações de argumento');
  return lista.map((op, i) => {
    const quando = `${onde}[${i}]`;
    if (!plano(op)) recusar(quando, op, 'objeto { nome, valor } ou { prefixo, componentes, fator }');
    if (op.nome !== undefined) {
      chaves(op, ['nome', 'valor'], quando);
      if (!texto(op.nome)) recusar(`${quando}.nome`, op.nome, 'nome de argumento da composição');
      const valor = op.valor;
      if (!(finito(valor) || (Array.isArray(valor) && valor.length > 0 && valor.every(finito)))) recusar(`${quando}.valor`, valor, 'número ou lista de números, em metro como o `derivar` entrega');
      return { nome: op.nome, valor };
    }
    chaves(op, ['prefixo', 'componentes', 'fator'], quando);
    if (!texto(op.prefixo)) recusar(`${quando}.prefixo`, op.prefixo, 'prefixo do nome dos argumentos de posição a escalar');
    if (!(Array.isArray(op.componentes) && op.componentes.length > 0 && op.componentes.every((c) => Number.isInteger(c) && c >= 0 && c <= 2))) recusar(`${quando}.componentes`, op.componentes, 'lista de índices de 0 a 2 das componentes do vetor a escalar');
    if (!(finito(op.fator) && op.fator > 0)) recusar(`${quando}.fator`, op.fator, 'número positivo');
    return { prefixo: op.prefixo, componentes: [...op.componentes], fator: op.fator };
  });
}

function lerFonte(fonte, onde, exigirGerados) {
  if (!plano(fonte)) recusar(onde, fonte, 'objeto { tipo: "esboco" | "familia", ... }');
  if (fonte.tipo === 'esboco') {
    chaves(fonte, ['tipo', 'arquivo', 'remendo', 'arquivoSha256'], onde);
    if (!(caminhoRelativo(fonte.arquivo) && /\.esboco\.json$/.test(fonte.arquivo))) recusar(`${onde}.arquivo`, fonte.arquivo, 'caminho relativo ao repositório de um arquivo .esboco.json');
    if (fonte.remendo !== undefined && !plano(fonte.remendo)) recusar(`${onde}.remendo`, fonte.remendo, 'objeto que se funde sobre o JSON do esboço (objetos se fundem, o resto é trocado)');
    exigirSha(fonte.arquivoSha256, `${onde}.arquivoSha256`, exigirGerados);
    return { tipo: 'esboco' };
  }
  if (fonte.tipo === 'familia') {
    chaves(fonte, ['tipo', 'familia', 'base', 'perfil', 'parametros', 'viola', 'argumentos', 'aprovacao', 'geometria'], onde);
    if (!(texto(fonte.familia) && SLUG.test(fonte.familia))) recusar(`${onde}.familia`, fonte.familia, 'id de uma família registrada');
    if (fonte.perfil !== undefined) {
      if (fonte.base !== undefined) recusar(`${onde}.base`, fonte.base, 'nenhuma: a chamada parte do perfil, e não de um ponto da faixa');
      if (!(texto(fonte.perfil) && SLUG.test(fonte.perfil))) recusar(`${onde}.perfil`, fonte.perfil, 'nome de um perfil declarado em `perfis` do familia.json da família');
    } else if (!BASES_DA_FAMILIA.includes(fonte.base)) recusar(`${onde}.base`, fonte.base, `ponto de partida da chamada: ${BASES_DA_FAMILIA.join(', ')} (ou \`perfil\`, o nome de um perfil da família)`);
    if (fonte.parametros !== undefined) {
      if (!plano(fonte.parametros)) recusar(`${onde}.parametros`, fonte.parametros, 'objeto { nome do parâmetro: número }, em mm, graus ou contagem');
      for (const [nome, valor] of Object.entries(fonte.parametros)) if (!finito(valor)) recusar(`${onde}.parametros.${nome}`, valor, 'número finito');
    }
    if (fonte.viola !== undefined) {
      if (!(Array.isArray(fonte.viola) && fonte.viola.length > 0 && fonte.viola.every(texto) && new Set(fonte.viola).size === fonte.viola.length)) recusar(`${onde}.viola`, fonte.viola, 'lista, sem repetição, dos ids das restrições que estes parâmetros violam de propósito');
      if (fonte.parametros === undefined) recusar(`${onde}.viola`, fonte.viola, 'só vale com `parametros`, que são os valores que violam');
    }
    const argumentos = lerArgumentos(fonte.argumentos, `${onde}.argumentos`);
    if (fonte.aprovacao !== undefined) {
      const doPerfil = fonte.perfil !== undefined;
      const aprovados = doPerfil ? [APROVACAO_DO_PERFIL] : PONTOS_DA_FAMILIA;
      if (!aprovados.includes(fonte.aprovacao)) recusar(`${onde}.aprovacao`, fonte.aprovacao, doPerfil ? `'${APROVACAO_DO_PERFIL}', a geometria aprovada do perfil da fonte` : `ponto aprovado da família: ${PONTOS_DA_FAMILIA.join(', ')}`);
      if ((!doPerfil && fonte.base !== fonte.aprovacao) || fonte.parametros !== undefined || fonte.viola !== undefined || argumentos.length > 0) recusar(`${onde}.aprovacao`, fonte.aprovacao, 'só o controle: a base é o próprio ponto aprovado e não há parâmetro, restrição violada nem mutação');
    }
    exigirSha(fonte.geometria, `${onde}.geometria`, exigirGerados);
    return { tipo: 'familia' };
  }
  return recusar(`${onde}.tipo`, fonte.tipo, '"esboco" ou "familia"');
}

/* ---------- os defeitos ---------- */

function lerDefeito(d, onde, tipoDaFonte) {
  if (!plano(d)) recusar(onde, d, 'objeto { parte, tipo, sentido, onde, decide, ... }');
  chaves(d, ['parte', 'tipo', 'sentido', 'onde', 'decide', 'medida', 'tiposAceitos', 'palavras'], onde);
  exigirChaves(d, ['parte', 'tipo', 'sentido', 'onde', 'decide'], onde);
  if (!texto(d.parte)) recusar(`${onde}.parte`, d.parte, 'nome da parte como o defeito a cita');
  if (!TIPOS_DO_CONJUNTO.includes(d.tipo)) recusar(`${onde}.tipo`, d.tipo, `tipo do vocabulário do crítico: ${TIPOS_DO_CONJUNTO.join(', ')}`);
  if (!TIPOS_DE_DEFEITO[d.tipo].includes(d.sentido)) recusar(`${onde}.sentido`, d.sentido, `sentido de '${d.tipo}': ${TIPOS_DE_DEFEITO[d.tipo].join(', ')}`);
  if (!(texto(d.onde) && d.onde.trim().length >= MINIMO_DO_ONDE)) recusar(`${onde}.onde`, d.onde, `a extremidade ou o trecho, em pelo menos ${MINIMO_DO_ONDE} caracteres, nunca o corpo inteiro`);
  if (!DECISORES.includes(d.decide)) recusar(`${onde}.decide`, d.decide, `quem decide o defeito: ${DECISORES.join(' ou ')}`);
  if (d.tiposAceitos !== undefined) {
    if (!(Array.isArray(d.tiposAceitos) && d.tiposAceitos.includes(d.tipo) && d.tiposAceitos.every((t) => TIPOS_DO_CONJUNTO.includes(t)) && new Set(d.tiposAceitos).size === d.tiposAceitos.length)) {
      recusar(`${onde}.tiposAceitos`, d.tiposAceitos, `lista de tipos do vocabulário, sem repetição, que inclui o próprio tipo '${d.tipo}'`);
    }
  }
  if (d.decide === 'medida') {
    const prefixos = PREFIXOS_DE_MEDIDA[tipoDaFonte];
    if (!(Array.isArray(d.medida) && d.medida.length > 0 && d.medida.every((id) => texto(id) && prefixos.some((p) => id.startsWith(`${p}:`) && id.length > p.length + 1)) && new Set(d.medida).size === d.medida.length)) {
      recusar(`${onde}.medida`, d.medida, `lista, sem repetição, das medidas que reprovam o defeito, cada uma "<prefixo>:<nome>" com o prefixo em ${prefixos.join(', ')}`);
    }
    if (d.palavras !== undefined) recusar(`${onde}.palavras`, d.palavras, 'só o defeito que o crítico decide leva palavras; o da medida não é cobrado do crítico');
  } else {
    if (d.medida !== undefined) recusar(`${onde}.medida`, d.medida, 'só o defeito que a medida decide cita medida');
    if (!(Array.isArray(d.palavras) && d.palavras.length > 0 && d.palavras.every((p) => texto(p) && p === p.toLowerCase()))) {
      recusar(`${onde}.palavras`, d.palavras, 'lista de palavras em minúsculas que o veredito do crítico usa ao citar este defeito (parte, onde ou evidência)');
    }
  }
  return d;
}

/* ---------- as medidas declaradas por família ---------- */

function lerMedidas(medidas, onde) {
  if (!plano(medidas)) recusar(onde, medidas, 'objeto { familias: { <id>: { razoes, formas } } }');
  chaves(medidas, ['familias'], onde);
  if (!plano(medidas.familias)) recusar(`${onde}.familias`, medidas.familias, 'objeto { <id da família>: { razoes, formas } }');
  const declaradas = {};
  for (const [id, suite] of Object.entries(medidas.familias)) {
    const quando = `${onde}.familias.${id}`;
    if (!SLUG.test(id)) recusar(quando, id, 'id de família em minúsculas, com hífen entre as palavras');
    if (!plano(suite)) recusar(quando, suite, 'objeto { nota, razoes, formas }');
    chaves(suite, ['nota', 'razoes', 'formas'], quando);
    if (suite.nota !== undefined && !texto(suite.nota)) recusar(`${quando}.nota`, suite.nota, 'texto que diz o que a medida cobre e o que fica com o crítico');
    let razoes = [];
    if (suite.razoes !== undefined) {
      try { razoes = normalizarRazoesDaPeca(suite.razoes) ?? []; } catch (e) { recusar(`${quando}.razoes`, suite.razoes, e.message); }
    }
    const formas = suite.formas === undefined ? {} : suite.formas;
    if (!plano(formas)) recusar(`${quando}.formas`, formas, 'objeto { parte: "solido" | "anel" | { furos } }');
    declaradas[id] = { razoes: razoes.map((r) => r.nome), formas: Object.keys(formas) };
  }
  return declaradas;
}

/* ---------- o conjunto ---------- */

/**
 * Lê e valida o conjunto. `exigirGerados` (padrão) cobra o que o gerador grava: a impressão do desenho, as quatro vistas com a
 * impressão de cada arquivo, a da fonte, a do crítico e a prancha; sem ele o gerador pode ler o conjunto escrito à mão. Devolve o
 * mesmo objeto, congelado de fora para dentro só por convenção: quem chama não deve alterá-lo.
 */
export function lerConjunto(bruto, { exigirGerados = true } = {}) {
  if (!plano(bruto)) recusar('conjunto', bruto, 'objeto com formato, critico, vistas, faixasDaNota, regra, medidas, imagens e resultados');
  chaves(bruto, ['formato', 'versao', 'descricao', 'critico', 'vistas', 'faixasDaNota', 'regra', 'medidas', 'imagens', 'prancha', 'resultados'], 'conjunto');
  exigirChaves(bruto, ['formato', 'versao', 'descricao', 'critico', 'vistas', 'faixasDaNota', 'regra', 'medidas', 'imagens', 'resultados'], 'conjunto');
  if (bruto.formato !== FORMATO_CALIBRACAO) recusar('conjunto.formato', bruto.formato, `"${FORMATO_CALIBRACAO}"`);
  if (!(texto(bruto.versao) && /^\d+\.\d+\.\d+$/.test(bruto.versao))) recusar('conjunto.versao', bruto.versao, 'versão semântica x.y.z');
  if (!texto(bruto.descricao)) recusar('conjunto.descricao', bruto.descricao, 'texto que diz o que o conjunto é');

  const c = bruto.critico;
  if (!plano(c)) recusar('conjunto.critico', c, 'objeto { agente: { arquivo, sha256 }, brief: { sha256, fonte } }');
  chaves(c, ['agente', 'brief'], 'conjunto.critico');
  if (!plano(c.agente)) recusar('conjunto.critico.agente', c.agente, 'objeto { arquivo, sha256 }');
  chaves(c.agente, ['arquivo', 'sha256'], 'conjunto.critico.agente');
  if (!(caminhoRelativo(c.agente.arquivo) && c.agente.arquivo.endsWith('.md'))) recusar('conjunto.critico.agente.arquivo', c.agente.arquivo, 'caminho relativo ao repositório do .md do agente');
  exigirSha(c.agente.sha256, 'conjunto.critico.agente.sha256', exigirGerados);
  if (!plano(c.brief)) recusar('conjunto.critico.brief', c.brief, 'objeto { sha256, fonte }');
  chaves(c.brief, ['sha256', 'fonte'], 'conjunto.critico.brief');
  if (!texto(c.brief.fonte)) recusar('conjunto.critico.brief.fonte', c.brief.fonte, 'texto que diz de onde sai o texto do brief que a impressão cobre');
  exigirSha(c.brief.sha256, 'conjunto.critico.brief.sha256', exigirGerados);

  const v = bruto.vistas;
  if (!plano(v)) recusar('conjunto.vistas', v, 'objeto { ordem, largura }');
  chaves(v, ['ordem', 'largura'], 'conjunto.vistas');
  if (JSON.stringify(v.ordem) !== JSON.stringify(VISTAS_DO_CONJUNTO)) recusar('conjunto.vistas.ordem', v.ordem, `as quatro vistas do brief, nesta ordem: ${VISTAS_DO_CONJUNTO.join(', ')}`);
  if (v.largura !== LARGURA_DAS_VISTAS) recusar('conjunto.vistas.largura', v.largura, `${LARGURA_DAS_VISTAS}, a largura de cada vista no brief do crítico`);

  if (JSON.stringify(bruto.faixasDaNota) !== JSON.stringify(FAIXAS_DA_NOTA)) recusar('conjunto.faixasDaNota', bruto.faixasDaNota, `a escala ancorada do brief: ${JSON.stringify(FAIXAS_DA_NOTA)}`);

  const r = bruto.regra;
  if (!plano(r)) recusar('conjunto.regra', r, 'objeto { julgamentosDaChave, julgamentosDasOutras, acerto, passa }');
  chaves(r, ['julgamentosDaChave', 'julgamentosDasOutras', 'acerto', 'passa'], 'conjunto.regra');
  if (r.julgamentosDaChave !== JULGAMENTOS_DA_CHAVE) recusar('conjunto.regra.julgamentosDaChave', r.julgamentosDaChave, `${JULGAMENTOS_DA_CHAVE}`);
  if (r.julgamentosDasOutras !== JULGAMENTOS_DAS_OUTRAS) recusar('conjunto.regra.julgamentosDasOutras', r.julgamentosDasOutras, `${JULGAMENTOS_DAS_OUTRAS}`);
  if (!texto(r.acerto)) recusar('conjunto.regra.acerto', r.acerto, 'texto que diz quando uma imagem acerta');
  if (!plano(r.passa)) recusar('conjunto.regra.passa', r.passa, 'objeto { minimo, de, obrigatorias }');
  chaves(r.passa, ['minimo', 'de', 'obrigatorias'], 'conjunto.regra.passa');

  if (!Array.isArray(bruto.imagens) || bruto.imagens.length === 0) recusar('conjunto.imagens', bruto.imagens, 'lista com as imagens do conjunto');
  const ids = new Set();
  const nomes = new Set();
  const imagens = bruto.imagens.map((imagem, i) => {
    const onde = `conjunto.imagens[${i}]`;
    if (!plano(imagem)) recusar(onde, imagem, 'objeto de imagem');
    chaves(imagem, ['id', 'nome', 'classe', 'chave', 'obrigatoria', 'julgamentos', 'faixaDaNota', 'objeto', 'fonte', 'defeitos', 'desenho', 'vistas'], onde);
    exigirChaves(imagem, ['id', 'nome', 'classe', 'chave', 'obrigatoria', 'julgamentos', 'faixaDaNota', 'fonte', 'defeitos'], onde);
    if (!(texto(imagem.id) && ID_DA_IMAGEM.test(imagem.id))) recusar(`${onde}.id`, imagem.id, 'id neutro "c" seguido de dois algarismos (o nome do arquivo que o crítico lê não conta o defeito)');
    if (ids.has(imagem.id)) recusar(`${onde}.id`, imagem.id, 'id que ainda não está no conjunto');
    ids.add(imagem.id);
    if (!(texto(imagem.nome) && SLUG.test(imagem.nome))) recusar(`${onde}.nome`, imagem.nome, 'nome em minúsculas, com hífen entre as palavras');
    if (nomes.has(imagem.nome)) recusar(`${onde}.nome`, imagem.nome, 'nome que ainda não está no conjunto');
    nomes.add(imagem.nome);
    if (!CLASSES.includes(imagem.classe)) recusar(`${onde}.classe`, imagem.classe, CLASSES.join(', '));
    if (typeof imagem.chave !== 'boolean') recusar(`${onde}.chave`, imagem.chave, 'verdadeiro nas quatro imagens-chave e falso nas outras');
    if (typeof imagem.obrigatoria !== 'boolean') recusar(`${onde}.obrigatoria`, imagem.obrigatoria, 'verdadeiro nas imagens que o conjunto precisa acertar para passar');
    if (imagem.obrigatoria && !imagem.chave) recusar(`${onde}.obrigatoria`, imagem.obrigatoria, 'só uma imagem-chave é obrigatória');
    const esperados = imagem.chave ? JULGAMENTOS_DA_CHAVE : JULGAMENTOS_DAS_OUTRAS;
    if (imagem.julgamentos !== esperados) recusar(`${onde}.julgamentos`, imagem.julgamentos, `${esperados} ${imagem.chave ? '(imagem-chave)' : '(imagem comum)'}`);
    if (JSON.stringify(imagem.faixaDaNota) !== JSON.stringify(FAIXAS_DA_NOTA[imagem.classe])) recusar(`${onde}.faixaDaNota`, imagem.faixaDaNota, `${JSON.stringify(FAIXAS_DA_NOTA[imagem.classe])}, a faixa da classe ${imagem.classe}`);
    const tipoDaFonte = lerFonte(imagem.fonte, `${onde}.fonte`, exigirGerados).tipo;
    if (tipoDaFonte === 'familia') {
      if (!plano(imagem.objeto)) recusar(`${onde}.objeto`, imagem.objeto, 'objeto { titulo, nota }: o que a imagem mostra como título e nota, igual para o controle e para a mutação');
      chaves(imagem.objeto, ['titulo', 'nota'], `${onde}.objeto`);
      if (!(texto(imagem.objeto.titulo) && texto(imagem.objeto.nota))) recusar(`${onde}.objeto`, imagem.objeto, 'título e nota em texto, sem dizer o defeito');
    } else if (imagem.objeto !== undefined) {
      recusar(`${onde}.objeto`, imagem.objeto, 'só a fonte de família leva `objeto`; no esboço o título e a nota são os dele');
    }
    if (!Array.isArray(imagem.defeitos)) recusar(`${onde}.defeitos`, imagem.defeitos, 'lista de defeitos esperados, vazia no controle');
    const defeitos = imagem.defeitos.map((d, k) => lerDefeito(d, `${onde}.defeitos[${k}]`, tipoDaFonte));
    if (imagem.classe === 'controle') {
      if (defeitos.length > 0) recusar(`${onde}.defeitos`, defeitos, 'nenhum: o controle não tem defeito');
      if (imagem.fonte.tipo === 'familia' && imagem.fonte.aprovacao === undefined) recusar(`${onde}.fonte.aprovacao`, undefined, 'o ponto aprovado de que o controle é a geometria');
    } else {
      if (defeitos.length === 0) recusar(`${onde}.defeitos`, defeitos, 'ao menos um defeito esperado');
      if (imagem.fonte.tipo === 'familia' && imagem.fonte.aprovacao !== undefined) recusar(`${onde}.fonte.aprovacao`, imagem.fonte.aprovacao, 'só o controle é a geometria aprovada; a imagem com defeito tem mutação');
      if (imagem.classe === 'superficie' && !defeitos.every((d) => d.tipo === 'superficie')) recusar(`${onde}.defeitos`, defeitos.map((d) => d.tipo), 'só defeito de superfície na classe superficie');
      if ((imagem.classe === 'estrutural' || imagem.classe === 'funcao') && !defeitos.some((d) => d.tipo !== 'superficie')) recusar(`${onde}.defeitos`, defeitos.map((d) => d.tipo), `ao menos um defeito que não seja de superfície na classe ${imagem.classe}`);
    }
    if (imagem.desenho !== undefined) {
      if (!plano(imagem.desenho)) recusar(`${onde}.desenho`, imagem.desenho, 'objeto { hash }');
      chaves(imagem.desenho, ['hash'], `${onde}.desenho`);
      exigirSha(imagem.desenho.hash, `${onde}.desenho.hash`, true);
    } else if (exigirGerados) recusar(`${onde}.desenho`, undefined, 'a impressão do que a fonte desenha, gravada pelo gerador');
    if (imagem.vistas !== undefined) {
      if (!plano(imagem.vistas)) recusar(`${onde}.vistas`, imagem.vistas, 'objeto com as quatro vistas');
      chaves(imagem.vistas, VISTAS_DO_CONJUNTO, `${onde}.vistas`);
      for (const nome of VISTAS_DO_CONJUNTO) {
        const vista = imagem.vistas[nome];
        const quando = `${onde}.vistas.${nome}`;
        if (!plano(vista)) recusar(quando, vista, 'objeto { arquivo, sha256 }');
        chaves(vista, ['arquivo', 'sha256'], quando);
        if (vista.arquivo !== `imagens/${imagem.id}/${nome}.png`) recusar(`${quando}.arquivo`, vista.arquivo, `imagens/${imagem.id}/${nome}.png`);
        exigirSha(vista.sha256, `${quando}.sha256`, true);
      }
    } else if (exigirGerados) recusar(`${onde}.vistas`, undefined, 'as quatro vistas gravadas pelo gerador');
    return imagem;
  });

  const chaveContada = imagens.filter((i) => i.chave).length;
  if (chaveContada !== 4) recusar('conjunto.imagens', `${chaveContada} imagens-chave`, 'quatro imagens-chave');
  if (r.passa.de !== imagens.length) recusar('conjunto.regra.passa.de', r.passa.de, `${imagens.length}, o número de imagens do conjunto`);
  if (!(Number.isInteger(r.passa.minimo) && r.passa.minimo >= 1 && r.passa.minimo < r.passa.de)) recusar('conjunto.regra.passa.minimo', r.passa.minimo, `inteiro de 1 a ${r.passa.de - 1}`);
  const obrigatorias = imagens.filter((i) => i.obrigatoria).map((i) => i.nome).sort();
  if (!(Array.isArray(r.passa.obrigatorias) && JSON.stringify([...r.passa.obrigatorias].sort()) === JSON.stringify(obrigatorias) && obrigatorias.length > 0)) {
    recusar('conjunto.regra.passa.obrigatorias', r.passa.obrigatorias, `os nomes das imagens marcadas \`obrigatoria\`: ${obrigatorias.join(', ') || '(nenhuma)'}`);
  }

  const declaradas = lerMedidas(bruto.medidas, 'conjunto.medidas');
  imagens.forEach((imagem, i) => {
    if (imagem.fonte.tipo !== 'familia') return;
    for (const [k, d] of imagem.defeitos.entries()) {
      for (const id of d.medida ?? []) {
        const [prefixo, ...resto] = id.split(':');
        const nome = resto.join(':');
        const suite = declaradas[imagem.fonte.familia];
        const existe = prefixo === 'razao' ? suite?.razoes.includes(nome) : suite?.formas.includes(nome);
        if (!existe) recusar(`conjunto.imagens[${i}].defeitos[${k}].medida`, id, `medida declarada em conjunto.medidas.familias.${imagem.fonte.familia} (razoes ou formas)`);
      }
    }
  });

  if (bruto.prancha !== undefined) {
    if (!plano(bruto.prancha)) recusar('conjunto.prancha', bruto.prancha, 'objeto { arquivo, sha256 }');
    chaves(bruto.prancha, ['arquivo', 'sha256'], 'conjunto.prancha');
    if (!caminhoRelativo(bruto.prancha.arquivo) || !bruto.prancha.arquivo.endsWith('.png')) recusar('conjunto.prancha.arquivo', bruto.prancha.arquivo, 'caminho relativo à pasta do conjunto de um .png');
    exigirSha(bruto.prancha.sha256, 'conjunto.prancha.sha256', true);
  } else if (exigirGerados) recusar('conjunto.prancha', undefined, 'a prancha com as doze imagens, gravada pelo gerador');

  if (!Array.isArray(bruto.resultados)) recusar('conjunto.resultados', bruto.resultados, 'lista, vazia enquanto nenhum julgamento foi medido');
  const recebidos = new Map();
  bruto.resultados.forEach((res, i) => {
    const onde = `conjunto.resultados[${i}]`;
    if (!plano(res)) recusar(onde, res, 'objeto { imagem, agenteSha256, briefSha256, julgamentos, ... }');
    if (!ids.has(res.imagem)) recusar(`${onde}.imagem`, res.imagem, `id de uma imagem do conjunto: ${[...ids].join(', ')}`);
    exigirSha(res.agenteSha256, `${onde}.agenteSha256`, true);
    exigirSha(res.briefSha256, `${onde}.briefSha256`, true);
    if (!(Array.isArray(res.julgamentos) && res.julgamentos.length > 0)) recusar(`${onde}.julgamentos`, res.julgamentos, 'lista de julgamentos, cada um com `nota`, `defeitos`, `briefSha256`, `imagemSha256` e `data`');
    res.julgamentos.forEach((j, k) => lerJulgamento(j, `${onde}.julgamentos[${k}]`));
    const total = (recebidos.get(res.imagem) ?? 0) + res.julgamentos.length;
    recebidos.set(res.imagem, total);
    const esperados = imagens.find((m) => m.id === res.imagem).julgamentos;
    if (total > esperados) recusar(`${onde}.julgamentos`, `${total} julgamentos de ${res.imagem}`, `no máximo ${esperados}, os que a regra pede para esta imagem`);
  });
  return bruto;
}

/* ---------- o julgamento do crítico ---------- */

/** Um defeito como o `critico-visual` o devolve: cinco campos em texto. O vocabulário de tipo e sentido não é cobrado aqui: o que o crítico inventa fora dele é dado da calibração. */
function lerDefeitoJulgado(d, onde) {
  if (!plano(d)) recusar(onde, d, 'objeto { parte, tipo, onde, sentido, evidencia }');
  for (const campo of ['parte', 'tipo', 'onde', 'sentido', 'evidencia']) {
    if (!texto(d[campo])) recusar(`${onde}.${campo}`, d[campo], 'texto não vazio');
  }
  return { parte: d.parte.trim(), tipo: d.tipo.trim(), onde: d.onde.trim(), sentido: d.sentido.trim(), evidencia: d.evidencia.trim() };
}

/** Um julgamento gravado: a nota, os defeitos, a impressão do brief exato que o crítico leu, a impressão das quatro vistas que ele viu e a data. */
export function lerJulgamento(j, onde = 'julgamento') {
  if (!plano(j)) recusar(onde, j, 'objeto { nota, defeitos, briefSha256, imagemSha256, data }');
  if (!(finito(j.nota) && j.nota >= 0 && j.nota <= 10)) recusar(`${onde}.nota`, j.nota, 'número de 0 a 10');
  if (!Array.isArray(j.defeitos)) recusar(`${onde}.defeitos`, j.defeitos, 'lista de defeitos, vazia quando o crítico não achou nenhum');
  j.defeitos.forEach((d, i) => lerDefeitoJulgado(d, `${onde}.defeitos[${i}]`));
  exigirSha(j.briefSha256, `${onde}.briefSha256`, true);
  exigirSha(j.imagemSha256, `${onde}.imagemSha256`, true);
  if (!(texto(j.data) && !Number.isNaN(Date.parse(j.data)))) recusar(`${onde}.data`, j.data, 'data e hora em ISO 8601');
  return j;
}

/**
 * Lê a resposta do crítico: o texto termina com um JSON no formato do `critico-visual` (`nota` e `defeitos`, cada defeito com
 * `parte`, `tipo`, `onde`, `sentido` e `evidencia`; `alvo` e `observacao` passam sem ser cobrados). Vale o primeiro `{` do texto a
 * partir do qual o resto, tirada a cerca de código final, é um JSON; o que vem antes é a análise e não é lido. Devolve
 * `{ nota, defeitos }`.
 */
export function extrairVeredito(resposta) {
  if (typeof resposta !== 'string' || resposta.trim() === '') recusar('resposta do crítico', resposta, 'texto que termina com o JSON do veredito');
  const cauda = resposta.trim().replace(/```\s*$/, '').trim();
  let bruto = null;
  for (let i = cauda.indexOf('{'); i !== -1 && bruto === null; i = cauda.indexOf('{', i + 1)) {
    try {
      const lido = JSON.parse(cauda.slice(i));
      if (plano(lido)) bruto = lido;
    } catch { /* este `{` não abre o JSON final */ }
  }
  if (bruto === null) recusar('resposta do crítico', `${cauda.slice(-60)}`, 'texto que termina com um JSON válido { nota, defeitos }');
  if (!(finito(bruto.nota) && bruto.nota >= 0 && bruto.nota <= 10)) recusar('veredito.nota', bruto.nota, 'número de 0 a 10');
  if (!Array.isArray(bruto.defeitos)) recusar('veredito.defeitos', bruto.defeitos, 'lista de defeitos { parte, tipo, onde, sentido, evidencia }');
  return { nota: bruto.nota, defeitos: bruto.defeitos.map((d, i) => lerDefeitoJulgado(d, `veredito.defeitos[${i}]`)) };
}

/* ---------- leituras do conjunto lido ---------- */

/** As medidas que reprovam a imagem antes do crítico: a união das medidas citadas pelos defeitos que a medida decide. */
export function medidasEsperadas(imagem) {
  return [...new Set(imagem.defeitos.filter((d) => d.decide === 'medida').flatMap((d) => d.medida))].sort();
}

/** Os defeitos que o crítico decide e que cabe a ele citar. */
export const defeitosDoCritico = (imagem) => imagem.defeitos.filter((d) => d.decide === 'critico');

/** Os defeitos que a medida decide e que ela reprova sem o crítico olhar. */
export const defeitosDaMedida = (imagem) => imagem.defeitos.filter((d) => d.decide === 'medida');

/** O que o conjunto diz de si: quantas imagens, de que classe, quantas julgadas, e a frase de "calibração não medida". */
export function resumoDoConjunto(conjunto) {
  const porClasse = Object.fromEntries(CLASSES.map((c) => [c, conjunto.imagens.filter((i) => i.classe === c).length]));
  const julgadas = new Set(conjunto.resultados.map((r) => r.imagem));
  return {
    imagens: conjunto.imagens.length,
    porClasse,
    chaves: conjunto.imagens.filter((i) => i.chave).length,
    defeitosDaMedida: conjunto.imagens.reduce((s, i) => s + defeitosDaMedida(i).length, 0),
    defeitosDoCritico: conjunto.imagens.reduce((s, i) => s + defeitosDoCritico(i).length, 0),
    julgadas: julgadas.size,
    medida: conjunto.resultados.length > 0,
    frase: conjunto.resultados.length === 0
      ? `calibração não medida: nenhuma das ${conjunto.imagens.length} imagens tem julgamento do crítico (resultados vazio)`
      : `calibração medida em ${julgadas.size} de ${conjunto.imagens.length} imagens`,
  };
}

/* ---------- a pontuação ---------- */

/** Quantos julgamentos de uma imagem podem sair da faixa da nota. */
export const FORA_DA_FAIXA_ACEITO = 1;
/** Quantos julgamentos do controle podem citar defeito estrutural. */
export const ESTRUTURAIS_ACEITOS_NO_CONTROLE = 1;
/** Quantos julgamentos têm de citar cada defeito do crítico: 4 de 5 na imagem-chave e 2 de 3 nas outras. */
export const CITACOES_MINIMAS = Object.freeze({ chave: 4, outras: 2 });

/** Minúsculas e sem acento, para comparar palavras do crítico com as do conjunto. */
export const dobrar = (t) => String(t).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/* estrutural é o que a escala da nota chama assim (uniao, posicao, ausencia): comprimento, espessura, angulo e superficie são proporção ou acabamento */
export const estrutural = (julgamento) => julgamento.defeitos.some((d) => TIPOS_ESTRUTURAIS.includes(d.tipo));

/**
 * O julgamento cita o defeito esperado quando traz um defeito com `tipo` entre os `tiposAceitos` (ou o próprio tipo, sem a lista)
 * ou quando alguma das `palavras` aparece na `parte` ou no `onde` de um defeito dele, sem distinguir maiúscula nem acento.
 */
export function citaDefeito(julgamento, defeito) {
  const aceitos = defeito.tiposAceitos ?? [defeito.tipo];
  const palavras = (defeito.palavras ?? []).map(dobrar);
  return julgamento.defeitos.some((d) => aceitos.includes(d.tipo) || palavras.some((p) => dobrar(d.parte).includes(p) || dobrar(d.onde).includes(p)));
}

const mediana = (notas) => {
  const o = [...notas].sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

/**
 * A pontuação de uma imagem sobre os julgamentos recebidos. `acerta` é nulo enquanto faltam julgamentos: os critérios já saem
 * calculados sobre o que há, para o resumo, mas a imagem só acerta ou erra completa. Acerta quando a mediana cai na faixa, no
 * máximo um julgamento sai dela, cada defeito de `decide: critico` é citado por pelo menos 4 de 5 julgamentos (2 de 3 nas imagens
 * comuns) e, no controle, no máximo um julgamento cita defeito estrutural. A amplitude é a maior nota menos a menor.
 */
export function pontuarImagem(imagem, julgamentos) {
  const notas = julgamentos.map((j) => j.nota);
  const [minimo, maximo] = imagem.faixaDaNota;
  const base = {
    id: imagem.id, nome: imagem.nome, classe: imagem.classe, esperados: imagem.julgamentos, recebidos: julgamentos.length,
    faltam: Math.max(0, imagem.julgamentos - julgamentos.length), completa: julgamentos.length >= imagem.julgamentos, notas,
    faixa: [minimo, maximo],
  };
  if (julgamentos.length === 0) return { ...base, mediana: null, amplitude: null, criterios: null, motivos: [], acerta: null };
  const m = mediana(notas);
  const fora = notas.filter((n) => n < minimo || n > maximo).length;
  const exigidas = imagem.chave ? CITACOES_MINIMAS.chave : CITACOES_MINIMAS.outras;
  const estruturais = julgamentos.filter(estrutural).length;
  const criterios = {
    mediana: { valor: m, ok: m >= minimo && m <= maximo },
    foraDaFaixa: { n: fora, maximo: FORA_DA_FAIXA_ACEITO, ok: fora <= FORA_DA_FAIXA_ACEITO },
    citacoes: defeitosDoCritico(imagem).map((d) => {
      const n = julgamentos.filter((j) => citaDefeito(j, d)).length;
      return { parte: d.parte, tipo: d.tipo, n, minimo: exigidas, ok: n >= exigidas };
    }),
    estruturais: imagem.classe === 'controle' ? { n: estruturais, maximo: ESTRUTURAIS_ACEITOS_NO_CONTROLE, ok: estruturais <= ESTRUTURAIS_ACEITOS_NO_CONTROLE } : null,
  };
  const motivos = [];
  if (!criterios.mediana.ok) motivos.push(`mediana ${m} fora da faixa ${minimo} a ${maximo}`);
  if (!criterios.foraDaFaixa.ok) motivos.push(`${fora} julgamentos fora da faixa (no máximo ${FORA_DA_FAIXA_ACEITO})`);
  for (const c of criterios.citacoes) if (!c.ok) motivos.push(`o defeito de '${c.parte}' foi citado em ${c.n} de ${imagem.julgamentos} julgamentos (mínimo ${c.minimo})`);
  if (criterios.estruturais && !criterios.estruturais.ok) motivos.push(`${criterios.estruturais.n} julgamentos do controle citam defeito estrutural (no máximo ${ESTRUTURAIS_ACEITOS_NO_CONTROLE})`);
  return { ...base, mediana: m, amplitude: Math.max(...notas) - Math.min(...notas), criterios, motivos, acerta: base.completa ? motivos.length === 0 : null };
}

/**
 * A pontuação do conjunto. `estado`: `nao-medido` sem nenhum julgamento, `pendente` enquanto faltam julgamentos em alguma imagem
 * (`faltam` diz quantos por imagem), e, com todos, `passa` ou `reprova`. Passa com `regra.passa.minimo` imagens acertadas e todas
 * as obrigatórias entre elas.
 */
export function pontuarConjunto(conjunto) {
  const imagens = conjunto.imagens.map((imagem) => pontuarImagem(imagem, conjunto.resultados.filter((r) => r.imagem === imagem.id).flatMap((r) => r.julgamentos)));
  const faltam = Object.fromEntries(imagens.filter((i) => i.faltam > 0).map((i) => [i.id, i.faltam]));
  const completo = imagens.every((i) => i.completa);
  const acertos = imagens.filter((i) => i.acerta === true).length;
  const { minimo, de, obrigatorias } = conjunto.regra.passa;
  const obrigatoriasErradas = imagens.filter((i) => obrigatorias.includes(i.nome) && i.acerta !== true).map((i) => i.nome);
  const medido = imagens.some((i) => i.recebidos > 0);
  const passa = completo && acertos >= minimo && obrigatoriasErradas.length === 0;
  return {
    imagens, faltam, faltamNoTotal: Object.values(faltam).reduce((s, n) => s + n, 0), completo, acertos, minimo, de, obrigatoriasErradas,
    estado: !medido ? 'nao-medido' : !completo ? 'pendente' : passa ? 'passa' : 'reprova',
  };
}
