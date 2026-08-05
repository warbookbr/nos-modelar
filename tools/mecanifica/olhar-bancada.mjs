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

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');
const VISTAS_VALIDAS = ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];
const MODOS = ['todas', 'contexto', 'isolar'];
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
    if (parPedida !== null && focar) erroDeUso('--par já enquadra as duas partes; não misture com --focar.');
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
    const largura = Math.max(640, parseInt(resDeclarada, 10) || 1280);
    const altura = Math.round(largura * 9 / 16);
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
    if (saidaDeclarada && !peca) erroDeUso('--saida exige o nome da peça.');

    const saida = capturarEmMemoria ? null : (caminhoInterno(saidaDeclarada, 'saida') ?? OUT);
    const relatorio = capturarEmMemoria ? null : caminhoInterno(relatorioDeclarado, 'relatorio');
    const sufixoPartes = [
      selecionadas.length ? `sel-${[...selecionadas].sort().join('+')}` : null,
      modo !== 'todas' ? modo : null,
      projecao === 'ortografica' ? 'orto' : null,
      explosao > 0 ? `exp${Math.round(explosao * 100)}` : null,
      par ? 'par' : null,
      focar ? 'focado' : null,
    ].filter(Boolean);
    const sufixo = sufixoPartes.length ? `-${sufixoPartes.join('-')}` : '';
    if (!capturarEmMemoria) criarDiretorioConfinado(saida, { raiz: REPO });
    const arquivosPlanejados = !capturarEmMemoria && peca
      ? vistas.map((vista) => join(saida, `bancada-${peca}-${vista}${sufixo}.png`))
      : [];
    for (const arquivo of arquivosPlanejados) verificarCaminhoConfinado(arquivo, { raiz: REPO });
    if (saidaDeclarada && arquivosPlanejados.some((arquivo) => existsSync(arquivo))) {
      erroDeUso('--saida já contém uma ou mais imagens desta rodada; a bancada não sobrescreve artefato de revisão.');
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
    const base = `http://127.0.0.1:${port}/nos-mecanifica/bancada.html`;
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
          return tentativa;
        } catch (erro) {
          const expirou = erro?.name === 'TimeoutError' || /Timeout/i.test(erro?.message ?? '');
          if (!expirou || tentativa === 2) throw erro;
          await page.goto('about:blank', { waitUntil: 'load' });
        }
      }
      return 2;
    };
    const urlDa = (vista) => {
      const params = new URLSearchParams();
      if (peca) params.set('peca', peca);
      if (selecionadas.length) params.set('selecionadas', [...selecionadas].sort().join(','));
      if (VISTAS_VALIDAS.includes(vista) && vista !== 'isometrica') params.set('vista', vista);
      if (projecao === 'ortografica') params.set('projecao', 'ortografica');
      if (modo !== 'todas') params.set('modo', modo);
      if (explosao > 0) params.set('explosao', explosao.toFixed(2));
      const query = params.toString();
      return query ? `${base}?${query}` : base;
    };
    let falhou = false;
    const vistasRelatadas = [];
    const capturas = [];
    let pecaRelatada = null;
    for (const [indice, vista] of vistas.entries()) {
      const url = urlDa(vista);
      const tentativaDeAbertura = await abrirComRepeticao(url);
      garantirPrazo();
      if (tentativaDeAbertura > 1) registrar(relato, logger, 'stdout', `ferramenta: ${vista} abriu após repetição automática`);
      const dado = await page.evaluate(() => {
        const b = window.__mecanificaBancada;
        return {
          ready: b.ready, erro: b.erro ?? null, peca: b.peca ?? null, partes: b.partes ?? [],
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
      } else if (focar) {
        await page.evaluate(() => window.__mecanificaBancada.focar());
      }
      await page.waitForTimeout(espera);
      garantirPrazo();
      const urlReproduzivel = await page.evaluate(() => window.__mecanificaBancada.url());
      const enquadramento = await page.evaluate(() => window.__mecanificaBancada.enquadramento());
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
        const arquivo = join(saida, `bancada-${dado.peca}-${vista}${sufixo}.png`);
        verificarCaminhoConfinado(arquivo, { raiz: REPO });
        await page.screenshot({ path: arquivo });
        registrar(relato, logger, 'stdout', `${vistaRelatada.padEnd(11)} ${arquivo}`);
        registrar(relato, logger, 'stdout', `            local: ${urlReproduzivel}`);
        registrar(relato, logger, 'stdout', `            Pages após publicar este commit: ${urlPublicadaDa(urlReproduzivel)}`);
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
      opcoes: ['vistas', 'selecionadas', 'par', 'modo', 'projecao', 'explosao', 'res', 'espera', 'saida', 'relatorio'],
      bandeiras: ['listar', 'estrito', 'focar', 'revisar'],
      posicional: { nome: 'a peça', obrigatorio: false },
    });
  } catch (erro) {
    return Promise.resolve(erroEstruturado({ relato: novoRelato(), erro: new ErroDeUso(erro.message) }));
  }
  return olharBancada({
    peca: lido.posicional,
    vistas: lido.opcao('vistas'), selecionadas: lido.opcao('selecionadas'), par: lido.opcao('par'),
    modo: lido.opcao('modo'), projecao: lido.opcao('projecao'), explosao: lido.opcao('explosao', '0'),
    res: lido.opcao('res', '1280'), espera: lido.opcao('espera', '1200'), saida: lido.opcao('saida'),
    relatorio: lido.opcao('relatorio'), listar: lido.bandeira('listar'), estrito: lido.bandeira('estrito'),
    focar: lido.bandeira('focar'), revisar: lido.bandeira('revisar'),
  });
}

const executadoComoCLI = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const resultado = await comoCLI(process.argv.slice(2));
  process.stdout.write(resultado.stdout);
  process.stderr.write(resultado.stderr);
  process.exitCode = resultado.codigo;
}
