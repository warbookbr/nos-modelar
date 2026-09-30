/* Linha de comando do esboço: lê `<nome>.esboco.json`, desenha as opções
   lado a lado com modulos/esboco e grava `<nome>.svg` e `<nome>.png` ao lado.
   Uso: npm run esboco -- <arquivo.esboco.json> */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { desenharEsboco, ErroDeEsboco, VISTAS } from '../../modulos/esboco/src/index.js';
import { descreverAchado, descreverAtravessamento, descreverSilenciado, verificarContato } from '../../modulos/esboco/src/contato.js';
import { descreverGrupoDaProjecao, FATORES_DA_SUGESTAO, verificarProjecao } from '../../modulos/esboco/src/projecao.js';
import { descreverEsboco, diferenca, formatarDescricao } from '../../modulos/esboco/src/descrever.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { ajustarEsboco, formatarAjuste, serializarComoOriginal } from '../../modulos/esboco/src/ajustar.js';
import { recortarAmpliado } from './analise-da-peca.mjs';

/* `navegador` opcional: a análise abre um só para as imagens. */
export async function svgParaPng(svg, largura, altura, destino, navegador = null) {
  const proprio = !navegador;
  if (proprio) navegador = (await (await import('playwright')).default.chromium.launch());
  try {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
    await pagina.setContent(`<body style="margin:0">${svg}</body>`);
    await pagina.screenshot({ path: destino });
    await pagina.close();
  } finally {
    if (proprio) await navegador.close();
  }
}

/* Matriz de conferência: cada vista, com e sem legendas; sem linhas de centro
   por padrão (linhasCentro forçado a false em todos os níveis, sem editar o
   JSON) e, com `--centros`, também com elas. O `ocultar` do arquivo é preservado nos outros elementos; só os
   nomes `legendas` e `linhasCentro` são impostos em todos os níveis. */
export const VISTAS_DA_ANALISE = Object.keys(VISTAS);
export const AMPLIACAO_DO_ZOOM = 3;

/* Escala mínima da explodida em relação à normal da mesma vista. */
export const ESCALA_RELATIVA_MINIMA = 0.6;
const PASSO_DO_FATOR = 0.2;
const FATOR_MINIMO = 1.2;
const arred3 = (x) => Math.round(x * 1000) / 1000;

/* Opacidade das formas na variante "transparente" da análise. */
export const OPACIDADE_TRANSPARENTE = 0.55;

/* `explosoes` (uma entrada por opção: { eixo, fator } ou nula) e `transparente` só valem quando
   pedidos: a análise sempre tira a `explosao` do arquivo das variantes normais, para mostrar a
   geometria como ela é, e a devolve só na variante "explodida". */
export function variante(esboco, { vista, legendas, centros, explosoes, transparente = false, lista = false }) {
  const impor = (lista) => {
    if (lista === undefined) return undefined;
    const s = new Set(lista);
    for (const [nome, ligado] of [['legendas', legendas], ['linhasCentro', centros]]) {
      if (ligado) s.delete(nome); else s.add(nome);
    }
    return [...s];
  };
  const v = JSON.parse(JSON.stringify(esboco));
  v.vista = vista;
  v.linhasCentro = centros;
  v.ocultar = impor(v.ocultar ?? []);
  delete v.explosao;
  if (lista) { v.legendas = 'lista'; for (const o of v.opcoes ?? []) delete o.legendas; }
  for (const [i, o] of (v.opcoes ?? []).entries()) {
    delete o.linhasCentro;
    delete o.explosao;
    if (explosoes?.[i]) o.explosao = { eixo: explosoes[i].eixo, fator: explosoes[i].fator };
    if (o.ocultar !== undefined) o.ocultar = impor(o.ocultar);
    for (const f of o.formas ?? []) {
      if (f.ocultar !== undefined) f.ocultar = impor(f.ocultar);
      if (centros && f.linhaCentro === false) delete f.linhaCentro;
      if (transparente) f.opacidade = OPACIDADE_TRANSPARENTE;
    }
  }
  return v;
}

export function lerZoomDoEsboco(texto) {
  const c = /^([a-z]+):(\d+),(\d+),(\d+),(\d+)$/.exec(String(texto ?? ''));
  if (!c) throw new ErroDeEsboco('--zoom precisa ser <vista>:<x0,y0,x1,y1> em pixels.');
  const [vista, x0, y0, x1, y1] = [c[1], +c[2], +c[3], +c[4], +c[5]];
  if (!VISTAS_DA_ANALISE.includes(vista)) throw new ErroDeEsboco(`--zoom: vista '${vista}' desconhecida (${VISTAS_DA_ANALISE.join(', ')}).`);
  if (x1 <= x0 || y1 <= y0) throw new ErroDeEsboco('--zoom: o recorte precisa ter x1>x0 e y1>y0.');
  return { vista, caixa: [x0, y0, x1, y1] };
}

const semArrasto = ({ arrasta, ...resto }) => resto;
const declaraExplosao = (esboco) => esboco.explosao !== undefined || (esboco.opcoes ?? []).some((o) => o.explosao !== undefined);

/* `sugerir`: propõe a explosão e o deslocamento que zeram a cobertura (custa minutos numa moto densa, e por isso só sob
   pedido). `rapido`: sem imagem e sem navegador, só a leitura em texto e o manifesto. As imagens da análise saem com
   `ladosPorEscala` (menos lados nos círculos), a menos que o esboço declare `"ladosPorEscala": false`. */
export async function analisarEsboco(arquivo, { zoom = null, centros: comCentros = false, sugerir = false, rapido = false } = {}) {
  const caminho = resolve(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const bruto = JSON.parse(texto);
  /* parâmetros, formas herdadas e arranjos já resolvidos: as variantes editam o JSON simples */
  const esboco = expandirEsboco(bruto);
  const contato = verificarContato(esboco);
  const projecao = verificarProjecao(esboco, { forcar: true, sugerir });
  const sugestoes = [
    ...contato.achados.filter((a) => a.sugestao).map((a) => ({ origem: 'contato', opcao: a.opcao, achado: a.tipo, pecas: a.pecas, ...semArrasto(a.sugestao) })),
    ...projecao.achados.filter((a) => a.sugestao).map((a) => ({ origem: 'projecao', opcao: a.opcao, achado: a.tipo, vista: a.vista, pecas: a.pecas, ...semArrasto(a.sugestao) })),
  ];
  const parametros = Object.fromEntries((esboco.opcoes ?? []).flatMap((o, i) => (o?.parametros ? [[o.titulo ?? `Opção ${i + 1}`, o.parametros]] : [])));
  const pedidoDeZoom = zoom ? lerZoomDoEsboco(zoom) : null;
  if (rapido && pedidoDeZoom) throw new ErroDeEsboco('--zoom recorta uma imagem, e --rapido não gera imagem: tire um dos dois.');
  const desenho = { ...esboco, ladosPorEscala: esboco.ladosPorEscala ?? true };
  const pasta = caminho.replace(/(\.esboco)?\.json$/i, '') + '-analise';
  mkdirSync(pasta, { recursive: true });
  const anterior = join(pasta, 'manifesto.json');
  if (existsSync(anterior)) {
    try { for (const a of JSON.parse(readFileSync(anterior, 'utf8')).arquivos ?? []) rmSync(join(pasta, a), { force: true }); } catch { /* manifesto ilegível */ }
    rmSync(anterior, { force: true });
  }
  const navegador = rapido ? null : await (await import('playwright')).default.chromium.launch();
  const arquivos = [];
  const escalas = {};
  const variantes = [];
  try {
    if (!rapido) for (const vista of VISTAS_DA_ANALISE) {
      for (const legendas of [true, false]) {
        for (const centros of (comCentros ? [true, false] : [false])) {
          const { svg, largura, altura, escala } = desenharEsboco(variante(desenho, { vista, legendas, centros }));
          const nome = `${vista}-${legendas ? 'legendas' : 'sem-legendas'}-${centros ? 'centros' : 'sem-centros'}.png`;
          await svgParaPng(svg, largura, altura, join(pasta, nome), navegador);
          arquivos.push(nome);
          escalas[vista] = escala;
        }
      }
    }
    /* Variantes para ler o que se cobre, só quando há achado de projeção ou `explosao` declarada (um esboço sem
       sobreposição gera as mesmas 8 imagens de sempre): "explodida" e "transparente" (todas as formas a
       OPACIDADE_TRANSPARENTE), nas quatro vistas, com legendas e sem centros. */
    const explosoes = (esboco.opcoes ?? []).map((_, i) => {
      const e = projecao.explosao.find((x) => x.indice === i);
      return e ? { eixo: e.eixo, fator: e.fator } : null;
    });
    /* A escala da explodida não pode cair abaixo de ESCALA_RELATIVA_MINIMA da normal: a sugerida perde
       0,2 de fator por vez até caber; a declarada fica como está e só ganha o aviso. */
    const relativas = () => {
      const r = {};
      for (const vista of VISTAS_DA_ANALISE) r[vista] = arred3(desenharEsboco(variante(desenho, { vista, legendas: true, centros: false, explosoes, lista: true })).escala / escalas[vista]);
      return r;
    };
    let relativa = {};
    if (!rapido && projecao.explosao.length > 0) {
      relativa = relativas();
      const sugeridas = () => projecao.explosao.filter((e) => e.origem === 'sugerida' && explosoes[e.indice].fator - PASSO_DO_FATOR >= FATOR_MINIMO - 1e-9);
      while (Math.min(...Object.values(relativa)) < ESCALA_RELATIVA_MINIMA && sugeridas().length > 0) {
        for (const e of sugeridas()) explosoes[e.indice].fator = arred3(explosoes[e.indice].fator - PASSO_DO_FATOR);
        relativa = relativas();
      }
      for (const e of projecao.explosao) {
        e.fator_sugerido = e.fator;
        e.fator = explosoes[e.indice].fator;
        if (e.fator !== e.fator_sugerido) {
          const cop = JSON.parse(texto);
          cop.opcoes[e.indice].explosao = { eixo: e.eixo, fator: e.fator };
          e.achados_depois = verificarProjecao(cop, { forcar: true }).explosao.find((x) => x.indice === e.indice).achados_depois;
          e.converge = e.achados_depois === 0;
        }
        e.escala_relativa = relativa;
        const menor = Math.min(...Object.values(relativa));
        if (menor < ESCALA_RELATIVA_MINIMA) e.aviso = `a escala da explodida cai a ${Math.round(menor * 100)}% da normal, abaixo de ${Math.round(ESCALA_RELATIVA_MINIMA * 100)}%${e.origem === 'declarada' ? ' (explosão declarada, mantida)' : ' mesmo com o menor fator'}`;
      }
    }
    const modos = [];
    if (!rapido && projecao.explosao.length > 0) modos.push(['explodida', { explosoes }]);
    if (!rapido && (projecao.explosao.length > 0 || projecao.achados.length > 0)) modos.push(['transparente', { transparente: true }]);
    for (const [modo, extra] of modos) {
      for (const vista of VISTAS_DA_ANALISE) {
        const { svg, largura, altura } = desenharEsboco(variante(desenho, { vista, legendas: true, centros: false, lista: true, ...extra }));
        const nome = `${vista}-${modo}-legendas.png`;
        await svgParaPng(svg, largura, altura, join(pasta, nome), navegador);
        arquivos.push(nome);
        variantes.push(nome);
      }
    }
  } finally {
    if (navegador) await navegador.close();
  }
  if (pedidoDeZoom) {
    for (const [legendas, centros] of comCentros ? [[true, true], [false, false]] : [[true, false], [false, false]]) {
      const base = `${pedidoDeZoom.vista}-${legendas ? 'legendas' : 'sem-legendas'}-${centros ? 'centros' : 'sem-centros'}.png`;
      const recorte = recortarAmpliado(PNG.sync.read(readFileSync(join(pasta, base))), pedidoDeZoom.caixa, AMPLIACAO_DO_ZOOM);
      const nome = `zoom-${base}`;
      writeFileSync(join(pasta, nome), PNG.sync.write(recorte));
      arquivos.push(nome);
    }
  }
  const manifesto = {
    esboco: createHash('sha256').update(texto).digest('hex'),
    data: new Date().toISOString(),
    vistas: VISTAS_DA_ANALISE,
    zoom: pedidoDeZoom,
    centros: comCentros,
    forcado: { ...(comCentros ? {} : { linhasCentro: false }), ...(declaraExplosao(esboco) ? { explosao: false } : {}), ...(variantes.length > 0 ? { legendasExplodidaTransparente: 'lista' } : {}) },
    plano: typeof esboco.plano === 'string' ? esboco.plano : null,
    ...(Object.keys(parametros).length > 0 ? { parametros } : {}),
    contato,
    sugestoes,
    projecao: { usar: projecao.usar, limiar: projecao.limiar, reprova: projecao.reprova, resultado: projecao.resultado, porVista: projecao.porVista, relatorio: projecao.relatorio, explosao: projecao.explosao, variantes },
    ...(rapido ? { rapido: true } : { desenho: { ladosPorEscala: desenho.ladosPorEscala } }),
    ...(sugerir ? { sugerir: true } : {}),
    escalaPxPorMm: escalas,
    arquivos,
  };
  writeFileSync(anterior, `${JSON.stringify(manifesto, null, 2)}\n`);
  return { pasta, manifesto };
}

/* `rapido`: só o SVG, com menos lados nos círculos (`ladosPorEscala`), sem PNG e sem navegador. O SVG do modo rápido
   é uma prévia: a medida do gate e da projeção continua sobre o esboço completo. */
export async function gerarEsboco(arquivo, { rapido = false } = {}) {
  const caminho = resolve(arquivo);
  const base = caminho.replace(/(\.esboco)?\.json$/i, '');
  const esboco = JSON.parse(readFileSync(caminho, 'utf8'));
  const { svg, largura, altura, escala } = desenharEsboco(rapido ? { ...esboco, ladosPorEscala: esboco.ladosPorEscala ?? true } : esboco);
  const contato = verificarContato(esboco);
  const projecao = verificarProjecao(esboco);
  writeFileSync(`${base}.svg`, svg);
  if (!rapido) await svgParaPng(svg, largura, altura, `${base}.png`);
  return { png: rapido ? null : `${base}.png`, svg: `${base}.svg`, largura, altura, escala, contato, projecao };
}

function relatarContato(c) {
  if (!c.usar) return '';
  const linhas = c.achados.map((a) => `  ${descreverAchado(a)}${a.sugestao ? `\n    sugestão: ${a.sugestao.texto}` : ''}`);
  const atravessa = c.atravessamentos.map((t) => `  ${descreverAtravessamento(t)}`);
  const silenciados = c.silenciados.map((t) => `  ${descreverSilenciado(t)}`);
  const v = (x) => String(x).replace('.', ',');
  return `contato (tolerância ${v(c.tolerancia)} mm, penetração ${v(c.penetracao)} mm, folga ${v(c.folga)} mm): ${c.resultado}\n${linhas.length ? `${linhas.join('\n')}\n` : ''}${atravessa.length ? `atravessamentos declarados:\n${atravessa.join('\n')}\n` : ''}${silenciados.length ? `pares silenciados:\n${silenciados.join('\n')}\n` : ''}`;
}

const virgula = (x) => String(x).replace('.', ',');

/* Relato de projeção: por opção, os grupos de componentes mais graves (o pior achado de cada um), sem os pares de
   espelho nem as folgas pequenas, e o total que ficou de fora. Informativo, a menos que `contato.projecao.reprova`
   seja true. */
function relatarProjecao(p) {
  if (!p.usar) return '';
  const linhas = [];
  for (const r of p.relatorio ?? []) {
    for (const g of r.grupos) linhas.push(`  ${descreverGrupoDaProjecao(g)}${g.pior.sugestao ? `\n    sugestão (só informação): ${g.pior.sugestao.texto}` : ''}`);
    const fora = [];
    if (r.omitidos.grupos > 0) fora.push(`${r.omitidos.grupos} ${r.omitidos.grupos === 1 ? 'grupo mais leve' : 'grupos mais leves'} (${r.omitidos.achados} ${r.omitidos.achados === 1 ? 'achado' : 'achados'}), acima do máximo de ${r.maximo}`);
    if (r.ignorados.espelho > 0) fora.push(`${r.ignorados.espelho} ${r.ignorados.espelho === 1 ? 'par de espelho' : 'pares de espelho'}`);
    if (r.ignorados.folga > 0) fora.push(`${r.ignorados.folga} com folga real abaixo de ${virgula(r.folgaMinima)} mm`);
    if (fora.length > 0) linhas.push(`  [${r.opcao}] fora do relato: ${fora.join('; ')} (contato.projecao.maximo e contato.projecao.folgaMinima mudam isso; os achados completos estão em porVista no manifesto da análise)`);
  }
  const explosao = p.explosao.map((e) => `  explosão ${e.origem} [${e.opcao}]: eixo ${e.eixo}, fator ${virgula(e.fator)}; com ela os ${e.achados_antes} achados de projeção viram ${e.achados_depois}${e.achados_depois > 0 ? ' (resíduo)' : ''}${e.escala_relativa ? `; escala ${Math.round(Math.min(...Object.values(e.escala_relativa)) * 100)}% da normal no mínimo${e.fator_sugerido !== e.fator ? `, fator reduzido de ${virgula(e.fator_sugerido)} para caber` : ''}` : ''}${e.origem === 'sugerida' && e.converge === false ? `; AVISO: a explosão sugerida não converge, e ${e.achados_depois} dos ${e.achados_antes} achados continuam com ela (nenhum fator até ${virgula(FATORES_DA_SUGESTAO[FATORES_DA_SUGESTAO.length - 1])} nos três eixos os zera): reveja a posição das formas em vez de contar com a explosão` : ''}${e.aviso ? `; AVISO: ${e.aviso}` : ''}${e.origem === 'sugerida' ? ' (imagens *-explodida-legendas.png; declare "explosao" no JSON para desenhar assim)' : ''}`);
  return `sobreposição na projeção (limiar ${Math.round(p.limiar * 100)}%${p.reprova ? ', reprova' : ', informativo'}): ${p.resultado}\n${linhas.length ? `${linhas.join('\n')}\n` : ''}${explosao.length ? `${explosao.join('\n')}\n` : ''}`;
}

/* `--descrever`: leitura em texto (ou JSON), sem imagem. Com `mudou`, compara com a leitura gravada em
   `<arquivo>.descrever.json` ao lado do esboço, imprime só a diferença e regrava o arquivo. */
export function descreverArquivo(arquivo, { mudou = false, json = false } = {}) {
  const caminho = resolve(arquivo);
  const atual = descreverEsboco(JSON.parse(readFileSync(caminho, 'utf8')));
  if (!mudou) return { texto: json ? `${JSON.stringify(atual, null, 2)}\n` : formatarDescricao(atual), descricao: atual };
  const memoria = `${caminho}.descrever.json`;
  let anterior = null;
  try { anterior = JSON.parse(readFileSync(memoria, 'utf8')); } catch { /* sem execução anterior, ou ilegível */ }
  writeFileSync(memoria, `${JSON.stringify(atual, null, 2)}\n`);
  if (!anterior) {
    return { texto: json ? `${JSON.stringify({ anterior: false, descricao: atual }, null, 2)}\n` : `sem execução anterior de --descrever --mudou (gravada em ${memoria}); estado completo:\n${formatarDescricao(atual)}`, descricao: atual, primeira: true };
  }
  const d = diferenca(anterior, atual);
  const texto = json ? `${JSON.stringify({ anterior: true, mudancas: d.mudancas, linhas: d.linhas }, null, 2)}\n` : `${d.linhas.length ? d.linhas.join('\n') : 'sem mudanças'}\n`;
  return { texto, descricao: atual, diferenca: d };
}

/* `--ajustar`: grava `<nome>.ajustado.esboco.json` ao lado, com as sugestões de contato aplicadas, e nunca
   toca o original. Sem nenhuma forma movida, não grava nada. */
export function ajustarArquivo(arquivo) {
  const caminho = resolve(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const resultado = ajustarEsboco(JSON.parse(texto));
  const destino = `${caminho.replace(/(\.esboco)?\.json$/i, '')}.ajustado.esboco.json`;
  const moveu = resultado.rodadas.some((r) => !r.descartada && r.movidos.length > 0);
  if (moveu) writeFileSync(destino, serializarComoOriginal(resultado.esboco, texto));
  return { resultado, destino: moveu ? destino : null };
}

async function principal(argv) {
  const alvo = argv.find((a) => !a.startsWith('--'));
  if (!alvo) { process.stderr.write('uso: npm run esboco -- <arquivo.esboco.json> [--estrito] [--descrever [--mudou] [--json]] [--ajustar] [--rapido] [--analise [--sugerir] [--centros] [--zoom=<vista>:x0,y0,x1,y1]]\n'); return 2; }
  const estrito = argv.includes('--estrito');
  try {
    if (argv.includes('--mudou') && !argv.includes('--descrever')) throw new ErroDeEsboco('--mudou só vale junto de --descrever.');
    if (argv.includes('--ajustar')) {
      const { resultado, destino } = ajustarArquivo(alvo);
      process.stdout.write(`${formatarAjuste(resultado, descreverAchado)}\n${destino ? `gravado em ${destino} (o original não foi alterado)` : 'nenhum arquivo gravado'}\n${relatarContato(resultado.final)}`);
      return resultado.aprovado ? 0 : 1;
    }
    if (argv.includes('--descrever')) {
      process.stdout.write(descreverArquivo(alvo, { mudou: argv.includes('--mudou'), json: argv.includes('--json') }).texto);
      return 0;
    }
    if (argv.includes('--analise')) {
      const z = argv.find((a) => a.startsWith('--zoom='));
      const rapido = argv.includes('--rapido');
      const { pasta, manifesto } = await analisarEsboco(alvo, { zoom: z ? z.slice(7) : null, centros: argv.includes('--centros'), sugerir: argv.includes('--sugerir'), rapido });
      const cabecalho = rapido
        ? `análise rápida do esboço: sem imagem (contato e projeção em texto; manifesto em ${pasta})\nRode sem --rapido para gerar as imagens antes de dar o esboço por bom (docs/mecanifica/usar/PARE-E-ANALISE.md).\n`
        : `análise do esboço: ${manifesto.arquivos.length} imagens em ${pasta}\n${manifesto.arquivos.map((a) => `  ${a}`).join('\n')}\nAbra cada imagem antes de dar o esboço por bom (docs/mecanifica/usar/PARE-E-ANALISE.md).\n`;
      process.stdout.write(`${cabecalho}${relatarContato(manifesto.contato)}${relatarProjecao(manifesto.projecao)}${!manifesto.sugerir && Object.values(manifesto.projecao.porVista).some((l) => l.length > 0) && manifesto.projecao.explosao.length === 0 ? 'explosão e deslocamento sugeridos: rode com --sugerir (leva minutos numa moto densa).\n' : ''}`);
      return estrito && (manifesto.contato.resultado === 'reprovado' || manifesto.projecao.resultado === 'reprovado') ? 1 : 0;
    }
    const r = await gerarEsboco(alvo, { rapido: argv.includes('--rapido') });
    process.stdout.write(`esboço ${r.largura}x${r.altura} px, ${r.escala.toFixed(3)} px/mm${r.png ? '' : ' (modo rápido: só o SVG, com menos lados nos círculos)'}\n${r.png ? `  ${r.png}\n` : ''}  ${r.svg}\n${relatarContato(r.contato)}${relatarProjecao(r.projecao)}`);
    return estrito && (r.contato.resultado === 'reprovado' || r.projecao.resultado === 'reprovado') ? 1 : 0;
  } catch (e) {
    if (e.code === 'ENOENT') { process.stderr.write(`esboço recusado: arquivo não encontrado (${alvo})\n`); return 1; }
    if (e instanceof ErroDeEsboco || e instanceof SyntaxError) { process.stderr.write(`esboço recusado: ${e.message}\n`); return 1; }
    throw e;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await principal(process.argv.slice(2));
