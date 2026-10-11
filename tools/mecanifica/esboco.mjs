/* Linha de comando do esboço: lê `<nome>.esboco.json`, desenha as opções
   lado a lado com modulos/esboco e grava `<nome>.svg` e `<nome>.png` ao lado.
   Uso: npm run esboco -- <arquivo.esboco.json> */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { desenharEsboco, ErroDeEsboco, resolverOpcao, VISTAS } from '../../modulos/esboco/src/index.js';
import { descreverAchado, descreverAtravessamento, descreverPorta, descreverSilenciado, verificarContato } from '../../modulos/esboco/src/contato.js';
import { descreverGrupoDaProjecao, FATORES_DA_SUGESTAO, verificarProjecao } from '../../modulos/esboco/src/projecao.js';
import { diferenca, formatarDescricao, formatarForma, formatarResumo, medirEsboco } from '../../modulos/esboco/src/descrever.js';
import { imagemDoAchado } from '../../modulos/esboco/src/achado.js';
import { conferirReferenciaNaOpcao, lerPlano, textoDoPlano, visiveisDoEsboco } from '../../modulos/esboco/src/plano.js';
import { formatarConferencia, formatarMedidasDaReferencia, medidasDaReferencia, sobreposicaoDaReferencia } from '../../modulos/esboco/src/referencia.js';
import { UNIDADE_DO_OBJETO, avancar, conferirEnvelope, criarEstado, definirModo, formatarEnvelope, formatarSituacao, funcaoDaUnidade, gravarNotaDePassagem, LIMITE_DA_FUNCAO, liberar, marcarFeito, registrarVeredito, unidadesNovasDoMarco, moverEmLote, moverFormas, nomeDoEstagio, planoDeDetalhe, portaoDoEstagio, registrarEnvelope, replanejar, unidadePorNome, unidadesDoEstado } from '../../modulos/esboco/src/condutor.js';
import { comFormasVizinhas, descricaoDasVizinhas, detalharUnidade, formasVizinhas, integrarUnidade } from '../../modulos/esboco/src/detalhe.js';
import { editarEsboco, formatarMudancas } from '../../modulos/esboco/src/editar.js';
import { formatarLigacoes, mapaDeLigacoes } from '../../modulos/esboco/src/mapa-de-ligacoes.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { ajustarEsboco, formatarAjuste, serializarComoOriginal } from '../../modulos/esboco/src/ajustar.js';
import { recortarAmpliado } from './analise-da-peca.mjs';
import { lerReferenciaDeArquivo, referenciasDoEsboco, vistaDoNome } from './esboco-referencia.mjs';
import { ajuda } from './esboco-ajuda.mjs';
import { registrarUso } from './uso.mjs';
import { envelopeDaReceitaArquivo, nivelZeroDoEsboco } from './esboco-nivel-zero.mjs';
import { dica, textoDaRecusa, topicoDaRecusa, topicoDoContato, topicoDoPortao } from './esboco-recusa.mjs';
import { blocagemDoEsboco, desenharVistaDaBlocagem } from './esboco-blocagem.mjs';

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
    const png = await pagina.screenshot();
    if (destino) writeFileSync(destino, png);
    await pagina.close();
    return png;
  } finally {
    if (proprio) await navegador.close();
  }
}

/* O motor das imagens PNG do esboço. `webgl` (padrão) desenha a camada das formas com Three.js num WebGL do Chromium, com
   teste de profundidade por pixel, e o resto (título, legendas, escala, linhas de centro, superfícies de corte) vem do SVG
   por cima; `svg` rasteriza só o SVG, com o algoritmo do pintor por forma (ESBOCO_PNG=svg). O `.svg` gravado é sempre o puro. */
export const MOTOR_DO_PNG = process.env.ESBOCO_PNG === 'svg' ? 'svg' : 'webgl';
const OPCOES_DA_CAMADA = { camada: MOTOR_DO_PNG === 'webgl' };

/* Roda dentro do Chromium: desenha a camada das formas com câmera ortográfica em pixels do quadro (x, y) e profundidade z
   ao longo do olho. Cores sem gestão de cor (o pixel é o hexadecimal da face), traços como fitas de 2 px com viés para a
   frente, deitadas na superfície da forma sob elas (o `perfil` de cada segmento, de `camada.js`: a fita não é comida pela
   própria face, por mais inclinada que seja, e não passa à frente de uma face de outra forma que a cobre), e formas com
   opacidade em dois passes (profundidade, depois cor só onde a profundidade é a mais próxima da própria forma, de modo que
   as faces da forma não escurecem onde se sobrepõem). Devolve o PNG em data URL, com fundo transparente. */
/* o argumento vai como texto JSON: o Playwright serializa cada número de um objeto grande e leva segundos */
const DESENHAR_CAMADA = async (texto) => {
  const { camada, fator } = JSON.parse(texto);
  /* o Three.js e o contexto WebGL ficam na página entre uma imagem e outra */
  if (!window.camadaDoEsboco) {
    /* por `new Function`: o vitest reescreve um `import()` escrito aqui, e a página precisa do dela */
    const T0 = await new Function('u', 'return import(u)')('/three.module.js');
    T0.ColorManagement.enabled = false;
    const canvas0 = document.createElement('canvas');
    document.body.append(canvas0);
    const renderer0 = new T0.WebGLRenderer({ canvas: canvas0, antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    renderer0.setPixelRatio(1);
    renderer0.outputColorSpace = T0.LinearSRGBColorSpace;
    renderer0.setClearColor(0x000000, 0);
    window.camadaDoEsboco = { T: T0, canvas: canvas0, renderer: renderer0 };
  }
  const { T, canvas, renderer } = window.camadaDoEsboco;
  const W = Math.round(camada.largura * fator);
  const H = Math.round(camada.altura * fator);
  renderer.setSize(W, H, false);
  const z0 = camada.zMin - 10;
  const topo = camada.zMax - z0 + 10;
  const cam = new T.OrthographicCamera(0, camada.largura, 0, camada.altura, 1, topo + 10);
  cam.position.z = topo;
  const cena = new T.Scene();
  /* folga do traço à frente da superfície sob ele, em mm: cobre a diferença de profundidade entre a fita e a face nas bordas
     dos triângulos inclinados (o raster calcula a profundidade no centro do pixel e extrapola), que sem ela salta o traço de
     uma superfície curva; fica abaixo da espessura de uma chapa vista pelo olho */
  const VIES_DO_TRACO = 0.5;
  const meia = camada.larguraDoTraco / 2;
  const rgb = (k) => [1, 3, 5].map((i) => parseInt(k.slice(i, i + 2), 16) / 255);
  const preto = new T.Color(camada.corDoTraco);
  const faces = (lista, pos, col) => {
    for (const f of lista) {
      const c = f.c.slice();
      if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
      const furos = (f.h ?? []).map((h) => { const q = h.slice(); if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop(); return q; });
      const todos = [...c, ...furos.flat()];
      const v2 = (q) => new T.Vector2(q[0], q[1]);
      const idx = furos.length === 0 && c.length === 3 ? [0, 1, 2] : furos.length === 0 && c.length === 4 ? [0, 1, 2, 0, 2, 3] : T.ShapeUtils.triangulateShape(c.map(v2), furos.map((h) => h.map(v2))).flat();
      const k = rgb(f.k);
      for (const i of idx) { const q = todos[i]; pos.push(q[0], q[1], q[2] - z0); col.push(k[0], k[1], k[2]); }
    }
  };
  const colunas = camada.colunasDoTraco ?? [-1, 0, 1];
  const fitas = (tracos, inclinacoes, pos, ponta) => {
    tracos.forEach((t, ti) => {
      for (let i = 0; i + 1 < t.length; i++) {
        const a = t[i]; const b = t[i + 1];
        const dx = b[0] - a[0]; const dy = b[1] - a[1];
        const n = Math.hypot(dx, dy);
        if (n < 1e-6) continue;
        const ux = (dx / n) * meia; const uy = (dy / n) * meia;
        const e = ponta ? 1 : 0;
        /* A fita é uma tira de 2 px com o eixo no próprio segmento, nas colunas de `colunasDoTraco`, em frações da meia largura (o
           sinal positivo é o do lado de (-dy, dx)); cada coluna leva a profundidade da superfície sob ela (`perfil`, em relação
           ao eixo), de modo que a fita não fica atrás da própria face, por mais inclinada que seja, nem na frente do que está
           atrás dela. Sem face, a fita é plana. */
        const [perfil, fundoA, fundoB] = inclinacoes?.[ti]?.[i] ?? [Array(2 * (colunas.length - 1)).fill(0), 0, 0];
        const corte = (q, desvios) => {
          const z = q[2] - z0 + VIES_DO_TRACO;
          let k = 0;
          return colunas.map((s) => [q[0] + s * -uy, q[1] + s * ux, z + (s === 0 ? 0 : desvios[k++])]);
        };
        /* a ponta que passa do vértice em meia largura, só para preencher a quina entre dois segmentos: um retângulo plano na
           profundidade, afundado atrás do vértice o bastante para nunca ficar à frente de uma face inclinada que passa atrás
           dele (plano porque o raster calcula a profundidade no centro do pixel e extrapola nas bordas do triângulo, e um
           triângulo inclinado em profundidade a adianta nas amostras de borda) */
        const ponta0 = (q, sinal, fundo) => {
          const z = q[2] - fundo - z0 + VIES_DO_TRACO;
          const x = q[0] + sinal * ux; const y = q[1] + sinal * uy;
          return [[[q[0], q[1], z], [q[0] - uy, q[1] + ux, z], [q[0] + uy, q[1] - ux, z]], [[x, y, z], [x - uy, y + ux, z], [x + uy, y - ux, z]]];
        };
        const A = corte(a, perfil.slice(0, perfil.length / 2));
        const B = corte(b, perfil.slice(perfil.length / 2));
        for (let c = 0; c + 1 < colunas.length; c++) for (const m of [A[c], A[c + 1], B[c], A[c + 1], B[c + 1], B[c]]) pos.push(...m);
        if (e) {
          for (const [P, Q] of [ponta0(a, -1, fundoA), ponta0(b, 1, fundoB)]) for (const k of [1, 2]) for (const m of [P[0], P[k], Q[0], P[k], Q[k], Q[0]]) pos.push(...m);
        }
      }
    });
  };
  const malha = (pos, col, material, ordem) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    if (col) g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    const m = new T.Mesh(g, material);
    m.frustumCulled = false;
    m.renderOrder = ordem;
    cena.add(m);
  };
  const opacas = camada.formas.filter((f) => f.opacidade >= 1);
  const translucidas = camada.formas.filter((f) => f.opacidade < 1).sort((a, b) => a.prof - b.prof || a.rank - b.rank);
  const pos = []; const col = []; const fita = [];
  for (const f of opacas) { faces(f.faces, pos, col); fitas(f.tracos, f.inclinacoes, fita, true); }
  malha(pos, col, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }), 0);
  malha(fita, null, new T.MeshBasicMaterial({ color: preto, side: T.DoubleSide, depthWrite: false }), 1);
  translucidas.forEach((f, i) => {
    const p = []; const c = []; const t = [];
    faces(f.faces, p, c);
    fitas(f.tracos, f.inclinacoes, t, false);
    malha(p, c, new T.MeshBasicMaterial({ colorWrite: false, transparent: true, side: T.DoubleSide }), 10 + 3 * i);
    malha(p, c, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: f.opacidade, depthWrite: false, depthFunc: T.EqualDepth, side: T.DoubleSide }), 11 + 3 * i);
    malha(t, null, new T.MeshBasicMaterial({ color: preto, transparent: true, opacity: f.opacidade, depthWrite: false, side: T.DoubleSide }), 12 + 3 * i);
  });
  renderer.render(cena, cam);
  const png = canvas.toDataURL('image/png');
  cena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return png;
};

/* A camada das formas (`desenharEsboco(..., { camada: true }).camada`) como PNG em data URL, `fator` vezes maior que o quadro. */
export async function renderizarCamada(camada, fator = 1, navegador = null) {
  const proprio = !navegador;
  if (proprio) navegador = await (await import('playwright')).default.chromium.launch();
  try {
    const pagina = await paginaDaCamada(navegador);
    return await pagina.evaluate(DESENHAR_CAMADA, JSON.stringify({ camada, fator }));
  } finally {
    if (proprio) await navegador.close();
  }
}

/* Uma página por navegador, com o Three.js servido de node_modules, reaproveitada pelas imagens seguintes. */
const PAGINAS_DA_CAMADA = new WeakMap();
async function paginaDaCamada(navegador) {
  if (!PAGINAS_DA_CAMADA.has(navegador)) {
    const pagina = await navegador.newPage();
    const raiz = dirname(fileURLToPath(import.meta.resolve('three')));
    await pagina.route('http://camada.local/**', async (rota) => {
      const nome = new URL(rota.request().url()).pathname.slice(1);
      if (nome === '') return rota.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0"></body>' });
      if (!/^three(\.core|\.module)\.js$/.test(nome)) return rota.abort();
      return rota.fulfill({ contentType: 'text/javascript', body: readFileSync(join(raiz, nome)) });
    });
    await pagina.goto('http://camada.local/');
    PAGINAS_DA_CAMADA.set(navegador, pagina);
  }
  return PAGINAS_DA_CAMADA.get(navegador);
}

/* O resultado de `desenharEsboco(esboco, { camada: true })` como PNG na largura pedida: a camada das formas vem do WebGL e
   o resto do SVG. Com `ESBOCO_PNG=svg`, ou sem camada no resultado, rasteriza o SVG puro. Devolve o SVG puro (na mesma largura). */
export async function desenhoParaPng(r, larguraPedida, destino, navegador = null) {
  const { puro, png } = await desenhoParaBuffer(r, larguraPedida, navegador);
  if (destino) writeFileSync(destino, png);
  return puro;
}

/* O mesmo desenho de `desenhoParaPng`, devolvido como buffer PNG (sem gravar): { puro, png }. */
export async function desenhoParaBuffer(r, larguraPedida, navegador = null) {
  const puro = escalarSvg(r.svg, r.largura, r.altura, larguraPedida);
  if (MOTOR_DO_PNG === 'svg' || !r.camada) return { puro, png: await svgParaPng(puro.svg, puro.largura, puro.altura, null, navegador) };
  const sobre = escalarSvg(r.svgSobreCamada, r.largura, r.altura, larguraPedida);
  const proprio = !navegador;
  if (proprio) navegador = await (await import('playwright')).default.chromium.launch();
  try {
    const camada = await renderizarCamada(r.camada, sobre.largura / r.largura, navegador);
    const png = await svgParaPng(sobre.svg.replace('__CAMADA__', () => camada), sobre.largura, sobre.altura, null, navegador);
    return { puro, png };
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
    if (explosoes?.[i]) o.explosao = { ...explosoes[i] };
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
          const r = desenharEsboco(variante(desenho, { vista, legendas, centros }), OPCOES_DA_CAMADA);
          const escala = r.escala;
          const nome = `${vista}-${legendas ? 'legendas' : 'sem-legendas'}-${centros ? 'centros' : 'sem-centros'}.png`;
          await desenhoParaPng(r, larguraPedida, join(pasta, nome), navegador);
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
        const r = desenharEsboco(variante(desenho, { vista, legendas: true, centros: false, lista: true, ...extra }), OPCOES_DA_CAMADA);
        const nome = `${vista}-${modo}-legendas.png`;
        await desenhoParaPng(r, larguraPedida, join(pasta, nome), navegador);
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
  const r = desenharEsboco(rapido ? { ...esboco, ladosPorEscala: esboco.ladosPorEscala ?? true } : esboco, rapido ? {} : OPCOES_DA_CAMADA);
  const { svg, largura, altura, escala } = r;
  const contato = verificarContato(esboco, { unidades: unidadesGravadas(caminho) });
  const projecao = verificarProjecao(esboco);
  writeFileSync(`${base}.svg`, svg);
  if (!rapido) await desenhoParaPng(r, null, `${base}.png`);
  return { png: rapido ? null : `${base}.png`, svg: `${base}.svg`, largura, altura, escala, contato, projecao };
}

function relatarContato(c) {
  if (!c.usar) return '';
  const linhas = c.achados.map((a) => `  ${descreverAchado(a)}${a.sugestao ? `\n    sugestão: ${a.sugestao.texto}` : ''}`);
  const atravessa = c.atravessamentos.map((t) => `  ${descreverAtravessamento(t)}`);
  const silenciados = c.silenciados.map((t) => `  ${descreverSilenciado(t)}`);
  const portas = (c.portas ?? []).map((t) => `  ${descreverPorta(t)}`);
  const v = (x) => String(x).replace('.', ',');
  return `contato (tolerância ${v(c.tolerancia)} mm, penetração ${v(c.penetracao)} mm, folga ${v(c.folga)} mm): ${c.resultado}\n${linhas.length ? `${linhas.join('\n')}\n` : ''}${atravessa.length ? `atravessamentos declarados:\n${atravessa.join('\n')}\n` : ''}${silenciados.length ? `pares silenciados:\n${silenciados.join('\n')}\n` : ''}${portas.length ? `pares lidos pelas portas:\n${portas.join('\n')}\n` : ''}${dicaDoContato(c)}`;
}

/* O gate de contato que reprova aponta o tópico que resolve: `conserto` quando ele propôs um conserto, `contato` quando só
   relata. */
function dicaDoContato(c) {
  if (c.resultado !== 'reprovado') return '';
  const topico = topicoDoContato(c);
  registrarUso({ evento: 'recusa', origem: 'contato', topico, mensagem: `contato reprovado: ${[...new Set(c.achados.map((a) => a.tipo))].sort().join(', ')}` });
  return `${dica(topico)}\n`;
}

/* A recusa do esboço na saída de erro, com a dica do tópico que resolve na linha seguinte. */
function recusar(mensagem, erro = null) {
  const r = textoDaRecusa(mensagem, erro);
  registrarUso({ evento: 'recusa', origem: 'esboco', topico: r.topico, mensagem });
  process.stderr.write(r.texto);
}

/* A dica do Condutor, no fim do texto dele: o Portão do estágio atual quando não passa (a consulta do estado também o
   mostra), o bloqueio do avanço pela sua própria mensagem, a conclusão que espera o crítico e o Envelope recusado. */
function dicaDoCondutor(r, args) {
  let topico = null;
  const bloqueio = /avanço recusado: ([^\n]*)/.exec(r.texto)?.[1];
  if (r.portao && r.portao.estagio !== 'concluido' && !r.portao.passa) topico = topicoDoPortao(r.portao.falta);
  else if (bloqueio) topico = topicoDaRecusa(bloqueio) ?? 'condutor';
  else if (/a conclusão espera o veredito/.test(r.texto)) topico = 'critico';
  else if (args.tem('--envelope') && r.codigo !== 0) topico = 'envelope';
  if (!topico) return '';
  if (args.tem('--proximo') && r.codigo !== 0) registrarUso({ evento: 'recusa', origem: 'portao', topico, mensagem: `Portão: ${(r.portao?.falta ?? []).join('; ') || r.texto.split('\n')[0]}` });
  return `${dica(topico)}\n`;
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
  let refeita = false;
  let marcoDe = null;
  let objetoDe = false;
  if (acao.envelope !== undefined) {
    /* confere a versão detalhada de uma unidade contra o Envelope dela; só grava o resultado num estado que já existe */
    const { unidade, arquivo: detalhado } = acao.envelope;
    /* a receita que refina chega com o resultado do verificador do REFINA já calculado (`resultado`) */
    const r = acao.envelope.resultado ?? conferirEnvelope(bruto, estado, unidade, JSON.parse(readFileSync(resolverCaminho(detalhado), 'utf8')));
    if (!novo) writeFileSync(memoria, `${JSON.stringify(registrarEnvelope(estado, r, basename(detalhado)), null, 2)}\n`);
    return { texto: `${formatarEnvelope(r, basename(detalhado))}${novo ? `o estado do Condutor não existe (${basename(memoria)}): a conferência não foi gravada\n` : ''}`, codigo: r.ok ? 0 : 1, resultado: r };
  }
  if (acao.proximo) {
    const r = avancar(bruto, estado, { referencias, nivelZero: nivelZeroDoEsboco });
    estado = r.estado;
    if (r.concluido) extra = 'o fluxo já terminou; não há estágio seguinte\n';
    else if (r.bloqueio) { codigo = 1; extra = `avanço recusado: ${r.bloqueio}\n`; }
    else if (r.pedeCritico) { codigo = 1; objetoDe = true; extra = `o Portão de ${nomeDoEstagio(estado.atual)} passa, e a conclusão espera o veredito do crítico sobre o objeto inteiro (rodada ${r.rodada}); o brief vem abaixo\n`; }
    else if (!r.ok) { codigo = 1; extra = `avanço recusado: o Portão de ${nomeDoEstagio(estado.atual)} não passa; falta:\n${r.portao.falta.map((f) => `  - ${f}`).join('\n')}\n`; }
    else extra = `avançou de ${nomeDoEstagio(estado.historico[estado.historico.length - 1].de)} para ${nomeDoEstagio(estado.atual)}\n`;
  } else if (acao.modo !== undefined) {
    estado = definirModo(estado, acao.modo);
    extra = `modo do Condutor alterado para "${acao.modo}"\n`;
  } else if (acao.notaDePassagem !== undefined) {
    estado = gravarNotaDePassagem(estado, { unidade: acao.notaDePassagem, texto: acao.texto }, null, bruto);
    extra = `nota de passagem registrada para a unidade ${acao.notaDePassagem}\n`;
  } else if (acao.veredito !== undefined) {
    estado = registrarVeredito(estado, { unidade: acao.veredito, nota: acao.nota, motivo: acao.motivo, tokens: acao.tokens });
    extra = `veredito do crítico registrado para a unidade ${acao.veredito}: nota ${acao.nota}${acao.tokens !== undefined ? ` (${acao.tokens} tokens)` : ''}\n`;
  } else if (acao.liberar !== undefined) {
    estado = liberar(estado, { unidade: acao.liberar, motivo: acao.motivo });
    extra = `liberação de ${acao.liberar} gravada no histórico, com o motivo dado\n`;
  } else if (acao.feito !== undefined) {
    const jaFeita = estado.unidades?.find((x) => x.id === unidadePorNome(estado.unidades, acao.feito))?.feito === true;
    refeita = jaFeita;
    const r = marcarFeito(bruto, estado, acao.feito);
    estado = r.estado;
    const u = estado.unidades.find((x) => x.id === unidadePorNome(estado.unidades, acao.feito));
    if (u.membros.length > LIMITE_DA_FUNCAO) criticoDe = u.id;
    if (r.novosMarcos.length > 0) { const limiar = Math.max(...r.novosMarcos.map((m) => m.limiar)); marcoDe = { limiar, novas: unidadesNovasDoMarco(estado, limiar) }; }
    extra = `unidade ${acao.feito} ${jaFeita ? 'já estava feita e foi refeita: as quatro imagens do crítico são regravadas e o brief sai de novo' : 'marcada como feita'}\n${r.novosMarcos.map((m) => `marco de ${m.limiar}%${m.saltou?.length ? ` (cruzou também ${m.saltou.map((l) => `${l}%`).join(', ')})` : ''}: chamar o crítico visual sem contexto, com imagens limpas (registrado no estado; o despacho é da skill)\n`).join('')}`;
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
  const portao = portaoDoEstagio(bruto, estado, { referencias, nivelZero: nivelZeroDoEsboco });
  return { texto: `${extra}${novo ? `estado criado em ${memoria}\n` : ''}${formatarSituacao(estado, portao, { historico: acao.historico === true, marcos: acao.feito === undefined })}`, codigo, estado, portao, criticoDe, refeita, marcoDe, objetoDe };
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
   mantém o estado do Condutor (a unidade continua, e o Envelope é conferido contra o detalhado) e devolve ao mestre o `modulos` e
   o `simetrico` que o detalhado mudou. Não grava nada se a troca não resolve nem se o detalhe não cabe no Envelope. */
export function integrarArquivo(arquivo, unidade, detalhado) {
  const caminho = resolverCaminho(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  const bruto = JSON.parse(texto);
  const memoria = `${caminho}.condutor.json`;
  let estado = null;
  try { estado = JSON.parse(readFileSync(memoria, 'utf8')); } catch { /* sem estado */ }
  const r = integrarUnidade(bruto, estado, unidade, JSON.parse(readFileSync(resolverCaminho(detalhado), 'utf8')), { arquivo: basename(detalhado) });
  /* o detalhe que não cabe no Envelope não é gravado: o mestre e o estado ficam como estavam */
  if (r.envelope && !r.envelope.ok) {
    return { texto: `unidade ${unidade} NÃO integrada em ${basename(caminho)}: o detalhe não cabe no Envelope, e nada foi gravado (o esboço e o estado do Condutor ficaram como estavam)\n${formatarEnvelope(r.envelope, basename(detalhado))}caminhos: ajuste o detalhe para caber no Envelope e integre de novo; ou, se o Envelope da maquete é que precisa mudar, rode --condutor --replanejar --motivo <texto> antes (o Envelope é recalculado a partir das formas do mestre) e integre depois\n`, resultado: r, gravado: false };
  }
  writeFileSync(caminho, serializarComoOriginal(r.mestre, texto));
  if (r.estado) writeFileSync(memoria, `${JSON.stringify(r.estado, null, 2)}\n`);
  const L = [`unidade ${unidade} integrada em ${basename(caminho)}: ${r.formas.length} ${r.formas.length === 1 ? 'forma' : 'formas'} (${r.formas.slice(0, 8).join(', ')}${r.formas.length > 8 ? ', ...' : ''})`];
  if (r.devolvidos.length > 0) L.push(`devolvido ao mestre (editado no detalhado): ${r.devolvidos.join('; ')}`);
  const { pares, juntas, pecas } = r.removidos;
  if (pares + juntas + pecas > 0) L.push(`removido do contato por citar formas que saíram: ${pares} ${pares === 1 ? 'par' : 'pares'}, ${juntas} ${juntas === 1 ? 'junta' : 'juntas'}, ${pecas} ${pecas === 1 ? 'peça' : 'peças'} de junta`);
  L.push(r.estado ? 'o estado do Condutor foi mantido (a unidade continua onde estava)' : `sem estado do Condutor (${basename(memoria)}): só o esboço foi regravado`);
  return { texto: `${L.join('\n')}\n${r.envelope ? formatarEnvelope(r.envelope, basename(detalhado)) : ''}`, resultado: r, gravado: true };
}

/* `--corte <eixo>=<valor> [--lado +|-]`: o `corte` do esboço. O valor é número em mm, nome de parâmetro ou "<forma>.<âncora>". */
export function lerCorteDaLinha(texto, lado) {
  const m = /^([xyz])=(.+)$/i.exec(String(texto ?? '').trim());
  if (!m) throw new ErroDeEsboco(`--corte precisa de <eixo>=<valor> (eixo x, y ou z; valor em mm, parâmetro ou "<forma>.<âncora>"; por exemplo --corte x=50), e veio "${texto ?? ''}".`);
  if (lado !== undefined && !['+', '-'].includes(lado)) throw new ErroDeEsboco(`--lado precisa de + ou - (o lado do corte que fica), e veio "${lado}".`);
  const bruto = m[2].trim();
  const valor = Number.isFinite(Number(bruto.replace(',', '.'))) && bruto !== '' ? Number(bruto.replace(',', '.')) : bruto;
  return { eixo: m[1].toLowerCase(), valor, ...(lado !== undefined ? { lado } : {}) };
}

/* O eixo aparece na tela da vista (o do olho, não). */
const eixoNaTela = (vista, eixo) => { const e = [0, 0, 0]; e['xyz'.indexOf(eixo)] = 1; return Math.hypot(...VISTAS[vista].p(e)) > 1e-9; };

/* `--explodir [--eixo <x|y|z>] [--distancia <mm>]`: a `explosao` em camadas do esboço, ou null sem `--explodir`. */
export function lerExplosaoDaLinha({ explodir = false, eixo, distancia } = {}) {
  if (!explodir) {
    if (eixo !== undefined || distancia !== undefined) throw new ErroDeEsboco('--eixo e --distancia só valem junto de --explodir.');
    return null;
  }
  const e = eixo === undefined ? undefined : String(eixo).toLowerCase();
  if (e !== undefined && !['x', 'y', 'z'].includes(e)) throw new ErroDeEsboco(`--eixo precisa de x, y ou z, e veio "${eixo}".`);
  const d = distancia === undefined ? 'auto' : Number(String(distancia).replace(',', '.'));
  if (d !== 'auto' && !(Number.isFinite(d) && d > 0)) throw new ErroDeEsboco(`--distancia precisa de mm positivos (o passo entre camadas), e veio "${distancia}".`);
  return { ...(e !== undefined ? { eixo: e } : {}), distancia: d, ligacoes: true };
}

/* `--zoom-forma <id|instância|padrão> [--margem <mm>]`: o `enquadrar` do esboço, ou null sem `--zoom-forma`. */
export function lerZoomFormaDaLinha({ zoomForma, margem } = {}) {
  if (zoomForma === undefined) {
    if (margem !== undefined) throw new ErroDeEsboco('--margem só vale junto de --zoom-forma.');
    return null;
  }
  const m = margem === undefined ? undefined : Number(String(margem).replace(',', '.'));
  if (m !== undefined && !(Number.isFinite(m) && m >= 0)) throw new ErroDeEsboco(`--margem precisa de mm (0 ou mais), e veio "${margem}".`);
  return { formas: String(zoomForma), ...(m !== undefined ? { margem: m } : {}) };
}

/* O esboço (bruto, antes de expandir) com as opções de desenho das vistas de análise por cima: `corte`. A `explosao` entra pelo
   `variante` (que tira a declarada no arquivo), e por isso volta à parte. */
function comOpcoesDeDesenho(esboco, { corte = null, previa = false, zoomForma = null } = {}) {
  const e = { ...esboco };
  if (corte) e.corte = corte;
  if (zoomForma) e.enquadrar = zoomForma;
  if (previa) e.previa = true;
  return e;
}

/* O pedaço do nome do arquivo que diz as opções de desenho, para a imagem do corte ou da explosão não substituir a normal. */
function sufixoDasOpcoes({ corte = null, explosao = null, previa = false, zoomForma = null, nivelZero = false } = {}) {
  const partes = [];
  if (nivelZero) partes.push('nivel-zero');
  if (corte) partes.push(`corte-${corte.eixo}${String(corte.valor).replace(/[^A-Za-z0-9_.-]+/g, '-')}${corte.lado === undefined ? '' : corte.lado === '+' ? '-mais' : '-menos'}`);
  if (zoomForma) partes.push(`zoom-${zoomForma.formas.replace(/\*/g, 'todas').replace(/[^A-Za-z0-9_.-]+/g, '-')}`);
  if (explosao) partes.push(`explodida${explosao.eixo ? `-${explosao.eixo}` : ''}${typeof explosao.distancia === 'number' ? `-${explosao.distancia}mm` : ''}`);
  if (previa) partes.push('previa');
  return partes.map((x) => `-${x}`).join('');
}

/* O hash do conteúdo de uma vista: as formas visíveis já resolvidas (posição, caixa, geometria e a declaração de cada uma, cor e
   rótulo incluídos), o que mais o desenho lê do esboço (títulos, notas, linhas de centro, ocultar, legendas), a vista, a
   largura, as opções de desenho e o código do desenhista. Forma oculta (as outras unidades) não entra, mas a posição de uma
   forma visível que depende de uma oculta entra pela posição resolvida. */
const codigoDoDesenhista = () => createHash('sha256').update(readdirSync(new URL('../../modulos/esboco/src/', import.meta.url)).sort().map((f) => readFileSync(new URL(`../../modulos/esboco/src/${f}`, import.meta.url), 'utf8')).join('\u0000')).digest('hex');
let codigoEmCache = null;
function hashDaVista(esboco, vista, extras) {
  const { plano, contato, ...resto } = esboco;
  void plano; void contato;
  const visiveis = esboco.opcoes.map((o, i) => resolverOpcao(o, `opção ${i + 1}`, esboco.pontos).filter((r) => r.forma.oculto !== true));
  const meta = { ...resto, opcoes: esboco.opcoes.map(({ formas, contato: c, medidas, ...o }) => { void formas; void c; void medidas; return o; }) };
  codigoEmCache ??= codigoDoDesenhista();
  return createHash('sha256').update(JSON.stringify({ vista, extras, meta, visiveis, motor: MOTOR_DO_PNG, desenhista: codigoEmCache })).digest('hex');
}

/* O hash do conteúdo de uma vista desenhada pela blocagem: a malha, os volumes e as cores de cada painel (já com a unidade e os
   vizinhos escolhidos), o que mais o desenho lê (título, nota, ocultar, lista), a vista, a largura, o motor e o código do
   desenhista. */
function hashDaBlocagem(blocagem, vista, extras) {
  codigoEmCache ??= codigoDoDesenhista();
  return createHash('sha256').update(JSON.stringify({ vista, extras, nivelZero: blocagem.hash, motor: MOTOR_DO_PNG, desenhista: codigoEmCache })).digest('hex');
}

/* `--nivel-zero` desenha a blocagem inteira da opção; corte, explosão, zoom e prévia ficam no desenho das formas. */
function exigirSemOpcoesDeDesenho({ corte = null, explosao = null, previa = false, zoomForma = null } = {}) {
  const pedidas = [corte && '--corte', explosao && '--explodir', previa && '--previa', zoomForma && '--zoom-forma'].filter(Boolean);
  if (pedidas.length > 0) throw new ErroDeEsboco(`--nivel-zero desenha a blocagem inteira em quatro vistas; ${pedidas.join(', ')} ficam no desenho das formas (tire --nivel-zero).`);
}

/* O esboço de uma unidade (ou o inteiro, com `unidade` nulo) pronto para desenhar: as formas da unidade, as de outra unidade em
   contorno claro (os vizinhos, sem `vizinhos`) e as opções de desenho. Devolve { isolado, idsVizinhos }. */
export function esbocoIsolado(bruto, estado, unidade, vizinhos, opcoes = {}) {
  const idsVizinhos = unidade === null || vizinhos === false ? [] : formasVizinhas(bruto, estado, unidade);
  const isolado = comFormasVizinhas(expandirEsboco(comOpcoesDeDesenho(unidade === null ? bruto : detalharUnidade(bruto, estado, unidade), opcoes)), idsVizinhos);
  return { isolado, idsVizinhos };
}

/* As vistas isoladas de uma unidade (`unidade`) ou do esboço inteiro (`unidade` nulo): grava `<nome-do-arquivo>[-unidade-<nome>]
   [-<opções>]-<vista>.png` ao lado do esboço (ou em `saida`), nas quatro vistas ou só na pedida, sem legenda nem linha de
   centro. As opções de desenho são `corte`. Devolve { destinos, unidade, texto }. */
export async function vistasArquivo(arquivo, { unidade = null, vista = null, largura: larguraPedida = null, saida = null, corte = null, explosao = null, previa = false, zoomForma = null, forcar = false, vizinhos = true, nivelZero = false } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  let estado = null;
  try { estado = JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8')); } catch { /* sem estado: vale o Plano de detalhe do esboço */ }
  if (vista !== null && !VISTAS_DA_ANALISE.includes(vista)) throw new ErroDeEsboco(`${unidade === null ? '--vista' : '--unidade'}: vista '${vista}' desconhecida (${VISTAS_DA_ANALISE.join(', ')}).`);
  const opcoes = { corte, explosao, previa, zoomForma, nivelZero };
  if (nivelZero) exigirSemOpcoesDeDesenho(opcoes);
  const pelaBlocagem = nivelZero ? blocagemDoEsboco(bruto, estado, { unidade, vizinhos }) : null;
  const { isolado, idsVizinhos } = pelaBlocagem ? { isolado: null, idsVizinhos: pelaBlocagem.vizinhos } : esbocoIsolado(bruto, estado, unidade, vizinhos, opcoes);
  const todas = estado?.unidades?.length ? estado.unidades : planoDeDetalhe(bruto).unidades;
  const u = unidade === null ? null : todas.find((x) => x.id === unidadePorNome(todas, unidade));
  let base = caminho.replace(/(\.esboco)?\.json$/i, '');
  if (saida) { mkdirSync(resolverCaminho(saida), { recursive: true }); base = join(resolverCaminho(saida), basename(base)); }
  const nome = unidade === null ? null : unidade.replace(/[^A-Za-z0-9_-]+/g, '-');
  const destinos = [];
  const svgs = [];
  const notas = [];
  const reaproveitadas = [];
  const explosoes = explosao && isolado ? isolado.opcoes.map(() => explosao) : undefined;
  let navegador = null;
  try {
    for (const v of vista === null ? VISTAS_DA_ANALISE : [vista]) {
      const destino = `${base}${nome === null ? '' : `-unidade-${nome}`}${sufixoDasOpcoes(opcoes)}-${v}.png`;
      destinos.push(destino);
      /* a vista cujo conteúdo não mudou desde a última gravação fica como está */
      const hash = pelaBlocagem ? hashDaBlocagem(pelaBlocagem, v, { largura: larguraPedida }) : hashDaVista(isolado, v, { largura: larguraPedida, corte, explosao, previa, zoomForma });
      let gravado = null;
      try { gravado = readFileSync(`${destino}.hash`, 'utf8').trim(); } catch { /* sem hash gravado */ }
      if (!forcar && gravado === hash && existsSync(destino)) { reaproveitadas.push(true); svgs.push(null); continue; }
      reaproveitadas.push(false);
      navegador ??= await (await import('playwright')).default.chromium.launch();
      const r = pelaBlocagem ? desenharVistaDaBlocagem(pelaBlocagem, v, OPCOES_DA_CAMADA) : desenharEsboco(variante({ ...isolado, ladosPorEscala: isolado.ladosPorEscala ?? true }, { vista: v, legendas: false, centros: false, explosoes }), OPCOES_DA_CAMADA);
      const { svg } = await desenhoParaPng(r, larguraPedida, destino, navegador);
      writeFileSync(`${destino}.hash`, `${hash}\n`);
      svgs.push(svg);
      const e = r.explosao?.find(Boolean);
      if (e) notas.push(`  ${v}: explodida em ${e.eixo}, passo ${String(Math.round(e.passo * 100) / 100).replace('.', ',')} mm, ${e.movidas} de ${e.total} formas deslocadas${!svg.includes('class="explosao-liga"') ? `; nenhuma forma saiu do lugar na tela da vista ${v} (${eixoNaTela(v, e.eixo) ? `as formas estão todas na mesma camada em ${e.eixo}` : `${e.eixo} é o eixo do olho, e deslocar por ele só muda a profundidade`}): tente --eixo com outro eixo, ou a vista isometrica` : ''}`);
    }
  } finally {
    if (navegador) await navegador.close();
  }
  const vistasTexto = `${destinos.length} ${destinos.length === 1 ? 'vista' : 'vistas'}`;
  const cabecalho = `${u === null ? `esboço inteiro, sem legenda, em ${vistasTexto}` : `unidade ${u.id} (${u.membros.length} ${u.membros.length === 1 ? 'forma' : 'formas'}) isolada, sem legenda, em ${vistasTexto}`}${pelaBlocagem ? `, ${pelaBlocagem.texto}` : ''}`;
  return { destinos, svgs, reaproveitadas, unidade: u, vizinhos: idsVizinhos, vizinhosDescritos: idsVizinhos.length > 0 ? descricaoDasVizinhas(bruto, estado, unidade) : [], texto: `${cabecalho}${idsVizinhos.length > 0 ? `, com ${idsVizinhos.length} ${idsVizinhos.length === 1 ? 'forma' : 'formas'} de outra unidade em contorno claro: ${idsVizinhos.slice(0, 8).join(', ')}${idsVizinhos.length > 8 ? ', ...' : ''} (--sem-vizinhos desliga)` : ''}${previa ? ' (prévia: facetas reduzidas e sem arestas finas, rotulada no título; confirme com a imagem completa antes de dar por bom)' : ''}:\n${destinos.map((d, i) => `  ${d}${reaproveitadas[i] ? ' (reaproveitada: o conteúdo não mudou desde a última gravação; --forçar redesenha)' : ''}`).join('\n')}\n${notas.length > 0 ? `${notas.join('\n')}\n` : ''}` };
}

/* `--unidade <nome> [--vista <vista>]`: o mesmo para uma unidade, é a imagem limpa para o crítico visual cego por unidade. */
export function unidadeArquivo(arquivo, unidade, opcoes = {}) {
  return vistasArquivo(arquivo, { ...opcoes, unidade });
}

/* `--composta`: as quatro vistas sem legenda nem linha de centro numa imagem só, em grade 2x2 (isométrica e frontal em cima,
   lateral e superior embaixo), com `largura` px no total (1100 por padrão, metade para cada vista). Cada vista sai de
   `desenhoParaBuffer`, o mesmo desenho por pixel de `desenhoParaPng`, e é composta sobre branco. Com `unidade`, é a unidade
   isolada com os vizinhos em contorno claro, como em `--unidade`. Grava `<nome>[-unidade-<nome>]-composta.png` ao lado do
   esboço (ou em `saida`) e devolve { destino, largura, altura, celula, texto }. */
export const LARGURA_DA_COMPOSTA = 1100;
export async function compostaArquivo(arquivo, { unidade = null, largura = null, saida = null, vizinhos = true, nivelZero = false } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  let estado = null;
  try { estado = JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8')); } catch { /* sem estado: vale o Plano de detalhe do esboço */ }
  const celula = Math.floor((largura ?? LARGURA_DA_COMPOSTA) / 2);
  const pelaBlocagem = nivelZero ? blocagemDoEsboco(bruto, estado, { unidade, vizinhos }) : null;
  const { isolado, idsVizinhos } = pelaBlocagem ? { isolado: null, idsVizinhos: pelaBlocagem.vizinhos } : esbocoIsolado(bruto, estado, unidade, vizinhos);
  const navegador = await (await import('playwright')).default.chromium.launch();
  const imagens = [];
  try {
    for (const v of VISTAS_DA_ANALISE) {
      const r = pelaBlocagem ? desenharVistaDaBlocagem(pelaBlocagem, v, OPCOES_DA_CAMADA) : desenharEsboco(variante({ ...isolado, ladosPorEscala: isolado.ladosPorEscala ?? true }, { vista: v, legendas: false, centros: false }), OPCOES_DA_CAMADA);
      imagens.push(PNG.sync.read((await desenhoParaBuffer(r, celula, navegador)).png));
    }
  } finally {
    await navegador.close();
  }
  const grade = comporGrade(imagens, celula);
  let base = caminho.replace(/(\.esboco)?\.json$/i, '');
  if (saida) { mkdirSync(resolverCaminho(saida), { recursive: true }); base = join(resolverCaminho(saida), basename(base)); }
  const destino = `${base}${unidade === null ? '' : `-unidade-${unidade.replace(/[^A-Za-z0-9_-]+/g, '-')}`}${nivelZero ? '-nivel-zero' : ''}-composta.png`;
  writeFileSync(destino, PNG.sync.write(grade));
  const alvo = unidade === null ? 'esboço inteiro' : `unidade ${unidade} isolada`;
  const notaVizinhos = idsVizinhos.length > 0 ? `, com ${idsVizinhos.length} ${idsVizinhos.length === 1 ? 'forma' : 'formas'} de outra unidade em contorno claro (--sem-vizinhos desliga)` : '';
  return { destino, largura: grade.width, altura: grade.height, celula, texto: `composta de ${alvo}, sem legenda, ${grade.width}x${grade.height} px (${celula} px cada vista; isométrica e frontal em cima, lateral e superior embaixo)${pelaBlocagem ? `, ${pelaBlocagem.texto}` : ''}${notaVizinhos}\n  ${destino}\n` };
}

/* A grade 2x2 das vistas (na ordem de `VISTAS_DA_ANALISE`), cada uma centrada na sua linha e composta sobre branco. */
function comporGrade(imagens, celula) {
  const [a, b, c, d] = imagens;
  if (imagens.some((i) => i.width !== celula)) throw new ErroDeEsboco(`composta: cada vista precisa ter ${celula} px de largura`);
  const alturaDaLinha1 = Math.max(a.height, b.height);
  const alturaDaLinha2 = Math.max(c.height, d.height);
  const grade = new PNG({ width: celula * 2, height: alturaDaLinha1 + alturaDaLinha2 });
  grade.data.fill(255);
  const posicoes = [[a, 0, 0, alturaDaLinha1], [b, celula, 0, alturaDaLinha1], [c, 0, alturaDaLinha1, alturaDaLinha2], [d, celula, alturaDaLinha1, alturaDaLinha2]];
  for (const [img, x0, y0, alturaDaLinha] of posicoes) {
    const dy = Math.floor((alturaDaLinha - img.height) / 2);
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const s = (y * img.width + x) * 4;
        const t = ((y0 + dy + y) * grade.width + x0 + x) * 4;
        const alfa = img.data[s + 3] / 255;
        for (let k = 0; k < 3; k++) grade.data[t + k] = Math.round(img.data[s + k] * alfa + 255 * (1 - alfa));
        grade.data[t + 3] = 255;
      }
    }
  }
  return grade;
}

/* A escala ancorada da nota, igual no agente `critico-visual` e nas perguntas da nota da unidade e do Marco. */
export const ESCALA_DA_NOTA = '10: nenhum achado. 8 e 9: só detalhe de superfície, acabamento ou proporção fina. 5 a 7: pelo menos um defeito estrutural (ponta no ar, travessia sem explicação, peça fora de onde deveria estar presa, peça sem função). 0 a 4: a unidade não cumpre a funcao. Nota abaixo de 8 tem de citar o defeito estrutural que a puxou; detalhe de superfície sozinho não desce a nota abaixo de 8.';
const PERGUNTA_DA_NOTA = (para) => `Nota de 0 a 10 para ${para}, com a razão em uma frase. Escala: ${ESCALA_DA_NOTA}`;

/* O último veredito de `chave` (unidade ou `marco-<N>`) no estado do condutor, ou null. */
function vereditoAnterior(arquivo, chave) {
  try {
    const estado = JSON.parse(readFileSync(`${resolverCaminho(arquivo)}.condutor.json`, 'utf8'));
    return [...(estado.vereditos ?? [])].reverse().find((v) => v.unidade === chave) ?? null;
  } catch { return null; }
}
const linhasDoAnterior = (v, recuo) => v === null ? [] : [`${recuo}Veredito anterior (rodada passada): nota ${String(v.nota).replace('.', ',')}, motivo: ${v.motivo}`, `${recuo}Diga, para cada defeito desse motivo, se foi resolvido ou não, e não conte como novo o que já foi apontado.`];

/* As cinco perguntas fixas do crítico visual cego por unidade. */
export const PERGUNTAS_DO_CRITICO = [
  'Que pontas ficam no ar, sem encostar em nada?',
  'O que atravessa o quê, sem que a forma explique a travessia?',
  'O que está fora do lugar em relação à parte a que deveria estar preso?',
  'O que a vista mostra que o nome da peça não explica?',
  PERGUNTA_DA_NOTA('a unidade como parte do objeto'),
];
export const LARGURA_DO_CRITICO = 1100;

/* O brief pronto para o crítico cego de uma unidade grande: gera as quatro vistas `--unidade` numa pasta (`--saida`, ou
   `<nome>-critico-<unidade>` ao lado do esboço) e devolve o texto a passar ao agente `critico-visual`, que é despachado pela
   skill (o comando não despacha agente). */
export async function briefDoCritico(arquivo, unidade, { largura = null, saida = null, forcar = false, vizinhos = true } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const pasta = saida ?? `${caminho.replace(/(\.esboco)?\.json$/i, '')}-critico-${unidade.replace(/[^A-Za-z0-9_-]+/g, '-')}`;
  const r = await unidadeArquivo(arquivo, unidade, { largura: largura ?? LARGURA_DO_CRITICO, saida: pasta, forcar, vizinhos });
  const funcao = funcaoDaUnidade(bruto, r.unidade.id);
  const L = [`crítico por unidade: a unidade ${r.unidade.id} (${r.unidade.membros.length} formas) tem mais de ${LIMITE_DA_FUNCAO} formas e precisa do crítico cego antes de a próxima começar.`];
  L.push('Despache o agente critico-visual (Sonnet) com o brief abaixo e as quatro imagens, sem o JSON, o plano nem o histórico; depois registre o veredito: --condutor --veredito <unidade> --nota <0-10> --motivo <o que ele apontou>.');
  L.push('--- brief para o crítico cego ---');
  L.push(`Função da unidade: ${funcao ?? '(não declarada)'}`);
  L.push(...linhasDoAnterior(vereditoAnterior(arquivo, r.unidade.id), ''));
  L.push(`Imagens (as quatro vistas da unidade isolada, sem legenda${r.vizinhos.length > 0 ? '; as peças em contorno claro são de outras unidades e só mostram onde esta se prende, não as julgue' : ''}):`);
  for (const d of r.destinos) L.push(`  ${d}`);
  if (r.vizinhosDescritos.length > 0) {
    L.push('Peças em cinza (de outras unidades, só mostram onde esta se prende; as imagens seguem sem legenda):');
    for (const v of r.vizinhosDescritos) L.push(`  ${v.id}${v.rotulo ? ` (${v.rotulo})` : ''}: unidade ${v.unidade}${v.funcao ? `, função: ${v.funcao}` : ''}`);
  }
  L.push('Ligações da unidade em texto (o --ligacoes: quem toca quem, em quantos pontos distintos, pontas livres); confira se as imagens mostram o mesmo:');
  for (const linha of ligacoesArquivo(arquivo, { unidade: r.unidade.id }).texto.trimEnd().split('\n').slice(1)) L.push(`  ${linha}`);
  L.push('Responda, olhando só as imagens:');
  PERGUNTAS_DO_CRITICO.forEach((p, i) => L.push(`  ${i + 1}. ${p}`));
  L.push('--- fim do brief ---');
  return { texto: `${L.join('\n')}\n`, destinos: r.destinos, pasta, funcao };
}

/* As perguntas fixas do crítico cego do Marco: o objeto inteiro nas quatro vistas gerais, e o relato por unidade. */
export const PERGUNTAS_DO_MARCO = [
  'O que, no objeto inteiro, parece ficar no ar, atravessar outra coisa ou estar fora do lugar?',
  'Por unidade nova (listada acima), liste as peças sem função: as que a vista não explica nem pela forma nem pela posição.',
  'Por unidade nova (listada acima), liste as peças sem ligação: as que não estão presas a nenhuma outra nem têm a ponta explicada.',
  PERGUNTA_DA_NOTA('o objeto até aqui'),
];

/* O brief do crítico cego de um Marco: as quatro vistas gerais sem legenda (`<nome>-marco-<limiar>-<vista>.png`), e, para cada
   unidade fechada desde o Marco anterior, as vistas `--unidade` e a `funcao`. Grava numa pasta (`--saida`, ou
   `<nome>-critico-marco-<limiar>`); o comando não despacha agente. */
export async function briefDoMarco(arquivo, limiar, { largura = null, saida = null } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const estado = JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8'));
  const novas = unidadesNovasDoMarco(estado, limiar);
  if (!(estado.marcos ?? []).some((m) => m.limiar === limiar)) throw new ErroDeEsboco(`--marco: o Marco de ${limiar}% não está registrado`);
  const pasta = resolverCaminho(saida ?? `${caminho.replace(/(\.esboco)?\.json$/i, '')}-critico-marco-${limiar}`);
  mkdirSync(pasta, { recursive: true });
  const base = join(pasta, basename(caminho.replace(/(\.esboco)?\.json$/i, '')));
  const geral = expandirEsboco(bruto);
  const gerais = [];
  const navegador = await (await import('playwright')).default.chromium.launch();
  try {
    for (const v of VISTAS_DA_ANALISE) {
      const r = desenharEsboco(variante({ ...geral, ladosPorEscala: geral.ladosPorEscala ?? true }, { vista: v, legendas: false, centros: false }), OPCOES_DA_CAMADA);
      const destino = `${base}-marco-${limiar}-${v}.png`;
      await desenhoParaPng(r, largura ?? LARGURA_DO_CRITICO, destino, navegador);
      gerais.push(destino);
    }
  } finally {
    await navegador.close();
  }
  const L = [`crítico do Marco: marco de ${limiar}% do custo estimado, com ${novas.length} ${novas.length === 1 ? 'unidade nova' : 'unidades novas'} desde o Marco anterior.`];
  L.push(`Despache o agente critico-visual (Sonnet) com o brief abaixo e as imagens, sem o JSON, o plano nem o histórico; depois registre o veredito: --condutor --veredito marco-${limiar} --nota <0-10> --motivo <o que ele apontou>.`);
  L.push('--- brief para o crítico cego ---');
  L.push(...linhasDoAnterior(vereditoAnterior(arquivo, `marco-${limiar}`), ''));
  L.push('Imagens gerais do objeto (as quatro vistas, sem legenda):');
  for (const d of gerais) L.push(`  ${d}`);
  const unidades = [];
  for (const id of novas) {
    const r = await unidadeArquivo(arquivo, id, { largura: largura ?? LARGURA_DO_CRITICO, saida: pasta });
    const funcao = funcaoDaUnidade(bruto, r.unidade.id);
    unidades.push({ id: r.unidade.id, destinos: r.destinos, funcao });
    L.push(`Unidade ${r.unidade.id} (${r.unidade.membros.length} ${r.unidade.membros.length === 1 ? 'forma' : 'formas'}). Função da unidade: ${funcao ?? '(não declarada)'}`);
    for (const d of r.destinos) L.push(`  ${d}`);
    L.push(...linhasDoAnterior(vereditoAnterior(arquivo, r.unidade.id), '  '));
    if (r.vizinhosDescritos.length > 0) {
      L.push('  Peças em cinza (de outras unidades, só mostram onde esta se prende):');
      for (const v of r.vizinhosDescritos) L.push(`    ${v.id}${v.rotulo ? ` (${v.rotulo})` : ''}: unidade ${v.unidade}${v.funcao ? `, função: ${v.funcao}` : ''}`);
    }
    L.push('  Ligações da unidade em texto (o --ligacoes):');
    for (const linha of ligacoesArquivo(arquivo, { unidade: r.unidade.id }).texto.trimEnd().split('\n').slice(1)) L.push(`    ${linha}`);
  }
  L.push(...ligacoesArquivo(arquivo).texto.trimEnd().split('\n').slice(-1));
  L.push('Responda, olhando só as imagens:');
  PERGUNTAS_DO_MARCO.forEach((p, i) => L.push(`  ${i + 1}. ${p}`));
  L.push('--- fim do brief ---');
  return { texto: `${L.join('\n')}\n`, gerais, unidades, pasta };
}

/* As perguntas do crítico do objeto inteiro, no nível sem Detalhe por unidade: as da unidade, ditas do objeto. */
export const PERGUNTAS_DO_OBJETO = [
  'Que pontas ficam no ar, sem encostar em nada?',
  'O que atravessa o quê, sem que a forma explique a travessia?',
  'O que está fora do lugar em relação à parte a que deveria estar preso?',
  'O que a vista mostra que a função do objeto não explica?',
  PERGUNTA_DA_NOTA('o objeto'),
];

/* O brief do crítico cego do objeto inteiro, que o nível sem Detalhe por unidade pede antes de concluir: as quatro vistas
   gerais sem legenda (`<nome>-objeto-<vista>.png`), o objeto pelo título e pela nota do esboço, o veredito anterior quando
   houver e as ligações em texto. */
export async function briefDoObjeto(arquivo, { largura = null, saida = null } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const pasta = resolverCaminho(saida ?? `${caminho.replace(/(\.esboco)?\.json$/i, '')}-critico-objeto`);
  mkdirSync(pasta, { recursive: true });
  const base = join(pasta, basename(caminho.replace(/(\.esboco)?\.json$/i, '')));
  const geral = expandirEsboco(bruto);
  const gerais = [];
  const navegador = await (await import('playwright')).default.chromium.launch();
  try {
    for (const v of VISTAS_DA_ANALISE) {
      const r = desenharEsboco(variante({ ...geral, ladosPorEscala: geral.ladosPorEscala ?? true }, { vista: v, legendas: false, centros: false }), OPCOES_DA_CAMADA);
      const destino = `${base}-objeto-${v}.png`;
      await desenhoParaPng(r, largura ?? LARGURA_DO_CRITICO, destino, navegador);
      gerais.push(destino);
    }
  } finally {
    await navegador.close();
  }
  const primeira = Array.isArray(bruto.opcoes) ? bruto.opcoes[0] ?? {} : {};
  const objeto = [primeira.titulo ?? bruto.titulo, primeira.nota ?? bruto.nota].filter((x) => typeof x === 'string' && x.trim()).join(': ');
  const L = ['crítico do objeto: o nível deste esboço não tem Detalhe por unidade, e a conclusão espera o veredito do crítico sobre o objeto inteiro.'];
  L.push(`Despache o agente critico-visual (Sonnet) com o brief abaixo e as imagens, sem o JSON, o plano nem o histórico; depois registre o veredito: --condutor --veredito ${UNIDADE_DO_OBJETO} --nota <0-10> --motivo <o que ele apontou> e rode --proximo de novo.`);
  L.push('--- brief para o crítico cego ---');
  L.push(`Objeto: ${objeto || '(sem título no esboço)'}`);
  L.push(...linhasDoAnterior(vereditoAnterior(arquivo, UNIDADE_DO_OBJETO), ''));
  L.push('Imagens do objeto (as quatro vistas, sem legenda):');
  for (const d of gerais) L.push(`  ${d}`);
  L.push('Responda, olhando só as imagens:');
  PERGUNTAS_DO_OBJETO.forEach((p, i) => L.push(`  ${i + 1}. ${p}`));
  L.push('--- fim do brief ---');
  return { texto: `${L.join('\n')}\n`, gerais, pasta };
}

/* `--medidas`: cada medida do `plano.medidas` com o valor declarado, o medido na geometria (a medição do gate), o desvio e a
   tolerância, em texto, sem imagem e sem gravar nada. Sai com 0: quem decide é o gate. */
export function medidasArquivo(arquivo) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  const { plano } = medirEsboco(bruto, { projecao: false, referencias: referenciasDoEsboco(bruto, dirname(caminho)), unidades: unidadesGravadas(caminho) });
  const n = (x) => String(x).replace('.', ',');
  const L = [];
  for (const [i, o] of plano.opcoes.entries()) {
    if (o.medidas.length === 0) continue;
    L.push(`opção ${i + 1} (${o.titulo}):`);
    for (const m of o.medidas) L.push(m.tipo === 'razao'
      ? `  ${m.nome}: razão ${n(m.medido)} (${n(m.a_mm)} mm sobre ${n(m.b_mm)} mm), faixa ${n(m.faixa[0])} a ${n(m.faixa[1])}, ${m.ok ? 'dentro' : 'fora'}${m.ok ? '' : ` (${m.desvio < 0 ? 'abaixo' : 'acima'} da faixa por ${n(Math.abs(m.desvio))})`}`
      : `  ${m.nome}: declarado ${n(m.esperado_mm)} mm, medido ${n(m.medido_mm)} mm, desvio ${n(m.desvio_mm)} mm (tolerância ${n(m.tolerancia_mm)} mm), ${m.ok ? 'dentro' : 'fora'}`);
  }
  if (L.length === 0) L.push('sem plano.medidas: nada a medir');
  return { texto: `${L.join('\n')}\n`, codigo: 0, medidas: plano.opcoes };
}

/* `--ligacoes [--unidade <nome>] [--forma <id>]`: o mapa de ligações em texto (quem toca quem, em quantos pontos distintos, as
   pontas livres e as unidades presas a nada), por unidade ou, com `--forma`, por forma (ou por instância de componente). As
   unidades são as do estado do Condutor gravado ao lado, ou o Plano de detalhe do esboço. Sem imagem, sem gravar nada, sai com 0. */
export function ligacoesArquivo(arquivo, { unidade = null, forma = null } = {}) {
  const caminho = resolverCaminho(arquivo);
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  let estado = null;
  try { estado = JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8')); } catch { /* sem estado: vale o Plano de detalhe do esboço */ }
  const todas = estado?.unidades?.length ? estado.unidades : planoDeDetalhe(bruto).unidades;
  const funcoes = Object.fromEntries(todas.map((u) => [u.id, funcaoDaUnidade(bruto, u.id)]).filter(([, f]) => f));
  const mapa = mapaDeLigacoes(bruto, { unidades: todas, funcoes });
  const nome = unidade === null ? null : unidadePorNome(todas, unidade);
  return { texto: formatarLigacoes(mapa, { unidade: nome, forma }), codigo: 0, mapa };
}

/* `--editar <arquivo> <forma>.<campo>=<valor> ...`, `--remover <forma>` e `--adicionar <json-da-forma>`: muda o JSON declarado
   sem regravá-lo à mão. Só grava se o esboço editado passa pelo esquema e resolve; sem isso diz o campo e o válido e não
   toca o arquivo. Imprime as mudanças e a leitura padrão das divergências depois delas. */
export function editarArquivo(arquivo, { atribuicoes = [], remover = [], adicionar = [], unidade } = {}) {
  const caminho = resolverCaminho(arquivo);
  const texto = readFileSync(caminho, 'utf8');
  if (atribuicoes.length + remover.length + adicionar.length === 0) throw new ErroDeEsboco('--editar precisa de pelo menos uma edição: <forma>.<campo>=<valor>, --remover <forma> ou --adicionar <json-da-forma>');
  let medido;
  let editado;
  try {
    editado = editarEsboco(JSON.parse(texto), { atribuicoes, remover, adicionar, unidade });
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
const FLAGS_COM_VALOR = ['--ajuda', '--forma', '--achado', '--condutor', '--feito', '--mover', '--para', '--motivo', '--vista', '--referencia', '--medidas-da-referencia', '--ancoras', '--envelope', '--composicoes', '--mover-lote', '--detalhar', '--integrar', '--unidade', '--remover', '--adicionar', '--largura', '--saida', '--veredito', '--liberar', '--nota', '--tokens', '--corte', '--lado', '--eixo', '--distancia', '--zoom-forma', '--margem', '--modo', '--nota-de-passagem', '--texto'];
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
  return { alvo, edicao: { atribuicoes, remover: remover.filter((x) => x !== undefined), adicionar: adicionar.filter((x) => x !== undefined), ...(valores.get('--unidade') === undefined ? {} : { unidade: valores.get('--unidade') }) }, tem: (f) => flags.has(f), valor: (f, k = 0) => valores.get(k === 0 ? f : `${f}#${k + 1}`), zoom: argv.find((a) => a.startsWith('--zoom=')) };
}

async function principal(argv) {
  const args = lerArgumentos(argv);
  const alvo = args.alvo;
  if (args.tem('--ajuda')) {
    const r = ajuda(args.valor('--ajuda') ?? null);
    if (args.valor('--ajuda')) registrarUso({ evento: 'ajuda', topico: String(args.valor('--ajuda')).trim().toLowerCase(), achado: r.codigo === 0 });
    (r.codigo === 0 ? process.stdout : process.stderr).write(r.texto);
    return r.codigo;
  }
  if (args.tem('--medidas-da-referencia')) {
    if (args.valor('--medidas-da-referencia') === undefined) { recusar('--medidas-da-referencia precisa do JSON de contornos (--medidas-da-referencia <contorno.json>).'); return 1; }
    try {
      process.stdout.write(medidasDaReferenciaArquivo(args.valor('--medidas-da-referencia'), { vista: args.valor('--vista') ?? null, esboco: alvo ?? null }).texto);
      return 0;
    } catch (e) {
      if (e.code === 'ENOENT' || e instanceof ErroDeEsboco || e instanceof SyntaxError) { recusar(e.code === 'ENOENT' ? `arquivo não encontrado (${e.path ?? args.valor('--medidas-da-referencia')})` : e.message, e); return 1; }
      throw e;
    }
  }
  if (!alvo) { process.stderr.write('uso: npm run esboco -- --ajuda [tópico] | <arquivo.esboco.json> [--estrito] [--descrever [--forma <id>] [--completo] [--mudou] [--json]] [--achado <n>] [--ajustar] [--rapido] [--analise [--sugerir] [--centros] [--largura <px>] [--saida <pasta>] [--zoom=<vista>:x0,y0,x1,y1]] [--composta [--unidade <unidade>] [--nivel-zero] [--largura <px>] [--saida <pasta>]] [--condutor [--historico] [--proximo | --feito <unidade> | --modo <objeto|por-unidade> | --nota-de-passagem <unidade> --texto <texto> | --veredito <unidade> --nota <0-10> [--tokens <n>] --motivo <texto> | --liberar <unidade|marco-N> --motivo <texto> | --mover <forma|instancia|padrao|a,b> --para <unidade> --motivo <texto> | --mover-lote <arquivo.json> | --replanejar --motivo <texto>]] [--detalhar <unidade> [arquivo]] [--medidas] [--ligacoes [--unidade <unidade>] [--forma <id>]] [--unidade <unidade> [--sem-vizinhos]] [--nivel-zero] [--vista <vista>] [--largura <px>] [--saida <pasta>] [--corte <x|y|z>=<mm> [--lado +|-]] [--explodir [--eixo <x|y|z>] [--distancia <mm>]] [--zoom-forma <id|instancia|padrao> [--margem <mm>]] [--previa] [--forçar] [--editar <arquivo> <forma>.<campo>=<valor> ... [--remover <forma[,forma]>] [--adicionar <json-da-forma ou arranja> [--unidade <unidade>]]] [--integrar <unidade> <arquivo-detalhado.esboco.json>] [--envelope <unidade> <arquivo-detalhado.esboco.json|receita.js> [--composicoes <módulo-do-registro>]] [--referencia <contorno.json ou imagem.png> [--vista <vista>] [--ancoras <json>] [--imagem]]\n       npm run esboco -- --medidas-da-referencia <contorno.json> [--vista <vista>] [<arquivo.esboco.json>]\n'); return 2; }
  const estrito = args.tem('--estrito');
  try {
    if (args.tem('--mudou') && !args.tem('--descrever')) throw new ErroDeEsboco('--mudou só vale junto de --descrever.');
    for (const f of ['--largura', '--saida', '--veredito', '--liberar', '--nota', '--tokens', '--forma', '--achado', '--feito', '--mover', '--mover-lote', '--para', '--motivo', '--vista', '--referencia', '--ancoras', '--detalhar', '--unidade', '--remover', '--adicionar', '--corte', '--lado', '--eixo', '--distancia', '--zoom-forma', '--margem', '--modo', '--nota-de-passagem', '--texto']) if (args.tem(f) && args.valor(f) === undefined) throw new ErroDeEsboco(`${f} precisa de um valor (${f} <valor>).`);
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
    if (args.tem('--ligacoes')) {
      process.stdout.write(ligacoesArquivo(alvo, { unidade: args.valor('--unidade') ?? null, forma: args.valor('--forma') ?? null }).texto);
      return 0;
    }
    if (args.tem('--medidas')) {
      process.stdout.write(medidasArquivo(alvo).texto);
      return 0;
    }
    if (args.tem('--composta')) {
      if (args.tem('--vista')) throw new ErroDeEsboco('--composta junta as quatro vistas numa imagem; --vista não vale junto (use --unidade <unidade> --vista <vista> para uma vista só).');
      const r = await compostaArquivo(alvo, { unidade: args.valor('--unidade') ?? null, largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null, vizinhos: !args.tem('--sem-vizinhos'), nivelZero: args.tem('--nivel-zero') });
      process.stdout.write(r.texto);
      return 0;
    }
    if (args.tem('--nivel-zero') && args.tem('--analise')) throw new ErroDeEsboco('--nivel-zero vale com --composta, --unidade ou --vista, e não com --analise.');
    if (args.tem('--analise') && ['--corte', '--explodir', '--previa', '--zoom-forma'].some((f) => args.tem(f))) throw new ErroDeEsboco('--corte, --explodir, --previa e --zoom-forma geram as vistas isoladas (com --unidade ou do esboço inteiro) e não valem junto de --analise.');
    if (args.tem('--lado') && !args.tem('--corte')) throw new ErroDeEsboco('--lado só vale junto de --corte.');
    /* `--vista <vista>` sozinho grava a vista isolada do esboço inteiro; antes caía na leitura padrão e não gravava nada. */
    const vistaIsolada = args.tem('--vista') && !['--achado', '--analise', '--descrever', '--forma'].some((f) => args.tem(f));
    if (args.tem('--unidade') || args.tem('--corte') || args.tem('--explodir') || args.tem('--previa') || args.tem('--zoom-forma') || args.tem('--nivel-zero') || vistaIsolada) {
      const opcoes = { vista: args.valor('--vista') ?? null, largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null, corte: args.tem('--corte') ? lerCorteDaLinha(args.valor('--corte'), args.valor('--lado')) : null, explosao: lerExplosaoDaLinha({ explodir: args.tem('--explodir'), eixo: args.valor('--eixo'), distancia: args.valor('--distancia') }), previa: args.tem('--previa'), zoomForma: lerZoomFormaDaLinha({ zoomForma: args.valor('--zoom-forma'), margem: args.valor('--margem') }), forcar: args.tem('--forçar') || args.tem('--forcar'), vizinhos: !args.tem('--sem-vizinhos'), nivelZero: args.tem('--nivel-zero') };
      const r = args.tem('--unidade') ? await unidadeArquivo(alvo, args.valor('--unidade'), opcoes) : await vistasArquivo(alvo, opcoes);
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
      const foraDoEnvelope = r.resultado.envelope && !r.resultado.envelope.ok;
      if (foraDoEnvelope) process.stdout.write(`${dica('envelope')}\n`);
      return foraDoEnvelope ? 1 : 0;
    }
    if (args.tem('--condutor') || args.tem('--envelope') || ['--proximo', '--feito', '--veredito', '--liberar', '--mover', '--mover-lote', '--replanejar', '--modo', '--nota-de-passagem'].some((f) => args.tem(f))) {
      /* o detalhe que é uma receita (.js ou .mjs) é conferido pelo verificador do REFINA em vez do Envelope do esboço */
      let envelope;
      if (args.tem('--envelope')) {
        envelope = { unidade: args.valor('--envelope'), arquivo: args.valor('--envelope', 1) };
        if (/\.m?js$/i.test(envelope.arquivo ?? '')) {
          const caminho = resolverCaminho(alvo);
          let estadoGravado = null;
          try { estadoGravado = JSON.parse(readFileSync(`${caminho}.condutor.json`, 'utf8')); } catch { /* sem estado: vale o Plano de detalhe do esboço */ }
          envelope.resultado = await envelopeDaReceitaArquivo({ bruto: JSON.parse(readFileSync(caminho, 'utf8')), estado: estadoGravado, unidade: envelope.unidade, caminhoDaReceita: resolverCaminho(envelope.arquivo), composicoes: args.valor('--composicoes') ?? null });
        }
      }
      const r = condutorArquivo(alvo, { envelope, proximo: args.tem('--proximo'), feito: args.valor('--feito'), veredito: args.valor('--veredito'), liberar: args.valor('--liberar'), nota: args.valor('--nota'), tokens: args.valor('--tokens') !== undefined ? Number(args.valor('--tokens')) : undefined, mover: args.valor('--mover'), moverLote: args.valor('--mover-lote'), historico: args.tem('--historico'), para: args.valor('--para'), motivo: args.valor('--motivo'), replanejar: args.tem('--replanejar'), modo: args.valor('--modo'), notaDePassagem: args.valor('--nota-de-passagem'), texto: args.valor('--texto') });
      process.stdout.write(r.texto);
      process.stdout.write(dicaDoCondutor(r, args));
      if (r.criticoDe) process.stdout.write((await briefDoCritico(alvo, r.criticoDe, { largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null, forcar: r.refeita, vizinhos: !args.tem('--sem-vizinhos') })).texto);
      if (r.marcoDe) process.stdout.write((await briefDoMarco(alvo, r.marcoDe.limiar, { largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null })).texto);
      if (r.objetoDe) process.stdout.write((await briefDoObjeto(alvo, { largura: lerLargura(args.valor('--largura')), saida: args.valor('--saida') ?? null })).texto);
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
        : `análise do esboço: ${manifesto.arquivos.length} imagens em ${pasta}\n${manifesto.arquivos.map((a) => `  ${a}`).join('\n')}\n${(manifesto.achados ?? []).length ? `imagens dos achados (o par colorido, o resto em cinza, com zoom no ponto):\n${manifesto.achados.map((a) => `  ${a.arquivo}: [${a.n}] ${a.classe}: ${a.texto}`).join('\n')}\n` : ''}Abra a composta (--composta) antes de dar o esboço por bom, e a vista inteira só onde ela, o gate ou o crítico apontarem algo (docs/mecanifica/usar/PARE-E-ANALISE.md).\n`;
      process.stdout.write(`${cabecalho}${relatarContato(manifesto.contato)}${relatarProjecao(manifesto.projecao)}${!manifesto.sugerir && Object.values(manifesto.projecao.porVista).some((l) => l.length > 0) && manifesto.projecao.explosao.length === 0 ? 'explosão e deslocamento sugeridos: rode com --sugerir (leva minutos numa moto densa).\n' : ''}`);
      return estrito && (manifesto.contato.resultado === 'reprovado' || manifesto.projecao.resultado === 'reprovado') ? 1 : 0;
    }
    const r = await gerarEsboco(alvo, { rapido: args.tem('--rapido') });
    process.stdout.write(`esboço ${r.largura}x${r.altura} px, ${r.escala.toFixed(3)} px/mm${r.png ? '' : ' (modo rápido: só o SVG, com menos lados nos círculos)'}\n${r.png ? `  ${r.png}\n` : ''}  ${r.svg}\n${relatarContato(r.contato)}${relatarProjecao(r.projecao)}`);
    return estrito && (r.contato.resultado === 'reprovado' || r.projecao.resultado === 'reprovado') ? 1 : 0;
  } catch (e) {
    if (e.code === 'ENOENT') { recusar(`arquivo não encontrado (${alvo})`, e); return 1; }
    if (e instanceof ErroDeEsboco || e instanceof SyntaxError) { recusar(e.message, e); return 1; }
    throw e;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await principal(process.argv.slice(2));
