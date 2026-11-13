#!/usr/bin/env node
/* manual.mjs — `npm run manual -- <montagem.json>`: a lista de peças e o passo a passo de uma montagem persistida.

   Resolve a montagem, escreve a lista (JSON e Markdown), e para cada passo (etapas de `etapas` seguidas da mesma peça formam um passo, salvo --sem-agrupar), na ordem, a lista do que entra
   nele e UMA imagem com o que entra em destaque e as já montadas esmaecidas, tirada por um servidor e um navegador
   abertos uma vez. Escreve `manual.html` (CSS e imagens embutidos) e `manual.json`. O texto do passo é só o que a montagem declara em
   `manual` (instrução e avisos): nada é inventado. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { lerMontagemPersistida } from '../../../src/autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { receitasDaMontagem } from '../../../tools/modelar/etapas-da-montagem.mjs';
import { carregadoresDeReceitas } from '../../../tools/modelar/peca-com-parametros.mjs';
import { REPO } from '../../../tools/modelar/resolver-caminho-receita.mjs';
import { comNomesExibidos, listaEmJson, listaEmMarkdown, listarPecas, nomeDeExibicao } from './lista-de-pecas.js';
import { paginaDoManual } from './pagina.js';
import { montagemDoPasso, passosDaMontagem } from './passos.js';

export const SAIDA_PADRAO = join(REPO, 'tools/bancadas/out');
export const VISTAS = ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior'];

const AJUDA = `uso: npm run manual -- <montagem.json> [opções]

Gera o manual de uma montagem persistida: a lista de peças e os passos, na ordem de 'etapas' (etapas seguidas da mesma
peça viram um passo, com a quantidade), cada um com a imagem do que entra em destaque (laranja) e das já montadas
esmaecidas. Nomes de exibição e instruções vêm do campo 'manual' da montagem; sem ele, o nome é derivado da referência.

opções (todas com =):
  --saida=<pasta>     pasta de saída, dentro do repositório (padrão: tools/bancadas/out/manual-<montagem>/)
  --vista=<nome>      vista de cada passo: ${VISTAS.join(', ')} (padrão: isometrica)
  --folga=<número>    folga do quadro em volta da peça nova, de 0 a 2 (padrão: 1.5)
  --largura=<pixels>  largura da imagem, de 640 a 2560 (padrão: 960)
  --sem-imagens       só a lista e a página, sem abrir o navegador
  --sem-agrupar       um passo por etapa, em vez de um passo para etapas seguidas da mesma peça
  --ajuda             este texto

saída: manual.html, manual.json, lista-de-pecas.json, lista-de-pecas.md e passo-NN.png.`;

function opcoesDe(argv) {
  const opcoes = { agrupar: true, arquivo: null, saida: null, vista: 'isometrica', folga: 1.5, largura: 960, imagens: true, ajuda: false };
  for (const arg of argv) {
    if (arg === '--ajuda' || arg === '-h') opcoes.ajuda = true;
    else if (arg === '--sem-imagens') opcoes.imagens = false;
    else if (arg === '--sem-agrupar') opcoes.agrupar = false;
    else if (arg.startsWith('--saida=')) opcoes.saida = arg.slice(8);
    else if (arg.startsWith('--vista=')) opcoes.vista = arg.slice(8);
    else if (arg.startsWith('--folga=')) opcoes.folga = Number(arg.slice(8));
    else if (arg.startsWith('--largura=')) opcoes.largura = Number(arg.slice(10));
    else if (arg.startsWith('--')) throw new Error(`opção desconhecida '${arg}'. Esperado: --saida=, --vista=, --folga=, --largura=, --sem-imagens, --sem-agrupar ou --ajuda. Rode 'npm run manual -- --ajuda'.`);
    else if (!opcoes.arquivo) opcoes.arquivo = arg;
    else throw new Error(`recebi dois arquivos ('${opcoes.arquivo}' e '${arg}'). Esperado: uma montagem só.`);
  }
  if (!VISTAS.includes(opcoes.vista)) throw new Error(`vista '${opcoes.vista}' desconhecida. Esperado: ${VISTAS.join(', ')}.`);
  if (!Number.isFinite(opcoes.folga) || opcoes.folga < 0 || opcoes.folga > 2) throw new Error(`--folga recebeu um valor fora de 0 a 2. Esperado: número de 0 a 2, por exemplo --folga=1.5.`);
  if (!Number.isInteger(opcoes.largura) || opcoes.largura < 640 || opcoes.largura > 2560) throw new Error('--largura recebeu um valor fora de 640 a 2560. Esperado: inteiro nessa faixa, por exemplo --largura=960.');
  return opcoes;
}

/** Resolve a montagem persistida de um arquivo, com as receitas que ela cita. */
export async function resolverArquivo(arquivo) {
  const dado = JSON.parse(readFileSync(arquivo, 'utf8'));
  const persistida = lerMontagemPersistida(dado);
  const resolvida = await resolverMontagemPersistida(dado, carregadoresDeReceitas(await receitasDaMontagem(persistida)));
  return { persistida, resolvida };
}

function pastaDeSaida(pedida, id) {
  if (!pedida) return join(SAIDA_PADRAO, `manual-${id}`);
  const pasta = resolve(pedida);
  const dentro = relative(REPO, pasta);
  if (dentro.startsWith('..') || isAbsolute(dentro)) {
    throw new Error(`a pasta de saída '${pedida}' fica fora do repositório. Esperado: uma pasta dentro de ${REPO}, por exemplo --saida=tools/bancadas/out/manual-teste.`);
  }
  return pasta;
}

export async function gerarManual(arquivo, opcoes = {}) {
  const { saida: saidaPedida = null, vista = 'isometrica', folga = 1.5, largura = 960, imagens = true, agrupar = true, aoAndar = () => {} } = opcoes;
  const inicio = performance.now();
  const { persistida, resolvida } = await resolverArquivo(arquivo);
  if (!persistida.etapas?.length) {
    throw new Error(`a montagem '${persistida.id}' não declara 'etapas'. Esperado: a lista de ids de instância na ordem de construção (montagem v5).`);
  }
  const nomes = persistida.manual?.nomes ?? {};
  const lista = comNomesExibidos(listarPecas(resolvida), nomes);
  const { passos, foraDasEtapas } = passosDaMontagem(resolvida, persistida.etapas, { agrupar, textos: persistida.manual?.etapas ?? {} });
  const tempos = { resolverMs: Math.round(performance.now() - inicio), imagensMs: [] };
  const pasta = pastaDeSaida(saidaPedida, persistida.id);
  mkdirSync(pasta, { recursive: true });
  const imagemDe = new Map();
  if (imagens) {
    const { abrirCapturador } = await import('./capturador.mjs');
    const capturador = await abrirCapturador();
    try {
      const cache = new Map();
      for (let i = 0; i < passos.length; i += 1) {
        const t0 = performance.now();
        const captura = await capturador.capturar({
          montagem: montagemDoPasso(resolvida, passos, i, cache), vistas: [vista], projecao: 'ortografica', largura, folga, foco: passos[i].etapas,
        });
        if (!captura.ok) throw new Error(`a imagem do passo ${i + 1} ('${passos[i].etapas.join(', ')}') falhou: ${captura.erro.mensagem}`);
        imagemDe.set(i, captura.resultado.capturas[0].dados);
        tempos.imagensMs.push(Math.round(performance.now() - t0));
        aoAndar(i + 1, passos.length, tempos.imagensMs.at(-1));
      }
    } finally {
      await capturador.fechar();
    }
  }
  const arquivosDeImagem = (i) => `passo-${String(i + 1).padStart(2, '0')}.png`;
  for (const [i, dados] of imagemDe) writeFileSync(join(pasta, arquivosDeImagem(i)), dados);
  const manual = {
    montagem: persistida.id,
    lista,
    passos: passos.map((passo, i) => ({
      numero: passo.numero, etapas: passo.etapas, alvo: passo.alvo, nome: nomeDeExibicao(passo.alvo, nomes), quantidade: passo.quantidade,
      lista: comNomesExibidos(passo.lista, nomes), ...(passo.instrucoes ? { instrucoes: passo.instrucoes } : {}), ...(passo.avisos ? { avisos: passo.avisos } : {}),
      ...(imagemDe.has(i) ? { imagem: imagemDe.get(i) } : {}),
    })),
    foraDasEtapas,
  };
  const dadosJson = {
    formato: 'mecanifica.manual', versao: 1, montagem: persistida.id, vista, lista,
    passos: manual.passos.map(({ imagem, ...resto }, i) => ({ ...resto, ...(imagem ? { imagem: arquivosDeImagem(i) } : {}) })),
    foraDasEtapas,
  };
  writeFileSync(join(pasta, 'lista-de-pecas.json'), listaEmJson(lista));
  writeFileSync(join(pasta, 'lista-de-pecas.md'), listaEmMarkdown(lista));
  writeFileSync(join(pasta, 'manual.json'), `${JSON.stringify(dadosJson, null, 2)}\n`);
  writeFileSync(join(pasta, 'manual.html'), paginaDoManual(manual));
  tempos.totalMs = Math.round(performance.now() - inicio);
  return { pasta, pagina: join(pasta, 'manual.html'), manual: dadosJson, tempos };
}

export async function comoCLI(argv) {
  const opcoes = opcoesDe(argv);
  if (opcoes.ajuda) return { codigo: 0, texto: AJUDA };
  if (!opcoes.arquivo) return { codigo: 1, texto: `diga a montagem.\n${AJUDA}` };
  const resultado = await gerarManual(resolve(opcoes.arquivo), {
    saida: opcoes.saida, vista: opcoes.vista, folga: opcoes.folga, largura: opcoes.largura, imagens: opcoes.imagens, agrupar: opcoes.agrupar,
    aoAndar: (n, total, ms) => process.stderr.write(`  passo ${n}/${total}: ${ms} ms\n`),
  });
  const { tempos } = resultado;
  const soma = tempos.imagensMs.reduce((a, b) => a + b, 0);
  return {
    codigo: 0,
    texto: `manual de '${resultado.manual.montagem}': ${resultado.manual.lista.pecas.length} peças distintas, ${resultado.manual.passos.length} passos.\n`
      + `resolver a montagem ${tempos.resolverMs} ms; ${tempos.imagensMs.length} imagens em ${soma} ms`
      + `${tempos.imagensMs.length ? ` (${Math.round(soma / tempos.imagensMs.length)} ms cada)` : ''}; total ${tempos.totalMs} ms.\n${resultado.pagina}`,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  comoCLI(process.argv.slice(2)).then(({ codigo, texto }) => {
    (codigo === 0 ? console.log : console.error)(texto);
    process.exit(codigo);
  }).catch((erro) => {
    console.error(`manual: ${erro.message}`);
    process.exit(1);
  });
}
