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
 * O ESPERADO DOS PONTOS FICA NA RODADA. Em 2026-11-18 um modelador redeclarou o esperado de um ponto de `PONTOS` depois de a medida
 * reprovar, e o esperado de outro ponto, calculado da curva que ele confere, mudou sozinho a cada rodada; nada comparava. A rodada guarda
 * em `pontos` o esperado resolvido de cada ponto e a impressão do texto de `PONTOS` na receita. `--registrar` compara com a última rodada
 * que tem `pontos` gravado: todo esperado que mudou, e todo ponto que saiu, só se registra com `--motivo-dos-pontos "<quem decidiu, data:
 * por quê>"`, venha a mudança de `PONTOS` reescrito ou de outro dado da receita (a TABELA, uma função); o texto de `PONTOS` só entra na
 * mensagem, para dizer de onde a mudança veio. `--acao` avisa antes do registro.
 *
 * A DECISÃO DA PESSOA FICA AO LADO DAS RODADAS (plano do laço mais rápido, fatia 1; decisão da pessoa em 2026-11-26). Até então as 150
 * rodadas gravadas guardavam só o que o crítico disse. A pessoa vê a peça depois de a rodada estar gravada, e rodada gravada não é reescrita:
 * a decisão dela mora em `rodadas/decisoes-da-pessoa.json`, uma entrada por rodada, com o texto "<quem decidiu>, <AAAA-MM-DD>: <as palavras
 * dela>" e a data da gravação. `<peça> --decisao-da-pessoa "<texto>" --rodada <n>` grava; a rodada que não existe, o formato errado e a
 * segunda decisão para a mesma rodada sem `--substituir` são recusados, e a substituída fica guardada em `anteriores`. `--acao` lista a
 * decisão de cada rodada, entre aspas e numa linha. O texto não tem quebra de linha, a data dele existe no calendário, não é futura e não
 * é anterior ao registro da rodada; nenhuma recusa e nenhuma ajuda traz palavras prontas para a decisão, só o molde. O arquivo lido é
 * conferido inteiro (a peça, as rodadas que existem, as chaves, as datas) e gravado por troca de nome, de um temporário. O campo
 * `decisaoDaPessoa` dentro da rodada, que a primeira versão desta fatia gravava, saiu: nenhuma rodada o tinha, e duas fontes pediriam uma
 * regra de qual vale.
 *
 * A CÓPIA DA RECEITA DA RODADA COM DECISÃO DA PESSOA FICA (decisão da pessoa em 2026-11-26). Até então só a cópia da última rodada ficava
 * em `rodadas/receita-NN.js`, e a geometria que a pessoa julgou numa rodada anterior se perdia com a rodada seguinte. O registro de uma
 * rodada nova não apaga mais a cópia da rodada que tem decisão, nem a da última rodada com veredito do crítico (`copiasQueFicam`), e
 * `--decisao-da-pessoa` diz onde a cópia ficou, a refaz quando a receita atual ainda produz as partes que a rodada gravou, e avisa quando
 * ela não existe mais. As cópias com decisão têm limite (`COPIAS_COM_DECISAO_NA_PASTA`): além dele, a mais antiga sai da pasta só
 * quando o git a tem igual, e volta por `git show`.
 *
 * O VEREDITO SÓ SE REGISTRA SOBRE O PACOTE QUE MOSTRA A RECEITA MEDIDA, EM TODA PEÇA (2026-11-26). O `pacote.json` da pasta da rodada
 * diz a impressão do texto da receita e a impressão das partes (`impressaoDasPartes`: a malha e a promessa de cada parte, que muda
 * também quando muda um módulo que a receita importa). O registro recusa o veredito quando uma das duas difere da receita medida
 * agora, e grava a impressão das partes na rodada: é com ela que o pacote seguinte escolhe as partes que levam vista isolada.
 *
 * Uso:
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar --modelador modelador.txt --critico critico.jsonl [--atrito "texto"] [--pacote <pasta>] [--motivo-dos-pontos "<quem decidiu, data: por quê>"]...
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar rodada.json
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --acao
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --decisao-da-pessoa "<quem decidiu, data: as palavras dela>" --rodada <n> [--substituir]
 *   node tools/modelar/rodada-de-modelagem.mjs --ajuda
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --perguntas
 *   node tools/modelar/rodada-de-modelagem.mjs <peça> --pedidos [<arquivo.json>] [--json]   os pedidos de alteração da pessoa, contados por etapa
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve, sep, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATO_DE_QUEM, LIMITE_DE_RODADAS, acaoDaReceita, defeitoDoTextoDeQuem, defeitosAbertos, normalizarDecisaoDaPessoa, proximaAcao, registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { diferencaDeTexto } from '../../src/autoria/diferenca-de-texto.js';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { conferirAcervo } from './guardas/guarda-acervo.mjs';
import { conferirUmaPeca } from './guardas/guarda-referencial.mjs';
import { conferirPontos, esperadosDosPontos, formatarMudancaDeEsperado, formatarPontos, mudancasDosEsperados, textoDosPontos } from './conferir-pontos.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { executarComCachePorPasso } from './entrada-de-medida.mjs';
import { afastamentoDaParte, normalizarEsbocoDoRefinamento } from '../../src/autoria/refinamento-global.js';
import { avisoDaDispensa } from '../../src/autoria/lataria.js';
import { normalizarPlanoDeModelagem } from '../../src/autoria/plano-de-modelagem.js';
import { comandoDoPacote, pastaDaRodada, superficieDaPecaMedida, superficieDoPacote } from './vistas-de-superficie.mjs';
import { palavras } from './leitura-por-regioes.mjs';
import { lascasDaReceita } from './lasca.mjs';
import { conferirPromessasMedidas } from './promessa-medida.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

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
  return join(raiz, 'tmp/rodadas', peca);
}

/* O NÚMERO DA PRÓXIMA RODADA A REGISTRAR, pela pasta das rodadas: os `rodada-NN.json` gravados mais um, o mesmo que `gravarRodada`
   dá ao registro. O pacote do crítico (`vistas:critica`) grava as imagens numa pasta com esse número, e o registro do veredito lê o
   pacote dela: as imagens de uma rodada deixaram de sobrescrever as da anterior (plano das ferramentas das rodadas, fatia 4). */
export function numeroDaProximaRodada(pasta) {
  if (!existsSync(pasta)) return 1;
  return readdirSync(pasta).filter((nome) => /^rodada-\d{2}\.json$/.test(nome)).length + 1;
}
export const nomeDaPastaDoPacote = (numero) => `rodada-${String(numero).padStart(2, '0')}`;
/** A pasta do pacote do crítico da rodada `numero` da peça: `critica-<peça>/rodada-NN`, fora do git, ao lado das capturas da bancada. */
export function pastaDoPacoteDaRodada(peca, numero, base = undefined) {
  return join(pastaDaRodada(peca, base), nomeDaPastaDoPacote(numero));
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
/** O caminho da cópia da receita que a rodada `numero` guardou na pasta das rodadas (`receita-NN.js`); o arquivo pode não existir mais. */
export const copiaDaReceita = (pasta, numero) => join(pasta, `receita-${String(numero).padStart(2, '0')}.js`);

/* QUANTAS CÓPIAS DE RODADA COM DECISÃO DA PESSOA FICAM NA PASTA SEM CONDIÇÃO: as das três rodadas decididas mais novas. Sem limite, a
   peça em que a pessoa decide a cada rodada voltava a guardar uma cópia por rodada, que foi o que se tirou em 2026-11-13 (129 cópias e
   62 mil linhas no acervo). A cópia de uma rodada decidida mais antiga só sai da pasta quando o git a tem igual, de modo que a geometria
   que a pessoa julgou nunca se perde: fica na pasta ou no histórico, de onde `git show` a traz. */
export const COPIAS_COM_DECISAO_NA_PASTA = 3;

/**
 * As rodadas cuja cópia da receita fica na pasta, além da última gravada: `Set` de números. Ficam as das `limite` rodadas mais novas com
 * decisão da pessoa (a geometria que ela julgou; decisão da pessoa em 2026-11-26), as das decididas mais antigas que `recuperavel` não
 * confirma no git, e a da última rodada com veredito do crítico, com que `--acao` compara a forma julgada com a atual. `rodadas` são os
 * registros (`[{ numero, veredito }]`) e `decididas` os números das rodadas com decisão; `null` em `decididas` (o arquivo das decisões
 * ilegível) guarda todas, porque apagar sem saber quais a pessoa julgou perderia o que não se refaz. Puro, fora o `recuperavel` dado.
 */
export function copiasQueFicam(rodadas, decididas, { limite = COPIAS_COM_DECISAO_NA_PASTA, recuperavel = () => false } = {}) {
  const numeros = rodadas.map((r) => r.numero);
  if (decididas === null) return new Set(numeros);
  const julgadas = rodadas.filter((r) => r.veredito).map((r) => r.numero);
  const comDecisao = numeros.filter((n) => decididas.includes(n)).sort((a, b) => a - b);
  const novas = limite > 0 ? comDecisao.slice(-limite) : [];
  const antigas = comDecisao.filter((n) => !novas.includes(n) && !recuperavel(n));
  return new Set([...novas, ...antigas, ...julgadas.slice(-1)]);
}

/** Se o arquivo está no último commit do git com o mesmo conteúdo que tem no disco: é o que deixa uma cópia antiga sair da pasta. */
export function estaIgualNoGit(arquivo) {
  if (!existsSync(arquivo)) return false;
  const r = spawnSync('git', ['-C', dirname(arquivo), 'show', `HEAD:./${basename(arquivo)}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 && Buffer.compare(r.stdout, readFileSync(arquivo)) === 0;
}

export function gravarRodada(
  peca,
  { veredito = null, medidas, partes, atrito = [], notaDePassagem, superficie, facesFinas, pontos, impressaoDasPartes },
  { pasta = pastaDeRodadas(peca), receitaTexto = textoDaReceita(peca), agora = () => new Date().toISOString(), recuperavel = estaIgualNoGit } = {},
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
    /* o esperado resolvido de cada ponto de `PONTOS` e o que mudou nele desde a rodada anterior: a próxima rodada compara com este */
    ...(pontos ? { pontos } : {}),
    /* a impressão das partes que o crítico julgou (a do `pacote.json`, conferida contra a receita medida): o pacote da rodada seguinte
       compara com ela, e não com a cópia da receita executada de novo, que importa os módulos de hoje */
    ...(impressaoDasPartes ? { impressaoDasPartes } : {}),
  };
  mkdirSync(pasta, { recursive: true });
  const arquivo = join(pasta, `rodada-${String(rodada.numero).padStart(2, '0')}.json`);
  /* Rodada gravada não é reescrita. O registro é evidência do que aconteceu, e
     evidência que muda depois não serve para responder por que a peça ficou
     assim. */
  if (existsSync(arquivo)) throw new Error(`a rodada ${rodada.numero} de '${peca}' já foi gravada.`);
  writeFileSync(arquivo, `${JSON.stringify(rodada, null, 2)}\n`, 'utf8');
  if (receitaTexto !== null) {
    writeFileSync(copiaDaReceita(pasta, numero), ajustarImportsDaCopia(receitaTexto), 'utf8');
    /* FICAM A ÚLTIMA CÓPIA, A DAS RODADAS COM DECISÃO DA PESSOA, ATÉ O LIMITE, E A DA ÚLTIMA RODADA JULGADA PELO CRÍTICO
       (`copiasQueFicam`). A cópia da rodada N serve à diferença da rodada N+1 e à comparação da forma julgada com a atual; a das outras
       rodadas não é lida por nada, e a diferença de cada uma já está no registro. Em 2026-11-13 o acervo guardava 129 cópias e 62 mil
       linhas delas, um terço do código das peças, que a busca por texto e o build atravessavam. A da rodada com decisão da pessoa fica
       desde 2026-11-26: é a geometria que ela julgou, e a diferença de texto no registro não a refaz. Além das
       `COPIAS_COM_DECISAO_NA_PASTA` mais novas, a de rodada decidida só sai quando o git a tem igual. */
    let decididas = null;
    try { decididas = lerDecisoesDaPessoa(peca, { pasta }).map((d) => d.rodada); } catch { /* arquivo ilegível: nenhuma cópia sai */ }
    const ficam = copiasQueFicam([...anteriores, rodada], decididas, { recuperavel: (n) => recuperavel(copiaDaReceita(pasta, n)) });
    for (let n = 1; n < numero; n += 1) if (!ficam.has(n)) rmSync(copiaDaReceita(pasta, n), { force: true });
  }
  return { rodada, arquivo };
}

/* A DECISÃO DA PESSOA SOBRE AS PARADAS, SÓ POR ESCRITO. O laço para no limite de rodadas e quando os defeitos não caem em três rodadas
   julgadas, e quem conduz não segue sozinho. Quando a pessoa decide seguir, a decisão mora num arquivo ao lado das rodadas, com quem
   decidiu e por quê: `rodadas/limite.json`. `limite` é um inteiro maior que o de sempre (mais rodadas) ou o texto "sem" (sem limite,
   declarado); `convergenciaDesde` é o número da rodada a partir da qual a convergência volta a contar, para a peça que parou sem
   convergência e a pessoa mandou seguir, e vai no máximo até a próxima rodada a registrar. Um dos dois basta, e `por` e `motivo` valem
   para o arquivo. Toda declaração pede `por` no formato "quem, AAAA-MM-DD: as palavras dela"
   (os dois arquivos antigos do braço que não o tinham ganharam as palavras da pessoa em 2026-11-18). Sem o arquivo valem as paradas de sempre. */

/* Quem decidiu, quando e o quê: o molde `FORMATO_DE_QUEM` e a conferência `defeitoDoTextoDeQuem` vêm de
   `src/autoria/laco-de-modelagem.js` e valem para o `por` de `limite.json`, para `--motivo-dos-pontos` e para `--decisao-da-pessoa`. */
export const SEM_LIMITE = 'sem';

/** A decisão gravada da pessoa sobre as paradas do laço da peça (`rodadas/limite.json`): `{ limite, convergenciaDesde, por? }`, com
 *  `Infinity` no limite declarado "sem"; `por` só vem quando há arquivo. Chamava-se `decisaoDaPessoa`, nome que se confundia com a
 *  decisão da pessoa sobre cada rodada (`rodadas/decisoes-da-pessoa.json`, `lerDecisoesDaPessoa`). */
export function decisaoSobreAsParadas(peca, { pasta = pastaDeRodadas(peca) } = {}) {
  const arquivo = join(pasta, 'limite.json');
  if (!existsSync(arquivo)) return { limite: LIMITE_DE_RODADAS, convergenciaDesde: 1 };
  const conserto = `Corrija o arquivo e confira com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --acao\`.`;
  let dado;
  try { dado = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (erro) {
    throw new Error(`${arquivo}: recebido um texto que não é JSON (${erro.message}); esperado um objeto com 'limite' ou 'convergenciaDesde', 'por' e 'motivo'. ${conserto}`);
  }
  if (!dado || typeof dado !== 'object' || Array.isArray(dado)) {
    throw new Error(`${arquivo}: recebido ${JSON.stringify(dado)}; esperado um objeto com 'limite' ou 'convergenciaDesde', 'por' e 'motivo'. ${conserto}`);
  }
  const temLimite = dado.limite !== undefined;
  const temConvergencia = dado.convergenciaDesde !== undefined;
  if (!temLimite && !temConvergencia) {
    throw new Error(`${arquivo}: recebido sem 'limite' e sem 'convergenciaDesde'; esperado ao menos um dos dois, que é a decisão que o arquivo grava. ${conserto}`);
  }
  if (temLimite && dado.limite !== SEM_LIMITE && (!Number.isInteger(dado.limite) || dado.limite <= LIMITE_DE_RODADAS)) {
    throw new Error(`${arquivo}: 'limite' recebido: ${JSON.stringify(dado.limite)}; esperado um inteiro maior que ${LIMITE_DE_RODADAS} ou "${SEM_LIMITE}" (sem limite, declarado). ${conserto}`);
  }
  if (temConvergencia && (!Number.isInteger(dado.convergenciaDesde) || dado.convergenciaDesde < 1)) {
    throw new Error(`${arquivo}: 'convergenciaDesde' recebido: ${JSON.stringify(dado.convergenciaDesde)}; esperado o número inteiro (1 ou mais) da rodada a partir da qual a convergência volta a contar. ${conserto}`);
  }
  for (const campo of ['por', 'motivo']) {
    if (typeof dado[campo] !== 'string' || dado[campo].trim().length < 3) {
      throw new Error(`${arquivo}: '${campo}' recebido: ${JSON.stringify(dado[campo])}; esperado o texto que diz quem decidiu e por quê. ${conserto}`);
    }
  }
  const defeitoDoPor = defeitoDoTextoDeQuem(dado.por.trim());
  if (defeitoDoPor) {
    throw new Error(`${arquivo}: 'por' recebido: ${JSON.stringify(dado.por)} (${defeitoDoPor}); esperado ${FORMATO_DE_QUEM}, numa linha só, com as palavras de quem decidiu. ${conserto}`);
  }
  if (temConvergencia) {
    const numeros = lerRodadas(peca, { pasta }).map((r) => r.numero);
    const proxima = (numeros.length ? numeros[numeros.length - 1] : 0) + 1;
    if (dado.convergenciaDesde > proxima) {
      throw new Error(`${arquivo}: 'convergenciaDesde' recebido: ${dado.convergenciaDesde}; esperado no máximo ${proxima}, o número da próxima rodada a registrar `
        + `(as registradas são ${numeros.length ? numeros.join(', ') : 'nenhuma'}). ${conserto}`);
    }
  }
  return {
    limite: !temLimite ? LIMITE_DE_RODADAS : dado.limite === SEM_LIMITE ? Infinity : dado.limite,
    convergenciaDesde: temConvergencia ? dado.convergenciaDesde : 1,
    por: dado.por.trim(),
  };
}

/* ---- a decisão da pessoa sobre cada rodada, num arquivo ao lado delas ---- */

export const ARQUIVO_DAS_DECISOES = 'decisoes-da-pessoa.json';
export const FORMATO_DAS_DECISOES = 'mecanifica.decisoes-da-pessoa';
export const VERSAO_DAS_DECISOES = 1;
const comandoDaDecisao = (peca, rodada = '<n>') => `node tools/modelar/rodada-de-modelagem.mjs ${peca} --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada ${rodada}`;

const CHAVES_DO_ARQUIVO = ['formato', 'versao', 'peca', 'decisoes'];
const CHAVES_DA_ENTRADA = ['rodada', 'decisao', 'gravadaEm', 'anteriores'];
const CHAVES_DA_ANTERIOR = ['decisao', 'gravadaEm'];
const INSTANTE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const instanteIso = (v) => typeof v === 'string' && INSTANTE_ISO.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString() === v;
const ehObjeto = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const chavesAMais = (objeto, aceitas) => Object.keys(objeto).filter((k) => !aceitas.includes(k));
const recorte = (v) => { const t = JSON.stringify(v) ?? String(v); return t.length > 200 ? `${t.slice(0, 200)}…` : t; };

/* A conferência do conteúdo de `decisoes-da-pessoa.json`, a mesma na leitura e antes da gravação. Cada recusa diz o recebido, o esperado
   e o conserto. As chaves são fechadas: um campo a mais (`aprovada`, `limite`) seria lido por alguém como decisão que a ferramenta não
   conferiu. `rodadas` são as rodadas registradas da peça, que dão as que existem e a data do registro de cada uma. */
function conferirDecisoes(dado, { peca, arquivo, rodadas }) {
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

/* Grava por troca de nome: o texto vai inteiro para um temporário ao lado e o temporário toma o nome do arquivo. Quem lê no meio da
   gravação vê o arquivo de antes ou o de depois, nunca a metade. */
function gravarPorTroca(arquivo, texto) {
  const temporario = `${arquivo}.${process.pid}.tmp`;
  try {
    writeFileSync(temporario, texto, 'utf8');
    renameSync(temporario, arquivo);
  } catch (erro) {
    rmSync(temporario, { force: true });
    throw erro;
  }
}

/**
 * Grava a decisão da pessoa sobre uma rodada já registrada, sem tocar no arquivo da rodada. Recusa o formato errado, a data que não
 * existe, a futura e a anterior ao registro da rodada, a rodada que não existe, a segunda decisão para a mesma rodada sem `substituir`,
 * o `substituir` sem decisão anterior e o mesmo texto já gravado; com `substituir: true`, a anterior fica em `anteriores`, com a data
 * dela. `impressaoAtual` é a impressão das partes da receita de agora (`impressaoDasPartesDaReceita`), que a linha de comando tira
 * antes de chamar: sem ela a cópia que já saiu da pasta não se refaz. Devolve `{ entrada, arquivo, substituida, copia }`.
 */
export function gravarDecisaoDaPessoa(peca, { rodada, decisao, substituir = false }, { pasta = pastaDeRodadas(peca), agora = () => new Date().toISOString(), receitaTexto = textoDaReceita(peca), impressaoAtual = null } = {}) {
  const rodadas = lerRodadas(peca, { pasta });
  const numeros = rodadas.map((r) => r.numero);
  const registradas = numeros.length ? `as registradas são ${numeros.join(', ')}` : 'a peça não tem rodada registrada';
  const numero = typeof rodada === 'string' && /^\d+$/.test(rodada.trim()) ? Number(rodada) : rodada;
  if (substituir !== true && substituir !== false) {
    throw new Error(`'substituir' recebido: ${recorte(substituir)}; esperado true ou false, e só true troca uma decisão gravada. Na linha de comando é a opção --substituir, sem valor.`);
  }
  if (rodada === undefined || rodada === null) {
    throw new Error(`--rodada não veio; esperado o número da rodada que a pessoa viu (${registradas}). Grave com \`${comandoDaDecisao(peca)}\`.`);
  }
  const normalizar = (limites) => { try { return normalizarDecisaoDaPessoa(decisao, { peca, rodada: Number.isInteger(numero) ? numero : '<n>', ...limites }); } catch (erro) { throw new Error(SEM_PREFIXO(erro.message)); } };
  normalizar({});
  if (!Number.isInteger(numero) || !numeros.includes(numero)) {
    throw new Error(`--rodada recebido: ${JSON.stringify(rodada)}; esperado o número de uma rodada registrada de '${peca}' (${registradas}). `
      + `Grave com \`${comandoDaDecisao(peca)}\`, com o número da rodada que a pessoa viu${numeros.length ? '' : ', depois de registrar a rodada com --registrar'}.`);
  }
  const gravadaEm = agora();
  const texto = normalizar({ ate: gravadaEm, registradaEm: rodadas.find((r) => r.numero === numero).registradaEm ?? null });
  const decisoes = lerDecisoesDaPessoa(peca, { pasta });
  const antiga = decisoes.find((d) => d.rodada === numero) ?? null;
  if (antiga && antiga.decisao === texto) {
    throw new Error(`a rodada ${numero} de '${peca}' já tem esta decisão da pessoa gravada: ${JSON.stringify(antiga.decisao)}; recebido o mesmo texto${substituir ? ', com --substituir' : ''}; `
      + `esperado um texto novo só quando a pessoa disse outra coisa. Não há o que gravar: confira com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --acao\`.`);
  }
  if (antiga && !substituir) {
    throw new Error(`a rodada ${numero} de '${peca}' já tem decisão da pessoa gravada: ${JSON.stringify(antiga.decisao)}; recebido: ${JSON.stringify(texto)}; esperado uma decisão por rodada. `
      + `Se a pessoa mudou a decisão, grave com \`${comandoDaDecisao(peca, numero)} --substituir\`, e a anterior fica guardada.`);
  }
  if (!antiga && substituir) {
    throw new Error(`--substituir recebido e a rodada ${numero} de '${peca}' não tem decisão da pessoa gravada; esperado --substituir só quando a pessoa muda uma decisão já gravada. `
      + `Grave sem ele: \`${comandoDaDecisao(peca, numero)}\`.`);
  }
  const entrada = {
    rodada: numero, decisao: texto, gravadaEm,
    ...(antiga ? { anteriores: [...(antiga.anteriores ?? []), { decisao: antiga.decisao, gravadaEm: antiga.gravadaEm }] } : {}),
  };
  const lista = [...decisoes.filter((d) => d.rodada !== numero), entrada].sort((a, b) => a.rodada - b.rodada);
  const arquivo = join(pasta, ARQUIVO_DAS_DECISOES);
  const dado = { formato: FORMATO_DAS_DECISOES, versao: VERSAO_DAS_DECISOES, peca, decisoes: lista };
  conferirDecisoes(dado, { peca, arquivo, rodadas });
  gravarPorTroca(arquivo, `${JSON.stringify(dado, null, 2)}\n`);
  return { entrada, arquivo, substituida: antiga, copia: guardarCopiaDaRodadaDecidida(rodadas.find((r) => r.numero === numero), { pasta, receitaTexto, impressaoAtual }) };
}

/* A CÓPIA DA RECEITA DA RODADA COM DECISÃO DA PESSOA. A cópia que a rodada guardou fica. A da rodada cuja cópia já saiu da pasta é
   refeita só quando a receita de agora produz o que a rodada gravou: o mesmo texto (`receita.sha256` do registro) e a mesma impressão
   das partes (`impressaoDasPartes` do registro contra `impressaoAtual`). O texto igual sozinho não basta: a receita importa módulos, e
   com um deles mudado o mesmo texto dá outra malha, que não é a que a pessoa julgou (a primeira versão refazia só pelo texto). A rodada
   que não gravou a impressão das partes (as registradas até 2026-11-26) não se refaz aqui, e quem chama diz isso com o caminho que
   falta e a impressão que a rodada registrou. Devolve `{ arquivo, estado }`, com `estado` 'guardada', 'refeita' ou 'ausente', e no
   'ausente' `sha256` (a da rodada) e `porque` ('texto', 'partes' ou 'sem-impressao'). */
function guardarCopiaDaRodadaDecidida(rodada, { pasta, receitaTexto, impressaoAtual }) {
  const arquivo = copiaDaReceita(pasta, rodada.numero);
  if (existsSync(arquivo)) return { arquivo, estado: 'guardada' };
  const sha256 = rodada.receita?.sha256 ?? null;
  const mesmoTexto = receitaTexto !== null && sha256 !== null && impressao(receitaTexto) === sha256;
  if (!mesmoTexto) return { arquivo, estado: 'ausente', sha256, porque: 'texto' };
  if (!rodada.impressaoDasPartes || !impressaoAtual) return { arquivo, estado: 'ausente', sha256, porque: 'sem-impressao' };
  if (JSON.stringify(rodada.impressaoDasPartes) !== JSON.stringify(impressaoAtual)) return { arquivo, estado: 'ausente', sha256, porque: 'partes' };
  writeFileSync(arquivo, ajustarImportsDaCopia(receitaTexto), 'utf8');
  return { arquivo, estado: 'refeita' };
}

const PORQUE_A_COPIA_NAO_SE_REFAZ = Object.freeze({
  texto: (copia) => `a receita atual é outra versão que a registrada na rodada (${copia.sha256 ?? 'sem impressão no registro'})`,
  partes: () => 'a receita atual tem o mesmo texto da rodada e produz outras partes, porque mudou um módulo que ela importa',
  'sem-impressao': () => 'o texto da receita atual é o da rodada, e a rodada não gravou a impressão das partes com que conferir se os módulos que a receita importa ainda dão a mesma malha',
});

/** A frase do relatório sobre a cópia da receita da rodada com decisão (`copia` de `gravarDecisaoDaPessoa`). */
export function fraseDaCopia(copia, { peca, rodada, raiz = REPO } = {}) {
  const onde = copia.arquivo.replace(`${raiz}/`, '');
  if (copia.estado === 'guardada') return `a cópia da receita julgada nessa rodada fica guardada em ${onde}.`;
  if (copia.estado === 'refeita') return `a cópia da receita julgada nessa rodada não estava mais na pasta e foi refeita da receita atual, que tem o mesmo texto e produz as mesmas partes que a rodada registrou: ${onde}.`;
  return `AVISO: a cópia da receita da rodada ${rodada} de '${peca}' não está na pasta (recebido: ${onde} não existe; esperado o arquivo que o registro da rodada grava), `
    + `e ${(PORQUE_A_COPIA_NAO_SE_REFAZ[copia.porque] ?? PORQUE_A_COPIA_NAO_SE_REFAZ.texto)(copia)}. A decisão foi gravada, e a geometria julgada nessa rodada não foi refeita. `
    + `Se a versão existir no git, recupere-a com \`git log --oneline -- ${onde}\` e \`git show <commit>:${onde} > ${onde}\`.`;
}

export const AJUDA = `rodada-de-modelagem: o registro do laço de modelagem de uma peça. A peça é <objeto>/<peça> ou o nome dela.

  node tools/modelar/rodada-de-modelagem.mjs <peça> --acao
      mede a receita atual e diz a próxima ação, as decisões da pessoa por rodada e os defeitos em aberto
  node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar --modelador <arquivo> [--critico <arquivo>] [--atrito "<texto>"]... [--pacote <pasta>] [--motivo-dos-pontos ${FORMATO_DE_QUEM}]
      grava a rodada com o relato do modelador, o veredito do crítico e a medição da ferramenta; com veredito, confere que o
      pacote.json da pasta do pacote (a da rodada, ou a de --pacote) mostra a receita medida, no texto e nas partes
  node tools/modelar/rodada-de-modelagem.mjs <peça> --registrar <rodada.json>
      grava a rodada de um JSON já montado
  node tools/modelar/rodada-de-modelagem.mjs <peça> --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada <n> [--substituir]
      grava a decisão da pessoa sobre a rodada <n> em rodadas/${ARQUIVO_DAS_DECISOES}, sem mexer na rodada; a cópia da receita
      dessa rodada (rodadas/receita-NN.js) passa a ficar guardada, e as rodadas seguintes não a apagam (além das ${COPIAS_COM_DECISAO_NA_PASTA}
      rodadas decididas mais novas, a cópia mais antiga sai da pasta quando o git a tem igual)
  node tools/modelar/rodada-de-modelagem.mjs <peça> --perguntas
      as perguntas de forma do pedido do crítico
  node tools/modelar/rodada-de-modelagem.mjs <peça> --pedidos [<arquivo.json>] [--json]
      os pedidos de alteração da pessoa, contados por etapa
  node tools/modelar/rodada-de-modelagem.mjs --ajuda
      este texto

A opção com valor aceita as duas escritas: --rodada 3 e --rodada=3, e só --atrito repete.
A decisão da pessoa vai numa linha, com a data do dia em que ela decidiu (nem futura, nem anterior ao registro da rodada) e as palavras
dela: a ferramenta não sugere palavras. --substituir só vale quando a rodada já tem decisão e o texto é outro.`;

/* O nome antigo de `decisaoSobreAsParadas`, que `fluxo-do-objeto.mjs` e `etapas-da-montagem.mjs` ainda importam: os dois ficam fora do
   território do plano do laço mais rápido, e o nome sai daqui quando eles trocarem a importação. */

/** O limite de rodadas da peça: o de sempre, o que a pessoa estendeu por escrito, ou `Infinity` quando ela declarou "sem". */
export const limiteDaPeca = (peca, opcoes) => decisaoSobreAsParadas(peca, opcoes).limite;

/** A rodada a partir da qual a convergência conta para a peça: 1, ou a que a pessoa gravou ao mandar seguir depois da parada. */
export const convergenciaDaPeca = (peca, opcoes) => decisaoSobreAsParadas(peca, opcoes).convergenciaDesde;

/* ---- o esperado dos PONTOS entre rodadas ---- */

const impressao = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;

/** O que a medição guarda dos `PONTOS`: o esperado resolvido de cada um e a impressão do texto que os declara na receita. */
export function pontosDaMedicao(receita, textoDaReceita) {
  if (!Array.isArray(receita?.PONTOS) || receita.PONTOS.length === 0) return null;
  const texto = textoDosPontos(textoDaReceita);
  return { texto: texto === null ? null : impressao(texto), esperados: esperadosDosPontos(receita) };
}

const SEM_PONTOS = Object.freeze({ texto: null, esperados: [] });

/**
 * A comparação do esperado dos pontos da medição com o da última rodada que tem `pontos` gravado (e não só a anterior: a rodada sem
 * `PONTOS` no meio não apaga a base). Devolve `{ base, agora, mudancas, origem }`: `base` é a rodada comparada (null quando nenhuma tem
 * esperados gravados, as de antes desta guarda, e então nada compara); `agora` é o que a rodada grava, com a lista vazia quando a receita
 * deixou de declarar `PONTOS`, e o ponto que saiu conta como mudança. `origem` diz de onde a mudança veio e só entra na mensagem:
 * 'declarada' (o texto de `PONTOS` mudou), 'derivada' (o texto é o mesmo, então veio de outro dado da receita, a TABELA ou uma função) ou
 * 'desconhecida' (o texto não foi achado numa das duas; null não é igual a nada).
 */
export function mudancaDosPontos(rodadas, medicao) {
  const base = [...(rodadas ?? [])].reverse().find((r) => Array.isArray(r?.pontos?.esperados)) ?? null;
  const agora = medicao?.pontos ?? (base ? SEM_PONTOS : null);
  if (!base || !agora) return { base, agora, mudancas: [], origem: null };
  const antes = base.pontos.texto ?? null;
  const origem = antes === null || (agora.texto ?? null) === null ? 'desconhecida' : antes === agora.texto ? 'derivada' : 'declarada';
  return { base, agora, mudancas: mudancasDosEsperados(base.pontos.esperados, agora.esperados), origem };
}

const ORIGEM_DA_MUDANCA = {
  declarada: 'o texto de PONTOS na receita também mudou',
  derivada: 'o texto de PONTOS é o mesmo, então o esperado é derivado de outro dado da receita (a TABELA ou uma função)',
  desconhecida: 'o texto de PONTOS não foi achado na receita de uma das duas rodadas, e a origem da mudança é desconhecida',
};

const avisoDosPontos = ({ base, mudancas, origem }, motivo) => `o esperado de ${mudancas.length} ponto(s) de PONTOS mudou desde a rodada ${base.numero}: `
  + `${mudancas.map(formatarMudancaDeEsperado).join('; ')}; ${ORIGEM_DA_MUDANCA[origem]}${motivo ? ` (motivo: ${motivo})` : ''}.`;

const LIMITE_DO_RELATORIO = 2000;
const cortar = (texto) => (texto.length > LIMITE_DO_RELATORIO ? `${texto.slice(0, LIMITE_DO_RELATORIO - 1)}…` : texto);
const indentar = (texto) => texto.trim().split('\n').map((l) => `  ${l}`).join('\n');

/* A obrigação da luz rasante na medição: a da peça de emenda sombreada ou de lataria. Uma medição sem `luzRasante` (a de antes desta
   regra, ou a injetada) vale pela lataria. */
const luzDaMedicao = (medicao) => (medicao.luzRasante?.luzRasante ? medicao.luzRasante
  : medicao.luzRasante === undefined && medicao.lataria?.lataria ? { luzRasante: true, porque: medicao.lataria.porque } : null);

/**
 * A medição da receita atual da peça, feita pela ferramenta: o veredito de `descrever` (partes, refinamento, contatos, formas e a
 * forma contra a referência), a guarda do acervo e a do referencial sobre a peça, os `PONTOS` quando ela os declara e as promessas de
 * lados e de rente do `PLANO` contra a malha. Devolve
 * `{ passou, relatorio, sha256, texto, lataria, avisos }`: `sha256` é a impressão do texto da receita que foi medida (a mesma que a rodada
 * grava), `texto` é esse texto, para a rodada gravar o que foi medido e não o que está no disco depois, `lataria` diz se a peça é de
 * lataria (`superficieDaReceita`), `luzRasante` se a peça leva a luz rasante ao pacote (lataria ou emenda sombreada) e `avisos` o que o resumo do laço mostra sem reprovar (a dispensa de `PLANO.lataria`, com o motivo).
 * Peça sem receita resolvível lança.
 *
 * A receita executa uma vez só para o referencial, os pontos e as faces finas, com o cache por passo (`tmp/cache-por-prefixo/`), e a guarda
 * do acervo recomeça do mesmo cache: a segunda medição da mesma receita não refaz passo nenhum. `cache: false` executa tudo inteiro.
 */
export async function medirReceita(peca, { rodadas, pasta, registroDasEtapas, cache = true } = {}) {
  const caminho = resolverCaminhoReceita(peca);
  const texto = readFileSync(caminho, 'utf8');
  const sha256 = `sha256:${createHash('sha256').update(texto).digest('hex')}`;
  const falhas = [];
  const feitas = ['descrever (veredito)', 'guarda:acervo', 'guarda:referencial'];
  const acervo = await conferirAcervo([peca], { cachePorPrefixo: cache });
  for (const r of acervo.reprovadas) falhas.push(`guarda:acervo reprovou '${r.peca}':\n${indentar(r.motivo)}`);
  for (const e of acervo.esperando) falhas.push(`'${e.peca}' está planejada sem geometria (espera a etapa '${e.instancia}' de ${e.montagem}): não há o que medir`);
  const receita = receitaDoModulo(await importarReceita(caminho));
  /* a execução da receita atual, feita uma vez e dividida entre as medidas abaixo; a guarda do acervo, logo acima, deixou os pontos dela no cache */
  let dividida;
  const executar = async () => (dividida ??= (await executarComCachePorPasso(caminho, receita, { cache })).executada);
  const referencial = await conferirUmaPeca(peca, { executar });
  if (referencial) falhas.push(`guarda:referencial reprovou '${peca}':\n${indentar(referencial.motivo)}`);
  /* a receita que não executa sozinha segue como era: cada medida abaixo a executa e diz a própria recusa */
  let executada = null;
  try { executada = await executar(); } catch { executada = null; }
  if (Array.isArray(receita?.PONTOS) && receita.PONTOS.length > 0) {
    feitas.push('conferir-pontos');
    const pontos = conferirPontos(receita, { quem: peca, executada });
    if (!pontos.ok) falhas.push(indentar(formatarPontos(pontos)));
  }
  /* o PLANO inválido já reprova no `descrever`; aqui ele só não declara a lataria, que então sai dos PASSOS */
  let plano = null;
  try { plano = normalizarPlanoDeModelagem(receita?.PLANO); } catch { plano = null; }
  const avisos = [avisoDaDispensa(plano)].filter(Boolean);
  /* as promessas do PLANO que a malha responde por número: os lados da revolução e a parte rente à vizinha (`promessa-medida.mjs`) */
  if (plano && executada?.neutro) {
    const promessas = conferirPromessasMedidas(plano, executada.neutro);
    if (promessas.medidas.length > 0) feitas.push('promessas medidas');
    for (const falha of promessas.falhas) falhas.push(`promessa do PLANO que a malha não cumpre: ${falha}`);
  }
  const facesFinas = facesFinasDaMalha(receita, { executada });
  if (facesFinas && facesFinas.total > 0) {
    const anteriores = rodadas ?? lerRodadasSeHouver(peca);
    const base = await baseDeFacesFinas(anteriores, pasta ?? pastaSeHouver(peca));
    const veredito = vereditoDasFacesFinas(facesFinas, { base, anteriores, lataria: plano?.lataria?.partes?.length > 0, peca });
    avisos.push(veredito.aviso);
    if (veredito.reprova) falhas.push(veredito.reprova);
  }
  const passou = falhas.length === 0;
  const pontos = pontosDaMedicao(receita, texto);
  const { lataria, luzRasante, porque } = await superficieDaPecaMedida(peca, receita, plano, { registro: registroDasEtapas });
  return { passou, sha256, texto, caminho, relatorio: cortar(passou ? `${feitas.join(', ')}: ok` : falhas.join('\n')), lataria: { lataria, porque }, luzRasante: { luzRasante, porque }, avisos, ...(facesFinas ? { facesFinas } : {}), ...(pontos ? { pontos } : {}) };
}

/* ---- as faces finas da malha ---- */

/**
 * As faces finas da malha que a receita produz, contadas por parte com a mesma régua de `lasca.mjs` (a topologia do núcleo: área /
 * maior aresta² abaixo de `LIMITE_DE_FACE_FINA`): `{ total, porParte: { parte: n } }`. Receita que não executa sozinha devolve null.
 * Com `executada`, conta sobre a execução que quem chama já tem.
 */
export function facesFinasDaMalha(receita, { executada = null } = {}) {
  let lascas;
  try { ({ lascas } = lascasDaReceita(receita, { executada })); } catch { return null; }
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
  try {
    /* a cópia da rodada não muda: com o cache por passo, só a primeira leitura dela executa */
    const receita = receitaDoModulo(await importarReceita(copia));
    return facesFinasDaMalha(receita, { executada: (await executarComCachePorPasso(copia, receita, { soOFim: true })).executada })?.total ?? null;
  } catch { return null; }
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

/* O que do PLANO entra no pedido do crítico: o objeto, a escala, as referências, a forma de cada parte, os critérios, a família que escolhe
   critérios e perguntas e a espessura mínima. `lataria`, `dobrasAceitas` e `saliencias` são do texto e das réguas, e `categoria` é só o rótulo
   da janela Abrir; trocá-los não muda o que o crítico lê, e por isso saem da impressão. Todo campo opcional do PLANO está numa das duas listas
   abaixo, e o teste cobra isso: campo novo que ninguém classificou entraria na impressão e faria o laço perder o julgamento já dado. O PLANO
   inválido entra inteiro, como era. */
export const CAMPOS_OPCIONAIS_LIDOS_PELO_CRITICO = Object.freeze(['familia', 'familiaProcedural', 'espessuraMinima', 'referenciasNaoConstruidas']);
export const CAMPOS_OPCIONAIS_NAO_LIDOS_PELO_CRITICO = Object.freeze(['lataria', 'dobrasAceitas', 'saliencias', 'categoria']);
export function planoQueOCriticoLe(plano) {
  let normal;
  try { normal = normalizarPlanoDeModelagem(plano); } catch { return plano ?? null; }
  if (normal === null) return null;
  const lido = { ...normal };
  for (const campo of CAMPOS_OPCIONAIS_NAO_LIDOS_PELO_CRITICO) delete lido[campo];
  return lido;
}

/**
 * A impressão do que o crítico julga numa receita: a malha que ela produz (os vértices e as faces com tudo o que levam: parte, liso,
 * cor, material e tinta) e o `PLANO`,
 * que diz ao crítico a forma prometida de cada parte. Duas receitas com a mesma impressão mostram ao crítico a mesma coisa, ainda que
 * o texto mude, como quando a receita ganha o `REFINA` depois de fechar. Receita que não executa sozinha (a que pede o registro de
 * composições de fora) devolve null, e quem compara trata como forma diferente.
 */
export async function impressaoDaForma(caminho, { copiaDeRodada = false } = {}) {
  let receita;
  let neutro;
  try {
    receita = receitaDoModulo(await importarReceita(caminho));
    /* com o cache por passo: a receita atual já foi executada pela medição, e a cópia da rodada, que não muda, só executa na primeira vez
       e guarda só o estado final */
    const execucao = (await executarComCachePorPasso(caminho, receita, { soOFim: copiaDeRodada })).executada;
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
  pasta = pastaDeRodadas(peca), rodadas = lerRodadas(peca, { pasta }), medir = () => medirReceita(peca), limite, convergenciaDesde, por,
} = {}) {
  /* a decisão gravada da pessoa sai inteira da mesma pasta das rodadas; o que quem chama passar vale no lugar do que o arquivo diz */
  if (limite === undefined || convergenciaDesde === undefined) {
    const lida = decisaoSobreAsParadas(peca, { pasta });
    limite ??= lida.limite; convergenciaDesde ??= lida.convergenciaDesde; por ??= lida.por;
  }
  let medicao = null;
  try { medicao = await medir(); } catch (erro) {
    if (!/^Receita .* não encontrada|Informe o nome/.test(erro.message)) throw erro;
  }
  if (medicao === null) return { ...proximaAcao(rodadas, { limite, convergenciaDesde, por }), medicao: null };
  /* O texto mudou depois da última rodada: a cópia que ela guardou diz se o crítico julgaria outra coisa. */
  const ultima = rodadas[rodadas.length - 1];
  /* o esperado dos pontos que mudou desde a última rodada aparece antes do registro, que é onde ele pede o motivo */
  const dosPontos = mudancaDosPontos(rodadas, medicao);
  if (dosPontos.mudancas.length) {
    medicao = { ...medicao, avisos: [...(medicao.avisos ?? []), `${avisoDosPontos(dosPontos)} O registro desta rodada vai pedir --motivo-dos-pontos ${FORMATO_DE_QUEM}.`] };
  }
  let mesmaFormaDaRodada;
  if (medicao.passou && medicao.caminho && ultima?.receita?.sha256 && ultima.receita.sha256 !== medicao.sha256
    && existsSync(copiaDaReceita(pasta, ultima.numero))) {
    const [atual, julgada] = await Promise.all([impressaoDaForma(medicao.caminho), impressaoDaForma(copiaDaReceita(pasta, ultima.numero), { copiaDeRodada: true })]);
    if (atual !== null && atual === julgada) mesmaFormaDaRodada = ultima.numero;
  }
  let decisao = acaoDaReceita(rodadas, { sha256: medicao.sha256, medicao, mesmaFormaDaRodada }, { limite, convergenciaDesde, por });
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
  if (typeof alvo === 'string' && !alvo.startsWith('/') && PASTAS_FORA_DO_REPOSITORIO.some((p) => alvo.includes(p))) {
    /* o texto livre que cita um arquivo de pasta fora do repositório: a conferência de links do CI o lê como referência e reprova */
    throw new Error(`o alvo do veredito (${alvo}) cita um arquivo de pasta que o CI não tem (${PASTAS_FORA_DO_REPOSITORIO.join(', ')}). `
      + 'Peça ao crítico o alvo de verdade ou "sem alvo: <motivo>" sem caminho.');
  }
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

/* A impressão das partes da receita medida (`medicao.caminho`), pela mesma função do pacote; null quando a receita não executa sozinha. */
async function impressaoDasPartesDaMedicao(medicao) {
  if (!medicao?.caminho) return null;
  try { return await (await import('./vistas-para-critica.mjs')).impressaoDasPartesDaReceita(medicao.caminho); } catch { return null; }
}

/**
 * Confere que o pacote do crítico da pasta `pasta` mostra a receita medida agora, e devolve a impressão das partes a gravar na rodada.
 * Vale para toda peça. `sha256` é a impressão do texto da receita medida e `impressao` a das partes dela (null na receita que não
 * executa sozinha). Recusa, com o recebido, o esperado e o comando que refaz o pacote: a pasta sem `pacote.json`, o de outra peça, o
 * de outro texto de receita e o de outras partes, que é o caso do módulo importado que mudou depois do pacote com o texto da receita
 * igual. O pacote gerado antes de 2026-11-26 não traz a impressão das partes: passa pelo texto, e a rodada grava a de agora.
 */
export async function conferirPacoteDoVeredito(peca, { pasta, sha256, impressao }) {
  const arquivo = join(pasta, 'pacote.json');
  const refazer = `Gere o pacote de novo com \`${comandoDoPacote(peca)}\` (com --saida, passe a mesma pasta em --pacote), despache o crítico com o pedido.md novo e registre o veredito dele.`;
  const recusar = (recebido, esperado) => { throw new Error(`o veredito do crítico não se registra: ${recebido}; ${esperado}. ${refazer}`); };
  if (!existsSync(arquivo)) recusar(`recebido: a pasta do pacote ${pasta} não tem o pacote.json`, 'esperado o pacote.json que o vistas:critica grava com as imagens que o crítico julgou');
  let dado;
  try { dado = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (erro) { recusar(`recebido: ${arquivo} não é JSON (${erro.message})`, 'esperado o pacote.json que o vistas:critica grava'); }
  if (dado?.peca !== peca) recusar(`recebido: o pacote de ${pasta} é da peça ${JSON.stringify(dado?.peca ?? null)}`, `esperado o pacote de '${peca}'`);
  if (dado.receita !== sha256) recusar(`recebido: o pacote de ${pasta} mostra a receita ${String(dado.receita)}`, `esperado ${sha256}, a receita medida agora: o texto dela mudou depois do pacote`);
  /* o pacote sem a impressão (gerado antes de 2026-11-26, ou cuja receita não executou) não diz o que o crítico viu: a rodada fica sem
     impressão, não serve de base, e o pacote seguinte leva todas as partes, em vez de gravar a de agora como julgada */
  if (dado.impressaoDasPartes === undefined || dado.impressaoDasPartes === null) return null;
  /* importado na hora: o pacote do crítico é módulo pesado, e `--acao` não o usa */
  const diferem = (await import('./vistas-para-critica.mjs')).partesQueDiferem(dado.impressaoDasPartes, impressao);
  if (impressao === null || diferem.length) {
    recusar(`recebido: o pacote de ${pasta} mostra ${impressao === null ? 'partes que a receita de agora não dá, porque ela não executa' : `outra malha ou outra promessa ${diferem.length === 1 ? 'na parte' : 'nas partes'} ${diferem.join(', ')}`}`,
      `esperado as mesmas partes da receita medida agora (${sha256}): o texto da receita é o do pacote, e mudou um módulo que ela importa ou o que ela declara para a parte`);
  }
  return impressao;
}

/**
 * Grava a rodada com a medição da ferramenta no lugar da que a sessão escreveria, e recusa o que não se sustenta nela:
 * o veredito do crítico quando a medição da receita atual reprovou, e `medidas` declaradas que contradizem a medição. A receita
 * gravada na rodada é a que foi medida.
 */
export async function registrarMedida(peca, entrada, { medir = () => medirReceita(peca), pacote = null, motivoDosPontos = null, imprimirPartes = impressaoDasPartesDaMedicao, ...opcoes } = {}) {
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
    const pasta = pacote ?? pastaDoPacoteDaRodada(peca, numeroDaProximaRodada(opcoes.pasta ?? pastaDeRodadas(peca)));
    const conferido = superficieDoPacote(peca, { pasta, sha256: medicao.sha256 });
    if (!conferido.ok) {
      const lataria = Boolean(medicao.lataria?.lataria);
      throw new Error(`o veredito do crítico não se registra: '${peca}' ${lataria ? 'é peça de lataria' : 'tem emenda sombreada'} (${luzDaMedicao(medicao).porque}), e ${conferido.motivo}. `
        + `O pacote do crítico de peça ${lataria ? 'de lataria leva a luz rasante e a curvatura da lataria' : 'com emenda sombreada leva a luz rasante'}: gere-o com \`${comandoDoPacote(peca)}\` `
        + '(com --saida, passe a mesma pasta em --pacote), despache o crítico com o pedido.md novo e registre o veredito dele.');
    }
    superficie = { lataria: luzDaMedicao(medicao).porque, imagens: conferido.imagens };
  }
  /* em toda peça: o pacote que o crítico julgou mostra a receita medida agora, no texto e nas partes */
  let impressaoDasPartes;
  if (entrada.veredito) {
    const pasta = pacote ?? pastaDoPacoteDaRodada(peca, numeroDaProximaRodada(opcoes.pasta ?? pastaDeRodadas(peca)));
    impressaoDasPartes = await conferirPacoteDoVeredito(peca, { pasta, sha256: medicao.sha256, impressao: await imprimirPartes(medicao) }) ?? undefined;
  }
  /* o esperado dos pontos contra o da última rodada que o gravou: toda mudança pede quem decidiu e por quê */
  const defeitoDoMotivo = motivoDosPontos === null ? null : defeitoDoTextoDeQuem(String(motivoDosPontos).trim());
  if (defeitoDoMotivo) {
    throw new Error(`--motivo-dos-pontos recebido: ${JSON.stringify(motivoDosPontos)} (${defeitoDoMotivo}); esperado ${FORMATO_DE_QUEM}, numa linha só. `
      + `Registre de novo com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --registrar ... --motivo-dos-pontos ${FORMATO_DE_QUEM}\`.`);
  }
  const dosPontos = mudancaDosPontos(lerRodadas(peca, opcoes.pasta ? { pasta: opcoes.pasta } : {}), medicao);
  let pontos = dosPontos.agora ?? undefined;
  if (dosPontos.mudancas.length) {
    if (motivoDosPontos === null) {
      throw new Error(`a rodada não se registra: o esperado de ponto de PONTOS mudou desde a rodada ${dosPontos.base.numero}. `
        + `Recebido: ${dosPontos.mudancas.map(formatarMudancaDeEsperado).join('; ')}; ${ORIGEM_DA_MUDANCA[dosPontos.origem]}. `
        + `Esperado: o mesmo alvo da rodada ${dosPontos.base.numero}, ou a mudança com quem decidiu e por quê. `
        + `Desfaça a mudança ou registre com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --registrar ... --motivo-dos-pontos ${FORMATO_DE_QUEM}\`.`);
    }
    const motivo = String(motivoDosPontos).trim();
    pontos = { ...pontos, mudancas: dosPontos.mudancas.map((m) => ({ ...m, origem: dosPontos.origem })), motivoDaMudanca: motivo };
    medicao = { ...medicao, avisos: [...(medicao.avisos ?? []), avisoDosPontos(dosPontos, motivo)] };
  } else if (!medicao.pontos) pontos = undefined;
  /* `medidas`, `superficie` e `pontos` são da ferramenta, e o que a entrada declara deles sai */
  const { medidas: _declaradas, superficie: _declarada, pontos: _dosPontos, ...resto } = entrada;
  void _declaradas; void _declarada; void _dosPontos;
  const gravada = gravarRodada(peca, { ...resto, superficie, impressaoDasPartes, facesFinas: medicao.facesFinas, pontos, medidas: { passou: medicao.passou, relatorio: medicao.relatorio } }, { ...opcoes, receitaTexto: medicao.texto });
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

const OPCOES_COM_VALOR = ['--registrar', '--modelador', '--critico', '--atrito', '--pacote', '--motivo-dos-pontos', '--decisao-da-pessoa', '--rodada'];
const OPCOES_SEM_VALOR = ['--acao', '--substituir', '--ajuda', '--help'];
const VALOR_ESPERADO = {
  '--modelador': 'o arquivo com a resposta do modelador',
  '--critico': 'o arquivo com a resposta do crítico',
  '--atrito': 'o texto do atrito, entre aspas',
  '--pacote': 'a pasta do pacote do crítico',
  '--motivo-dos-pontos': `o texto ${FORMATO_DE_QUEM}`,
  '--decisao-da-pessoa': `o texto ${FORMATO_DE_QUEM}`,
  '--rodada': 'o número da rodada',
};

/* Separa a peça, as opções e os valores. `--atrito` repete, e nenhuma outra opção com valor: a segunda trocaria a primeira sem aviso.
   `--registrar` aceita valor (o JSON montado) ou nenhum (a forma nova). A opção que pede valor aceita as duas escritas, `--rodada 3` e
   `--rodada=3`. A opção que a ferramenta não conhece é recusada com a lista das aceitas, em vez de ser ignorada. */
export function lerArgumentos(argv) {
  const opcoes = { atrito: [] };
  let peca;
  argv = argv.flatMap((a) => {
    const igual = a.startsWith('--') ? a.indexOf('=') : -1;
    return igual > 0 && OPCOES_COM_VALOR.includes(a.slice(0, igual)) ? [a.slice(0, igual), a.slice(igual + 1)] : [a];
  });
  const vistas = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { peca ??= a; continue; }
    const nome = a.slice(2);
    if (!OPCOES_COM_VALOR.includes(a)) {
      if (!OPCOES_SEM_VALOR.includes(a)) {
        throw new Error(`opção desconhecida recebida: ${a}; esperado uma destas: ${[...OPCOES_SEM_VALOR, ...OPCOES_COM_VALOR].join(', ')} (--perguntas e --pedidos são outros modos, com as opções deles). `
          + 'O uso de cada uma sai com `node tools/modelar/rodada-de-modelagem.mjs --ajuda`.');
      }
      opcoes[nome] = true;
      continue;
    }
    if (a !== '--atrito' && vistas.has(a)) {
      throw new Error(`${a} recebido mais de uma vez; esperado uma vez só, porque o segundo valor trocaria o primeiro sem aviso. Repita o comando com um ${a} só.`);
    }
    vistas.add(a);
    const proximo = argv[i + 1];
    const temValor = proximo !== undefined && !proximo.startsWith('--');
    if (a === '--registrar') { opcoes.registrar = temValor ? proximo : true; if (temValor) i += 1; continue; }
    if (!temValor) {
      throw new Error(`${a} pede um valor e veio sem ele${proximo === undefined ? '' : ` (o que vem depois é ${JSON.stringify(proximo)}, outra opção)`}; esperado ${VALOR_ESPERADO[a]}. `
        + `Escreva \`${a} <valor>\` ou \`${a}=<valor>\`.`);
    }
    i += 1;
    if (a === '--atrito') opcoes.atrito.push(proximo); else opcoes[nome] = proximo;
  }
  return { peca, opcoes };
}

/* A PASTA DAS RODADAS DA LINHA DE COMANDO, SÓ PARA TESTE. Com esta variável de ambiente a linha de comando lê e grava as rodadas e as
   decisões de `<pasta>/<peça>`, e não da pasta da peça no acervo: o teste da linha de comando roda numa pasta temporária, e uma
   regressão não grava decisão fabricada ao lado de rodada real. A pasta tem de ficar fora do repositório, e a saída diz que ela foi
   usada. Sem a variável nada muda. */
export const VARIAVEL_DA_PASTA_DE_TESTE = 'MODELAR_RODADAS_EM_PASTA_DE_TESTE';
function pastaDaLinhaDeComando(peca, env) {
  const valor = env[VARIAVEL_DA_PASTA_DE_TESTE];
  if (valor === undefined || valor === '') return { pasta: pastaDeRodadas(peca), aviso: '' };
  exigirNome(peca);
  /* a pasta final, com os elos simbólicos resolvidos até onde ela existe: um elo de fora que aponta para as rodadas reais, ou a
     pasta pai do repositório com a peça caindo dentro dele, também são recusados */
  const final = join(resolve(valor), peca);
  let real = final;
  for (let p = final; ; p = dirname(p)) {
    if (existsSync(p)) { real = join(realpathSync(p), relative(p, final)); break; }
    if (dirname(p) === p) break;
  }
  const repoReal = realpathSync(REPO);
  const dentro = (c) => c === REPO || c.startsWith(`${REPO}${sep}`) || c === repoReal || c.startsWith(`${repoReal}${sep}`);
  if (dentro(resolve(valor)) || dentro(final) || dentro(real)) {
    throw new Error(`${VARIAVEL_DA_PASTA_DE_TESTE} recebido: ${JSON.stringify(valor)}; esperado uma pasta fora do repositório (${REPO}), porque a variável serve só ao teste da linha de comando. `
      + 'Para o uso de verdade, rode o comando sem a variável.');
  }
  const pasta = final;
  /* o aviso vai à saída de erro já na leitura, em todo caminho (sucesso, recusa, --pedidos): se a variável vazar para a sessão,
     quem lê vê que a ferramenta não está olhando o acervo */
  process.stderr.write(`aviso: rodadas em pasta de teste (${VARIAVEL_DA_PASTA_DE_TESTE}): ${pasta}\n`);
  return { pasta, aviso: `rodadas em pasta de teste (${VARIAVEL_DA_PASTA_DE_TESTE}): ${pasta}\n` };
}

async function comoCLI(argv, { env = process.env } = {}) {
  const { peca, opcoes } = lerArgumentos(argv);
  if (opcoes.ajuda || opcoes.help) return { codigo: 0, texto: AJUDA };
  if (!peca) return { codigo: 1, texto: `recebido sem a peça; esperado o nome dela antes das opções, como em \`node tools/modelar/rodada-de-modelagem.mjs <objeto>/<peça> --acao\`.\n\n${AJUDA}` };
  const { pasta, aviso } = pastaDaLinhaDeComando(peca, env);
  const daPessoa = opcoes['decisao-da-pessoa'];
  if (daPessoa === undefined && (opcoes.rodada !== undefined || opcoes.substituir)) {
    return { codigo: 1, texto: `--rodada e --substituir recebidos sem --decisao-da-pessoa; esperado \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada <n>\`.` };
  }
  if (daPessoa !== undefined) {
    if (opcoes.registrar !== undefined) {
      return { codigo: 1, texto: '--decisao-da-pessoa recebido junto de --registrar; esperado em dois comandos, porque a decisão é de quem viu a peça da rodada gravada. '
        + `Registre a rodada e depois grave com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada <n>\`.` };
    }
    const outras = Object.keys(opcoes).filter((k) => !['decisao-da-pessoa', 'rodada', 'substituir'].includes(k) && (k !== 'atrito' || opcoes.atrito.length > 0));
    if (outras.length) {
      return { codigo: 1, texto: `--decisao-da-pessoa recebido junto de ${outras.map((k) => `--${k}`).join(', ')}; esperado só com --rodada <n> e, quando a pessoa muda a decisão, --substituir: este comando só grava a decisão. `
        + `Grave com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --decisao-da-pessoa ${FORMATO_DE_QUEM} --rodada <n>\` e confira depois com \`node tools/modelar/rodada-de-modelagem.mjs ${peca} --acao\`.` };
    }
    /* a impressão das partes da receita de agora, para refazer a cópia que já saiu da pasta; a peça sem receita executável fica sem ela */
    let impressaoAtual = null;
    try { impressaoAtual = await (await import('./vistas-para-critica.mjs')).impressaoDasPartesDaReceita(resolverCaminhoReceita(peca)); } catch { impressaoAtual = null; }
    const { entrada, arquivo, substituida, copia } = gravarDecisaoDaPessoa(peca, { rodada: opcoes.rodada, decisao: daPessoa, substituir: opcoes.substituir === true }, { pasta, impressaoAtual });
    return { codigo: 0, texto: `${aviso}decisão da pessoa sobre a rodada ${entrada.rodada} gravada em ${arquivo.replace(`${REPO}/`, '')}: ${JSON.stringify(entrada.decisao)}`
      + (substituida ? `\nsubstituiu a anterior, que ficou guardada: ${JSON.stringify(substituida.decisao)}` : '')
      + `\n${fraseDaCopia(copia, { peca, rodada: entrada.rodada })}` };
  }

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
    const { rodada, arquivo, medicao } = await registrarMedida(peca, entrada, { pacote: opcoes.pacote ?? null, motivoDosPontos: opcoes['motivo-dos-pontos'] ?? null, ...(aviso ? { pasta } : {}) });
    const decisao = await acaoDaPeca(peca, { medir: async () => medicao, ...(aviso ? { pasta } : {}) });
    return {
      codigo: 0,
      texto: `${aviso}rodada ${rodada.numero} gravada em ${arquivo.replace(`${REPO}/`, '')}\n`
        + `medição da receita (sha256:${curto(medicao.sha256)}): ${medicao.passou ? 'passou' : 'reprovou'}\n`
        + linhasDeAviso(medicao)
        + `próxima ação: ${decisao.acao} — ${decisao.motivo}`,
    };
  }

  const rodadas = lerRodadas(peca, { pasta });
  const decisoes = lerDecisoesDaPessoa(peca, { pasta });
  const decisao = await acaoDaPeca(peca, { rodadas, pasta });
  return { codigo: 0, texto: `${aviso}${resumoDoLaco(peca, { rodadas, decisao, decisoes })}` };
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
 * motivo), a próxima ação, as decisões da pessoa por rodada (`decisoes`, de `lerDecisoesDaPessoa`, cada uma entre aspas de JSON, para
 * que um texto com quebra de linha não escreva linha que pareça da ferramenta), os defeitos em aberto e as contradições
 * e repetições da última rodada (`contradicoesEntreRodadas`). `decisao` é o que `acaoDaPeca` devolve.
 */
export function resumoDoLaco(peca, { rodadas, decisao, decisoes = [] }) {
  const abertos = defeitosAbertos(rodadas);
  return `${rodadas.length} rodada(s) registrada(s) para '${peca}'.\n`
    + (decisao.medicao ? `medição da receita atual (sha256:${curto(decisao.medicao.sha256)}): ${decisao.medicao.passou ? 'passou' : 'reprovou'}\n` : 'sem receita para medir ainda.\n')
    + linhasDeAviso(decisao.medicao)
    + `próxima ação: ${decisao.acao} — ${decisao.motivo}\n`
    + (decisoes.length ? `decisões da pessoa:\n${decisoes.map((d) => `  rodada ${d.rodada}: ${JSON.stringify(String(d.decisao))}`).join('\n')}\n` : '')
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
