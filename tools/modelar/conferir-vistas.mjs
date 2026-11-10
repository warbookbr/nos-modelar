#!/usr/bin/env node
/* conferir-vistas.mjs — a rodada inteira de conferência de um rascunho contra as imagens de referência num comando só: o esboço é
 * montado uma vez, e para cada vista com referência saem as linhas do modelo, o casamento, a captura com luz e a leitura por regiões,
 * e depois a sobra entre as partes declaradas.
 *
 * POR QUE ELE EXISTE. Na traseira da empilhadeira (2026-11-10) quem conduzia rodava, vista por vista, `linhas:modelo`,
 * `casamento:vista`, `leitura:regioes` e `sobra:partes`, além da captura do `esboco:nucleo`, e cada comando montava o esboço de novo,
 * cerca de 50 s por montagem. As bandeiras de cada um (as cores, a classe de cada parte, a caixa e o ignorado da referência) eram as
 * mesmas em todos e se repetiam à mão. Aqui elas ficam numa config, a opção é montada uma vez, e as funções puras dos quatro
 * comandos medem e desenham sobre a mesma malha.
 *
 * O QUE ELE FAZ. Para cada vista da config, na subpasta `<saida>/<vista>/`: `linhas.png` (o desenho de `linhas:modelo`),
 * `casamento.json` e `casamento.png` (as medidas de `casamento:vista`), `captura.png` (o rascunho com cor e luz) e a leitura por
 * regiões (`indice.png`, `folha-NN.png`, `pedido.md`, `leitura.json`), com as linhas como terceiro painel e o `fora` da vista no
 * pedido. Ao fim do pedido entra a ordem sugerida das regiões pela nota do casamento, sem os números. A `captura.png` sai, por padrão
 * (`--captura=rapida`), da vista rápida (`vista-rapida.mjs`), desenhada em JavaScript sobre a mesma opção montada, em um ou dois
 * segundos, com a cor que o esboço pinta em cada parte e, na parte sem cor, a da classe dela na config. Com `--captura=bancada` ela
 * sai da bancada pelo navegador, cerca de um minuto por vista, com duas tentativas. Com `--captura=nenhuma` (ou `--sem-captura`), ou
 * quando a captura falha, o desenho das linhas ocupa o lugar do rascunho com luz, e o resumo e o pedido dizem isso; uma captura que
 * falha não derruba a rodada. O resumo diz de onde veio a imagem de cada vista.
 *
 * Depois, `tres-quartos/` com a vista rápida da opção em quatro direções, de frente pela direita, de frente pela esquerda, de trás
 * pela direita e de trás pela esquerda, todas com a elevação da isométrica da bancada. Elas existem porque o que avança ou recua para
 * o observador numa vista ortográfica só aparece na vizinha (ATRITOS da empilhadeira, item 12), e quem conduz abre as quatro antes de
 * levar a rodada à pessoa; `"tresQuartos": false` na config as desliga. Depois, `sobra/` com o desenho de cada par de `dentro` que
 * passa da tolerância nas `vistasDaSobra`. Em `--saida` ficam `resumo.md`, para quem conduz, e `resumo.json`
 * (`modelar.conferir-vistas@1`), com os mesmos números e os caminhos.
 *
 * O LIMITE. O número ordena as regiões e diz onde olhar primeiro; ele não aprova forma, quem aprova forma é a pessoa. O crítico
 * recebe a ordem e não os números, para ler a região e não a nota.
 *
 * A CONFIG. Um JSON, com os caminhos relativos a ele:
 *   { "objeto": "a traseira de uma máquina", "cores": { "laranja": "#e2641e", ... }, "partes": { "capo": "laranja", ... },
 *     "dentro": { "grade": "capo" }, "vistasDaSobra": ["superior", "direita"], "toleranciaDaSobraMm": 3,
 *     "vistas": { "traseira": { "referencia": "x.png", "caixaRef": [x0, y0, x1, y1], "ignorar": [[x0, y0, x1, y1]],
 *                               "fora": "o eixo e as rodas", "grade": [4, 3], "visto": "de trás" } } }
 * Opcionais: "fundo" (#rrggbb da referência), "largura" (px do raster e das vistas rápidas, 1200), "toleranciaMm" (do casamento,
 * 12, também por vista) e "tresQuartos" (true; false não grava as quatro vistas de três quartos). O valor de "dentro" é uma parte ou
 * uma lista delas.
 *
 * USO
 *   npm run conferir:vistas -- <esboço> --config=<json> --saida=<pasta> [--opcao=1] [--captura=rapida|bancada|nenhuma]
 *     [--vistas=traseira,superior]
 *   npm run conferir:vistas -- --saida=<pasta> --registrar=<vista>:<respostas.json>
 * O primeiro roda a rodada; o segundo repassa as respostas do crítico ao registro da leitura daquela vista. `--sem-captura` vale como
 * `--captura=nenhuma`. Sai 0 quando a rodada rodou, 2 em config ou argumento ruim, e 1 quando o esboço é recusado ou o registro recusa a rodada. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VISTAS_BANCADA } from '../../src/autoria/vistas-da-bancada.js';
import { GRADE_PADRAO, dePng, executar as executarLeitura, gravarLeitura, montarLeitura, paraPng, regioesDaGrade } from './leitura-por-regioes.mjs';
import { desenharLinhas, facesDoNeutro } from './linhas-do-modelo.mjs';
import { LARGURA_PADRAO, TOLERANCIA_PADRAO_MM, desenharCasamento, medirCasamento, paraJson as casamentoParaJson } from './casamento-da-vista.mjs';
import { TOLERANCIA_MM as TOLERANCIA_DA_SOBRA, VISTAS_PADRAO as VISTAS_DA_SOBRA, desenharSobra, sobraEntrePartes } from './sobra-entre-partes.mjs';
import { FUNDO_PADRAO, lerClasses, lerCor } from './perfil-por-cor.mjs';
import { coresDasPartes, facesDaOpcao, rasterSombreado } from './vista-rapida.mjs';

export const FORMATO = 'modelar.conferir-vistas@1';
export const TENTATIVAS_DE_CAPTURA = 2;
export const CAPTURAS = Object.freeze(['rapida', 'bancada', 'nenhuma']);
/* os três quartos: a direção da isométrica da bancada com os sinais de x (direita) e z (frente) trocados, a mesma elevação */
const [ISO_X, ISO_Y, ISO_Z] = VISTAS_BANCADA.isometrica.direcao;
export const TRES_QUARTOS = Object.freeze([
  Object.freeze({ nome: 'frente-direita', texto: 'de frente pela direita', direcao: Object.freeze([ISO_X, ISO_Y, ISO_Z]) }),
  Object.freeze({ nome: 'frente-esquerda', texto: 'de frente pela esquerda', direcao: Object.freeze([-ISO_X, ISO_Y, ISO_Z]) }),
  Object.freeze({ nome: 'tras-direita', texto: 'de trás pela direita', direcao: Object.freeze([ISO_X, ISO_Y, -ISO_Z]) }),
  Object.freeze({ nome: 'tras-esquerda', texto: 'de trás pela esquerda', direcao: Object.freeze([-ISO_X, ISO_Y, -ISO_Z]) }),
]);
const BRANCO = [255, 255, 255];

export class ErroDaConferencia extends Error {
  constructor(mensagem, codigo = 2) { super(mensagem); this.name = 'ErroDaConferencia'; this.codigo = codigo; }
}

/* --- a config ------------------------------------------------------------------------------------------------------------------- */
const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const quatro = (v) => Array.isArray(v) && v.length === 4 && v.every(Number.isFinite);

/**
 * Lê e confere a config. A conferência que depende da opção (as partes) fica em `conferirPartes`. Devolve a config normalizada, com
 * os caminhos absolutos e as imagens de referência lidas; recusa com `ErroDaConferencia` e a lista de campos e motivos.
 */
export function lerConfig(config, pastaDaConfig, { vistasPedidas = null } = {}) {
  const recusas = [];
  const recusa = (campo, motivo) => recusas.push(`${campo}: ${motivo}`);
  if (!ehObjeto(config)) throw new ErroDaConferencia('config: precisa ser um objeto JSON');
  if (config.objeto !== undefined && typeof config.objeto !== 'string') recusa('objeto', 'precisa ser um texto');
  let classes = [];
  if (!ehObjeto(config.cores) || !Object.keys(config.cores).length) recusa('cores', 'precisa ser um objeto { "classe": "#rrggbb" } com pelo menos uma classe');
  else {
    try { classes = lerClasses(Object.entries(config.cores).map(([n, c]) => `${n}:${c}`).join(',')); } catch (e) { recusa('cores', e.message.replace(/--cores/g, 'a lista')); }
  }
  let fundo = FUNDO_PADRAO;
  if (config.fundo !== undefined) { try { fundo = lerCor(config.fundo, 'fundo'); } catch (e) { recusa('fundo', e.message); } }
  const largura = config.largura ?? LARGURA_PADRAO;
  if (!Number.isInteger(largura) || largura < 16) recusa('largura', `espera um inteiro de pelo menos 16 e veio ${JSON.stringify(config.largura)}`);
  const toleranciaMm = config.toleranciaMm ?? TOLERANCIA_PADRAO_MM;
  if (!(Number.isFinite(toleranciaMm) && toleranciaMm >= 0)) recusa('toleranciaMm', 'espera um número não negativo');
  const nomesDasClasses = classes.map((c) => c.nome);
  const partes = {};
  if (!ehObjeto(config.partes) || !Object.keys(config.partes).length) recusa('partes', 'precisa ser um objeto { "parte": "classe" }');
  else for (const [p, c] of Object.entries(config.partes)) {
    if (classes.length && !nomesDasClasses.includes(c)) recusa(`partes.${p}`, `a classe "${c}" não está em cores (${nomesDasClasses.join(', ')})`);
    partes[p] = c;
  }
  const pares = [];
  if (config.dentro !== undefined) {
    if (!ehObjeto(config.dentro)) recusa('dentro', 'precisa ser um objeto { "contida": "continente" }');
    else for (const [a, v] of Object.entries(config.dentro)) {
      const lista = Array.isArray(v) ? v : [v];
      if (!lista.length || lista.some((b) => typeof b !== 'string' || !b)) { recusa(`dentro.${a}`, 'espera o nome de uma parte ou uma lista deles'); continue; }
      for (const b of lista) { if (b === a) recusa(`dentro.${a}`, 'põe a parte dentro dela mesma'); else pares.push([a, b]); }
    }
  }
  const vistasDaSobra = config.vistasDaSobra ?? [...VISTAS_DA_SOBRA];
  if (!Array.isArray(vistasDaSobra) || !vistasDaSobra.length) recusa('vistasDaSobra', 'espera uma lista de vistas');
  else for (const v of vistasDaSobra) if (!VISTAS_BANCADA[v]) recusa('vistasDaSobra', `a vista "${v}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`);
  const tresQuartos = config.tresQuartos ?? true;
  if (typeof tresQuartos !== 'boolean') recusa('tresQuartos', `espera true ou false e veio ${JSON.stringify(config.tresQuartos)}`);
  const toleranciaDaSobraMm = config.toleranciaDaSobraMm ?? TOLERANCIA_DA_SOBRA;
  if (!(Number.isFinite(toleranciaDaSobraMm) && toleranciaDaSobraMm >= 0)) recusa('toleranciaDaSobraMm', 'espera um número não negativo');

  const vistas = [];
  if (!ehObjeto(config.vistas) || !Object.keys(config.vistas).length) recusa('vistas', 'precisa ter pelo menos uma vista com referência');
  else {
    for (const nome of vistasPedidas ?? []) if (!(nome in config.vistas)) recusa('--vistas', `a vista "${nome}" não está na config (${Object.keys(config.vistas).join(', ')})`);
    for (const [nome, v] of Object.entries(config.vistas)) {
      if (vistasPedidas && !vistasPedidas.includes(nome)) continue;
      const campo = `vistas.${nome}`;
      if (!VISTAS_BANCADA[nome]) { recusa(campo, `a vista "${nome}" não existe na bancada (${Object.keys(VISTAS_BANCADA).join(', ')})`); continue; }
      if (!ehObjeto(v)) { recusa(campo, 'precisa ser um objeto'); continue; }
      let referencia = null;
      const caminho = typeof v.referencia === 'string' ? resolve(pastaDaConfig, v.referencia) : null;
      if (!caminho) recusa(`${campo}.referencia`, 'falta o caminho da imagem de referência');
      else if (!existsSync(caminho)) recusa(`${campo}.referencia`, `${caminho} não existe`);
      else { try { referencia = dePng(readFileSync(caminho)); } catch (e) { recusa(`${campo}.referencia`, `${caminho} não é um PNG legível (${e.message})`); } }
      if (!quatro(v.caixaRef) || !(v.caixaRef[2] > v.caixaRef[0] && v.caixaRef[3] > v.caixaRef[1])) recusa(`${campo}.caixaRef`, 'espera [x0, y0, x1, y1] com x1 > x0 e y1 > y0');
      else if (referencia && (v.caixaRef[0] < 0 || v.caixaRef[1] < 0 || v.caixaRef[2] > referencia.largura || v.caixaRef[3] > referencia.altura)) {
        recusa(`${campo}.caixaRef`, `${v.caixaRef.join(',')} está fora da imagem de ${referencia.largura} x ${referencia.altura} px`);
      }
      const ignorar = v.ignorar ?? [];
      if (!Array.isArray(ignorar) || ignorar.some((r) => !quatro(r))) recusa(`${campo}.ignorar`, 'espera uma lista de [x0, y0, x1, y1]');
      const grade = v.grade ?? GRADE_PADRAO;
      if (!Array.isArray(grade) || grade.length !== 2) recusa(`${campo}.grade`, 'espera [colunas, linhas]');
      else { try { regioesDaGrade(100, 100, grade); } catch (e) { recusa(`${campo}.grade`, e.message); } }
      for (const t of ['fora', 'visto']) if (v[t] !== undefined && typeof v[t] !== 'string') recusa(`${campo}.${t}`, 'precisa ser um texto');
      const tol = v.toleranciaMm ?? toleranciaMm;
      if (!(Number.isFinite(tol) && tol >= 0)) recusa(`${campo}.toleranciaMm`, 'espera um número não negativo');
      vistas.push({ nome, referencia, caminhoDaReferencia: caminho, textoDaReferencia: v.referencia, caixaRef: v.caixaRef, ignorar, grade, fora: v.fora ?? null, visto: v.visto ?? null, toleranciaMm: tol });
    }
  }
  if (recusas.length) throw new ErroDaConferencia(`a config foi recusada:\n${recusas.map((r) => `- ${r}`).join('\n')}`);
  return { objeto: config.objeto ?? null, cores: config.cores, classes, fundo, largura, partes, pares, vistasDaSobra, toleranciaDaSobraMm, tresQuartos, vistas };
}

/** Confere as partes da config contra as da opção montada: parte que a opção não tem, parte sem classe e par de `dentro` sem parte. */
export function conferirPartes(cfg, partesDaOpcao) {
  const recusas = [];
  for (const p of Object.keys(cfg.partes)) if (!partesDaOpcao.includes(p)) recusas.push(`partes.${p}: a opção não tem esta parte; as partes dela são ${partesDaOpcao.join(', ')}`);
  const semClasse = partesDaOpcao.filter((p) => cfg.partes[p] === undefined);
  if (semClasse.length) recusas.push(`partes: falta a classe de ${semClasse.join(', ')}`);
  for (const [a, b] of cfg.pares) for (const p of [a, b]) if (!partesDaOpcao.includes(p)) recusas.push(`dentro.${a}: a parte "${p}" não existe na opção (${partesDaOpcao.join(', ')})`);
  if (recusas.length) throw new ErroDaConferencia(`a config foi recusada:\n${[...new Set(recusas)].map((r) => `- ${r}`).join('\n')}`);
}

/* --- a rodada ------------------------------------------------------------------------------------------------------------------- */
const arredonda = (v, casas = 2) => Number(v.toFixed(casas));
const pct = (v) => `${(v * 100).toFixed(1)}%`;

/* a captura de uma vista, com até TENTATIVAS_DE_CAPTURA tentativas; devolve a imagem ou o motivo da falha */
async function capturar(capturador, painel, vista, saida, titulo) {
  let motivo = null;
  for (let k = 1; k <= TENTATIVAS_DE_CAPTURA; k += 1) {
    try {
      await capturador({ paineis: [{ ...painel, rotulos: null }], vista, saida, titulo, cores: false, rodape: 'Captura da conferência das vistas, com a cor dos materiais e a luz da bancada.' });
      return { imagem: dePng(readFileSync(saida)), motivo: null };
    } catch (e) { motivo = String(e?.message ?? e).split('\n')[0]; }
  }
  return { imagem: null, motivo: `a captura falhou ${TENTATIVAS_DE_CAPTURA} vezes (${motivo})` };
}

/* as faces da vista rápida: a cor que o esboço pinta em cada parte e, na parte que sai sem cor (cinza), a da classe dela na config */
function facesDaVistaRapida(cfg, painel) {
  const semCor = Object.entries(coresDasPartes(painel.neutro, painel.partes)).filter(([, c]) => c.origem === 'cinza').map(([n]) => n);
  const sobrepor = Object.fromEntries(semCor.filter((n) => cfg.partes[n] !== undefined).map((n) => [n, cfg.cores[cfg.partes[n]]]));
  return facesDaOpcao(painel.neutro, sobrepor);
}

/* a vista rápida gravada em png; devolve a imagem ou o motivo da falha */
function capturarRapida(facesRapidas, direcao, largura, saida) {
  try {
    const r = rasterSombreado(facesRapidas, { direcao: [...direcao], largura });
    writeFileSync(saida, paraPng(r.imagem));
    return { imagem: r.imagem, motivo: null };
  } catch (e) { return { imagem: null, motivo: `a vista rápida falhou (${String(e?.message ?? e).split('\n')[0]})` }; }
}

const ORIGEM_DA_CAPTURA = {
  rapida: 'da vista rápida (vista-rapida.mjs), desenhada da malha sem navegador, com luz e material simplificados',
  bancada: 'da bancada pelo navegador, com a cor dos materiais e a luz dela',
};

/* o texto acrescentado ao fim do pedido: a ordem sugerida, sem os números */
function ordemNoPedido(ordem, semCaptura) {
  return `${semCaptura ? `
Nesta rodada não houve captura com luz: o painel RASCUNHO mostra o mesmo desenho de linhas do modelo, sobre branco, no lugar do
rascunho. Leia a forma pelo contorno e pelas divisas dele.
` : ''}
Ordem sugerida para ler as regiões, da que a medida acha mais diferente da referência para a que acha menos: ${ordem.join(', ')}.
A ordem só diz por onde começar; responda todas as regiões do mesmo jeito.
`;
}

/** A frase de números de uma região do casamento, para o resumo. */
function frasesDaRegiao(r) {
  const mm = (c) => (c.maiorMm === null ? 'sem px' : `${c.fora} de ${c.px} px fora da tolerância, máximo ${c.maiorMm} mm`);
  const pares = r.troca.pares.map((p) => `${p.referencia} na referência e ${p.modelo} no modelo em ${pct(p.fracao)}`).join('; ');
  return `${r.nome}, nota ${r.nota.toFixed(2)}. Troca de classe em ${pct(r.troca.fracao)} da região${pares ? ` (${pares})` : ''}. Linha sem borda: ${mm(r.linhaSemBorda)}. Borda sem linha: ${mm(r.bordaSemLinha)}.`;
}

/**
 * A rodada. `deps` troca a leitura, a montagem e a captura (o teste conta as montagens e roda sem navegador).
 * @returns {Promise<{ resumo: object, gravados: string[], linhas: string[] }>}
 */
export async function conferirVistas({ arquivo, cfg, saida, opcao = 1, captura: modo = 'rapida' }, deps = {}) {
  if (!CAPTURAS.includes(modo)) throw new ErroDaConferencia(`--captura espera ${CAPTURAS.join(', ')} e veio "${modo}"`);
  const nucleo = deps.lerArquivoDeEsboco && deps.montarOpcoes && (modo !== 'bancada' || deps.capturarLadoALado) ? null : await import('./esboco-nucleo.mjs');
  const lerArquivo = deps.lerArquivoDeEsboco ?? nucleo.lerArquivoDeEsboco;
  const montar = deps.montarOpcoes ?? nucleo.montarOpcoes;
  const capturador = deps.capturarLadoALado ?? nucleo?.capturarLadoALado;
  const t0 = performance.now();
  const montado = montar(await lerArquivo(resolve(arquivo)), { nome: basename(arquivo) });
  const tempoDaMontagem = (performance.now() - t0) / 1000;
  if (montado.recusas?.length) throw new ErroDaConferencia(`o esboço foi recusado:\n${montado.recusas.map((r) => `- ${r.motivo ?? r}`).join('\n')}`, 1);
  const painel = montado.paineis[opcao - 1];
  if (!painel) throw new ErroDaConferencia(`o esboço tem ${montado.paineis.length} opções e veio --opcao=${opcao}`);
  conferirPartes(cfg, painel.partes);
  const faces = facesDoNeutro(painel.neutro, painel.partes);
  const facesRapidas = modo === 'rapida' || cfg.tresQuartos ? facesDaVistaRapida(cfg, painel) : null;
  const pasta = resolve(saida); mkdirSync(pasta, { recursive: true });
  const gravados = []; const linhas = [];
  const rel = (p) => relative(pasta, p).replaceAll('\\', '/');
  const resumo = { formato: FORMATO, esboco: arquivo, opcao, titulo: painel.titulo, nota: 'o número ordena as regiões e informa; quem aprova forma é a pessoa', captura: modo, vistas: {}, tresQuartos: [], sobras: [] };
  const md = [`# Conferência das vistas`, '',
    `Esboço ${arquivo}, opção ${opcao} (${painel.titulo}), montada uma vez para a rodada inteira. O número ordena as regiões e diz onde olhar primeiro; quem aprova forma é a pessoa.`, ''];

  for (const v of cfg.vistas) {
    const dir = join(pasta, v.nome); mkdirSync(dir, { recursive: true });
    const m = medirCasamento({ faces, partes: painel.partes, classeDaParte: cfg.partes, vista: v.nome, largura: cfg.largura, referencia: v.referencia, caixaRef: v.caixaRef, classes: cfg.classes, fundo: cfg.fundo, ignorar: v.ignorar, grade: v.grade, toleranciaMm: v.toleranciaMm });
    const desenho = desenharLinhas({ largura: m.largura, altura: m.altura }, m.mapas.linhas);
    const arq = { linhas: join(dir, 'linhas.png'), casamentoJson: join(dir, 'casamento.json'), casamento: join(dir, 'casamento.png'), captura: join(dir, 'captura.png'), pedido: join(dir, 'pedido.md') };
    writeFileSync(arq.linhas, paraPng(desenho));
    writeFileSync(arq.casamentoJson, `${JSON.stringify(casamentoParaJson(m, { esboco: arquivo, opcao, vista: v.nome, referencia: v.textoDaReferencia, caixaRef: v.caixaRef, ignorar: v.ignorar, cores: cfg.cores, partes: cfg.partes }), null, 1)}\n`);
    writeFileSync(arq.casamento, paraPng(desenharCasamento(m)));
    gravados.push(arq.linhas, arq.casamentoJson, arq.casamento);
    /* a captura, e a leitura sobre ela ou sobre as linhas */
    let captura = { imagem: null, motivo: 'a rodada pediu --captura=nenhuma' };
    if (modo === 'bancada') captura = await capturar(capturador, painel, v.nome, arq.captura, `${painel.titulo}, vista ${v.nome}`);
    if (modo === 'rapida') captura = capturarRapida(facesRapidas, VISTAS_BANCADA[v.nome].direcao, cfg.largura, arq.captura);
    const objeto = [cfg.objeto, v.visto ? `vista ${v.visto}` : null].filter(Boolean).join(', ') || null;
    let leitura = null;
    if (captura.imagem) {
      try { leitura = montarLeitura({ referencia: v.referencia, captura: captura.imagem, caixaRef: v.caixaRef, grade: v.grade, linhas: desenho }); gravados.push(arq.captura); } catch (e) { captura = { imagem: null, motivo: `a leitura não achou a peça na captura (${e.message})` }; }
    }
    if (!leitura) leitura = montarLeitura({ referencia: v.referencia, captura: desenho, caixaRef: v.caixaRef, grade: v.grade, linhas: desenho, painel: [0, 0, desenho.largura, desenho.altura], fundo: BRANCO });
    gravarLeitura(dir, leitura, { referencia: v.textoDaReferencia, captura: captura.imagem ? rel(arq.captura) : rel(arq.linhas), caixaRef: v.caixaRef, grade: v.grade, objeto, fora: v.fora });
    const ordem = [...m.regioes.map((r) => r.nome), ...leitura.regioes.map((r) => r.nome).filter((n) => !m.regioes.some((r) => r.nome === n))];
    writeFileSync(arq.pedido, readFileSync(arq.pedido, 'utf8') + ordemNoPedido(ordem, !captura.imagem));
    gravados.push(join(dir, 'indice.png'), ...leitura.folhas.map((_, i) => join(dir, `folha-${String(i + 1).padStart(2, '0')}.png`)), arq.pedido, join(dir, 'leitura.json'));
    const acima = m.regioes.filter((r) => r.nota > 0);
    const desvio = (m.proporcao.modelo / m.proporcao.referencia - 1) * 100;
    resumo.vistas[v.nome] = {
      proporcao: { referencia: arredonda(m.proporcao.referencia, 4), modelo: arredonda(m.proporcao.modelo, 4) },
      captura: captura.imagem ? { feita: true, origem: modo, arquivo: rel(arq.captura) } : { feita: false, motivo: captura.motivo },
      ordem, ignoradas: m.ignoradas,
      regioes: acima.map((r) => ({ nome: r.nome, nota: r.nota, troca: r.troca, linhaSemBorda: r.linhaSemBorda, bordaSemLinha: r.bordaSemLinha })),
      arquivos: { linhas: rel(arq.linhas), casamento: rel(arq.casamento), casamentoJson: rel(arq.casamentoJson), pedido: rel(arq.pedido), indice: rel(join(dir, 'indice.png')) },
    };
    md.push(`## Vista ${v.nome}`, '',
      `Altura sobre largura: referência ${m.proporcao.referencia.toFixed(3)}, modelo ${m.proporcao.modelo.toFixed(3)} (${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%). Tolerância das linhas ${m.toleranciaMm} mm, ${m.mmPorPx.toFixed(2)} mm por px.`,
      captura.imagem ? `O rascunho com luz está em ${arq.captura}; ele saiu ${ORIGEM_DA_CAPTURA[modo]}.` : `A leitura saiu sem o rascunho com luz: ${captura.motivo}. O desenho das linhas ocupa o lugar dele no painel do rascunho.`,
      ...(m.ignoradas.length ? [`Regiões inteiras no ignorado, fora da conta: ${m.ignoradas.join(', ')}.`] : []), '',
      acima.length ? 'Regiões na ordem da nota, só as de nota acima de zero:' : 'Nenhuma região tem nota acima de zero.', '',
      ...acima.map((r) => `- ${frasesDaRegiao(r)}`), ...(acima.length ? [''] : []),
      `O desenho do casamento está em ${arq.casamento}, e o pedido ao crítico em ${arq.pedido}.`, '');
    linhas.push(`vista ${v.nome}: ${captura.imagem ? `com captura (${modo})` : `sem captura (${captura.motivo})`}; as três regiões de maior nota: ${m.regioes.slice(0, 3).map((r) => `${r.nome} ${r.nota.toFixed(2)}`).join(', ') || 'nenhuma'}`);
  }

  /* os três quartos */
  if (cfg.tresQuartos) {
    const dirTres = join(pasta, 'tres-quartos'); mkdirSync(dirTres, { recursive: true });
    md.push('## Três quartos', '',
      'O que avança ou recua para o observador numa vista ortográfica só aparece na vista vizinha, e por isso a opção também foi desenhada pela vista rápida em quatro direções de três quartos, com a elevação da isométrica da bancada. Abra as quatro antes de levar a rodada à pessoa.', '');
    const falhas = [];
    for (const t of TRES_QUARTOS) {
      const png = join(dirTres, `${t.nome}.png`);
      const r = capturarRapida(facesRapidas, t.direcao, cfg.largura, png);
      if (r.imagem) { gravados.push(png); resumo.tresQuartos.push({ nome: t.nome, visto: t.texto, arquivo: rel(png) }); md.push(`- ${t.texto}: ${png}`); } else { falhas.push(t.nome); md.push(`- ${t.texto}: não saiu, ${r.motivo}.`); }
    }
    md.push('');
    linhas.push(`três quartos: ${falhas.length ? `${TRES_QUARTOS.length - falhas.length} de ${TRES_QUARTOS.length} gravadas, faltam ${falhas.join(', ')}` : `${TRES_QUARTOS.length} vistas gravadas em ${dirTres}`}`);
  }

  /* a sobra entre as partes declaradas */
  md.push('## Sobra entre partes', '');
  if (!cfg.pares.length) md.push('A config não declara pares em "dentro".', '');
  else {
    const dirSobra = join(pasta, 'sobra');
    const r = sobraEntrePartes(faces, painel.partes, cfg.pares, { vistas: cfg.vistasDaSobra, toleranciaMm: cfg.toleranciaDaSobraMm, largura: cfg.largura });
    for (const x of r) {
      let png = null;
      if (x.sobra) { mkdirSync(dirSobra, { recursive: true }); png = join(dirSobra, `${x.vista}-${x.contida}-em-${x.continente}.png`); writeFileSync(png, paraPng(desenharSobra(x))); gravados.push(png); }
      resumo.sobras.push({ vista: x.vista, contida: x.contida, continente: x.continente, maxMm: arredonda(x.maxMm, 1), areaMm2: Math.round(x.areaMm2), passa: x.sobra, ...(png ? { arquivo: rel(png) } : {}) });
      md.push(`- ${x.contida} em ${x.continente}, vista ${x.vista}: sobra máxima ${x.maxMm.toFixed(1)} mm e área ${Math.round(x.areaMm2)} mm², ${x.sobra ? `passa da tolerância de ${cfg.toleranciaDaSobraMm} mm; o desenho está em ${png}.` : `dentro da tolerância de ${cfg.toleranciaDaSobraMm} mm.`}`);
    }
    md.push('');
    const passam = r.filter((x) => x.sobra).length;
    linhas.push(`sobra: ${passam ? `${passam} de ${r.length} passam` : `nenhum dos ${r.length} passa`} da tolerância de ${cfg.toleranciaDaSobraMm} mm`);
  }
  writeFileSync(join(pasta, 'resumo.md'), `${md.join('\n').trimEnd()}\n`);
  writeFileSync(join(pasta, 'resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
  gravados.push(join(pasta, 'resumo.md'), join(pasta, 'resumo.json'));
  return { resumo, gravados, linhas, tempoDaMontagem };
}

/* --- linha de comando ------------------------------------------------------------------------------------------------------------ */
const AJUDA = `npm run conferir:vistas -- <esboço> --config=<json> --saida=<pasta> [--opcao=1] [--captura=rapida|bancada|nenhuma]
    [--vistas=traseira,superior]
npm run conferir:vistas -- --saida=<pasta> --registrar=<vista>:<respostas.json>

Monta a opção do esboço uma vez e, para cada vista da config, grava em <saida>/<vista>/ as linhas do modelo, o casamento com a
referência, a captura com luz e a leitura por regiões, com a ordem sugerida das regiões no fim do pedido; depois a opção em quatro
vistas de três quartos em <saida>/tres-quartos/ (que "tresQuartos": false desliga) e a sobra entre as partes de "dentro". Grava
resumo.md e resumo.json em --saida. A captura sai da vista rápida, sem navegador (rapida, o padrão), da bancada pelo navegador
(bancada) ou não sai (nenhuma, ou --sem-captura), e então as linhas ocupam o lugar dela. A config declara cores, partes, dentro, vistasDaSobra,
toleranciaDaSobraMm e vistas (referencia, caixaRef, ignorar, fora, grade, visto), com caminhos relativos a ela. O número ordena e
informa; quem aprova forma é a pessoa. --registrar repassa as respostas ao registro da leitura daquela vista.`;

export async function executar(argv, deps = {}) {
  const valor = (nome) => { const a = argv.find((x) => x.startsWith(`--${nome}=`)); return a === undefined ? null : a.slice(nome.length + 3); };
  if (argv.includes('--ajuda') || argv.includes('--help') || argv.length === 0) return { codigo: 0, stdout: `${AJUDA}\n`, stderr: '' };
  try {
    const saida = valor('saida');
    if (!saida) throw new ErroDaConferencia('falta --saida=<pasta>');
    if (valor('registrar')) {
      const m = /^([^:]+):(.+)$/.exec(valor('registrar'));
      if (!m) throw new ErroDaConferencia('--registrar espera <vista>:<respostas.json>');
      const dir = join(resolve(saida), m[1]);
      if (!existsSync(join(dir, 'leitura.json'))) throw new ErroDaConferencia(`a vista "${m[1]}" não tem leitura em ${dir}; rode a conferência antes`);
      const r = executarLeitura([`--saida=${dir}`, `--registrar=${m[2]}`]);
      return { codigo: r.codigo, stdout: r.stdout, stderr: r.stderr.replace(/^leitura:regioes: /, 'conferir:vistas: ') };
    }
    const arquivo = argv.find((a) => !a.startsWith('--'));
    if (!arquivo) throw new ErroDaConferencia('falta o esboço');
    if (!existsSync(resolve(arquivo))) throw new ErroDaConferencia(`o esboço ${arquivo} não existe`);
    if (!valor('config')) throw new ErroDaConferencia('falta --config=<json>');
    const caminhoDaConfig = resolve(valor('config'));
    if (!existsSync(caminhoDaConfig)) throw new ErroDaConferencia(`a config ${valor('config')} não existe`);
    let bruta;
    try { bruta = JSON.parse(readFileSync(caminhoDaConfig, 'utf8')); } catch (e) { throw new ErroDaConferencia(`a config não é JSON válido (${e.message})`); }
    const opcao = Number(valor('opcao') ?? 1);
    if (!Number.isInteger(opcao) || opcao < 1) throw new ErroDaConferencia(`--opcao espera um inteiro a partir de 1 e veio "${valor('opcao')}"`);
    const captura = valor('captura') ?? (argv.includes('--sem-captura') ? 'nenhuma' : 'rapida');
    if (!CAPTURAS.includes(captura)) throw new ErroDaConferencia(`--captura espera ${CAPTURAS.join(', ')} e veio "${captura}"`);
    if (argv.includes('--sem-captura') && captura !== 'nenhuma') throw new ErroDaConferencia(`--sem-captura contradiz --captura=${captura}`);
    const vistasPedidas = valor('vistas') ? valor('vistas').split(',').map((s) => s.trim()).filter(Boolean) : null;
    const cfg = lerConfig(bruta, dirname(caminhoDaConfig), { vistasPedidas });
    const t0 = performance.now();
    const r = await conferirVistas({ arquivo, cfg, saida, opcao, captura }, deps);
    const total = (performance.now() - t0) / 1000;
    return { codigo: 0, stdout: `${['conferência das vistas: o número ordena e informa; quem aprova forma é a pessoa.', ...r.linhas, `tempo: ${total.toFixed(1)} s, dos quais ${r.tempoDaMontagem.toFixed(1)} s de montagem`, 'gravado:', ...r.gravados.map((g) => `  ${g}`)].join('\n')}\n`, stderr: '' };
  } catch (erro) {
    if (erro instanceof ErroDaConferencia) return { codigo: erro.codigo, stdout: '', stderr: `conferir:vistas: ${erro.message}\n` };
    if (['ErroDoCasamento', 'ErroDaSobra', 'ErroDaLeitura', 'ErroDoPerfil', 'ErroDaVista'].includes(erro?.name)) return { codigo: 2, stdout: '', stderr: `conferir:vistas: ${erro.message}\n` };
    throw erro;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exitCode = r.codigo;
}
