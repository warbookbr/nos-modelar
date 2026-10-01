/* Linha de comando do esboço: lê `<nome>.esboco.json`, desenha as opções
   lado a lado com modulos/esboco e grava `<nome>.svg` e `<nome>.png` ao lado.
   Uso: npm run esboco -- <arquivo.esboco.json> */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { desenharEsboco, ErroDeEsboco, VISTAS } from '../../modulos/esboco/src/index.js';
import { descreverAchado, descreverAtravessamento, descreverSilenciado, verificarContato } from '../../modulos/esboco/src/contato.js';
import { descreverGrupoDaProjecao, FATORES_DA_SUGESTAO, verificarProjecao } from '../../modulos/esboco/src/projecao.js';
import { diferenca, formatarDescricao, formatarForma, formatarResumo, medirEsboco } from '../../modulos/esboco/src/descrever.js';
import { imagemDoAchado } from '../../modulos/esboco/src/achado.js';
import { conferirReferenciaNaOpcao, lerPlano, textoDoPlano, visiveisDoEsboco } from '../../modulos/esboco/src/plano.js';
import { formatarConferencia, formatarMedidasDaReferencia, medidasDaReferencia, sobreposicaoDaReferencia } from '../../modulos/esboco/src/referencia.js';
import { avancar, conferirEnvelope, criarEstado, formatarEnvelope, formatarSituacao, funcaoDaUnidade, LIMITE_DA_FUNCAO, marcarFeito, registrarVeredito, moverEmLote, moverFormas, nomeDoEstagio, planoDeDetalhe, portaoDoEstagio, registrarEnvelope, replanejar, unidadePorNome, unidadesDoEstado } from '../../modulos/esboco/src/condutor.js';
import { detalharUnidade, integrarUnidade } from '../../modulos/esboco/src/detalhe.js';
import { editarEsboco, formatarMudancas } from '../../modulos/esboco/src/editar.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { ajustarEsboco, formatarAjuste, serializarComoOriginal } from '../../modulos/esboco/src/ajustar.js';
import { recortarAmpliado } from './analise-da-peca.mjs';
import { lerReferenciaDeArquivo, referenciasDoEsboco, vistaDoNome } from './esboco-referencia.mjs';

/* Um caminho relativo vale a partir do diretório de quem chamou: `npm run` roda no repositório e deixa esse diretório em
   `INIT_CWD`. Um caminho absoluto fica como está. */
export const resolverCaminho = (caminho) => resolve(process.env.INIT_CWD || process.cwd(), caminho);

/* As unidades do estado do Condutor gravado ao lado do esboço (formaId -> unidade), para o gate relaxar o `atravessa` dentro
   da mesma unidade; vazio sem estado. */
function unidadesGravadas(caminho) {
  try { return unidadesDoEstado(JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8'))); } catch { return {}; }
}

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

/* O SVG na largura pedida em pixels (a proporção e o `viewBox` ficam): { svg, largura, altura }. Sem `largura` devolve o desenho como está. */
export function escalarSvg(svg, largura, altura, pedida = null) {
  if (pedida === null || pedida === undefined) return { svg, largura, altura };
  const w = Math.round(pedida);
  const h = Math.max(1, Math.round((altura * w) / largura));
  return { svg: svg.replace(`width="${largura}" height="${altura}"`, `width="${w}" height="${h}"`), largura: w, altura: h };
}

/* `--largura <px>`: um inteiro entre 200 e 8000. */
export function lerLargura(v) {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 200 || n > 8000) throw new ErroDeEsboco(`--largura precisa de um inteiro de 200 a 8000 (pixels de largura da imagem), e veio "${v}".`);
  return n;
}

/* Matriz de conferência: cada vista, com e sem legendas; sem linhas de centro
   por padrão (linhasCentro forçado a false em todos os níveis, sem editar o
   JSON) e, com `--centros`, também com elas. O `ocultar` do arquivo é preservado nos outros elementos; só os
   nomes `legendas` e `linhasCentro` são impostos em todos os níveis. */
export const VISTAS_DA_ANALISE = Object.keys(VISTAS);
export const AMPLIACAO_DO_ZOOM = 3;
/* A análise gera a imagem de cada divergência até este número; as outras saem com `--achado <n>`. */
export const MAXIMO_DE_IMAGENS_DE_ACHADO = 12;

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
export async function analisarEsboco(arquivo, { zoom = null, centros: comCentros = false, sugerir = false, rapido = false, largura: larguraPedida = null, saida = null } = {}) {
  const caminho = resolverCaminho(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const bruto = JSON.parse(texto);
  /* parâmetros, formas herdadas e arranjos já resolvidos: as variantes editam o JSON simples */
  const esboco = expandirEsboco(bruto);
  const unidades = unidadesGravadas(caminho);
  const contato = verificarContato(esboco, { unidades });
  const projecao = verificarProjecao(esboco, { forcar: true, sugerir });
  const sugestoes = [
    ...contato.achados.filter((a) => a.sugestao).map((a) => ({ origem: 'contato', opcao: a.opcao, achado: a.tipo, pecas: a.pecas, ...semArrasto(a.sugestao) })),
    ...projecao.achados.filter((a) => a.sugestao).map((a) => ({ origem: 'projecao', opcao: a.opcao, achado: a.tipo, vista: a.vista, pecas: a.pecas, ...semArrasto(a.sugestao) })),
  ];
  const parametros = Object.fromEntries((esboco.opcoes ?? []).flatMap((o, i) => (o?.parametros ? [[o.titulo ?? `Opção ${i + 1}`, o.parametros]] : [])));
  /* medidas e contrato do plano estruturado, e a imagem de cada divergência (uma por achado, sem legenda numerada) */
  const { descricao: leitura, divergencias, plano: conferido } = medirEsboco(bruto, { projecao: false, referencias: referenciasDoEsboco(bruto, dirname(caminho)), unidades });
  const planoConferido = typeof esboco.plano === 'object' && esboco.plano !== null ? { nivel: conferido.nivel ?? null, resumo: conferido.resumo, opcoes: conferido.opcoes } : null;
  void leitura;
  const pedidoDeZoom = zoom ? lerZoomDoEsboco(zoom) : null;
  if (rapido && pedidoDeZoom) throw new ErroDeEsboco('--zoom recorta uma imagem, e --rapido não gera imagem: tire um dos dois.');
  const desenho = { ...esboco, ladosPorEscala: esboco.ladosPorEscala ?? true };
  const pasta = saida ? resolverCaminho(saida) : caminho.replace(/(\.esboco)?\.json$/i, '') + '-analise';
  mkdirSync(pasta, { recursive: true });
  const anterior = join(pasta, 'manifesto.json');
  if (existsSync(anterior)) {
    try {
      const velho = JSON.parse(readFileSync(anterior, 'utf8'));
      for (const a of [...(velho.arquivos ?? []), ...(velho.achados ?? []).map((x) => x.arquivo)]) rmSync(join(pasta, a), { force: true });
    } catch { /* manifesto ilegível */ }
    rmSync(anterior, { force: true });
  }
  const navegador = rapido ? null : await (await import('playwright')).default.chromium.launch();
  const arquivos = [];
  const escalas = {};
  const variantes = [];
  const achados = [];
  try {
    if (!rapido) for (const d of divergencias.slice(0, MAXIMO_DE_IMAGENS_DE_ACHADO)) {
      const im = imagemDoAchado(bruto, d);
      const nome = `achado-${d.n}.png`;
      await svgParaPng(im.svg, im.largura, im.altura, join(pasta, nome), navegador);
      achados.push({ n: d.n, opcao: d.opcao, classe: d.classe, texto: d.texto, pecas: d.pecas, arquivo: nome, vista: im.vista, janela_mm: im.janela_mm });
    }
    if (!rapido) for (const vista of VISTAS_DA_ANALISE) {
      for (const legendas of [true, false]) {
        for (const centros of (comCentros ? [true, false] : [false])) {
          const { svg: svg0, largura: l0, altura: a0, escala } = desenharEsboco(variante(desenho, { vista, legendas, centros }));
          const { svg, largura, altura } = escalarSvg(svg0, l0, a0, larguraPedida);
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
        const { svg: svg0, largura: l0, altura: a0 } = desenharEsboco(variante(desenho, { vista, legendas: true, centros: false, lista: true, ...extra }));
        const { svg, largura, altura } = escalarSvg(svg0, l0, a0, larguraPedida);
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
    plano: textoDoPlano(esboco.plano),
    ...(planoConferido ? { planoConferido } : {}),
    ...(achados.length > 0 ? { achados } : {}),
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
  const caminho = resolverCaminho(arquivo);
  const base = caminho.replace(/(\.esboco)?\.json$/i, '');
  const esboco = JSON.parse(readFileSync(caminho, 'utf8'));
  const { svg, largura, altura, escala } = desenharEsboco(rapido ? { ...esboco, ladosPorEscala: esboco.ladosPorEscala ?? true } : esboco);
  const contato = verificarContato(esboco, { unidades: unidadesGravadas(caminho) });
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

/* `--descrever`: leitura em texto (ou JSON), sem imagem. A leitura padrão traz só o total de formas, os parâmetros e as
   divergências em ordem de gravidade; `forma` (um id ou padrão) traz o detalhe de uma forma, e `completo` a leitura de
   todas. Com `mudou`, compara com a leitura completa gravada em `<arquivo>.descrever.json` ao lado do esboço, imprime só a
   diferença e regrava o arquivo. */
export function descreverArquivo(arquivo, { mudou = false, json = false, completo = false, forma = null } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const { descricao: atual, divergencias } = medirEsboco(bruto, { projecao: completo || json || mudou || forma !== null, referencias: referenciasDoEsboco(bruto, dirname(caminho)), unidades: unidadesGravadas(caminho) });
  const leitura = () => (forma !== null ? formatarForma(atual, divergencias, forma) : completo ? formatarDescricao(atual) : formatarResumo(atual, divergencias));
  if (!mudou) return { texto: json ? `${JSON.stringify(atual, null, 2)}\n` : leitura(), descricao: atual, divergencias };
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

/* `--achado <n>`: grava `<nome>-achado-<n>.png` ao lado do esboço, com a divergência de número `n` da leitura padrão:
   o par envolvido colorido, o resto em cinza, sem legenda numerada e com zoom no ponto. */
export async function achadoArquivo(arquivo, n, { vista = 'isometrica' } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const { divergencias } = medirEsboco(bruto, { projecao: false, referencias: referenciasDoEsboco(bruto, dirname(caminho)), unidades: unidadesGravadas(caminho) });
  const d = divergencias.find((x) => x.n === n);
  if (!d) throw new ErroDeEsboco(divergencias.length === 0 ? `--achado ${n}: o esboço não tem divergência para desenhar (a leitura padrão diz "divergências: nenhuma")` : `--achado ${n}: não há a divergência ${n} (a leitura padrão numera de 1 a ${divergencias.length})`);
  const im = imagemDoAchado(bruto, d, { vista });
  const destino = `${caminho.replace(/(\.esboco)?\.json$/i, '')}-achado-${n}.png`;
  await svgParaPng(im.svg, im.largura, im.altura, destino);
  return { destino, divergencia: d, imagem: im };
}

/* `--condutor <arquivo>`: mantém `<arquivo>.condutor.json` (o repositório o ignora) com o estágio atual, as Unidades de
   detalhe, os Marcos e o histórico. Sem ação mostra a situação; `proximo` só avança se o Portão do estágio passa;
   `feito` marca uma unidade; `mover` (com `para` e `motivo`) e `replanejar` (com `motivo`) mudam o agrupamento. Devolve
   { texto, codigo }. */
export function condutorArquivo(arquivo, acao = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const memoria = `${caminho}.condutor.json`;
  let estado = null;
  try { estado = JSON.parse(readFileSync(memoria, 'utf8')); } catch { /* primeira execução, ou ilegível */ }
  const novo = estado === null;
  if (novo && acao.envelope === undefined) estado = criarEstado(bruto, basename(caminho));
  const referencias = referenciasDoEsboco(bruto, dirname(caminho));
  let extra = '';
  let codigo = 0;
  let criticoDe = null;
  if (acao.envelope !== undefined) {
    /* confere a versão detalhada de uma unidade contra o Envelope dela; só grava o resultado num estado que já existe */
    const { unidade, arquivo: detalhado } = acao.envelope;
    const r = conferirEnvelope(bruto, estado, unidade, JSON.parse(readFileSync(resolverCaminho(detalhado), 'utf8')));
    if (!novo) writeFileSync(memoria, `${JSON.stringify(registrarEnvelope(estado, r, basename(detalhado)), null, 2)}\n`);
    return { texto: `${formatarEnvelope(r, basename(detalhado))}${novo ? `o estado do Condutor não existe (${basename(memoria)}): a conferência não foi gravada\n` : ''}`, codigo: r.ok ? 0 : 1, resultado: r };
  }
  if (acao.proximo) {
    const r = avancar(bruto, estado, { referencias });
    estado = r.estado;
    if (r.concluido) extra = 'o fluxo já terminou; não há estágio seguinte\n';
    else if (!r.ok) { codigo = 1; extra = `avanço recusado: o Portão de ${nomeDoEstagio(estado.atual)} não passa; falta:\n${r.portao.falta.map((f) => `  - ${f}`).join('\n')}\n`; }
    else extra = `avançou de ${nomeDoEstagio(estado.historico[estado.historico.length - 1].de)} para ${nomeDoEstagio(estado.atual)}\n`;
  } else if (acao.veredito !== undefined) {
    estado = registrarVeredito(estado, { unidade: acao.veredito, nota: acao.nota, motivo: acao.motivo });
    extra = `veredito do crítico registrado para a unidade ${acao.veredito}: nota ${acao.nota}\n`;
  } else if (acao.feito !== undefined) {
    const jaFeita = estado.unidades?.find((x) => x.id === unidadePorNome(estado.unidades, acao.feito))?.feito === true;
    const r = marcarFeito(bruto, estado, acao.feito);
    estado = r.estado;
    const u = estado.unidades.find((x) => x.id === unidadePorNome(estado.unidades, acao.feito));
    if (!jaFeita && u.membros.length > LIMITE_DA_FUNCAO) criticoDe = u.id;
    extra = `unidade ${acao.feito} marcada como feita\n${r.novosMarcos.map((m) => `marco de ${m.limiar}%${m.saltou?.length ? ` (cruzou também ${m.saltou.map((l) => `${l}%`).join(', ')})` : ''}: chamar o crítico visual sem contexto, com imagens limpas (registrado no estado; o despacho é da skill)\n`).join('')}`;
  } else if (acao.mover !== undefined) {
    /* uma forma, uma instância de componente, um padrão (garfoE.*) ou várias separadas por vírgula */
    const antes = estado.alteracoes.length;
    estado = moverFormas(bruto, estado, { formas: String(acao.mover).split(',').map((x) => x.trim()).filter(Boolean), para: acao.para, motivo: acao.motivo });
    extra = textoDoMovimento(estado.alteracoes.slice(antes), acao.para);
  } else if (acao.moverLote !== undefined) {
    let lista;
    try { lista = JSON.parse(readFileSync(resolverCaminho(acao.moverLote), 'utf8')); } catch (e) {
      if (e instanceof SyntaxError) throw new ErroDeEsboco(`--mover-lote: ${acao.moverLote} não é um JSON válido (${e.message})`);
      throw e;
    }
    const movimentos = Array.isArray(lista) ? lista : lista?.movimentos;
    const antes = estado.alteracoes.length;
    estado = moverEmLote(bruto, estado, movimentos);
    const feitas = estado.alteracoes.length - antes;
    extra = `${feitas} ${feitas === 1 ? 'forma movida' : 'formas movidas'} em ${movimentos.length} ${movimentos.length === 1 ? 'movimento' : 'movimentos'}\n`;
  } else if (acao.replanejar) {
    estado = replanejar(bruto, estado, { motivo: acao.motivo });
    const novas = estado.alteracoes[estado.alteracoes.length - 1].novas ?? [];
    extra = `Plano de detalhe refeito; as formas que continuam existindo ficaram nas unidades em que estavam\n${novas.length ? `formas novas sem unidade declarada (${novas.length}): ${novas.slice(0, 12).map((n) => `${n.forma} em ${n.unidade}`).join(', ')}${novas.length > 12 ? `, e mais ${novas.length - 12}` : ''}; declare "unidade" nelas ou mude com --mover\n` : ''}`;
  }
  writeFileSync(memoria, `${JSON.stringify(estado, null, 2)}\n`);
  const portao = portaoDoEstagio(bruto, estado, { referencias });
  return { texto: `${extra}${novo ? `estado criado em ${memoria}\n` : ''}${formatarSituacao(estado, portao, { historico: acao.historico === true, marcos: acao.feito === undefined })}`, codigo, estado, portao, criticoDe };
}

/* Uma linha com o que o `--mover` fez. */
function textoDoMovimento(movidas, para) {
  if (movidas.length === 1) return `${movidas[0].forma} foi para a unidade ${para}\n`;
  return `${movidas.length} formas foram para a unidade ${para}: ${movidas.slice(0, 8).map((m) => m.forma).join(', ')}${movidas.length > 8 ? `, e mais ${movidas.length - 8}` : ''}\n`;
}

/* `--detalhar <unidade> [arquivo]`: grava o esboço isolado da unidade (as outras com `oculto: true`, plano mínimo) e diz onde.
   Sem `destino` vai para `<nome>-detalhe-<unidade>.esboco.json` ao lado do mestre. */
export function detalharArquivo(arquivo, unidade, destino) {
  const caminho = resolverCaminho(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const bruto = JSON.parse(texto);
  let estado = null;
  try { estado = JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8')); } catch { /* sem estado: vale o Plano de detalhe do esboço */ }
  const d = detalharUnidade(bruto, estado, unidade);
  const saida = destino ? resolverCaminho(destino) : `${caminho.replace(/(\.esboco)?\.json$/i, '')}-detalhe-${unidade.replace(/[^A-Za-z0-9_-]+/g, '-')}.esboco.json`;
  writeFileSync(saida, serializarComoOriginal(d, texto));
  const todas = estado?.unidades?.length ? estado.unidades : planoDeDetalhe(bruto).unidades;
  const u = todas.find((x) => x.id === unidadePorNome(todas, unidade));
  return { destino: saida, unidade: u, texto: `unidade ${unidade} (${u.membros.length} ${u.membros.length === 1 ? 'forma' : 'formas'}) isolada em ${saida}\nas outras unidades estão com "oculto": true; troque as formas da unidade e rode --integrar ${unidade} ${basename(saida)}\n` };
}

/* `--integrar <unidade> <arquivo-detalhado>`: troca no mestre as formas da unidade pelas do detalhado, regrava o mestre e
   mantém o estado do Condutor (a unidade continua, e o Envelope é conferido contra o detalhado). Não grava nada se a troca
   não resolve. */
export function integrarArquivo(arquivo, unidade, detalhado) {
  const caminho = resolverCaminho(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const bruto = JSON.parse(texto);
  const memoria = `${caminho}.condutor.json`;
  let estado = null;
  try { estado = JSON.parse(readFileSync(memoria, 'utf8')); } catch { /* sem estado */ }
  const r = integrarUnidade(bruto, estado, unidade, JSON.parse(readFileSync(resolverCaminho(detalhado), 'utf8')), { arquivo: basename(detalhado) });
  writeFileSync(caminho, serializarComoOriginal(r.mestre, texto));
  if (r.estado) writeFileSync(memoria, `${JSON.stringify(r.estado, null, 2)}\n`);
  const L = [`unidade ${unidade} integrada em ${basename(caminho)}: ${r.formas.length} ${r.formas.length === 1 ? 'forma' : 'formas'} (${r.formas.slice(0, 8).join(', ')}${r.formas.length > 8 ? ', ...' : ''})`];
  const { pares, juntas, pecas } = r.removidos;
  if (pares + juntas + pecas > 0) L.push(`removido do contato por citar formas que saíram: ${pares} ${pares === 1 ? 'par' : 'pares'}, ${juntas} ${juntas === 1 ? 'junta' : 'juntas'}, ${pecas} ${pecas === 1 ? 'peça' : 'peças'} de junta`);
  L.push(r.estado ? 'o estado do Condutor foi mantido (a unidade continua onde estava)' : `sem estado do Condutor (${basename(memoria)}): só o esboço foi regravado`);
  return { texto: `${L.join('\n')}\n${r.envelope ? formatarEnvelope(r.envelope, basename(detalhado)) : ''}`, resultado: r };
}

/* `--unidade <nome> [--vista <vista>]`: grava `<nome-do-arquivo>-unidade-<nome>-<vista>.png` ao lado do esboço com a unidade
   isolada (as outras formas ocultas, o quadro ajustado à unidade, sem legenda nem linha de centro), nas quatro vistas ou só
   na pedida. É a imagem limpa para o crítico visual cego por unidade. Devolve { destinos, unidade }. */
export async function unidadeArquivo(arquivo, unidade, { vista = null, largura: larguraPedida = null, saida = null } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  let estado = null;
  try { estado = JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8')); } catch { /* sem estado: vale o Plano de detalhe do esboço */ }
  if (vista !== null && !VISTAS_DA_ANALISE.includes(vista)) throw new ErroDeEsboco(`--unidade: vista '${vista}' desconhecida (${VISTAS_DA_ANALISE.join(', ')}).`);
  const isolado = expandirEsboco(detalharUnidade(bruto, estado, unidade));
  const todas = estado?.unidades?.length ? estado.unidades : planoDeDetalhe(bruto).unidades;
  const u = todas.find((x) => x.id === unidadePorNome(todas, unidade));
  let base = caminho.replace(/(\.esboco)?\.json$/i, '');
  if (saida) { mkdirSync(resolverCaminho(saida), { recursive: true }); base = join(resolverCaminho(saida), basename(base)); }
  const nome = unidade.replace(/[^A-Za-z0-9_-]+/g, '-');
  const navegador = await (await import('playwright')).default.chromium.launch();
  const destinos = [];
  try {
    for (const v of vista === null ? VISTAS_DA_ANALISE : [vista]) {
      const { svg: svg0, largura: l0, altura: a0 } = desenharEsboco(variante({ ...isolado, ladosPorEscala: isolado.ladosPorEscala ?? true }, { vista: v, legendas: false, centros: false }));
      const { svg, largura, altura } = escalarSvg(svg0, l0, a0, larguraPedida);
      const destino = `${base}-unidade-${nome}-${v}.png`;
      await svgParaPng(svg, largura, altura, destino, navegador);
      destinos.push(destino);
    }
  } finally {
    await navegador.close();
  }
  return { destinos, unidade: u, texto: `unidade ${u.id} (${u.membros.length} ${u.membros.length === 1 ? 'forma' : 'formas'}) isolada, sem legenda, em ${destinos.length} ${destinos.length === 1 ? 'vista' : 'vistas'}:\n${destinos.map((d) => `  ${d}`).join('\n')}\n` };
}

/* As cinco perguntas fixas do crítico visual cego por unidade. */
export const PERGUNTAS_DO_CRITICO = [
  'Que pontas ficam no ar, sem encostar em nada?',
  'O que atravessa o quê, sem que a forma explique a travessia?',
  'O que está fora do lugar em relação à parte a que deveria estar preso?',
  'O que a vista mostra que o nome da peça não explica?',
  'Nota de 0 a 10 para a unidade como parte do objeto, com a razão da nota em uma frase.',
];
export const LARGURA_DO_CRITICO = 1100;

/* O brief pronto para o crítico cego de uma unidade grande: gera as quatro vistas `--unidade` numa pasta (`--saida`, ou
   `<nome>-critico-<unidade>` ao lado do esboço) e devolve o texto a passar ao agente `critico-visual`, que é despachado pela
   skill (o comando não despacha agente). */
export async function briefDoCritico(arquivo, unidade, { largura = null, saida = null } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const pasta = saida ?? `${caminho.replace(/(\.esboco)?\.json$/i, '')}-critico-${unidade.replace(/[^A-Za-z0-9_-]+/g, '-')}`;
  const r = await unidadeArquivo(arquivo, unidade, { largura: largura ?? LARGURA_DO_CRITICO, saida: pasta });
  const funcao = funcaoDaUnidade(bruto, r.unidade.id);
  const L = [`crítico por unidade: a unidade ${r.unidade.id} (${r.unidade.membros.length} formas) tem mais de ${LIMITE_DA_FUNCAO} formas e precisa do crítico cego antes de a próxima começar.`];
  L.push('Despache o agente critico-visual (Sonnet) com o brief abaixo e as quatro imagens, sem o JSON, o plano nem o histórico; depois registre o veredito: --condutor --veredito <unidade> --nota <0-10> --motivo <o que ele apontou>.');
  L.push('--- brief para o crítico cego ---');
  L.push(`Função da unidade: ${funcao ?? '(não declarada)'}`);
  L.push('Imagens (as quatro vistas da unidade isolada, sem legenda):');
  for (const d of r.destinos) L.push(`  ${d}`);
  L.push('Responda, olhando só as imagens:');
  PERGUNTAS_DO_CRITICO.forEach((p, i) => L.push(`  ${i + 1}. ${p}`));
  L.push('--- fim do brief ---');
  return { texto: `${L.join('\n')}\n`, destinos: r.destinos, pasta, funcao };
}

/* `--editar <arquivo> <forma>.<campo>=<valor> ...`, `--remover <forma>` e `--adicionar <json-da-forma>`: muda o JSON declarado
   sem regravá-lo à mão. Só grava se o esboço editado passa pelo esquema e resolve; sem isso diz o campo e o válido e não
   toca o arquivo. Imprime as mudanças e a leitura padrão das divergências depois delas. */
export function editarArquivo(arquivo, { atribuicoes = [], remover = [], adicionar = [] } = {}) {
  const caminho = resolverCaminho(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  if (atribuicoes.length + remover.length + adicionar.length === 0) throw new ErroDeEsboco('--editar precisa de pelo menos uma edição: <forma>.<campo>=<valor>, --remover <forma> ou --adicionar <json-da-forma>');
  let medido;
  let editado;
  try {
    editado = editarEsboco(JSON.parse(texto), { atribuicoes, remover, adicionar });
    medido = medirEsboco(editado.esboco, { projecao: false, referencias: referenciasDoEsboco(editado.esboco, dirname(caminho)), unidades: unidadesGravadas(caminho) });
  } catch (e) {
    if (e instanceof ErroDeEsboco) throw new ErroDeEsboco(`${e.message} (o arquivo não foi alterado)`);
    throw e;
  }
  writeFileSync(caminho, serializarComoOriginal(editado.esboco, texto));
  return { texto: `${formatarMudancas(editado.mudancas).join('\n')}\n${formatarResumo(medido.descricao, medido.divergencias)}`, mudancas: editado.mudancas, descricao: medido.descricao, divergencias: medido.divergencias };
}

/* `--referencia <arquivo>`: confere, por vista e por parte, a silhueta do esboço com a da referência (um JSON de contornos ou
   uma imagem com `--ancoras`). Os limites e o mapa das partes vêm da entrada de `plano.referencia` que cita o mesmo arquivo;
   sem ela valem os padrões e a vista do `--vista` ou do nome do arquivo. Devolve { texto, codigo, conferencias }. */
export function referenciaArquivo(arquivo, referencia, { vista = null, ancoras = null, imagem = false } = {}) {
  const caminho = resolverCaminho(arquivo);
  const base = dirname(caminho);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const esboco = expandirEsboco(bruto);
  const alvo = resolverCaminho(referencia);
  const declarada = (lerPlano(bruto.plano)?.referencia ?? []).find((e) => resolve(base, e.arquivo) === alvo || resolverCaminho(e.arquivo) === alvo);
  const vistaFinal = vista ?? declarada?.vista ?? vistaDoNome(referencia);
  if (!vistaFinal) throw new ErroDeEsboco(`--referencia: diga a vista que "${referencia}" mostra (--vista frontal, lateral ou superior), porque o nome do arquivo não a diz`);
  const entrada = { ...(declarada ?? {}), arquivo: referencia, vista: vistaFinal };
  const ancorasAbs = ancoras ? resolverCaminho(ancoras) : (declarada?.ancoras ? resolve(base, declarada.ancoras) : undefined);
  const ref = lerReferenciaDeArquivo({ arquivo: alvo, ancoras: ancorasAbs, recorte: declarada?.recorte, limiar: declarada?.limiar }, base, `referência "${referencia}"`);
  const visiveis = visiveisDoEsboco(esboco);
  const conferencias = [];
  const L = [];
  (esboco.opcoes ?? []).forEach((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    if (entrada.opcoes && !entrada.opcoes.some((q) => q === titulo || q === i + 1)) return;
    const c = conferirReferenciaNaOpcao(entrada, ref, esboco, visiveis, i);
    conferencias.push({ opcao: titulo, ...c });
    L.push(formatarConferencia(entrada, c, { titulo: `${i + 1} (${titulo})` }));
    if (imagem) {
      /* a sobreposição das silhuetas: cinza onde as duas cobrem, laranja só o esboço, azul só a referência */
      const s = sobreposicaoDaReferencia(entrada, ref, visiveis[i]);
      const png = new PNG({ width: s.largura, height: s.altura });
      png.data = Buffer.from(s.pixels);
      const destino = `${caminho.replace(/(\.esboco)?\.json$/i, '')}-referencia-${vistaFinal}${(esboco.opcoes ?? []).length > 1 ? `-opcao-${i + 1}` : ''}.png`;
      writeFileSync(destino, PNG.sync.write(png));
      conferencias[conferencias.length - 1].imagem = destino;
      L.push(`  imagem (cinza onde as duas silhuetas coincidem, laranja só o esboço, azul só a referência): ${destino}`);
    }
  });
  const ok = conferencias.every((c) => c.ok);
  L.push(`conferência contra a referência: ${ok ? 'aprovada' : 'reprovada'}`);
  return { texto: `${L.join('\n')}\n`, codigo: ok ? 0 : 1, conferencias };
}

/* `--medidas-da-referencia <contorno.json>`: as caixas em mm da silhueta e de cada parte do contorno, por eixo, e as linhas
   sugeridas de `plano.medidas` com `origem: "referencia"`. Com o esboço, o mapa `plano.referencia.partes` dá as formas de
   cada parte. */
export function medidasDaReferenciaArquivo(contorno, { vista = null, esboco = null } = {}) {
  const caminho = resolverCaminho(contorno);
  const vistaFinal = vista ?? vistaDoNome(contorno);
  if (!vistaFinal) throw new ErroDeEsboco(`--medidas-da-referencia: diga a vista que "${contorno}" mostra (--vista frontal, lateral ou superior), porque o nome do arquivo não a diz`);
  if (!/\.json$/i.test(caminho)) throw new ErroDeEsboco('--medidas-da-referencia lê o JSON de contornos (as partes vêm dele); uma imagem só tem a silhueta, e a conferência dela é a --referencia');
  const ref = lerReferenciaDeArquivo({ arquivo: caminho }, process.env.INIT_CWD || process.cwd());
  let formasDa = {};
  if (esboco) {
    const bruto = JSON.parse(readFileSync(resolverCaminho(esboco), 'utf8'));
    const e = (lerPlano(bruto.plano)?.referencia ?? []).find((x) => resolve(dirname(resolverCaminho(esboco)), x.arquivo) === caminho);
    formasDa = e?.partes ?? {};
  }
  const m = medidasDaReferencia(ref, vistaFinal, { formasDa });
  return { texto: formatarMedidasDaReferencia(m, { arquivo: basename(contorno) }), medidas: m };
}

/* `--ajustar`: grava `<nome>.ajustado.esboco.json` ao lado, com as sugestões de contato aplicadas, e nunca
   toca o original. Sem nenhuma forma movida, não grava nada. */
export function ajustarArquivo(arquivo) {
  const caminho = resolverCaminho(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const resultado = ajustarEsboco(JSON.parse(texto), { unidades: unidadesGravadas(caminho) });
  const destino = `${caminho.replace(/(\.esboco)?\.json$/i, '')}.ajustado.esboco.json`;
  const moveu = resultado.rodadas.some((r) => !r.descartada && r.movidos.length > 0);
  if (moveu) writeFileSync(destino, serializarComoOriginal(resultado.esboco, texto));
  return { resultado, destino: moveu ? destino : null };
}

/* Flags que levam um valor (`--forma garfoE` ou `--forma=garfoE`); o resto é booleano. `--condutor` leva o arquivo. */
const FLAGS_COM_VALOR = ['--forma', '--achado', '--condutor', '--feito', '--mover', '--para', '--motivo', '--vista', '--referencia', '--medidas-da-referencia', '--ancoras', '--envelope', '--mover-lote', '--detalhar', '--integrar', '--unidade', '--remover', '--adicionar', '--largura', '--saida', '--veredito', '--nota'];
/* `--envelope <unidade> <arquivo-detalhado.esboco.json>` e `--integrar <unidade> <arquivo-detalhado>` levam dois valores, e `--detalhar <unidade> [arquivo]` leva o segundo se vier. */
const FLAGS_COM_DOIS = ['--envelope', '--detalhar', '--integrar'];

/* { alvo, tem(flag), valor(flag) }: separa o arquivo dos valores das flags, para `--forma <id>` poder vir antes do arquivo. */
export function lerArgumentos(argv) {
  const valores = new Map();
  const flags = new Set();
  const posicionais = [];
  const editar = [];
  const remover = [];
  const adicionar = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { posicionais.push(a); continue; }
    const [nome, ...resto] = a.split('=');
    flags.add(nome);
    /* `--editar [arquivo] par par ...` leva todos os argumentos até a próxima flag */
    if (nome === '--editar') {
      if (resto.length > 0) editar.push(resto.join('='));
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) editar.push(argv[++i]);
      continue;
    }
    if (FLAGS_COM_VALOR.includes(nome)) {
      if (resto.length > 0) valores.set(nome, resto.join('='));
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) valores.set(nome, argv[++i]);
      else valores.set(nome, undefined);
      if (nome === '--remover' || nome === '--adicionar') (nome === '--remover' ? remover : adicionar).push(valores.get(nome));
      if (FLAGS_COM_DOIS.includes(nome)) valores.set(`${nome}#2`, i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : undefined);
    }
  }
  /* o arquivo do --editar é o primeiro argumento sem "="; sem ele vale o posicional */
  const arquivoDoEditar = editar.length > 0 && !editar[0].includes('=') ? editar[0] : undefined;
  const atribuicoes = arquivoDoEditar === undefined ? editar : editar.slice(1);
  const alvo = valores.get('--condutor') ?? arquivoDoEditar ?? posicionais[0];
  return { alvo, edicao: { atribuicoes, remover: remover.filter((x) => x !== undefined), adicionar: adicionar.filter((x) => x !== undefined) }, tem: (f) => flags.has(f), valor: (f, k = 0) => valores.get(k === 0 ? f : `${f}#${k + 1}`), zoom: argv.find((a) => a.startsWith('--zoom=')) };
}

async function principal(argv) {
  const args = lerArgumentos(argv);
  const alvo = args.alvo;
  if (args.tem('--medidas-da-referencia')) {
    if (args.valor('--medidas-da-referencia') === undefined) { process.stderr.write('esboço recusado: --medidas-da-referencia precisa do JSON de contornos (--medidas-da-referencia <contorno.json>).\n'); return 1; }
    try {
      process.stdout.write(medidasDaReferenciaArquivo(args.valor('--medidas-da-referencia'), { vista: args.valor('--vista') ?? null, esboco: alvo ?? null }).texto);
      return 0;
    } catch (e) {
      if (e.code === 'ENOENT' || e instanceof ErroDeEsboco || e instanceof SyntaxError) { process.stderr.write(`esboço recusado: ${e.code === 'ENOENT' ? `arquivo não encontrado (${e.path ?? args.valor('--medidas-da-referencia')})` : e.message}\n`); return 1; }
      throw e;
    }
  }
  if (!alvo) { process.stderr.write('uso: npm run esboco -- <arquivo.esboco.json> [--estrito] [--descrever [--forma <id>] [--completo] [--mudou] [--json]] [--achado <n>] [--ajustar] [--rapido] [--analise [--sugerir] [--centros] [--largura <px>] [--saida <pasta>] [--zoom=<vista>:x0,y0,x1,y1]] [--condutor [--historico] [--proximo | --feito <unidade> | --veredito <unidade> --nota <0-10> --motivo <texto> | --mover <forma|instancia|padrao|a,b> --para <unidade> --motivo <texto> | --mover-lote <arquivo.json> | --replanejar --motivo <texto>]] [--detalhar <unidade> [arquivo]] [--unidade <unidade> [--vista <vista>] [--largura <px>] [--saida <pasta>]] [--editar <arquivo> <forma>.<campo>=<valor> ... [--remover <forma[,forma]>] [--adicionar <json-da-forma ou arranja>]] [--integrar <unidade> <arquivo-detalhado.esboco.json>] [--envelope <unidade> <arquivo-detalhado.esboco.json>] [--referencia <contorno.json ou imagem.png> [--vista <vista>] [--ancoras <json>] [--imagem]]\n       npm run esboco -- --medidas-da-referencia <contorno.json> [--vista <vista>] [<arquivo.esboco.json>]\n'); return 2; }
  const estrito = args.tem('--estrito');
  try {
    if (args.tem('--mudou') && !args.tem('--descrever')) throw new ErroDeEsboco('--mudou só vale junto de --descrever.');
    for (const f of ['--largura', '--saida', '--veredito', '--nota', '--forma', '--achado', '--feito', '--mover', '--mover-lote', '--para', '--motivo', '--vista', '--referencia', '--ancoras', '--detalhar', '--unidade', '--remover', '--adicionar']) if (args.tem(f) && args.valor(f) === undefined) throw new ErroDeEsboco(`${f} precisa de um valor (${f} <valor>).`);
    if (args.tem('--integrar') && (args.valor('--integrar') === undefined || args.valor('--integrar', 1) === undefined)) throw new ErroDeEsboco('--integrar precisa da unidade e do arquivo detalhado (--integrar <unidade> <arquivo-detalhado.esboco.json>).');
    if (args.tem('--envelope') && (args.valor('--envelope') === undefined || args.valor('--envelope', 1) === undefined)) throw new ErroDeEsboco('--envelope precisa da unidade e do arquivo detalhado (--envelope <unidade> <arquivo-detalhado.esboco.json>).');
    if (args.tem('--referencia')) {
      const r = referenciaArquivo(alvo, args.valor('--referencia'), { vista: args.valor('--vista') ?? null, ancoras: args.valor('--ancoras') ?? null, imagem: args.tem('--imagem') });
      process.stdout.write(r.texto);
      return r.codigo;
    }
    if (args.tem('--editar') || args.tem('--remover') || args.tem('--adicionar')) {
      const r = editarArquivo(alvo, args.edicao);
      process.stdout.write(r.texto);
      return 0;
    }
    if (args.tem('--unidade')) {
      const r = await unidadeArquivo(alvo, args.valor('--unidade'), { vista: args.valor('--vista') ?? null, largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null });
      process.stdout.write(r.texto);
      return 0;
    }
    if (args.tem('--detalhar')) {
      const r = detalharArquivo(alvo, args.valor('--detalhar'), args.valor('--detalhar', 1));
      process.stdout.write(r.texto);
      return 0;
    }
    if (args.tem('--integrar')) {
      const r = integrarArquivo(alvo, args.valor('--integrar'), args.valor('--integrar', 1));
      process.stdout.write(r.texto);
      return r.resultado.envelope && !r.resultado.envelope.ok ? 1 : 0;
    }
    if (args.tem('--condutor') || args.tem('--envelope') || ['--proximo', '--feito', '--veredito', '--mover', '--mover-lote', '--replanejar'].some((f) => args.tem(f))) {
      const r = condutorArquivo(alvo, { envelope: args.tem('--envelope') ? { unidade: args.valor('--envelope'), arquivo: args.valor('--envelope', 1) } : undefined, proximo: args.tem('--proximo'), feito: args.valor('--feito'), veredito: args.valor('--veredito'), nota: args.valor('--nota'), mover: args.valor('--mover'), moverLote: args.valor('--mover-lote'), historico: args.tem('--historico'), para: args.valor('--para'), motivo: args.valor('--motivo'), replanejar: args.tem('--replanejar') });
      process.stdout.write(r.texto);
      if (r.criticoDe) process.stdout.write((await briefDoCritico(alvo, r.criticoDe, { largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null })).texto);
      return r.codigo;
    }
    if (args.tem('--achado')) {
      const n = Number(args.valor('--achado'));
      if (!Number.isInteger(n) || n < 1) throw new ErroDeEsboco(`--achado precisa do número da divergência (um inteiro a partir de 1, como aparece na leitura padrão), e veio "${args.valor('--achado')}".`);
      const r = await achadoArquivo(alvo, n, { vista: args.valor('--vista') ?? 'isometrica' });
      process.stdout.write(`achado ${n} (${r.divergencia.classe}): ${r.divergencia.texto}\n  ${r.destino}\n  vista ${r.imagem.vista}, zoom de ${r.imagem.janela_mm} mm em torno de [${r.imagem.ponto.join(' ')}], peças: ${r.divergencia.pecas.join(', ') || 'o conjunto'}\n`);
      return 0;
    }
    if (args.tem('--ajustar')) {
      const { resultado, destino } = ajustarArquivo(alvo);
      process.stdout.write(`${formatarAjuste(resultado, descreverAchado)}\n${destino ? `gravado em ${destino} (o original não foi alterado)` : 'nenhum arquivo gravado'}\n${relatarContato(resultado.final)}`);
      return resultado.aprovado ? 0 : 1;
    }
    /* `--forma <id>` sozinha é a leitura da forma em texto: não desenha nem grava imagem */
    if (args.tem('--descrever') || (args.tem('--forma') && !args.tem('--analise'))) {
      process.stdout.write(descreverArquivo(alvo, { mudou: args.tem('--mudou'), json: args.tem('--json'), completo: args.tem('--completo'), forma: args.valor('--forma') ?? null }).texto);
      return 0;
    }
    if (args.tem('--analise')) {
      const rapido = args.tem('--rapido');
      const { pasta, manifesto } = await analisarEsboco(alvo, { zoom: args.zoom ? args.zoom.slice(7) : null, centros: args.tem('--centros'), sugerir: args.tem('--sugerir'), rapido, largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null });
      const cabecalho = rapido
        ? `análise rápida do esboço: sem imagem (contato e projeção em texto; manifesto em ${pasta})\nRode sem --rapido para gerar as imagens antes de dar o esboço por bom (docs/mecanifica/usar/PARE-E-ANALISE.md).\n`
        : `análise do esboço: ${manifesto.arquivos.length} imagens em ${pasta}\n${manifesto.arquivos.map((a) => `  ${a}`).join('\n')}\n${(manifesto.achados ?? []).length ? `imagens dos achados (o par colorido, o resto em cinza, com zoom no ponto):\n${manifesto.achados.map((a) => `  ${a.arquivo}: [${a.n}] ${a.classe}: ${a.texto}`).join('\n')}\n` : ''}Abra cada imagem antes de dar o esboço por bom (docs/mecanifica/usar/PARE-E-ANALISE.md).\n`;
      process.stdout.write(`${cabecalho}${relatarContato(manifesto.contato)}${relatarProjecao(manifesto.projecao)}${!manifesto.sugerir && Object.values(manifesto.projecao.porVista).some((l) => l.length > 0) && manifesto.projecao.explosao.length === 0 ? 'explosão e deslocamento sugeridos: rode com --sugerir (leva minutos numa moto densa).\n' : ''}`);
      return estrito && (manifesto.contato.resultado === 'reprovado' || manifesto.projecao.resultado === 'reprovado') ? 1 : 0;
    }
    const r = await gerarEsboco(alvo, { rapido: args.tem('--rapido') });
    process.stdout.write(`esboço ${r.largura}x${r.altura} px, ${r.escala.toFixed(3)} px/mm${r.png ? '' : ' (modo rápido: só o SVG, com menos lados nos círculos)'}\n${r.png ? `  ${r.png}\n` : ''}  ${r.svg}\n${relatarContato(r.contato)}${relatarProjecao(r.projecao)}`);
    return estrito && (r.contato.resultado === 'reprovado' || r.projecao.resultado === 'reprovado') ? 1 : 0;
  } catch (e) {
    if (e.code === 'ENOENT') { process.stderr.write(`esboço recusado: arquivo não encontrado (${alvo})\n`); return 1; }
    if (e instanceof ErroDeEsboco || e instanceof SyntaxError) { process.stderr.write(`esboço recusado: ${e.message}\n`); return 1; }
    throw e;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await principal(process.argv.slice(2));
