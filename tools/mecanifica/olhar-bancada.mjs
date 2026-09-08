#!/usr/bin/env node
/**
 * olhar-bancada.mjs — serviço headless de vistas e sua CLI fina.
 *
 * `olharBancada` recebe configuração explícita, injeta logs opcionalmente e
 * devolve resultado estruturado. Importar este módulo não lê argv, não sobe
 * Vite/Playwright, não grava arquivos e não encerra o processo.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeConfinamento, criarDiretorioConfinado, verificarCaminhoConfinado } from './caminho-confinado.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';
import { iniciarRegistro } from './diario.mjs';
import { ativarReceitaBancada } from './ativar-bancada.mjs';
import { paresIndistinguiveis } from '../../src/bancada/cor-de-auditoria.js';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { contatosDaPeca } from '../../src/autoria/contatos-da-peca.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');
const VISTAS_VALIDAS = ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];
const MODOS = ['todas', 'contexto', 'isolar'];
/* Teto de imagens de par por chamada. Uma peça de 24 partes tem 276 pares; sem
   teto, a primeira peça grande vira um despejo que ninguém abre. Três é o que
   cabe numa leitura sem rolar a tela, e o relato diz quantos ficaram de fora. */
const TETO_DE_PARES_POR_CHAMADA = 3;
const PROJECOES = ['perspectiva', 'ortografica'];

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

async function fecharRecursos({ browser, vite }) {
  const limpeza = [];
  for (const [recurso, instancia] of [['browser', browser], ['vite', vite]]) {
    if (!instancia) continue;
    try {
      await instancia.close();
    } catch (erro) {
      limpeza.push({ recurso, codigo: 'falha_fechamento', mensagem: erro?.message ?? String(erro) });
    }
  }
  return limpeza;
}

function urlPublicadaDa(url) {
  return `https://warbookbr.github.io/nos-mecanifica/bancada.html${new URL(url).search}`;
}

function erroDeTempo(timeoutMs) {
  const erro = new Error(`A bancada excedeu o limite de ${timeoutMs} ms.`);
  erro.codigo = 'tempo_esgotado';
  return erro;
}

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
  let legendaDeAuditoria = null;
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
        encerramentoForcado = fecharRecursos({ browser, vite });
      }, Number(timeoutMs));
    }
    const garantirPrazo = () => {
      if (expirou) throw erroDeTempo(Number(timeoutMs));
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
       2. Uma receita procedural do repositório (ex.: 'mancal-guia', 'prototipos/.../peca.js').
       Se for receita, auto-ativamos a sessão ativa para ela e carregamos a bancada via sessão,
       evitando timeout do Playwright. Se não existir em nenhum dos dois, falha rápido. */
    const FIXTURES_HARNESS = ['fixture-visual', 'fixture-hierarquia', 'fixture-portas', 'fixture-sem-portas'];
    const ehFixtureHarness = Boolean(peca && FIXTURES_HARNESS.includes(peca));

    let caminhoDaReceita = null;
    if (peca && !ehFixtureHarness) {
      let caminhoReceita;
      try {
        caminhoReceita = resolverCaminhoReceita(peca, { raiz: REPO });
        caminhoDaReceita = caminhoReceita;
      } catch {
        erroDeUso(`Peça '${peca}' não encontrada no catálogo de fixtures nem em prototipos/procedural/v3/{pecas,maquinas}/.`);
      }

      if (caminhoReceita) {
        try {
          const ativar = dependencias.ativarReceitaBancada ?? ativarReceitaBancada;
          await ativar({ alvo: caminhoReceita, raiz: REPO });
          if (logger) logger('info', `Peça '${peca}' ativada na sessão da bancada.`);
        } catch (erro) {
          erroDeUso(`Falha ao ativar peça '${peca}' na bancada: ${erro.message}`);
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
      arame ? 'arame' : null,
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
    if (peca && caminhoDaReceita) {
      try {
        const moduloDaPeca = await importarReceita(caminhoDaReceita);
        const receitaDaPeca = receitaDoModulo(moduloDaPeca);
        const { neutro } = executarReceita(receitaDaPeca);
        paresAcusados = contatosDaPeca(neutro, receitaDaPeca).naoDeclarados.map((item) => item.par);
      } catch (erro) {
        registrar(relato, logger, 'stdout',
          `(não consegui medir os contatos desta peça: ${erro.message.split('\n')[0]})`);
      }
    }

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
    /* A entrada publicada pode estar legitimamente vazia. A ferramenta de
       inspeção, porém, precisa de uma peça para provar geometria; por isso usa
       o harness privado, que injeta um catálogo explícito de fixtures. A URL
       pública continua sendo reportada como referência de produto. */
    const base = `http://127.0.0.1:${port}/nos-mecanifica/tools/bancadas/harness.html`;
    const basePublicada = 'https://warbookbr.github.io/nos-mecanifica/bancada.html';
    const carregarPlaywright = dependencias.carregarPlaywright
      ?? (async () => (await import(pathToFileURL(join(REPO, 'node_modules/playwright/index.js')).href)).default);
    const pw = await carregarPlaywright();
    browser = await pw.chromium.launch({
      args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    garantirPrazo();
    const page = await browser.newPage({ viewport: { width: largura, height: altura } });
    const errosDaPagina = [];
    page.on('pageerror', (erro) => errosDaPagina.push(erro.message));
    const abrirComRepeticao = async (url) => {
      for (let tentativa = 1; tentativa <= 2; tentativa++) {
        try {
          await page.goto(url, { waitUntil: 'load' });
          await page.waitForFunction(
            () => typeof window.__mecanificaBancada === 'object' && window.__mecanificaBancada !== null,
            { timeout: 20000 },
          );
          /* A ponte existir não significa que há modelo. A peça da sessão ativa
             chega pelo POLLING do sincronizador, depois do load — ler antes
             devolvia estatísticas nulas e derrubava a revisão visual. Espera o
             modelo de fato entrar na cena; `listar` não precisa de modelo. */
          if (!listar) {
            await page.waitForFunction(
              () => {
                const b = window.__mecanificaBancada;
                if (!b) return false;
                if (b.erro) throw new Error(String(b.erro));
                return b.carregado === true;
              },
              { timeout: 20000 },
            );
          }
          return tentativa;
        } catch (erro) {
          const expirou = erro?.name === 'TimeoutError' || /Timeout/i.test(erro?.message ?? '');
          if (!expirou || tentativa === 2) throw erro;
          await page.goto('about:blank', { waitUntil: 'load' });
        }
      }
      return 2;
    };
    const urlDa = (vista, sobrepor = {}) => {
      const alvos = sobrepor.selecionadas ?? selecionadas;
      const modoAlvo = sobrepor.modo ?? modo;
      const params = new URLSearchParams();
      if (ehFixtureHarness) params.set('peca', peca);
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
    let pecaRelatada = null;
    for (const [indice, vista] of vistas.entries()) {
      const url = urlDa(vista);
      const tentativaDeAbertura = await abrirComRepeticao(url);
      garantirPrazo();
      if (tentativaDeAbertura > 1) registrar(relato, logger, 'stdout', `ferramenta: ${vista} abriu após repetição automática`);
      const dado = await page.evaluate(() => {
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
        if (dado.selecaoIgnorada.length) {
          registrar(relato, logger, 'stderr', `\nNOME DE PARTE INEXISTENTE: ${dado.selecaoIgnorada.join(', ')}\n  a peça expõe: ${dado.partes.join(', ')}`);
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
      if (focar) {
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
      if (auditoria) {
        legendaDeAuditoria = await page.evaluate(
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
        if (selecionadas.length) {
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
      await page.waitForTimeout(espera);
      garantirPrazo();
      const urlReproduzivel = await page.evaluate(() => window.__mecanificaBancada.url());
      const enquadramento = await page.evaluate(() => window.__mecanificaBancada.enquadramento());
      /* Silhueta claramente vertical num quadro deitado: a peça cabe pela
         altura e sobra fundo dos dois lados. O enquadramento está CERTO — quem
         está errado é a proporção do quadro —, então isto é dica, não falha:
         quem julga forma decide se vale recapturar, e ninguém deve mexer na
         geometria por causa de moldura. */
      if (enquadramento.largura > 0 && enquadramento.altura / enquadramento.largura >= 2.5) {
        const sugerida = `${largura}x${Math.round(largura * 4 / 3)}`;
        registrar(relato, logger, 'stdout',
          `  (silhueta vertical: ocupa ${(enquadramento.largura * 100).toFixed(0)}% da largura.`
          + ` Para não julgar forma em pouco pixel, tente --res=${sugerida})`);
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
      if (capturarEmMemoria) {
        const dados = await page.screenshot({ type: 'png' });
        garantirPrazo();
        capturas.push({ nome: vistaRelatada, mimeType: 'image/png', largura, altura, dados });
        registrar(relato, logger, 'stdout', `${vistaRelatada.padEnd(11)} memória: ${dados.byteLength} bytes`);
      } else {
        const apelidoEfetivo = apelidoDeArquivo(peca ?? dado.peca);
        const arquivo = join(saida, `bancada-${apelidoEfetivo}-${vista}${sufixo}.png`);
        verificarCaminhoConfinado(arquivo, { raiz: REPO });
        await page.screenshot({ path: arquivo });
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
            registrar(relato, logger, 'stdout',
              `            ⚠ cores próximas demais para distinguir na imagem: ${lista}${resto}.`
              + ' Isole essas partes por vez em vez de julgá-las nesta vista.');
          }
        }
        registrar(relato, logger, 'stdout', `            local: ${urlReproduzivel}`);
        registrar(relato, logger, 'stdout', `            Pages após publicar este commit: ${urlPublicadaDa(urlReproduzivel)}`);
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
      registrar(relato, logger, 'stdout',
        `\npares acusados pela medida (${paresAcusados.length}): capturando ${doTeto.length}`
        + `${excedente > 0 ? `, ${excedente} além do teto de ${TETO_DE_PARES_POR_CHAMADA}` : ''}`);
      for (const alvo of doTeto) {
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
        garantirPrazo();
        const apelidoEfetivo = apelidoDeArquivo(peca ?? pecaRelatada);
        const arquivo = join(saida, `bancada-${apelidoEfetivo}-par-${alvo.map(apelidoDeArquivo).join('+')}.png`);
        verificarCaminhoConfinado(arquivo, { raiz: REPO });
        await page.screenshot({ path: arquivo });
        paresCapturados.push({ par: alvo, vista: inspecao.vistaEscolhida, arquivo, enquadrado: Boolean(contato?.valida) });
        registrar(relato, logger, 'stdout',
          `  ${alvo.join(' ↔ ')} (${inspecao.vistaEscolhida})${contato?.valida ? '' : ' — sem foco de contato'}: ${arquivo}`);
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
      paresAcusados, paresCapturados,
      ...(capturarEmMemoria ? { capturas } : {}),
    };
    resposta = {
      ok: !falhou, codigo: falhou ? 1 : 0, erro: falhou ? { categoria: 'bancada', codigo: 'bancada_recusou', mensagem: 'A bancada encerrou a captura sem aceitar a revisão.' } : null,
      stdout: relato.stdout.join(''), stderr: relato.stderr.join(''), resultado,
    };
  } catch (erro) {
    if (expirou || erro?.codigo === 'tempo_esgotado') {
      resposta = erroEstruturado({ relato, erro: erroDeTempo(Number(timeoutMs)), resultado: { falhas: falhasRelatadas } });
      resposta.erro.codigo = 'tempo_esgotado';
    } else {
      resposta = erroEstruturado({ relato, erro, resultado: { falhas: falhasRelatadas } });
    }
  } finally {
    if (temporizador) clearTimeout(temporizador);
    const limpezaForcada = encerramentoForcado ? await encerramentoForcado : [];
    const limpeza = [...limpezaForcada, ...await fecharRecursos({ browser, vite })];
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
      opcoes: ['peca', 'vistas', 'selecionadas', 'par', 'modo', 'projecao', 'explosao', 'res', 'espera', 'saida', 'relatorio'],
      bandeiras: ['listar', 'estrito', 'focar', 'revisar', 'auditoria', 'cores', 'arame', 'wireframe'],
      posicional: { nome: 'a peça', obrigatorio: false },
    });
  } catch (erro) {
    return Promise.resolve(erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso(erro.message) }));
  }
  const arame = lido.bandeira('arame') || lido.bandeira('wireframe');
  return olharBancada({
    peca: lido.opcao('peca') ?? lido.posicional,
    vistas: lido.opcao('vistas'), selecionadas: lido.opcao('selecionadas'), par: lido.opcao('par'),
    modo: lido.opcao('modo'), projecao: lido.opcao('projecao'), explosao: lido.opcao('explosao', '0'),
    res: lido.opcao('res', '1280'), espera: lido.opcao('espera', '1200'), saida: lido.opcao('saida'),
    relatorio: lido.opcao('relatorio'), listar: lido.bandeira('listar'), estrito: lido.bandeira('estrito'),
    focar: lido.bandeira('focar'), revisar: lido.bandeira('revisar'),
    /* --cores ou --arame implicam --auditoria: pedir cor ou arame e receber a imagem com
       painel em cima seria entregar metade do que foi pedido. */
    auditoria: lido.bandeira('auditoria') || lido.bandeira('cores') || arame,
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
