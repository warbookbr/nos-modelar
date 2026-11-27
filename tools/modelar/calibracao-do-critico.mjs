#!/usr/bin/env node
/* calibracao-do-critico.mjs — o conjunto de calibração do crítico visual e o gate `calibracao:check`.
 *
 *   npm run calibracao:check                  (node tools/modelar/calibracao-do-critico.mjs conferir)
 *   npm run calibracao -- listar
 *
 * O QUE O CONJUNTO MEDE. O crítico dá nota e aponta defeito, e nada diz se a nota dele é a de um olho que acerta. O conjunto responde
 * com casos em que a resposta certa já foi dada pela pessoa: cada caso é uma peça do acervo, com `PLANO` e referência, numa cópia de
 * ensaio, e o crítico a julga pelo que recebe numa rodada de verdade, o `pedido.md` e as imagens do pacote padrão do
 * `npm run vistas:critica`. O conjunto mora em `docs/modelar/banco-de-provas/calibracao-do-critico/casos.json` (formato
 * `mecanifica.calibracao-do-critico@2`, validado aqui por `lerCasos`), com o pedido (`pedido.txt`) e as imagens de cada caso em `casos/<id>/`.
 *
 * OS TRÊS GRUPOS (decisão da pessoa de 2026-11-26). O controle é a etapa que a pessoa aceitou, com as palavras dela gravadas na fonte
 * e a cópia igual à receita do acervo, trocados só os caminhos. O defeito de forma prometida ou de proporção é recolocado à mão na
 * cópia, com a frase com que a pessoa o reprovou, quando há. A revolução facetada é o defeito de superfície que a medida não vê.
 *
 * A MEDIDA VEM ANTES. Cada cópia passa pela medição da rodada (`node tools/modelar/rodada-de-modelagem.mjs <peça> --acao`) antes de
 * chegar ao crítico. A que a medida reprova sai do julgamento (`destino: "medida"`): fica no conjunto como prova da medida, com o
 * relatório dela gravado, sem pedido, sem imagens e sem julgamento.
 *
 * A CÓPIA DE ENSAIO mora em `tools/fixtures/acervo/<nome neutro>/receita.js`, que a bancada abre e a guarda do acervo não lê. Ela é
 * a receita do acervo (`fonte.origem`) com as trocas declaradas em `fonte.trocas`, e `copiar` a escreve a partir das duas; nenhuma
 * receita do acervo muda. O nome da cópia é neutro (`peca-cNN`) porque o pedido e os arquivos de imagem o levam.
 *
 * O GATE (`conferir`) não abre navegador, não executa receita e não despacha ninguém. Confere o formato, que a cópia, o pedido e cada
 * imagem são os arquivos gravados, que o agente `critico-visual.md` é o gravado (tirada a linha `model:`), que cada julgamento foi dado
 * ao pedido e às imagens de hoje, e a pontuação: enquanto faltam julgamentos diz quantos faltam e passa; com todos, reprova se o
 * conjunto não acerta. O MODELO DO CRÍTICO SÓ AVISA: quando a definição do agente declara outro modelo que o medido, ou os julgamentos
 * vieram de modelos diferentes, o gate escreve o aviso e passa. Julgar de novo é sempre de propósito, por comando.
 *
 *   npm run calibracao -- copiar [<id>]                  escreve a cópia de ensaio a partir da origem e das trocas
 *   npm run calibracao -- medir [<id>]                   passa a cópia pela medição da rodada e grava o destino (crítico ou medida)
 *   npm run calibracao -- pacote <id>                    monta o pacote padrão do caso e grava o pedido e as imagens (uma captura por vez)
 *   npm run calibracao -- pedido <id>                    põe o pedido e as imagens do caso na pasta de pacote, com os caminhos absolutos
 *   npm run calibracao -- despachos                      a lista dos julgamentos que faltam, com o pedido e o comando que registra cada um
 *   npm run calibracao -- registrar <id> --arquivo=<resposta do crítico> --modelo=<modelo que julgou>
 *   npm run calibracao -- resumo                         a pontuação por caso e a do conjunto
 *   npm run calibracao -- recalibrar --de-proposito      apaga os julgamentos e grava o agente e o modelo de agora, para julgar tudo de novo
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TIPOS_DE_DEFEITO, TIPOS_ESTRUTURAIS } from '../../src/autoria/veredito-de-forma.js';
import { ErroDeCalibracao, dobrar, extrairVeredito } from '../../src/autoria/calibracao-do-critico.js';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PASTA_DO_CONJUNTO = 'docs/modelar/banco-de-provas/calibracao-do-critico';
export const ARQUIVO_DO_CONJUNTO = 'casos.json';
export const PASTA_DOS_CASOS = 'casos';
/* O pedido guardado de cada caso. É texto, e não `.md`, porque leva as marcas `<pacote>` e `<raiz>` no lugar dos caminhos e não é documento
   do projeto: quem o lê é o crítico, pela cópia com caminhos absolutos que `pedido <id>` grava como `pedido.md` na pasta de pacote. */
export const ARQUIVO_DO_PEDIDO = 'pedido.txt';
export const PASTA_DAS_COPIAS = 'tools/fixtures/acervo';
export const FORMATO_CALIBRACAO = 'mecanifica.calibracao-do-critico@2';
export const AGENTE_DO_CRITICO = '.claude/agents/critico-visual.md';
/* Onde o pacote de um caso é montado e de onde o crítico o lê: a pasta em que o pacote de uma rodada de verdade fica, fora do git. O
   caminho das imagens chega ao crítico dentro do pedido, e por isso não passa pela pasta do conjunto, cujo nome diz o que o caso é. */
export const pastaDoPacote = (peca, raiz = RAIZ) => resolve(raiz, 'tools/bancadas/out', `critica-${peca}`, 'rodada-01');
/* O que o conjunto de antes (formato @1, desenho de linhas e brief do esboço antigo) deixou na pasta. Sai quando os julgamentos novos
   estiverem registrados; até lá o gate só diz que ainda está ali. */
export const RESTOS_DO_CONJUNTO_ANTIGO = Object.freeze(['conjunto.json', 'fontes-de-esboco.json', 'prancha.png', 'imagens', 'fontes']);

export const JULGAMENTOS_POR_CASO = 3;
export const GRUPOS = Object.freeze(['controle', 'forma-prometida', 'proporcao', 'revolucao-facetada']);
/* A faixa de nota de cada grupo, na escala ancorada do agente (10 sem achado; 8 e 9 com defeito de superfície ou de proporção fina;
   abaixo de 8 só com defeito estrutural). O controle é etapa aceita, de 8 a 10. O caso com defeito não pode levar 10 e não tem piso: a
   escala do agente deixa o defeito de proporção em 8 ou 9, e o que se cobra do crítico é que ele o cite. A revolução facetada é defeito
   de superfície, que sozinho não desce de 8 e, quebrando a técnica prometida, pode chegar a 5. */
export const FAIXAS_DA_NOTA = Object.freeze({
  controle: Object.freeze([8, 10]),
  'forma-prometida': Object.freeze([0, 9]),
  proporcao: Object.freeze([0, 9]),
  'revolucao-facetada': Object.freeze([5, 9]),
});
/** Quantos julgamentos de um caso podem sair da faixa da nota. */
export const FORA_DA_FAIXA_ACEITO = 1;
/** Quantos julgamentos do controle podem citar defeito estrutural. */
export const ESTRUTURAIS_ACEITOS_NO_CONTROLE = 1;
/** Quantos dos três julgamentos têm de citar cada defeito esperado. */
export const CITACOES_MINIMAS = 2;
export const DESTINOS = Object.freeze(['critico', 'medida']);
const MARCA_DA_RAIZ = '<raiz>';
const MARCA_DO_PACOTE = '<pacote>';

const USO = [
  'uso:',
  '  npm run calibracao:check',
  '  npm run calibracao -- listar',
  '  npm run calibracao -- copiar [<id>]',
  '  npm run calibracao -- medir [<id>]',
  '  npm run calibracao -- pacote <id>',
  '  npm run calibracao -- pedido <id>',
  '  npm run calibracao -- despachos',
  '  npm run calibracao -- registrar <id> --arquivo=<resposta do crítico> --modelo=<modelo que julgou>',
  '  npm run calibracao -- resumo',
  '  npm run calibracao -- recalibrar --de-proposito',
  '  npm run calibracao -- tamanho',
  '  npm run calibracao -- --ajuda',
  '',
  'O gate (calibracao:check) não despacha o crítico nem captura imagem; só avisa quando o modelo do crítico não é o medido.',
  'copiar, medir, pacote, registrar e recalibrar mudam o conjunto e só rodam de propósito, por quem conduz a calibração.',
].join('\n');

export class ErroDeUso extends Error {}
/* uma fonte que não se reproduz: a mensagem diz o que a fonte declara e o que existe */
export class ErroDaFonte extends Error {}

const sha256 = (dado) => `sha256:${createHash('sha256').update(dado).digest('hex')}`;
const semCR = (texto) => texto.replace(/\r\n/g, '\n');
const copia = (v) => JSON.parse(JSON.stringify(v));
const plano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texto = (v) => typeof v === 'string' && v.trim() !== '';
const sha = (v) => typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v);
const finito = (v) => typeof v === 'number' && Number.isFinite(v);
const curto = (h) => String(h).slice(0, 19);
const recusar = (onde, valor, aceito) => { throw new ErroDeCalibracao({ onde, valor, aceito }); };
const caminhoRelativo = (v) => texto(v) && !v.startsWith('/') && !/^[a-zA-Z]:/.test(v) && !v.split('/').includes('..') && !v.includes('\\');
const SLUG = /^[a-z][a-z0-9-]*$/;
const ID_DO_CASO = /^c\d{2}$/;
/* "<quem decidiu>, <AAAA-MM-DD>: <as palavras>", como o registro das etapas e a decisão da pessoa na rodada */
const PALAVRAS_DA_PESSOA = /^[^,]{2,60}, \d{4}-\d{2}-\d{2}: \S.{3,}$/s;

function chaves(valor, permitidas, onde) {
  for (const chave of Object.keys(valor)) if (!permitidas.includes(chave)) recusar(`${onde}.${chave}`, valor[chave], `campo conhecido: ${permitidas.join(', ')}`);
}
function exigir(valor, obrigatorias, onde) {
  for (const chave of obrigatorias) if (!Object.hasOwn(valor, chave)) recusar(`${onde}.${chave}`, undefined, 'o campo é obrigatório');
}
function arquivoComImpressao(valor, onde, { exigirSha = true } = {}) {
  if (!plano(valor)) recusar(onde, valor, 'objeto { arquivo, sha256 }');
  chaves(valor, ['arquivo', 'sha256'], onde);
  if (!caminhoRelativo(valor.arquivo)) recusar(`${onde}.arquivo`, valor.arquivo, 'caminho relativo, sem `..`');
  if (valor.sha256 === undefined && !exigirSha) return;
  if (!sha(valor.sha256)) recusar(`${onde}.sha256`, valor.sha256, 'impressão "sha256:" seguida de 64 algarismos hexadecimais');
}

/* ---------- o formato ---------- */

function lerFonte(fonte, onde, grupo) {
  if (!plano(fonte)) recusar(onde, fonte, 'objeto { peca, origem, copia, trocas, aceite | reprovacao | semFrase }');
  chaves(fonte, ['peca', 'origem', 'copia', 'trocas', 'aceite', 'reprovacao', 'semFrase'], onde);
  exigir(fonte, ['peca', 'origem', 'copia', 'trocas'], onde);
  if (!texto(fonte.peca)) recusar(`${onde}.peca`, fonte.peca, 'o nome da peça do acervo de que a cópia saiu (por exemplo aviao/fuselagem)');
  arquivoComImpressao(fonte.origem, `${onde}.origem`);
  if (!fonte.origem.arquivo.startsWith('procedural/pecas/')) recusar(`${onde}.origem.arquivo`, fonte.origem.arquivo, 'a receita de uma peça do acervo, em procedural/pecas/');
  if (!plano(fonte.copia)) recusar(`${onde}.copia`, fonte.copia, 'objeto { peca, arquivo, sha256 }');
  chaves(fonte.copia, ['peca', 'arquivo', 'sha256'], `${onde}.copia`);
  if (!(texto(fonte.copia.peca) && SLUG.test(fonte.copia.peca))) recusar(`${onde}.copia.peca`, fonte.copia.peca, 'nome neutro da cópia de ensaio, em minúsculas com hífen (o pedido e as imagens o levam)');
  if (fonte.copia.arquivo !== `${PASTA_DAS_COPIAS}/${fonte.copia.peca}/receita.js`) recusar(`${onde}.copia.arquivo`, fonte.copia.arquivo, `${PASTA_DAS_COPIAS}/${fonte.copia.peca}/receita.js, fora do acervo`);
  if (!sha(fonte.copia.sha256)) recusar(`${onde}.copia.sha256`, fonte.copia.sha256, 'impressão "sha256:" do texto da cópia');
  if (!Array.isArray(fonte.trocas)) recusar(`${onde}.trocas`, fonte.trocas, 'lista de trocas { de, para, porque }, na ordem em que se aplicam');
  fonte.trocas.forEach((t, i) => {
    const quando = `${onde}.trocas[${i}]`;
    if (!plano(t)) recusar(quando, t, 'objeto { de, para, porque, defeito? }');
    chaves(t, ['de', 'para', 'porque', 'defeito'], quando);
    exigir(t, ['de', 'para', 'porque'], quando);
    if (!texto(t.de)) recusar(`${quando}.de`, t.de, 'o trecho da receita de origem, que aparece nela uma vez só');
    if (typeof t.para !== 'string') recusar(`${quando}.para`, t.para, 'o trecho que entra no lugar');
    if (!texto(t.porque)) recusar(`${quando}.porque`, t.porque, 'por que a troca existe (caminho da cópia, ou o defeito recolocado)');
    if (t.defeito !== undefined && typeof t.defeito !== 'boolean') recusar(`${quando}.defeito`, t.defeito, 'verdadeiro na troca que recoloca o defeito');
  });
  const doDefeito = fonte.trocas.filter((t) => t.defeito === true).length;
  const decididas = ['aceite', 'reprovacao', 'semFrase'].filter((c) => fonte[c] !== undefined);
  if (grupo === 'controle') {
    if (doDefeito > 0) recusar(`${onde}.trocas`, `${doDefeito} troca(s) de defeito`, 'nenhuma: o controle é a receita aceita, trocados só os caminhos');
    if (decididas.join() !== 'aceite') recusar(`${onde}.aceite`, decididas, 'só `aceite`: o controle é etapa aceita pela pessoa, com as palavras dela');
    const a = fonte.aceite;
    if (!plano(a)) recusar(`${onde}.aceite`, a, 'objeto { registro, instancia, por, forma }');
    chaves(a, ['registro', 'instancia', 'por', 'forma'], `${onde}.aceite`);
    exigir(a, ['registro', 'instancia', 'por', 'forma'], `${onde}.aceite`);
    if (!(caminhoRelativo(a.registro) && a.registro.endsWith('montagem.etapas.json'))) recusar(`${onde}.aceite.registro`, a.registro, 'o registro de etapas da montagem que guarda o aceite');
    if (!texto(a.instancia)) recusar(`${onde}.aceite.instancia`, a.instancia, 'a instância aceita no registro');
    if (!(texto(a.por) && PALAVRAS_DA_PESSOA.test(a.por))) recusar(`${onde}.aceite.por`, a.por, '"<quem aceitou>, <AAAA-MM-DD>: <as palavras dela>", copiado do registro de etapas');
    if (!sha(a.forma)) recusar(`${onde}.aceite.forma`, a.forma, 'a impressão da forma aceita (`impressao.forma` do evento no registro)');
  } else {
    if (doDefeito === 0) recusar(`${onde}.trocas`, 'nenhuma troca de defeito', 'ao menos uma troca com `defeito: true`, a que recoloca o defeito');
    if (decididas.length !== 1 || decididas[0] === 'aceite') recusar(`${onde}.reprovacao`, decididas, 'um só de `reprovacao` (a frase da pessoa) ou `semFrase` (por que não há frase)');
    if (fonte.reprovacao !== undefined) {
      const r = fonte.reprovacao;
      if (!plano(r)) recusar(`${onde}.reprovacao`, r, 'objeto { registro, rodada, frase }');
      chaves(r, ['registro', 'rodada', 'frase'], `${onde}.reprovacao`);
      exigir(r, ['registro', 'rodada', 'frase'], `${onde}.reprovacao`);
      if (!(caminhoRelativo(r.registro) && /rodadas\/rodada-\d+\.json$/.test(r.registro))) recusar(`${onde}.reprovacao.registro`, r.registro, 'o registro da rodada que guarda a frase (rodadas/rodada-NN.json)');
      if (!(Number.isInteger(r.rodada) && r.rodada >= 1)) recusar(`${onde}.reprovacao.rodada`, r.rodada, 'o número da rodada cuja geometria a pessoa reprovou');
      if (!(texto(r.frase) && r.frase.trim().length >= 20)) recusar(`${onde}.reprovacao.frase`, r.frase, 'a frase da pessoa, copiada do `atrito` do registro');
    } else if (!(texto(fonte.semFrase) && fonte.semFrase.trim().length >= 20)) {
      recusar(`${onde}.semFrase`, fonte.semFrase, 'por que o caso não tem frase da pessoa, e de onde vem o defeito');
    }
  }
}

function lerDefeito(d, onde) {
  if (!plano(d)) recusar(onde, d, 'objeto { parte, tipo, sentido, onde, palavras, aceitos }');
  chaves(d, ['parte', 'tipo', 'sentido', 'onde', 'palavras', 'aceitos'], onde);
  exigir(d, ['parte', 'tipo', 'sentido', 'onde', 'palavras', 'aceitos'], onde);
  if (!texto(d.parte)) recusar(`${onde}.parte`, d.parte, 'nome da parte como o defeito a cita');
  if (!Object.hasOwn(TIPOS_DE_DEFEITO, d.tipo) || d.tipo === 'cota') recusar(`${onde}.tipo`, d.tipo, `tipo do vocabulário do crítico: ${Object.keys(TIPOS_DE_DEFEITO).filter((t) => t !== 'cota').join(', ')}`);
  if (!TIPOS_DE_DEFEITO[d.tipo].includes(d.sentido)) recusar(`${onde}.sentido`, d.sentido, `sentido de '${d.tipo}': ${TIPOS_DE_DEFEITO[d.tipo].join(', ')}`);
  if (!(texto(d.onde) && d.onde.trim().length >= 10)) recusar(`${onde}.onde`, d.onde, 'a extremidade ou o trecho, em pelo menos 10 caracteres');
  if (!(Array.isArray(d.palavras) && d.palavras.length > 0 && d.palavras.every((p) => texto(p) && p === p.toLowerCase()))) {
    recusar(`${onde}.palavras`, d.palavras, 'lista de palavras em minúsculas que o veredito do crítico usa ao citar este defeito (parte ou onde)');
  }
  const doVocabulario = (par) => { const [tipo, sentido, ...resto] = String(par).split('/'); return resto.length === 0 && Object.hasOwn(TIPOS_DE_DEFEITO, tipo) && TIPOS_DE_DEFEITO[tipo].includes(sentido); };
  if (!(Array.isArray(d.aceitos) && d.aceitos.includes(`${d.tipo}/${d.sentido}`) && d.aceitos.every(doVocabulario) && new Set(d.aceitos).size === d.aceitos.length)) {
    recusar(`${onde}.aceitos`, d.aceitos, `lista de "tipo/sentido" do vocabulário, sem repetição, que inclui '${d.tipo}/${d.sentido}': as formas de o crítico dizer este defeito, e não o contrário dele`);
  }
}

/** Um julgamento gravado: a nota, os defeitos, a impressão do pedido e a das imagens que o crítico viu, o modelo que julgou e a data. */
export function lerJulgamento(j, onde = 'julgamento') {
  if (!plano(j)) recusar(onde, j, 'objeto { nota, defeitos, pedidoSha256, imagemSha256, modelo, data }');
  chaves(j, ['nota', 'defeitos', 'pedidoSha256', 'imagemSha256', 'modelo', 'data'], onde);
  if (!(finito(j.nota) && j.nota >= 0 && j.nota <= 10)) recusar(`${onde}.nota`, j.nota, 'número de 0 a 10');
  if (!Array.isArray(j.defeitos)) recusar(`${onde}.defeitos`, j.defeitos, 'lista de defeitos, vazia quando o crítico não achou nenhum');
  j.defeitos.forEach((d, i) => {
    if (!plano(d)) recusar(`${onde}.defeitos[${i}]`, d, 'objeto { parte, tipo, onde, sentido, evidencia }');
    for (const campo of ['parte', 'tipo', 'onde', 'sentido', 'evidencia']) if (!texto(d[campo])) recusar(`${onde}.defeitos[${i}].${campo}`, d[campo], 'texto não vazio');
  });
  if (!sha(j.pedidoSha256)) recusar(`${onde}.pedidoSha256`, j.pedidoSha256, 'a impressão do pedido que o crítico leu');
  if (!sha(j.imagemSha256)) recusar(`${onde}.imagemSha256`, j.imagemSha256, 'a impressão das imagens que o crítico viu');
  if (!texto(j.modelo)) recusar(`${onde}.modelo`, j.modelo, 'o modelo em que o crítico rodou, como quem o despachou o informou');
  if (!(texto(j.data) && !Number.isNaN(Date.parse(j.data)))) recusar(`${onde}.data`, j.data, 'data e hora em ISO 8601');
  return j;
}

/**
 * Lê e valida o conjunto no formato @2. O caso de `destino: "critico"` traz o pedido e as imagens gravados; o de `destino: "medida"`
 * traz a medição reprovada e nada para o crítico; o caso sem `destino` ainda não passou pela medição e só existe enquanto o conjunto
 * é montado (`exigirPreparados: false`). Devolve o mesmo objeto.
 */
export function lerCasos(bruto, { exigirPreparados = true } = {}) {
  if (!plano(bruto)) recusar('conjunto', bruto, 'objeto com formato, versao, descricao, critico, faixasDaNota, regra, casos e resultados');
  chaves(bruto, ['formato', 'versao', 'descricao', 'critico', 'faixasDaNota', 'regra', 'casos', 'resultados'], 'conjunto');
  exigir(bruto, ['formato', 'versao', 'descricao', 'critico', 'faixasDaNota', 'regra', 'casos', 'resultados'], 'conjunto');
  if (bruto.formato !== FORMATO_CALIBRACAO) recusar('conjunto.formato', bruto.formato, `"${FORMATO_CALIBRACAO}"`);
  if (!(texto(bruto.versao) && /^\d+\.\d+\.\d+$/.test(bruto.versao))) recusar('conjunto.versao', bruto.versao, 'versão semântica x.y.z');
  if (!texto(bruto.descricao)) recusar('conjunto.descricao', bruto.descricao, 'texto que diz o que o conjunto é');

  const c = bruto.critico;
  if (!plano(c)) recusar('conjunto.critico', c, 'objeto { agente: { arquivo, sha256 }, modelo: { declarado, medido }, pacote }');
  chaves(c, ['agente', 'modelo', 'pacote'], 'conjunto.critico');
  exigir(c, ['agente', 'modelo', 'pacote'], 'conjunto.critico');
  arquivoComImpressao(c.agente, 'conjunto.critico.agente');
  if (!plano(c.modelo)) recusar('conjunto.critico.modelo', c.modelo, 'objeto { declarado, medido }');
  chaves(c.modelo, ['declarado', 'medido'], 'conjunto.critico.modelo');
  if (!texto(c.modelo.declarado)) recusar('conjunto.critico.modelo.declarado', c.modelo.declarado, 'o modelo que a definição do agente declarava quando o conjunto foi medido (a linha `model:`)');
  if (!(c.modelo.medido === null || texto(c.modelo.medido))) recusar('conjunto.critico.modelo.medido', c.modelo.medido, 'o modelo em que o crítico rodou na medição, ou null antes do primeiro julgamento');
  if (!texto(c.pacote)) recusar('conjunto.critico.pacote', c.pacote, 'texto que diz o que o crítico recebe (o comando do pacote padrão)');

  if (JSON.stringify(bruto.faixasDaNota) !== JSON.stringify(FAIXAS_DA_NOTA)) recusar('conjunto.faixasDaNota', bruto.faixasDaNota, `a faixa de cada grupo: ${JSON.stringify(FAIXAS_DA_NOTA)}`);

  const r = bruto.regra;
  if (!plano(r)) recusar('conjunto.regra', r, 'objeto { julgamentos, acerto, passa }');
  chaves(r, ['julgamentos', 'acerto', 'passa'], 'conjunto.regra');
  if (r.julgamentos !== JULGAMENTOS_POR_CASO) recusar('conjunto.regra.julgamentos', r.julgamentos, `${JULGAMENTOS_POR_CASO} por caso`);
  if (!texto(r.acerto)) recusar('conjunto.regra.acerto', r.acerto, 'texto que diz quando um caso acerta');
  if (!plano(r.passa)) recusar('conjunto.regra.passa', r.passa, 'objeto { minimo, de, obrigatorias }');
  chaves(r.passa, ['minimo', 'de', 'obrigatorias'], 'conjunto.regra.passa');

  if (!Array.isArray(bruto.casos) || bruto.casos.length === 0) recusar('conjunto.casos', bruto.casos, 'lista com os casos do conjunto');
  const ids = new Set();
  const nomes = new Set();
  const copias = new Set();
  for (const [i, caso] of bruto.casos.entries()) {
    const onde = `conjunto.casos[${i}]`;
    if (!plano(caso)) recusar(onde, caso, 'objeto de caso');
    chaves(caso, ['id', 'nome', 'grupo', 'obrigatorio', 'julgamentos', 'faixaDaNota', 'fonte', 'defeitos', 'destino', 'medicao', 'pedido', 'imagens'], onde);
    exigir(caso, ['id', 'nome', 'grupo', 'obrigatorio', 'julgamentos', 'faixaDaNota', 'fonte', 'defeitos'], onde);
    if (!(texto(caso.id) && ID_DO_CASO.test(caso.id))) recusar(`${onde}.id`, caso.id, 'id neutro "c" seguido de dois algarismos');
    if (ids.has(caso.id)) recusar(`${onde}.id`, caso.id, 'id que ainda não está no conjunto');
    ids.add(caso.id);
    if (!(texto(caso.nome) && SLUG.test(caso.nome))) recusar(`${onde}.nome`, caso.nome, 'nome em minúsculas, com hífen entre as palavras');
    if (nomes.has(caso.nome)) recusar(`${onde}.nome`, caso.nome, 'nome que ainda não está no conjunto');
    nomes.add(caso.nome);
    if (!GRUPOS.includes(caso.grupo)) recusar(`${onde}.grupo`, caso.grupo, GRUPOS.join(', '));
    if (typeof caso.obrigatorio !== 'boolean') recusar(`${onde}.obrigatorio`, caso.obrigatorio, 'verdadeiro nos casos que o conjunto precisa acertar para passar');
    if (caso.julgamentos !== JULGAMENTOS_POR_CASO) recusar(`${onde}.julgamentos`, caso.julgamentos, `${JULGAMENTOS_POR_CASO}`);
    if (JSON.stringify(caso.faixaDaNota) !== JSON.stringify(FAIXAS_DA_NOTA[caso.grupo])) recusar(`${onde}.faixaDaNota`, caso.faixaDaNota, `${JSON.stringify(FAIXAS_DA_NOTA[caso.grupo])}, a faixa do grupo ${caso.grupo}`);
    lerFonte(caso.fonte, `${onde}.fonte`, caso.grupo);
    if (copias.has(caso.fonte.copia.peca)) recusar(`${onde}.fonte.copia.peca`, caso.fonte.copia.peca, 'cópia que nenhum outro caso usa');
    copias.add(caso.fonte.copia.peca);
    if (!Array.isArray(caso.defeitos)) recusar(`${onde}.defeitos`, caso.defeitos, 'lista de defeitos esperados, vazia no controle');
    caso.defeitos.forEach((d, k) => lerDefeito(d, `${onde}.defeitos[${k}]`));
    if (caso.grupo === 'controle' && caso.defeitos.length > 0) recusar(`${onde}.defeitos`, caso.defeitos, 'nenhum: o controle não tem defeito');
    if (caso.grupo !== 'controle' && caso.defeitos.length === 0) recusar(`${onde}.defeitos`, caso.defeitos, 'ao menos um defeito esperado');
    if (caso.grupo === 'revolucao-facetada' && !caso.defeitos.every((d) => d.tipo === 'superficie')) recusar(`${onde}.defeitos`, caso.defeitos.map((d) => d.tipo), 'só defeito de superfície na revolução facetada');

    if (caso.destino === undefined) {
      if (exigirPreparados) recusar(`${onde}.destino`, undefined, `${DESTINOS.join(' ou ')}: o caso passa pela medição da rodada antes de entrar no conjunto (npm run calibracao -- medir ${caso.id})`);
      continue;
    }
    if (!DESTINOS.includes(caso.destino)) recusar(`${onde}.destino`, caso.destino, DESTINOS.join(' ou '));
    const m = caso.medicao;
    if (!plano(m)) recusar(`${onde}.medicao`, m, 'objeto { passou, comando, receitaSha256, forma, relatorio }, gravado por `medir`');
    chaves(m, ['passou', 'comando', 'receitaSha256', 'forma', 'relatorio'], `${onde}.medicao`);
    exigir(m, ['passou', 'comando', 'receitaSha256', 'forma', 'relatorio'], `${onde}.medicao`);
    if (!sha(m.forma)) recusar(`${onde}.medicao.forma`, m.forma, 'a impressão da forma que a cópia produz (a mesma conta do registro de etapas)');
    if (caso.grupo === 'controle' && m.forma !== caso.fonte.aceite.forma) recusar(`${onde}.medicao.forma`, m.forma, `${caso.fonte.aceite.forma}, a forma que a pessoa aceitou: o controle é a geometria do aceite`);
    if (typeof m.passou !== 'boolean') recusar(`${onde}.medicao.passou`, m.passou, 'verdadeiro ou falso');
    if (!texto(m.comando)) recusar(`${onde}.medicao.comando`, m.comando, 'o comando que mediu');
    if (m.receitaSha256 !== caso.fonte.copia.sha256) recusar(`${onde}.medicao.receitaSha256`, m.receitaSha256, `${caso.fonte.copia.sha256}, a impressão da cópia: a medição é da cópia gravada (npm run calibracao -- medir ${caso.id})`);
    if (!texto(m.relatorio)) recusar(`${onde}.medicao.relatorio`, m.relatorio, 'o que a medição disse');
    if ((caso.destino === 'critico') !== m.passou) recusar(`${onde}.destino`, caso.destino, m.passou ? '"critico": a medição passou' : '"medida": a medição reprovou, e o caso não chega ao crítico');
    if (caso.grupo === 'controle' && caso.destino !== 'critico') recusar(`${onde}.destino`, caso.destino, '"critico": o controle é etapa aceita, e a medição dela passa');
    if (caso.destino === 'medida') {
      if (caso.pedido !== undefined || caso.imagens !== undefined) recusar(`${onde}.pedido`, caso.pedido ?? caso.imagens, 'nada: o caso que a medida reprova não tem pedido nem imagem');
      if (caso.obrigatorio) recusar(`${onde}.obrigatorio`, true, 'falso: o caso da medida não é julgado');
      continue;
    }
    if (caso.pedido === undefined && !exigirPreparados) continue;
    arquivoComImpressao(caso.pedido, `${onde}.pedido`);
    if (caso.pedido.arquivo !== `${PASTA_DOS_CASOS}/${caso.id}/${ARQUIVO_DO_PEDIDO}`) recusar(`${onde}.pedido.arquivo`, caso.pedido.arquivo, `${PASTA_DOS_CASOS}/${caso.id}/${ARQUIVO_DO_PEDIDO}`);
    if (!(Array.isArray(caso.imagens) && caso.imagens.length > 0)) recusar(`${onde}.imagens`, caso.imagens, 'lista das imagens do pacote padrão que o pedido cita');
    caso.imagens.forEach((im, k) => {
      arquivoComImpressao(im, `${onde}.imagens[${k}]`);
      if (!(im.arquivo.startsWith(`${PASTA_DOS_CASOS}/${caso.id}/`) && im.arquivo.endsWith('.png'))) recusar(`${onde}.imagens[${k}].arquivo`, im.arquivo, `um .png em ${PASTA_DOS_CASOS}/${caso.id}/`);
    });
  }

  const julgados = bruto.casos.filter((k) => k.destino !== 'medida');
  if (r.passa.de !== julgados.length) recusar('conjunto.regra.passa.de', r.passa.de, `${julgados.length}, o número de casos que chegam ao crítico`);
  if (!(Number.isInteger(r.passa.minimo) && r.passa.minimo >= 1 && r.passa.minimo <= r.passa.de)) recusar('conjunto.regra.passa.minimo', r.passa.minimo, `inteiro de 1 a ${r.passa.de}`);
  const obrigatorios = julgados.filter((k) => k.obrigatorio).map((k) => k.nome).sort();
  if (!(Array.isArray(r.passa.obrigatorias) && JSON.stringify([...r.passa.obrigatorias].sort()) === JSON.stringify(obrigatorios))) {
    recusar('conjunto.regra.passa.obrigatorias', r.passa.obrigatorias, `os nomes dos casos marcados \`obrigatorio\`: ${obrigatorios.join(', ') || '(nenhum)'}`);
  }

  if (!Array.isArray(bruto.resultados)) recusar('conjunto.resultados', bruto.resultados, 'lista, vazia enquanto nenhum julgamento foi medido');
  const vistos = new Set();
  bruto.resultados.forEach((res, i) => {
    const onde = `conjunto.resultados[${i}]`;
    if (!plano(res)) recusar(onde, res, 'objeto { caso, agenteSha256, julgamentos }');
    chaves(res, ['caso', 'agenteSha256', 'julgamentos'], onde);
    const caso = bruto.casos.find((k) => k.id === res.caso);
    if (!caso) recusar(`${onde}.caso`, res.caso, `id de um caso do conjunto: ${[...ids].join(', ')}`);
    if (caso.destino !== 'critico') recusar(`${onde}.caso`, res.caso, 'caso que chega ao crítico: o que a medida reprova não tem julgamento');
    if (vistos.has(res.caso)) recusar(`${onde}.caso`, res.caso, 'uma entrada só por caso');
    vistos.add(res.caso);
    if (!sha(res.agenteSha256)) recusar(`${onde}.agenteSha256`, res.agenteSha256, 'a impressão do agente que julgou');
    if (!(Array.isArray(res.julgamentos) && res.julgamentos.length > 0)) recusar(`${onde}.julgamentos`, res.julgamentos, 'lista de julgamentos');
    res.julgamentos.forEach((j, k) => lerJulgamento(j, `${onde}.julgamentos[${k}]`));
    if (res.julgamentos.length > caso.julgamentos) recusar(`${onde}.julgamentos`, `${res.julgamentos.length} julgamentos de ${res.caso}`, `no máximo ${caso.julgamentos}`);
  });
  return bruto;
}

/* ---------- o conjunto no disco ---------- */

export function caminhoDoConjunto(raiz = RAIZ) { return join(raiz, PASTA_DO_CONJUNTO, ARQUIVO_DO_CONJUNTO); }

export function lerConjuntoDoDisco({ raiz = RAIZ, exigirPreparados = true } = {}) {
  const arquivo = caminhoDoConjunto(raiz);
  if (!existsSync(arquivo)) throw new ErroDaFonte(`o conjunto não existe: ${arquivo}`);
  return lerCasos(JSON.parse(readFileSync(arquivo, 'utf8')), { exigirPreparados });
}

function gravarConjunto(conj, raiz, { exigirPreparados = true } = {}) {
  lerCasos(conj, { exigirPreparados });
  writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(conj, null, 2)}\n`, 'utf8');
}

function casoPorId(conj, id) {
  const lista = conj.casos.map((k) => k.id).join(', ');
  if (typeof id !== 'string' || id === '') throw new ErroDeUso(`falta o id do caso; esperado um de ${lista}.`);
  const achado = conj.casos.find((k) => k.id === id);
  if (!achado) throw new ErroDeUso(`recebido o caso '${id}', que não está no conjunto; esperado um de ${lista}.`);
  return achado;
}

/* ---------- o crítico: o agente e o modelo ---------- */

const LINHA_DO_MODELO = /^model:[ \t]*(\S.*?)[ \t]*$/m;

function textoDoAgente(arquivo, raiz) {
  const caminho = resolve(raiz, arquivo);
  if (!existsSync(caminho)) throw new ErroDaFonte(`o agente do crítico não existe: ${arquivo}`);
  return semCR(readFileSync(caminho, 'utf8'));
}
/* o cabeçalho do agente, entre as duas linhas `---` */
function cabecalhoDoAgente(lido) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(lido);
  return m ? m[1] : '';
}

/** O modelo que a definição do agente declara (a linha `model:` do cabeçalho), ou null quando ela não declara. */
export function modeloDoAgente(arquivo = AGENTE_DO_CRITICO, raiz = RAIZ) {
  return LINHA_DO_MODELO.exec(cabecalhoDoAgente(textoDoAgente(arquivo, raiz)))?.[1] ?? null;
}

/**
 * A impressão do agente, sem a linha `model:` do cabeçalho. O que o crítico lê e as ferramentas que ele tem entram; o modelo fica de
 * fora, porque a pessoa decidiu em 2026-11-26 que o modelo diferente só avisa: quem usa outro modelo não pode ter o gate vermelho nem
 * ser levado a dezenas de despachos sem saber. O modelo é gravado à parte, em `critico.modelo`.
 */
export function hashDoAgente(arquivo = AGENTE_DO_CRITICO, raiz = RAIZ) {
  const lido = textoDoAgente(arquivo, raiz);
  const cabecalho = cabecalhoDoAgente(lido);
  const semModelo = cabecalho.split('\n').filter((linha) => !/^model:/.test(linha)).join('\n');
  return sha256(cabecalho === '' ? lido : lido.replace(cabecalho, semModelo));
}

/** O vocabulário de defeito que o agente escreve (`- **tipo** — ...: `sentido`, ...`), por tipo. */
export function vocabularioDoAgente(lido) {
  const vocabulario = {};
  let atual = null;
  for (const linha of semCR(lido).split('\n')) {
    const m = /^- \*\*([a-z]+)\*\*/.exec(linha);
    if (m) { atual = m[1]; vocabulario[atual] = new Set(); } else if (linha.trim() === '') atual = null;
    if (atual) for (const t of linha.matchAll(/`([a-z_]+)`/g)) vocabulario[atual].add(t[1]);
  }
  return vocabulario;
}

/** Os tipos e sentidos que o conjunto aceita (os de `veredito-de-forma.js`) que o agente não escreve; vazio quando coincidem. */
export function faltaNoAgente(lido) {
  const escrito = vocabularioDoAgente(lido);
  const falta = [];
  for (const [tipo, sentidos] of Object.entries(TIPOS_DE_DEFEITO)) {
    if (!escrito[tipo]) { falta.push(`tipo ${tipo}`); continue; }
    for (const sentido of sentidos) if (!escrito[tipo].has(sentido)) falta.push(`sentido ${tipo}/${sentido}`);
  }
  return falta;
}

/**
 * Os avisos sobre o modelo do crítico, que nunca reprovam: a definição do agente declara outro modelo que o do conjunto; os julgamentos
 * vieram de modelos diferentes; um julgamento veio de outro modelo que o medido. Cada aviso diz o comando que mede de novo, e o gate
 * não o roda.
 */
export function avisosDoModelo(conj, { raiz = RAIZ } = {}) {
  const avisos = [];
  const comoMedir = 'os julgamentos gravados valem para o modelo medido; medir de novo é de propósito, com `npm run calibracao -- recalibrar --de-proposito` e os despachos que ele lista';
  let declarado = null;
  try { declarado = modeloDoAgente(conj.critico.agente.arquivo, raiz); } catch (erro) { if (!(erro instanceof ErroDaFonte)) throw erro; }
  if (declarado !== null && declarado !== conj.critico.modelo.declarado) {
    avisos.push(`a definição do crítico declara o modelo '${declarado}' e o conjunto foi medido com '${conj.critico.modelo.declarado}': ${comoMedir}.`);
  }
  const usados = [...new Set(conj.resultados.flatMap((res) => res.julgamentos.map((j) => j.modelo)))].sort();
  if (usados.length > 1) avisos.push(`os julgamentos vieram de ${usados.length} modelos (${usados.join(', ')}): a pontuação mistura críticos diferentes; ${comoMedir}.`);
  else if (usados.length === 1 && conj.critico.modelo.medido !== null && usados[0] !== conj.critico.modelo.medido) {
    avisos.push(`os julgamentos vieram do modelo '${usados[0]}' e o conjunto grava '${conj.critico.modelo.medido}' como o medido: ${comoMedir}.`);
  }
  return avisos;
}

/* ---------- as impressões ---------- */

/**
 * A impressão de um texto que o crítico lê, com o caminho da pasta do conjunto e o do repositório tirados, para valer em qualquer cópia
 * do repositório e depois de a pasta mudar de lugar: medido em 2026-10-28, trocar o nome da pasta `docs` do projeto para `docs/modelar`
 * invalidou os 40 julgamentos das doze imagens de então sem que nada do que o crítico via tivesse mudado.
 */
export const impressaoDoBrief = (lido, raiz = RAIZ) => sha256(lido.replaceAll(resolve(raiz, PASTA_DO_CONJUNTO), '<conjunto>').replaceAll(resolve(raiz), MARCA_DA_RAIZ));

/** A impressão das imagens que o crítico vê num caso, na ordem do pedido: a impressão gravada de cada PNG. */
export const hashDasImagens = (caso) => sha256((caso.imagens ?? []).map((im) => `${im.arquivo}\n${im.sha256}`).join('\n'));

/* ---------- a cópia de ensaio ---------- */

/** O texto da cópia: a origem com as trocas aplicadas, na ordem. Cada `de` aparece uma vez só no texto em que é trocado. */
export function aplicarTrocas(origem, trocas) {
  let saida = origem;
  trocas.forEach((t, i) => {
    const vezes = saida.split(t.de).length - 1;
    if (vezes !== 1) throw new ErroDaFonte(`a troca ${i + 1} procura um trecho que aparece ${vezes} vez(es) na receita (esperada uma): ${JSON.stringify(t.de.slice(0, 80))}`);
    saida = saida.replace(t.de, () => t.para);
  });
  return saida;
}

/** `copiar [<id>]`: escreve a cópia de ensaio de cada caso a partir da origem e das trocas, e grava as duas impressões. Recusa a origem
 *  que mudou desde que o caso foi escrito, porque a cópia de um caso julgado é a que o crítico viu. */
export function copiar({ id, raiz = RAIZ } = {}, saida = console) {
  const conj = copia(lerConjuntoDoDisco({ raiz, exigirPreparados: false }));
  const alvos = id ? [casoPorId(conj, id)] : conj.casos;
  for (const caso of alvos) {
    const { fonte } = caso;
    const origem = resolve(raiz, fonte.origem.arquivo);
    if (!existsSync(origem)) throw new ErroDaFonte(`${caso.id}: a receita de origem não existe: ${fonte.origem.arquivo}`);
    const lida = semCR(readFileSync(origem, 'utf8'));
    const agora = sha256(lida);
    const destino = resolve(raiz, fonte.copia.arquivo);
    if (agora !== fonte.origem.sha256 && existsSync(destino)) {
      throw new ErroDaFonte(`${caso.id}: a receita de origem ${fonte.origem.arquivo} mudou desde que a cópia foi escrita (gravada ${curto(fonte.origem.sha256)}, agora ${curto(agora)}). A cópia gravada continua valendo; para refazê-la sobre a origem de hoje apague ${fonte.copia.arquivo} e rode de novo, o que pede medir e julgar o caso outra vez.`);
    }
    const escrita = aplicarTrocas(lida, fonte.trocas);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, escrita, 'utf8');
    const mudou = sha256(escrita) !== fonte.copia.sha256;
    fonte.origem.sha256 = agora;
    fonte.copia.sha256 = sha256(escrita);
    if (mudou) { delete caso.destino; delete caso.medicao; delete caso.pedido; delete caso.imagens; }
    saida.log(`${caso.id} ${caso.nome}: ${fonte.copia.arquivo} escrita de ${fonte.origem.arquivo} com ${fonte.trocas.length} troca(s)${mudou ? '; o texto mudou, e o caso volta a esperar a medição' : ', igual à gravada'}.`);
  }
  gravarConjunto(conj, raiz, { exigirPreparados: false });
  return 0;
}

/* ---------- a medição da rodada ---------- */

const LINHA_DA_MEDICAO = /^medição da receita atual \(sha256:([0-9a-f]+)\): (passou|reprovou)$/m;

/** Roda a medição da rodada sobre a peça, num processo à parte, como quem conduz uma rodada. Devolve `{ codigo, texto }`. */
export function rodarMedicaoDaRodada(peca, { raiz = RAIZ } = {}) {
  try {
    return { codigo: 0, texto: execFileSync(process.execPath, ['tools/modelar/rodada-de-modelagem.mjs', peca, '--acao'], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) };
  } catch (erro) {
    return { codigo: erro.status ?? 1, texto: `${erro.stdout ?? ''}${erro.stderr ?? ''}` };
  }
}

/** O que a saída do `--acao` diz da medição: `{ passou, relatorio }`, ou null quando a linha da medição não saiu. */
export function lerMedicaoDaRodada(lido) {
  const m = LINHA_DA_MEDICAO.exec(lido);
  if (!m) return null;
  const linhas = lido.split('\n').filter((l) => !/: descrever: /.test(l));
  const desde = linhas.findIndex((l) => LINHA_DA_MEDICAO.test(l));
  /* a razão da reprovação vem na linha da próxima ação e nas seguintes, até a lista dos defeitos em aberto */
  const ate = linhas.findIndex((l, i) => i > desde && /^(defeitos em aberto|decisões da pessoa):/.test(l));
  const corpo = linhas.slice(desde, ate === -1 ? linhas.length : ate).join('\n').trim();
  return { passou: m[2] === 'passou', relatorio: corpo.length > 4000 ? `${corpo.slice(0, 4000)}\n[cortado]` : corpo };
}

/** A impressão da forma que a receita produz, pela mesma conta do registro de etapas (`assinaturaDaForma` sobre a malha executada). */
export async function formaDaReceita(caminho) {
  const { importarReceita, receitaDoModulo } = await import('./importar-receita.mjs');
  const { executarComCachePorPasso } = await import('./entrada-de-medida.mjs');
  const { assinaturaDaForma } = await import('../../src/autoria/assinatura-da-forma.js');
  const receita = receitaDoModulo(await importarReceita(caminho));
  return assinaturaDaForma((await executarComCachePorPasso(caminho, receita, {})).executada.neutro);
}

/** `medir [<id>]`: passa a cópia de cada caso pela medição da rodada e grava o destino e a forma. O controle que reprova, ou cuja forma
 *  não é a do aceite, é erro do conjunto. */
export async function medir({ id, raiz = RAIZ, rodar = rodarMedicaoDaRodada, forma = formaDaReceita } = {}, saida = console) {
  const conj = copia(lerConjuntoDoDisco({ raiz, exigirPreparados: false }));
  const alvos = id ? [casoPorId(conj, id)] : conj.casos;
  for (const caso of alvos) {
    const { peca, arquivo } = caso.fonte.copia;
    const caminho = resolve(raiz, arquivo);
    if (!existsSync(caminho)) throw new ErroDaFonte(`${caso.id}: a cópia ${arquivo} não existe; escreva-a com \`npm run calibracao -- copiar ${caso.id}\`.`);
    const atual = sha256(semCR(readFileSync(caminho, 'utf8')));
    if (atual !== caso.fonte.copia.sha256) throw new ErroDaFonte(`${caso.id}: a cópia ${arquivo} não é a gravada (gravada ${curto(caso.fonte.copia.sha256)}, agora ${curto(atual)}); refaça-a com \`npm run calibracao -- copiar ${caso.id}\`.`);
    const comando = `node tools/modelar/rodada-de-modelagem.mjs ${peca} --acao`;
    const { codigo, texto: lido } = rodar(peca, { raiz });
    const medicao = lerMedicaoDaRodada(lido);
    if (!medicao) throw new ErroDaFonte(`${caso.id}: \`${comando}\` saiu com ${codigo} sem a linha da medição; a saída acaba em: ${lido.trim().split('\n').slice(-3).join(' | ').slice(-400)}`);
    if (caso.grupo === 'controle' && !medicao.passou) throw new ErroDaFonte(`${caso.id}: o controle reprovou na medição da rodada, e um controle é etapa aceita:\n${medicao.relatorio}`);
    const formaDaCopia = await forma(caminho);
    if (caso.grupo === 'controle' && formaDaCopia !== caso.fonte.aceite.forma) throw new ErroDaFonte(`${caso.id}: a cópia do controle produz a forma ${curto(formaDaCopia)} e a pessoa aceitou ${curto(caso.fonte.aceite.forma)} (${caso.fonte.aceite.registro}, ${caso.fonte.aceite.instancia}): a receita do acervo mudou depois do aceite, e a cópia não é mais a etapa aceita.`);
    const destino = medicao.passou ? 'critico' : 'medida';
    const mudouDeDestino = caso.destino !== undefined && caso.destino !== destino;
    caso.destino = destino;
    caso.medicao = { passou: medicao.passou, comando, receitaSha256: atual, forma: formaDaCopia, relatorio: medicao.relatorio };
    if (destino === 'medida' || mudouDeDestino) { delete caso.pedido; delete caso.imagens; }
    if (destino === 'medida') caso.obrigatorio = false;
    saida.log(`${caso.id} ${caso.nome}: a medição da rodada ${medicao.passou ? 'passou, e o caso segue para o crítico' : 'reprovou, e o caso fica como prova da medida, sem julgamento'}.`);
  }
  acertarARegra(conj);
  gravarConjunto(conj, raiz, { exigirPreparados: false });
  return 0;
}

/* `regra.passa.de` é o número de casos que chegam ao crítico; o mínimo acompanha quando passa dele, e as obrigatórias são as marcadas */
function acertarARegra(conj) {
  const julgados = conj.casos.filter((k) => k.destino !== 'medida');
  conj.regra.passa.de = julgados.length;
  conj.regra.passa.minimo = Math.max(1, Math.min(conj.regra.passa.minimo, julgados.length));
  conj.regra.passa.obrigatorias = julgados.filter((k) => k.obrigatorio).map((k) => k.nome).sort();
  conj.resultados = conj.resultados.filter((res) => julgados.some((k) => k.id === res.caso));
}

/* ---------- o pacote padrão ---------- */

/** Roda `vistas:critica` (o pacote padrão, sem `--completo`) sobre a peça, gravando em `pasta`. Uma captura por vez. */
export function rodarPacotePadrao(peca, pasta, { raiz = RAIZ } = {}) {
  try {
    return { codigo: 0, texto: execFileSync(process.execPath, ['tools/modelar/vistas-para-critica.mjs', peca, `--saida=${pasta}`], { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) };
  } catch (erro) {
    return { codigo: erro.status ?? 1, texto: `${erro.stdout ?? ''}${erro.stderr ?? ''}` };
  }
}

const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * O pedido de um pacote como o conjunto o guarda: o caminho da pasta do pacote vira `<pacote>` e o do repositório vira `<raiz>`, para o
 * texto valer em qualquer cópia do repositório. Devolve `{ pedido, imagens }`, com as imagens que o pedido cita dentro do pacote, pelo
 * caminho relativo a ele, na ordem em que aparecem.
 */
export function pedidoDoCaso(lido, { pasta, raiz = RAIZ }) {
  const pacote = resolve(pasta);
  const imagens = [...new Set([...lido.matchAll(new RegExp(`${escaparRegex(pacote)}/([^\\s)\`'"]+\\.png)`, 'g'))].map((m) => m[1]))];
  return { pedido: lido.replaceAll(pacote, MARCA_DO_PACOTE).replaceAll(resolve(raiz), MARCA_DA_RAIZ), imagens };
}

/** O que, no pedido de um caso, conta que ele é de calibração ou qual é o defeito: o nome do caso e a palavra calibração. */
export function vazamentosDoPedido(caso, pedido) {
  const lido = dobrar(pedido);
  const achados = [];
  for (const palavra of new Set([caso.nome, caso.nome.replace(/-/g, ' '), 'calibra'])) if (lido.includes(dobrar(palavra))) achados.push(`'${palavra}'`);
  return achados;
}

/** `pacote <id>`: monta o pacote padrão da cópia do caso e grava em `casos/<id>/` o pedido e as imagens que ele cita. */
export function pacote({ id, raiz = RAIZ, rodar = rodarPacotePadrao } = {}, saida = console) {
  const conj = copia(lerConjuntoDoDisco({ raiz, exigirPreparados: false }));
  const caso = casoPorId(conj, id);
  if (caso.destino !== 'critico') throw new ErroDaFonte(`${id}: ${caso.destino === 'medida' ? 'a medição da rodada reprovou o caso, e ele não chega ao crítico' : `o caso ainda não passou pela medição da rodada; rode \`npm run calibracao -- medir ${id}\``}.`);
  if (conj.resultados.some((res) => res.caso === id)) throw new ErroDaFonte(`${id} já tem julgamentos, dados ao pacote gravado; um pacote novo os invalida. Para julgar tudo de novo rode \`npm run calibracao -- recalibrar --de-proposito\` antes.`);
  const { peca } = caso.fonte.copia;
  const pasta = pastaDoPacote(peca, raiz);
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  const { codigo, texto: lido } = rodar(peca, pasta, { raiz });
  const arquivoDoPedido = join(pasta, 'pedido.md');
  if (codigo !== 0 || !existsSync(arquivoDoPedido)) throw new ErroDaFonte(`${id}: \`npm run vistas:critica -- ${peca} --saida=${pasta}\` saiu com ${codigo} e ${existsSync(arquivoDoPedido) ? 'gravou' : 'não gravou'} o pedido.md; a saída acaba em: ${lido.trim().split('\n').slice(-4).join(' | ').slice(-600)}`);
  const levado = pedidoDoCaso(readFileSync(arquivoDoPedido, 'utf8'), { pasta, raiz });
  const vazou = vazamentosDoPedido(caso, levado.pedido);
  if (vazou.length) throw new ErroDaFonte(`${id}: o pedido conta o que o caso é (${vazou.join(', ')}); o crítico tem de julgar sem saber.`);
  const destino = resolve(raiz, PASTA_DO_CONJUNTO, PASTA_DOS_CASOS, id);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  writeFileSync(join(destino, ARQUIVO_DO_PEDIDO), levado.pedido, 'utf8');
  caso.pedido = { arquivo: `${PASTA_DOS_CASOS}/${id}/${ARQUIVO_DO_PEDIDO}`, sha256: sha256(levado.pedido) };
  caso.imagens = levado.imagens.map((rel) => {
    const origem = join(pasta, rel);
    if (!existsSync(origem)) throw new ErroDaFonte(`${id}: o pedido cita ${origem}, que o pacote não gravou.`);
    const arquivo = `${PASTA_DOS_CASOS}/${id}/${rel}`;
    const para = resolve(raiz, PASTA_DO_CONJUNTO, arquivo);
    mkdirSync(dirname(para), { recursive: true });
    copyFileSync(origem, para);
    return { arquivo, sha256: sha256(readFileSync(para)) };
  });
  gravarConjunto(conj, raiz, { exigirPreparados: false });
  const tempo = /^TEMPO: .*$/m.exec(lido)?.[0] ?? '';
  saida.log(`${id} ${caso.nome}: pedido e ${caso.imagens.length} imagens gravados em ${PASTA_DO_CONJUNTO}/${PASTA_DOS_CASOS}/${id}/.${tempo ? ` ${tempo}` : ''}`);
  return 0;
}

/* ---------- o pedido que o crítico recebe ---------- */

/**
 * Põe o caso onde o crítico o lê: copia as imagens gravadas para a pasta de pacote da cópia de ensaio (a de uma rodada de verdade, fora
 * do git) e escreve lá o pedido com os caminhos absolutos desta cópia do repositório. Devolve `{ pedido, pasta, imagens }`.
 */
export function materializarPedido(caso, { raiz = RAIZ } = {}) {
  const arquivo = resolve(raiz, PASTA_DO_CONJUNTO, caso.pedido.arquivo);
  if (!existsSync(arquivo)) throw new ErroDaFonte(`${caso.id}: ${caso.pedido.arquivo} não existe.`);
  const pasta = pastaDoPacote(caso.fonte.copia.peca, raiz);
  const prefixo = `${PASTA_DOS_CASOS}/${caso.id}/`;
  const imagens = caso.imagens.map((im) => {
    const para = join(pasta, im.arquivo.slice(prefixo.length));
    mkdirSync(dirname(para), { recursive: true });
    copyFileSync(resolve(raiz, PASTA_DO_CONJUNTO, im.arquivo), para);
    return para;
  });
  const pedidoPronto = join(pasta, 'pedido.md');
  writeFileSync(pedidoPronto, readFileSync(arquivo, 'utf8').replaceAll(MARCA_DO_PACOTE, pasta).replaceAll(MARCA_DA_RAIZ, resolve(raiz)), 'utf8');
  return { pedido: pedidoPronto, pasta, imagens };
}

/** `pedido <id>`: põe o pedido e as imagens do caso na pasta de pacote, com os caminhos absolutos, e diz onde o pedido ficou. O crítico recebe esse arquivo. */
export function pedido({ id, raiz = RAIZ } = {}, saida = console) {
  const conj = lerConjuntoDoDisco({ raiz });
  const caso = casoPorId(conj, id);
  if (caso.destino !== 'critico') throw new ErroDaFonte(`${id}: a medição da rodada reprovou o caso, e ele não tem pedido.`);
  saida.log(materializarPedido(caso, { raiz }).pedido);
  return 0;
}

const julgamentosDoCaso = (conj, id) => conj.resultados.filter((res) => res.caso === id).flatMap((res) => res.julgamentos);

/** `despachos`: os julgamentos que faltam. Para cada caso, o pedido a entregar ao crítico, a pasta das imagens e o comando que registra. */
export function despachos({ raiz = RAIZ } = {}, saida = console) {
  const conj = lerConjuntoDoDisco({ raiz });
  let faltam = 0;
  for (const caso of conj.casos) {
    if (caso.destino !== 'critico') { saida.log(`${caso.id}: fora do julgamento, a medição da rodada o reprova.`); continue; }
    const falta = caso.julgamentos - julgamentosDoCaso(conj, caso.id).length;
    if (falta <= 0) { saida.log(`${caso.id}: ${caso.julgamentos} de ${caso.julgamentos} julgamentos, nada a despachar.`); continue; }
    faltam += falta;
    const pronto = materializarPedido(caso, { raiz });
    saida.log(`${caso.id}: faltam ${falta} de ${caso.julgamentos} julgamentos, cada um de um crítico novo, sem a história`);
    saida.log(`    pedido:   ${pronto.pedido}`);
    saida.log(`    imagens:  ${pronto.pasta}/ (${pronto.imagens.length} PNG, copiados de ${PASTA_DO_CONJUNTO}/${PASTA_DOS_CASOS}/${caso.id}/; o pedido cita cada um pelo caminho absoluto)`);
    saida.log(`    registro: npm run calibracao -- registrar ${caso.id} --arquivo=<resposta do crítico> --modelo=<modelo que julgou>`);
  }
  saida.log(faltam === 0 ? 'nenhum despacho a fazer.' : `${faltam} despacho(s) do agente critico-visual a fazer; a definição dele declara o modelo '${modeloDoAgente(conj.critico.agente.arquivo, raiz) ?? 'nenhum'}'.`);
  return 0;
}

/* ---------- o gate ---------- */

/**
 * O julgamento cita o defeito esperado quando traz um defeito cuja `parte` ou cujo `onde` tem uma das `palavras` (sem distinguir
 * maiúscula nem acento) e cujo tipo e sentido estão entre os `aceitos`. As duas condições juntas: o crítico que aponta a parte certa
 * com o sentido contrário (raio fino onde a pessoa reprovou o raio largo) não citou o defeito.
 */
export function citaDefeito(julgamento, defeito) {
  const palavras = defeito.palavras.map(dobrar);
  return julgamento.defeitos.some((d) => defeito.aceitos.includes(`${d.tipo}/${d.sentido}`) && palavras.some((p) => dobrar(d.parte).includes(p) || dobrar(d.onde).includes(p)));
}

const mediana = (notas) => {
  const o = [...notas].sort((x, y) => x - y);
  const meio = o.length >> 1;
  return o.length % 2 ? o[meio] : (o[meio - 1] + o[meio]) / 2;
};

/**
 * A pontuação de um caso sobre os julgamentos recebidos. `acerta` é nulo enquanto faltam julgamentos. Acerta quando a mediana das notas
 * cai na faixa do grupo, no máximo um julgamento sai dela, cada defeito esperado é citado por pelo menos dois dos três julgamentos e,
 * no controle, no máximo um julgamento cita defeito estrutural (`uniao`, `posicao` ou `ausencia`).
 */
export function pontuarCaso(caso, julgamentos) {
  const notas = julgamentos.map((j) => j.nota);
  const [minimo, maximo] = caso.faixaDaNota;
  const base = {
    id: caso.id, nome: caso.nome, classe: caso.grupo, esperados: caso.julgamentos, recebidos: julgamentos.length,
    faltam: Math.max(0, caso.julgamentos - julgamentos.length), completa: julgamentos.length >= caso.julgamentos, notas, faixa: [minimo, maximo],
  };
  if (julgamentos.length === 0) return { ...base, mediana: null, amplitude: null, criterios: null, motivos: [], acerta: null };
  const m = mediana(notas);
  const fora = notas.filter((n) => n < minimo || n > maximo).length;
  const estruturais = julgamentos.filter((j) => j.defeitos.some((d) => TIPOS_ESTRUTURAIS.includes(d.tipo))).length;
  const criterios = {
    mediana: { valor: m, ok: m >= minimo && m <= maximo },
    foraDaFaixa: { n: fora, maximo: FORA_DA_FAIXA_ACEITO, ok: fora <= FORA_DA_FAIXA_ACEITO },
    citacoes: caso.defeitos.map((d) => {
      const n = julgamentos.filter((j) => citaDefeito(j, d)).length;
      return { parte: d.parte, tipo: d.tipo, n, minimo: CITACOES_MINIMAS, ok: n >= CITACOES_MINIMAS };
    }),
    estruturais: caso.grupo === 'controle' ? { n: estruturais, maximo: ESTRUTURAIS_ACEITOS_NO_CONTROLE, ok: estruturais <= ESTRUTURAIS_ACEITOS_NO_CONTROLE } : null,
  };
  const motivos = [];
  if (!criterios.mediana.ok) motivos.push(`mediana ${m} fora da faixa ${minimo} a ${maximo}`);
  if (!criterios.foraDaFaixa.ok) motivos.push(`${fora} julgamentos fora da faixa (no máximo ${FORA_DA_FAIXA_ACEITO})`);
  for (const c of criterios.citacoes) if (!c.ok) motivos.push(`o defeito de '${c.parte}' foi citado em ${c.n} de ${caso.julgamentos} julgamentos (mínimo ${c.minimo})`);
  if (criterios.estruturais && !criterios.estruturais.ok) motivos.push(`${criterios.estruturais.n} julgamentos do controle citam defeito estrutural (no máximo ${ESTRUTURAIS_ACEITOS_NO_CONTROLE})`);
  return { ...base, mediana: m, amplitude: Math.max(...notas) - Math.min(...notas), criterios, motivos, acerta: base.completa ? motivos.length === 0 : null };
}

/** A pontuação do conjunto sobre os casos que chegam ao crítico. */
export function pontuar(conj) {
  const casos = conj.casos.filter((k) => k.destino === 'critico').map((caso) => pontuarCaso(caso, julgamentosDoCaso(conj, caso.id)));
  const faltam = Object.fromEntries(casos.filter((k) => k.faltam > 0).map((k) => [k.id, k.faltam]));
  const completo = casos.every((k) => k.completa);
  const acertos = casos.filter((k) => k.acerta === true).length;
  const { minimo, de, obrigatorias } = conj.regra.passa;
  const obrigatoriasErradas = casos.filter((k) => obrigatorias.includes(k.nome) && k.acerta !== true).map((k) => k.nome);
  const medido = casos.some((k) => k.recebidos > 0);
  const passa = completo && acertos >= minimo && obrigatoriasErradas.length === 0;
  return {
    casos, faltam, faltamNoTotal: Object.values(faltam).reduce((s, n) => s + n, 0), completo, acertos, minimo, de, obrigatoriasErradas,
    estado: !medido ? 'nao-medido' : !completo ? 'pendente' : passa ? 'passa' : 'reprova',
  };
}

/**
 * Confere o conjunto sem navegador, sem executar receita e sem despachar ninguém. Devolve `{ ok, problemas, avisos, conjunto, pontuacao }`;
 * cada problema é `{ caso, codigo, mensagem }`. Os avisos (o modelo do crítico, o conjunto antigo ainda na pasta) nunca reprovam.
 */
export function conferirConjunto({ raiz = RAIZ, conjunto = null } = {}) {
  const problemas = [];
  const reprovar = (caso, codigo, mensagem) => problemas.push({ caso, codigo, mensagem });
  let conj = conjunto;
  try { conj = conj === null ? lerConjuntoDoDisco({ raiz }) : lerCasos(conj); } catch (erro) {
    if (!(erro instanceof ErroDeCalibracao || erro instanceof ErroDaFonte || erro instanceof SyntaxError)) throw erro;
    return { ok: false, problemas: [{ caso: null, codigo: 'formato-invalido', mensagem: erro.message }], avisos: [], conjunto: null, pontuacao: null };
  }

  /* o crítico: o agente e o vocabulário dele */
  let agente = null;
  try {
    agente = hashDoAgente(conj.critico.agente.arquivo, raiz);
    if (agente !== conj.critico.agente.sha256) {
      reprovar(null, 'agente-mudou', `o agente ${conj.critico.agente.arquivo} mudou desde a calibração (gravado ${curto(conj.critico.agente.sha256)}, agora ${curto(agente)}; a linha \`model:\` não entra na conta): os julgamentos são de outro crítico. Medir de novo é de propósito: \`npm run calibracao -- recalibrar --de-proposito\`, e os despachos que ele lista.`);
    }
    const falta = faltaNoAgente(textoDoAgente(conj.critico.agente.arquivo, raiz));
    if (falta.length) reprovar(null, 'vocabulario-do-agente', `o agente não escreve o vocabulário de defeito do conjunto: faltam ${falta.join(', ')}`);
  } catch (erro) {
    if (!(erro instanceof ErroDaFonte)) throw erro;
    reprovar(null, 'agente-ausente', erro.message);
  }
  for (const res of conj.resultados) {
    if (res.agenteSha256 !== conj.critico.agente.sha256) reprovar(res.caso, 'resultado-de-outro-critico', `os julgamentos de ${res.caso} foram dados por outro agente que o gravado em \`critico.agente\` (${curto(res.agenteSha256)} contra ${curto(conj.critico.agente.sha256)}): julgue de novo`);
  }

  /* os casos: a cópia, o pedido e as imagens são os arquivos gravados, e cada julgamento é deles */
  for (const caso of conj.casos) {
    const quem = `${caso.id} ${caso.nome}`;
    const arquivoDaCopia = resolve(raiz, caso.fonte.copia.arquivo);
    if (!existsSync(arquivoDaCopia)) reprovar(quem, 'copia-ausente', `${caso.fonte.copia.arquivo} não existe; \`npm run calibracao -- copiar ${caso.id}\` a escreve da origem e das trocas`);
    else {
      const atual = sha256(semCR(readFileSync(arquivoDaCopia, 'utf8')));
      if (atual !== caso.fonte.copia.sha256) reprovar(quem, 'copia-mudou', `${caso.fonte.copia.arquivo} não é a cópia gravada (gravada ${curto(caso.fonte.copia.sha256)}, agora ${curto(atual)}): a cópia de ensaio é a que a medição e o crítico viram, e não se edita`);
    }
    const falta = palavraQueNaoConsta(caso.fonte, raiz);
    if (falta) reprovar(quem, 'palavra-da-pessoa-nao-consta', falta);
    if (caso.destino !== 'critico') continue;
    const arquivoDoPedido = resolve(raiz, PASTA_DO_CONJUNTO, caso.pedido.arquivo);
    let pedidoAtual = null;
    if (!existsSync(arquivoDoPedido)) reprovar(quem, 'pedido-ausente', `${caso.pedido.arquivo} não existe`);
    else {
      const lido = readFileSync(arquivoDoPedido, 'utf8');
      pedidoAtual = sha256(lido);
      if (pedidoAtual !== caso.pedido.sha256) reprovar(quem, 'pedido-diferente', `${caso.pedido.arquivo} não é o pedido gravado (gravado ${curto(caso.pedido.sha256)}, agora ${curto(pedidoAtual)})`);
      const vazou = vazamentosDoPedido(caso, lido);
      if (vazou.length) reprovar(quem, 'pedido-vaza', `o pedido que o crítico recebe conta o que o caso é: ${vazou.join(', ')}`);
      for (const [, citado] of lido.matchAll(/<raiz>\/([^\s)`'"]+\.(?:png|jpe?g|svg))/g)) {
        if (!existsSync(resolve(raiz, citado))) reprovar(quem, 'referencia-ausente', `o pedido cita ${citado}, que não existe no repositório`);
      }
      for (const im of caso.imagens) if (!lido.includes(`${MARCA_DO_PACOTE}/${im.arquivo.slice(`${PASTA_DOS_CASOS}/${caso.id}/`.length)}`)) reprovar(quem, 'imagem-fora-do-pedido', `${im.arquivo} está no caso e o pedido não a cita`);
    }
    for (const im of caso.imagens) {
      const caminho = resolve(raiz, PASTA_DO_CONJUNTO, im.arquivo);
      if (!existsSync(caminho)) { reprovar(quem, 'imagem-ausente', `${im.arquivo} não existe`); continue; }
      const atual = sha256(readFileSync(caminho));
      if (atual !== im.sha256) reprovar(quem, 'imagem-diferente', `${im.arquivo} não é o arquivo gravado (gravado ${curto(im.sha256)}, agora ${curto(atual)})`);
    }
    const julgamentos = julgamentosDoCaso(conj, caso.id);
    const deOutroPedido = julgamentos.filter((j) => j.pedidoSha256 !== caso.pedido.sha256).length;
    if (deOutroPedido) reprovar(quem, 'julgamento-de-outro-pedido', `${deOutroPedido} julgamento(s) foram dados a outro pedido que o gravado: julgue de novo`);
    const deOutraImagem = julgamentos.filter((j) => j.imagemSha256 !== hashDasImagens(caso)).length;
    if (deOutraImagem) reprovar(quem, 'julgamento-de-outra-imagem', `${deOutraImagem} julgamento(s) foram dados a outras imagens que as gravadas: julgue de novo`);
  }

  const pontuacao = pontuar(conj);
  if (pontuacao.estado === 'reprova') {
    reprovar(null, 'calibracao-nao-acerta', `o crítico acerta ${pontuacao.acertos} de ${pontuacao.de} casos (mínimo ${pontuacao.minimo})${pontuacao.obrigatoriasErradas.length ? `, e erra o obrigatório ${pontuacao.obrigatoriasErradas.join(', ')}` : ''}: `
      + `${pontuacao.casos.filter((k) => k.acerta === false).map((k) => `${k.id} ${k.nome} (${k.motivos.join('; ')})`).join(' | ')}`);
  }
  const avisos = avisosDoModelo(conj, { raiz });
  const restos = RESTOS_DO_CONJUNTO_ANTIGO.filter((nome) => existsSync(resolve(raiz, PASTA_DO_CONJUNTO, nome)));
  if (restos.length) avisos.push(`o conjunto de antes (o desenho de linhas e os julgamentos dados a ele) ainda está em ${PASTA_DO_CONJUNTO}/ (${restos.join(', ')}) e não é mais conferido; sai com \`git rm -r ${restos.map((nome) => `${PASTA_DO_CONJUNTO}/${nome}`).join(' ')}\` quando os julgamentos novos estiverem registrados.`);
  return { ok: problemas.length === 0, problemas, avisos, conjunto: conj, pontuacao };
}

/**
 * A palavra da pessoa gravada na fonte tem de constar no registro que a fonte cita: o aceite, num evento da instância no registro de
 * etapas com o mesmo texto e a mesma forma; a frase da reprovação, no `atrito` do registro de rodada. Devolve a falta, ou null.
 */
export function palavraQueNaoConsta(fonte, raiz = RAIZ) {
  const ler = (arquivo) => { try { return JSON.parse(readFileSync(resolve(raiz, arquivo), 'utf8')); } catch { return null; } };
  if (fonte.aceite) {
    const registro = ler(fonte.aceite.registro);
    if (!registro) return `o registro de etapas ${fonte.aceite.registro} não se lê`;
    const consta = (registro.eventos ?? []).some((e) => e.tipo === 'aceite' && e.instancia === fonte.aceite.instancia && e.aceite?.por === fonte.aceite.por && e.impressao?.forma === fonte.aceite.forma);
    return consta ? null : `${fonte.aceite.registro} não tem aceite da instância '${fonte.aceite.instancia}' com as palavras e a forma gravadas na fonte ("${fonte.aceite.por}", ${curto(fonte.aceite.forma)})`;
  }
  if (fonte.reprovacao) {
    const registro = ler(fonte.reprovacao.registro);
    if (!registro) return `o registro de rodada ${fonte.reprovacao.registro} não se lê`;
    return [].concat(registro.atrito ?? []).includes(fonte.reprovacao.frase) ? null : `o atrito de ${fonte.reprovacao.registro} não tem a frase gravada na fonte ("${fonte.reprovacao.frase.slice(0, 80)}")`;
  }
  return null;
}

/** O estado da pontuação em uma linha: o que falta por caso enquanto falta, ou o veredito do conjunto quando estão todos. */
export function linhaDoEstado(pontuacao) {
  if (pontuacao.estado === 'nao-medido' || pontuacao.estado === 'pendente') {
    const faltam = Object.entries(pontuacao.faltam).map(([id, n]) => `${id} ${n}`).join(', ');
    return `pontuação pendente: faltam ${pontuacao.faltamNoTotal} julgamentos (${faltam}); o gate passa até que estejam todos, e não despacha nenhum.`;
  }
  return `pontuação: o crítico acerta ${pontuacao.acertos} de ${pontuacao.de} casos (mínimo ${pontuacao.minimo}), com os obrigatórios ${pontuacao.obrigatoriasErradas.length ? 'errados' : 'certos'}.`;
}

export function conferir(opcoes = {}, saida = console) {
  const resultado = conferirConjunto({ raiz: opcoes.raiz ?? RAIZ, conjunto: opcoes.conjunto ?? null });
  if (!resultado.ok) {
    saida.error(`calibracao:check FALHOU — ${resultado.problemas.length} problema(s):`);
    for (const p of resultado.problemas) saida.error(`  ${p.caso ? `[${p.caso}] ` : ''}${p.codigo}: ${p.mensagem}`);
    for (const aviso of resultado.avisos) saida.error(`  aviso: ${aviso}`);
    return 1;
  }
  const conj = resultado.conjunto;
  const doCritico = conj.casos.filter((k) => k.destino === 'critico');
  const daMedida = conj.casos.filter((k) => k.destino === 'medida');
  const porGrupo = GRUPOS.map((g) => `${doCritico.filter((k) => k.grupo === g).length} de ${g}`).join(', ');
  saida.log(`calibracao:check ok — ${conj.casos.length} casos: ${doCritico.length} chegam ao crítico (${porGrupo}) e ${daMedida.length} a medição da rodada reprova antes${daMedida.length ? ` (${daMedida.map((k) => k.id).join(', ')})` : ''}; `
    + 'formato válido, a cópia de ensaio, o pedido e as imagens de cada caso são os gravados, e o agente é o gravado.');
  saida.log(linhaDoEstado(resultado.pontuacao));
  for (const aviso of resultado.avisos) saida.log(`aviso: ${aviso}`);
  return 0;
}

/* ---------- registrar, resumo e recalibrar ---------- */

/**
 * `registrar <id> --arquivo=<resposta> --modelo=<modelo>`: lê a resposta do crítico, que termina com o JSON do veredito, e grava um
 * julgamento com a nota, os defeitos, a impressão do pedido e a das imagens, o modelo que julgou e a data. Recusa a resposta sem JSON
 * válido, o agente que mudou desde a calibração, o caso que a medida reprova e o que já tem todos os julgamentos. O modelo diferente do
 * medido é gravado e avisado, sem recusa.
 */
export function registrar({ id, arquivo, modelo, raiz = RAIZ, agora = () => new Date() } = {}, saida = console) {
  const conj = copia(lerConjuntoDoDisco({ raiz }));
  const caso = casoPorId(conj, id);
  if (typeof arquivo !== 'string' || arquivo === '') throw new ErroDeUso('falta a resposta do crítico; esperado --arquivo=<arquivo com a resposta dele>.');
  if (!existsSync(resolve(arquivo))) throw new ErroDeUso(`recebido --arquivo=${arquivo}, que não existe; esperado o arquivo com a resposta do crítico.`);
  if (typeof modelo !== 'string' || modelo.trim() === '') throw new ErroDeUso('falta o modelo em que o crítico rodou; esperado --modelo=<modelo que julgou>, como quem o despachou o vê.');
  if (caso.destino !== 'critico') throw new ErroDaFonte(`${id}: a medição da rodada reprova o caso, e ele não é julgado.`);
  const veredito = extrairVeredito(readFileSync(resolve(arquivo), 'utf8'));
  const agente = hashDoAgente(conj.critico.agente.arquivo, raiz);
  if (agente !== conj.critico.agente.sha256) {
    throw new ErroDaFonte(`o agente do crítico mudou desde a calibração (gravado ${curto(conj.critico.agente.sha256)}, agora ${curto(agente)}): o julgamento não seria do crítico gravado. Para medir o crítico de hoje rode \`npm run calibracao -- recalibrar --de-proposito\`, que apaga os julgamentos e grava o agente de agora.`);
  }
  const lido = readFileSync(resolve(raiz, PASTA_DO_CONJUNTO, caso.pedido.arquivo), 'utf8');
  if (sha256(lido) !== caso.pedido.sha256) throw new ErroDaFonte(`${id}: ${caso.pedido.arquivo} não é o pedido gravado; o julgamento não seria dele.`);
  const entrada = conj.resultados.find((res) => res.caso === id);
  if (entrada && entrada.agenteSha256 !== agente) throw new ErroDaFonte(`${id} tem julgamentos de outro agente; rode \`npm run calibracao -- recalibrar --de-proposito\` e julgue de novo.`);
  const recebidos = entrada?.julgamentos.length ?? 0;
  if (recebidos >= caso.julgamentos) throw new ErroDaFonte(`${id} já tem ${recebidos} de ${caso.julgamentos} julgamentos; não há mais o que registrar.`);
  const julgamento = { nota: veredito.nota, defeitos: veredito.defeitos, pedidoSha256: caso.pedido.sha256, imagemSha256: hashDasImagens(caso), modelo: modelo.trim(), data: agora().toISOString() };
  if (entrada) entrada.julgamentos.push(julgamento);
  else conj.resultados.push({ caso: id, agenteSha256: agente, julgamentos: [julgamento] });
  if (conj.critico.modelo.medido === null) conj.critico.modelo.medido = julgamento.modelo;
  gravarConjunto(conj, raiz);
  saida.log(`${id} ${caso.nome}: julgamento ${recebidos + 1} de ${caso.julgamentos} registrado, nota ${veredito.nota}, ${veredito.defeitos.length} defeito(s), modelo ${julgamento.modelo}.`);
  if (julgamento.modelo !== conj.critico.modelo.medido) saida.log(`aviso: este julgamento veio do modelo '${julgamento.modelo}' e o conjunto foi medido com '${conj.critico.modelo.medido}'; a pontuação mistura os dois.`);
  return 0;
}

const numero = (n) => String(n).replace('.', ',');

/** `resumo`: a pontuação por caso (notas, mediana, amplitude, critérios) e a do conjunto. Sai com 1 só quando estão todos os julgamentos e o conjunto não acerta. */
export function resumo({ raiz = RAIZ } = {}, saida = console) {
  const conj = lerConjuntoDoDisco({ raiz });
  const p = pontuar(conj);
  for (const k of p.casos) {
    const cabeca = `${k.id} ${k.nome} (${k.classe}, nota ${k.faixa[0]} a ${k.faixa[1]}): ${k.recebidos} de ${k.esperados} julgamentos`;
    if (k.recebidos === 0) { saida.log(`${cabeca}; faltam ${k.faltam}`); continue; }
    const veredito = k.acerta === null ? `faltam ${k.faltam}` : k.acerta ? 'acerta' : 'erra';
    saida.log(`${cabeca}; notas ${k.notas.join(' ')}, mediana ${numero(k.mediana)}, amplitude ${numero(k.amplitude)}; ${veredito}`);
    for (const c of k.criterios.citacoes) saida.log(`    defeito de '${c.parte}' (${c.tipo}): citado em ${c.n} de ${k.recebidos} (mínimo ${c.minimo} de ${k.esperados}) ${c.ok ? 'ok' : 'abaixo'}`);
    if (k.criterios.estruturais) saida.log(`    defeito estrutural citado em ${k.criterios.estruturais.n} de ${k.recebidos} (máximo ${k.criterios.estruturais.maximo}) ${k.criterios.estruturais.ok ? 'ok' : 'acima'}`);
    for (const m of k.motivos) saida.log(`    erra: ${m}`);
  }
  for (const caso of conj.casos.filter((k) => k.destino === 'medida')) saida.log(`${caso.id} ${caso.nome} (${caso.grupo}): fora do julgamento, a medição da rodada o reprova`);
  saida.log(linhaDoEstado(p));
  for (const aviso of avisosDoModelo(conj, { raiz })) saida.log(`aviso: ${aviso}`);
  if (p.estado === 'passa') saida.log('o conjunto passa.');
  if (p.estado === 'reprova') saida.log(`o conjunto reprova${p.obrigatoriasErradas.length ? `; obrigatório errado: ${p.obrigatoriasErradas.join(', ')}` : ''}.`);
  return p.estado === 'reprova' ? 1 : 0;
}

/**
 * `recalibrar --de-proposito`: apaga os julgamentos e grava a impressão e o modelo do agente de agora, para o crítico ser medido de novo.
 * Não despacha ninguém: escreve a lista dos despachos que quem conduz faz. Sem `--de-proposito` recusa, e diz quantos julgamentos sairiam.
 */
export function recalibrar({ deProposito = false, raiz = RAIZ } = {}, saida = console) {
  const conj = copia(lerConjuntoDoDisco({ raiz }));
  const gravados = conj.resultados.reduce((s, res) => s + res.julgamentos.length, 0);
  const aFazer = conj.casos.filter((k) => k.destino === 'critico').reduce((s, k) => s + k.julgamentos, 0);
  if (!deProposito) {
    throw new ErroDeUso(`recalibrar apaga ${gravados} julgamento(s) gravado(s) e pede ${aFazer} despachos novos do crítico; recebido sem --de-proposito, esperado \`npm run calibracao -- recalibrar --de-proposito\` por quem decidiu medir de novo.`);
  }
  conj.resultados = [];
  conj.critico.agente.sha256 = hashDoAgente(conj.critico.agente.arquivo, raiz);
  conj.critico.modelo = { declarado: modeloDoAgente(conj.critico.agente.arquivo, raiz) ?? 'não declarado', medido: null };
  gravarConjunto(conj, raiz);
  saida.log(`recalibrar: ${gravados} julgamento(s) apagado(s); agente ${curto(conj.critico.agente.sha256)}, modelo declarado '${conj.critico.modelo.declarado}'. Os ${aFazer} despachos a fazer:`);
  return despachos({ raiz }, saida);
}

/** O que o caso é, em uma frase: de onde veio, o que foi trocado e a palavra da pessoa. */
export function descreverFonte(fonte) {
  const doDefeito = fonte.trocas.filter((t) => t.defeito === true);
  const partes = [`${fonte.peca}, cópia em ${fonte.copia.arquivo}`];
  partes.push(doDefeito.length ? `${doDefeito.length} troca(s) de defeito: ${doDefeito.map((t) => t.porque).join('; ')}` : 'sem troca de forma');
  if (fonte.aceite) partes.push(`aceite: ${fonte.aceite.por}`);
  if (fonte.reprovacao) partes.push(`reprovado na rodada ${fonte.reprovacao.rodada}: "${fonte.reprovacao.frase}"`);
  if (fonte.semFrase) partes.push(`sem frase da pessoa: ${fonte.semFrase}`);
  return partes.join(' | ');
}

export function listar(opcoes = {}, saida = console) {
  const conj = lerConjuntoDoDisco({ raiz: opcoes.raiz ?? RAIZ, exigirPreparados: false });
  for (const caso of conj.casos) {
    const destino = caso.destino === 'critico' ? 'chega ao crítico' : caso.destino === 'medida' ? 'a medição da rodada reprova' : 'ainda sem medição';
    saida.log(`${caso.id} ${caso.nome} — ${caso.grupo}, nota ${caso.faixaDaNota[0]} a ${caso.faixaDaNota[1]}, ${caso.julgamentos} julgamentos${caso.obrigatorio ? ', obrigatório' : ''}; ${destino}${caso.imagens ? `, ${caso.imagens.length} imagens` : ''}`);
    saida.log(`    fonte: ${descreverFonte(caso.fonte)}`);
    for (const d of caso.defeitos) saida.log(`    defeito ${d.parte}: ${d.tipo} ${d.sentido}, ${d.onde}`);
  }
  const p = pontuar(conj);
  saida.log(linhaDoEstado(p));
  return 0;
}

/* o tamanho em disco do que o conjunto guarda para o crítico: os pedidos e as imagens */
export function tamanhoDoConjunto({ raiz = RAIZ } = {}) {
  const pasta = resolve(raiz, PASTA_DO_CONJUNTO, PASTA_DOS_CASOS);
  const andar = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? andar(join(dir, e.name)) : [join(dir, e.name)])) : []);
  const arquivos = andar(pasta);
  return { arquivos: arquivos.length, bytes: arquivos.reduce((s, a) => s + readFileSync(a).length, 0), pasta: relative(raiz, pasta) };
}

/* ---------- a linha de comando ---------- */

/* as opções que levam valor aceitam `--arquivo x` e `--arquivo=x` */
const OPCOES_COM_VALOR = ['arquivo', 'modelo'];
const OPCOES = [...OPCOES_COM_VALOR, 'de-proposito', 'ajuda'];

function lerArgumentos(argv) {
  const posicionais = [];
  const opcoes = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { posicionais.push(arg); continue; }
    const [nome, ...resto] = arg.slice(2).split('=');
    if (!OPCOES.includes(nome)) throw new ErroDeUso(`recebida a opção --${nome}, que não existe; esperada uma de ${OPCOES.map((o) => `--${o}`).join(', ')}.`);
    if (resto.length) opcoes[nome] = resto.join('=');
    else if (OPCOES_COM_VALOR.includes(nome) && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) { opcoes[nome] = argv[i + 1]; i += 1; } else opcoes[nome] = true;
  }
  return { comando: posicionais[0] ?? null, argumentos: posicionais.slice(1), opcoes };
}

const valor = (v) => (v === true ? undefined : v);

export async function principal(argv, saida = console, { raiz = RAIZ } = {}) {
  try {
    const { comando, argumentos, opcoes } = lerArgumentos(argv);
    if (opcoes.ajuda || comando === 'ajuda') { saida.log(USO); return 0; }
    if (comando === 'conferir') return conferir({ raiz }, saida);
    if (comando === 'listar') return listar({ raiz }, saida);
    if (comando === 'copiar') return copiar({ id: argumentos[0], raiz }, saida);
    if (comando === 'medir') return await medir({ id: argumentos[0], raiz }, saida);
    if (comando === 'pacote') return pacote({ id: argumentos[0], raiz }, saida);
    if (comando === 'pedido') return pedido({ id: argumentos[0], raiz }, saida);
    if (comando === 'despachos') return despachos({ raiz }, saida);
    if (comando === 'registrar') return registrar({ id: argumentos[0], arquivo: valor(opcoes.arquivo), modelo: valor(opcoes.modelo), raiz }, saida);
    if (comando === 'resumo') return resumo({ raiz }, saida);
    if (comando === 'recalibrar') return recalibrar({ deProposito: opcoes['de-proposito'] === true, raiz }, saida);
    if (comando === 'tamanho') { const t = tamanhoDoConjunto({ raiz }); saida.log(`${t.pasta}: ${t.arquivos} arquivos, ${t.bytes} bytes (${(t.bytes / 1048576).toFixed(2).replace('.', ',')} MB)`); return 0; }
    throw new ErroDeUso(comando ? `recebido o comando '${comando}', que não existe.` : 'falta o comando.');
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await principal(process.argv.slice(2));
}
