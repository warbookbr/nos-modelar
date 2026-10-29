#!/usr/bin/env node
/* medida-do-desenho.mjs — mede o desenho de linhas das peças contra uma referência exata e o gate `desenho:check`.
 *
 *   npm run desenho:medir [-- --so=c09,c01] [--vista=isometrica] [--tolerancia=2] [--saida=<pasta>] [--json]
 *   npm run desenho:check
 *
 * O desenho de linhas (`desenharBlocagem`, com a camada de profundidade e o recorte das linhas) escolhe as arestas que traça. Esta
 * medida não olha essa escolha: renderiza a mesma malha, com a mesma projeção, a mesma escala e o mesmo enquadramento, em WebGL no
 * Chromium com o Three.js de `node_modules`, guardando por pixel a profundidade e a normal da face, com supersampling (4 amostras por
 * lado do pixel do PNG), e tira as arestas no espaço da tela: o degrau de profundidade (a silhueta e a oclusão) e a mudança de
 * normal acima de 30 graus (o vinco). A malha não tem topologia nem divisão em partes aqui. O resultado, reduzido ao tamanho do PNG
 * do desenho (um pixel tem aresta quando alguma amostra dele tem), é comparado só na área dos painéis, sem título, nota nem barra de
 * escala: vazamento é pixel de traço do desenho a mais de `tolerancia` pixels de qualquer aresta da referência, falha é pixel de
 * aresta da referência a mais de `tolerancia` pixels de qualquer traço. O relato diz, por imagem e vista, os pixels e os grupos de
 * cada tipo, com a posição, e grava uma imagem de diagnóstico: os vazamentos em vermelho e as falhas em azul sobre o desenho.
 *
 * `conferir` é o gate: prova a medida em casos montados à mão (ela dá zero no desenho certo e acusa o traço plantado e o traço
 * tirado) e mede as quarenta e oito vistas do conjunto de calibração do crítico, e reprova com qualquer pixel de vazamento ou de
 * falha que o registro das causas (`desenho-das-linhas/causas.json`, vazio quando o desenho zera) não declare.
 *
 * A imagem de um esboço (as de fonte `esboco` do conjunto) é desenhada pelo desenhista das formas, que não tem malha: a referência
 * dela é feita com as faces da própria camada (os polígonos já projetados, com a profundidade de cada vértice), o que ainda deixa as
 * arestas por conta da tela e não da lista de traços. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import earcut from 'earcut';
import { PNG } from 'pngjs';
import { QUADRO, VISTAS } from '../../modulos/esboco/src/index.js';
import { COSSENO_DO_VINCO, desenharBlocagem, FOLGA_DO_VINCO, geometria } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import {
  arestaPorHisterese, DEGRAU_MINIMO_DA_REFERENCIA, SUPERAMOSTRAGEM_DA_REFERENCIA, TOLERANCIA_DO_DESENHO, baseDaVista, compararComAReferencia, mascaraDosTracos,
  triangulosDaReferencia,
} from '../../modulos/esboco/src/medida-do-desenho.js';
import { passoDeDesempate } from '../../modulos/esboco/src/camada.js';
import { LARGURA_DAS_VISTAS, VISTAS_DO_CONJUNTO } from '../../src/autoria/calibracao-do-critico.js';
import { desenhoParaBuffer, paginaDaCamada } from './esboco.mjs';
import { desenhosDoObjeto } from './esboco.mjs';
import {
  ErroDaFonte, RAIZ, PASTA_DO_CONJUNTO, chamadaDaFonte, esbocoDaFonte, executarChamada, lerConjuntoDoDisco, painelDoNeutro,
} from './calibracao-do-critico.mjs';

/* o vinco a partir do qual duas faces vizinhas formam aresta: acima de 30 graus, e o empate do ângulo exato (12 lados) é o da regra do
   desenho (`FOLGA_DO_VINCO`), que o arredondamento de uma conta e de outra decidiria ao acaso */
const COSSENO_DA_REFERENCIA = COSSENO_DO_VINCO - FOLGA_DO_VINCO;
/* a inclinação da superfície acima da qual o degrau de profundidade não é mais medido contra a inclinação (a face quase de perfil) */
const INCLINACAO_MAXIMA_DA_REFERENCIA = 20;
/* quanto a inclinação das duas superfícies vizinhas, vezes o passo do pixel, soma de folga ao degrau mínimo */
const FATOR_DA_INCLINACAO = 0.5;
const LINHAS_POR_FAIXA = 1200;

export class ErroDeMedida extends Error {}

/* Roda dentro do Chromium: renderiza os triângulos com profundidade e normal por amostra (WebGL2, alvo de ponto flutuante, sem
   mistura nem suavização) e reduz as arestas ao pixel do PNG, por faixas de linhas para a memória não crescer com o quadro.
   Devolve, por pixel, quatro bytes: aresta (qualquer), aresta de profundidade, aresta de vinco e cobertura. */
const RENDERIZAR_REFERENCIA = async (texto) => {
  const a = JSON.parse(texto);
  if (!window.referenciaDoDesenho) {
    const T0 = await new Function('u', 'return import(u)')('/three.module.js');
    T0.ColorManagement.enabled = false;
    const canvas0 = document.createElement('canvas');
    document.body.append(canvas0);
    const renderer0 = new T0.WebGLRenderer({ canvas: canvas0, antialias: false, alpha: false, preserveDrawingBuffer: false });
    renderer0.setPixelRatio(1);
    window.referenciaDoDesenho = { T: T0, renderer: renderer0 };
  }
  const { T, renderer } = window.referenciaDoDesenho;
  const { W, H, ss, largura, altura, linhas: [ya, yb], faixa } = a;
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(a.pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(a.nor, 3));
  const folga = 1;
  const z0 = a.zMin - folga;
  const zr = a.zMax + folga - z0;
  const faces = new T.ShaderMaterial({
    glslVersion: T.GLSL3,
    side: T.DoubleSide,
    blending: T.NoBlending,
    uniforms: { uQuadro: { value: new T.Vector3(largura, 0, 1) }, uZ: { value: new T.Vector2(z0, zr) } },
    vertexShader: `
      uniform vec3 uQuadro; uniform vec2 uZ;
      out vec3 vN; out float vZ;
      void main() {
        vN = normal; vZ = position.z - uZ.x;
        float nx = position.x / uQuadro.x * 2.0 - 1.0;
        float ny = (position.y - uQuadro.y) / (uQuadro.z - uQuadro.y) * 2.0 - 1.0;
        float nz = 1.0 - 2.0 * (vZ / uZ.y);
        gl_Position = vec4(nx, ny, nz, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      in vec3 vN; in float vZ;
      layout(location = 0) out highp vec4 saida;
      void main() { saida = vec4(vN, vZ); }`,
  });
  const malha = new T.Mesh(geo, faces);
  malha.frustumCulled = false;
  const cenaFaces = new T.Scene();
  cenaFaces.add(malha);
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const dxMm = (largura / (W * ss)) * a.mmPorPixel;
  const dyMm = (altura / (H * ss)) * a.mmPorPixel;
  const arestas = new T.ShaderMaterial({
    glslVersion: T.GLSL3,
    depthTest: false,
    depthWrite: false,
    blending: T.NoBlending,
    uniforms: {
      uTex: { value: null },
      uSS: { value: ss },
      uMargem: { value: 1 },
      uPasso: { value: new T.Vector2(dxMm, dyMm) },
      uCos: { value: a.cosVinco },
      uDegrau: { value: a.degrau },
      uInclinacao: { value: a.fatorDaInclinacao },
      uMaxima: { value: a.inclinacaoMaxima },
    },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      precision highp float;
      precision highp int;
      uniform highp sampler2D uTex;
      uniform int uSS; uniform int uMargem;
      uniform vec2 uPasso;
      layout(location = 0) out highp vec4 saida;
      uniform float uCos; uniform float uDegrau; uniform float uInclinacao; uniform float uMaxima;
      /* 1: silhueta ou degrau de profundidade; 2: vinco */
      int par(vec4 p, vec4 q, vec2 d) {
        bool hp = p.z > 0.0; bool hq = q.z > 0.0;
        if (hp != hq) return 1;
        if (!hp) return 0;
        if (dot(p.xyz, q.xyz) < uCos) return 2;
        vec2 gp = -p.xy / p.z; vec2 gq = -q.xy / q.z;
        float inc = min(max(length(gp), length(gq)), uMaxima);
        float tol = uDegrau + uInclinacao * inc * length(d);
        float dz = q.w - p.w;
        if (abs(dz - dot(gp, d)) > tol && abs(dz - dot(gq, d)) > tol) return 1;
        return 0;
      }
      void main() {
        ivec2 sz = textureSize(uTex, 0);
        ivec2 o = ivec2(gl_FragCoord.xy);
        int prof = 0; int vinco = 0; int ambos = 0; int cob = 0;
        for (int sy = 0; sy < 16; sy++) {
          if (sy >= uSS) break;
          for (int sx = 0; sx < 16; sx++) {
            if (sx >= uSS) break;
            ivec2 c = ivec2(o.x * uSS + sx, (o.y + uMargem) * uSS + sy);
            vec4 p = texelFetch(uTex, c, 0);
            if (p.z > 0.0) cob = 1;
            int rp = 0; int rv = 0;
            for (int k = 0; k < 4; k++) {
              ivec2 dq = k == 0 ? ivec2(1, 0) : k == 1 ? ivec2(-1, 0) : k == 2 ? ivec2(0, 1) : ivec2(0, -1);
              ivec2 cq = c + dq;
              if (cq.x < 0 || cq.y < 0 || cq.x >= sz.x || cq.y >= sz.y) continue;
              int r = par(p, texelFetch(uTex, cq, 0), vec2(float(dq.x) * uPasso.x, float(dq.y) * uPasso.y));
              if (r == 1) rp = 1; else if (r == 2) rv = 1;
            }
            prof += rp; vinco += rv; if (rp + rv > 0) ambos += 1;
          }
        }
        /* quantas amostras do pixel têm aresta, em dezesseis avos de 255 (um byte por contagem) */
        saida = vec4(float(ambos) / 255.0, float(prof) / 255.0, float(vinco) / 255.0, float(cob));
      }`,
  });
  const cenaArestas = new T.Scene();
  const tri = new T.BufferGeometry();
  tri.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new T.Mesh(tri, arestas);
  quad.frustumCulled = false;
  cenaArestas.add(quad);

  const saida = new Uint8Array(W * (yb - ya) * 4);
  renderer.setClearColor(0x000000, 0);
  for (let y = ya; y < yb; y += faixa) {
    const y1 = Math.min(yb, y + faixa);
    const h = y1 - y;
    /* uma linha de PNG a mais em cima e embaixo, para a aresta no limite da faixa ter o vizinho */
    const alvo = new T.WebGLRenderTarget(W * ss, (h + 2) * ss, { type: T.FloatType, format: T.RGBAFormat, minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, generateMipmaps: false });
    const reduzido = new T.WebGLRenderTarget(W, h, { type: T.UnsignedByteType, format: T.RGBAFormat, minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: false });
    faces.uniforms.uQuadro.value.set(largura, ((y - 1) * altura) / H, ((y1 + 1) * altura) / H);
    renderer.setRenderTarget(alvo);
    renderer.clear();
    renderer.render(cenaFaces, cam);
    arestas.uniforms.uTex.value = alvo.texture;
    renderer.setRenderTarget(reduzido);
    renderer.render(cenaArestas, cam);
    const bytes = new Uint8Array(W * h * 4);
    renderer.readRenderTargetPixels(reduzido, 0, 0, W, h, bytes);
    saida.set(bytes, (y - ya) * W * 4);
    alvo.dispose(); reduzido.dispose();
  }
  renderer.setRenderTarget(null);
  geo.dispose(); tri.dispose(); faces.dispose(); arestas.dispose();
  let s = '';
  for (let i = 0; i < saida.length; i += 0x8000) s += String.fromCharCode(...saida.subarray(i, i + 0x8000));
  return btoa(s);
};

/* A referência de um quadro: as arestas (máscara do tamanho da região dos painéis) e os tipos delas. */
export async function renderizarReferencia({ triangulos, quadro, W, H, linhas, escala, navegador, ss = SUPERAMOSTRAGEM_DA_REFERENCIA }) {
  const pagina = await paginaDaCamada(navegador);
  const pedido = {
    W, H, ss, largura: quadro.largura, altura: quadro.altura, linhas, faixa: Math.max(8, Math.floor(LINHAS_POR_FAIXA / ss) - 2),
    pos: triangulos.pos, nor: triangulos.nor, zMin: triangulos.zMin, zMax: triangulos.zMax,
    mmPorPixel: triangulos.mmPorUnidade / escala,
    cosVinco: COSSENO_DA_REFERENCIA, degrau: DEGRAU_MINIMO_DA_REFERENCIA, fatorDaInclinacao: FATOR_DA_INCLINACAO, inclinacaoMaxima: INCLINACAO_MAXIMA_DA_REFERENCIA,
  };
  const base64 = await pagina.evaluate(RENDERIZAR_REFERENCIA, JSON.stringify(pedido));
  const bytes = Buffer.from(base64, 'base64');
  const n = W * (linhas[1] - linhas[0]);
  const contagem = new Uint8Array(n); const cobertura = new Uint8Array(n);
  for (let i = 0; i < n; i++) { contagem[i] = bytes[4 * i]; cobertura[i] = bytes[4 * i + 3] > 127 ? 1 : 0; }
  const altura = linhas[1] - linhas[0];
  const aresta = arestaPorHisterese(contagem, W, altura);
  const profundidade = new Uint8Array(n); const vinco = new Uint8Array(n);
  for (let i = 0; i < n; i++) { if (aresta[i]) { profundidade[i] = bytes[4 * i + 1] >= bytes[4 * i + 2] ? 1 : 0; vinco[i] = 1 - profundidade[i]; } }
  return { largura: W, altura, aresta, profundidade, vinco, cobertura };
}

/* ---------- as fontes dos triângulos ---------- */

/* O quadro e os triângulos da referência do desenho da blocagem `r` (o resultado de `desenharBlocagem`), da entrada que o gerou. */
export function triangulosDaBlocagem(entrada, r) {
  const V = VISTAS[entrada.vista ?? 'isometrica'];
  const junto = { pos: [], nor: [], zMin: Infinity, zMax: -Infinity, mmPorUnidade: null };
  entrada.paineis.forEach((p, k) => {
    const { tela } = geometria(r.paineis[k], k, r.escala);
    const t = triangulosDaReferencia({ malha: p.malha, volumes: p.volumes, V, tela });
    junto.pos.push(...t.pos); junto.nor.push(...t.nor);
    junto.zMin = Math.min(junto.zMin, t.zMin); junto.zMax = Math.max(junto.zMax, t.zMax); junto.mmPorUnidade = t.mmPorUnidade;
  });
  return junto;
}

/* Os triângulos das faces da camada de um desenho (as do desenhista das formas, que não tem malha): cada face é triangulada no plano da
   tela, e a normal vem dos pontos dela, em milímetro, orientada para o olho. Uma face de perfil (sem área na tela) não entra. */
export function triangulosDaCamada(r, vista) {
  const base = baseDaVista(VISTAS[vista]);
  const mmPorPixel = base.mmPorUnidade / r.escala;
  const pos = []; const nor = [];
  let zMin = Infinity; let zMax = -Infinity;
  const anel = (q) => { const c = q.slice(); if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop(); return c; };
  for (const f of r.camada.formas) {
    /* a camada soma à profundidade de cada forma um viés de desempate (até alguns décimos de milímetro, pelo índice da forma): a geometria é a
       sem ele */
    const vies = f.vies ?? f.rank * passoDeDesempate(r.camada.formas.length);
    for (const face of f.faces) {
      const c = anel(face.c);
      const furos = (face.h ?? []).map(anel);
      const todos = [...c, ...furos.flat()];
      const buracos = []; let n = c.length;
      for (const fu of furos) { buracos.push(n); n += fu.length; }
      const idx = earcut(todos.flatMap((p) => [p[0], p[1]]), buracos, 2);
      for (let k = 0; k + 2 < idx.length; k += 3) {
        const [a, b, d] = [idx[k], idx[k + 1], idx[k + 2]].map((i) => todos[i]);
        const mm = (p) => [p[0] * mmPorPixel, p[1] * mmPorPixel, p[2] - vies];
        const A = mm(a); const B = mm(b); const D = mm(d);
        const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]; const w = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
        let nv = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        const m = Math.hypot(...nv);
        if (!(m > 1e-12)) continue;
        nv = nv.map((x) => x / m);
        /* a normal da tela tem z para o olho: x e y da tela são a direita e para baixo, e a conta acima os leva ao mesmo sistema */
        if (nv[2] < 0) nv = nv.map((x) => -x);
        if (!(nv[2] > 1e-6)) continue;
        for (const p of [a, b, d]) { pos.push(p[0], p[1], p[2] - vies); nor.push(...nv); if (p[2] - vies < zMin) zMin = p[2] - vies; if (p[2] - vies > zMax) zMax = p[2] - vies; }
      }
    }
  }
  return { pos, nor, zMin, zMax, mmPorUnidade: base.mmPorUnidade };
}

/* ---------- a medida de um desenho ---------- */

/* A região dos painéis no PNG de largura `W` e altura `H` do quadro `{ largura, altura }`: sem o título, a nota nem a barra de escala. */
export function regiaoDosPaineis(quadro, paineis, W, H) {
  const y0 = Math.round((QUADRO.topo * H) / quadro.altura);
  const y1 = Math.round(((QUADRO.topo + QUADRO.painelA) * H) / quadro.altura);
  return { linhas: [y0, y1], regiao: [0, y0, W, y1], paineis };
}

/** Mede um desenho: `r` é o resultado de `desenharBlocagem` (ou do desenhista das formas) com camada, `triangulos` os da referência. Os
 *  traços são os pixels que as fitas mudam: o PNG do desenho e o mesmo PNG sem os traços da camada (as faces e o resto do quadro iguais)
 *  são comparados, e o pixel é traço quando a fita cobre mais da metade dele. Assim a cor das faces (um vermelho escuro, um cinza
 *  escuro) não se confunde com a tinta do traço. Devolve o relato, a máscara de cada tipo e o PNG do desenho. */
export async function medirDesenho({ r, triangulos, navegador, largura = LARGURA_DAS_VISTAS, tolerancia = TOLERANCIA_DO_DESENHO, superamostragem = SUPERAMOSTRAGEM_DA_REFERENCIA, reaproveitar = null }) {
  const { png: com } = await desenhoParaBuffer(r, largura, navegador);
  let semTracos = reaproveitar?.semTracos;
  if (!semTracos) {
    const sem = { ...r, camada: { ...r.camada, formas: r.camada.formas.map((f) => ({ ...f, tracos: [], inclinacoes: [] })) } };
    semTracos = PNG.sync.read((await desenhoParaBuffer(sem, largura, navegador)).png);
  }
  return medirImagem({ png: PNG.sync.read(com), semTracos, referencia: reaproveitar?.referencia, r, triangulos, navegador, tolerancia, superamostragem });
}

/** Mede o PNG `png` do desenho, com `semTracos` o mesmo desenho sem as fitas (e, se já feita, a `referencia` do mesmo quadro). */
export async function medirImagem({ png, semTracos, referencia = null, r, triangulos, navegador, tolerancia = TOLERANCIA_DO_DESENHO, superamostragem = SUPERAMOSTRAGEM_DA_REFERENCIA }) {
  const W = png.width; const H = png.height;
  const { linhas, regiao } = regiaoDosPaineis(r, null, W, H);
  referencia ??= await renderizarReferencia({ triangulos, quadro: r, W, H, linhas, escala: r.escala, navegador, ss: superamostragem });
  const tracos = mascaraDosTracos(png, semTracos, regiao);
  const comparacao = compararComAReferencia({ tracos, referencia: referencia.aresta, largura: W, altura: linhas[1] - linhas[0], tolerancia, origem: [0, linhas[0]] });
  return { png, semTracos, regiao, referencia, tolerancia, ...comparacao };
}

/** A imagem de diagnóstico: o desenho com os vazamentos em vermelho e as falhas em azul (cada pixel com o entorno de um pixel, para
 *  aparecer na imagem inteira). */
export function imagemDeDiagnostico(medida) {
  const { png, regiao, vazamento, falha } = medida;
  const saida = new PNG({ width: png.width, height: png.height });
  png.data.copy(saida.data);
  const l = regiao[2] - regiao[0]; const a = regiao[3] - regiao[1];
  const pintar = (mascara, cor) => {
    for (let y = 0; y < a; y++) {
      for (let x = 0; x < l; x++) {
        if (!mascara[y * l + x]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + regiao[0] + dx; const yy = y + regiao[1] + dy;
            if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) continue;
            const i = (yy * png.width + xx) * 4;
            saida.data[i] = cor[0]; saida.data[i + 1] = cor[1]; saida.data[i + 2] = cor[2]; saida.data[i + 3] = 255;
          }
        }
      }
    }
  };
  pintar(falha.mascara, [0, 80, 255]);
  pintar(vazamento.mascara, [255, 0, 0]);
  return PNG.sync.write(saida);
}

/** A imagem da referência: as arestas de profundidade em preto e as de vinco em laranja, sobre a cobertura em cinza claro. */
export function imagemDaReferencia(medida) {
  const { referencia } = medida;
  const saida = new PNG({ width: referencia.largura, height: referencia.altura });
  for (let i = 0; i < referencia.aresta.length; i++) {
    const cor = referencia.profundidade[i] ? [0, 0, 0] : referencia.vinco[i] ? [230, 120, 0] : referencia.cobertura[i] ? [225, 225, 225] : [255, 255, 255];
    saida.data[4 * i] = cor[0]; saida.data[4 * i + 1] = cor[1]; saida.data[4 * i + 2] = cor[2]; saida.data[4 * i + 3] = 255;
  }
  return PNG.sync.write(saida);
}

/* ---------- o conjunto de calibração do crítico ---------- */

/* O que cada vista da imagem do conjunto precisa para ser medida: o resultado do desenho e os triângulos da referência. */
export function vistasDaImagem(imagem, conjunto, raiz = RAIZ) {
  const { fonte } = imagem;
  if (fonte.tipo === 'esboco') {
    const { bruto } = esbocoDaFonte(fonte, raiz);
    return desenhosDoObjeto(bruto).map(({ vista, r }) => ({ vista, r, triangulos: triangulosDaCamada(r, vista) }));
  }
  const { familia, chamada } = chamadaDaFonte(fonte);
  const painel = painelDoNeutro(executarChamada(familia, chamada), imagem.objeto);
  return VISTAS_DO_CONJUNTO.map((vista) => {
    const entrada = { vista, paineis: [painel] };
    const r = desenharBlocagem(entrada, { camada: true });
    return { vista, r, triangulos: triangulosDaBlocagem(entrada, r) };
  });
}

const resumoDosGrupos = (g) => g.map((x) => `${x.pixels}px em (${x.centro[0]}, ${x.centro[1]}), a ${x.afastamento} px`);

/** O relato de uma vista, sem as máscaras, para tabela e JSON. */
export function relatoDaVista(id, vista, m) {
  const tipo = (t) => ({ pixels: t.pixels, grupos: t.grupos.length, onde: t.grupos.map((g) => ({ pixels: g.pixels, centro: g.centro, caixa: g.caixa, afastamento: g.afastamento })) });
  return { id, vista, tracos: m.tracos, arestas: m.arestas, vazamento: tipo(m.vazamento), falha: tipo(m.falha) };
}

export async function medirConjunto({ raiz = RAIZ, so = null, vista = null, tolerancia = TOLERANCIA_DO_DESENHO, saida = null, navegador, aoMedir = null } = {}) {
  const conjunto = lerConjuntoDoDisco({ raiz, exigirGerados: false });
  const ids = so ? so.split(',').map((x) => x.trim()).filter(Boolean) : null;
  if (ids) for (const id of ids) if (!conjunto.imagens.some((i) => i.id === id)) throw new ErroDaFonte(`--so: a imagem '${id}' não está no conjunto (${conjunto.imagens.map((i) => i.id).join(', ')})`);
  if (vista && !VISTAS_DO_CONJUNTO.includes(vista)) throw new ErroDaFonte(`--vista: '${vista}' não é uma das vistas do conjunto (${VISTAS_DO_CONJUNTO.join(', ')})`);
  const relatos = [];
  for (const imagem of conjunto.imagens) {
    if (ids && !ids.includes(imagem.id)) continue;
    for (const v of vistasDaImagem(imagem, conjunto, raiz)) {
      if (vista && v.vista !== vista) continue;
      const m = await medirDesenho({ r: v.r, triangulos: v.triangulos, navegador, tolerancia });
      const relato = relatoDaVista(imagem.id, v.vista, m);
      relatos.push(relato);
      if (saida) {
        mkdirSync(saida, { recursive: true });
        writeFileSync(join(saida, `${imagem.id}-${v.vista}.png`), imagemDeDiagnostico(m));
        writeFileSync(join(saida, `${imagem.id}-${v.vista}-referencia.png`), imagemDaReferencia(m));
        writeFileSync(join(saida, `${imagem.id}-${v.vista}-desenho.png`), PNG.sync.write(m.png));
      }
      aoMedir?.(relato);
    }
  }
  return relatos;
}

/* ---------- o que traçou o grupo ---------- */

/** Os segmentos de traço da camada que passam pela caixa de um grupo do PNG (com a folga da tolerância): `{ forma, traco, a, b, comprimento }`,
 *  em pixels do PNG. É o que diz de que aresta o desenho vem o vazamento, e de que forma a falha deveria ter vindo. */
export function tracosDoGrupo(r, grupo, largura = LARGURA_DAS_VISTAS, folga = TOLERANCIA_DO_DESENHO + 1) {
  const fx = largura / r.largura; const fy = Math.round((r.altura * largura) / r.largura) / r.altura;
  const [x0, y0, x1, y1] = [grupo.caixa[0] - folga, grupo.caixa[1] - folga, grupo.caixa[2] + 1 + folga, grupo.caixa[3] + 1 + folga];
  const cruza = (a, b) => {
    /* o segmento a-b cruza a caixa: Liang-Barsky */
    let t0 = 0; let t1 = 1;
    const dx = b[0] - a[0]; const dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    }
    return true;
  };
  const achados = [];
  for (const f of r.camada.formas) {
    f.tracos.forEach((t, ti) => {
      for (let i = 0; i + 1 < t.length; i++) {
        const a = [t[i][0] * fx, t[i][1] * fy]; const b = [t[i + 1][0] * fx, t[i + 1][1] * fy];
        if (cruza(a, b)) achados.push({ forma: f.id, traco: ti, segmento: i, a: a.map((x) => Math.round(x * 10) / 10), b: b.map((x) => Math.round(x * 10) / 10), comprimento: Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10) / 10, z: [t[i][2], t[i + 1][2]] });
      }
    });
  }
  return achados;
}

/* ---------- a tabela ---------- */

export function tabelaDosRelatos(relatos) {
  const L = ['imagem  vista        traços  arestas  vazam(px/grupos)  faltam(px/grupos)'];
  let vp = 0; let vg = 0; let fp = 0; let fg = 0;
  for (const r of relatos) {
    L.push(`${r.id.padEnd(6)}  ${r.vista.padEnd(11)}  ${String(r.tracos).padStart(6)}  ${String(r.arestas).padStart(7)}  ${`${r.vazamento.pixels}/${r.vazamento.grupos}`.padStart(16)}  ${`${r.falha.pixels}/${r.falha.grupos}`.padStart(17)}`);
    vp += r.vazamento.pixels; vg += r.vazamento.grupos; fp += r.falha.pixels; fg += r.falha.grupos;
  }
  L.push(`total ${relatos.length} vistas: vazamento ${vp} px em ${vg} grupos, falha ${fp} px em ${fg} grupos`);
  return L.join('\n');
}

export function detalheDosRelatos(relatos, { maximo = 6 } = {}) {
  const L = [];
  for (const r of relatos) {
    for (const [nome, t] of [['vazamento', r.vazamento], ['falha', r.falha]]) {
      if (t.pixels === 0) continue;
      L.push(`${r.id} ${r.vista}: ${nome} ${t.pixels} px em ${t.grupos} grupos: ${resumoDosGrupos(t.onde.slice(0, maximo)).join('; ')}${t.grupos > maximo ? `; (mais ${t.grupos - maximo})` : ''}`);
    }
  }
  return L.join('\n');
}

/* ---------- a linha de comando ---------- */

const USO = [
  'uso:',
  '  npm run desenho:medir [-- --so=c09,c01] [--vista=isometrica] [--tolerancia=2] [--saida=<pasta>] [--json]',
  '  npm run desenho:check',
].join('\n');

function lerOpcoes(argv) {
  const o = { _: [] };
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) o[m[1]] = m[2] ?? true; else o._.push(a);
  }
  return o;
}

export async function principal(argv, saida = console) {
  const o = lerOpcoes(argv);
  const comando = o._[0] ?? 'medir';
  if (o.ajuda || !['medir', 'conferir'].includes(comando)) { saida.log(USO); return comando === 'medir' || comando === 'conferir' ? 0 : 2; }
  const conferirDesenho = comando === 'conferir' ? (await import('./medida-do-desenho-conferir.mjs')).conferirDesenho : null;
  const { chromium } = (await import('playwright')).default;
  const navegador = await chromium.launch();
  try {
    if (comando === 'conferir') return await conferirDesenho({ navegador }, saida);
    const tolerancia = o.tolerancia === undefined ? TOLERANCIA_DO_DESENHO : Number(o.tolerancia);
    if (!(tolerancia >= 0)) throw new ErroDaFonte(`--tolerancia precisa de pixels (0 ou mais), e veio "${o.tolerancia}"`);
    const pasta = o.saida ? resolve(process.env.INIT_CWD || process.cwd(), String(o.saida)) : null;
    const relatos = await medirConjunto({ so: o.so === true ? null : o.so, vista: o.vista === true ? null : o.vista, tolerancia, saida: pasta, navegador });
    if (o.json) saida.log(JSON.stringify(relatos, null, 2));
    else {
      saida.log(tabelaDosRelatos(relatos));
      const d = detalheDosRelatos(relatos);
      if (d) saida.log(d);
      if (pasta) saida.log(`imagens de diagnóstico em ${pasta}`);
    }
    return 0;
  } finally {
    await navegador.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => {
    if (e instanceof ErroDaFonte || e instanceof ErroDeMedida) { console.error(e.message); process.exitCode = 2; } else { console.error(e); process.exitCode = 1; }
  });
}
