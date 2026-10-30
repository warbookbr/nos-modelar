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
 * `veredito`, sem mudar nada, e o do modelador traz `partes`, `atrito` e `notaDePassagem`. As validações são as de sempre.
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
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
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
import { avisoDaDispensa, latariaDaReceita } from '../../src/autoria/lataria.js';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { comandoDoPacote, pastaDaRodada, superficieDoPacote } from './vistas-de-superficie.mjs';

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
  { veredito = null, medidas, partes, atrito = [], notaDePassagem, superficie },
  { pasta = pastaDeRodadas(peca), receitaTexto = textoDaReceita(peca) } = {},
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
  const rodada = registrarRodada({
    peca, numero, veredito, medidas, partes, atrito, notaDePassagem, receita, superficie,
  });
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

/**
 * A medição da receita atual da peça, feita pela ferramenta: o veredito de `descrever` (partes, refinamento, contatos, formas e a
 * forma contra a referência), a guarda do acervo e a do referencial sobre a peça, e os `PONTOS` quando ela os declara. Devolve
 * `{ passou, relatorio, sha256, texto, lataria, avisos }`: `sha256` é a impressão do texto da receita que foi medida (a mesma que a rodada
 * grava), `texto` é esse texto, para a rodada gravar o que foi medido e não o que está no disco depois, `lataria` diz se a peça é de
 * lataria (`latariaDaReceita`) e `avisos` o que o resumo do laço mostra sem reprovar (a dispensa de `PLANO.lataria`, com o motivo).
 * Peça sem receita resolvível lança.
 */
export async function medirReceita(peca) {
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
  const passou = falhas.length === 0;
  /* o PLANO inválido já reprova no `descrever`; aqui ele só não declara a lataria, que então sai dos PASSOS */
  let plano = null;
  try { plano = normalizarPlanoDeModelagem(receita?.PLANO); } catch { plano = null; }
  const { lataria, porque } = latariaDaReceita(receita, plano);
  const avisos = [avisoDaDispensa(plano)].filter(Boolean);
  return { passou, sha256, texto, caminho, relatorio: cortar(passou ? `${feitas.join(', ')}: ok` : falhas.join('\n')), lataria: { lataria, porque }, avisos };
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
  hash.update(`plano:${JSON.stringify(receita.PLANO ?? null)}`);
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
  const decisao = acaoDaReceita(rodadas, { sha256: medicao.sha256, medicao, mesmaFormaDaRodada }, { limite });
  /* a peça de lataria só fecha com a luz rasante e a curvatura da lataria no pacote que o crítico julgou */
  if (decisao.acao === 'parar-fechou' && medicao.lataria?.lataria && !ultima?.superficie) {
    return {
      acao: 'revisar',
      motivo: `a rodada ${ultima.numero} fechou sem a luz rasante e a curvatura da lataria no pacote do crítico, e a peça é de lataria `
        + `(${medicao.lataria.porque}): gere o pacote com \`${comandoDoPacote(peca)}\` e despache o crítico de novo.`,
      medicao,
    };
  }
  return { ...decisao, medicao };
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
  if (entrada.veredito && medicao.lataria?.lataria) {
    const pasta = pacote ?? pastaDaRodada(peca);
    const conferido = superficieDoPacote(peca, { pasta, sha256: medicao.sha256 });
    if (!conferido.ok) {
      throw new Error(`o veredito do crítico não se registra: '${peca}' é peça de lataria (${medicao.lataria.porque}), e ${conferido.motivo}. `
        + `O pacote do crítico de peça de lataria leva a luz rasante e a curvatura da lataria: gere-o com \`${comandoDoPacote(peca)}\` `
        + '(com --saida, passe a mesma pasta em --pacote), despache o crítico com o pedido.md novo e registre o veredito dele.');
    }
    superficie = { lataria: medicao.lataria.porque, imagens: conferido.imagens };
  }
  /* `medidas` e `superficie` são da ferramenta, e o que a entrada declara deles sai */
  const { medidas: _declaradas, superficie: _declarada, ...resto } = entrada;
  void _declaradas; void _declarada;
  const gravada = gravarRodada(peca, { ...resto, superficie, medidas: { passou: medicao.passou, relatorio: medicao.relatorio } }, { ...opcoes, receitaTexto: medicao.texto });
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
  return Array.isArray(c) ? c.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text) : [];
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

const lerAgente = (arquivo, papel) => {
  let conteudo;
  try { conteudo = readFileSync(arquivo, 'utf8'); } catch (erro) { throw new Error(`${arquivo}: não consegui ler o arquivo do ${papel} (${erro.code ?? erro.message}).`); }
  const { texto } = textoFinalDoAssistente(conteudo, { arquivo });
  return ultimoBlocoJson(texto, { arquivo, papel });
};

/**
 * A entrada da rodada montada dos arquivos do modelador e do crítico, mais o atrito de quem conduz. O veredito é o bloco do crítico
 * como veio. As validações são as de `registrarRodada`, rodadas aqui antes de medir, e o erro diz de qual arquivo (ou de qual
 * `--atrito`) e de qual campo veio o problema. Sem `critico` a entrada não tem veredito, que é o caso da receita reprovada.
 */
export function entradaDosArquivos({ modelador, critico = null, atrito = [] }) {
  if (!modelador) throw new Error('falta --modelador <arquivo>: `partes` e `notaDePassagem` vêm do que o modelador devolveu.');
  const doModelador = lerAgente(modelador, 'modelador');
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
      : entradaDosArquivos({ modelador: opcoes.modelador, critico: opcoes.critico, atrito: opcoes.atrito });
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

/**
 * O resumo do laço que `--acao` imprime: as rodadas, a medição da receita atual, os avisos dela (a dispensa de `PLANO.lataria`, com o
 * motivo), a próxima ação e os defeitos em aberto. `decisao` é o que `acaoDaPeca` devolve.
 */
export function resumoDoLaco(peca, { rodadas, decisao }) {
  const abertos = defeitosAbertos(rodadas);
  return `${rodadas.length} rodada(s) registrada(s) para '${peca}'.\n`
    + (decisao.medicao ? `medição da receita atual (sha256:${curto(decisao.medicao.sha256)}): ${decisao.medicao.passou ? 'passou' : 'reprovou'}\n` : 'sem receita para medir ainda.\n')
    + linhasDeAviso(decisao.medicao)
    + `próxima ação: ${decisao.acao} — ${decisao.motivo}\n`
    + (abertos.length
      ? `defeitos em aberto:\n${abertos.map((d) => `  ${d.parte}: ${d.tipo} ${d.sentido} em ${d.onde}`).join('\n')}`
      : 'defeitos em aberto: nenhum.');
}

if (process.argv[1] && process.argv[1].endsWith('rodada-de-modelagem.mjs')) {
  try {
    /* `--perguntas`: as perguntas de forma do brief do crítico, em perguntas-da-peca.mjs */
    const { codigo, texto } = process.argv.includes('--perguntas') ? await (await import('./perguntas-da-peca.mjs')).comoCLI(process.argv.slice(2)) : await comoCLI(process.argv.slice(2));
    (codigo === 0 ? console.log : console.error)(texto);
    process.exit(codigo);
  } catch (erro) {
    console.error(`rodada-de-modelagem: ${erro.message}`);
    process.exit(1);
  }
}
