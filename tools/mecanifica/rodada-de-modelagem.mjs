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
 * Uso:
 *   node tools/mecanifica/rodada-de-modelagem.mjs <peça> --registrar rodada.json
 *   node tools/mecanifica/rodada-de-modelagem.mjs <peça> --acao
 *   node tools/mecanifica/rodada-de-modelagem.mjs <peça> --perguntas
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

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/* Onde as rodadas moravam antes da pasta da peça, e onde continuam morando
   enquanto existir peça em arquivo solto. Registro de peça migrada não é movido:
   ele é evidência do que aconteceu, e evidência não muda de lugar para caber
   numa arrumação nova. */
export const PASTA_RODADAS = join(REPO, 'docs/mecanifica/historico/rodadas');

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
  return join(raiz, 'docs/mecanifica/historico/rodadas', peca);
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
  { veredito = null, medidas, partes, atrito = [], notaDePassagem },
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
    peca, numero, veredito, medidas, partes, atrito, notaDePassagem, receita,
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
 * `{ passou, relatorio, sha256, texto }`: `sha256` é a impressão do texto da receita que foi medida (a mesma que a rodada grava) e
 * `texto` é esse texto, para a rodada gravar o que foi medido e não o que está no disco depois. Peça sem receita resolvível lança.
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
  return { passou, sha256, texto, caminho, relatorio: cortar(passou ? `${feitas.join(', ')}: ok` : falhas.join('\n')) };
}

/**
 * A impressão do que o crítico julga numa receita: a malha que ela produz (vértices e faces com a parte de cada uma) e o `PLANO`,
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
  for (const [id, f] of neutro.F) hash.update(`f${id}:${f.vs.join(',')}:${f.parte ?? ''};`);
  hash.update(`plano:${JSON.stringify(receita.PLANO ?? null)}`);
  return `sha256:${hash.digest('hex')}`;
}

const curto = (sha256) => sha256.replace(/^sha256:/, '').slice(0, 8);

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
  return { ...acaoDaReceita(rodadas, { sha256: medicao.sha256, medicao, mesmaFormaDaRodada }, { limite }), medicao };
}

/**
 * Grava a rodada com a medição da ferramenta no lugar da que a sessão escreveria, e recusa o que não se sustenta nela:
 * o veredito do crítico quando a medição da receita atual reprovou, e `medidas` declaradas que contradizem a medição. A receita
 * gravada na rodada é a que foi medida.
 */
export async function registrarMedida(peca, entrada, { medir = () => medirReceita(peca), ...opcoes } = {}) {
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
  const { medidas: _declaradas, ...resto } = entrada;
  void _declaradas;
  const gravada = gravarRodada(peca, { ...resto, medidas: { passou: medicao.passou, relatorio: medicao.relatorio } }, { ...opcoes, receitaTexto: medicao.texto });
  return { ...gravada, medicao };
}

async function comoCLI(argv) {
  const peca = argv.find((a) => !a.startsWith('--'));
  const registrar = argv.indexOf('--registrar');
  if (!peca) return { codigo: 1, texto: 'diga a peça: rodada-de-modelagem.mjs <peça> --acao' };

  if (registrar >= 0) {
    const entrada = JSON.parse(readFileSync(argv[registrar + 1], 'utf8'));
    const { rodada, arquivo, medicao } = await registrarMedida(peca, entrada);
    const decisao = await acaoDaPeca(peca, { medir: async () => medicao });
    return {
      codigo: 0,
      texto: `rodada ${rodada.numero} gravada em ${arquivo.replace(`${REPO}/`, '')}\n`
        + `medição da receita (sha256:${curto(medicao.sha256)}): ${medicao.passou ? 'passou' : 'reprovou'}\n`
        + `próxima ação: ${decisao.acao} — ${decisao.motivo}`,
    };
  }

  const rodadas = lerRodadas(peca);
  const decisao = await acaoDaPeca(peca, { rodadas });
  const abertos = defeitosAbertos(rodadas);
  return {
    codigo: 0,
    texto: `${rodadas.length} rodada(s) registrada(s) para '${peca}'.\n`
      + (decisao.medicao ? `medição da receita atual (sha256:${curto(decisao.medicao.sha256)}): ${decisao.medicao.passou ? 'passou' : 'reprovou'}\n` : 'sem receita para medir ainda.\n')
      + `próxima ação: ${decisao.acao} — ${decisao.motivo}\n`
      + (abertos.length
        ? `defeitos em aberto:\n${abertos.map((d) => `  ${d.parte}: ${d.tipo} ${d.sentido} em ${d.onde}`).join('\n')}`
        : 'defeitos em aberto: nenhum.'),
  };
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
