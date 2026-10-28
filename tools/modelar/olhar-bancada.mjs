#!/usr/bin/env node
/**
 * olhar-bancada.mjs — serviço headless de vistas e sua CLI fina.
 *
 * `olharBancada` recebe configuração explícita, injeta logs opcionalmente e
 * devolve resultado estruturado. Importar este módulo não lê argv, não sobe
 * Vite/Playwright, não grava arquivos e não encerra o processo.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeConfinamento, criarDiretorioConfinado, verificarCaminhoConfinado } from './caminho-confinado.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';
import { ativarReceitaBancada } from './ativar-bancada.mjs';
import { paresIndistinguiveis } from '../../src/autoria/cor-de-auditoria.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { analisarPeca } from './analise-da-peca.mjs';
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';
import { FATOR_DE_AMOSTRAGEM, reduzirPorMedia } from './capturar-montagem.mjs';
import { reduzirEmParalelo } from './reduzir-em-paralelo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');
/* Onde cada captura grava a sessão própria dela: dentro do que o servidor da captura serve, e numa pasta que o controle de versão ignora. */
const SESSOES = join(OUT, 'sessoes');
const VISTAS_VALIDAS = ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];
const MODOS = ['todas', 'contexto', 'isolar'];
/* Teto de imagens de par por chamada. Uma peça de 24 partes tem 276 pares; sem
   teto, a primeira peça grande vira um despejo que ninguém abre. Três é o que
   cabe numa leitura sem rolar a tela, e o relato diz quantos ficaram de fora. */
const TETO_DE_PARES_POR_CHAMADA = 3;
/* O PRAZO DE CADA CARGA DE PÁGINA É DECLARADO. A espera pela ponte levava `{ timeout: 20000 }` no lugar do argumento errado de
   `waitForFunction` (era o argumento da função, não a opção), e a carga valia só o prazo padrão de 30 s do Playwright, que uma
   máquina dividida com outros agentes estoura: a perua levou 257 s numa máquina parada, e quatro capturas ao mesmo tempo passam
   dos 30 s só para abrir a página. O prazo vale por etapa da carga (abrir, ponte, modelo), por tentativa, e o erro diz qual. */
export const PRAZO_DE_CARGA_MS = 90_000;
/* A transição de câmera da bancada dura 280 ms (`DURACAO_TRANSICAO`, criar-ambiente.js); a espera entre uma vista e a seguinte, na
   mesma página, acaba quando ela termina e um quadro foi desenhado depois, e nunca passa do maior entre `espera` e este limite. */
const QUADROS_DEPOIS_DA_TRANSICAO = 1;
const LIMITE_DA_TRANSICAO_MS = 5000;

/* O LAÇO DE QUADROS DA BANCADA PARA DURANTE A FOTO. A bancada redesenha a cena a cada quadro, mesmo parada, e no Chromium sem tela
   (`--use-gl=swiftshader`) cada quadro de 1800 por 1800 leva uns 125 ms: medido na perua, `page.screenshot` levava 1,2 s com o laço
   ligado e 0,12 s com ele parado, e cada ordem à página esperava o quadro em curso. Parado o laço, a página mostra o último quadro
   desenhado, que é o da câmera já quieta; a foto sai a mesma, e a prova é o hash dos 51 PNG da perua, igual com e sem a pausa.
   Os retornos pedidos enquanto parado ficam numa fila e voltam ao navegador ao retomar, e por isso o laço da bancada, que se pede
   de novo a cada quadro, continua de onde parou. Estas funções rodam dentro da página e não tocam o código da bancada. */
function instalarControleDeQuadros() {
  if (window.__modelarQuadros) return;
  const original = window.requestAnimationFrame.bind(window);
  let fila = null;
  window.__modelarQuadros = {
    pausar() {
      if (fila) return;
      fila = [];
      /* números altos, para nunca coincidir com o de um quadro real em `cancelAnimationFrame` */
      window.requestAnimationFrame = (retorno) => { fila.push(retorno); return 1_000_000_000 + fila.length; };
    },
    retomar() {
      if (!fila) return;
      const guardados = fila;
      fila = null;
      window.requestAnimationFrame = original;
      for (const retorno of guardados) original(retorno);
    },
  };
}
/* Espera a transição de câmera terminar (`controls.enabled` volta a ser verdadeiro no quadro em que ela acaba) e `quadros` quadros
   depois, e então, se `parar`, para o laço. O limite evita ficar para sempre numa câmera que não termina. */
function esperarCameraEPararQuadros([quadros, limite, parar]) {
  const ponte = window.__mecanificaBancada;
  const inicio = performance.now();
  return new Promise((resolver) => {
    const depois = (restantes) => {
      if (restantes <= 0) { if (parar) window.__modelarQuadros.pausar(); resolver(true); return; }
      requestAnimationFrame(() => depois(restantes - 1));
    };
    const passo = () => {
      if (ponte.ambiente().controls.enabled === true) { depois(quadros); return; }
      if (performance.now() - inicio > limite) { if (parar) window.__modelarQuadros.pausar(); resolver(false); return; }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
}

/* DICA APARECE UMA VEZ, E SÓ QUANDO SE APLICA.
   As duas dicas que existiam disparavam DENTRO do laço de vistas: numa chamada
   de três vistas, a mesma linha saía três vezes. Foi assim que a dica de
   resolução morreu — repetida em toda captura de peça alta, virou moldura de
   tela e parou de ser lida. Aqui cada dica tem chave, junta as vistas em que
   apareceu e sai uma vez só. Sem achado, `listar()` devolve lista vazia e nada
   é impresso: dica que sempre aparece não é dica, é cabeçalho. */
/* A FOTO É A CENA, E NÃO A TELA. Até aqui a captura era da página inteira, com
   a lista de componentes, o painel de inspeção, a barra de vistas e o rodapé
   ocupando a maior parte da imagem. Quem recebe essas imagens é o crítico
   visual e a IA que conduz a rodada, e para eles tudo isso é ruído: chegaram a
   julgar forma com o objeto ocupando um quarto do quadro, cercado de botões.
   Fotografar o canvas entrega só a cena, sem interface nenhuma, e sem precisar
   de modo especial na bancada. Se o canvas não existir, a página inteira volta
   a valer, porque imagem pior é melhor que nenhuma. */
/* A FOTO É A CENA, E NÃO A TELA. A captura era da página inteira, com a lista
   de componentes, o painel de inspeção, a barra de vistas e o rodapé ocupando
   a maior parte da imagem. Quem recebe essas imagens é o crítico visual e quem
   conduz a rodada, e para eles isso é ruído: uma crítica desta casa foi feita
   com o objeto ocupando um quarto do quadro, cercado de botões, e o crítico
   deu como ausente um flange que existia na malha.

   QUEM ESCONDE A INTERFACE É A PRÓPRIA BANCADA, pelo modo de auditoria, que já
   existia e faz mais do que esconder: tira o piso, a grade e a sombra, e
   estica o canvas para o quadro inteiro. Eu cheguei a escrever uma segunda
   forma de esconder, por estilo injetado daqui, antes de encontrar esta —
   duas maneiras de fazer a mesma coisa divergem no dia em que alguém mexe numa
   delas. Sobrou uma, e é a de lá. */

export function criarDicas() {
  const porChave = new Map();
  return {
    anotar(chave, texto, vista = null) {
      const atual = porChave.get(chave) ?? { chave, texto, vistas: [] };
      atual.texto = texto;
      if (vista && !atual.vistas.includes(vista)) atual.vistas.push(vista);
      porChave.set(chave, atual);
    },
    listar() {
      return [...porChave.values()].map(({ chave, texto, vistas }) => ({ chave, texto, vistas: [...vistas] }));
    },
  };
}
const PROJECOES = ['perspectiva', 'ortografica'];
const ARGUMENTOS_DO_CHROMIUM = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'];

class ErroDeUso extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.codigo = 2;
  }
}

function erroDeUso(mensagem) {
  throw new ErroDeUso(mensagem);
}

function normalizarLista(valor) {
  if (valor === null || valor === undefined) return [];
  if (Array.isArray(valor)) return valor.map((item) => String(item).trim()).filter(Boolean);
  return String(valor).split(',').map((item) => item.trim()).filter(Boolean);
}

function caminhoInterno(valor, nome) {
  if (valor === null || valor === undefined) return null;
  if (!valor || valor.includes('\\') || valor.startsWith('/') || /^[A-Za-z]:/.test(valor)
    || valor.split('/').includes('..')) {
    erroDeUso(`--${nome} precisa ser caminho relativo canônico dentro do repositório.`);
  }
  const destino = resolve(REPO, valor);
  const dentro = relative(REPO, destino);
  if (dentro.startsWith('..') || dentro === '' || /^[A-Za-z]:/.test(dentro)) {
    erroDeUso(`--${nome} precisa ficar dentro do repositório.`);
  }
  try {
    verificarCaminhoConfinado(destino, { raiz: REPO });
  } catch (erro) {
    if (erro instanceof ErroDeConfinamento) erroDeUso(`--${nome} recusado: ${erro.message}`);
    throw erro;
  }
  return destino;
}

function novoRelato() {
  return { stdout: [], stderr: [] };
}

function registrar(relato, logger, canal, mensagem) {
  const texto = `${mensagem}\n`;
  relato[canal].push(texto);
  if (typeof logger === 'function') logger(canal, mensagem);
  else if (logger && typeof logger[canal] === 'function') logger[canal](mensagem);
}

function erroEstruturado({ relato, erro, resultado = null }) {
  const uso = erro instanceof ErroDeUso;
  const mensagem = erro?.message ?? String(erro);
  if (uso) relato.stderr.unshift(`olhar-bancada: ${mensagem}\n`);
  else if (mensagem) relato.stderr.push(`\n${mensagem}\n`);
  return {
    ok: false,
    codigo: uso ? 2 : 1,
    erro: {
      categoria: uso ? 'uso' : 'execucao',
      codigo: uso ? 'uso_invalido' : 'falha_bancada',
      mensagem,
    },
    stdout: relato.stdout.join(''),
    stderr: relato.stderr.join(''),
    resultado,
  };
}

async function fecharRecursos({ browser, vite, pagina = null, proprios = true }) {
  const limpeza = [];
  /* Com recursos compartilhados o navegador e o servidor são de quem os abriu, e esta chamada fecha só a página dela. */
  const lista = proprios ? [['browser', browser], ['vite', vite]] : [['pagina', pagina]];
  for (const [recurso, instancia] of lista) {
    if (!instancia) continue;
    try {
      await instancia.close();
    } catch (erro) {
      limpeza.push({ recurso, codigo: 'falha_fechamento', mensagem: erro?.message ?? String(erro) });
    }
  }
  return limpeza;
}

/* O QUE O PRAZO VENCIDO DIZ. "Timeout 30000ms exceeded" não diz o que estava carregando nem se vale repetir: quatro agentes na mesma
   máquina o recebiam sem saber se a peça, a página ou o servidor era o lento. A mensagem traz a etapa, a peça, a vista, o tempo
   gasto desde o começo da captura e quantas imagens ainda faltavam. */
function descreverProgresso({ peca, etapa, vista, inicio, feitas, total }) {
  const partes = [`etapa: ${etapa}`];
  if (peca) partes.push(`peça '${peca}'`);
  if (vista) partes.push(`vista '${vista}'`);
  partes.push(`${Math.round(performance.now() - inicio)} ms gastos nesta captura`);
  partes.push(`${feitas} de ${total} imagens feitas, faltavam ${Math.max(0, total - feitas)}`);
  return partes.join('; ');
}

function erroDeTempo(timeoutMs, progresso) {
  const erro = new Error(`A bancada excedeu o limite de ${timeoutMs} ms (${descreverProgresso(progresso)}).`);
  erro.codigo = 'tempo_esgotado';
  return erro;
}

function erroDeCarga(prazoMs, progresso, detalhe) {
  const erro = new Error(`A bancada não terminou de carregar dentro do prazo de ${prazoMs} ms (${descreverProgresso(progresso)}). ${detalhe}`);
  erro.codigo = 'tempo_esgotado';
  return erro;
}

const ehTempoDoPlaywright = (erro) => erro?.name === 'TimeoutError' || /Timeout/i.test(erro?.message ?? '');

/* Rótulo de peça vira nome de arquivo: a sessão ativa usa `meta.nome`, que tem
   acento e espaço ("Cutelo de Sucata Reforçado"). */
export function apelidoDeArquivo(nome) {
  return String(nome ?? 'sessao-ativa')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sessao-ativa';
}

/**
 * O SERVIDOR E O NAVEGADOR DE VÁRIAS CAPTURAS SEGUIDAS. `olharBancada` sobe um servidor do Vite e um Chromium por chamada, e o pacote
 * da `vistas:critica` faz uma chamada por parte mais cinco do conjunto (26 na perua): quem abre uma vez e passa o resultado como
 * `compartilhada` paga a subida uma vez só. A sessão da peça (o arquivo que a página lê) e os pares acusados pela medida também
 * ficam aqui, porque dependem só da peça, e cada chamada de uma peça os reaproveita em vez de executar a receita de novo. Quem abre
 * é quem fecha, com `fechar()`; as chamadas fecham só a página delas.
 */
export async function abrirCapturaCompartilhada({ dependencias = {}, logger = null } = {}) {
  const createServer = dependencias.createServer ?? (async (...args) => (await import('vite')).createServer(...args));
  const carregarPlaywright = dependencias.carregarPlaywright
    ?? (async () => (await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href)).default);
  let vite = null;
  let browser = null;
  try {
    vite = await createServer({
      root: REPO,
      configFile: join(REPO, 'vite.config.js'),
      server: { host: '127.0.0.1', port: 0 },
      logLevel: 'error',
    });
    await vite.listen();
    const { port } = vite.httpServer.address();
    const pw = await carregarPlaywright();
    browser = await pw.chromium.launch({ args: ARGUMENTOS_DO_CHROMIUM });
    if (typeof logger === 'function') logger('info', 'Servidor e navegador abertos uma vez para as capturas seguintes.');
    return {
      vite,
      browser,
      base: `http://127.0.0.1:${port}/nos-modelar/tools/bancadas/harness.html`,
      sessoes: new Map(),
      /* a página que a última chamada deixou aberta para a seguinte, e quantas páginas se carregaram ao todo */
      pagina: null,
      cargas: 0,
      async fechar() {
        const limpeza = await fecharRecursos({ browser, vite, pagina: this.pagina?.page ?? null, proprios: false });
        limpeza.push(...await fecharRecursos({ browser, vite }));
        this.pagina = null;
        for (const { arquivo } of this.sessoes.values()) rmSync(arquivo, { force: true });
        this.sessoes.clear();
        return limpeza;
      },
    };
  } catch (erro) {
    await fecharRecursos({ browser, vite });
    throw erro;
  }
}

/**
 * Gera e inspeciona vistas da bancada. O retorno contém as vistas relatadas,
 * os caminhos dos PNGs, métricas de enquadramento e falhas estruturadas.
 */
export async function olharBancada({
  peca = null,
  vistas: vistasDeclaradas = null,
  selecionadas: selecionadasDeclaradas = null,
  par: parPedida = null,
  modo: modoDeclarado = null,
  projecao: projecaoDeclarada = null,
  explosao: explosaoDeclarada = 0,
  res: resDeclarada = 1280,
  espera: esperaDeclarada = 1200,
  saida: saidaDeclarada = null,
  relatorio: relatorioDeclarado = null,
  listar = false,
  estrito = false,
  focar = false,
  revisar = false,
  /* Imagem para LEITURA AUTOMÁTICA: sem cromo de interface, sem piso, sem grade
     e sem sombra. `coresPorParte` pinta uma cor por peça e devolve a legenda. */
  auditoria = false,
  coresPorParte = false,
  arame = false,
  capturarEmMemoria = false,
  timeoutMs = null,
  /* O prazo de cada etapa da carga da página (abrir, ponte, modelo), por tentativa. */
  prazoDeCargaMs = PRAZO_DE_CARGA_MS,
  /* O servidor, o navegador e a sessão da peça já abertos por `abrirCapturaCompartilhada`; sem eles a chamada abre e fecha os seus. */
  compartilhada = null,
  logger = null,
  dependencias = {},
} = {}) {
  const relato = novoRelato();
  const falhasRelatadas = [];
  let vite = null;
  let browser = null;
  let resposta = null;
  let temporizador = null;
  let encerramentoForcado = null;
  let expirou = false;
  let progressoDoPrazo = null;
  /* as gravações em curso (a redução de cada imagem corre fora da thread principal) */
  const gravacoes = [];
  /* o que o `finally` precisa saber da página para deixá-la aberta à chamada seguinte */
  let guardarErroDaPagina = null;
  let reaproveitavelDaChamada = false;
  let chaveDaPaginaDaChamada = null;
  let paginaSuja = false;
  let legendaDeAuditoria = null;
  /* o arquivo da sessão própria desta captura (ver `ativarReceitaBancada`), apagado ao fim; com `compartilhada` ele é da peça e não
     da chamada, e quem o apaga é `compartilhada.fechar()` */
  let sessaoDaCaptura = null;
  let page = null;
  /* o que a captura estava fazendo, para o prazo vencido dizer onde parou */
  const progresso = { peca, etapa: 'preparar a captura', vista: null, inicio: performance.now(), feitas: 0, total: 0 };
  try {
    if (capturarEmMemoria && (saidaDeclarada !== null || relatorioDeclarado !== null)) {
      erroDeUso('captura em memória não aceita --saida ou --relatorio.');
    }
    if (timeoutMs !== null && (!Number.isFinite(Number(timeoutMs)) || Number(timeoutMs) <= 0)) {
      erroDeUso('timeoutMs precisa ser um número positivo.');
    }
    if (timeoutMs !== null) {
      temporizador = setTimeout(() => {
        expirou = true;
        /* o relato do prazo vencido guarda a etapa de AGORA, antes de os recursos se fecharem e a chamada em curso falhar */
        progressoDoPrazo = { ...progresso };
        encerramentoForcado = fecharRecursos({ browser, vite, pagina: page, proprios: !compartilhada });
      }, Number(timeoutMs));
    }
    const garantirPrazo = () => {
      if (expirou) throw erroDeTempo(Number(timeoutMs), progressoDoPrazo ?? progresso);
    };
    if (revisar && vistasDeclaradas !== null) erroDeUso('--revisar já define as vistas; não misture com --vistas');
    if (parPedida !== null && revisar) erroDeUso('--par é inspeção dirigida; não misture com --revisar.');
    if (parPedida !== null && vistasDeclaradas !== null) erroDeUso('--par escolhe a vista legível; não misture com --vistas.');
    if (parPedida !== null && selecionadasDeclaradas !== null) erroDeUso('--par já declara as duas partes; não misture com --selecionadas.');

    const selecionadas = normalizarLista(parPedida ?? selecionadasDeclaradas);
    const par = parPedida === null ? null : [...new Set(selecionadas)].sort();
    if (parPedida !== null && (par.length !== 2 || par.length !== selecionadas.length)) {
      erroDeUso('--par exige exatamente duas partes semânticas diferentes, separadas por vírgula.');
    }
    /* `--par` ESCOLHE a vista; ele nunca enquadrou. A recusa antiga dizia que
       sim, e o próprio relatório desmentia: ele aprova o par com 64 px por
       parte, que é um encaixe que ninguém consegue julgar na imagem. Numa peça
       de 1,2 m isso significa que a única pergunta que o modo `par` existe para
       responder — "este encaixe fecha?" — era a que ele não conseguia mostrar.
       Achado em uso: um cabo atravessando a empunhadura teve de ser diagnosticado
       pelos números da receita porque nenhuma vista dava para ver.
       Agora `--focar` é aceito e aproxima nas duas partes. Sem ele, nada muda. */
    if (parPedida !== null && modoDeclarado !== null && modoDeclarado !== 'isolar') {
      erroDeUso('--par sempre isola o par; não misture com outro --modo.');
    }
    if (parPedida !== null && explosaoDeclarada !== null && Number(explosaoDeclarada) !== 0) {
      erroDeUso('--par não aceita explosão: a inspeção não desloca geometria.');
    }
    const vistas = par
      ? ['inspecao-par']
      : normalizarLista(vistasDeclaradas ?? (revisar ? 'isometrica,frontal,direita,superior' : 'isometrica,frontal,direita'));
    const modo = par ? 'isolar' : (modoDeclarado ?? 'todas');
    const projecao = projecaoDeclarada ?? (revisar || par ? 'ortografica' : 'perspectiva');
    const explosao = Number(explosaoDeclarada ?? 0);
    /* `--res` aceita LARGURA ou LARGURAxALTURA.
     *
     * A proporção era 16:9 fixa no código, e objeto ALTO gastava o quadro à toa:
     * medido numa prensa hidráulica, a peça ocupava cerca de 18% da largura, e o
     * resto era fundo. Isso não é cosmético — é a mesma família da V-25, em que
     * forma foi julgada por três rodadas numa imagem cortada. Pixel que não
     * existe não vira julgamento, e julgar forma é o trabalho mais difícil que a
     * bancada serve.
     *
     * O padrão continua 16:9 de propósito: mudá-lo mexeria em toda captura de
     * gate já calibrada. O que muda é passar a EXISTIR a escolha, e o relatório
     * abaixo passa a apontá-la quando a silhueta é claramente vertical. */
    const declarada = String(resDeclarada ?? '');
    const casadoWxH = declarada.match(/^(\d+)\s*[xX×]\s*(\d+)$/);
    const largura = Math.max(640, parseInt(casadoWxH ? casadoWxH[1] : declarada, 10) || 1280);
    const altura = casadoWxH
      ? Math.max(360, parseInt(casadoWxH[2], 10))
      : Math.round(largura * 9 / 16);
    const espera = parseInt(esperaDeclarada, 10) || 1200;
    const estritoEfetivo = Boolean(estrito || revisar);
    /* Revisão sempre em modo de auditoria: a imagem da revisão é feita para
       ser lida e não para ser usada, e é ela que vai ao crítico. */
    /* Revisão sempre em modo de auditoria: a imagem da revisão é feita para ser
       lida e não para ser usada, e é ela que vai ao crítico. A página falsa dos
       testes não implementa a ponte de auditoria, e por isso a ligação só vale
       quando a ponte existe — imagem com cromo é pior, não é rodada quebrada. */
    const auditoriaEfetiva = Boolean(auditoria || revisar);
    if (focar && !selecionadas.length) erroDeUso('--focar exige --selecionadas');
    for (const vista of vistas) {
      if (vista !== 'inspecao-par' && !VISTAS_VALIDAS.includes(vista)) {
        erroDeUso(`vista '${vista}' não existe. Use: ${VISTAS_VALIDAS.join(', ')}`);
      }
    }
    if (!MODOS.includes(modo)) erroDeUso(`modo '${modo}' não existe. Use: ${MODOS.join(', ')}`);
    if (!PROJECOES.includes(projecao)) erroDeUso(`projeção '${projecao}' não existe. Use: ${PROJECOES.join(', ')}`);
    if (!Number.isFinite(explosao) || explosao < 0 || explosao > 1) erroDeUso('explosao precisa estar entre 0 e 1');
    /* Sem --peca a bancada abre a SESSÃO ATIVA — a peça em que se está
       trabalhando, que por definição ainda não está no catálogo publicado.
       Se --peca for informada, pode ser:
       1. Uma fixture de teste privada do harness ('fixture-visual', etc.).
       2. Uma receita procedural do repositório (ex.: 'peca-de-prova', 'procedural/.../peca.js').
       Se for receita, auto-ativamos a sessão ativa para ela e carregamos a bancada via sessão,
       evitando timeout do Playwright. Se não existir em nenhum dos dois, falha rápido. */
    const FIXTURES_HARNESS = ['fixture-visual', 'fixture-hierarquia', 'fixture-portas', 'fixture-sem-portas', 'fixture-uniao', 'fixture-ombro-uniao'];
    const ehFixtureHarness = Boolean(peca && FIXTURES_HARNESS.includes(peca));

    let caminhoDaReceita = null;
    if (peca && !ehFixtureHarness) {
      let caminhoReceita;
      try {
        caminhoReceita = resolverCaminhoReceita(peca, { raiz: REPO });
        caminhoDaReceita = caminhoReceita;
      } catch {
        erroDeUso(`Peça '${peca}' não encontrada no catálogo de fixtures nem em procedural/{pecas,maquinas}/.`);
      }

      if (caminhoReceita) {
        const daPeca = compartilhada?.sessoes.get(peca) ?? null;
        if (daPeca) {
          sessaoDaCaptura = daPeca.arquivo;
        } else {
          try {
            const ativar = dependencias.ativarReceitaBancada ?? ativarReceitaBancada;
            /* A SESSÃO É DESTA CAPTURA. `sessao-ativa.json` é um arquivo só por repositório, e com duas capturas de peças diferentes
               ao mesmo tempo a segunda trocava o arquivo da primeira: a imagem de `aviao-motor` saiu com a deriva. Cada captura grava
               a peça num arquivo seu, único por processo e por chamada, e aponta a página para ele pela URL (`?sessao=`). Com
               `compartilhada` o arquivo é um por peça e por conjunto de chamadas, e as chamadas seguintes da mesma peça o reusam. */
            sessaoDaCaptura = join(SESSOES, `${apelidoDeArquivo(peca)}-${process.pid}-${randomUUID()}.json`);
            await ativar({ alvo: caminhoReceita, raiz: REPO, arquivoDaSessao: sessaoDaCaptura });
            if (compartilhada) compartilhada.sessoes.set(peca, { arquivo: sessaoDaCaptura, pares: null });
            if (logger) logger('info', `Peça '${peca}' ativada na sessão da bancada.`);
          } catch (erro) {
            erroDeUso(`Falha ao ativar peça '${peca}' na bancada: ${erro.message}`);
          }
        }
      }
    }

    const saida = capturarEmMemoria ? null : (caminhoInterno(saidaDeclarada, 'saida') ?? OUT);
    const relatorio = capturarEmMemoria ? null : caminhoInterno(relatorioDeclarado, 'relatorio');
    const sufixoPartes = [
      selecionadas.length ? `sel-${[...selecionadas].sort().join('+')}` : null,
      modo !== 'todas' ? modo : null,
      projecao === 'ortografica' ? 'orto' : null,
      explosao > 0 ? `exp${Math.round(explosao * 100)}` : null,
      par ? 'par' : null,
      focar ? 'focado' : null,
      arame === 'raio-x' ? 'raio-x' : (arame ? 'arame' : null),
    ].filter(Boolean);
    const sufixo = sufixoPartes.length ? `-${sufixoPartes.join('-')}` : '';
    if (!capturarEmMemoria) criarDiretorioConfinado(saida, { raiz: REPO });
    const arquivosPlanejados = !capturarEmMemoria && peca
      ? vistas.map((vista) => join(saida, `bancada-${apelidoDeArquivo(peca)}-${vista}${sufixo}.png`))
      : [];
    for (const arquivo of arquivosPlanejados) verificarCaminhoConfinado(arquivo, { raiz: REPO });
    if (saidaDeclarada && arquivosPlanejados.some((arquivo) => existsSync(arquivo))) {
      erroDeUso('--saida já contém uma ou mais imagens desta rodada; a bancada não sobrescreve artefato de revisão.');
    }

    /* OS PARES ACUSADOS SÃO MEDIDOS EM NODE, não perguntados à bancada: é a
       mesma medida que faz `descrever --estrito` reprovar, e duas respostas
       para a mesma pergunta seria o defeito. Peça vinda da sessão ativa não tem
       receita para executar aqui — nesse caso não há acusação a mostrar, e o
       silêncio é declarado em vez de virar lista vazia com cara de "está tudo
       certo". */
    let paresAcusados = [];
    const sessaoDaPeca = peca && compartilhada ? compartilhada.sessoes.get(peca) ?? null : null;
    if (sessaoDaPeca?.pares) {
      paresAcusados = sessaoDaPeca.pares;
    } else if (peca && caminhoDaReceita) {
      progresso.etapa = 'medir os contatos da peça';
      try {
        const moduloDaPeca = await importarReceita(caminhoDaReceita);
        const receitaDaPeca = receitaDoModulo(moduloDaPeca);
        const { neutro } = executarReceita(receitaDaPeca);
        paresAcusados = contatosDaPeca(neutro, receitaDaPeca).naoDeclarados.map((item) => item.par);
        if (sessaoDaPeca) sessaoDaPeca.pares = paresAcusados;
      } catch (erro) {
        registrar(relato, logger, 'stdout',
          `(não consegui medir os contatos desta peça: ${erro.message.split('\n')[0]})`);
      }
    }

    /* A entrada publicada pode estar legitimamente vazia. A ferramenta de
       inspeção, porém, precisa de uma peça para provar geometria; por isso usa
       o harness privado, que injeta um catálogo explícito de fixtures. */
    let base;
    if (compartilhada) {
      ({ vite, browser, base } = compartilhada);
    } else {
      progresso.etapa = 'subir o servidor';
      const createServer = dependencias.createServer ?? (async (...args) => (await import('vite')).createServer(...args));
      vite = await createServer({
        root: REPO,
        configFile: join(REPO, 'vite.config.js'),
        server: { host: '127.0.0.1', port: 0 },
        logLevel: 'error',
      });
      await vite.listen();
      garantirPrazo();
      const { port } = vite.httpServer.address();
      base = `http://127.0.0.1:${port}/nos-modelar/tools/bancadas/harness.html`;
      progresso.etapa = 'abrir o navegador';
      const carregarPlaywright = dependencias.carregarPlaywright
        ?? (async () => (await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href)).default);
      const pw = await carregarPlaywright();
      browser = await pw.chromium.launch({ args: ARGUMENTOS_DO_CHROMIUM });
    }
    garantirPrazo();
    /* BORDA SUAVIZADA: a página abre com `deviceScaleFactor` igual ao fator de amostragem, a bancada já desenha o buffer em
       `devicePixelRatio` (criar-ambiente.js), e `fotografar` devolve o PNG reduzido ao tamanho do viewport. A razão e a escolha do
       filtro estão em `FATOR_DE_AMOSTRAGEM`, em capturar-montagem.mjs. O layout continua em pixel CSS, e por isso a imagem final
       tem o tamanho de sempre. */
    /* A PÁGINA DA CHAMADA ANTERIOR SERVE À SEGUINTE. As 26 chamadas da `vistas:critica` da perua diferem na seleção, no arame e nas
       cores, que o controlador de partes calcula por inteiro do estado que se lhe dá (`aplicarVisual`), e no quadro, que a página
       não troca. Com `compartilhada`, uma chamada que terminou bem deixa a página aberta, e a próxima da mesma peça, do mesmo quadro,
       da mesma projeção e da mesma explosão reaplica a auditoria, a seleção e o modo pela ponte, como a primeira já fazia por cima
       da URL, e refaz o enquadramento. Qualquer outra diferença abre página nova. */
    const reaproveitavel = Boolean(compartilhada) && auditoriaEfetiva && !par && !listar;
    const chaveDaPagina = JSON.stringify({ peca, sessao: sessaoDaCaptura, largura, altura, projecao, explosao });
    chaveDaPaginaDaChamada = chaveDaPagina;
    reaproveitavelDaChamada = reaproveitavel;
    let paginaNova = true;
    if (compartilhada?.pagina) {
      const guardada = compartilhada.pagina;
      compartilhada.pagina = null;
      if (reaproveitavel && guardada.chave === chaveDaPagina) {
        page = guardada.page;
        paginaNova = false;
      } else {
        await guardada.page.close().catch(() => {});
      }
    }
    if (paginaNova) {
      page = await browser.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: FATOR_DE_AMOSTRAGEM });
    }
    const fotografar = async () => reduzirPorMedia(await page.screenshot({ type: 'png' }));
    /* Em arquivo, a redução de cada imagem corre numa thread enquanto a página segue para a vista seguinte; a gravação espera o fim. */
    const fotografarParaArquivo = async (arquivo) => {
      const bruto = await page.screenshot({ type: 'png' });
      gravacoes.push(reduzirEmParalelo(bruto).then((reduzido) => writeFileSync(arquivo, reduzido)));
    };
    const errosDaPagina = [];
    guardarErroDaPagina = (erro) => errosDaPagina.push(erro.message);
    page.on('pageerror', guardarErroDaPagina);
    let cargasDePagina = 0;
    const TENTATIVAS_DE_CARGA = 2;
    const abrirComRepeticao = async (url) => {
      for (let tentativa = 1; tentativa <= TENTATIVAS_DE_CARGA; tentativa++) {
        try {
          progresso.etapa = 'abrir a página';
          await page.goto(url, { waitUntil: 'load', timeout: prazoDeCargaMs });
          progresso.etapa = 'esperar a ponte da bancada';
          await page.waitForFunction(
            () => typeof window.__mecanificaBancada === 'object' && window.__mecanificaBancada !== null,
            undefined,
            { timeout: prazoDeCargaMs },
          );
          /* A ponte existir não significa que há modelo. A peça da sessão ativa
             chega pelo POLLING do sincronizador, depois do load — ler antes
             devolvia estatísticas nulas e derrubava a revisão visual. Espera o
             modelo de fato entrar na cena; `listar` não precisa de modelo. */
          if (!listar) {
            progresso.etapa = 'esperar o modelo entrar na cena';
            await page.waitForFunction(
              () => {
                const b = window.__mecanificaBancada;
                if (!b) return false;
                if (b.erro) throw new Error(String(b.erro));
                return b.carregado === true;
              },
              undefined,
              { timeout: prazoDeCargaMs },
            );
          }
          await page.evaluate(instalarControleDeQuadros);
          cargasDePagina += 1;
          if (compartilhada) compartilhada.cargas += 1;
          return tentativa;
        } catch (erro) {
          if (!ehTempoDoPlaywright(erro)) throw erro;
          if (tentativa === TENTATIVAS_DE_CARGA) {
            throw erroDeCarga(prazoDeCargaMs, progresso,
              `Tentativa ${tentativa} de ${TENTATIVAS_DE_CARGA}; endereço ${url}. ${String(erro.message).split('\n')[0]}`);
          }
          await page.goto('about:blank', { waitUntil: 'load' });
        }
      }
      return TENTATIVAS_DE_CARGA;
    };
    /* A VISTA SEGUINTE TROCA NA PÁGINA JÁ ABERTA. Cada vista abria a página de novo, e cada abertura executava a receita no
       navegador e refazia o modelo: das 51 imagens da `vistas:critica` da perua, 26 chamadas eram só carga. A vista vem pelo
       `ambiente` da ponte, em modo instantâneo como a URL faz na subida, e o enquadramento que se segue é o mesmo de uma página
       nova, porque `enquadrar`, `focar` e `focarContato` refazem centro, raio e caixa fixada por inteiro. A espera entre duas vistas
       da mesma página acaba quando a transição de câmera termina e dois quadros foram desenhados, e não passa do prazo da carga. */
    /* Só a imagem de auditoria para o laço: a interface da bancada (`--tela`) tem aviso e animação que andam por quadro, e parados
       a foto sairia sem o que ela mostraria. */
    const pararQuadros = async () => { if (auditoriaEfetiva) await page.evaluate(() => window.__modelarQuadros?.pausar()); };
    const aguardarCameraQuieta = async () => {
      progresso.etapa = 'esperar a câmera parar';
      const terminou = await page.evaluate(esperarCameraEPararQuadros, [QUADROS_DEPOIS_DA_TRANSICAO, Math.max(espera, LIMITE_DA_TRANSICAO_MS), auditoriaEfetiva]);
      if (!terminou) await page.waitForTimeout(espera);
    };
    const urlDa = (vista, sobrepor = {}) => {
      const alvos = sobrepor.selecionadas ?? selecionadas;
      const modoAlvo = sobrepor.modo ?? modo;
      const params = new URLSearchParams();
      if (ehFixtureHarness) params.set('peca', peca);
      if (sessaoDaCaptura) params.set('sessao', relative(REPO, sessaoDaCaptura).replaceAll('\\', '/'));
      if (alvos.length) params.set('selecionadas', [...alvos].sort().join(','));
      if (VISTAS_VALIDAS.includes(vista) && vista !== 'isometrica') params.set('vista', vista);
      if (projecao === 'ortografica') params.set('projecao', 'ortografica');
      if (modoAlvo !== 'todas') params.set('modo', modoAlvo);
      if (explosao > 0) params.set('explosao', explosao.toFixed(2));
      const query = params.toString();
      return query ? `${base}?${query}` : base;
    };
    let falhou = false;
    const vistasRelatadas = [];
    const capturas = [];
    const paresCapturados = [];
    const dicas = criarDicas();
    const anotarDica = (chave, texto, vista = null) => dicas.anotar(chave, texto, vista);
    let pecaRelatada = null;
    progresso.total = vistas.length;
    let dadoDaChamada = null;
    for (const [indice, vista] of vistas.entries()) {
      progresso.vista = vista;
      const url = urlDa(vista);
      /* a primeira vista de uma página é a que a abre; as seguintes só trocam a câmera */
      const primeiraDaPagina = paginaNova && cargasDePagina === 0;
      if (primeiraDaPagina) {
        const tentativaDeAbertura = await abrirComRepeticao(url);
        garantirPrazo();
        if (tentativaDeAbertura > 1) registrar(relato, logger, 'stdout', `ferramenta: ${vista} abriu após repetição automática`);
      } else {
        progresso.etapa = 'trocar a vista na página aberta';
        await page.evaluate((alvo) => {
          window.__modelarQuadros?.retomar();
          window.__mecanificaBancada.ambiente().definirVista(alvo, { instantaneo: true });
        }, vista);
      }
      progresso.etapa = 'ler o estado da bancada';
      /* o que se lê da peça não muda de uma vista para a seguinte da mesma chamada */
      const dado = dadoDaChamada ?? await page.evaluate(() => {
        const b = window.__mecanificaBancada;
        return {
          ready: b.ready,
          erro: b.erro ?? null,
          // `peca` é função na ponte; ler o campo cru devolvia função (undefined ao serializar).
          peca: (typeof b.peca === 'function' ? b.peca() : b.peca) ?? b.nomePeca ?? null,
          partes: b.partes ?? [],
          selecaoIgnorada: b.selecaoIgnorada ?? [], diagnosticos: b.diagnosticos ?? null,
          estatisticas: b.estatisticas ?? null, estado: b.estado ? b.estado() : null,
        };
      });
      dadoDaChamada = dado;
      if (!dado.ready) {
        registrar(relato, logger, 'stderr', `\nBANCADA NÃO SUBIU\n  ${dado.erro}\n  ${url}`);
        falhou = true;
        break;
      }
      if (indice === 0) {
        if (listar) {
          const disponiveis = await page.evaluate(() => window.__mecanificaBancada.pecasDisponiveis);
          registrar(relato, logger, 'stdout', `peças disponíveis (${disponiveis.length}):\n  ${disponiveis.join('\n  ')}`);
          break;
        }
        const semParte = dado.diagnosticos?.facesSemParte?.length ?? 0;
        pecaRelatada = dado.peca;
        registrar(relato, logger, 'stdout', `peça: ${dado.peca}`);
        registrar(relato, logger, 'stdout', `partes (${dado.partes.length}): ${dado.partes.join(', ')}`);
        registrar(relato, logger, 'stdout', `malha: ${dado.estatisticas.facesNeutras} faces, ${dado.estatisticas.triangulos} triângulos, ${semParte} sem identidade`);
        /* a ponte confere os nomes que a URL da subida trouxe; numa página reaproveitada a seleção veio de fora da URL, e a conferência é daqui */
        const selecaoIgnorada = paginaNova ? dado.selecaoIgnorada : selecionadas.filter((nome) => !dado.partes.includes(nome));
        if (selecaoIgnorada.length) {
          registrar(relato, logger, 'stderr', `\nNOME DE PARTE INEXISTENTE: ${selecaoIgnorada.join(', ')}\n  a peça expõe: ${dado.partes.join(', ')}`);
          falhou = true;
          falhasRelatadas.push({ categoria: 'modelo', codigo: 'parte_inexistente', vista: null, mensagem: 'A seleção pediu parte que a peça não publica.', acao: 'Corrija o nome semântico; não substitua por índice ou UUID.' });
          break;
        }
        if (semParte && estritoEfetivo) {
          registrar(relato, logger, 'stderr', `\n${semParte} face(s) sem identidade semântica (--estrito)`);
          falhou = true;
          falhasRelatadas.push({ categoria: 'modelo', codigo: 'identidade_ausente', vista: null, mensagem: 'A peça contém face sem identidade semântica.', acao: 'Nomeie a origem ou a parte responsável antes da revisão visual.' });
          break;
        }
        registrar(relato, logger, 'stdout', '');
      }
      let resultadoPar = null;
      let vistaRelatada = vista;
      if (par) {
        resultadoPar = await page.evaluate((partes) => window.__mecanificaBancada.inspecionarPar(partes), par);
        if (!resultadoPar?.valida) {
          registrar(relato, logger, 'stderr', `\nINSPEÇÃO DE PAR RECUSADA\n  ${resultadoPar?.motivo ?? 'a bancada não devolveu resultado válido.'}`);
          falhou = true;
          falhasRelatadas.push({ categoria: 'modelo', codigo: 'par_invalido', vista: null, mensagem: 'A inspeção de par não recebeu duas partes semânticas válidas.', acao: 'Passe exatamente dois nomes publicados pela peça.' });
          break;
        }
        vistaRelatada = resultadoPar.vistaEscolhida;
        const leitura = resultadoPar.pixels.map((item) => `${item.nome}: ${item.pixels}px`).join(', ');
        registrar(relato, logger, 'stdout', `inspeção de par: ${resultadoPar.partes.join(' + ')}`);
        registrar(relato, logger, 'stdout', `vista escolhida: ${vistaRelatada} (${leitura})`);
        registrar(relato, logger, 'stdout', `candidatas: ${resultadoPar.candidatas.map((item) => `${item.vista}=${item.menor}px/${item.total}px`).join(', ')}`);
        if (!resultadoPar.legivel) {
          registrar(relato, logger, 'stderr', '  diagnóstico: nenhuma vista canônica deixou as duas partes legíveis (mínimo de 64px por parte).');
          falhou = true;
          falhasRelatadas.push({ categoria: 'camera', codigo: 'par_sem_vista_legivel', vista: vistaRelatada, mensagem: 'Nenhuma vista canônica mostrou as duas partes com leitura suficiente.', acao: 'Escolha uma vista explicitamente ou revise a peça; a ferramenta não moverá componentes.' });
        }
      }
      /* Numa página já em auditoria o foco desta posição seria refeito logo abaixo pelo enquadramento da auditoria, que o repete. */
      if (focar && (primeiraDaPagina || !auditoriaEfetiva)) {
        /* Depois da escolha de vista, e não em vez dela: a vista decide de ONDE
           olhar, o foco decide de QUÃO PERTO. São perguntas diferentes.
           No par, o foco é no CONTATO e não na união — a união de duas partes
           compridas que se tocam na ponta é as duas inteiras, e o encaixe volta
           a ficar com poucos pixels, que era o problema original. */
        if (par) {
          const contato = await page.evaluate(
            (partes) => window.__mecanificaBancada.focarContato(partes), par,
          );
          if (!contato?.valida) {
            registrar(relato, logger, 'stderr', `  foco de contato recusado: ${contato?.motivo ?? 'sem motivo'}`);
            falhou = true;
            falhasRelatadas.push({
              categoria: 'modelo', codigo: 'par_sem_contato', vista: vistaRelatada,
              mensagem: contato?.motivo ?? 'A bancada não conseguiu enquadrar o contato.',
              acao: 'Duas partes que não se sobrepõem não têm encaixe para julgar; confira a receita.',
            });
          } else {
            /* A cena é normalizada, então a caixa NÃO sai em milímetro. Sai
               como fração do maior lado da peça, que é o que responde "isto é
               um encaixe ou é a peça inteira?" sem fingir uma unidade. */
            const maior = Math.max(...contato.caixas.flatMap((c) => c.tamanho));
            const fracao = Math.max(...contato.contato.tamanho) / (maior || 1);
            registrar(relato, logger, 'stdout',
              `contato enquadrado: ${(fracao * 100).toFixed(1)}% do maior lado do par`);
          }
        } else {
          await page.evaluate(() => window.__mecanificaBancada.focar());
        }
      }
      /* AUDITORIA depois de escolher a vista e antes de esperar o quadro: o modo
         mexe no tamanho do canvas (o cromo sai e o desenho ocupa tudo), e mudar
         isso depois da espera capturaria o quadro do layout velho. */
      if (auditoriaEfetiva) {
        /* O modo de auditoria, as cores, o arame e a seleção valem para todas as vistas da chamada: ficam da primeira. */
        if (indice === 0) legendaDeAuditoria = await page.evaluate(
          ([cores, ar]) => window.__mecanificaBancada.auditoria({ cores, arame: ar }),
          [coresPorParte, arame],
        );
        /* Reenquadra só quando NINGUÉM pediu foco. `auditoria()` troca o
           tamanho do canvas, e sem reenquadrar a peça fica descentrada — mas
           chamar `enquadrar` depois de `focar` desfaz o zoom que o autor pediu,
           que foi o que aconteceu na primeira versão desta linha. */
        /* Seleção e foco são REAPLICADOS pela ponte, não deixados a cargo da
           URL. O parâmetro de URL é lido uma vez, na subida da página; a peça da
           sessão ativa chega segundos depois pelo polling, e o controlador é
           refeito com ela — levando junto a seleção que a URL tinha pedido. Em
           auditoria isso aparecia como uma imagem sem foco e sem fantasma, com o
           argumento aceito e ignorado em silêncio. */
        /* numa página reaproveitada a seleção anterior precisa sair, e por isso a ordem vai também com a lista vazia */
        if (indice === 0 && (selecionadas.length || !paginaNova)) {
          await page.evaluate(([nomes, m]) => {
            window.__mecanificaBancada.selecionar(nomes);
            window.__mecanificaBancada.modo(m);
          }, [selecionadas, modo]);
        }
        /* O REENQUADRE DA AUDITORIA PRECISA REPETIR A MESMA REGRA de cima, e
           não uma parecida. Ele roda DEPOIS e sobrescreve — foi assim que o foco
           de contato ficou sem efeito com `--cores`, aceito e desfeito em
           silêncio, que é exatamente o defeito que o comentário acima descreve
           para a seleção. */
        if (par && focar) {
          await page.evaluate((partes) => window.__mecanificaBancada.focarContato(partes), par);
        } else if (focar || parPedida) {
          await page.evaluate(() => window.__mecanificaBancada.focar());
        } else {
          await page.evaluate(() => window.__mecanificaBancada.enquadrar());
        }
      }
      if (primeiraDaPagina) {
        progresso.etapa = 'esperar a página assentar';
        await page.waitForTimeout(espera);
        await pararQuadros();
      } else {
        await aguardarCameraQuieta();
      }
      garantirPrazo();
      progresso.etapa = 'medir o enquadramento';
      const { url: urlReproduzivel, enquadramento } = await page.evaluate(() => {
        const b = window.__mecanificaBancada;
        return { url: b.url(), enquadramento: b.enquadramento() };
      });
      /* Silhueta claramente vertical num quadro deitado: a peça cabe pela
         altura e sobra fundo dos dois lados. O enquadramento está CERTO — quem
         está errado é a proporção do quadro —, então isto é dica, não falha:
         quem julga forma decide se vale recapturar, e ninguém deve mexer na
         geometria por causa de moldura. */
      if (enquadramento.largura > 0 && enquadramento.altura / enquadramento.largura >= 2.5) {
        const sugerida = `${largura}x${Math.round(largura * 4 / 3)}`;
        anotarDica('silhueta-vertical',
          `silhueta vertical: ocupa ${(enquadramento.largura * 100).toFixed(0)}% da largura do quadro.`
          + ` Para não julgar forma em pouco pixel, tente --res=${sugerida}`, vista);
      }
      if (revisar) {
        const medida = `ocupação ${(enquadramento.area * 100).toFixed(1)}% (${(enquadramento.largura * 100).toFixed(1)}% × ${(enquadramento.altura * 100).toFixed(1)}%)`;
        if (!enquadramento.valida) {
          const codigo = enquadramento.cortado ? 'enquadramento_cortado' : 'enquadramento_pequeno';
          registrar(relato, logger, 'stderr', `\nFALHA DE CÂMERA em ${vista}: ${medida}${enquadramento.cortado ? '; silhueta cortada' : '; ocupação insuficiente após enquadramento automático'}\n  não altere a geometria apenas para preencher o quadro.`);
          falhasRelatadas.push({ categoria: 'camera', codigo, vista, mensagem: enquadramento.cortado ? 'A câmera cortou parte da silhueta.' : 'A câmera deixou a peça pequena demais para revisão.', acao: 'Corrija o enquadramento desta vista sem alterar a geometria da peça.' });
          falhou = true;
        } else registrar(relato, logger, 'stdout', `enquadramento ${vista}: ${medida}`);
      }
      vistasRelatadas.push({
        nome: vistaRelatada,
        enquadramento: {
          valida: enquadramento.valida, area: enquadramento.area, largura: enquadramento.largura,
          altura: enquadramento.altura, cortado: enquadramento.cortado,
        },
        ...(resultadoPar ? { inspecaoDePar: { partes: resultadoPar.partes, vistaEscolhida: resultadoPar.vistaEscolhida, pixels: resultadoPar.pixels, legivel: resultadoPar.legivel } } : {}),
      });
      pecaRelatada = dado.peca;
      progresso.etapa = 'fotografar a vista';
      if (capturarEmMemoria) {
        const dados = await fotografar();
        garantirPrazo();
        progresso.feitas += 1;
        capturas.push({ nome: vistaRelatada, mimeType: 'image/png', largura, altura, dados });
        registrar(relato, logger, 'stdout', `${vistaRelatada.padEnd(11)} memória: ${dados.byteLength} bytes`);
      } else {
        const apelidoEfetivo = apelidoDeArquivo(peca ?? dado.peca);
        const arquivo = join(saida, `bancada-${apelidoEfetivo}-${vista}${sufixo}.png`);
        verificarCaminhoConfinado(arquivo, { raiz: REPO });
        await fotografarParaArquivo(arquivo);
        progresso.feitas += 1;
        registrar(relato, logger, 'stdout', `${vistaRelatada.padEnd(11)} ${arquivo}`);
        if (legendaDeAuditoria?.cores) {
          const legenda = legendaDeAuditoria.legenda.map((e) => `${e.parte}=${e.cor}`).join(' ');
          registrar(relato, logger, 'stdout', `            legenda: ${legenda}`);
          /* A paleta CONFERE a si mesma e diz o que não conseguiu separar.
             Medido na bicicleta: `garfo` e `tirante` saíram a 0,079 de
             distância e o crítico visual cego leu os dois como uma peça só,
             reportando um achado falso com toda a confiança. Paleta que falha
             calada transfere o erro para quem olha; o aviso não decide nada,
             só impede que o silêncio decida. */
          const cores = Object.fromEntries(legendaDeAuditoria.legenda.map((e) => [e.parte, e.cor]));
          const proximos = paresIndistinguiveis(cores);
          if (proximos.length) {
            const lista = proximos.slice(0, 5)
              .map(({ a, b, distancia }) => `${a}~${b} (${distancia.toFixed(3)})`).join(', ');
            const resto = proximos.length > 5 ? `, e mais ${proximos.length - 5}` : '';
            anotarDica('cores-proximas',
              `cores próximas demais para distinguir na imagem: ${lista}${resto}.`
              + ' Isole essas partes por vez em vez de julgá-las nesta vista.', vista);
          }
        }
        registrar(relato, logger, 'stdout', `            local: ${urlReproduzivel}`);
      }
    }
    /* R02 — A VISTA DO PAR ACUSADO SAI COMO IMAGEM, junto das que foram pedidas.
       A rodada anterior fez o contato não declarado reprovar, e a reprovação
       nomeia o par em texto. Texto nomeia; imagem mostra. Quem recebe
       "tuboInferior ↔ rodaDianteiraPneu interpenetram" ainda precisa montar um
       comando para VER — e comando sugerido é tarefa de casa, que é o que esta
       sessão viu ser esquecido três vezes.
       Sem bandeira nova e sem comando novo: sai da mesma chamada.
       O teto existe porque uma peça de 24 partes tem 276 pares; sem ele, a
       primeira peça grande viraria um despejo de imagens que ninguém abre. */
    if (!falhou && !listar && !par && paresAcusados.length && !capturarEmMemoria) {
      const doTeto = paresAcusados.slice(0, TETO_DE_PARES_POR_CHAMADA);
      const excedente = paresAcusados.length - doTeto.length;
      progresso.total += doTeto.length;
      registrar(relato, logger, 'stdout',
        `\npares acusados pela medida (${paresAcusados.length}): capturando ${doTeto.length}`
        + `${excedente > 0 ? `, ${excedente} além do teto de ${TETO_DE_PARES_POR_CHAMADA}` : ''}`);
      for (const alvo of doTeto) {
        /* Esta imagem recarrega a página: a seleção e o isolamento do par vêm da URL, como sempre vieram, e a inspeção mede os
           pixels de cada vista com a interface ainda ligada. Reusar a página de uma vista em auditoria mudaria essa medida. */
        progresso.vista = `par ${alvo.join(' + ')}`;
        paginaSuja = true;
        const urlPar = urlDa('isometrica', { selecionadas: alvo, modo: 'isolar' });
        await abrirComRepeticao(urlPar);
        garantirPrazo();
        const inspecao = await page.evaluate((partes) => window.__mecanificaBancada.inspecionarPar(partes), alvo);
        if (!inspecao?.valida) {
          registrar(relato, logger, 'stdout', `  ${alvo.join(' ↔ ')}: bancada não conseguiu inspecionar — ${inspecao?.motivo ?? 'sem motivo'}`);
          continue;
        }
        /* SEMPRE EM AUDITORIA, mesmo que a chamada não tenha pedido. Esta imagem
           existe para ser LIDA — por quem revisa e pelo crítico cego, que recebe
           só o PNG. A primeira versão capturava com o cromo da bancada ligado, e
           os painéis de interface cobriam justamente o par que a imagem deveria
           mostrar. Cromo aqui não é preferência de estilo: é a prova tapada.
           A ordem repete a do laço principal e pela mesma razão: `auditoria()`
           troca o tamanho do canvas, e a seleção precisa ser reaplicada depois
           dela; o foco vem por último, senão o reenquadre desfaz o zoom. */
        await page.evaluate(
          ([cores, ar]) => window.__mecanificaBancada.auditoria({ cores, arame: ar }),
          [coresPorParte, arame],
        );
        await page.evaluate(([nomes]) => {
          window.__mecanificaBancada.selecionar(nomes);
          window.__mecanificaBancada.modo('isolar');
        }, [alvo]);
        const contato = await page.evaluate((partes) => window.__mecanificaBancada.focarContato(partes), alvo);
        await page.waitForTimeout(espera);
        await pararQuadros();
        garantirPrazo();
        const apelidoEfetivo = apelidoDeArquivo(peca ?? pecaRelatada);
        const arquivo = join(saida, `bancada-${apelidoEfetivo}-par-${alvo.map(apelidoDeArquivo).join('+')}.png`);
        verificarCaminhoConfinado(arquivo, { raiz: REPO });
        await fotografarParaArquivo(arquivo);
        progresso.feitas += 1;
        paresCapturados.push({ par: alvo, vista: inspecao.vistaEscolhida, arquivo, enquadrado: Boolean(contato?.valida) });
        registrar(relato, logger, 'stdout',
          `  ${alvo.join(' ↔ ')} (${inspecao.vistaEscolhida})${contato?.valida ? '' : ' — sem foco de contato'}: ${arquivo}`);
      }
    }

    progresso.etapa = 'reduzir e gravar as imagens';
    await Promise.all(gravacoes);
    garantirPrazo();

    /* A DICA QUE SÓ EXISTE SE TIVER O QUE DIZER. O plano que abriu esta rodada
       classificou a dica como a mais fraca das três defesas, e ela só se paga
       se disparar quando se aplica dizendo algo que ainda não se sabe.
       Por isso NÃO existe aqui uma dica genérica de "isole por pergunta": essa
       instrução já estava escrita, em destaque, em duas skills, foi lida e não
       foi seguida. Repeti-la em prosa seria a quarta tentativa do mesmo tipo.
       A R02 resolveu o problema fazendo — os pares acusados saem isolados como
       imagem sem ninguém precisar lembrar. O que sobra para a dica é o que a
       ferramenta sabe e quem lê não: quanto do acervo de pares ficou fora do
       teto, e por que a imagem pode enganar. */
    if (paresAcusados.length > paresCapturados.length && paresCapturados.length) {
      anotarDica('pares-alem-do-teto',
        `${paresAcusados.length - paresCapturados.length} par(es) acusado(s) ficaram sem imagem nesta chamada.`
        + ' Eles estão todos no veredito de `descrever --estrito`; o teto limita a exibição, nunca a detecção.');
    }
    const dicasListadas = dicas.listar();
    if (dicasListadas.length) {
      registrar(relato, logger, 'stdout', '\ndicas desta chamada:');
      for (const { texto, vistas } of dicasListadas) {
        const onde = vistas.length ? ` (${vistas.join(', ')})` : '';
        registrar(relato, logger, 'stdout', `  • ${texto}${onde}`);
      }
    }

    if (errosDaPagina.length) {
      registrar(relato, logger, 'stderr', `\nerros de página:\n  ${errosDaPagina.join('\n  ')}`);
      falhasRelatadas.push({ categoria: 'ferramenta', codigo: 'erro_da_pagina', vista: null, mensagem: 'A página da bancada emitiu erro durante a captura.', acao: 'Repita a captura depois de corrigir a ferramenta; não remodele a peça.' });
      falhou = true;
    }
    if (relatorio) {
      if (existsSync(relatorio)) {
        registrar(relato, logger, 'stderr', `\nolhar-bancada: --relatorio não sobrescreve '${relative(REPO, relatorio)}'.`);
        falhou = true;
      } else {
        criarDiretorioConfinado(dirname(relatorio), { raiz: REPO });
        verificarCaminhoConfinado(relatorio, { raiz: REPO });
        writeFileSync(relatorio, `${JSON.stringify({ peca: pecaRelatada, resultado: falhou ? 'recusada' : 'aceita', falhas: falhasRelatadas, vistas: vistasRelatadas })}\n`, { encoding: 'utf8', flag: 'wx' });
      }
    }
    const resultado = {
      peca: pecaRelatada, falhas: falhasRelatadas, vistas: vistasRelatadas, arquivos: arquivosPlanejados,
      paresAcusados, paresCapturados, cargasDePagina,
      dicas: dicas.listar(),
      ...(capturarEmMemoria ? { capturas } : {}),
    };
    resposta = {
      ok: !falhou, codigo: falhou ? 1 : 0, erro: falhou ? { categoria: 'bancada', codigo: 'bancada_recusou', mensagem: 'A bancada encerrou a captura sem aceitar a revisão.' } : null,
      stdout: relato.stdout.join(''), stderr: relato.stderr.join(''), resultado,
    };
  } catch (erro) {
    if (expirou || erro?.codigo === 'tempo_esgotado') {
      /* O prazo global derruba a chamada em curso com um erro de página fechada; a mensagem que vale é a do prazo, com a etapa em
         que ele venceu. O prazo de carga já traz a própria. */
      const doPrazo = expirou ? erroDeTempo(Number(timeoutMs), progressoDoPrazo ?? progresso) : erro;
      resposta = erroEstruturado({ relato, erro: doPrazo, resultado: { falhas: falhasRelatadas, progresso: { ...progresso } } });
      resposta.erro.codigo = 'tempo_esgotado';
    } else {
      resposta = erroEstruturado({ relato, erro, resultado: { falhas: falhasRelatadas } });
    }
  } finally {
    if (temporizador) clearTimeout(temporizador);
    await Promise.allSettled(gravacoes);
    const limpezaForcada = encerramentoForcado ? await encerramentoForcado : [];
    if (page && guardarErroDaPagina && typeof page.off === 'function') page.off('pageerror', guardarErroDaPagina);
    /* a página fica para a chamada seguinte só se esta terminou sem falha nem prazo e não a deixou em outro estado */
    const deixarAberta = Boolean(compartilhada && page && !paginaSuja && !expirou && resposta?.ok && reaproveitavelDaChamada);
    if (deixarAberta) compartilhada.pagina = { page, chave: chaveDaPaginaDaChamada };
    const limpeza = [
      ...limpezaForcada,
      ...await fecharRecursos({ browser, vite, pagina: deixarAberta ? null : page, proprios: !compartilhada }),
    ];
    if (sessaoDaCaptura && !compartilhada) rmSync(sessaoDaCaptura, { force: true });
    if (limpeza.length) {
      resposta ??= erroEstruturado({ relato, erro: new Error('A bancada falhou ao fechar seus recursos.') });
      resposta.ok = false;
      resposta.codigo = 1;
      resposta.limpeza = limpeza;
      resposta.erro ??= {
        categoria: 'execucao', codigo: 'falha_limpeza', mensagem: 'A bancada falhou ao fechar seus recursos.',
      };
      resposta.erro.limpeza = limpeza;
    }
  }
  return resposta;
}

function comoCLI(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, {
      opcoes: ['peca', 'vistas', 'selecionadas', 'par', 'modo', 'projecao', 'explosao', 'res', 'espera', 'saida', 'relatorio', 'parte', 'zoom', 'zoom-antes'],
      bandeiras: ['analise', 'listar', 'estrito', 'focar', 'revisar', 'auditoria', 'tela', 'cores', 'arame', 'wireframe', 'raio-x'],
      posicional: { nome: 'a peça', obrigatorio: false },
    });
  } catch (erro) {
    return Promise.resolve(erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso(erro.message) }));
  }
  /* `--raio-x` é o arame transparente, com o que fica atrás à vista; `--arame`
     sozinho é o arame opaco, que esconde o de trás. Os dois servem: o opaco
     mostra a malha da superfície que se vê, o raio X o que está escondido. */
  const arame = lido.bandeira('raio-x') ? 'raio-x' : (lido.bandeira('arame') || lido.bandeira('wireframe'));
  const tela = lido.bandeira('tela');
  /* `--analise`: o passo "Pare e analise" (docs/modelar/usar/PARE-E-ANALISE.md). */
  if (lido.bandeira('analise')) {
    const peca = lido.opcao('peca') ?? lido.posicional;
    return analisarPeca({
      peca, parte: lido.opcao('parte'), zoom: lido.opcao('zoom'), zoomAntes: lido.opcao('zoom-antes'),
      saida: lido.opcao('saida'), res: lido.opcao('res', '1280'), espera: lido.opcao('espera', '1200'), olhar: olharBancada,
    }).then((r) => (r.ok
      ? { ok: true, codigo: 0, stdout: `análise de ${peca}:\n${r.arquivos.map((a) => `  ${a}`).join('\n')}\n`, stderr: '', resultado: { arquivos: r.arquivos } }
      : r), (erro) => erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso(erro.message) }));
  }
  if (tela && (lido.bandeira('cores') || arame || lido.bandeira('auditoria'))) {
    return Promise.resolve(erroEstruturado({
      relato: novoRelato(),
      erro: new ErroDeUso('--tela mostra a interface da bancada; não se mistura com --cores, --arame ou --auditoria.'),
    }));
  }
  return olharBancada({
    peca: lido.opcao('peca') ?? lido.posicional,
    vistas: lido.opcao('vistas'), selecionadas: lido.opcao('selecionadas'), par: lido.opcao('par'),
    modo: lido.opcao('modo'), projecao: lido.opcao('projecao'), explosao: lido.opcao('explosao', '0'),
    res: lido.opcao('res', '1280'), espera: lido.opcao('espera', '1200'), saida: lido.opcao('saida'),
    relatorio: lido.opcao('relatorio'), listar: lido.bandeira('listar'), estrito: lido.bandeira('estrito'),
    focar: lido.bandeira('focar'), revisar: lido.bandeira('revisar'),
    /* SEM INTERFACE POR PADRÃO desde 2026-09-23. Quem usa este comando é quase
       sempre a IA olhando a peça, e a imagem com painéis, cabeçalho, piso e
       grade deixava a peça numa faixa estreita no meio; a imagem limpa
       dependia de lembrar de `--auditoria`. `--tela` (ou `npm run
       bancada:tela`) mostra a interface, para quando o assunto é a própria
       bancada. `--auditoria` continua aceito e não muda nada. */
    auditoria: !tela,
    coresPorParte: lido.bandeira('cores'),
    arame,
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const pedido = process.argv.slice(2).find((a) => a.startsWith('--peca='))?.slice('--peca='.length)
    ?? process.argv.slice(2).find((a) => !a.startsWith('-'));
  const fechar = iniciarRegistro('olhar-bancada', pedido);
  const resultado = await comoCLI(process.argv.slice(2));
  process.stdout.write(resultado.stdout);
  process.stderr.write(resultado.stderr);
  process.exitCode = resultado.codigo;
  /* `arquivos` aqui é a lista PLANEJADA, montada antes da captura. Vai como
     promessa; quem confere o disco é o diário. */
  fechar({
    codigo: resultado.codigo,
    prometeu: resultado.resultado?.arquivos ?? [],
    medidas: resultado.resultado?.vistas
      ? { vistas: resultado.resultado.vistas.length }
      : null,
    erro: resultado.erro?.mensagem ?? null,
  });
}
