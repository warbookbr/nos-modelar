#!/usr/bin/env node
/* rodada-de-modelagem.mjs — registra uma rodada do laço e diz o que vem agora.
 *
 * Quem orquestra o laço é uma sessão, porque despachar agente não é coisa que
 * script faça. O que NÃO pode morar na sessão é a decisão de parar: memória de
 * quem conduz é exatamente onde "acho que está bom" se instala. Então a sessão
 * chama este comando a cada rodada, ele grava o que aconteceu e devolve a ação
 * seguinte já decidida pelos números.
 *
 * O registro é versionado de propósito. A pergunta "por que esta peça ficou
 * assim" precisa ter resposta depois que todo mundo esqueceu, e veredito que
 * vive só no diálogo some com a janela de contexto.
 *
 * A MEDIÇÃO É DA FERRAMENTA, NÃO DE QUEM CONDUZ. A instrução de medir antes do crítico estava na skill do laço, e
 * `medidas.passou` era o que a sessão escrevia no JSON da rodada: dava para registrar um veredito sobre receita reprovada, e
 * `--acao` lia a medida de uma rodada que podia ser de outra versão da receita. Agora `--acao` mede a receita atual (o veredito de
 * `descrever`, `guarda:acervo` e `guarda:referencial` sobre a peça, e `conferir-pontos` quando ela declara `PONTOS`), identifica-a
 * pelo hash do texto e devolve `modelar` enquanto a medição não passar; `--registrar` mede de novo, grava a medição da ferramenta
 * e recusa o veredito do crítico quando ela reprovou, ou quando a sessão declarou `medidas` que a ferramenta não confirma.
 *
 * A RODADA SE REGISTRA LENDO O QUE OS AGENTES DEVOLVERAM. Montar à mão o JSON de `partes`, `veredito`, `atrito` e `notaDePassagem`
 * custou frase de atrito acima do limite, risco de editar o veredito sem querer e a conferência por parte reescrita de prosa para
 * JSON. Na forma `--modelador <arquivo> --critico <arquivo>` o comando pega o último bloco ```json do último texto do assistente em
 * cada arquivo (texto puro, ou a transcrição JSONL que o harness grava para um agente em segundo plano): o do crítico entra como
 * `veredito`, sem mudar nada, e o do modelador traz `partes`, `atrito` e `notaDePassagem`. As validações são as de sempre. O relato de
 * um modelador que entregou várias peças num texto só não se reparte mais à mão: o bloco da peça é o precedido de uma linha com o nome
 * dela (`blocoDaPeca`), e o `confere` em texto e o `atrito` em frase única entram no formato sem perder o dado.
 *
 * A RODADA GRAVADA TRAZ A DATA (`registradaEm`, ISO em UTC), e `--acao` acusa, na seção "contradições e repetições", o defeito da última
 * rodada com o sentido oposto ao de uma anterior no mesmo lugar, ou repetido depois de atribuído ao plano, à ferramenta ou ao crítico
 * (`contradicoesEntreRodadas`, que o pedido do crítico também usa).
 *
 * A PEÇA DE LATARIA NÃO FECHA SEM A LUZ RASANTE E A CURVATURA DA LATARIA. Por decisão da pessoa em 2026-10-30, o pacote do crítico
 * da peça de chapa de superfície livre (`src/autoria/lataria.js`) leva as duas vistas, que mostram o amassado largo e raso que as
 * medidas e a vista comum não mostram. `--registrar` recusa o veredito do crítico de peça de lataria quando o `pacote.json` da pasta da
 * rodada (a de `vistas:critica`, ou a de `--pacote <pasta>`) não traz as duas vistas da versão medida, com o comando que as gera, e a
 * rodada gravada guarda as imagens em `superficie`; `--acao` não dá por fechada a peça de lataria cuja última rodada não as tem.
 *
 * Uso:
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar --modelador modelador.txt --critico critico.jsonl [--atrito "texto"] [--pacote <pasta>]...
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar rodada.json
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --acao
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --perguntas
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --pedidos [<arquivo.json>] [--json]   os pedidos de alteração da pessoa, contados por etapa
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIMITE_DE_RODADAS, acaoDaReceita, defeitosAbertos, proximaAcao, registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { diferencaDeTexto } from '../../src/autoria/diferenca-de-texto.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { conferirAcervo } from './guardas/guarda-acervo.mjs';
import { conferirUmaPeca } from './guardas/guarda-referencial.mjs';
import { conferirPontos, formatarPontos } from './conferir-pontos.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { afastamentoDaParte, normalizarEsbocoDoRefinamento } from '../../src/autoria/refinamento-global.js';
import { avisoDaDispensa } from '../../src/autoria/lataria.js';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { comandoDoPacote, pastaDaRodada, superficieDaPeca, superficieDoPacote } from './vistas-de-superficie.mjs';
import { palavras } from './leitura-por-regioes.mjs';
import { lascasDaReceita } from './lasca.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/* Onde as rodadas moravam antes da pasta da peça, e onde continuam morando
   enquanto existir peça em arquivo solto. Registro de peça migrada não é movido:
   ele é evidência do que aconteceu, e evidência não muda de lugar para caber
   numa arrumação nova. */
export const PASTA_RODADAS = join(REPO, 'docs/modelar/historico/rodadas');

/* Uma barra só, para a parte de um objeto (`braco-robotico/base`); `..` e
   segunda barra continuam recusados. */
const NOME_DE_PECA = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/;

/* A rodada grava DENTRO da pasta da peça, ao lado da receita que ela julgou.
   Enquanto ficava em `docs/`, responder "por que esta peça está assim" exigia
   saber de cor um caminho em outra árvore — e quem abre a peça não descobre
   que o registro existe. Peça em arquivo solto não tem pasta, e aí a rodada cai
   no lugar antigo. */
function exigirNome(peca) {
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
  return join(raiz, 'docs/modelar/historico/rodadas', peca);
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

/* O texto da receita julgado nesta rodada. Por padrão é lido do disco; o teste
   passa o texto direto. Peça sem receita resolvível grava a rodada sem
   diferença, como antes. */
function textoDaReceita(peca, { raiz = REPO } = {}) {
  try { return readFileSync(resolverCaminhoReceita(peca, { raiz }), 'utf8'); } catch { return null; }
}

/* A cópia fica em rodadas/, um nível abaixo da receita, e um import relativo
   copiado sem ajuste deixa de achar o arquivo e quebra o build. A cópia do
   ombro na rodada 7 quebrou assim. */
export const ajustarImportsDaCopia = (texto) => texto.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.\.?\/)/g, '$1$2../$3');
const copiaDaReceita = (pasta, numero) => join(pasta, `receita-${String(numero).padStart(2, '0')}.js`);

export function gravarRodada(
  peca,
  { veredito = null, medidas, partes, atrito = [], notaDePassagem, superficie, facesFinas },
  { pasta = pastaDeRodadas(peca), receitaTexto = textoDaReceita(peca), agora = () => new Date().toISOString() } = {},
) {
  exigirNome(peca);
  const anteriores = lerRodadas(peca, { pasta });
  const numero = anteriores.length + 1;
  /* A diferença é contra a cópia que a rodada anterior guardou, e não contra
     o git: o que importa é o que o crítico julgou em cada rodada, commitado ou
     não. */
  let receita;
  if (receitaTexto !== null) {
    const anterior = numero > 1 && existsSync(copiaDaReceita(pasta, numero - 1))
      ? readFileSync(copiaDaReceita(pasta, numero - 1), 'utf8') : null;
    receita = {
      sha256: `sha256:${createHash('sha256').update(receitaTexto).digest('hex')}`,
      diferenca: diferencaDeTexto(anterior, ajustarImportsDaCopia(receitaTexto)),
    };
  }
  /* A DATA DO REGISTRO, em ISO e UTC. A linha de base do custo por peça (2026-11-10) não tinha como dizer quanto tempo uma peça levou,
     porque nenhuma rodada guardava quando foi gravada. A data é metadado do registro, e não entra em nada que a forma da peça leia. */
  const rodada = {
    ...registrarRodada({ peca, numero, veredito, medidas, partes, atrito, notaDePassagem, receita, superficie }),
    registradaEm: agora(),
    /* a contagem de faces finas da malha medida (`facesFinasDaMalha`): a próxima medição da peça compara com ela */
    ...(facesFinas ? { facesFinas } : {}),
  };
  mkdirSync(pasta, { recursive: true });
  const arquivo = join(pasta, `rodada-${String(rodada.numero).padStart(2, '0')}.json`);
  /* Rodada gravada não é reescrita. O registro é evidência do que aconteceu, e
     evidência que muda depois não serve para responder por que a peça ficou
     assim. */
  if (existsSync(arquivo)) throw new Error(`a rodada ${rodada.numero} de '${peca}' já foi gravada.`);
  writeFileSync(arquivo, `${JSON.stringify(rodada, null, 2)}\n`, 'utf8');
  if (receitaTexto !== null) writeFileSync(copiaDaReceita(pasta, numero), ajustarImportsDaCopia(receitaTexto), 'utf8');
  return { rodada, arquivo };
}

/* EXTENSÃO DO LIMITE, SÓ POR ESCRITO. O laço para no limite de rodadas e
   quem conduz não estende sozinho. Quando a pessoa decide dar mais rodadas a
   uma peça, a decisão mora num arquivo ao lado das rodadas, com quem decidiu
   e por quê: `rodadas/limite.json`, `{ "limite": 7, "por": "...", "motivo":
   "..." }`. Sem o arquivo vale o limite de sempre. */
export function limiteDaPeca(peca, { pasta = pastaDeRodadas(peca) } = {}) {
  const arquivo = join(pasta, 'limite.json');
  if (!existsSync(arquivo)) return LIMITE_DE_RODADAS;
  const dado = JSON.parse(readFileSync(arquivo, 'utf8'));
  const limite = dado?.limite;
  if (!Number.isInteger(limite) || limite <= LIMITE_DE_RODADAS) {
    throw new Error(`${arquivo}: 'limite' precisa ser inteiro maior que ${LIMITE_DE_RODADAS}.`);
  }
  for (const campo of ['por', 'motivo']) {
    if (typeof dado[campo] !== 'string' || dado[campo].trim().length < 3) {
      throw new Error(`${arquivo}: '${campo}' precisa dizer quem decidiu e por quê.`);
    }
  }
  return limite;
}

const LIMITE_DO_RELATORIO = 2000;
const cortar = (texto) => (texto.length > LIMITE_DO_RELATORIO ? `${texto.slice(0, LIMITE_DO_RELATORIO - 1)}…` : texto);
const indentar = (texto) => texto.trim().split('\n').map((l) => `  ${l}`).join('\n');

/* A obrigação da luz rasante na medição: a da peça de emenda sombreada ou de lataria. Uma medição sem `luzRasante` (a de antes desta
   regra, ou a injetada) vale pela lataria. */
const luzDaMedicao = (medicao) => (medicao.luzRasante?.luzRasante ? medicao.luzRasante
  : medicao.luzRasante === undefined && medicao.lataria?.lataria ? { luzRasante: true, porque: medicao.lataria.porque } : null);

/**
 * A medição da receita atual da peça, feita pela ferramenta: o veredito de `descrever` (partes, refinamento, contatos, formas e a
 * forma contra a referência), a guarda do acervo e a do referencial sobre a peça, e os `PONTOS` quando ela os declara. Devolve
 * `{ passou, relatorio, sha256, texto, lataria, avisos }`: `sha256` é a impressão do texto da receita que foi medida (a mesma que a rodada
 * grava), `texto` é esse texto, para a rodada gravar o que foi medido e não o que está no disco depois, `lataria` diz se a peça é de
 * lataria (`superficieDaReceita`), `luzRasante` se a peça leva a luz rasante ao pacote (lataria ou emenda sombreada) e `avisos` o que o resumo do laço mostra sem reprovar (a dispensa de `PLANO.lataria`, com o motivo).
 * Peça sem receita resolvível lança.
 */
export async function medirReceita(peca, { rodadas, pasta } = {}) {
  const caminho = resolverCaminhoReceita(peca);
  const texto = readFileSync(caminho, 'utf8');
  const sha256 = `sha256:${createHash('sha256').update(texto).digest('hex')}`;
  const falhas = [];
  const feitas = ['descrever (veredito)', 'guarda:acervo', 'guarda:referencial'];
  const acervo = await conferirAcervo([peca]);
  for (const r of acervo.reprovadas) falhas.push(`guarda:acervo reprovou '${r.peca}':\n${indentar(r.motivo)}`);
  for (const e of acervo.esperando) falhas.push(`'${e.peca}' está planejada sem geometria (espera a etapa '${e.instancia}' de ${e.montagem}): não há o que medir`);
  const referencial = await conferirUmaPeca(peca);
  if (referencial) falhas.push(`guarda:referencial reprovou '${peca}':\n${indentar(referencial.motivo)}`);
  const receita = receitaDoModulo(await importarReceita(caminho));
  if (Array.isArray(receita?.PONTOS) && receita.PONTOS.length > 0) {
    feitas.push('conferir-pontos');
    const pontos = conferirPontos(receita, { quem: peca });
    if (!pontos.ok) falhas.push(indentar(formatarPontos(pontos)));
  }
  /* o PLANO inválido já reprova no `descrever`; aqui ele só não declara a lataria, que então sai dos PASSOS */
  let plano = null;
  try { plano = normalizarPlanoDeModelagem(receita?.PLANO); } catch { plano = null; }
  const avisos = [avisoDaDispensa(plano)].filter(Boolean);
  const facesFinas = facesFinasDaMalha(receita);
  if (facesFinas && facesFinas.total > 0) {
    const anteriores = rodadas ?? lerRodadasSeHouver(peca);
    const base = await baseDeFacesFinas(anteriores, pasta ?? pastaSeHouver(peca));
    const veredito = vereditoDasFacesFinas(facesFinas, { base, anteriores, lataria: plano?.lataria?.partes?.length > 0, peca });
    avisos.push(veredito.aviso);
    if (veredito.reprova) falhas.push(veredito.reprova);
  }
  const passou = falhas.length === 0;
  const { lataria, luzRasante, porque } = superficieDaPeca(peca, receita, plano);
  return { passou, sha256, texto, caminho, relatorio: cortar(passou ? `${feitas.join(', ')}: ok` : falhas.join('\n')), lataria: { lataria, porque }, luzRasante: { luzRasante, porque }, avisos, ...(facesFinas ? { facesFinas } : {}) };
}

/* ---- as faces finas da malha ---- */

/**
 * As faces finas da malha que a receita produz, contadas por parte com a mesma régua de `lasca.mjs` (a topologia do núcleo: área /
 * maior aresta² abaixo de `LIMITE_DE_FACE_FINA`): `{ total, porParte: { parte: n } }`. Receita que não executa sozinha devolve null.
 */
export function facesFinasDaMalha(receita) {
  let lascas;
  try { ({ lascas } = lascasDaReceita(receita)); } catch { return null; }
  const porParte = {};
  for (const l of lascas) porParte[l.parte ?? '(sem parte)'] = (porParte[l.parte ?? '(sem parte)'] ?? 0) + 1;
  return { total: lascas.length, porParte };
}

const pastaSeHouver = (peca) => { try { return pastaDeRodadas(peca); } catch { return null; } };
const lerRodadasSeHouver = (peca) => { try { return lerRodadas(peca); } catch { return []; } };

/* A contagem da última rodada da peça: a que ela gravou, ou, nas rodadas de antes da contagem, a da cópia da receita que ela guardou. */
async function baseDeFacesFinas(rodadas, pasta) {
  const ultima = rodadas[rodadas.length - 1];
  if (!ultima) return null;
  if (ultima.facesFinas && Number.isInteger(ultima.facesFinas.total)) return ultima.facesFinas.total;
  if (!pasta) return null;
  const copia = copiaDaReceita(pasta, ultima.numero);
  if (!existsSync(copia)) return null;
  try { return facesFinasDaMalha(receitaDoModulo(await importarReceita(copia)))?.total ?? null; } catch { return null; }
}

/**
 * O aviso das faces finas e, quando cabe, a reprovação. A peça antiga do acervo tem face fina aceita (a carcaça da empilhadeira, a torre),
 * então a contagem sozinha não reprova: reprova a que cresce em relação à última rodada da peça (`base`), e a de peça sem rodada que
 * declara chapa de lataria, que não tem face fina a aceitar.
 */
function vereditoDasFacesFinas({ total, porParte }, { base, anteriores, lataria, peca }) {
  const onde = Object.entries(porParte).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([p, n]) => `${p}: ${n}`).join(', ');
  const lista = `liste-as com \`npm run -s malha:lascas -- ${peca}\``;
  const aviso = `${total} face(s) fina(s) na malha (${onde}); ${lista}.`;
  if (base !== null && total > base) {
    return { aviso, reprova: `faces finas cresceram: ${total} agora contra ${base} na última rodada (${onde}); ${lista} e tire as que a mudança criou.` };
  }
  if (anteriores.length === 0 && lataria) {
    return { aviso, reprova: `peça nova de chapa de lataria com ${total} face(s) fina(s) (${onde}): lataria nova não tem face fina a aceitar; ${lista} e tire-as.` };
  }
  return { aviso };
}

/* O que do PLANO entra no pedido do crítico: o objeto, a escala, as referências, a forma de cada parte, os critérios e a família que escolhe
   critérios e perguntas. `lataria` e `dobrasAceitas` são do texto e das réguas, e trocá-los não muda o que o crítico lê. O PLANO inválido
   entra inteiro, como era. */
export function planoQueOCriticoLe(plano) {
  let normal;
  try { normal = normalizarPlanoDeModelagem(plano); } catch { return plano ?? null; }
  if (normal === null) return null;
  const { lataria: _lataria, dobrasAceitas: _dobras, ...lido } = normal;
  void _lataria; void _dobras;
  return lido;
}

/**
 * A impressão do que o crítico julga numa receita: a malha que ela produz (os vértices e as faces com tudo o que levam: parte, liso,
 * cor, material e tinta) e o `PLANO`,
 * que diz ao crítico a forma prometida de cada parte. Duas receitas com a mesma impressão mostram ao crítico a mesma coisa, ainda que
 * o texto mude, como quando a receita ganha o `REFINA` depois de fechar. Receita que não executa sozinha (a que pede o registro de
 * composições de fora) devolve null, e quem compara trata como forma diferente.
 */
export async function impressaoDaForma(caminho) {
  let receita;
  let neutro;
  try {
    receita = receitaDoModulo(await importarReceita(caminho));
    const execucao = executarReceita(receita);
    neutro = execucao.neutro ?? execucao;
  } catch {
    return null;
  }
  const hash = createHash('sha256');
  for (const [id, v] of neutro.V) hash.update(`v${id}:${v.join(',')};`);
  /* a face inteira, e não só os vértices: o liso, a cor, o material e a tinta mudam o que a imagem mostra */
  for (const [id, f] of neutro.F) hash.update(`f${id}:${JSON.stringify(f)};`);
  hash.update(`plano:${JSON.stringify(planoQueOCriticoLe(receita.PLANO))}`);
  /* os afastamentos que o REFINA declara entram no pedido do crítico: a mesma malha com afastamento novo volta a ele, porque o crítico do
     trem do nariz mediu como defeito a descida decidida que o pedido ainda não dizia */
  const afastamentos = (receita.REFINA?.esboco ? normalizarEsbocoDoRefinamento(receita.REFINA.esboco).formas : [])
    .map(({ parte, ...resto }) => ({ parte, ...afastamentoDaParte(resto) }))
    .filter((a) => a.motivo !== undefined);
  if (afastamentos.length) hash.update(`afastamentos:${JSON.stringify(afastamentos)}`);
  if (receita.REFINA?.novas) hash.update(`novas:${JSON.stringify(receita.REFINA.novas)}`);
  return `sha256:${hash.digest('hex')}`;
}

const curto = (sha256) => sha256.replace(/^sha256:/, '').slice(0, 8);

/** As linhas de aviso da medição no resumo do laço (a dispensa de `PLANO.lataria`, com o motivo), uma por aviso. */
export const linhasDeAviso = (medicao) => (medicao?.avisos ?? []).map((a) => `aviso: ${a}\n`).join('');

/**
 * A ação seguinte do laço da peça, dada a receita que existe agora. `medir` devolve a medição (`medirReceita` por padrão); peça cuja
 * receita ainda não existe não tem o que medir e segue a decisão das rodadas, que começa em `modelar`.
 */
export async function acaoDaPeca(peca, {
  rodadas = lerRodadas(peca), limite = limiteDaPeca(peca), medir = () => medirReceita(peca), pasta = pastaDeRodadas(peca),
} = {}) {
  let medicao = null;
  try { medicao = await medir(); } catch (erro) {
    if (!/^Receita .* não encontrada|Informe o nome/.test(erro.message)) throw erro;
  }
  if (medicao === null) return { ...proximaAcao(rodadas, { limite }), medicao: null };
  /* O texto mudou depois da última rodada: a cópia que ela guardou diz se o crítico julgaria outra coisa. */
  const ultima = rodadas[rodadas.length - 1];
  let mesmaFormaDaRodada;
  if (medicao.passou && medicao.caminho && ultima?.receita?.sha256 && ultima.receita.sha256 !== medicao.sha256
    && existsSync(copiaDaReceita(pasta, ultima.numero))) {
    const [atual, julgada] = await Promise.all([impressaoDaForma(medicao.caminho), impressaoDaForma(copiaDaReceita(pasta, ultima.numero))]);
    if (atual !== null && atual === julgada) mesmaFormaDaRodada = ultima.numero;
  }
  let decisao = acaoDaReceita(rodadas, { sha256: medicao.sha256, medicao, mesmaFormaDaRodada }, { limite });
  /* o julgamento da rodada vale: do texto só mudou o que a malha e o pedido do crítico (objeto, partes, critérios, referências) não leem */
  if (mesmaFormaDaRodada && decisao.motivo.includes('mas produz a mesma malha')) {
    decisao = { ...decisao, motivo: `${decisao.motivo} Só o texto mudou, e nada do que o crítico lê; o julgamento da rodada ${mesmaFormaDaRodada} vale.` };
  }
  /* a peça de lataria só fecha com a luz rasante e a curvatura da lataria no pacote que o crítico julgou, e a de emenda sombreada com a luz rasante */
  if (decisao.acao === 'parar-fechou' && luzDaMedicao(medicao) && !ultima?.superficie) {
    const lataria = Boolean(medicao.lataria?.lataria);
    return {
      acao: 'revisar',
      motivo: `a rodada ${ultima.numero} fechou sem ${lataria ? 'a luz rasante e a curvatura da lataria' : 'a luz rasante'} no pacote do crítico, e a peça `
        + `${lataria ? 'é de lataria' : 'tem emenda sombreada'} (${luzDaMedicao(medicao).porque}): gere o pacote com \`${comandoDoPacote(peca)}\` e despache o crítico de novo.`,
      medicao,
    };
  }
  return { ...decisao, medicao };
}

const RAIZ_DO_REPOSITORIO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PASTAS_FORA_DO_REPOSITORIO = ['tools/bancadas/out/', 'tmp/', '.claude/worktrees/'];

/* O ALVO DO VEREDITO FICA NO REPOSITÓRIO. Em 2026-11-03 um crítico escreveu como alvo o caminho absoluto do pedido em
   `tools/bancadas/out/`, e outro o da prancha dentro da pasta de trabalho de um agente; os dois entraram na rodada gravada, e a
   conferência de referências do CI, que roda sem essas pastas, reprovou. O alvo que é caminho absoluto vira caminho relativo à raiz
   (o de uma pasta de trabalho de agente, ao arquivo de mesmo nome no repositório), e o que cai fora do repositório ou não existe é
   recusado; o texto que não é caminho, como "sem alvo: ...", passa como está. A imagem que existe fora do repositório é a
   referência externa de `vistas:critica --referencia` e fica só com o nome. */
export function alvoDoRepositorio(alvo, raiz = RAIZ_DO_REPOSITORIO) {
  if (typeof alvo !== 'string' || !alvo.startsWith('/')) return alvo;
  let relativo = alvo.startsWith(raiz + sep) ? alvo.slice(raiz.length + 1) : null;
  /* a referência externa (`vistas:critica --referencia`), que a regra do repositório manda ficar fora dele, entra só pelo nome:
     o caminho de fora não é gravado, e a rodada diz que o alvo existiu e qual foi */
  if (!relativo && /\.(png|jpe?g|webp)$/i.test(alvo) && existsSync(alvo)) return `referência externa, fora do repositório: ${basename(alvo)}`;
  if (relativo?.startsWith('.claude/worktrees/')) relativo = relativo.split('/').slice(3).join('/');
  if (!relativo || PASTAS_FORA_DO_REPOSITORIO.some((p) => relativo.startsWith(p)) || !existsSync(join(raiz, relativo))) {
    throw new Error(`o alvo do veredito (${alvo}) não é um arquivo do repositório; a rodada gravada não pode citar caminho que o CI não tem. `
      + 'Peça ao crítico o alvo de verdade (a imagem de referência que ele comparou) ou "sem alvo: <motivo>".');
  }
  return relativo;
}

/**
 * Grava a rodada com a medição da ferramenta no lugar da que a sessão escreveria, e recusa o que não se sustenta nela:
 * o veredito do crítico quando a medição da receita atual reprovou, e `medidas` declaradas que contradizem a medição. A receita
 * gravada na rodada é a que foi medida.
 */
export async function registrarMedida(peca, entrada, { medir = () => medirReceita(peca), pacote = null, ...opcoes } = {}) {
  let medicao;
  try { medicao = await medir(); } catch (erro) {
    throw new Error(`não consegui medir a receita de '${peca}' (${erro.message}): sem medição a rodada não se registra, e o veredito do crítico muito menos.`);
  }
  if (entrada.veredito) entrada = { ...entrada, veredito: { ...entrada.veredito, alvo: alvoDoRepositorio(entrada.veredito.alvo) } };
  const declaradas = entrada.medidas;
  if (declaradas && typeof declaradas.passou === 'boolean' && declaradas.passou !== medicao.passou) {
    throw new Error(`as medidas declaradas dizem ${declaradas.passou ? 'que passou' : 'que reprovou'} e a ferramenta mediu a receita atual (sha256:${curto(medicao.sha256)}) como ${medicao.passou ? 'aprovada' : 'reprovada'}`
      + `${medicao.passou ? '' : `: ${medicao.relatorio}`}. A medição é da ferramenta: tire \`medidas\` do JSON da rodada.`);
  }
  if (entrada.veredito && !medicao.passou) {
    throw new Error(`o veredito do crítico não se registra: a medição da receita atual (sha256:${curto(medicao.sha256)}) reprovou.\n${indentar(medicao.relatorio)}\n`
      + 'O crítico só julga receita que passa nas medidas. Grave a rodada sem veredito (a ferramenta guarda o relatório da falha) e volte ao modelador.');
  }
  /* a peça de lataria: o veredito só se registra se o pacote que o crítico julgou trouxe as duas vistas da versão medida */
  let superficie;
  if (entrada.veredito && luzDaMedicao(medicao)) {
    const pasta = pacote ?? pastaDaRodada(peca);
    const conferido = superficieDoPacote(peca, { pasta, sha256: medicao.sha256 });
    if (!conferido.ok) {
      const lataria = Boolean(medicao.lataria?.lataria);
      throw new Error(`o veredito do crítico não se registra: '${peca}' ${lataria ? 'é peça de lataria' : 'tem emenda sombreada'} (${luzDaMedicao(medicao).porque}), e ${conferido.motivo}. `
        + `O pacote do crítico de peça ${lataria ? 'de lataria leva a luz rasante e a curvatura da lataria' : 'com emenda sombreada leva a luz rasante'}: gere-o com \`${comandoDoPacote(peca)}\` `
        + '(com --saida, passe a mesma pasta em --pacote), despache o crítico com o pedido.md novo e registre o veredito dele.');
    }
    superficie = { lataria: luzDaMedicao(medicao).porque, imagens: conferido.imagens };
  }
  /* `medidas` e `superficie` são da ferramenta, e o que a entrada declara deles sai */
  const { medidas: _declaradas, superficie: _declarada, ...resto } = entrada;
  void _declaradas; void _declarada;
  const gravada = gravarRodada(peca, { ...resto, superficie, facesFinas: medicao.facesFinas, medidas: { passou: medicao.passou, relatorio: medicao.relatorio } }, { ...opcoes, receitaTexto: medicao.texto });
  return { ...gravada, medicao };
}

/* ---- a entrada da rodada lida dos arquivos que os agentes devolveram ---- */

const ENTRADA_DO_MODELADOR = ['partes', 'atrito', 'notaDePassagem'];
const SEM_PREFIXO = (mensagem) => String(mensagem).replace(/^laço de modelagem: /, '');

const linhasJson = (conteudo) => {
  const linhas = conteudo.split('\n').map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return null;
  const objetos = [];
  for (const linha of linhas) {
    let dado;
    try { dado = JSON.parse(linha); } catch { return null; }
    if (!dado || typeof dado !== 'object' || Array.isArray(dado)) return null;
    objetos.push(dado);
  }
  /* o que distingue a transcrição de um JSON qualquer é o `type` de cada mensagem do harness */
  return objetos.every((o) => typeof o.type === 'string') && objetos.some((o) => o.message || o.type === 'assistant') ? objetos : null;
};

const textosDaMensagem = (mensagem) => {
  const c = mensagem?.content;
  if (typeof c === 'string') return [c];
  if (!Array.isArray(c)) return [];
  /* o agente em segundo plano pode entregar a resposta pela ferramenta de devolução (`SubagentHandback`), sem bloco de texto:
     o relato dele está em `input.message` da chamada, e vale como o texto da resposta */
  return c.flatMap((bl) => {
    if (bl?.type === 'text' && typeof bl.text === 'string') return [bl.text];
    if (bl?.type === 'tool_use' && bl.name === 'SubagentHandback' && typeof bl.input?.message === 'string') return [bl.input.message];
    return [];
  });
};

/**
 * O último texto do assistente num arquivo, qualquer que seja o formato: a transcrição JSONL do harness (uma mensagem por linha, e
 * o harness grava cada bloco da resposta numa linha própria, com o mesmo `message.id`) ou texto puro, devolvido como está.
 * `formato` diz o que foi reconhecido. Lança, dizendo o arquivo, quando a transcrição não tem texto do assistente.
 */
export function textoFinalDoAssistente(conteudo, { arquivo = 'entrada' } = {}) {
  const mensagens = linhasJson(conteudo);
  if (mensagens === null) return { formato: 'texto', texto: conteudo };
  const doAssistente = mensagens.filter((o) => o.type === 'assistant' && (o.message?.role ?? 'assistant') === 'assistant');
  let ultimo = -1;
  doAssistente.forEach((o, i) => { if (textosDaMensagem(o.message).length > 0) ultimo = i; });
  if (ultimo < 0) throw new Error(`${arquivo}: a transcrição não tem nenhum texto do assistente; o agente terminou sem responder?`);
  const id = doAssistente[ultimo].message?.id;
  const linhas = id ? doAssistente.filter((o) => o.message?.id === id) : [doAssistente[ultimo]];
  return { formato: 'transcrição', texto: linhas.flatMap((o) => textosDaMensagem(o.message)).join('\n') };
}

/**
 * O último bloco cercado por ```json do texto, já lido. O erro diz o arquivo e o que faltou: o último bloco, e nenhum outro, é o que o
 * agente declarou como resposta, porque os anteriores são citações que ele fez no caminho.
 */
export function ultimoBlocoJson(texto, { arquivo = 'entrada', papel = 'agente' } = {}) {
  const cercas = [...texto.matchAll(/^[ \t]*```json[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm)];
  if (cercas.length === 0) {
    throw new Error(`${arquivo}: o último texto do ${papel} não tem bloco \`\`\`json. Ele precisa terminar a resposta com o bloco; peça-o de novo ao agente em vez de montar o JSON à mão.`);
  }
  try { return JSON.parse(cercas[cercas.length - 1][1]); } catch (erro) {
    throw new Error(`${arquivo}: o último bloco \`\`\`json do ${papel} não é JSON válido (${erro.message}).`);
  }
}

const CERCA_JSON = /^[ \t]*```json[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;

/* A linha que nomeia o bloco seguinte: só o nome, com crases, negrito, título ou marcador de lista em volta e dois-pontos no fim
   tolerados (`banco`, **roda-traseira**:, ## carcaca). O nome com objeto (`empilhadeira/banco`) vale pelo último segmento. */
const nomeDaLinha = (linha) => {
  const limpo = String(linha).trim().replace(/^(?:#+|[-*+]|\d+[.)])\s+/, '').replace(/[*_`]/g, '').replace(/:\s*$/, '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/.test(limpo) ? limpo.split('/').pop() : null;
};

/**
 * Os blocos ```json do texto, em ordem, cada um com o nome da linha não vazia logo antes dele (`null` quando essa linha não é só um
 * nome). `json` é o texto do bloco, ainda sem ler.
 */
export function blocosJson(texto) {
  return [...String(texto).matchAll(CERCA_JSON)].map((m) => {
    const antes = texto.slice(0, m.index).split('\n').map((l) => l.trim()).filter(Boolean);
    return { nome: antes.length ? nomeDaLinha(antes[antes.length - 1]) : null, json: m[1] };
  });
}

/**
 * O bloco do relato que é da peça. O modelador que entregou várias peças num texto só põe, antes do bloco de cada uma, uma linha com o
 * nome dela; quem conduz repartia esse texto à mão. Com um bloco só, ou com vários e nenhum nomeado, vale o último (`ultimoBlocoJson`);
 * com algum nomeado para a peça (o último segmento de `<objeto>/<peça>`), vale o último desses; com nomes e nenhum da peça, recusa
 * dizendo os nomes que achou.
 */
export function blocoDaPeca(texto, peca, { arquivo = 'entrada', papel = 'agente' } = {}) {
  const blocos = blocosJson(texto);
  const nome = peca ? String(peca).split('/').pop() : null;
  if (blocos.length <= 1 || !nome) return ultimoBlocoJson(texto, { arquivo, papel });
  const nomes = [...new Set(blocos.map((b) => b.nome).filter(Boolean))];
  if (nomes.length === 0) return ultimoBlocoJson(texto, { arquivo, papel });
  const daPeca = blocos.filter((b) => b.nome === nome);
  if (daPeca.length === 0) {
    throw new Error(`${arquivo}: o texto do ${papel} tem ${blocos.length} blocos \`\`\`json e nenhum nomeado '${nome}'; os nomes achados são `
      + `${nomes.map((n) => `'${n}'`).join(', ')}. Ponha antes do bloco desta peça uma linha só com o nome dela.`);
  }
  try { return JSON.parse(daPeca[daPeca.length - 1].json); } catch (erro) {
    throw new Error(`${arquivo}: o bloco \`\`\`json '${nome}' do ${papel} não é JSON válido (${erro.message}).`);
  }
}

const lerAgente = (arquivo, papel, peca = null) => {
  let conteudo;
  try { conteudo = readFileSync(arquivo, 'utf8'); } catch (erro) { throw new Error(`${arquivo}: não consegui ler o arquivo do ${papel} (${erro.code ?? erro.message}).`); }
  const { texto } = textoFinalDoAssistente(conteudo, { arquivo });
  return peca ? blocoDaPeca(texto, peca, { arquivo, papel }) : ultimoBlocoJson(texto, { arquivo, papel });
};

const NEGA = /^\s*(n[aã]o|false|no)\b/i;
const AFIRMA_SO = /^\s*(sim|true|yes|ok|confere)\s*[.!]?\s*$/i;

/**
 * O que os modeladores erraram no formato sem errar o dado, posto no formato: `partes[].confere` em texto vira booleano, com o texto
 * em `observacao` (o que começa por "não" vira `false`, o resto `true`; "sim" sozinho não vira observação), e `atrito` em texto único
 * vira lista de um item. O resto passa como veio, para a validação de sempre recusar.
 */
export function normalizarRelatoDoModelador(bloco) {
  if (!bloco || typeof bloco !== 'object' || Array.isArray(bloco)) return bloco;
  const saida = { ...bloco };
  if (typeof saida.atrito === 'string') saida.atrito = saida.atrito.trim() ? [saida.atrito] : [];
  if (Array.isArray(saida.partes)) {
    saida.partes = saida.partes.map((p) => {
      if (!p || typeof p !== 'object' || typeof p.confere !== 'string') return p;
      const texto = p.confere.trim();
      const observacao = [AFIRMA_SO.test(texto) ? '' : texto, String(p.observacao ?? '').trim()].filter(Boolean).join('; ');
      return { ...p, confere: !NEGA.test(texto), ...(observacao ? { observacao } : {}) };
    });
  }
  return saida;
}

/**
 * A entrada da rodada montada dos arquivos do modelador e do crítico, mais o atrito de quem conduz. O veredito é o bloco do crítico
 * como veio. As validações são as de `registrarRodada`, rodadas aqui antes de medir, e o erro diz de qual arquivo (ou de qual
 * `--atrito`) e de qual campo veio o problema. Sem `critico` a entrada não tem veredito, que é o caso da receita reprovada. Com `peca`, o
 * bloco do modelador é o nomeado para ela (`blocoDaPeca`), e o relato passa por `normalizarRelatoDoModelador`.
 */
export function entradaDosArquivos({ modelador, critico = null, atrito = [], peca = null }) {
  if (!modelador) throw new Error('falta --modelador <arquivo>: `partes` e `notaDePassagem` vêm do que o modelador devolveu.');
  const doModelador = normalizarRelatoDoModelador(lerAgente(modelador, 'modelador', peca));
  if (!doModelador || typeof doModelador !== 'object' || Array.isArray(doModelador)) {
    throw new Error(`${modelador}: o bloco \`\`\`json do modelador precisa ser um objeto com ${ENTRADA_DO_MODELADOR.map((c) => `'${c}'`).join(', ')}.`);
  }
  const alheios = Object.keys(doModelador).filter((c) => !ENTRADA_DO_MODELADOR.includes(c));
  if (alheios.length > 0) {
    throw new Error(`${modelador}: o bloco do modelador traz ${alheios.map((c) => `'${c}'`).join(', ')}, que não é dele. Só ${ENTRADA_DO_MODELADOR.join(', ')}; o veredito é do crítico e a medição é da ferramenta.`);
  }
  const atritoDoModelador = doModelador.atrito ?? [];
  if (!Array.isArray(atritoDoModelador)) throw new Error(`${modelador}, campo atrito: precisa ser lista de frases.`);
  const entrada = {
    partes: doModelador.partes,
    atrito: [...atritoDoModelador, ...atrito],
    ...(doModelador.notaDePassagem !== undefined ? { notaDePassagem: doModelador.notaDePassagem } : {}),
    ...(critico ? { veredito: lerAgente(critico, 'crítico') } : {}),
  };
  const origem = (mensagem) => {
    const item = /'atrito\[(\d+)\]'/.exec(mensagem);
    if (item) {
      const i = Number(item[1]);
      return i < atritoDoModelador.length ? `${modelador}, campo atrito[${i}]` : `--atrito nº ${i - atritoDoModelador.length + 1}`;
    }
    if (/'atrito'/.test(mensagem)) return `${modelador} e --atrito, campo atrito`;
    const campo = /'(partes|notaDePassagem)/.exec(mensagem)?.[1];
    if (campo) return `${modelador}, campo ${campo}`;
    return critico ? `${critico}, bloco do veredito` : null;
  };
  try {
    registrarRodada({ peca: 'conferencia', numero: 1, medidas: { passou: true, relatorio: '' }, ...entrada });
  } catch (erro) {
    const onde = origem(erro.message);
    throw new Error(onde ? `${onde}: ${SEM_PREFIXO(erro.message)}` : SEM_PREFIXO(erro.message));
  }
  return entrada;
}

const OPCOES_COM_VALOR = ['--registrar', '--modelador', '--critico', '--atrito', '--pacote'];

/* Separa a peça, as opções e os valores. `--atrito` repete; `--registrar` aceita valor (o JSON montado) ou nenhum (a forma nova). */
export function lerArgumentos(argv) {
  const opcoes = { atrito: [] };
  let peca;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { peca ??= a; continue; }
    const nome = a.slice(2);
    if (!OPCOES_COM_VALOR.includes(a)) { opcoes[nome] = true; continue; }
    const proximo = argv[i + 1];
    const temValor = proximo !== undefined && !proximo.startsWith('--');
    if (a === '--registrar') { opcoes.registrar = temValor ? proximo : true; if (temValor) i += 1; continue; }
    if (!temValor) throw new Error(`${a} pede um valor.`);
    i += 1;
    if (a === '--atrito') opcoes.atrito.push(proximo); else opcoes[nome] = proximo;
  }
  return { peca, opcoes };
}

async function comoCLI(argv) {
  const { peca, opcoes } = lerArgumentos(argv);
  if (!peca) return { codigo: 1, texto: 'diga a peça: rodada-de-modelagem.mjs <peça> --acao' };

  if (opcoes.registrar !== undefined) {
    const doArquivo = typeof opcoes.registrar === 'string';
    const dosAgentes = opcoes.modelador !== undefined || opcoes.critico !== undefined || opcoes.atrito.length > 0;
    if (doArquivo && dosAgentes) {
      return { codigo: 1, texto: '--registrar <rodada.json> e --modelador/--critico/--atrito são formas diferentes: use uma só.' };
    }
    if (!doArquivo && !dosAgentes) {
      return { codigo: 1, texto: '--registrar precisa de <rodada.json> ou de --modelador <arquivo> --critico <arquivo>.' };
    }
    const entrada = doArquivo
      ? JSON.parse(readFileSync(opcoes.registrar, 'utf8'))
      : entradaDosArquivos({ modelador: opcoes.modelador, critico: opcoes.critico, atrito: opcoes.atrito, peca });
    const { rodada, arquivo, medicao } = await registrarMedida(peca, entrada, { pacote: opcoes.pacote ?? null });
    const decisao = await acaoDaPeca(peca, { medir: async () => medicao });
    return {
      codigo: 0,
      texto: `rodada ${rodada.numero} gravada em ${arquivo.replace(`${REPO}/`, '')}\n`
        + `medição da receita (sha256:${curto(medicao.sha256)}): ${medicao.passou ? 'passou' : 'reprovou'}\n`
        + linhasDeAviso(medicao)
        + `próxima ação: ${decisao.acao} — ${decisao.motivo}`,
    };
  }

  const rodadas = lerRodadas(peca);
  const decisao = await acaoDaPeca(peca, { rodadas });
  return { codigo: 0, texto: resumoDoLaco(peca, { rodadas, decisao }) };
}

/* ---- a contradição e a repetição entre rodadas ---- */

/* Os sentidos que dizem o contrário um do outro, no vocabulário fechado do veredito (`sobrando` não é sentido de hoje e fica para o dia
   em que entrar). */
export const SENTIDOS_OPOSTOS = Object.freeze({
  maior: 'menor', menor: 'maior', adiantada: 'atrasada', atrasada: 'adiantada', alta: 'baixa', baixa: 'alta',
  interna: 'externa', externa: 'interna', faltando: 'sobrando', sobrando: 'faltando', afastado: 'atravessando', atravessando: 'afastado',
});
/* As atribuições que dizem que o defeito não era do modelador: quem conduz decidiu que o conserto não está na receita. */
const ATRIBUICOES_DE_FORA = new Set(['plano', 'ferramenta', 'critico']);
const ATRIBUIDO = /atribuid[oa]s?\s+(?:ao|aos|a|as|à|às)\s+([a-z]+)/;
const semAcento = (t) => String(t).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const RUIDO_DO_ATRITO = new Set(['rodada', 'fica', 'ficam', 'vai', 'vao', 'sem', 'nao', 'mm']);
const comuns = (x, y) => [...x].filter((w) => y.has(w)).length;
const termos = (texto) => new Set([...palavras(texto)].filter((w) => !RUIDO_DO_ATRITO.has(w) && !/^\d+$/.test(w)));

/** Dois `onde` falam do mesmo lugar quando dividem duas palavras significativas, ou ao menos metade das do mais curto. */
export function mesmoLugar(a, b) {
  const x = palavras(a); const y = palavras(b);
  const menor = Math.min(x.size, y.size);
  return menor > 0 && (comuns(x, y) >= 2 || comuns(x, y) * 2 >= menor);
}

const textoDoDefeito = (d) => `${d.tipo} ${d.sentido} em ${d.onde}`;

/* As frases de atrito que atribuem defeito de uma rodada ao plano, à ferramenta ou ao crítico, com a rodada de que falam ("rodada 2,
   ..." no começo da frase, ou a própria rodada que a gravou) e as palavras do que descrevem (o trecho antes de "atribuído"). */
function atribuicoesDeFora(rodadas) {
  const achadas = [];
  for (const r of rodadas) {
    for (const frase of r.atrito ?? []) {
      if (typeof frase !== 'string') continue;
      const limpa = semAcento(frase);
      const m = ATRIBUIDO.exec(limpa);
      if (!m || !ATRIBUICOES_DE_FORA.has(m[1])) continue;
      const da = /^\s*rodada\s+(\d+)\b/.exec(limpa);
      achadas.push({ numero: da ? Number(da[1]) : r.numero, a: m[1], frase, termos: termos(limpa.slice(0, m.index)) });
    }
  }
  return achadas;
}

/**
 * O que a rodada mais recente com veredito diz ao contrário de uma anterior, ou repete do que uma anterior deu como não sendo do
 * modelador. Contradição: defeito na mesma parte, do mesmo tipo e no mesmo lugar (`mesmoLugar`) que um defeito de rodada anterior, com o
 * sentido oposto (`SENTIDOS_OPOSTOS`). Repetição: defeito na mesma parte, do mesmo tipo, com o mesmo sentido e no mesmo lugar que um de
 * rodada anterior que uma frase de atrito atribuiu ao plano, à ferramenta ou ao crítico; a frase fala do defeito quando divide com a
 * parte, o lugar, o sentido e a evidência dele ao menos duas palavras. Devolve, da rodada anterior mais recente para a mais antiga,
 * `{ caso, rodada, rodadaAnterior, parte, agora, antes, atribuicao? }`, com os dois textos; o pedido do crítico usa a mesma lista.
 */
export function contradicoesEntreRodadas(rodadas) {
  const julgadas = (rodadas ?? []).filter((r) => Array.isArray(r?.veredito?.defeitos));
  if (julgadas.length < 2) return [];
  const ultima = julgadas[julgadas.length - 1];
  const anteriores = julgadas.slice(0, -1).reverse();
  const deFora = atribuicoesDeFora((rodadas ?? []).filter((r) => r.numero < ultima.numero));
  const achados = [];
  for (const d of ultima.veredito.defeitos) {
    for (const r of anteriores) {
      for (const e of r.veredito.defeitos) {
        if (e.parte !== d.parte || e.tipo !== d.tipo || !mesmoLugar(e.onde, d.onde)) continue;
        if (SENTIDOS_OPOSTOS[e.sentido] === d.sentido) {
          achados.push({ caso: 'contradicao', rodada: ultima.numero, rodadaAnterior: r.numero, parte: d.parte, agora: textoDoDefeito(d), antes: textoDoDefeito(e) });
          continue;
        }
        if (e.sentido !== d.sentido) continue;
        const doDefeito = termos(`${e.parte} ${e.onde} ${e.sentido} ${e.evidencia ?? ''}`);
        const frase = deFora.find((f) => f.numero === r.numero && comuns(f.termos, doDefeito) >= 2);
        if (frase) {
          achados.push({ caso: 'repeticao', rodada: ultima.numero, rodadaAnterior: r.numero, parte: d.parte, agora: textoDoDefeito(d), antes: frase.frase, atribuicao: frase.a });
        }
      }
    }
  }
  return achados;
}

/** A seção "contradições e repetições" do resumo do laço, vazia quando não há nenhuma. */
export function secaoDeContradicoes(achados) {
  if (!achados.length) return '';
  return `\ncontradições e repetições:\n${achados.map((c) => (c.caso === 'contradicao'
    ? `  rodada ${c.rodada}, ${c.parte}: "${c.agora}" contradiz a rodada ${c.rodadaAnterior}, "${c.antes}"`
    : `  rodada ${c.rodada}, ${c.parte}: "${c.agora}" repete o que a rodada ${c.rodadaAnterior} atribuiu ao ${c.atribuicao}, "${c.antes}"`)).join('\n')}`;
}

/**
 * O resumo do laço que `--acao` imprime: as rodadas, a medição da receita atual, os avisos dela (a dispensa de `PLANO.lataria`, com o
 * motivo), a próxima ação, os defeitos em aberto e as contradições e repetições da última rodada (`contradicoesEntreRodadas`). `decisao`
 * é o que `acaoDaPeca` devolve.
 */
export function resumoDoLaco(peca, { rodadas, decisao }) {
  const abertos = defeitosAbertos(rodadas);
  return `${rodadas.length} rodada(s) registrada(s) para '${peca}'.\n`
    + (decisao.medicao ? `medição da receita atual (sha256:${curto(decisao.medicao.sha256)}): ${decisao.medicao.passou ? 'passou' : 'reprovou'}\n` : 'sem receita para medir ainda.\n')
    + linhasDeAviso(decisao.medicao)
    + `próxima ação: ${decisao.acao} — ${decisao.motivo}\n`
    + (abertos.length
      ? `defeitos em aberto:\n${abertos.map((d) => `  ${d.parte}: ${d.tipo} ${d.sentido} em ${d.onde}`).join('\n')}`
      : 'defeitos em aberto: nenhum.')
    + secaoDeContradicoes(contradicoesEntreRodadas(rodadas));
}

if (process.argv[1] && process.argv[1].endsWith('rodada-de-modelagem.mjs')) {
  try {
    /* `--perguntas`: as perguntas de forma do brief do crítico, em perguntas-da-peca.mjs */
    /* `--pedidos`: os pedidos da pessoa e a contagem por etapa, em pedidos-da-pessoa.mjs */
    const { codigo, texto } = process.argv.includes('--perguntas') ? await (await import('./perguntas-da-peca.mjs')).comoCLI(process.argv.slice(2))
      : process.argv.includes('--pedidos') ? (await import('./pedidos-da-pessoa.mjs')).comoCLI(process.argv.slice(2))
        : await comoCLI(process.argv.slice(2));
    (codigo === 0 ? console.log : console.error)(texto);
    process.exit(codigo);
  } catch (erro) {
    console.error(`rodada-de-modelagem: ${erro.message}`);
    process.exit(1);
  }
}
