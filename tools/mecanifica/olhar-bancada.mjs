#!/usr/bin/env node
/**
 * olhar-bancada.mjs — o OLHO DA BANCADA: dirige `bancada.html` headless pela URL
 * e salva PNG por vista, para que uma sessão sem navegador possa inspecionar o
 * que está modelando.
 *
 * Dirige sempre pela URL (nunca pela API interna): assim cada foto vem com o
 * endereço reproduzível que outra pessoa ou agente abre para ver o mesmo estado.
 *
 *   npm run bancada                                       # peça padrão, 3 vistas
 *   npm run bancada -- freio-disco --vistas=direita,frontal
 *   npm run bancada -- roda-dianteira --revisar           # 4 vistas + gate de enquadramento
 *   npm run bancada -- freio-disco --selecionadas=disco,pinca --modo=contexto
 *   npm run bancada -- freio-disco --explosao=0.4 --projecao=ortografica
 *   npm run bancada -- freio-disco --selecionadas=pastilhaInterna --focar
 *   npm run bancada -- _freio-hierarquia --par=pastilhaInterna,pistao
 *   npm run bancada -- --listar                           # peças disponíveis
 *
 * Saída: tools/bancadas/out/bancada-<peça>-<vista>[-<estado>].png — e o passo
 * seguinte é sempre LER os PNGs (screenshot que ninguém olha é ruído).
 *
 * Sai ≠0 quando a bancada não sobe, quando um nome de parte pedido não existe
 * na peça, com `--estrito` quando a peça tem face sem identidade semântica, ou
 * em `--revisar` quando a geometria sai pequena/cortada em alguma vista.
 *
 * Sai 2 em erro de USO, e bandeira desconhecida É erro de uso: `--vista=` não
 * passa calado por `--vistas=` nem `--estrit` por `--estrito`. A leitura fica em
 * `argumentos.mjs`, compartilhada com `descrever-peca.mjs` — dois CLIs irmãos
 * com validações diferentes são armadilha.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { ErroDeConfinamento, criarDiretorioConfinado, verificarCaminhoConfinado } from './caminho-confinado.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'tools/bancadas/out');

const VISTAS = ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];
const MODOS = ['todas', 'contexto', 'isolar'];
const PROJECOES = ['perspectiva', 'ortografica'];

function erroDeUso(mensagem) {
  console.error(`olhar-bancada: ${mensagem}`);
  process.exit(2);
}

/* vocabulário DECLARADO — o mesmo contrato de `descrever-peca.mjs`: qualquer
   nome fora dele para o comando em vez de virar no-op silencioso. */
let opcao;
let bandeira;
let peca;
try {
  const lido = lerArgumentos(process.argv.slice(2), {
    opcoes: ['vistas', 'selecionadas', 'par', 'modo', 'projecao', 'explosao', 'res', 'espera', 'saida', 'relatorio'],
    bandeiras: ['listar', 'estrito', 'focar', 'revisar'],
    posicional: { nome: 'a peça', obrigatorio: false },
  });
  ({ opcao, bandeira, posicional: peca } = lido);
} catch (erro) {
  erroDeUso(erro.message);
}

const revisar = bandeira('revisar');
const parPedida = opcao('par');
if (revisar && opcao('vistas') != null) erroDeUso('--revisar já define as vistas; não misture com --vistas');
if (parPedida !== null && revisar) erroDeUso('--par é inspeção dirigida; não misture com --revisar.');
if (parPedida !== null && opcao('vistas') !== null) erroDeUso('--par escolhe a vista legível; não misture com --vistas.');
if (parPedida !== null && opcao('selecionadas') !== null) erroDeUso('--par já declara as duas partes; não misture com --selecionadas.');
const selecionadas = (parPedida ?? opcao('selecionadas', ''))
  .split(',').map((s) => s.trim()).filter(Boolean);
const par = parPedida === null ? null : [...new Set(selecionadas)].sort();
if (parPedida !== null && (par.length !== 2 || par.length !== selecionadas.length)) {
  erroDeUso('--par exige exatamente duas partes semânticas diferentes, separadas por vírgula.');
}
if (parPedida !== null && bandeira('focar')) erroDeUso('--par já enquadra as duas partes; não misture com --focar.');
if (parPedida !== null && opcao('modo') !== null && opcao('modo') !== 'isolar') {
  erroDeUso('--par sempre isola o par; não misture com outro --modo.');
}
if (parPedida !== null && opcao('explosao') !== null && Number(opcao('explosao')) !== 0) {
  erroDeUso('--par não aceita explosão: a inspeção não desloca geometria.');
}
const vistas = par ? ['inspecao-par'] : (revisar ? 'isometrica,frontal,direita,superior' : opcao('vistas', 'isometrica,frontal,direita'))
  .split(',').map((v) => v.trim()).filter(Boolean);
const modo = par ? 'isolar' : opcao('modo', 'todas');
const projecao = opcao('projecao', revisar || par ? 'ortografica' : 'perspectiva');
const explosao = Number(opcao('explosao', '0'));
const largura = Math.max(640, parseInt(opcao('res', '1280'), 10) || 1280);
const altura = Math.round(largura * 9 / 16);
const espera = parseInt(opcao('espera', '1200'), 10) || 1200;
const estrito = bandeira('estrito') || revisar;
const focar = bandeira('focar');

/* `--saida` e `--relatorio` existem para o ciclo de modelagem assistida. A
   bancada continua dona da câmera e do gate; o orquestrador apenas escolhe uma
   pasta de artefatos. Nunca aceitamos que este CLI escreva fora do repositório. */
function caminhoInterno(valor, nome) {
  if (valor === null) return null;
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
    /* lstat em cada ancestral existente: caminho lexical dentro do repo não
       autoriza atravessar symlink/junction/reparse point para fora dele. */
    verificarCaminhoConfinado(destino, { raiz: REPO });
  } catch (erro) {
    if (erro instanceof ErroDeConfinamento) erroDeUso(`--${nome} recusado: ${erro.message}`);
    throw erro;
  }
  return destino;
}
const saidaDeclarada = caminhoInterno(opcao('saida'), 'saida');
const relatorioDeclarado = caminhoInterno(opcao('relatorio'), 'relatorio');
if (saidaDeclarada && !peca) erroDeUso('--saida exige o nome da peça.');

for (const vista of vistas) {
  if (vista === 'inspecao-par') continue;
  if (!VISTAS.includes(vista)) erroDeUso(`vista '${vista}' não existe. Use: ${VISTAS.join(', ')}`);
}
if (!MODOS.includes(modo)) erroDeUso(`modo '${modo}' não existe. Use: ${MODOS.join(', ')}`);
if (!PROJECOES.includes(projecao)) erroDeUso(`projeção '${projecao}' não existe. Use: ${PROJECOES.join(', ')}`);
if (!Number.isFinite(explosao) || explosao < 0 || explosao > 1) erroDeUso('explosao precisa estar entre 0 e 1');
/* antes de subir navegador e servidor: `process.exit` não roda o `finally` que
   os fecha, então erro de uso tardio deixava Chromium e Vite pendurados. */
if (focar && !selecionadas.length) erroDeUso('--focar exige --selecionadas');

const PW = join(REPO, 'node_modules/playwright/index.js');
if (!existsSync(PW)) erroDeUso('Playwright não encontrado. Rode: npm ci');

const { createServer } = await import('vite');
const vite = await createServer({
  root: REPO,
  configFile: join(REPO, 'vite.config.js'),
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
await vite.listen();
const { port } = vite.httpServer.address();
const base = `http://127.0.0.1:${port}/nos-mecanifica/bancada.html`;
const basePublicada = 'https://warbookbr.github.io/nos-mecanifica/bancada.html';

const pw = (await import(pathToFileURL(PW).href)).default;
const browser = await pw.chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: largura, height: altura } });
const errosDaPagina = [];
page.on('pageerror', (e) => errosDaPagina.push(e.message));

async function abrirComRepeticao(url) {
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
}

function urlDa(vista) {
  const params = new URLSearchParams();
  if (peca) params.set('peca', peca);
  if (selecionadas.length) params.set('selecionadas', [...selecionadas].sort().join(','));
  if (VISTAS.includes(vista) && vista !== 'isometrica') params.set('vista', vista);
  if (projecao === 'ortografica') params.set('projecao', 'ortografica');
  if (modo !== 'todas') params.set('modo', modo);
  if (explosao > 0) params.set('explosao', explosao.toFixed(2));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function urlPublicadaDa(urlLocal) {
  return `${basePublicada}${new URL(urlLocal).search}`;
}

/* sufixo do arquivo: o estado não-padrão entra no nome, para que duas rodadas
   com estados diferentes não sobrescrevam a mesma foto */
const partesDoSufixo = [
  selecionadas.length ? `sel-${[...selecionadas].sort().join('+')}` : null,
  modo !== 'todas' ? modo : null,
  projecao === 'ortografica' ? 'orto' : null,
  explosao > 0 ? `exp${Math.round(explosao * 100)}` : null,
  par ? 'par' : null,
  focar ? 'focado' : null,
].filter(Boolean);
const sufixo = partesDoSufixo.length ? `-${partesDoSufixo.join('-')}` : '';

const diretorioSaida = saidaDeclarada ?? OUT;
try {
  criarDiretorioConfinado(diretorioSaida, { raiz: REPO });
} catch (erro) {
  if (erro instanceof ErroDeConfinamento) erroDeUso(`--saida recusado: ${erro.message}`);
  throw erro;
}
const arquivosPlanejados = peca ? vistas.map((vista) => join(diretorioSaida, `bancada-${peca}-${vista}${sufixo}.png`)) : [];
for (const arquivo of arquivosPlanejados) {
  try {
    verificarCaminhoConfinado(arquivo, { raiz: REPO });
  } catch (erro) {
    if (erro instanceof ErroDeConfinamento) erroDeUso(`--saida recusado: ${erro.message}`);
    throw erro;
  }
}
if (saidaDeclarada && arquivosPlanejados.some((arquivo) => existsSync(arquivo))) {
  erroDeUso('--saida já contém uma ou mais imagens desta rodada; a bancada não sobrescreve artefato de revisão.');
}
let falhou = false;
const vistasRelatadas = [];
const falhasRelatadas = [];
let pecaRelatada = null;

try {
  for (const [indice, vista] of vistas.entries()) {
    const url = urlDa(vista);
    const tentativaDeAbertura = await abrirComRepeticao(url);
    if (tentativaDeAbertura > 1) console.log(`ferramenta: ${vista} abriu após repetição automática`);
    const relato = await page.evaluate(() => {
      const b = window.__mecanificaBancada;
      return {
        ready: b.ready,
        erro: b.erro ?? null,
        peca: b.peca ?? null,
        partes: b.partes ?? [],
        selecaoIgnorada: b.selecaoIgnorada ?? [],
        diagnosticos: b.diagnosticos ?? null,
        estatisticas: b.estatisticas ?? null,
        estado: b.estado ? b.estado() : null,
      };
    });

    if (!relato.ready) {
      console.error(`\nBANCADA NÃO SUBIU\n  ${relato.erro}\n  ${url}`);
      falhou = true;
      break;
    }

    if (indice === 0) {
      if (bandeira('listar')) {
        const disponiveis = await page.evaluate(() => window.__mecanificaBancada.pecasDisponiveis);
        console.log(`peças disponíveis (${disponiveis.length}):\n  ${disponiveis.join('\n  ')}`);
        break;
      }
      const semParte = relato.diagnosticos?.facesSemParte?.length ?? 0;
      pecaRelatada = relato.peca;
      console.log(`peça: ${relato.peca}`);
      console.log(`partes (${relato.partes.length}): ${relato.partes.join(', ')}`);
      console.log(
        `malha: ${relato.estatisticas.facesNeutras} faces, `
        + `${relato.estatisticas.triangulos} triângulos, `
        + `${semParte} sem identidade`,
      );
      if (relato.selecaoIgnorada.length) {
        console.error(
          `\nNOME DE PARTE INEXISTENTE: ${relato.selecaoIgnorada.join(', ')}`
          + `\n  a peça expõe: ${relato.partes.join(', ')}`,
        );
        falhou = true;
        falhasRelatadas.push({
          categoria: 'modelo', codigo: 'parte_inexistente', vista: null,
          mensagem: 'A seleção pediu parte que a peça não publica.',
          acao: 'Corrija o nome semântico; não substitua por índice ou UUID.',
        });
        break;
      }
      if (semParte && estrito) {
        console.error(`\n${semParte} face(s) sem identidade semântica (--estrito)`);
        falhou = true;
        falhasRelatadas.push({
          categoria: 'modelo', codigo: 'identidade_ausente', vista: null,
          mensagem: 'A peça contém face sem identidade semântica.',
          acao: 'Nomeie a origem ou a parte responsável antes da revisão visual.',
        });
        break;
      }
      console.log('');
    }

    let resultadoPar = null;
    let vistaRelatada = vista;
    if (par) {
      resultadoPar = await page.evaluate((partes) => window.__mecanificaBancada.inspecionarPar(partes), par);
      if (!resultadoPar?.valida) {
        console.error(`\nINSPEÇÃO DE PAR RECUSADA\n  ${resultadoPar?.motivo ?? 'a bancada não devolveu resultado válido.'}`);
        falhou = true;
        falhasRelatadas.push({
          categoria: 'modelo', codigo: 'par_invalido', vista: null,
          mensagem: 'A inspeção de par não recebeu duas partes semânticas válidas.',
          acao: 'Passe exatamente dois nomes publicados pela peça.',
        });
        break;
      }
      vistaRelatada = resultadoPar.vistaEscolhida;
      const leitura = resultadoPar.pixels.map((item) => `${item.nome}: ${item.pixels}px`).join(', ');
      console.log(`inspeção de par: ${resultadoPar.partes.join(' + ')}`);
      console.log(`vista escolhida: ${vistaRelatada} (${leitura})`);
      console.log(`candidatas: ${resultadoPar.candidatas.map((item) => (
        `${item.vista}=${item.menor}px/${item.total}px`
      )).join(', ')}`);
      if (!resultadoPar.legivel) {
        console.error('  diagnóstico: nenhuma vista canônica deixou as duas partes legíveis (mínimo de 64px por parte).');
        falhou = true;
        falhasRelatadas.push({
          categoria: 'camera', codigo: 'par_sem_vista_legivel', vista: vistaRelatada,
          mensagem: 'Nenhuma vista canônica mostrou as duas partes com leitura suficiente.',
          acao: 'Escolha uma vista explicitamente ou revise a peça; a ferramenta não moverá componentes.',
        });
      }
    } else if (focar) {
      await page.evaluate(() => window.__mecanificaBancada.focar());
    }

    await page.waitForTimeout(espera);
    /* A URL é lida DEPOIS do foco/da escolha automática. Antes deste ponto ela
       descrevia a montagem carregada, não a câmera que foi efetivamente usada
       na captura. */
    const urlReproduzivel = await page.evaluate(() => window.__mecanificaBancada.url());
    const enquadramento = await page.evaluate(() => window.__mecanificaBancada.enquadramento());
    if (revisar) {
      const medida = `ocupação ${(enquadramento.area * 100).toFixed(1)}% (${(enquadramento.largura * 100).toFixed(1)}% × ${(enquadramento.altura * 100).toFixed(1)}%)`;
      if (!enquadramento.valida) {
        const codigo = enquadramento.cortado ? 'enquadramento_cortado' : 'enquadramento_pequeno';
        console.error(
          `\nFALHA DE CÂMERA em ${vista}: ${medida}`
          + `${enquadramento.cortado ? '; silhueta cortada' : '; ocupação insuficiente após enquadramento automático'}`
          + '\n  não altere a geometria apenas para preencher o quadro.',
        );
        falhasRelatadas.push({
          categoria: 'camera', codigo, vista,
          mensagem: enquadramento.cortado
            ? 'A câmera cortou parte da silhueta.'
            : 'A câmera deixou a peça pequena demais para revisão.',
          acao: 'Corrija o enquadramento desta vista sem alterar a geometria da peça.',
        });
        falhou = true;
      } else {
        console.log(`enquadramento ${vista}: ${medida}`);
      }
    }
    /* O runtime pode expor detalhes auxiliares de projeção (por exemplo,
       pontos). O transporte para a revisão só leva o contrato público e
       persistível de enquadramento. */
    vistasRelatadas.push({
      nome: vistaRelatada,
      enquadramento: {
        valida: enquadramento.valida,
        area: enquadramento.area,
        largura: enquadramento.largura,
        altura: enquadramento.altura,
        cortado: enquadramento.cortado,
      },
      ...(resultadoPar ? {
        inspecaoDePar: {
          partes: resultadoPar.partes,
          vistaEscolhida: resultadoPar.vistaEscolhida,
          pixels: resultadoPar.pixels,
          legivel: resultadoPar.legivel,
        },
      } : {}),
    });
    pecaRelatada = relato.peca;
    const arquivo = join(diretorioSaida, `bancada-${relato.peca}-${vista}${sufixo}.png`);
    try {
      /* Confere outra vez imediatamente antes do escritor que Playwright usa. */
      verificarCaminhoConfinado(arquivo, { raiz: REPO });
    } catch (erro) {
      if (erro instanceof ErroDeConfinamento) erroDeUso(`--saida recusado: ${erro.message}`);
      throw erro;
    }
    await page.screenshot({ path: arquivo });
    console.log(`${vistaRelatada.padEnd(11)} ${arquivo}`);
    console.log(`            local: ${urlReproduzivel}`);
    console.log(`            Pages após publicar este commit: ${urlPublicadaDa(urlReproduzivel)}`);
  }
} finally {
  await browser.close();
  await vite.close();
}

if (errosDaPagina.length) {
  console.error(`\nerros de página:\n  ${errosDaPagina.join('\n  ')}`);
  falhasRelatadas.push({
    categoria: 'ferramenta', codigo: 'erro_da_pagina', vista: null,
    mensagem: 'A página da bancada emitiu erro durante a captura.',
    acao: 'Repita a captura depois de corrigir a ferramenta; não remodele a peça.',
  });
  falhou = true;
}
if (relatorioDeclarado) {
  if (existsSync(relatorioDeclarado)) {
    console.error(`\nolhar-bancada: --relatorio não sobrescreve '${relative(REPO, relatorioDeclarado)}'.`);
    falhou = true;
  } else {
    try {
      criarDiretorioConfinado(dirname(relatorioDeclarado), { raiz: REPO });
      verificarCaminhoConfinado(relatorioDeclarado, { raiz: REPO });
    } catch (erro) {
      if (erro instanceof ErroDeConfinamento) erroDeUso(`--relatorio recusado: ${erro.message}`);
      throw erro;
    }
    /* Este é transporte efêmero para o orquestrador. Não leva URL com host,
       caminho local ou estado do runtime; a revisão persistida gera a rota
       relativa canônica no seu próprio contrato. */
    writeFileSync(relatorioDeclarado, `${JSON.stringify({
      peca: pecaRelatada,
      resultado: falhou ? 'recusada' : 'aceita',
      falhas: falhasRelatadas,
      vistas: vistasRelatadas,
    })}\n`, { encoding: 'utf8', flag: 'wx' });
  }
}
process.exit(falhou ? 1 : 0);
